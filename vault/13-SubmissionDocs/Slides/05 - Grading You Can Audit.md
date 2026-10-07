---
tags: [slides, deck, B175]
slide: 5
---

# 05 - Grading You Can Audit

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/04 - Learner Journey]] · **Berikutnya:** [[13-SubmissionDocs/Slides/06 - Signed and Anchored]]

**Tujuan:** sisi *AI Agents*: agen AI menilai, tapi tidak bisa memutuskan sendiri — dan itu terlihat.

## Di layar (teks persis)

- Judul: **AI proposes. A *second key* approves.**
- Alur di atas sabuk esai (dasbor Penerbit, B174), dengan label:
  - **Grading agent** `ERC-8004 #2534` — hired per job · runs its owner's own AI model
  - **Proposal** `98` (amber) — *a proposal, not a grade*
  - **Reviewer agent** `ERC-8004 #2542` — appointed by the publisher, not the proposer
  - Stempel hijau **APPROVED** → counts
- Baris bawah: *The publisher's key signs the credential. Agents never do.*

## Visual (benda inti)

Ilustrasi datar (§2 hub). **Sabuk esai B174 digambar ulang besar** dari `web/src/pages/essay-belt.ts`: baki kertas →
**robot pengusul** (rupa agen #2534 dari berkas registrasinya, digambar `robotSvg()`; acuan tampilan `owner2534-look.png`)
dengan chip `ERC-8004 #2534` → **meja stempel** dengan **robot peninjau** #2542 yang memegang **kunci kedua** (ikon kunci
emas datar) → tong. Kertas esai melompat ke robot, keluar kertas bernilai dengan chip jingga `98 · proposal`, lalu stempel
hijau **APPROVED** turun di meja. Di ujung kanan, ikon **kunci penerbit** menandatangani kredensial — terpisah jelas dari
kedua robot. Cincin fokus datar: jingga di stasiun robot, hijau di meja stempel.

## Gerak

- **Masuk:** kertas melompat melengkung ke robot (*motion path*), lampu antena robot berkedip ("berpikir"), chip 98 *pop*.
- **Micro-beat:** stempel turun dan **squash** di meja, kata APPROVED miring −12°.
- **Terus:** belang sabuk berjalan, stempel menekan berkala (`eb-press` 2,8 dtk).

## Catatan pembicara (±25 dtk)

> Essays go to AI grading agents, each with its own on-chain identity on ERC-8004. But an agent only proposes a score.
> It counts once a second reviewer, appointed by the publisher, approves it — and only the publisher's key signs the
> credential. Agent owners bring their own AI model, and get hired per job.

## Sumber

Cheat-Sheet: angka model = **usulan** sampai kunci kedua yang ditunjuk penerbit menandatangani (B104/B120 — jangan tulis
"disahkan manusia"/"mentor"); ERC-8004 #2534/#2542 (B118 F1, D54 — **jangan** sebut reputasi); sewa per aktivitas (B119);
otak agen + API key tetap di peramban (B135). Aset: `web/src/pages/essay-belt.ts:92`, `web/src/robot.ts:70`; sisipan
opsional `pub-essays.png`.
