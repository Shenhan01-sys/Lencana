---
tags: [slides, deck, B175]
slide: 4
---

# 04 - Learner Journey

**Hub:** [[13-SubmissionDocs/Slides/00 - Konsep dan Gaya Deck]] · **Sebelumnya:** [[13-SubmissionDocs/Slides/03 - The Proof Layer]] · **Berikutnya:** [[13-SubmissionDocs/Slides/05 - Grading You Can Audit]]

**Tujuan:** menjawab track *Consumer Apps*: pengalaman peserta mulus, kripto tidak terlihat.

## Di layar (teks persis)

- Judul: **Rina never sees a *seed phrase*.**
- Empat stasiun di atas sabuk, kiri → kanan (label + baris kecil):
  1. **Sign in with email** — a wallet is created for her (Privy)
  2. **Pick a course** — short courses, in Bahasa Indonesia
  3. **Pay by signing** — two signatures, **zero transactions, no gas**
  4. **Learn and take quizzes** — graded by the publisher's server
- Tag kecil: `LDC-demo = test token on BNB testnet` · `demo publisher (fictional)`

## Visual (benda inti)

Ilustrasi datar (§2 hub). Sabuk belang (bahasa visual FE11) berjalan dari kiri ke kanan dengan empat stasiun. Di atas
tiap stasiun ada **jendela UI datar yang digambar ulang** (bukan tangkapan layar): bilah atas `#181a20` + kotak logo
emas kecil, isinya hanya satu elemen yang sedang dibicarakan, sisanya bilah abu:

1. kolom email (teks mono `rina@…`) + tombol emas; ikon dompet kecil *pop* di sampingnya — *created for her*
2. tiga kartu kursus datar (bilah judul + chip `ID`), satu terangkat
3. tombol emas *Pay & enroll* + **dua coretan tanda tangan** dengan ✓, chip `0 tx · no gas` (ikon pompa bensin dicoret)
4. daftar lesson bercentang hijau + chip kuis `graded by the publisher's server`

Benda di sabuk berganti: **amplop → buku → tiket bertanda tangan → kertas kuis** (benda `HOP` sabuk Admin).

## Gerak

- **Masuk:** sabuk mulai jalan, jendela tiap stasiun *pop* satu per satu mengikuti benda.
- **Terus:** benda melompat antar stasiun (loop, `ln-hopx`), pena menggambar dua tanda tangan (*path draw*) di stasiun 3,
  centang muncul di stasiun 4.
- **Ke slide 05 (Morph):** kertas kuis/esai di ujung sabuk menjadi kertas esai yang terbang ke robot.

## Catatan pembicara (±25 dtk)

> Rina signs in with just her email — a wallet is created for her, she never sees a seed phrase. She picks a course and
> pays by signing: two signatures, zero transactions, no gas. She learns at her own pace, and her quizzes are graded by
> the publisher's server, so scores are never typed in.

## Sumber

Cheat-Sheet baris D57/B82 (email + dompet dibuatkan Privy; jangan tulis "kami tidak pernah memegang kuncimu"), B125
(`web/src/learning.ts:1334`: izin EIP-2612 + saksi Permit2, nol transaksi dari peserta), `POST /grade` (kuis dihitung
penerbit). Jumlah kursus sengaja **tidak** ditulis: briefing menyebut 7 kursus katalog (2 Okt), ringkasan Admin 7 Okt
membaca 8 kursus — kalau mau dicantumkan, cetak ulang dulu (`npx tsx scripts/inventory.ts`, aturan vault #1). Aset: benda
sabuk `web/src/pages/admin-objects.ts:144`; sisipan opsional `login.png`, `course-learner.png`.
