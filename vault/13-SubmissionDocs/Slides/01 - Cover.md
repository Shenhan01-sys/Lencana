---
tags: [slides, deck, B175]
slide: 1
---

# 01 - Cover

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Berikutnya:** [[13-SubmissionDocs/Slides/02 - Problem]]

**Tujuan:** dalam 5 detik juri tahu nama, janji, dan bahwa produknya hidup di BNB Chain testnet.

## Di layar (teks persis)

- *Kicker* (mono, emas, atas kiri): `INDONESIA WEB3 HACKATHON 2026 · CONSUMER APPS · BNB CHAIN`
- Tanda + wordmark besar di tengah: **Lencana**
- Judul: **Learn, test, and *prove it*.** (kata emas = "prove it", bilah garis bawah emas)
- Sub: *Learning credentials anyone can check for themselves — without taking our word for it.*
- Bawah: `lencana-psi.vercel.app` (mono) · QR ke situs · chip emas **Live on BNB Chain testnet**

## Visual (benda inti)

Ilustrasi datar (§2 hub). Kepingan **poligon krem datar** (`#f3eee2`, tiap keping membawa satu–dua bilah abu = sisa
sertifikat generik) melayang dari tepi layar dan **berkumpul** menjadi tanda Lencana — persegi emas membulat dengan
tanda gelap, sama dengan logo di topbar FE. Cincin titik emas datar mengorbit lalu menyusut ke dalam tanda. Di bawah
wordmark, **sabuk Admin** berbaris di sabuk belang: rak buku · gerbang tiket · meja kertas · robot · meja stempel ·
perisai lencana · toples (`drawObject`), masing-masing dengan bayangan elips datar `#0f1216`. Latar `#0b0e11` + dua
lingkaran besar `#181a20` di pojok sebagai kedalaman — tanpa bokeh, tanpa pantulan.

## Gerak

- **Masuk:** kepingan → tanda (0,6 dtk, *ease-in*), tanda *pop* dengan overshoot, wordmark menyapu dari kiri, judul naik kata per kata.
- **Terus:** belang sabuk berjalan (`ln-belt`), benda kecil melompat antar stasiun (`ln-hopx`), stempel menekan,
  cincin titik mengorbit pelan.
- **Ke slide 02:** wipe lingkaran emas datar dari kanan bawah (babak baru: masalah).

## Catatan pembicara (±15 dtk)

> Hi, we're Lencana. We turn a finished online course into a credential that anyone can check for themselves —
> no account, no wallet, and without taking our word for it. It's live today on BNB Chain testnet.

## Sumber

Judul = hero beranda produksi; acara + track = `README.md:24`; "Live on BNB Chain testnet" = Cheat-Sheet ("prototipe yang
berjalan di testnet 97"). Aset: benda sabuk `web/src/pages/admin-objects.ts:122`, QR `remotion/src/data/qr.json`;
sisipan opsional `public/captures/landing.png`.
