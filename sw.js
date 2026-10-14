/* =====================================================================
 * sw.js — Service Worker
 * Gambar & berkas aplikasi disimpan permanen di perangkat (cache-first),
 * jadi setiap foto produk hanya diunduh SATU KALI selamanya.
 * ===================================================================== */
const VERSI_SHELL = "pp-shell-v2";
const CACHE_GAMBAR = "pp-gambar-v1";   // jangan dihapus saat perbarui versi
const CACHE_DATA   = "pp-data-v1";
const CACHE_FONT   = "pp-font-v1";

const RANGKA = [
  "./",
  "index.html", "user.html", "admin.html", "cs.html", "kurir.html",
  "assets/css/app.css",
  "assets/js/config.js", "assets/js/lib.js", "assets/js/captcha.js",
  "assets/js/auth.js", "assets/js/data.js",
  "assets/js/user.js", "assets/js/admin.js", "assets/js/cs.js", "assets/js/kurir.js",
  "assets/img/kosong.svg",
  "manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSI_SHELL)
      .then((c) => Promise.allSettled(RANGKA.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(
        nama.filter((n) => n.startsWith("pp-shell-") && n !== VERSI_SHELL)
            .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

function adalahGambar(url) {
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname) ||
         url.pathname.includes("/img/");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. Gambar: selalu dari cache bila ada. Tidak pernah diunduh dua kali.
  if (adalahGambar(url)) {
    e.respondWith(
      caches.open(CACHE_GAMBAR).then(async (c) => {
        const simpanan = await c.match(req, { ignoreSearch: true });
        if (simpanan) return simpanan;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") c.put(req, res.clone());
          return res;
        } catch (err) {
          return simpanan || Response.error();
        }
      })
    );
    return;
  }

  // 2. versi.json: selalu dari jaringan (berkas sangat kecil).
  if (url.pathname.endsWith("versi.json")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // 3. db.js: kunci berdasarkan parameter ?v=, jadi versi baru = unduhan baru.
  if (url.pathname.endsWith("db.js")) {
    e.respondWith(
      caches.open(CACHE_DATA).then(async (c) => {
        const simpanan = await c.match(req);
        if (simpanan) return simpanan;
        const res = await fetch(req);
        if (res.ok) {
          const lama = await c.keys();
          await Promise.all(lama.map((k) => c.delete(k)));  // sisakan satu versi
          c.put(req, res.clone());
        }
        return res;
      })
    );
    return;
  }

  // 4. Font Google: disimpan permanen, diunduh sekali saja.
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {
    e.respondWith(
      caches.open(CACHE_FONT).then(async (c) => {
        const simpanan = await c.match(req);
        if (simpanan) return simpanan;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") c.put(req, res.clone());
          return res;
        } catch (err) {
          return simpanan || Response.error();
        }
      })
    );
    return;
  }

  // 5. Firebase & Apps Script: selalu langsung ke jaringan.
  if (/gstatic\.com|googleapis\.com|script\.google\.com|firebaseio/.test(url.host)) return;

  // 6. Rangka aplikasi: cache dulu, perbarui di latar belakang.
  e.respondWith(
    caches.match(req).then((simpanan) => {
      const jaringan = fetch(req).then((res) => {
        if (res.ok) caches.open(VERSI_SHELL).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => simpanan);
      return simpanan || jaringan;
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "bersihkan-gambar") caches.delete(CACHE_GAMBAR);
  if (e.data === "lewati-tunggu") self.skipWaiting();
});
