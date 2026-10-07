---
tags: [slides, deck, B175]
slide: 6
---

# 06 - Signed and Anchored

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/05 - Grading You Can Audit]] · **Berikutnya:** [[13-SubmissionDocs/Slides/07 - Not Just Any NFT]]

**Tujuan:** kredensialnya standar, ditandatangani penerbit, dan di-anchor di BNB Chain — tanpa data pribadi di chain.

## Di layar (teks persis)

- Judul: **Signed. *Anchored*.**
- Chip hijau: `Passed · 87 / 100`
- Empat label pendek yang menempel ke bagian sertifikat:
  - `Open Badges 3.0 · W3C Verifiable Credentials 2.0` → judul sertifikat
  - `signed by the publisher's key · eddsa-rdfc-2022` → plat penerbit
  - `attestByDelegation · BNB Attestation Service` → plat QR
  - `Only identifiers on chain — no name, no email, no grade` → aliran hash
- Tag: `demo publisher (fictional) · testnet`

## Visual (benda inti)

Ilustrasi datar (§2 hub). **Sertifikat ilustrasi**, digambar ulang dari tata letak halaman sertifikat (bukan rekaman):
bidang `#181a20`, bilah judul, **cincin nilai** yang dibagi menjadi busur sebanyak komponen rubrik (panjang busur = bobot
komponen, baca dari halaman sertifikat kredensial yang dipakai), angka **87** /100 mono, chip `PASSED`, penanda batas
lulus di cincin, pita emas datar di bawah medali, plat penerbit (bilah + chip `demo publisher`), plat QR (kisi kotak
datar). Empat label menempel ke bagiannya dengan **garis penunjuk** tipis `#848e9c`.

Di bawah sertifikat, **gerbang saring**: chip `name`, `email`, `grade` memantul di gerbang dengan ✕ merah; hanya chip hash
mono `0xb9fb06e5…` yang lewat dan mengalir ke **blok datar berantai** berlabel `BNB Chain · testnet` di kiri bawah — label
*Only identifiers on chain* jadi terlihat, bukan sekadar ditulis.

## Gerak

- **Masuk:** cincin **menggambar dirinya** busur demi busur, skor menghitung 0 → 87, chip PASSED *pop*, pita turun, QR
  naik — urutan yang sama dengan motion sertifikat produksi, dibuat ulang datar. Cincin fokus emas di plat penerbit,
  hijau di QR.
- **Terus:** chip hash terus mengalir ke blok (loop), chip data pribadi terus memantul di gerbang.
- **Ke slide 07 (Morph):** medali "87" membesar ke tengah → menjadi **koin soulbound datar** (sama dengan *match cut* video).

## Catatan pembicara (±20 dtk)

> When Rina passes, her credential is an Open Badges 3.0 document, signed by the publisher's key and anchored on BNB
> Chain through the BNB Attestation Service. Only identifiers go on chain — no name, no email, no grade.

## Sumber

D54 (kunci penerbit menandatangani); `attestByDelegation` di BAS (EAS publik, **bukan milik kita**); hanya pengenal di
chain = `README.md` How it works + [[00-Overview/10 - Project Detail (long form) - Copy]] butir 3; "jangan tulis ijazah on-chain /
stored on-chain" (Cheat-Sheet). ID kredensial `0xb9fb06e5…` = kredensial B153 yang sama dengan slide 08. Aset: tata letak
`web/src/pages/certificate-view.ts`; sisipan opsional `cert.png` atau `cert-motion.mp4`.
