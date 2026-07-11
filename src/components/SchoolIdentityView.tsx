import React, { useState, useEffect } from "react";
import { School, UserSession } from "../types";
import { Loader2, Save, Building, Landmark } from "lucide-react";

interface SchoolIdentityViewProps {
  session: UserSession;
  schools: School[];
  onRefreshSchools: () => void;
}

export const SchoolIdentityView: React.FC<SchoolIdentityViewProps> = ({
  session,
  schools,
  onRefreshSchools
}) => {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  // Extract kecamatan and namaSekolah from identifier
  const parts = session.identifier.split("|");
  const currentKec = parts[0] || "";
  const currentNama = parts[1] || "";

  // State fields
  const [statusInput, setStatusInput] = useState("Negeri");
  const [rombelInput, setRombelInput] = useState<number | "">("");
  const [siswaInput, setSiswaInput] = useState<number | "">("");
  const [alamatInput, setAlamatInput] = useState("");
  const [schoolId, setSchoolId] = useState("");

  // Load existing values from the matching school object
  useEffect(() => {
    const matched = schools.find(
      (s) => s.kec.toUpperCase().trim() === currentKec.toUpperCase().trim() &&
             s.nama.toUpperCase().trim() === currentNama.toUpperCase().trim()
    );
    if (matched) {
      setSchoolId(matched.id);
      setStatusInput(matched.status_sekolah || "Negeri");
      setRombelInput(matched.jumlah_rombel !== undefined ? matched.jumlah_rombel : "");
      setSiswaInput(matched.jumlah_siswa !== undefined ? matched.jumlah_siswa : "");
      setAlamatInput(matched.alamat_sekolah || "");
    }
  }, [schools, currentKec, currentNama]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    const payload = {
      id: schoolId || undefined,
      kecamatan: currentKec,
      namaSekolah: currentNama,
      status_sekolah: statusInput,
      jumlah_rombel: rombelInput === "" ? 0 : Number(rombelInput),
      jumlah_siswa: siswaInput === "" ? 0 : Number(siswaInput),
      alamat_sekolah: alamatInput
    };

    try {
      const resp = await fetch("/api/school/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (data.success) {
        setSuccessText("Identitas Sekolah berhasil disimpan & diperbarui!");
        onRefreshSchools();
      } else {
        setErrorText(data.message || "Gagal memperbarui Identitas Sekolah.");
      }
    } catch (err) {
      console.error(err);
      setErrorText("Gagal menyimpan data karena kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#1c1715] rounded-2xl shadow-xl border border-[#2d2420] p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="pb-4 border-b border-[#2d2420]/50">
        <h2 className="text-base font-black uppercase tracking-wider text-white">Identitas Sekolah</h2>
        <p className="text-[10px] text-stone-500 font-bold uppercase mt-0.5 tracking-wider">
          Kelola Informasi Pokok dan Alamat Satuan Pendidikan Anda
        </p>
      </div>

      {errorText && (
        <div className="p-3.5 bg-red-950/20 text-red-400 border border-red-900/40 text-xs font-semibold rounded-xl animate-shake">
          {errorText}
        </div>
      )}

      {successText && (
        <div className="p-3.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 text-xs font-semibold rounded-xl">
          {successText}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Nama Sekolah (Readonly) */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Nama Sekolah</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-550">
              <Building className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={currentNama}
              disabled
              className="w-full bg-[#13100e]/40 border border-[#2d2420]/60 text-stone-400 rounded-lg pl-10 pr-3 py-2.5 text-xs font-bold uppercase cursor-not-allowed"
            />
          </div>
          <span className="text-[9px] text-stone-500 font-semibold mt-1 block">Nama sekolah terisi otomatis sesuai dengan akun login Anda.</span>
        </div>

        {/* Kecamatan (Readonly) */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Kecamatan</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-550">
              <Landmark className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={currentKec}
              disabled
              className="w-full bg-[#13100e]/40 border border-[#2d2420]/60 text-stone-400 rounded-lg pl-10 pr-3 py-2.5 text-xs font-bold uppercase cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Sekolah */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Status Sekolah</label>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              className="w-full bg-[#13100e] border border-[#2d2420] text-stone-200 rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-bold cursor-pointer"
            >
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>

          {/* Jumlah Rombel */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Jumlah Rombel</label>
            <input
              type="number"
              min={0}
              required
              value={rombelInput}
              onChange={(e) => {
                const val = e.target.value;
                setRombelInput(val === "" ? "" : Number(val));
              }}
              className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold"
              placeholder="Contoh: 6"
            />
          </div>

          {/* Jumlah Siswa */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Jumlah Siswa</label>
            <input
              type="number"
              min={0}
              required
              value={siswaInput}
              onChange={(e) => {
                const val = e.target.value;
                setSiswaInput(val === "" ? "" : Number(val));
              }}
              className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold"
              placeholder="Contoh: 120"
            />
          </div>
        </div>

        {/* Alamat Sekolah */}
        <div>
          <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Alamat Sekolah</label>
          <textarea
            value={alamatInput}
            onChange={(e) => setAlamatInput(e.target.value)}
            rows={4}
            required
            className="w-full bg-[#13100e] border border-[#2d2420] text-white rounded-lg p-2.5 text-xs focus:border-[#f25c05]/50 font-semibold"
            placeholder="Tuliskan alamat lengkap sekolah beserta jalan, desa/kelurahan, dan kode pos..."
          />
        </div>

        {/* Submit */}
        <div className="pt-2 border-t border-[#2d2420]/30">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f25c05] hover:bg-[#de5203] font-extrabold uppercase tracking-widest text-white py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#f25c05]/10 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan Identitas Sekolah</span>
          </button>
        </div>
      </form>
    </div>
  );
};
