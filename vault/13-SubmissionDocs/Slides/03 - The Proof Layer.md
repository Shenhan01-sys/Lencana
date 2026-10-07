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

Ilustrasi datar (§2 hub):

1. **Stempel segel emas datar** (rosette bergerigi tiga nada emas, centang di tengah) menekan lembar rubrik (bilah
   kriteria) di atas kertas nilai — keduanya menyatu jadi satu lembar dengan chip mono `rubricHash` tercetak di kakinya.
2. **Papan umum** = deretan blok datar bersambung (rantai), tiap blok membawa chip status **ikon + kata**:
   hijau `✓ valid`, merah `✕ revoked`, jingga `! issuer delisted`.
3. **Pintu terbuka** datar dengan ikon tautan (rantai) di daunnya; tiga figur ikon (recruiter, sekolah, siapa saja)
   lewat tanpa kunci; chip `no account`.

Ketiganya berdiri di satu garis dasar `#2b313a`, kiri → kanan, bayangan datar, tanpa kotak kartu.

## Gerak

- **Masuk:** stempel jatuh lalu **squash** (memipih, memantul) — tanpa layar bergetar; chip papan menyala berurutan;
  daun pintu berayun terbuka (skala X datar).
- **Terus:** chip papan bergantian berdenyut skala 1 → 1,05 (bukan kilat); figur berjalan melewati pintu dalam loop.
- **Ke slide 04:** wipe lingkaran emas datar (babak: produk).

## Catatan pembicara (±20 dtk)

> We are not here to fix course quality — we fix the proof layer. Three things stay true at once: the grading rules
> are sealed together with the result; the status of a credential lives in a public record on BNB Chain; and checking
> it is free, instant, and needs no account.

## Sumber

[[00-Overview/08 - Submission Copy]] (Problem, paragraf terakhir); `rubricHash` = `web/src/manifest.ts` `rubricHashOf()`;
`statusOf` = `contracts/CredentialResolver.sol`; "issuance pipeline the public can audit" = `00-Overview/01 - Briefing.md`.
Kata "quietly" lebih tepat daripada "can't be changed" — rubrik boleh direvisi untuk angkatan berikutnya (hash baru).
