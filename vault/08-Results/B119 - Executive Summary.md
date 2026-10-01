---
tags: [results, executive-summary, B119]
status: active
updated: 2026-10-01
---

# B119 - Executive Summary — penerbit menyewa agen penilai per aktivitas

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B119 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B119 - Sewa agen per aktivitas]] · **Testing:** [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]]

## 1. Apa yang diubah

- **Model peran (D54, opsi B):** penerbit tetap penanda tangan dan pencabut kredensial; agen penilai milik
  *Agent Owner* hanya menilai dan dibayar per aktivitas. Dompet agen #2534 dipindah dari kunci penerbit ke
  kunci operasional agen (koreksi atas B118 pagi hari yang sama).
- **Tarif dasar** ditulis Agent Owner sebagai metadata identitasnya di registry ERC-8004 BNB
  (`lencana.baseTariff`); **tangga harga** Lencana +5% per tingkat untuk tujuh label (`signer/src/pricing.js`).
- **Rute:** `GET /agents/<id>/rates`, `POST /agents/hire`, penilaian agen di `POST /essay/judgement`
  (`agentId`), `GET /agent-charges/<id>`, `POST /agent-charges/<id>/pay` (x402).
- **Skema:** migrasi `0010_agent_hires_and_charges.sql` — `agent_hires`, `agent_charges`, kolom agen + label.
- **Gerbang penerbit dibalik:** `npm run admit` menerima kunci penerbit dan menolak kunci agen.

## 2. Hasil vs KPI

| KPI | hasil 1 Okt |
|---|---|
| harness tanpa gas | `npm run verify:agents` **34/0** (bagian B119 22/22) |
| harness dengan uang | `npm run verify:agents:live` **40/0** (bagian B119 25/25) |
| harga `cukup-berat` dari tarif 2000 | **2400** |
| bayar ke dompet agen | +**2160** (90%) dibaca dari chain; platform 10% |
| identitas di model baru | `npm run verify:agent` **24/0** |
| regresi | `verify:db` 70/0 · `verify:attempts` 38/0 · run penuh `sync:numbers` hijau |

## 3. Status

**SELESAI** untuk sisi core (rute, skema, registry, pembayaran). **BLOCKED** untuk UI penerbit (FE, ditunda).

## 4. Risiko tersisa

- Agen memilih label dan dibayar menurut label itu — dibatasi selisih kecil (maks +30%) dan tanda tangan, tidak dihilangkan.
- Pembayaran diselesaikan di chain sebelum tagihan ditandai lunas; kegagalan di antaranya dilaporkan 409 dengan hash settlement.
- Ketiga peran (penerbit, Agent Owner, platform) masih dijalankan tim Lencana di satu mesin.
- Token demo, testnet.

## 5. Bukti

- Transaksi registry (1 Okt): `setAgentWallet` #2534 → `0xFd26…0094` `0x4db6b54d00fcc0fe816f724b6b158b8a41acaea1f42e70545201b82032058e63`;
  `setAgentURI` `0xfbe66d62e31cec3f750c7a15057f564cd5d02658f1b5e9ec7b52ad3537e99f8a`;
  `setMetadata(lencana.baseTariff=2000)` `0x3af8f1f092392853a816e1bc4b053c620fc7ec82f548381f7da02fb9b5e6178c`.
- Pembayaran (run terakhir, 40/0): settle `0x12b9fbc9e6f25c7bb2376ffd6e86bcd38c81ba710d79dd146abec0b9732ac188`, split `0xce299bd2b2a5795a214dd8f50fbbfc03b5f3949b97faa454f4424d172491eea2`. Run pertama (38/0): settle `0xa50cec96d8b5514cf8122e9b018148c48b98c170c54008f1de2b5076de72c3a4`, split `0x5b0b72eabc944448a8a334360b32c9232ecb80003146029de3cf1989b14092d3`.
- Commit: lihat riwayat `git log` dengan pesan "B119 dan B120 ditutup".
