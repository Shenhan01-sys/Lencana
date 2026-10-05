---
tags: [results, executive-summary, B159]
status: active
updated: 2026-10-05
---

# B159 - Executive Summary — pemilih label tingkat berat: tangga bayaran + papan bacaan

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B159 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B159 - Pemilih label tingkat berat]] ·
**Testing:** [[09-Testing/T84 - Uji peramban pemilih label tingkat berat (B159)]]

## 1. Apa yang diubah

- Komponen baru `web/src/pages/fee-ladder.ts` + `fee-ladder.css`, dipakai antrean agen penilai
  (`web/src/pages/agent-brain.ts`) dan meja pengesahan (`web/src/pages/review-desk.ts`). Sebelumnya tangganya ditulis dua kali.
- Judul berupa pertanyaan ("Seberapa berat menilai esai ini?" / "…mengesahkan penilaian ini?") + catatan "Kamu yang memilih —
  label masuk ke tanda tanganmu dan menentukan bayaranmu".
- Tujuh batang tanpa teks. Tinggi = bayaran dengan sumbu utuh: lapis redup = tarif dasar, lapis emas = kenaikan; garis "tarif
  dasar".
- Papan bacaan: label, "tingkat k dari 7", bayaran + simbol token, "+N % dari tarif dasar"; pratinjau saat batang disorot atau
  difokus.
- Radio dengan panah / Home / End; `disable()` sesudah tanda tangan.
- Tangga lama (`.ab-ladder`, `.ab-rung`, teks `pickLabel`) dibuang.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| ukuran teks label | 10,5 px di dalam batang (9 px di HP) | 18 px di papan bacaan (16 px di HP) |
| bayaran terbaca | angka 10 px di batang, tanpa % | bayaran + "+N % dari tarif dasar" (T84 langkah 4, 5) |
| tinggi batang | `44px + k × 8px` (tidak terkait bayaran) | bayaran / bayaran tertinggi: 76,92 → 100 % (T84 langkah 2) |
| papan ketik | tidak ada navigasi panah | panah / Home / End (T84 langkah 5) |
| salinan kode | 2 | 1 |
| 375 px | — | 0 luapan (T84 langkah 10) |
| `tsc` · `probe` · `build` | 0 · 118/0 · 0 | 0 · 118/0 · 0 |

## 3. Status

~~**SELESAI di kode, belum LIVE** — commit lokal; FE ke Vercel menunggu kata dorong builder.~~ **SELESAI · LIVE** — didorong
`c386c9e..1a2df2e` atas kata builder (5 Okt); bundel Vercel `assets/index-HWRMcOLN.js` memuat "Seberapa berat menilai esai
ini?" (dibaca 5 Okt sesudah dorongan); workflow `deploy-signer` run `37269781564` ikut jalan (berkas `web/src/**`) dan sukses,
`/healthz` 200. Pemakaian di antrean dan meja pengesahan sungguhan belum tercatat (AC-B159#10 **PARTIAL**).

## 4. Risiko tersisa

- Uji memasang komponen sendiri; pemasangannya di dua halaman hanya diperiksa `tsc` (T84 §Batas).
- Kenaikan tingkat 1 → 2 hanya ±4 px; tangganya terbaca dari lapis emas dan papan bacaan, bukan dari beda tinggi total.

## 5. Bukti

T84 langkah 1–10; `web/src/pages/fee-ladder.ts`.
