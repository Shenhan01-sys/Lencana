---
tags: [testing, "T73"]
status: active
updated: 2026-10-05
command: vite dev + Chromium headless 1440 px dan iframe 375 px; fungsi render dasbor dipanggil lewat impor modul dev server
measured: 2026-10-05
result: LABEL TINGKAT + JENIS LESSON MENGIKUTI BAHASA, TAUTAN BERGAYA DASBOR — EN dan ID benar di beranda, detail kursus, katalog, Ringkasan; saringan tingkat tetap bekerja; 375 px tanpa geser
---

# T73 - Uji peramban label EN/ID dan tautan Susun kursus (B147)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B147 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Asal temuan:** [[09-Testing/T70 - Uji peramban kelola kursus (B140)]]

Pertanyaan yang diuji: sesudah label jenis lesson dan tingkat kursus diambil dari satu peta dua bahasa
(`web/src/lesson-views.ts` `kindLabel` / `levelLabel`), apakah halaman berbahasa Inggris berhenti menampilkan label Indonesia,
apakah mode Indonesia tetap sama persis dengan label lama, dan apakah saringan tingkat di katalog masih bekerja.

## Cara mengulang

1. `cd web && npm run dev` (5173). Halaman publik tidak butuh signer.
2. Bahasa dipilih lewat `localStorage['lencana_lang']` (`en` / `id`), lalu halaman dimuat ulang.
3. Halaman dasbor (`#/app/...`) hanya untuk akun, jadi katalog dan Ringkasan diuji dengan memanggil fungsi render-nya
   langsung lewat impor modul dev server di halaman yang sama: `import('/src/pages/catalog.ts')` lalu
   `renderCatalog(lang, [], undefined)`. Hanya membaca; tidak ada identitas, tidak ada baris database.

## Hasil 5 Okt

| # | halaman | EN | ID |
|---|---|---|---|
| 1 | beranda `#/` — tag kartu kursus | beginner · intermediate · advanced | tidak dilihat di peramban (fungsi yang sama dengan baris 2–5) |
| 2 | detail `#/course/web3-dasar-2026` — badge tingkat | beginner (tampil BEGINNER karena CSS) | dasar |
| 3 | detail — jenis lesson di silabus | reading · quiz · practice · case study · agent-graded essay · reference | bacaan · kuis · praktik · studi kasus · esai dinilai agen · referensi |
| 4 | katalog — chip saring + tag kartu | beginner · intermediate · advanced | dasar · menengah · lanjutan |
| 5 | Ringkasan — kartu rekomendasi | beginner · intermediate | dasar · menengah |
| 6 | katalog — chip "advanced" diklik | 8 kartu → 1 kartu, bertanda advanced (nilai saring tetap `lanjutan`) | — |
| 7 | Susun kursus — `.au-open-link` | warna `rgb(240, 185, 11)`, tanpa garis bawah, aturan garis bawah saat disorot ada; tautan tanpa kelas di halaman yang sama `rgb(0, 0, 238)` (biru bawaan = cacat yang dulu terlihat) | — |
| 8 | detail kursus, iframe 375 px, EN | tidak ada elemen melewati lebar layar; badge "agent-graded essay" di x 187–307 | — |

Mode ID = label lama, kata per kata: peta ID-nya disalin dari `KIND_LABEL` lama, dan `KIND_LABEL` kini diturunkan dari peta yang sama.

**Tidak dilihat di peramban (alasan, bukan klaim):** sambutan dasbor (`pages/dashboard.ts` pilih kursus), Nilai
(`pages/grades.ts`), kartu Kursus Penerbit (`pages/publisher.ts`), ringkasan kelas (`pages/class.ts`), dan kartu belajar
(`lesson-views.ts` `meHtml`). Kelimanya butuh akun atau kursi. Perubahannya sama di setiap tempat (`levelLabel(level, bahasa)`)
dan `tsc` memastikan variabel bahasanya ada.

## Pengamatan (di luar B147, tidak dikerjakan)

Mengganti bahasa lewat tombol EN/ID hanya menggambar ulang landing (`web/src/main.ts:551-555`, berkas inti milik pemelihara
front-end). Halaman detail kursus dan dasbor baru mengikuti bahasa baru sesudah dimuat ulang atau sesudah rute berganti,
termasuk judul seperti "Syllabus", bukan hanya label B147. Ruang kelas sengaja tidak digambar ulang (draf esai), dan itu
tertulis di komentar yang sama.

## Gerbang

`npx tsc --noEmit -p .` 0 · `vite build` lolos (entry 832.41 kB, sebelumnya 831.92 kB) · `npm run probe` **118 / 0** ·
`check:samples` **11 / 0** · `verify:quizkeys` **66 / 0** · `verify:privy` **41 / 0** (5 Okt, dijalankan berurutan).
