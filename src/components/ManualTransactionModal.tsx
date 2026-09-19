import React, { useState } from 'react';
import { SaleTransaction, SaleItem } from '../types';
import { Plus, Trash2, X } from 'lucide-react';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: any) => Promise<void>;
  initialData?: SaleTransaction | null;
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState(initialData?.customerName || 'Pelanggan Umum');
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram' | 'manual'>(initialData?.platform || 'manual');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'Tunai');
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'Belum Lunas'>(initialData?.paymentStatus || 'Lunas');
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [items, setItems] = useState<Array<{ name: string; qty: number; unitPrice: number; category: string }>>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          category: i.category || 'Umum',
        }))
      : [{ name: '', qty: 1, unitPrice: 0, category: 'Umum' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', qty: 1, unitPrice: 0, category: 'Umum' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0), 0);
  const totalAmount = Math.max(0, subtotal - Number(discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((it) => !it.name.trim())) {
      alert('Mohon lengkapi nama semua produk');
      return;
    }

    setIsSubmitting(true);
    await onSave({
      id: initialData?.id,
      customerName,
      platform,
      paymentMethod,
      paymentStatus,
      discount: Number(discount),
      notes,
      items: items.map((it) => ({
        name: it.name,
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        subtotal: (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
        category: it.category,
      })),
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            {initialData ? 'Edit Baris Transaksi' : 'Input Transaksi Manual ke Sheet'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pelanggan:</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Sarah / Budi"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Transaksi:</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="manual">Manual Kasir</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">Daftar Produk / Barang:</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Tambah Produk
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Nama produk (misal: Kopi Susu)"
                    value={it.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="flex-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Harga Satuan"
                    value={it.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', parseInt(e.target.value) || 0)}
                    className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-right outline-none"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Bayar:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
              >
                <option value="Tunai">Tunai / Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="Transfer BRI">Transfer BRI</option>
                <option value="GoPay">GoPay</option>
                <option value="ShopeePay">ShopeePay</option>
                <option value="Hutang/Tempo">Hutang / Tempo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Pembayaran:</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
              >
                <option value="Lunas">Lunas</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diskon (Rp):</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-right outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan:</label>
            <input
              type="text"
              placeholder="Contoh: Dikirim via kurir / meja 2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white outline-none"
            />
          </div>

          {/* Subtotal & Total Preview */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Total Akhir Transaksi:</span>
            <span className="font-extrabold text-sm text-emerald-800 font-mono">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan ke Spreadsheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
