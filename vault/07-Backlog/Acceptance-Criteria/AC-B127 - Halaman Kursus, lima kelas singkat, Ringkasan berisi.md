---
tags: [acceptance-criteria, B127]
status: active
updated: 2026-10-02
---

# AC-B127 - Halaman Kursus, lima kelas singkat, Ringkasan berisi

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B127 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T49 - Uji peramban halaman Kursus dan Ringkasan (B127)]] ·
**Summary:** [[08-Results/B127 - Executive Summary]] · **Keputusan:** D62

Permintaan builder 2 Okt: lima kursus dummy untuk didaftari manual; pendaftaran lewat halaman baru "Kursus" (cari, pratinjau
metadata, lalu bayar); sidebar baru "Kursus"; Ringkasan yang tidak sepi — dengan rujukan ke referensi LMS di vault. Pilihan
yang di-acc builder: kelas singkat sungguhan campur topik; fungsi nilai mengabaikan komponen berbobot 0 + audit; kartu lencana
+ panel pratinjau; keempat tambahan Ringkasan.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B127#1 | lima kelas singkat sungguhan masuk katalog: tiga non-teknis (keuangan, keamanan akun, menulis laporan) dan dua teknis (BscScan, token & izin); lolos `auditCourse`, manifest + rubricHash terbit = hitungan dari kunci, kunci di luar bundel, harga di satu sumber (4/6/8/10/12 LDC-demo) | **PASS** 2 Okt | `probe` 118/0, pemindaian bundel `verify:quizkeys`, `verify:paywall` 24/0; T49 langkah 1 |
| AC-B127#2 | komponen berbobot 0 tidak dihitung "belum lengkap" oleh `computeScore`; `auditCourse` menolak bobot >0 tanpa lesson jenisnya dan lesson dinilai di komponen berbobot 0 | **PASS** 2 Okt | `probe`: 3 kursus tanpa praktik → keputusan dengan kuis + esai saja; dua asersi audit dua arah; `npm run rubric` 17/0 tetap |
| AC-B127#3 | halaman Kursus `#/app/courses` + menu sidebar "Kursus": cari (judul, ringkasan, topik, isi lesson; semua kata harus cocok), saring tingkat/topik/status, urutkan, hasil kosong dengan tombol atur ulang | **PASS** 2 Okt | T49 langkah 2–3 |
| AC-B127#4 | pratinjau metadata sebelum membayar: hasil belajar, sasaran, fakta (modul, lesson, menit, soal, esai, masa berlaku), cara dinilai (bobot, ambang, rubricHash, komponen berbobot 0 ditandai "tidak dinilai"), silabus, harga + saldo + "Bayar & daftar" (panel bayar B125 yang sama); tautan langsung `#/app/courses/<id>` | **PASS** 2 Okt | T49 langkah 4–7 (dua pembayaran sungguhan dari panel pratinjau) |
| AC-B127#5 | Ringkasan berisi: ubin (kursus, lesson, usaha dinilai, saldo dari chain), lanjutkan belajar (3 kelas terakhir aktif), perlu perhatianmu, menuju kredensial (perkiraan `computeScore` vs ambang), aktivitas terbaru, kursus untukmu | **PASS** 2 Okt | T49 langkah 8–9 |
| AC-B127#6 | FE khas Lencana: kartu = lencana yang akan didapat (emblem warna topik + cincin tingkat), palet Lencana, angka mono; kartu beranda tanpa gambar khusus memakai emblemnya, bukan satu gambar cadangan yang diulang; ponsel 500 px (tab bawah 7 menu berlabel pendek, panel pratinjau layar penuh) | **PASS** 2 Okt | T49 langkah 10–13 |
| AC-B127#7 | gerbang hijau | **TERBUKA** | `tsc`, build, `probe` 118/0, `rubric` 17/0, `verify:records` 17/0, `verify:paywall` 24/0 hijau; `verify:quizkeys` 60/66 — enam merah: dokumen criteria kelas uji + lima kursus baru belum di tepi (#8) |
| AC-B127#8 | dokumen criteria keenam kursus baru terbit di tepi (`npm run publish:edge`) | **TERBUKA** | kata builder + token Cloudflare di lingkungan builder (sama dengan AC-B126#10) |
| AC-B127#9 | login sungguhan → cari, pratinjau, bayar dari halaman Kursus → Ringkasan | **TERBUKA** | uji builder |

**Batas klaim:** lima kursus ini kelas singkat (31–39 menit), bukan program; harganya dipilih untuk menguji. Praktik di kelas
non-teknis tidak ada — bukan "dinilai chain". Perkiraan nilai di Ringkasan bukan pernyataan kelulusan.
