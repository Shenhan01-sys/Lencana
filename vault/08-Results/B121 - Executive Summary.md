---
tags: [results, executive-summary, B121]
status: active
updated: 2026-10-01
---

# B121 - Executive Summary — slot praktik dinilai dari chain

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B121 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B121 - Praktik dinilai chain]] · **Testing:** [[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]]

## 1. Apa yang diubah

- **`POST /praktik`** (`signer/src/praktik.js`, `signer/src/server.js`): peserta mengirim apa yang ia
  kerjakan/baca di chain; server membaca ulang chain 97 dan menyimpan usaha praktik hanya kalau semuanya
  cocok. Empat jenis bukti, ditulis penerbit di `lesson.proof`: saldo dompet, transfer (blok, waktu blok,
  gas, selisih saldo termasuk biaya), keluaran `eth_call`, dan `balanceOf` + `allowance`.
- **Migrasi 0011**: tabel `praktik_proofs` dengan kunci bukti unik (satu transaksi/dompet = satu peserta),
  dan `graded_by='chain'` sebagai nilai baru di komponen usaha.
- **`POST /attempts` menolak skor kuis, esai, dan praktik** dari peserta. Yang ditemukan sambil
  mengerjakan: rute itu masih menerima angka kuis dan esai juga, dan `fromAttempts` memakainya — kalimat
  "angka tidak diterima dari klien" di B81 tidak benar untuk jalur ini sampai hari ini (koreksi terlihat
  di baris B81).
- **`fromAttempts`** hanya mengisi slot praktik dari komponen yang dinilai chain.
- Sampingan yang ditemukan karena membuat harness merah palsu: `signer/src/ports.js` — delapan harness
  kini mencari port dengan uji bind, bukan dengan `/healthz` yang bisa lambat.

## 2. Hasil vs KPI

| KPI | hasil 1 Okt |
|---|---|
| `npm run verify:praktik` (tanpa gas) | **32/0** |
| `npm run verify:praktik:live` (satu transfer 0,001 tBNB baru) | **32/0** |
| `npm run verify:attempts` (hitung-saja) | **39/0** (38 → 39: fixture laporan peserta tidak mengisi slot) |
| `npm run verify:attempts:live` | 73 / 4 gagal — keempatnya hilir dari crash `publish:edge` (exit 134) **sesudah** kertas terbit; `publish:edge` diulang **74/75** (deviasi lama), bagian h diulang **16/16** |
| `npm run verify:db` | **70/0** (`/attempts` kind `ujian` tetap jalan) |
| kertas yang terbit dengan praktik dinilai chain | `0x372c2518…`, dokumen hasil di tepi: 3 komponen praktik `gradedBy chain` |

## 3. Status

**SELESAI untuk core; baris B121 tetap TERBUKA.** Yang belum: halaman belajar memanggil `POST /praktik`
(fase FE — OI-20). **BLOCKED (keputusan builder)**: memasukkan aturan bukti ke `rubricHash` (D55).

## 4. Risiko tersisa

- Bukti `eth-call` sama untuk semua peserta, jadi bisa disalin — membuktikan "bisa membaca kontrak",
  bukan "mengerjakan sendiri". Tiga jenis lain diikat ke dompet yang menandatangani.
- Satu orang dengan dua alamat peserta bisa menandatangani untuk keduanya; kunci bukti hanya mencegah
  satu dompet/transaksi dipakai dua kali.
- 6 baris praktik `origin=demo` dari jalur lama tidak lagi mengisi slot kalau kertas diterbitkan ulang
  dari rekaman itu; kertas yang sudah terbit tidak berubah.
- Sebab crash `publish:edge` exit 134 belum diketahui; tidak terulang saat dijalankan langsung.

## 5. Bukti

- Transfer uji (dompet latihan = deployer `0xAEc6…8361`): `0xea4617d3c258cf5b13063fba1e878daab3b25c505625cc794006f38f19414845`
  (0,001 tBNB, gas 21000, blok 134188461).
- Kertas: `0x372c2518a3bd7aa19ffe45b1e3f6c23b9abe06d172c7574547057159112efd38`, peserta uji
  `0xAbCA6C091e0797DB920dC744F904d260C3dEED2d` (enrollment ditandai `origin=demo`, aturan B104).
- Hash kebijakan tidak bergeser: `web3-dasar-2026` rubric `0x2a45d0d0…7fc8`, manifest `0xadbb8f85…71a1`;
  `web3-lanjut-2026` rubric `0xc608de2a…f76d`, manifest `0x8d059344…41ee` — semuanya sama dengan HEAD.
