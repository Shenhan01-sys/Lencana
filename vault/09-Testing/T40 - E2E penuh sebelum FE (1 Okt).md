---
tags: [testing, "T40", e2e]
status: active
updated: 2026-10-01
command: npm run audit · verify:attempts:live · journey · verify:agents:live · verify:praktik:live · verify:relay:live · x402 · monitor:edge · sync:numbers
measured: 2026-10-01 (malam)
result: audit 12 pemeriksaan · 0 temuan; tujuh alur live hijau (84/0 · 34/0 · 40/0 · 32/0 · 17/0 · 20/0 · monitor AMAN); baterai 21 harness · 0 gagal; korpus 23 → 26 kertas
---

# T40 - E2E penuh sebelum FE (1 Okt)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Diminta:** builder, sebelum pindah ke FE ("jalankan auditnya dan test end to
end integration test full flownya, kalau aman pindah ke FE") · **Halaman per alur:** [[09-Testing/T22 - signer attempts-check.js]] ·
[[09-Testing/T20 - signer journey.js]] · [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]] ·
[[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]] · [[09-Testing/T33 - signer relay-check.js]] ·
[[09-Testing/T15 - 1EdTech validator]] · [[09-Testing/T28 - signer monitor-edge.js]]

Semua alur dijalankan di BSC **testnet 97** dari kode di `main` sesudah `ec2c719`, berurutan, satu per satu. Tidak ada
logika uji baru: setiap alur memakai harness yang sudah ada dan bisa diulang siapa pun yang memegang `.env` kita.

## Hasil per alur

| # | alur | perintah | hasil | bukti di chain / tepi |
|---|---|---|---|---|
| 0 | konsistensi proyek | `npm run audit` | **12 pemeriksaan · 0 temuan** — 136 marker cocok dua arah, 12 klaim README = angka harness | — |
| 1 | **peserta lewat HTTP sampai kertas terbit**: enroll → 19 lesson → 4 kuis dinilai server → esai (usulan model disahkan reviewer, `adjusted` 80 → 100) → praktik dinilai chain (`POST /praktik`) → gerbang → `issue --from-attempts` → `publish:edge` → dokumen hasil di tepi | `npm run verify:attempts:live` | **84 / 0** | kertas `0x2d90e94083833b3a84ae1b679a20c47325e93ec2b9658e617649cee7fecff89b`, uid `0x89a6402c8c7b24f43cd56f22ffe2902efd05e9b707f7c13cab4df07b79223f6d`, pemegang `0xcaFb252D04eCd25ed6bf3eb8C40B32b7D43fa3f9` |
| 2 | **siklus hidup kredensial**: guard prasyarat (ditolak sebelum gas) → terbit dasar (esai dinilai model) → terbit lanjutan dengan `refUID` → tepi → validator 1EdTech → SBT `mintBatch` → **cabut** prasyarat → terlihat di chain, daftar status, dan metadata SBT | `npm run journey` | **34 / 0** | A `0xdbd7c72f…5e42` LULUS 100/70, uid `0xd5a26df8…a53c` (333.496 gas) · B `0xfdd7fcdd…de2a` LULUS 94/70, uid `0x128c634a…cfb3` (387.290 gas), `prerequisiteOf(uid B)` = uid A · validator **VALID, 14 pemeriksaan, 0 error, 0 warning** untuk keduanya · `mintBatch` 2 artefak · cabut A tx `0xd52ba57650428471a524b0af0e2281e0648dbf89bce87bdd0496a7af6e1e0a16` (75.532 gas), re-anchor `0x299444552159f673d8660a3ab59c09a68596314544391d27f2c8b728425448f1` (45.869 gas) · SBT A → **REVOKED**, SBT B tetap **VALID** |
| 3 | **sewa agen + bayar x402** (B119/B120) | `npm run verify:agents:live` | **40 / 0** | tagihan menilai: settle `0x8a27bdd46c19e1093788dc65791802e0075b5764ad633d5ae22a01dee464616e` → agen +2160 · tagihan mengesahkan: settle `0xc17bb47950370f7c85c7468a6fbc1e5970943a73c0a3ccd9e6177d09cbef95f3` → reviewer +1553 · bayar ganda 409 |
| 4 | **praktik dinilai chain** (B121) | `npm run verify:praktik:live` | **32 / 0** | transfer baru `0xe9c6f30a7b4c1d21acd0fe6ed9fdf9d2cc650c783a8608effd2ba756c741996a` |
| 5 | **relayer penerbitan** (B97) | `npm run verify:relay:live` | **17 / 0** | siaran `0xd76dd2c5ac5f429975f240c1167f8b1d5a5098c5120f805f04799ee16325cef4` (347.059 gas, blok 134237829), uid `0x70795c2e…4b92`; saldo agen tidak berubah sampai wei, platform yang membayar; kiriman ulang → pekerjaan yang sama |
| 6 | **verifikasi berbayar x402** | `npm run x402` (server hidup) | **20 / 0** | settle `0x0f10cb71e979e6ef48ac48bb2edfb922ce94f7e8a3c3e85794a11a9439a9a8ea`, split `0xc0f90ee1b31142ca0965d3197d54d0e9260b41317c8905f1e63e281190da282a`; penerbit +900, platform +100, klien membayar tepat 1000 tanpa satu transaksi; satu pembayaran melayani 2 verifikasi dengan verdict berbeda (REVOKED, VALID) |
| 7 | **permukaan publik** | `npm run monitor:edge` | **AMAN — 0 alarm** | 34 hash dipantau, 26 berdokumen; revocation `matchesChainNow` 34/34 (7 bit — bertambah satu: A), suspension 34/34 (2 bit); umur state 0,1 jam |
| 8 | **baterai penuh** sesudah semuanya | `npm run sync:numbers` | **21 harness · 0 gagal** | `check` **106/0** (26 kertas di 4 dokumen penerbit: 19 + 3 + 3 + 1) · `e2e` **47/0** · `verify:live-cert` **47/0** · `verify:edge` **26 dari 26** · probe web 88/0 · `forge test` 65/0 · `verify:db` 70/0 · `verify:quizkeys` 30/0 · `verify:deposit` 27/0 (setoran 30 Sep dibaca dari chain) |

Setiap status kertas di atas dibaca ulang langsung dari resolver sesudah run (`attestationOf`, `statusOf`, `holderOf`,
`prerequisiteOf`): C1 berlaku, A `revoked=true`, B berlaku dengan prasyarat yang tercabut, attester ketiganya penerbit
`0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE`.

## Kesimpulan untuk keputusan "pindah ke FE"

**Backend siap dipanggil FE.** Setiap rute yang akan dipakai halaman lulus lewat HTTP sungguhan dalam satu malam yang
sama: `/enroll`, `/progress`, `/grade` (pembahasan per soal), `/essay`, `/essay/judgement`, `/essay/reviewers`,
`/essay/review`, `/praktik`, `/agents/*`, `/agent-charges/*`, `/relay`, `/verify` (x402), `/deposit/*` (tanpa gas),
`/criteria`, `/results`, `/credentials`, kedua daftar status — dan penerbitan, prasyarat, SBT, pencabutan, serta
validator pihak ketiga di chain.

**Yang sengaja tidak diuji di sini, dan kenapa:**
- **Setoran tenggat live** — `deposit()` menolak setoran kedua untuk label yang sama; satu-satunya run live (30 Sep)
  dibaca ulang dari chain oleh mode tanpa gas (27/0).
- **Layar FE** — halaman belajar memanggil `/praktik` (B121, OI-20), layar sewa/tagihan agen (OI-19), identitas lintas
  perangkat (B82), registri penerbit live (B105). Itu pekerjaan fase berikutnya, bukan kegagalan BE.
- *(Koreksi 1 Okt malam, B82/D57: "akun/login" di kalimat berikut basi beberapa jam sesudah T40 — login email lewat
  Privy terpasang sesudahnya, [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]]; teks gap `journey.js` ikut dikoreksi.)*
- **Yang memang tidak ada di core**, dicetak journey apa adanya: akun/login (identitas = kunci penanda tangan) dan
  pembelian kursus (tabel `orders` tidak pernah ditulis). Teks gap journey sebelumnya juga berkata "core tidak punya
  enrollment atau penyimpanan jawaban" — **basi sejak B72**; dikoreksi di `signer/scripts/journey.js` malam ini.
- **B116** (rotasi kunci) — keputusan builder, bukan pengujian.

## Kebersihan dan biaya

- Peserta kertas C1 ditandai `origin=demo` (aturan B104: pemegang kertas yang kita pantau = demo); peserta journey tidak
  punya baris Postgres (journey menerbitkan lewat CLI). Sesudahnya `npm run cleanup -- --apply`: **10** enrollment
  `origin=test` terhapus, sisa `origin=test → 0`.
- Gas yang tercetak oleh run: 333.496 + 387.290 (dua attestation journey) + 75.532 (cabut) + 45.869 (re-anchor) +
  347.059 (siaran relayer); sisanya (attestation C1, `mintBatch`, settlement x402, transfer praktik, mint token demo)
  tidak dicetak harnessnya. Pada 0,1 gwei, 500 rb gas = 0,00005 tBNB.
- Selama baterai, penjaga `node_modules` (lihat T39) memeriksa ketiga pohon dependensi tiap 2 detik: tidak ada yang hilang.

## E2E — panduan untuk builder (centang sendiri)

- [ ] buka `https://lencana-edge.hansgunawan775.workers.dev/credentials/0x2d90e94083833b3a84ae1b679a20c47325e93ec2b9658e617649cee7fecff89b`
      → dokumen bertanda tangan; `…/results/web3-dasar-2026/0x2d90e940…` → esai 100 (disahkan reviewer), praktik `gradedBy chain`
- [ ] tempel `0xfdd7fcdd6f06d6f9fa0e45c9dc8d3c8da87df28d5239309806e265450d65de2a` di halaman verifikasi → berlaku, prasyaratnya dicabut
- [ ] tempel `0xdbd7c72fc3511078d36c1789b446ed8acb548cecdeb698aaf23cd6aa4ae95e42` → **REVOKED**
- [ ] buka tx cabut `0xd52ba576…0a16` di BscScan testnet
