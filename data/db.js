/* Contoh isi data/db.js — berkas ini ditimpa otomatis oleh Apps Script
   setiap kali Anda menekan "Kirim SEMUA data ke GitHub". */
window.__DB__ = {
  "versi": "20261014-0001",
  "diperbarui": "2026-10-14 10:00:00",
  "pengaturan": {
    "nama_aplikasi": "Pasar Online Pinrang",
    "kota": "Pinrang",
    "wa_cs": "6281234567890",
    "min_belanja": "10000",
    "ongkir_default": "8000",
    "jam_operasional": "08:00-21:00",
    "metode_bayar": "COD,Transfer",
    "pengumuman": "Gratis ongkir untuk belanja di atas Rp 100.000 wilayah Watang Sawitto.",
    "versi_minimal_app": "1.0.0"
  },
  "kategori": [
    { "kategori_id": "KAT-01", "nama": "Sembako", "ikon": "🍚", "urutan": 1, "aktif": true },
    { "kategori_id": "KAT-02", "nama": "Sayur & Buah", "ikon": "🥬", "urutan": 2, "aktif": true },
    { "kategori_id": "KAT-03", "nama": "Ikan & Daging", "ikon": "🐟", "urutan": 3, "aktif": true },
    { "kategori_id": "KAT-04", "nama": "Siap Saji", "ikon": "🍛", "urutan": 4, "aktif": true },
    { "kategori_id": "KAT-05", "nama": "Rumah Tangga", "ikon": "🧴", "urutan": 5, "aktif": true },
    { "kategori_id": "KAT-06", "nama": "Pertanian", "ikon": "🌾", "urutan": 6, "aktif": true },
    { "kategori_id": "KAT-07", "nama": "Elektronik", "ikon": "🔌", "urutan": 7, "aktif": true },
    { "kategori_id": "KAT-08", "nama": "Lainnya", "ikon": "📦", "urutan": 8, "aktif": true }
  ],
  "toko": [
    {
      "toko_id": "TK-001", "nama_toko": "Toko Berkah Jaya", "pemilik": "Hj. Rahmawati",
      "hp": "6281340000001", "alamat": "Jl. Jend. Sudirman No. 12",
      "kecamatan": "Watang Sawitto", "desa": "Maccorawalie",
      "lat": -3.7936, "lng": 119.6525, "logo": "",
      "jam_buka": "07:00", "jam_tutup": "21:00", "rating": 4.8, "aktif": true
    },
    {
      "toko_id": "TK-002", "nama_toko": "Tani Makmur Pinrang", "pemilik": "Andi Suriadi",
      "hp": "6281340000002", "alamat": "Jl. Poros Pinrang–Rappang Km 4",
      "kecamatan": "Paleteang", "desa": "Benteng Sawitto",
      "lat": -3.7812, "lng": 119.6611, "logo": "",
      "jam_buka": "08:00", "jam_tutup": "17:00", "rating": 4.6, "aktif": true
    }
  ],
  "ongkir": [
    { "kecamatan": "Watang Sawitto", "zona": "A", "ongkir": 5000,  "tambahan_per_kg": 2000, "estimasi": "1-3 jam", "aktif": true },
    { "kecamatan": "Paleteang",      "zona": "A", "ongkir": 6000,  "tambahan_per_kg": 2000, "estimasi": "1-3 jam", "aktif": true },
    { "kecamatan": "Tiroang",        "zona": "B", "ongkir": 9000,  "tambahan_per_kg": 2500, "estimasi": "3-6 jam", "aktif": true },
    { "kecamatan": "Mattiro Bulu",   "zona": "B", "ongkir": 10000, "tambahan_per_kg": 2500, "estimasi": "3-6 jam", "aktif": true },
    { "kecamatan": "Lanrisang",      "zona": "B", "ongkir": 11000, "tambahan_per_kg": 2500, "estimasi": "3-6 jam", "aktif": true },
    { "kecamatan": "Patampanua",     "zona": "C", "ongkir": 14000, "tambahan_per_kg": 3000, "estimasi": "1 hari",  "aktif": true },
    { "kecamatan": "Mattiro Sompe",  "zona": "C", "ongkir": 14000, "tambahan_per_kg": 3000, "estimasi": "1 hari",  "aktif": true },
    { "kecamatan": "Cempa",          "zona": "C", "ongkir": 15000, "tambahan_per_kg": 3000, "estimasi": "1 hari",  "aktif": true },
    { "kecamatan": "Suppa",          "zona": "C", "ongkir": 15000, "tambahan_per_kg": 3000, "estimasi": "1 hari",  "aktif": true },
    { "kecamatan": "Duampanua",      "zona": "C", "ongkir": 16000, "tambahan_per_kg": 3000, "estimasi": "1 hari",  "aktif": true },
    { "kecamatan": "Lembang",        "zona": "D", "ongkir": 22000, "tambahan_per_kg": 3500, "estimasi": "1-2 hari","aktif": true },
    { "kecamatan": "Batulappa",      "zona": "D", "ongkir": 24000, "tambahan_per_kg": 3500, "estimasi": "1-2 hari","aktif": true }
  ],
  "banner": [],
  "produk": [
    {
      "id": "PRD-0001", "nama": "Beras Pinrang Premium 5 kg", "slug": "beras-pinrang-premium-5kg",
      "kategori_id": "KAT-01", "toko_id": "TK-001",
      "deskripsi": "Beras lokal Pinrang kualitas premium, pulen dan wangi. Kemasan 5 kg.",
      "harga": 68000, "harga_coret": 75000, "stok": 40, "satuan": "karung",
      "berat_gram": 5000, "kondisi": "baru",
      "gambar": [], "tag": ["beras", "sembako", "lokal"],
      "terjual": 0, "rating": 5, "unggulan": true, "aktif": true,
      "dibuat": "2026-10-14 09:00:00", "diubah": "2026-10-14 09:00:00"
    },
    {
      "id": "PRD-0002", "nama": "Ikan Bandeng Segar 1 kg", "slug": "ikan-bandeng-segar-1kg",
      "kategori_id": "KAT-03", "toko_id": "TK-001",
      "deskripsi": "Bandeng tambak Pinrang, dipanen pagi hari dan langsung diantar.",
      "harga": 35000, "stok": 25, "satuan": "kg",
      "berat_gram": 1000, "kondisi": "baru",
      "gambar": [], "tag": ["ikan", "bandeng", "segar"],
      "terjual": 0, "rating": 5, "unggulan": true, "aktif": true,
      "dibuat": "2026-10-14 09:00:00", "diubah": "2026-10-14 09:00:00"
    },
    {
      "id": "PRD-0003", "nama": "Pupuk Urea 50 kg", "slug": "pupuk-urea-50kg",
      "kategori_id": "KAT-06", "toko_id": "TK-002",
      "deskripsi": "Pupuk urea bersubsidi untuk sawah. Harga per karung 50 kg.",
      "harga": 145000, "stok": 12, "satuan": "karung",
      "berat_gram": 50000, "kondisi": "baru",
      "gambar": [], "tag": ["pupuk", "pertanian", "urea"],
      "terjual": 0, "rating": 5, "aktif": true,
      "dibuat": "2026-10-14 09:00:00", "diubah": "2026-10-14 09:00:00"
    }
  ]
};
