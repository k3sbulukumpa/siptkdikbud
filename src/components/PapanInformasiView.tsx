import React, { useState, useEffect, useRef } from "react";
import { UserSession } from "../types";
import { 
  Megaphone, Plus, Trash2, Edit3, Paperclip, Download, X, 
  Clock, AlertTriangle, FileText, CheckCircle2, UploadCloud
} from "lucide-react";

export interface InfoItem {
  id?: string;
  judul: string;
  konten: string;
  attachment_name?: string;
  attachment_data?: string;
  created_at?: string;
}

export const isImageAttachment = (filename: string, data: string): boolean => {
  if (!filename && !data) return false;
  const name = (filename || "").toLowerCase();
  const d = (data || "").toLowerCase();
  return (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".gif") ||
    name.endsWith(".webp") ||
    name.endsWith(".svg") ||
    d.startsWith("data:image/") ||
    d.startsWith("image/")
  );
};

export const getDirectImageUrl = (url: string): string => {
  if (!url) return "";
  // Check if it's a Google Drive URL
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    // Format: https://drive.google.com/file/d/FILE_ID/view...
    const fileIdMatch = url.match(/\/file\/d\/([^/&?]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
    // Format: https://drive.google.com/open?id=FILE_ID or https://docs.google.com/uc?id=FILE_ID
    const openIdMatch = url.match(/[?&]id=([^&?]+)/);
    if (openIdMatch && openIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${openIdMatch[1]}`;
    }
  }
  return url;
};

interface PapanInformasiViewProps {
  session: UserSession;
}

export const PapanInformasiView: React.FC<PapanInformasiViewProps> = ({ session }) => {
  const isDinas = session.role === "Admin Dinas";
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InfoItem | null>(null);
  const [formJudul, setFormJudul] = useState("");
  const [formKonten, setFormKonten] = useState("");
  interface Attachment {
    name: string;
    data: string;
  }

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Parser for multiple or backward compatible attachments
  const parseAttachments = (name?: string, data?: string): Attachment[] => {
    if (!data) return [];
    const trimmed = data.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            name: item.name || "Berkas Lampiran",
            data: item.data || ""
          }));
        }
      } catch (e) {
        // Fallback
      }
    }
    if (name && data) {
      return [{ name, data }];
    }
    return [];
  };
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Delete Confirmation state
  const [itemToDelete, setItemToDelete] = useState<InfoItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch announcements
  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/informasi/list");
      if (!resp.ok) throw new Error("Gagal memuat papan informasi");
      const data = await resp.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Gagal terhubung dengan server untuk mengambil pengumuman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Format timestamp into Indonesian full day, date & time (WITA)
  const formatTimestampIndo = (isoStr?: string): string => {
    if (!isoStr) return "-";
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${dayName}, ${day} ${monthName} ${year} — Pukul ${hours}:${minutes} WITA`;
    } catch (e) {
      return isoStr;
    }
  };

  // Handle download
  const handleDownload = (base64Data: string, fileName: string) => {
    try {
      if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
        // Jika berupa link Google Drive, buka di tab baru
        const link = document.createElement("a");
        link.href = base64Data;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Jika berupa raw base64 data, lakukan download browser langsung
        const link = document.createElement("a");
        link.href = base64Data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert("Gagal mengunduh file lampiran.");
    }
  };

  // Convert uploaded file to base64
  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`Ukuran file "${file.name}" terlalu besar! Batas maksimum adalah 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      setAttachments(prev => [...prev, { name: file.name, data: base64Data }]);
    };
    reader.readAsDataURL(file);
  };

  // Handle manual file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        processFile(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Drag Events for file upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop Event for file upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        processFile(file);
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Clear or remove an individual attachment
  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Open Form Modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormJudul("");
    setFormKonten("");
    setAttachments([]);
    setShowFormModal(true);
  };

  // Open Form Modal for Edit
  const handleOpenEdit = (item: InfoItem) => {
    setEditingItem(item);
    setFormJudul(item.judul);
    setFormKonten(item.konten);
    setAttachments(parseAttachments(item.attachment_name, item.attachment_data));
    setShowFormModal(true);
  };

  // Handle Save Form (Add or Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formKonten.trim()) {
      alert("Mohon lengkapi judul dan konten pengumuman.");
      return;
    }

    setSaving(true);
    setUploadStatus("Mempersiapkan berkas lampiran...");

    const uploadedAttachments: Attachment[] = [];

    try {
      // Loop dan unggah berkas satu per satu agar tidak melebihi batas ukuran payload
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.data.startsWith("data:")) {
          setUploadStatus(`Mengunggah file (${i + 1}/${attachments.length}): ${att.name}...`);
          const uploadResp = await fetch("/api/drive/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: att.name, data: att.data })
          });
          const uploadRes = await uploadResp.json();
          if (!uploadRes.success) {
            throw new Error(uploadRes.message || `Gagal mengunggah file "${att.name}"`);
          }
          uploadedAttachments.push({ name: att.name, data: uploadRes.url });
        } else {
          // File sudah pernah diunggah sebelumnya (berupa link URL)
          uploadedAttachments.push(att);
        }
      }

      setUploadStatus("Menyimpan pengumuman...");
      const payload: InfoItem = {
        judul: formJudul,
        konten: formKonten,
        attachment_name: uploadedAttachments.length > 0 ? uploadedAttachments.map(a => a.name).join(", ") : "",
        attachment_data: uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : "",
      };

      if (editingItem) {
        payload.id = editingItem.id;
        payload.created_at = editingItem.created_at; // Keep original timestamp
      } else {
        payload.created_at = new Date().toISOString(); // New timestamp for new item
      }

      const resp = await fetch("/api/informasi/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const res = await resp.json();
      if (res.success) {
        setShowFormModal(false);
        fetchItems();
      } else {
        alert(res.message || "Gagal menyimpan pengumuman.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Hubungan server terputus.");
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const resp = await fetch("/api/informasi/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToDelete.id })
      });
      const res = await resp.json();
      if (res.success) {
        setItemToDelete(null);
        fetchItems();
      } else {
        alert(res.message || "Gagal menghapus pengumuman.");
      }
    } catch (err) {
      console.error(err);
      alert("Hubungan server terputus.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#d4cdcb]" id="papan-informasi-section">
      {/* Upper header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2d2420]/30 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#f25c05]" />
            <span>Papan Informasi &amp; Edaran</span>
          </h2>
          <p className="text-xs text-stone-550 font-semibold mt-1">
            Daftar instruksi, pengumuman, dan edaran resmi Dinas Pendidikan dan Kebudayaan Kabupaten Bulukumba.
          </p>
        </div>

        {isDinas && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4.5 py-2 bg-[#f25c05] hover:bg-[#de5203] text-white rounded-lg text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-[#f25c05]/10 hover:shadow-none transition cursor-pointer self-start sm:self-auto"
            id="btn-tambah-informasi"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Informasi</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 flex items-center gap-3 text-xs leading-relaxed">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-stone-500 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#f25c05] animate-spin mx-auto"></div>
          <p className="text-xs font-semibold">Memuat data papan informasi...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center border border-[#2d2420] bg-[#1c1715]/40 rounded-2xl p-8 max-w-md mx-auto space-y-4" id="papan-informasi-empty">
          <div className="w-12 h-12 rounded-full bg-[#27211e] flex items-center justify-center text-stone-600 mx-auto">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white tracking-wide">Belum Ada Informasi</h4>
            <p className="text-xs text-stone-550 mt-1 leading-relaxed">
              Saat ini belum ada pengumuman atau instruksi yang dipublikasikan di papan informasi ini.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6" id="papan-informasi-list">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="bg-[#1c1715] rounded-2xl border border-[#2d2420] p-6 shadow-xl flex flex-col justify-between relative overflow-hidden group"
              id={`info-card-${item.id}`}
            >
              {/* Copper accent lighting edge */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f25c05]"></div>

              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-grow pl-2 md:pl-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold text-[#f25c05] uppercase tracking-widest bg-[#f25c05]/10 px-2 py-0.5 rounded border border-[#f25c05]/20 flex items-center gap-1">
                      <Megaphone className="h-3 w-3" />
                      <span>Pengumuman</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-stone-600" />
                      <span>{formatTimestampIndo(item.created_at)}</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    {item.judul}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal whitespace-pre-line break-words">
                    {item.konten}
                  </p>

                  {item.attachment_data && (
                    <div className="space-y-4">
                      {/* Image attachments rendered as beautiful inline preview images */}
                      {parseAttachments(item.attachment_name, item.attachment_data)
                        .filter(attachment => isImageAttachment(attachment.name, attachment.data))
                        .map((attachment, idx) => (
                          <div key={`img-${idx}`} className="mt-2 max-w-full sm:max-w-md overflow-hidden rounded-xl border border-[#2d2420]/80 bg-[#141110] relative group">
                            <img
                              src={getDirectImageUrl(attachment.data)}
                              alt=""
                              className="w-full h-auto max-h-[350px] object-contain rounded-xl cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                              onClick={() => handleDownload(attachment.data, attachment.name)}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => handleDownload(attachment.data, attachment.name)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#f25c05] hover:bg-[#de5203] text-white rounded-lg font-extrabold uppercase text-[9px] cursor-pointer shadow-md transition"
                              >
                                <Download className="h-3 w-3" />
                                <span>Unduh</span>
                              </button>
                            </div>
                          </div>
                        ))}

                      {/* Non-image attachments shown as download blocks */}
                      {parseAttachments(item.attachment_name, item.attachment_data)
                        .filter(attachment => !isImageAttachment(attachment.name, attachment.data))
                        .length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          {parseAttachments(item.attachment_name, item.attachment_data)
                            .filter(attachment => !isImageAttachment(attachment.name, attachment.data))
                            .map((attachment, idx) => (
                              <div key={`file-${idx}`} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#231a17]/50 border border-[#2d2420]/80 max-w-full">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-8 h-8 rounded-lg bg-[#2c211e] flex items-center justify-center text-[#f25c05] flex-shrink-0 border border-[#3e2e26]/30">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-black text-stone-200 truncate max-w-[180px] sm:max-w-[300px]" title={attachment.name}>
                                      {attachment.name}
                                    </p>
                                    <span className="text-[9px] text-stone-550 font-bold block uppercase tracking-wide mt-0.5">Lampiran Dokumen</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleDownload(attachment.data, attachment.name)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c211e] hover:bg-[#342a26] text-[#f25c05] border border-[#f25c05]/25 rounded-lg text-xs font-bold transition cursor-pointer flex-shrink-0"
                                  title="Unduh berkas lampiran"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Unduh</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isDinas && (
                  <div className="flex items-center gap-1.5 self-end md:self-start md:ml-4">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 bg-[#27211e] text-stone-300 hover:text-[#f25c05] hover:bg-stone-800 border border-[#2d2420] rounded-lg transition cursor-pointer"
                      title="Edit pengumuman"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 bg-red-950/15 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/30 rounded-lg transition cursor-pointer"
                      title="Hapus pengumuman"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl overflow-hidden bg-[#181412] border border-[#2d2420] text-stone-100 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white transition p-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 text-[#f25c05] mb-5">
              <Megaphone className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-base font-black uppercase tracking-wider">
                {editingItem ? "Edit Informasi" : "Buat Informasi Baru"}
              </h3>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-widest mb-1.5">Judul Informasi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Edaran Pengumpulan Berkas Sertifikasi Triwulan I"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#f25c05]/50 font-semibold placeholder:text-stone-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-widest mb-1.5">Konten / Isi Informasi *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Tuliskan detail informasi, instruksi, atau edaran secara jelas disini..."
                  value={formKonten}
                  onChange={(e) => setFormKonten(e.target.value)}
                  className="w-full bg-[#13100e] border border-[#2d2420] rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-[#f25c05]/50 font-normal leading-relaxed placeholder:text-stone-600"
                />
              </div>

              {/* Advanced Drag and Drop File Upload Component */}
              <div>
                <label className="block text-[10px] font-extrabold text-stone-500 uppercase tracking-widest mb-1.5">Lampiran Dokumen (Optional)</label>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#231a17]/40 border border-[#f25c05]/20">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {isImageAttachment(file.name, file.data) ? (
                            <img 
                              src={getDirectImageUrl(file.data)} 
                              alt={file.name} 
                              className="h-10 w-10 rounded-lg object-cover border border-[#2d2420]/80 bg-[#141110] flex-shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <FileText className="h-4.5 w-4.5 text-[#f25c05] flex-shrink-0" />
                          )}
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-stone-200 truncate max-w-[220px] sm:max-w-[340px]">{file.name}</p>
                            <span className="text-[8px] font-extrabold text-stone-550 block uppercase tracking-wider mt-0.5">
                              {isImageAttachment(file.name, file.data) ? "Gambar Lampiran" : "Berkas Terlampir"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="p-1 text-stone-550 hover:text-red-400 transition cursor-pointer"
                          title="Hapus lampiran ini"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-155 ${
                    dragActive 
                      ? "border-[#f25c05] bg-[#f25c05]/5" 
                      : "border-[#2d2420] bg-[#13100e] hover:border-stone-700"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    multiple
                  />
                  <UploadCloud className="h-7 w-7 text-stone-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-stone-300">Tarik berkas kesini atau <span className="text-[#f25c05]">pilih manual</span></p>
                  <p className="text-[9px] text-stone-600 font-semibold mt-1">Mendukung banyak file sekaligus: PDF, Word, Excel, Gambar (Max 5MB/file)</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2d2420]/50 font-sans">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4.5 py-2.5 hover:bg-stone-800 text-stone-400 hover:text-white border border-[#2d2420] text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#f25c05] to-amber-600 hover:from-[#de5203] hover:to-amber-700 disabled:opacity-50 active:scale-[0.98] text-white text-xs font-extrabold uppercase tracking-widest rounded-lg shadow-lg hover:shadow-none transition cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      <span>{uploadStatus || "Menyimpan..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{editingItem ? "Perbarui" : "Publikasikan"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl overflow-hidden bg-[#181412] border border-[#2d2420] text-stone-100 shadow-2xl p-6 relative">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider">Konfirmasi Hapus</h3>
            </div>
            
            <p className="text-xs text-stone-300 leading-relaxed mb-1 font-medium">
              Apakah Anda yakin ingin menghapus pengumuman ini secara permanen?
            </p>
            <div className="my-3.5 p-3 rounded bg-zinc-950/45 border border-[#2d2420]/50">
              <div className="text-xs font-black text-white line-clamp-2">{itemToDelete.judul}</div>
              <div className="text-[10px] text-stone-500 mt-1 font-bold">Dibuat: {formatTimestampIndo(itemToDelete.created_at)}</div>
            </div>

            <p className="text-[11px] text-rose-400 font-bold leading-relaxed mb-5">
              ⚠️ Tindakan ini tidak dapat dibatalkan, data pengumuman beserta file lampiran akan dihapus permanen dari sistem.
            </p>

            <div className="flex items-center justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 hover:bg-stone-800 text-stone-400 hover:text-white border border-[#2d2420] text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-lg hover:shadow-red-950/20 transition cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
