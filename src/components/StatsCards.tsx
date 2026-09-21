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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {/* Total Revenue */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Omzet</span>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{formatRupiah(stats.totalRevenue)}</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
            Rata-rata {formatRupiah(stats.averageTicket)}
          </p>
        </div>
      </div>

      {/* Today Revenue */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Hari Ini</span>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{formatRupiah(stats.todayRevenue)}</h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
            {stats.todayTransactions} transaksi hari ini
          </p>
        </div>
      </div>

      {/* Total Transactions & Items */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pesanan</span>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3">
          <h3 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">
            {stats.totalTransactions}{' '}
            <span className="text-xs sm:text-sm font-normal text-slate-500">pesanan</span>
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
            {stats.totalItemsSold} produk terjual
          </p>
        </div>
      </div>

      {/* Bot Channel Breakdown */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Sumber Kanal</span>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2 sm:mt-3">
          <div className="flex items-center flex-wrap gap-1 sm:gap-1.5">
            <div className="flex items-center space-x-1 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold text-emerald-800">
              <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{stats.platformBreakdown.whatsapp} WA</span>
            </div>
            <div className="flex items-center space-x-1 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold text-blue-800">
              <Send className="w-3 h-3 text-blue-600 shrink-0" />
              <span>{stats.platformBreakdown.telegram} TG</span>
            </div>
            <div className="flex items-center space-x-1 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold text-slate-700">
              <span>{stats.platformBreakdown.manual} M</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-1 truncate">
            Masuk otomatis ke sheet
          </p>
        </div>
      </div>
    </div>
  );
};
