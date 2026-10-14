/* =====================================================================
 * ui.js — komponen bersama untuk aplikasi admin, cs, dan kurir
 * ===================================================================== */
(function () {

  window.lembarBaru = function (judul, isiHtml) {
    const bg = el("div", "tabir");
    bg.style.display = "block";
    bg.style.background = "rgba(0,0,0,.45)";
    const lembar = el("div", "lembar",
      '<div class="pegangan"></div>' +
      '<div class="lembar-kepala"><h3>' + esc(judul) + '</h3>' +
      '<button class="btn abu kecil" data-tutup>✕</button></div>' +
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
  };

  window.tutupLembar = function (lembar) {
    if (!lembar) return;
    lembar.classList.remove("buka");
    if (lembar._bg) lembar._bg.remove();
    setTimeout(function () { lembar.remove(); }, 280);
  };

  window.STATUS = {
    menunggu_cs: "Menunggu CS",
    disetujui:   "Disetujui",
    diproses:    "Sedang Disiapkan",
    dikirim:     "Dalam Pengiriman",
    selesai:     "Selesai",
    ditolak:     "Ditolak",
    dibatalkan:  "Dibatalkan"
  };
  window.labelStatus = function (s) { return STATUS[s] || s; };

  /** Rangka halaman standar: bilah atas + isi + navigasi bawah. */
  window.rangkaAplikasi = function (judul, menu, saatPindah) {
    $("#akar").innerHTML =
      '<div class="bilah-atas"><h2>' + esc(judul) + '</h2>' +
      '<button id="btn-keluar-atas" title="Keluar">⎋</button></div>' +
      '<div class="isi" id="isi"></div>' +
      '<nav class="nav-bawah">' + menu.map(function (m) {
        return '<button data-h="' + esc(m.id) + '"><span>' + m.ikon + '</span>' + esc(m.teks) + '</button>';
      }).join("") + '</nav>';

    $("#btn-keluar-atas").addEventListener("click", Auth.keluar);
    $(".nav-bawah").addEventListener("click", function (e) {
      const b = e.target.closest("[data-h]");
      if (b) pindah(b.dataset.h);
    });

    function pindah(id) {
      $$(".nav-bawah button").forEach(function (b) { b.classList.toggle("aktif", b.dataset.h === id); });
      window.scrollTo(0, 0);

      // Wadah diganti elemen baru setiap pindah halaman, supaya pendengar
      // klik dari halaman sebelumnya tidak menumpuk.
      const lama = $("#isi");
      const baru = el("div", "isi");
      baru.id = "isi";
      lama.replaceWith(baru);

      saatPindah(id, baru);
    }
    window.pindahHalaman = pindah;
    pindah(menu[0].id);
  };

  window.memuat = function (wadah) {
    wadah.innerHTML = '<div class="kosong">' +
      '<div class="putar gelap" style="margin:0 auto"></div></div>';
  };

  window.kosong = function (wadah, ikon, teks) {
    wadah.innerHTML = '<div class="kosong"><div class="ikon">' + ikon + '</div>' + esc(teks) + '</div>';
  };

  /** Ubah status pesanan + catat ke log transaksi. */
  window.ubahStatusPesanan = async function (id, status, tambahan) {
    const data = Object.assign({
      status: status,
      riwayat: firebase.firestore.FieldValue.arrayUnion({
        status: status, waktu: new Date().toISOString(),
        oleh: Auth.profil.email, peran: Auth.profil.peran
      })
    }, tambahan || {});

    await fb.db.collection("pesanan").doc(id).update(data);
    await fb.db.collection("log_transaksi").add({
      tipe: "ubah_status", pesanan_id: id, status: status,
      uid: Auth.profil.uid, peran: Auth.profil.peran,
      waktu: firebase.firestore.FieldValue.serverTimestamp()
    });
  };

  /** Kartu ringkas sebuah pesanan. */
  window.kartuPesanan = function (id, o, tombolHtml) {
    return '<div class="kartu" data-id="' + esc(id) + '">' +
      '<div class="antar"><span class="tebal">' + esc(o.kode || id.slice(0, 7)) + '</span>' +
      '<span class="label ' + esc(o.status) + '">' + esc(labelStatus(o.status)) + '</span></div>' +
      '<div class="mini" style="margin:5px 0 9px">' + esc(tanggal(o.dibuat)) + ' · ' + esc(o.kecamatan || "-") + '</div>' +
      '<div class="antar"><div><div class="tebal">' + esc(o.nama || "-") + '</div>' +
      '<div class="mini">' + esc(o.hp || "-") + '</div></div>' +
      '<div class="harga">' + rupiah(o.total) + '</div></div>' +
      '<div class="mini" style="margin-top:7px">' + esc(o.alamat || "-") + '</div>' +
      '<div class="mini">' + (o.item || []).length + ' produk · ' + esc(o.metode_bayar || "-") + '</div>' +
      (tombolHtml ? '<div class="baris-tombol" style="margin-top:12px">' + tombolHtml + '</div>' : "") +
      '</div>';
  };

  /** Rincian item pesanan di dalam lembar. */
  window.rincianPesanan = function (o) {
    return (o.item || []).map(function (i) {
      return '<div class="baris-item">' +
        (i.gambar ? '<img src="' + esc(i.gambar) + '">' : "") +
        '<div class="tengah"><h4>' + esc(i.nama) + '</h4>' +
        '<div class="mini">' + i.jumlah + ' ' + esc(i.satuan || "pcs") + ' × ' + rupiah(i.harga) + '</div></div>' +
        '<div class="tebal">' + rupiah(i.harga * i.jumlah) + '</div></div>';
    }).join("") +
    '<hr><div class="antar"><span>Subtotal</span><span>' + rupiah(o.subtotal) + '</span></div>' +
    '<div class="antar" style="margin-top:5px"><span>Ongkir</span><span>' + rupiah(o.ongkir) + '</span></div>' +
    '<div class="antar tebal" style="margin-top:8px"><span>Total</span><span class="harga">' + rupiah(o.total) + '</span></div>' +
    (o.catatan ? '<hr><div class="mini">Catatan: ' + esc(o.catatan) + '</div>' : "") +
    (o.riwayat && o.riwayat.length
      ? '<hr><div class="tebal" style="margin-bottom:6px">Riwayat</div>' +
        o.riwayat.map(function (r) {
          return '<div class="mini">• ' + esc(labelStatus(r.status)) + ' — ' + esc(tanggal(r.waktu)) +
                 ' (' + esc(r.oleh || "-") + ')</div>';
        }).join("")
      : "");
  };

  const tema = localStorage.getItem("pp_tema");
  if (tema) document.documentElement.dataset.tema = tema;
})();
