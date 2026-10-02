---
tags: [testing, "T36"]
status: active
updated: 2026-10-01
command: npm run verify:agents · npm run verify:agents:live
measured: 2026-10-01
result: AGEN SEWA HIJAU — 34 pemeriksaan / 0 gagal (tanpa gas; B119 22/22 + B120 12/12) · AGEN SEWA LIVE HIJAU — 40 / 0 (B119 25/25 + B120 15/15, dua pembayaran x402 nyata)
---

# T36 - signer agents-check.js — B119: penerbit menyewa agen penilai per aktivitas penilaian

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B119 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B119 - Sewa agen per aktivitas]] · **Summary:** [[08-Results/B119 - Executive Summary]] ·
**Keputusan:** D53, D54 di [[00-Overview/03 - Decisions]] · **Pasangan:** [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]] (harness yang sama, bagian B120)

## Yang diuji

Model D54: **penerbit tetap attester**; agen penilai (identitas ERC-8004 #2534 milik *Agent Owner*) menilai
esai, **memilih label tingkat berat sendiri** di pesan yang ia tandatangani, dan **dibayar per aktivitas**.
Harga = tarif dasar Agent Owner (metadata `lencana.baseTariff` di registry) × tangga Lencana (+5% per tingkat).

| peran | alamat (chain 97) | sumber |
|---|---|---|
| penerbit = attester (penyewa, pembayar) | `0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE` | `ISSUER_ADDRESS`, `PAY_PAYEE` |
| agen penilai #2534 — `agentWallet` (penanda tangan penilaian, penerima bayaran) | `0xFd26Fb1fDdaEB8e9A08ba317586Ca0b3Cc480094` | `getMetadata(2534, "agentWallet")` |
| Agent Owner #2534 (pemilik NFT identitas, penulis tarif) | `0x067cb80aA2b82E6a31De974E0f67D044F3ca0c4f` | `ownerOf(2534)` |
| IdentityRegistry ERC-8004 BNB | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | dideploy BNB, bukan kita |
| kontrak pembagian x402 | `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE` | `SettlementSplit`, `platformBps` 1000 |

## Lapis 1 — unit (logika murni, `signer/src/pricing.js`)

| pemeriksaan | hasil |
|---|---|
| tangga tujuh label dari tarif 2000 → `2000,2100,2200,2300,2400,2500,2600` | ok |
| "sangat berat" = 1,30 × "sangat ringan" | ok |
| label di luar tujuh label ditolak | ok |
| `LADDER_HASH` = keccak256 dokumen tangga yang sama | ok |

## Lapis 2 — integrasi (HTTP + Postgres nyata + registry di chain 97)

```
  ok    [B119] GET /agents/2534/rates -> tarif dasar = metadata lencana.baseTariff di registry (2000)
  ok    [B119] tabel harga = tangga Lencana atas tarif itu, dengan ladderHash
  ok    [B119] agen yang tidak ada -> 404
  ok    [B119] sewa oleh alamat selain penerbit -> 401
  ok    [B119] pesan sewa yang tidak menyebut agent= -> 401
  ok    [B119] penerbit menyewa agen penilai #2534 untuk web3-dasar-2026 -> 200, dompet & pemilik dibaca dari registry
  ok    [B119] peserta uji menyerahkan esai -> 201, menunggu penilaian
  ok    [B119] penilaian atas nama agen #2534 bertanda tangan kunci lain -> 401
  ok    [B119] agen #2542 yang TIDAK disewa sebagai penilai kursus ini -> 403
  ok    [B119] penilaian agen tanpa label tingkat berat -> 401 (label wajib dipilih agen dan ditandatangani)
  ok    [B119] label di luar tujuh label -> 401
  ok    [B119] pesan yang menyebut angka akhir berbeda dari kriteria yang dikirim -> 401
  ok    [B119] agen penilai #2534 menilai -> 200, usulan 80, label cukup-berat, needsReview
  ok    [B119] tagihan aktivitas menilai: 2400 = tarif 2000 x 1,20 (cukup-berat), status due, ke dompet agen
  ok    [B119] angka agen belum dihitung gerbang (usulan model, menunggu pengesahan — B104)
  ok    [B119] baris usaha mencatat agen pengusul (graded_by_agent) dan label pilihannya
  ok    [B119] GET /agent-charges/<id> menyajikan tagihan yang sama
  ok    [B119] POST /agent-charges/<id>/pay tanpa X-PAYMENT -> 402 + syarat (jumlah tagihan, token, kontrak pembagian)
```

**Artefak uji dan kebersihannya.** Peserta uji dibuat acak per run; enrollment, usaha, dan tagihannya
ber-`origin=test` dan ikut terhapus `npm run cleanup -- --apply` (tagihan menempel ke `attempts` dengan
`on delete cascade`). Sewa agen #2534 untuk `web3-dasar-2026` dan penunjukan reviewer #2542 **bukan**
artefak uji — itu konfigurasi sungguhan penerbit demo, dan sengaja tidak dihapus.

## Lapis 3 — dengan uang sungguhan (`--live`, chain 97)

```
  info  bayar tagihan menilai #17: 0x12b9fbc9e6f25c7bb2376ffd6e86bcd38c81ba710d79dd146abec0b9732ac188 · split 0xce299bd2b2a5795a214dd8f50fbbfc03b5f3949b97faa454f4424d172491eea2
  ok    [B119] penerbit membayar tagihan menilai lewat x402 -> 200, status paid dengan struk settlement
  ok    [B119] dompet agen menilai bertambah tepat bagiannya (2160 = tagihan - bagian platform 1000 bps), dibaca dari chain
  ok    [B119] tagihan menilai yang sudah lunas tidak bisa dibayar dua kali -> 409
  B119 25/25 · B120 15/15
AGEN SEWA LIVE HIJAU — 40 pemeriksaan, 0 gagal
```

Run live pertama hari yang sama (38/0, sebelum dua pemeriksaan B120 arah-sebaliknya ditambahkan — T37):
mint token demo untuk penerbit `0xca2f4b1dd5157108da40c2f2ee80623522afe8d137023dfdd9c392239668ff97`, bayar
tagihan #9 `0xa50cec96d8b5514cf8122e9b018148c48b98c170c54008f1de2b5076de72c3a4`, split
`0x5b0b72eabc944448a8a334360b32c9232ecb80003146029de3cf1989b14092d3`. Bagian B119-nya sama: 25/25.

Penerbit tidak memegang BNB dan tidak mengirim transaksi: ia menandatangani izin token + perintah
transfer (x402 `exact`), dan platform sebagai fasilitator yang membayar gas. Uang masuk kontrak
pembagian lalu dibagi: 90% ke **dompet agen** (`agentWallet` di registry), 10% ke platform.

## E2E — panduan untuk builder (centang sendiri)

- [ ] `cd app/signer && npm run agent:identity` — terbaca: agen #2534, pemilik `0x067c…0c4f`, dompet `0xFd26…0094`, tarif dasar 2000
- [ ] buka `GET http://127.0.0.1:8787/agents/2534/rates` (sesudah `npm run serve`) — tujuh harga 2000 … 2600
- [ ] `npm run verify:agents` → baris terakhir `AGEN SEWA HIJAU — 34 pemeriksaan, 0 gagal`
- [ ] (opsional, memakai gas testnet) `npm run verify:agents:live` → `AGEN SEWA LIVE HIJAU — 40 pemeriksaan, 0 gagal`
- [ ] buka tx bayar di BscScan testnet dan cek penerimanya kontrak pembagian `0xcB00…1bBE`

| KPI (dari AC) | target | hasil 1 Okt |
|---|---|---|
| tarif dasar dibaca dari registry, bukan dikarang | = metadata `lencana.baseTariff` | 2000 / 1500 dari chain |
| label dipilih dan ditandatangani agen | label wajib ada di pesan bertanda tangan | penilaian tanpa label → 401 |
| harga = tarif × (1 + 5% × tingkat) | 2400 untuk `cukup-berat` | 2400 |
| bayar ke dompet agen lewat x402 | dompet agen +90% tagihan | +2160 atas 2400 |
| tidak bisa dibayar dua kali | 409 | 409 |

## Satu kesalahan harness yang tertangkap sebelum angka dicatat

Run pertama mencetak **16 gagal**. Sebabnya bukan produk: fungsi pembantu `hireBy` membuat pesan sewa
**dua kali** (dua nonce acak) — yang ditandatangani bukan yang dikirim — jadi penerbit sah ditolak 401, dan
semua langkah sesudahnya ikut gagal. Satu lagi sesudah itu: perbandingan jumlah tagihan memakai `===`
antara angka dan string. Keduanya dibetulkan di harness; angka di atas dari run sesudahnya.

## Batas

- Label dipilih agen yang juga dibayar — konflik kepentingan yang **dibatasi**, bukan dihilangkan: selisih
  maksimum +30%, label ditandatangani dan tercatat di usaha + tagihan.
- Siapa pun boleh membayar tagihan (tidak harus penerbit yang menyewa); tagihan lunas tetap lunas.
- Pembayaran diselesaikan di chain **sebelum** baris tagihan ditandai lunas; kalau penandaan gagal sesudah
  settlement, rute melaporkan 409 dengan hash settlement-nya — uang sudah pindah, catatannya yang tertinggal.
- Belum ada UI untuk penerbit menyewa atau membayar; semua lewat rute HTTP. *(Koreksi 2 Okt, B129: anggota penerbit kini menyewa agen penilai
  dan menunjuk agen pengesah dari dasbor `#/app/pub` dengan tanda tangannya sendiri — [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]].
  Membayar tagihan agen tetap tanpa UI.)*
- Token demo ber-`mint` terbuka; bukan uang sungguhan.
