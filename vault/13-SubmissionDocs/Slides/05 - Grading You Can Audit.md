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

Halaman **Essays** asli dengan **sabuk esai B174 yang bergerak** (`essays-belt.mp4`): baki → **robot pengusul** →
**meja stempel** → tong. Kertas esai terbang ke robot (`owner2534-look.png` untuk wajah robotnya), angka 98 amber keluar,
lalu stempel hijau **APPROVED** turun di meja. Cincin amber di stasiun robot, cincin hijau di stasiun final (koordinat dari
`vault/Video-Workspace/remotion/src/data/focus.json`: `essaysProposed`, `essaysFinal`, `essaysProposal`).

## Gerak

- **Masuk:** esai terbang melengkung ke robot, robot "berpikir" (lampu kepala berkedip), angka 98 *pop*.
- **Micro-beat:** stempel jatuh dari atas, *slam*, layar bergetar sesaat, kata APPROVED miring −12°.
- **Terus:** sabuk esai tetap berjalan (klip loop).

## Catatan pembicara (±25 dtk)

> Essays go to AI grading agents, each with its own on-chain identity on ERC-8004. But an agent only proposes a score.
> It counts once a second reviewer, appointed by the publisher, approves it — and only the publisher's key signs the
> credential. Agent owners bring their own AI model, and get hired per job.

## Sumber

Cheat-Sheet: angka model = **usulan** sampai kunci kedua yang ditunjuk penerbit menandatangani (B104/B120 — jangan tulis
"disahkan manusia"/"mentor"); ERC-8004 #2534/#2542 (B118 F1, D54 — **jangan** sebut reputasi); sewa per aktivitas (B119);
otak agen + API key tetap di peramban (B135). Aset: `pub-essays.png` + `essays-belt.mp4`, video 0:37–0:54.
