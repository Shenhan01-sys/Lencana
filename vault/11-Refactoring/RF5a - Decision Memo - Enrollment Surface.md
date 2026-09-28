---
tags: [decision-memo, enrollment, frontend, "B58"]
status: open — needs the builder's call
updated: 2026-09-28
---

# RF5a — Memo: permukaan enrollment sebelum FE dibangun

**Ringkas:** core kita tidak punya akun peserta, enrollment, atau penyimpanan jawaban (**B58**). Front-end
yang "jadi produk" akan menyimpan state yang backend-nya tidak punya. Ini tiga opsi, biayanya, dan mana
yang boleh kita klaim. **Kalau tidak ada keputusan sebelum video direkam, kami jalan dengan Opsi A** —
karena itu satu-satunya yang tidak membuat submission kita mengklaim hal yang belum ada.

## Fakta yang mengikat

| | |
|---|---|
| Waktu | tenun kerja tersisa **2 hari** (tenggat 30 Sep 23:59 WIB) |
| Yang sudah aman dijalankan FE nanti | seluruh jalur inti: terbit → sajian → verifikasi → artefak → cabut. Hijau hari ini: `journey 34/0`, `e2e 42/0`, `verify:edge 5/0` |
| Yang tidak ada | `POST /enroll`, `POST /attempts`, penyimpanan peserta/progres di `signer/`. Dicek 28 Sep: satu-satunya "akun" adalah **kunci peserta yang diturunkan di dalam skrip uji** |
| Yang sudah kita larang untuk diri sendiri | "publishers can join"; progres localStorage **diberi label bukan-bukti** di `03-Frontend`; hasil uji yang tidak dihitung (OI-13) |

## Opsi A — "Lencana = lapis bukti, bukan LMS" (default, 0 baris kode)

FE tetap seperti sekarang: permukaan verifikasi + katalog penerbit. Issuance terjadi lewat jalur nyata
(`npm run issue` / API penerbit), bukan lewat tombol daftar.

- **Boleh diklaim:** "setiap ijazah yang keluar dari sini bisa diperiksa orang tanpa menghubungi kami".
- **Tidak boleh diklaim:** "pengajar memakai platform ini untuk menjalankan kelas".
- **Yang harus dibersihkan supaya tidak terbaca sebagai teater:** `btnEnroll` (ada label, tanpa handler),
  tombol "14/14 Uji Lolos (12ms)" (OI-13), dan 20 tautan `lencana.io` (OI-6). Semuanya berkas pemilik
  front-end; patch sudah ditawarkan, bukan kami sunting.
- **Harga:** nol. **Risiko:** nol — kecuali kita lupa menyingkirkan tombol mati itu dari layar video.

## Opsi B — permukaan core minimal: enrollment + attempts (~0,5 hari)

Tambah di `signer/`: `POST /enroll {courseId, learner}` → baris store; `POST /attempts` → nilai kuis
per soal + esai + penyelesaian praktik, dengan `attemptHash`; `issue.js` bisa mengambil bukti dari
**rekaman**, bukan dari argumen CLI (`--from-attempts`). Setelah itu FE bisa belajar melawan backend yang sungguh ada, bukan melawan localStorage.

- **Ditambah yang boleh diklaim:** "peserta mengerjakan soal **di dalam sistem**, dan kertas
  direbitkan dari rekaman itu" — dan ini **menambah** bobot klaim terkuat kita, karena bukti nilai tidak
  lagi datang dari pengetikan operator.
- **Mengapa ini yang benar untuk jangka panjang:** RF5 bilang tanpa enrollment tidak ada yang bisa
  dibayar → jalur x402 hari ini tidak punya objek bayar. Enrollment adalah objek itu.
- **Biaya nyata:** satu setengah hari kerja + harness + dokumen. Kalau dipotong, yang terjadi bukan
  "sedikit belum selesai" melainkan **state yang cuma ada di browser** — persis kegagalan yang kita jual
  sebagai pembeda LMS.
- **Risiko untuk submission:** setengah jadi lebih buruk daripada tidak. Kalau memilih ini, kerjakan
  **sebelum** video, dan `npm run journey` harus lulus lewat HTTP (bukan argumen CLI) — itu penandanya.

## Opsi C — enrollment ikut di-attest di BAS

Koheren paling indah ("belajar juga on-chain"), tapi biaya schema + whitelist + anchor baru, dan ia
mengubah bentuk dokumen yang **hari ini lolos validator pihak ketiga**. Keluar jendela. Bukan sekarang.

## Rekomendasiku

**A untuk submission; B sebagai jalur yang sketsanya kita tulis hari ini.** Artinya: di video dan form
kita tunjukkan lapis bukti yang jalan (bukan tombol daftar), dan di slide "roadmap" kita tunjukkan
jahitan yang akan dijahit backend — `POST /enroll` + `POST /attempts` + `--from-attempts` — sebagai
rencana yang bentuknya sudah jelas, bukan sebagai fitur yang sudah ada. Itu menjaga satu hal yang
paling sulit dibangun di hackathon: **tidak ada satu kalimat pun di submission ini yang tidak bisa
diulang hakim dari clone.**

## Yang kami butuh darimu

Satu kata: **A**, **B**, atau **A-sekarang-B-setelah-hackathon**. Kalau tidak ada jawaban sebelum
rekaman, kami kunci A dan memotong semua elemen UI yang menyiratkan enrollment.

**Related:** [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[11-Refactoring/RF6 - Core System, Backend and Contracts]] · [[09-Testing/T20 - signer journey.js]] · [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · [[10-Contributors/Claims-Cheat-Sheet]]
