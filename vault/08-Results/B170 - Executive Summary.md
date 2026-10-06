---
tags: [results, executive-summary, B170]
status: active
updated: 2026-10-06
---

# B170 - Executive Summary — bukti kepemilikan artefak NFT (tahap 3b B168)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B170 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B170 - Bukti kepemilikan artefak NFT]] · **Testing:** [[09-Testing/T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)]] (+ grup B170 di `probe`) ·
**Terkait:** [[08-Results/B168 - Executive Summary]], [[08-Results/B169 - Executive Summary]], [[03-Frontend/FE1 - Verifier page and verify.ts]], [[03-Frontend/FE4 - Mount contract with the maintainer]]

Pertanyaan builder 5 Okt: bagaimana membuktikan artefak itu terikat ke akunnya. B168 menampilkan `ownerOf` = dompet akun; yang belum terbukti **ke orang lain** adalah bahwa pemegang akun mengendalikan dompet itu — email tidak pernah ada di chain.
Keputusan builder 6 Okt: tahap 3 **ya**.

## 1. Apa yang diubah

- **`web/src/ownership.ts`** (murni, diuji `probe`): pernyataan baku (9 baris), blok (pernyataan + tanda tangan 65 byte), `checkOwnership` — pulihkan penandatangan (`ecrecover`) lalu baca `ownerOf`, `credentialOf`, `locked` dari chain. **VALID hanya bila**
  penandatangan = dompet yang dinyatakan = pemilik di chain DAN token itu milik kredensial yang disebut; kontrak yang bukan lapis artefak Lencana yang dikenal **tidak pernah** sah; sepuluh putusan dibedakan (`VALID`, `MALFORMED`, `BAD_SIGNATURE`, `SIGNER_MISMATCH`, `OTHER_CHAIN`,
  `UNKNOWN_CONTRACT`, `NO_TOKEN`, `HASH_MISMATCH`, `NOT_OWNER`, `UNREADABLE`) dan urutannya dari yang murah ke yang butuh jaringan.
- **Sisi pemilik:** kotak "Bukti kepemilikan" di tiap kartu artefak yang pemiliknya dompet akun: satu tanda tangan (tanpa transaksi, tanpa biaya; `signOwnershipStatement` menolak pernyataan yang menyebut dompet lain) → blok, tautan `…/?own=<blok>#/verify`, perintah `cast`.
- **Sisi pemeriksa:** bagian "Periksa bukti kepemilikan" di halaman verifikasi publik (`pages/ownership-check.ts`), tanpa akun dan tanpa server Lencana di jalur pemeriksaan; tautan `?own=` mengisi dan langsung memeriksa.
- **Berkas milik maintainer (hanya tambahan):** `index.html` +1 `<section id="ownership-check">`, `main.ts` +1 import +1 panggilan di `updateStaticText`. Verifier (`input/go/out/status/banner`) tidak disentuh; bila elemen hilang, fungsi diam.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| bukti bahwa pemegang akun mengendalikan dompet pemilik token | tidak ada | pernyataan bertanda tangan + pemeriksa publik (tanpa akun); `cast wallet verify` mengulangnya tanpa halaman (dijalankan sungguhan: benar → exit 0, diubah → "Validation failed") |
| kontrak karangan, teks diubah, tanda tangan dompet lain | — | tidak pernah VALID (`probe` + uji negatif: 3 pemeriksaan dimatikan → 6 merah) |
| pembacaan chain | — | RPC publik langsung; jaringan mati = `UNREADABLE` (bukan `NOT_OWNER`), token tak ada = `NO_TOKEN` — terbukti terhadap chain 97 sungguhan |
| `probe` · `tsc` · `build` | 232/0 · 0 · 0 | **253/0** (+21) · 0 · 0 |

**Baterai `sync:numbers` 6 Okt 14.22–14.49 WIB (run penuh ke-6):** 38 harness, 37 hijau, **1.600 pemeriksaan**; `probe` **253/0** (termasuk grup B170). `e2e` merah satu pemeriksaan (validator eksternal tidak menjawab; **48/0** saat diulang sendirian) — rincian di [[08-Results/B169 - Executive Summary]].

**Pembaruan, run penuh ke-7 6 Okt 17.46–18.10 WIB (edge sehat, DB bersih):** **38 harness · 38 hijau · 1.616 pemeriksaan**; `e2e` 48/0, `probe` **267/0** (sesudah B171), `verify:edge` 32 dari 32, `verify:mint` 43/0.

## 3. Status

**SELESAI · LIVE** — didorong `f312539..b77ba40` 6 Okt; di produksi pemeriksa menjawab NOT_OWNER terhadap chain 97 sungguhan, tautan `?own=` langsung memeriksa, nol galat (AC-B170#15). AC-B170#14 (VALID dengan akun nyata di produksi) OPEN.

## 4. Risiko tersisa

- Kasus **VALID** terbukti dengan kunci uji dan chain dipalsukan untuk pemiliknya; terhadap chain sungguhan hanya penolakan yang bisa dibuktikan tanpa kunci akun nyata. Tanda tangan dompet Privy di jalur ini belum dicoba.
- Yang **tidak** dibuktikan: identitas orang di dunia nyata (dompet tertanam terikat ke login, bukan KTP), dan keadaan di kemudian hari — pemilik dibaca saat diperiksa. Dompet kontrak pintar (EIP-1271) tidak didukung. Batas ini ditulis di UI, bukan hanya di sini.
- Tautan `?own=` memuat seluruh blok (±900 karakter ter-encode); batas 4000 karakter dibaca.
- Ada dua tambahan di berkas milik maintainer; bila ia merancang ulang halaman verifikasi, bagian ini perlu dipasang ulang (kontrak seperti `lms-mount`, FE4).

## 5. Bukti

`probe` grup B170 (21 pemeriksaan), T93 (B170 langkah 1–8), `web/src/ownership.ts`, `web/src/pages/ownership-check.ts`, `web/src/pages/certificate-extras.ts` (`ownershipBox`), `web/src/learning.ts` (`signOwnershipStatement`).
