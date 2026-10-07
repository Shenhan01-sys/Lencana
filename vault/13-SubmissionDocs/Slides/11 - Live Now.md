---
tags: [slides, deck, B175]
slide: 11
---

# 11 - Live Now

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/10 - Proof It Runs]]

**Tujuan:** penutup yang bisa ditindaklanjuti: coba sekarang, baca kodenya, dan apa langkah berikutnya.

## Di layar (teks persis)

- Logo + wordmark **Lencana**
- Judul: **Learn, test, and *prove it*.**
- Chip emas: **Live now on BNB Chain testnet**
- Tiga tautan (mono): `lencana-psi.vercel.app` · `github.com/Shenhan01-sys/Lencana` · video pitch (YouTube)
- QR besar ke `lencana-psi.vercel.app`
- **Next** (tiga baris kecil, abu):
  - Institutions onboard themselves and keep their own issuer key
  - Issuer keys in a KMS / HSM instead of a file on our server
  - Agent track records on ERC-8004 — not used today

## Visual (benda inti)

Ilustrasi datar (§2 hub). Kartu penutup dengan susunan akhir video: logo di atas, tagline, URL + QR (kisi kotak datar
dengan **siku emas** di empat sudut), dan **sabuk Admin berbaris** di bawahnya (courses · enrollment · class & essays ·
agent grading · review · result · settlement; tujuh benda `drawObject`, bayangan datar, tanpa pantulan) — perjalanan
yang tadi diceritakan, kini rapi dalam satu baris.

## Gerak

- **Masuk:** tiga blok datar penuh berurutan **LEARN.** (emas) → **TEST.** (krem) → **PROVE IT.** (hijau), ±0,5 dtk
  masing-masing (maks 2 per detik), lalu kartu penutup naik.
- **Terus:** chip "Live now" berdenyut skala lembut, benda sabuk melompat bergantian, siku QR berdenyut (skala, bukan sinar).

## Catatan pembicara (±15 dtk)

> Lencana: learn, test, and prove it. It's live now on BNB Chain testnet — scan the code and check a credential
> yourself. Next, institutions onboard themselves and keep their own keys. Thank you.

## Sumber

Tagline = judul hero beranda; "Live now on BNB Chain testnet" = VO baris 8 video. *Next* = `README.md` ("Self-service
onboarding … is the roadmap"), Cheat-Sheet ("kunci penerbit demo ada di berkas lokal; di produksi tempatnya di KMS/HSM"),
B118 F2 (reputasi agen tidak dibaca/ditulis — jangan tulis "reputasi on-chain"). Tautan YouTube diisi setelah video
diunggah (B65, aksi builder). Aset: `web/src/pages/admin-objects.ts:122`, `remotion/src/data/qr.json`.
