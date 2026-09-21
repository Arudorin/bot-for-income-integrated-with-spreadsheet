import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage.js';
import { parseSalesMessage } from './server/geminiParser.js';
import {
  syncTransactionToGoogleSheets,
  pullTransactionsFromGoogleSheets,
  deleteTransactionsFromGoogleSheets,
  clearGoogleSheets,
  mirrorAllToGoogleSheets,
} from './server/googleSheetsSync.js';
import { telegramBotService } from './server/telegramBot.js';
import { SaleTransaction } from './src/types.js';
import { analyzeMetaError } from './server/diagnosticHelper.js';
import { authService } from './server/auth.js';

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

  // --- Auth Endpoints ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
      }
      const result = authService.login(username, password);
      if (!result.success) {
        return res.status(401).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error('Error in /api/auth/login:', err);
      return res.status(500).json({ success: false, error: 'Terjadi kesalahan sistem' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const user = authService.authenticateToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesi login tidak valid atau telah berakhir' });
    }
    return res.json({ success: true, user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    if (token) {
      authService.logout(token);
    }
    return res.json({ success: true });
  });

  app.post('/api/auth/change-password', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const user = authService.authenticateToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Silakan login terlebih dahulu' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Password lama dan password baru wajib diisi' });
    }

    const result = authService.changePassword(user.id, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({ success: true, message: 'Password berhasil diperbarui' });
  });

  app.get('/api/auth/users', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const user = authService.authenticateToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Silakan login terlebih dahulu' });
    }
    const users = authService.listUsers();
    return res.json({ success: true, users });
  });

  app.post('/api/auth/users', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
    const user = authService.authenticateToken(token);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Hanya Admin/Owner yang berhak menambah akun pengguna' });
    }

    const { username, name, password, role } = req.body;
    const result = authService.createUser(user.id, { username, name, password, role });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
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

  app.post('/api/sales/delete-batch', async (req, res) => {
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      const count = storage.deleteTransactions(ids);
      const settings = storage.getSettings();
      if (settings.googleAppsScriptUrl) {
        deleteTransactionsFromGoogleSheets(ids, settings.googleAppsScriptUrl).catch((err) =>
          console.error('Failed to sync deletion to Google Sheets:', err)
        );
      }
      return res.json({ success: true, count, stats: storage.getStats() });
    }
    res.status(400).json({ error: 'ids harus berupa array' });
  });

  app.post('/api/sales/update-batch-status', (req, res) => {
    const { ids, status } = req.body;
    if (Array.isArray(ids) && (status === 'Lunas' || status === 'Belum Lunas')) {
      const count = storage.updateBatchStatus(ids, status);
      return res.json({ success: true, count, stats: storage.getStats(), transactions: storage.getTransactions() });
    }
    res.status(400).json({ error: 'ids harus berupa array dan status Lunas/Belum Lunas' });
  });

  app.post('/api/sales/import', (req, res) => {
    const { transactions } = req.body;
    if (Array.isArray(transactions)) {
      const result = storage.importTransactions(transactions);
      return res.json({
        success: true,
        added: result.added,
        updated: result.updated,
        stats: storage.getStats(),
        transactions: storage.getTransactions(),
      });
    }
    res.status(400).json({ error: 'transactions harus berupa array' });
  });

  app.post('/api/sales/clear-all', async (req, res) => {
    storage.clearAllTransactions();
    const settings = storage.getSettings();
    if (settings.googleAppsScriptUrl) {
      clearGoogleSheets(settings.googleAppsScriptUrl).catch((err) =>
        console.error('Failed to clear Google Sheets:', err)
      );
    }
    res.json({ success: true, stats: storage.getStats(), transactions: [] });
  });

  app.delete('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    const deleted = storage.deleteTransaction(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    const settings = storage.getSettings();
    if (settings.googleAppsScriptUrl) {
      deleteTransactionsFromGoogleSheets([id], settings.googleAppsScriptUrl).catch((err) =>
        console.error('Failed to sync single deletion to Google Sheets:', err)
      );
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

  // --- Webhook Logs & Diagnostics Endpoints ---
  app.get('/api/webhook/logs', (req, res) => {
    const logs = storage.getWebhookLogs(50);
    res.json({ logs });
  });

  app.delete('/api/webhook/logs', (req, res) => {
    storage.clearWebhookLogs();
    res.json({ success: true, message: 'Log webhook berhasil dibersihkan' });
  });

  app.post('/api/webhook/test-simulate', async (req, res) => {
    try {
      const { text = '2 Hotwheels @35k lunas tunai', sender = '6289622640080', name = 'Tester Kasir' } = req.body;
      const cleanSender = sender.replace(/[^0-9]/g, '');

      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'incoming_message',
        status: 'info',
        title: 'Simulasi Pesan Masuk WhatsApp',
        summary: `Menerima simulasi pesan dari +${cleanSender}: "${text}"`,
        sender: `+${cleanSender}`,
        details: { text, sender: cleanSender, name, simulated: true },
      });

      const parsed = await parseSalesMessage(text, 'whatsapp', cleanSender);

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
          sender: `+${cleanSender}`,
          customerName: parsed.customer_name || name,
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
          notes: parsed.notes || 'Simulasi Uji Coba Webhook',
          syncedToGoogleSheets: false,
        };

        storage.addTransaction(transaction);

        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'incoming_message',
          status: 'success',
          title: `Penjualan Berhasil Dicatat (${transaction.id})`,
          summary: `Transaksi Rp ${transaction.totalAmount.toLocaleString('id-ID')} (${transaction.items.length} item) masuk ke pembukuan.`,
          sender: `+${cleanSender}`,
          details: transaction,
        });

        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'reply_sent',
          status: 'success',
          title: 'Draft Balasan Nota Dibuat',
          summary: `Nota siap dikirim ke WhatsApp pembeli: "${parsed.reply_message.slice(0, 70)}..."`,
          sender: `+${cleanSender}`,
          details: { reply: parsed.reply_message },
        });

        return res.json({ success: true, transaction, reply: parsed.reply_message, simulated: true });
      } else {
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'incoming_message',
          status: 'warning',
          title: 'Pesan Tidak Dikenali Sebagai Penjualan',
          summary: `Pesan "${text}" bukan format transaksi. Bot membalas: "${parsed.reply_message}"`,
          sender: `+${cleanSender}`,
          details: parsed,
          troubleshootingHint: 'Pastikan format pesan mencantumkan nama barang, jumlah, dan harga (contoh: "2 Gundam @150k tunai")',
        });

        return res.json({ success: true, is_sale: false, reply: parsed.reply_message, simulated: true });
      }
    } catch (err: any) {
      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'general_error',
        status: 'error',
        title: 'Error Pemrosesan Simulasi',
        summary: err.message,
        details: err,
      });
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- WhatsApp Test / Status Endpoints ---
  app.get('/api/whatsapp/status', async (req, res) => {
    const settings = storage.getSettings();
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const detectedUrl = `${proto}://${host}`;
    const serverUrl = settings.customWebhookDomain
      ? settings.customWebhookDomain.replace(/\/+$/, '')
      : 'https://toyisland-income.ai.studio';

    const recentLogs = storage.getWebhookLogs(15);

    if (!settings.whatsappAccessToken || !settings.whatsappPhoneNumberId) {
      return res.json({
        configured: false,
        valid: false,
        message: 'Token Akses atau Phone Number ID belum disimpan di pengaturan.',
        serverUrl,
        verifyToken: settings.whatsappVerifyToken,
        hasAccessToken: Boolean(settings.whatsappAccessToken),
        hasPhoneId: Boolean(settings.whatsappPhoneNumberId),
        recentLogs,
      });
    }

    try {
      const fbRes = await fetch(
        `https://graph.facebook.com/v20.0/${settings.whatsappPhoneNumberId}?access_token=${settings.whatsappAccessToken}`
      );
      const data = await fbRes.json();
      if (fbRes.ok && data.id) {
        return res.json({
          configured: true,
          valid: true,
          phoneNumber: data.display_phone_number || data.verified_name || data.id,
          verifiedName: data.verified_name || 'Terverifikasi Meta',
          serverUrl,
          verifyToken: settings.whatsappVerifyToken,
          hasAccessToken: true,
          hasPhoneId: true,
          data,
          recentLogs,
        });
      } else {
        const errorAnalysis = analyzeMetaError(data?.error?.code, data?.error?.title, data?.error?.message);
        return res.json({
          configured: true,
          valid: false,
          error: data?.error?.message || 'Token atau Phone Number ID tidak valid.',
          errorDetails: data?.error,
          errorAnalysis,
          serverUrl,
          verifyToken: settings.whatsappVerifyToken,
          hasAccessToken: true,
          hasPhoneId: true,
          recentLogs,
        });
      }
    } catch (e: any) {
      return res.json({
        configured: true,
        valid: false,
        error: e.message || 'Gagal menghubungi server Meta Graph API',
        serverUrl,
        verifyToken: settings.whatsappVerifyToken,
        hasAccessToken: true,
        hasPhoneId: true,
        recentLogs,
      });
    }
  });

  app.post('/api/whatsapp/test-message', async (req, res) => {
    try {
      const { to } = req.body;
      const settings = storage.getSettings();
      if (!settings.whatsappAccessToken || !settings.whatsappPhoneNumberId) {
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'reply_error',
          status: 'error',
          title: 'Gagal Tes Kirim: Kredensial Kosong',
          summary: 'WhatsApp Access Token atau Phone Number ID belum diisi.',
          troubleshootingHint: 'Buka tab WhatsApp Bot, isi Token dan Phone Number ID lalu klik Simpan Pengaturan WhatsApp.',
        });
        return res.status(400).json({ error: 'Token Akses dan Phone Number ID belum disimpan.' });
      }
      if (!to) {
        return res.status(400).json({ error: 'Nomor tujuan (to) belum diisi.' });
      }

      // Clean destination number (must be international format e.g. 6281234567890)
      const cleanTo = to.replace(/[^0-9]/g, '');

      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'reply_sent',
        status: 'info',
        title: 'Mengirim Pesan Tes Keluar',
        summary: `Mengirim permintaan kirim pesan ke Meta Graph API untuk nomor ${cleanTo}...`,
        sender: `+${cleanTo}`,
      });

      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${settings.whatsappPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: 'text',
          text: {
            body: `🤖 *Tes Bot Kasir ${settings.businessName || 'Toy Island'} Berhasil!*\n\nKoneksi WhatsApp Cloud API aktif dan siap menerima pencatatan transaksi penjualan. Silakan ketik format penjualan, contoh:\n_2 Gundam HG @250k lunas transfer BCA_`,
          },
        }),
      });

      const data = await fbRes.json();
      if (fbRes.ok) {
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'reply_sent',
          status: 'success',
          title: 'Pesan Tes Berhasil Diterima Meta',
          summary: `Meta menerima pesan tes ke nomor ${cleanTo}. ID Pesan: ${data.messages?.[0]?.id || 'OK'}`,
          sender: `+${cleanTo}`,
          details: data,
        });
        res.json({ success: true, data });
      } else {
        const errorAnalysis = analyzeMetaError(data?.error?.code, data?.error?.title, data?.error?.message);
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'reply_error',
          status: 'error',
          title: errorAnalysis.title,
          summary: `Meta menolak kirim ke +${cleanTo}: ${data?.error?.message}`,
          sender: `+${cleanTo}`,
          errorCode: data?.error?.code,
          details: data,
          troubleshootingHint: `${errorAnalysis.explanation} -> ${errorAnalysis.hint}`,
        });

        res.status(400).json({
          success: false,
          error: data?.error?.message || 'Gagal kirim pesan',
          errorAnalysis,
          details: data,
        });
      }
    } catch (err: any) {
      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'reply_error',
        status: 'error',
        title: 'Network / Server Error Saat Tes',
        summary: err.message,
        details: err,
      });
      res.status(500).json({ success: false, error: err.message });
    }
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
      const mirrorResult = await mirrorAllToGoogleSheets(allTxs, settings.googleAppsScriptUrl);

      if (mirrorResult.success) {
        for (const tx of allTxs) {
          storage.updateTransaction(tx.id, { syncedToGoogleSheets: true });
        }
        return res.json({
          success: true,
          message: mirrorResult.message,
          count: allTxs.length,
          transactions: storage.getTransactions(),
        });
      }

      // Fallback: If old Apps Script doesn't support mirror_all, sync individual rows
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
        message: `Berhasil menyinkronkan ${syncedCount} dari ${allTxs.length} transaksi ke Google Sheets! Catatan: Perbarui kode Google Apps Script Anda ke versi terbaru agar baris yang dihapus di web otomatis terhapus di Spreadsheet.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sync/google-sheets/batch', async (req, res) => {
    try {
      const { ids } = req.body;
      const settings = storage.getSettings();
      if (!settings.googleAppsScriptUrl) {
        return res.status(400).json({ error: 'URL Google Apps Script belum diisi' });
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Pilih minimal satu transaksi untuk disinkronkan' });
      }

      const idSet = new Set(ids);
      const selectedTxs = storage.getTransactions().filter((t) => idSet.has(t.id));
      let syncedCount = 0;
      for (const tx of selectedTxs) {
        const result = await syncTransactionToGoogleSheets(tx, settings.googleAppsScriptUrl);
        if (result.success) {
          storage.updateTransaction(tx.id, { syncedToGoogleSheets: true });
          syncedCount++;
        }
      }

      res.json({
        success: true,
        message: `Berhasil menyinkronkan ${syncedCount} dari ${selectedTxs.length} transaksi terpilih ke Google Sheets!`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sync/google-sheets/pull', async (req, res) => {
    try {
      const settings = storage.getSettings();
      if (!settings.googleAppsScriptUrl) {
        return res.status(400).json({ error: 'URL Google Apps Script belum dikonfigurasi di Pengaturan' });
      }

      const pullResult = await pullTransactionsFromGoogleSheets(settings.googleAppsScriptUrl);
      if (!pullResult.success || !pullResult.transactions) {
        return res.status(400).json({
          error: pullResult.message,
          suggestion: 'Pastikan kode Google Apps Script sudah memiliki fungsi doGet(e) dan Web App di-Deploy sebagai "Anyone". Anda juga bisa menggunakan fitur "Import / Tempel Data" untuk menyalin langsung dari Spreadsheet.',
        });
      }

      const importResult = storage.importTransactions(pullResult.transactions);
      res.json({
        success: true,
        message: `Berhasil menarik ${pullResult.transactions.length} transaksi dari Google Sheets (${importResult.added} baru, ${importResult.updated} diperbarui)!`,
        count: pullResult.transactions.length,
        added: importResult.added,
        updated: importResult.updated,
        transactions: storage.getTransactions(),
        stats: storage.getStats(),
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
      console.log('WhatsApp Webhook verified successfully by Meta!');
      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'verification',
        status: 'success',
        title: 'Verifikasi Webhook Berhasil',
        summary: 'Meta Developers berhasil memvalidasi Callback URL dan Verify Token.',
        details: { mode, token, ip: req.ip },
      });
      return res.status(200).send(challenge);
    }

    console.warn(`WhatsApp Webhook verification failed. Received token: "${token}", expected: "${settings.whatsappVerifyToken}"`);
    storage.addWebhookLog({
      source: 'whatsapp',
      type: 'verification',
      status: 'error',
      title: 'Verifikasi Webhook Ditolak',
      summary: `Meta mengirim verify_token "${token}" tapi sistem menunggu "${settings.whatsappVerifyToken}".`,
      details: { receivedToken: token, expectedToken: settings.whatsappVerifyToken, mode },
      troubleshootingHint: `Pastikan di halaman Meta Developers > Webhooks > Edit kolom Verify Token diisi persis: "${settings.whatsappVerifyToken}"`,
    });
    return res.status(403).send('Verification token mismatch');
  });

  app.post('/api/webhook/whatsapp', async (req, res) => {
    try {
      const body = req.body;
      console.log('WhatsApp Webhook incoming payload:', JSON.stringify(body));

      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      // Check if this is a message delivery status update (sent, delivered, failed)
      if (change?.statuses && Array.isArray(change.statuses)) {
        for (const st of change.statuses) {
          const recipient = st.recipient_id || 'Unknown';
          if (st.status === 'failed') {
            const err = st.errors?.[0];
            const errAnalysis = analyzeMetaError(err?.code, err?.title, err?.message);
            console.error(`WhatsApp delivery FAILED for ${recipient}:`, err);
            storage.addWebhookLog({
              source: 'whatsapp',
              type: 'message_status',
              status: 'error',
              title: errAnalysis.title,
              summary: `Pengiriman pesan ke +${recipient} gagal. Meta: "${err?.title || err?.message || 'Failed'}"`,
              sender: `+${recipient}`,
              errorCode: err?.code,
              details: { status: st, errorAnalysis: errAnalysis },
              troubleshootingHint: `${errAnalysis.explanation} -> ${errAnalysis.hint}`,
            });
          } else if (st.status === 'delivered') {
            storage.addWebhookLog({
              source: 'whatsapp',
              type: 'message_status',
              status: 'success',
              title: 'Pesan Terkirim (Delivered)',
              summary: `Pesan telah sampai di HP pembeli/kasir (+${recipient}).`,
              sender: `+${recipient}`,
              details: st,
            });
          } else if (st.status === 'read') {
            storage.addWebhookLog({
              source: 'whatsapp',
              type: 'message_status',
              status: 'info',
              title: 'Pesan Dibaca (Read)',
              summary: `Pesan telah dibaca oleh nomor +${recipient}.`,
              sender: `+${recipient}`,
              details: st,
            });
          }
        }
        return res.sendStatus(200);
      }

      const message = change?.messages?.[0];

      if (!message) {
        // Ping or other event from Meta (e.g. template updates or webhook test ping)
        const fieldName = change?.field || entry?.changes?.[0]?.field || 'unknown';
        console.log(`WhatsApp webhook non-message event received (${fieldName})`);
        return res.sendStatus(200);
      }

      const rawFromNumber = String(message.from || '');
      const fromNumber = rawFromNumber.replace(/[^0-9]/g, '');
      const contactName = change?.contacts?.[0]?.profile?.name || fromNumber;

      if (message.type !== 'text') {
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'incoming_message',
          status: 'warning',
          title: `Pesan Non-Teks Diterima (${message.type})`,
          summary: `Pesan dari +${fromNumber} berupa ${message.type}. Bot saat ini memproses format pesan teks.`,
          sender: `+${fromNumber}`,
          details: message,
          troubleshootingHint: 'Kirimkan teks pesan penjualan biasa (misal: "2 hotwheels @35k tunai").',
        });
        return res.sendStatus(200);
      }

      const text = message.text.body;
      console.log(`WhatsApp message from ${fromNumber} (${contactName}): "${text}"`);

      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'incoming_message',
        status: 'info',
        title: 'Pesan Masuk dari WhatsApp',
        summary: `Dari ${contactName} (+${fromNumber}): "${text}"`,
        sender: `+${fromNumber}`,
        details: { text, contactName, messageId: message.id },
      });

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
        console.log(`Transaction saved from WhatsApp: ${transaction.id}`);

        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'incoming_message',
          status: 'success',
          title: `Penjualan Berhasil Dicatat (${transaction.id})`,
          summary: `Total Rp ${transaction.totalAmount.toLocaleString('id-ID')} (${transaction.items.length} item) berhasil disimpan.`,
          sender: `+${fromNumber}`,
          details: transaction,
        });
      } else {
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'incoming_message',
          status: 'warning',
          title: 'Format Chat Bukan Transaksi',
          summary: `Pesan dari +${fromNumber} bukan format penjualan. Bot menyiapkan balasan petunjuk.`,
          sender: `+${fromNumber}`,
          details: parsed,
          troubleshootingHint: 'Format contoh: "2 Hotwheels @35k lunas tunai"',
        });
      }

      // Send reply if WhatsApp access token is present
      const settings = storage.getSettings();
      const accessToken = settings.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
      const phoneIdToUse = settings.whatsappPhoneNumberId || change?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '1298143596718298';

      if (accessToken && phoneIdToUse) {
        const replyRes = await fetch(`https://graph.facebook.com/v20.0/${phoneIdToUse}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: fromNumber,
            type: 'text',
            text: { body: parsed.reply_message },
          }),
        });

        if (!replyRes.ok) {
          const errData = await replyRes.text();
          let parsedErr: any = null;
          try {
            parsedErr = JSON.parse(errData);
          } catch (e) {
            // ignore
          }

          const fbErr = parsedErr?.error;
          const errAnalysis = analyzeMetaError(fbErr?.code, fbErr?.title, fbErr?.message || errData);
          console.error('WA Cloud API reply error response:', errData);

          storage.addWebhookLog({
            source: 'whatsapp',
            type: 'reply_error',
            status: 'error',
            title: errAnalysis.title,
            summary: `Gagal mengirim balasan ke +${fromNumber}. Meta: ${fbErr?.message || errData}`,
            sender: `+${fromNumber}`,
            errorCode: fbErr?.code,
            details: parsedErr || errData,
            troubleshootingHint: `${errAnalysis.explanation} -> ${errAnalysis.hint}`,
          });
        } else {
          console.log(`WA reply successfully sent to ${fromNumber}`);
          storage.addWebhookLog({
            source: 'whatsapp',
            type: 'reply_sent',
            status: 'success',
            title: 'Struk Nota Terkirim ke WhatsApp',
            summary: `Nota transaksi berhasil dikirim ke +${fromNumber}.`,
            sender: `+${fromNumber}`,
          });
        }
      } else {
        console.warn('WhatsApp Access Token or Phone Number ID not configured in settings. Reply could not be sent.');
        storage.addWebhookLog({
          source: 'whatsapp',
          type: 'reply_error',
          status: 'warning',
          title: 'Balasan Tidak Terkirim: Token Belum Diisi',
          summary: 'WhatsApp Access Token atau Phone Number ID belum dikonfigurasi di tab WhatsApp Bot.',
          sender: `+${fromNumber}`,
          troubleshootingHint: 'Buka menu tab Integrasi & Bot > WhatsApp Bot > Simpan Phone Number ID & Access Token Anda.',
        });
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error('WhatsApp webhook error:', err);
      storage.addWebhookLog({
        source: 'whatsapp',
        type: 'general_error',
        status: 'error',
        title: 'Kesalahan Server Webhook',
        summary: err.message,
        details: err,
      });
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
