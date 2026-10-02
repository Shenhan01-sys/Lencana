---
tags: [hub, results]
status: active
updated: 2026-09-28
---

# 00 - Hub Results

This module is the boundary between what we measured and what we are allowed to say. Every number in it
carries the command that printed it and the date it printed.

| part | what it holds |
|---|---|
| [[08-Results/01 - Evidence and Limits]] | the ledger: claim -> evidence -> what it does NOT prove, and the banned sentences |
| [[08-Results/P2 - Executive Summary]] | the short reading for someone who will not open the repo |
| [[08-Results/B119 - Executive Summary]] | 1 Okt — penerbit menyewa agen penilai ERC-8004 per aktivitas; label dipilih agen, harga = tarif Agent Owner + 5%/tingkat, dibayar lewat x402 ke dompet agen (`verify:agents:live` 40/0) |
| [[08-Results/B120 - Executive Summary]] | 1 Okt — reviewer diperlakukan sebagai penilai: agen reviewer ERC-8004 #2542 dengan Agent Owner lain; pengesahannya ditagih; penilai ≠ reviewer dijaga dua arah (`verify:agents` bagian B120 12/12, live 15/15) |
| [[08-Results/B80 - Executive Summary]] | 1 Okt — kunci jawaban kuis keluar dari bundel browser: bundel 0/28 teks `why` (sebelumnya 28/28 di Vercel), `rubricHash` kertas yang terbit tidak bergeser, `/grade` membalas pembahasan per soal tanpa indeks jawaban (`verify:quizkeys` 30/0). Bukan "anti-curang": ulangan tak terbatas tetap membocorkan kunci pelan-pelan |
| [[08-Results/B82 - Executive Summary]] | 1 Okt malam — login email lewat Privy (D57): dompet tertanam Privy jadi alamat peserta yang sama di perangkat mana pun; `POST /auth/privy` mengikat alamat ↔ akun hanya sesudah token diverifikasi dengan app secret; SDK dimuat lambat, secret tidak ada di bundel (`verify:privy` 38/0). **Belum diuji lintas perangkat** oleh builder — baris B82 tetap terbuka |
| [[08-Results/B122 - Executive Summary]] | 1 Okt malam — preflight CORS dijawab 204 (sebelumnya 405 di setiap rute tulis): untuk pertama kalinya halaman belajar menulis ke penerbit dari peramban sungguhan — enroll, progres, kuis dinilai server, esai (T42). Ikut ditutup: kuis dari halaman mengirim kursus kosong |
| [[08-Results/B123 - Executive Summary]] | 2 Okt — satu pintu masuk berakun (Google bila aktif + email, tanpa kata Privy), tiga pintu tanpa akun ditutup, simulasi di Verifier dan Trust Center dibuang, tombol delisting memeriksa spesimen sungguhan; login sungguhan lewat dialog baru menunggu uji builder |
| [[08-Results/B124 - Executive Summary]] | 2 Okt — area internal peserta ber-sidebar (Ringkasan · Kelas saya · Nilai & tugas · Kredensial saya · Akun), onboarding login pertama dengan tiga kursi, detail kursus publik; nilai dibaca lewat `POST /me/records` bertanda tangan (`verify:records` 16/0); login sungguhan sampai dashboard menunggu uji builder |
| [[08-Results/B125 - Executive Summary]] | 2 Okt — kursus berbayar: 402 → peserta menandatangani izin token (tanpa gas) → penerbit menyiarkan settlement + pembagian → order paid → kelas terbuka; harga satu sumber (10 / 25 LDC-demo, koin uji testnet), faucet koin uji, dashboard Pembayaran; `verify:paywall` 23/0 + `--live` 31/0 |
| [[08-Results/B126 - Executive Summary]] | 2 Okt — kelas uji berbayar `uji-bayar-2026` (5 LDC-demo, tidak tampil di katalog publik) untuk menguji bayar dengan akun sungguhan; saldo dari chain di chip navbar, panel bayar, dan Dompet; Nilai & tugas bergrafik (perkiraan = `computeScore` penerbit); pita pemuatan global + kerangka; tersisa criteria kelas uji di tepi |
| [[08-Results/B127 - Executive Summary]] | 2 Okt — halaman Kursus (cari, saring, pratinjau + bayar), lima kelas singkat (3 non-teknis; katalog publik 7 kursus · 46 lesson · 585 menit), komponen berbobot 0 tidak dinilai, Ringkasan berisi; tersisa criteria di tepi |
| [[08-Results/B128 - Executive Summary]] | 2 Okt — peran akun di core (RF7 C1): kursi dibaca dari fakta (kunci penerbit, keanggotaan bertanda tangan penerbit, `ownerOf` ERC-8004), `verify:roles` 39/0, kartu kursi di Akun + onboarding; dashboard Penerbit/Agent Owner menyusul (C2/C3) |
| [[08-Results/B129 - Executive Summary]] | 2 Okt — kursi Penerbit end-to-end (RF7 C2): pengajuan anggota → disetujui kunci penerbit, dasbor `#/app/pub` enam bagian dari baris yang bisa ditelusuri, pemilih kursi, aksi anggota sewa/tunjuk agen; `verify:publisher` 53/0 |
| [[08-Results/B130 - Executive Summary]] | 2 Okt — kursi Agent Owner end-to-end (RF7 C3): agen ERC-8004 dicetak platform untuk akun, dasbor `#/app/owner`, pemilik memverifikasi dompet agennya sendiri dan mengubah tarif dari halaman; #2546 terbukti on-chain, #2547 untuk akun 2 builder; `verify:owner` 32/0 |
| [[08-Results/B121 - Executive Summary]] | 1 Okt — slot praktik dinilai dari chain lewat `POST /praktik` (saldo, transfer, `eth_call`, izin token), `/attempts` menolak skor slot rubrik dari peserta; satu kertas terbit dengan praktik `gradedBy chain` (`verify:praktik` 32/0, live 32/0). **Core saja** — halaman belajar belum memanggil rutenya, baris B121 tetap terbuka |

**Rule for adding a row.** Only from a run. If no command prints the number, the number does not belong
here: it becomes open work in [[07-Backlog/03 - Findings and Tasks 2026-09-26]] and the submission text
says nothing about it.

**Related:** [[00-Overview/08 - Submission Copy]] · [[09-Testing/00 - Hub Testing]] · [[10-Contributors/Claims-Cheat-Sheet]]
