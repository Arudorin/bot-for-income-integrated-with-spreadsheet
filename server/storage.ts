import fs from 'fs';
import path from 'path';
import { SaleTransaction, BotSettings, SpreadsheetStats } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  transactions: SaleTransaction[];
  settings: BotSettings;
}

const DEFAULT_SETTINGS: BotSettings = {
  businessName: 'Toy Island',
  currency: 'IDR',
  telegramBotToken: '',
  telegramBotUsername: '',
  telegramWebhookActive: false,
  whatsappVerifyToken: 'toyisland_wa_verify_2026',
  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
  googleAppsScriptUrl: '',
  googleSheetsAutoSync: false,
};

const INITIAL_TRANSACTIONS: SaleTransaction[] = [
  {
    id: 'TRX-20260919-001',
    timestamp: '2026-09-19T08:15:00.000Z',
    date: '2026-09-19',
    time: '08:15',
    platform: 'whatsapp',
    sender: '+6281288991122',
    customerName: 'Kak Sarah',
    rawMessage: 'Pagi kak, pesan Kopi Susu Aren 2 @18.000 sama Roti Bakar Coklat 1 15rb ya. Bayar via QRIS',
    items: [
      { id: 'item-1', name: 'Kopi Susu Aren', qty: 2, unitPrice: 18000, subtotal: 36000, category: 'Minuman' },
      { id: 'item-2', name: 'Roti Bakar Coklat', qty: 1, unitPrice: 15000, subtotal: 15000, category: 'Makanan' },
    ],
    subtotal: 51000,
    discount: 0,
    tax: 0,
    totalAmount: 51000,
    paymentMethod: 'QRIS',
    paymentStatus: 'Lunas',
    notes: 'Meja 03 - Pesanan pagi',
    syncedToGoogleSheets: true,
  },
  {
    id: 'TRX-20260919-002',
    timestamp: '2026-09-19T09:40:00.000Z',
    date: '2026-09-19',
    time: '09:40',
    platform: 'telegram',
    sender: '@rendy_pratama',
    customerName: 'Mas Rendy',
    rawMessage: 'Laku Kaos Polos Hitam Cotton 24s size L 3 pcs @65k. Transfer BCA atas nama Rendy',
    items: [
      { id: 'item-3', name: 'Kaos Polos Hitam Cotton 24s (L)', qty: 3, unitPrice: 65000, subtotal: 195000, category: 'Pakaian' },
    ],
    subtotal: 195000,
    discount: 0,
    tax: 0,
    totalAmount: 195000,
    paymentMethod: 'Transfer BCA',
    paymentStatus: 'Lunas',
    notes: 'Kirim via J&T Express',
    syncedToGoogleSheets: true,
  },
  {
    id: 'TRX-20260919-003',
    timestamp: '2026-09-19T10:12:00.000Z',
    date: '2026-09-19',
    time: '10:12',
    platform: 'whatsapp',
    sender: '+6285711223344',
    customerName: 'Ibu Dewi',
    rawMessage: 'Catat ya min: Nasi Ayam Geprek Sambal Matah 4 porsi @25.000, Es Teh Manis 4 @4.000, bayar tunai pas',
    items: [
      { id: 'item-4', name: 'Nasi Ayam Geprek Sambal Matah', qty: 4, unitPrice: 25000, subtotal: 100000, category: 'Makanan' },
      { id: 'item-5', name: 'Es Teh Manis', qty: 4, unitPrice: 4000, subtotal: 16000, category: 'Minuman' },
    ],
    subtotal: 116000,
    discount: 0,
    tax: 0,
    totalAmount: 116000,
    paymentMethod: 'Tunai',
    paymentStatus: 'Lunas',
    notes: 'Takeaway kantor lantai 3',
    syncedToGoogleSheets: true,
  },
  {
    id: 'TRX-20260918-004',
    timestamp: '2026-09-18T14:20:00.000Z',
    date: '2026-09-18',
    time: '14:20',
    platform: 'telegram',
    sender: '@dewi_boutique',
    customerName: 'Dewi',
    rawMessage: 'Laku Gamis Silk Motif Flora 1 pcs 220.000 diskon 20rb, bayar Transfer Mandiri',
    items: [
      { id: 'item-6', name: 'Gamis Silk Motif Flora', qty: 1, unitPrice: 220000, subtotal: 220000, category: 'Fashion' },
    ],
    subtotal: 220000,
    discount: 20000,
    tax: 0,
    totalAmount: 200000,
    paymentMethod: 'Transfer Mandiri',
    paymentStatus: 'Lunas',
    notes: 'Promo flash sale akhir pekan',
    syncedToGoogleSheets: true,
  },
  {
    id: 'TRX-20260918-005',
    timestamp: '2026-09-18T16:45:00.000Z',
    date: '2026-09-18',
    time: '16:45',
    platform: 'whatsapp',
    sender: '+6281900887766',
    customerName: 'Pak Hendra',
    rawMessage: 'Catat Mas: Paket Kopi Arabika Gayo 250gr 2 bks @75.000, bayar GoPay',
    items: [
      { id: 'item-7', name: 'Kopi Arabika Gayo 250gr', qty: 2, unitPrice: 75000, subtotal: 150000, category: 'Kopi' },
    ],
    subtotal: 150000,
    discount: 0,
    tax: 0,
    totalAmount: 150000,
    paymentMethod: 'GoPay',
    paymentStatus: 'Lunas',
    notes: 'Beans roasted medium-dark',
    syncedToGoogleSheets: false,
  },
];

class Storage {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_TRANSACTIONS,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Error loading db.json, using defaults:', err);
    }
    const initial: DatabaseSchema = {
      transactions: INITIAL_TRANSACTIONS,
      settings: DEFAULT_SETTINGS,
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  public getTransactions(): SaleTransaction[] {
    return this.data.transactions;
  }

  public addTransaction(transaction: SaleTransaction): SaleTransaction {
    this.data.transactions.unshift(transaction);
    this.saveData(this.data);
    return transaction;
  }

  public updateTransaction(id: string, updates: Partial<SaleTransaction>): SaleTransaction | null {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.data.transactions[idx] = { ...this.data.transactions[idx], ...updates };
    this.saveData(this.data);
    return this.data.transactions[idx];
  }

  public deleteTransaction(id: string): boolean {
    const initialLength = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter((t) => t.id !== id);
    if (this.data.transactions.length !== initialLength) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  public getSettings(): BotSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<BotSettings>): BotSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveData(this.data);
    return this.data.settings;
  }

  public getStats(): SpreadsheetStats {
    const txs = this.data.transactions;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let totalRevenue = 0;
    let totalItemsSold = 0;
    let todayRevenue = 0;
    let todayTransactions = 0;

    const platformBreakdown = { whatsapp: 0, telegram: 0, manual: 0 };
    const paymentBreakdown: Record<string, number> = {};

    for (const t of txs) {
      totalRevenue += t.totalAmount;
      const itemCount = t.items.reduce((acc, it) => acc + (it.qty || 1), 0);
      totalItemsSold += itemCount;

      if (t.date === todayStr) {
        todayRevenue += t.totalAmount;
        todayTransactions += 1;
      }

      if (t.platform === 'whatsapp') platformBreakdown.whatsapp += 1;
      else if (t.platform === 'telegram') platformBreakdown.telegram += 1;
      else platformBreakdown.manual += 1;

      const method = t.paymentMethod || 'Lainnya';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + t.totalAmount;
    }

    const totalTransactions = txs.length;
    const averageTicket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageTicket,
      todayRevenue,
      todayTransactions,
      platformBreakdown,
      paymentBreakdown,
    };
  }

  public generateId(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const seq = String(this.data.transactions.length + 1).padStart(3, '0');
    return `TRX-${y}${m}${d}-${seq}`;
  }
}

export const storage = new Storage();
