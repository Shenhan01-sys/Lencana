---
tags: [slides, deck, B175]
slide: 3
---

# 03 - The Proof Layer

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/02 - Problem]] · **Berikutnya:** [[13-SubmissionDocs/Slides/04 - Learner Journey]]

**Tujuan:** memposisikan Lencana dalam satu kalimat + tiga janji yang bisa diuji. Bukan "NFT certificate".

## Di layar (teks persis)

- Judul: **We don't fix courses. We fix the *proof*.**
- Tiga benda, masing-masing dengan satu baris:
  1. **The rules are sealed with the result** — `rubricHash` printed inside every credential
  2. **The status lives in a public record** — `statusOf(credentialHash)` on BNB Chain
  3. **Checking is free and needs no account** — one link · no wallet · no login
- Baris bawah (sub, abu): *What we build is not "an NFT certificate" — it is an issuance pipeline the public can audit.*

## Visual (benda inti)

1. **Segel lilin emas** menekan lembar rubrik di atas angka nilai — keduanya terkunci jadi satu kertas.
2. **Papan umum** (blok-blok BNB) dengan lampu status: hijau "valid", merah "revoked", amber "issuer delisted".
3. **Pintu terbuka** berbentuk tautan (ikon rantai) — siapa pun lewat tanpa kunci.

Ketiganya berdiri di atas satu garis dasar (lantai) dengan pantulan, kiri → kanan, tanpa kotak kartu.

## Gerak

- **Masuk:** segel jatuh dan *thud* (layar bergetar 2 px), lampu papan menyala berurutan, pintu berayun terbuka.
- **Terus:** lampu papan berkedip pelan bergantian (bukan kilat), cahaya keluar dari pintu bernapas.
- **Ke slide 04:** wipe lingkaran emas (babak: produk).

## Catatan pembicara (±20 dtk)

> We are not here to fix course quality — we fix the proof layer. Three things stay true at once: the grading rules
> are sealed together with the result; the status of a credential lives in a public record on BNB Chain; and checking
> it is free, instant, and needs no account.

## Sumber

[[00-Overview/08 - Submission Copy]] (Problem, paragraf terakhir); `rubricHash` = `web/src/manifest.ts` `rubricHashOf()`;
`statusOf` = `contracts/CredentialResolver.sol`; "issuance pipeline the public can audit" = `00-Overview/01 - Briefing.md`.
Kata "quietly" lebih tepat daripada "can't be changed" — rubrik boleh direvisi untuk angkatan berikutnya (hash baru).
