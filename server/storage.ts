import fs from 'fs';
import path from 'path';
import { SaleTransaction, BotSettings, SpreadsheetStats, WebhookLogItem, UserAccount } from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  transactions: SaleTransaction[];
  settings: BotSettings;
  webhookLogs?: WebhookLogItem[];
  users?: UserAccount[];
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
  customWebhookDomain: 'https://toyisland-income.ai.studio',
};

const INITIAL_TRANSACTIONS: SaleTransaction[] = [];

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
          webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
          users: Array.isArray(parsed.users) ? parsed.users : [],
        };
      }
    } catch (err) {
      console.error('Error loading db.json, using defaults:', err);
    }
    const initial: DatabaseSchema = {
      transactions: INITIAL_TRANSACTIONS,
      settings: DEFAULT_SETTINGS,
      webhookLogs: [],
      users: [],
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

  public deleteTransactions(ids: string[]): number {
    const set = new Set(ids);
    const initialLength = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter((t) => !set.has(t.id));
    if (this.data.transactions.length !== initialLength) {
      this.saveData(this.data);
    }
    return initialLength - this.data.transactions.length;
  }

  public clearAllTransactions(): void {
    this.data.transactions = [];
    this.saveData(this.data);
  }

  public updateBatchStatus(ids: string[], paymentStatus: 'Lunas' | 'Belum Lunas'): number {
    const set = new Set(ids);
    let updatedCount = 0;
    this.data.transactions = this.data.transactions.map((tx) => {
      if (set.has(tx.id)) {
        updatedCount++;
        return { ...tx, paymentStatus };
      }
      return tx;
    });
    if (updatedCount > 0) {
      this.saveData(this.data);
    }
    return updatedCount;
  }

  public importTransactions(newTxs: SaleTransaction[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;
    for (const tx of newTxs) {
      const existingIdx = this.data.transactions.findIndex((t) => t.id === tx.id);
      if (existingIdx !== -1) {
        this.data.transactions[existingIdx] = { ...this.data.transactions[existingIdx], ...tx };
        updated++;
      } else {
        this.data.transactions.unshift(tx);
        added++;
      }
    }
    if (added > 0 || updated > 0) {
      this.saveData(this.data);
    }
    return { added, updated };
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

  public getWebhookLogs(limit = 40): WebhookLogItem[] {
    if (!Array.isArray(this.data.webhookLogs)) {
      this.data.webhookLogs = [];
    }
    return this.data.webhookLogs.slice(0, limit);
  }

  public addWebhookLog(entry: Omit<WebhookLogItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): WebhookLogItem {
    if (!Array.isArray(this.data.webhookLogs)) {
      this.data.webhookLogs = [];
    }
    const logItem: WebhookLogItem = {
      id: entry.id || `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      source: entry.source,
      type: entry.type,
      status: entry.status,
      title: entry.title,
      summary: entry.summary,
      sender: entry.sender,
      details: entry.details,
      troubleshootingHint: entry.troubleshootingHint,
      errorCode: entry.errorCode,
    };

    this.data.webhookLogs.unshift(logItem);
    // Keep max 100 logs
    if (this.data.webhookLogs.length > 100) {
      this.data.webhookLogs = this.data.webhookLogs.slice(0, 100);
    }
    this.saveData(this.data);
    return logItem;
  }

  public clearWebhookLogs(): void {
    this.data.webhookLogs = [];
    this.saveData(this.data);
  }

  // --- User Authentication & Management ---
  public getUsers(): UserAccount[] {
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    return this.data.users;
  }

  public getUserByUsername(username: string): UserAccount | undefined {
    const clean = username.trim().toLowerCase();
    return this.getUsers().find((u) => u.username.toLowerCase() === clean);
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public saveUser(user: UserAccount): UserAccount {
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    const idx = this.data.users.findIndex((u) => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...user };
    } else {
      this.data.users.push(user);
    }
    this.saveData(this.data);
    return user;
  }

  public setUsers(users: UserAccount[]): void {
    this.data.users = users;
    this.saveData(this.data);
  }

  public updateUser(id: string, updates: Partial<UserAccount>): UserAccount | null {
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.saveData(this.data);
    return this.data.users[idx];
  }
}

export const storage = new Storage();
