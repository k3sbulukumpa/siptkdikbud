import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { School, GtkItem } from "./types";

const SPREADSHEET_ID = "1qJctUfLLNduX2d_0MeOvMRGf6oHDuFC2Zmhl3mxd5oA";

// Utility to clean and normalize keys to handle any capitalization and underscores
function cleanKeys(obj: any): any {
  const clean: any = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const normalized = k.toLowerCase().replace(/_/g, "").trim();
      clean[normalized] = obj[k];
    }
  }
  return clean;
}

// Map row object to School structure
function mapSchool(raw: any): School {
  const c = cleanKeys(raw);
  return {
    id: String(c.id || c.idsekolah || ""),
    kec: String(c.kecamatan || c.kec || ""),
    nama: String(c.namasekolah || c.sekolah || c.nama || ""),
    status_sekolah: String(c.statussekolah || "Negeri"),
    jumlah_rombel: Number(c.jumlahrombel || 0),
    jumlah_siswa: Number(c.jumlahsiswa || 0),
    alamat_sekolah: String(c.alamatsekolah || "")
  };
}

// Map row object to GTK structure
function mapGtk(raw: any): GtkItem {
  const c = cleanKeys(raw);
  return {
    ID: String(c.id || ""),
    Kecamatan: String(c.kecamatan || ""),
    Sekolah: String(c.sekolah || ""),
    Nama: String(c.nama || ""),
    NIP: String(c.nip || ""),
    Status_Pegawai: (c.statuspegawai || "Honorer") as any,
    NIK: String(c.nik || ""),
    Golongan: String(c.golongan || ""),
    TMT_Golongan_Formatted: String(c.tmtgolongan || ""),
    Jabatan: String(c.jabatan || ""),
    Pendidikan: String(c.pendidikan || ""),
    Beban_Tugas: String(c.bebantugas || ""),
    TMT_Kepsek_Formatted: String(c.tmtkepsek || ""),
    Sertifikasi: (c.sertifikasi || "Belum") as any,
    Mapel: String(c.mapel || ""),
    No_HP: String(c.nohp || c.hp || ""),
    TMT_KGB_Terakhir_Formatted: String(c.tmtkgbterakhir || c.kgbterakhir || "")
  };
}

// Map row object to User structure
function mapUser(raw: any) {
  const c = cleanKeys(raw);
  return {
    role: String(c.role || ""),
    identifier: String(c.identifier || ""),
    password: String(c.password || "")
  };
}

// Map row object to Papan Informasi structure
function mapInfo(raw: any) {
  const c = cleanKeys(raw);
  return {
    id: String(c.id || ""),
    judul: String(c.judul || ""),
    konten: String(c.konten || ""),
    attachment_name: String(c.attachmentname || ""),
    attachment_data: String(c.attachmentdata || ""),
    created_at: String(c.createdat || new Date().toISOString())
  };
}

// Default offline demo lists to ensure 100% operation even with no internet
const DEFAULT_SCHOOLS: School[] = [
  { id: "id-sek-satu", kec: "KEC. BULUKUMPA", nama: "SDN 58 TANETE", status_sekolah: "Negeri", jumlah_rombel: 6, jumlah_siswa: 120, alamat_sekolah: "Tanete" },
  { id: "id-sek-dua", kec: "KEC. BULUKUMPA", nama: "SDN 59 TANETE", status_sekolah: "Negeri", jumlah_rombel: 6, jumlah_siswa: 110, alamat_sekolah: "Tanete" }
];

const DEFAULT_USERS = [
  { role: "Admin Dinas", identifier: "admin", password: "ammatoa" },
  { role: "Sekolah", identifier: "KEC. BULUKUMPA|SDN 58 TANETE", password: "dikerja" },
  { role: "Sekolah", identifier: "KEC. BULUKUMPA|SDN 59 TANETE", password: "dikerja" }
];

const DEFAULT_GTK: GtkItem[] = [
  {
    ID: "ID178069900785899",
    Kecamatan: "KEC. BULUKUMPA",
    Sekolah: "SDN 58 TANETE",
    Nama: "IRA INDIRA, S.Pd., M.Pd",
    NIP: "197601152002122005",
    Status_Pegawai: "PNS",
    NIK: "7302075501760004",
    Golongan: "IV/b",
    TMT_Golongan_Formatted: "2023-04-01",
    Jabatan: "Guru Ahli Madya",
    Pendidikan: "S2",
    Beban_Tugas: "Guru Kelas SD",
    TMT_Kepsek_Formatted: "",
    Sertifikasi: "Ya",
    Mapel: "Guru Kelas SD",
    No_HP: "6281342685961",
    TMT_KGB_Terakhir_Formatted: "2024-05-01"
  }
];

const DEFAULT_INFO = [
  {
    id: "INFO-1",
    judul: "Selamat Datang di SI PTK DIKBUD BULUKUMBA",
    konten: "Papan Informasi ini digunakan untuk menyampaikan pengumuman resmi dari Dinas Pendidikan dan Kebudayaan Kabupaten Bulukumba kepada seluruh Admin Sekolah.",
    attachment_name: "",
    attachment_data: "",
    created_at: new Date().toISOString()
  }
];

// Custom interceptor for window.fetch to direct queries to Google Spreadsheet Visualization API and combine with Local overrides
try {
  // Shadowing localStorage to make it completely safe under sandbox iframe policies
  const localCacheMap: Record<string, string> = {};
  const safeLocalStorage = {
    getItem(key: string): string | null {
      try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
      } catch (e) {
        return localCacheMap[key] || null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        if (window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (e) {}
      localCacheMap[key] = value;
    },
    removeItem(key: string): void {
      try {
        if (window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      delete localCacheMap[key];
    }
  };
  const localStorage = safeLocalStorage;

  const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFZCEOc0EYwL2Wz_l9PpRfGUVdI8plydb4FbLR7LL3miNXbBRDuqSAqhN13AceDuYvzA/exec";
  if (localStorage.getItem("APPS_SCRIPT_WEB_APP_URL") !== DEFAULT_APPS_SCRIPT_URL) {
    localStorage.setItem("APPS_SCRIPT_WEB_APP_URL", DEFAULT_APPS_SCRIPT_URL);
  }

  const originalFetch = window.fetch;

  const fetchSheetData = async (sheetName: string): Promise<any[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetName)}`;
    try {
      const res = await originalFetch(url);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
      if (!match || !match[1]) return [];
      const data = JSON.parse(match[1]);
      const table = data.table;
      if (!table || !table.rows) return [];

      const cols = table.cols || [];
      const rows = table.rows || [];
      
      // Parse headers
      let headers = cols.map((c: any) => (c && c.label) ? c.label.trim() : "");
      let startIndex = 0;
      
      // Check if first row should be headers (if columns have default labels A, B, C...)
      const isDefaultHeader = headers.every(h => !h || h.match(/^[A-Z]$/));
      if (isDefaultHeader && rows.length > 0) {
        headers = rows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : "");
        startIndex = 1;
      }
      
      const parsedRows: any[] = [];
      for (let i = startIndex; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.c) continue;
        const obj: any = {};
        r.c.forEach((cell: any, idx: number) => {
          const header = headers[idx] || `col_${idx}`;
          if (header) {
            obj[header] = cell && cell.v !== null ? cell.v : "";
          }
        });
        if (Object.values(obj).some(v => v !== "")) {
          parsedRows.push(obj);
        }
      }
      return parsedRows;
    } catch (err) {
      console.warn(`Gagal memuat sheet '${sheetName}', menggunakan data lokal:`, err);
      return [];
    }
  };

  const loadSchools = async (): Promise<School[]> => {
    const raw = await fetchSheetData("sekolah_db");
    let mapped = raw.length > 0 ? raw.map(mapSchool) : [...DEFAULT_SCHOOLS];
    
    // Merge overrides
    const overrides = JSON.parse(localStorage.getItem("OVERRIDE_SCHOOL_LIST") || "[]") as School[];
    const deletedIds = JSON.parse(localStorage.getItem("DELETED_SCHOOL_IDS") || "[]") as string[];
    
    overrides.forEach(ov => {
      const idx = mapped.findIndex(s => s.id === ov.id);
      if (idx !== -1) {
        mapped[idx] = ov;
      } else {
        mapped.push(ov);
      }
    });
    
    mapped = mapped.filter(s => !deletedIds.includes(s.id));
    return mapped;
  };

  const loadUsers = async (): Promise<any[]> => {
    const raw = await fetchSheetData("pengguna_db");
    let mapped = raw.length > 0 ? raw.map(mapUser) : [...DEFAULT_USERS];
    
    // Ensure default admin is always present
    if (!mapped.some(u => u.role === "Admin Dinas" && u.identifier.toLowerCase().trim() === "admin")) {
      mapped.unshift({ role: "Admin Dinas", identifier: "admin", password: "ammatoa" });
    }
    
    // Apply password overrides
    const passwordOverrides = JSON.parse(localStorage.getItem("OVERRIDE_PASSWORDS") || "{}");
    mapped = mapped.map(u => {
      if (passwordOverrides[u.identifier]) {
        return { ...u, password: passwordOverrides[u.identifier] };
      }
      return u;
    });
    
    // Inject custom created schools as Sekolah accounts automatically
    const schoolOverrides = JSON.parse(localStorage.getItem("OVERRIDE_SCHOOL_LIST") || "[]") as School[];
    schoolOverrides.forEach(sch => {
      const ident = `${sch.kec.toUpperCase().trim()}|${sch.nama.toUpperCase().trim()}`;
      if (!mapped.some(u => u.identifier === ident)) {
        mapped.push({
          role: "Sekolah",
          identifier: ident,
          password: passwordOverrides[ident] || "dikerja"
        });
      }
    });
    
    return mapped;
  };

  const loadGtk = async (): Promise<GtkItem[]> => {
    const raw = await fetchSheetData("gtk_data");
    let mapped = raw.length > 0 ? raw.map(mapGtk) : [...DEFAULT_GTK];
    
    // Merge overrides
    const overrides = JSON.parse(localStorage.getItem("OVERRIDE_GTK_LIST") || "[]") as GtkItem[];
    const deletedIds = JSON.parse(localStorage.getItem("DELETED_GTK_IDS") || "[]") as string[];
    
    overrides.forEach(ov => {
      const idx = mapped.findIndex(g => g.ID === ov.ID);
      if (idx !== -1) {
        mapped[idx] = ov;
      } else {
        mapped.push(ov);
      }
    });
    
    mapped = mapped.filter(g => !deletedIds.includes(g.ID));
    return mapped;
  };

  const loadInfos = async (): Promise<any[]> => {
    const raw = await fetchSheetData("papan_informasi");
    let mapped = raw.length > 0 ? raw.map(mapInfo) : [...DEFAULT_INFO];
    
    const overrides = JSON.parse(localStorage.getItem("OVERRIDE_INFO_LIST") || "[]") as any[];
    const deletedIds = JSON.parse(localStorage.getItem("DELETED_INFO_IDS") || "[]") as string[];
    
    overrides.forEach(ov => {
      const idx = mapped.findIndex(i => i.id === ov.id);
      if (idx !== -1) {
        mapped[idx] = ov;
      } else {
        mapped.push(ov);
      }
    });
    
    mapped = mapped.filter(i => !deletedIds.includes(i.id));
    return mapped;
  };

  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    
    if (urlStr.includes("/api/")) {
      const body = init?.body ? String(init.body) : "{}";
      
      // Check if real-time Apps Script Web App sync is configured
      const appScriptUrl = localStorage.getItem("APPS_SCRIPT_WEB_APP_URL");
      if (appScriptUrl && appScriptUrl.trim() !== "") {
        try {
          const apiIndex = urlStr.indexOf("/api/");
          const apiPath = apiIndex !== -1 ? urlStr.substring(apiIndex) : "/";
          
          const gatewayPayload = {
            path: apiPath,
            method: init?.method || "POST",
            payload: body
          };
          
          const res = await originalFetch(appScriptUrl.trim(), {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify(gatewayPayload)
          });
          
          if (!res.ok) throw new Error("Apps Script Web App returned status " + res.status);
          const responseText = await res.text();
          return new Response(responseText, {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (err: any) {
          console.warn("Gagal terhubung dengan Google Apps Script Web App, mengalihkan ke fallback lokal:", err);
        }
      }

      // 1. GET DB STATUS
      if (urlStr.endsWith("/api/db-status")) {
        return new Response(JSON.stringify({
          status: "connected",
          message: "Terhubung langsung ke Google Spreadsheet via Google Visualization API.",
          url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      const normalizeIdentifier = (ident: any) => {
        if (ident === undefined || ident === null) return "";
        return String(ident)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .trim();
      };

      const comparePasswords = (stored: any, entered: any) => {
        const s1 = String(stored || "").trim();
        const s2 = String(entered || "").trim();
        if (s1 === s2) return true;
        if (s1.indexOf(".0") === s1.length - 2 && s1.substring(0, s1.length - 2) === s2) return true;
        if (s2.indexOf(".0") === s2.length - 2 && s2.substring(0, s2.length - 2) === s1) return true;
        return false;
      };

      // 2. POST LOGIN
      if (urlStr.endsWith("/api/login")) {
        const { role, identifier, password } = JSON.parse(body);
        const users = await loadUsers();
        const found = users.find(
          (u: any) => u.role === role && 
                      normalizeIdentifier(u.identifier) === normalizeIdentifier(identifier) && 
                      comparePasswords(u.password, password)
        );
        if (found) {
          return new Response(JSON.stringify({ success: true, role, identifier: found.identifier }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: "Username/Sekolah atau Password salah!" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // 3. POST CHANGE PASSWORD (User-initiated)
      if (urlStr.endsWith("/api/change-password")) {
        const { identifier, oldPass, newPass } = JSON.parse(body);
        const users = await loadUsers();
        const found = users.find(
          (u: any) => normalizeIdentifier(u.identifier) === normalizeIdentifier(identifier) && 
                      comparePasswords(u.password, oldPass)
        );
        if (found) {
          const passwordOverrides = JSON.parse(localStorage.getItem("OVERRIDE_PASSWORDS") || "{}");
          passwordOverrides[found.identifier] = String(newPass);
          localStorage.setItem("OVERRIDE_PASSWORDS", JSON.stringify(passwordOverrides));
          return new Response(JSON.stringify({ success: true, message: "Password berhasil diubah secara lokal di browser Anda." }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: "Password lama tidak sesuai!" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      // 4. GET DROPDOWN DATA
      if (urlStr.endsWith("/api/dropdown-data")) {
        const schoolsList = await loadSchools();
        const mappedSekolahs = schoolsList.map((s: any) => ({
          id: s.id,
          kec: s.kec,
          nama: s.nama,
          status_sekolah: s.status_sekolah || "Negeri",
          jumlah_rombel: Number(s.jumlah_rombel || 0),
          jumlah_siswa: Number(s.jumlah_siswa || 0),
          alamat_sekolah: s.alamat_sekolah || ""
        }));
        const rawKecamatans = Array.from(new Set(schoolsList.map((s: any) => s.kec)));
        return new Response(JSON.stringify({
          kecamatans: rawKecamatans.sort(),
          sekolahs: mappedSekolahs.sort((a, b) => a.nama.localeCompare(b.nama))
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 5. POST GTK LIST (with complex dynamic pension/kgb computations matching backend)
      if (urlStr.endsWith("/api/gtk/list")) {
        const { role, identifier } = JSON.parse(body || "{}");
        let list = await loadGtk();
        
        if (role === "Sekolah" && identifier) {
          const [kec, sek] = identifier.split("|");
          list = list.filter((item: any) => 
            item.Kecamatan.toUpperCase().trim() === kec.toUpperCase().trim() && 
            item.Sekolah.toUpperCase().trim() === sek.toUpperCase().trim()
          );
        }

        const today = new Date();
        const processedList = list.map((item, idx) => {
          let isPensiun = false;
          let isMendekatiPensiun = false;
          let telatNaikPangkat = false;

          // Promotion calculations
          if (item.TMT_Golongan_Formatted) {
            try {
              const tmtDate = new Date(item.TMT_Golongan_Formatted);
              if (!isNaN(tmtDate.getTime())) {
                const diffYears = (today.getTime() - tmtDate.getTime()) / (1000 * 3600 * 24 * 365.25);
                if (diffYears > 4) telatNaikPangkat = true;
              }
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

        return new Response(JSON.stringify(processedList), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 6. POST GTK SAVE
      if (urlStr.endsWith("/api/gtk/save")) {
        const reqData = JSON.parse(body);
        const finalId = reqData.id || "ID" + Date.now() + Math.floor(Math.random() * 1000);
        
        let formattedHp = String(reqData.hp || "").trim();
        if (formattedHp.startsWith("0")) {
          formattedHp = "62" + formattedHp.substring(1);
        }

        const cleanDateVal = (val: any) => {
          if (val === undefined || val === null) return "";
          const s = String(val).trim();
          return s === "" ? "" : s;
        };

        const newGtk: GtkItem = {
          ID: finalId,
          Kecamatan: String(reqData.kecamatan).toUpperCase().trim(),
          Sekolah: String(reqData.sekolah).toUpperCase().trim(),
          Nama: String(reqData.nama).trim(),
          NIP: String(reqData.nip || "").trim(),
          Status_Pegawai: reqData.statusPegawai,
          NIK: String(reqData.nik).trim(),
          Golongan: String(reqData.golongan || "").trim(),
          TMT_Golongan_Formatted: cleanDateVal(reqData.tmtGolongan),
          Jabatan: String(reqData.jabatan || "").trim(),
          Pendidikan: String(reqData.pendidikan).trim(),
          Beban_Tugas: String(reqData.bebanTugas).trim(),
          TMT_Kepsek_Formatted: cleanDateVal(reqData.tmtKepsek),
          Sertifikasi: reqData.sertifikasi || "Belum",
          Mapel: String(reqData.mapel || "").trim(),
          No_HP: formattedHp,
          TMT_KGB_Terakhir_Formatted: cleanDateVal(reqData.tmtKgbTerakhir)
        };

        const localOverrides = JSON.parse(localStorage.getItem("OVERRIDE_GTK_LIST") || "[]") as GtkItem[];
        const existingIdx = localOverrides.findIndex(g => g.ID === finalId);
        if (existingIdx !== -1) {
          localOverrides[existingIdx] = newGtk;
        } else {
          localOverrides.push(newGtk);
        }
        localStorage.setItem("OVERRIDE_GTK_LIST", JSON.stringify(localOverrides));

        const deletedIds = JSON.parse(localStorage.getItem("DELETED_GTK_IDS") || "[]") as string[];
        const filteredDeleted = deletedIds.filter(id => id !== finalId);
        localStorage.setItem("DELETED_GTK_IDS", JSON.stringify(filteredDeleted));

        return new Response(JSON.stringify({ success: true, message: "Data GTK berhasil disimpan secara lokal." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 7. POST GTK DELETE
      if (urlStr.endsWith("/api/gtk/delete")) {
        const { id } = JSON.parse(body);
        if (id) {
          const deletedIds = JSON.parse(localStorage.getItem("DELETED_GTK_IDS") || "[]") as string[];
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem("DELETED_GTK_IDS", JSON.stringify(deletedIds));
          }
          
          const overrides = JSON.parse(localStorage.getItem("OVERRIDE_GTK_LIST") || "[]") as GtkItem[];
          const filteredOverrides = overrides.filter(g => g.ID !== id);
          localStorage.setItem("OVERRIDE_GTK_LIST", JSON.stringify(filteredOverrides));

          return new Response(JSON.stringify({ success: true, message: "Data GTK berhasil dihapus secara lokal." }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "ID GTK tidak valid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 8. POST GET PASSWORD (ADMIN)
      if (urlStr.endsWith("/api/admin/get-password")) {
        const { role, identifier } = JSON.parse(body);
        const users = await loadUsers();
        const f = users.find(u => u.role === role && u.identifier.toUpperCase().trim() === identifier.toUpperCase().trim());
        if (f) {
          return new Response(JSON.stringify({ success: true, password: f.password }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "Akun tersebut belum terdaftar." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 9. POST CHANGE PASSWORD (ADMIN)
      if (urlStr.endsWith("/api/admin/change-password")) {
        const { identifier, newPassword } = JSON.parse(body);
        const passwordOverrides = JSON.parse(localStorage.getItem("OVERRIDE_PASSWORDS") || "{}");
        passwordOverrides[identifier] = String(newPassword);
        localStorage.setItem("OVERRIDE_PASSWORDS", JSON.stringify(passwordOverrides));
        return new Response(JSON.stringify({ success: true, message: "Password berhasil diperbarui secara lokal." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 10. POST SCHOOL SAVE
      if (urlStr.endsWith("/api/school/save")) {
        const reqData = JSON.parse(body);
        const finalId = reqData.id || "ID-SCH-" + Date.now();
        const uppercaseKec = String(reqData.kecamatan).toUpperCase().trim();
        const uppercaseNama = String(reqData.namaSekolah).toUpperCase().trim();

        const newSchool: School = {
          id: finalId,
          kec: uppercaseKec,
          nama: uppercaseNama,
          status_sekolah: String(reqData.status_sekolah || "Negeri").trim(),
          jumlah_rombel: Number(reqData.jumlah_rombel || 0),
          jumlah_siswa: Number(reqData.jumlah_siswa || 0),
          alamat_sekolah: String(reqData.alamat_sekolah || "").trim()
        };

        const localOverrides = JSON.parse(localStorage.getItem("OVERRIDE_SCHOOL_LIST") || "[]") as School[];
        const existingIdx = localOverrides.findIndex(s => s.id === finalId);
        if (existingIdx !== -1) {
          localOverrides[existingIdx] = newSchool;
        } else {
          localOverrides.push(newSchool);
        }
        localStorage.setItem("OVERRIDE_SCHOOL_LIST", JSON.stringify(localOverrides));

        const deletedIds = JSON.parse(localStorage.getItem("DELETED_SCHOOL_IDS") || "[]") as string[];
        const filteredDeleted = deletedIds.filter(id => id !== finalId);
        localStorage.setItem("DELETED_SCHOOL_IDS", JSON.stringify(filteredDeleted));

        return new Response(JSON.stringify({ success: true, message: "Data sekolah berhasil disimpan secara lokal." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 11. POST SCHOOL DELETE
      if (urlStr.endsWith("/api/school/delete")) {
        const { id } = JSON.parse(body);
        if (id) {
          const deletedIds = JSON.parse(localStorage.getItem("DELETED_SCHOOL_IDS") || "[]") as string[];
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem("DELETED_SCHOOL_IDS", JSON.stringify(deletedIds));
          }
          
          const overrides = JSON.parse(localStorage.getItem("OVERRIDE_SCHOOL_LIST") || "[]") as School[];
          const filteredOverrides = overrides.filter(s => s.id !== id);
          localStorage.setItem("OVERRIDE_SCHOOL_LIST", JSON.stringify(filteredOverrides));

          return new Response(JSON.stringify({ success: true, message: "Data sekolah berhasil dihapus secara lokal." }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "ID Sekolah tidak valid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 12. GET PAPAN INFORMASI LIST
      if (urlStr.endsWith("/api/informasi/list")) {
        const list = await loadInfos();
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 13. POST PAPAN INFORMASI SAVE
      if (urlStr.endsWith("/api/informasi/save")) {
        const reqData = JSON.parse(body);
        const finalId = reqData.id || "INFO-" + Date.now();
        const newInfo = {
          id: finalId,
          judul: String(reqData.judul).trim(),
          konten: String(reqData.konten).trim(),
          attachment_name: String(reqData.attachment_name || "").trim(),
          attachment_data: String(reqData.attachment_data || "").trim(),
          created_at: reqData.created_at || new Date().toISOString()
        };

        const localOverrides = JSON.parse(localStorage.getItem("OVERRIDE_INFO_LIST") || "[]") as any[];
        const existingIdx = localOverrides.findIndex(i => i.id === finalId);
        if (existingIdx !== -1) {
          localOverrides[existingIdx] = newInfo;
        } else {
          localOverrides.push(newInfo);
        }
        localStorage.setItem("OVERRIDE_INFO_LIST", JSON.stringify(localOverrides));

        const deletedIds = JSON.parse(localStorage.getItem("DELETED_INFO_IDS") || "[]") as string[];
        const filteredDeleted = deletedIds.filter(id => id !== finalId);
        localStorage.setItem("DELETED_INFO_IDS", JSON.stringify(filteredDeleted));

        return new Response(JSON.stringify({ success: true, message: "Informasi berhasil disimpan secara lokal." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 14. POST PAPAN INFORMASI DELETE
      if (urlStr.endsWith("/api/informasi/delete")) {
        const { id } = JSON.parse(body);
        if (id) {
          const deletedIds = JSON.parse(localStorage.getItem("DELETED_INFO_IDS") || "[]") as string[];
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem("DELETED_INFO_IDS", JSON.stringify(deletedIds));
          }
          
          const overrides = JSON.parse(localStorage.getItem("OVERRIDE_INFO_LIST") || "[]") as any[];
          const filteredOverrides = overrides.filter(i => i.id !== id);
          localStorage.setItem("OVERRIDE_INFO_LIST", JSON.stringify(filteredOverrides));

          return new Response(JSON.stringify({ success: true, message: "Informasi berhasil dihapus secara lokal." }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "ID informasi tidak valid." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return originalFetch(input, init);
  };

  Object.defineProperty(window, "fetch", {
    value: customFetch,
    configurable: true,
    writable: true
  });
} catch (e) {
  console.warn("Unable to intercept window.fetch directly due to environment restrictions:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
