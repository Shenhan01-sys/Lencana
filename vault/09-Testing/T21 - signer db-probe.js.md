---
tags: [testing, "T21"]
command: npm run verify:db
measured: 2026-09-28
result: 12 checks / 0 failed
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

Regresi yang dicek setelahnya: `check.js` **88/0**, `serve-probe` **48/0** (server.js ikut berubah),
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

## Yang TIDAK dibuktikan 12/0 ini

- **Bar item 4 belum selesai.** Tabel `lesson_progress` dan state machine-nya ada; **belum ada yang
  menulisnya**. Progres peserta masih satu kunci `localStorage` di browser.
- **Belum ada sambungan ke dokumen.** `attempt_hash` hari ini dihitung dan disimpan, tapi belum
  dicetak ke kredensial — itu pekerjaan `issue --from-attempts`, dan bar 7 baru benar-benar bergerak
  setelah itu.
- Bukan uji beban; bukan uji multi-user; nonce masih disimpan di memori proses (hilang saat restart,
  dan tidak dibagikan antar-instance) — Replay guard satu mesin, dan itu harus jadi tabel sebelum
  ada lebih dari satu proses.
- Tidak menyentuh chain: tidak ada attestation baru yang dibuat oleh probe ini.

**Related:** [[09-Testing/T20 - signer journey.js]] · [[09-Testing/T19 - signer e2e.js]] ·
[[00-Overview/11 - Product Bar]] · [[12-LMS-References/L7 - What an e-course must have]]
