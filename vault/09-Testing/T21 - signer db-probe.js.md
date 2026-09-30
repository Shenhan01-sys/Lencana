---
tags: [testing, "T21"]
status: active
updated: 2026-09-30
command: npm run verify:db
measured: 2026-09-30
result: 70 checks / 0 failed
---

# T21 - signer db-probe.js (state belajar di Postgres)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Bar:** [[00-Overview/11 - Product Bar]] · **Skema:** [[11-Refactoring/RF5a - Decision Memo - Enrollment Surface]]

## Kenapa harness ini ada

Sampai 28 Sep "state" kami adalah satu berkas JSON. Untuk klaim "siapa lulus apa" itu cukup; untuk
klaim "peserta mengerjakan kursusnya di dalam sistem" tidak. Jadi ada Postgres (Supabase) dan ada
endpoint yang boleh dipanggil front-end: `POST /enroll` dan `POST /attempts`.

Yang diuji di sini bukan "SQL-nya jalan". Yang diuji adalah **dua hal yang membuat DB tidak
berkhianat pada produk kita**:

1. **Secret key melewati RLS** (`BYPASSRLS`), jadi *siapa yang boleh menulis untuk sebuah alamat*
   harus diperiksa signer sendiri — bukan database, bukan "dia sudah di belakang server kami".
2. **`attempt_hash` dihitung dari rekaman**, bukan diterima dari klien. Kalau klien boleh mengirim
   hash, angka di sertifikat bisa berasal dari luar sistem.

## Command

```powershell
cd app/signer
# butuh SUPABASE_URL + SUPABASE_SECRET_KEY (+ SUPABASE_PUBLISHABLE_KEY utk pemeriksaan RLS publik) di .env
npm run verify:db
```

Ia menyalakan server signer di port sendiri, membuat dua kunci peserta yang belum pernah ada, lalu
menandatangani request-nya. Tidak ada alamat yang diketik di berkas ini.

## Run 28 Sep — 12 / 0

```
  peserta uji: 0xBca7B77946C962Fad4C3a3f284Ca5A896E207792
  ok    POST /enroll dengan tanda tangan peserta -> 200 dan baris dibuat
  ok    nonce yang sama dipakai ulang -> DITOLAK
  ok    enroll ulang (nonce baru) -> baris yang sama, created=false
  ok    tanda tangan bukan dari alamat peserta -> DITOLAK
  ok    menulis tanpa tanda tangan -> DITOLAK, bukan 200 diam-diam
  ok    mencatat usaha tanpa enrollment -> DITOLAK dengan alasan enrollment
  ok    POST /attempts dengan tanda tangan peserta -> 201 + attemptHash
  ok    attempt_hash dari server == hasil hitung ulang dari rekaman (dokumen bisa diaudit)
  ok    course_gates: graded_attempts >= 1 dan best_score terbaca
  ok    course_gates TIDAK menyamar sebagai selesai: all_lessons_done null/false, bukan true
  ok    dan gerbang keduanya tetap terpisah: graded_attempts >= 1 tapi all_lessons_done bukan true
  ok    publishable key TIDAK bisa membaca enrollment (RLS bekerja untuk klien publik)

DB HIJAU — 12 pemeriksaan, 0 gagal
```

Regresi yang dicek setelahnya: `check.js` **88/0**, `serve-probe` **49/0** (server.js ikut berubah),
dan server yang sama menolak `/enroll` dengan `503` kalau `SUPABASE_SECRET_KEY` tidak diisi — ia
tidak berpura-pura menjadi server yang punya DB.

## Yang ketahuan oleh probe-nya sendiri, bukan oleh penulisnya

- **`bool_and` atas nol baris = `NULL`, bukan `false`.** Peserta tanpa satu pun baris `lesson_progress`
  menghasilkan `all_lessons_done: null`. Keduanya berarti "belum selesai", tapi siapa pun yang menulis
  `=== false` akan meleset. Karena itu diperiksa dua bentuk, dan `issue --from-attempts` nanti **wajib**
  memperlakukan null sebagai belum selesai.
- **Dua merah pertama adalah tesku yang salah, bukan endpoint-nya.** (a) Probe menyalakan server lalu
  menyerah setelah 2 detik per percobaan — padahal `/healthz` memang membaca chain untuk setiap hash
  yang dipantau, dan errBuf justru menampilkan banner server yang hidup di port itu; gejalanya
  "server tidak naik", artinya "aku tidak sabar". (b) Kasus "usaha tanpa enrollment" ditandatangani
  dengan pesan yang berbeda dari yang dikirim, jadi ia dapat 401 *karena alasan lain* — ditolak, tapi
  bukan oleh guard yang mau kita uji. Penolakan yang kebetulan benar tidak membuktikan apa pun.

## Run kedua hari yang sama — 19 / 0, dan dua cacat yang hanya bisa kelihatan lewat HTTP

```
  ok    lompat locked -> completed DITOLAK dengan 422 (bukan 401: orangnya benar, urutannya salah)
  ok    locked -> unlocked diterima
  ok    unlocked -> completed diterima
  ok    status yang sama dikirim ulang -> noop, bukan baris progres baru
  ok    GET /progress membaca dari DB: lesson itu completed
  ok    1 dari 19 lesson TIDAK dibaca sebagai selesai: lessons_total terisi dari katalog, allLessonsDone false
  ok    nonce enroll pertama tercatat di used_nonces (bertahan melewati restart proses)
```

Dua cacat nyata yang ditemukan probe ini, keduanya punya saya, keduanya tidak akan kelihatan dari
membaca kode saja:

1. **Token Prefer salah ketik.** `resolution=merge-duplicated` (harusnya `-duplicates`) membuat
   "upsert" saya menjadi INSERT biasa, jadi `unlocked -> completed` mati dengan `23505 duplicate key`.
   Kenapa lolos tiga percobaan pertama: jalur enroll memendek lebih dulu (`if (existing) return`)
   sehingga kode yang salah itu tidak pernah dieksekusi sampai ada yang menulis baris kedua.
2. **View saya berbohong soal "selesai".** `all_lessons_done` dihitung `bool_and(...)` atas LEFT JOIN
   ke `lesson_progress`, jadi ia hanya melihat baris yang sudah ditulis: peserta dengan **1 dari 19**
   lesson dilaporkan `true`. Perbaikannya (migrasi `0004`): `enrollments.lessons_total` dihitung dari
   **katalog penerbit di server** — kalau klien boleh mengirim angka ini, dia bisa lulus dengan
   menulis 1 — dan view mengembalikan `NULL` ketika penyebutnya belum diketahui. Postgres juga menolak
   `create or replace view` yang mengubah urutan/nama kolom (`42P16`); percobaan pertama migration itu
   gagal tepat di situ, dan view harus dijatuhkan lebih dulu.

Satu koreksi kecil yang layak dicatat sebagai keputusan, bukan gaya: lompatan status yang ilegal kini
`422`, bukan `401`. Memberi keduanya kode yang sama membuat monitoring kita membunyikan alarm
otentikasi setiap kali peserta mengirim urutan yang salah — dan alarm yang sering salah akan berhenti
dibaca.

## Run ketiga hari yang sama — 28 / 0, dan yang bertambah adalah tempat penilaian berdiri

```
  ok    POST /grade tanpa tanda tangan -> DITOLAK
  ok    /grade MENOLAK skor kiriman klien (peserta tidak menilai dirinya sendiri)
  ok    picks bagian -> 422 dan sebabnya menyebut soal yang belum dijawab
  ok    lesson yang bukan kuis -> 422
  ok    /grade menilai sendiri: 0/5 benar = 0 (verdict fail, ambang 80)
  ok    jawaban server menyebut jumlah komponen per soal (rincian tersimpan, bukan cuma angka akhir)
  ok    attempt_hash dari /grade bisa dihitung ulang KLIEN (audit tidak butuh secret key)
  ok    usaha kedua lesson yang sama -> attempt_no dihitung server (bukan ditimpa)
  ok    usaha dinilai lewat /grade ikut terbaca di gerbang (graded_attempts naik)
```

Sembilan pemeriksaan itu milik satu rute baru: **`POST /grade`** (`signer/src/quiz.js`). Alasan dia
ada bukan kosmetik API. Halaman belajar selama ini menghitung nilai kuisnya sendiri
(`web/src/lms.ts` aksi `grade`, memakai `item.answer` yang ikut terbundel ke browser) lalu
menyimpan hasilnya. Menyambungkan halaman ke `POST /attempts` apa adanya akan berarti **peserta
mengirim angkanya sendiri, dan `attempt_hash` membekukannya supaya terlihat sah** — tepat kegagalan
yang kita jual sebagai pembeda LMS orang lain. Jadi yang naik ke server adalah *pilihan*, dan angka
yang turun adalah hasil hitung penerbit:

- menolak `body.score` dengan `400` (diperiksa, bukan cuma tidak dibaca);
- `verdict` diambil dari `lesson.quiz.passPct` milik penerbit, bukan dari perasaan halaman;
- `attempt_no` dihitung server dari baris yang ada, jadi klien tidak bisa menimpa usahanya sendiri;
- jawabannya memuat `attemptNo` + `rubricHash` supaya **klien** bisa menghitung ulang
  `attempt_hash` — audit tidak boleh butuh secret key.

## Run 30 Sep malam — 50 / 0, dan satu lubang yang harness ini sendiri tidak pernah tanyakan (B78(c))

```
  ok    view course_gates membawa origin=test untuk baris probe (baris tes terbedakan di view, migrasi 0008)
  ok    publishable key TIDAK bisa membaca enrollment (RLS bekerja untuk klien publik)
  ok    publishable key TIDAK bisa membaca view course_gates (security_invoker: RLS berlaku di balik view)

DB HIJAU — 50 pemeriksaan, 0 gagal
```

Dua pemeriksaan baru (48 → 50), keduanya lahir dari migrasi
`supabase/migrations/0008_course_gates_origin_and_invoker.sql`:

1. **View membawa `origin`.** Baris tes tidak disaring dari `course_gates` — harness ini dan
   `verify:attempts` membaca gerbang peserta ujinya lewat view itu — tapi sekarang terbedakan:
   `?origin=eq.demo` sebelum mengutip angka apa pun dari view.
2. **View tidak lagi melewati RLS.** Halaman ini sejak 28 Sep memeriksa `enrollments` dengan publishable
   key dan berhenti di situ. Migrasi 0006 (29 Sep) membuat ulang view **tanpa** `security_invoker`, dan
   sehari penuh pemeriksaan itu tetap hijau sementara kunci yang sama membaca view-nya. Terukur sebelum
   0008: `GET /rest/v1/course_gates` → 200, **20 baris** (alamat peserta, hitungan lesson, nilai
   terbaik); sesudahnya → 200 `[]`. Pemeriksaan kedua di atas adalah penjaganya, dan pengukuran
   pra-migrasi itu kontrol negatifnya.

Pelajaran yang sama dengan B43/B56, di lapis lain: "RLS tabel hijau" bukan "data tidak terbaca" —
view di schema `public` adalah pintu kedua, dan pintu yang tidak ditanyai akan dilaporkan tertutup.

## Run sesudahnya, malam yang sama — 70 / 0: angka model tidak menerbitkan sendirian (B104)

```
  ok    usulan model atas usaha esai kedua -> 200, skor 80, needsReview=true
  ok    angka model TANPA pengesahan tidak dihitung gerbang (graded_attempts tidak naik)
  ok    baris nyata: evidenceFromAttempts MENOLAK esai bernilai model tanpa pengesahan (issue berhenti sebelum gas)
  ok    penunjukan reviewer oleh alamat selain penerbit -> 401
  ok    penunjukan atas nama penerbit dengan tanda tangan kunci lain -> 401
  ok    penerbit menunjuk DIRINYA sebagai reviewer -> 422 (lapis tengah harus kunci lain)
  ok    pesan penunjukan yang tidak menyebut kursus + reviewer -> 422 (tanda tangan nonce saja tidak cukup)
  ok    pengesahan oleh kunci yang BELUM ditunjuk -> 403
  ok    penerbit menunjuk reviewer dengan tanda tangannya -> 200
  ok    pesan pengesahan yang tidak mengikat usaha + keputusan + angka akhir -> 401
  ok    penyesuaian yang hanya menilai sebagian rubrik -> 422
  ok    pengesahan atas esai yang dinilai penerbit TANPA model -> 422 (tidak ada usulan model untuk disahkan)
  ok    pengesahan adjusted oleh reviewer yang ditunjuk -> 200: usulan 80 -> akhir 92
  ok    sesudah disahkan, usaha itu dihitung gerbang (graded_attempts naik tepat satu)
  ok    baris nyata: angka esai yang diturunkan = angka REVIEWER, bukan angka model, dan komponennya graded_by human
  ok    provenan menyebut siapa mengesahkan, keputusan apa, dari berapa ke berapa
  ok    pengesahan kedua atas usulan yang sama -> 409
  ok    penerbit menilai ulang dengan model -> pengesahan lama gugur, penurunan bukti kembali DITOLAK
  ok    rejected -> 200 tanpa angka akhir; gerbang dan penurunan bukti tetap tertutup (ditolak != nol)
  ok    penunjukan reviewer uji dibersihkan (sisa di review_roles = 0)

DB HIJAU — 70 pemeriksaan, 0 gagal
```

Dua puluh pemeriksaan baru (50 → 70), satu rantai: **AI menilai → manusia mengesahkan → penerbit
menerbitkan**. Skemanya `supabase/migrations/0009_judgement_reviews.sql`; rutenya
`POST /essay/reviewers` (penerbit menunjuk) dan `POST /essay/review` (reviewer mengesahkan) —
lihat [[04-Signer-Service/S7 - Server routes and lifecycle]].

- **Gerbang diuji dari dua sisi atas baris yang sama**: tertutup sebelum pengesahan, terbuka sesudah
  `adjusted`, tertutup lagi sesudah penerbit menilai ulang, dan tetap tertutup sesudah `rejected`.
- **"Baris nyata"** berarti `evidenceFromAttempts` — fungsi yang dipakai `issue --from-attempts` —
  dijalankan atas hasil `attemptsFor()` dari Postgres, bukan atas fixture. Bentuk embed PostgREST
  (`judgement_reviews` sebagai objek atau array) ikut teruji di situ.
- **Satu merah yang benar pada run pertama sesudah migrasi**: pemeriksaan lama
  `graded_attempts == jumlah baris attempts yang benar-benar dinilai` mencetak `4 vs 5`. View-nya
  benar; definisi "dinilai" di pemeriksaan itulah yang basi (dulu cukup `verdict != incomplete`).
  Diselaraskan, dan sebabnya ditulis di komentar pemeriksaan itu.

**Yang TIDAK dibuktikan run ini:** tidak ada kertas yang terbit di chain lewat rantai tiga lapis
(`verify:attempts:live` tidak dijalankan ulang — lihat [[09-Testing/T22 - signer attempts-check.js]]);
reviewer adalah alamat yang ditunjuk penerbit, tanpa identitas dan tanpa pencabutan penunjukan; dan
tidak ada UI maupun CLI untuk mengesahkan, hanya rute HTTP.

## Yang sudah ditutup sejak halaman ini ditulis pertama kali (28 Sep, sore)

- ~~Front-end belum terhubung~~ → **sudah**: `web/src/learning.ts` + `#/learn` memanggil
  `/enroll`, `/progress` (POST dan GET), `/grade`; kontraknya diuji tanpa jaringan di
  [[09-Testing/T4 - npm run probe]] (bagian "klien belajar"), dan satu alur utuhnya lewat HTTP ada
  di [[09-Testing/T22 - signer attempts-check.js]].
- ~~`attempt_hash` belum masuk dokumen~~ → **sudah**: `issue --from-attempts` memetakannya ke
  dokumen hasil di `…/results/…` (B62, [[09-Testing/T22 - signer attempts-check.js]]). Bentuk
  `credentialHash` tidak berubah, jadi kertas yang sudah lolos validator tidak berubah diam-diam.

## Yang masih TIDAK dibuktikan 28/0 ini

- **Kunci jawaban tetap ada di bundel browser.** `/grade` menghapus *laporan angka oleh peserta*,
  bukan *kemampuan membaca kunci*. Yang menjual "kuis tidak bisa dicurangi" salah — lihat
  [[10-Contributors/Claims-Cheat-Sheet]]. (B80)
- **Angka esai dan praktik masih datang dari klien** (`POST /attempts`) karena penerbit belum punya
  antrean penilaian untuk keduanya. Peserta uji di atas memang memakai jalur itu. (B81)
- `used_nonces` belum punya TTL/pembersihan, dan progres tidak punya batas staleness seperti kolom
  yang sama di Canvas (`lock_version`).
- Bukan uji beban, bukan uji multi-instance, dan tidak menyentuh chain: tidak ada attestation baru
  yang dibuat probe ini.

**Related:** [[09-Testing/T20 - signer journey.js]] · [[09-Testing/T19 - signer e2e.js]] ·
[[00-Overview/11 - Product Bar]] · [[12-LMS-References/L7 - What an e-course must have]]
