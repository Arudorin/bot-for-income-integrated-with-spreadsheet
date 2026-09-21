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
  customWebhookDomain?: string;
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

export interface WebhookLogItem {
  id: string;
  timestamp: string;
  source: 'whatsapp' | 'telegram';
  type: 'incoming_message' | 'message_status' | 'verification' | 'reply_sent' | 'reply_error' | 'general_error';
  status: 'success' | 'warning' | 'error' | 'info';
  title: string;
  summary: string;
  sender?: string;
  details?: any;
  troubleshootingHint?: string;
  errorCode?: string | number;
}

export interface WhatsAppDiagnosticInfo {
  configured: boolean;
  valid?: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  error?: string;
  errorDetails?: any;
  errorAnalysis?: {
    title: string;
    explanation: string;
    hint: string;
  };
  serverUrl: string;
  verifyToken: string;
  hasAccessToken: boolean;
  hasPhoneId: boolean;
  lastWebhookPing?: string;
  recentLogs: WebhookLogItem[];
}

export type UserRole = 'admin' | 'cashier';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  lastLogin?: string;
}

export interface UserAccount extends AuthUser {
  passwordHash: string;
  salt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}
