---
tags: [slides, deck, B175]
slide: 10
---

# 10 - Proof It Runs

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/09 - Money On Chain]] · **Berikutnya:** [[13-SubmissionDocs/Slides/11 - Live Now]]

**Tujuan:** kredibilitas: kontrak ter-deploy, uji yang bisa diulang juri, dan batas yang kami tulis sendiri.

## Di layar (teks persis)

- Judul: **Built, deployed, *tested*.**
- Kiri — **Contracts on BNB Chain testnet (chain 97)** (mono, alamat dipendekkan, tautan ke explorer):
  - `CredentialResolver` `0x7CA6…2065` — who may issue · status
  - `SoulboundCert` `0xC6FD…c4cd` — the soulbound badge
  - `SettlementSplit` `0xcB00…1bBE` — the 90/10 split
  - *Not ours:* BNB Attestation Service · ERC-8004 registry · Permit2 · x402 proxy
- Tengah — **Re-runnable checks** (lampu hijau + angka):
  - `e2e` **48 / 0** · `journey` **34 / 0** — against the public testnet, 7 Oct
  - 1EdTech validator **VALID · 14 / 0 / 0** — 7 Oct
  - web probe **267 / 0** — 6 Oct
- Kanan — **Limits we state ourselves** (kotak abu bergaris amber):
  - Testnet only. The demo publisher is fictional; payments use a test token.
  - On this deployment the platform registered the issuer and holds its key — self-service onboarding is the roadmap.
  - Verification proves who issued and the status — not that the claim inside is true (VC 2.0).

## Visual (benda inti)

**Panel instrumen**: tiga alat ukur bulat (gauge) yang jarumnya naik lalu menyala hijau satu per satu — `e2e`, `journey`,
`validator` — dengan struk kecil yang keluar dari printer di bawahnya berisi perintahnya (`cd signer && npm run e2e`).
Alamat kontrak tampil sebagai **blok berantai** di kiri yang tersambung garis tipis ke panel.

## Gerak

- **Masuk:** blok kontrak tersusun dari bawah (stagger), jarum gauge berayun dengan overshoot lalu berhenti di hijau.
- **Terus:** struk perlahan bergulir, lampu hijau bernapas.
- **Kotak batas:** muncul terakhir, tanpa animasi berlebihan (tenang = jujur).

## Catatan pembicara (±20 dtk)

> Everything you saw is deployed on BNB Chain testnet and checked by commands anyone can re-run — end-to-end, a full
> learner journey, and the third-party validator, all green today. And we write our limits ourselves: it's testnet, the
> demo publisher is fictional, and verification proves who issued it — not that the claim inside is true.

## Sumber

Alamat: [[02-Contracts/01 - Contracts]] + `web/src/config.ts:41` (SoulboundCert aktif `0xC6FD…`). Angka: T97 §4 (e2e, journey,
validator — 7 Okt), Cheat-Sheet (probe 267/0, 6 Okt). Batas: `README.md` "Limits we state ourselves" + "Who the issuer is,
on this deployment". **Jalankan ulang angka di hari presentasi** dan ganti tanggalnya (aturan vault #1).
