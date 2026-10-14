/* =====================================================================
 * user.js — Aplikasi Pembeli
 * Halaman: Beranda · Cari · Keranjang · Pesanan · Akun
 * Katalog dibaca dari GitHub (sekali unduh). Firebase hanya dipakai
 * untuk login dan pesanan, supaya kuota baca/tulis tetap kecil.
 * ===================================================================== */
(function () {
  const K_KERANJANG = "pp_keranjang";
  let keranjang = [];
  let halaman = "beranda";
  let saringCari = { cari: "", kategori: "" };

  /* ── Keranjang ────────────────────────────────────────────────────── */
  function muatKeranjang() {
    try { keranjang = JSON.parse(localStorage.getItem(K_KERANJANG) || "[]"); }
    catch (e) { keranjang = []; }
  }
  function simpanKeranjang() {
    localStorage.setItem(K_KERANJANG, JSON.stringify(keranjang));
    perbaruiLencana();
  }
  function tambahKeranjang(id, jumlah) {
    const p = Katalog.cariProduk(id);
    if (!p) return;
    if (Number(p.stok) <= 0) return toast("Stok habis.", "galat");
    const ada = keranjang.filter(function (k) { return k.id === id; })[0];
    if (ada) ada.jumlah = Math.min(Number(p.stok), ada.jumlah + (jumlah || 1));
    else keranjang.push({ id: id, jumlah: jumlah || 1 });
    simpanKeranjang();
    toast("Ditambahkan ke keranjang", "sukses");
  }
  function isiKeranjang() {
    return keranjang.map(function (k) {
      const p = Katalog.cariProduk(k.id);
      return p ? { produk: p, jumlah: Math.min(k.jumlah, Number(p.stok) || k.jumlah) } : null;
    }).filter(Boolean);
  }
  function subtotal() {
    return isiKeranjang().reduce(function (t, b) { return t + b.produk.harga * b.jumlah; }, 0);
  }
  function beratTotal() {
    return isiKeranjang().reduce(function (t, b) { return t + (Number(b.produk.berat_gram) || 0) * b.jumlah; }, 0);
  }
  function perbaruiLencana() {
    const n = keranjang.reduce(function (t, k) { return t + k.jumlah; }, 0);
    const b = $("#lencana-keranjang");
    if (b) { b.textContent = n; b.style.display = n ? "block" : "none"; }
  }

  /* ── Rangka ───────────────────────────────────────────────────────── */
  function rangka() {
    $("#akar").innerHTML =
      '<div class="bilah-atas">' +
        '<h2 id="judul-halaman">' + esc(Katalog.atur("nama_aplikasi", APP_CONFIG.namaApp)) + '</h2>' +
        '<button id="btn-segarkan" title="Perbarui katalog">⟳</button>' +
      '</div>' +
      '<div class="isi" id="isi"></div>' +
      '<nav class="nav-bawah">' +
        tombolNav("beranda", "🏠", "Beranda") +
        tombolNav("cari", "🔍", "Cari") +
        '<button data-h="keranjang"><span>🛒</span><em class="lencana" id="lencana-keranjang" style="display:none">0</em>Keranjang</button>' +
        tombolNav("pesanan", "📦", "Pesanan") +
        tombolNav("akun", "👤", "Akun") +
      '</nav>';

    $(".nav-bawah").addEventListener("click", function (e) {
      const b = e.target.closest("[data-h]");
      if (b) buka(b.dataset.h);
    });
    $("#btn-segarkan").addEventListener("click", async function () {
      muat(true, "Memperbarui katalog…");
      try { await Katalog.muat(true); toast("Katalog diperbarui", "sukses"); buka(halaman); }
      catch (e) { toast(e.message, "galat"); }
      muat(false);
    });
    perbaruiLencana();
  }
  function tombolNav(id, ikon, teks) {
    return '<button data-h="' + id + '"><span>' + ikon + '</span>' + teks + '</button>';
  }

  function buka(nama) {
    halaman = nama;
    $$(".nav-bawah button").forEach(function (b) { b.classList.toggle("aktif", b.dataset.h === nama); });
    window.scrollTo(0, 0);

    // Wadah diganti elemen baru setiap pindah halaman, supaya pendengar
    // klik dari halaman sebelumnya tidak menumpuk.
    const lama = $("#isi");
    const isi = el("div", "isi");
    isi.id = "isi";
    lama.replaceWith(isi);

    ({ beranda: vBeranda, cari: vCari, keranjang: vKeranjang, pesanan: vPesanan, akun: vAkun }[nama])(isi);
  }

  /* ── Beranda ──────────────────────────────────────────────────────── */
  function vBeranda(wadah) {
    const pengumuman = Katalog.atur("pengumuman", "");
    const unggulan = Katalog.produk({ unggulan: true }).slice(0, 6);
    const terbaru  = Katalog.produk({}).slice(-10).reverse();

    wadah.innerHTML =
      (pengumuman ? '<div class="kartu sorot">📢 ' + esc(pengumuman) + '</div>' : "") +
      '<div class="cari"><input id="cari-cepat" placeholder="Cari beras, ikan, sayur…" readonly></div>' +
      '<div class="judul-bagian">Kategori</div>' +
      '<div class="kisi-kategori">' +
        Katalog.kategori().map(function (k) {
          return '<div class="kat" data-kat="' + esc(k.kategori_id) + '">' +
                 '<div class="ikon">' + esc(k.ikon || "📦") + '</div>' +
                 '<div class="nama">' + esc(k.nama) + '</div></div>';
        }).join("") +
      '</div>' +
      (unggulan.length ? '<div class="judul-bagian">Pilihan Hari Ini</div><div class="kisi-produk">' +
        unggulan.map(kartuProduk).join("") + '</div>' : "") +
      '<div class="judul-bagian">Terbaru</div>' +
      '<div class="kisi-produk">' + terbaru.map(kartuProduk).join("") + '</div>';

    $("#cari-cepat").addEventListener("click", function () { buka("cari"); });
    wadah.addEventListener("click", klikProduk);
    $$(".kat", wadah).forEach(function (k) {
      k.addEventListener("click", function () {
        saringCari = { cari: "", kategori: k.dataset.kat };
        buka("cari");
      });
    });
  }

  function kartuProduk(p) {
    const diskon = p.harga_coret && p.harga_coret > p.harga;
    const persen = diskon ? Math.round((1 - p.harga / p.harga_coret) * 100) : 0;

    return '<div class="kartu-produk" data-produk="' + esc(p.id) + '">' +
      '<div class="bingkai-foto">' +
        (persen ? '<span class="badge-diskon">-' + persen + '%</span>' : "") +
        '<img loading="lazy" src="' + esc(Katalog.gambar(p)) + '" alt="' + esc(p.nama) + '">' +
      '</div>' +
      '<div class="isi-kartu">' +
        '<p class="nama">' + esc(p.nama) + '</p>' +
        '<div class="harga">' + rupiah(p.harga) +
          (diskon ? '<span class="harga-coret">' + rupiah(p.harga_coret) + '</span>' : "") + '</div>' +
        '<div class="meta">' +
          (p.rating ? '<span class="bintang">★ ' + esc(String(p.rating)) + '</span> · ' : "") +
          esc(String(p.stok || 0)) + ' ' + esc(p.satuan || "pcs") +
          (p.terjual ? ' · ' + esc(String(p.terjual)) + ' terjual' : "") +
        '</div>' +
      '</div></div>';
  }

  function klikProduk(e) {
    const k = e.target.closest("[data-produk]");
    if (k) detailProduk(k.dataset.produk);
  }

  /* ── Cari ─────────────────────────────────────────────────────────── */
  function vCari(wadah) {
    wadah.innerHTML =
      '<div class="cari"><input id="kotak-cari" placeholder="Cari produk…" value="' + esc(saringCari.cari) + '"></div>' +
      '<div class="cip-baris" id="cip-kat">' +
        '<div class="cip' + (saringCari.kategori ? "" : " aktif") + '" data-kat="">Semua</div>' +
        Katalog.kategori().map(function (k) {
          return '<div class="cip' + (saringCari.kategori === k.kategori_id ? " aktif" : "") +
                 '" data-kat="' + esc(k.kategori_id) + '">' + esc(k.ikon || "") + " " + esc(k.nama) + '</div>';
        }).join("") +
      '</div>' +
      '<div id="hasil-cari"></div>';

    function tampilkan() {
      const hasil = Katalog.produk({ cari: saringCari.cari, kategori: saringCari.kategori });
      $("#hasil-cari").innerHTML = hasil.length
        ? '<p class="mini">' + hasil.length + ' produk</p><div class="kisi-produk">' + hasil.map(kartuProduk).join("") + '</div>'
        : '<div class="kosong"><div class="ikon">🔍</div>Produk tidak ditemukan</div>';
    }
    tampilkan();

    let jeda;
    $("#kotak-cari").addEventListener("input", function (e) {
      clearTimeout(jeda);
      jeda = setTimeout(function () { saringCari.cari = e.target.value.trim(); tampilkan(); }, 220);
    });
    $("#cip-kat").addEventListener("click", function (e) {
      const c = e.target.closest(".cip");
      if (!c) return;
      $$(".cip", wadah).forEach(function (x) { x.classList.remove("aktif"); });
      c.classList.add("aktif");
      saringCari.kategori = c.dataset.kat;
      tampilkan();
    });
    wadah.addEventListener("click", klikProduk);
  }

  /* ── Detail produk ────────────────────────────────────────────────── */
  function detailProduk(id) {
    const p = Katalog.cariProduk(id);
    if (!p) return;
    const toko = Katalog.toko(p.toko_id) || {};
    let jumlah = 1;

    const lembar = lembarBaru(p.nama,
      '<img src="' + esc(Katalog.gambar(p)) + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px">' +
      ((p.gambar || []).length > 1
        ? '<div class="cip-baris" style="margin-top:8px">' + p.gambar.map(function (g, i) {
            return '<img class="mini-foto" data-i="' + i + '" src="' + esc(g) +
                   '" style="width:58px;height:58px;border-radius:8px;object-fit:cover;flex:none;cursor:pointer">';
          }).join("") + '</div>' : "") +
      '<h3 style="margin:14px 0 6px;font-size:17px">' + esc(p.nama) + '</h3>' +
      '<div class="harga" style="font-size:21px">' + rupiah(p.harga) +
        (p.harga_coret ? '<span class="harga-coret">' + rupiah(p.harga_coret) + '</span>' : "") + '</div>' +
      '<p class="meta">Stok ' + esc(String(p.stok || 0)) + ' ' + esc(p.satuan || "pcs") +
        ' · ' + esc(p.kondisi || "baru") + ' · ' + esc(String(p.berat_gram || 0)) + ' gram</p>' +
      '<hr><div class="antar"><div><div class="tebal">' + esc(toko.nama_toko || "Toko") + '</div>' +
      '<div class="mini">' + esc(toko.kecamatan || "Pinrang") + '</div></div>' +
      '<div class="mini">⭐ ' + esc(String(toko.rating || "-")) + '</div></div><hr>' +
      '<p class="tebal" style="margin:0 0 4px">Deskripsi</p>' +
      '<p style="margin:0;white-space:pre-wrap">' + esc(p.deskripsi || "-") + '</p>' +
      '<div class="antar" style="margin:20px 0 6px">' +
        '<div class="penghitung"><button data-j="-">−</button><span id="jml">1</span><button data-j="+">+</button></div>' +
        '<button class="btn" id="btn-tambah" style="flex:1;margin-left:12px">Masukkan Keranjang</button>' +
      '</div>'
    );

    $$(".mini-foto", lembar).forEach(function (m) {
      m.addEventListener("click", function () {
        $("img", lembar).src = p.gambar[Number(m.dataset.i)];
      });
    });
    lembar.addEventListener("click", function (e) {
      const t = e.target.closest("[data-j]");
      if (!t) return;
      jumlah = Math.max(1, Math.min(Number(p.stok) || 99, jumlah + (t.dataset.j === "+" ? 1 : -1)));
      $("#jml", lembar).textContent = jumlah;
    });
    $("#btn-tambah", lembar).addEventListener("click", function () {
      tambahKeranjang(p.id, jumlah);
      tutupLembar(lembar);
    });
  }

  /* ── Keranjang ────────────────────────────────────────────────────── */
  function vKeranjang(wadah) {
    const isi = isiKeranjang();
    if (!isi.length) {
      wadah.innerHTML = '<div class="kosong"><div class="ikon">🛒</div>Keranjang masih kosong<br>' +
        '<button class="btn kecil" style="margin-top:14px" onclick="document.querySelector(\'[data-h=beranda]\').click()">Mulai belanja</button></div>';
      return;
    }

    wadah.innerHTML =
      '<div class="kartu">' + isi.map(function (b) {
        return '<div class="baris-item">' +
          '<img src="' + esc(Katalog.gambar(b.produk)) + '">' +
          '<div class="tengah"><h4>' + esc(b.produk.nama) + '</h4>' +
            '<div class="harga">' + rupiah(b.produk.harga) + '</div>' +
            '<div class="penghitung" style="margin-top:7px">' +
              '<button data-k="' + esc(b.produk.id) + '" data-j="-">−</button>' +
              '<span>' + b.jumlah + '</span>' +
              '<button data-k="' + esc(b.produk.id) + '" data-j="+">+</button>' +
              '<button data-hapus="' + esc(b.produk.id) + '" style="margin-left:auto;border:0;background:none;font-size:17px">🗑</button>' +
            '</div></div></div>';
      }).join("") + '</div>' +
      '<div class="kartu"><div class="antar"><span>Subtotal</span><span class="tebal">' + rupiah(subtotal()) + '</span></div>' +
      '<div class="antar mini" style="margin-top:6px"><span>Berat total</span><span>' + (beratTotal() / 1000).toFixed(2) + ' kg</span></div></div>' +
      '<div class="bilah-bayar"><div class="total"><small>Total belanja</small><span class="harga">' + rupiah(subtotal()) + '</span></div>' +
      '<button class="btn" id="btn-checkout">Checkout</button></div>';

    wadah.addEventListener("click", function (e) {
      const ubah = e.target.closest("[data-j]");
      if (ubah) {
        const b = keranjang.filter(function (k) { return k.id === ubah.dataset.k; })[0];
        if (b) {
          b.jumlah += ubah.dataset.j === "+" ? 1 : -1;
          if (b.jumlah <= 0) keranjang = keranjang.filter(function (k) { return k.id !== b.id; });
          simpanKeranjang(); buka("keranjang");
        }
      }
      const hapus = e.target.closest("[data-hapus]");
      if (hapus) {
        keranjang = keranjang.filter(function (k) { return k.id !== hapus.dataset.hapus; });
        simpanKeranjang(); buka("keranjang");
      }
      if (e.target.id === "btn-checkout") formCheckout();
    });
  }

  /* ── Checkout ─────────────────────────────────────────────────────── */
  function formCheckout() {
    const p = Auth.profil;
    const kecamatanTersedia = (Katalog.data.ongkir || []).map(function (o) { return o.kecamatan; });
    const metode = String(Katalog.atur("metode_bayar", "COD")).split(",");

    const lembar = lembarBaru("Checkout",
      '<label>Nama penerima<input id="ck-nama" value="' + esc(p.nama || "") + '"></label>' +
      '<label>Nomor HP<input id="ck-hp" inputmode="tel" value="' + esc(p.hp || "") + '"></label>' +
      '<label>Kecamatan<select id="ck-kec">' +
        kecamatanTersedia.map(function (k) {
          return '<option' + (p.kecamatan === k ? " selected" : "") + '>' + esc(k) + '</option>';
        }).join("") + '</select></label>' +
      '<label>Alamat lengkap<textarea id="ck-alamat" placeholder="Nama jalan, nomor rumah, patokan">' + esc(p.alamat || "") + '</textarea></label>' +
      '<label>Metode pembayaran<select id="ck-bayar">' +
        metode.map(function (m) { return '<option>' + esc(m.trim()) + '</option>'; }).join("") + '</select></label>' +
      '<label>Catatan (opsional)<input id="ck-catatan" placeholder="Contoh: titip di pos satpam"></label>' +
      '<div class="kartu" id="ck-rincian"></div>' +
      '<button class="btn lebar" id="ck-kirim">Buat Pesanan</button>'
    );

    function hitung() {
      const o = Katalog.ongkir($("#ck-kec", lembar).value);
      const kg = Math.max(0, Math.ceil(beratTotal() / 1000) - 1);
      const ongkir = Number(o.ongkir) + kg * Number(o.tambahan_per_kg || 0);
      const total = subtotal() + ongkir;
      $("#ck-rincian", lembar).innerHTML =
        '<div class="antar"><span>Subtotal</span><span>' + rupiah(subtotal()) + '</span></div>' +
        '<div class="antar" style="margin-top:6px"><span>Ongkir (' + esc(o.estimasi || "-") + ')</span><span>' + rupiah(ongkir) + '</span></div>' +
        '<hr><div class="antar tebal"><span>Total</span><span class="harga">' + rupiah(total) + '</span></div>';
      return { ongkir: ongkir, total: total };
    }
    let angka = hitung();
    $("#ck-kec", lembar).addEventListener("change", function () { angka = hitung(); });

    $("#ck-kirim", lembar).addEventListener("click", async function () {
      const nama = $("#ck-nama", lembar).value.trim();
      const hp = $("#ck-hp", lembar).value.trim();
      const alamat = $("#ck-alamat", lembar).value.trim();
      if (!nama || !hp || !alamat) return toast("Nama, HP, dan alamat wajib diisi.", "galat");

      const minimal = Number(Katalog.atur("min_belanja", 0));
      if (subtotal() < minimal) return toast("Minimal belanja " + rupiah(minimal), "galat");

      const tombol = this; tombol.disabled = true;
      muat(true, "Mengirim pesanan…");
      try {
        const kode = "PSN-" + Date.now().toString(36).toUpperCase().slice(-7);
        const item = isiKeranjang().map(function (b) {
          return {
            id: b.produk.id, nama: b.produk.nama, harga: b.produk.harga,
            jumlah: b.jumlah, satuan: b.produk.satuan || "pcs",
            toko_id: b.produk.toko_id || "", gambar: Katalog.gambar(b.produk)
          };
        });

        const pesanan = {
          kode: kode, uid: p.uid, email: p.email,
          nama: nama, hp: hp, alamat: alamat,
          kecamatan: $("#ck-kec", lembar).value,
          metode_bayar: $("#ck-bayar", lembar).value,
          catatan: $("#ck-catatan", lembar).value.trim(),
          item: item, subtotal: subtotal(), ongkir: angka.ongkir, total: angka.total,
          status: "menunggu_cs",
          dibuat: firebase.firestore.FieldValue.serverTimestamp(),
          riwayat: [{ status: "menunggu_cs", waktu: new Date().toISOString(), oleh: p.email }]
        };

        const ref = await fb.db.collection("pesanan").add(pesanan);
        await fb.db.collection("log_transaksi").add({
          tipe: "pesanan_baru", pesanan_id: ref.id, kode: kode, uid: p.uid,
          total: angka.total, waktu: firebase.firestore.FieldValue.serverTimestamp()
        });

        keranjang = []; simpanKeranjang();
        muat(false); tutupLembar(lembar);
        toast("Pesanan " + kode + " terkirim. Menunggu persetujuan CS.", "sukses");
        buka("pesanan");
      } catch (err) {
        muat(false); tombol.disabled = false;
        toast("Gagal membuat pesanan: " + err.message, "galat");
      }
    });
  }

  /* ── Pesanan ──────────────────────────────────────────────────────── */
  async function vPesanan(wadah) {
    wadah.innerHTML = '<div class="kosong"><div class="putar gelap" style="margin:0 auto"></div></div>';
    try {
      const cuplik = await fb.db.collection("pesanan")
        .where("uid", "==", Auth.profil.uid)
        .orderBy("dibuat", "desc").limit(30).get();

      if (cuplik.empty) {
        wadah.innerHTML = '<div class="kosong"><div class="ikon">📦</div>Belum ada pesanan</div>';
        return;
      }

      wadah.innerHTML = cuplik.docs.map(function (d) {
        const o = d.data();
        return '<div class="kartu" data-pesanan="' + d.id + '">' +
          '<div class="antar"><span class="tebal">' + esc(o.kode) + '</span>' +
          '<span class="label ' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</span></div>' +
          '<div class="mini" style="margin:6px 0 10px">' + esc(tanggal(o.dibuat)) + '</div>' +
          o.item.slice(0, 2).map(function (i) {
            return '<div class="baris-item"><img src="' + esc(i.gambar) + '">' +
              '<div class="tengah"><h4>' + esc(i.nama) + '</h4>' +
              '<div class="mini">' + i.jumlah + ' × ' + rupiah(i.harga) + '</div></div></div>';
          }).join("") +
          (o.item.length > 2 ? '<div class="mini">+' + (o.item.length - 2) + ' produk lain</div>' : "") +
          '<hr><div class="antar"><span class="mini">Total</span><span class="harga">' + rupiah(o.total) + '</span></div>' +
          (o.status === "menunggu_cs"
            ? '<button class="btn merah kecil lebar" style="margin-top:10px" data-batal="' + d.id + '">Batalkan</button>' : "") +
          (o.status === "dikirim"
            ? '<button class="btn kecil lebar" style="margin-top:10px" data-terima="' + d.id + '">Pesanan Diterima</button>' : "") +
          '</div>';
      }).join("");

      wadah.addEventListener("click", async function (e) {
        const batal = e.target.closest("[data-batal]");
        const terima = e.target.closest("[data-terima]");
        if (batal && await konfirmasi("Batalkan pesanan ini?")) {
          await ubahStatus(batal.dataset.batal, "dibatalkan");
          buka("pesanan");
        }
        if (terima && await konfirmasi("Konfirmasi pesanan sudah diterima?")) {
          await ubahStatus(terima.dataset.terima, "selesai");
          buka("pesanan");
        }
      });
    } catch (err) {
      wadah.innerHTML = '<div class="kosong">Gagal memuat pesanan.<br><span class="mini">' + esc(err.message) + '</span></div>';
    }
  }

  async function ubahStatus(id, status) {
    muat(true, "Memperbarui…");
    try {
      await fb.db.collection("pesanan").doc(id).update({
        status: status,
        riwayat: firebase.firestore.FieldValue.arrayUnion({
          status: status, waktu: new Date().toISOString(), oleh: Auth.profil.email
        })
      });
      await fb.db.collection("log_transaksi").add({
        tipe: "ubah_status", pesanan_id: id, status: status, uid: Auth.profil.uid,
        waktu: firebase.firestore.FieldValue.serverTimestamp()
      });
      toast("Status diperbarui", "sukses");
    } catch (e) { toast(e.message, "galat"); }
    muat(false);
  }

  /* ── Akun ─────────────────────────────────────────────────────────── */
  function vAkun(wadah) {
    const p = Auth.profil;
    wadah.innerHTML =
      '<div class="kartu" style="text-align:center">' +
        '<div class="merek-ikon" style="font-size:26px">👤</div>' +
        '<div class="tebal" style="font-size:16px">' + esc(p.nama || "Pengguna") + '</div>' +
        '<div class="mini">' + esc(p.email) + '</div>' +
      '</div>' +
      '<div class="kartu">' +
        '<label>Nama<input id="ak-nama" value="' + esc(p.nama || "") + '"></label>' +
        '<label>Nomor HP<input id="ak-hp" inputmode="tel" value="' + esc(p.hp || "") + '"></label>' +
        '<label>Kecamatan<input id="ak-kec" value="' + esc(p.kecamatan || "") + '"></label>' +
        '<label>Alamat<textarea id="ak-alamat">' + esc(p.alamat || "") + '</textarea></label>' +
        '<button class="btn lebar" id="btn-simpan-akun">Simpan Perubahan</button>' +
      '</div>' +
      '<div class="kartu">' +
        '<div class="antar" style="padding:6px 0"><span>Tema gelap</span>' +
          '<input type="checkbox" id="sw-tema" style="width:auto" ' +
          (document.documentElement.dataset.tema === "gelap" ? "checked" : "") + '></div>' +
        '<hr><div class="mini">Versi data: ' + esc(Katalog.data.versi || "-") + '</div>' +
        '<div class="mini">Diperbarui: ' + esc(Katalog.data.diperbarui || "-") + '</div>' +
        '<button class="btn abu lebar kecil" style="margin-top:10px" id="btn-hapus-cache">Hapus data tersimpan</button>' +
      '</div>' +
      '<a class="btn garis lebar" style="display:block;text-align:center;margin-bottom:10px" ' +
        'href="https://wa.me/' + esc(Katalog.atur("wa_cs", APP_CONFIG.waCs)) + '">Hubungi CS</a>' +
      '<button class="btn merah lebar" id="btn-keluar">Keluar</button>';

    $("#btn-simpan-akun").addEventListener("click", async function () {
      muat(true, "Menyimpan…");
      const baru = {
        nama: $("#ak-nama").value.trim(), hp: $("#ak-hp").value.trim(),
        kecamatan: $("#ak-kec").value.trim(), alamat: $("#ak-alamat").value.trim()
      };
      try {
        await fb.db.collection("pengguna").doc(p.uid).update(baru);
        Object.assign(Auth.profil, baru);
        await simpanLokal("profil:" + p.uid, { profil: Auth.profil, disimpan: Date.now() });
        toast("Tersimpan", "sukses");
      } catch (e) { toast(e.message, "galat"); }
      muat(false);
    });

    $("#sw-tema").addEventListener("change", function (e) {
      const t = e.target.checked ? "gelap" : "terang";
      document.documentElement.dataset.tema = t;
      localStorage.setItem("pp_tema", t);
    });

    $("#btn-hapus-cache").addEventListener("click", async function () {
      if (!await konfirmasi("Hapus katalog & foto tersimpan? Data akan diunduh ulang.")) return;
      localStorage.removeItem("pp_versi_katalog");
      localStorage.removeItem("pp_cek_terakhir");
      await simpanLokal("katalog", null);
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage("bersihkan-gambar");
      location.reload();
    });

    $("#btn-keluar").addEventListener("click", Auth.keluar);
  }

  /* ── Lembar bawah ─────────────────────────────────────────────────── */
  function lembarBaru(judul, isiHtml) {
    const bg = el("div", "tabir");
    bg.style.display = "block";
    bg.style.background = "rgba(0,0,0,.45)";
    const lembar = el("div", "lembar",
      '<div class="pegangan"></div>' +
      '<div class="lembar-kepala"><h3>' + esc(judul) + '</h3><button class="btn abu kecil" data-tutup>✕</button></div>' +
      '<div class="lembar-isi">' + isiHtml + '</div>');
    lapisan().appendChild(bg);
    lapisan().appendChild(lembar);
    requestAnimationFrame(function () { lembar.classList.add("buka"); });
    bg.addEventListener("click", function () { tutupLembar(lembar); });
    lembar.addEventListener("click", function (e) {
      if (e.target.closest("[data-tutup]")) tutupLembar(lembar);
    });
    lembar._bg = bg;
    return lembar;
  }
  function tutupLembar(lembar) {
    lembar.classList.remove("buka");
    if (lembar._bg) lembar._bg.remove();
    setTimeout(function () { lembar.remove(); }, 280);
  }
  function labelStatus(s) {
    return {
      menunggu_cs: "Menunggu CS", disetujui: "Disetujui", diproses: "Diproses",
      dikirim: "Dikirim", selesai: "Selesai", ditolak: "Ditolak", dibatalkan: "Dibatalkan"
    }[s] || s;
  }

  /* ── Mulai ────────────────────────────────────────────────────────── */
  const tema = localStorage.getItem("pp_tema");
  if (tema) document.documentElement.dataset.tema = tema;

  Auth.mulai({
    peran: ["user", "admin", "cs", "kurir"],
    judul: "Aplikasi Pembeli",
    saatMasuk: async function () {
      muat(true, "Memuat katalog…");
      try {
        await Katalog.muat();
        muatKeranjang();
        rangka();
        buka("beranda");
      } catch (e) {
        $("#akar").innerHTML = '<div class="kosong"><div class="ikon">⚠️</div>' + esc(e.message) +
          '<br><button class="btn kecil" style="margin-top:14px" onclick="location.reload()">Coba lagi</button></div>';
      }
      muat(false);
    }
  });
})();
