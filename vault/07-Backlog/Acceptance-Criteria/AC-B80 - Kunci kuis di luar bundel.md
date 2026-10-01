---
tags: [acceptance-criteria, B80]
status: active
updated: 2026-10-01
---

# AC-B80 - Kunci jawaban kuis keluar dari bundel browser

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B80 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis)]] ·
**Summary:** [[08-Results/B80 - Executive Summary]] · **Keputusan:** D56 di [[00-Overview/03 - Decisions]]

Kriteria baris B80 sendiri: *"Ambil kunci dari manifest publik (mis. `/grade` mengembalikan `correct` per soal hanya
setelah penyerahan, dan halaman menampilkan alasannya pasca-serah)"*, ditambah tujuh hal yang menurut catatan 30 Sep
"tidak boleh rusak". Builder memilih jalur ini (Opsi 1) pada 1 Okt.

| # | kriteria | asal | status | bukti |
|---|---|---|---|---|
| AC-B80#1 | bundel browser **tidak** memuat kunci (`answer`, `why`) | baris B80 | **PASS** 1 Okt | bundel dari kode ini: 0/28 teks `why`, 0 literal `answer:<angka>` — JS dan source map; sebelumnya 28/28 dan 28 di bundel yang tayang |
| AC-B80#2 | pemindainya bisa merah (kontrol positif + negatif) | AGENTS #14 | **PASS** 1 Okt | teks soal 28/28 terbaca pemindai; bundel Vercel lama → `KUNCI KUIS MERAH 33 / 2` |
| AC-B80#3 | `rubricHash` kertas yang sudah terbit **tidak bergeser** | catatan B80 (2), (7) | **PASS** 1 Okt | kedua kursus = HEAD `8db10ce` dan = `rubricHash` dokumen criteria di tepi |
| AC-B80#4 | hash tidak bisa berubah diam-diam kalau kunci hilang | catatan B80 (6a) | **PASS** 1 Okt | `canonicalPolicy`/`manifestHashOf` atas manifest publik **melempar**; `quiz.js` menolak menilai tanpa kunci |
| AC-B80#5 | konstanta `rubricHash` terbit tidak bisa melenceng dari kunci | catatan B80 (6b) | **PASS** 1 Okt | `manifest-keys.ts` melempar saat dimuat kalau beda; kontrol negatif: satu kunci diubah → hash ≠ terbit |
| AC-B80#6 | `/grade` membalas **benar/salah + alasan per soal** sesudah penyerahan, tanpa indeks jawaban | baris B80, Opsi 1 | **PASS** 1 Okt | `review` = `{itemId, correct, why}` saja; balasan tanpa field `answer` |
| AC-B80#7 | halaman menampilkan pembahasan dari balasan server | baris B80 | **PASS** 1 Okt | `lms.ts` memakai `review`; probe web: pembahasan dari balasan, butir berbentuk salah dibuang |
| AC-B80#8 | tidak ada berkas browser yang mengimpor kunci | usulan B80 | **PASS** 1 Okt | penjaga impor di harness; source map tanpa `manifest-keys.ts`/`*.keys.ts` |
| AC-B80#9 | yang "tidak boleh rusak" tetap hijau | catatan B80 (7) | **PASS** 1 Okt | `rubric` 17/0 · probe web 88/0 · `verify:attempts` 39/0 · `verify:db` 70/0 · baterai `sync:numbers` (lihat T39) |
| AC-B80#10 | berkas milik pemilik front-end tidak disentuh | AGENTS #10 | **PASS** 1 Okt | `main.ts`, `render.ts`, `index.html`, `style.css`, `i18n.ts` tidak berubah; `main.ts` tetap memanggil `rubricHashOf`, yang kini membaca nilai terbit |
| AC-B80#11 | bundel yang **tayang** di Vercel bersih | — | **diukur sesudah dorong** | lihat bagian "Sesudah deploy" di T39 |
| AC-B80#12 | kuis tidak bisa ditebak lewat ulangan | — | **DI LUAR CAKUPAN** — pembahasan per soal + ulangan tak terbatas tetap membocorkan kunci pelan-pelan; butuh batas usaha atau penundaan pembahasan (keputusan produk) | D56 |
