---
tags: [testing, "T90"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core`; lembar B153 dengan identitas uji (alamat B153 publik, kunci acak); media `print` diemulasikan dan `page.pdf` dipakai untuk jumlah halaman; kontras diukur dari piksel tangkapan lembar
measured: 2026-10-06
result: LATAR CETAK BEKERJA — dialog punya pilihan Gelap (bawaan) / Terang; Batal tidak mengubah apa pun; Terang → print 1×, tersimpan per alamat, layar TETAP gelap; media print terang: kertas/lapisan/body/html rgb(245,245,245), kaca putih, QR putih, 1 halaman; Gelap lagi mengembalikan rgb(11,14,17); pilihan diingat saat dibuka ulang; kontras terukur dari piksel: 0 gagal dari 38 teks di KEDUA latar (terburuk 4,94:1 terang, 4,99:1 gelap); nol galat konsol. LIVE belum
---

# T90 - Uji peramban latar cetak sertifikat (B167)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B167 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B167 - Latar cetak terang atau gelap di dialog sertifikat]] · **Summary:** [[08-Results/B167 - Executive Summary]] · **Terkait:** T88 (lembar), T89 (selalu gelap)

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara). Skrip puppeteer (alat sesi) membuka `#/app/credentials/<hash B153>`, menunggu lembar selesai bergerak.
2. Dialog dibuka lewat "Cetak / simpan PDF"; `window.print` diganti penghitung. Pilihan latar diubah lewat radio `cert-paper`.
3. Untuk media print: `page.emulateMediaType('print')`, baca `getComputedStyle`, `page.pdf({ preferCSSPageSize: true })` untuk jumlah halaman.
4. **Kontras dari piksel:** tiap simpul teks di lembar diambil kotaknya; warna teks dari computed style (`fill` untuk teks SVG, `color` untuk lainnya), latar = median piksel di kotak dari tangkapan lembar; syarat 4,5:1 (3:1 untuk ≥ 24 px atau tebal ≥ 18,66 px).

## Hasil 6 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | keadaan awal | `data-paper` lembar dan lapisan `gelap`; penyimpanan `lencana.sertifikat.latar:<alamat>` kosong |
| 2 | dialog | legenda "Baris penerima di lembar" dan "Latar saat dicetak"; radio: "Gelap — seperti di layar" **terpilih**, "Terang — hemat tinta"; catatan "Hanya hasil cetak atau PDF yang berubah; di layar sertifikat tetap gelap." |
| 3 | pilih Terang lalu **Batal** | `data-paper` tetap `gelap`, `print` 0×, penyimpanan kosong |
| 4 | pilih Terang lalu **Cetak** | `data-paper` lembar dan lapisan `terang`, `print` **1×**, penyimpanan `terang` |
| 5 | di **layar** sesudahnya | lembar dan lapisan `rgb(11,14,17)`, judul `rgb(234,236,239)` — tetap gelap |
| 6 | media **print**, Terang | lembar di (0,0) 1122 × 793, kertas `rgb(245,245,245)`, lapisan/`body`/`html` `rgb(245,245,245)`, judul `rgb(30,35,41)`, panel kaca `rgba(255,255,255,0.95)`, pelat QR `rgb(255,255,255)`, skor 87, PDF **1 halaman**; **kontras: 38 teks, 0 gagal**, terburuk "0x" 4,94:1, "Esai 30%" 5,15:1, "Hasil" 7,09:1, "/100" 7,12:1 |
| 7 | pilih **Gelap** lagi lalu Cetak; media print | radio sebelumnya menunjukkan Terang terpilih (diingat); sesudahnya `data-paper` `gelap`, kertas dan `body` `rgb(11,14,17)`, penyimpanan `gelap`, PDF **1 halaman**; **kontras: 38 teks, 0 gagal**, terburuk "Diberikan kepada" 4,99:1, "Alamat dompet peserta" 5,10:1, "Esai 30%" 5,15:1, "format" 5,20:1 |
| 8 | buka ulang dengan penyimpanan `terang` untuk alamat itu | `data-paper` `terang`, radio Terang terpilih di dialog, **layar tetap `rgb(11,14,17)`** |
| 9 | galat | `pageerror` dan `console.error`: **0** |

Tangkapan: `b167-dialog.png`, `b167-layar-setelah-pilih-terang.png`, `b167-cetak-terang.png`.

**Pengukuran pertama (salah alat, diperbaiki):** untuk teks SVG (label cincin "Kuis 50%" dst.) skrip memakai `color`, bukan `fill`, sehingga latar terang tampak gagal (1,12–2,6:1); teks itu dicat `#eaecef` di atas cakram gelap di kedua latar. Setelah memakai `fill`, hasilnya 0 gagal.

## Batas

- Cetak di kertas sungguhan belum; PDF hanya diperiksa lewat jumlah halaman dan media `print`, tidak dirasterisasi.
- Kontras = median piksel di kotak teks (perkiraan; latar kristal dan kaca bergradasi), bukan pemeriksaan per piksel di bawah huruf.
- Chrome 154 saja; `:has()` dipakai untuk latar halaman di balik lembar (Chrome 105+, Safari 15.4+, Firefox 121+).
- Produksi belum menjalankan perubahan ini (AC-B167#11 OPEN) sampai dorongan atas kata builder.
