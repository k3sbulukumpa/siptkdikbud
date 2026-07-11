// =========================================================================================
// GOOGLE APPS SCRIPT DATABASE INTEGRATION FOR SI PTK DIKBUD BULUKUMBA
// =========================================================================================
// PANDUAN PENGGUNAAN:
// 1. Buka Google Spreadsheet Anda (https://docs.google.com/spreadsheets/d/1qJctUfLLNduX2d_0MeOvMRGf6oHDuFC2Zmhl3mxd5oA/edit)
// 2. Pilih menu Ekstensi > Apps Script.
// 3. Hapus kode default di Editor Apps Script, lalu paste seluruh isi kode ini.
// 4. Ubah SPREADSHEET_ID di bawah ini dengan ID spreadsheet Anda (atau kosongkan jika script terikat ke spreadsheet).
// 5. Simpan (Save). Klik tombol "Terapkan > Penerapan Baru" (Deploy > New Deployment).
// 6. Pilih jenis penerapan: Aplikasi Web (Web App).
// 7. Konfigurasikan:
//    - Jalankan sebagai (Execute as): Saya (Email Anda)
//    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
// 8. Klik Terapkan, berikan izin akses Google Account Anda (klik Advanced > Go to ... (unsafe) jika muncul peringatan keamanan).
// 9. Salin URL Aplikasi Web yang berakhiran /exec dan paste ke tombol "Kelola Database" di aplikasi web Anda.
// =========================================================================================

var SPREADSHEET_ID = "1qJctUfLLNduX2d_0MeOvMRGf6oHDuFC2Zmhl3mxd5oA";

/**
 * Mendapatkan objek Spreadsheet
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Handle GET Requests
 */
function doGet(e) {
  var path = "";
  var method = "GET";
  var payloadStr = "";

  if (e && e.parameter) {
    path = e.parameter.path || "";
    method = e.parameter.method || "GET";
    payloadStr = e.parameter.payload || "";
  }

  var result = api_handler(path, method, payloadStr);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

/**
 * Handle POST Requests (CORS bypass using plain text content-type)
 */
function doPost(e) {
  var path = "";
  var method = "POST";
  var payloadStr = "";

  if (e && e.postData && e.postData.contents) {
    try {
      var postData = JSON.parse(e.postData.contents);
      path = postData.path || "";
      method = postData.method || "POST";
      payloadStr = postData.payload ? String(postData.payload) : e.postData.contents;
    } catch (err) {
      payloadStr = e.postData.contents;
    }
  }

  var result = api_handler(path, method, payloadStr);
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

/**
 * UNIFIED API GATEWAY & ROUTER
 */
function api_handler(path, method, payloadStr) {
  try {
    var payload = {};
    if (payloadStr && payloadStr.trim() !== "") {
      try {
        payload = JSON.parse(payloadStr);
      } catch (err) {
        // Fallback if payload is not standard JSON
      }
    }

    if (path.indexOf("/api/db-status") !== -1) {
      return {
        success: true,
        status: "connected",
        message: "Koneksi Google Spreadsheet Berhasil dan Aktif!",
        url: "Google Spreadsheet Terintegrasi"
      };
    }

    if (path.indexOf("/api/dropdown-data") !== -1) {
      return handleGetDropdownData();
    }

    if (path.indexOf("/api/login") !== -1) {
      return handleLogin(payload);
    }

    if (path.indexOf("/api/change-password") !== -1) {
      return handleChangePassword(payload);
    }

    if (path.indexOf("/api/gtk/list") !== -1) {
      return handleGetGtkList(payload);
    }

    if (path.indexOf("/api/gtk/save") !== -1) {
      return handleSaveGtk(payload);
    }

    if (path.indexOf("/api/gtk/delete") !== -1) {
      return handleDeleteGtk(payload);
    }

    if (path.indexOf("/api/admin/get-password") !== -1) {
      return handleAdminGetPassword(payload);
    }

    if (path.indexOf("/api/admin/change-password") !== -1) {
      return handleAdminChangePassword(payload);
    }

    if (path.indexOf("/api/school/save") !== -1) {
      return handleSaveSchool(payload);
    }

    if (path.indexOf("/api/school/delete") !== -1) {
      return handleDeleteSchool(payload);
    }

    if (path.indexOf("/api/informasi/list") !== -1) {
      return handleGetInformasiList();
    }

    if (path.indexOf("/api/informasi/save") !== -1) {
      return handleSaveInformasi(payload);
    }

    if (path.indexOf("/api/informasi/delete") !== -1) {
      return handleDeleteInformasi(payload);
    }

    return { success: false, message: "Endpoint api tidak ditemukan: " + path };
  } catch (error) {
    return { success: false, message: "Terjadi kesalahan server: " + error.toString() };
  }
}

// ==========================================
// CORE HELPERS FOR SPREADSHEET READ/WRITE
// ==========================================

function getSheetData(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    // Create sheet dynamically if not exists
    sheet = ss.insertSheet(sheetName);
  }
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  
  var list = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var rowEmpty = true;
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (key) {
        var val = values[r][c];
        obj[key] = val;
        if (val !== null && val !== undefined && val.toString().trim() !== "") {
          rowEmpty = false;
        }
      }
    }
    if (!rowEmpty) {
      obj["rowNumber"] = r + 1; // 1-indexed spreadsheet row index
      list.push(obj);
    }
  }
  return list;
}

function writeSheetHeaders(sheetName, headers) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function updateOrAppendRow(sheetName, idColumnName, rowData) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = [];
  if (sheet.getLastRow() >= 1) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return h.toString().trim(); });
  } else {
    // Create headers based on keys
    headers = Object.keys(rowData).filter(function(k) { return k !== "rowNumber"; });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Find existing row index
  var rowIndex = -1;
  var idToFind = String(rowData[idColumnName]).toUpperCase().trim();
  
  if (sheet.getLastRow() > 1) {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var idColIndex = headers.indexOf(idColumnName);
    
    if (idColIndex !== -1) {
      var colValues = sheet.getRange(1, idColIndex + 1, lastRow, 1).getValues();
      for (var r = 1; r < colValues.length; r++) {
        if (String(colValues[r][0]).toUpperCase().trim() === idToFind) {
          rowIndex = r + 1;
          break;
        }
      }
    }
  }

  // Construct values array in header sequence
  var rowValues = headers.map(function(header) {
    return rowData[header] !== undefined ? rowData[header] : "";
  });

  if (rowIndex !== -1) {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // Append new row
    sheet.appendRow(rowValues);
  }
  return true;
}

function deleteRowByValue(sheetName, columnName, targetValue) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return false;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return h.toString().trim(); });
  var colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return false;

  var colValues = sheet.getRange(1, colIdx + 1, lastRow, 1).getValues();
  var deleted = false;
  var targetStr = String(targetValue).toUpperCase().trim();

  // Delete from bottom to top to preserve correct row indices while deleting
  for (var r = colValues.length - 1; r >= 1; r--) {
    if (String(colValues[r][0]).toUpperCase().trim() === targetStr) {
      sheet.deleteRow(r + 1);
      deleted = true;
    }
  }
  return deleted;
}

// ==========================================
// ENDPOINT HANDLERS
// ==========================================

function normalizeIdentifier(ident) {
  if (ident === undefined || ident === null) return "";
  return String(ident)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function comparePasswords(stored, entered) {
  var s1 = String(stored || "").trim();
  var s2 = String(entered || "").trim();
  if (s1 === s2) return true;
  // Handle cases where stored is "123.0" and entered is "123"
  if (s1.indexOf(".0") === s1.length - 2 && s1.substring(0, s1.length - 2) === s2) return true;
  if (s2.indexOf(".0") === s2.length - 2 && s2.substring(0, s2.length - 2) === s1) return true;
  return false;
}

function handleGetDropdownData() {
  writeSheetHeaders("sekolah_db", ["id", "kecamatan", "nama_sekolah", "status_sekolah", "jumlah_rombel", "jumlah_siswa", "alamat_sekolah"]);
  var list = getSheetData("sekolah_db");
  
  var rawSekolahs = list.map(function(s) {
    return {
      id: s.id || "",
      kec: s.kecamatan || "",
      nama: s.nama_sekolah || "",
      status_sekolah: s.status_sekolah || "Negeri",
      jumlah_rombel: Number(s.jumlah_rombel || 0),
      jumlah_siswa: Number(s.jumlah_siswa || 0),
      alamat_sekolah: s.alamat_sekolah || ""
    };
  });

  var kecSet = {};
  rawSekolahs.forEach(function(s) {
    if (s.kec) {
      kecSet[s.kec] = true;
    }
  });
  var rawKecamatans = Object.keys(kecSet);

  return {
    kecamatans: rawKecamatans.sort(),
    sekolahs: rawSekolahs.sort(function(a, b) { return a.nama.localeCompare(b.nama); })
  };
}

function handleLogin(payload) {
  writeSheetHeaders("pengguna_db", ["role", "identifier", "password"]);
  var users = getSheetData("pengguna_db");
  
  var role = payload.role;
  var identifier = String(payload.identifier).toUpperCase().trim();
  var password = String(payload.password);

  // Ensure default admin exists in the users sheet
  var hasAdmin = users.some(function(u) {
    return String(u.role).toLowerCase() === "admin dinas" && 
           String(u.identifier).toLowerCase().trim() === "admin";
  });
  if (!hasAdmin) {
    var defaultAdmin = {
      "role": "Admin Dinas",
      "identifier": "admin",
      "password": "ammatoa"
    };
    updateOrAppendRow("pengguna_db", "identifier", defaultAdmin);
    users.push(defaultAdmin);
  }

  var found = users.filter(function(u) {
    return String(u.role).toLowerCase() === String(role).toLowerCase() &&
           normalizeIdentifier(u.identifier) === normalizeIdentifier(identifier) &&
           comparePasswords(u.password, password);
  });

  if (found.length > 0) {
    // Return the exact identifier stored in the database to align with other DB records
    return { success: true, role: role, identifier: found[0].identifier };
  }
  return { success: false, message: "Username/Sekolah atau Password salah!" };
}

function handleChangePassword(payload) {
  writeSheetHeaders("pengguna_db", ["role", "identifier", "password"]);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("pengguna_db");
  if (!sheet) return { success: false, message: "Sheet pengguna_db tidak ditemukan." };

  var identifier = String(payload.identifier).toUpperCase().trim();
  var oldPass = String(payload.oldPass);
  var newPass = String(payload.newPass);

  var users = getSheetData("pengguna_db");
  var rowIndex = -1;

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (normalizeIdentifier(u.identifier) === normalizeIdentifier(identifier) && comparePasswords(u.password, oldPass)) {
      rowIndex = u.rowNumber;
      break;
    }
  }

  if (rowIndex !== -1) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return h.toString().trim(); });
    var passColIdx = headers.indexOf("password");
    if (passColIdx !== -1) {
      sheet.getRange(rowIndex, passColIdx + 1).setValue(newPass);
      return { success: true, message: "Password berhasil diubah secara live di Google Spreadsheet." };
    }
  }
  return { success: false, message: "Password lama tidak sesuai!" };
}

function handleGetGtkList(payload) {
  writeSheetHeaders("gtk_data", ["id", "kecamatan", "sekolah", "nama", "nip", "status_pegawai", "nik", "golongan", "tmt_golongan", "jabatan", "pendidikan", "beban_tugas", "tmt_kepsek", "sertifikasi", "mapel", "no_hp", "tmt_kgb_terakhir", "created_at"]);
  var list = getSheetData("gtk_data");
  
  var role = payload.role;
  var identifier = payload.identifier;

  var mapped = list.map(function(d) {
    return {
      ID: d.id || "",
      Kecamatan: d.kecamatan || "",
      Sekolah: d.sekolah || "",
      Nama: d.nama || "",
      NIP: d.nip || "",
      Status_Pegawai: d.status_pegawai || "Honorer",
      NIK: d.nik || "",
      Golongan: d.golongan || "",
      TMT_Golongan_Formatted: d.tmt_golongan || "",
      Jabatan: d.jabatan || "",
      Pendidikan: d.pendidikan || "",
      Beban_Tugas: d.beban_tugas || "",
      TMT_Kepsek_Formatted: d.tmt_kepsek || "",
      Sertifikasi: d.sertifikasi || "Belum",
      Mapel: d.mapel || "",
      No_HP: d.no_hp || "",
      TMT_KGB_Terakhir_Formatted: d.tmt_kgb_terakhir || ""
    };
  });

  if (role === "Sekolah" && identifier) {
    var parts = identifier.split("|");
    var kec = String(parts[0]).toUpperCase().trim();
    var sek = String(parts[1]).toUpperCase().trim();
    
    mapped = mapped.filter(function(item) {
      return String(item.Kecamatan).toUpperCase().trim() === kec &&
             String(item.Sekolah).toUpperCase().trim() === sek;
    });
  }

  return mapped;
}

function handleSaveGtk(payload) {
  writeSheetHeaders("gtk_data", ["id", "kecamatan", "sekolah", "nama", "nip", "status_pegawai", "nik", "golongan", "tmt_golongan", "jabatan", "pendidikan", "beban_tugas", "tmt_kepsek", "sertifikasi", "mapel", "no_hp", "tmt_kgb_terakhir", "created_at"]);
  
  var finalId = payload.id || ("ID" + Date.now() + Math.floor(Math.random() * 1000));
  var formattedHp = String(payload.hp || "").trim();
  if (formattedHp.indexOf("0") === 0) {
    formattedHp = "62" + formattedHp.substring(1);
  }

  var rowData = {
    "id": finalId,
    "kecamatan": String(payload.kecamatan || "").toUpperCase().trim(),
    "sekolah": String(payload.sekolah || "").toUpperCase().trim(),
    "nama": String(payload.nama || "").trim(),
    "nip": String(payload.nip || "").trim(),
    "status_pegawai": payload.statusPegawai || "Honorer",
    "nik": String(payload.nik || "").trim(),
    "golongan": String(payload.golongan || "").trim(),
    "tmt_golongan": payload.tmtGolongan || "",
    "jabatan": String(payload.jabatan || "").trim(),
    "pendidikan": String(payload.pendidikan || "").trim(),
    "beban_tugas": String(payload.bebanTugas || "").trim(),
    "tmt_kepsek": payload.tmtKepsek || "",
    "sertifikasi": payload.sertifikasi || "Belum",
    "mapel": String(payload.mapel || "").trim(),
    "no_hp": formattedHp,
    "tmt_kgb_terakhir": payload.tmtKgbTerakhir || "",
    "created_at": new Date().toISOString()
  };

  updateOrAppendRow("gtk_data", "id", rowData);
  return { success: true, message: "Data GTK berhasil disimpan di Google Spreadsheet secara live." };
}

function handleDeleteGtk(payload) {
  var deleted = deleteRowByValue("gtk_data", "id", payload.id);
  if (deleted) {
    return { success: true, message: "Data GTK berhasil dihapus dari Google Spreadsheet secara live." };
  }
  return { success: false, message: "Data GTK tidak ditemukan." };
}

function handleAdminGetPassword(payload) {
  writeSheetHeaders("pengguna_db", ["role", "identifier", "password"]);
  var users = getSheetData("pengguna_db");
  var role = payload.role;
  var identifier = String(payload.identifier).toUpperCase().trim();

  var found = users.filter(function(u) {
    return String(u.role).toLowerCase() === String(role).toLowerCase() &&
           String(u.identifier).toUpperCase().trim() === identifier;
  });

  if (found.length > 0) {
    return { success: true, password: found[0].password };
  }
  return { success: false, message: "Akun tersebut belum terdaftar." };
}

function handleAdminChangePassword(payload) {
  writeSheetHeaders("pengguna_db", ["role", "identifier", "password"]);
  
  var role = payload.role;
  var identifier = String(payload.identifier).toUpperCase().trim();
  var newPassword = String(payload.newPassword);

  var rowData = {
    "role": role,
    "identifier": identifier,
    "password": newPassword
  };

  updateOrAppendRow("pengguna_db", "identifier", rowData);
  return { success: true, message: "Password berhasil diperbarui di Google Spreadsheet secara live." };
}

function handleSaveSchool(payload) {
  writeSheetHeaders("sekolah_db", ["id", "kecamatan", "nama_sekolah", "status_sekolah", "jumlah_rombel", "jumlah_siswa", "alamat_sekolah"]);
  
  var finalId = payload.id || ("ID-SCH-" + Date.now());
  var uppercaseKec = String(payload.kecamatan).toUpperCase().trim();
  var uppercaseNama = String(payload.namaSekolah).toUpperCase().trim();

  var rowData = {
    "id": finalId,
    "kecamatan": uppercaseKec,
    "nama_sekolah": uppercaseNama,
    "status_sekolah": String(payload.status_sekolah || "Negeri").trim(),
    "jumlah_rombel": Number(payload.jumlah_rombel || 0),
    "jumlah_siswa": Number(payload.jumlah_siswa || 0),
    "alamat_sekolah": String(payload.alamat_sekolah || "").trim()
  };

  updateOrAppendRow("sekolah_db", "id", rowData);

  // Add school user credentials if not exists
  writeSheetHeaders("pengguna_db", ["role", "identifier", "password"]);
  var ident = uppercaseKec + "|" + uppercaseNama;
  var users = getSheetData("pengguna_db");
  var hasUser = users.some(function(u) {
    return String(u.identifier).toUpperCase().trim() === ident.toUpperCase().trim();
  });

  if (!hasUser) {
    var userRow = {
      "role": "Sekolah",
      "identifier": ident,
      "password": "dikerja"
    };
    updateOrAppendRow("pengguna_db", "identifier", userRow);
  }

  return { success: true, message: "Data Sekolah berhasil disimpan di Google Spreadsheet secara live." };
}

function handleDeleteSchool(payload) {
  writeSheetHeaders("sekolah_db", ["id", "kecamatan", "nama_sekolah", "status_sekolah", "jumlah_rombel", "jumlah_siswa", "alamat_sekolah"]);
  var list = getSheetData("sekolah_db");
  var id = payload.id;

  var found = list.filter(function(s) {
    return String(s.id).toUpperCase().trim() === String(id).toUpperCase().trim();
  });

  if (found.length > 0) {
    var school = found[0];
    var ident = String(school.kecamatan).toUpperCase().trim() + "|" + String(school.nama_sekolah).toUpperCase().trim();
    
    deleteRowByValue("sekolah_db", "id", id);
    deleteRowByValue("pengguna_db", "identifier", ident);
    
    return { success: true, message: "Data Sekolah berhasil dihapus dari Google Spreadsheet secara live." };
  }

  return { success: false, message: "Sekolah tidak ditemukan." };
}

function handleGetInformasiList() {
  writeSheetHeaders("papan_informasi", ["id", "judul", "konten", "attachment_name", "attachment_data", "created_at"]);
  var list = getSheetData("papan_informasi");
  
  return list.map(function(d) {
    return {
      id: d.id || "",
      judul: d.judul || "",
      konten: d.konten || "",
      attachment_name: d.attachment_name || "",
      attachment_data: d.attachment_data || "",
      created_at: d.created_at || new Date().toISOString()
    };
  });
}

function handleSaveInformasi(payload) {
  writeSheetHeaders("papan_informasi", ["id", "judul", "konten", "attachment_name", "attachment_data", "created_at"]);
  
  var finalId = payload.id || ("INFO-" + Date.now());
  var rowData = {
    "id": finalId,
    "judul": String(payload.judul || "").trim(),
    "konten": String(payload.konten || "").trim(),
    "attachment_name": String(payload.attachment_name || "").trim(),
    "attachment_data": String(payload.attachment_data || "").trim(),
    "created_at": payload.created_at || new Date().toISOString()
  };

  updateOrAppendRow("papan_informasi", "id", rowData);
  return { success: true, message: "Papan Informasi berhasil disimpan di Google Spreadsheet secara live." };
}

function handleDeleteInformasi(payload) {
  var deleted = deleteRowByValue("papan_informasi", "id", payload.id);
  if (deleted) {
    return { success: true, message: "Informasi berhasil dihapus dari Google Spreadsheet secara live." };
  }
  return { success: false, message: "Informasi tidak ditemukan." };
}
