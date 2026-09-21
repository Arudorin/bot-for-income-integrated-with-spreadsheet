import { SaleTransaction } from '../src/types.js';

export function formatTransactionForSheet(tx: SaleTransaction) {
  const itemsText = tx.items.map((it) => `${it.qty}x ${it.name} (@${it.unitPrice})`).join(', ');
  const totalQty = tx.items.reduce((acc, it) => acc + (it.qty || 1), 0);

  return {
    id: tx.id,
    timestamp: tx.timestamp,
    date: tx.date,
    time: tx.time,
    platform: tx.platform,
    sender: tx.sender,
    customerName: tx.customerName,
    itemsText,
    totalQty,
    subtotal: tx.subtotal,
    discount: tx.discount,
    tax: tx.tax,
    totalAmount: tx.totalAmount,
    paymentMethod: tx.paymentMethod,
    paymentStatus: tx.paymentStatus,
    notes: tx.notes,
  };
}

export async function syncTransactionToGoogleSheets(
  transaction: SaleTransaction,
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Google Apps Script Webhook URL belum diisi atau tidak valid' };
  }

  const payload = {
    action: 'upsert',
    ...formatTransactionForSheet(transaction),
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

export async function deleteTransactionsFromGoogleSheets(
  ids: string[],
  webhookUrl: string
): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL belum diisi' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        ids,
      }),
    });

    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}: Gagal menghapus baris di Google Sheets` };
    }

    return {
      success: true,
      message: `Berhasil menghapus ${ids.length} transaksi di Google Sheets`,
    };
  } catch (error: any) {
    console.error('Google Sheets delete error:', error);
    return {
      success: false,
      message: error?.message || 'Koneksi ke Google Sheets gagal',
    };
  }
}

export async function clearGoogleSheets(
  webhookUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL belum diisi' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear_all',
      }),
    });

    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}: Gagal mengosongkan Google Sheets` };
    }

    return {
      success: true,
      message: 'Berhasil mengosongkan seluruh baris di Google Sheets',
    };
  } catch (error: any) {
    console.error('Google Sheets clear error:', error);
    return {
      success: false,
      message: error?.message || 'Koneksi ke Google Sheets gagal',
    };
  }
}

export async function mirrorAllToGoogleSheets(
  transactions: SaleTransaction[],
  webhookUrl: string
): Promise<{ success: boolean; message: string; count?: number }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Google Apps Script URL belum diisi' };
  }

  const rows = transactions.map(formatTransactionForSheet);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mirror_all',
        transactions: rows,
      }),
    });

    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}: Gagal menyelaraskan ke Google Sheets` };
    }

    return {
      success: true,
      message: `Spreadsheet berhasil diselaraskan penuh dengan Web (${transactions.length} transaksi aktif). Baris yang dihapus di web telah dibersihkan di Spreadsheet!`,
      count: transactions.length,
    };
  } catch (error: any) {
    console.error('Google Sheets mirror error:', error);
    return {
      success: false,
      message: error?.message || 'Koneksi ke Google Sheets gagal',
    };
  }
}

export function parseItemsFromText(itemsText: string, totalAmount: number): {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  category: string;
}[] {
  if (!itemsText || itemsText.trim() === '-' || itemsText.trim() === '') {
    return [
      {
        id: `item-${Date.now()}-0`,
        name: 'Item Transaksi',
        qty: 1,
        unitPrice: totalAmount || 0,
        subtotal: totalAmount || 0,
        category: 'Umum',
      },
    ];
  }

  // Example formats: "2x Hotwheels (@35000), 1x Kopi (@15000)" or "Hotwheels 2 pcs"
  const parts = itemsText.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return [
      {
        id: `item-${Date.now()}-0`,
        name: itemsText,
        qty: 1,
        unitPrice: totalAmount || 0,
        subtotal: totalAmount || 0,
        category: 'Umum',
      },
    ];
  }

  return parts.map((part, idx) => {
    // Try regex: "2x Hotwheels (@35000)" or "2 Hotwheels @35k"
    const match = part.match(/^(\d+)\s*x?\s*([^(@]+)(?:\(@?([0-9.,kK]+)\))?/i);
    if (match) {
      const qty = parseInt(match[1], 10) || 1;
      const name = match[2].trim() || 'Item';
      let unitPrice = 0;
      if (match[3]) {
        let priceStr = match[3].toLowerCase().replace(/rp|[\s.]/g, '');
        if (priceStr.endsWith('k')) {
          unitPrice = parseFloat(priceStr.replace('k', '')) * 1000;
        } else {
          unitPrice = parseFloat(priceStr) || 0;
        }
      } else {
        unitPrice = Math.round(totalAmount / (parts.length * qty)) || 0;
      }
      return {
        id: `item-${Date.now()}-${idx}`,
        name,
        qty,
        unitPrice,
        subtotal: unitPrice * qty,
        category: 'Umum',
      };
    }

    return {
      id: `item-${Date.now()}-${idx}`,
      name: part,
      qty: 1,
      unitPrice: Math.round(totalAmount / parts.length) || 0,
      subtotal: Math.round(totalAmount / parts.length) || 0,
      category: 'Umum',
    };
  });
}

export async function pullTransactionsFromGoogleSheets(
  webhookUrl: string
): Promise<{ success: boolean; message: string; transactions?: SaleTransaction[] }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Google Apps Script belum diisi atau tidak valid' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal menarik data dari Google Sheets. Pastikan Web App disebar (Deploy) sebagai 'Anyone'`,
      };
    }

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        message:
          'Respons Google Apps Script bukan JSON yang valid. Pastikan fungsi doGet(e) sudah dipasang di Apps Script.',
      };
    }

    const rows = Array.isArray(json) ? json : json.data || json.rows || [];
    if (!Array.isArray(rows)) {
      return {
        success: false,
        message: 'Format data Google Sheets tidak sesuai (tidak berisi array transaksi)',
      };
    }

    const transactions: SaleTransaction[] = rows.map((r: any, idx: number) => {
      const id = String(r.id || r['ID Transaksi'] || `TRX-GS-${Date.now()}-${idx}`);
      const date = String(r.date || r['Tanggal'] || new Date().toISOString().split('T')[0]);
      const time = String(r.time || r['Waktu'] || '12.00');
      const platformRaw = String(r.platform || r['Kanal'] || 'manual').toLowerCase();
      const platform = (['whatsapp', 'telegram', 'manual'].includes(platformRaw)
        ? platformRaw
        : 'manual') as 'whatsapp' | 'telegram' | 'manual';
      const sender = String(r.sender || r['Pengirim'] || 'Spreadsheet User');
      const customerName = String(r.customerName || r['Nama Pelanggan'] || 'Pelanggan');
      const totalAmount = Number(r.totalAmount || r['Total Akhir (Rp)'] || r['Total Akhir'] || 0);
      const subtotal = Number(r.subtotal || r['Subtotal'] || totalAmount);
      const discount = Number(r.discount || r['Diskon'] || 0);
      const tax = Number(r.tax || r['Pajak'] || 0);
      const paymentMethod = String(r.paymentMethod || r['Metode Bayar'] || 'Tunai');
      const statusRaw = String(r.paymentStatus || r['Status'] || 'Lunas');
      const paymentStatus = statusRaw.toLowerCase().includes('belum') ? 'Belum Lunas' : 'Lunas';
      const notes = String(r.notes || r['Catatan'] || 'Sinkron dari Google Sheets');
      const itemsText = String(r.itemsText || r['Daftar Item'] || '');

      const items = parseItemsFromText(itemsText, totalAmount);

      return {
        id,
        timestamp: r.timestamp || new Date().toISOString(),
        date,
        time,
        platform,
        sender,
        customerName,
        rawMessage: r.rawMessage || itemsText || `Transaksi ${id}`,
        items,
        subtotal,
        discount,
        tax,
        totalAmount,
        paymentMethod,
        paymentStatus,
        notes,
        syncedToGoogleSheets: true,
      };
    });

    return {
      success: true,
      message: `Berhasil menarik ${transactions.length} baris transaksi dari Google Sheets`,
      transactions,
    };
  } catch (error: any) {
    console.error('Google Sheets pull error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menghubungi Google Apps Script',
    };
  }
}
