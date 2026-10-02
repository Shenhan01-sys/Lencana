---
tags: [results, executive-summary, B131]
status: active
updated: 2026-10-03
---

# B131 - Executive Summary — satu akun nyata = satu peran (D66)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B131 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B131 - Satu akun satu peran, akun dev]] ·
**Testing:** [[09-Testing/T56 - signer account-check.js (B131 satu akun satu peran)]] · [[09-Testing/T57 - Uji peramban satu akun satu peran (B131)]] ·
**Keputusan:** D66

## 1. Apa yang diubah

- **Peran dipilih sekali.** Onboarding menawarkan Peserta, Penerbit, dan Agent Owner. Pilihan ditandatangani akun
  (`POST /me/role`), tersimpan di `account_roles` (migrasi 0016), dan tidak bisa diganti. Tombolnya butuh dua klik karena
  pilihan itu final.
  - Memilih **Penerbit** sekaligus mengajukan keanggotaan; kursinya tetap lahir dari persetujuan kunci penerbit.
  - Memilih **Agent Owner** tidak memberi agen; kursinya terbuka saat dompet akun memiliki identitas ERC-8004.
- **Akun lama tidak perlu memilih.** Akun yang sudah belajar adalah Peserta. Kunci penerbit adalah Penerbit. Anggota penerbit
  adalah Penerbit. Pemilik agen adalah Agent Owner. Urutannya satu, di `signer/src/account.js`, dipakai server dan CLI.
- **Server menolak aksi peran lain.** Akun Penerbit atau Agent Owner tidak bisa mendaftar kelas, membayar, atau meminta koin uji.
  Akun Peserta tidak bisa mengajukan anggota atau membuka dasbor penerbit atau Agent Owner. Kunci penerbit tidak bisa memberi
  keanggotaan, dan platform tidak bisa mencetak agen, untuk akun yang berperan lain.
- **Pemilih kursi hanya untuk akun dev.** Dua akun dummy builder ditandai lewat CLI platform (`npm run account:dev`). Akun dev
  memegang semua kursi yang diberikan faktanya dan melihat pemilih kursi bertanda "akun dev". Akun lain dikirim ke dasbor perannya
  sendiri.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| kursi yang bisa dipegang satu akun nyata | semua yang diberikan fakta (peserta selalu + penerbit + Agent Owner) | satu |
| pemilih kursi | setiap akun dengan lebih dari satu kursi | hanya akun dev (2 akun dummy builder) |
| aksi peran lain ditolak server | tidak | ya (rute peserta, penerbit, Agent Owner, hibah, cetak agen) |
| `verify:account` | — | 50/0 |
| `verify:publisher` | 53/0 | 57/0 (+2 tanda dev sementara kunci tim, +1 peran pemohon, +1 bersih-bersih `account_roles`) |
| `verify:roles` · `verify:owner` | 39/0 · 32/0 | 39/0 · 32/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 750.20 kB (B130) | 759.51 kB |
| baterai `sync:numbers` | 27 harness · 26 hijau (B130) | 28 harness · 26 hijau — dua merah karena data tepi basi (`verify:edge` umur 30,3 jam, `verify:quizkeys` 60/66), disembuhkan `publish:edge` oleh builder |

## 3. Yang belum

Login sungguhan builder: akun dummy 1 dan 2 berpindah kursi, dan akun email baru memilih satu peran (AC-B131#7). Akun Privy ketiga
`0x5d93…80C2` (login 2 Okt) belum ditandai dev. Akun Agent Owner yang baru memilih belum bisa mencetak agennya sendiri: itu B132.
Penerbit belum bisa menyusun kursus: itu B133.
