---
tags: [testing, "T39"]
status: active
updated: 2026-10-04
command: npm run verify:quizkeys · npm run verify:quizkeys -- --deployed=<url halaman>
measured: 2026-10-04 (baterai sync:numbers 33/33 hijau); run di bawah halaman ini 2026-10-01
result: KUNCI KUIS HIJAU — 66 pemeriksaan / 0 gagal (baterai sync:numbers 4 Okt, sesudah B141) · koreksi 4 Okt, nilai 3 Okt — KUNCI KUIS MERAH — 66 pemeriksaan / 6 gagal — dulu dijelaskan "menunggu npm run publish:edge oleh builder"; penjelasan itu salah — publish:edge tidak pernah menerbitkan criteria kursus tanpa kredensial, diperbaiki di B141 · koreksi 3 Okt, nilai lama yang tadinya tertulis di sini — KUNCI KUIS HIJAU — 30 pemeriksaan / 0 gagal (1 Okt, dua kursus; bundel dibangun dari kode ini) · kontrol negatif terhadap bundel yang masih tayang di Vercel sebelum deploy ulang: MERAH 33 / 2 gagal (28 dari 28 teks why, 28 literal answer) · sesudah deploy 16:32 dengan --deployed: HIJAU 33 / 0 (0 dari 28)
---

# T39 - signer quiz-keys-check.js — B80: kunci jawaban kuis tidak lagi sampai ke browser

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B80 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B80 - Kunci kuis di luar bundel]] · **Summary:** [[08-Results/B80 - Executive Summary]] ·
**Keputusan:** D56 di [[00-Overview/03 - Decisions]] · **Harness tetangga:** `npm run probe` di `web/` (+2 asersi B80),
`npm run rubric` di `web/` (17/0, kini memakai manifest berkunci)

## Sebelum — diukur 1 Okt, sebelum satu baris pun dipindah

Bundel yang tayang di `https://lencana-psi.vercel.app/` (`assets/index-DTmQmZft.js`, 539.133 byte) memuat
**28 dari 28** teks `why` (alasan yang menyebut jawaban benar) dan **28** literal `answer:<angka>` — seluruh kunci
kuis kedua kursus. Sebabnya: `web/src/courses/*.ts` memuat soal **beserta** kuncinya, dan berkas itu diimpor
halaman belajar (`lms.ts` lewat `courses/index.ts`, `manifest.ts` lewat `lms.ts`/`score.ts`/`main.ts`), jadi Vite
membundelnya. `/grade` (B72) sudah memindah *perhitungan* angka ke server; kuncinya tetap terbaca di devtools.

## Yang diubah

| tempat | sebelum | sesudah |
|---|---|---|
| `web/src/courses/web3-dasar.ts`, `web3-lanjut.ts` | soal + `answer` + `why` | soal saja (56 baris dihapus) |
| `web/src/courses/*.keys.ts` (baru) | — | `{ lesson: { soal: { answer, why } } }` — hanya diimpor `manifest-keys.ts` |
| `web/src/manifest-keys.ts` (baru) | — | manifest **berkunci** untuk server/skrip Node; saat dimuat mengaudit kunci dan menolak naik kalau `rubricHash` hitungan ≠ terbit |
| `web/src/manifest.ts` | `rubricHashOf` selalu menghitung | menghitung kalau berkunci; manifest publik membawa `rubricHash` **terbit** (nilai yang sama dengan kertas yang sudah ada); `canonicalPolicy`/`manifestHashOf` **melempar** tanpa kunci |
| 13 berkas `signer/` + `web/scripts/rubric-check.ts` | impor `manifest.ts` | impor `manifest-keys.ts` (satu jalur impor per berkas, lewat skrip yang menolak menulis kalau jalurnya tidak ada tepat satu kali) |
| `signer/src/quiz.js` | kunci dibaca dari manifest bundel-bersama | fail-closed kalau kunci tidak termuat; balasan `/grade` membawa `review: [{ itemId, correct, why }]` |
| `web/src/lms.ts`, `learning.ts` | pembahasan dari `item.answer`/`item.why` di bundel; opsi benar ditandai `data-answer` | pembahasan dari `review` balasan server; pilihan peserta tetap terpilih; opsi yang benar **tidak** ditandai |

Pemindahan kuncinya dibuktikan, bukan dipercaya: skrip pemindah membandingkan tiap pasang `answer`/`why`
yang ia hapus dengan snapshot sebelum perubahan dan **menolak menulis** kalau satu saja beda (kontrol negatif:
snapshot yang dirusak 1 `answer` + 1 `why` → `PEMINDAHAN DITOLAK — 2 masalah, tidak ada yang ditulis`). Sesudahnya
pemeriksaan terpisah: soal + kunci di manifest berkunci **identik** dengan snapshot, dan `rubricHash` + `manifestHash`
kedua kursus **sama dengan HEAD** (`8db10ce`) — **SPLIT HIJAU 16/0**.

## Lapis A–C (`npm run verify:quizkeys`, 1 Okt)

```
— A. kunci lengkap di sisi server, hash tidak bergeser
  ok    kunci dimuat untuk 2 kursus, 28 soal, semuanya berkunci
  ok    web3-dasar-2026: auditAnswerKeys bersih (tiap soal berkunci, dalam rentang, beralasan, tanpa kunci yatim)
  ok    web3-dasar-2026: rubricHash dihitung dari kunci = rubricHash terbit di manifest publik
  ok    web3-dasar-2026: manifest publik (yang dibundel) tanpa answer/why — 24 soal
  ok    web3-dasar-2026: rubricHashOf(publik) memakai nilai terbit, bukan menghitung tanpa kunci
  ok    web3-dasar-2026: canonicalPolicy dan manifestHashOf atas manifest publik MELEMPAR (hash tidak berubah diam-diam)
  ok    web3-dasar-2026: rubricHash dokumen criteria di tepi (komitmen publik) = hitungan dari kunci
  ok    web3-lanjut-2026: auditAnswerKeys bersih (tiap soal berkunci, dalam rentang, beralasan, tanpa kunci yatim)
  ok    web3-lanjut-2026: rubricHash dihitung dari kunci = rubricHash terbit di manifest publik
  ok    web3-lanjut-2026: manifest publik (yang dibundel) tanpa answer/why — 4 soal
  ok    web3-lanjut-2026: rubricHashOf(publik) memakai nilai terbit, bukan menghitung tanpa kunci
  ok    web3-lanjut-2026: canonicalPolicy dan manifestHashOf atas manifest publik MELEMPAR (hash tidak berubah diam-diam)
  ok    web3-lanjut-2026: rubricHash dokumen criteria di tepi (komitmen publik) = hitungan dari kunci
  ok    kontrol negatif: satu kunci diubah -> rubricHash hitungan ≠ terbit (penjaga saat dimuat akan menolak)
  ok    kontrol negatif: audit menangkap soal tanpa kunci, kunci yatim, dan kunci di luar rentang
— B. bundel browser yang dibangun dari kode ini
  ok    npm run build (web) berhasil
  ok    JS: teks soal ada di bundel (kontrol positif pemindai) — 28 dari 28
  ok    JS: teks alasan kunci (why) di bundel — 0 dari 28
  ok    JS: literal answer:<angka> di bundel — 0
  ok    source map: teks soal ada di bundel (kontrol positif pemindai) — 28 dari 28
  ok    source map: teks alasan kunci (why) di bundel — 0 dari 28
  ok    source map: literal answer:<angka> di bundel — 0
  ok    source map tidak memuat manifest-keys.ts atau berkas *.keys.ts
  ok    tidak ada berkas web/src selain manifest-keys.ts yang mengimpor kunci
— C. POST /grade: pembahasan sesudah penyerahan, tanpa indeks jawaban
  ok    /grade kuis-keselamatan: 4/5 benar -> 201, angka dari server
  ok    review: satu butir per soal (5/5), benar/salah sesuai pilihan — hanya soal pertama yang salah
  ok    review membawa alasan untuk tiap soal (pembahasan sesudah penyerahan)
  ok    review TIDAK membawa indeks jawaban: kuncinya hanya {itemId, correct, why}
  ok    balasan /grade tidak memuat field "answer" di mana pun
  ok    dokumen criteria tetap tanpa kunci jawaban, dan rubricHash-nya = hitungan dari kunci
KUNCI KUIS HIJAU — 30 pemeriksaan, 0 gagal
```

Pemindai bundel punya kontrol positifnya sendiri di setiap baris (teks soal **harus** ada — kalau 0, pemindainya
buta, bukan bundelnya bersih). Dua kemunculan teks `.keys.ts` di source map hanyalah **komentar** di
`content.ts` yang menyebut nama berkas itu; daftar `sources` source map tidak memuat berkas kunci.

## Kontrol negatif: bundel yang masih tayang (`--deployed`)

Dijalankan **sebelum** deploy ulang, terhadap bundel Vercel yang lama:

```
— B'. bundel yang sedang tayang di https://lencana-psi.vercel.app/
  info  https://lencana-psi.vercel.app/assets/index-DTmQmZft.js (539133 byte)
  ok    tayang: teks soal ada di bundel (kontrol positif pemindai) — 28 dari 28
  GAGAL tayang: teks alasan kunci (why) di bundel — 28 dari 28
  GAGAL tayang: literal answer:<angka> di bundel — 28
KUNCI KUIS MERAH — 33 pemeriksaan, 2 gagal
```

Itu yang seharusnya: penjaganya bisa merah, dan merahnya menunjuk benda yang benar. Sesudah dorong, pemeriksaan
yang sama diulang terhadap bundel yang baru tayang — hasilnya di bagian berikut.

## Sesudah deploy (1 Okt, commit `243c6c8`)

Vercel menayangkan bundel baru **16:32:18** — `index-DtXy16cc.js`, nama yang sama dengan bundel yang dibangun
lokal dari kode ini (build-nya deterministik). Pemeriksaan yang sama:

```
— B'. bundel yang sedang tayang di https://lencana-psi.vercel.app/
  info  https://lencana-psi.vercel.app/assets/index-DtXy16cc.js (536125 byte)
  ok    tayang: teks soal ada di bundel (kontrol positif pemindai) — 28 dari 28
  ok    tayang: teks alasan kunci (why) di bundel — 0 dari 28
  ok    tayang: literal answer:<angka> di bundel — 0
KUNCI KUIS HIJAU — 33 pemeriksaan, 0 gagal
```

URL bundel lama (`…/assets/index-DTmQmZft.js`) kini dijawab `index.html` lewat rewrite SPA (200, 113.839 byte, tanpa
teks kunci) — berkas JS lamanya tidak lagi tersaji di domain produksi. Yang tidak bisa kuukur dari sini: URL
per-deployment Vercel lama (alamat `*.vercel.app` khusus tiap deployment), yang biasanya tetap hidup.

## Harness lain yang ikut terukur 1 Okt

- `npm run probe` (web): **88/0** — 86 + dua asersi B80: 28 soal yang diimpor halaman tanpa `answer`/`why`, dan
  pembahasan diambil dari `review` balasan `/grade` (butir berbentuk salah dibuang, bukan dipercaya).
- `npm run rubric` (web): **17/0**, kini atas manifest berkunci (uji "kunci diubah = rubricHash berubah" tetap jalan).
- `npm run verify:attempts` **39/0** dan `npm run verify:db` **70/0** — jalur `/grade` dengan kunci dari server.
- Baterai penuh `npm run sync:numbers` (ketiga hari itu, selesai 16:30 — sesudah kejadian di bawah dipulihkan):
  **21 harness, 0 gagal**, termasuk `verify:quizkeys` 30/0 dan `forge test` 65/0; `--verify` **38 klaim** halaman
  cocok; `npm run audit` 12 pemeriksaan · 0 TEMUAN. Selama baterai itu sebuah pemantau memeriksa ketiga
  `node_modules` tiap 2 detik — tidak ada yang hilang lagi.
- `verify:attempts:live` **tidak** dijalankan ulang: lapis itu menerbitkan kertas uji baru, dan perubahannya untuk
  B80 hanya satu jalur impor (kunci dibaca dari `manifest-keys.ts`); `/grade` yang dipakainya dibuktikan lewat HTTP
  di bagian C dan di `verify:db`.

## Satu kejadian di tengah baterai (1 Okt, ±16:08)

Baterai `npm run sync:numbers` pertama sesudah B80 berakhir dengan empat harness **tidak terbaca** —
`verify:agent` (24, 2 gagal), `verify:agents`, `verify:praktik`, `verify:quizkeys` — semuanya
`ERR_MODULE_NOT_FOUND: Cannot find package 'viem' imported from …/web/src/manifest.ts`. Sebabnya bukan kode B80:
**`web/node_modules` hilang di tengah baterai** (probe web dan `verify:deposit` — yang juga mengimpor manifest
berkunci — masih hijau sebelumnya; `verify:agent` lolos 22 pemeriksaan sebelum subproses `admit` gagal). Tidak ada
kode harness yang menghapus `node_modules` (semua `rmSync` rekursif hanya menyasar direktori `mkdtemp`), dan
`git status` hanya memuat perubahanku. Baterai kedua lalu memperlihatkan korban kedua: `forge test` gagal
kompilasi karena **`app/node_modules/@openzeppelin/contracts` juga hilang** (folder `@openzeppelin` berjam ubah
16:08:03 — dua detik sesudah baterai pertama selesai pada 16:08:01; `web/node_modules` baru kubuat ulang 16:09:57).
`.env`, `signer/.keys`, `signer/.store`, `out/`, `cache/`, `broadcast/`, `lib/` diperiksa: **utuh**; `signer/node_modules`
utuh (`npm ls` bersih). **Sebab pastinya tidak diketahui** — log npm di cache sudah terotasi melewati jam itu. Satu
dugaan yang sempat kucurigai dan **tidak cocok dengan buktinya**: siang itu aku membuat *junction*
`scratchpad/node_modules → web/node_modules`; tapi junction itu masih ada (menggantung) sementara targetnya hilang
utuh, dan `app/node_modules` tidak pernah ditautkan — jadi penghapusnya memakai jalur asli. Junction tetap dihapus
(link saja, target diperiksa utuh) karena ia memang bahaya. Pemulihan: dependensi dipasang ulang **persis dari
lockfile** di kedua tempat (`npm --prefix web ci` — hash `package-lock.json` sebelum = sesudah `351c08f2…`; `npm ci`
di akar — `5942f0ef…` = `5942f0ef…`), `forge test` kembali **65/0**, lalu baterai dijalankan ulang dari awal.

## E2E — panduan untuk builder (centang sendiri)

- [ ] `cd app/signer && npm run verify:quizkeys` → `KUNCI KUIS HIJAU — 30 pemeriksaan, 0 gagal`
- [ ] buka halaman yang tayang, devtools → Sources/Network, cari satu kalimat `why` (mis. "Address hanya menunjuk
      tempat") di berkas JS → tidak ketemu; cari teks soalnya → ketemu
- [ ] di `#/course/web3-dasar-2026/l/kuis-keselamatan`, jawab satu soal salah → sesudah "Nilai jawabanku": tiap soal
      bertanda ✓/✗ dengan alasannya, pilihanmu tetap terpilih, dan **tidak ada** opsi yang ditandai benar

| KPI (dari AC) | target | hasil 1 Okt |
|---|---|---|
| kunci tidak ada di bundel | 0 teks `why`, 0 literal `answer` | 0 / 0 (dari 28 / 28 sebelumnya) |
| `rubricHash` kertas yang sudah terbit tidak bergeser | = HEAD dan = criteria di tepi | sama, kedua kursus |
| hash tidak bisa berubah diam-diam | hitung tanpa kunci → melempar | melempar |
| pembahasan sesudah penyerahan | `review` per soal, tanpa indeks jawaban | ya |
| halaman tetap bekerja | probe web hijau | 88/0 |

## Batas

- **Bukan "kuis tidak bisa dicurangi".** Penyerahan boleh diulang dan setiap penyerahan dibalas benar/salah + alasan
  per soal; peserta yang sengaja menebak lewat beberapa usaha bisa menemukan kuncinya. Yang tertutup adalah "kunci
  terbaca sebelum mencoba". Frasa "anti-curang" tetap dilarang `npm run audit` (A3), alasannya diperbarui.
- **`rubricHash` kini tidak bisa dihitung ulang orang luar dari bundel.** Komitmennya tetap mengikat (kunci diubah →
  hash berubah, dan hash lama sudah tercetak di kertas), tapi memeriksanya dari nol butuh kunci. Pembanding publik
  yang tersisa: hash di kertas vs `rubricHash` dokumen criteria/manifest hari ini. Membuka kunci untuk audit =
  keputusan penerbit (D56).
- Kunci yang sudah pernah tayang **tetap pernah tayang**: siapa pun yang menyimpan bundel lama sebelum 1 Okt memegang
  kuncinya. Kunci tidak diganti — menggantinya menggeser `rubricHash` kertas yang sudah terbit.
