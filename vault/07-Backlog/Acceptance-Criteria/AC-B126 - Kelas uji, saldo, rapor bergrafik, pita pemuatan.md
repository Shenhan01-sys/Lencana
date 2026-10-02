---
tags: [acceptance-criteria, B126]
status: active
updated: 2026-10-02
---

# AC-B126 - Kelas uji, saldo, rapor bergrafik, pita pemuatan

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B126 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T48 - Uji peramban kelas uji, saldo, rapor, pemuatan (B126)]] ·
[[09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta)]] · [[09-Testing/T46 - signer paywall-check.js (B125 bayar dulu)]] ·
**Summary:** [[08-Results/B126 - Executive Summary]] · **Keputusan:** D61

Permintaan builder 2 Okt: kelas dummy baru untuk menguji bayar dengan akun sungguhan, UI saldo, halaman Nilai & tugas yang
lebih ramah (grafik + tabel ringkas), dan UI memuat/progress di setiap halaman yang membaca data; FE mengikuti sistem
visual Lencana.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B126#1 | kelas uji `uji-bayar-2026` adalah kursus sungguhan: lolos `auditCourse`, manifest + rubricHash terbit = hitungan dari kunci, kunci kuis di luar bundel browser, harga 5 LDC-demo di satu sumber, tidak tampil di katalog publik tetapi tampil bertanda "kelas uji" di dashboard | **PASS** 2 Okt | `probe` 92/0, `verify:paywall` 24/0 (asersi kelas uji), pemindaian bundel `verify:quizkeys`; T48 langkah 1, 11 |
| AC-B126#2 | bayar → kelas terbuka → dinilai, dengan kelas uji | **PASS** 2 Okt | T48 langkah 5–7: tx settlement `0xe5172ea5…6870` status sukses, kuis dinilai server 50 lalu 100 |
| AC-B126#3 | saldo LDC-demo dibaca dari chain dan tampil di chip navbar, panel bayar, dan Dompet; berubah (bergulir) sesudah koin uji masuk atau pembayaran lunas tanpa muat ulang | **PASS** 2 Okt | T48 langkah 3–6, 8; saldo chain dibaca ulang lewat RPC = angka UI (35) |
| AC-B126#4 | Dompet: tombol koin uji dengan jeda yang terbaca (429 → kapan bisa lagi, tombol berhenti), batang "ke mana koin pergi" = pesanan lunas penerbit + saldo chain, riwayat pembayaran bertautan BscScan | **PASS** 2 Okt | T48 langkah 3, 9, 10 |
| AC-B126#5 | Nilai & tugas: cincin lesson selesai, timbangan kelulusan (poin per komponen terhadap ambang penerbit, bagian tanpa bukti berarsir, segel menyala saat terlampaui), batang skor kuis terbaik per lesson dengan ambang per kuis, tabel ringkas satu baris per tugas, riwayat usaha dilipat | **PASS** 2 Okt | T48 langkah 8 (desktop + ponsel) |
| AC-B126#6 | perkiraan nilai memakai `computeScore` penerbit atas bukti dengan aturan `fromAttempts.js` (usaha terbaik per kuis, esai hanya bila disahkan, praktik hanya bila dinilai chain); disebut "perkiraan", angka resmi tetap angka penerbit saat menerbitkan | **PASS** 2 Okt | `POST /me/records` membawa `chainChecked` (`verify:records` 17/0: kuis bertanda `false`); T48 langkah 8 |
| AC-B126#7 | memuat data: pita emas di tepi atas mengikuti permintaan sungguhan (`window.fetch`: penerbit, RPC chain, login), kerangka berbentuk isi + tahap yang benar-benar dilalui (tanda tangan → penerbit) di dashboard, panel bayar, dan kredensial | **PASS** 2 Okt | T48 langkah 2, 12 (pita menyala 154 ms, 8% → 66%, penuh saat data datang) |
| AC-B126#8 | FE mengikuti sistem visual Lencana (palet emas/gading, angka mono, kartu bergaris tipis); ponsel 500 px rapi; 0 error konsol di EN dan ID | **PASS** 2 Okt | T48 langkah 13–15 |
| AC-B126#9 | gerbang hijau | **TERBUKA** | `tsc`, build, `probe` 92/0, `verify:records` 17/0, `verify:paywall` 24/0 hijau; `verify:quizkeys` 35/1 — satu-satunya merah: dokumen criteria kelas uji belum ada di tepi (#10) |
| AC-B126#10 | dokumen criteria `uji-bayar-2026` terbit di tepi (`npm run publish:edge`) sehingga rubricHash komitmen publik = hitungan dari kunci | **TERBUKA** | kata builder: deploy ke tepi publik memakai token Cloudflare di lingkungan builder (bukan `.env`) |
| AC-B126#11 | login sungguhan → bayar kelas uji dengan dompet tertanam → saldo, Dompet, dan rapor tampil | **TERBUKA** | uji builder (sama dengan AC-B125#11) |

**Batas klaim:** LDC-demo koin uji bermint-terbuka di chain 97; kelas uji adalah alat uji, bukan produk — harga 5 dipilih untuk
menguji, bukan keputusan harga. Perkiraan nilai di dashboard bukan pernyataan kelulusan.
