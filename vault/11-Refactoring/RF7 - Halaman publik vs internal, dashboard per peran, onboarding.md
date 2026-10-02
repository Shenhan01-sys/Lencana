---
tags: [refactoring, "RF7", information-architecture]
status: active — urutan A → A2 → B → C di-acc builder 2 Okt
updated: 2026-10-02
---

# RF7 - Halaman publik vs internal, dashboard per peran, onboarding

**Part of:** [[11-Refactoring/00 - Hub Refactoring]] · **Keputusan:** [[00-Overview/03 - Decisions]] D59 ·
**Dasar:** [[11-Refactoring/RF3 - Onboarding and Identity]], [[11-Refactoring/RF4 - Learning Surface Target Shape]],
[[11-Refactoring/RF5 - Enrollment and the Paid Path]], [[11-Refactoring/RF5a - Decision Memo - Enrollment Surface]],
[[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]]

## Pemicu (builder, 2 Okt)

> "Masa iya study room dan submit work dimunculin public sehingga org tanpa identitas bisa baca coursenya dan submit
> work? Ini kita ga pakai simulasi, lgsg jalan aja … ini bukan simulasi FE lagi jd ga boleh ditampilin asal begitu."
>
> "… paham page mana yg internal atau hanya muncul saat user login dan page mana yg muncul untuk publik/umum yg hanya
> ingin melihat … home pagenya akan ada dashboard dengan sidebar/navbar tiap role (peserta, publisher, agent owner) …
> tiap pertama kali masuk hrs ada onboardingnya."

Yang terukur di kode saat itu: nav tamu memang simpel, tetapi modal masuk punya tiga pintu tanpa akun — **"1-Click Demo
Learner (rina.bnb)"** (siapa pun menjadi alamat seed demo `0x5cA3…7c3B`, warisan `2c9db66` 22 Sep), **kunci perangkat**
anonim, dan **dompet ekstensi** — dan begitu salah satunya dipakai, nav membuka Study Room, AI Studio (`#/submit`, menjalankan
`simulateAiEvaluation` atas esai preset) dan Portfolio (`#/portfolio`, kartu fiktif "Rina Oktaviani ✓ ON-CHAIN VERIFIED",
OI-5). Item nav `.student-only` itu dipasang port `97bd106` tanpa menutup pintu demonya.

## Keputusan yang sudah diambil builder (D59)

1. **Akun = login Privy saja.** Halaman tidak menyebut "Privy" — orang awam mengenal Google: tombol **"Lanjutkan dengan
   Google"** (alur OAuth Privy di belakangnya) dan **"pakai email"** (kode 6 digit). Tombol Google hanya tampil kalau Google
   aktif di app; dibaca 2 Okt lewat pengaturan publik app: `google_oauth: false`, `email_auth: true` — jadi builder perlu
   menyalakannya di dashboard Privy (Login methods → Socials → Google). Menampilkan tombol Google yang ternyata menjalankan
   email adalah klaim palsu, jadi itu tidak dilakukan.
2. Kunci perangkat, dompet ekstensi, dan Demo Learner **keluar dari UI** (kunci perangkat tetap dipakai harness).
3. **Tidak ada simulasi di permukaan publik:** Tamper Playground dan konsol x402 tiruan di Verifier, "Simulate State Flip" di
   Trust Center, AI Studio, portofolio fiktif.
4. Dialog login mengikuti referensi builder (`References/b4492ab0d444891b66419c4717283b4f.jpg`: kartu terbelah, form di kiri,
   potongan kertas berlapis di kanan; di ponsel kartu kaca menimpa ilustrasi) dengan palet Lencana.
5. **Target:** halaman dibagi publik vs internal; internal = dashboard ber-sidebar per peran + onboarding saat login pertama.
6. **Target:** kursus diakses sesudah bayar (RF5) — belum dibangun (Product Bar #10 ⚠️; `POST /enroll` hari ini gratis).

## Peta halaman

### Publik — orang yang hanya ingin melihat

| halaman | rute | isi | hari ini |
|---|---|---|---|
| Beranda | `#/` | hero + kartu kredensial, katalog ringkas, alur 3D tiga kursi, trust | ada |
| Katalog | `#/courses` | kartu kursus: durasi, modul, penerbit, **harga** | ada, tanpa harga |
| Detail kursus | `#/course/<id>` | silabus per modul, apa yang dibuktikan, penerbit, harga, tombol Daftar | **belum** — rute itu sekarang langsung ke ruang kelas (perlu login); harga menunggu B |
| Cek bukti | `#/verify` | tempel hash/UID → status dari chain | ada; simulasinya dibuang di langkah A |
| Penerbit | `#/publishers` | registri dari manifest | ada |
| Trust & Limits | `#/agent-hub` | batas yang jujur | ada; simulasi dibuang di langkah A |
| Kredensial yang dibagikan | dokumen `/credentials/<hash>` + verifier | hanya lewat tautan dari pemiliknya | ada |
| Masuk | dialog | Google / email | langkah A |

### Internal — eksklusif setelah login

| peran | sidebar | dasar di core hari ini |
|---|---|---|
| **Peserta** | Ringkasan · Kelas saya · Nilai & tugas (kuis, esai menunggu pengesahan, praktik) · Kredensial saya (milik sendiri, tombol bagikan) · Pembayaran (B) · Akun | semua rute ada: `/auth/privy`, `/enroll`, `/progress`, `/grade`, `/essay`, `/praktik`; kredensial dibaca dari chain per alamat |
| **Penerbit** | Ringkasan · Kursus (manifest + `rubricHash`) · Antrean esai & pengesahan · Agen disewa & tagihan · Terbit & cabut · Pendapatan · Akun | aksi ada (`/essay/judgement`, `/essay/reviewers`, `/essay/review`, `/agents/hire`, `/agent-charges`) tetapi diotorisasi **kunci penerbit**, bukan akun; terbit/cabut masih CLI; tidak ada rute daftar antrean esai |
| **Agent Owner** | Ringkasan · Agen saya (identitas ERC-8004, dompet) · Tarif · Sewa aktif · Pekerjaan bertanda tangan · Pendapatan · Akun | `GET /agents/<id>/rates` membaca registry; tarif = metadata yang ditulis pemilik NFT di chain; tidak ada akun atau layar |

Model peran produk belum ada di core (Product Bar #11 ⚠️) — dashboard Penerbit dan Agent Owner bergantung padanya.
*(2 Okt, B128: kini ada — `POST /me/roles` membaca kursi dari fakta: kunci penerbit, keanggotaan yang ditandatangani kunci itu, dan `ownerOf` ERC-8004. Lihat langkah C1 di bawah.)*

### Onboarding — sekali, saat login pertama

1. Masuk dengan Google/email → dompet belajar dibuat otomatis (tanpa seed phrase).
2. "Kamu datang sebagai…": **Peserta** (langsung) · **Penerbit** (ajukan → platform yang memutuskan, karena masuk daftar
   penerbit di chain adalah `addIssuer` milik platform) · **Agent Owner** (hubungkan agen: `agentId` ERC-8004 → dibuktikan
   `ownerOf(agentId)` = alamat akunmu).
   *(Koreksi 2 Okt, D63: kursi Penerbit di dashboard = **anggota** penerbit yang diberi keanggotaan oleh kunci penerbit, bukan
   pengajuan ke platform; masuk daftar penerbit di chain tetap `addIssuer` milik platform dan tidak berubah. Sejak B128
   onboarding menampilkan kursi yang dipegang dari fakta, bukan label "segera".)*
3. Tur singkat per peran — langkahnya sama dengan stasiun alur 3D di beranda ([[03-Frontend/FE8 - Business flow 3D (brief)]]) —
   lalu masuk dashboard.

## Yang harus dibangun di core (tidak bisa di FE saja)

- **Peran akun:** peserta (bawaan), penerbit (keanggotaan pada issuer, diberikan platform), agent owner (terbukti dari `ownerOf`).
  *(D63, dikerjakan B128: keanggotaan diberikan **kunci penerbit**, bukan platform — `publisher_members`, `npm run grant:member`.)*
- Otorisasi aksi penerbit lewat akun — misalnya akun anggota penerbit ditunjuk sebagai reviewer (`/essay/reviewers`) sehingga
  pengesahan bisa dari dashboard dengan dompet akunnya.
  *(Koreksi 2 Okt, D63: pengesah esai adalah agen AI ERC-8004 (B120), bukan akun anggota. Anggota **menunjuk** agen pengesah
  dan menyewa agen penilai bila hibahnya menyatakan `appoint=1`/`hire=1` — itu langkah C2.)*
- `GET` antrean esai per penerbit; terbit-dari-rekaman lewat rute (sekarang `issue --from-attempts` di CLI); ringkasan pendapatan dari settlement.
- Enrollment berbayar (RF5) untuk langkah B.

## Urutan — di-acc builder 2 Okt (A → A2 → B → C), satu backlog per langkah, gerbang per langkah

| langkah | isi | gerbang |
|---|---|---|
| **A** (di-acc 2 Okt; dikerjakan 2 Okt — B123, tersisa uji login sungguhan oleh builder) | tutup pintu tanpa akun; dialog login baru (Google bila aktif + email, tanpa kata Privy); simulasi publik dibuang; nav tamu = halaman publik; sesudah login nav = "Dashboard" (sementara ke `#/me`); `#/submit` dan `#/portfolio` dialihkan | tsc + build + probe + `verify:privy`, uji peramban tamu vs login, OI untuk berkas maintainer |
| **A2** (dikerjakan 2 Okt — B124, tersisa uji login sungguhan oleh builder) | cangkang dashboard (sidebar) + onboarding + dashboard Peserta dari data yang ada; **diputuskan 2 Okt:** onboarding menampilkan ketiga peran — Penerbit dan Agent Owner berlabel "segera" (syaratnya dijelaskan, tanpa tombol yang pura-pura mendaftarkan) — dan **detail kursus publik** (silabus, penerbit, apa yang dibuktikan, tombol Daftar) masuk A2, harganya menyusul di B; status esai butuh satu rute baca baru di core | sama + uji onboarding |
| **B** (dikerjakan 2 Okt — B125, tersisa bayar lewat login sungguhan oleh builder) | enrollment berbayar + halaman detail kursus publik dengan harga (RF5); **diputuskan 2 Okt:** harga Web3 Dasar 10 LDC-demo, Web3 Lanjut 25 LDC-demo (koin uji testnet, disimpan di luar hash manifest); tombol "Ambil koin uji" (server mencetak ke dompet peserta, sekali per alamat per hari, berlabel testnet); enrollment yang sudah ada sebelum harga berlaku tetap boleh lanjut; bayar tanpa gas lewat izin EIP-2612 + Permit2 (x402) ke `SettlementSplit`, `orders` = paid; premi tenggat (`CourseDeposit`) tetap terpisah | harness bayar → enrollment lunas; server menolak belajar tanpa lunas |
| **C** (dipecah 2 Okt, D63: C1 → C2 → C3, acc per langkah) | **C1** peran di core (dikerjakan 2 Okt — B128, tersisa uji login sungguhan oleh builder) · **C2** dashboard Penerbit + aksi anggota (sewa agen penilai, tunjuk agen pengesah) dengan tanda tangan anggota · **C3** dashboard Agent Owner + agen ERC-8004 baru untuk akun builder | harness peran (`verify:roles` 39/0) + uji peramban per peran (T51 untuk C1) |
