---
tags: [acceptance-criteria, B159]
status: active
updated: 2026-10-05
---

# AC-B159 - Pemilih label tingkat berat

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B159 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T84 - Uji peramban pemilih label tingkat berat (B159)]] ·
**Summary:** [[08-Results/B159 - Executive Summary]]

Permintaan builder 5 Okt: "label "Difficulty label (sets the fee)" coba dibuat yg lebih oke UInya". Pilihan builder:
**"Tangga + papan bacaan"**. Aturan harga tidak berubah (`signer/src/pricing.js`: label dipilih agen, +5 %/tingkat dari tarif
dasar pemilik).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B159#1 | judul berupa pertanyaan + catatan bahwa label dipilih penilai, masuk tanda tangannya, dan menentukan bayarannya; teks pengesah berbeda | **PASS** 5 Okt | T84 langkah 1, 8 |
| AC-B159#2 | batang tanpa teks; tinggi = bayaran dengan sumbu utuh (dasar redup sama rata, kenaikan emas), garis "tarif dasar" | **PASS** 5 Okt | T84 langkah 2 (76,92 → 100 %, emas 0 → 25,8 px) |
| AC-B159#3 | papan bacaan besar: label, tingkat k dari 7, bayaran + simbol token, % dari dasar ("= tarif dasar" di tingkat 1) | **PASS** 5 Okt | T84 langkah 4, 5 |
| AC-B159#4 | pratinjau saat disorot/difokus, kembali ke pilihan saat dilepas | **PASS** 5 Okt — fokus lewat event eksplisit | T84 langkah 3, 6 |
| AC-B159#5 | radio yang bisa dipakai papan ketik: panah, Home, End; satu `tabindex` 0 | **PASS** 5 Okt | T84 langkah 4, 5 |
| AC-B159#6 | satu komponen untuk antrean agen penilai dan meja pengesahan; tangga lama + CSS-nya dibuang | **PASS** 5 Okt — dibaca dari kode + `tsc` | `web/src/pages/fee-ladder.ts`; pemakaian di `web/src/pages/agent-brain.ts` dan `web/src/pages/review-desk.ts`; pencarian `ab-ladder` dan `ab-rung` di `web/src` → 0 hasil |
| AC-B159#7 | terkunci sesudah tanda tangan | **PASS** 5 Okt | T84 langkah 7 |
| AC-B159#8 | rapi di 760 px dan 375 px | **PASS** 5 Okt | T84 langkah 10 (0 luapan) |
| AC-B159#9 | gerbang | **PASS** 5 Okt | `tsc` 0, `probe` 118/0, `build` exit 0 (T84) |
| AC-B159#10 | dipakai di antrean / meja pengesahan sungguhan oleh pemilik agen | **PARTIAL** | T84 memasang komponen sendiri; percobaan builder sesudah dorongan belum tercatat |

**Batas klaim:** tangga menggambarkan bayaran, bukan "berat" itu sendiri — label tetap pilihan penilai, dan selisih bayaran
kecil dengan sengaja (paling banyak +30 %).
