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

Ilustrasi datar (§2 hub). **Koin datar tiga nada emas**: lingkaran `#f0b90b`, cincin tepi `#a37a00`, potongan kilap
`#ffe08a` bersudut tegas; muka depan tanda Lencana, belakang `SOULBOUND · ERC-5192`; teks lingkar
`NON-TRANSFERABLE · CANNOT BE SOLD · CANNOT BE BURNED`. Putarannya gaya kartun: koin **memipih** (`scaleX` 1 → 0 → −1) dan
saat menyamping hanya terlihat pita tepi gelap — bukan model 3D. Ikon gembok di atasnya. Panah kursor datar mencoba
menyeret koin → koin **memantul kembali** (pegas), tepi merah 3 px + chip mono `NotTransferable`.

Di bawah koin, **celah cetak** kecil: chip `revoked`, `expired`, `delisted issuer` memantul dengan ✕ merah; hanya chip
`✓ valid` yang masuk dan koin keluar — baris *Minted only for a valid credential* jadi terlihat.

## Gerak

- **Masuk (Morph dari slide 06):** medali sertifikat → koin, berputar memipih cepat lalu melambat.
- **Micro-beat:** tarikan transfer → pantulan pegas + tepi merah 0,5 dtk.
- **Terus:** koin berputar memipih pelan; potongan kilap bergeser di muka; chip di celah cetak bergantian memantul.
- **Opsional:** blok emas datar penuh **SOULBOUND.** 0,5 dtk sebelum spesifikasi muncul.

## Catatan pembicara (±20 dtk)

> Then Rina can mint a soulbound badge. It's not just any NFT: no one can sell it, transfer it or burn it, and the
> contract refuses to mint it for a credential that is revoked, expired, or from a delisted issuer.

## Sumber

`contracts/SoulboundCert.sol:308`–`326` (`transferFrom`/`safeTransferFrom` → `NotTransferable`; `approve`/
`setApprovalForAll` → `NotDelegable`), `:331` (`_update` menolak transfer **dan** burn), `:130` (`mint` menolak kredensial
tidak ada / dicabut / kedaluwarsa / penerbit didelisting / level lesson), `:65` (antarmuka ERC-5192). Aset: digambar
baru dari bentuk dasar; acuan nada koin = benda koin `HOP` di `web/src/pages/admin-objects.ts:144`.
