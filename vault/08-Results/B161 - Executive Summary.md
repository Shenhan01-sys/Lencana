---
tags: [results, executive-summary, B161]
status: active
updated: 2026-10-05
---

# B161 - Executive Summary — antrean pengesahan tidak lagi kehilangan komponen nilai

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B161 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B161 - Antrean pengesahan dan batas 1000 baris]] ·
**Testing:** [[09-Testing/T74 - signer review-check.js (B144 meja pengesahan)]]

## 1. Apa yang diubah

- `signer/src/db.js` `queuePendingReviews`: komponen nilai dibaca **hanya untuk butir yang dikembalikan**, per potongan 25 butir (`COMPONENT_CHUNK`), setelah
  yang sudah disahkan disaring dan hasilnya dipotong ke `limit`. Dulu komponen **semua** baris `judged` (hingga 500, termasuk yang sudah disahkan) dibaca dalam
  satu kueri `attempt_id=in.(…)`; PostgREST memotong jawaban di 1000 baris tanpa tanda, sehingga komponen butir terbaru hilang (`points: null`).
- Bila `includeTest` mati, baris uji juga disaring **di SQL** (`attempts.enrollments.origin=neq.test`), supaya sisa uji yang menumpuk tidak menyingkirkan esai sungguhan
  dari 500 baris pertama. Saringan lama di JS tetap.
- Tidak ada baris yang dihapus. Server lain, front-end, dan harness tidak diubah oleh item ini.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| `verify:review` pada keadaan database 5 Okt (133 sisa uji `web3-dasar` + 1 `uji-bayar` `origin=test`) | **31 / 1** (baterai kedua dan run sendiri) | **31 / 0** |
| butir tanpa komponen, `web3-dasar-2026` `includeTest` `limit` 500 dan 100 | butir uji terbaru tanpa komponen | 25 butir, **0** tanpa komponen |
| antrean nyata #2547 (tanpa `includeTest`) | — (tidak terganggu: butir nyata sedikit) | `#964`, usulan 98, poin 40/40, 40/40, 18/20, lima tanda mekanis benar |
| baris yang dibaca untuk komponen | semua `judged` yang lolos saringan (137+) | hanya yang dikembalikan (≤ `limit`, 25 saat ini) |

## 3. Status

**SELESAI di kode, belum LIVE** — commit lokal; deploy signer lewat dorongan ke `main` (GitHub Actions) menunggu kata builder. Dampak nyata bagi builder saat ini: tidak ada
(meja pengesah sungguhan memakai `includeTest=false`); yang rusak hanya harness. Gerbang akhir: lihat baris B161 di backlog dan hub Testing (baterai penuh sesudah perbaikan).

## 4. Risiko tersisa

- Sisa uji `origin=test` (134 baris esai `judged` per 5 Okt, sejak 1 Okt) masih menumpuk dan bertambah beberapa baris tiap baterai; pembersihan (`npm run cleanup -- --apply`)
  adalah keputusan builder dan tidak dijalankan. Perbaikan ini membuatnya tidak lagi merusak antrean, bukan menghilangkannya.
- Tidak ada tes deterministik tanpa database untuk batas 1000 baris (AC-B161#6 **PARTIAL**).
- Pembacaan PostgREST lain yang bisa terpotong diam-diam tidak diaudit (hanya pola `attempt_components` `in.(…)` yang dicari).

## 5. Bukti

`verify:review` merah 31 / 1 → hijau 31 / 0 pada keadaan database yang sama; skrip baca-saja `b161-check` (scratchpad sesi) untuk antrean nyata #2547; `signer/src/db.js` `queuePendingReviews`.
