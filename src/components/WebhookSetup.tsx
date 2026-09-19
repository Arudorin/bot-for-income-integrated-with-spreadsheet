import React, { useState, useEffect } from 'react';
import { BotSettings } from '../types';
import {
  Send,
  MessageCircle,
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  RefreshCw,
  Save,
  Zap,
} from 'lucide-react';

interface WebhookSetupProps {
  settings: BotSettings | null;
  onSaveSettings: (settings: Partial<BotSettings>) => Promise<void>;
  onTestTelegram: (token: string) => Promise<{ success: boolean; bot?: any; error?: string }>;
  onSetTelegramWebhook: (token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onTestGoogleSheetsSync: () => Promise<{ success: boolean; message: string }>;
}

export const WebhookSetup: React.FC<WebhookSetupProps> = ({
  settings,
  onSaveSettings,
  onTestTelegram,
  onSetTelegramWebhook,
  onTestGoogleSheetsSync,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'telegram' | 'whatsapp' | 'sheets'>('telegram');

  // Local state form
  const [telegramToken, setTelegramToken] = useState(settings?.telegramBotToken || '');
  const [waVerifyToken, setWaVerifyToken] = useState(settings?.whatsappVerifyToken || 'toyisland_wa_verify_2026');
  const [waAccessToken, setWaAccessToken] = useState(settings?.whatsappAccessToken || '');
  const [waPhoneId, setWaPhoneId] = useState(settings?.whatsappPhoneNumberId || '');
  const [sheetsUrl, setSheetsUrl] = useState(settings?.googleAppsScriptUrl || '');
  const [autoSyncSheets, setAutoSyncSheets] = useState(settings?.googleSheetsAutoSync || false);
  const [businessName, setBusinessName] = useState(settings?.businessName || 'Toy Island');

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tgStatus, setTgStatus] = useState<{
    isPolling: boolean;
    botUsername: string | null;
    hasToken: boolean;
    lastError: string | null;
    lastActivityTime: string | null;
  } | null>(null);

  const fetchTgStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTgStatus(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchTgStatus();
    const interval = setInterval(fetchTgStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.run.app';
  const telegramWebhookUrl = `${currentOrigin}/api/webhook/telegram`;
  const whatsappWebhookUrl = `${currentOrigin}/api/webhook/whatsapp`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    await onSaveSettings({
      businessName,
      telegramBotToken: telegramToken,
      whatsappVerifyToken: waVerifyToken,
      whatsappAccessToken: waAccessToken,
      whatsappPhoneNumberId: waPhoneId,
      googleAppsScriptUrl: sheetsUrl,
      googleSheetsAutoSync: autoSyncSheets,
    });
    setIsSaving(false);
  };

  const handleTestTelegramConnection = async () => {
    if (!telegramToken.trim()) {
      setTestResult({ status: 'error', message: 'Masukkan Token Telegram terlebih dahulu' });
      return;
    }
    setTestResult({ status: 'loading', message: 'Memeriksa bot ke server Telegram...' });
    const res = await onTestTelegram(telegramToken);
    if (res.success) {
      setTestResult({
        status: 'success',
        message: `Bot Terhubung & Aktif! Nama: ${res.bot?.first_name} (@${res.bot?.username})`,
      });
      fetchTgStatus();
    } else {
      setTestResult({ status: 'error', message: res.error || 'Token tidak valid' });
    }
  };

  const handleSetTelegramWebhookCall = async () => {
    if (!telegramToken.trim()) {
      setTestResult({ status: 'error', message: 'Masukkan Token Telegram terlebih dahulu' });
      return;
    }
    setTestResult({ status: 'loading', message: 'Mengaktifkan koneksi bot Telegram...' });
    const res = await onSetTelegramWebhook(telegramToken);
    if (res.success) {
      setTestResult({
        status: 'success',
        message: `Bot Telegram Aktif! Anda bisa langsung chat ke @${tgStatus?.botUsername || 'toyisland_bot'} untuk mencatat penjualan.`,
      });
      fetchTgStatus();
    } else {
      setTestResult({ status: 'error', message: res.error || 'Gagal mengaktifkan bot' });
    }
  };

  const handleTestGoogleSheets = async () => {
    if (!sheetsUrl.trim()) {
      setTestResult({ status: 'error', message: 'Isi URL Google Apps Script Web App terlebih dahulu' });
      return;
    }
    setTestResult({ status: 'loading', message: 'Mengirim baris uji coba ke Google Spreadsheet...' });
    // First save setting
    await onSaveSettings({ googleAppsScriptUrl: sheetsUrl, googleSheetsAutoSync: autoSyncSheets });
    const res = await onTestGoogleSheetsSync();
    if (res.success) {
      setTestResult({ status: 'success', message: res.message });
    } else {
      setTestResult({ status: 'error', message: res.message });
    }
  };

  const googleAppsScriptCode = `// KODE GOOGLE APPS SCRIPT
// Tempel kode ini di Spreadsheet Anda: Ekstensi > Apps Script
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Buat header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID Transaksi",
        "Tanggal",
        "Waktu",
        "Kanal",
        "Nama Pelanggan",
        "Daftar Item",
        "Total Qty",
        "Subtotal",
        "Diskon",
        "Total Akhir (Rp)",
        "Metode Bayar",
        "Status",
        "Catatan"
      ]);
      // Format header tebal & background hijau
      sheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#d1e7dd");
    }
    
    // Tambah baris transaksi baru dari Bot
    sheet.appendRow([
      data.id,
      data.date,
      data.time,
      data.platform ? data.platform.toUpperCase() : "WA/TG",
      data.customerName || "-",
      data.itemsText || "-",
      data.totalQty || 1,
      data.subtotal || 0,
      data.discount || 0,
      data.totalAmount || 0,
      data.paymentMethod || "Tunai",
      data.paymentStatus || "Lunas",
      data.notes || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil dicatat ke Google Sheets"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Sub tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex items-center justify-between flex-wrap gap-2 shadow-xs">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('telegram');
              setTestResult({ status: 'idle', message: '' });
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'telegram'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>1. Telegram Bot (Paling Mudah)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('whatsapp');
              setTestResult({ status: 'idle', message: '' });
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>2. WhatsApp Bot</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('sheets');
              setTestResult({ status: 'idle', message: '' });
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === 'sheets'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>3. Google Sheets Sync</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua'}</span>
        </button>
      </div>

      {/* Test feedback banner */}
      {testResult.status !== 'idle' && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            testResult.status === 'loading'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : testResult.status === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {testResult.status === 'loading' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="font-semibold">{testResult.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestResult({ status: 'idle', message: '' })}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* --- TAB 1: TELEGRAM BOT SETUP --- */}
      {activeSubTab === 'telegram' && (
        <div className="space-y-6">
          {/* Live Status Banner if Bot is Active */}
          {tgStatus?.isPolling && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-emerald-950">Bot Telegram Aktif & Online</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-semibold">
                      @{tgStatus.botUsername || 'toyisland_bot'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Bot siap menerima pesan. Kirim catatan penjualan di Telegram dan data otomatis masuk ke spreadsheet!
                  </p>
                </div>
              </div>
              <a
                href={`https://t.me/${tgStatus.botUsername || 'toyisland_bot'}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
              >
                <span>Buka Chat Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Setup Bot Telegram (1 Menit)</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ikuti 3 langkah mudah ini agar bot Telegram Anda langsung mencatat pesanan ke spreadsheet secara realtime:
              </p>
            </div>

            {/* Step by step */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Buka @BotFather</h4>
                <p className="text-[11px] text-slate-500">
                  Cari <span className="font-mono font-bold text-blue-600">@BotFather</span> di aplikasi Telegram, lalu kirim perintah <code className="bg-white px-1 py-0.5 rounded border border-slate-200">/newbot</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Beri Nama & Username</h4>
                <p className="text-[11px] text-slate-500">
                  Tentukan nama (misal: "Kasir Toy Island") dan username yang berakhiran <code className="bg-white px-1 py-0.5 rounded border border-slate-200">bot</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Salin HTTP API Token</h4>
                <p className="text-[11px] text-slate-500">
                  Tempelkan token yang diberikan BotFather ke kolom di bawah, lalu klik "Aktifkan Bot".
                </p>
              </div>
            </div>

            {/* Token Input Form */}
            <div className="pt-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telegram Bot Token (HTTP API):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-telegram-token"
                    type="password"
                    placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz..."
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleTestTelegramConnection}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shrink-0"
                  >
                    Tes Token
                  </button>
                  <button
                    id="btn-set-telegram-webhook"
                    type="button"
                    onClick={handleSetTelegramWebhookCall}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Aktifkan Bot Realtime</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Token disimpan aman di server. Bot otomatis berjalan secara real-time tanpa perlu pusing setting URL atau webhook.
                </p>
              </div>

              {/* Webhook URL preview (Opsional untuk integrasi luar) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Webhook URL (Opsional / Gateway Khusus):
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  <span className="truncate mr-2">{telegramWebhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(telegramWebhookUrl, 'tg-webhook')}
                    className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs shrink-0"
                  >
                    {copiedKey === 'tg-webhook' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="ml-1 text-[11px]">Salin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: WHATSAPP BOT SETUP --- */}
      {activeSubTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Setup Webhook WhatsApp</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Koneksikan Meta WhatsApp Cloud API atau Gateway WhatsApp pilihan Anda ke webhook aplikasi ini:
              </p>
            </div>

            {/* Webhook Parameters for Meta */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Callback URL (Webhook URL):
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  <span className="truncate mr-2">{whatsappWebhookUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(whatsappWebhookUrl, 'wa-webhook')}
                    className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs"
                  >
                    {copiedKey === 'wa-webhook' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="ml-1 text-[11px]">Salin</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan URL ini ke dashboard Meta Developers &gt; WhatsApp &gt; Configuration &gt; Callback URL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verify Token (Token Verifikasi):
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  <input
                    type="text"
                    value={waVerifyToken}
                    onChange={(e) => setWaVerifyToken(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(waVerifyToken, 'wa-verify')}
                    className="inline-flex items-center px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs ml-2"
                  >
                    {copiedKey === 'wa-verify' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="ml-1 text-[11px]">Salin</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan nilai yang sama di kolom Verify Token di dashboard Meta Developers.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number ID (Opsional untuk balas pesan):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 104829182749182"
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System User Permanent Access Token:
                  </label>
                  <input
                    type="password"
                    placeholder="Contoh: EAAG... (Access Token)"
                    value={waAccessToken}
                    onChange={(e) => setWaAccessToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: GOOGLE SHEETS SYNC --- */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Sinkronisasi Otomatis ke Google Spreadsheet
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selain tersimpan di database bawaan aplikasi ini, setiap transaksi bisa langsung diteruskan ke Google Spreadsheet milik Anda via Google Apps Script (Gratis tanpa batas).
              </p>
            </div>

            {/* Step by step */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Langkah Cepat Setup Google Spreadsheet (2 Menit):
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <li>Buka <strong>Google Sheets</strong> baru di akun Google Anda (beri nama misalnya <em>"Catatan Penjualan WA"</em>).</li>
                <li>Klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                <li>Hapus kode bawaan dan tempel kode di bawah ini, lalu klik ikon <strong>Simpan</strong>.</li>
                <li>Klik tombol <strong>Deploy &gt; New deployment</strong>, pilih jenis <strong>Web app</strong>.</li>
                <li>Ubah <em>Who has access</em> menjadi <strong>Anyone</strong> (Siapa saja), lalu klik <strong>Deploy</strong>.</li>
                <li>Salin <strong>Web app URL</strong> yang dihasilkan, tempelkan ke kolom di bawah, dan klik <em>Tes Sinkronisasi</em>.</li>
              </ol>
            </div>

            {/* Google Apps Script Code snippet */}
            <div>
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center">
                  <Code2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Salin Kode Google Apps Script:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(googleAppsScriptCode, 'apps-script-code')}
                  className="inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  {copiedKey === 'apps-script-code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      <span>Kode Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      <span>Salin Semua Kode</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {googleAppsScriptCode}
              </pre>
            </div>

            {/* Web App URL Input Form */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Apps Script Web App URL:
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-google-apps-script-url"
                    type="url"
                    placeholder="Contoh: https://script.google.com/macros/s/AKfycbx.../exec"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition-all"
                  />
                  <button
                    id="btn-test-sheets-sync"
                    type="button"
                    onClick={handleTestGoogleSheets}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    Tes Sinkronisasi
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  id="checkbox-auto-sync"
                  type="checkbox"
                  checked={autoSyncSheets}
                  onChange={(e) => setAutoSyncSheets(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="checkbox-auto-sync" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Otomatis kirim setiap kali ada transaksi baru masuk dari WhatsApp & Telegram
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Name setting */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Nama Usaha / Toko di Header:</h4>
          <p className="text-[11px] text-slate-500">Akan tampil pada judul aplikasi dan struk rekap.</p>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold outline-none"
          />
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};
