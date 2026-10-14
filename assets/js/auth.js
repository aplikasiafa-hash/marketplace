/* =====================================================================
 * auth.js — login Firebase + captcha offline + sesi menetap
 *
 * Prinsip hemat kuota & hemat kuota Firebase:
 *  - Sesi disimpan di perangkat (browserLocalPersistence). Selama belum
 *    logout, aplikasi langsung membuka dasbor tanpa layar login.
 *  - Profil & peran pengguna dibaca dari Firestore SEKALI, lalu disimpan
 *    lokal. Pembacaan ulang hanya bila UID berubah atau cache kedaluwarsa.
 *  - Captcha diverifikasi di perangkat, jadi percobaan salah tidak pernah
 *    menyentuh Firebase sama sekali.
 * ===================================================================== */
(function () {
  const C = window.APP_CONFIG;
  const UMUR_PROFIL_HARI = 7;

  firebase.initializeApp(C.firebase);
  const auth = firebase.auth();
  const db   = firebase.firestore();

  try {
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
  } catch (e) {}

  window.fb = { auth: auth, db: db };

  /* ── Tampilan login ───────────────────────────────────────────────── */
  function rangkaLogin(judulPeran) {
    return (
      '<div class="layar-login">' +
        '<div class="merek">' +
          '<div class="merek-ikon">🛒</div>' +
          '<h1>' + esc(C.namaApp) + '</h1>' +
          '<p class="peran-label">' + esc(judulPeran) + '</p>' +
        '</div>' +

        '<form id="form-login" autocomplete="on" novalidate>' +
          '<label>Email' +
            '<input type="email" id="in-email" inputmode="email" autocomplete="username" required placeholder="nama@email.com">' +
          '</label>' +

          '<label>Kata sandi' +
            '<div class="input-gabung">' +
              '<input type="password" id="in-sandi" autocomplete="current-password" required placeholder="••••••••">' +
              '<button type="button" id="btn-lihat" class="ikon-kanan" aria-label="Lihat sandi">👁</button>' +
            '</div>' +
          '</label>' +

          '<label>Kode keamanan' +
            '<div class="captcha-baris">' +
              '<canvas id="kanvas-captcha" aria-label="Kode keamanan"></canvas>' +
              '<button type="button" id="btn-captcha" class="btn-putar" aria-label="Ganti kode">⟳</button>' +
            '</div>' +
            '<input type="text" id="in-captcha" inputmode="text" autocapitalize="characters" ' +
              'autocomplete="off" spellcheck="false" required placeholder="Ketik kode di atas">' +
          '</label>' +

          '<p id="pesan-login" class="pesan-galat" role="alert"></p>' +
          '<button type="submit" id="btn-masuk" class="btn lebar">Masuk</button>' +
        '</form>' +

        '<p class="kaki-login">Belum punya akun? Hubungi CS ' +
          '<a href="https://wa.me/' + esc(C.waCs) + '" rel="noopener">WhatsApp</a></p>' +
        '<p class="versi">v' + esc(C.versiApp) + '</p>' +
      '</div>'
    );
  }

  /* ── Profil pengguna (peran) ──────────────────────────────────────── */
  async function ambilProfil(pengguna, paksa) {
    const kunci = "profil:" + pengguna.uid;
    if (!paksa) {
      const simpanan = await ambilLokal(kunci);
      if (simpanan && Date.now() - simpanan.disimpan < UMUR_PROFIL_HARI * 864e5) {
        return simpanan.profil;
      }
    }

    const cuplik = await db.collection("pengguna").doc(pengguna.uid).get();
    if (!cuplik.exists) {
      throw new Error("Akun belum terdaftar di sistem. Hubungi CS untuk aktivasi.");
    }
    const profil = Object.assign({ uid: pengguna.uid, email: pengguna.email }, cuplik.data());
    if (profil.aktif === false) throw new Error("Akun Anda dinonaktifkan.");

    await simpanLokal(kunci, { profil: profil, disimpan: Date.now() });
    return profil;
  }

  function catatLogin(data) {
    // satu tulisan kecil per login berhasil
    db.collection("log_login").add(Object.assign({
      waktu: firebase.firestore.FieldValue.serverTimestamp(),
      perangkat: navigator.userAgent.slice(0, 180)
    }, data)).catch(function () {});
  }

  /* ── Alur utama ───────────────────────────────────────────────────── */
  /**
   * Auth.mulai({ peran, judul, saatMasuk })
   *   peran     : array peran yang boleh membuka halaman ini
   *   judul     : teks di bawah logo pada layar login
   *   saatMasuk : fungsi(profil) dipanggil sekali setelah terverifikasi
   */
  window.Auth = {
    profil: null,

    mulai: function (opsi) {
      const akar = $("#akar");
      let sudahJalan = false;

      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});

      auth.onAuthStateChanged(async function (pengguna) {
        if (!pengguna) {
          sudahJalan = false;
          Auth.profil = null;
          tampilkanLogin(akar, opsi);
          return;
        }
        if (sudahJalan) return;
        sudahJalan = true;

        muat(true, "Menyiapkan…");
        try {
          const profil = await ambilProfil(pengguna);

          if (opsi.peran.indexOf(profil.peran) < 0) {
            muat(false);
            await konfirmasi(
              "Akun ini terdaftar sebagai \"" + (profil.peran || "user") + "\", " +
              "bukan " + opsi.peran.join("/") + ". Anda akan dikeluarkan."
            );
            return Auth.keluar();
          }

          Auth.profil = profil;
          Pembatas.reset();
          muat(false);
          opsi.saatMasuk(profil);

        } catch (galat) {
          muat(false);
          toast(galat.message, "galat");
          sudahJalan = false;
          await auth.signOut();
        }
      });
    },

    keluar: async function () {
      const ya = await konfirmasi("Keluar dari aplikasi?");
      if (!ya) return;
      if (Auth.profil) {
        try { await simpanLokal("profil:" + Auth.profil.uid, null); } catch (e) {}
      }
      await auth.signOut();
      location.reload();
    },

    /** Dipakai halaman lain untuk memastikan peran tertentu. */
    wajibPeran: function (daftar) {
      return Auth.profil && daftar.indexOf(Auth.profil.peran) >= 0;
    }
  };

  function tampilkanLogin(akar, opsi) {
    akar.innerHTML = rangkaLogin(opsi.judul || "Masuk");

    const captcha = Captcha($("#kanvas-captcha"), $("#btn-captcha"));
    const pesan   = $("#pesan-login");
    const tombol  = $("#btn-masuk");
    let hitungan  = null;

    $("#btn-lihat").addEventListener("click", function () {
      const f = $("#in-sandi");
      f.type = f.type === "password" ? "text" : "password";
    });

    function galat(teks) { pesan.textContent = teks; pesan.classList.add("tampil"); }
    function bersih()    { pesan.textContent = ""; pesan.classList.remove("tampil"); }

    function perbaruiKunci() {
      const s = Pembatas.status();
      if (!s.terkunci) {
        clearInterval(hitungan); hitungan = null;
        tombol.disabled = false;
        tombol.textContent = "Masuk";
        bersih();
        return;
      }
      tombol.disabled = true;
      tombol.textContent = "Terkunci " + s.sisaDetik + " detik";
      galat("Terlalu banyak percobaan gagal. Coba lagi dalam " + s.sisaDetik + " detik.");
      if (!hitungan) hitungan = setInterval(perbaruiKunci, 1000);
    }
    perbaruiKunci();

    $("#form-login").addEventListener("submit", async function (e) {
      e.preventDefault();
      bersih();

      if (Pembatas.status().terkunci) return perbaruiKunci();

      const email = $("#in-email").value.trim();
      const sandi = $("#in-sandi").value;
      const jawab = $("#in-captcha").value;

      if (!email || !sandi) return galat("Email dan kata sandi wajib diisi.");

      // Captcha diperiksa lebih dulu — kalau salah, Firebase tidak dipanggil.
      if (!captcha.cocok(jawab)) {
        captcha.baru();
        $("#in-captcha").value = "";
        const s = Pembatas.catatGagal();
        if (s.terkunci) return perbaruiKunci();
        return galat("Kode keamanan salah. Sisa percobaan: " +
          (C.maksGagalLogin - s.gagal) + ".");
      }

      tombol.disabled = true;
      muat(true, "Memeriksa akun…");
      try {
        const kredensial = await auth.signInWithEmailAndPassword(email, sandi);
        Pembatas.reset();
        catatLogin({ uid: kredensial.user.uid, email: email, hasil: "berhasil", aplikasi: opsi.judul });
        // onAuthStateChanged mengambil alih dari sini
      } catch (err) {
        muat(false);
        captcha.baru();
        $("#in-captcha").value = "";
        const s = Pembatas.catatGagal();
        tombol.disabled = false;

        const pesanGalat = {
          "auth/invalid-credential": "Email atau kata sandi salah.",
          "auth/wrong-password":     "Email atau kata sandi salah.",
          "auth/user-not-found":     "Email atau kata sandi salah.",
          "auth/invalid-email":      "Format email tidak sah.",
          "auth/user-disabled":      "Akun dinonaktifkan. Hubungi CS.",
          "auth/too-many-requests":  "Terlalu banyak percobaan. Tunggu beberapa saat.",
          "auth/network-request-failed": "Tidak ada koneksi internet."
        }[err.code] || "Gagal masuk. Coba lagi.";

        if (s.terkunci) perbaruiKunci();
        else galat(pesanGalat + " Sisa percobaan: " + (C.maksGagalLogin - s.gagal) + ".");
      }
    });
  }
})();
