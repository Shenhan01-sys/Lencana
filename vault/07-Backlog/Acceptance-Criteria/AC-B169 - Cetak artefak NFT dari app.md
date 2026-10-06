---
tags: [acceptance-criteria, B169]
status: active
updated: 2026-10-06
---

# AC-B169 - Cetak artefak NFT dari app (tahap 3a B168)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B169 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T92 - signer mint-check.js (B169 cetak artefak NFT dari app)]],
[[09-Testing/T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)]] · **Summary:** [[08-Results/B169 - Executive Summary]] ·
**Terkait:** [[04-Signer-Service/S7 - Server routes and lifecycle]], [[03-Frontend/FE9 - Credentials page and certificate sheet]], B155 (batas pemberian), B168 (panel bukti), B170

Latar: sebelum B169 artefak NFT soulbound hanya dicetak platform lewat skrip (B153 dicetak manual di dua instance); pemegang kredensial tidak punya cara meminta. `SoulboundCert.mint` hanya bisa
dipanggil `owner()` (= kunci platform), dan dompet tertanam peserta tidak punya BNB. Builder 6 Okt: tahap 3 **ya**, dipecah B169 (ini) dan B170.

**Rancangan yang dijalankan:** `POST /me/mint` bertanda tangan pemegang (pola `/faucet`: batas dulu, tanda tangan sesudahnya), `mintArtifact` mensimulasikan `mint` sebagai platform (`eth_call`, tanpa gas) lalu mengirimnya;
**kontrak yang memutuskan** boleh/tidaknya (kode tidak menyalin satu aturan pun, hanya menerjemahkan nama galatnya). Hanya satu instance yang dicetak: lapis yang menegakkan D42/D43 (`0xc338AF7F…`), tanpa env baru di Railway.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B169#1 | rute `POST /me/mint` menolak bentuk salah sebelum menyentuh chain: tanpa pesan / pesan keperluan lain (`lencana-records`) / alamat rusak / hash rusak → 400; `GET` → 405 | **PASS** | T92 bagian C (6 pemeriksaan) |
| AC-B169#2 | tanda tangan **dompet lain** atas alamat peserta → 401, dan slot batas **dikembalikan** (tidak ada pemberian tercatat) | **PASS** | T92 C; uji negatif: `slot.release()` dihapus → merah |
| AC-B169#3 | akun Penerbit/Agent Owner ditolak 403 **sebelum** tanda tangan dipakai (`/me/mint` masuk `LEARNER_ROUTES`) | **PASS** | T92 C ("akun Penerbit → 403") |
| AC-B169#4 | aturan kontrak tidak disalin: tiap galat bernama diterjemahkan jadi kode HTTP + `kind` TANPA transaksi — `CredentialNotFound` 404, `WrongHolder` 403, `AlreadyBound` 409, `CredentialRevoked` 409, `CredentialExpired` 409, `IssuerDelisted` 409, `LessonLevelNotMintable` 422; galat tak dikenal (RPC mati) 502 `failed` satu baris | **PASS** | T92 A (klien tiruan, 7 galat + RPC mati) dan **B (kontrak chain 97 sungguhan, `eth_call` sebagai platform)**: B153 → `already` + token `84121403…364593`; hash acak → `not-found`; kredensial sah milik orang lain → `not-yours`; dicabut → `revoked`; kedaluwarsa → `expired`; didelisting → `delisted` |
| AC-B169#5 | yang sudah punya artefak dijawab dari chain (`tokenOfCredential`) **tanpa simulasi dan tanpa transaksi**, dengan token yang ada | **PASS** | T92 A+B+C |
| AC-B169#6 | permintaan **ditolak** tidak membakar nonce: tanda tangan yang SAMA dipakai lagi dijawab 409 yang sama (bukan 401 replay); tidak ada pemberian tercatat | **PASS** | T92 C; uji negatif: `dbForgetNonce` dihapus → merah |
| AC-B169#7 | jalur sukses menulis `mint(learner, hash, uri)` **tepat sekali** dari permintaan hasil simulasi; `uri` = `https://lencana-edge…/credentials/<hash huruf kecil>` (sama dengan B153); hasil dibaca dari chain (token, `ownerOf`, `locked`), bukan disimpulkan dari tx; receipt gagal → 502 | **PASS** (klien tiruan) | T92 A |
| AC-B169#8 | batas pemberian B155: `LIMITS.mint` 5/IP + 60/hari (env `MINT_PER_IP_DAY`/`MINT_GLOBAL_DAY`); `MINT_PER_IP_DAY=0` → 429 **sebelum** tanda tangan dipakai; `/healthz` melaporkan kuota (angka saja, tanpa IP) | **PASS** | T92 C |
| AC-B169#9 | tanpa kunci platform di server → 503 "not configured", tanda tangan tidak dipakai | **PASS** | T92 C (server dengan `DEPLOYER_PRIVATE_KEY` kosong) |
| AC-B169#10 | panel Bukti on-chain: bila **tidak ada lapis yang memegang artefak dan tidak ada yang gagal dibaca**, tampil kotak "Cetak artefak NFT" (satu tanda tangan; platform membayar gas jaringan uji); **tidak** tampil bila ada artefak atau pembacaan chain gagal ("gagal baca" bukan "belum dicetak") | **PASS** | T93 langkah 1, 2, 5 |
| AC-B169#11 | klik → permintaan memuat `learner` (alamat akun), `hash`, pesan `lencana-mint nonce=<hex>`, tanda tangan 65 byte, **tanpa bidang lain**; sesudah sukses panel membaca ulang dari chain dan kotak hilang; draf LinkedIn memuat kalimat NFT | **PASS** (jawaban rute dipalsukan di peramban) | T93 langkah 2 |
| AC-B169#12 | ditolak (403 not-yours) → "Gagal mencetak: …" (peran `alert`), tombol hidup lagi, tidak ada kartu; `409 already` → panel membaca ulang | **PASS** | T93 langkah 3, 4 |
| AC-B169#13 | Inggris dan ponsel 390 px tanpa luapan | **PASS** | T93 langkah 6 |
| AC-B169#14 | `verify:mint` ikut baterai `sync:numbers` (tanpa gas); `--live` (menerbitkan kredensial + gas) **tidak** ikut | **PASS** (terdaftar) | `signer/scripts/sync-numbers.js`; angka baterai di Summary |
| AC-B169#15 | **cetak sungguhan** lewat rute di chain 97 untuk kunci baru (`npm run verify:mint:live`): token milik kunci itu, terkunci, `tokenURI` memuat hash; permintaan kedua 409 | **OPEN** — kode ditulis, belum dijalankan: ia menerbitkan satu kredensial uji ke `.store` lokal dan memakai gas testnet; kredensial itu harus diterbitkan ke tepi (`publish:edge`, keluar ke Cloudflare) supaya `verify:edge` tidak merah — menunggu acc builder | — |
| AC-B169#16 | **LIVE:** signer Railway menjawab `/me/mint` (deploy `signer/**`); builder mencetak artefak dari akunnya | **OPEN** — menunggu dorongan atas kata builder; **catatan:** satu-satunya kredensial akun builder (B153) sudah punya artefak di lapis A, jadi tombolnya tidak muncul di sana — untuk mencoba, akun itu perlu kredensial baru yang belum dicetak | — |

**Batas klaim:** cetak berhasil sungguhan di chain 97 **belum** diuji (AC#15). Jalur sukses terbukti dengan klien tiruan (urutan panggilan, argumen, hasil dibaca ulang) dan penolakannya terhadap kontrak sungguhan.
Dua permintaan serentak untuk kredensial yang sama bisa sama-sama lolos simulasi; yang kedua gagal di chain (`AlreadyBound`) dan platform membayar gas transaksi gagal itu — kecil, tidak dikunci. Transaksi platform serentak
(faucet, gas, cetak) berbagi satu kunci: nonce bisa bentrok dan satu permintaan menjawab 502 (slot dikembalikan, peserta mencoba lagi) — sama dengan jalur yang sudah ada. Permintaan gagal dengan kunci baru tidak memakan kuota
(sama dengan `/faucet`); yang tersisa adalah beban RPC/database, bukan gas.
