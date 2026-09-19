import React, { useState } from 'react';
import { SaleTransaction } from '../types';
import {
  Search,
  Download,
  Copy,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  MessageCircle,
  Send,
  UserCheck,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';

interface SpreadsheetViewProps {
  transactions: SaleTransaction[];
  onAddManual: () => void;
  onEditTransaction: (tx: SaleTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSyncGoogleSheets: (id?: string) => Promise<any>;
  isSyncing: boolean;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  transactions,
  onAddManual,
  onEditTransaction,
  onDeleteTransaction,
  onSyncGoogleSheets,
  isSyncing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'whatsapp' | 'telegram' | 'manual'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Lunas' | 'Belum Lunas'>('all');
  const [selectedTxForRawMessage, setSelectedTxForRawMessage] = useState<SaleTransaction | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

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

  const totalFilteredRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
  const totalFilteredQty = filteredTransactions.reduce(
    (sum, tx) => sum + tx.items.reduce((acc, it) => acc + (it.qty || 1), 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Spreadsheet Header Bar (Google Sheets vibe) */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-800">Database_Penjualan_Live.sheet</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                Auto-saved
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredTransactions.length} baris transaksi penjualan
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-copy-tsv"
            type="button"
            onClick={handleCopyTable}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
            title="Salin untuk di-paste langsung ke Google Sheets / Excel"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>Salin Tabel</span>
              </>
            )}
          </button>

          <button
            id="btn-export-csv"
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-sync-all-google-sheets"
            type="button"
            onClick={() => onSyncGoogleSheets()}
            disabled={isSyncing}
            className="inline-flex items-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync ke Google Sheets</span>
          </button>

          <button
            id="btn-add-manual-row"
            type="button"
            onClick={onAddManual}
            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Tambah Baris</span>
          </button>
        </div>
      </div>

      {/* Formula & Filter Bar */}
      <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-spreadsheet"
            type="text"
            placeholder="Cari produk, pelanggan, resi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Platform Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                platformFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('whatsapp')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                platformFilter === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('telegram')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                platformFilter === 'telegram'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Telegram</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('manual')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                platformFilter === 'manual'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual
            </button>
          </div>

          {/* Status Select */}
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="Lunas">Lunas</option>
            <option value="Belum Lunas">Belum Lunas</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Table Grid */}
      <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header Row (Spreadsheet column headers) */}
          <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 bg-slate-100">#</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">Waktu</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">Sumber</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">No. Resi</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">Pelanggan</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">Rincian Item</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-right w-16">Qty</th>
              <th className="py-2.5 px-3 border-r border-slate-200 text-right min-w-[120px]">Total (Rp)</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">Metode Bayar</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[90px] text-center">Status</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px] text-center">Google Sheets</th>
              <th className="py-2.5 px-3 text-center min-w-[90px]">Aksi</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">Tidak ada data transaksi yang sesuai filter.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Kirim pesan di tab Simulator Chat atau tambahkan transaksi manual.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-emerald-50/40 transition-colors group border-b border-slate-100"
                >
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
                    {tx.paymentStatus === 'Lunas' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Lunas
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        Belum Lunas
                      </span>
                    )}
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
                        onClick={() => onSyncGoogleSheets(tx.id)}
                        className="inline-flex items-center text-slate-400 hover:text-emerald-600 text-[11px] transition-colors"
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
                      {/* View raw chat message */}
                      <button
                        type="button"
                        onClick={() => setSelectedTxForRawMessage(tx)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="Lihat pesan chat asli"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit transaksi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Summary Footer */}
          {filteredTransactions.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 sticky bottom-0 z-10">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-right text-slate-600 uppercase text-[11px] tracking-wider">
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
