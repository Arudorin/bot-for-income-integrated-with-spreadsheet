export interface MetaErrorAnalysis {
  title: string;
  explanation: string;
  hint: string;
  category: 'country_restriction' | 'token_expired' | 'unverified_recipient' | 'window_expired' | 'invalid_id' | 'rate_limit' | 'other';
}

export function analyzeMetaError(
  code: number | string | undefined,
  title?: string,
  message?: string
): MetaErrorAnalysis {
  const numCode = Number(code);

  if (numCode === 130497 || (message && message.includes('restricted from messaging users in this country'))) {
    return {
      title: 'Nomor Tes Meta Dibatasi ke Nomor Indonesia (Error 130497)',
      explanation:
        'Nomor uji coba gratis Meta adalah nomor Amerika (+1 555...). Meta membatasi nomor tes ini untuk memulai pesan ke nomor negara lain (+62) demi proteksi spam internasional.',
      hint: 'Solusi: (1) Kirim pesan WhatsApp DULUAN dari HP Anda ke nomor uji coba Meta untuk membuka sesi 24 jam, ATAU (2) Daftarkan nomor kartu SIM toko Anda sendiri (+62) di menu WhatsApp > Nomor Telepon di Meta Developer.',
      category: 'country_restriction',
    };
  }

  if (numCode === 190 || numCode === 102 || (message && (message.includes('Session has expired') || message.includes('Error validating access token')))) {
    return {
      title: 'Token Akses Meta Kadaluarsa / Tidak Valid (Error 190)',
      explanation:
        'Token Akses Sementara (Temporary Access Token) dari Meta hanya bertahan 24 jam dan sekarang sudah habis masa berlakunya.',
      hint: 'Solusi: Buka Meta Developers > WhatsApp > API Setup, klik tombol "Buat token baru" (atau gunakan System User Token permanen), lalu salin dan simpan di tab WhatsApp Bot.',
      category: 'token_expired',
    };
  }

  if (numCode === 131030 || (message && message.includes('Recipient phone number not in allowed list'))) {
    return {
      title: 'Nomor Tujuan Belum Terdaftar di Akun Uji Coba (Error 131030)',
      explanation:
        'Pada mode Pengembangan (Development Mode), Meta mewajibkan nomor penerima diverifikasi terlebih dahulu di dashboard Meta.',
      hint: 'Solusi: Di halaman Meta Developers > WhatsApp > API Setup > Kirim pesan, klik dropdown "Penerima" lalu pilih "Kelola daftar nomor telepon", masukkan nomor HP Anda dan masukkan kode OTP yang dikirim.',
      category: 'unverified_recipient',
    };
  }

  if (numCode === 131026 || (message && message.includes('Message undeliverable') && message.includes('24 hour'))) {
    return {
      title: 'Di Luar Jendela Layanan 24 Jam (Customer Service Window)',
      explanation:
        'Meta mewajibkan bot hanya boleh membalas pesan teks bebas dalam kurun waktu 24 jam sejak pembeli mengirim pesan terakhir.',
      hint: 'Solusi: Pembeli/kasir harus mengirimkan pesan WhatsApp ke bot terlebih dahulu agar sesi percakapan 24 jam terbuka.',
      category: 'window_expired',
    };
  }

  if (numCode === 100 || (message && message.includes('Invalid parameter'))) {
    return {
      title: 'Parameter atau Phone Number ID Tidak Sesuai (Error 100)',
      explanation:
        'Meta tidak mengenali Phone Number ID yang Anda masukkan, atau format nomor telepon tujuan salah.',
      hint: 'Solusi: Periksa kembali Phone Number ID di pengaturan aplikasi kasir. Pastikan nomor tujuan berformat internasional tanpa tanda plus (contoh: 6289622640080).',
      category: 'invalid_id',
    };
  }

  if (numCode === 130429 || (message && message.includes('Rate limit hit'))) {
    return {
      title: 'Batas Kecepatan Terlampaui (Rate Limit 130429)',
      explanation: 'Terlalu banyak pesan yang dikirim dalam waktu singkat.',
      hint: 'Solusi: Tunggu 1-2 menit sebelum mencoba mengirim pesan kembali.',
      category: 'rate_limit',
    };
  }

  return {
    title: title || `Kendala Meta Graph API (Kode ${code || 'Unknown'})`,
    explanation: message || 'Pengiriman pesan ditolak oleh server WhatsApp Meta.',
    hint: 'Solusi: Buka dashboard Meta Developers untuk memeriksa status akun WhatsApp Business Anda dan pastikan izin messages sudah aktif.',
    category: 'other',
  };
}
