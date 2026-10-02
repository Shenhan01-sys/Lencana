---
tags: [testing, "T6"]
command: npm run x402
measured: 2026-09-28
result: 20 checks / 0 failed
---

# T6 - `npm run x402` (paid verification path)

**Hub:** [[09-Testing/00 - Hub Testing]] · **AC:** kriteria P3 di [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Bagian:** [[04-Signer-Service/S6 - x402 paid verification]]

**Perintah:** `cd signer && npm run x402` — butuh `npm run serve` hidup di terminal lain.
**Terakhir dijalankan:** 28 Sep 2026 · **20 pemeriksaan / 0 gagal** · token demo 6-desimal yang baru.

Yang dibuktikan, dan kenapa ini bukan sekadar "semua baris hijau":

| # | klaim | bukti yang dibaca |
|---|---|---|
| 1 | syarat pembayaran berasal dari server, bukan dari dokumentasi kami | `/healthz` -> `priceAtomic 1000`, `network eip155:97`, token + split + payee |
| 2-3 | tanpa pembayaran: `402` dengan `accepts[]` skema `exact`, `payTo` = kontrak pembagian, `www-authenticate` ikut dikirim | respons nyata |
| 4 | dengan `X-PAYMENT`: `200` dan **uangnya sampai di chain** | `settleTx 0x8d9ee3e6…`, `splitTx 0x7496ff54…`, selisih saldo pembacaan `balanceOf` |
| 5 | pembagian tepat sebesar harga, split tidak menahan sisa | `100 (platform) + 900 (penerbit) = 1000`, sisa kontrak `0` |
| 6 | satu pembayaran melayani 2 verifikasi dengan verdict BERBEDA | `served 2`, hanya SATU settlement (`0x48b9c7cf…`) |

## Yang berubah 28 Sep, dan ini bagian penting

Test ini **sebelumnya bergantung pada satu langkah manual di luar dirinya sendiri**: saldo klien demo
datang dari `mint()` yang dilakukan pada sesi 24 Sep terhadap token lama. Karena itu ia hijau
"di mesin itu" dan pecah total begitu `DEMO_TOKEN_ADDRESS` berganti — Permit2 menjawab
`TransferFromFailed()` tanpa alasan karena yang gagal adalah transfer di sisi token. Sekarang test
membiayai dirinya sendiri (`mint` 3x harga lewat `DEPLOYER_PRIVATE_KEY`, lalu `waitForTransactionReceipt`):
tx `0x843650be…` pada run ini.

**Aturan yang lahir dari sini:** harness yang butuh langkah manual bukan harness — ia hanya terlihat
seperti bukti sampai konfigurasi berubah.

**Lihat juga:** [[04-Signer-Service/S6 - x402 paid verification]] · [[02-Contracts/C4 - DemoCourseToken and the x402 interface]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
