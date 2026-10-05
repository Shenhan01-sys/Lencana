---
tags: [frontend, certificate-design, S1]
status: draft
updated: 2026-10-05
---

# S1 - Piagam Krem — desain sertifikat (Skeuomorfik / taktil)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s1-piagam-krem.html` · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

## Design brief (doktrin §12)
- **PROCESS:** kredensial diterbitkan → ditandatangani agen penerbit (DataIntegrityProof) → bukti penerbitan tercatat di BNB Smart Chain testnet (97) → siapa pun memeriksanya lewat QR.
- **CORE OBJECT:** selembar piagam kertas krem bercetak halus dengan segel kuningan yang ditekan di atas pita, plus potongan periksa (stub) berperforasi yang memuat QR.
- **RELATIONSHIP:** badan piagam = upacaranya (siapa, kelas apa, seberapa baik, siapa penerbit); potongan periksa = alat periksanya (ID, QR, UID attestation, transaksi, blok); cap status bertanggal melintasi perforasi dan mengikat keduanya.
- **METAPHOR:** "lencana" = segel pada pita; segel yang ditekan = komitmen pada kredensial persis ini. Gerigi, roset, dan bingkai guilloche diturunkan dari byte hash, jadi kredensial lain mencetak pola lain.
- **ENCODING:** sudut cincin ukur segel = nilai (isian 87 dari 100, takik di 60 = batas lulus); size = luas pip sebanding bobot 50/30/20; busur pip = skor komponen 75/98/100; bentuk guilloche = byte hash; ruas penggaris = masa berlaku 365 hari.
- **CONTINUOUS:** kilau foil menyapu segel secara berkala; ekor pita berayun nyaris tak terlihat.
- **MICRO-BEAT:** segel menghantam kertas (lonjakan skala, cincin benturan, denyut bayangan), lalu garis ukur menyala satu per satu selaras angka nilai yang menghitung naik.
- **TRANSITION:** kertas mengendap → guilloche menggambar dirinya berlapis → teks naik berurutan → pita terurai dari tepi atas → segel menghantam → ekor pita jatuh → cap BERLAKU menghantam terakhir.
- **ASSETS:** tanpa gambar; semua SVG/CSS buatan sendiri. Guilloche dan mikroteks dari `HASHART`/`CERT.hash`, logo dan QR dari cangkang, serat kertas dan tekstur tinta cap dari filter `feTurbulence`.
- **COPY:** hanya kalimat baku `TXT`/`FMT`; label baru sedikit dan tercatat di bagian klaim.

## Sistem visual
- **Tipe:** Cinzel (kapital ukir) untuk judul, label, legenda segel, dan cap; Cormorant Garamond (tegak dan miring) untuk badan, nama contoh, kelas, dan angka nilai (lining, tabular); JetBrains Mono hanya untuk alamat, hash, UID, dan transaksi.
- **Palet:** kertas krem `#f4ecd8` → `#efe6cf`; tinta hijau-batu `#1f3a36` / `#2f4a45`; kuningan `#b08d3c` / `#e3c878` (segel, pip); tinta cap merah-cokelat `#8a3a2c` (cap status, nomor seri). Potongan periksa memakai krem yang lebih terang.
- **Kedalaman:** satu bahasa — cahaya dari kiri atas; bayangan jatuh ke kanan bawah (segel, pita, ekor pita); bevel kuningan dari goresan gradasi luar dan dalam; teks timbul pada segel dari salinan sorot dan bayangan; serat kertas halus.
- **Motif:** cetak pengaman ala uang kertas — guilloche, mikroteks, nomor seri merah ganda, perforasi — dengan segel foil bergerigi di atas pita sebagai lencana.
- **Gerak:** masuk berlapis (lihat TRANSITION); berkelanjutan = kilau foil dan ayunan ekor pita; interaksi = pantulan cahaya pada segel bergeser mengikuti penunjuk, segel bisa diklik atau ditekan (Enter/Spasi) untuk mengulang cap; micro-beat = segel menghantam lalu garis ukur menyala. Semua animasi di bawah `.sheet.is-playing` (`vault/03-Frontend/Sertifikat/s1-piagam-krem.html:229`).

## Yang dikodekan geometri
- Cincin ukur segel → `CERT.score` (87) dan `CERT.passMark` (60) → seratus garis searah jarum jam dari arah atas; garis gelap = nilai yang diraih; takik email hijau-batu di posisi 60 = batas lulus; manik kuningan menandai ujung isian.
- Angka besar di medali segel → `CERT.score` → menghitung naik selaras garis ukur yang menyala.
- Tiga pip kuningan → `CERT.components` → luas cakram sebanding bobot (50/30/20); busur di sekeliling tiap pip = skor komponen (75/98/100) pada skala yang sama untuk ketiganya.
- Gerigi tepi segel, roset segel, bingkai gelombang (dua keluarga helai), roset sudut, dan roset latar → byte hash kredensial (`HASHART.bytes`) → jumlah lekuk, fase, periode gelombang, dan jumlah helai berubah bila hash berubah (`vault/03-Frontend/Sertifikat/s1-piagam-krem.html:712`).
- Mikroteks (garis bingkai dalam dan garis di bawah judul) → `CERT.hash` lengkap, diulang → terbaca bila diperbesar.
- Penggaris masa berlaku → `CERT.validDays` (365) → ruas per bulan; segitiga merah-cokelat = hari status dibaca (`CERT.statusReadOn`).
- Nomor seri merah-cokelat → ID kredensial (`FMT.hashShort`) → dicetak di badan piagam dan di potongan periksa sebagai pasangan yang cocok.
- Cap status → `FMT.status` dan `FMT.statusReadOn` → snapshot bertanggal yang melintasi perforasi; status terkini ada di balik QR.

## Keputusan, batas, dan klaim
- **Label baru (label fakta, tanpa klaim baru):** "No." untuk ID kredensial; "NILAI" dan "dari 100" di medali segel; "bobot …%" pada pip; "per <tanggal>" di cap; merek "Lencana" di potongan periksa; label aria "Potongan periksa", "Komponen nilai", dan label tombol segel. Semua kalimat lain berasal dari `TXT`/`FMT`.
- **BERLAKU** hanya tampil sebagai cap bertanggal (`FMT.statusReadOn`); `TXT.statusNote` di potongan periksa mengarahkan ke QR untuk status terkini.
- Guilloche, mikroteks, dan nomor seri adalah ornamen turunan hash (sidik visual), bukan fitur pengaman; pemeriksaan tetap lewat QR dan tanda tangan.
- Tanda tangan ditulis sebagai nama agen dalam huruf miring biasa, bukan tiruan coretan tangan; jenis bukti (`FMT.proof`) tercetak di bawah garisnya.
- Segel adalah lencana produk dan pembawa data (nilai, hash), bukan cap lembaga; penerbit tertulis sebagai institusi demo, fiktif (`TXT.demo` dan `FMT.publisherNote` selalu tampil).
- **Belum ideal (jujur):** cincin ukur tidak berlabel angka, jadi dibaca bersama baris hasil; pola hash tidak bisa dicocokkan dengan mata telanjang; mikroteks di layar tampak sebagai garis titik dan baru terbaca saat dicetak atau diperbesar; selisih luas pip halus, jadi bobot tetap perlu labelnya.
- **Kontras:** setelah tinjauan koordinator, teks kecil digelapkan ke tinta hijau-batu dengan bobot lebih tebal; rasio warna CSS terhadap nada kertas tergelap dihitung di peramban dan semua teks HTML di lembar lolos 4,5:1.
- **Mode nama:** catatan `TXT.nameNote` dan alamat pendek tampil seketika bersama nama saat mode diganti (animasi masuk dipasang pada pembungkus yang tidak ikut disembunyikan).
- **Perlu diputuskan builder:** apakah tengah segel tetap angka nilai (lambang Lencana sekarang ada di potongan periksa); apakah makna "potongan periksa yang bisa dipisah" cocok untuk produk atau cukup garis putus biasa; warna pita bila kelas lain perlu warna sendiri.

## Cara memeriksa
- Buka `vault/03-Frontend/Sertifikat/s1-piagam-krem.html` di Chrome, Edge, Firefox, atau Safari. Font Google dimuat bila daring; tanpa jaringan, tampilan jatuh ke Georgia dan Consolas.
- Toolbar "Alamat dompet" (bawaan: alamat dua baris, kelompok empat karakter berselang warna) ⇄ "Nama contoh" (nama miring, alamat pendek, dan `TXT.nameNote`).
- "Ulangi gerak" memutar ulang seluruh masuk; klik segel (atau fokus lalu Enter/Spasi) untuk mengulang cap saja.
- Tambahkan `?motion=off` pada URL: lembar tampil final dan diam.
- "Cetak / simpan PDF": A4 lanskap, satu halaman, latar krem ikut tercetak (grafik latar aktif); kilau foil dan cincin benturan disembunyikan saat cetak, serat kertas diperhalus.
