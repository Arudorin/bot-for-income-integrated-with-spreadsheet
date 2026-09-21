import React from 'react';
import { Table, MessageSquare, Settings2, Sparkles, RefreshCw, Plus, Lock, UserCheck, LogOut } from 'lucide-react';
import { BotSettings, AuthUser } from '../types';

interface NavbarProps {
  activeTab: 'spreadsheet' | 'simulator' | 'webhook';
  setActiveTab: (tab: 'spreadsheet' | 'simulator' | 'webhook') => void;
  settings: BotSettings | null;
  onRefresh: () => void;
  isLoading: boolean;
  onQuickAdd: () => void;
  currentUser: AuthUser | null;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onRefresh,
  isLoading,
  onQuickAdd,
  currentUser,
  onOpenProfile,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-xs ring-2 ring-emerald-100 shrink-0">
                <Table className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {settings?.businessName || 'Bot Penjualan'}
                  </h1>
                  <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-emerald-600" />
                    AI
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">
                  Auto-record WA & Telegram ke Google Spreadsheet
                </p>
              </div>
            </div>

            {/* Desktop Center Tabs */}
            <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
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
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                id="btn-refresh-data"
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Perbarui Data"
                aria-label="Perbarui Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>

              <button
                id="btn-quick-add-transaction"
                type="button"
                onClick={onQuickAdd}
                className="inline-flex items-center px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span className="hidden xs:inline">Input Manual</span>
                <span className="xs:hidden">Input</span>
              </button>

              {/* User Account / Login Button */}
              {currentUser ? (
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <button
                    id="btn-user-profile"
                    type="button"
                    onClick={onOpenProfile}
                    className="inline-flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors min-h-[36px]"
                    title={`Akun: ${currentUser.name} (Klik untuk pengaturan akun/password)`}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 bg-emerald-600">
                      👑
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-bold text-slate-800 leading-tight max-w-[90px] truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold leading-none">
                        Admin Kasir
                      </div>
                    </div>
                  </button>

                  {onLogout && (
                    <button
                      id="btn-logout-navbar"
                      type="button"
                      onClick={onLogout}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Keluar / Logout"
                      aria-label="Keluar dari akun"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  id="btn-open-login"
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors min-h-[36px]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Screens < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('spreadsheet')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition-all min-h-[44px] ${
            activeTab === 'spreadsheet'
              ? 'text-emerald-700 font-bold bg-emerald-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Table className={`w-5 h-5 mb-0.5 ${activeTab === 'spreadsheet' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Spreadsheet</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition-all min-h-[44px] relative ${
            activeTab === 'simulator'
              ? 'text-blue-700 font-bold bg-blue-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 mb-0.5 ${activeTab === 'simulator' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-white"></span>
          </div>
          <span>Chat Bot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('webhook')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition-all min-h-[44px] relative ${
            activeTab === 'webhook'
              ? 'text-purple-700 font-bold bg-purple-50/60'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 className={`w-5 h-5 mb-0.5 ${activeTab === 'webhook' ? 'text-purple-600' : 'text-slate-400'}`} />
          <span>Webhook & Bot</span>
        </button>
      </div>
    </>
  );
};
