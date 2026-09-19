import React from 'react';
import { SpreadsheetStats } from '../types';
import { TrendingUp, ShoppingBag, Calendar, CreditCard, MessageCircle, Send } from 'lucide-react';

interface StatsCardsProps {
  stats: SpreadsheetStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Revenue */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Omzet</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatRupiah(stats.totalRevenue)}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Rata-rata {formatRupiah(stats.averageTicket)} / pesanan
          </p>
        </div>
      </div>

      {/* Today Revenue */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penjualan Hari Ini</span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{formatRupiah(stats.todayRevenue)}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {stats.todayTransactions} transaksi dicatat hari ini
          </p>
        </div>
      </div>

      {/* Total Transactions & Items */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transaksi</span>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalTransactions}{' '}
            <span className="text-sm font-normal text-slate-500">transaksi</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {stats.totalItemsSold} total produk/porsi terjual
          </p>
        </div>
      </div>

      {/* Bot Channel Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sumber Transaksi</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-1.5 bg-emerald-50 px-2 py-1 rounded-lg">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800">{stats.platformBreakdown.whatsapp} WA</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-blue-50 px-2 py-1 rounded-lg">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">{stats.platformBreakdown.telegram} TG</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-lg">
            <span className="text-xs font-semibold text-slate-700">{stats.platformBreakdown.manual} Manual</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          Semua otomatis masuk baris spreadsheet
        </p>
      </div>
    </div>
  );
};
