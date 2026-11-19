/* =====================================================================
   PENGATURAN — hanya file ini yang perlu diubah oleh admin
   ===================================================================== */
self.CONFIG = {
  // Kode singkat aplikasi (huruf kecil, tanpa spasi). Harus BERBEDA untuk tiap Bureau
  // agar riwayat dan simpanan offline di HP tidak tercampur.
  ID: "mpd",
  // Nama Bureau, tampil di aplikasi dan PDF.
  BIRO: "Mine Plan & Development Bureau",
  // Opsional: URL web app Apps Script (berakhiran /exec) agar data juga masuk ke rekap pusat.
  // Biarkan kosong bila checklist cukup disimpan di HP dan diunduh sebagai PDF.
  FLOW_URL: "",
  // Harus sama dengan KUNCI_FORM di Code.gs.
  KUNCI: "gc123",
  // true = tanda tangan kedua pengawas wajib sebelum bisa kirim.
  WAJIB_TTD_PENGAWAS: true,
  // Pilihan departemen. Isi satu saja bila aplikasi ini khusus satu departemen.
  DEPARTEMEN: ["Mine Survey", "Mine Plan", "Mine Development", "Geotech"],
  // Pilihan shift
  SHIFT: ["Shift 1", "Shift 2", "Shift 3", "Long Shift 1", "Long Shift 2", "Non-shift"],
  // Isi awal kolom Perusahaan / Unit
  UNIT_DEFAULT: "UBPE Pongkor"
};
