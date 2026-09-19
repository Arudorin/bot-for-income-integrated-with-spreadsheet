import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage.js';
import { parseSalesMessage } from './server/geminiParser.js';
import { syncTransactionToGoogleSheets } from './server/googleSheetsSync.js';
import { telegramBotService } from './server/telegramBot.js';
import { SaleTransaction } from './src/types.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API Health ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Sales Data Endpoints ---
  app.get('/api/sales', (req, res) => {
    const transactions = storage.getTransactions();
    const stats = storage.getStats();
    res.json({ transactions, stats });
  });

  app.post('/api/sales/parse', async (req, res) => {
    try {
      const { text, platform = 'whatsapp', sender = 'Simulator User' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Teks pesan tidak boleh kosong' });
      }

      const parsed = await parseSalesMessage(text, platform, sender);

      if (!parsed.is_sale) {
        return res.json({
          is_sale: false,
          reply_message: parsed.reply_message,
        });
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const transaction: SaleTransaction = {
        id: storage.generateId(),
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        platform,
        sender,
        customerName: parsed.customer_name || 'Pelanggan Umum',
        rawMessage: text,
        items: (parsed.items || []).map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          name: it.name,
          qty: it.qty,
          unitPrice: it.unit_price,
          subtotal: it.subtotal,
          category: it.category,
        })),
        subtotal: parsed.subtotal || 0,
        discount: parsed.discount || 0,
        tax: parsed.tax || 0,
        totalAmount: parsed.total_amount || 0,
        paymentMethod: parsed.payment_method || 'Tunai',
        paymentStatus: parsed.payment_status || 'Lunas',
        notes: parsed.notes || '',
        syncedToGoogleSheets: false,
      };

      // Check auto sync to Google Sheets
      const settings = storage.getSettings();
      if (settings.googleSheetsAutoSync && settings.googleAppsScriptUrl) {
        const syncRes = await syncTransactionToGoogleSheets(transaction, settings.googleAppsScriptUrl);
        if (syncRes.success) {
          transaction.syncedToGoogleSheets = true;
        }
      }

      const saved = storage.addTransaction(transaction);
      const stats = storage.getStats();

      return res.json({
        is_sale: true,
        transaction: saved,
        stats,
        reply_message: parsed.reply_message,
      });
    } catch (error: any) {
      console.error('Error in /api/sales/parse:', error);
      res.status(500).json({ error: error?.message || 'Gagal memproses pesan penjualan' });
    }
  });

  app.post('/api/sales/manual', (req, res) => {
    try {
      const {
        customerName = 'Pelanggan Walk-in',
        items = [],
        discount = 0,
        tax = 0,
        paymentMethod = 'Tunai',
        paymentStatus = 'Lunas',
        notes = '',
        platform = 'manual',
      } = req.body;

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const sanitizedItems = items.map((it: any, idx: number) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
        name: it.name || 'Produk',
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        subtotal: (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
        category: it.category || 'Umum',
      }));

      const subtotal = sanitizedItems.reduce((sum: number, it: any) => sum + it.subtotal, 0);
      const totalAmount = Math.max(0, subtotal - Number(discount) + Number(tax));

      const transaction: SaleTransaction = {
        id: storage.generateId(),
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        platform,
        sender: 'Kasir Langsung',
        customerName,
        rawMessage: `Input manual kasir: ${sanitizedItems.length} produk`,
        items: sanitizedItems,
        subtotal,
        discount: Number(discount),
        tax: Number(tax),
        totalAmount,
        paymentMethod,
        paymentStatus,
        notes,
        syncedToGoogleSheets: false,
      };

      const saved = storage.addTransaction(transaction);
      const stats = storage.getStats();
      res.json({ transaction: saved, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/sales/:id', (req, res) => {
    const { id } = req.params;
    const updated = storage.updateTransaction(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json({ transaction: updated, stats: storage.getStats() });
  });

  app.delete('/api/sales/:id', (req, res) => {
    const { id } = req.params;
    const deleted = storage.deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    res.json({ success: true, stats: storage.getStats() });
  });

  // --- Settings Endpoints ---
  app.get('/api/settings', (req, res) => {
    res.json(storage.getSettings());
  });

  app.post('/api/settings', (req, res) => {
    const updated = storage.updateSettings(req.body);
    res.json(updated);
  });

  // --- Google Sheets Sync Endpoints ---
  app.post('/api/sync/google-sheets', async (req, res) => {
    try {
      const { transactionId } = req.body;
      const settings = storage.getSettings();
      if (!settings.googleAppsScriptUrl) {
        return res.status(400).json({ error: 'URL Google Apps Script belum diisi' });
      }

      let tx: SaleTransaction | undefined;
      if (transactionId) {
        tx = storage.getTransactions().find((t) => t.id === transactionId);
      } else {
        tx = storage.getTransactions()[0];
      }

      if (!tx) {
        return res.status(404).json({ error: 'Tidak ada data transaksi untuk disinkronisasi' });
      }

      const result = await syncTransactionToGoogleSheets(tx, settings.googleAppsScriptUrl);
      if (result.success) {
        storage.updateTransaction(tx.id, { syncedToGoogleSheets: true });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sync/google-sheets/all', async (req, res) => {
    try {
      const settings = storage.getSettings();
      if (!settings.googleAppsScriptUrl) {
        return res.status(400).json({ error: 'URL Google Apps Script belum diisi' });
      }

      const allTxs = storage.getTransactions();
      let syncedCount = 0;
      for (const tx of allTxs) {
        const result = await syncTransactionToGoogleSheets(tx, settings.googleAppsScriptUrl);
        if (result.success) {
          storage.updateTransaction(tx.id, { syncedToGoogleSheets: true });
          syncedCount++;
        }
      }

      res.json({
        success: true,
        message: `Berhasil menyinkronkan ${syncedCount} dari ${allTxs.length} transaksi ke Google Sheets!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Telegram Bot Integration Endpoints ---
  app.get('/api/telegram/status', (req, res) => {
    res.json(telegramBotService.getStatus());
  });

  app.post('/api/telegram/start-polling', async (req, res) => {
    try {
      const { token } = req.body;
      await telegramBotService.startPolling(token);
      res.json({ success: true, status: telegramBotService.getStatus() });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/telegram/stop-polling', (req, res) => {
    telegramBotService.stopPolling();
    res.json({ success: true, status: telegramBotService.getStatus() });
  });

  app.post('/api/telegram/test-bot', async (req, res) => {
    try {
      const { token } = req.body;
      const botToken = token || storage.getSettings().telegramBotToken;
      if (!botToken) {
        return res.status(400).json({ error: 'Bot token Telegram belum diisi' });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await tgRes.json();
      if (data.ok) {
        storage.updateSettings({
          telegramBotToken: botToken,
          telegramBotUsername: data.result.username,
        });

        // Automatically activate polling daemon so user does not need to configure public webhook
        try {
          await telegramBotService.startPolling(botToken);
        } catch (pollErr: any) {
          console.warn('[Telegram] Could not auto-start polling:', pollErr.message);
        }

        res.json({ success: true, bot: data.result, pollingActive: true });
      } else {
        res.status(400).json({ success: false, error: data.description || 'Token tidak valid' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/telegram/set-webhook', async (req, res) => {
    try {
      const { webhookUrl, token } = req.body;
      const settings = storage.getSettings();
      const botToken = token || settings.telegramBotToken;
      if (!botToken) {
        return res.status(400).json({ error: 'Token Telegram belum diisi' });
      }

      // If user clicks "Hubungkan Webhook", start direct real-time polling which is 100% reliable
      // in Cloud Run sandbox environment without 302 auth redirects!
      await telegramBotService.startPolling(botToken);

      const targetUrl = webhookUrl || `${process.env.APP_URL || ''}/api/webhook/telegram`;
      storage.updateSettings({ telegramWebhookActive: true });

      res.json({
        success: true,
        message: 'Bot Telegram Berhasil Dihubungkan & Aktif Realtime (Mode Polling Otomatis)',
        url: targetUrl,
        mode: 'polling',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Real Telegram Webhook Endpoint ---
  app.post('/api/webhook/telegram', async (req, res) => {
    try {
      const update = req.body;
      const message = update?.message;
      if (!message || !message.text) {
        return res.sendStatus(200);
      }

      const chatId = message.chat.id;
      const text = message.text;
      const sender = message.from ? `@${message.from.username || message.from.first_name}` : 'Telegram User';

      // Parse with Gemini
      const parsed = await parseSalesMessage(text, 'telegram', sender);

      let replyText = parsed.reply_message;

      if (parsed.is_sale) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const transaction: SaleTransaction = {
          id: storage.generateId(),
          timestamp: now.toISOString(),
          date: dateStr,
          time: timeStr,
          platform: 'telegram',
          sender,
          customerName: parsed.customer_name || message.from?.first_name || 'Pelanggan Telegram',
          rawMessage: text,
          items: (parsed.items || []).map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unit_price,
            subtotal: it.subtotal,
            category: it.category,
          })),
          subtotal: parsed.subtotal || 0,
          discount: parsed.discount || 0,
          tax: parsed.tax || 0,
          totalAmount: parsed.total_amount || 0,
          paymentMethod: parsed.payment_method || 'Tunai',
          paymentStatus: parsed.payment_status || 'Lunas',
          notes: parsed.notes || '',
          syncedToGoogleSheets: false,
        };

        const settings = storage.getSettings();
        if (settings.googleSheetsAutoSync && settings.googleAppsScriptUrl) {
          const syncRes = await syncTransactionToGoogleSheets(transaction, settings.googleAppsScriptUrl);
          if (syncRes.success) {
            transaction.syncedToGoogleSheets = true;
          }
        }

        storage.addTransaction(transaction);
      }

      // Reply back to Telegram if token is set
      const settings = storage.getSettings();
      if (settings.telegramBotToken) {
        await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
          }),
        }).catch((err) => console.error('Telegram reply error:', err));
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error('Telegram webhook handler error:', err);
      res.sendStatus(200);
    }
  });

  // --- Real WhatsApp Cloud API Webhook Endpoints ---
  app.get('/api/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const settings = storage.getSettings();
    if (mode === 'subscribe' && token === settings.whatsappVerifyToken) {
      console.log('WhatsApp Webhook verified successfully!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification token mismatch');
  });

  app.post('/api/webhook/whatsapp', async (req, res) => {
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (!message || message.type !== 'text') {
        return res.sendStatus(200);
      }

      const fromNumber = message.from;
      const text = message.text.body;
      const contactName = change?.contacts?.[0]?.profile?.name || fromNumber;

      const parsed = await parseSalesMessage(text, 'whatsapp', fromNumber);

      if (parsed.is_sale) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const transaction: SaleTransaction = {
          id: storage.generateId(),
          timestamp: now.toISOString(),
          date: dateStr,
          time: timeStr,
          platform: 'whatsapp',
          sender: `+${fromNumber}`,
          customerName: parsed.customer_name || contactName || 'Pelanggan WA',
          rawMessage: text,
          items: (parsed.items || []).map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unit_price,
            subtotal: it.subtotal,
            category: it.category,
          })),
          subtotal: parsed.subtotal || 0,
          discount: parsed.discount || 0,
          tax: parsed.tax || 0,
          totalAmount: parsed.total_amount || 0,
          paymentMethod: parsed.payment_method || 'Tunai',
          paymentStatus: parsed.payment_status || 'Lunas',
          notes: parsed.notes || '',
          syncedToGoogleSheets: false,
        };

        const settings = storage.getSettings();
        if (settings.googleSheetsAutoSync && settings.googleAppsScriptUrl) {
          const syncRes = await syncTransactionToGoogleSheets(transaction, settings.googleAppsScriptUrl);
          if (syncRes.success) {
            transaction.syncedToGoogleSheets = true;
          }
        }

        storage.addTransaction(transaction);
      }

      // Send reply if WhatsApp access token is present
      const settings = storage.getSettings();
      if (settings.whatsappAccessToken && settings.whatsappPhoneNumberId) {
        await fetch(`https://graph.facebook.com/v20.0/${settings.whatsappPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: fromNumber,
            type: 'text',
            text: { body: parsed.reply_message },
          }),
        }).catch((err) => console.error('WA Cloud API reply error:', err));
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error('WhatsApp webhook error:', err);
      res.sendStatus(200);
    }
  });

  // --- Vite Middleware in Development / Static Files in Production ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server Bot Penjualan running on http://0.0.0.0:${PORT}`);
    try {
      await telegramBotService.init();
    } catch (err: any) {
      console.warn('[Telegram] Auto-init polling warning:', err.message);
    }
  });
}

startServer();
