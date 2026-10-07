---
tags: [acceptance-criteria, B174, frontend]
status: active
updated: 2026-10-07
---

# AC-B174 - Sabuk alur esai di dasbor Penerbit

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B174 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T98 - Uji peramban sabuk alur esai (B174)]] ·
**Summary:** [[08-Results/B174 - Executive Summary]] · **Terkait:** B129 (stepper lama), B172 + [[03-Frontend/FE11 - Prototipe Admin proses bisnis (B172)]] (bahasa visual sabuk), B173 (video memakai halaman ini)

Builder 7 Okt pagi, sesudah menonton draf video: "di bagian /app/pub/essays di section Essay pipeline tolong diperbagus dong UI-nya,
lalu generate ulang videonya".

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B174#1 | kartu "Essay pipeline" (Ringkasan **dan** tab Esai) menampilkan empat tahap sebagai BENDA di satu sabuk: baki (diserahkan), robot pengusul (diusulkan), meja stempel (final), tong (ditolak); stepper empat kartu + bar porsi B129 tidak ada lagi | **PASS** 7 Okt | T98 langkah 1–2 (`oldStepper` 0) |
| AC-B174#2 | jumlah benda = jumlah data pipeline nyata: kertas di baki = menunggu dinilai (+ sudut merah = di bawah syarat mekanis), kertas bertag jingga = menunggu pengesahan, kertas berstempel hijau/jingga/abu = disahkan/disesuaikan/dinilai kunci penerbit, gumpalan di tong = ditolak | **PASS** 7 Okt | T98 langkah 1: 0 / 3 / 6 (1 hijau, 3 jingga, 2 abu) / 0, total 9 = "9 essays in total" |
| AC-B174#3 | tahap yang menunggu tindakan (diusulkan > 0) disorot dan menautkan ke tabel esai; angka final hijau, ditolak merah bila > 0 | **PASS** 7 Okt | T98 langkah 1 (`review hot`, tautan ada) |
| AC-B174#4 | teks tetap untuk pembaca layar dan dua bahasa: angka, judul, sublabel di DOM; gambar SVG `aria-hidden`; EN dan ID | **PASS** 7 Okt | T98 langkah 1 + 4 |
| AC-B174#5 | gerak bermakna (sabuk berjalan, kertas berpindah tahap, stempel menekan), hanya `transform`, padam bila `prefers-reduced-motion` | **PASS** 7 Okt (animasi terbaca: `eb-hopx` ×2, `eb-press`) | T98 langkah 1; `web/src/pages/essay-belt.css` |
| AC-B174#6 | ponsel 390 px: 2 × 2 tanpa sabuk, tanpa gulir samping | **PASS** 7 Okt | T98 langkah 3 |
| AC-B174#7 | gerbang: `tsc` 0, `build` 0, `probe` 267/0, `check:labels` + `audit` bersih, nol galat konsol | **PASS** 7 Okt | T98 §gerbang |
| AC-B174#8 | LIVE: sesudah dorongan, kartu terbaca di produksi | **TERBUKA** | dorongan atas kata builder |
