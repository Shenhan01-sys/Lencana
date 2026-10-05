---
tags: [results, executive-summary, B167]
status: active
updated: 2026-10-06
---

# B167 - Executive Summary — latar cetak sertifikat: gelap atau terang (hemat tinta)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B167 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B167 - Latar cetak terang atau gelap di dialog sertifikat]] · **Testing:** [[09-Testing/T90 - Uji peramban latar cetak sertifikat (B167)]] ·
**Terkait:** B165, B166, [[03-Frontend/FE9 - Credentials page and certificate sheet]]

Keputusan builder 5 Okt malam: "Boleh kalau untuk sertif ini" — atas usul saya setelah cetak/PDF B165 dibuat gelap penuh (boros tinta di kertas).

## 1. Apa yang diubah

- `web/src/certificate.ts`: `Paper`, `loadPaper`, `savePaper` (per alamat, tahan penyimpanan rusak).
- `web/src/pages/certificate-view.ts`: kelompok "Latar saat dicetak" di dialog cetak (Gelap — seperti di layar / Terang — hemat tinta), atribut `data-paper` pada lembar dan lapisan, pilihan tersimpan saat Cetak.
- `web/src/pages/certificate.css` (dibangun ulang dari desain S3): di `@media print` dan `data-paper="terang"` token terang S3 (kontras emas/abu yang gagal sudah dikoreksi di sana), kaca diganti isi putih, kertas `#f5f5f5`.
- `web/scripts/probe.ts`: dua pemeriksaan (latar per alamat; tahan penyimpanan rusak dan nilai asing).
- **Tidak** disentuh: tampilan layar (tetap gelap), tema aplikasi, kontrak, signer, database.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| cetak/PDF sertifikat | hanya gelap penuh | pilihan Gelap (bawaan) atau Terang di dialog; diingat per alamat (T90 langkah 2–8) |
| layar sesudah memilih Terang | — | tetap gelap (T90 langkah 5) |
| PDF | 1 halaman gelap | 1 halaman di kedua latar (T90 langkah 6, 7) |
| kontras terukur dari piksel render print | angka perancang S3 (tidak diukur ulang) | **0 gagal dari 38 teks di kedua latar**, terburuk 4,94:1 (terang) dan 4,99:1 (gelap) |
| `tsc` · `probe` · `build` | 0 · 210/0 · 0 | 0 · **212/0** · 0 |

## 3. Status

**SELESAI di kode, belum LIVE** — belum didorong; AC-B167#11 OPEN.

## 4. Risiko tersisa

- Cetak di kertas sungguhan dan peramban selain Chrome 154 belum diuji; PDF hanya diperiksa lewat media `print` dan jumlah halaman.
- Kontras = median piksel di kotak teks (perkiraan, latar bergradasi).
- Latar halaman di balik lembar memakai `:has()`; tanpa dukungan itu hanya selisih piksel di tepi halaman yang tetap gelap (lembar sendiri tetap terang).

## 5. Bukti

T90 langkah 1–9; `probe` dua pemeriksaan "latar cetak"; `web/src/pages/certificate-view.ts`, `web/src/pages/certificate.css`, `web/src/certificate.ts`.
