---
tags: [results, executive-summary, B124]
status: active
updated: 2026-10-02
---

# B124 - Executive Summary — area internal peserta, onboarding, dan detail kursus publik

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B124 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B124 - Area internal peserta, onboarding, dan detail kursus publik]] ·
**Testing:** [[09-Testing/T44 - Uji peramban area internal dan detail kursus (B124)]] · [[09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta)]] ·
**Rencana:** RF7 langkah A2

## 1. Apa yang diubah

- **Core:** `POST /me/records` (`signer/src/server.js`, `learnerRecords` di `signer/src/db.js`) — rekaman milik satu peserta
  (enrollment, ringkasan, usaha yang dinilai, status pengesahan esai) hanya untuk pemilik alamat; harness baru
  `npm run verify:records` masuk baterai.
- **Area internal `#/app`** (`web/src/pages/dashboard.ts`): sidebar Ringkasan · Kelas saya · Nilai & tugas · Kredensial saya ·
  Akun; di ponsel menjadi tab bawah. Nav "Dashboard" menunjuk ke sini; `#/me` lama dialihkan.
- **Onboarding login pertama** (`#/app/welcome`): tiga kursi (Penerbit dan Agent Owner berlabel "segera" dengan syarat
  sebenarnya), tur tujuh langkah yang sama dengan stasiun alur 3D, lalu pilih kursus pertama.
- **Detail kursus publik** (`web/src/pages/course-detail.ts`, `#/course/<id>`): silabus, penerbit, apa yang dibuktikan
  kredensialnya; kartu katalog di beranda menunjuk ke sini. Tanpa harga sampai langkah B.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| bagian internal peserta | 1 halaman lama (`#/me`) | 5 bagian ber-sidebar + onboarding |
| tamu bisa melihat isi kursus sebelum masuk | tidak (`#/course/<id>` langsung ke kelas, perlu login) | ya — silabus 5 modul / 19 lesson (Web3 Dasar), aturan penilaian, penerbit |
| rute baca nilai milik peserta | tidak ada (hanya `GET /progress`, terbuka per alamat) | `POST /me/records` bertanda tangan, `verify:records` 16/0 |
| entry bundle | 575.00 kB (B123) | 594.34 kB |
| baterai `npm run sync:numbers` | 22 harness · 0 gagal | 23 harness · 0 gagal (`verify:records` masuk) |

## 3. Yang belum

Login sungguhan sampai dashboard (AC-B124#9); harga + bayar sebelum enrollment (langkah B); dashboard Penerbit dan Agent Owner
(langkah C). Temuan privasi `GET /progress` dicatat di AC-B124.

## Pembaruan 6 Okt malam (catatan builder)

Tombol kembali di detail kursus dan topbar kelas kini menuju `#/app` bagi yang sudah masuk (tamu tetap ke katalog) — `web/src/back-target.ts`; T95 langkah 1–3. Ditutup bersama butir lain atas catatan builder.
