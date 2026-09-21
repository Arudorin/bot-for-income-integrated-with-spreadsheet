export const GOOGLE_APPS_SCRIPT_CODE = `// KODE GOOGLE APPS SCRIPT (SINKRON 2 ARAH: KIRIM, TARIK, HAPUS & SELARASKAN)
// Tempel kode ini di Spreadsheet Anda: Ekstensi > Apps Script
// Lalu Deploy > New Deployment (atau Kelola Deployment > Edit > Versi Baru) > Who has access: Anyone (Siapa saja)

function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID Transaksi",
      "Tanggal",
      "Waktu",
      "Kanal",
      "Nama Pelanggan",
      "Daftar Item",
      "Total Qty",
      "Subtotal",
      "Diskon",
      "Total Akhir (Rp)",
      "Metode Bayar",
      "Status",
      "Catatan"
    ]);
    sheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#d1e7dd");
  }
}

// 1. FUNGSI MENERIMA DATA DARI BOT & APLIKASI WEB
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    ensureHeader(sheet);
    var lastRow = sheet.getLastRow();

    // A. SELARASKAN PENUH (MIRROR ALL)
    // Menimpa seluruh data agar persis seperti di web.
    // Baris yang telah dihapus di web OTOMATIS TERHAPUS di Spreadsheet.
    if (data.action === "mirror_all" || data.action === "replace_all") {
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 13).clearContent();
      }
      var txs = data.transactions || [];
      if (txs.length > 0) {
        var rows = txs.map(function(t) {
          return [
            t.id,
            t.date,
            t.time,
            t.platform ? t.platform.toUpperCase() : "MANUAL",
            t.customerName || "-",
            t.itemsText || "-",
            t.totalQty || 1,
            t.subtotal || 0,
            t.discount || 0,
            t.totalAmount || 0,
            t.paymentMethod || "Tunai",
            t.paymentStatus || "Lunas",
            t.notes || ""
          ];
        });
        sheet.getRange(2, 1, rows.length, 13).setValues(rows);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Spreadsheet berhasil diselaraskan penuh dengan Web (" + txs.length + " transaksi)"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. HAPUS BARIS TERTENTU (DELETE / BATCH DELETE)
    if (data.action === "delete") {
      var idsToDelete = data.ids || (data.id ? [data.id] : []);
      var idSet = {};
      for (var k = 0; k < idsToDelete.length; k++) {
        idSet[String(idsToDelete[k]).trim()] = true;
      }
      var deletedCount = 0;
      if (lastRow > 1) {
        var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        // Hapus mundur dari bawah ke atas agar indeks baris tidak bergeser
        for (var r = colA.length - 1; r >= 0; r--) {
          var rowId = String(colA[r][0]).trim();
          if (idSet[rowId]) {
            sheet.deleteRow(r + 2);
            deletedCount++;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        deletedCount: deletedCount,
        message: deletedCount + " baris berhasil dihapus dari Spreadsheet"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // C. KOSONGKAN SEMUA BARIS (CLEAR ALL)
    if (data.action === "clear_all") {
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Seluruh transaksi di Spreadsheet berhasil dikosongkan"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // D. SIMPAN / UPDATE (UPSERT) SINGLE TRANSAKSI
    var targetId = String(data.id || "").trim();
    var foundRow = -1;
    if (targetId && lastRow > 1) {
      var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < colA.length; i++) {
        if (String(colA[i][0]).trim() === targetId) {
          foundRow = i + 2;
          break;
        }
      }
    }

    var rowData = [
      data.id,
      data.date,
      data.time,
      data.platform ? data.platform.toUpperCase() : "WA/TG",
      data.customerName || "-",
      data.itemsText || "-",
      data.totalQty || 1,
      data.subtotal || 0,
      data.discount || 0,
      data.totalAmount || 0,
      data.paymentMethod || "Tunai",
      data.paymentStatus || "Lunas",
      data.notes || ""
    ];

    if (foundRow > 1) {
      sheet.getRange(foundRow, 1, 1, 13).setValues([rowData]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Baris transaksi " + data.id + " berhasil diperbarui"
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data transaksi baru berhasil dicatat ke Google Sheets"
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. FUNGSI MENARIK DATA KE APLIKASI (SINKRON DARI SPREADSHEET)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: 0,
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0] && !r[4] && !r[5]) continue; // lewati baris kosong
      
      data.push({
        id: String(r[0] || "TRX-GS-" + i),
        date: String(r[1] ? formatDate(r[1]) : ""),
        time: String(r[2] ? formatTime(r[2]) : ""),
        platform: String(r[3] || "manual").toLowerCase(),
        customerName: String(r[4] || "Pelanggan"),
        itemsText: String(r[5] || ""),
        totalQty: Number(r[6]) || 1,
        subtotal: Number(r[7]) || 0,
        discount: Number(r[8]) || 0,
        totalAmount: Number(r[9]) || 0,
        paymentMethod: String(r[10] || "Tunai"),
        paymentStatus: String(r[11] || "Lunas"),
        notes: String(r[12] || "")
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: data.length,
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatDate(val) {
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = ("0" + (val.getMonth() + 1)).slice(-2);
    var d = ("0" + val.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  return String(val);
}

function formatTime(val) {
  if (val instanceof Date) {
    var h = ("0" + val.getHours()).slice(-2);
    var m = ("0" + val.getMinutes()).slice(-2);
    return h + "." + m;
  }
  return String(val);
}`;
