/* =====================================================================
 * KONFIGURASI APLIKASI — ubah bagian ini saja
 * ===================================================================== */
window.APP_CONFIG = {

  // ── Firebase (Console > Project settings > Your apps > Web) ─────────
  firebase: {
    apiKey:            "GANTI_FIREBASE_WEB_API_KEY",
    authDomain:        "GANTI-PROJEK.firebaseapp.com",
    projectId:         "GANTI-PROJEK",
    storageBucket:     "GANTI-PROJEK.appspot.com",
    messagingSenderId: "000000000000",
    appId:             "1:000000000000:web:xxxxxxxxxxxx"
  },

  // ── Alamat data statis di GitHub Pages ─────────────────────────────
  // Jalur relatif, aman untuk repo biasa maupun repo <user>.github.io
  urlData:  "data/db.js",
  urlVersi: "data/versi.json",

  // ── Endpoint Apps Script (Deploy > New deployment > Web app) ───────
  apiUrl:   "https://script.google.com/macros/s/GANTI_ID_DEPLOY/exec",
  apiKunci: "GANTI_KUNCI_RAHASIA_BEBAS",   // harus sama dengan CFG.kunciApi di Code.gs

  // ── Keamanan login ─────────────────────────────────────────────────
  maksGagalLogin: 3,      // gagal berturut-turut sebelum dikunci
  jedaKunciDetik: 60,     // lama kunci dalam detik
  panjangCaptcha: 5,

  // ── Lain-lain ──────────────────────────────────────────────────────
  namaApp:   "Pasar Pinrang",
  mataUang:  "Rp",
  waCs:      "6281234567890",
  versiApp:  "1.0.0",

  // Berapa lama data boleh dipakai tanpa cek versi lagi (menit).
  // Selama ini belum lewat, aplikasi TIDAK menyentuh jaringan sama sekali.
  menitCekVersi: 180
};
