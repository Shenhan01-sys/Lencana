---
tags: [results, executive-summary, B165]
status: active
updated: 2026-10-05
---

# B165 - Executive Summary — "Kredensial saya" berupa kartu dan lembar sertifikat dari dokumen kredensial

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B165 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B165 - Halaman sertifikat dari dokumen kredensial]] ·
**Testing:** [[09-Testing/T88 - Uji peramban kartu kredensial dan lembar sertifikat (B165)]] ·
**Terkait:** [[03-Frontend/FE9 - Credentials page and certificate sheet]], hub desain [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] (S3), B153, B164

Permintaan builder 5 Okt malam: desain S3 dijadikan halaman sertifikat sungguhan di `/app/credentials`, dengan pilihan alamat atau nama sebelum cetak; "Lencana itu
selalu dark mode, jgn terang"; opsi A untuk pembangkit QR; dan halaman yang hanya berisi daftar kredensial dinilai "ga user friendly".

## 1. Apa yang diubah

- **Daftar jadi kartu** (`web/src/pages/credentials.ts`, `credentials.css`): judul kursus, status di chain, nilai, tanggal, agen penandatangan, artefak NFT, ID, dan tiga
  tombol; keadaan kosong, gagal baca, dokumen tidak tersaji, dan dokumen gagal diambil masing-masing punya tampilan sendiri. Tanpa tanda tangan dompet.
- **Lembar sertifikat** (`web/src/pages/certificate-view.ts`, `certificate.css`): desain S3 sebagai LAPISAN di atas dasbor (rute `#/app/credentials/<hash>`), data dari dokumen
  kredensial dan kriteria di host tepi + `statusOf` yang baru dibaca; dialog alamat/nama sebelum cetak; nama muat otomatis; cetak A4 landscape satu halaman.
- **Data dan logika murni** (`web/src/certificate.ts`, `certificate-logo.ts`, `credentials.ts`): pemetaan dokumen → lembar, status, nama penerima, QR, kristal dari byte hash, cincin,
  pemuat dengan pemeriksaan kepemilikan dua arah. Diuji `probe` di Node.
- `web/src/config.ts`: `CREDENTIAL_HOST` dan `APP_HOST` dipindah ke sini (halaman `#/app` tidak boleh mengimpor `main.ts`); `main.ts` mengekspor ulang namanya yang sama dan `probe` menjaga keduanya.
- `web/package.json`: dependensi **`qrcode-generator@2.0.4`** (MIT, tanpa dependensi turunan) — opsi A builder.
- `web/src/pages/dashboard.ts`: bagian Kredensial memanggil halaman baru; fungsi tabel lama dihapus dari dasbor (`readMyCredentials` tetap dipakai kotak "Baca dari chain" di kelas).
- **Tidak** disentuh: kontrak, database, signer, `CERT_ADDRESS`.

**Keputusan builder yang menentukan bentuknya:** Lencana selalu gelap (jadi tanpa tema terang dan tanpa tombol tema, **dan cetak/PDF juga gelap** — saya membaca "jgn terang" secara harfiah;
pilihan latar terang untuk hemat tinta bisa ditambahkan di dialog bila diminta); opsi A untuk QR; nama tidak diverifikasi dan tidak ikut tanda tangan.

**Yang sengaja tidak ada:** nilai per komponen (kuis 75, esai 98, praktik 100) — angka itu tidak ada di dokumen kredensial yang tertanda tangan, jadi cincin dalam hanya menggambarkan bobot dari kriteria;
lembar untuk kredensial orang lain; status "BERLAKU" sebagai klaim di lembar.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| bentuk "Kredensial saya" | tabel hash + status + artefak (`readMyCredentials`) | kartu per kredensial dengan judul kursus, nilai, tanggal, status, artefak, tombol (T88 langkah 1) |
| sertifikat untuk dicetak | tidak ada (hanya spesimen desain di vault) | lembar S3 dari dokumen nyata, `#/app/credentials/<hash>`, QR terbaca = tautan verifier (T88 langkah 2) |
| baris penerima | — | alamat dompet atau nama pilihan peserta, dipilih sebelum cetak, tersimpan per alamat di peramban, nama muat 2–60 huruf (T88 langkah 3, 4) |
| cetak/PDF | — | 1 halaman A4 landscape, tampilan gelap, dasbor tersembunyi (T88 langkah 5) |
| lembar atas nama orang lain | — | tidak bisa: hash harus ada di `credentialsOf(akun)` dan alamat di dokumen harus sama (T88 langkah 8; `probe`) |
| "gagal" menyamar sebagai "kosong" | daftar kosong dan galat sudah dibedakan di tabel lama | tetap, dan ditambah dokumen "tidak tersaji" ≠ "gagal diambil" (T88 langkah 10–12) |
| status tidak berlaku | kolom teks di tabel | kartu bertepi merah + penanda di lembar; BERLAKU tidak ditulis sebagai klaim (T88 langkah 13, 15) |
| `probe` | 173/0 | **210/0** (grup B165: 37 pemeriksaan, termasuk jalur data terhadap chain 97 publik dan dokumen tepi sungguhan) |
| `tsc` · `build` | 0 · 0 | 0 · 0 |
| baterai `sync:numbers` | 37 harness · 37 hijau, 1.477 pemeriksaan (B164) | 37 harness · 37 hijau, **1.514** pemeriksaan (+37 = grup `probe` B165); `audit` bersih, `check:labels` 8/0 |

## 3. Status

~~**SELESAI di kode, belum LIVE** — perubahan belum didorong; produksi masih menampilkan tabel lama; AC-B165#21 (LIVE) OPEN.~~
**SELESAI · LIVE** — didorong `8b58481..e2fc546` atas kata builder ("gas", 5 Okt 23.33 WIB). Dibaca sesudah dorongan: bundel produksi berganti ke `assets/index-DjuuhFae.js` (934.267 byte) — nama dan ukuran sama dengan
`npm run build` lokal — dan memuat teks kartu dan lembar; skrip T88 utama diulang terhadap `https://lencana-psi.vercel.app/` dengan hasil sama seperti di dev (kartu, lembar, QR terbaca, dialog, cetak 1 halaman, kredensial orang lain
ditolak, RPC gagal ≠ kosong, dokumen 404 ≠ 500, DICABUT berpenanda, ponsel, Inggris), nol galat konsol (T88 §LIVE; AC-B165#21 PASS). Run `deploy-signer` 37341787181 untuk dorongan ini selesai **sukses** dalam 1 menit 21 detik (dipicu filter jalur `web/src/**`; signer tidak berubah).

## 4. Risiko tersisa

- **Cetak di kertas sungguhan dan peramban selain Chrome 154 belum diuji**; PDF hanya diperiksa lewat media `print` dan jumlah halaman. Latar gelap penuh memakan banyak tinta bila dicetak di kertas.
- **FE masih punya varian terang otomatis di sistem yang disetel terang** (`@media (prefers-color-scheme: light)` di `web/src/style.css:57`): lembar dan penampilnya selalu gelap (T88 langkah 19), tetapi di sistem terang
  dasbor di bawahnya ikut memakai token terang secara sebagian — latar body tetap gelap, namun tulisan "Lencana" di navbar tampak gelap di atas gelap dan beberapa kapsul menjadi terang
  (`b165-sistem-terang-daftar.png`). Itu cacat lama, tidak diubah di B165; kalau "selalu gelap" juga berarti dasbor, itu butuh baris baru (usul: hapus blok media itu atau tetapkan `color-scheme: dark`).
- ~~Kontras token lembar adalah angka perancang S3; yang saya hitung sendiri hanya warna penanda status.~~ *(6 Okt, B167/T90)* Kontras lembar kini diukur sendiri dari piksel render print: 0 gagal dari 38 teks di latar gelap (terburuk 4,99:1) dan terang (4,94:1). Kontras kartu daftar (teks `#848e9c`/`#b7bdc6` di atas gelap) dihitung 5,83:1 dan 9,20:1 tetapi tidak diukur dari piksel.
- ~~Latar gelap penuh memakan banyak tinta bila dicetak~~ *(6 Okt, B167)* pilihan latar terang hemat tinta kini ada di dialog cetak.
- ~~FE masih punya varian terang otomatis…~~ *(6 Okt, B166)* dibuang: Lencana selalu gelap (T89).
- Pustaka QR baru menambah dependensi pihak ketiga; hasilnya diperiksa dari struktur (45 modul, tiga pola pencari) dan didekode jsQR di peramban, tetapi bukan dari pemindai telepon.
- Kunci bobot dokumen kriteria menjadi label SVG: disaring ke huruf/angka/garis dan di-escape; dokumen tetap berasal dari host tepi kita sendiri.

## 5. Bukti

T88 langkah 1–20; `probe` grup B165 (37 pemeriksaan); `web/src/certificate.ts`, `web/src/credentials.ts`, `web/src/pages/credentials.ts`, `web/src/pages/certificate-view.ts`,
`web/src/pages/certificate.css`, `web/src/config.ts` (host publik). Tangkapan layar sesi: kartu, lembar (normal, dicabut, kasus terburuk kaki), cetak, ponsel.
