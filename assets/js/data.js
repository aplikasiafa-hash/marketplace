/* =====================================================================
 * data.js — pemuat katalog dari GitHub, sekali unduh lalu dipakai terus
 *
 * Cara kerja:
 *  1. Cek data/versi.json (berkas sangat kecil, ±80 byte). Pengecekan ini
 *     pun hanya dilakukan sekali tiap APP_CONFIG.menitCekVersi.
 *  2. Bila versi sama dengan yang tersimpan di perangkat, katalog diambil
 *     dari IndexedDB — nol byte unduhan.
 *  3. Bila berbeda, data/db.js diunduh sekali, lalu disimpan lagi.
 *  4. Gambar dilayani service worker dengan strategi cache-first, jadi satu
 *     foto hanya pernah diunduh satu kali seumur pemasangan.
 * ===================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const K_DATA  = "katalog";
  const K_VERSI = "pp_versi_katalog";
  const K_CEK   = "pp_cek_terakhir";

  function muatSkrip(url) {
    return new Promise(function (ok, gagal) {
      const s = document.createElement("script");
      s.src = url;
      s.onload = function () { s.remove(); ok(window.__DB__); };
      s.onerror = function () { s.remove(); gagal(new Error("Gagal mengunduh katalog.")); };
      document.head.appendChild(s);
    });
  }

  async function versiServer() {
    const res = await fetch(C.urlVersi + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("versi tidak terbaca");
    return (await res.json()).versi;
  }

  window.Katalog = {
    data: null,

    /** muat(paksa) → objek katalog */
    muat: async function (paksa) {
      if (Katalog.data && !paksa) return Katalog.data;

      const tersimpan   = await ambilLokal(K_DATA);
      const versiLokal  = localStorage.getItem(K_VERSI);
      const cekTerakhir = Number(localStorage.getItem(K_CEK) || 0);
      const belumWaktunya = Date.now() - cekTerakhir < C.menitCekVersi * 60000;

      // Jalur tercepat: masih segar, pakai yang ada tanpa menyentuh jaringan.
      if (tersimpan && versiLokal && belumWaktunya && !paksa) {
        Katalog.data = tersimpan;
        return tersimpan;
      }

      let versiBaru = null;
      try {
        versiBaru = await versiServer();
        localStorage.setItem(K_CEK, String(Date.now()));
      } catch (e) {
        // Tidak ada internet: pakai data lama bila ada.
        if (tersimpan) {
          Katalog.data = tersimpan;
          toast("Mode luring — menampilkan data tersimpan.", "info");
          return tersimpan;
        }
        throw new Error("Tidak ada koneksi dan belum ada data tersimpan.");
      }

      if (tersimpan && versiBaru === versiLokal && !paksa) {
        Katalog.data = tersimpan;
        return tersimpan;
      }

      const segar = await muatSkrip(C.urlData + "?v=" + encodeURIComponent(versiBaru));
      if (!segar) throw new Error("Berkas katalog kosong.");

      await simpanLokal(K_DATA, segar);
      localStorage.setItem(K_VERSI, segar.versi || versiBaru);
      Katalog.data = segar;
      return segar;
    },

    /* ── Pembantu kueri (semuanya jalan di perangkat) ───────────────── */
    produk: function (saring) {
      let d = (Katalog.data && Katalog.data.produk) || [];
      saring = saring || {};
      if (saring.kategori) d = d.filter(function (p) { return p.kategori_id === saring.kategori; });
      if (saring.toko)     d = d.filter(function (p) { return p.toko_id === saring.toko; });
      if (saring.unggulan) d = d.filter(function (p) { return p.unggulan === true; });
      if (saring.cari) {
        const q = saring.cari.toLowerCase();
        d = d.filter(function (p) {
          return String(p.nama).toLowerCase().indexOf(q) >= 0 ||
                 (p.tag || []).join(" ").toLowerCase().indexOf(q) >= 0;
        });
      }
      if (saring.urut === "murah")  d = d.slice().sort(function (a, b) { return a.harga - b.harga; });
      if (saring.urut === "mahal")  d = d.slice().sort(function (a, b) { return b.harga - a.harga; });
      if (saring.urut === "laris")  d = d.slice().sort(function (a, b) { return (b.terjual || 0) - (a.terjual || 0); });
      return d;
    },

    cariProduk: function (id) {
      return (Katalog.data.produk || []).filter(function (p) { return p.id === id; })[0];
    },
    kategori: function () { return (Katalog.data && Katalog.data.kategori) || []; },
    toko: function (id) {
      return ((Katalog.data && Katalog.data.toko) || []).filter(function (t) { return t.toko_id === id; })[0];
    },
    ongkir: function (kecamatan) {
      const baris = ((Katalog.data && Katalog.data.ongkir) || [])
        .filter(function (o) { return o.kecamatan === kecamatan; })[0];
      if (baris) return baris;
      const bawaan = Number((Katalog.data.pengaturan || {}).ongkir_default || 10000);
      return { kecamatan: kecamatan, ongkir: bawaan, tambahan_per_kg: 0, estimasi: "1 hari" };
    },
    atur: function (kunci, bawaan) {
      const v = (Katalog.data && Katalog.data.pengaturan || {})[kunci];
      return v === undefined || v === "" ? bawaan : v;
    },

    /** Gambar pertama produk, dengan cadangan gambar kosong. */
    gambar: function (produk, indeks) {
      const g = (produk && produk.gambar) || [];
      return g[indeks || 0] || "assets/img/kosong.svg";
    }
  };
})();
