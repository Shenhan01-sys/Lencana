---
tags: [results, executive-summary, B126]
status: active
updated: 2026-10-02
---

# B126 - Executive Summary — kelas uji, saldo, rapor bergrafik, pita pemuatan

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B126 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B126 - Kelas uji, saldo, rapor bergrafik, pita pemuatan]] ·
**Testing:** [[09-Testing/T48 - Uji peramban kelas uji, saldo, rapor, pemuatan (B126)]] · **Keputusan:** D61

## 1. Apa yang diubah

- **Kelas uji** `uji-bayar-2026` "Kelas Uji — Membayar dengan Tanda Tangan": empat lesson (bacaan, kuis, praktik `eth-call` atas
  koin LDC-demo, esai) yang menjelaskan apa yang terjadi saat peserta membayar. Harga 5 LDC-demo, manifest + rubricHash
  `0x6d33c95b…68f0`, kunci kuis di `uji-bayar.keys.ts`. `unlisted`: tidak tampil di katalog publik, tampil bertanda di dashboard.
- **Saldo**: `web/src/balance.ts` membaca `balanceOf` dari chain untuk chip navbar (koin + angka bergulir), panel bayar, dan bagian
  **Dompet** baru di dashboard (menggantikan Pembayaran; tautan lama `#/app/payments` diarahkan ke sana): koin uji dengan jeda yang
  terbaca, batang "ke mana koin pergi", riwayat pembayaran.
- **Nilai & tugas** (`web/src/pages/grades.ts`): cincin lesson selesai, timbangan kelulusan terhadap ambang penerbit, batang skor
  kuis per lesson, tabel ringkas per tugas, riwayat dilipat. Perkiraan = `computeScore` penerbit atas bukti dengan aturan
  `fromAttempts.js`; `POST /me/records` kini membawa `chainChecked` supaya praktik dihitung sama dengan penerbit.
- **Memuat**: pita emas global (`web/src/lib/loading.ts`) membungkus `window.fetch`, jadi setiap permintaan ke penerbit, RPC chain, dan
  login menggerakkannya; kerangka berbentuk isi + tahap sungguhan (tanda tangan → penerbit) menggantikan teks "memuat".
- **Inspirasi React Bits** (dicek 2 Okt langsung dari `reactbits.dev/r/registry.json` — MCP reactbits tidak terpasang dan MCP shadcn
  tidak punya registry): tidak ada komponen loader/progress/grafik; yang dipinjam tekniknya, ditulis ulang tanpa React: `Counter`
  (digit bergulir) untuk saldo dan ubin, `ShinyText` (kilau gradien) untuk kerangka dan pita.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| kelas berbayar yang bisa diuji builder dengan akunnya (yang sudah terdaftar di kedua kursus sebelum harga berlaku) | 0 | 1 (kelas uji, 5 LDC-demo) |
| tempat saldo terlihat | panel bayar (teks) | chip navbar, panel bayar, Dompet — satu pembaca chain, bergulir saat berubah |
| Nilai & tugas | satu tabel per kursus berisi semua usaha | cincin + timbangan + batang kuis + tabel per tugas + riwayat dilipat |
| keadaan memuat | teks "Membaca rekamanmu…" | pita global + kerangka + tahap muat |
| bukti di chain (T48) | — | settlement `0xe5172ea5…6870` (kelas uji) dan `0x1dbbbc93…8dc6` (Web3 Dasar) sukses |
| entry bundle | 605.04 kB (B125) | 638.14 kB |

## 3. Yang belum

Dokumen criteria kelas uji di tepi (`npm run publish:edge`, kata builder) — sampai itu `verify:quizkeys` 35/1. Login sungguhan →
bayar kelas uji dengan dompet tertanam (AC-B126#11).
