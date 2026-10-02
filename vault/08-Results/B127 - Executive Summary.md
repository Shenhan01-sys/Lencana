---
tags: [results, executive-summary, B127]
status: active
updated: 2026-10-02
---

# B127 - Executive Summary — halaman Kursus, lima kelas singkat, Ringkasan berisi

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B127 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B127 - Halaman Kursus, lima kelas singkat, Ringkasan berisi]] ·
**Testing:** [[09-Testing/T49 - Uji peramban halaman Kursus dan Ringkasan (B127)]] · **Keputusan:** D62

## 1. Apa yang diubah

- **Lima kelas singkat** (31–39 menit, 4–5 lesson): *Literasi Keuangan Digital*, *Keamanan Akun Sehari-hari*, *Menulis Laporan
  yang Bisa Diulang* (non-teknis, bobot praktik 0) dan *Membaca BscScan*, *Token BEP-20 dan Izin* (praktik dinilai chain lewat
  `eth-call` atas kontrak pembagian dan `DOMAIN_SEPARATOR` token/Permit2, dibaca 2 Okt). Harga 4/6/8/10/12 LDC-demo. Ini
  langkah pertama RF4 "katalog bukan katalog web3" dan L7 #12.
- **Fungsi nilai:** `computeScore` tidak lagi menghitung komponen berbobot 0 sebagai "belum lengkap"; `auditCourse` menolak bobot
  >0 tanpa lesson jenisnya dan lesson dinilai di komponen berbobot 0 (dua arah). Satu fungsi tetap dipakai penerbit dan dashboard.
- **Halaman Kursus** (`#/app/courses`, menu sidebar baru): cari, saring, urutkan; kartu = lencana yang akan didapat; pratinjau =
  lembar spesifikasi kredensial (hasil belajar, silabus, bobot, ambang, rubricHash) dengan panel bayar B125 di dalamnya; tautan
  langsung `#/app/courses/<id>`. Katalog tampil seketika; status "terdaftar" menyusul dari rekaman.
- **Ringkasan:** ubin + saldo, lanjutkan belajar, perlu perhatianmu, menuju kredensial, aktivitas terbaru, kursus untukmu — pola
  resume/to-do/linimasa dari referensi LMS (`12-LMS-References`), dipakai sebagai proses, bukan tampilan.
- **Lain-lain:** `h()` kini memasang custom property; beranda memakai emblem untuk kursus tanpa gambar khusus; `learnerRecords`
  membaca tiap kursus serentak; tab ponsel berlabel pendek.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| katalog publik (`npm run inventory`) | 2 kursus · 7 modul · 24 lesson · 412 menit · 28 soal · 2 esai | 7 kursus · 15 modul · 46 lesson · 585 menit · 48 soal · 7 esai |
| kursus non-teknis | 0 | 3 |
| mencari & mendaftar dari dashboard | tidak ada (daftar "Kursus lain" ke halaman publik) | halaman Kursus: cari + saring + pratinjau + bayar |
| rekaman sampai status terdaftar (akun 4 kursus) | >9 detik | 1,9 detik |
| `probe` | 92/0 (B126) | 118/0 |
| bukti di chain (T49) | — | `0x1726d536…5874` dan `0x1bd87931…2e73` sukses |
| entry bundle | 638.14 kB (B126) | 689.42 kB |

## 3. Yang belum

Dokumen criteria kelas uji + lima kursus baru di tepi (`npm run publish:edge`, kata builder) — sampai itu `verify:quizkeys`
60/66. Login sungguhan (AC-B127#9). Halaman belajar belum mengirim praktik ke `POST /praktik` (B121) — berlaku untuk semua kursus.
