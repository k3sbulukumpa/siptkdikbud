import React, { useState, useMemo } from "react";
import { School, GtkItem } from "../types";
import { 
  Search, Loader2, Plus, Edit, Trash2, ChevronLeft, ChevronRight, 
  FileSpreadsheet, FilterX, X, Building2, HelpCircle, RefreshCw 
} from "lucide-react";
import { compareSchoolNames, compareSchoolsByJenjangAndName } from "../utils";

interface SchoolManagerViewProps {
  schools: School[];
  kecamatans: string[];
  gtkList: GtkItem[];
  onRefreshSchools: () => void;
}

export const SchoolManagerView: React.FC<SchoolManagerViewProps> = ({
  schools,
  kecamatans,
  gtkList,
  onRefreshSchools
}) => {
  // Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  
  // Form Inputs
  const [kecamatanInput, setKecamatanInput] = useState("");
  const [schoolNameInput, setSchoolNameInput] = useState("");
  const [statusInput, setStatusInput] = useState("Negeri");
  const [rombelInput, setRombelInput] = useState<number | "">("");
  const [siswaInput, setSiswaInput] = useState<number | "">("");
  const [alamatInput, setAlamatInput] = useState("");
  
  // Filtering states
  const [filterJenjang, setFilterJenjang] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // UI Status
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = async () => {
    setIsReloading(true);
    setErrorText("");
    setSuccessText("");
    try {
      await onRefreshSchools();
      setSuccessText("Berhasil menarik data terbaru daftar sekolah dari spreadsheet!");
      setTimeout(() => setSuccessText(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorText("Gagal menarik data terbaru dari spreadsheet.");
    } finally {
      setIsReloading(false);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Helper: Get Jenjang Sekolah from school name
  const getSchoolJenjang = (schoolName: string): string => {
    const nameUpper = (schoolName || "").toUpperCase();
    if (nameUpper.includes("SDN") || nameUpper.includes("SDS") || nameUpper.includes("SD ") || nameUpper.includes("SEKOLAH DASAR")) {
      return "SD";
    }
    if (nameUpper.includes("SMPN") || nameUpper.includes("SMPS") || nameUpper.includes("SMP ") || nameUpper.includes("SEKOLAH MENENGAH PERTAMA")) {
      return "SMP";
    }
    if (nameUpper.includes("TKN") || nameUpper.includes("TK ") || nameUpper.includes("PAUD") || nameUpper.includes("KB ") || nameUpper.includes("TK/PAUD") || nameUpper.includes("KOBER")) {
      return "TK/PAUD";
    }
    if (nameUpper.includes("SMAN") || nameUpper.includes("SMAS") || nameUpper.includes("SMA ") || nameUpper.includes("SMKN") || nameUpper.includes("SMKS") || nameUpper.includes("SMK ")) {
      return "SMA/SMK";
    }
    return "Lainnya";
  };

  // Helper: Count PTK in a school
  const countPTK = (schoolName: string, kec: string) => {
    if (!gtkList) return 0;
    return gtkList.filter(g => 
      g.Sekolah.toUpperCase().trim() === schoolName.toUpperCase().trim() &&
      g.Kecamatan.toUpperCase().trim() === kec.toUpperCase().trim()
    ).length;
  };

  // Reset form
  const handleResetForm = () => {
    setEditingSchoolId(null);
    setKecamatanInput("");
    setSchoolNameInput("");
    setStatusInput("Negeri");
    setRombelInput("");
    setSiswaInput("");
    setAlamatInput("");
    setErrorText("");
  };

  // Close modal
  const handleCloseModal = () => {
    setIsOpenModal(false);
    handleResetForm();
  };

  // Open add modal
  const handleOpenAddModal = () => {
    handleResetForm();
    setErrorText("");
    setSuccessText("");
    setIsOpenModal(true);
  };

  // Edit action
  const handleEdit = (sch: School) => {
    setEditingSchoolId(sch.id);
    setKecamatanInput(sch.kec);
    setSchoolNameInput(sch.nama);
    setStatusInput(sch.status_sekolah || "Negeri");
    setRombelInput(sch.jumlah_rombel !== undefined ? sch.jumlah_rombel : "");
    setSiswaInput(sch.jumlah_siswa !== undefined ? sch.jumlah_siswa : "");
    setAlamatInput(sch.alamat_sekolah || "");
    setErrorText("");
    setSuccessText("");
    setIsOpenModal(true);
  };

  // Save action
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    if (!kecamatanInput || !schoolNameInput) {
      setErrorText("Pilih Kecamatan dan isi Nama Sekolah!");
      setLoading(false);
      return;
    }

    const payload = {
      id: editingSchoolId,
      kecamatan: kecamatanInput,
      namaSekolah: schoolNameInput.trim().toUpperCase(),
      status_sekolah: statusInput,
      jumlah_rombel: rombelInput === "" ? 0 : Number(rombelInput),
      jumlah_siswa: siswaInput === "" ? 0 : Number(siswaInput),
      alamat_sekolah: alamatInput.trim()
    };

    try {
      const resp = await fetch("/api/school/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (data.success) {
        setSuccessText(data.message || "Data sekolah berhasil disimpan.");
        setIsOpenModal(false);
        handleResetForm();
        onRefreshSchools();
        
        // Auto clear success text after 3 seconds
        setTimeout(() => setSuccessText(""), 3000);
      } else {
        setErrorText(data.message || "Gagal menyimpan data sekolah.");
      }
    } catch (err) {
      console.error(err);
      setErrorText("Gagal menyimpan data karena kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  // Delete action
  const handleDelete = async (sch: School) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus sekolah "${sch.nama}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");
    try {
      const resp = await fetch("/api/school/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sch.id })
      });
      const data = await resp.json();

      if (data.success) {
        setSuccessText(data.message || "Sekolah berhasil dihapus.");
        onRefreshSchools();
        setTimeout(() => setSuccessText(""), 3000);
      } else {
        setErrorText(data.message || "Gagal menghapus sekolah.");
      }
    } catch (err) {
      console.error(err);
      setErrorText("Gagal menghapus sekolah karena kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  // Filter school dataset
  const filteredSchools = useMemo(() => {
    const list = schools.filter(s => {
      // Search text
      const matchesSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Kecamatan
      const matchesKecamatan = filterKecamatan === "" || s.kec === filterKecamatan;
      
      // Status
      const matchesStatus = filterStatus === "" || (s.status_sekolah || "Negeri") === filterStatus;
      
      // Jenjang
      const schoolJenjang = getSchoolJenjang(s.nama);
      const matchesJenjang = filterJenjang === "" || schoolJenjang === filterJenjang;
      
      return matchesSearch && matchesKecamatan && matchesStatus && matchesJenjang;
    });

    // Sort by Kecamatan first, then by Jenjang (SD -> SMP -> TK) and school number numerically
    return list.sort((a, b) => {
      const kecA = (a.kec || "").toUpperCase();
      const kecB = (b.kec || "").toUpperCase();
      if (kecA !== kecB) {
        return kecA.localeCompare(kecB);
      }
      return compareSchoolsByJenjangAndName(a.nama, b.nama);
    });
  }, [schools, searchTerm, filterKecamatan, filterStatus, filterJenjang]);

  // Pagination bounds
  const totalItems = filteredSchools.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const paginatedSchools = useMemo(() => {
    return filteredSchools.slice(startIndex, endIndex);
  }, [filteredSchools, startIndex, endIndex]);

  // Check filter activity
  const hasActiveFilters = filterJenjang !== "" || filterStatus !== "" || filterKecamatan !== "" || searchTerm !== "";

  // Reset all filters
  const handleResetFilters = () => {
    setFilterJenjang("");
    setFilterStatus("");
    setFilterKecamatan("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Excel spreadsheet exporter
  const handleExportExcel = () => {
    if (filteredSchools.length === 0) {
      alert("Daftar laporan kosong!");
      return;
    }

    let tableHTML = '<table style="border-collapse: collapse; font-family: Arial, sans-serif; color: #000000;">';
    
    tableHTML += `
      <thead>
        <tr>
          <th colspan="8" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 13px; font-weight: normal; text-transform: uppercase; background-color: transparent; color: #000000; height: 22px; vertical-align: middle;">PEMERINTAH KABUPATEN BULUKUMBA</th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; text-transform: uppercase; background-color: transparent; color: #000000; height: 24px; vertical-align: middle;">DINAS PENDIDIKAN DAN KEBUDAYAAN</th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; background-color: transparent; height: 18px; vertical-align: middle;">Alamat: Gedung Ammatoa Lt. 1 Jalan Jenderal Sudirman, Bulukumba 92511</th>
        </tr>
        <tr>
          <th colspan="8" style="border-bottom: 3px double #000000; border-top: none; border-left: none; border-right: none; background-color: transparent; height: 8px;"></th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; background-color: transparent; height: 12px;"></th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: transparent; color: #000000; height: 20px; vertical-align: middle;">REKAPITULASI LAPORAN DATA SEKOLAH</th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; text-align: right; font-family: Arial, sans-serif; font-size: 9.5px; color: #000000; font-weight: bold; background-color: transparent; height: 18px; vertical-align: middle;">Total Data: ${filteredSchools.length} Sekolah</th>
        </tr>
        <tr>
          <th colspan="8" style="border: none; background-color: transparent; height: 8px;"></th>
        </tr>
        
        <tr>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle; height: 25px;">No</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: left; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Nama Sekolah</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: left; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Kecamatan</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Status Sekolah</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Jumlah Rombel</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Jumlah Siswa</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Jumlah PTK</th>
          <th style="background-color: #ed7d31; color: #000000; font-family: Arial, sans-serif; font-weight: bold; text-align: left; border: 1px solid #000000; font-size: 10px; padding: 6px; vertical-align: middle;">Keterangan</th>
        </tr>
      </thead>
      <tbody>
    `;

    filteredSchools.forEach((sch, index) => {
      const numPtk = countPTK(sch.nama, sch.kec);
      tableHTML += "<tr>";
      tableHTML += `<td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 10px; height: 20px;">${index + 1}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; font-family: Arial, sans-serif; font-size: 10px;">${sch.nama || "-"}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; font-family: Arial, sans-serif; font-size: 10px;">${sch.kec || "-"}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 10px;">${sch.status_sekolah || "Negeri"}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 10px;">${sch.jumlah_rombel || 0}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 10px;">${sch.jumlah_siswa || 0}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 10px;">${numPtk}</td>`;
      tableHTML += `<td style="border: 1px solid #000000; font-family: Arial, sans-serif; font-size: 10px;"></td>`;
      tableHTML += "</tr>";
    });

    const today = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const ttdTanggal = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    tableHTML += `
      <tr><td colspan="8"></td></tr>
      <tr>
        <td colspan="5"></td>
        <td colspan="3" style="text-align: left; font-family: Arial, sans-serif; font-size: 10px;">Bulukumba, ${ttdTanggal}</td>
      </tr>
      <tr>
        <td colspan="5"></td>
        <td colspan="3" style="text-align: left; font-family: Arial, sans-serif; font-size: 10px;">Kepala Dinas Pendidikan dan Kebudayaan</td>
      </tr>
      <tr><td colspan="8"></td></tr>
      <tr><td colspan="8"></td></tr>
      <tr>
        <td colspan="5"></td>
        <td colspan="3" style="text-align: left; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold;">ANDI BUYUNG SAPUTRA, S.STP. M.M</td>
      </tr>
      <tr>
        <td colspan="5"></td>
        <td colspan="3" style="text-align: left; font-family: Arial, sans-serif; font-size: 10px;">NIP. 19811110 200012 1 012</td>
      </tr>
    `;

    tableHTML += "</tbody></table>";

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:x="urn:schemas-microsoft-com:office:excel" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:Name>Rekap Data Sekolah</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      </head>
      <body>
        ${tableHTML}
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `REKAP_DATA_SEKOLAH_${ttdTanggal.replace(/\s+/g, "_")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2d2420]/30 pb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-white">Daftar Sekolah</h2>
          <p className="text-[10px] text-stone-500 font-bold uppercase mt-0.5 tracking-wider">
            Manajemen Data Sekolah dan Identitas Terdaftar
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto md:ml-auto">
          {/* Download Report */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-700 hover:border-emerald-600 rounded-lg text-xs font-bold transition cursor-pointer"
            title="Unduh Laporan Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Unduh Laporan</span>
          </button>

          {/* Reload Spreadsheet Data */}
          <button
            onClick={handleReload}
            disabled={isReloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2d2420] border border-[#40342f] text-stone-200 hover:bg-[#3d312b] hover:text-white rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="Tarik Data Terbaru dari Spreadsheet"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`} />
            <span>RELOAD</span>
          </button>

          {/* Add School action */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-[#f25c05] hover:bg-[#de5203] text-white rounded-lg text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-[#f25c05]/10 hover:shadow-none transition cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Sekolah</span>
          </button>
        </div>
      </div>

      {successText && (
        <div className="p-3.5 bg-emerald-950/20 text-emerald-450 border border-emerald-900/30 text-xs font-semibold rounded-xl">
          {successText}
        </div>
      )}

      {errorText && (
        <div className="p-3.5 bg-red-950/20 text-red-450 border border-red-900/30 text-xs font-semibold rounded-xl">
          {errorText}
        </div>
      )}

      {/* Filter Options Panel - Styled exactly like PTK filter box */}
      <div className="bg-[#1c1715] rounded-2xl shadow-xl border border-[#2d2420] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          
          {/* Jenjang Filter */}
          <div>
            <label className="block text-[9px] font-extrabold text-stone-500 uppercase tracking-widest mb-1">Jenjang Sekolah</label>
            <select
              value={filterJenjang}
              onChange={(e) => {
                setFilterJenjang(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-[#f25c05]/50 font-black"
            >
              <option value="">Semua Jenjang</option>
              <option value="TK/PAUD">TK/PAUD (Taman Kanak-Kanak / PAUD)</option>
              <option value="SD">SD (Sekolah Dasar)</option>
              <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[9px] font-extrabold text-stone-500 uppercase tracking-widest mb-1">Status Sekolah</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-[#f25c05]/50 font-black"
            >
              <option value="">Semua Status</option>
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>

          {/* Kecamatan Filter */}
          <div>
            <label className="block text-[9px] font-extrabold text-stone-500 uppercase tracking-widest mb-1">Kecamatan</label>
            <select
              value={filterKecamatan}
              onChange={(e) => {
                setFilterKecamatan(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-[#f25c05]/50 font-black"
            >
              <option value="">Semua Kecamatan</option>
              {kecamatans.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className={`w-full py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                hasActiveFilters 
                  ? "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/35" 
                  : "bg-[#181412] border-[#221c1a]/50 text-stone-650 cursor-not-allowed"
              }`}
            >
              <FilterX className="h-4 w-4" />
              <span>Reset Filters</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Table Card Frame - Matches PTK styling */}
      <div className="bg-[#1c1715] rounded-2xl shadow-xl border border-[#2d2420] overflow-hidden">
        
        {/* Search row */}
        <div className="p-4 border-b border-[#2d2420] bg-[#1e1917]/20 flex flex-col sm:flex-row justify-between items-center gap-3.5">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari berdasarkan nama sekolah..."
              className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg pl-9 pr-4 py-2 text-xs text-stone-300 focus:outline-none focus:border-[#f25c05]/50 font-bold"
            />
          </div>
          
          <div className="text-xs text-stone-500 font-bold">
            Menampilkan <span className="text-[#f25c05] font-black">{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</span> dari <span className="text-stone-300 font-extrabold">{totalItems}</span> sekolah
          </div>
        </div>

        {/* School Listing Table */}
        {loading && schools.length === 0 ? (
          <div className="py-24 text-center text-stone-550 font-medium space-y-3">
            <RefreshCw className="h-10 w-10 animate-spin text-[#f25c05] mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest text-[#f25c05]">Memproses data sekolah...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="py-20 text-center text-stone-500 space-y-3">
            <HelpCircle className="h-12 w-12 mx-auto text-stone-700" />
            <p className="font-extrabold text-sm text-stone-300">Tidak ada sekolah ditemukan</p>
            <p className="text-xs text-stone-550">Sesuai filter pencarian sekolah Anda.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-stone-400 border-collapse table-auto break-words select-text">
                <thead className="bg-[#141110] text-[#7a6f69] font-extrabold uppercase tracking-wider text-[10px] border-b border-[#2d2420]">
                  <tr>
                    <th className="p-4 text-center w-12">No</th>
                    <th className="p-4 min-w-[200px]">Nama Sekolah</th>
                    <th className="p-4">Kecamatan</th>
                    <th className="p-4 text-center w-32">Status Sekolah</th>
                    <th className="p-4 text-center w-28">Jumlah Rombel</th>
                    <th className="p-4 text-center w-28">Jumlah Siswa</th>
                    <th className="p-4 text-center w-28">Jumlah PTK</th>
                    <th className="p-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2420]/50">
                  {paginatedSchools.map((item, index) => {
                    const numPtk = countPTK(item.nama, item.kec);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-[#201a18]/45 transition align-middle border-b border-[#2d2420]/35 bg-[#1c1715]/40 even:bg-[#1f1a18]/25"
                      >
                        {/* No */}
                        <td className="p-4 text-center font-mono text-stone-500">{startIndex + index + 1}</td>
                        
                        {/* Nama Sekolah */}
                        <td className="p-4">
                          <span className="block font-black text-sm text-stone-100 leading-tight">
                            {item.nama}
                          </span>
                          {item.alamat_sekolah && (
                            <span className="text-[10px] text-stone-500 font-semibold block mt-1">
                              {item.alamat_sekolah}
                            </span>
                          )}
                        </td>

                        {/* Kecamatan */}
                        <td className="p-4 font-bold text-stone-300">
                          {item.kec}
                        </td>

                        {/* Status Sekolah Badge */}
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase ${
                            (item.status_sekolah || "Negeri") === "Negeri"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          }`}>
                            {item.status_sekolah || "Negeri"}
                          </span>
                        </td>

                        {/* Jumlah Rombel */}
                        <td className="p-4 text-center font-bold text-stone-200">
                          {item.jumlah_rombel !== undefined ? item.jumlah_rombel : 0}
                        </td>

                        {/* Jumlah Siswa */}
                        <td className="p-4 text-center font-bold text-stone-200">
                          {item.jumlah_siswa !== undefined ? item.jumlah_siswa : 0}
                        </td>

                        {/* Jumlah PTK */}
                        <td className="p-4 text-center">
                          <span className="font-extrabold text-white text-sm">
                            {numPtk}
                          </span>
                          <span className="text-[10px] text-stone-500 block">Personel</span>
                        </td>

                        {/* Aksi */}
                        <td className="p-4">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-xs font-black text-stone-300 hover:text-white bg-[#27211e] border border-[#2d2420] hover:bg-stone-800 px-2 py-1 rounded transition cursor-pointer font-sans"
                              title="Edit data sekolah ini"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="text-xs font-black text-red-540 hover:text-red-300 bg-red-950/15 border border-red-900/30 hover:bg-red-900/20 px-2 py-1 rounded transition cursor-pointer font-sans"
                              title="Hapus data sekolah ini"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer identical to PTK table style */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#141110] border-t border-[#2d2420]">
              <div className="text-xs text-stone-500 font-bold">
                Menampilkan <span className="text-[#f25c05] font-black">{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</span> dari <span className="text-stone-300 font-extrabold">{totalItems}</span> sekolah
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="p-1.5 bg-[#13100e] border border-[#2d2420]/80 rounded-lg text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-800/80 transition duration-150 cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page Info */}
                <div className="flex items-center gap-2 text-xs text-stone-400 font-extrabold">
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCurrentPage(Math.max(1, Math.min(val, totalPages)));
                      }
                    }}
                    className="w-12 bg-[#13100e] border border-[#2d2420] rounded px-1.5 py-0.5 text-center text-xs text-stone-200 focus:outline-none focus:border-[#f25c05]/60 font-black font-mono"
                  />
                  <span>of {totalPages}</span>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="p-1.5 bg-[#13100e] border border-[#2d2420]/80 rounded-lg text-stone-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-800/80 transition duration-150 cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Pop Up Dialog / Popup Modal for Add or Edit School */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#1c1715] rounded-2xl shadow-2xl border border-[#2d2420] overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#2d2420]">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#f25c05]" />
                <h3 className="font-black text-white text-xs uppercase tracking-wider">
                  {editingSchoolId ? "Edit Sekolah" : "Tambah Sekolah Baru"}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-stone-500 hover:text-white transition duration-150 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Kecamatan */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Kecamatan</label>
                <select
                  value={kecamatanInput}
                  onChange={(e) => setKecamatanInput(e.target.value)}
                  className="w-full bg-[#13100e] border border-[#2d2420] text-stone-300 rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-bold"
                  required
                >
                  <option value="">-- PILIH KECAMATAN --</option>
                  {kecamatans.map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>

              {/* Nama Sekolah */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Nama Sekolah</label>
                <input
                  type="text"
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold uppercase"
                  placeholder="Contoh: SDN 58 TANETE"
                  required
                />
              </div>

              {/* Status, Rombel and Siswa */}
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Status Sekolah</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full bg-[#13100e] border border-[#2d2420] text-stone-300 rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-bold"
                  >
                    <option value="Negeri">Negeri</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Jumlah Rombel</label>
                  <input
                    type="number"
                    min={0}
                    value={rombelInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRombelInput(val === "" ? "" : Number(val));
                    }}
                    className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold font-mono"
                    placeholder="Contoh: 6"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Jumlah Siswa</label>
                  <input
                    type="number"
                    min={0}
                    value={siswaInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSiswaInput(val === "" ? "" : Number(val));
                    }}
                    className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold font-mono"
                    placeholder="Contoh: 120"
                  />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-wider">Alamat Sekolah</label>
                <textarea
                  value={alamatInput}
                  onChange={(e) => setAlamatInput(e.target.value)}
                  rows={3}
                  className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold"
                  placeholder="Alamat lengkap sekolah..."
                />
              </div>

              {/* Modal Footer / Triggers */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-[#241a16] border border-[#2d2420] text-stone-300 py-2 rounded-lg text-xs hover:bg-[#2e211c] transition font-bold cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#f25c05] hover:bg-[#de5203] font-extrabold uppercase tracking-widest text-white py-2 px-4 rounded-lg text-[10px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{editingSchoolId ? "Simpan" : "Tambah"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
