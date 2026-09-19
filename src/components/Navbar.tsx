import React from 'react';
import { Table, MessageSquare, Settings2, Sparkles, RefreshCw, Smartphone } from 'lucide-react';
import { BotSettings } from '../types';

interface NavbarProps {
  activeTab: 'spreadsheet' | 'simulator' | 'webhook';
  setActiveTab: (tab: 'spreadsheet' | 'simulator' | 'webhook') => void;
  settings: BotSettings | null;
  onRefresh: () => void;
  isLoading: boolean;
  onQuickAdd: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onRefresh,
  isLoading,
  onQuickAdd,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-100">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {settings?.businessName || 'Bot Penjualan Spreadsheet'}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500">Auto-record WA & Telegram ke Google Spreadsheet</p>
            </div>
          </div>

          {/* Center Tabs */}
          <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <button
              id="nav-tab-spreadsheet"
              type="button"
              onClick={() => setActiveTab('spreadsheet')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'spreadsheet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Spreadsheet</span>
            </button>

            <button
              id="nav-tab-simulator"
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Chat Simulator</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            <button
              id="nav-tab-webhook"
              type="button"
              onClick={() => setActiveTab('webhook')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'webhook'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span>Bot & Webhook</span>
              {settings?.telegramWebhookActive && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-refresh-data"
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              id="btn-quick-add-transaction"
              type="button"
              onClick={onQuickAdd}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              + Input Manual
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
