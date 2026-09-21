<div align="center">

# 💰 Expense & Income Tracker Bot

**Solusi Otomatisasi Pencatatan Keuangan Berbasis AI & Terintegrasi Google Sheets**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini%20AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Telegram](https://img.shields.io/badge/Telegram_Bot-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="#-fitur-unggulan">Fitur Utama</a> •
  <a href="#-arsitektur-sistem">Arsitektur</a> •
  <a href="#-struktur-proyek">Struktur Proyek</a> •
  <a href="#-panduan-instalasi">Cara Instalasi</a> •
  <a href="#-integrasi-google-sheets">Google Sheets</a> •
  <a href="#-cara-penggunaan">Penggunaan</a>
</p>

---

</div>

## 📌 Ringkasan

**Expense & Income Tracker Bot** adalah aplikasi manajemen keuangan cerdas yang memungkinkan Anda mencatat transaksi harian (pemasukan & pengeluaran) hanya dengan **bahasa sehari-hari**. Powered by **Google Gemini AI**, sistem secara otomatis mengurai teks, menentukan kategori, nominal, serta tanggal secara rinci, lalu menyinkronkannya secara *real-time* ke **Google Sheets** dan Dashboard Web interaktif Anda.

---

## ✨ Fitur Unggulan

| Fitur | Deskripsi |
| :--- | :--- |
| 🤖 **Natural Language Parsing** | Cukup ketik *"Makan siang bakso 25rb"* — Gemini AI akan mengekstrak nominal, tanggal, dan kategori secara otomatis. |
| 📲 **Multi-Platform Input** | Mendukung pencatatan via **Bot Telegram**, **Web Simulator**, maupun **Modal Input Manual**. |
| 📊 **Real-Time Sheets Sync** | Terintegrasi 2 arah dengan Google Sheets menggunakan Google Apps Script Webhook. |
| 📈 **Interactive Dashboard** | Dilengkapi kartu statistik (Total Income, Total Expense, Net Balance) & tabel interaktif. |
| 🛠️ **Diagnostic Suite** | Fitur bawaan untuk menguji endpoint Webhook, koneksi Telegram, dan respons Google Apps Script. |

---

## 🏗️ Arsitektur Sistem

```
 ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
 │  Telegram Bot  │     │ Web Simulator  │     │ Manual Form UI │
 └───────┬────────┘     └───────┬────────┘     └───────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                ▼
                   ┌─────────────────────────┐
                   │  Backend Server (Node)  │
                   └────────────┬────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   ┌───────────────────────┐         ┌───────────────────────┐
   │ Google Gemini AI API  │         │ Local DB / JSON Store │
   │ (Ekstraksi & Kategori)│         └───────────────────────┘
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │  Google Apps Script   │ ──► [ 📊 Google Sheets ]
   │   (Webhook Endpoint)  │
   └───────────────────────┘
```

---

## 📁 Struktur Proyek

```
bot-for-income-integrated-with-spreadsheet/
├── 📂 data/
│   └── db.json                    # Penyimpanan data lokal (JSON database)
├── 📂 server/
│   ├── auth.ts                    # Logika autentikasi
│   ├── diagnosticHelper.ts        # Modul diagnostik koneksi & webhook
│   ├── geminiParser.ts            # Parser AI berbasis Google Gemini
│   ├── googleSheetsSync.ts        # Handler komunikasi Google Sheets
│   ├── storage.ts                 # Lapisan persistensi data
│   └── telegramBot.ts             # Listener & Handler Telegram Bot API
├── 📂 src/
│   ├── 📂 components/
│   │   ├── BotSimulator.tsx       # Live Chat/Bot Simulator UI
│   │   ├── LoginPage.tsx          # Halaman masuk sistem
│   │   ├── ManualTransactionModal.tsx # Form input manual
│   │   ├── Navbar.tsx             # Navigasi utama
│   │   ├── SpreadsheetView.tsx    # Datagrid transaksi
│   │   ├── StatsCards.tsx         # Ringkasan ringkas metrik keuangan
│   │   ├── WebhookSetup.tsx       # Pengaturan integrasi Webhook
│   │   └── WhatsAppDiagnostic.tsx # Diagnostic tool untuk integrasi pesan
│   ├── googleAppsScriptTemplate.ts # Script template untuk Google Apps Script
│   ├── App.tsx                    # Komponen utama React
│   ├── main.tsx                   # Entry point frontend
│   └── types.ts                   # Tipe data & Interfaces TypeScript
├── server.ts                      # Entry point Express backend server
├── package.json                   # Dependensi & skrip aplikasi
└── vite.config.ts                 # Konfigurasi build Vite
```

---

## 🚀 Panduan Instalasi

### 1. Prasyarat
Pastikan lingkungan pengembangan Anda sudah terpasang:
- **Node.js** `>= v18.0.0`
- **npm** atau **yarn**
- **Google Gemini API Key** ([Dapatkan di sini](https://aistudio.google.com/))
- **Telegram Bot Token** (Melalui [@BotFather](https://t.me/BotFather))

### 2. Clone Repositori
```bash
git clone https://github.com/arudorin/bot-for-income-integrated-with-spreadsheet.git
cd bot-for-income-integrated-with-spreadsheet
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variable
Salin berkas `.env.example` menjadi `.env` dan sesuaikan nilainya:
```bash
cp .env.example .env
```

Buka berkas `.env` lalu lengkapi kunci berikut:
```env
PORT=5000
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
TELEGRAM_BOT_TOKEN=123456789:AAYourTelegramBotTokenHere
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YourAppsScriptDeploymentId/exec
```

---

## 📊 Integrasi Google Sheets

1. Buat **Google Sheet** baru di akun Google Anda.
2. Buka menu **Extensions** > **Apps Script**.
3. Buka berkas `src/googleAppsScriptTemplate.ts` pada repositori ini, lalu salin seluruh kodenya ke editor Apps Script.
4. Klik **Deploy** > **New Deployment**:
   - **Select type:** *Web App*
   - **Execute as:** *Me (Email Anda)*
   - **Who has access:** *Anyone*
5. Klik **Deploy**, lalu salin **Web App URL** yang dihasilkan ke variabel `GOOGLE_SHEET_WEBHOOK_URL` di berkas `.env` Anda.

---

## 🕹️ Cara Penggunaan

### 🛠️ Mode Pengembang (Development)
Jalankan frontend dan backend secara bersamaan:
```bash
npm run dev
```
Akses dashboard di browser melalui: `http://localhost:5000`

### 📦 Mode Produksi
Kompilasi aplikasi dan jalankan server produksi:
```bash
npm run build
npm start
```

### 💬 Contoh Perintah Chat (Telegram / Bot Simulator)

- 🍔 **Pengeluaran:**
  > *"Beli nasi goreng dan es teh 28000"*
  
  *(AI akan mencatat: Tipe = Pengeluaran, Kategori = Makanan & Minuman, Nominal = Rp 28.000)*

- 💼 **Pemasukan:**
  > *"Dapat pembayaran komisi project web 1.500.000"*
  
  *(AI akan mencatat: Tipe = Pemasukan, Kategori = Freelance/Pemasukan, Nominal = Rp 1.500.000)*

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Jika Anda memiliki gagasan fitur baru atau perbaikan *bug*:
1. Fork repositori ini.
2. Buat feature branch (`git checkout -b feature/FiturBaru`).
3. Commit perubahan Anda (`git commit -m 'Menambahkan fitur baru'`).
4. Push ke branch (`git push origin feature/FiturBaru`).
5. Buat **Pull Request**.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi [MIT](LICENSE).
