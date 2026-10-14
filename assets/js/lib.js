/* =====================================================================
 * lib.js — utilitas bersama
 * ===================================================================== */
(function () {
  const C = window.APP_CONFIG;

  /* ── Format ───────────────────────────────────────────────────────── */
  window.rupiah = function (n) {
    n = Number(n || 0);
    return C.mataUang + " " + n.toLocaleString("id-ID");
  };

  window.tanggal = function (v) {
    const d = v && v.toDate ? v.toDate() : new Date(v || Date.now());
    return d.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  window.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ── Elemen ───────────────────────────────────────────────────────── */
  window.$  = function (s, induk) { return (induk || document).querySelector(s); };
  window.$$ = function (s, induk) { return Array.from((induk || document).querySelectorAll(s)); };

  window.el = function (tag, kelas, isi) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (isi != null) e.innerHTML = isi;
    return e;
  };

  /* ── Lapisan ──────────────────────────────────────────────────────── */
  // Semua tabir, lembar, dan toast dimasukkan ke dalam #akar, bukan ke body,
  // supaya tetap berada di dalam bingkai ponsel saat dibuka di desktop.
  window.lapisan = function () {
    return document.getElementById("akar") || document.body;
  };

  /* ── Pesan singkat ────────────────────────────────────────────────── */
  let wadahToast;
  window.toast = function (pesan, jenis) {
    if (!wadahToast || !wadahToast.isConnected) {
      wadahToast = el("div", "toast-wadah");
      lapisan().appendChild(wadahToast);
    }
    const t = el("div", "toast " + (jenis || "info"), esc(pesan));
    wadahToast.appendChild(t);
    setTimeout(function () { t.classList.add("keluar"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  };

  window.muat = function (tampil, teks) {
    let o = $("#tabir-muat");
    if (tampil) {
      if (!o) {
        o = el("div", "tabir", '<div class="putar"></div><p id="teks-muat"></p>');
        o.id = "tabir-muat";
        lapisan().appendChild(o);
      }
      $("#teks-muat").textContent = teks || "Memuat…";
      o.style.display = "flex";
    } else if (o) {
      o.style.display = "none";
    }
  };

  window.konfirmasi = function (pesan) {
    return new Promise(function (selesai) {
      const bg = el("div", "tabir");
      bg.innerHTML =
        '<div class="kotak-dialog"><p>' + esc(pesan) + '</p>' +
        '<div class="baris-tombol">' +
        '<button class="btn abu" data-x="0">Batal</button>' +
        '<button class="btn" data-x="1">Ya</button></div></div>';
      bg.style.display = "flex";
      bg.addEventListener("click", function (e) {
        const b = e.target.closest("[data-x]");
        if (!b) return;
        bg.remove();
        selesai(b.dataset.x === "1");
      });
      lapisan().appendChild(bg);
    });
  };

  /* ── Penyimpanan lokal (IndexedDB dengan cadangan localStorage) ───── */
  const NAMA_DB = "pasar-pinrang", TOKO = "kv";

  function bukaIDB() {
    return new Promise(function (ok, gagal) {
      if (!window.indexedDB) return gagal(new Error("tanpa idb"));
      const r = indexedDB.open(NAMA_DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(TOKO); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { gagal(r.error); };
    });
  }

  window.simpanLokal = async function (kunci, nilai) {
    try {
      const db = await bukaIDB();
      await new Promise(function (ok, gagal) {
        const t = db.transaction(TOKO, "readwrite");
        t.objectStore(TOKO).put(nilai, kunci);
        t.oncomplete = ok; t.onerror = function () { gagal(t.error); };
      });
    } catch (e) {
      try { localStorage.setItem("kv:" + kunci, JSON.stringify(nilai)); } catch (e2) {}
    }
  };

  window.ambilLokal = async function (kunci) {
    try {
      const db = await bukaIDB();
      return await new Promise(function (ok, gagal) {
        const r = db.transaction(TOKO, "readonly").objectStore(TOKO).get(kunci);
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { gagal(r.error); };
      });
    } catch (e) {
      try {
        const v = localStorage.getItem("kv:" + kunci);
        return v ? JSON.parse(v) : undefined;
      } catch (e2) { return undefined; }
    }
  };

  /* ── Panggil Apps Script ──────────────────────────────────────────── */
  window.panggilApi = async function (aksi, data) {
    const pengguna = firebase.auth().currentUser;
    if (!pengguna) throw new Error("Belum login.");
    const idToken = await pengguna.getIdToken();

    // text/plain supaya tidak memicu preflight CORS ke Apps Script
    const res = await fetch(C.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ aksi: aksi, data: data || {}, idToken: idToken, kunci: C.apiKunci })
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.pesan || "Permintaan gagal.");
    return j.data;
  };

  /* ── Kompres gambar di perangkat sebelum diunggah ─────────────────── */
  window.kompresGambar = function (berkas, maksSisi, mutu) {
    maksSisi = maksSisi || 900; mutu = mutu || 0.72;
    return new Promise(function (ok, gagal) {
      const baca = new FileReader();
      baca.onerror = function () { gagal(new Error("Gagal membaca berkas.")); };
      baca.onload = function () {
        const img = new Image();
        img.onerror = function () { gagal(new Error("Berkas bukan gambar yang sah.")); };
        img.onload = function () {
          let { width: w, height: h } = img;
          const skala = Math.min(1, maksSisi / Math.max(w, h));
          w = Math.round(w * skala); h = Math.round(h * skala);

          const kanvas = el("canvas");
          kanvas.width = w; kanvas.height = h;
          const ktx = kanvas.getContext("2d");
          ktx.fillStyle = "#fff"; ktx.fillRect(0, 0, w, h);
          ktx.drawImage(img, 0, 0, w, h);
          ok({ base64: kanvas.toDataURL("image/jpeg", mutu).split(",")[1], lebar: w, tinggi: h });
        };
        img.src = baca.result;
      };
      baca.readAsDataURL(berkas);
    });
  };

  /* ── Service worker ───────────────────────────────────────────────── */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
