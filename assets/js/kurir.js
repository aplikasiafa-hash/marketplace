/* =====================================================================
 * kurir.js — Aplikasi Kurir
 * Alur: Tersedia → Ambil → Dalam pengiriman → Selesai
 * ===================================================================== */
(function () {

  const MENU = [
    { id: "tersedia", ikon: "📥", teks: "Tersedia" },
    { id: "antar",    ikon: "🛵", teks: "Diantar" },
    { id: "riwayat",  ikon: "📜", teks: "Riwayat" },
    { id: "akun",     ikon: "👤", teks: "Akun" }
  ];

  function pindah(id, wadah) {
    ({ tersedia: vTersedia, antar: vAntar, riwayat: vRiwayat, akun: vAkun }[id])(wadah);
  }

  function tautanPeta(o) {
    return "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent((o.alamat || "") + ", " + (o.kecamatan || "") + ", Pinrang");
  }
  function tautanWa(hp) {
    return "https://wa.me/" + String(hp || "").replace(/\D/g, "").replace(/^0/, "62");
  }

  /* ── Pesanan siap diambil ─────────────────────────────────────────── */
  async function vTersedia(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("status", "==", "diproses")
        .orderBy("dibuat", "asc").limit(30).get();

      const bebas = cuplik.docs.filter(function (d) { return !d.data().kurir_uid; });
      if (!bebas.length) return kosong(wadah, "📥", "Belum ada pesanan siap diambil");

      wadah.innerHTML =
        '<p class="mini" style="margin:0 0 10px">' + bebas.length + ' pesanan siap diambil</p>' +
        bebas.map(function (d) {
          const o = d.data();
          return kartuPesanan(d.id, o,
            '<a class="btn abu kecil" style="flex:1;text-align:center" target="_blank" rel="noopener" href="' +
              esc(tautanPeta(o)) + '">Peta</a>' +
            '<button class="btn kecil" style="flex:1" data-ambil="' + d.id + '">Ambil Tugas</button>');
        }).join("");

      wadah.addEventListener("click", async function (e) {
        const b = e.target.closest("[data-ambil]");
        if (!b) return;
        if (!await konfirmasi("Ambil tugas pengantaran ini?")) return;

        muat(true, "Mengambil tugas…");
        try {
          // kunci sederhana: pastikan belum diambil kurir lain
          const ref = fb.db.collection("pesanan").doc(b.dataset.ambil);
          await fb.db.runTransaction(async function (tx) {
            const d = await tx.get(ref);
            if (!d.exists) throw new Error("Pesanan tidak ditemukan.");
            if (d.data().kurir_uid) throw new Error("Pesanan sudah diambil kurir lain.");
            tx.update(ref, {
              status: "dikirim",
              kurir_uid: Auth.profil.uid,
              kurir_nama: Auth.profil.nama || Auth.profil.email,
              kurir_hp: Auth.profil.hp || "",
              diambil: firebase.firestore.FieldValue.serverTimestamp(),
              riwayat: firebase.firestore.FieldValue.arrayUnion({
                status: "dikirim", waktu: new Date().toISOString(),
                oleh: Auth.profil.email, peran: "kurir"
              })
            });
          });
          toast("Tugas diambil. Selamat mengantar!", "sukses");
        } catch (err) { toast(err.message, "galat"); }
        muat(false);
        pindahHalaman("tersedia");
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Sedang diantar ───────────────────────────────────────────────── */
  async function vAntar(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("kurir_uid", "==", Auth.profil.uid)
        .where("status", "==", "dikirim").limit(20).get();

      if (cuplik.empty) return kosong(wadah, "🛵", "Tidak ada pesanan yang sedang diantar");

      wadah.innerHTML = cuplik.docs.map(function (d) {
        const o = d.data();
        return kartuPesanan(d.id, o,
          '<a class="btn abu kecil" style="flex:1;text-align:center" target="_blank" rel="noopener" href="' +
            esc(tautanWa(o.hp)) + '">Chat</a>' +
          '<a class="btn abu kecil" style="flex:1;text-align:center" target="_blank" rel="noopener" href="' +
            esc(tautanPeta(o)) + '">Peta</a>' +
          '<button class="btn kecil" style="flex:1" data-selesai="' + d.id + '">Selesai</button>');
      }).join("");

      wadah.addEventListener("click", async function (e) {
        const lihat = e.target.closest(".kartu");
        const b = e.target.closest("[data-selesai]");

        if (b) {
          if (!await konfirmasi("Tandai pesanan ini sudah sampai ke pembeli?")) return;
          muat(true, "Menyimpan…");
          try {
            await ubahStatusPesanan(b.dataset.selesai, "selesai", {
              selesai_pada: firebase.firestore.FieldValue.serverTimestamp()
            });
            toast("Pengantaran selesai", "sukses");
          } catch (err) { toast(err.message, "galat"); }
          muat(false);
          return pindahHalaman("antar");
        }

        if (lihat && !e.target.closest("a")) {
          const o = cuplik.docs.filter(function (d) { return d.id === lihat.dataset.id; })[0];
          if (o) lembarBaru(o.data().kode || "Pesanan", rincianPesanan(o.data()));
        }
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Riwayat ──────────────────────────────────────────────────────── */
  async function vRiwayat(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("kurir_uid", "==", Auth.profil.uid)
        .where("status", "==", "selesai")
        .orderBy("dibuat", "desc").limit(50).get();

      if (cuplik.empty) return kosong(wadah, "📜", "Belum ada riwayat pengantaran");

      const totalOngkir = cuplik.docs.reduce(function (t, d) { return t + Number(d.data().ongkir || 0); }, 0);

      wadah.innerHTML =
        '<div class="stat-kisi">' +
          '<div class="stat"><div class="angka">' + cuplik.size + '</div><div class="ket">Pengantaran selesai</div></div>' +
          '<div class="stat"><div class="angka" style="font-size:18px">' + rupiah(totalOngkir) + '</div>' +
          '<div class="ket">Total ongkir ditangani</div></div>' +
        '</div>' +
        cuplik.docs.map(function (d) { return kartuPesanan(d.id, d.data()); }).join("");
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Akun ─────────────────────────────────────────────────────────── */
  function vAkun(wadah) {
    const p = Auth.profil;
    wadah.innerHTML =
      '<div class="kartu" style="text-align:center">' +
        '<div class="merek-ikon" style="font-size:26px">🛵</div>' +
        '<div class="tebal" style="font-size:16px">' + esc(p.nama || "Kurir") + '</div>' +
        '<div class="mini">' + esc(p.email) + '</div>' +
        '<div class="mini">' + esc(p.hp || "-") + '</div>' +
      '</div>' +
      '<div class="kartu">' +
        '<div class="antar" style="padding:6px 0"><span>Tema gelap</span>' +
        '<input type="checkbox" id="sw-tema" style="width:auto" ' +
        (document.documentElement.dataset.tema === "gelap" ? "checked" : "") + '></div>' +
      '</div>' +
      '<button class="btn merah lebar" id="btn-keluar">Keluar</button>';

    $("#sw-tema").addEventListener("change", function (e) {
      const t = e.target.checked ? "gelap" : "terang";
      document.documentElement.dataset.tema = t;
      localStorage.setItem("pp_tema", t);
    });
    $("#btn-keluar").addEventListener("click", Auth.keluar);
  }

  /* ── Mulai ────────────────────────────────────────────────────────── */
  Auth.mulai({
    peran: ["kurir", "admin"],
    judul: "Aplikasi Kurir",
    saatMasuk: function (profil) {
      rangkaAplikasi("Kurir · " + (profil.nama || profil.email), MENU, pindah);
    }
  });
})();
