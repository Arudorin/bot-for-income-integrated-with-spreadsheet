import React, { useState, useEffect } from 'react';
import { WebhookLogItem, WhatsAppDiagnosticInfo } from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Trash2,
  Play,
  Send,
  Terminal,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Sparkles,
  Smartphone,
  KeyRound,
  Radio,
} from 'lucide-react';

interface WhatsAppDiagnosticProps {
  serverUrl: string;
  verifyToken: string;
  waPhoneId: string;
  waAccessToken: string;
  onRefreshStatus?: () => void;
}

export const WhatsAppDiagnostic: React.FC<WhatsAppDiagnosticProps> = ({
  serverUrl,
  verifyToken,
  waPhoneId,
  waAccessToken,
  onRefreshStatus,
}) => {
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'error' | 'incoming' | 'verification'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Diagnostic Test States
  const [diagStatus, setDiagStatus] = useState<WhatsAppDiagnosticInfo | null>(null);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [testNumber, setTestNumber] = useState('6289622640080');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
    troubleshooting?: string;
  } | null>(null);

  // Simulation state
  const [simText, setSimText] = useState('2 Hotwheels @35k lunas tunai');
  const [simSender, setSimSender] = useState('6289622640080');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  // Active subview
  const [activeView, setActiveView] = useState<'checklist' | 'logs' | 'test'>('checklist');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await fetch('/api/webhook/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const checkStatus = async () => {
    try {
      setIsCheckingApi(true);
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setDiagStatus(data);
        if (data.recentLogs && data.recentLogs.length > 0) {
          setLogs(data.recentLogs);
        }
      }
    } catch (e) {
      console.error('Error checking WhatsApp status:', e);
    } finally {
      setIsCheckingApi(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Bersihkan semua log webhook riwayat?')) return;
    try {
      const res = await fetch('/api/webhook/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (e) {
      console.error('Error clearing logs:', e);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testNumber) {
      alert('Masukkan nomor WhatsApp tujuan uji coba (format 628...)');
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testNumber }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Berhasil! Pesan tes telah dikirim oleh Meta ke +${testNumber}. Cek WhatsApp Anda!`,
        });
      } else {
        const errAnalysis = data?.errorAnalysis;
        setTestResult({
          success: false,
          message: data?.error || 'Gagal mengirim pesan melalui Meta',
          details: data?.details,
          troubleshooting: errAnalysis
            ? `${errAnalysis.explanation}\n\n👉 ${errAnalysis.hint}`
            : 'Periksa Access Token dan Phone Number ID Anda.',
        });
      }
      fetchLogs();
      checkStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Koneksi jaringan error',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!simText) return;
    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/webhook/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: simText,
          sender: simSender,
        }),
      });

      const data = await res.json();
      setSimResult(data);
      fetchLogs();
    } catch (e: any) {
      setSimResult({ error: e.message });
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchLogs();
  }, []);

  // Polling logs if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'error') return log.status === 'error';
    if (filterType === 'incoming') return log.type === 'incoming_message';
    if (filterType === 'verification') return log.type === 'verification';
    return true;
  });

  const errorLogsCount = logs.filter((l) => l.status === 'error').length;
  const incomingCount = logs.filter((l) => l.type === 'incoming_message').length;

  const actualWebhookUrl = `${serverUrl}/api/webhook/whatsapp`;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Pusat Diagnostik & Live Log Webhook Meta</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Monitor
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Deteksi otomatis kegagalan koneksi Meta Developers, error izin nomor internasional, dan riwayat pesan masuk.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('checklist')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeView === 'checklist'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Langkah Diagnostik
          </button>
          <button
            type="button"
            onClick={() => setActiveView('logs')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
              activeView === 'logs'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Live Logs</span>
            {errorLogsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {errorLogsCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                {logs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('test')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeView === 'test'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Alat Uji & Simulasi
          </button>
        </div>
      </div>

      {/* --- VIEW 1: STEP-BY-STEP DIAGNOSTIC CHECKLIST --- */}
      {activeView === 'checklist' && (
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>Periksa URL Callback di Meta Developers</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Wajib Tepat
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Meta Developers membutuhkan URL asli server Cloud Run ini, bukan domain contoh.
                  </p>
                </div>
              </div>
            </div>

            {/* URL Display */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    URL Callback Asli:
                  </span>
                  <code className="text-xs font-mono font-bold text-slate-800 truncate select-all">
                    {actualWebhookUrl}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(actualWebhookUrl, 'url')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1 shrink-0 self-start sm:self-auto transition-colors"
                >
                  {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedKey === 'url' ? 'Tersalin!' : 'Salin URL'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Verify Token:
                  </span>
                  <code className="text-xs font-mono font-bold text-emerald-700 select-all">
                    {verifyToken}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyToken, 'token')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center space-x-1 shrink-0 self-start sm:self-auto transition-colors"
                >
                  {copiedKey === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedKey === 'token' ? 'Tersalin!' : 'Salin Token'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start space-x-2.5 text-xs text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Domain Produksi Resmi:</strong> Webhook Meta Anda diatur ke{' '}
                <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px] font-mono font-bold text-emerald-900">
                  https://toyisland-income.ai.studio/api/webhook/whatsapp
                </code>.
                Pastikan Anda menekan tombol <strong>Deploy</strong> di menu bilah atas Google AI Studio agar pembaruan kode bot dan perbaikan log ini aktif secara langsung di domain publik Anda.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Aktifkan Mode Terbit (Live Mode) di Meta Developers
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mengapa pesan dari HP Anda tidak masuk ke web kasir jika mode masih Pengembangan?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-slate-900">
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>Penyebab Peringatan Kotak Kuning di Dasbor Meta:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Saat aplikasi Anda di Meta masih dalam status <strong>Pengembangan (Development Mode)</strong>, Meta secara ketat hanya mengizinkan pengujian dari nomor admin internal dan menolak webhook pesan dari pelanggan publik.
              </p>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1">
                <span className="font-bold text-slate-800">Cara Mengaktifkannya:</span>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                  <li>Lihat bagian paling atas layar Meta Developers Anda.</li>
                  <li>Cari tombol toggle <strong>Mode Aplikasi: [ Pengembangan ○─── Aktif ]</strong>.</li>
                  <li>Geser ke <strong>Aktif (Live)</strong> agar nomor WhatsApp toko resmi bisa melayani pembeli secara langsung.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <span>Izin Langganan Pesan Masuk (Webhook Field Subscription)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Meta mewajibkan Anda mencentang kolom <strong>messages</strong> agar pesan WhatsApp diteruskan ke web kasir.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="text-slate-600 leading-relaxed">
                Setelah URL Callback dan Verify Token tersimpan (centang hijau di Meta):
              </p>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Centang Bidang Webhook:</span>
                </div>
                <p className="text-slate-600">
                  Di tabel Webhooks Meta, cari baris <strong>messages</strong> lalu klik tombol <strong>Langganan (Subscribe)</strong>. Jika tidak dicentang, Meta tidak akan mengirim pesan pelanggan ke aplikasi kasir.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Status Kredensial */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Status Kredensial Meta Graph API (Untuk Balas Nota)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Memastikan token dan Phone ID Anda diizinkan mengirim pesan WhatsApp keluar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={checkStatus}
                disabled={isCheckingApi}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingApi ? 'animate-spin' : ''}`} />
                <span>Cek Ulang Status</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Phone Number ID:</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5 truncate">
                  {waPhoneId ? waPhoneId : <span className="text-slate-400 font-normal">Belum diisi</span>}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">WhatsApp Access Token:</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {waAccessToken ? (
                    <span className="text-emerald-700">Tersimpan ({waAccessToken.slice(0, 10)}...)</span>
                  ) : (
                    <span className="text-slate-400 font-normal">Belum diisi</span>
                  )}
                </div>
              </div>
            </div>

            {diagStatus?.valid && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Kredensial Aktif & Terverifikasi Meta: {diagStatus.phoneNumber} ({diagStatus.verifiedName})
                </span>
              </div>
            )}

            {diagStatus && !diagStatus.valid && diagStatus.configured && (
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Meta Graph API Menolak Kredensial</span>
                </div>
                <p className="text-rose-700 text-[11px]">{diagStatus.error}</p>
                {diagStatus.errorAnalysis && (
                  <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-[11px] text-rose-800">
                    <strong>Solusi:</strong> {diagStatus.errorAnalysis.hint}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VIEW 2: LIVE WEBHOOK LOGS --- */}
      {activeView === 'logs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">Filter:</span>
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('error')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                    filterType === 'error' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  <span>Gagal / Error</span>
                  {errorLogsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-100 text-rose-800">
                      {errorLogsCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('incoming')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'incoming' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pesan Masuk ({incomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('verification')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'verification' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Verifikasi
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Auto-Refresh (4d)</span>
              </label>

              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                title="Refresh logs sekarang"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 transition-colors"
                title="Bersihkan riwayat log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logs List */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <Terminal className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Belum Ada Aktivitas Log Webhook</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Saat Meta mengirim verifikasi webhook, chat WhatsApp masuk, atau laporan pengiriman pesan, catatannya akan otomatis muncul di sini secara realtime.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('test')}
                className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Kirim Uji Coba Simulasi Webhook</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={log.id}
                    className={`bg-white rounded-2xl border transition-all ${
                      log.status === 'error'
                        ? 'border-rose-200 shadow-xs'
                        : log.status === 'warning'
                        ? 'border-amber-200'
                        : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/70 rounded-2xl transition-colors"
                    >
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            log.status === 'error'
                              ? 'bg-rose-100 text-rose-600'
                              : log.status === 'warning'
                              ? 'bg-amber-100 text-amber-600'
                              : log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {log.status === 'error' ? (
                            <XCircle className="w-4 h-4" />
                          ) : log.status === 'warning' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : log.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Info className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">{log.title}</span>
                            {log.errorCode && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                                Kode {log.errorCode}
                              </span>
                            )}
                            {log.sender && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-slate-600 bg-slate-100">
                                {log.sender}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate">{log.summary}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">{timeStr}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Troubleshooting Box if available */}
                    {log.troubleshootingHint && (
                      <div className="px-4 pb-3">
                        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Diagnosis & Solusi Cepat:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-900/90 pl-5">
                            {log.troubleshootingHint}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Expandable Raw Details */}
                    {isExpanded && log.details && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Payload JSON / Detail Teknis:
                          </span>
                          <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 3: TESTING TOOLS & SIMULATOR --- */}
      {activeView === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Tool 1: Tes Kirim Pesan Riil Meta */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">Tes Kirim Pesan Meta Cloud API</h4>
              </div>
              <p className="text-xs text-slate-500">
                Kirim pesan langsung melalui Meta Graph API ke nomor WhatsApp Anda untuk menguji apakah token dan Phone ID berfungsi.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp Penerima (Awali 62):
                </label>
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="Contoh: 6281234567890"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Gunakan format internasional tanpa spasi atau strip (contoh: 6289622640080).
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isSendingTest}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Menghubungi Meta...' : 'Kirim Pesan Tes Sekarang'}</span>
              </button>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.success ? 'Pengiriman Berhasil' : 'Meta Menolak Pengiriman'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>

                  {testResult.troubleshooting && (
                    <div className="p-3 bg-white rounded-lg border border-rose-200 text-[11px] text-rose-900 whitespace-pre-line">
                      <strong>Penjelasan Error & Solusi:</strong>
                      <div className="mt-1">{testResult.troubleshooting}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tool 2: Simulasi Webhook Pesan Masuk */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">Simulasi Webhook Pesan Masuk</h4>
              </div>
              <p className="text-xs text-slate-500">
                Uji langsung AI parser kasir, pencatatan otomatis ke pembukuan, dan pembuatan nota tanpa menunggu webhook dari Meta.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contoh Teks Chat Transaksi:
                </label>
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Contoh: 2 Hotwheels @35k lunas tunai"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Pengirim (Simulasi):
                </label>
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={isSimulating}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Memproses dengan Gemini AI...' : 'Jalankan Simulasi Webhook'}</span>
              </button>

              {simResult && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Simulasi Sukses Dicatat ke Database Kasir!</span>
                  </div>
                  {simResult.transaction && (
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-[11px] space-y-1">
                      <div>ID: {simResult.transaction.id}</div>
                      <div>Total: Rp {simResult.transaction.totalAmount.toLocaleString('id-ID')}</div>
                      <div>Item: {simResult.transaction.items.map((i: any) => `${i.qty}x ${i.name}`).join(', ')}</div>
                    </div>
                  )}
                  {simResult.reply && (
                    <div className="text-[11px] text-emerald-800">
                      <strong>Draft Struk Balasan:</strong>
                      <pre className="mt-1 p-2 bg-white rounded border border-emerald-200 whitespace-pre-wrap font-mono text-[10px]">
                        {simResult.reply}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
