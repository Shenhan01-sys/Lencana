---
tags: [slides, deck, B175]
slide: 9
---

# 09 - Money On Chain

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/08 - Verify From One Link]] · **Berikutnya:** [[13-SubmissionDocs/Slides/10 - Proof It Runs]]

**Tujuan:** model bisnis yang terlihat bergerak: uang mengalir di chain, bagian platform tidak bisa naik.

## Di layar (teks persis)

- Judul: **Every payment, *on-chain*.**
- Tiga aliran uang (label di kabel):
  1. **Course payment** — learner signs → `SettlementSplit` → **90% publisher** · **10% Lencana**
     (`platformBps = 1000`, read from the contract · capped at 25% · **can only go down**)
  2. **Verification for machines** — `POST /verify` answers **402**; caller signs two EIP-712 payloads, **zero transactions**;
     sold **in batches** (up to 25 reports per payment)
  3. **Grading agents** — hired per job: the Agent Owner's tariff + 5% per difficulty level
- Kotak ekonomi unit (mono kecil): `one settlement + split = 190,659 gas → at a $0.001 fee, break-even BNB price ≈ $5.24 → so we sell batches`
- Tag: `live testnet data · 7 Oct 2026 · test token`

## Visual (benda inti)

Kabel bercahaya dari **koin peserta** ke node **SettlementSplit**; di node koin **terbelah** dua: bagian besar meluncur ke
penerbit, bagian kecil ke Lencana (dua tabung terisi, 90 vs 10). Di belakang, **sabuk Admin asli bergerak**
(`admin-belt.mp4`, angka nyata: 8 courses · 13 enrollments · 27 LDC-demo gross) dan halaman **Revenue** (`pub-revenue.png`)
dengan cincin di *Where the money goes* dan *Paid enrollments* (`focus.json`: `revenueMoney`, `revenueTx`).

## Gerak

- **Terus (inti FE Doctrine §3):** koin berjalan di kabel tanpa henti, memantul di node, **terhisap** ke tabung; tabung
  bergoyang saat terisi.
- **Micro-beat:** angka `platformBps 1000` *slam* lalu panah turun kecil ("only lowerable") berkedip sekali.

## Catatan pembicara (±25 dtk)

> Behind it, one transparent pipeline. A learner pays by signing; the contract splits the payment — ninety percent to the
> publisher, ten to us, and our share can only go down. Machines buy verification over HTTP 402, in batches, because one
> settlement costs about 190 thousand gas. And publishers hire grading agents per job. Every payment settles on-chain.

## Sumber

`platformBps() = 1000` dibaca dari chain 7 Okt lewat `POST /admin/overview` (T97 §4); `MAX_BPS = 2500`, hanya turun
(`contracts/SettlementSplit.sol`); 190.659 gas = 114.728 + 75.931 (`README.md:55`, `signer/src/server.js:230`); titik
impas ≈ $5,24 per BNB pada 0,1 gwei + bagian 10% ([[00-Overview/10 - Project Detail (long form)]]); batch 25 (`BATCH_MAX`);
sewa agen B119 (+5%/tingkat); angka Admin = `src/data/admin-summary.json` 7 Okt. "Kami sendiri fasilitator x402" (Cheat-Sheet)
— jangan tulis "verifikasi berbayar dipakai orang". Aset: video 1:25–1:33.
