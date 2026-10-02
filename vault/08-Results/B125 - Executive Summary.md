---
tags: [results, executive-summary, B125]
status: active
updated: 2026-10-02
---

# B125 - Executive Summary — kursus berbayar: bayar dulu, baru masuk kelas

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B125 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B125 - Bayar dulu baru masuk kelas]] · **Testing:** [[09-Testing/T46 - signer paywall-check.js (B125 bayar dulu)]] ·
[[09-Testing/T47 - Uji peramban bayar dan daftar (B125)]] · **Rencana:** RF7 langkah B, RF5 · **Keputusan:** D60

## 1. Apa yang diubah

- **Harga satu sumber** `web/src/pricing.ts`: Web3 Dasar 10, Web3 Lanjut 25 LDC-demo (keputusan builder), diimpor halaman dan server.
- **Server:** `POST /enroll` kursus berbayar menjawab 402 + syarat x402; dengan `X-PAYMENT` yang sah dan pesan enroll bertanda tangan
  peserta, server menyiarkan settlement + pembagian `SettlementSplit` (jalur yang sama dengan `/verify`), menulis enrollment dan
  `orders` = paid. `POST /faucet` mencetak koin uji (sekali per alamat per 24 jam). `ENROLL_PAYWALL=off` hanya untuk server harness;
  `/healthz` melaporkannya. `POST /me/records` kini membawa order.
- **Halaman:** harga di katalog dan detail kursus; panel bayar (saldo dari chain, "Ambil koin uji", "Bayar & daftar" — hanya tanda
  tangan, tanpa gas); kelas berbayar menunjuk halaman bayar, tidak lagi mendaftar diam-diam; dashboard bagian **Pembayaran** dengan
  tautan BscScan testnet.
- **Harness** `npm run verify:paywall` (23/0, masuk baterai) + `--live` (31/0 di chain 97).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| enrollment kursus | gratis untuk siapa pun yang punya kunci | kursus berbayar: hanya sesudah lunas (402 → bayar → enroll) |
| baris `orders` | tidak pernah ditulis sejak migrasi 0001 | ditulis saat lunas, dengan tx settlement |
| gas yang dibayar peserta | — | nol: dua tanda tangan typed data + satu pesan |
| bukti di chain (T47) | — | tx settlement `0x675472b0…cde5` status 1 (blok 134357856) |
| entry bundle | 594.34 kB (B124) | 605.04 kB |

## 3. Yang belum

Login sungguhan → bayar dengan dompet tertanam (AC-B125#11). Harga di mainnet dan stablecoin sungguhan di luar cakupan testnet.
Premi tenggat (`CourseDeposit`) tetap mekanisme terpisah.
