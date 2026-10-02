---
tags: [results, executive-summary, B132]
status: active
updated: 2026-10-03
---

# B132 - Executive Summary — robot agen rakitan, rupa di chain, agen didaftarkan sendiri (D68)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B132 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B132 - Robot agen rakitan, rupa di chain, agen didaftarkan sendiri]] ·
**Testing:** [[09-Testing/T60 - signer studio-check.js (B132 robot agen)]] · [[09-Testing/T61 - Uji on-chain dan peramban bengkel agen (B132)]] ·
**Keputusan:** D68

## 1. Apa yang diubah

- **Agen sebagai robot, bukan tumpukan kartu.** Dasbor Agent Owner kini dibuka dengan bengkel agen: robot penilai berdiri di balik
  meja. Data agen dibaca dari bentuknya:
  - mata menyala = dompet agen terverifikasi;
  - lampu antena = bisa disewa;
  - pelat dada = tarif dasar;
  - tumpukan kertas = penilaian;
  - toples = bayaran lunas;
  - papan nama di meja = kursus tempat ia bekerja.

  Rincian lama (identitas NFT, slot dompet, tangga tarif, pekerjaan, bayaran) tetap di bawahnya.
- **Pemilik bebas merakit.** Panel rakit (‹ › per kepala, mata, badan, alat; warna; nama) mengubah robot seketika. Tombol
  "Simpan rupa ke BNB Chain" menulis rupa itu ke berkas registrasi ERC-8004 agen dari dompet pemilik (`setAgentURI`): `name`,
  gambar SVG, dan `lencana:avatar`. Berkas itu tetap menunjuk balik dan tetap memuat kalimat peran yang benar. Siapa pun yang
  membaca registry melihat robot yang sama.
- **Agen pertama didaftarkan sendiri.** Akun yang memilih Agent Owner merakit robot dulu, lalu mendaftarkannya dari dompetnya:
  1. gas uji dari platform bila menipis;
  2. `register()`, sehingga dompet agen langsung dompet pemilik;
  3. platform membaca struk di chain;
  4. rupa disimpan;
  5. tarif ditetapkan.

  Platform mengenal agen itu hanya dari struk, bukan dari kata halaman.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| bentuk agen di dasbor | kartu identitas + kartu-kartu angka | robot dengan data di bentuknya + panel rakit |
| rupa agen | tidak ada | di berkas registrasi ERC-8004 (chain), ditulis pemilik |
| akun mendapat agen | dicetak platform lewat CLI | dicetak platform **atau** didaftarkan sendiri dari halaman |
| agen didaftarkan sendiri di chain 97 | — | **#2548** (akun uji, T61): `register` `0xb9cc49dc…` + rupa + tarif, rupa diganti sekali lagi |
| `verify:studio` | — | 28/0 |
| `verify:owner` | 32/0 | 32/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 794.68 kB (B133) | 812.72 kB |
| baterai `sync:numbers` | 29 harness · 27 hijau (B133) | 30 harness · 28 hijau — dua merah tetap data tepi basi, disembuhkan `publish:edge` oleh builder |

## 3. Yang belum

- Robot belum menilai apa pun: penilaian agen ditandatangani dompet agen dan belum ada layarnya.
- Akun dummy 2 builder belum merakit robot untuk #2547 dari dompet Privy (AC-B132#8).
- Robot belum tampil di halaman lain (misalnya formulir sewa di dasbor Penerbit).
