---
tags: [results, executive-summary, B157]
status: active
updated: 2026-10-05
---

# B157 - Executive Summary — formulir praktik di halaman kelas (bukti eth-call)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B157 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B157 - Formulir praktik eth-call]] ·
**Testing:** [[09-Testing/T86 - Uji peramban formulir praktik eth-call (B157)]] · **OI:** OI-20 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- `web/src/learning.ts`: `ethCallAnswers` (bentuk isian → `answers.results`; hanya memeriksa bentuk), `submitPraktik` (tanda tangan peserta, `POST /praktik`,
  tanda terima dari server), `praktikRejection` (kalimat penolakan Indonesia: jumlah + NAMA pemeriksaan yang gagal, tanpa nilai benar).
- `web/src/pages/class.ts`: `praktikHtml` — lesson praktik berbukti `eth-call` mendapat formulir (satu kolom per pembacaan, "Kirim bukti", catatan "Batas yang jujur");
  aksi `submit-praktik`: validasi bentuk → kirim → lulus: lesson ditandai selesai (B160) dan "Bukti diterima — dinilai chain 97"; salah: nama pemeriksaan; jenis bukti lain tetap
  catatan lama (kalimatnya diperjelas).
- `web/src/pages/class.css`: gaya formulir (kolom heksadesimal, status yang membungkus, nama pemeriksaan tidak pecah).
- `web/scripts/probe.ts`: grup B157, 13 pemeriksaan. `web/src/content.ts`: teks penanda B121 diperbarui (komentar saja).
- **Tidak** disentuh: server, database, aturan penilaian, rubrik, penerbitan.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| peserta menyerahkan bukti praktik `eth-call` dari halaman | tidak ada jalannya (OI-20); nilai akhir akun builder `BELUM_LENGKAP` | formulir tiga kolom → `POST /praktik` → usaha bernilai chain (T86 langkah 6) |
| jawaban salah | — | hanya jumlah + nama pemeriksaan yang gagal; nilai benar tidak muncul (T86 langkah 5; pemeriksa server tidak membocorkannya, langkah 1) |
| angka dari klien | — | tidak ada: isi permintaan hanya `learner`, `course`, `lesson`, `answers.results`, `message`, `signature` (`probe`) |
| keluaran mentah yang akan ditempel | belum pernah diperiksa | diterima pemeriksa server terhadap chain 97 sungguhan: 3 pemeriksaan benar (T86 langkah 1) |
| lesson praktik jadi selesai di penerbit | hanya "Tandai selesai" (bukan nilai) | otomatis sesudah bukti diterima (B160); pulih lewat "muat ulang" bila gagal (T86 langkah 7, 8) |
| `tsc` · `probe` · `build` | 0 · 134/0 · 0 (sesudah B160) | 0 · 147/0 · 0 |

## 3. Status

~~**SELESAI di kode (tahap 1), belum LIVE** — commit lokal; dorongan FE menunggu kata builder.~~ **SELESAI (tahap 1) · LIVE** — didorong `1a2df2e..6a865cc` atas kata builder (5 Okt 15.14 WIB); bundel Vercel `assets/index-CIcJcqoE.js` memuat "Kirim bukti praktik", `lencana-praktik-submit`, "Bukti diterima" dan "Isi keluaran" (dibaca sesudah dorongan); workflow `deploy-signer` run `37282435768` sukses. ~~Bukti dari akun builder sungguhan belum ada (AC-B157#13 **PARTIAL**).~~ **Bukti dari server sungguhan ada (5 Okt malam, AC-B157#13 PASS):** usaha `praktik` #1019 (`praktik-baca-koin`, 100, `pass`) tercatat 09:36:48Z untuk enrollment #580, `praktik_proofs` #267 (`eth-call`, chain 97, blok 134991214); gerbang penerbitan membacanya "dinilai chain (3 pemeriksaan cocok)". Keluaran yang ditempel disediakan asisten atas permintaan builder — uji alur, bukan bukti belajar (batas klaim di AC-B157).
Baris **B121 tetap TERBUKA** (tiga jenis bukti lain belum punya formulir).

## 4. Risiko tersisa

- Jawaban `eth-call` bisa disalin — batas yang ditulis server dan formulir. Lulus = "bisa membaca kontrak", bukan "mengerjakan sendiri".
- Uji peramban memakai penerbit tiruan; hanya keluaran mentah yang diuji ke pemeriksa server sungguhan, tanpa database (T86 §Batas).
- Tahap 2 (`balance`, `tx-receipt`, `allowance`) butuh dompet latihan kedua yang menandatangani pengikatan; belum dikerjakan. Teks penanda B121 di berkas `signer/`
  (`praktik.js`, `server.js`, `db.js`, `fromAttempts.js`, `praktik-check.js`) tidak diubah — ia menyebut "halaman belajar belum memanggil POST /praktik", yang kini hanya benar
  untuk tiga jenis bukti itu.

## 5. Bukti

T86 langkah 1–11; `probe` grup B157 (13 pemeriksaan); `web/src/learning.ts` (`submitPraktik`, `ethCallAnswers`, `praktikRejection`), `web/src/pages/class.ts` (`praktikHtml`, aksi `submit-praktik`).
