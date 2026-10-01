---
tags: [acceptance-criteria, B124]
status: active
updated: 2026-10-02
---

# AC-B124 - Area internal peserta, onboarding, dan detail kursus publik (RF7 langkah A2)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B124 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T44 - Uji peramban area internal dan detail kursus (B124)]] ·
[[09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta)]] · **Summary:** [[08-Results/B124 - Executive Summary]] ·
**Rencana:** [[11-Refactoring/RF7 - Halaman publik vs internal, dashboard per peran, onboarding]]

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B124#1 | nilai dibaca lewat rute yang hanya menjawab pemilik alamat: tanda tangan + nonce sekali-pakai, pesan khusus `lencana-records`, tanpa teks esai | **PASS** 2 Okt | `npm run verify:records` 16/0 (T45) |
| AC-B124#2 | area `#/app` hanya untuk akun; tamu kembali ke beranda dan diminta masuk | **PASS** 2 Okt | T44 langkah 4 |
| AC-B124#3 | sidebar Ringkasan · Kelas saya · Nilai & tugas · Kredensial saya · Akun, datanya dari penerbit (bukan ketikan) | **PASS** 2 Okt | T44 langkah 7–10: angka di halaman = rekaman yang diisi lewat signer (1 kursus, kuis 80) |
| AC-B124#4 | onboarding login pertama: tiga kursi, Penerbit dan Agent Owner berlabel "segera" tanpa tombol yang pura-pura mendaftarkan; tur = stasiun alur 3D; pilih kursus pertama | **PASS** 2 Okt | T44 langkah 5–6 |
| AC-B124#5 | detail kursus publik: silabus, penerbit, apa yang dibuktikan (bobot, ambang, masa berlaku, rubricHash), tombol Daftar → login; tanpa harga sampai B | **PASS** 2 Okt | T44 langkah 1–3 |
| AC-B124#6 | kredensial pribadi: halaman menjelaskan bahwa yang dibagikan adalah tautan verifier kredensialnya, bukan dashboard | **PASS** 2 Okt | T44 langkah 9 |
| AC-B124#7 | ponsel: sidebar menjadi tab bawah, tanpa overflow horizontal | **PASS** 2 Okt | T44 langkah 11 |
| AC-B124#8 | gerbang hijau | **PASS** 2 Okt | `tsc` + build, `probe` 88/0, `check:spec` 14/0, `verify:records` 16/0, `verify:privy` 41/0, `verify:quizkeys` 30/0, `check:samples` 11/0, `npm run audit` bersih, `check:labels` 8/0; baterai `npm run sync:numbers` 23 harness · 0 gagal (`cleanup`: sisa baris uji 0); `sync:numbers --verify` 41 klaim sepakat |
| AC-B124#9 | login sungguhan → onboarding otomatis pada login pertama → dashboard membaca rekaman dengan tanda tangan dompet tertanam | **TERBUKA** | menunggu uji login builder (sama dengan AC-B123#9) |

**Temuan yang dicatat, bukan dikerjakan di sini:** `GET /progress?learner=…&course=…` masih menjawab siapa pun yang tahu
alamatnya (progres per lesson, jumlah usaha dinilai, skor terbaik). Dashboard tidak memakainya untuk nilai; ruang kelas masih
memakainya untuk sinkron. Menutupnya berarti ruang kelas ikut menandatangani bacaan — keputusan builder.
