```markdown
# Bot Pencatat Keuangan Terintegrasi Google Sheets

Aplikasi pelacak pemasukan dan pengeluaran otomatis berbasis AI (Google Gemini) yang mampu membaca pesan masuk dari Telegram atau webhook, mencatat transaksi keuangan secara otomatis, serta menyinkronkannya langsung ke Google Sheets.

---

## Fitur Utama

- **Analisis AI Otomatis:** Menggunakan Google Gemini AI (`geminiParser.ts`) untuk mengekstrak tanggal, nominal, kategori, dan catatan dari pesan teks atau percakapan non-formal.
- **Sinkronisasi Google Sheets:** Sinkronisasi dua arah secara real-time ke Google Sheets melalui integrasi Google Apps Script.
- **Integrasi Bot Telegram:** Catat pengeluaran dan pemasukan kapan saja hanya dengan mengirimkan pesan teks biasa ke bot Telegram.
- **Dashboard Interaktif:** 
  - **Simulator Bot:** Uji coba analisis bahasa alami secara langsung dari antarmuka pengguna (UI).
  - **Tampilan Spreadsheet:** Lihat seluruh data transaksi dalam bentuk tabel interaktif.
  - **Kartu Statistik:** Ringkasan cepat untuk total pemasukan, pengeluaran, dan saldo saat ini.
  - **Diagnostik WhatsApp & Webhook:** Alat diagnostik bawaan untuk menguji dan memecahkan masalah integrasi webhook serta alur pesan.
- **Pencatatan Manual:** Fitur input data transaksi secara manual melalui tampilan modal.

---

## Struktur Proyek


```

├── data/
│   └── db.json                  # Penyimpanan cadangan lokal (JSON)
├── server/
│   ├── auth.ts                  # Penanganan autentikasi
│   ├── diagnosticHelper.ts      # Diagnostik konektivitas dan webhook
│   ├── geminiParser.ts          # Pemrosesan bahasa alami dengan Gemini AI
│   ├── googleSheetsSync.ts      # Integrasi dengan Google Sheets API
│   ├── storage.ts               # Lapisan penyimpanan data
│   └── telegramBot.ts           # Penanganan dan pendengar API Bot Telegram
├── src/
│   ├── components/
│   │   ├── BotSimulator.tsx     # Fitur pengujian percakapan di aplikasi
│   │   ├── LoginPage.tsx        # Halaman autentikasi UI
│   │   ├── ManualTransactionModal.tsx # Antarmuka input data manual
│   │   ├── Navbar.tsx           # Navigasi atas
│   │   ├── SpreadsheetView.tsx  # Tampilan tabel data di aplikasi
│   │   ├── StatsCards.tsx       # Dashboard metrik keuangan
│   │   ├── WebhookSetup.tsx     # UI konfigurasi Webhook
│   │   └── WhatsAppDiagnostic.tsx # Antarmuka diagnostik pengiriman pesan
│   ├── googleAppsScriptTemplate.ts # Templat skrip untuk penyebaran Google Apps Script
│   ├── App.tsx                  # Komponen utama React
│   ├── main.tsx                 # Titik masuk utama klien
│   └── types.ts                 # Definisi tipe dan antarmuka TypeScript
├── server.ts                    # Titik masuk server backend
├── package.json                 # Dependensi dan skrip proyek
└── vite.config.ts               # Konfigurasi build Vite

```

---

## Prasyarat

- **Node.js:** Versi v18.0.0 atau lebih baru
- **npm** atau **yarn**
- **API Key Google Gemini:** Diperlukan untuk pemrosesan teks berbasis AI.
- **Token Bot Telegram:** (Opsional) Diperlukan jika ingin menghubungkan aplikasi dengan Telegram via BotFather.
- **Akun Google:** Diperlukan untuk memasang Google Apps Script dan mengakses spreadsheet sinkronisasi.

---

## Cara Penginstalan & Konfigurasi

### 1. Cloning Repositori
```bash
git clone <url-repositori-anda>
cd bot-for-income-integrated-with-spreadsheet

```

### 2. Instal Dependensi

```bash
npm install

```

### 3. Konfigurasi Environment Variables

Salin berkas contoh konfigurasi `.env.example` menjadi `.env`:

```bash
cp .env.example .env

```

Isi variabel kredensial berikut di dalam berkas `.env`:

```env
PORT=5000
GEMINI_API_KEY=masukkan_api_key_gemini_anda
TELEGRAM_BOT_TOKEN=masukkan_token_bot_telegram_anda
GOOGLE_SHEET_WEBHOOK_URL=masukkan_url_google_apps_script_anda

```

### 4. Konfigurasi Integrasi Google Sheets

1. Buat atau buka berkas **Google Sheet** di akun Google Anda.
2. Buka menu **Ekstensi** > **Apps Script**.
3. Salin isi kode dari berkas `src/googleAppsScriptTemplate.ts` lalu tempelkan ke dalam editor Google Apps Script.
4. Terapkan (Deploy) skrip sebagai **Aplikasi Web (Web App)**:
* **Jalankan sebagai (Execute as):** *Saya (Me)*
* **Siapa yang memiliki akses (Who has access):** *Siapa saja (Anyone)*


5. Salin URL Aplikasi Web yang dihasilkan, lalu masukkan ke dalam variabel `GOOGLE_SHEET_WEBHOOK_URL` di berkas `.env` atau melalui menu **Pengaturan Webhook** di dashboard aplikasi.

---

## Cara Menjalankan Aplikasi

### Mode Pengembang (Development)

Jalankan server backend dan antarmuka frontend secara bersamaan:

```bash
npm run dev

```

### Mode Produksi (Production Build)

Lakukan kompilasi aset frontend dan jalankan server:

```bash
npm run build
npm start

```

---

## Cara Penggunaan

1. **Melalui Telegram:** Kirimkan pesan biasa seperti *"Makan siang habis 25rb hari ini"* atau *"Dapat transferan freelance 1.500.000"* ke Bot Telegram Anda. AI akan mengkategorikan transaksi tersebut dan mencatatnya otomatis ke Google Sheets.
2. **Melalui Simulator Web:** Buka dashboard aplikasi web, masuk ke menu **Bot Simulator**, lalu masukkan contoh pesan untuk melihat bagaimana Gemini AI mengurai data sebelum disimpan.
3. **Pencatatan Manual:** Klik tombol **Tambah Transaksi** pada dashboard web untuk menentukan nominal, kategori, dan tanggal secara manual.

```

```
