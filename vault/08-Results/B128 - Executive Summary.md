---
tags: [results, executive-summary, B128]
status: active
updated: 2026-10-02
---

# B128 - Executive Summary — peran akun di core (RF7 langkah C1)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B128 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B128 - Peran akun di core]] ·
**Testing:** [[09-Testing/T50 - signer roles-check.js (B128 peran akun)]] · [[09-Testing/T51 - Uji peramban kursi akun (B128)]] ·
**Keputusan:** D63

## 1. Apa yang diubah

- **Kursi dibaca dari fakta, bukan dipilih di halaman.** `POST /me/roles` (bertanda tangan, pesan `lencana-roles`) menjawab
  kursi satu akun: **peserta** (setiap akun); **penerbit** — pemegang kunci penerbit (`via: issuer`) atau anggota yang
  keanggotaannya ditandatangani kunci itu (`via: member`, dengan wewenang `canHire`/`canAppoint`); **Agent Owner** — agen
  ERC-8004 yang `ownerOf`-nya alamat itu, dengan dompet dan tarif dari registry.
- **Keanggotaan penerbit** (`publisher_members`, migrasi 0013): satu baris per (penerbit, anggota), lahir hanya dari pesan
  `lencana-member grant member=… hire=0|1 appoint=0|1 nonce=…` bertanda tangan kunci penerbit; pesan + tanda tangan disimpan
  supaya hibah bisa diperiksa ulang; cabut = pesan bertanda tangan kedua, barisnya tetap ada. Diberikan lewat
  `POST /publisher/members` atau CLI `npm run grant:member`. **Wewenang terbit/cabut kredensial tidak ada di tabel ini.**
- **Halaman:** kartu "Kursi di akun ini" di Akun dan kursi onboarding yang berubah dari "Segera" menjadi "Kursimu" / "Belum" /
  "Tak terbaca" sesuai fakta. Kursi dibaca sekali per muat halaman (satu tanda tangan dipakai Akun dan onboarding).
- **Akun builder** `0x12f6…11DF` diberi keanggotaan `hire=1 appoint=1` (asal `demo`) supaya kursi Penerbit terlihat saat login.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| peran produk di core (Product Bar #11) | tidak ada — aksi penerbit hanya dari mesin pemegang kunci | peserta · anggota penerbit (bertanda tangan) · Agent Owner (`ownerOf`) |
| kursi Penerbit/Agent Owner di onboarding | label "Segera" untuk semua akun | dari fakta per akun |
| `verify:roles` | — | 39/0 |
| `readMyRoles()` di peramban | 4241 / 1646 / 2425 ms (versi pertama) | 2114 / 985 / 1551 / 1209 / 1113 ms (`ownerOf` serentak dulu) |
| `probe` | 118/0 | 118/0 |
| entry bundle | 689.42 kB (B127) | 695.75 kB |
| baterai `sync:numbers` | 24 harness · 23 hijau (B127) | 25 harness · 24 hijau — merah tunggal tetap `verify:quizkeys` 60/66 (criteria B126/B127 di tepi) |
| `audit` A9 | 166 marker (B127) | 174 marker, 0 TEMUAN |

## 3. Yang belum

C2 (dashboard Penerbit + aksi anggota yang diterima server dengan tanda tangan anggota bila `can_hire`/`can_appoint`) dan C3
(dashboard Agent Owner + agen ERC-8004 baru untuk akun builder) — masing-masing menunggu acc builder. Login sungguhan (AC-B128#8).
Ditemukan saat menambah baris README: tabel bukti README belum memuat `verify:records` (B124) dan `verify:paywall` (B125) —
tidak dikerjakan di B128. Ditemukan dan ditutup saat menutup gerbang: pola lima harness pertama `sync:numbers` hanya cocok
dengan "HIJAU", sehingga run merah tercatat "tidak berjalan" alih-alih jumlah gagalnya (kini HIJAU atau MERAH).
