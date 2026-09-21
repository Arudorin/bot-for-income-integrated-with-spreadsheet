import React, { useState, useEffect, useCallback } from 'react';
import { SaleTransaction, SpreadsheetStats, BotSettings, ChatMessage, AuthUser } from './types';
import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { SpreadsheetView } from './components/SpreadsheetView';
import { BotSimulator } from './components/BotSimulator';
import { WebhookSetup } from './components/WebhookSetup';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { LoginPage } from './components/LoginPage';
import { UserProfileModal } from './components/UserProfileModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'simulator' | 'webhook'>('spreadsheet');
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [stats, setStats] = useState<SpreadsheetStats | null>(null);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAddedSale, setLastAddedSale] = useState<SaleTransaction | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SaleTransaction | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial sales and settings
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesRes, settingsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/settings'),
      ]);

      if (salesRes.ok) {
        const data = await salesRes.json();
        setTransactions(data.transactions || []);
        setStats(data.stats || null);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check auth session on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('bot_auth_token') || sessionStorage.getItem('bot_auth_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setCurrentUser(data.user);
            setIsCheckingAuth(false);
            return;
          }
        } catch (err) {
          console.error('Session check failed:', err);
        }
        localStorage.removeItem('bot_auth_token');
        sessionStorage.removeItem('bot_auth_token');
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: AuthUser, _token: string) => {
    setCurrentUser(user);
    showToast('success', `Berhasil masuk! Selamat datang, ${user.name}.`);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('bot_auth_token') || sessionStorage.getItem('bot_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('bot_auth_token');
    sessionStorage.removeItem('bot_auth_token');
    setCurrentUser(null);
    showToast('success', 'Anda telah berhasil keluar dari akun (logout).');
  };

  // Handle simulated message send
  const handleSendMessage = async (
    text: string,
    platform: 'whatsapp' | 'telegram',
    sender: string
  ): Promise<ChatMessage | null> => {
    try {
      const res = await fetch('/api/sales/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, platform, sender }),
      });

      const data = await res.json();
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (data.is_sale && data.transaction) {
        setTransactions((prev) => [data.transaction, ...prev]);
        setStats(data.stats);
        setLastAddedSale(data.transaction);
        showToast('success', `✨ Transaksi ${data.transaction.id} berhasil ditambahkan ke Spreadsheet!`);

        return {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          platform,
          text: data.reply_message,
          timestamp: timeStr,
          parsedSale: data.transaction,
        };
      } else {
        return {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          platform,
          text: data.reply_message,
          timestamp: timeStr,
        };
      }
    } catch (err) {
      console.error('Error parsing sales message:', err);
      return {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        platform,
        text: '❌ Terjadi kendala saat memproses catatan penjualan. Silakan coba lagi.',
        timestamp: 'Error',
      };
    }
  };

  // Save manual transaction (Add or Edit)
  const handleSaveTransaction = async (txData: any) => {
    try {
      if (txData.id) {
        // Edit existing
        const res = await fetch(`/api/sales/${txData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(txData),
        });
        if (res.ok) {
          const updated = await res.json();
          setTransactions((prev) => prev.map((t) => (t.id === txData.id ? updated.transaction : t)));
          setStats(updated.stats);
          showToast('success', 'Baris transaksi berhasil diperbarui');
        }
      } else {
        // Add new manual
        const res = await fetch('/api/sales/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(txData),
        });
        if (res.ok) {
          const created = await res.json();
          setTransactions((prev) => [created.transaction, ...prev]);
          setStats(created.stats);
          showToast('success', 'Transaksi manual berhasil dicatat ke Spreadsheet');
        }
      }
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan transaksi: ' + err.message);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setStats(data.stats);
        showToast('success', 'Baris transaksi berhasil dihapus');
      }
    } catch (err: any) {
      showToast('error', 'Gagal menghapus: ' + err.message);
    }
  };

  // Delete batch of transactions
  const handleDeleteBatch = async (ids: string[]) => {
    try {
      const res = await fetch('/api/sales/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        const idSet = new Set(ids);
        setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
        setStats(data.stats);
        showToast('success', `${ids.length} transaksi berhasil dihapus`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal menghapus transaksi: ' + err.message);
    }
  };

  // Clear all transactions
  const handleClearAll = async () => {
    try {
      const res = await fetch('/api/sales/clear-all', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTransactions([]);
        setStats(data.stats);
        showToast('success', 'Semua data transaksi berhasil dibersihkan');
      }
    } catch (err: any) {
      showToast('error', 'Gagal mengosongkan transaksi: ' + err.message);
    }
  };

  // Sync to Google Sheets
  const handleSyncGoogleSheets = async (transactionId?: string): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    try {
      const endpoint = transactionId ? '/api/sync/google-sheets' : '/api/sync/google-sheets/all';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Sinkronisasi ke Google Sheets berhasil');
        fetchData();
        return { success: true, message: data.message || 'Sinkronisasi ke Google Sheets berhasil' };
      } else {
        const msg = data.error || data.message || 'Sinkronisasi gagal';
        showToast('error', msg);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = 'Gagal menghubungi Google Sheets: ' + err.message;
      showToast('error', msg);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync batch of transactions to Google Sheets
  const handleSyncBatchGoogleSheets = async (ids: string[]): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/google-sheets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', data.message || 'Sinkronisasi batch berhasil');
        fetchData();
        return { success: true, message: data.message };
      } else {
        showToast('error', data.error || 'Gagal menyinkronkan');
        return { success: false, message: data.error };
      }
    } catch (err: any) {
      showToast('error', 'Gagal sinkron: ' + err.message);
      return { success: false, message: err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull transactions from Google Sheets (Sinkron DARI Spreadsheet)
  const handlePullFromGoogleSheets = async (): Promise<{ success: boolean; message: string; count?: number }> => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/google-sheets/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setStats(data.stats);
        showToast('success', data.message);
        return { success: true, message: data.message, count: data.count };
      } else {
        const msg = data.error || 'Gagal menarik data dari Google Sheets';
        showToast('error', msg);
        return { success: false, message: msg };
      }
    } catch (err: any) {
      const msg = 'Gagal menghubungi server: ' + err.message;
      showToast('error', msg);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  };

  // Batch update status (Lunas / Belum Lunas)
  const handleUpdateBatchStatus = async (ids: string[], status: 'Lunas' | 'Belum Lunas') => {
    try {
      const res = await fetch('/api/sales/update-batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setStats(data.stats);
        showToast('success', `${data.count} transaksi berhasil ditandai ${status}`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal memperbarui status: ' + err.message);
    }
  };

  // Import transactions from paste or table
  const handleImportTransactions = async (importedTxs: SaleTransaction[]) => {
    try {
      const res = await fetch('/api/sales/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: importedTxs }),
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setStats(data.stats);
        showToast('success', `Berhasil mengimpor ${importedTxs.length} transaksi (${data.added} baru, ${data.updated} diperbarui)`);
      }
    } catch (err: any) {
      showToast('error', 'Gagal mengimpor: ' + err.message);
    }
  };

  // Save Bot & Webhook Settings
  const handleSaveSettings = async (newSettings: Partial<BotSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
        showToast('success', 'Pengaturan berhasil disimpan');
      }
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan pengaturan: ' + err.message);
    }
  };

  // Telegram test token
  const handleTestTelegram = async (token: string) => {
    try {
      const res = await fetch('/api/telegram/test-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Set Telegram Webhook
  const handleSetTelegramWebhook = async (token: string) => {
    try {
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => (prev ? { ...prev, telegramWebhookActive: true } : null));
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-3 px-5 py-3 rounded-2xl bg-white shadow-sm border border-slate-200 text-slate-700 text-sm font-medium">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

  // Direct login page if not authenticated
  if (!currentUser) {
    return (
      <>
        {toast && (
          <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:top-5 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white ${
                toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-100 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
          </div>
        )}
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          businessName={settings?.businessName || 'Bot Penjualan'}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:top-5 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-100 shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        onRefresh={fetchData}
        isLoading={isLoading}
        onQuickAdd={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenLogin={() => {}}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
        {/* TAB 1: SPREADSHEET VIEW */}
        {activeTab === 'spreadsheet' && (
          <div>
            <StatsCards stats={stats} />
            <SpreadsheetView
              transactions={transactions}
              onAddManual={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteBatch={handleDeleteBatch}
              onClearAll={handleClearAll}
              onUpdateBatchStatus={handleUpdateBatchStatus}
              onSyncGoogleSheets={handleSyncGoogleSheets}
              onSyncBatchGoogleSheets={handleSyncBatchGoogleSheets}
              onPullFromGoogleSheets={handlePullFromGoogleSheets}
              onImportTransactions={handleImportTransactions}
              hasGoogleSheetsConfigured={Boolean(settings?.googleAppsScriptUrl)}
              isSyncing={isSyncing}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* TAB 2: CHAT BOT SIMULATOR */}
        {activeTab === 'simulator' && (
          <div>
            <BotSimulator
              onSendMessage={handleSendMessage}
              onViewSpreadsheet={() => setActiveTab('spreadsheet')}
              lastAddedSale={lastAddedSale}
            />
          </div>
        )}

        {/* TAB 3: WEBHOOK & BOT INTEGRATIONS */}
        {activeTab === 'webhook' && (
          <div>
            <WebhookSetup
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onTestTelegram={handleTestTelegram}
              onSetTelegramWebhook={handleSetTelegramWebhook}
              onTestGoogleSheetsSync={() => handleSyncGoogleSheets()}
              currentUser={currentUser}
            />
          </div>
        )}
      </main>

      {/* Manual Input / Edit Modal */}
      <ManualTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
      />

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onPasswordChanged={() => {
          showToast('success', 'Password berhasil diubah!');
        }}
      />
    </div>
  );
}

