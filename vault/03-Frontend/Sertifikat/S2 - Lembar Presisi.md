---
tags: [frontend, certificate-design, S2]
status: draft
updated: 2026-10-05
---

# S2 - Lembar Presisi — desain sertifikat (Swiss / Minimal)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s2-lembar-presisi.html` · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

## Design brief (doktrin §12)

- **PROCESS:** tiga komponen dinilai dan dibobot, dijumlahkan, dibandingkan dengan batas lulus; kredensial ditandatangani agen penerbit, bukti penerbitannya tercatat di BNB Smart Chain testnet (97), lalu siapa pun dapat memeriksanya lewat QR.
- **CORE OBJECT:** pembacaan alat ukur — jarum yang berhenti di 87 pada skala 0–100, melewati takik batas lulus 60.
- **RELATIONSHIP:** kuis + esai + praktik (lebar = bobot, isi = nilai) → 86,9 → dibulatkan 87 → jarum melewati 60; diterbitkan 5 Okt 2026 → berlaku 365 hari → status dibaca pada satu tanggal.
- **METAPHOR:** lembar spesifikasi / instrumen ukur — sumbu skala + tumpukan berstrata + garis waktu, terkunci ke grid 12 kolom.
- **ENCODING:** x = poin (skala dan tumpukan, satuan sama) · x = hari (masa berlaku) · lebar = bobot · panjang isi = nilai × bobot · tinggi = nilai byte hash · warna = emas hanya untuk tanda "diraih / dalam masa berlaku", tinta untuk tanda ukur.
- **CONTINUOUS:** hanya cincin di titik tanggal-baca status yang berdenyut pelan.
- **MICRO-BEAT:** saat jarum mendarat, pita emas 60→87 "mengunci" dan angka 87 berdetak sekali.
- **TRANSITION:** koreografi masuk bertahap (lihat Sistem visual); tombol "Ulangi gerak" memutarnya ulang; mode alamat/nama bertukar seketika (milik cangkang).
- **ASSETS:** tanpa gambar raster. Aset nyata = lambang Lencana (vektor dari cangkang), QR verifikasi asli, dan geometri yang diturunkan dari data kredensial ini sendiri (byte hash, tanggal, nilai).
- **COPY:** judul, "Diberikan kepada", nama kelas, "Hasil · LULUS", label fakta, dan tiga kalimat wajib di kaki (semua dari `TXT`); sisanya dibawa geometri.

## Sistem visual

- **Tipe:** Inter Tight (400/500/600/700) untuk semua teks, dengan angka tabular di setiap bilangan; JetBrains Mono untuk alamat, hash, UID, ID. Hierarki hanya lewat ukuran dan tebal: angka hasil raksasa → judul → baris alamat → nama kelas → nilai fakta → label. Token alamat/hash tidak pernah dipatah (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:88`).
- **Palet:** tinta `#0b0e11`, emas Lencana `#f0b90b` (satu-satunya aksen; tidak pernah untuk teks kecil), kertas `#ffffff`, abu keterangan `#5c636d` (teks kecil, di atas ambang 4,5:1), garis rambut `#d5d9de`, kotak bobot `#b9bfc7`, takik `#a9afb7` / `#8a919b`.
- **Kedalaman:** nol. Hanya garis rambut; tanpa bayangan, tanpa gradasi di dalam lembar.
- **Motif:** garis rambut yang selalu berupa ukuran — takik skala, kotak bobot, takik bulan masa berlaku, batang byte hash.
- **Grid:** 12 kolom; satu sumbu vertikal di kolom ketujuh (k6) dipakai bersama oleh baris ID kredensial, garis masa berlaku, titik 0 skala, tumpukan bobot, dan kolom fakta keempat.
- **Gerak — masuk:** garis emas atas tergambar kiri→kanan; kepala dan judul naik; blok alamat muncul berurutan; garis masa berlaku tergambar; tiga isi bobot terisi bertahap; jarum menyapu 0→87 dengan pegas (lewat sedikit lalu mengendap) sementara angka dihitung naik; fakta naik bertahap. Kurva pegas: `vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:80`.
- **Gerak — berkelanjutan:** cincin titik status berdenyut (satu-satunya gerak terus-menerus).
- **Gerak — interaksi:** sorot atau fokus (Tab) satu komponen → komponen lain meredup dan rentang sumbangannya menyala di garis baca skala; kursor di atas instrumen → garis rambut ukur dengan bacaan 0–100; kemiringan lembar dari cangkang.
- **Gerak — micro-beat:** pita emas 60→87 terisi dengan ease-out tajam tepat saat jarum mengendap, angka 87 berdetak sekali.

## Yang dikodekan geometri

- **Angka besar** → `CERT.score` (87) → dibaca langsung; dihitung naik selama jarum menyapu.
- **Skala 0–100** → takik tiap poin, tiap 5, tiap 10; 1 poin = 5 px (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:562`) → posisi jarum = nilai.
- **Takik + label "60 · batas lulus"** → `CERT.passMark` → garis yang harus dilewati.
- **Pita emas 60→87 + label "+27"** → selisih di atas batas lulus (87 − 60, dihitung di JS, `vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:585`) → panjang pita = jarak aman di atas batas; labelnya membuat informasi ini tidak bergantung pada warna.
- **Tumpukan bobot** → `CERT.components` → lebar kotak ∝ bobot 50/30/20, isi emas ∝ nilai 75/98/100, ujung isi ditandai garis tinta; panjang isi memakai satuan poin skala yang sama, jadi isinya = sumbangan 37,5 / 29,4 / 20,0 → jumlah 86,9 → dibulatkan 87 (`web/src/score.ts:132`). Dibangun di `vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:594`.
- **Proyeksi sumbangan (sorot/fokus)** → rentang kumulatif 0–37,5 · 37,5–66,9 · 66,9–86,9 → menyala di garis baca skala (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:590`).
- **Garis masa berlaku** → `CERT.issuedAt` → `CERT.validUntil`, 365 hari (`CERT.validDays`) → takik tiap awal bulan WIB, takik tinggi di pergantian tahun; titik emas di tanggal `CERT.statusReadOn` (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:610`). Karena status dibaca pada hari terbit, titiknya berada di ujung kiri; untuk tanggal baca lain titik itu bergeser sendiri.
- **Jejak hash** → 32 byte hash kredensial (`HASHART.bytes`) → 32 batang, tinggi ∝ nilai byte (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:574`); kredensial lain menghasilkan profil lain.
- **QR pemeriksaan** → `CERT.verifyUrl`, 45 modul × 4 px = 180 px di pelat terang bertepi tinta 212 px (zona tenang 4 modul), tepi atas pelat segaris dengan garis rambut bagian fakta (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:212`). Diperbesar dari ukuran awal supaya tetap terbaca pada render layar yang diskalakan, bukan hanya di cetak.
- **Alamat dompet** → `CERT.learner` dalam 10 blok × 4 karakter → satu blok tepat satu kolom grid; "0x" menggantung di kolom label (`vault/03-Frontend/Sertifikat/s2-lembar-presisi.html:136`).

## Keputusan, batas, dan klaim

**Kata/kalimat baru (bukan dari `TXT`) dan alasan lolos aturan klaim:**
- "per <tanggal>" sesudah BERLAKU → menjadikan status cuplikan bertanggal; diikuti `TXT.statusNote` yang mengarah ke QR untuk status terkini. Tidak menyatakan status hidup.
- "hari" (sesudah 365), "batas lulus", "Skema tanda tangan", "Format", "Jaringan", "ID chain", kata merek "Lencana" → label deskriptif.
- Label aria tiap komponen: "<Komponen>: nilai …, bobot …%, menyumbang … poin" → deskripsi aritmetika, bukan klaim penilaian.
- Angka turunan "+27", "37,5 / + 29,4 / + 20,0", "= 86,9 → 87" → dihitung di JS dari `CERT`, tidak diketik.
- Tidak ada kata dari daftar terlarang (tidak ada "terverifikasi", "resmi", "anti-pemalsuan", "ijazah on-chain", dsb.). Penerbit selalu tampil bersama "institusi demo, fiktif"; `TXT.demo` dan `TXT.limit` selalu di kaki.

**Yang tidak ideal (jujur):**
- "0x" sengaja menggantung di kolom label supaya 10 blok pas di 10 kolom; sebagian pembaca mungkin melihatnya terpisah dari alamat.
- Garis masa berlaku dan skala nilai sama lebar dan berbagi sumbu kiri, padahal satuannya berbeda (hari vs poin). Labelnya membedakan, tetapi ini tetap pilihan grid, bukan kesetaraan data.
- Kursor ukur hanya membaca posisi (dibulatkan), bukan data kredensial.
- Tanpa koneksi (font Google tidak termuat) lembar memakai font cadangan: posisi data tetap tepat karena dihitung dalam px, tetapi lebar teks sedikit berubah.
- Uji headless tidak bisa memicu fokus papan ketik asli (jendela tanpa fokus); penangan fokus diuji dengan event sintetis. Tab sungguhan sebaiknya dicoba builder di peramban biasa.

**Perlu diputuskan builder:**
- Subjudul Inggris (`TXT.titleEn`) dan tag `uji-bayar-2026` di sebelah nama kelas: dipertahankan atau dipangkas.
- Apakah kursor ukur (interaksi) diinginkan pada halaman sertifikat publik.
- Tebal angka hasil (sekarang 500, tenang) atau lebih tebal.

## Cara memeriksa

- Buka `vault/03-Frontend/Sertifikat/s2-lembar-presisi.html` di Chrome/Edge/Firefox/Safari; tunggu gerak masuk selesai, lalu tekan "Ulangi gerak" untuk melihat koreografinya lagi.
- Toolbar "Alamat dompet" ⇄ "Nama contoh": mode nama menampilkan nama contoh fiktif, alamat pendek, dan `TXT.nameNote`.
- Arahkan kursor ke tumpukan bobot atau tekan Tab sampai fokus ke satu komponen: rentang sumbangannya menyala di skala.
- Tambahkan `?motion=off` ke URL: lembar tampil utuh dan diam (keadaan akhir).
- "Cetak / simpan PDF" (A4 lanskap, grafik latar aktif): satu halaman, tanpa kursor ukur dan tanpa cincin denyut.
- Layar sempit: lembar diskalakan utuh oleh cangkang, tanpa gulir horizontal.
