---
tags: [results, executive-summary, B133]
status: active
updated: 2026-10-03
---

# B133 - Executive Summary — Penerbit menyusun kursus, kunci penerbit menerbitkan (D67)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B133 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B133 - Penerbit menyusun kursus, kunci penerbit menerbitkan]] ·
**Testing:** [[09-Testing/T58 - signer authoring-check.js (B133 susun kursus)]] · [[09-Testing/T59 - Uji peramban susun kursus sampai dikerjakan peserta (B133)]] ·
**Keputusan:** D67

## 1. Apa yang diubah

- **Susun kursus dari halaman.** Dasbor Penerbit punya bagian "Susun kursus" (`#/app/pub/author`):
  - lajur Draf → Diajukan → Terbit;
  - editor dengan tulang silabus (modul sebagai ruas, lesson sebagai keping berwarna menurut jenis) dan pin merah di tempat masalah;
  - batang bobot kuis/esai;
  - formulir kursus, modul, dan lesson: bacaan dengan isi bergaya singkat, kuis dengan pilihan benar + alasan, esai dengan rubrik;
  - pratinjau lesson.
- **Yang disimpan = yang ditandatangani.** Halaman dan server menormalkan draf dengan satu modul (`web/src/authoring.ts`). Penyusun
  menandatangani hash isinya, dan server menyimpan hanya bila menghitung hash yang sama.
- **Audit yang sama dengan kursus berkas.** Draf diaudit dengan aturan yang sama ditambah batas editor. Draf bermasalah tidak bisa
  diajukan.
- **Kunci penerbit yang menerbitkan** (`npm run course:publish`). Sebelum menandatangani, CLI mengaudit ulang isi yang tersimpan dan
  menghitung `rubricHash` (ikut ditandatangani) serta `manifestHash`. Penolakan membawa catatan dan mengembalikan draf ke penyusunnya.
- **Kursus terbit berjalan di jalur yang sama dengan kursus berkas:**
  - katalog server dan halaman, harga, enroll, kuis dinilai server, dan criteria;
  - CLI terbit kredensial dan `publish:edge` ikut memuatnya;
  - kunci kuis tidak pernah keluar lewat katalog publik.
- **Hak susun** lahir dari hibah kunci penerbit: `grant:member -- <alamat> --author`.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| Penerbit membuat kursus baru | hanya lewat kode (berkas TypeScript + PR) | dari halaman, diterbitkan kunci penerbit |
| kursus dari halaman bisa didaftari dan dikerjakan | — | ya (T59: kuis dinilai server = 100) |
| `verify:authoring` | — | 48/0 |
| `verify:roles` · `verify:publisher` · `verify:account` | 39/0 · 57/0 · 50/0 | 39/0 · 57/0 · 50/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 759.51 kB (B131) | 794.68 kB (editor) |
| baterai `sync:numbers` | 28 harness · 26 hijau (B131) | 29 harness · 27 hijau — dua merah tetap data tepi basi (`verify:edge`, `verify:quizkeys` 60/66), disembuhkan `publish:edge` oleh builder |

## 3. Yang belum

- Login sungguhan builder: akun dummy diberi `--author`, menyusun, lalu builder menerbitkan.
- Criteria kursus database di tepi menunggu `npm run publish:edge`.
- Lesson praktik tidak disusun dari halaman.
- Menerbitkan masih CLI, belum tombol untuk pemegang kunci.
- Kursus terbit tidak bisa ditarik dari halaman.
