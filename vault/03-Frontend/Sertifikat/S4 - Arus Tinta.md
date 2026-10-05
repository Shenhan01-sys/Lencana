---
tags: [frontend, certificate-design, S4]
status: draft
updated: 2026-10-05
---

# S4 - Arus Tinta — desain sertifikat (Organic / Hand-made)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s4-arus-tinta.html` · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Klaim:** [[10-Contributors/Claims-Cheat-Sheet]]

## Design brief (doktrin §12)

- **PROCESS:** nilai kuis, esai, dan praktik dibobot lalu dijumlah menjadi nilai akhir; agen penerbit menandatangani kredensial; bukti penerbitannya tercatat di BNB Smart Chain testnet (97); siapa pun memeriksanya lewat QR.
- **CORE OBJECT:** tiga pita (komponen nilai) yang dianyam, lalu dikunci oleh satu cap tinta (nilai akhir).
- **RELATIONSHIP:** tepi kiri (asal tiap komponen) → anyaman → cap di kiri bawah → slip QR di kanan bawah (cara memeriksa).
- **METAPHOR:** arus/anyaman yang terkumpul di bawah satu cap — benda yang dibuat tangan, bukan kartu berisi label.
- **ENCODING:** size = bobot × nilai (lebar pita) · count = butir bertinta di cincin cap (87 dari 100, tanda di butir ke-60) · length = panah masa berlaku 365 hari · color = satu teal per komponen, terakota hanya untuk tinta cap dan catatan · pattern = stipel, bintik kertas, kilau, percikan, sudut cap, batang hash, semuanya dari hash kredensial.
- **CONTINUOUS:** tiap pita bergoyang pelan dengan fasenya sendiri; kilau meluncur maju-mundur di sepanjang pita.
- **MICRO-BEAT:** cap mendarat dari atas (goyang lalu diam), piringan kertas sedikit tertekan, tinta melebar, percikan muncul, butir nilai terisi berurutan sampai 87.
- **TRANSITION:** pita terurai dari tepi kiri mengikuti jalurnya (tiga durasi berbeda), label meletup saat pitanya lewat, alamat ditinta per kelompok, slip QR jatuh lalu mantul; mode nama ditulis dari kiri.
- **ASSETS:** tanpa gambar luar; semua SVG/CSS/JS yang dibangkitkan (stipel berbibit hash), logo dari `svg[data-logo]`, QR dari `svg[data-qr]` kerangka bersama.
- **COPY:** judul, "Diberikan kepada", alamat (atau nama contoh + alamat pendek + `TXT.nameNote`), kelas, dua tanggal, penerbit + "institusi demo, fiktif", agen penanda tangan + jenis proof, QR + host, kolofon ID, dan tiga kalimat wajib (`TXT.demo`, `TXT.limit`, `TXT.statusNote`); satu catatan tangan sebagai kunci baca.

## Sistem visual

- **Tipe:** Fraunces untuk judul kapital berspasi lebar, kelas, dan alamat (italic dengan sumbu WONK dimatikan + angka lining, supaya `b` tidak terbaca `6` dan `1`/`l`, `0`/`O` tetap beda); Alegreya untuk teks; Caveat untuk tanggal, label pita, dan catatan; Mrs Saint Delafield untuk nama contoh; JetBrains Mono hanya untuk hash.
- **Palet:** kertas `#efeadf`; teal `#17565c` (kuis), `#1f7a7d` (esai), `#5fa8a6` (praktik), `#b9dcd8` (bintik terang); tinta `#16303a`; terakota `#ac4c2d` (cap, percikan, panah) dan `#a3472a` (teks catatan kecil).
- **Kedalaman:** berlapis seperti ilustrasi kertas — pita yang di atas menjatuhkan bayangan lembut ke pita di bawahnya (dan sangat tipis ke kertas); piringan cap dan slip QR bertepi sobek dengan bayangan lembut. Tidak ada blur latar atau blend mode.
- **Motif:** stipel titik + tepi kertas sobek + tinta tangan terakota.
- **Gerak:** masuk — pita terurai dari kiri, label meletup, teks naik bertahap, cap ditekan (`vault/03-Frontend/Sertifikat/s4-arus-tinta.html:210`, `:237`); berkelanjutan — goyang pita dan luncuran kilau (`:215`, `:222`); interaksi — lapisan pita bergeser mengikuti penunjuk pada kedalaman berbeda, dan arahkan/Tab ke pita atau labelnya untuk menyorotnya (pita lain memudar sehingga seluruh jalur pita terpilih terlihat menembus anyaman, `:104`); micro-beat — tekanan cap + percikan + pengisian butir.

## Yang dikodekan geometri

- **Lebar pita** → bobot × nilai: kuis 37,5 · esai 29,4 · praktik 20,0 poin, skala tetap `PX` (`vault/03-Frontend/Sertifikat/s4-arus-tinta.html:624`) → bandingkan tebalnya; label di tiap pita menulis "×bobot% → sumbangan".
- **Jumlah ketiga lebar** → 86,9 → 87 di tengah cap; catatan tangan di kiri atas menulis rumusnya.
- **Garis pensil putus-putus + arsir di samping pita kuis** → lebar kuis bila nilainya 100 (bobot 50); arsir = bagian yang tidak tercapai (kuis 75). Esai (98) dan praktik (100) praktis tanpa celah, jadi tidak digambar.
- **Cincin 100 butir di cap** → 87 bertinta, sisanya kosong; garis kecil di butir ke-60 = batas lulus.
- **Anyaman** → kuis dan esai saling silang dua kali (kuis di atas, lalu di bawah), praktik melengkung di atas keduanya; urutan atas/bawah benar-benar bergantian, dan sambungan antarpotongan selalu jatuh di kertas kosong (`:705`, `:719`, `:721`).
- **Panah tangan di antara dua tanggal** → masa berlaku 365 hari (`CERT.validDays`).
- **Batang tinta di atas garis tanda tangan** → byte hash kredensial, tinggi batang = nilai byte (`:948`).
- **Stipel, bintik kertas, kilau, percikan, sudut cap, sedikit geser jalur pita** → `HASHART` dari hash kredensial: kredensial lain → gambar lain.

## Keputusan, batas, dan klaim

- **Kalimat baru di lembar:** "lebar pita = bobot × nilai", rumus "37,5 + 29,4 + 20,0 = 86,9 → 87", label "×50% → 37,5" (dan seterusnya), "365 hari". Semuanya hanya menjelaskan geometri dari angka kredensial (dihitung dari `CERT`, tidak diketik), tanpa klaim tentang orang, lembaga, atau keamanan, jadi lolos [[10-Contributors/Claims-Cheat-Sheet]].
- **Teks cincin cap:** "LULUS · 87 / 100" di atas dan "lencana" (nama produk) di bawah, keduanya tegak (`:915`). Tidak ada kata BERLAKU di lembar; status hanya lewat `TXT.statusNote` yang bertanggal dan QR.
- **Tanda tangan:** batang di atas garis tanda tangan sengaja berupa batang data, bukan goresan mirip tulisan tangan. Draf pertama memakai goresan kaligrafi dan dikoreksi atas tinjauan koordinator: tanda tangan sebenarnya adalah `DataIntegrityProof`, dan lembar tidak boleh menyiratkan tanda tangan manusia.
- **Tidak ideal (jujur):**
  - arsir pensil kuis belum punya label sendiri di lembar; maknanya baru jelas lewat panel "Catatan desain";
  - lebar pita yang melengkung sulit dibandingkan persis dengan mata, jadi angka di label tetap diperlukan;
  - jalur pita dan penempatan label dihitung dari hash (label dicari otomatis di kertas kosong); sudah diperiksa untuk hash spesimen ini, belum untuk kredensial lain;
  - satu lapisan tersusun per potongan anyaman → memori GPU lebih besar daripada desain datar, dan gerak masuk memakai mask SVG yang di-repaint selama pita terurai;
  - tekstur rongga tinta pada cap sedikit menurunkan kontras efektif teks cincin (warna tinta sudah digelapkan untuk itu).
- **Perlu diputuskan builder:**
  1. arsir pensil "lebar penuh kuis": pertahankan, atau buang supaya lebih sepi;
  2. nama contoh: Mrs Saint Delafield (seperti tanda tangan) atau fon kaligrafi yang lebih mudah dibaca;
  3. catatan tangan kunci di kiri atas: biarkan, atau pindahkan ke panel catatan saja (lebih sedikit teks);
  4. efek sorot "menembus anyaman" saat hover: setuju atau cukup sorot biasa.

## Cara memeriksa

- Buka `vault/03-Frontend/Sertifikat/s4-arus-tinta.html` langsung di browser (klik dua kali). Internet hanya dipakai untuk fon Google; tanpa internet fon cadangan dipakai dan lembar tetap utuh.
- Toolbar: **Alamat dompet ⇄ Nama contoh** (mode nama: nama contoh, alamat pendek, dan `TXT.nameNote` tampil; ukuran nama diukur ulang setelah fonnya termuat, `:956`), **Ulangi gerak**, **Cetak / simpan PDF**.
- Tambahkan `?motion=off` pada alamat berkas → keadaan akhir tanpa gerak; tata letaknya sama dengan akhir animasi (diukur pada kedua mode; hanya label pita yang ikut bergoyang bersama pitanya).
- Arahkan penunjuk ke pita, atau tekan Tab sampai ke label pita → pita itu disorot.
- Cetak: A4 lanskap, aktifkan grafik latar; aturan cetak desain ada di `:270`.
- Kode utama: anyaman dan potongan `:678`–`:721`, stipel `:739`, cap `:907`–`:915`, batang hash `:948`.
