---
tags: [acceptance-criteria, B157]
status: active
updated: 2026-10-05
---

# AC-B157 - Formulir praktik eth-call

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B157 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T86 - Uji peramban formulir praktik eth-call (B157)]] ·
**Summary:** [[08-Results/B157 - Executive Summary]] · **OI:** OI-20 di [[10-Contributors/Open-Items-for-Dave]] · **Sisi server:** [[07-Backlog/Acceptance-Criteria/AC-B121 - Praktik dinilai chain]]

Sisi FE dari B121: halaman kelas tidak punya jalan untuk menyerahkan bukti praktik ke `POST /praktik`, jadi nilai akhir akun builder di Kelas Uji
`BELUM_LENGKAP` (ditemukan 5 Okt saat menjawab B153). Builder menyetujui rencananya ("Oke beresin semua"). Tahap 1 = bukti `eth-call`; server tidak diubah.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B157#1 | lesson praktik berbukti `eth-call` menampilkan formulir: satu kolom per `reads[].id` (`name`, `symbol`, `decimals`), tombol "Kirim bukti", catatan "Batas yang jujur"; catatan lama "formulir belum ada" tidak tampil di lesson itu | **PASS** 5 Okt | T86 langkah 2 |
| AC-B157#2 | bentuk isian diperiksa sebelum dikirim: kosong, atau bukan heksadesimal `0x…` → pesan dengan nama kolom dan **nol permintaan** | **PASS** 5 Okt | T86 langkah 3, 4; `probe` "isian…" (3 pemeriksaan) |
| AC-B157#3 | pengiriman bertanda tangan peserta (pesan `lencana-praktik-submit course=… lesson=… nonce=…`); isi permintaan hanya `learner`, `course`, `lesson`, `answers.results`, `message`, `signature`; tanpa `score` / `verdict` / `components` / `rubricHash` | **PASS** 5 Okt | `probe` "isi /praktik…", "tidak membawa score…", "pesan menyebut kursus + lesson…" (tanda tangan diverifikasi untuk alamat peserta); T86 langkah 5 |
| AC-B157#4 | jawaban salah → kalimat Indonesia dengan jumlah + **NAMA** pemeriksaan yang gagal, tanpa nilai yang benar; isian tetap; nol tulisan progres | **PASS** 5 Okt | T86 langkah 5; `probe` "penolakan jawaban salah…", "jawaban salah…"; pemeriksa server tidak membocorkan nilai benar (T86 langkah 1) |
| AC-B157#5 | penolakan yang bukan salah jawaban (chain tak terbaca, belum daftar, tanda tangan) memakai alasan server apa adanya, tanpa chip nama | **PASS** 5 Okt | T86 langkah 9; `probe` "penolakan yang BUKAN salah jawaban…", "server tak bisa memeriksa chain (503)…" |
| AC-B157#6 | bukti diterima → "Bukti diterima — dinilai chain 97", jumlah pemeriksaan, blok, hash usaha; lesson ditandai selesai di penerbit (B160) | **PASS** 5 Okt | T86 langkah 6; `probe` "praktik lulus…" |
| AC-B157#7 | gagal mencatat selesai tidak membuang bukti; pulih lewat "muat ulang" dari bukti praktik bernilai chain | **PASS** 5 Okt | T86 langkah 7, 8; `probe` B160 (kind `praktik`, `chainChecked`) |
| AC-B157#8 | keluaran mentah yang akan ditempel **diterima server**: pemeriksa server yang sama (`checkPraktik`) terhadap chain 97 sungguhan | **PASS** 5 Okt — baca-chain saja, tanpa database | T86 langkah 1: 3 pemeriksaan benar; nilai diubah → `failed=["eth-call:decimals"]` |
| AC-B157#9 | jenis bukti lain (`balance`, `tx-receipt`, `allowance`) tidak mendapat formulir palsu; catatan lama tetap, kalimatnya akurat | **PASS** 5 Okt | T86 langkah 10 |
| AC-B157#10 | rapi di 375 px, tanpa luapan horizontal, nama pemeriksaan tidak pecah di tengah kata | **PASS** 5 Okt | T86 langkah 11 |
| AC-B157#11 | server dan database tidak disentuh | **PASS** 5 Okt — dibaca dari `git status`: hanya `web/scripts/probe.ts`, `web/src/content.ts` (komentar penanda B121), `web/src/learning.ts`, `web/src/pages/class.css`, `web/src/pages/class.ts` | — |
| AC-B157#12 | gerbang | **PASS** 5 Okt | `tsc` 0, `probe` 147/0, `build` 0; `npm run audit` bersih dan `check:labels` hijau 8/0 (dijalankan 5 Okt sesudah baris B157 ditutup) |
| AC-B157#13 | akun builder sungguhan: usaha `praktik` bernilai chain tercatat, sehingga komponen praktik terisi dan nilai akhir tidak lagi `BELUM_LENGKAP` karena praktik | **PARTIAL** | T86 memakai penerbit tiruan; bukti dari server sungguhan menunggu builder mengirim dari HP — FE sudah LIVE sejak dorongan `1a2df2e..6a865cc` (5 Okt) |
| AC-B157#14 | tahap 2: `balance` / `tx-receipt` / `allowance` (dompet latihan kedua menandatangani pengikatan) | **BELUM** — di luar baris ini, dicatat satu baris di B157 | `signer/src/praktik.js:52-55` |

**Batas klaim:** `eth-call` membuktikan "bisa membaca kontrak lewat RPC", bukan "mengerjakan sendiri": jawabannya sama untuk semua peserta dan bisa disalin
(batas yang ditulis server dan ditampilkan di formulir). Jangan ditulis "praktik terverifikasi" (OI-20). Kredensial Kelas Uji akun builder tetap dibaca
sebagai uji alur: jawaban kuis, teks esai, dan keluaran praktik disediakan asisten atas permintaan builder.
