---
tags: [frontend, certificate-design, S3]
status: draft
updated: 2026-10-05
---

# S3 - Kaca Segitiga — desain sertifikat (Glass / Soft-depth, palet Lencana)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html` · **Arsip versi biru:** `vault/03-Frontend/Sertifikat/s3-kaca-segitiga-biru.html` (tidak diubah) · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

**Status 5 Okt:** dipilih builder untuk dilanjutkan, dengan dua perubahan: (1) palet frontend Lencana (emas · arang) dengan tema **gelap** dan **terang**; (2) **penerima dinamis** — sebelum mencetak, pemilik memilih apakah lembar menampilkan alamat dompet atau namanya sendiri. Versi biru pertama disimpan apa adanya sebagai arsip.

## Design brief (doktrin §12)

- **PROCESS:** kredensial diterbitkan → ditandatangani agen penerbit (DataIntegrityProof) → bukti penerbitan tercatat di BNB Smart Chain testnet (97) → pemilik memilih baris penerima lalu mencetak → siapa pun memeriksanya lewat QR.
- **CORE OBJECT:** lensa kaca asap (medali) yang *memegang* hasil, berdiri di atas kristal arang-emas yang *dipahat* oleh byte hash kredensial.
- **RELATIONSHIP:** diagonal kanan atas → kiri bawah: kristal pekat + medali (hasil) → kanal kertas (siapa, kelas apa) → kristal kecil di balik pelat fakta; pita hitam-emas turun ke balik pelat QR (hasil → cara memeriksanya).
- **METAPHOR:** lensa di atas medan kristal — kaca tidak menyembunyikan apa yang ada di belakangnya. Objek tetap, kertas berganti: tema hanya mengganti kertas dan panel, bukan kristal, medali, atau pelat QR.
- **ENCODING:** panjang busur luar = nilai 87 dari 100 · posisi takik = batas lulus 60 · panjang busur dalam = bobot 50/30/20 · isi busur dalam = nilai 75/98/100 · terang-gelap facet dan urat emas = byte hash · panjang batang = masa berlaku 365 hari (ruas per bulan).
- **CONTINUOUS:** medali mengapung; cahaya diagonal lewat di belakang kaca tiap ±8 dtk; beberapa facet bernapas.
- **MICRO-BEAT:** cincin menutup di 87 → denyut cincin emas melebar, kilat cahaya di kaca, pelat QR terangkat 2 px.
- **TRANSITION:** facet merakit dari medali ke luar (gelombang berjarak, pegas), panel naik dengan blur-in, cincin menyapu ke 87 sambil angka menghitung naik dengan kurva yang sama.
- **ASSETS:** semua digambar sendiri (SVG/CSS/JS); logo dari `svg[data-logo]` kerangka.
- **COPY:** judul, "Diberikan kepada", penerima (alamat atau nama), kelas, Hasil/LULUS, tanggal, penerbit + catatan demo, penanda tangan, ajakan pindai + ID kredensial; `TXT.demo`, `TXT.limit`, `TXT.statusNote` di kaki pelat fakta.

## Sistem visual

**Palet = token frontend** (`web/src/style.css:7`, varian terang `web/src/style.css:57`):

| peran | gelap (bawaan FE) | terang (FE `prefers-color-scheme: light`) |
|---|---|---|
| kertas | `#0b0e11` (+ cahaya `#181a20` di belakang teks) | `#f5f5f5` (+ cahaya putih) |
| panel kaca | `#2b313a` → `#181a20`, buram | putih buram |
| teks utama | `#eaecef` | `#1e2329` |
| label kecil | muted `#848e9c` (di kertas), sub `#b7bdc6` (di kaca) | sub `#474d57` — **bukan** muted `#707a8a` (lihat Kontras) |
| teks emas | `#f0b90b` → `#fcd535` | judul besar `#a77d00` → `#8a6a00`; teks emas kecil `#8a6a00` — **bukan** `#d99e00` (lihat Kontras) |
| objek (sama di dua tema) | kristal arang `#181a20`/`#2b313a` → amber `#8a6a00` → emas `#f0b90b`/`#fcd535`; medali kaca asap + cincin emas; pelat QR putih padat; ubin logo putih (lapis emas + lapis hampir-hitam sama-sama terbaca) | sama |

- **Mekanisme tema:** `html[data-theme="gelap" | "terang"]`. Nilai awal mengikuti `prefers-color-scheme` (skrip kecil di `<head>` sebelum gambar pertama; cadangan gelap). Tombol bilah "Tema: Gelap | Terang" menimpanya untuk sesi itu; selama belum ditimpa, perubahan tema sistem diikuti. Token terang adalah gaya bawaan dan token gelap hanya ada di dalam `@media screen` (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:147`), jadi **cetak selalu terang** tanpa JavaScript.
- **Tipe:** Outfit (judul 700 besar, teks 500–600, angka tabular) · JetBrains Mono (alamat dalam kisi 5 × 2, hash, jenis proof).
- **Kedalaman:** satu bahasa — kaca buram (blur + saturate) bertepi cahaya 1 px dan bayangan lembut. Urutan lapis: atmosfer → kristal → kaca → pelat QR putih paling atas.
- **Kristal:** inti arang dengan tepi bersepuh emas tipis; byte hash kelipatan 13 memberi "urat emas" pada beberapa facet di dalam (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:758`). Percobaan pertama memberi pita amber yang lebar — separuh kristal kuning dan ramai; amber/emas lalu didorong ke tepi.
- **Komponen nilai dibedakan tanpa hue:** kuis paling terang dan paling tebal, esai sedang, praktik paling redup dan tipis (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:840`), ditambah label melengkung bernama.

## Penerima dinamis (keputusan builder)

1. **Bilah:** "Alamat dompet | Nama". Saat "Nama" aktif, isian nama muncul di bilah dan lembar berubah langsung saat mengetik (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:653`). Nama kosong → lembar tetap menampilkan alamat; baris utama tidak pernah kosong.
2. **Cetak:** "Cetak / simpan PDF" membuka dialog (`<dialog>` modal, `vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:467`): pilihan "Alamat dompet (yang tertanda tangan)" / "Nama saya" + isian (maks. 60 karakter, autocomplete mati, placeholder "Nama kamu") + catatan "Nama tidak ikut tanda tangan; alamat tetap tampil kecil di lembar." + "Cetak" / "Batal".
   - Esc atau "Batal" menutup tanpa mengubah apa pun; Tab berputar di dalam dialog; fokus kembali ke tombol pembuka.
   - "Nama saya" dengan isian kosong → galat sebaris ("Tulis namamu dulu, atau pilih alamat dompet."), `aria-invalid`, **tidak mencetak**.
   - "Cetak" menerapkan pilihan ke lembar, menyimpannya, menutup dialog, lalu memanggil `window.print()` (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:692`).
3. **Nama pas otomatis dengan mengukur** (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:857`): 58 px → mengecil sampai lantai 34 px dalam satu baris → kalau masih tidak muat, dua baris (seimbang) dan dikecilkan seperlunya. Kotak penerima setinggi tetap, jadi tidak ada elemen lain yang bergeser. Zona bebas-facet di belakangnya dilebarkan supaya nama terpanjang tidak duduk di atas kristal.
4. **Privasi:** nama selalu ditulis lewat `textContent`; pilihan + nama diingat di `localStorage` (kunci `lencana.sertifikat.penerima`, di dalam `try/catch` — tanpa penyimpanan pun tetap jalan); tidak dikirim ke mana pun.
5. **Aturan spesimen tetap:** di mode nama, `TXT.nameNote` dan alamat pendek selalu tampil di bawah nama.

## Yang berubah di kerangka (hanya untuk berkas ini)

Diperiksa mekanis 5 Okt dengan membandingkan bagian kerangka terhadap templat: hanya **11 baris** kerangka bersama yang diganti, sisanya identik. Semua tambahan bertanda `S3-SHELL`.

- `<html>` mendapat `data-theme`; komentar kepala kerangka menyebut bahwa berkas ini versi S3.
- **Bilah:** tombol "Nama contoh" menjadi "Nama" + isian nama; ditambah "Tema: Gelap | Terang"; tombol cetak membuka dialog (`aria-haspopup="dialog"`).
- **CSS kerangka:** latar halaman, kaki, dan panel "Catatan desain" ikut tema; gaya isian bilah dan dialog; dialog disembunyikan saat cetak.
- **JS kerangka:** penangan mode lama (langsung menulis `data-mode`) diganti status penerima (`REC`) + `applyRecipient()` + peristiwa `cx:recipient` (dipakai desain untuk mengukur nama); penangan cetak lama (langsung `window.print()`) diganti dialog; `afterprint` sekarang memutar ulang gerak secara utuh (angka + cincin selaras), bukan memasang kelas setengah jalan; `init` menerapkan penerima sebelum dan sesudah font siap.
- **Tidak berubah:** `CERT`, `TXT`, `FMT`, `bind`, QR dan logo, `HASHART`, `countUp`, skala-ke-layar, miring penunjuk, putar ulang, aturan `@media print` kerangka, panel "Catatan desain".

## Kontras (diukur 5 Okt)

Cara ukur: Chrome headless di 1280 × 900, skala lembar 1; untuk tiap teks di lembar, warna teks dari gaya terhitung, dan **warna latarnya diambil dari piksel tangkapan layar yang sama dengan semua teks dibuat transparan** — jadi kaca, blur, facet, dan sorot ikut terhitung. Nilai yang dilaporkan adalah kasus terburuk (persentil 5/95 latar); untuk label SVG melengkung dipakai nilai tengah, karena kotak sumbunya ikut menyapu busur di sebelahnya. Ambang: 4,5:1, atau 3:1 untuk teks ≥ 24 px.

| keadaan | teks diukur | gagal | paling tipis |
|---|---|---|---|
| gelap · alamat | 39 | 0 | "Diberikan kepada" 4,98:1 · "Alamat dompet peserta" 5,10:1 |
| gelap · nama | 39 | 0 | "Diberikan kepada" 4,98:1 · `nameNote` 5,10:1 |
| terang · alamat | 39 | 0 | "0x" 4,90:1 · label "Esai" 5,43:1 · judul "Kelulusan" 3,67:1 (≥ 24 px) |
| terang · nama | 39 | 0 | label "Esai" 5,43:1 · "Kelulusan" 3,67:1 |
| cetak (tema gelap dipilih di layar) | 39 | 0 | "0x" 4,90:1 · "Kelulusan" 3,67:1 · label "Esai" 5,61:1 |

Pengukuran pertama menemukan tiga kegagalan, lalu diperbaiki dan diukur ulang:
- "Hasil" di sorot kaca medali (4,27:1 / 4,21:1, cetak 3,25:1) → `#eaecef` tebal.
- "institusi demo, fiktif" di tema terang (4,47:1) → warna teks utama.
- Label "Esai" saat cetak (3,8:1) → cakram cetak lebih gelap + halo gelap tipis pada label melengkung (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:253`).

**Temuan untuk token FE** (dihitung dengan rumus WCAG):
- `#d99e00` — token "emas untuk teks" di mode terang — hanya **2,18:1** di `#f5f5f5`.
- `#b38600` hanya 3,05:1 (cukup untuk teks besar saja).
- Muted terang `#707a8a` hanya **3,98:1**.

Lembar ini memakai `#8a6a00` (4,65:1) untuk teks emas kecil, `#a77d00` (3,45:1) untuk judul besar, dan `#474d57` (7,8:1) untuk label. Frontend sendiri kemungkinan mengalami masalah yang sama di mode terang — belum diperiksa di sana.

Dialog (pasangan token, dihitung):

| tema | teks | galat | tombol "Cetak" |
|---|---|---|---|
| gelap | `#eaecef` di `#181a20` 14,7:1 | `#f6465d` 4,93:1 | `#0b0e11` di `#f0b90b` 10,7:1 |
| terang | `#1e2329` di putih 15,8:1 | `#cf304a` 5,03:1 | sama |

## Keputusan, batas, dan klaim

**Kalimat/label baru:**
- *Di lembar:* "format", "batas 60", "365 hari", "/100", label komponen "Kuis 75 × 50%" dst. — semuanya angka dari kredensial, tanpa klaim.
- *Di bilah dan dialog:* "Tema:", "Gelap", "Terang", "Nama", "Nama kamu", "Baris penerima di lembar", "Alamat dompet (yang tertanda tangan)", "Nama saya", "Nama tidak ikut tanda tangan; alamat tetap tampil kecil di lembar.", "Tulis namamu dulu, atau pilih alamat dompet.", "Cetak", "Batal".

Tidak ada klaim verifikasi identitas. Nama yang diketik pengguna tidak diverifikasi dan tidak ikut tanda tangan — lembar mengatakannya sendiri (`TXT.nameNote`) dan alamat pendek tetap tampil. Status BERLAKU tidak ditulis; hanya `TXT.statusNote` (cuplikan bertanggal, QR untuk status terkini).

**Batas (jujur):**
- Kaca adalah efek layar; saat cetak panel diganti putih padat. Kristal arang dan medali tetap tercetak gelap — tema terang hemat tinta di kertas, bukan di objeknya.
- Pola facet adalah tanda visual kredensial ini, **bukan fitur keamanan** — jangan dijual sebagai anti-pemalsuan.
- Nama di `localStorage` tertinggal di komputer bersama sampai isian dikosongkan atau penyimpanan browser dibersihkan.
- Pilihan tema tidak diingat antar-muat; ia mengikuti sistem kecuali ditimpa di sesi itu.
- Esc diuji lewat `dialog.requestClose()`, jalur peristiwa yang sama dengan tombol Esc (cancel → close), karena alat uji tidak bisa menekan tombol sungguhan.
- Belum dicetak ke kertas.
- Nama 60 karakter berhuruf lebar turun ke 27 px (dua baris). Kasus patologis tanpa spasi (60 × "W") turun ke 21 px — tetap dua baris, di atas batas 10 px.

**Perlu diputuskan builder:**
1. Perbaiki token emas-teks dan muted mode terang di frontend (temuan kontras di atas)?
2. Haruskah pilihan tema juga diingat?
3. Untuk produk: dialog ini jadi pola halaman kertas di `/app/credentials`?

## Cara memeriksa

- Buka `vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html` langsung di browser (tanpa server).
- **Bilah:** "Tema: Gelap | Terang" · "Alamat dompet | Nama" (+ isian nama) · "Ulangi gerak" · "Cetak / simpan PDF" (membuka dialog).
- **Tanpa gerak:** tambahkan `?motion=off` — lembar utuh dan diam, angka langsung 87.
- **Cetak:** lewat dialog; hasilnya selalu tema terang, satu halaman A4 landscape. Untuk mengulang dari nol, kosongkan isian nama atau hapus kunci `lencana.sertifikat.penerima` di penyimpanan browser.
- **Diperiksa 5 Okt dengan Chrome headless:**
  - Tampilan: keadaan akhir dan tengah-gerak (±700 ms) di kedua tema; `?motion=off` di kedua tema (0 animasi berjalan); ponsel 390 px di kedua tema (lebar dokumen 390, tanpa gulir samping).
  - Nama: "Al", "Nadia Rahmawati" (keduanya 58 px, satu baris), nama 60 karakter berhuruf lebar (27 px, dua baris); blok kelas tidak bergeser.
  - Dialog: buka, Esc, "Nama" kosong → galat tanpa cetak, "Nama" + nama panjang → cetak.
  - QR didekode jsQR pada skala layar 1,07 di **kedua tema**: hasilnya sama persis dengan alamat verifikasi.
  - Cetak sungguhan (media `print` + PDF) dengan tema gelap dipilih di layar: kertas `#f5f5f5`, panel tanpa `backdrop-filter`, lembar di (0,0) 1122 × 793, PDF **1 halaman**.

## Dipakai di app (B165, 5 Okt malam)

Desain ini sudah menjadi halaman sertifikat sungguhan di `#/app/credentials/<hash>` ([[03-Frontend/FE9 - Credentials page and certificate sheet]], [[08-Results/B165 - Executive Summary]]). Bedanya dari berkas HTML ini:
**selalu gelap** (keputusan builder: tanpa tema terang dan tanpa tombol tema — pertanyaan perancang soal token terang, ingatan tema, dan toggle gugur di sana; cetak/PDF juga gelap),
data dari dokumen kredensial dan kriteria (bukan spesimen B153), **nilai per komponen tidak digambar** (tidak ada di dokumen tertanda tangan; cincin dalam hanya bobot), status BERLAKU tidak ditulis
sebagai klaim, dan hanya untuk kredensial milik akun. Berkas HTML di folder ini tetap spesimen desain.

## Tinjauan independen (5 Okt malam, bukan oleh perancang)

Diperiksa ulang di Chrome 154 sungguhan lewat `puppeteer-core` (konteks bersih, `window.print` diganti penghitung supaya tidak ada cetak sungguhan), terhadap berkas yang akan di-commit:

| pemeriksaan | hasil |
|---|---|
| galat konsol (`pageerror` + `console.error`) | **0** di semua keadaan |
| tema awal mengikuti sistem; tombol "Terang" mengganti | `gelap` (sistem gelap) → `terang` setelah klik; keduanya tampil utuh |
| QR dari tangkapan lembar (jsQR, skala ×2) | terbaca **di kedua tema**, sama persis dengan alamat verifier `…/?q=0xb9fb06e5…6430c31#/verify` |
| dialog cetak | terbuka dengan fokus di dalamnya; **Esc** menutup tanpa cetak dan fokus kembali ke tombol; "Nama" kosong → pesan "Tulis namamu dulu, atau pilih alamat dompet." + `aria-invalid="true"`, tidak mencetak; nama diisi → dialog tertutup, `print` dipanggil 1×, lembar menampilkan nama, `localStorage['lencana.sertifikat.penerima']` = `{"mode":"nama","name":"Nadia Rahmawati"}` |
| nama muat | "Al" dan "Nadia Rahmawati" 58 px satu baris; nama 60 huruf berhuruf lebar 34 px dua baris; `W` × 60 21 px dua baris; blok kelas tetap di y=472 dan tidak menimpa baris alamat pendek; tidak melebar keluar lembar |
| nama berisi HTML (`<img … onerror=…>`) | tampil sebagai teks apa adanya; skrip **tidak dieksekusi**; elemen nama tanpa anak |
| cetak (media `print`, tema gelap dipilih) | kertas `rgb(245,245,245)`, lembar di (0,0) 1122 × 793, bilah dan dialog `display:none`, PDF **1 halaman**; `beforeprint` di tengah hitungan animasi tetap menampilkan angka 87 |
| ponsel 390 px, kedua tema | lebar dokumen 390, tanpa luapan mendatar |
| `?motion=off` | nol animasi berjalan |

**Tidak saya ukur ulang:** kontras teks (angka di bagian "Kontras" di atas adalah pengukuran perancang). **Belum ada:** cetak di kertas sungguhan, dan pembacaan di peramban selain Chrome 154. Setelah `page.pdf()` tangkapan layar menampilkan skor 0 — itu pemutaran ulang gerak oleh `afterprint` (rancangan, bukan cacat cetak). Isi cetak diperiksa lewat media `print` sebelum `page.pdf()` dan lewat `beforeprint` (angka 87); berkas PDF-nya sendiri tidak saya rasterisasi.
