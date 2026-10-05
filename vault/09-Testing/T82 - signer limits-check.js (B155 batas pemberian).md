---
tags: [testing, "T82"]
status: active
updated: 2026-10-05
command: npm run verify:limits
measured: 2026-10-05
result: BATAS PEMBERIAN HIJAU — 23 pemeriksaan / 0 gagal (5 Okt, B155; uji negatif 23 / 1)
---

# T82 - signer limits-check.js — B155: batas pemberian dari dompet deployer

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B155 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Asal temuan:** [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]] (signer jadi publik) ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B155 - Batas faucet dan gas]] · **Summary:** [[08-Results/B155 - Executive Summary]]

`signer/scripts/limits-check.js`, dijalankan `npm run verify:limits` (di `signer/`), ikut baterai murah `npm run sync:numbers`.
Prasyarat: `DEPLOYER_PRIVATE_KEY`, `DEMO_TOKEN_ADDRESS`, `RPC_URL`, `SUPABASE_URL` + secret key (dari `app/.env`). Tanpa gas:
satu-satunya permintaan faucet ditolak batasnya sebelum ada koin yang dicetak.

| bagian | yang dibuktikan |
|---|---|
| 1 — pembatas, jam tiruan | dua pemberian pertama per IP lolos, ketiga ditolak "per-IP limit reached"; `retryAt` = pemberian tertua + 24 jam; IP lain tidak terkena; kuota global habis → IP baru pun ditolak "daily quota reached"; slot yang dilepas (pemberian gagal) kembali; `snapshot` hanya angka; sesudah 24 jam jendelanya kosong; batas 0 menolak sejak awal |
| 2 — IP klien | entri pertama `X-Forwarded-For` dipakai bila `TRUST_FORWARDED=1` atau berjalan di Railway (`RAILWAY_ENVIRONMENT`); tanpa proxy tepercaya header karangan klien diabaikan dan alamat soket dipakai; header kosong → alamat soket |
| 3 — batas dari lingkungan | bawaan faucet 3/IP + 200/hari dan gas 2/IP + 30/hari; nilai yang sah dipakai (termasuk 0); nilai tidak sah (-1, "banyak") → bawaan |
| 4 — server sungguhan | port bebas, `LANCENA_ORIGIN=test`, `TRUST_FORWARDED=1`, `FAUCET_PER_IP_DAY=0`, `GAS_GLOBAL_DAY=7`: `POST /faucet` bertanda tangan palsu → **429** "per-IP limit reached" dengan `retryAt` (bukan 401 — batas dicek sebelum tanda tangan dipakai, tidak ada mint); `/healthz` → alamat deployer = alamat kunci deployer, saldo wei terbaca dari chain, kuota faucet (0 / 200 / 0 diberikan) dan gas (2 / 7) sesuai lingkungan server, tanpa IP pengunjung |

Jalur kiriman gas (`POST /owner/gas`) baru mencapai batasnya sesudah akun Agent Owner yang sah dengan saldo rendah — di
harness ini ia diadili lewat modul yang sama (`LIMITS.gas` = `createLimiter`) dan angka kuotanya di `/healthz`, bukan lewat
kiriman sungguhan.

## Hasil (5 Okt)

```
BATAS PEMBERIAN HIJAU — 23 pemeriksaan, 0 gagal
```

**Uji negatif (aturan vault #14):** pengecekan batas di `/faucet` diganti slot yang selalu lolos, lalu harness dijalankan →
**BATAS PEMBERIAN MERAH — 23 pemeriksaan, 1 gagal**: `POST /faucet` dijawab 401 (tanda tangan diperiksa) alih-alih 429.
Dikembalikan → **23 / 0**.

## Di signer cloud (5 Okt)

Didorong `f28ac21..729dad4`; workflow `deploy-signer` run `37259823357` sukses → deployment Railway `3778fdeb`. `GET /healthz`
di `https://signer-production-e4f2.up.railway.app` (proses mulai 03:34:06Z): `deployer` = `0xAEc63F6cEbBfacdC3516992b6ec396147c9c8361`,
saldo **0,3755 tBNB**; `limits.faucet` = 3/IP, 200/hari, 0 diberikan; `limits.gas` = 2/IP, 30/hari, 0 diberikan; tidak ada IP.

## Batas

- Penghitung hidup di memori satu proses; deploy ulang mengosongkannya. Pengunjung tidak bisa memicu deploy.
- Kepercayaan pada `X-Forwarded-For` bergantung pada perilaku tepi Railway (nilai dari klien dibuang); di belakang proxy lain
  yang hanya menambahkan entri, entri pertama bisa dikarang — jangan pasang `TRUST_FORWARDED=1` di sana.
