import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path to locally persisted file database
const LOCAL_DB_PATH = path.join(process.cwd(), "database_fallback.json");

// Helper to initialize local backup database
const initLocalDb = () => {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultData = {
      sekolah_db: [
        { id: "id-sek-satu", kecamatan: "KEC. BULUKUMPA", nama_sekolah: "SDN 58 TANETE" },
        { id: "id-sek-dua", kecamatan: "KEC. BULUKUMPA", nama_sekolah: "SDN 59 TANETE" }
      ],
      pengguna_db: [
        { role: "Admin Dinas", identifier: "admin", password: "ammatoa" },
        { role: "Sekolah", identifier: "KEC. BULUKUMPA|SDN 58 TANETE", password: "dikerja" },
        { role: "Sekolah", identifier: "KEC. BULUKUMPA|SDN 59 TANETE", password: "dikerja" }
      ],
      gtk_data: [
        {
          id: "ID178069900785899",
          kecamatan: "KEC. BULUKUMPA",
          sekolah: "SDN 58 TANETE",
          nama: "IRA INDIRA, S.Pd., M.Pd",
          nip: "197601152002122005",
          status_pegawai: "PNS",
          nik: "7302075501760004",
          golongan: "IV/b",
          tmt_golongan: "2023-04-01",
          jabatan: "Guru Ahli Madya",
          pendidikan: "S2",
          beban_tugas: "Guru Kelas SD",
          tmt_kepsek: "",
          sertifikasi: "Ya",
          mapel: "Guru Kelas SD",
          no_hp: "6281342685961",
          created_at: new Date().toISOString()
        }
      ]
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultData, null, 2), "utf8");
  }
};

initLocalDb();

// Read and write helpers for local DB
const readLocalDb = () => {
  try {
    initLocalDb();
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.papan_informasi) {
      parsed.papan_informasi = [
        {
          id: "INFO-1",
          judul: "Selamat Datang di SI PTK DIKBUD BULUKUMBA",
          konten: "Papan Informasi ini digunakan untuk menyampaikan pengumuman resmi dari Dinas Pendidikan dan Kebudayaan Kabupaten Bulukumba kepada seluruh Admin Sekolah.",
          attachment_name: "",
          attachment_data: "",
          created_at: new Date().toISOString()
        }
      ];
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (err) {
    console.log("Note: error reading local db file:", err);
    return { sekolah_db: [], pengguna_db: [], gtk_data: [], papan_informasi: [] };
  }
};

const writeLocalDb = (data: any) => {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.log("Note: error writing local db file:", err);
  }
};

// ==========================================
// API ENDPOINTS
// ==========================================

// Endpoint to inspect if Database is active
app.get("/api/db-status", (req, res) => {
  res.json({
    status: "fallback",
    message: "Menggunakan database lokal demo (database_fallback.json). Versi produksi terhubung langsung ke Google Spreadsheet via Google Apps Script.",
    url: "Google Spreadsheet Terintegrasi"
  });
});

// authentication endpoint
app.post("/api/login", async (req, res) => {
  const { role, identifier, password } = req.body;
  if (!role || !identifier || !password) {
    return res.status(400).json({ success: false, message: "Kredensial tidak lengkap!" });
  }

  const db = readLocalDb();
  const found = db.pengguna_db.find(
    (u: any) => u.role === role && u.identifier === identifier && String(u.password) === String(password)
  );

  if (found) {
    return res.json({ success: true, role, identifier });
  }

  return res.json({ success: false, message: "Username/Sekolah atau Password salah!" });
});

// Update password directly (School role)
app.post("/api/change-password", async (req, res) => {
  const { identifier, oldPass, newPass } = req.body;
  if (!identifier || !oldPass || !newPass) {
    return res.status(400).json({ success: false, message: "Parameter tidak lengkap." });
  }

  const db = readLocalDb();
  const index = db.pengguna_db.findIndex(
    (u: any) => u.role === "Sekolah" && u.identifier === identifier && String(u.password) === String(oldPass)
  );

  if (index !== -1) {
    db.pengguna_db[index].password = String(newPass);
    writeLocalDb(db);
    return res.json({ success: true, message: "Password berhasil diubah (Local Database)." });
  }

  return res.json({ success: false, message: "Password lama tidak sesuai!" });
});

// GetDropdownData (Kecamatan list and Sekolah list)
app.get("/api/dropdown-data", async (req, res) => {
  const db = readLocalDb();
  const rawSekolahs = db.sekolah_db.map((s: any) => ({
    id: s.id,
    kec: s.kecamatan,
    nama: s.nama_sekolah,
    status_sekolah: s.status_sekolah || "Negeri",
    jumlah_rombel: s.jumlah_rombel !== undefined ? Number(s.jumlah_rombel) : 0,
    jumlah_siswa: s.jumlah_siswa !== undefined ? Number(s.jumlah_siswa) : 0,
    alamat_sekolah: s.alamat_sekolah || ""
  }));
  const rawKecamatans = Array.from(new Set(db.sekolah_db.map((s: any) => s.kecamatan)));

  res.json({
    kecamatans: rawKecamatans.sort(),
    sekolahs: rawSekolahs.sort((a, b) => a.nama.localeCompare(b.nama))
  });
});

// Get all GTK data for tables (with dynamic analyses)
app.post("/api/gtk/list", async (req, res) => {
  const { role, identifier } = req.body;
  const db = readLocalDb();
  let list = db.gtk_data.map((d: any) => ({
    ID: d.id,
    Kecamatan: d.kecamatan,
    Sekolah: d.sekolah,
    Nama: d.nama,
    NIP: d.nip || "",
    Status_Pegawai: d.status_pegawai,
    NIK: d.nik,
    Golongan: d.golongan || "",
    TMT_Golongan_Formatted: d.tmt_golongan || "",
    TMT_KGB_Terakhir_Formatted: d.tmt_kgb_terakhir || "",
    Jabatan: d.jabatan || "",
    Pendidikan: d.pendidikan,
    Beban_Tugas: d.beban_tugas,
    TMT_Kepsek_Formatted: d.tmt_kepsek || "",
    Sertifikasi: d.sertifikasi || "Belum",
    Mapel: d.mapel || "",
    No_HP: d.no_hp
  }));

  if (role === "Sekolah" && identifier) {
    const [kec, sek] = identifier.split("|");
    list = list.filter((item: any) => item.Kecamatan === kec && item.Sekolah === sek);
  }

  // Apply analyzes for pension and promotions dynamically
  const today = new Date();
  const processedList = list.map((item, idx) => {
    let isPensiun = false;
    let isMendekatiPensiun = false;
    let telatNaikPangkat = false;

    // Promotion calculations
    if (item.TMT_Golongan_Formatted) {
      try {
        const tmtDate = new Date(item.TMT_Golongan_Formatted);
        const diffYears = (today.getTime() - tmtDate.getTime()) / (1000 * 3600 * 24 * 365.25);
        if (diffYears > 4) telatNaikPangkat = true;
      } catch (e) {}
    }

    // Pension calculation
    const nipStr = (item.NIP || "").toString().trim();
    if (nipStr.length >= 8 && (item.Status_Pegawai === "PNS" || item.Status_Pegawai.includes("PPPK"))) {
      const year = parseInt(nipStr.substring(0, 4), 10);
      const month = parseInt(nipStr.substring(4, 6), 10) - 1;
      const day = parseInt(nipStr.substring(6, 8), 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        let batasUmur = 58;
        const guruKeywords = ["Guru", "Kepala Sekolah"];
        if (guruKeywords.some(kw => item.Beban_Tugas && item.Beban_Tugas.includes(kw))) {
          batasUmur = 60;
        }

        const pensionDate = new Date(year + batasUmur, month, day);
        const timeDiff = pensionDate.getTime() - today.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff <= 0) {
          isPensiun = true;
        } else if (daysDiff <= 365) {
          isMendekatiPensiun = true;
        }
      }
    }

    let telatKgb = false;
    let akanKgb = false;
    let kgbWarningMessage = "";

    if (item.Status_Pegawai === "PNS" && item.TMT_KGB_Terakhir_Formatted) {
      try {
        const lastKgbDate = new Date(item.TMT_KGB_Terakhir_Formatted);
        if (!isNaN(lastKgbDate.getTime())) {
          const nextKgbDate = new Date(lastKgbDate);
          nextKgbDate.setFullYear(lastKgbDate.getFullYear() + 2);
          
          const timeDiff = nextKgbDate.getTime() - today.getTime();
          const daysDiff = timeDiff / (1000 * 3600 * 24);
          
          if (daysDiff < 0) {
            telatKgb = true;
            kgbWarningMessage = "Telat KGB";
          } else if (daysDiff <= 91) {
            akanKgb = true;
            const remainingMonths = Math.ceil(daysDiff / 30.415);
            if (remainingMonths > 0 && remainingMonths <= 3) {
              kgbWarningMessage = `${remainingMonths} Bulan lagi KGB`;
            } else {
              kgbWarningMessage = "Segera KGB";
            }
          }
        }
      } catch (e) {}
    }

    return {
      ...item,
      rowNumber: idx + 2,
      isPensiun,
      isMendekatiPensiun,
      telatNaikPangkat,
      telatKgb,
      akanKgb,
      kgbWarningMessage
    };
  });

  res.json(processedList);
});

// Save or Update GTK data
app.post("/api/gtk/save", async (req, res) => {
  const {
    id,
    kecamatan,
    sekolah,
    nama,
    nik,
    statusPegawai,
    nip,
    golongan,
    tmtGolongan,
    jabatan,
    pendidikan,
    bebanTugas,
    tmtKepsek,
    sertifikasi,
    mapel,
    hp,
    rowNumber,
    tmtKgbTerakhir
  } = req.body;

  if (!kecamatan || !sekolah || !nama || !nik || !statusPegawai || !pendidikan || !bebanTugas || !hp) {
    return res.status(400).json({ success: false, message: "Data wajib tidak lengkap!" });
  }

  // Format HP
  let formattedHp = String(hp).trim();
  if (formattedHp.startsWith("0")) {
    formattedHp = "62" + formattedHp.substring(1);
  }

  const finalId = id || "ID" + Date.now() + Math.floor(Math.random() * 1000);

  const cleanDateVal = (val: any) => {
    if (val === undefined || val === null) return null;
    const s = String(val).trim();
    return s === "" ? null : s;
  };

  const dbRow = {
    id: finalId,
    kecamatan,
    sekolah,
    nama,
    nip: nip || "",
    status_pegawai: statusPegawai,
    nik,
    golongan: golongan || "",
    tmt_golongan: cleanDateVal(tmtGolongan),
    jabatan: jabatan || "",
    pendidikan,
    beban_tugas: bebanTugas,
    tmt_kepsek: cleanDateVal(tmtKepsek),
    sertifikasi: sertifikasi || "Belum",
    mapel: mapel || "",
    no_hp: formattedHp,
    tmt_kgb_terakhir: cleanDateVal(tmtKgbTerakhir),
    created_at: new Date().toISOString()
  };

  const db = readLocalDb();
  const existingGtkIndex = db.gtk_data.findIndex((item: any) => item.id === finalId);

  if (existingGtkIndex !== -1) {
    db.gtk_data[existingGtkIndex] = { ...db.gtk_data[existingGtkIndex], ...dbRow };
    writeLocalDb(db);
    return res.json({ success: true, message: "Data GTK berhasil diupdate (Local Database)." });
  } else {
    if (rowNumber) {
      const indexByRowNumber = parseInt(rowNumber, 10) - 2;
      if (indexByRowNumber >= 0 && indexByRowNumber < db.gtk_data.length) {
        db.gtk_data[indexByRowNumber] = { ...db.gtk_data[indexByRowNumber], ...dbRow };
        writeLocalDb(db);
        return res.json({ success: true, message: "Data GTK berhasil diupdate (Local Database)." });
      }
    }
    db.gtk_data.push(dbRow);
    writeLocalDb(db);
    return res.json({ success: true, message: "Data GTK berhasil ditambahkan (Local Database)." });
  }
});

// Delete GTK record
app.post("/api/gtk/delete", async (req, res) => {
  const { id, rowNumber } = req.body;
  
  if (!id && !rowNumber) {
    return res.status(400).json({ success: false, message: "ID or rowNumber parameter is required." });
  }

  const db = readLocalDb();
  if (id) {
    const originalLen = db.gtk_data.length;
    db.gtk_data = db.gtk_data.filter((item: any) => item.id !== id);
    if (db.gtk_data.length < originalLen) {
      writeLocalDb(db);
      return res.json({ success: true, message: "Data GTK berhasil dihapus (Local Database)." });
    }
  }

  if (rowNumber) {
    const idx = parseInt(rowNumber, 10) - 2;
    if (idx >= 0 && idx < db.gtk_data.length) {
      db.gtk_data.splice(idx, 1);
      writeLocalDb(db);
      return res.json({ success: true, message: "Data GTK berhasil dihapus (Local Database)." });
    }
  }

  return res.json({ success: false, message: "Data GTK gagal dihapus atau tidak ditemukan." });
});

// Admin-level single account password lookup
app.post("/api/admin/get-password", async (req, res) => {
  const { role, identifier } = req.body;
  if (!role || !identifier) {
    return res.status(400).json({ success: false, message: "Parameter tidak lengkap." });
  }

  const db = readLocalDb();
  const f = db.pengguna_db.find((u: any) => u.role === role && u.identifier === identifier);
  if (f) {
    return res.json({ success: true, password: f.password });
  }

  return res.json({ success: false, message: "Akun tersebut belum terdaftar." });
});

// Admin-level change user password
app.post("/api/admin/change-password", async (req, res) => {
  const { role, identifier, newPassword } = req.body;
  if (!role || !identifier || !newPassword) {
    return res.status(400).json({ success: false, message: "Parameter tidak lengkap." });
  }

  const db = readLocalDb();
  const index = db.pengguna_db.findIndex((u: any) => u.role === role && u.identifier === identifier);
  if (index !== -1) {
    db.pengguna_db[index].password = String(newPassword);
    writeLocalDb(db);
  } else {
    db.pengguna_db.push({ role, identifier, password: String(newPassword) });
    writeLocalDb(db);
  }

  return res.json({ success: true, message: `Password berhasil diperbarui (Local Database).` });
});

// Admin-level: save or update a school record
app.post("/api/school/save", async (req, res) => {
  const { id, kecamatan, namaSekolah, status_sekolah, jumlah_rombel, alamat_sekolah, jumlah_siswa } = req.body;
  if (!kecamatan || !namaSekolah) {
    return res.status(400).json({ success: false, message: "Kecamatan dan Nama Sekolah wajib diisi." });
  }

  const uppercaseKec = String(kecamatan).toUpperCase().trim();
  const uppercaseNama = String(namaSekolah).toUpperCase().trim();
  let finalId = id || "ID-SCH-" + Date.now();

  const rawRow: any = {
    id: finalId,
    kecamatan: uppercaseKec,
    nama_sekolah: uppercaseNama
  };

  if (status_sekolah !== undefined) rawRow.status_sekolah = String(status_sekolah).trim();
  if (jumlah_rombel !== undefined) rawRow.jumlah_rombel = Number(jumlah_rombel) || 0;
  if (jumlah_siswa !== undefined) rawRow.jumlah_siswa = Number(jumlah_siswa) || 0;
  if (alamat_sekolah !== undefined) rawRow.alamat_sekolah = String(alamat_sekolah).trim();

  const dbRow = {
    role: "Sekolah",
    identifier: `${rawRow.kecamatan}|${rawRow.nama_sekolah}`,
    password: "dikerja"
  };

  const db = readLocalDb();
  let matchIndex = db.sekolah_db.findIndex((s: any) => s.id === finalId);

  if (matchIndex === -1) {
    matchIndex = db.sekolah_db.findIndex(
      (s: any) => s.kecamatan.toUpperCase().trim() === uppercaseKec &&
                  s.nama_sekolah.toUpperCase().trim() === uppercaseNama
    );
  }

  if (matchIndex !== -1) {
    db.sekolah_db[matchIndex] = {
      ...db.sekolah_db[matchIndex],
      ...rawRow
    };
  } else {
    db.sekolah_db.push(rawRow);
  }

  const credentialExist = db.pengguna_db.some((u: any) => u.identifier === dbRow.identifier);
  if (!credentialExist) {
    db.pengguna_db.push(dbRow);
  }

  writeLocalDb(db);
  return res.json({ success: true, message: "Data sekolah berhasil disimpan (Local Database)." });
});

// Admin-level: delete a school record
app.post("/api/school/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID sekolah dibutuhkan." });
  }

  const db = readLocalDb();
  const matched = db.sekolah_db.find((s: any) => s.id === id);
  if (matched) {
    const identifier = `${matched.kecamatan}|${matched.nama_sekolah}`;
    db.sekolah_db = db.sekolah_db.filter((s: any) => s.id !== id);
    db.pengguna_db = db.pengguna_db.filter((u: any) => u.identifier !== identifier);
    writeLocalDb(db);
    return res.json({ success: true, message: "Data sekolah berhasil dihapus (Local Database)." });
  }

  return res.json({ success: false, message: "Sekolah tidak ditemukan." });
});

// ==========================================
// PAPAN INFORMASI & EDARAN API ENDPOINTS
// ==========================================

// 1. Get Papan Informasi List
app.get("/api/informasi/list", async (req, res) => {
  const db = readLocalDb();
  const list = db.papan_informasi || [];
  list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(list);
});

// 2. Drive upload (Mock)
app.post("/api/drive/upload", async (req, res) => {
  const { name, data } = req.body;
  if (!name || !data) {
    return res.status(400).json({ success: false, message: "Nama dan data berkas wajib ada!" });
  }
  return res.json({ success: true, url: data });
});

// 3. Save/Update Papan Informasi
app.post("/api/informasi/save", async (req, res) => {
  const { id, judul, konten, attachment_name, attachment_data, created_at } = req.body;

  if (!judul || !konten) {
    return res.status(400).json({ success: false, message: "Judul dan konten wajib diisi!" });
  }

  const finalId = id || "INFO-" + Date.now();
  const dbRow = {
    id: finalId,
    judul,
    konten,
    attachment_name: attachment_name || "",
    attachment_data: attachment_data || "",
    created_at: created_at || new Date().toISOString()
  };

  const db = readLocalDb();
  if (!db.papan_informasi) db.papan_informasi = [];
  const existingIdx = db.papan_informasi.findIndex((item: any) => item.id === finalId);

  if (existingIdx !== -1) {
    db.papan_informasi[existingIdx] = { ...db.papan_informasi[existingIdx], ...dbRow };
    writeLocalDb(db);
    return res.json({ success: true, message: "Informasi berhasil diupdate (Local Database)." });
  } else {
    db.papan_informasi.push(dbRow);
    writeLocalDb(db);
    return res.json({ success: true, message: "Informasi berhasil ditambahkan (Local Database)." });
  }
});

// 4. Delete Papan Informasi
app.post("/api/informasi/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID informasi dibutuhkan." });
  }

  const db = readLocalDb();
  if (!db.papan_informasi) db.papan_informasi = [];
  const originalLen = db.papan_informasi.length;
  db.papan_informasi = db.papan_informasi.filter((item: any) => item.id !== id);

  if (db.papan_informasi.length < originalLen) {
    writeLocalDb(db);
    return res.json({ success: true, message: "Informasi berhasil dihapus (Local Database)." });
  }

  return res.json({ success: false, message: "Informasi gagal dihapus atau tidak ditemukan." });
});

// Download Page.html directly
app.get("/download-page", (req, res) => {
  const filePath = path.join(process.cwd(), "Page.html");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", "attachment; filename=Page.html");
    return res.sendFile(filePath);
  } else {
    const distPath = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distPath)) {
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", "attachment; filename=Page.html");
      return res.sendFile(distPath);
    }
  }
  return res.status(404).send("File Page.html tidak ditemukan. Silakan run 'npm run build' terlebih dahulu.");
});

// ==========================================
// VITE DEV MIDDLEWARE / STATIC FILES
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
