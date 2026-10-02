---
tags: [acceptance-criteria, B132]
status: active
updated: 2026-10-03
---

# AC-B132 - Robot agen rakitan, rupa di chain, agen didaftarkan sendiri

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B132 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T60 - signer studio-check.js (B132 robot agen)]] ·
[[09-Testing/T61 - Uji on-chain dan peramban bengkel agen (B132)]] · **Summary:** [[08-Results/B132 - Executive Summary]] · **Keputusan:** D68

Keluhan builder 2 Okt malam: "UInya kurang oke ya bagian agent owner … harusnya kan kayak bikin object gitu yg merepresentasikan
agentnya dan ownernya bisa bebas berkreasi". Pilihan 3 Okt: **robot penilai rakitan**.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B132#1 | robot dirakit dari suku cadang tetap (4 kepala, 4 mata, 3 badan, 3 alat, 6 warna) + nama 1–40 karakter; satu modul (`web/src/robot.ts`) untuk halaman dan server; semua kombinasi tergambar, deterministik, gambar statis < 4 KB; rupa bercacat ditolak | **PASS** 3 Okt | T60 A |
| AC-B132#2 | data agen dibaca dari bentuk robot di dasbor: mata = dompet terverifikasi, lampu antena = bisa disewa, dada = tarif dasar, kertas = penilaian + pengesahan, toples = bayaran lunas, papan meja = tempat bekerja; legenda di bawah panggung | **PASS** 3 Okt | T61 langkah 4, 8 |
| AC-B132#3 | rupa disimpan di chain: templat registrasi dari server (menunjuk balik, kalimat peran yang benar) + `name` + `image` (SVG) + `lencana:avatar`, `setAgentURI` dari dompet pemilik; dibaca balik dari chain sama | **PASS** 3 Okt | T60 B; T61 langkah 5–7 |
| AC-B132#4 | akun Agent Owner tanpa agen mendaftarkan agennya sendiri: gas uji bila menipis → `register()` dari dompetnya → platform mengenal agen hanya dari struk di chain (`Registered` dengan pemilik = akun, `ownerOf` = akun) → rupa → tarif; dompet agen = dompet pemilik sejak `register()` | **PASS** 3 Okt | T60 C–D; T61 langkah 1–4 (#2548) |
| AC-B132#5 | klaim orang lain, kunci palsu, transaksi tidak ada, akun berperan lain → ditolak; gas hanya untuk Agent Owner yang berhak | **PASS** 3 Okt | T60 C–D |
| AC-B132#6 | ponsel 500 px; 0 error konsol; tidak ada transform animasi yang bertabrakan (posisi dan gerak di elemen berbeda) | **PASS** 3 Okt | T61 langkah 8 |
| AC-B132#7 | gerbang hijau | **PASS** 3 Okt untuk B132 (dua merah warisan: data tepi basi) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` **28 dari 30 harness hijau** (`verify:studio` 28/0, `verify:owner` 32/0, `verify:authoring` 48/0, `verify:account` 50/0) — dua merah `verify:edge` (umur state tepi) dan `verify:quizkeys` tetap 60/66, keduanya disembuhkan `npm run publish:edge` oleh builder; `--verify` 56 klaim, 5 merah — semuanya sumber edge/quizkeys; `audit` 1 TEMUAN = A10 baris README `verify:edge` (sebab yang sama), A9 221 marker cocok, A10 21 baris; `check:labels` 8/0; vault 0 tautan rusak, PASTE 5587/5600 |
| AC-B132#8 | login sungguhan builder: akun dummy 2 merakit robot untuk #2547 dan menyimpannya dari dompet Privy | **TERBUKA** | uji builder |

**Batas klaim:** robot belum menilai apa pun — penilaian agen ditandatangani dompet agen dan belum ada layar untuk itu. Rupa hanya
bisa ditulis ulang untuk agen yang dicetak platform atau didaftarkan pemiliknya lewat Lencana (agen tim #2534/#2542 tidak). Testnet.
