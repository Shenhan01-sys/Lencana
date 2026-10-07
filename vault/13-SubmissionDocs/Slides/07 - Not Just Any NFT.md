---
tags: [slides, deck, B175]
slide: 7
---

# 07 - Not Just Any NFT

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/06 - Signed and Anchored]] · **Berikutnya:** [[13-SubmissionDocs/Slides/08 - Verify From One Link]]

**Tujuan:** artefak NFT-nya istimewa karena aturan di kontraknya, bukan karena "NFT".

## Di layar (teks persis)

- *Kicker* (mono emas): `NOT JUST ANY NFT`
- Judul: **Soulbound. *Bound to the credential*.**
- Lembar spesifikasi (baris bercincin, muncul satu per satu):
  - 🔒 `Soulbound · ERC-5192`
  - ✕ `No one can sell it`
  - ✕ `…or transfer it`
  - ✕ `…or burn it`
  - ✓ `Minted only for a valid credential`
- Baris bawah (abu): *The badge is a display. The credential is the signed document — the badge follows its status.*

## Visual (benda inti)

**Koin soulbound 3D** (dua muka + tepi bergerigi, dari video draf 4–7): muka depan tanda Lencana, belakang
`SOULBOUND · ERC-5192`, teks lingkar `NON-TRANSFERABLE · CANNOT BE SOLD · CANNOT BE BURNED`. Kursor mencoba menyeret
koin → koin **memantul kembali** dengan cincin merah (transfer ditolak).

## Gerak

- **Masuk (Morph dari slide 06):** medali sertifikat → koin, berputar cepat lalu melambat.
- **Micro-beat:** tarikan transfer → pantulan pegas + cincin merah 0,5 dtk.
- **Terus:** koin berputar pelan (±2,6°/frame di video), tepinya terlihat saat menyamping; kilau menyapu muka.
- **Opsional:** blok emas penuh **SOULBOUND.** 0,5 dtk sebelum spesifikasi muncul.

## Catatan pembicara (±20 dtk)

> Then Rina can mint a soulbound badge. It's not just any NFT: no one can sell it, transfer it or burn it, and the
> contract refuses to mint it for a credential that is revoked, expired, or from a delisted issuer.

## Sumber

`contracts/SoulboundCert.sol:308`–`326` (`transferFrom`/`safeTransferFrom` → `NotTransferable`; `approve`/
`setApprovalForAll` → `NotDelegable`), `:331` (`_update` menolak transfer **dan** burn), `:130` (`mint` menolak kredensial
tidak ada / dicabut / kedaluwarsa / penerbit didelisting / level lesson), `:65` (antarmuka ERC-5192). Aset: video
1:00–1:08, `out/stills-coin/*.png`.
