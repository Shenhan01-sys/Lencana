---
tags: [acceptance-criteria, B167]
status: active
updated: 2026-10-06
---

# AC-B167 - Latar cetak terang atau gelap di dialog sertifikat

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B167 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T90 - Uji peramban latar cetak sertifikat (B167)]] ·
**Summary:** [[08-Results/B167 - Executive Summary]] · **Terkait:** B165 (lembar sertifikat), B166 (Lencana selalu gelap), [[03-Frontend/FE9 - Credentials page and certificate sheet]]

Keputusan builder 5 Okt malam ("Boleh kalau untuk sertif ini") atas usul saya: cetak/PDF gelap penuh boros tinta di kertas. Pilihan ini **khusus lembar sertifikat** dan **hanya berlaku di media `print`**;
Lencana tetap selalu gelap di layar (B166).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B167#1 | dialog cetak punya kelompok "Latar saat dicetak" dengan dua pilihan — "Gelap — seperti di layar" (bawaan) dan "Terang — hemat tinta" — dan satu kalimat penjelasan bahwa hanya hasil cetak/PDF yang berubah | **PASS** | T90 langkah 2 (legenda "Latar saat dicetak", radio gelap terpilih, catatan "Hanya hasil cetak atau PDF yang berubah; di layar sertifikat tetap gelap."); tangkapan `b167-dialog.png` |
| AC-B167#2 | "Batal" tidak mengubah apa pun (latar, penyimpanan, cetak) | **PASS** | T90 langkah 3 (memilih Terang lalu Batal → `data-paper` tetap `gelap`, `print` 0×, penyimpanan kosong) |
| AC-B167#3 | memilih Terang lalu Cetak → `print` 1×, pilihan tersimpan **per alamat** (`lencana.sertifikat.latar:<alamat>`) | **PASS** | T90 langkah 4; `probe` "latar cetak: bawaan gelap; terang disimpan per alamat … tidak bocor ke alamat lain" |
| AC-B167#4 | di **layar** lembar dan lapisan tetap gelap sesudah memilih Terang | **PASS** | T90 langkah 5 (`rgb(11,14,17)` untuk lembar dan lapisan; judul `rgb(234,236,239)`); tangkapan `b167-layar-setelah-pilih-terang.png` |
| AC-B167#5 | di media `print` dengan Terang: kertas, lapisan, `body`, dan `html` `rgb(245,245,245)`; kaca putih; pelat QR putih; teks gelap; lembar di (0,0) 1122 × 793; skor 87; **PDF 1 halaman** | **PASS** | T90 langkah 6 (`page.pdf`: 1 halaman); tangkapan `b167-cetak-terang.png` |
| AC-B167#6 | memilih Gelap lagi mengembalikan cetak gelap (`rgb(11,14,17)`), tersimpan, 1 halaman | **PASS** | T90 langkah 7 |
| AC-B167#7 | pilihan diingat saat lembar dibuka lagi untuk alamat yang sama: radio Terang terpilih, layar tetap gelap | **PASS** | T90 langkah 8 |
| AC-B167#8 | **kontras terukur dari piksel render print**, bukan dari token: tiap teks di lembar ≥ 4,5:1 (≥ 3:1 untuk teks besar) pada kedua latar | **PASS** | T90 langkah 6 dan 7: **0 gagal dari 38 teks** di kedua latar; terburuk **4,94:1** ("0x" emas, latar terang) dan **4,99:1** ("Diberikan kepada", latar gelap). Pengukuran pertama salah memakai `color` untuk teks SVG (label cincin tampak 1,1:1) dan diperbaiki memakai `fill` |
| AC-B167#9 | penyimpanan rusak, diblokir, tidak ada, atau berisi nilai asing → bawaan gelap, tanpa galat | **PASS** | `probe` "latar cetak: kembali ke gelap bila dipilih lagi, nilai asing …, penyimpanan diblokir, atau tidak ada — tanpa melempar galat" |
| AC-B167#10 | gerbang | **PASS** (kecuali baterai) | `tsc` 0, `probe` **212 / 0** (210 + 2), `build` 0, `audit` bersih 12/0, `check:labels` 8/0; baterai di Summary |
| AC-B167#11 | **LIVE** | ~~**OPEN** — menunggu dorongan atas kata builder~~ **PASS** 6 Okt — didorong `e2fc546..539d02e` atas kata builder ("Gas", 6 Okt 00.34 WIB); bundel produksi `assets/index-Czasyl8x.js`; skrip T90 diulang terhadap `https://lencana-psi.vercel.app/` dengan hasil sama: dialog Gelap/Terang, Batal tidak mengubah apa pun, Terang → `print` 1× dan tersimpan, layar tetap gelap, media print terang `rgb(245,245,245)` dengan kaca dan QR putih dan 1 halaman, Gelap lagi `rgb(11,14,17)`, diingat saat dibuka ulang, **kontras 0 gagal dari 38 teks di kedua latar** (terburuk 4,94:1 / 4,99:1), nol galat | T90 §LIVE |

**Batas klaim:** cetak di kertas sungguhan dan peramban selain Chrome 154 belum diuji; pemilih `html:has(.cert-layer[data-paper="terang"])` untuk latar halaman di balik lembar membutuhkan `:has()` (Chrome 105+, Safari 15.4+, Firefox 121+) — tanpa itu
hanya selisih piksel di tepi halaman yang tidak tertutup lembar yang tetap gelap, lembar sendiri tetap terang.
