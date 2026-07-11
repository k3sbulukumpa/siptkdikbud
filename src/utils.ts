import { GtkItem } from "./types";

// Format date String from YYYY-MM-DD to Indonesian full-date text
export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[0], 10);
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    if (!isNaN(d) && m >= 0 && m < 12 && !isNaN(y)) {
      return `${d} ${months[m]} ${y}`;
    }
  }
  return dateStr;
}

// Format raw HP/WA number to normalized local screen view (prefix 0)
export function formatHpDisplay(rawHp: string): string {
  const hpStr = String(rawHp || "").trim();
  if (hpStr.startsWith("62")) {
    return "0" + hpStr.substring(2);
  }
  return hpStr;
}

export function getPangkatLengkap(golongan: string): string {
  const pangkatMap: Record<string, string> = {
    "II/a": "Pengatur Muda, II/a",
    "II/b": "Pengatur Muda Tingkat I, II/b",
    "II/c": "Pengatur, II/c",
    "II/d": "Pengatur Tingkat I, II/d",
    "III/a": "Penata Muda, III/a",
    "III/b": "Penata Muda Tingkat I, III/b",
    "III/c": "Penata, III/c",
    "III/d": "Penata Tingkat I, III/d",
    "IV/a": "Pembina, IV/a",
    "IV/b": "Pembina Tingkat I, IV/b",
    "IV/c": "Pembina Utama Muda, IV/c",
    "IV/d": "Pembina Utama Madya, IV/d",
    "IV/e": "Pembina Utama, IV/e"
  };
  return pangkatMap[golongan] || golongan || "";
}

// Compare school names numerically based on the first occurrence of numbers (e.g., 58 before 175)
export function compareSchoolNames(a: string, b: string): number {
  const nameA = (a || "").toUpperCase();
  const nameB = (b || "").toUpperCase();
  
  const matchA = nameA.match(/\d+/);
  const matchB = nameB.match(/\d+/);
  
  if (matchA && matchB) {
    const numA = parseInt(matchA[0], 10);
    const numB = parseInt(matchB[0], 10);
    if (numA !== numB) {
      return numA - numB;
    }
  } else if (matchA) {
    return -1; // school with number comes first
  } else if (matchB) {
    return 1; // school with number comes first
  }
  
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
}

// Get Jenjang category from school name
export function getSchoolJenjang(schoolName: string): string {
  const nameUpper = (schoolName || "").toUpperCase();
  if (nameUpper.includes("SDN") || nameUpper.includes("SDS") || nameUpper.includes("SD ") || nameUpper.includes("SEKOLAH DASAR")) {
    return "SD";
  }
  if (nameUpper.includes("SMPN") || nameUpper.includes("SMPS") || nameUpper.includes("SMP ") || nameUpper.includes("SEKOLAH MENENGAH PERTAMA")) {
    return "SMP";
  }
  if (nameUpper.includes("TKN") || nameUpper.includes("TK ") || nameUpper.includes("PAUD") || nameUpper.includes("KB ") || nameUpper.includes("TK/PAUD") || nameUpper.includes("KOBER")) {
    return "TK";
  }
  if (nameUpper.includes("SMAN") || nameUpper.includes("SMAS") || nameUpper.includes("SMA ") || nameUpper.includes("SMKN") || nameUpper.includes("SMKS") || nameUpper.includes("SMK ")) {
    return "SMA/SMK";
  }
  return "Lainnya";
}

// Get Jenjang sort weight (SD = 1, SMP = 2, TK = 3, SMA/SMK = 4, Lainnya = 5)
export function getSchoolJenjangWeight(schoolName: string): number {
  const jenjang = getSchoolJenjang(schoolName);
  if (jenjang === "SD") return 1;
  if (jenjang === "SMP") return 2;
  if (jenjang === "TK") return 3;
  if (jenjang === "SMA/SMK") return 4;
  return 5;
}

// Sort schools by Jenjang weight then by numerical school number
export function compareSchoolsByJenjangAndName(a: string, b: string): number {
  const weightA = getSchoolJenjangWeight(a);
  const weightB = getSchoolJenjangWeight(b);
  if (weightA !== weightB) {
    return weightA - weightB;
  }
  return compareSchoolNames(a, b);
}

// Download Excel table for single school (DUK format)
export function exportExcelSekolah(
  filteredGtk: GtkItem[],
  namaSekolah: string,
  alamat?: string,
  rombel?: number | string
) {
  let tableHTML = '<table style="border-collapse: collapse;">';
  
  const alamatStr = alamat ? `Alamat : ${alamat}` : "Alamat : ................................................................................";

  tableHTML += `
    <thead>
      <tr><td colspan="14" style="text-align:center; font-weight:bold; font-size:14pt;">PEMERINTAH KABUPATEN BULUKUMBA</td></tr>
      <tr><td colspan="14" style="text-align:center; font-weight:bold; font-size:16pt;">DINAS PENDIDIKAN DAN KEBUDAYAAN</td></tr>
      <tr><td colspan="14" style="text-align:center; font-weight:bold; font-size:16pt;">UPT SPF ${namaSekolah}</td></tr>
      <tr><td colspan="14" style="text-align:center; font-style:italic; font-size:10pt; border-bottom: 3px double #000000;">${alamatStr}</td></tr>
      <tr><td colspan="14"></td></tr>
      <tr><td colspan="14" style="text-align:center; font-weight:bold; font-size:12pt;">DAFTAR URUT KEPANGKATAN PENDIDIK DAN TENAGA KEPENDIDIKAN</td></tr>
      <tr><td colspan="14"></td></tr>
      
      <tr>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">No</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Nama Lengkap</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">NIP</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">NIK</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Pangkat/ Gol.Ruang</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">TMT Pangkat/ Gol.Ruang</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Jabatan</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Pendidikan Terakhir</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">TMT Kepsek</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Beban Tugas</th>
        <th colspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Sertifikasi</th>
        <th rowspan="3" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">KET</th>
      </tr>
      <tr>
        <th colspan="2" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Status</th>
        <th rowspan="2" style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Mapel Sertifikasi</th>
      </tr>
      <tr>
        <th style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Ya</th>
        <th style="border: 1px solid #000; background-color: #ed7d31; font-weight: bold; text-align: center; vertical-align: middle;">Tdk</th>
      </tr>
    </thead>
    <tbody>
  `;

  filteredGtk.forEach((item, index) => {
    const isYa = item.Sertifikasi === "Ya" ? "v" : "";
    const isBelum = item.Sertifikasi !== "Ya" ? "v" : "";
    const mapelSert = item.Sertifikasi === "Ya" ? item.Mapel : "";

    let pangkatStr = getPangkatLengkap(item.Golongan);
    if (item.Status_Pegawai === "PPPKPW") {
      pangkatStr = "";
    } else if (item.Status_Pegawai === "PPPK") {
      pangkatStr = item.Golongan || "";
    }

    const tmtGolStr = item.TMT_Golongan_Formatted ? "&nbsp;" + formatTanggalIndo(item.TMT_Golongan_Formatted) : "-";
    const tmtKepsekStr = item.TMT_Kepsek_Formatted ? "&nbsp;" + formatTanggalIndo(item.TMT_Kepsek_Formatted) : "-";

    let bebanTugasCetak = item.Beban_Tugas || "";
    if (bebanTugasCetak.startsWith("Guru Mapel - ")) {
      bebanTugasCetak = bebanTugasCetak.replace("Guru Mapel - ", "Guru ");
    }

    tableHTML += "<tr>";
    tableHTML += `<td style="border: 1px solid #000; text-align: center;">${index + 1}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${item.Nama || "-"}</td>`;
    tableHTML += `<td style="border: 1px solid #000; mso-number-format:'\\@';">${item.NIP || ""}</td>`;
    tableHTML += `<td style="border: 1px solid #000; mso-number-format:'\\@';">${item.NIK || ""}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${pangkatStr}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${tmtGolStr}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${item.Jabatan || ""}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${item.Pendidikan || ""}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${tmtKepsekStr}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${bebanTugasCetak}</td>`;
    tableHTML += `<td style="border: 1px solid #000; text-align: center; font-weight: bold;">${isYa}</td>`;
    tableHTML += `<td style="border: 1px solid #000; text-align: center; font-weight: bold;">${isBelum}</td>`;
    tableHTML += `<td style="border: 1px solid #000;">${mapelSert}</td>`;
    tableHTML += `<td style="border: 1px solid #000;"></td>`;
    tableHTML += "</tr>";
  });

  // Tanda tangan
  const kepsek = filteredGtk.find(gtk => gtk.Beban_Tugas === "Kepala Sekolah" || gtk.Beban_Tugas === "PLT. Kepala Sekolah");
  const ttdNama = kepsek ? kepsek.Nama : "..........................";
  const ttdNip = kepsek ? (kepsek.NIP || "..........................") : "..........................";
  
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const today = new Date();
  const ttdTanggal = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  tableHTML += `
    <tr><td colspan="14"></td></tr>
    <tr>
      <td colspan="6" rowspan="4" style="text-align: left; vertical-align: top; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; padding: 5px;">
        Keterangan:<br>
        1. Jumlah PTK : ${filteredGtk.length} Orang<br>
        2. Jumlah Rombel : ${rombel !== undefined && rombel !== "" ? rombel : ". . . ."} Rombel
      </td>
      <td colspan="5"></td>
      <td colspan="3" style="text-align: left; vertical-align: top; font-family: Arial, sans-serif;">Bulukumba, ${ttdTanggal}</td>
    </tr>
    <tr>
      <td colspan="5"></td>
      <td colspan="3" style="text-align: left; vertical-align: top; font-family: Arial, sans-serif;">Kepala Sekolah</td>
    </tr>
    <tr>
      <td colspan="8"></td>
    </tr>
    <tr>
      <td colspan="8"></td>
    </tr>
    <tr>
      <td colspan="11"></td>
      <td colspan="3" style="text-align: left; font-weight: bold; font-family: Arial, sans-serif;">${ttdNama}</td>
    </tr>
    <tr>
      <td colspan="11"></td>
      <td colspan="3" style="text-align: left; font-family: Arial, sans-serif;">NIP. ${ttdNip}</td>
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
            <x:ExcelWorksheet>
              <x:Name>DUK PTK</x:Name>
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
  link.download = `DUK_PTK_${namaSekolah.replace(/\s+/g, "_")}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download Excel table for Dinas (Admin Dinas format identical to DUK Print Layout)
export function exportExcelDinas(
  filteredGtk: GtkItem[],
  configAdmin?: {
    judul: string;
    tanggal: string;
    jabatan: string;
    nama: string;
    nip: string;
  }
) {
  try {
    const today = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const defaultTanggal = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    const config = configAdmin || {
      judul: "DAFTAR URUT KEPANGKATAN PENDIDIK DAN TENAGA KEPENDIDIKAN",
      tanggal: defaultTanggal,
      jabatan: "Kepala Dinas Pendidikan dan Kebudayaan",
      nama: "ANDI BUYUNG SAPUTRA, S.STP. M.M",
      nip: "19811110 200012 1 012"
    };

    let tableHTML = '<table style="border-collapse: collapse; font-family: Arial, sans-serif; color: #000000;">';
  
  // Kop Surat & Title HTML identical to PDF representation inside Excel
  tableHTML += `
    <thead>
      <tr>
        <th colspan="17" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 13px; font-weight: normal; text-transform: uppercase; background-color: transparent; color: #000000; height: 22px; vertical-align: middle;">PEMERINTAH KABUPATEN BULUKUMBA</th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; text-transform: uppercase; background-color: transparent; color: #000000; height: 24px; vertical-align: middle;">DINAS PENDIDIKAN DAN KEBUDAYAAN</th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; background-color: transparent; height: 18px; vertical-align: middle;">Alamat: Gedung Ammatoa Lt. 1 Jalan Jenderal Sudirman, Bulukumba 92511</th>
      </tr>
      <tr>
        <th colspan="17" style="border-bottom: 3px double #000000; border-top: none; border-left: none; border-right: none; background-color: transparent; height: 8px;"></th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; background-color: transparent; height: 12px;"></th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; text-align: center; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: transparent; color: #000000; height: 20px; vertical-align: middle;">${config.judul}</th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; text-align: right; font-family: Arial, sans-serif; font-size: 9.5px; color: #000000; font-weight: bold; background-color: transparent; height: 18px; vertical-align: middle;">Total Data: ${filteredGtk.length} Personel</th>
      </tr>
      <tr>
        <th colspan="17" style="border: none; background-color: transparent; height: 8px;"></th>
      </tr>
      
      <!-- Table Headers with Rowspan & Colspan aligned with DUK (Plain Black Text, Orange Background, Border 1px) -->
      <tr>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">No</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Nama Lengkap</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Status</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">NIP</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">NIK</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Lokasi Tugas</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Pangkat/ Gol.Ruang</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">TMT Pangkat</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Jabatan</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Pendidikan Terakhir</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">TMT Kepsek</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Beban Tugas</th>
        <th colspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Sertifikasi</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">NO. HP</th>
        <th rowspan="3" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">KET</th>
      </tr>
      <tr>
        <th colspan="2" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Status</th>
        <th rowspan="2" style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Mapel Sertifikasi</th>
      </tr>
      <tr>
        <th style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Ya</th>
        <th style="background-color: #ed7d31; background: #ed7d31 !important; color: #000000 !important; font-family: Arial, sans-serif; font-weight: bold; text-align: center; border: 1px solid #000000; font-size: 10px; vertical-align: middle;">Tdk</th>
      </tr>
    </thead>
    <tbody>
  `;

  filteredGtk.forEach((item, index) => {
    const isYa = item.Sertifikasi === "Ya" ? "v" : "";
    const isBelum = item.Sertifikasi !== "Ya" ? "v" : "";
    const mapelSert = item.Sertifikasi === "Ya" ? item.Mapel : "";
    const noHp = item.No_HP ? String(item.No_HP).replace(/^62/, "0") : "";

    let pangkatStr = getPangkatLengkap(item.Golongan);
    if (item.Status_Pegawai === "PPPKPW") {
      pangkatStr = "";
    } else if (item.Status_Pegawai === "PPPK") {
      pangkatStr = item.Golongan || "";
    }

    const tmtGolStr = formatTanggalIndo(item.TMT_Golongan_Formatted);
    const tmtKepsekStr = formatTanggalIndo(item.TMT_Kepsek_Formatted);

    let bebanTugasCetak = item.Beban_Tugas || "";
    if (bebanTugasCetak.startsWith("Guru Mapel - ")) {
      bebanTugasCetak = bebanTugasCetak.replace("Guru Mapel - ", "Guru ");
    }

    tableHTML += `
      <tr>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; height: 20px; vertical-align: middle;">${index + 1}</td>
        <td style="border: 1px solid #000000; text-align: left; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle; white-space: nowrap;">${item.Nama || "-"}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${item.Status_Pegawai || ""}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle; mso-number-format:'\\@';">${item.NIP || ""}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle; mso-number-format:'\\@';">${item.NIK || ""}</td>
        <td style="border: 1px solid #000000; text-align: left; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;"><strong>${item.Sekolah || "-"}</strong><br><span style="font-size: 7.5px; color:#555555; font-family: Arial, sans-serif;">${item.Kecamatan || ""}</span></td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${pangkatStr}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${tmtGolStr}</td>
        <td style="border: 1px solid #000000; text-align: left; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${item.Jabatan || ""}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${item.Pendidikan || ""}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${tmtKepsekStr}</td>
        <td style="border: 1px solid #000000; text-align: left; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${bebanTugasCetak}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;"><strong>${isYa}</strong></td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;"><strong>${isBelum}</strong></td>
        <td style="border: 1px solid #000000; text-align: left; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle;">${mapelSert}</td>
        <td style="border: 1px solid #000000; text-align: center; font-family: Arial, sans-serif; font-size: 9px; color: #000000; vertical-align: middle; mso-number-format:'\\@';">${noHp}</td>
        <td style="border: 1px solid #000000;"></td>
      </tr>
    `;
  });

  // Exact Signatures area matching PDF DUK
  tableHTML += `
      <tr>
        <td colspan="17" style="border: none; height: 16px;"></td>
      </tr>
      <tr>
        <td colspan="12" style="border: none;"></td>
        <td colspan="5" style="border: none; text-align: left; font-family: Arial, sans-serif; font-size: 10px; color: #000000; vertical-align: middle;">Bulukumba, ${config.tanggal}</td>
      </tr>
      <tr>
        <td colspan="12" style="border: none;"></td>
        <td colspan="5" style="border: none; text-align: left; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; color: #000000; vertical-align: middle;">${config.jabatan}</td>
      </tr>
      <tr>
        <td colspan="17" style="border: none; height: 45px;"></td>
      </tr>
      <tr>
        <td colspan="12" style="border: none;"></td>
        <td colspan="5" style="border: none; text-align: left; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; text-decoration: underline; color: #000000; vertical-align: middle;">${config.nama}</td>
      </tr>
      <tr>
        <td colspan="12" style="border: none;"></td>
        <td colspan="5" style="border: none; text-align: left; font-family: Arial, sans-serif; font-size: 10px; color: #000000; vertical-align: middle;">NIP. ${config.nip}</td>
      </tr>
    </tbody>
  </table>`;

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
            <x:ExcelWorksheet>
              <x:Name>DUK PTK Bulukumba</x:Name>
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
  const cleanTitle = config.judul.replace(/\s+/g, "_");
  link.download = `DUK_${cleanTitle}_${Date.now()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("Gagal mengekspor Excel Dinas:", error);
    alert("Gagal melakukan unduhan Excel Dinas. Error: " + (error?.message || String(error)));
  }
}

// Print beautifully formatted PDF layout from a new tab window
// Print beautifully formatted PDF layout from a new tab window (or same-window print-in-place for sandboxed Apps Script iframes)
export function printLaporan(
  filteredGtk: GtkItem[],
  viewerRole: "Admin Dinas" | "Sekolah",
  viewerIdentifier: string,
  configAdmin?: {
    judul: string;
    tanggal: string;
    jabatan: string;
    nama: string;
    nip: string;
  }
) {
  const isDinas = viewerRole === "Admin Dinas";
  const namaSekolah = isDinas ? "KABUPATEN BULUKUMBA" : viewerIdentifier.split("|")[1];

  let judulCetak = "DAFTAR URUT KEPANGKATAN PENDIDIK DAN TENAGA KEPENDIDIKAN";
  let ttdTanggal = "";
  let ttdJabatan = "Kepala Sekolah";
  let ttdNama = "..........................";
  let ttdNip = "..........................";

  const today = new Date();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  if (isDinas && configAdmin) {
    judulCetak = configAdmin.judul;
    ttdTanggal = configAdmin.tanggal;
    ttdJabatan = configAdmin.jabatan;
    ttdNama = configAdmin.nama;
    ttdNip = configAdmin.nip;
  } else {
    const kepsek = filteredGtk.find(g => g.Beban_Tugas === "Kepala Sekolah" || g.Beban_Tugas === "PLT. Kepala Sekolah");
    if (kepsek) {
      ttdNama = kepsek.Nama;
      ttdNip = kepsek.NIP || "..........................";
    }
    ttdTanggal = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
  }

  // Detect restriction / Google Apps Script environment or iframe representation
  const isIframeOrAppsScript = typeof window !== "undefined" && (
    window.self !== window.top ||
    (window as any).google?.script?.run ||
    window.location.hostname.includes("googleusercontent.com") ||
    window.location.hostname.includes("script.google.com")
  );

  let bodyContentHTML = `
      ${isDinas ? `
      <div class="kop-surat">
        <div class="kop-wrapper">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/50/Lambang_Kabupaten_Bulukumba.svg" class="kop-logo" style="width: 65px; margin-right: 20px;" alt="Logo Bulukumba" />
          <div class="kop-text">
            <h1 style="font-size: 17px; margin-bottom: 4px; color: #000000 !important;">PEMERINTAH KABUPATEN BULUKUMBA</h1>
            <h2 style="font-size: 21px; font-weight: bold; margin-bottom: 6px; color: #000000 !important;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
            <p style="font-size: 12.5px; margin: 0; color: #000000 !important;">Alamat: Gedung Ammatoa Lt. 1 Jalan Jenderal Sudirman, Bulukumba 92511</p>
          </div>
        </div>
      </div>
      <div class="kop-garis-bawah"></div>
      ` : `
      <div class="kop-surat">
        <div class="kop-wrapper">
          <img src="https://upload.wikimedia.org/wikipedia/commons/5/50/Lambang_Kabupaten_Bulukumba.svg" class="kop-logo" style="width: 50px; margin-right: 15px; top: 1px;" alt="Logo Bulukumba" />
          <div class="kop-text">
            <h1 style="color: #000000 !important;">PEMERINTAH KABUPATEN BULUKUMBA</h1>
            <h2 style="color: #000000 !important;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
            <h3 style="color: #000000 !important;">UPT SPF ${namaSekolah}</h3>
          </div>
        </div>
      </div>
      <div class="kop-garis-bawah"></div>
      `}

      <div class="judul-laporan" style="color: #000000 !important;">${judulCetak}</div>
      
      <div class="info-text" style="color: #000000 !important;">
        Total Data: ${filteredGtk.length} Personel
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="3" style="width: 1%; white-space: nowrap;">No</th>
            <th rowspan="3" style="width: 1%; white-space: nowrap;">Nama Lengkap</th>
            ${isDinas ? '<th rowspan="3" width="4%">Status</th>' : ""}
            <th rowspan="3" style="width: 1%; white-space: nowrap;">NIP</th>
            <th rowspan="3" style="width: 1%; white-space: nowrap;">NIK</th>
            ${isDinas ? '<th rowspan="3" width="10%">Lokasi Tugas</th>' : ""}
            <th rowspan="3" width="6%">Pangkat/<br>Gol.Ruang</th>
            <th rowspan="3" width="6%">TMT<br>Pangkat</th>
            <th rowspan="3" width="8%">Jabatan</th>
            <th rowspan="3" width="5%">Pendidikan<br>Terakhir</th>
            <th rowspan="3" width="5%">TMT<br>Kepsek</th>
            <th rowspan="3" width="8%">Beban<br>Tugas</th>
            <th colspan="3">Sertifikasi</th>
            ${isDinas ? '<th rowspan="3" style="width: 1%; white-space: nowrap;">NO. HP</th>' : ""}
            <th rowspan="3" style="width: auto;">KET</th>
          </tr>
          <tr>
            <th colspan="2">Status</th>
            <th rowspan="2" width="8%">Mapel Sertifikasi</th>
          </tr>
          <tr>
            <th style="width: 1%;">Ya</th>
            <th style="width: 1%;">Tdk</th>
          </tr>
        </thead>
        <tbody>
  `;

  filteredGtk.forEach((item, index) => {
    const isYa = item.Sertifikasi === "Ya" ? "v" : "";
    const isBelum = item.Sertifikasi !== "Ya" ? "v" : "";
    const mapelSert = item.Sertifikasi === "Ya" ? item.Mapel : "";
    const noHp = item.No_HP ? String(item.No_HP).replace(/^62/, "0") : "";

    let pangkatStr = getPangkatLengkap(item.Golongan);
    if (item.Status_Pegawai === "PPPKPW") {
      pangkatStr = "";
    } else if (item.Status_Pegawai === "PPPK") {
      pangkatStr = item.Golongan || "";
    }

    const tmtGolStr = formatTanggalIndo(item.TMT_Golongan_Formatted);
    const tmtKepsekStr = formatTanggalIndo(item.TMT_Kepsek_Formatted);

    let bebanTugasCetak = item.Beban_Tugas || "";
    if (bebanTugasCetak.startsWith("Guru Mapel - ")) {
      bebanTugasCetak = bebanTugasCetak.replace("Guru Mapel - ", "Guru ");
    }

    bodyContentHTML += `
      <tr>
        <td>${index + 1}</td>
        <td class="text-left" style="white-space: nowrap;">${item.Nama}</td>
        ${isDinas ? `<td>${item.Status_Pegawai || ""}</td>` : ""}
        <td style="white-space: nowrap;">${item.NIP || ""}</td>
        <td style="white-space: nowrap;">${item.NIK || ""}</td>
        ${isDinas ? `<td><strong>${item.Sekolah}</strong><br><span style="font-size:8px;color:#444;">${item.Kecamatan}</span></td>` : ""}
        <td style="white-space: nowrap;">${pangkatStr}</td>
        <td style="white-space: nowrap;">${tmtGolStr}</td>
        <td>${item.Jabatan || ""}</td>
        <td>${item.Pendidikan || ""}</td>
        <td style="white-space: nowrap;">${tmtKepsekStr}</td>
        <td>${bebanTugasCetak}</td>
        <td><strong>${isYa}</strong></td>
        <td><strong>${isBelum}</strong></td>
        <td>${mapelSert}</td>
        ${isDinas ? `<td style="white-space: nowrap;">${noHp}</td>` : ""}
        <td></td>
      </tr>
    `;
  });

  const colSpanTotal = isDinas ? 17 : 14;
  const ttdPadding = isDinas ? "30px" : "15px";
  const ttdSpace = isDinas ? "70px" : "50px";

  bodyContentHTML += `
          <tr>
            <td colspan="${colSpanTotal}" style="border: none; padding-top: ${ttdPadding};">
              <div class="ttd-wrapper">
                <div class="ttd-box">
                  <p>Bulukumba, ${ttdTanggal}</p>
                  <p>${ttdJabatan}</p>
                  <div style="height: ${ttdSpace};"></div>
                  <p><strong style="font-size: 13px;">${ttdNama}</strong></p>
                  <p>NIP ${isDinas ? ":" : "."} ${ttdNip}</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
  `;

  const cssStyle = `
    @page { size: 33cm 21cm; margin: ${isDinas ? "10mm" : "12mm 10mm 2mm 10mm"}; border: none; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0 0 10px 0; background: #ffffff !important; }
    
    .kop-surat { border-bottom: 3px solid black; padding-bottom: ${isDinas ? "10px" : "5px"}; margin-bottom: 2px; text-align: center; }
    .kop-wrapper { display: inline-block; position: relative; text-align: center; }
    .kop-logo { position: absolute; right: 100%; top: 0; margin-right: 15px; width: 60px; height: auto; }
    .kop-text { text-align: center; line-height: 1.2; }
    
    .kop-text h1 { margin: 0; font-size: 15px; font-weight: normal; color: #000000 !important; }
    .kop-text h2 { margin: 0; font-size: 17px; font-weight: bold; color: #000000 !important; }
    .kop-text h3 { margin: 0; font-size: 17px; font-weight: bold; text-transform: uppercase; color: #000000 !important; }
    .kop-garis-bawah { border-top: 1px solid black; margin-bottom: ${isDinas ? "20px" : "10px"}; }
    .judul-laporan { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: ${isDinas ? "15px" : "8px"}; text-transform: uppercase; color: #000000 !important; }
    table { width: 100%; border-collapse: collapse; margin-top: ${isDinas ? "10px" : "5px"}; border: 1px solid #000; color: #000000 !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; border: 1px solid #000000 !important; }
    th, td { border: 1px solid #000000 !important; padding: 2.5px 3.5px; text-align: center; vertical-align: middle; word-wrap: break-word; color: #000000 !important; }
    th { background-color: #ed7d31 !important; color: #ffffff !important; font-weight: bold; font-size: 9.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td { font-size: 9px; background-color: transparent !important; }
    .text-left { text-align: left; }
    .info-text { font-size: 9.5px; color: #111111 !important; margin-bottom: 5px; text-align: right; }
    .ttd-wrapper { display: flex; justify-content: flex-end; margin-top: ${isDinas ? "35px" : "10px"}; page-break-inside: avoid; break-inside: avoid; }
    .ttd-box { width: 300px; text-align: left; color: #000000 !important; }
    .ttd-box p { margin: 0; padding: 1.5px 0; font-size: 11px; color: #000000 !important; }
    .ttd-space { height: 60px; }
    
    .footer-pdf {
      position: fixed;
      bottom: 0;
      left: 0;
      font-size: 9px;
      color: #666666 !important;
      font-style: italic;
      opacity: 0.9;
    }

    @media print {
      body > *:not(.gas-print-container) {
        display: none !important;
      }
      .gas-print-container {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        height: auto !important;
        background: #ffffff !important;
        color: #000000 !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
    }
  `;

  // Determine browser window launch method
  let printWindow: Window | null = null;
  if (!isIframeOrAppsScript) {
    try {
      printWindow = window.open("", "_blank");
    } catch (e) {
      console.warn("window.open failed, falling back to download representation for safety.", e);
    }
  }

  const cleanNamaSekolah = namaSekolah ? namaSekolah.replace(/\s+/g, "_") : "Sekolah";

  if (printWindow) {
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan_PTK_${cleanNamaSekolah}</title>
        <style>${cssStyle}</style>
      </head>
      <body>
        <div class="footer-pdf">Laporan ini dicetak melalui Aplikasi SI PTK Dikbud Kab. Bulukumba</div>
        <div class="gas-print-container">
          ${bodyContentHTML}
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() {
              window.print(); 
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  } else {
    // Generate full downloadable HTML for sandboxed Apps Script context
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Cetak_Laporan_${cleanNamaSekolah}</title>
        <style>
          ${cssStyle}
          body {
            background-color: #f3f4f6;
            padding: 20px;
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f3f4f6 !important;
          }
          .outside-notice {
            background-color: #ebf5ff;
            border: 1px solid #bfdbfe;
            color: #1e3a8a;
            padding: 14px 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .print-btn {
            background-color: #ed7d31;
            color: white;
            border: none;
            padding: 10px 20px;
            font-weight: bold;
            font-size: 13px;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            transition: background-color 0.2s;
          }
          .print-btn:hover {
            background-color: #d8651a;
          }
          @media print {
            .outside-notice, .print-btn {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              background: #ffffff !important;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="outside-notice">
          <span><strong>SI PTK DIKBUD BULUKUMBA</strong> — Dokumen laporan siap dicetak. Jika dialog cetak tidak otomatis terbuka, silakan klik tombol di samping.</span>
          <button class="print-btn" onclick="window.print()">Hubungkan ke Printer (Print)</button>
        </div>
        <div class="gas-print-container">
          ${bodyContentHTML}
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() {
              window.print(); 
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    try {
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Cetak_Laporan_${cleanNamaSekolah}.html`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }, 100);

      alert(
        "KARENA KEBIJAKAN KEAMANAN GOOGLE APPS SCRIPT:\n" +
        "Sistem telah mengunduh berkas cetak '" + `Cetak_Laporan_${cleanNamaSekolah}.html` + "' secara otomatis ke komputer Anda.\n\n" +
        "Silakan buka berkas hasil unduhan tersebut untuk langsung menampilkan dan mencetak (print) laporan dengan sangat rapi!"
      );
    } catch (e) {
      console.error("Download failed:", e);
      alert("Gagal melakukan pencetakan otomatis. Silakan hubungi admin.");
    }
  }
}

// Memory fallback cache for localStorage in sandboxed or restricted iframe environments
const storageCache: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback silently to memory cache
    }
    return storageCache[key] !== undefined ? storageCache[key] : null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      // Fallback silently to memory cache
    }
    storageCache[key] = value;
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      // Fallback silently to memory cache
    }
    delete storageCache[key];
  }
};


