import { GoogleGenAI, Type } from '@google/genai';
import { ParseSaleResponse } from '../src/types.js';

let genAIClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Model cascade: prioritize gemini-3.8-flash, with fallbacks if temporary high-demand (503) occurs
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseSalesMessage(
  messageText: string,
  platform: 'whatsapp' | 'telegram' | 'manual',
  sender: string = ''
): Promise<ParseSaleResponse> {
  const prompt = `
Kamu adalah asisten AI kasir dan akuntan cerdas untuk bot WhatsApp dan Telegram di Indonesia.
Tugasmu adalah menganalisis pesan percakapan penjualan dari pedagang / admin toko, lalu mengekstraknya menjadi data transaksi terstruktur dalam format JSON yang siap dimasukkan ke Spreadsheet, serta membuat pesan balasan konfirmasi (reply_message) berformat WhatsApp/Telegram Markdown yang rapi dan profesional.

Pesan masuk:
"""${messageText}"""
Platform: ${platform}
Pengirim: ${sender}

Aturan Ekstraksi:
1. "is_sale": bernilai true jika pesan tersebut merupakan catatan penjualan, transaksi, pembelian barang, omzet, atau rekap kasir. Bernilai false jika hanya sapaan santai ("halo", "p", "test", "selamat pagi") tanpa ada transaksi.
2. Bahasa & Singkatan Indonesia:
   - "k" atau "rb" = ribuan (misal "18k" / "18rb" = 18000, "150k" = 150000, "1jt" = 1000000).
   - "pcs", "biji", "buah", "porsi", "bks", "cup", "kg", "lembar" dsb adalah quantity (qty).
   - "2x" atau "2 @" artinya 2 buah/porsi dengan harga satuan.
   - Pahami konteks harga: jika "3 baju 150rb total", berarti total 150.000 (satuan 50.000). Jika "3 baju @50rb", berarti subtotal 150.000.
3. Metode Pembayaran ("payment_method"):
   - "Tunai" / "Cash", "QRIS", "Transfer BCA", "Transfer Mandiri", "Transfer BRI", "Transfer BNI", "GoPay", "OVO", "ShopeePay", "DANA", atau "Hutang / Tempo".
4. Status Pembayaran ("payment_status"): "Lunas" (default jika bayar) atau "Belum Lunas" (jika tempo, piutang, bayar nanti).
5. Buat "reply_message": Pesan ringkas, sopan, dengan icon/emoji dan formatting tebal (*bold*) ala pesan bot WhatsApp/Telegram, memperlihatkan item, harga, total, metode bayar, dan status tersimpan di spreadsheet.
`;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    const ai = getAIClient();

    // Iterate through candidate models with retry backoff
    for (const modelName of CANDIDATE_MODELS) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction:
                'Kamu adalah mesin ekstraksi data transaksi kasir penjualan WhatsApp/Telegram ke spreadsheet Indonesia berakurasi tinggi. Keluarkan HANYA JSON sesuai schema.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  is_sale: {
                    type: Type.BOOLEAN,
                    description: 'True if message contains a sales transaction, false otherwise',
                  },
                  customer_name: {
                    type: Type.STRING,
                    description: 'Customer or buyer name if mentioned, otherwise leave empty or general name',
                  },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: 'Item / product name' },
                        qty: { type: Type.INTEGER, description: 'Quantity count' },
                        unit_price: { type: Type.NUMBER, description: 'Price per single unit in IDR' },
                        subtotal: { type: Type.NUMBER, description: 'qty * unit_price in IDR' },
                        category: { type: Type.STRING, description: 'e.g. Makanan, Minuman, Pakaian, Jasa, Elektronik' },
                      },
                      required: ['name', 'qty', 'unit_price', 'subtotal'],
                    },
                  },
                  subtotal: { type: Type.NUMBER, description: 'Sum of item subtotals' },
                  discount: { type: Type.NUMBER, description: 'Discount in IDR if any' },
                  tax: { type: Type.NUMBER, description: 'Tax in IDR if any' },
                  total_amount: { type: Type.NUMBER, description: 'Final total price in IDR' },
                  payment_method: { type: Type.STRING, description: 'e.g. Tunai, QRIS, Transfer BCA, GoPay' },
                  payment_status: { type: Type.STRING, description: 'Lunas or Belum Lunas' },
                  notes: { type: Type.STRING, description: 'Additional remarks, delivery method, or notes' },
                  reply_message: {
                    type: Type.STRING,
                    description: 'Formatted reply message with emojis for WhatsApp/Telegram chat confirmation',
                  },
                },
                required: ['is_sale', 'reply_message'],
              },
            },
          });

          const text = response.text?.trim() || '';
          if (!text) throw new Error('Empty response from Gemini');

          const parsed = JSON.parse(text) as ParseSaleResponse;

          if (!parsed.is_sale) {
            return {
              is_sale: false,
              reply_message:
                parsed.reply_message ||
                '👋 Halo! Kirim catatan penjualan Anda (contoh: *"Kopi susu 2x 18k, roti 1 15k bayar QRIS"*) dan bot akan otomatis mencatatnya langsung ke Spreadsheet.',
            };
          }

          // Sanitize values
          const items = (parsed.items || []).map((it) => ({
            name: it.name || 'Produk',
            qty: Number(it.qty) || 1,
            unit_price: Number(it.unit_price) || 0,
            subtotal: Number(it.subtotal) || (Number(it.qty) || 1) * (Number(it.unit_price) || 0),
            category: it.category || 'Umum',
          }));

          const calculatedSubtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
          const discount = Number(parsed.discount) || 0;
          const tax = Number(parsed.tax) || 0;
          const totalAmount = Number(parsed.total_amount) || Math.max(0, calculatedSubtotal - discount + tax);

          return {
            is_sale: true,
            customer_name: parsed.customer_name || 'Pelanggan Umum',
            items,
            subtotal: calculatedSubtotal,
            discount,
            tax,
            total_amount: totalAmount,
            payment_method: parsed.payment_method || 'Tunai',
            payment_status: parsed.payment_status === 'Belum Lunas' ? 'Belum Lunas' : 'Lunas',
            notes: parsed.notes || '',
            reply_message: parsed.reply_message,
          };
        } catch (error: any) {
          const isTransient =
            error?.status === 503 ||
            error?.message?.includes('503') ||
            error?.message?.includes('high demand') ||
            error?.message?.includes('UNAVAILABLE') ||
            error?.status === 429 ||
            error?.message?.includes('429');

          if (isTransient && attempts < maxAttempts) {
            // Short backoff before retrying same or next model
            await delay(400 * attempts);
            continue;
          }
          // If error on current model, try next model in cascade
          console.warn(`Gemini model ${modelName} encountered error (attempt ${attempts}):`, error?.message || error);
          break;
        }
      }
    }
  }

  // If all AI attempts fail or no API key, use the robust heuristic parser
  return heuristicFallbackParser(messageText);
}

// Helper to parse Indonesian currency string (e.g. 18k, 25rb, 1.5jt, 50.000)
function parseIndonesianPrice(str: string): number {
  let clean = str.toLowerCase().replace(/[^\d.,krbtjuta]/gi, '').trim();
  let multiplier = 1;
  if (clean.includes('jt') || clean.includes('juta')) {
    multiplier = 1000000;
    clean = clean.replace(/(jt|juta)/g, '');
  } else if (clean.includes('k') || clean.includes('rb') || clean.includes('ribu')) {
    multiplier = 1000;
    clean = clean.replace(/(k|rb|ribu)/g, '');
  }
  clean = clean.replace(/\./g, '').replace(/,/g, '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.round(val * multiplier);
}

// Resilient heuristic parser if API key is not present or temporary network/503 failure
function heuristicFallbackParser(message: string): ParseSaleResponse {
  const lower = message.toLowerCase();

  // Basic check if it's a greeting or non-sale
  if (/^(halo|hai|p|ping|test|tes|assalamualaikum|pagi|siang|malam)\b/i.test(lower) && !/\d/.test(lower)) {
    return {
      is_sale: false,
      reply_message:
        '👋 Halo! Kirim catatan penjualan Anda dalam format teks bebas (contoh: *"Laku 2 Kopi Susu @18k bayar QRIS"*), bot akan langsung memasukkannya ke spreadsheet.',
    };
  }

  // Payment Method detection
  let paymentMethod = 'Tunai';
  if (/qris/i.test(lower)) paymentMethod = 'QRIS';
  else if (/bca/i.test(lower)) paymentMethod = 'Transfer BCA';
  else if (/mandiri/i.test(lower)) paymentMethod = 'Transfer Mandiri';
  else if (/bri/i.test(lower)) paymentMethod = 'Transfer BRI';
  else if (/bni/i.test(lower)) paymentMethod = 'Transfer BNI';
  else if (/gopay/i.test(lower)) paymentMethod = 'GoPay';
  else if (/ovo/i.test(lower)) paymentMethod = 'OVO';
  else if (/dana/i.test(lower)) paymentMethod = 'DANA';
  else if (/shopeepay|spay/i.test(lower)) paymentMethod = 'ShopeePay';
  else if (/transfer|tf/i.test(lower)) paymentMethod = 'Transfer Bank';

  // Customer Name detection
  let customerName = 'Pelanggan Umum';
  const customerMatch = message.match(/(?:a\.?n\.?|atas nama|nama|cust|customer|pembeli)\s+([A-Za-z0-9\s]{2,25})/i);
  if (customerMatch && customerMatch[1]) {
    customerName = customerMatch[1].trim().split(/,|\n|\/|bayar|via|lunas/i)[0].trim();
  }

  // Split into item candidate segments (by commas, semicolons, newlines, or "dan")
  const rawSegments = message
    .split(/(?:,|\n|;|\bdan\b|\+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const extractedItems: Array<{
    name: string;
    qty: number;
    unit_price: number;
    subtotal: number;
    category: string;
  }> = [];

  for (const seg of rawSegments) {
    // Skip segment if it's purely payment or customer metadata
    if (/^(?:bayar|via|an|a\.n\.?|atas nama|lunas|tempo|trf|transfer)\b/i.test(seg.trim()) && !/@|\d+k|\d+rb/i.test(seg)) {
      continue;
    }

    // Extract quantity (e.g. "2 Kopi", "2x Kopi", "3 pcs Kaos")
    let qty = 1;
    const qtyMatch = seg.match(/(?:^|\s)(\d+)\s*(?:x|pcs|cup|biji|porsi|buah|bks|kg)?\s+/i);
    if (qtyMatch && qtyMatch[1]) {
      const q = parseInt(qtyMatch[1], 10);
      if (q > 0 && q < 500) {
        qty = q;
      }
    }

    // Extract unit price or subtotal
    // Cases: @18k, @ 18.000, 25rb, 18k, 50.000
    let unitPrice = 0;
    const atPriceMatch = seg.match(/@\s*(\d+[\d.,]*\s*(?:k|rb|ribu|jt|juta)?)/i);
    if (atPriceMatch && atPriceMatch[1]) {
      unitPrice = parseIndonesianPrice(atPriceMatch[1]);
    } else {
      const generalPriceMatch = seg.match(/(\d+[\d.,]*\s*(?:k|rb|ribu|jt|juta))/i);
      if (generalPriceMatch && generalPriceMatch[1]) {
        const foundPrice = parseIndonesianPrice(generalPriceMatch[1]);
        unitPrice = foundPrice >= 1000 ? foundPrice : 0;
      }
    }

    // Clean product name
    let cleanName = seg
      .replace(/(?:catat(?:kan)?|min|mas|mbak|laku|order|pesan|jual)\s*[:,]?\s*/gi, '')
      .replace(/(?:bayar|via|a\.n\.?|atas nama|nama|cust|customer|trf|transfer).*$/gi, '')
      .replace(/@\s*(\d+[\d.,]*\s*(?:k|rb|ribu|jt|juta)?)/gi, '')
      .replace(/(\d+[\d.,]*\s*(?:k|rb|ribu|jt|juta))/gi, '')
      .replace(/(?:^|\s)\d+\s*(?:x|pcs|cup|biji|porsi|buah|bks|kg)?\s+/gi, ' ')
      .replace(/[#*~`]/g, '')
      .trim();

    if (!cleanName || cleanName.length < 2) {
      if (unitPrice > 0 || qty > 1) {
        cleanName = 'Produk Penjualan';
      } else {
        continue;
      }
    }

    if (unitPrice === 0) {
      unitPrice = 20000; // sensible fallback
    }

    // Infer category
    let category = 'Umum';
    if (/kopi|teh|latte|es|jus|juice|susu|drink|minuman/i.test(cleanName)) category = 'Minuman';
    else if (/croissant|roti|nasi|mie|ayam|burger|snack|makanan/i.test(cleanName)) category = 'Makanan';
    else if (/kaos|baju|celana|hoodie|dress|jaket|pakaian/i.test(cleanName)) category = 'Pakaian';
    else if (/kabel|charger|casing|headset|elektronik/i.test(cleanName)) category = 'Elektronik';

    extractedItems.push({
      name: cleanName,
      qty,
      unit_price: unitPrice,
      subtotal: qty * unitPrice,
      category,
    });
  }

  // If no items were extracted from segments, fallback to a single item from full message
  if (extractedItems.length === 0) {
    const singlePriceMatches = message.match(/(\d+[\d.,]*\s*(?:k|rb|ribu|jt|juta)?)/gi) || [];
    let estimatedTotal = 25000;
    for (const p of singlePriceMatches) {
      const val = parseIndonesianPrice(p);
      if (val >= 1000) {
        estimatedTotal = val;
        break;
      }
    }

    extractedItems.push({
      name: 'Produk Penjualan',
      qty: 1,
      unit_price: estimatedTotal,
      subtotal: estimatedTotal,
      category: 'Umum',
    });
  }

  const calculatedSubtotal = extractedItems.reduce((acc, it) => acc + it.subtotal, 0);
  const isPending = /tempo|hutang|nanti|belum|bon/i.test(lower);
  const paymentStatus = isPending ? 'Belum Lunas' : 'Lunas';

  const itemDetailsText = extractedItems
    .map(
      (it) =>
        `• ${it.qty}x ${it.name} @Rp${it.unit_price.toLocaleString('id-ID')} = Rp${it.subtotal.toLocaleString('id-ID')}`
    )
    .join('\n');

  const replyMessage = `✅ *Transaksi Berhasil Dicatat!*\n\n👤 *Pelanggan:* ${customerName}\n🛒 *Detail Pesanan:*\n${itemDetailsText}\n\n💰 *Total:* Rp ${calculatedSubtotal.toLocaleString('id-ID')}\n💳 *Metode:* ${paymentMethod}\n📌 *Status:* ${paymentStatus}\n\nData transaksi telah tersimpan di spreadsheet.`;

  return {
    is_sale: true,
    customer_name: customerName,
    items: extractedItems,
    subtotal: calculatedSubtotal,
    discount: 0,
    tax: 0,
    total_amount: calculatedSubtotal,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    notes: 'Diproses otomatis',
    reply_message: replyMessage,
  };
}
