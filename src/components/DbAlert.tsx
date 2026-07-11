import React, { useState, useRef } from "react";
import { DbStatus } from "../types";
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Info, 
  Globe 
} from "lucide-react";

const SPREADSHEET_ID = "1qJctUfLLNduX2d_0MeOvMRGf6oHDuFC2Zmhl3mxd5oA";

interface DbAlertProps {
  status: DbStatus | null;
  onRefresh: () => void;
}

export const DbAlert: React.FC<DbAlertProps> = ({ status, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [appScriptUrl, setAppScriptUrl] = useState(() => localStorage.getItem("APPS_SCRIPT_WEB_APP_URL") || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveAppScriptUrl = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const trimmedUrl = appScriptUrl.trim();
      if (!trimmedUrl) {
        localStorage.removeItem("APPS_SCRIPT_WEB_APP_URL");
        setTestResult({ success: true, message: "Koneksi dinonaktifkan. Aplikasi kembali menggunakan database penyimpanan lokal." });
        alert("Koneksi dinonaktifkan. Aplikasi kembali menggunakan database penyimpanan lokal.");
        window.location.reload();
        return;
      }

      if (!trimmedUrl.startsWith("https://script.google.com/")) {
        throw new Error("URL tidak valid. Harus dimulai dengan 'https://script.google.com/macros/s/.../exec'");
      }

      // Test request to check if Web App URL is valid and reachable
      const testUrl = trimmedUrl.includes("?") ? `${trimmedUrl}&path=/api/db-status` : `${trimmedUrl}?path=/api/db-status`;
      
      const res = await window.fetch(testUrl, { method: "GET" });
      if (!res.ok) throw new Error("HTTP Status " + res.status);
      const data = await res.json();
      
      if (data && data.success) {
        localStorage.setItem("APPS_SCRIPT_WEB_APP_URL", trimmedUrl);
        setTestResult({ success: true, message: "Koneksi berhasil! Semua operasi CRUD (tambah, edit, hapus) kini terhubung langsung secara real-time ke Google Spreadsheet Anda." });
        alert("Koneksi ke Google Spreadsheet berhasil terhubung secara real-time!");
        window.location.reload();
      } else {
        throw new Error(data?.message || "Format respon dari Google Apps Script tidak valid.");
      }
    } catch (err: any) {
      setTestResult({ success: false, message: "Koneksi gagal: " + err.message + ". Pastikan Anda telah men-deploy Apps Script sebagai Aplikasi Web dan mengizinkan akses 'Siapa Saja' (Anyone)." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        OVERRIDE_GTK_LIST: JSON.parse(localStorage.getItem("OVERRIDE_GTK_LIST") || "[]"),
        DELETED_GTK_IDS: JSON.parse(localStorage.getItem("DELETED_GTK_IDS") || "[]"),
        OVERRIDE_SCHOOL_LIST: JSON.parse(localStorage.getItem("OVERRIDE_SCHOOL_LIST") || "[]"),
        DELETED_SCHOOL_IDS: JSON.parse(localStorage.getItem("DELETED_SCHOOL_IDS") || "[]"),
        OVERRIDE_PASSWORDS: JSON.parse(localStorage.getItem("OVERRIDE_PASSWORDS") || "{}"),
        OVERRIDE_INFO_LIST: JSON.parse(localStorage.getItem("OVERRIDE_INFO_LIST") || "[]"),
        DELETED_INFO_IDS: JSON.parse(localStorage.getItem("DELETED_INFO_IDS") || "[]"),
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_si_ptk_bulukumba_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal melakukan ekspor backup: " + err.message);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);

        if (parsed.OVERRIDE_GTK_LIST !== undefined) {
          localStorage.setItem("OVERRIDE_GTK_LIST", JSON.stringify(parsed.OVERRIDE_GTK_LIST));
        }
        if (parsed.DELETED_GTK_IDS !== undefined) {
          localStorage.setItem("DELETED_GTK_IDS", JSON.stringify(parsed.DELETED_GTK_IDS));
        }
        if (parsed.OVERRIDE_SCHOOL_LIST !== undefined) {
          localStorage.setItem("OVERRIDE_SCHOOL_LIST", JSON.stringify(parsed.OVERRIDE_SCHOOL_LIST));
        }
        if (parsed.DELETED_SCHOOL_IDS !== undefined) {
          localStorage.setItem("DELETED_SCHOOL_IDS", JSON.stringify(parsed.DELETED_SCHOOL_IDS));
        }
        if (parsed.OVERRIDE_PASSWORDS !== undefined) {
          localStorage.setItem("OVERRIDE_PASSWORDS", JSON.stringify(parsed.OVERRIDE_PASSWORDS));
        }
        if (parsed.OVERRIDE_INFO_LIST !== undefined) {
          localStorage.setItem("OVERRIDE_INFO_LIST", JSON.stringify(parsed.OVERRIDE_INFO_LIST));
        }
        if (parsed.DELETED_INFO_IDS !== undefined) {
          localStorage.setItem("DELETED_INFO_IDS", JSON.stringify(parsed.DELETED_INFO_IDS));
        }

        alert("Database backup berhasil diimpor! Halaman akan dimuat ulang.");
        window.location.reload();
      } catch (err: any) {
        alert("Gagal memproses file backup. Pastikan format file JSON valid. Error: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm("Apakah Anda yakin ingin mereset semua perubahan lokal? Tindakan ini akan menghapus semua data yang ditambahkan/diedit secara lokal dan mengembalikan data asli secara live dari Google Spreadsheet.")) {
      localStorage.removeItem("OVERRIDE_GTK_LIST");
      localStorage.removeItem("DELETED_GTK_IDS");
      localStorage.removeItem("OVERRIDE_SCHOOL_LIST");
      localStorage.removeItem("DELETED_SCHOOL_IDS");
      localStorage.removeItem("OVERRIDE_PASSWORDS");
      localStorage.removeItem("OVERRIDE_INFO_LIST");
      localStorage.removeItem("DELETED_INFO_IDS");
      alert("Semua modifikasi lokal dibersihkan! Memuat ulang data asli...");
      window.location.reload();
    }
  };

  const isAppsScriptConnected = !!localStorage.getItem("APPS_SCRIPT_WEB_APP_URL");

  return (
    <div className={`border-b px-4 py-3 shadow-sm transition-colors duration-300 ${
      isAppsScriptConnected 
        ? "bg-emerald-950/45 border-emerald-500/20 text-emerald-300" 
        : "bg-blue-950/20 border-blue-500/10 text-blue-300"
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs font-semibold">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${isAppsScriptConnected ? "text-emerald-400" : "text-blue-400"}`} />
            <span className={`font-extrabold uppercase tracking-wide text-[10px] px-2 py-0.5 rounded bg-black/40 flex items-center gap-1 ${
              isAppsScriptConnected ? "text-emerald-400" : "text-blue-400"
            }`}>
              <Globe className="h-3 w-3 animate-pulse" />
              <span>{isAppsScriptConnected ? "REAL-TIME SYNC AKTIF" : "READ-ONLY SPREADSHEET"}</span>
            </span>
          </div>
          <div>
            <span className="text-zinc-300 font-medium">
              {isAppsScriptConnected 
                ? "Sistem terhubung langsung secara dua arah. Tambah, edit, dan hapus data akan otomatis memperbarui Google Spreadsheet secara real-time."
                : "Aplikasi membaca data dari Google Spreadsheet. Perubahan data disimpan sementara di browser Anda. Hubungkan Apps Script untuk sinkronisasi dua arah."
              }
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Koneksi Spreadsheet</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </button>
        </div>
      </div>

      {/* Database Management Tools */}
      {expanded && (
        <div className="max-w-7xl mx-auto mt-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl animate-fade-in text-zinc-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left side: Setup Real-Time Apps Script */}
            <div className="border-r border-zinc-800 pr-0 lg:pr-6">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                <span>Sinkronisasi Real-Time (Dua Arah)</span>
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Untuk mengaktifkan sinkronisasi dua arah sehingga perubahan (Tambah, Edit, Hapus, & Ganti Password) langsung memperbarui spreadsheet, pasang file <code className="text-emerald-400 font-mono bg-black/40 px-1 py-0.5 rounded">code.gs</code> di Apps Script Spreadsheet Anda, deploy sebagai Web App, lalu paste URL di bawah ini:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
                    URL Google Apps Script Web App
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={appScriptUrl}
                      onChange={(e) => setAppScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      onClick={handleSaveAppScriptUrl}
                      disabled={isTesting}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer flex-shrink-0"
                    >
                      {isTesting ? "Menghubungkan..." : "Hubungkan"}
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                    testResult.success ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : "bg-red-950/20 text-red-400 border border-red-900/30"
                  }`}>
                    {testResult.message}
                  </div>
                )}

                <div className="bg-zinc-950/50 p-3 rounded-lg text-[10px] text-zinc-400 space-y-1">
                  <span className="font-bold text-zinc-300 block mb-1">💡 Langkah Cepat Pemasangan:</span>
                  <p>1. Buka spreadsheet Anda, lalu pilih <b>Ekstensi &gt; Apps Script</b>.</p>
                  <p>2. Copy file <b>code.gs</b> dari aplikasi ini dan paste ke dalam editor Apps Script tersebut.</p>
                  <p>3. Klik <b>Terapkan &gt; Penerapan Baru</b>. Pilih jenis <b>Aplikasi Web</b>.</p>
                  <p>4. Atur akses: Jalankan sebagai <b>Saya</b> dan Siapa yang memiliki akses ke <b>Siapa saja</b>.</p>
                  <p>5. Klik Terapkan, beri izin, lalu salin URL web app yang dihasilkan dan paste di atas.</p>
                </div>
              </div>
            </div>

            {/* Right side: Local Storage / Backups */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span>Cadangan & Manajemen Penyimpanan Lokal</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Semua perubahan data lokal Anda disimpan dengan aman di penyimpanan browser (localStorage). Anda dapat mengekspor data cadangan Anda atau mengembalikannya ke kondisi semula kapan saja.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Ekspor Cadangan (.json)</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Impor Cadangan (.json)</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />

                  <button
                    onClick={handleResetData}
                    className="flex items-center gap-2 bg-zinc-800/50 hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 font-semibold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Modifikasi Lokal</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/80 text-[11px] leading-relaxed text-zinc-400 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-300">Bagaimana cara memperbarui data induk?</span> 
                  {isAppsScriptConnected 
                    ? " Karena sinkronisasi real-time aktif, setiap tindakan edit, tambah, atau hapus di website ini akan langsung tercermin di Google Spreadsheet Anda seketika!"
                    : " Anda dapat memperbarui data utama secara langsung di Google Spreadsheet. Perubahan di spreadsheet akan langsung dimuat secara live di website setiap kali direfresh."
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
