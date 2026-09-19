import { SaleTransaction } from '../src/types.js';

export async function syncTransactionToGoogleSheets(
  transaction: SaleTransaction,
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Google Apps Script Webhook URL belum diisi atau tidak valid' };
  }

  const itemsText = transaction.items.map((it) => `${it.qty}x ${it.name} (@${it.unitPrice})`).join(', ');
  const totalQty = transaction.items.reduce((acc, it) => acc + (it.qty || 1), 0);

  const payload = {
    id: transaction.id,
    timestamp: transaction.timestamp,
    date: transaction.date,
    time: transaction.time,
    platform: transaction.platform,
    sender: transaction.sender,
    customerName: transaction.customerName,
    itemsText,
    totalQty,
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: transaction.tax,
    totalAmount: transaction.totalAmount,
    paymentMethod: transaction.paymentMethod,
    paymentStatus: transaction.paymentStatus,
    notes: transaction.notes,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal mengirim data ke Google Sheets`,
      };
    }

    return {
      success: true,
      message: 'Berhasil disinkronisasi ke Google Spreadsheet',
    };
  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    return {
      success: false,
      message: error?.message || 'Koneksi ke Google Sheets gagal',
    };
  }
}
