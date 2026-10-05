---
tags: [results, executive-summary, B164]
status: active
updated: 2026-10-05
---

# B164 - Executive Summary — verifier membaca semua lapis artefak soulbound

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B164 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B164 - Verifier membaca semua lapis artefak]] ·
**Testing:** [[09-Testing/T87 - Uji peramban verifier membaca semua lapis artefak (B164)]] ·
**Terkait:** B153 (kredensial yang artefaknya dicetak), D46 di [[00-Overview/03 - Decisions]], [[02-Contracts/C2 - SoulboundCert]]

Ditemukan 5 Okt malam saat mencetak artefak NFT untuk kredensial B153 di dua instance kontrak (A `0xc338AF7F…`, B `0xC6FD12B0…`): verifier
bawaan hanya membaca satu alamat, `0xA5eB807A…` (instance paling tua; `web/src/verify.ts`, `defaultEndpoint()`), sehingga dua artefak yang ada dan
terkunci tampil "Optional / Not Minted". Klaim saya sebelumnya bahwa bawaan = `0xC6FD12B0…` keliru (itu hanya preset `bsc97`); koreksinya
terlihat di Findings, hub desain sertifikat, dan START-HERE.

## 1. Apa yang diubah

- `web/src/verify.ts`: `Endpoint.certs?`; tipe `CertLayer`; `CERT_LAYERS_97` (tiga instance chain 97: A, B, lalu `0xA5eB…`); `defaultEndpoint()`
  tetap `cert = 0xA5eB…` (D46) dan menambah `certs`. Fungsi murni `certCandidates` (urutan, tanpa duplikat), `pickArtefactLayer` (lapis pertama
  yang memegang token; pembacaan gagal tidak dihitung), `enforcesCourseLevel` (tiga selector di bytecode: `mintBatch`, `attestationOf`,
  `lessonOf`), dan `artefactLayersOf`. Bagian 6 `verify()` membaca `tokenOfCredential` per lapis, memilih lapis, dan membaca bytecode hanya untuk lapis
  yang memegang. Masukan alamat peserta menjumlahkan `balanceOf` semua lapis; masukan tokenId desimal dicari di semua lapis; perintah ulang `cast call`
  satu per lapis. Pembacaan yang gagal dilaporkan terpisah — bukan "belum dicetak".
- `web/src/config.ts`, `web/src/main.ts`: preset fork lokal dan mainnet tanpa lapis tambahan; konfigurasi tersimpan mewarisi `certs` bawaan hanya bila
  resolver dan chain-nya sama dengan bawaan; panel konfigurasi membuang lapis tambahan bila `cert`, resolver, atau chain diubah.
- `web/src/render.ts`, `web/src/i18n.ts`: panel artefak mendaftar tiap lapis (ada artefak / tidak ada / gagal dibaca) beserta penanda D42/D43 yang diukur dari
  bytecode; `tokenURI` JSON tampil sebagai kode + tautan `external_url` (sebelumnya `href` yang rusak).
- `web/src/lesson-views.ts`: `/app/credentials` punya kolom "Artefak (NFT)" ("soulbound · N lapis" / "belum dicetak" / "gagal dibaca").
- `web/scripts/probe.ts`: grup B164, 26 pemeriksaan (murni + baca chain 97 publik untuk B153).
- **Tidak** disentuh: kontrak, database, signer, `CERT_ADDRESS` (D46: tiga instance hidup berdampingan, tidak dipindah).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| verifier bawaan untuk hash B153 | "4. Soulbound NFT: Optional / Not Minted", TOKEN ID `—` (produksi, kode lama; T87 langkah 0) | "Minted & Locked", Token ID #84121403…, "🔒 Soulbound (ERC-5192)" tanpa konfigurasi apa pun (T87 langkah 1) |
| artefak terlihat | hanya bila `cert` ditimpa manual (preset `bsc97` atau `0xc338…`) | tiga lapis dibaca otomatis; panel mendaftar tiap lapis dan menandai D42/D43 (T87 langkah 2) |
| daftar kredensial akun | tanpa kolom artefak | kolom "Artefak (NFT)": akun 1 → "soulbound · 2 lapis" (T87 langkah 3) |
| pembacaan RPC yang gagal | — | tidak dihitung memegang artefak, ditandai gagal, alasan terpisah (`probe`; tampilan di peramban tidak diuji — AC-B164#3) |
| konfigurasi eksplisit satu instance | — | `certs: []` dan lapis tambahan dibuang (T87 langkah 4; `probe` 6 pemeriksaan) |
| uji punya gigi | — | perilaku lama dikembalikan → 15 pemeriksaan merah dari 173 (termasuk "B153 → token=null"), lalu 173/0 |
| `tsc` · `probe` · `build` | 0 · 147/0 · 0 | 0 · **173/0** · 0 (`probe` dicetak ulang 5 Okt malam, 1 menit 19 detik); baterai `sync:numbers` 37 harness · 37 hijau, 1.477 pemeriksaan; `audit` bersih; `check:labels` 8/0 |
| verifier **produksi** untuk hash B153 | "Optional / Not Minted" (T87 langkah 0) | "Minted & Locked", tiga lapis, tanpa penimpaan konfigurasi (T87 §LIVE) |

## 3. Status

~~**SELESAI di kode, belum LIVE** — perubahan belum didorong; produksi masih menjalankan kode lama sehingga B153 tampil "Not Minted" di verifier bawaan; AC-B164#12 (LIVE) OPEN.~~
**SELESAI · LIVE** — didorong `7259153..a962ff7` atas kata builder (5 Okt 21.54 WIB, "Kalau udh di push dulu aja"). Dibaca sesudah dorongan: bundel produksi berganti ke
`assets/index-BxD6KH3I.js` (869.594 byte) — nama dan ukuran sama dengan hasil `npm run build` lokal sebelum commit — dan memuat teks panel lapis. Chrome 154 bersih membuka
verifier produksi untuk hash B153: TOKEN ID #841214031867952989208…, "🔒 Soulbound (ERC-5192)", "4. Soulbound NFT: **Minted & Locked**", tiga lapis terdaftar
(`0xA5eB…` kosong · `0xc338…` ada, D42/D43 ✓ · `0xC6FD…` ada, D42/D43 ✗), `localStorage` kosong, galat konsol 0 (T87 §LIVE; AC-B164#12 PASS).
Run GitHub Actions `deploy-signer` 37328503623 (dipicu karena `web/src/**` ada di filter jalurnya; signer tidak berubah oleh B164) masih berjalan saat ini dicatat — hasilnya
belum dibaca.

## 4. Risiko tersisa

- **Daftar lapis statis** — `CERT_LAYERS_97` berisi tiga instance. Instance baru yang kelak di-deploy tidak otomatis terbaca; ia harus ditambahkan ke daftar itu.
- Satu kredensial kini bisa punya dua token (satu per instance); itu sah secara kontrak dan sekarang tampak apa adanya. Penegakan D42/D43 berbeda antar lapis
  (A ya, B tidak) dan panel menandainya; memilih lapis mana yang "resmi" untuk peserta tetap keputusan terpisah (D46).
- Tampilan "gagal dibaca" dan alasannya hanya terbukti sebagai logika murni di `probe`; RPC tidak dipaksa gagal di peramban (AC-B164#3 PARTIAL).
- `/app/credentials` asli ada di balik login; yang diuji adalah fungsi yang dipakainya (AC-B164#7 PARTIAL).
- Artefak bukan kredensial dan bukan bukti keberlakuan (C2): kredensialnya tetap dokumen bertanda tangan + attestation BAS.

## 5. Bukti

T87 langkah 0–5; `probe` grup B164 (26 pemeriksaan) + uji negatif 15 merah; `web/src/verify.ts` (`certCandidates`, `pickArtefactLayer`,
`enforcesCourseLevel`, `artefactLayersOf`, `CERT_LAYERS_97`), `web/src/render.ts` (panel lapis, `tokenUriHtml`), `web/src/lesson-views.ts`
(`readMyCredentials`), `web/src/config.ts` (`loadEndpoint`), `web/src/main.ts` (`collectFromForm`).
