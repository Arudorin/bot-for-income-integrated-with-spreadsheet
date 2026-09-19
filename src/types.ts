export interface SaleItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  category?: string;
}

export interface SaleTransaction {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  platform: 'whatsapp' | 'telegram' | 'manual';
  sender: string;
  customerName: string;
  rawMessage: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'Lunas' | 'Belum Lunas';
  notes: string;
  syncedToGoogleSheets?: boolean;
}

export interface SpreadsheetStats {
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageTicket: number;
  todayRevenue: number;
  todayTransactions: number;
  platformBreakdown: {
    whatsapp: number;
    telegram: number;
    manual: number;
  };
  paymentBreakdown: Record<string, number>;
}

export interface BotSettings {
  businessName: string;
  currency: string;
  telegramBotToken: string;
  telegramBotUsername: string;
  telegramWebhookActive: boolean;
  whatsappVerifyToken: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  googleAppsScriptUrl: string;
  googleSheetsAutoSync: boolean;
  lastWebhookPing?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  platform: 'whatsapp' | 'telegram';
  text: string;
  timestamp: string;
  parsedSale?: SaleTransaction;
  status?: 'sending' | 'sent' | 'parsed' | 'error';
}

export interface ParseSaleResponse {
  is_sale: boolean;
  customer_name?: string;
  items?: Array<{
    name: string;
    qty: number;
    unit_price: number;
    subtotal: number;
    category?: string;
  }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount?: number;
  payment_method?: string;
  payment_status?: 'Lunas' | 'Belum Lunas';
  notes?: string;
  reply_message: string;
}
