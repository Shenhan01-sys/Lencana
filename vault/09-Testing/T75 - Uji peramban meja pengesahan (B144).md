---
tags: [testing, "T75"]
status: active
updated: 2026-10-05
command: vite dev + signer demo lokal + Chromium headless 1440 px dan iframe 375 px; akun uji pemilik agen #2548 (dompet agen = akunnya); Groq sungguhan untuk otak
measured: 2026-10-05
result: MEJA PENGESAHAN JALAN DARI HALAMAN — sesuaikan (dengan pendapat kedua Groq 99) dan setujui tercatat dengan tagihannya; 375 px tanpa geser; 1 cacat kecil ditutup
---

# T75 - Uji peramban meja pengesahan (B144)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B144 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B144 - Meja pengesahan agen pengesah]] ·
**Harness:** [[09-Testing/T74 - signer review-check.js (B144 meja pengesahan)]] · **Summary:** [[08-Results/B144 - Executive Summary]] ·
**Keputusan:** D73 di [[00-Overview/03 - Decisions]]

Pertanyaan yang diuji: apakah pemilik agen pengesah bisa mengesahkan esai **dari halaman**, tanpa skrip. Alurnya: membaca esai
dan usulan, meminta pendapat kedua dari otak agennya, memutuskan, memilih label, lalu menandatangani dengan dompet agen.
Aturannya dibuktikan `verify:review` (T74); uji ini membuktikan layarnya.

## Cara mengulang

1. `cd web && npm run dev` (5173); `cd signer && LANCENA_ORIGIN=demo npm run serve` (8787).
2. Agen pengesah yang dompetnya = akun pemiliknya. Di run ini **#2548**, yang didaftarkan sendiri oleh akun uji T61; registry
   mencatat pemilik = dompet `0x1D29…8169`, tarif 2000, tanpa otak, sewa, atau penunjukan.
3. Kunci penerbit menunjuknya sebagai pengesah `web3-dasar-2026` (`POST /essay/reviewers` dengan `agentId`).
4. Peserta sekali-pakai menyerahkan esai sungguhan (419 kata) lewat signer penyemai sementara (`LANCENA_ORIGIN=demo` supaya
   tidak tersembunyi sebagai baris uji, `ENROLL_PAYWALL=off`). Agen penilai #2534 mengusulkan **60** (label sedang) lewat
   `POST /essay/judgement`. Semua lewat skrip sekali-pakai di luar repo.
5. Identitas pemilik diserahkan ke halaman lewat server `127.0.0.1` sekali pakai (kunci tidak dicetak). Kunci Groq untuk otak
   diserahkan ke `sessionStorage` halaman dengan cara yang sama, seperti pemilik menempelkan kuncinya sendiri (D69).

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | dasbor Agent Owner `#/app/owner` (ID) | panel **"Agen pengesah #2548 · Meja pengesahan"** muncul di bawah otak agen (agen punya penunjukan) |
| 2 | Buka meja | "1 esai menunggu pengesahan"; sampul map "60/100 · agen #2534 · harness:t75-usulan · sedang"; panel tidak memuat teks `0x` sama sekali |
| 3 | Periksa | teks esai; 5 tanda mekanis (3 lulus; 2 tidak — esai memang tanpa alamat `0x` dan tanpa URL); penggaris usulan + kriteria 15/25 · 15/25 · 15/25 · 9/15 · 6/10, total 60 "tidak lulus (≥ 70)"; catatan "belum punya otak"; tiga cap Setujui / Sesuaikan / Tolak; tangga label dengan bayaran #2548 0,002 … 0,0026 |
| 4 | pasang otak di panel otak #2548 | Groq, daftar model dari endpoint Groq, `openai/gpt-oss-120b`; uji kalibrasi **lulus**: kosong **3**, substantif **100**; ditandatangani + terpasang ("substantif 100 / kosong 3") |
| 5 | Tanya groq/openai/gpt-oss-120b | pendapat kedua **99/100, lulus**, temperature 0; selisih per kriteria 25 (+10) · 25 (+10) · 25 (+10) · 15 (+6) · 9 (+3); penggaris biru di bawah penggaris usulan |
| 6 | Sesuaikan → Isi dari pendapat kedua → ubah "Struktur" 9 → 8 → label Cukup Berat → tanda tangan | **"Disesuaikan · 98 · lulus · 0,0024 LDC-demo bayaran jatuh tempo"**; map ditandai selesai, cap terkunci. Database: `adjusted`, final 98, usulan 60, pengesah = dompet #2548, label `cukup-berat`; skor usaha 98 `pass`; komponen `human` 25/25/25/15/8; tagihan penilaian #2534 2300 *due* + pengesahan #2548 2400 *due* |
| 7 | muat ulang meja | "0 esai menunggu pengesahan" + "Tidak ada yang perlu disahkan …" |
| 8 | esai kedua (#892), iframe 375 px | tidak ada elemen melewati lebar layar; tiga cap jadi satu kolom (263 px); Setujui + Sedang → **"Disetujui · 60 · tidak lulus · 0,0023 LDC-demo bayaran jatuh tempo"** |

**Cacat yang ditemukan uji ini (ditutup):** tautan "Isi dari pendapat kedua" tetap tampil sesudah keputusan terkirim (nomor
inputnya sudah terkunci, jadi tidak berbahaya, tapi menyesatkan). Kini disembunyikan begitu keputusan terkirim.

**Pengamatan (bukan dari B144):** di 375 px, angka bayaran pada anak tangga label yang terpilih terpotong ("0.0023" tampil
"0.002"). Tangga itu komponen panel otak B135 (`.ab-ladder`), dipakai ulang di meja.

## Batas

- Identitas uji memakai kunci perangkat, bukan login Privy builder.
- Cap **Tolak** tidak diklik di peramban. Jalur `rejected` dibuktikan `verify:db` lewat rute yang sama.
- Pendapat kedua memakai Groq sungguhan; angka 99 adalah jawaban model itu atas esai uji, bukan ukuran mutu meja.

## Bersih-bersih

Sesudah uji, saringan persis (alamat dua peserta uji + `origin=demo`, dompet + `agent_id` #2548) menghapus:
- 4 tagihan, 2 pengesahan, 20 komponen, 2 esai, 2 usaha, 2 enrollment;
- penunjukan #2548 di `web3-dasar-2026`;
- otak #2548 yang dipasang selama uji (sebelum uji #2548 tidak punya otak).

Kueri ulang: semuanya 0. Peramban ditutup sesudah penyimpanannya dikosongkan.
