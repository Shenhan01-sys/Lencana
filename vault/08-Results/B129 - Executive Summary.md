---
tags: [results, executive-summary, B129]
status: active
updated: 2026-10-02
---

# B129 - Executive Summary — kursi Penerbit end-to-end (RF7 langkah C2)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B129 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit]] ·
**Testing:** [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]] · [[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]] ·
**Keputusan:** D64

## 1. Kenapa

Builder mencoba dua akun (2 Okt). Akun pertama ternyata **sudah** anggota sejak B128, dan `/me/roles`-nya terbaca, tetapi tampilan
penerbit belum ada: tombol di kursi Penerbit hanya membuka Akun, jadi yang terlihat tetap dasbor peserta. Akun kedua mendapat dompet
baru dan tidak punya jalan apa pun ke kursi itu. Keduanya celah produk, bukan kegagalan teknis.

## 2. Apa yang diubah

- **Pengajuan anggota** (`member_requests`, migrasi 0014): akun mengajukan dari onboarding, Akun, atau dasbor dengan tanda
  tangannya sendiri dan catatan opsional; pengajuan tercatat dengan statusnya (menunggu / ditolak / disetujui) dan tidak memberi
  wewenang. Kunci penerbit yang memutuskan: hibah keanggotaan menutupnya sebagai disetujui, pesan tolak menutupnya sebagai ditolak.
  `npm run grant:member -- --list` menampilkan yang menunggu.
- **Dasbor Penerbit `#/app/pub`**, dengan pemilih kursi Peserta/Penerbit: Ringkasan (ubin, ke mana uangnya, alur esai, per kursus,
  tim), Kursus, Peserta, Esai, Agen, Pendapatan. Satu permintaan bertanda tangan (`POST /publisher/overview`); potongan platform
  dibaca dari `SettlementSplit` di chain saat itu; tanpa teks esai; baris harness disaring kecuali diminta.
- **Aksi anggota** dengan tanda tangannya sendiri, sesuai hibah: sewa agen penilai (`hire=1`), tunjuk agen pengesah (`appoint=1`).
  Fakta agen dibaca dari registry ERC-8004 sebelum tombol tanda tangan muncul. Agen milik anggota itu sendiri ditolak.

## 3. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| jalan akun baru ke kursi Penerbit | tidak ada (CLI pemegang kunci, tanpa tahu siapa yang ingin) | ajukan dari halaman → disetujui/ditolak kunci penerbit |
| tampilan untuk pemegang kursi Penerbit | tidak ada (B128: "menyusul") | dasbor enam bagian + pemilih kursi |
| aksi anggota | hanya kunci penerbit (CLI/rute penerbit) | sewa/tunjuk agen dengan tanda tangan anggota sesuai hibah |
| `verify:publisher` | — | 53/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 695.75 kB (B128) | 732.12 kB |
| baterai `sync:numbers` | 25 harness · 24 hijau (B128) | 26 harness · 25 hijau — merah tunggal tetap `verify:quizkeys` 60/66 (criteria B126/B127 di tepi) |

## 4. Yang belum

Login sungguhan (AC-B129#9). Pembayaran tagihan agen dari halaman (tetap kunci penerbit). C3: dasbor Agent Owner + agen ERC-8004
baru untuk akun builder — menunggu acc. Tabel bukti README belum memuat `verify:records` dan `verify:paywall` (temuan B128, tetap).
