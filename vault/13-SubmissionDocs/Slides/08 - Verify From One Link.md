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

Kolom URL bingkai browser mengetik tautan dari QR sertifikat (`?q=0xb9fb06e5…30c31#/verify`), halaman verifikasi asli
terbuka (`verify-valid.png`) dengan cincin hijau di bilah empat pemeriksaan dan ikon + kata "Valid"; lalu kartu
**membalik 180°** ke halaman `verify-revoked.png` bercincin merah. Kotak cincin dari `focus.json`: `validChecks`,
`validVerdict`, `revokedChecks`, `revokedVerdict`.

## Gerak

- **Masuk:** ketikan URL, halaman memudar masuk, cincin hijau menyala.
- **Micro-beat:** balik kartu valid → revoked (0,4 dtk, *ease in-out*), cincin berganti merah.
- **Terus:** angka validator menghitung naik ke 14, kotak `0 errors` berdenyut hijau sekali.
- **Ke slide 09:** wipe lingkaran emas (babak: bisnis).

## Catatan pembicara (±25 dtk)

> A recruiter verifies from a single link — no wallet, no login. The page reads the issuer's permission and the
> credential's status straight from BNB Chain. If it's ever revoked, everyone sees it. And the credential passes the
> 1EdTech Open Badges 3.0 validator with zero errors and zero warnings.

## Sumber

Validator dijalankan ulang 7 Okt untuk kredensial B153: `VALID · 14 pemeriksaan · 0 error · 0 warning`
([[09-Testing/T97 - Uji video pitch 90 detik (B173)]] §4) — wajib frasa **"passes"**, bukan certified/compatible; pencabutan
permanen, delisting bisa dipulihkan (dua Bitstring Status List, hash bertanda waktu di chain). Kredensial tercabut
`0xdbd7c72f…` = kertas uji T40. Aset: video 1:10–1:25.
