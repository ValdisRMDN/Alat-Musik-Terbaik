/**
 * SURVEI ALAT MUSIK FAVORIT - Google Apps Script
 *
 * Cara pakai:
 * 1. Buka Google Sheets > Extensions > Apps Script, tempel seluruh kode ini.
 * 2. Klik Deploy > New deployment > Select type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Salin "Web app URL" lalu tempel ke WEB_APP_URL di app.js.
 * 4. Setiap kali kode ini diubah, buat deployment baru (Manage deployments > Edit > New version).
 */

var SHEET_NAME = "Responses";
var ALLOWED = ["Gitar", "Piano", "Drum", "Biola", "Saksofon", "Terompet"]; // harus sama dengan app.js
var HEADERS = ["Waktu", "Alat Musik", "Nama", "Kota", "Alasan"];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Cegah teks diperlakukan sebagai rumus oleh spreadsheet
function clean_(value, max) {
  var s = String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Menyimpan suara baru
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var alat = String(body.alat || "").trim();
    if (ALLOWED.indexOf(alat) === -1) {
      return json_({ ok: false, error: "Pilihan alat musik tidak valid." });
    }
    getSheet_().appendRow([
      new Date(),
      alat,
      clean_(body.nama, 60),
      clean_(body.kota, 60),
      clean_(body.alasan, 300)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "Terjadi kesalahan di server." });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Mengambil jumlah suara per alat musik
function doGet(e) {
  try {
    var sheet = getSheet_();
    var counts = {};
    ALLOWED.forEach(function (name) { counts[name] = 0; });
    var last = sheet.getLastRow();
    if (last > 1) {
      var values = sheet.getRange(2, 2, last - 1, 1).getValues();
      values.forEach(function (row) {
        var name = String(row[0]);
        if (counts.hasOwnProperty(name)) counts[name]++;
      });
    }
    return json_({ ok: true, counts: counts });
  } catch (err) {
    return json_({ ok: false, error: "Gagal membaca data." });
  }
}
