/* =====================================================================
 * cs.js — Aplikasi Customer Service
 * Tugas utama: menyetujui atau menolak permintaan & pesanan dari pembeli,
 * mengaktifkan akun baru, dan menjawab keluhan.
 * ===================================================================== */
(function () {

  const MENU = [
    { id: "masuk",      ikon: "🔔", teks: "Perlu Aksi" },
    { id: "berjalan",   ikon: "🚚", teks: "Berjalan" },
    { id: "permintaan", ikon: "📝", teks: "Permintaan" },
    { id: "pengguna",   ikon: "👥", teks: "Pengguna" }
  ];

  function pindah(id, wadah) {
    ({ masuk: vMasuk, berjalan: vBerjalan, permintaan: vPermintaan, pengguna: vPengguna }[id])(wadah);
  }

  /* ── Pesanan yang menunggu persetujuan ────────────────────────────── */
  async function vMasuk(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("status", "==", "menunggu_cs")
        .orderBy("dibuat", "asc").limit(40).get();

      if (cuplik.empty) return kosong(wadah, "✅", "Tidak ada pesanan yang menunggu persetujuan");

      wadah.innerHTML =
        '<p class="mini" style="margin:0 0 10px">' + cuplik.size + ' pesanan menunggu diperiksa</p>' +
        cuplik.docs.map(function (d) {
          return kartuPesanan(d.id, d.data(),
            '<button class="btn abu kecil" data-lihat="' + d.id + '">Rincian</button>' +
            '<button class="btn merah kecil" data-tolak="' + d.id + '">Tolak</button>' +
            '<button class="btn kecil" data-setuju="' + d.id + '">Setujui</button>');
        }).join("");

      wadah.addEventListener("click", async function (e) {
        const lihat  = e.target.closest("[data-lihat]");
        const setuju = e.target.closest("[data-setuju]");
        const tolak  = e.target.closest("[data-tolak]");

        if (lihat) {
          const o = cuplik.docs.filter(function (d) { return d.id === lihat.dataset.lihat; })[0].data();
          lembarBaru(o.kode || "Pesanan", rincianPesanan(o) +
            '<div class="baris-tombol" style="margin-top:16px">' +
            '<a class="btn garis kecil" style="flex:1;text-align:center" href="https://wa.me/' +
              esc(String(o.hp || "").replace(/^0/, "62")) + '">Chat pembeli</a></div>');
        }

        if (setuju) {
          if (!await konfirmasi("Setujui pesanan ini? Stok akan disiapkan toko.")) return;
          await prosesPesanan(setuju.dataset.setuju, "disetujui");
          pindahHalaman("masuk");
        }

        if (tolak) {
          const alasan = prompt("Alasan penolakan (akan dilihat pembeli):", "Stok tidak tersedia");
          if (alasan === null) return;
          await prosesPesanan(tolak.dataset.tolak, "ditolak", { alasan_tolak: alasan });
          pindahHalaman("masuk");
        }
      });
    } catch (e) {
      kosong(wadah, "⚠️", e.message);
    }
  }

  async function prosesPesanan(id, status, tambahan) {
    muat(true, "Memproses…");
    try {
      await ubahStatusPesanan(id, status, Object.assign({
        cs_uid: Auth.profil.uid, cs_email: Auth.profil.email,
        diperiksa: firebase.firestore.FieldValue.serverTimestamp()
      }, tambahan || {}));
      toast("Pesanan " + labelStatus(status).toLowerCase(), "sukses");
    } catch (e) { toast(e.message, "galat"); }
    muat(false);
  }

  /* ── Pesanan berjalan ─────────────────────────────────────────────── */
  async function vBerjalan(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("status", "in", ["disetujui", "diproses", "dikirim"])
        .orderBy("dibuat", "desc").limit(40).get();

      if (cuplik.empty) return kosong(wadah, "🚚", "Tidak ada pesanan berjalan");

      wadah.innerHTML = cuplik.docs.map(function (d) {
        const o = d.data();
        let tombol = '<button class="btn abu kecil" data-lihat="' + d.id + '">Rincian</button>';
        if (o.status === "disetujui")
          tombol += '<button class="btn kecil" data-siap="' + d.id + '">Barang Siap</button>';
        return kartuPesanan(d.id, o, tombol);
      }).join("");

      wadah.addEventListener("click", async function (e) {
        const lihat = e.target.closest("[data-lihat]");
        const siap  = e.target.closest("[data-siap]");
        if (lihat) {
          const o = cuplik.docs.filter(function (d) { return d.id === lihat.dataset.lihat; })[0].data();
          lembarBaru(o.kode || "Pesanan", rincianPesanan(o));
        }
        if (siap) {
          if (!await konfirmasi("Tandai barang siap diambil kurir?")) return;
          await prosesPesanan(siap.dataset.siap, "diproses");
          pindahHalaman("berjalan");
        }
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Permintaan pembeli ───────────────────────────────────────────── */
  async function vPermintaan(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("permintaan")
        .where("status", "==", "menunggu")
        .orderBy("dibuat", "desc").limit(40).get();

      if (cuplik.empty) return kosong(wadah, "📝", "Tidak ada permintaan baru");

      wadah.innerHTML = cuplik.docs.map(function (d) {
        const r = d.data();
        return '<div class="kartu">' +
          '<div class="antar"><span class="tebal">' + esc(jenisPermintaan(r.tipe)) + '</span>' +
          '<span class="label menunggu">Menunggu</span></div>' +
          '<div class="mini" style="margin:5px 0 8px">' + esc(tanggal(r.dibuat)) + '</div>' +
          '<div>' + esc(r.nama || r.email || "-") + '</div>' +
          '<div class="mini">' + esc(r.pesan || r.keterangan || "-") + '</div>' +
          '<div class="baris-tombol" style="margin-top:12px">' +
            '<button class="btn merah kecil" data-tolak="' + d.id + '">Tolak</button>' +
            '<button class="btn kecil" data-setuju="' + d.id + '">Setujui</button>' +
          '</div></div>';
      }).join("");

      wadah.addEventListener("click", async function (e) {
        const setuju = e.target.closest("[data-setuju]");
        const tolak  = e.target.closest("[data-tolak]");
        const id = (setuju || tolak) && (setuju || tolak).dataset[setuju ? "setuju" : "tolak"];
        if (!id) return;
        const status = setuju ? "disetujui" : "ditolak";
        if (!await konfirmasi("Tandai permintaan sebagai " + status + "?")) return;

        muat(true, "Memproses…");
        try {
          await fb.db.collection("permintaan").doc(id).update({
            status: status, cs_uid: Auth.profil.uid, cs_email: Auth.profil.email,
            diproses: firebase.firestore.FieldValue.serverTimestamp()
          });
          await fb.db.collection("log_transaksi").add({
            tipe: "permintaan", permintaan_id: id, status: status,
            uid: Auth.profil.uid, waktu: firebase.firestore.FieldValue.serverTimestamp()
          });
          toast("Permintaan " + status, "sukses");
        } catch (err) { toast(err.message, "galat"); }
        muat(false);
        pindahHalaman("permintaan");
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  function jenisPermintaan(t) {
    return {
      daftar_toko: "Pendaftaran Toko", refund: "Pengembalian Dana",
      batal: "Pembatalan Pesanan", aktivasi: "Aktivasi Akun", keluhan: "Keluhan"
    }[t] || t || "Permintaan";
  }

  /* ── Pengguna ─────────────────────────────────────────────────────── */
  async function vPengguna(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pengguna").orderBy("dibuat", "desc").limit(50).get();
      if (cuplik.empty) return kosong(wadah, "👥", "Belum ada pengguna");

      wadah.innerHTML =
        '<div class="cari"><input id="cari-pengguna" placeholder="Cari nama atau email…"></div>' +
        '<div id="daftar-pengguna"></div>';

      const semua = cuplik.docs.map(function (d) { return { id: d.id, d: d.data() }; });

      function gambarkan(q) {
        q = (q || "").toLowerCase();
        const hasil = semua.filter(function (u) {
          return !q || String(u.d.nama || "").toLowerCase().indexOf(q) >= 0 ||
                 String(u.d.email || "").toLowerCase().indexOf(q) >= 0;
        });
        $("#daftar-pengguna").innerHTML = hasil.map(function (u) {
          return '<div class="kartu" style="padding:12px">' +
            '<div class="antar"><div><div class="tebal">' + esc(u.d.nama || "-") + '</div>' +
            '<div class="mini">' + esc(u.d.email || "-") + ' · ' + esc(u.d.hp || "-") + '</div>' +
            '<div class="mini">Peran: ' + esc(u.d.peran || "user") + '</div></div>' +
            '<button class="btn ' + (u.d.aktif === false ? "" : "abu ") + 'kecil" data-aktif="' + u.id +
            '" data-nilai="' + (u.d.aktif === false) + '">' +
            (u.d.aktif === false ? "Aktifkan" : "Nonaktif") + '</button></div></div>';
        }).join("") || '<div class="kosong">Tidak ditemukan</div>';
      }
      gambarkan("");

      $("#cari-pengguna").addEventListener("input", function (e) { gambarkan(e.target.value.trim()); });

      $("#daftar-pengguna").addEventListener("click", async function (e) {
        const b = e.target.closest("[data-aktif]");
        if (!b) return;
        const jadi = b.dataset.nilai === "true";
        if (!await konfirmasi((jadi ? "Aktifkan" : "Nonaktifkan") + " akun ini?")) return;
        muat(true, "Memproses…");
        try {
          await fb.db.collection("pengguna").doc(b.dataset.aktif).update({ aktif: jadi });
          toast("Berhasil diperbarui", "sukses");
        } catch (err) { toast(err.message, "galat"); }
        muat(false);
        pindahHalaman("pengguna");
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Mulai ────────────────────────────────────────────────────────── */
  Auth.mulai({
    peran: ["cs", "admin"],
    judul: "Customer Service",
    saatMasuk: async function (profil) {
      muat(true, "Memuat…");
      try { await Katalog.muat(); } catch (e) {}
      muat(false);
      rangkaAplikasi("CS · " + (profil.nama || profil.email), MENU, pindah);
    }
  });
})();
