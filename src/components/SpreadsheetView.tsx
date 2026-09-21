import React, { useState } from 'react';
import { SaleTransaction, AuthUser } from '../types';
import {
  Search,
  Download,
  Copy,
  Plus,
  Trash2,
  Edit2,
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Check,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowDownToLine,
  ArrowUpFromLine,
  Upload,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  X,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  User,
} from 'lucide-react';

export interface SpreadsheetViewProps {
  transactions: SaleTransaction[];
  onAddManual: () => void;
  onEditTransaction: (tx: SaleTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onDeleteBatch: (ids: string[]) => Promise<void>;
  onClearAll: () => Promise<void>;
  onUpdateBatchStatus: (ids: string[], status: 'Lunas' | 'Belum Lunas') => Promise<void>;
  onSyncGoogleSheets: (id?: string) => Promise<any>;
  onSyncBatchGoogleSheets: (ids: string[]) => Promise<any>;
  onPullFromGoogleSheets: () => Promise<any>;
  onImportTransactions: (txs: SaleTransaction[]) => Promise<any>;
  hasGoogleSheetsConfigured?: boolean;
  isSyncing: boolean;
  currentUser?: AuthUser | null;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  transactions,
  onAddManual,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteBatch,
  onClearAll,
  onUpdateBatchStatus,
  onSyncGoogleSheets,
  onSyncBatchGoogleSheets,
  onPullFromGoogleSheets,
  onImportTransactions,
  hasGoogleSheetsConfigured,
  isSyncing,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'whatsapp' | 'telegram' | 'manual'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Lunas' | 'Belum Lunas'>('all');
  const [selectedTxForRawMessage, setSelectedTxForRawMessage] = useState<SaleTransaction | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // View mode for mobile/desktop: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });
  const [showMobileMore, setShowMobileMore] = useState(false);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog modal state (in-app modal, avoids window.confirm issues)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Import / Paste Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pastedDataText, setPastedDataText] = useState('');
  const [importPreview, setImportPreview] = useState<SaleTransaction[]>([]);
  const [importTab, setImportTab] = useState<'pull' | 'paste'>('pull');

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlatform = platformFilter === 'all' || tx.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || tx.paymentStatus === statusFilter;

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Checkbox actions
  const allFilteredSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((tx) => selectedIds.has(tx.id));

  const someFilteredSelected =
    filteredTransactions.some((tx) => selectedIds.has(tx.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect all filtered
      const newSet = new Set(selectedIds);
      filteredTransactions.forEach((tx) => newSet.delete(tx.id));
      setSelectedIds(newSet);
    } else {
      // Select all filtered
      const newSet = new Set(selectedIds);
      filteredTransactions.forEach((tx) => newSet.add(tx.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch action handlers
  const handleBatchMarkStatus = async (status: 'Lunas' | 'Belum Lunas') => {
    if (selectedIds.size === 0) return;
    await onUpdateBatchStatus(Array.from(selectedIds), status);
  };

  const handleBatchSyncGoogleSheets = async () => {
    if (selectedIds.size === 0) return;
    await onSyncBatchGoogleSheets(Array.from(selectedIds));
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setConfirmModal({
      isOpen: true,
      title: `Hapus ${count} Transaksi Terpilih?`,
      message: `Apakah Anda yakin ingin menghapus ${count} baris transaksi yang dipilih? Data yang dihapus tidak dapat dipulihkan.`,
      confirmLabel: `Ya, Hapus ${count} Baris`,
      isDestructive: true,
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await onDeleteBatch(Array.from(selectedIds));
          setSelectedIds(new Set());
          setConfirmModal(null);
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  const handlePromptDeleteSingle = (tx: SaleTransaction) => {
    setConfirmModal({
      isOpen: true,
      title: `Hapus Transaksi ${tx.id}?`,
      message: `Apakah Anda yakin ingin menghapus transaksi atas nama "${tx.customerName}" senilai ${formatRupiah(tx.totalAmount)}?`,
      confirmLabel: 'Ya, Hapus Transaksi',
      isDestructive: true,
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await onDeleteTransaction(tx.id);
          const newSet = new Set(selectedIds);
          newSet.delete(tx.id);
          setSelectedIds(newSet);
          setConfirmModal(null);
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  const handlePromptClearAll = () => {
    if (currentUser && currentUser.role === 'cashier') {
      setConfirmModal({
        isOpen: true,
        title: 'Akses Ditolak (Khusus Owner/Admin)',
        message:
          'Tindakan mengosongkan seluruh tabel transaksi hanya dapat dilakukan oleh akun Owner / Administrator untuk menjaga keamanan data toko.',
        confirmLabel: 'Mengerti',
        isDestructive: false,
        onConfirm: () => {
          setConfirmModal(null);
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Kosongkan Semua Transaksi?',
      message:
        'Tindakan ini akan menghapus SELURUH transaksi di database tabel secara permanen. Data yang telah dihapus tidak akan muncul kembali saat halaman dimuat ulang.',
      confirmLabel: 'Ya, Bersihkan Seluruh Database',
      isDestructive: true,
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await onClearAll();
          setSelectedIds(new Set());
          setConfirmModal(null);
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'ID Transaksi',
      'Tanggal',
      'Waktu',
      'Kanal',
      'Pengirim',
      'Pelanggan',
      'Item Terjual',
      'Total Qty',
      'Subtotal',
      'Diskon',
      'Total Akhir',
      'Metode Bayar',
      'Status',
      'Catatan',
    ];

    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      tx.id,
      tx.date,
      tx.time,
      tx.platform.toUpperCase(),
      `"${tx.sender.replace(/"/g, '""')}"`,
      `"${tx.customerName.replace(/"/g, '""')}"`,
      `"${tx.items.map((it) => `${it.qty}x ${it.name} (@${it.unitPrice})`).join('; ')}"`,
      tx.items.reduce((acc, it) => acc + (it.qty || 1), 0),
      tx.subtotal,
      tx.discount,
      tx.totalAmount,
      `"${tx.paymentMethod}"`,
      tx.paymentStatus,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Penjualan_Spreadsheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy as TSV for direct paste into Google Sheets / Excel
  const handleCopyTable = () => {
    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Waktu',
      'Sumber',
      'Pelanggan',
      'Daftar Item',
      'Total Qty',
      'Total (Rp)',
      'Metode Bayar',
      'Status Bayar',
      'Catatan',
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.date,
      tx.time,
      tx.platform,
      tx.customerName,
      tx.items.map((it) => `${it.qty}x ${it.name}`).join(', '),
      tx.items.reduce((acc, it) => acc + (it.qty || 1), 0),
      tx.totalAmount,
      tx.paymentMethod,
      tx.paymentStatus,
      tx.notes,
    ]);

    const tsvText = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Parse Pasted Text from Google Sheets / Excel
  const handleParsePastedData = (text: string) => {
    setPastedDataText(text);
    if (!text.trim()) {
      setImportPreview([]);
      return;
    }

    const lines = text.trim().split('\n');
    const parsed: SaleTransaction[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab (Excel/Google Sheets copy) or comma
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cols.length < 2) continue;

      // Check if header row
      const firstCol = cols[0].trim().toLowerCase();
      if (firstCol.includes('id') || firstCol.includes('transaksi') || firstCol.includes('tanggal')) {
        continue;
      }

      const id = cols[0]?.trim() || `TRX-IMP-${Date.now()}-${i + 1}`;
      const date = cols[1]?.trim() || new Date().toISOString().split('T')[0];
      const time = cols[2]?.trim() || '12.00';
      const platformRaw = cols[3]?.trim().toLowerCase() || 'manual';
      const platform = (['whatsapp', 'telegram', 'manual'].includes(platformRaw) ? platformRaw : 'manual') as any;
      const customerName = cols[4]?.trim() || 'Pelanggan Spreadsheet';
      const itemsText = cols[5]?.trim() || 'Item Penjualan';
      const totalAmount = parseFloat(cols[9]?.replace(/[^0-9]/g, '') || cols[7]?.replace(/[^0-9]/g, '') || '0') || 0;
      const paymentMethod = cols[10]?.trim() || cols[8]?.trim() || 'Tunai';
      const paymentStatus = (cols[11]?.trim() || cols[9]?.trim() || 'Lunas').toLowerCase().includes('belum')
        ? 'Belum Lunas'
        : 'Lunas';
      const notes = cols[12]?.trim() || 'Diimpor dari Spreadsheet';

      parsed.push({
        id,
        timestamp: new Date().toISOString(),
        date,
        time,
        platform,
        sender: 'Import Spreadsheet',
        customerName,
        rawMessage: itemsText,
        items: [
          {
            id: `item-${Date.now()}-${i}`,
            name: itemsText,
            qty: parseInt(cols[6]?.trim() || '1', 10) || 1,
            unitPrice: totalAmount,
            subtotal: totalAmount,
            category: 'Umum',
          },
        ],
        subtotal: totalAmount,
        discount: 0,
        tax: 0,
        totalAmount,
        paymentMethod,
        paymentStatus,
        notes,
        syncedToGoogleSheets: true,
      });
    }

    setImportPreview(parsed);
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsProcessingAction(true);
    try {
      await onImportTransactions(importPreview);
      setIsImportModalOpen(false);
      setPastedDataText('');
      setImportPreview([]);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const totalFilteredRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
  const totalFilteredQty = filteredTransactions.reduce(
    (sum, tx) => sum + tx.items.reduce((acc, it) => acc + (it.qty || 1), 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3.5 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate">Database_Penjualan.sheet</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {filteredTransactions.length} dari {transactions.length} transaksi
            </p>
          </div>
        </div>

        {/* View Mode Switcher (Kartu vs Tabel) */}
        <div className="flex items-center space-x-1.5 ml-auto">
          <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg border border-slate-300/60">
            <button
              id="btn-view-mode-cards"
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all min-h-[30px] ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kartu</span>
            </button>
            <button
              id="btn-view-mode-table"
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all min-h-[30px] ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Tabel</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar (Desktop) */}
        <div className="hidden lg:flex items-center flex-wrap gap-2 w-full pt-2 border-t border-slate-200/60 lg:border-t-0 lg:pt-0 lg:w-auto">
          {/* Sinkron DARI Spreadsheet (Pull) */}
          <button
            id="btn-pull-google-sheets"
            type="button"
            onClick={() => onPullFromGoogleSheets()}
            disabled={isSyncing}
            className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            title="Tarik data transaksi dari Google Sheets ke dalam aplikasi"
          >
            <ArrowDownToLine className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Tarik dari Spreadsheet</span>
          </button>

          {/* Sinkron KE Spreadsheet (Push & Mirror) */}
          <button
            id="btn-sync-all-google-sheets"
            type="button"
            onClick={() => onSyncGoogleSheets()}
            disabled={isSyncing}
            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            title="Selaraskan ke Google Sheets"
          >
            <ArrowUpFromLine className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Sync ke Spreadsheet</span>
          </button>

          {/* Import / Tempel Data */}
          <button
            id="btn-open-import-modal"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>Import / Tempel</span>
          </button>

          {/* Salin TSV */}
          <button
            id="btn-copy-tsv"
            type="button"
            onClick={handleCopyTable}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>Salin</span>
              </>
            )}
          </button>

          {/* Export CSV */}
          <button
            id="btn-export-csv"
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Tambah Baris */}
          <button
            id="btn-add-manual-row"
            type="button"
            onClick={onAddManual}
            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Tambah Baris</span>
          </button>

          {/* Reset */}
          <button
            id="btn-clear-all-rows"
            type="button"
            onClick={handlePromptClearAll}
            disabled={transactions.length === 0}
            className="inline-flex items-center px-2.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>Reset</span>
          </button>
        </div>

        {/* Action Buttons Toolbar (Mobile & Tablet < lg) */}
        <div className="lg:hidden flex items-center justify-between gap-1.5 w-full pt-1">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => onSyncGoogleSheets()}
              disabled={isSyncing}
              className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>Sync Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => onPullFromGoogleSheets()}
              disabled={isSyncing}
              className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
              <span>Tarik</span>
            </button>

            <button
              type="button"
              onClick={onAddManual}
              className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Tambah</span>
            </button>
          </div>

          {/* More actions dropdown button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMobileMore(!showMobileMore)}
              className="inline-flex items-center px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <span>Menu</span>
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showMobileMore ? 'rotate-180' : ''}`} />
            </button>

            {showMobileMore && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMobileMore(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMore(false);
                      setIsImportModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import / Tempel Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMore(false);
                      handleCopyTable();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Tabel (TSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMore(false);
                      handleExportCSV();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export File CSV</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMore(false);
                      handlePromptClearAll();
                    }}
                    disabled={transactions.length === 0}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Reset / Kosongkan Tabel</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating / Sticky Batch Checklist Bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-md animate-fadeIn z-20 sticky top-0">
          <div className="flex items-center justify-between">
            <div className="bg-emerald-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-full flex items-center space-x-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedIds.size} dipilih</span>
            </div>
            <button
              id="batch-btn-clear-selection-mobile"
              type="button"
              onClick={clearSelection}
              className="sm:hidden px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <button
              id="batch-btn-mark-paid"
              type="button"
              onClick={() => handleBatchMarkStatus('Lunas')}
              className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors shrink-0 min-h-[32px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Lunas</span>
            </button>

            <button
              id="batch-btn-mark-unpaid"
              type="button"
              onClick={() => handleBatchMarkStatus('Belum Lunas')}
              className="inline-flex items-center px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shrink-0 min-h-[32px]"
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Belum Lunas</span>
            </button>

            <button
              id="batch-btn-sync-sheets"
              type="button"
              onClick={handleBatchSyncGoogleSheets}
              disabled={isSyncing}
              className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shrink-0 min-h-[32px]"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" />
              <span>Sync Sheets</span>
            </button>

            <button
              id="batch-btn-delete-selected"
              type="button"
              onClick={handleBatchDelete}
              className="inline-flex items-center px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors shrink-0 min-h-[32px]"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Hapus ({selectedIds.size})</span>
            </button>

            <button
              id="batch-btn-clear-selection"
              type="button"
              onClick={clearSelection}
              className="hidden sm:inline-block px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-spreadsheet"
            type="text"
            placeholder="Cari item, pelanggan, ID transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[36px]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {/* Platform Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors min-h-[30px] ${
                platformFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('whatsapp')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors min-h-[30px] ${
                platformFilter === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WA
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('telegram')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors min-h-[30px] ${
                platformFilter === 'telegram'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TG
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('manual')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors min-h-[30px] ${
                platformFilter === 'manual'
                  ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual
            </button>
          </div>

          {/* Status Filter */}
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[34px] shrink-0"
          >
            <option value="all">Semua Status</option>
            <option value="Lunas">Lunas</option>
            <option value="Belum Lunas">Belum Lunas</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: MOBILE CARDS VIEW */}
      {viewMode === 'cards' ? (
        <div className="bg-slate-50/70 p-3 sm:p-4 min-h-[320px]">
          {/* Quick Select All & Stats Banner */}
          <div className="flex items-center justify-between pb-3 px-1 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                id="chk-cards-select-all"
                onClick={toggleSelectAll}
                className="inline-flex items-center space-x-1.5 py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs shadow-2xs hover:bg-slate-50 min-h-[32px]"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : someFilteredSelected ? (
                  <MinusSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{allFilteredSelected ? 'Lepas Semua' : 'Pilih Semua'}</span>
              </button>
              <span className="text-[11px] text-slate-400">
                {filteredTransactions.length} transaksi
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block sm:inline mr-1">Total Omzet:</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700">
                {formatRupiah(totalFilteredRevenue)}
              </span>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">Tidak ada transaksi ditemukan.</p>
              <p className="text-xs text-slate-400 max-w-xs">
                {transactions.length === 0
                  ? 'Tabel masih kosong. Anda bisa menarik data dari Google Sheets atau menambah pesanan baru.'
                  : 'Coba sesuaikan kata kunci pencarian atau filter kanal.'}
              </p>
              {transactions.length === 0 && (
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onPullFromGoogleSheets()}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-100 border border-blue-200"
                  >
                    Tarik dari Sheets
                  </button>
                  <button
                    type="button"
                    onClick={onAddManual}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-semibold rounded-lg text-xs hover:bg-emerald-700"
                  >
                    + Input Baru
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id);
                return (
                  <div
                    key={tx.id}
                    className={`bg-white rounded-2xl border p-3.5 shadow-xs transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/15'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Top: Checkbox, ID, Platform, Time */}
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center space-x-2 min-w-0">
                          <button
                            type="button"
                            id={`chk-card-row-${tx.id}`}
                            onClick={() => toggleSelectRow(tx.id)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 focus:outline-none min-h-[36px] min-w-[36px] flex items-center justify-center -ml-1.5"
                            title={isSelected ? 'Batalkan pilihan' : 'Pilih kartu ini'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>

                          <span className="font-mono text-xs font-bold text-slate-800 tracking-tight">
                            {tx.id}
                          </span>

                          {tx.platform === 'whatsapp' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WA</span>
                            </span>
                          ) : tx.platform === 'telegram' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              <Send className="w-3 h-3 text-blue-600" />
                              <span>TG</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                              <span>Manual</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-400">
                            {tx.date} {tx.time}
                          </span>
                          <button
                            type="button"
                            id={`btn-card-raw-${tx.id}`}
                            onClick={() => setSelectedTxForRawMessage(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="Lihat pesan chat asli"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Name and Status Toggle */}
                      <div className="py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {tx.customerName}
                              </h4>
                              {tx.sender && tx.sender !== 'Kasir Langsung' && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{tx.sender}</p>
                              )}
                            </div>
                          </div>

                          {/* Payment status badge */}
                          <button
                            type="button"
                            id={`btn-card-status-${tx.id}`}
                            onClick={() =>
                              onUpdateBatchStatus(
                                [tx.id],
                                tx.paymentStatus === 'Lunas' ? 'Belum Lunas' : 'Lunas'
                              )
                            }
                            className="group focus:outline-none min-h-[32px] flex items-center"
                            title="Ketuk untuk ubah status pembayaran"
                          >
                            {tx.paymentStatus === 'Lunas' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 transition-colors">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
                                <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                Belum Lunas
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Items ordered box */}
                        <div className="mt-2.5 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 space-y-1">
                          {tx.items.map((it, itemIdx) => (
                            <div key={itemIdx} className="flex items-center justify-between text-xs">
                              <span className="text-slate-800 font-medium truncate mr-2">
                                {it.qty}x {it.name}
                              </span>
                              <span className="text-slate-600 font-mono text-[11px] shrink-0 font-medium">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          ))}
                          {tx.discount > 0 && (
                            <div className="flex items-center justify-between text-[11px] text-rose-500 font-medium pt-1 border-t border-slate-200/60">
                              <span>Potongan Diskon:</span>
                              <span>-{formatRupiah(tx.discount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Amount, Method, Sheets Status & Actions */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Pembayaran</span>
                          <span className="font-mono text-base font-bold text-slate-900">
                            {formatRupiah(tx.totalAmount)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Metode</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {tx.paymentMethod}
                          </span>
                        </div>
                      </div>

                      {/* Action Bar inside card */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        <div>
                          {tx.syncedToGoogleSheets ? (
                            <span className="inline-flex items-center text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Tersinkron
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSyncGoogleSheets(tx.id)}
                              disabled={isSyncing}
                              className="inline-flex items-center text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[34px]"
                            >
                              <ArrowUpFromLine className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              <span>Kirim Sheet</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors min-h-[34px]"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePromptDeleteSingle(tx)}
                            className="inline-flex items-center px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition-colors min-h-[34px]"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cards Summary Banner */}
          {filteredTransactions.length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between text-xs text-slate-700">
              <span className="font-medium text-slate-500">
                {filteredTransactions.length} transaksi ({totalFilteredQty} item terjual)
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500">Total:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatRupiah(totalFilteredRevenue)}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: SPREADSHEET TABLE GRID */
        <div>
          {/* Mobile Horizontal Scroll Helper Banner */}
          <div className="md:hidden bg-blue-50/80 px-3 py-1.5 border-b border-blue-100 text-[11px] text-blue-700 flex items-center justify-between">
            <span>💡 Geser layar ke samping untuk melihat seluruh kolom tabel</span>
            <span className="font-semibold text-blue-800">↔</span>
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header Row (Spreadsheet column headers) */}
              <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  {/* Checkbox All column */}
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200 bg-slate-100">
                    <button
                      type="button"
                      id="chk-select-all"
                      onClick={toggleSelectAll}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 focus:outline-none min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title={allFilteredSelected ? 'Batalkan pilihan semua' : 'Pilih semua baris'}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : someFilteredSelected ? (
                        <MinusSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200 bg-slate-100 font-mono text-[10px]">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">Waktu</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">Sumber</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">ID Transaksi</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">Pelanggan</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">Rincian Item</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-right w-16">Qty</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-right min-w-[120px]">Total (Rp)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">Metode Bayar</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[90px] text-center">Status</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[105px] text-center">Google Sheets</th>
                  <th className="py-2.5 px-3 text-center min-w-[100px]">Aksi</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                        <p className="font-semibold text-slate-600">Tidak ada data transaksi yang sesuai.</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {transactions.length === 0
                            ? 'Tabel kosong. Anda dapat menarik data dari Google Sheets, mengimpor salinan tabel, atau menambah transaksi baru.'
                            : 'Coba ubah kata kunci pencarian atau filter status/kanal.'}
                        </p>
                        {transactions.length === 0 && (
                          <div className="flex items-center space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => onPullFromGoogleSheets()}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-100 border border-blue-200"
                            >
                              Tarik dari Google Sheets
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsImportModalOpen(true)}
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-lg text-xs hover:bg-slate-200"
                            >
                              Tempel Data
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => {
                    const isSelected = selectedIds.has(tx.id);
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors group border-b border-slate-100 ${
                          isSelected ? 'bg-emerald-50/70 border-emerald-200' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Row Checkbox */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100">
                          <button
                            type="button"
                            id={`chk-row-${tx.id}`}
                            onClick={() => toggleSelectRow(tx.id)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 focus:outline-none min-h-[30px] min-w-[30px] flex items-center justify-center"
                            title={isSelected ? 'Batalkan pilihan' : 'Pilih baris ini'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Row Number */}
                        <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-100 bg-slate-50/50 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Date & Time */}
                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px]">
                          <div className="font-semibold text-slate-800">{tx.date}</div>
                          <div className="text-slate-400 text-[10px]">{tx.time}</div>
                        </td>

                        {/* Platform Source */}
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          {tx.platform === 'whatsapp' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </span>
                          ) : tx.platform === 'telegram' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                              <Send className="w-3 h-3 text-blue-600" />
                              <span>Telegram</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">
                              <span>Manual</span>
                            </span>
                          )}
                        </td>

                        {/* Transaction ID */}
                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-[11px] font-medium text-slate-900">
                          {tx.id}
                        </td>

                        {/* Customer Name */}
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <span className="font-semibold text-slate-800">{tx.customerName}</span>
                          {tx.sender && tx.sender !== 'Kasir Langsung' && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{tx.sender}</div>
                          )}
                        </td>

                        {/* Items List */}
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <div className="space-y-0.5">
                            {tx.items.map((it, itemIdx) => (
                              <div key={itemIdx} className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-700 font-medium">
                                  {it.qty}x {it.name}
                                </span>
                                <span className="text-slate-500 font-mono text-[10px] ml-2">
                                  {formatRupiah(it.subtotal)}
                                </span>
                              </div>
                            ))}
                            {tx.discount > 0 && (
                              <div className="text-[10px] text-rose-500 font-medium">
                                Diskon: -{formatRupiah(tx.discount)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Total Qty */}
                        <td className="py-2.5 px-3 border-r border-slate-100 text-right font-medium text-slate-700">
                          {tx.items.reduce((acc, it) => acc + (it.qty || 1), 0)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-2.5 px-3 border-r border-slate-100 text-right font-bold text-slate-900 font-mono text-[12px]">
                          {formatRupiah(tx.totalAmount)}
                        </td>

                        {/* Payment Method */}
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                            {tx.paymentMethod}
                          </span>
                        </td>

                        {/* Payment Status */}
                        <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                          <button
                            type="button"
                            id={`btn-status-toggle-${tx.id}`}
                            onClick={() =>
                              onUpdateBatchStatus(
                                [tx.id],
                                tx.paymentStatus === 'Lunas' ? 'Belum Lunas' : 'Lunas'
                              )
                            }
                            className="group focus:outline-none min-h-[30px] flex items-center justify-center mx-auto"
                            title="Klik untuk mengubah status (Lunas / Belum Lunas)"
                          >
                            {tx.paymentStatus === 'Lunas' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 transition-colors">
                                Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 group-hover:bg-amber-200 transition-colors">
                                Belum Lunas
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Google Sheets Sync Status */}
                        <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                          {tx.syncedToGoogleSheets ? (
                            <span className="inline-flex items-center text-emerald-600 text-[11px] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Tersinkron
                            </span>
                          ) : (
                            <button
                              type="button"
                              id={`btn-sync-row-${tx.id}`}
                              onClick={() => onSyncGoogleSheets(tx.id)}
                              disabled={isSyncing}
                              className="inline-flex items-center text-slate-400 hover:text-emerald-600 text-[11px] transition-colors min-h-[30px]"
                              title="Klik untuk sync baris ini ke Google Sheets"
                            >
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              <span>Kirim ke Sheet</span>
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {/* View raw message */}
                            <button
                              type="button"
                              id={`btn-view-raw-${tx.id}`}
                              onClick={() => setSelectedTxForRawMessage(tx)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Lihat pesan chat asli"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              id={`btn-edit-row-${tx.id}`}
                              onClick={() => onEditTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Edit rincian transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Single */}
                            <button
                              type="button"
                              id={`btn-delete-row-${tx.id}`}
                              onClick={() => handlePromptDeleteSingle(tx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Summary Footer */}
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-right text-slate-600 uppercase text-[11px] tracking-wider">
                      Total Terfilter ({filteredTransactions.length} baris):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">
                      {totalFilteredQty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm border-r border-slate-200">
                      {formatRupiah(totalFilteredRevenue)}
                    </td>
                    <td colSpan={4} className="py-2.5 px-3 text-slate-400 text-[11px] font-normal">
                      Kalkulasi otomatis spreadsheet realtime
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL (Replaces window.confirm completely) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start space-x-3">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmModal.isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                }`}
              >
                {confirmModal.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="btn-confirm-cancel"
                onClick={() => setConfirmModal(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-action"
                onClick={confirmModal.onConfirm}
                disabled={isProcessingAction}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmModal.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT / TEMPEL DATA MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Sinkron & Import dari Spreadsheet</h3>
                  <p className="text-xs text-slate-500">Tarik dari Google Sheets Webhook atau tempel baris dari Excel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center space-x-2 pt-4 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setImportTab('pull')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  importTab === 'pull'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Tarik Otomatis (URL Apps Script)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                  importTab === 'paste'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Tempel Data (Copy-Paste Baris)</span>
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs">
              {importTab === 'pull' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 space-y-2">
                    <p className="font-semibold text-sm">Tarik Seluruh Transaksi dari Google Spreadsheet</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Fitur ini akan memanggil Webhook Google Apps Script Anda (fungsi <code>doGet</code>) untuk mengambil
                      seluruh baris transaksi yang ada di Spreadsheet Anda, lalu menggabungkannya ke aplikasi.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-semibold text-slate-800">Status Google Apps Script URL</div>
                      <div className="text-slate-500 text-[11px]">
                        {hasGoogleSheetsConfigured
                          ? 'URL Apps Script sudah terkonfigurasi di Pengaturan'
                          : 'URL Apps Script belum diisi di Pengaturan > Webhook'}
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-pull-modal-exec"
                      disabled={isSyncing}
                      onClick={async () => {
                        await onPullFromGoogleSheets();
                        setIsImportModalOpen(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
                    >
                      <ArrowDownToLine className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                      <span>{isSyncing ? 'Menarik Data...' : 'Mulai Tarik Data'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempelkan baris dari Google Sheets atau Excel (Ctrl+V):
                    </label>
                    <textarea
                      id="txt-pasted-data"
                      rows={6}
                      value={pastedDataText}
                      onChange={(e) => handleParsePastedData(e.target.value)}
                      placeholder="Contoh salinan kolom:&#10;TRX-001	2026-09-19	09.48	WhatsApp	Sarah	2x Kopi Susu	2	36000	QRIS	Lunas	Catatan"
                      className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Format kolom otomatis dideteksi dari hasil copy baris Spreadsheet Anda.
                    </p>
                  </div>

                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs">
                          Pratinjau ({importPreview.length} baris siap diimpor):
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                            <tr>
                              <th className="p-2">ID</th>
                              <th className="p-2">Tanggal</th>
                              <th className="p-2">Pelanggan</th>
                              <th className="p-2">Item</th>
                              <th className="p-2 text-right">Total</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importPreview.map((item, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-50">
                                <td className="p-2 font-mono font-medium">{item.id}</td>
                                <td className="p-2">{item.date}</td>
                                <td className="p-2 font-medium">{item.customerName}</td>
                                <td className="p-2">{item.rawMessage}</td>
                                <td className="p-2 text-right font-mono font-semibold">
                                  {formatRupiah(item.totalAmount)}
                                </td>
                                <td className="p-2 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                                    {item.paymentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
              {importTab === 'paste' && (
                <button
                  type="button"
                  id="btn-confirm-import-paste"
                  onClick={handleConfirmImport}
                  disabled={importPreview.length === 0 || isProcessingAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs"
                >
                  {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Impor {importPreview.length} Transaksi</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raw Chat Message Modal */}
      {selectedTxForRawMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {selectedTxForRawMessage.platform === 'whatsapp' ? (
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Send className="w-5 h-5 text-blue-600" />
                )}
                <h4 className="font-bold text-slate-900 text-sm">
                  Pesan Asli ({selectedTxForRawMessage.platform.toUpperCase()})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForRawMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">Pengirim:</span>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedTxForRawMessage.customerName} ({selectedTxForRawMessage.sender})
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Isi Pesan Masuk:</span>
                <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap">
                  {selectedTxForRawMessage.rawMessage}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Hasil Parsing Gemini AI:</span>
                <div className="mt-1 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ID Transaksi:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedTxForRawMessage.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Metode Bayar:</span>
                    <span className="font-medium text-slate-900">{selectedTxForRawMessage.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Nilai:</span>
                    <span className="font-bold text-emerald-700">
                      {formatRupiah(selectedTxForRawMessage.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTxForRawMessage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
