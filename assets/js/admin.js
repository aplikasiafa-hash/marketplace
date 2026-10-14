/* =====================================================================
 * admin.js — Aplikasi Admin
 * Tugas: mengisi/mengubah data produk di Google Spreadsheet, mengunggah
 * foto produk ke GitHub, lalu menerbitkan (publish) katalog ke GitHub Pages.
 *
 * Semua penulisan ke Spreadsheet dan GitHub lewat Apps Script Web App,
 * sehingga token GitHub tidak pernah ada di perangkat.
 * ===================================================================== */
(function () {
  let produkCache = [];

  const MENU = [
    { id: "ringkasan", ikon: "📊", teks: "Ringkasan" },
    { id: "produk",    ikon: "📦", teks: "Produk" },
    { id: "pesanan",   ikon: "🧾", teks: "Pesanan" },
    { id: "terbit",    ikon: "🚀", teks: "Terbitkan" }
  ];

  function pindah(id, wadah) {
    ({ ringkasan: vRingkasan, produk: vProduk, pesanan: vPesanan, terbit: vTerbit }[id])(wadah);
  }

  /* ── Ringkasan ────────────────────────────────────────────────────── */
  async function vRingkasan(wadah) {
    memuat(wadah);
    try {
      const r = await panggilApi("ringkasan");
      let menunggu = 0;
      try {
        const q = await fb.db.collection("pesanan").where("status", "==", "menunggu_cs").limit(50).get();
        menunggu = q.size;
      } catch (e) {}

      wadah.innerHTML =
        '<div class="stat-kisi">' +
          stat(r.totalProduk, "Total produk") +
          stat(r.produkAktif, "Produk aktif") +
          stat(r.stokHabis, "Stok habis") +
          stat(r.totalToko, "Toko terdaftar") +
        '</div>' +
        '<div class="kartu"><div class="antar"><span>Pesanan menunggu CS</span>' +
          '<span class="tebal">' + menunggu + '</span></div>' +
          '<div class="antar mini" style="margin-top:8px"><span>Versi katalog terbit</span>' +
          '<span>' + esc(Katalog.data.versi || "-") + '</span></div>' +
          '<div class="antar mini" style="margin-top:4px"><span>Terakhir diperbarui</span>' +
          '<span>' + esc(Katalog.data.diperbarui || "-") + '</span></div>' +
        '</div>' +
        '<button class="btn lebar" id="btn-produk-baru">+ Tambah Produk Baru</button>' +
        '<button class="btn garis lebar" style="margin-top:10px" id="btn-ke-terbit">Terbitkan Perubahan</button>';

      $("#btn-produk-baru").addEventListener("click", function () { formProduk(null); });
      $("#btn-ke-terbit").addEventListener("click", function () { pindahHalaman("terbit"); });
    } catch (e) {
      wadah.innerHTML = '<div class="kosong"><div class="ikon">⚠️</div>' + esc(e.message) +
        '<br><span class="mini">Periksa apiUrl dan apiKunci di config.js</span></div>';
    }
  }
  function stat(angka, ket) {
    return '<div class="stat"><div class="angka">' + esc(String(angka)) + '</div><div class="ket">' + esc(ket) + '</div></div>';
  }

  /* ── Daftar produk ────────────────────────────────────────────────── */
  async function vProduk(wadah, paksaMuat) {
    if (!produkCache.length || paksaMuat) {
      memuat(wadah);
      try { produkCache = (await panggilApi("daftarProduk")).produk; }
      catch (e) { return kosong(wadah, "⚠️", e.message); }
    }

    wadah.innerHTML =
      '<div class="cari"><input id="cari-produk" placeholder="Cari nama atau ID produk…"></div>' +
      '<button class="btn lebar" id="btn-baru" style="margin-bottom:12px">+ Tambah Produk</button>' +
      '<div id="daftar-produk"></div>';

    function gambarkan(kata) {
      const q = (kata || "").toLowerCase();
      const hasil = produkCache.filter(function (p) {
        return !q || String(p.nama).toLowerCase().indexOf(q) >= 0 || String(p.id).toLowerCase().indexOf(q) >= 0;
      });
      $("#daftar-produk").innerHTML = hasil.length ? hasil.map(function (p) {
        const foto = p.gambar1 || "assets/img/kosong.svg";
        return '<div class="kartu" style="padding:11px" data-edit="' + esc(p.id) + '">' +
          '<div class="baris-item" style="border:0;padding:0">' +
            '<img src="' + esc(foto) + '">' +
            '<div class="tengah"><h4>' + esc(p.nama) + '</h4>' +
              '<div class="harga">' + rupiah(p.harga) + '</div>' +
              '<div class="mini">' + esc(p.id) + ' · stok ' + esc(String(p.stok)) +
              (p.aktif === false ? ' · <span style="color:var(--merah)">nonaktif</span>' : "") + '</div>' +
            '</div><div style="font-size:18px;color:var(--teks2)">›</div>' +
          '</div></div>';
      }).join("") : '<div class="kosong"><div class="ikon">📦</div>Tidak ada produk</div>';
    }
    gambarkan("");

    let jeda;
    $("#cari-produk").addEventListener("input", function (e) {
      clearTimeout(jeda);
      jeda = setTimeout(function () { gambarkan(e.target.value.trim()); }, 200);
    });
    $("#btn-baru").addEventListener("click", function () { formProduk(null); });
    $("#daftar-produk").addEventListener("click", function (e) {
      const k = e.target.closest("[data-edit]");
      if (!k) return;
      formProduk(produkCache.filter(function (p) { return p.id === k.dataset.edit; })[0]);
    });
  }

  /* ── Formulir produk ──────────────────────────────────────────────── */
  async function formProduk(produk) {
    const baru = !produk;
    produk = produk || {};
    let foto = [produk.gambar1, produk.gambar2, produk.gambar3, produk.gambar4];

    const kategori = Katalog.kategori();
    const daftarToko = Katalog.data.toko || [];

    const lembar = lembarBaru(baru ? "Produk Baru" : "Ubah Produk",
      '<label>ID produk<input id="f-id" value="' + esc(produk.id || "") + '" ' +
        (baru ? 'placeholder="otomatis bila dikosongkan"' : "readonly") + '></label>' +
      '<label>Nama produk<input id="f-nama" value="' + esc(produk.nama || "") + '" placeholder="Beras Pinrang Premium 5 kg"></label>' +
      '<label>Kategori<select id="f-kategori">' +
        kategori.map(function (k) {
          return '<option value="' + esc(k.kategori_id) + '"' +
            (produk.kategori_id === k.kategori_id ? " selected" : "") + '>' + esc(k.nama) + '</option>';
        }).join("") + '</select></label>' +
      '<label>Toko<select id="f-toko">' +
        daftarToko.map(function (t) {
          return '<option value="' + esc(t.toko_id) + '"' +
            (produk.toko_id === t.toko_id ? " selected" : "") + '>' + esc(t.nama_toko) + '</option>';
        }).join("") + '</select></label>' +

      '<div class="baris">' +
        '<label style="flex:1">Harga<input id="f-harga" inputmode="numeric" value="' + esc(String(produk.harga || "")) + '"></label>' +
        '<label style="flex:1">Harga coret<input id="f-coret" inputmode="numeric" value="' + esc(String(produk.harga_coret || "")) + '"></label>' +
      '</div>' +
      '<div class="baris">' +
        '<label style="flex:1">Stok<input id="f-stok" inputmode="numeric" value="' + esc(String(produk.stok || 0)) + '"></label>' +
        '<label style="flex:1">Satuan<input id="f-satuan" value="' + esc(produk.satuan || "pcs") + '"></label>' +
        '<label style="flex:1">Berat (gram)<input id="f-berat" inputmode="numeric" value="' + esc(String(produk.berat_gram || 0)) + '"></label>' +
      '</div>' +

      '<label>Deskripsi<textarea id="f-deskripsi">' + esc(produk.deskripsi || "") + '</textarea></label>' +
      '<label>Tag (pisahkan koma)<input id="f-tag" value="' + esc(produk.tag || "") + '" placeholder="beras,sembako,lokal"></label>' +

      '<label>Foto produk (maks. 4)' +
        '<div class="kisi-foto" id="kisi-foto"></div>' +
        '<span class="mini">Foto dikecilkan otomatis lalu disimpan permanen di GitHub.</span>' +
      '</label>' +
      '<input type="file" id="f-berkas" accept="image/*" hidden>' +

      '<div class="baris" style="margin:14px 0">' +
        '<label style="flex:1;margin:0">Kondisi<select id="f-kondisi">' +
          '<option value="baru"' + (produk.kondisi !== "bekas" ? " selected" : "") + '>Baru</option>' +
          '<option value="bekas"' + (produk.kondisi === "bekas" ? " selected" : "") + '>Bekas</option>' +
        '</select></label>' +
        '<label style="flex:1;margin:0">Unggulan<select id="f-unggulan">' +
          '<option value="false">Tidak</option>' +
          '<option value="true"' + (produk.unggulan === true || produk.unggulan === "YA" ? " selected" : "") + '>Ya</option>' +
        '</select></label>' +
        '<label style="flex:1;margin:0">Aktif<select id="f-aktif">' +
          '<option value="true"' + (produk.aktif !== false ? " selected" : "") + '>Ya</option>' +
          '<option value="false">Tidak</option>' +
        '</select></label>' +
      '</div>' +

      '<button class="btn lebar" id="f-simpan">Simpan ke Spreadsheet</button>' +
      (baru ? "" : '<button class="btn merah lebar kecil" style="margin-top:10px" id="f-hapus">Nonaktifkan Produk</button>')
    );

    let slotTujuan = 0;

    function gambarFoto() {
      $("#kisi-foto", lembar).innerHTML = [0, 1, 2, 3].map(function (i) {
        return foto[i]
          ? '<div class="sel-foto"><img src="' + esc(foto[i]) + '">' +
            '<button class="buang" data-buang="' + i + '">✕</button></div>'
          : '<div class="sel-foto" data-tambah="' + i + '">+</div>';
      }).join("");
    }
    gambarFoto();

    $("#kisi-foto", lembar).addEventListener("click", function (e) {
      const buang = e.target.closest("[data-buang]");
      if (buang) { foto[Number(buang.dataset.buang)] = ""; return gambarFoto(); }
      const tambah = e.target.closest("[data-tambah]");
      if (tambah) { slotTujuan = Number(tambah.dataset.tambah); $("#f-berkas", lembar).click(); }
    });

    $("#f-berkas", lembar).addEventListener("change", async function (e) {
      const berkas = e.target.files[0];
      if (!berkas) return;
      e.target.value = "";

      muat(true, "Mengecilkan foto…");
      try {
        const kecil = await kompresGambar(berkas, 900, 0.72);
        muat(true, "Mengunggah ke GitHub…");
        const hasil = await panggilApi("uploadFoto", {
          base64: kecil.base64,
          nama: berkas.name,
          produkId: $("#f-id", lembar).value || produk.id || "baru",
          urutan: slotTujuan + 1
        });
        foto[slotTujuan] = hasil.url;
        gambarFoto();
        toast("Foto terunggah", "sukses");
      } catch (err) {
        toast("Gagal unggah: " + err.message, "galat");
      }
      muat(false);
    });

    $("#f-simpan", lembar).addEventListener("click", async function () {
      const nama = $("#f-nama", lembar).value.trim();
      const harga = Number($("#f-harga", lembar).value);
      if (!nama) return toast("Nama produk wajib diisi.", "galat");
      if (!harga || harga <= 0) return toast("Harga harus lebih dari nol.", "galat");

      const data = {
        id: $("#f-id", lembar).value.trim(),
        nama: nama,
        kategori_id: $("#f-kategori", lembar).value,
        toko_id: $("#f-toko", lembar).value,
        harga: harga,
        harga_coret: Number($("#f-coret", lembar).value) || "",
        stok: Number($("#f-stok", lembar).value) || 0,
        satuan: $("#f-satuan", lembar).value.trim(),
        berat_gram: Number($("#f-berat", lembar).value) || 0,
        deskripsi: $("#f-deskripsi", lembar).value.trim(),
        tag: $("#f-tag", lembar).value.trim(),
        kondisi: $("#f-kondisi", lembar).value,
        unggulan: $("#f-unggulan", lembar).value === "true",
        aktif: $("#f-aktif", lembar).value === "true",
        gambar1: foto[0] || "", gambar2: foto[1] || "",
        gambar3: foto[2] || "", gambar4: foto[3] || ""
      };

      muat(true, "Menyimpan ke spreadsheet…");
      try {
        const hasil = await panggilApi("simpanProduk", data);
        muat(false);
        tutupLembar(lembar);
        toast("Tersimpan: " + hasil.id, "sukses");
        produkCache = [];
        pindahHalaman("produk");
      } catch (err) {
        muat(false);
        toast("Gagal menyimpan: " + err.message, "galat");
      }
    });

    const tombolHapus = $("#f-hapus", lembar);
    if (tombolHapus) tombolHapus.addEventListener("click", async function () {
      if (!await konfirmasi("Nonaktifkan produk ini? Produk akan hilang dari aplikasi pembeli.")) return;
      muat(true, "Memproses…");
      try {
        await panggilApi("hapusProduk", { id: produk.id });
        muat(false); tutupLembar(lembar);
        toast("Produk dinonaktifkan", "sukses");
        produkCache = [];
        pindahHalaman("produk");
      } catch (err) { muat(false); toast(err.message, "galat"); }
    });
  }

  /* ── Pesanan (pantau semua) ───────────────────────────────────────── */
  async function vPesanan(wadah) {
    memuat(wadah);
    try {
      const cuplik = await fb.db.collection("pesanan").orderBy("dibuat", "desc").limit(40).get();
      if (cuplik.empty) return kosong(wadah, "🧾", "Belum ada pesanan");

      wadah.innerHTML = cuplik.docs.map(function (d) {
        return kartuPesanan(d.id, d.data(), '<button class="btn abu kecil" data-lihat="' + d.id + '">Rincian</button>');
      }).join("");

      wadah.addEventListener("click", function (e) {
        const b = e.target.closest("[data-lihat]");
        if (!b) return;
        const o = cuplik.docs.filter(function (d) { return d.id === b.dataset.lihat; })[0].data();
        lembarBaru(o.kode || "Pesanan", rincianPesanan(o));
      });
    } catch (e) { kosong(wadah, "⚠️", e.message); }
  }

  /* ── Terbitkan ────────────────────────────────────────────────────── */
  function vTerbit(wadah) {
    wadah.innerHTML =
      '<div class="kartu">' +
        '<p class="tebal" style="margin:0 0 8px">Terbitkan katalog</p>' +
        '<p class="mini" style="margin:0">Seluruh isi spreadsheet (produk, toko, kategori, ongkir, banner, ' +
        'pengaturan) dikirim ke GitHub sebagai <b>data/db.js</b>. Aplikasi pembeli akan mengunduh versi ' +
        'baru ini satu kali, lalu memakainya dari penyimpanan perangkat.</p>' +
        '<hr>' +
        '<div class="antar mini"><span>Versi terpasang sekarang</span><span>' + esc(Katalog.data.versi || "-") + '</span></div>' +
        '<div class="antar mini" style="margin-top:4px"><span>Diperbarui</span><span>' + esc(Katalog.data.diperbarui || "-") + '</span></div>' +
        '<button class="btn lebar" style="margin-top:16px" id="btn-terbit">Terbitkan Sekarang</button>' +
      '</div>' +
      '<div class="kartu">' +
        '<p class="tebal" style="margin:0 0 8px">Catatan</p>' +
        '<p class="mini" style="margin:0">GitHub Pages butuh sekitar satu menit untuk menayangkan ' +
        'perubahan. Setelah itu aplikasi pembeli akan menemukan versi baru pada pengecekan berikutnya ' +
        '(maksimal ' + APP_CONFIG.menitCekVersi + ' menit), atau langsung bila mereka menekan tombol segarkan.</p>' +
      '</div>' +
      '<div id="hasil-terbit"></div>';

    $("#btn-terbit").addEventListener("click", async function () {
      if (!await konfirmasi("Terbitkan seluruh data spreadsheet ke GitHub sekarang?")) return;
      this.disabled = true;
      muat(true, "Mengirim ke GitHub…");
      try {
        const hasil = await panggilApi("publish");
        muat(false);
        $("#hasil-terbit").innerHTML =
          '<div class="kartu" style="background:var(--hijau-muda)">✅ Berhasil diterbitkan.<br>' +
          '<span class="mini">Versi baru: ' + esc(hasil.versi) + '</span></div>';
        toast("Katalog terbit: " + hasil.versi, "sukses");
        await Katalog.muat(true);
      } catch (err) {
        muat(false);
        toast("Gagal: " + err.message, "galat");
      }
      this.disabled = false;
    });
  }

  /* ── Mulai ────────────────────────────────────────────────────────── */
  Auth.mulai({
    peran: ["admin"],
    judul: "Panel Admin",
    saatMasuk: async function (profil) {
      muat(true, "Memuat data…");
      try { await Katalog.muat(); } catch (e) { toast(e.message, "galat"); }
      muat(false);
      rangkaAplikasi("Admin · " + (profil.nama || profil.email), MENU, pindah);
    }
  });
})();
