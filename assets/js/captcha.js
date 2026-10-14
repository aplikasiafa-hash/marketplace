/* =====================================================================
 * captcha.js — captcha dibuat sepenuhnya di perangkat (offline)
 * Tidak ada permintaan jaringan, tidak ada layanan pihak ketiga, gratis.
 * ===================================================================== */
(function () {
  const PANJANG = (window.APP_CONFIG && window.APP_CONFIG.panjangCaptcha) || 5;
  // huruf/angka membingungkan dibuang: 0 O 1 I l 5 S 2 Z
  const HURUF = "ABCDEFGHJKLMNPQRTUVWXY346789";

  function acak(a, b) { return a + Math.random() * (b - a); }

  function kodeAcak(n) {
    let s = "";
    const buf = new Uint32Array(n);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (let i = 0; i < n; i++) s += HURUF[buf[i] % HURUF.length];
    return s;
  }

  function temaGelap() {
    const atur = document.documentElement.dataset.tema;
    if (atur === "gelap") return true;
    if (atur === "terang") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function gambar(kanvas, kode) {
    const w = kanvas.width = 260, h = kanvas.height = 90;
    const g = kanvas.getContext("2d");
    const gelap = temaGelap();

    g.fillStyle = gelap ? "#1E222B" : "#F7F8FA";
    g.fillRect(0, 0, w, h);

    // bintik derau
    for (let i = 0; i < 420; i++) {
      g.fillStyle = "rgba(" + (gelap ? "255,255,255," : "0,0,0,") + acak(0.04, 0.16) + ")";
      g.fillRect(acak(0, w), acak(0, h), acak(1, 2.4), acak(1, 2.4));
    }

    // garis pengganggu
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = "hsla(" + acak(16, 34) + ",72%," + (gelap ? "66%" : "52%") + ",0.42)";
      g.lineWidth = acak(1, 2.2);
      g.beginPath();
      g.moveTo(0, acak(0, h));
      g.bezierCurveTo(acak(0, w), acak(0, h), acak(0, w), acak(0, h), w, acak(0, h));
      g.stroke();
    }

    // huruf
    const lebarSel = w / (kode.length + 1);
    for (let i = 0; i < kode.length; i++) {
      g.save();
      g.translate(lebarSel * (i + 0.75), h / 2 + acak(-6, 6));
      g.rotate(acak(-0.38, 0.38));
      g.font = "bold " + Math.round(acak(36, 46)) + "px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      // sebagian huruf gelap pekat, sebagian oranye — tetap kontras di dua tema
      g.fillStyle = Math.random() < 0.62
        ? (gelap ? "#ECEFF4" : "#121420")
        : "hsl(" + acak(18, 32) + ",88%," + (gelap ? "64%" : "44%") + ")";
      g.fillText(kode[i], 0, 0);
      g.restore();
    }

    // garis coret tipis di atas huruf
    g.strokeStyle = "rgba(" + (gelap ? "255,255,255," : "0,0,0,") + "0.28)";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, acak(h * 0.3, h * 0.7));
    g.lineTo(w, acak(h * 0.3, h * 0.7));
    g.stroke();
  }

  /**
   * Captcha(kanvas, tombolMuatUlang)
   *   .baru()           buat kode baru
   *   .cocok(teks)      true bila jawaban benar (abaikan besar/kecil huruf)
   */
  window.Captcha = function (kanvas, tombol) {
    let kode = "";
    const api = {
      baru: function () { kode = kodeAcak(PANJANG); gambar(kanvas, kode); return api; },
      cocok: function (teks) {
        return String(teks || "").trim().toUpperCase() === kode;
      },
      kode: function () { return kode; }
    };
    if (tombol) tombol.addEventListener("click", function (e) { e.preventDefault(); api.baru(); });
    if (kanvas) kanvas.addEventListener("click", function () { api.baru(); });
    return api.baru();
  };

  /* ── Pembatas percobaan login (tersimpan lokal) ──────────────────── */
  const KUNCI = "pp_gagal_login";

  window.Pembatas = {
    status: function () {
      let s;
      try { s = JSON.parse(localStorage.getItem(KUNCI) || "{}"); } catch (e) { s = {}; }
      const sisa = Math.max(0, Math.ceil(((s.sampai || 0) - Date.now()) / 1000));
      return { gagal: s.gagal || 0, terkunci: sisa > 0, sisaDetik: sisa };
    },
    catatGagal: function () {
      const C = window.APP_CONFIG;
      const s = window.Pembatas.status();
      const gagal = s.gagal + 1;
      const data = { gagal: gagal, sampai: 0 };
      if (gagal >= C.maksGagalLogin) {
        data.sampai = Date.now() + C.jedaKunciDetik * 1000;
        data.gagal = 0; // hitungan diulang setelah masa kunci
      }
      localStorage.setItem(KUNCI, JSON.stringify(data));
      return window.Pembatas.status();
    },
    reset: function () { localStorage.removeItem(KUNCI); }
  };
})();
