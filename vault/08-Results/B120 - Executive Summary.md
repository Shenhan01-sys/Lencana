---
tags: [results, executive-summary, B120]
status: active
updated: 2026-10-01
---

# B120 - Executive Summary — reviewer diperlakukan sebagai penilai (agen AI)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B120 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B120 - Reviewer sebagai penilai]] · **Testing:** [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]]

## 1. Apa yang diubah

- **Agen reviewer kedua** di registry ERC-8004 BNB: **#2542**, dengan Agent Owner dan dompet yang berbeda
  dari agen penilai #2534, tarif dasar 1500.
- `POST /essay/reviewers` menerima `agentId`: penerbit menunjuk reviewer agen; dompet, pemilik, dan tarifnya
  dibaca dari registry; ditolak kalau ia agen penilai kursus itu atau pemiliknya sama.
- `POST /agents/hire` menjaga arah sebaliknya: agen (atau Agent Owner) yang sudah jadi reviewer kursus itu
  tidak bisa disewa sebagai penilainya. Ditambahkan 1 Okt sore setelah ditemukan baris residu run harness
  pertama yang menjadikan #2534 penilai **dan** reviewer satu kursus (dihapus; rincian di T37).
- `POST /essay/review`: reviewer agen wajib menyebut label tingkat berat; ditolak kalau ia agen pengusul atau
  milik Agent Owner yang sama; `agentId`-nya tercatat di pengesahan; aktivitasnya ditagih (B119).
- B104 tidak diubah perilakunya: pengesah manusia tetap boleh, gerbang tetap fail-closed.

## 2. Hasil vs KPI

| KPI | hasil 1 Okt |
|---|---|
| bagian B120 harness tanpa gas | **12/12** (10/10 sebelum dua pemeriksaan arah-sebaliknya ditambahkan) |
| bagian B120 dengan uang | **15/15** (sebelumnya 13/13) |
| angka akhir sesudah `adjusted` | **92** (angka reviewer), bukan 80 (usulan agen penilai) |
| tagihan pengesahan `sedang` dari tarif 1500 | **1725**, dibayar +**1553** ke dompet reviewer |
| regresi B104 | `verify:db` **70/0** |

## 3. Status

**SELESAI** untuk core. **BLOCKED**: pencerminan ke ValidationRegistry (belum ada di chain 97) dan UI reviewer (FE).

## 4. Risiko tersisa

- "Agent Owner berbeda" hanya bisa diperiksa terhadap alamat; satu orang dengan dua alamat tidak terdeteksi.
- Dua agen di demo dimiliki dua kunci yang sama-sama dipegang tim Lencana.

## 5. Bukti

- `register()` #2542 `0x4ff1681431a52486f8936ae77605980281f0ad4def455f041b22c0542dbfd091`; `setAgentWallet`
  `0xc457e8e7d46e3c668fe31660462e9609da8bf6a04f1169163fe63444f1a73e3e`; tarif `0x9c5d28d5d2b01df49cb6da00083ccf552ffb50e1926506ecaa13bc4704c62fb9`.
- Pembayaran pengesahan (run terakhir, 15/15): settle `0x1132023e15783fd980090963357a1f718959ebbcdf0a04b06dc4545754ef566f`, split `0x5baeb248dc4454b61a0cd513f34f448591413035e0b6e0047511501ccd4b9f93`. Run pertama (13/13): settle `0x5b9ceb56c801f36ad09c6a24da8619d54261ec351c066598bb86fb7f1a3d99f8`, split `0xbd5249b4b57bcce37ba7e23012f2b20d7ab5da8d9bc77d788f29098baf8a3b3e`.
