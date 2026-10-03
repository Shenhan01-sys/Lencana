---
tags: [testing, "T66"]
status: active
updated: 2026-10-03
command: npm run verify:history
measured: 2026-10-03
result: RIWAYAT CHAIN HIJAU — 10 pemeriksaan / 0 gagal (3 Okt, B136; run pertama 10 / 0 hijau)
---

# T66 - signer history-check.js — B136: riwayat chain dengan RPC cadangan

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B136 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Harness yang pulih:** [[09-Testing/T60 - signer studio-check.js (B132 robot agen)]] ·
[[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]]

`signer/scripts/history-check.js`, dijalankan `npm run verify:history` (di `signer/`). Prasyarat bagian B: `RPC_URL`. **Baca saja** —
tanpa gas, tanpa kunci, tanpa database.

| bagian | yang dibuktikan |
|---|---|
| A — `signer/src/chain-history.js` dengan klien tiruan | urutan RPC: utama → `RPC_HISTORY_URLS` (bila diisi) → bawaan per chain, tanpa duplikat; utama tidak menemukan → cadangan menemukan (`fallback: true`, nama host ikut); cadangan di chain lain diabaikan; semua tidak menemukan → `missing`; semua galat jaringan → `unreachable` dengan sebabnya; galat jaringan di utama + cadangan menemukan → ok; utama menemukan → cadangan tidak dipanggil |
| B — chain 97 sungguhan | struk `register()` #2546 (blok 134430227, dipakai `verify:studio`) dan struk transfer KNOWN_TX (blok 134188461, dipakai `verify:praktik`) — keduanya "tidak ditemukan" publicnode siang itu — terbaca lengkap (struk + transaksi + blok, status success) |

## Hasil (3 Okt sore)

```
register() agen #2546: struk dari bsc-testnet-dataseed.bnbchain.org (cadangan), transaksi dari bsc-testnet.publicnode.com
transfer KNOWN_TX:     struk dari bsc-testnet-dataseed.bnbchain.org (cadangan), transaksi dari bsc-testnet.publicnode.com
RIWAYAT CHAIN HIJAU — 10 pemeriksaan, 0 gagal
```

**Temuan yang dicatat dari run ini:** publicnode masih menyajikan TRANSAKSI lama (`eth_getTransactionByHash`), yang hilang hanya
STRUKNYA (`eth_getTransactionReceipt`). Pemilihan cadangan diukur sebelum ditulis: empat RPC resmi BNB Chain testnet
(`bsc-testnet-dataseed`, `bsc-testnet`, `data-seed-prebsc-1-s1`, `data-seed-prebsc-2-s1`) menemukan kedua struk, chainId `0x61`;
`bsc-testnet-dataseed` dan `data-seed-prebsc-1-s1` dipakai sebagai bawaan (`DEFAULT_HISTORY_RPCS`), bisa diganti `RPC_HISTORY_URLS`.

**Sesudah perbaikan, hari yang sama (dijalankan sendirian, berurutan):** `verify:studio` **28 / 0** (klaim struk #2546 oleh akun lain →
403 lagi, bukan 400) dan `verify:praktik` **32 / 0** ("struk KNOWN_TX dibaca dari bsc-testnet-dataseed.bnbchain.org (RPC cadangan)").

**Gerbang 3 Okt (baterai selesai 18:25 WIB):** **33 harness · 31 hijau** — `verify:studio` 28/0, `verify:praktik` 32/0, `verify:history`
10/0; dua merah yang tersisa = data tepi basi (`verify:edge` umur state, `verify:quizkeys` 60/66 → `npm run publish:edge` oleh builder).
`sync:numbers --verify` **62 klaim, 5 merah** (semuanya sumber edge/quizkeys; sebelum B136: 9); `audit` A9 249 marker cocok dua arah,
A10 24 klaim, 1 BEDA (`verify:edge`); `check:labels` 8/0.

**Batas klaim:** jalur 503 ("RPC tidak terbaca") hanya dibuktikan di bagian A (klien tiruan) — kegagalan jaringan sungguhan tidak
dibuat-buat. Keadaan sekarang (`ownerOf`, saldo, izin) tetap dibaca dari `RPC_URL` saja.
