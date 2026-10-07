---
tags: [slides, deck, B175]
slide: 8
---

# 08 - Verify From One Link

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/07 - Not Just Any NFT]] · **Berikutnya:** [[13-SubmissionDocs/Slides/09 - Money On Chain]]

**Tujuan:** sisi verifier (HR): satu tautan, tanpa dompet/login; pencabutan terlihat semua orang; validator pihak ketiga.

## Di layar (teks persis)

- Judul: **Verify from *one link*.**
- Dua kata besar (bisa jadi blok penuh berurutan): **NO WALLET.** · **NO LOGIN.**
- Kartu verdict membalik:
  - depan (hijau): `Valid` — *checked on chain*
  - belakang (merah): `No longer valid — revoked` — *another credential, revoked by its issuer · permanent, public*
- Kartu validator (tepi hijau): `THIRD-PARTY CHECK · vc.1ed.tech` · **1EdTech Open Badges 3.0 validator** ·
  `VALID` · `14 checks` · `0 errors` · `0 warnings` · *run on 7 Oct 2026 · a member validator, not a certification*

## Visual (benda inti)

Ilustrasi datar (§2 hub). **Bilah URL datar** gaya kolom input FE (`#1e2329`, tepi `#3a414c`, teks mono) mengetik tautan
dari QR sertifikat (`lencana-psi.vercel.app/?q=0xb9fb06e5…30c31#/verify`). Di bawahnya **kartu verifikasi ilustrasi**:
empat baris pemeriksaan (ikon bulat + bilah abu + centang hijau) dan chip verdict besar **✓ Valid** — *checked on chain*.
Kartu **membalik datar** (memipih `scaleX`, bukan perspektif 3D) ke sisi merah: baris status ber-✕, chip
**✕ No longer valid — revoked**.

**NO WALLET · NO LOGIN** = ikon dompet dan ikon gembok-login dicoret garis merah datar. Kartu validator: **14 kotak kecil**
terisi hijau satu per satu (satu kotak = satu pemeriksaan), chip `0 errors` · `0 warnings`.

## Gerak

- **Masuk:** ketikan URL, kartu *pop*, baris pemeriksaan tercentang berurutan, tepi kartu menjadi hijau.
- **Micro-beat:** kartu membalik memipih valid → revoked (0,4 dtk, *ease in-out*), tepi berganti merah.
- **Terus:** 14 kotak validator terisi berurutan sambil angkanya menghitung naik ke 14, chip `0 errors` berdenyut hijau sekali.
- **Ke slide 09:** wipe lingkaran emas (babak: bisnis).

## Catatan pembicara (±25 dtk)

> A recruiter verifies from a single link — no wallet, no login. The page reads the issuer's permission and the
> credential's status straight from BNB Chain. If it's ever revoked, everyone sees it. And the credential passes the
> 1EdTech Open Badges 3.0 validator with zero errors and zero warnings.

## Sumber

Validator dijalankan ulang 7 Okt untuk kredensial B153: `VALID · 14 pemeriksaan · 0 error · 0 warning`
([[09-Testing/T97 - Uji video pitch 90 detik (B173)]] §4) — wajib frasa **"passes"**, bukan certified/compatible; pencabutan
permanen, delisting bisa dipulihkan (dua Bitstring Status List, hash bertanda waktu di chain). Kredensial tercabut
`0xdbd7c72f…` = kertas uji T40. Aset: digambar baru; sisipan opsional `verify-valid.png`, `verify-revoked.png`.
