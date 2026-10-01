---
tags: [results, executive-summary, B80]
status: active
updated: 2026-10-01
---

# B80 - Executive Summary — kunci jawaban kuis keluar dari bundel browser

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B80 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B80 - Kunci kuis di luar bundel]] · **Testing:** [[09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis)]]

## 1. Apa yang diubah

- Kunci jawaban kuis (`answer` + `why`, 28 soal) dipindah dari `web/src/courses/*.ts` ke `web/src/courses/*.keys.ts`,
  yang hanya diimpor `web/src/manifest-keys.ts` — manifest **berkunci** untuk server dan skrip Node. Pemindahannya
  lewat skrip yang menolak menulis kalau satu nilai beda dari snapshot sebelum perubahan.
- `web/src/manifest.ts` (yang dibundel) kini membawa `rubricHash` **terbit** per kursus; `rubricHashOf` membaca nilai
  itu untuk manifest publik, dan menolak menghitung `canonicalPolicy`/`manifestHash` tanpa kunci — supaya hash tidak
  pernah berubah diam-diam. `manifest-keys.ts` menolak dimuat kalau hash hitungan ≠ hash terbit.
- Seluruh sisi server (13 berkas `signer/`) mengimpor manifest berkunci; `quiz.js` fail-closed tanpa kunci.
- `/grade` membalas `review` per soal — benar/salah + alasan, **tanpa** indeks jawaban — dan halaman kuis
  (`web/src/lms.ts`) menampilkan pembahasan dari balasan itu, dengan pilihan peserta tetap terpilih.
- `npm run verify:quizkeys` (baru) membangun bundel, memindainya, dan menguji `/grade` lewat HTTP.

## 2. Hasil vs KPI

| KPI | hasil 1 Okt |
|---|---|
| teks `why` di bundel | **0 / 28** (bundel yang tayang sebelum perubahan: 28 / 28) |
| literal `answer:<angka>` di bundel | **0** (sebelumnya 28) |
| `rubricHash` kertas yang sudah terbit | **tidak bergeser** — kedua kursus = HEAD dan = criteria di tepi |
| `npm run verify:quizkeys` | **30/0**; kontrol negatif atas bundel lama yang tayang: MERAH 33 / 2 |
| probe web · `rubric` · `verify:attempts` · `verify:db` | 88/0 · 17/0 · 39/0 · 70/0 |

## 3. Status

**SELESAI** (baris B80 ditutup). Bundel yang tayang di Vercel bersih **sesudah** deploy ulang dari commit ini —
diukur ulang dengan `--deployed` dan dicatat di T39. **Di luar cakupan:** membuat kuis tak bisa ditebak lewat ulangan.

## 4. Risiko tersisa

- Pembahasan per soal + penyerahan ulang tak terbatas: kunci bisa ditebak lewat beberapa usaha. Bukan "anti-curang".
- `rubricHash` tidak lagi bisa dihitung ulang orang luar dari bundel — komitmennya tetap mengikat, verifikasi dari nol
  butuh kunci (D56).
- Kunci yang sudah pernah tayang sebelum 1 Okt tetap ada di tangan siapa pun yang menyimpan bundel lama; kuncinya tidak
  diganti karena itu menggeser `rubricHash` kertas yang sudah terbit.

## 5. Bukti

- Bundel sebelum: `https://lencana-psi.vercel.app/assets/index-DTmQmZft.js` (539.133 byte) — 28/28 `why`, 28 `answer`.
- `rubricHash` terbit: `web3-dasar-2026` `0x2a45d0d00bc46f3dc27a15b7084a70b4471802d43e010862da0fb7d164677fc8`,
  `web3-lanjut-2026` `0xc608de2ada85646653099317957a8f92228b9a0ec7baf6a25b5c549de2a9f76d`.
- Pemindahan kunci: skrip ditolak saat snapshot dirusak (2 masalah), lalu diterapkan; pemeriksaan pisah **16/0**.
