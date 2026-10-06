---
tags: [acceptance-criteria, B172]
status: active
updated: 2026-10-06
---

# AC-B172 - Halaman Admin: ringkasan platform, jejak keputusan, kesehatan sistem

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B172 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T96 - Uji peramban halaman Admin ringkasan jejak kesehatan (B172)]] · `verify:publisher` grup G ([[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]]) ·
**Summary:** [[08-Results/B172 - Executive Summary]] · **Keputusan:** D76, D77, D78 · **Terkait:** [[07-Backlog/Acceptance-Criteria/AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit]]

Builder 6 Okt malam, setelah melihat halaman Admin hanya berisi persetujuan: "Gas tambahin ringkasan, jejak, dll itu" dan "Gunakan MCP FE yang udah ada untuk
mempercantik pagenya admin". Semua tambahan **hanya-baca**: satu-satunya yang menulis tetap keputusan keanggotaan yang ditandatangani admin (D76).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B172#1 | `POST /admin/overview` (pesan `lencana-admin overview`, admin saja) menjawab satu permintaan bertanda tangan dengan `summary`, `trail`, `health`, `unavailable` di samping `requests` dan `members` yang lama | **PASS** 6 Okt malam | `verify:publisher` grup G (T52) |
| AC-B172#2 | **ringkasan** = angka yang sama dengan dasbor Penerbit (`overview()`), tanpa baris harness kecuali diminta: anggota aktif/menunggu, kursus, peserta unik, pendaftaran berbayar/gratis, uang (kotor, bagian Lencana dari chain, bersih, tagihan agen), esai per tahap, agen dikenal/sewa/pengesah; uang berupa string satuan terkecil | **PASS** 6 Okt malam | grup G; T96 langkah 1–3 (data nyata: 8 kursus, 10 peserta, 13 pendaftaran, kotor 27 LDC-demo, bagian Lencana 10%) |
| AC-B172#3 | **jejak** = pengajuan, hibah, penolakan, pencabutan, terbaru dulu, baris uji disaring bawaan; penandatangan **dipulihkan** dari pesan + tanda tangan tersimpan (peran `admin` / `publisher` / `self` / `other`), bukan dibaca dari kolom; pesan yang diubah sesudah ditandatangani bukan lagi milik admin | **PASS** 6 Okt malam | grup G (5 cek, termasuk `buildTrail` dengan pasangan asli vs pesan diubah); T96 langkah 4–5 |
| AC-B172#4 | **kesehatan** = status database, RPC chain (ms), saldo deployer (+ ambang rendah 0,02 tBNB), kuota faucet/gas/mint, paywall, jumlah admin, waktu server mulai; hanya kunci yang dijanjikan — tanpa kunci rahasia, alamat admin, atau IP | **PASS** 6 Okt malam | grup G (cek bentuk + kebocoran); T96 langkah 6 |
| AC-B172#5 | satu bagian yang gagal dibaca tidak menjatuhkan daftar persetujuan: dibentuk lewat `Promise.allSettled`, bagian gagal = `null` dan namanya masuk `unavailable`; halaman menampilkan "bagian ini tidak terbaca" saja | **PASS (dibaca di kode)** — belum ada uji otomatis yang memaksa satu bagian gagal | `signer/src/server.js` (`adminSummary`, `adminHealth`, `allSettled`) |
| AC-B172#6 | akun bukan admin tidak mendapat ringkasan, jejak, maupun kesehatan (403 sebelum tanda tangan dipakai, tanpa kunci `summary`/`trail`) | **PASS** 6 Okt malam | grup G |
| AC-B172#7 | halaman `#/app/admin`: empat tab (Ringkasan · Persetujuan [lencana jumlah] · Jejak · Kesehatan; `role=tablist`, panah kiri/kanan), bentuk data = geometri (bar bertumpuk untuk pendaftaran, uang, alur esai; gauge melingkar untuk saldo dan kuota; garis waktu untuk jejak; kartu statistik dengan penghitung angka), keputusan Setujui/Tolak/Cabut tetap berfungsi, ponsel 390 px tanpa gulir samping, 0 galat konsol | **PASS** 6 Okt malam (peramban lokal, signer lokal berkode baru, data nyata) | T96 |
| AC-B172#8 | acuan visual dari MCP FE (21st.dev: kartu statistik, garis waktu aktivitas, bar status; Magic UI: gauge melingkar, penghitung angka) dibangun ulang dengan TypeScript + CSS polos; tidak ada React atau paket baru | **PASS** 6 Okt malam | `web/src/pages/admin.ts`, `admin-dash.css` |
| AC-B172#9 | gerbang | **PASS** 6 Okt malam | `tsc` 0, `build` 0, `probe` 267/0, `verify:publisher` **97/0**, `check:labels` hijau, `audit` bersih; baterai penuh ulang sesudah dorongan |
| AC-B172#10 | LIVE: sesudah dorongan, akun admin membuka `#/app/admin` dan keempat tab terbaca di produksi | **TERBUKA** | uji builder sesudah dorongan: masuk sebagai shenhan604@gmail.com, buka `https://lencana-psi.vercel.app/#/app/admin` |

**Batas klaim:** jejak adalah keputusan **terakhir per akun** — tabel `publisher_members` menyimpan satu baris per anggota, jadi hibah ulang menimpa yang lama
(dinyatakan di halaman); bukan log audit append-only. Ringkasan tidak memuat jumlah kredensial terbit (tidak ada tabelnya di database; kredensial lahir di chain dan
tepi). Ambang saldo rendah 0,02 tBNB adalah pilihan saya, belum dikonfirmasi builder. Satu admin sementara; tidak ada pemulihan admin selain mengganti variabel server.
