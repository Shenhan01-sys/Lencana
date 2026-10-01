---
tags: [results, executive-summary, B122]
status: active
updated: 2026-10-01
---

# B122 - Executive Summary — halaman belajar akhirnya bisa menulis ke penerbit dari peramban

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B122 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B122 - Preflight CORS]] · **Testing:** [[09-Testing/T42 - Uji peramban ruang kelas (FE7)]]

## 1. Apa yang diubah

- `signer/src/server.js`: `OPTIONS` dijawab 204 dengan izin CORS (`*`, `GET/POST/OPTIONS`, `content-type, x-payment`,
  jaringan privat). Sebelumnya setiap preflight dijawab 405.
- `web/src/pages/class.ts`: aksi lesson membaca kursus dari rute (tombol kuis di templat tidak membawa `data-course`), dan
  kotak identitas di-render ulang juga saat sinkron gagal.
- `signer/scripts/privy-check.js`: 3 pemeriksaan preflight.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| preflight rute tulis | 405 di 7 rute | 204 + izin lengkap |
| tulisan halaman dari peramban sungguhan | **0** — enroll gagal "Failed to fetch" | enroll, progres, kuis, esai sampai (T42) |
| kuis dari halaman | ditolak: kursus kosong | dinilai server + pembahasan per soal |

## 3. Status

**SELESAI** (lokal; ikut commit merge FE). Sebelumnya tak terlihat karena semua bukti "halaman memanggil /enroll…/grade"
berasal dari probe dengan `fetch` palsu dan harness Node — keduanya tidak terkena CORS.

## 4. Risiko tersisa

- `allow-origin: *` — aman selama otorisasi tetap di badan permintaan (tanda tangan/token) dan tidak ada cookie; kalau
  kelak ada sesi berbasis cookie, daftar origin harus dibatasi.
- Belum ada harness peramban; T42 adalah uji satu kali. Regresi CORS dijaga `verify:privy` bagian C.

## 5. Bukti

T42 (langkah 5–11), `npm run verify:privy` bagian C (3 pemeriksaan preflight).
