---
tags: [results, executive-summary, B169]
status: active
updated: 2026-10-06
---

# B169 - Executive Summary — cetak artefak NFT dari app (tahap 3a B168)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B169 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B169 - Cetak artefak NFT dari app]] · **Testing:** [[09-Testing/T92 - signer mint-check.js (B169 cetak artefak NFT dari app)]], [[09-Testing/T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)]] ·
**Terkait:** [[08-Results/B168 - Executive Summary]], [[08-Results/B170 - Executive Summary]], [[04-Signer-Service/S7 - Server routes and lifecycle]]

Keputusan builder 6 Okt: tahap 3 **ya**. Sebelum ini artefak NFT soulbound hanya dicetak platform lewat skrip; pemegang kredensial tidak bisa memintanya, dan dompet tertanamnya tidak punya BNB.

## 1. Apa yang diubah

- **Signer:** `POST /me/mint` (`signer/src/server.js`) — pola `/faucet`: bentuk → peran (`LEARNER_ROUTES`) → batas pemberian → tanda tangan pemegang (`lencana-mint nonce=<hex>`) → cetak. `signer/src/mint-artifact.js` mensimulasikan
  `SoulboundCert.mint` sebagai platform (`eth_call`, tanpa gas) lalu mengirimnya dan membaca hasilnya dari chain; **aturan boleh/tidaknya tetap di kontrak** (kode hanya menerjemahkan nama galat: `CredentialNotFound`, `WrongHolder`, `AlreadyBound`, `CredentialRevoked`,
  `CredentialExpired`, `IssuerDelisted`, `LessonLevelNotMintable`). Satu instance dicetak: lapis D42/D43 `0xc338AF7F…`; `URI` = dokumen di host tepi (sama dengan B153). Batas baru `LIMITS.mint` (5/IP + 60/hari, env `MINT_PER_IP_DAY`/`MINT_GLOBAL_DAY`) di `limits.js` dan `/healthz`.
  Penolakan melepas slot dan **membebaskan nonce** (tanda tangan yang sama bisa dipakai lagi).
- **App:** panel Bukti on-chain (B168) menampilkan kotak **Cetak artefak NFT** bila tidak ada lapis yang memegang artefak dan tidak ada yang gagal dibaca (`requestArtifactMint` di `learning.ts`, `loadLayers` di `credentials.ts`); sesudah sukses panel membaca ulang dari chain dan draf LinkedIn ikut menyebut NFT.
- **Harness:** `npm run verify:mint` (43 pemeriksaan, tanpa gas; ikut baterai) dan `verify:mint:live` (bagian D, belum dijalankan).
- **Tidak** disentuh: kontrak, database (skema), env Railway (tidak ada variabel baru).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| pemegang kredensial bisa meminta artefak NFT | tidak (hanya skrip platform) | ya, satu tanda tangan di panel bukti; platform membayar gas testnet |
| aturan penerbitan artefak ditegakkan | di kontrak | **tetap hanya di kontrak** (kode tidak menyalin; 7 galat diterjemahkan, diuji terhadap kontrak chain 97 sungguhan) |
| penolakan membakar tanda tangan | — | tidak: nonce dibebaskan, slot batas dikembalikan (uji negatif 43 / 4) |
| `verify:mint` | — | **43 / 0** |
| `probe` · `tsc` · `build` | 232/0 · 0 · 0 | 253/0 · 0 · 0 (grup B170 menambah 21; B169 tanpa pemeriksaan `probe` baru — `requestArtifactMint` memakai penandatangan peramban, diuji di T93) |

**Baterai `sync:numbers` 6 Okt 14.22–14.49 WIB (run penuh ke-6):** 38 harness, 37 hijau, **1.600 pemeriksaan**; `verify:mint` **43/0**, `probe` **253/0**, `verify:publisher` 57/0, `verify:manage` 55/0. `e2e` merah satu pemeriksaan ("validator asing berkata VALID untuk kertas yang sama" — validator eksternal tidak menjawab; terjadi di run ke-3 dan ke-6, **48/0** saat diulang sendirian; sebab tidak diukur lebih jauh). Dua run penuh lain merah di harness lain karena gangguan jaringan (`verify:manage`) dan sisa baris uji dari run yang dihentikan sistem (`verify:publisher`: baris `origin=test` tertinggal di `course_drafts`/`course_actions`/`publisher_members`/`enrollments`, dibersihkan; `cleanup` sisa 0).

## 3. Status

**SELESAI · signer LIVE** — didorong `f312539..b77ba40` 6 Okt (deploy-signer sukses); di produksi `/healthz` memuat kuota `mint` dan penolakan bertanda tangan terbukti tanpa gas (409 `already` untuk B153, 404, 403). AC-B169#15 (cetak sungguhan `verify:mint:live`) dan #17 (builder mencetak dari akunnya) OPEN.

## 4. Risiko tersisa

- Jalur sukses terbukti dengan klien tiruan; **transaksi cetak sungguhan lewat rute baru belum pernah dijalankan** (AC#15, menunggu acc builder: `verify:mint:live` menerbitkan satu kredensial uji dan perlu `publish:edge`).
- Satu-satunya kredensial akun builder (B153) sudah punya artefak di lapis A, jadi tombolnya tidak muncul di sana; mencoba LIVE perlu kredensial baru yang belum dicetak.
- Dua permintaan serentak untuk kredensial yang sama: yang kedua gagal di chain dan platform membayar gas transaksi gagal itu (kecil). Transaksi platform serentak (faucet, gas, cetak) berbagi satu kunci → nonce bisa bentrok, satu permintaan 502, peserta mencoba lagi.
- Permintaan gagal dengan kunci baru tidak memakan kuota (sama dengan `/faucet`); yang tersisa adalah beban RPC/database.
- Pesan galat signer berbahasa Inggris (aturan D27/D28: pesan signer ke klien) tampil apa adanya di UI Indonesia ("Gagal mencetak: this credential does not belong to the requesting account"); `kind` stabil disediakan bila UI ingin menerjemahkannya nanti.

## 5. Bukti

T92 (bagian A–C, uji negatif), T93 (B169 langkah 1–6), `signer/src/mint-artifact.js`, `signer/scripts/mint-check.js`, `web/src/pages/certificate-extras.ts` (`mintBox`).
