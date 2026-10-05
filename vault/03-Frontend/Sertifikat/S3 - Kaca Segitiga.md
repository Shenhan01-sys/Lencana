---
tags: [frontend, certificate-design, S3]
status: draft
updated: 2026-10-05
---

# S3 - Kaca Segitiga — desain sertifikat (Glass / Soft-depth)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html` · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

Pilihan "fintech modern / mirip Apple" dari kelima desain: dasar putih bercahaya, lapisan kaca buram di atas atmosfer biru, satu medali kaca sebagai pusat, kristal low-poly yang dipahat dari hash kredensial ini.

## Design brief (doktrin §12)

- **PROCESS:** kredensial diterbitkan → ditandatangani agen penerbit (DataIntegrityProof) → bukti penerbitan tercatat di BNB Smart Chain testnet (97) → siapa pun memeriksanya lewat QR.
- **CORE OBJECT:** lensa kaca (medali) yang *memegang* hasil, berdiri di atas kristal yang *dipahat* oleh byte hash kredensial.
- **RELATIONSHIP:** diagonal kanan atas → kiri bawah: kristal pekat + medali (hasil) di kanan atas → kanal putih bercahaya (siapa, kelas apa) → kristal kecil di balik pelat fakta kaca di kiri bawah; pita medali turun dan masuk ke balik pelat QR (hasil → cara memeriksanya).
- **METAPHOR:** lensa di atas medan kristal — kaca buram tidak menyembunyikan apa yang ada di belakangnya; isinya terbuka dan dapat diperiksa.
- **ENCODING:** panjang busur luar = nilai 87 dari 100 · posisi takik = batas lulus 60 · panjang busur dalam = bobot 50/30/20 · isi busur dalam = nilai 75/98/100 · terang dan rona tiap facet = byte hash · panjang batang = masa berlaku 365 hari (ruas per bulan).
- **CONTINUOUS:** medali mengapung ±4 px (±7 dtk); cahaya diagonal lewat di belakang kaca tiap ±8 dtk (terlihat menembus kaca buram) + kilau di permukaan kaca; beberapa facet bernapas.
- **MICRO-BEAT:** cincin menutup di 87 → denyut cincin melebar, kilat cahaya di kaca, manik di ujung busur meletup, pelat QR terangkat 2 px.
- **TRANSITION:** facet merakit dari medali ke luar (gelombang berjarak, jeda 25–40 ms antargelombang, pegas), panel naik dengan blur-in, cincin menyapu ke 87 sambil angka menghitung naik dengan kurva yang sama.
- **ASSETS:** semua digambar sendiri (SVG/CSS/JS); tidak ada bentuk atau gambar referensi yang disalin. Logo dari `svg[data-logo]` kerangka (lapis belakang putih, depan navy, di ubin kaca biru).
- **COPY:** judul, "Diberikan kepada", penerima, kelas, Hasil/LULUS, tanggal, penerbit + catatan demo, penanda tangan, ajakan pindai + ID kredensial; kalimat baku `TXT.demo`, `TXT.limit`, `TXT.statusNote` di kaki pelat fakta.

## Sistem visual

- **Tipe:** Outfit untuk semuanya yang dibaca orang (judul 700 besar dengan baris kedua bergradien biru, teks 500–600, angka nilai dan tanggal tabular) · JetBrains Mono untuk alamat (kisi 5 × 2 kelompok empat karakter), hash, dan jenis proof.
- **Palet:** dasar `#f3f7ff` · navy `#0a1f4a` (teks, inti kristal) · biru kerajaan `#2457d6` (aksen, busur) · sian `#38c8ee` (tepi kristal, cahaya) · violet `#7a6cf0` (hanya rona tipis pada facet yang byte hash-nya kelipatan 13). Seluruhnya biru dari referensi builder; emas merek tidak dipakai.
- **Kedalaman (satu bahasa):** kaca buram (`backdrop-filter` blur + saturate), tepi cahaya 1 px di dalam, bayangan lembut kebiruan. Urutan lapis: atmosfer → kristal → kaca (medali, pelat fakta) → pelat QR putih padat paling atas.
- **Motif:** segitiga facet low-poly (kisi bergetar yang dibelah diagonal terpendek).
- **Gerak:** masuk (facet dari medali ke luar, blur-in, sapuan cincin + hitung naik) / berkelanjutan (apung, cahaya lewat, facet bernapas) / interaksi (paralaks penunjuk: kristal kiri bawah paling jauh, kristal kanan atas, serpihan lepas, medali paling dekat — semuanya hanya `transform` lewat `--mx/--my`) / micro-beat (lihat brief). Semua animasi hanya di bawah `.sheet.is-playing`; tanpa kelas itu lembar utuh dan diam.

## Yang dikodekan geometri

| elemen | data nyata | cara membacanya |
|---|---|---|
| busur cincin luar | `CERT.score` = 87 | mulai pukul 12, searah jarum jam; bagian bercahaya = 87 % lingkaran, sisa gelap = yang tidak diraih |
| takik + label "batas 60" | `CERT.passMark` = 60 | celah di cincin + segitiga penunjuk; busur melewatinya = lulus |
| manik + garis di ujung busur | nilai akhir | titik tempat busur berhenti |
| tiga busur cincin dalam | `components[].weight` = 50/30/20 | panjang tiap busur sebanding bobot (kuis, esai, praktik), label melengkung "Kuis 75 × 50%" dst. |
| bagian terisi tiap busur dalam | `components[].score` = 75/98/100 | isi sebanding nilai komponen; jumlah bagian terisi = 86,9 % lingkaran, yaitu nilai sebelum dibulatkan (`web/src/score.ts:132`) |
| terang-gelap tiap facet | byte `HASHART` | tinggi tiap titik kisi = byte hash, lalu facet disinari dari kiri atas; geser terang dan rona violet juga dari byte hash — kredensial lain menghasilkan kristal lain (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:586`) |
| batang di antara dua tanggal | `issuedAt` → `validUntil`, `validDays` = 365 | titik penuh = terbit, titik kosong = akhir berlaku, ruas per bulan |
| kisi alamat 5 × 2 | `CERT.learner` | dibaca dan dicocokkan per kelompok empat karakter |

## Keputusan, batas, dan klaim

**Kalimat atau label baru yang kutulis** (semuanya label atau angka dari `CERT`, tanpa kata terlarang dari [[10-Contributors/Claims-Cheat-Sheet]]):
"format" di depan `FMT.format` (jadi "format Open Badges 3.0", frasa yang diizinkan), "batas 60" (dari `passMark`), "365 hari" (dari `validDays`), "/100", label komponen "Kuis 75 × 50%" dst., teks pembaca layar "bobot …%", dan label aria "Penerima", "Kelas", "Hasil", "Periksa kredensial", "Rincian penerbitan". Tidak ada klaim tentang identitas orang; status BERLAKU sengaja tidak ditulis — yang ada hanya `TXT.statusNote` (cuplikan bertanggal, QR untuk status terkini).

**Keputusan:**
- Teks kecil tidak pernah duduk di atas kristal: ada zona bebas-facet di belakang judul, penerima, dan kelas (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:572`); fakta dan kaki ada di pelat kaca yang cukup buram.
- Paralaks: satu jaring segitiga = satu lapis. Percobaan pertama memecah satu jaring ke dua kedalaman dan membuka retak putih di antara segitiga saat penunjuk bergerak; sekarang lapisnya per gugus (kanan atas, kiri bawah) + serpihan lepas.
- Pelat QR putih padat, tidak pernah di atas kaca; padding-nya dibuat cukup supaya zona tenang 4 modul tidak terpotong sudut membulat (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:176`).
- Pita medali tidak membawa data. Alasannya: pita membuat medali terbaca sebagai lencana, dan arahnya membawa mata dari hasil ke QR (hasil → cara memeriksa).
- Tautan Google Fonts diberi `crossorigin`: tanpa itu skrip simulasi cetak di spesifikasi gagal membaca `cssRules` (SecurityError lintas-origin). Gejala yang sama kemungkinan muncul di berkas desain lain yang memuat font dengan cara yang sama.

**Yang tidak ideal (jujur):**
- Kaca adalah efek layar. Saat cetak, kaca diganti putih semi-padat (`vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html:250`); kristal tetap tercetak dan memakan tinta di sisi kanan.
- Zona bebas-facet berupa persegi tetap: kalau judul kelas atau nama tampilan kelak lebih panjang, zonanya perlu dilebarkan.
- Label komponen melengkung kecil (≥ 10 px, terbaca di layar dan cetak, tapi bukan untuk dibaca dari jauh); di layar ponsel seluruh lembar menjadi gambar mini, sesuai skala-otomatis kerangka.
- Pola facet adalah tanda visual kredensial ini, **bukan fitur keamanan** — jangan dijual sebagai anti-pemalsuan.
- Tiga pemeriksaan chain (attestation, penerbit terdaftar, pencabutan) tidak ditampilkan supaya teks tetap sedikit; QR yang membawa pemeriksa ke sana.

**Perlu diputuskan builder:** (1) desain ini untuk layar lebih dulu — cukupkah varian cetaknya? (2) palet biru referensi atau warna merek? (3) perlukah tiga pemeriksaan chain tampil sebagai baris kecil di dekat QR?

## Cara memeriksa

- Buka `vault/03-Frontend/Sertifikat/s3-kaca-segitiga.html` langsung di browser (klik dua kali, tanpa server). Toolbar: **Alamat dompet ⇄ Nama contoh**, **Ulangi gerak**, **Cetak / simpan PDF**.
- **Mode alamat:** alamat tertanda tangan dalam kisi mono 5 × 2. **Mode nama:** nama contoh besar + alamat pendek + `TXT.nameNote` (nama tidak ikut tanda tangan).
- **Tanpa gerak:** tambahkan `?motion=off` (atau aktifkan reduce-motion) — lembar tampil utuh dan diam, angka langsung 87.
- **Cetak:** A4 landscape dengan latar dicetak; kaca menjadi putih semi-padat, atmosfer dan kristal tetap.
- **Yang patut dilihat:** gerakkan penunjuk ke sudut-sudut lembar (kristal dan medali bergeser dengan kedalaman berbeda, teks tetap di tempat); tekan "Ulangi gerak" dan perhatikan saat cincin menutup di 87 (denyut, kilat, pelat QR terangkat).
- **Diperiksa 5 Okt dengan browser headless:** keadaan akhir, tengah gerak masuk, mode nama, `?motion=off`, penunjuk di dua sudut ekstrem, layar ponsel, dan simulasi cetak dari spesifikasi (lembar di (0,0) 1122 × 793, tinggi body 793, satu halaman). Kerangka bersama tidak diubah (dicek byte-per-byte terhadap templat).
