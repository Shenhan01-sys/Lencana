---
tags: [testing, "T92"]
status: active
updated: 2026-10-06
command: cd signer && npm run verify:mint   # (tanpa gas)  ·  npm run verify:mint:live  # bagian D, dijalankan 6 Okt: 50/0
measured: 2026-10-06
result: CETAK ARTEFAK HIJAU — 43 pemeriksaan / 0 gagal (6 Okt, B169; uji negatif 43 / 4); `verify:mint:live` **50 / 0** (6 Okt, cetak sungguhan di chain 97)
---

# T92 - signer mint-check.js — B169: cetak artefak NFT atas permintaan pemegang kredensial

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B169 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B169 - Cetak artefak NFT dari app]] · **Summary:** [[08-Results/B169 - Executive Summary]] ·
**Terkait:** [[09-Testing/T82 - signer limits-check.js (B155 batas pemberian)]] (pola batas), [[09-Testing/T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)]] (sisi peramban)

`signer/scripts/mint-check.js`, dijalankan `npm run verify:mint` (di `signer/`, lewat `tsx`), ikut baterai murah `npm run sync:numbers`. Prasyarat: `DEPLOYER_PRIVATE_KEY`, `RPC_URL`, `RESOLVER_ADDRESS`, `SUPABASE_URL` + secret key
(dari `app/.env`). **Tanpa gas:** tidak ada transaksi yang dikirim — bagian B memakai klien tulis tiruan yang melempar bila disentuh.

| bagian | yang dibuktikan |
|---|---|
| A — `mintArtifact` dengan klien tiruan (18) | hash/alamat rusak → 400 tanpa menyentuh chain; yang sudah punya artefak → 409 `already` dengan token yang ada, dijawab dari chain tanpa simulasi; **tiap galat kontrak yang dinamai** (`CredentialNotFound` 404, `WrongHolder` 403, `AlreadyBound` 409, `CredentialRevoked` 409, `CredentialExpired` 409, `IssuerDelisted` 409, `LessonLevelNotMintable` 422) → kode + `kind`, tanpa transaksi; galat tak dikenal → 502 `failed` satu baris; `revertNameOf` menelusuri rantai `cause`; sukses: `mint` ditulis **tepat sekali** dari permintaan hasil simulasi, argumen = (alamat bercek, hash, `https://lencana-edge…/credentials/<hash huruf kecil>`), hasil (token, `ownerOf`, `locked`) dibaca dari chain; receipt gagal → 502 |
| B — kontrak chain 97 sungguhan, `eth_call` sebagai platform (7) | pemilik lapis A = kunci platform di lingkungan; B153 → `already` dengan token `84121403…364593`; hash acak → `not-found`; kredensial sah milik orang lain (pilih dari 4 spesimen yang belum dicetak) → `not-yours`; dicabut (`0xda10e69e…`) → `revoked`; kedaluwarsa (`0x202f8edf…`) → `expired`; didelisting (`0xaa379627…`) → `delisted` — bagian ini dilewati dengan baris `info` (tidak dihitung) bila delisting sudah dipulihkan |
| C — server sungguhan, 3 proses (18) | server 1: `GET` 405; tanpa pesan, pesan keperluan lain (`lencana-records`), alamat rusak, hash rusak → 400; akun Penerbit → 403 sebelum tanda tangan dipakai; tanda tangan kunci lain → 401 dan **slot batas dikembalikan**; tanda tangan sah atas B153 → 409 `already` + token + lapis A, dan **tanda tangan yang sama dipakai lagi → 409 yang sama** (nonce dibebaskan), nol pemberian tercatat; hash tak ada → 404; kredensial orang lain → 403; jawaban penolakan hanya `error/kind/tokenId/cert`; `/healthz` kuota 5/IP + 60/hari tanpa IP. server 2 (`MINT_PER_IP_DAY=0`): 429 sebelum tanda tangan (bukan 401) dan `/healthz` mengikuti. server 3 (`DEPLOYER_PRIVATE_KEY` kosong): 503 "not configured" |
| D — `--live` (dijalankan 6 Okt: 7 pemeriksaan tambahan → 50 / 0) | menerbitkan kredensial baru (`npm run issue`) untuk kunci baru, lalu `POST /me/mint` → 200, token = `uint256(hash)`, `ownerOf` = kunci itu (bukan platform), `locked`, `tokenURI` memuat hash dan alamat dokumen; permintaan kedua → 409 `already` dengan token yang sama; `/healthz` mencatat tepat satu pemberian. **Dijalankan 6 Okt atas "lgsg jalankan" builder:** peserta `0xf206f75d…0D02` (kunci baru), kredensial `0xa09db9dc…e856a`, token = `uint256(hash)` `72648733…6074`; `POST /me/mint` → 200, `ownerOf` = kunci peserta (bukan platform), `locked` true, `tokenURI` memuat hash dan alamat dokumen, permintaan kedua 409 `already`, `/healthz` tepat 1 pemberian. **Dicek ulang dengan `cast` di luar harness:** `tokenOfCredential`, `ownerOf` = `0xf206f75d…0D02`, `locked` true, `balanceOf` 1. **Efek samping:** satu kredensial uji baru di chain 97 (attestation + anchor, gas platform) dan di `.store` lokal; dokumennya diterbitkan ke tepi 6 Okt atas acc builder (`publish:edge`; `verify:edge` kembali hijau) |

**Uji negatif 6 Okt:** `slot.release()` pada kegagalan tanda tangan dan `dbForgetNonce` pada penolakan dihapus dari `server.js` → **43 / 4** merah ("slot batas dikembalikan", "tanda tangan yang SAMA dipakai lagi", "tidak ada pemberian tercatat …", "/healthz: kuota cetak … 0 pemberian");
dikembalikan → 43 / 0.

**Batas:** jalur sukses terbukti dengan klien tiruan dan penolakannya terhadap kontrak sungguhan; transaksi cetak sungguhan lewat rute baru terbukti oleh bagian D (dijalankan 6 Okt, 50 / 0). Server 1 memakai database sungguhan (nonce `scope=mint` ditulis lalu dilupakan pada penolakan).
