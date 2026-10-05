---
tags: [acceptance-criteria, B121]
status: active
updated: 2026-10-01
---

# AC-B121 - Slot praktik dinilai dari chain, bukan dari laporan peserta

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B121 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] (🟡 core selesai, baris TERBUKA) · **Testing:** [[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]] ·
**Summary:** [[08-Results/B121 - Executive Summary]] · **Keputusan:** D55 di [[00-Overview/03 - Decisions]]

Kriteria baris B121 sendiri: *"praktik punya jalur dinilai yang bukan laporan peserta (mis. bukti yang bisa
diperiksa: hash transaksi di chain 97 yang dibaca server, sesuai isi lesson praktiknya) **dan** halaman
belajar memanggilnya; `verify:attempts` membuktikannya lewat HTTP."* Bagian pertama dan ketiga lulus;
bagian kedua milik fase FE — karena itu barisnya tetap terbuka.

| # | kriteria | asal | status | bukti |
|---|---|---|---|---|
| AC-B121#1 | usaha praktik lahir dari **bacaan chain** yang dilakukan server, bukan dari angka peserta | baris B121 | **PASS** 1 Okt | `POST /praktik` + `signer/src/praktik.js`; 4 jenis bukti, tiap jenis punya jalur 422 dan 201 (T38 bagian C–F) |
| AC-B121#2 | jenis buktinya **ditulis penerbit di lesson**, sesuai isi lesson | baris B121 | **PASS** 1 Okt | `lesson.proof` di `web/src/courses/web3-dasar.ts` (3 lesson) dan `web3-lanjut.ts` (1); blok kode Praktik 3 = tiga `reads` yang diperiksa |
| AC-B121#3 | `POST /attempts` tidak lagi menerima skor praktik (fail-closed seperti esai di B81) | usulan B121, disetujui builder | **PASS** 1 Okt | praktik → 400 menunjuk `POST /praktik`; **ditemukan sambil mengerjakan**: kuis dan esai juga masih diterima → kini 400 ke `/grade` / `/essay` |
| AC-B121#4 | `fromAttempts` hanya mengisi slot praktik dari komponen yang dinilai chain | usulan B121 | **PASS** 1 Okt | `verify:attempts` 39/0: fixture laporan peserta (komponen mekanis) → slot kosong + catatan B121 |
| AC-B121#5 | server **bukan kunci jawaban**: jawaban salah tidak dibalas nilai yang benar | usulan B121 (pelajaran B80) | **PASS** 1 Okt | 422 hanya berisi nama pemeriksaan; harness memeriksa keluaran benar tidak muncul di balasan |
| AC-B121#6 | satu transaksi / satu dompet hanya bisa dipakai satu peserta | usulan B121 | **PASS** 1 Okt | `praktik_proofs.proof_key` unik (migrasi 0011); peserta kedua → 409 tanpa usaha |
| AC-B121#7 | dompet latihan **diikat** ke peserta lewat tanda tangan dompet itu | usulan B121 | **PASS** 1 Okt | pengikat ditandatangani kunci lain → 401; dompet sah yang bukan pengirim transaksi → 422 `tx-sender` |
| AC-B121#8 | `verify:attempts` membuktikannya **lewat HTTP** | baris B121 | **PASS** 1 Okt | lapis `--live`: `/attempts` praktik → 400, `POST /praktik` → 201 (3 pemeriksaan), kertas `0x372c2518…` terbit; dokumen hasil di tepi: komponen praktik `gradedBy chain` (bagian h diulang 16/16 sesudah crash `publish:edge`, T38) |
| AC-B121#9 | kertas yang sudah terbit tidak bergeser | AGENTS #8 | **PASS** 1 Okt | `rubricHash` dan `manifestHash` kedua kursus = HEAD sesudah `proof` ditambahkan |
| AC-B121#10 | **halaman belajar memanggil `POST /praktik`** | baris B121 | ~~**BLOCKED** — fase FE / kata builder~~ **PARTIAL 5 Okt** — formulir bukti `eth-call` ada sejak B157 (empat lesson); `balance` / `tx-receipt` / `allowance` belum punya formulir | OI-20 di [[10-Contributors/Open-Items-for-Dave]] · [[07-Backlog/Acceptance-Criteria/AC-B157 - Formulir praktik eth-call]] · [[09-Testing/T86 - Uji peramban formulir praktik eth-call (B157)]] |
| AC-B121#11 | aturan bukti ikut `rubricHash` | usulan B121 butir terbuka | **BLOCKED** — keputusan builder (D55) | memasukkannya = versi rubrik baru, hash kertas lama tidak boleh bergeser diam-diam |
