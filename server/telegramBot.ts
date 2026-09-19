import { storage } from './storage.js';
import { parseSalesMessage } from './geminiParser.js';
import { syncTransactionToGoogleSheets } from './googleSheetsSync.js';
import { SaleTransaction } from '../src/types.js';

class TelegramBotService {
  private isPolling: boolean = false;
  private shouldStop: boolean = false;
  private lastOffset: number = 0;
  private pollingTimeout: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private lastActivityTime: string | null = null;

  public getStatus() {
    const settings = storage.getSettings();
    return {
      isPolling: this.isPolling,
      botUsername: settings.telegramBotUsername || null,
      hasToken: Boolean(settings.telegramBotToken),
      lastError: this.lastError,
      lastActivityTime: this.lastActivityTime,
    };
  }

  public async init() {
    const settings = storage.getSettings();
    if (settings.telegramBotToken) {
      console.log('[Telegram] Bot token detected at startup, initializing polling daemon...');
      await this.startPolling(settings.telegramBotToken);
    }
  }

  public async sendTelegramMessage(token: string, chatId: number | string, text: string) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('[Telegram] Failed to send message:', err.message);
      return { ok: false, description: err.message };
    }
  }

  public async handleIncomingMessage(botToken: string, message: any) {
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();
    const senderName = message.from
      ? `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || message.from.username || 'User'
      : 'User';
    const senderTag = message.from?.username ? `@${message.from.username}` : senderName;

    this.lastActivityTime = new Date().toISOString();

    // Command: /start
    if (text === '/start' || text.startsWith('/start ')) {
      const welcomeText =
        `👋 *Halo, ${senderName}!* Selamat datang di Bot Kasir *Toy Island* 🧸🚗\n\n` +
        `Bot ini otomatis mencatat semua penjualan toko Anda langsung ke Spreadsheet secara realtime.\n\n` +
        `📝 *Cara Catat Penjualan:*\n` +
        `Cukup kirim format bebas seperti Anda mencatat biasa, contoh:\n` +
        `• \`honda odysey laku 50k\`\n` +
        `• \`2 Hotwheels @35k, 1 Lego 150rb bayar QRIS a.n Budi\`\n` +
        `• \`3 Kaos Toy Island @85k trf BCA mas Hendra\`\n\n` +
        `🟢 *Status:* Terhubung & Siap Mencatat! Silakan kirim transaksi pertama Anda.`;

      await this.sendTelegramMessage(botToken, chatId, welcomeText);
      return;
    }

    // Command: /help
    if (text === '/help' || text.startsWith('/help ')) {
      const helpText =
        `ℹ️ *Panduan Penggunaan Bot Kasir Toy Island:*\n\n` +
        `1. *Kirim Pesan Penjualan:*\n` +
        `Tulis nama barang, jumlah (qty), harga (bisa pakai k / rb), dan metode bayar (Tunai, QRIS, BCA, dll).\n\n` +
        `2. *Contoh Format Bebas:*\n` +
        `• _"Action Figure Spiderman 120rb bayar QRIS"_\n` +
        `• _"2 Gundam HG @220k, 1 Cat Acrylic 35rb transfer Mandiri"_\n` +
        `• _"Boneka Teddy Bear 75k tunai"_\n\n` +
        `3. Bot akan membalas dengan struk nota resmi dan baris baru langsung tersimpan di spreadsheet web aplikasi.`;

      await this.sendTelegramMessage(botToken, chatId, helpText);
      return;
    }

    // Parse transaction using Gemini AI / heuristic
    try {
      console.log(`[Telegram] Processing message from ${senderTag}: "${text}"`);
      const parsed = await parseSalesMessage(text, 'telegram', senderTag);

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
          sender: senderTag,
          customerName: parsed.customer_name || senderName,
          rawMessage: text,
          items: (parsed.items || []).map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unit_price,
            subtotal: it.subtotal,
            category: it.category || 'Mainan & Hobi',
          })),
          subtotal: parsed.subtotal || 0,
          discount: parsed.discount || 0,
          tax: parsed.tax || 0,
          totalAmount: parsed.total_amount || 0,
          paymentMethod: parsed.payment_method || 'Tunai',
          paymentStatus: parsed.payment_status || 'Lunas',
          notes: parsed.notes || 'Dicatat via Telegram Bot',
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
        console.log(`[Telegram] Sale transaction saved successfully: ${transaction.id}`);
      }

      // Send reply
      const reply = parsed.reply_message || '✅ Pesan diterima dan diproses!';
      await this.sendTelegramMessage(botToken, chatId, reply);
    } catch (err: any) {
      console.error('[Telegram] Error processing sales message:', err);
      await this.sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ Maaf, terjadi kendala saat memproses catatan: ${err.message}. Mohon coba sesaat lagi.`
      );
    }
  }

  public async startPolling(token?: string) {
    const settings = storage.getSettings();
    const botToken = token || settings.telegramBotToken;

    if (!botToken) {
      throw new Error('Telegram Bot Token belum diisi');
    }

    if (this.isPolling) {
      console.log('[Telegram] Polling already active');
      return;
    }

    this.shouldStop = false;
    this.isPolling = true;
    this.lastError = null;

    // First delete any existing webhook to enable getUpdates
    try {
      console.log('[Telegram] Deleting webhook to switch to polling...');
      await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    } catch (err) {
      console.warn('[Telegram] Delete webhook notice:', err);
    }

    // Verify bot identity
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result?.username) {
        storage.updateSettings({
          telegramBotToken: botToken,
          telegramBotUsername: meData.result.username,
          telegramWebhookActive: true,
        });
        console.log(`[Telegram] Polling service active for @${meData.result.username}`);
      }
    } catch (e: any) {
      console.error('[Telegram] Error verifying bot:', e.message);
    }

    // Start background loop
    this.pollLoop(botToken);
  }

  public stopPolling() {
    this.shouldStop = true;
    this.isPolling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    console.log('[Telegram] Polling stopped');
  }

  private async pollLoop(botToken: string) {
    while (!this.shouldStop && this.isPolling) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${this.lastOffset}&timeout=20`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastOffset = update.update_id + 1;
            if (update.message) {
              await this.handleIncomingMessage(botToken, update.message);
            }
          }
        } else if (!data.ok) {
          this.lastError = data.description || 'Telegram API Error';
          console.warn('[Telegram API Polling Notice]:', this.lastError);
          // Wait 3s before retrying
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err: any) {
        if (!this.shouldStop) {
          this.lastError = err.message;
          // Wait 2.5s before reconnecting
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    }
  }
}

export const telegramBotService = new TelegramBotService();
