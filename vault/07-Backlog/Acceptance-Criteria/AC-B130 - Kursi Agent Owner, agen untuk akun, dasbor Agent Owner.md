---
tags: [acceptance-criteria, B130]
status: active
updated: 2026-10-02
---

# AC-B130 - Kursi Agent Owner, agen untuk akun, dasbor Agent Owner

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B130 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T54 - signer owner-check.js (B130 kursi Agent Owner)]] ·
[[09-Testing/T55 - Uji on-chain dan peramban dasbor Agent Owner (B130)]] · **Summary:** [[08-Results/B130 - Executive Summary]] · **Keputusan:** D65

RF7 langkah C3. Pilihan builder 2 Okt: Agent Owner = akun 2 (shenhan604); dompet agen = dompet akun pemilik dengan gas testnet dari
platform. Fakta spesifikasi: EIP-8004 mengosongkan `agentWallet` saat identitas berpindah tangan dan hanya pemilik yang boleh
mengisinya lagi.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B130#1 | platform mencetak agen untuk sebuah akun (`npm run agent:mint`): register, berkas registrasi yang menunjuk balik (peran `grader-account`, teksnya tidak mengklaim tim sebagai pemilik), tarif dasar, `transferFrom` ke akun, gas bila saldo < 0,0005 tBNB; idempoten, disimulasikan sebelum dikirim, dan tercatat di `platform_agents` (migrasi 0015) sebelum langkah berikutnya | **PASS** 2 Okt | T55 langkah 1 dan 9 (#2546, #2547) |
| AC-B130#2 | kursi Agent Owner terbaca untuk agen cetakan platform yang belum disewa siapa pun (`knownAgentIds` memuat `platform_agents`); kepemilikan tetap dari `ownerOf` | **PASS** 2 Okt | T55 langkah 2 (pemilih kursi + dasbor untuk #2546 sebelum disewa) |
| AC-B130#3 | `POST /owner/overview` (pesan `lencana-owner`) hanya untuk pemilik menurut `ownerOf`; identitas, dompet, tarif dari registry; sewa, penunjukan, aktivitas, tagihan dari database (= hitungan ulang); alasan layak-sewa = aturan sewa yang sama (`hireProblem`) | **PASS** 2 Okt | T54 A–C, E |
| AC-B130#4 | pemilik memverifikasi dompet agennya sendiri dari halaman: tanda tangan EIP-712 `AgentWalletSet` + `setAgentWallet` dari dompet akun; sesudahnya agen layak disewa | **PASS** 2 Okt (kunci perangkat) · **TERBUKA** (dompet Privy) | T55 langkah 3 (`0x3331a22f…`); Privy: AC-B130#8 |
| AC-B130#5 | pemilik mengubah tarif dasar dari halaman (`setMetadata lencana.baseTariff`), tangga tarif mengikuti | **PASS** 2 Okt | T55 langkah 4 (`0x727722f2…`) |
| AC-B130#6 | gas: `POST /owner/gas` hanya untuk pemilik agen cetakan platform, hanya bila saldo menipis | **PASS** 2 Okt | T54 D; tetes saat cetak di T55 langkah 1 dan 9 |
| AC-B130#7 | halaman: pemilih kursi tiga arah (hanya kursi yang dipegang), dasbor `#/app/owner` (kartu identitas, slot dompet, tangga tarif, tempat bekerja, aktivitas, bayaran), tombol ke dasbor dari Akun dan onboarding, ponsel 500 px, 0 error konsol; agen yang diverifikasi bisa disewa anggota penerbit dari akun lain | **PASS** 2 Okt | T55 langkah 2–8 |
| AC-B130#8 | login sungguhan: akun 2 builder membuka `#/app/owner`, memverifikasi dompet agen #2547 dari dompet Privy-nya, lalu akun 1 (anggota penerbit) menyewanya | **TERBUKA** | uji builder — transaksi dari dompet Privy belum pernah diuji |
| AC-B130#9 | gerbang hijau | **PASS** 2 Okt untuk B130 (satu merah warisan) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` **26 dari 27 harness hijau** (`verify:owner` 32/0, `verify:agents` 34/0, `verify:publisher` 53/0, `verify:roles` 39/0) — merah tunggal `verify:quizkeys` 60/66 = criteria kursus B126/B127 belum di tepi; `--verify` 50 klaim, hanya T39 + Quick-Reference (quizkeys) merah; `audit` 12 pemeriksaan 0 TEMUAN (A9 192 marker, A10 18 baris README cocok); `check:labels` 8/0; vault 0 tautan rusak |

**Batas klaim:** pencetakan agen dilakukan platform lewat CLI, bukan swalayan. Agen milik akun belum menilai apa pun — penilaian agen
ditandatangani dompet agen dan belum ada layar untuk itu. Bayaran agen masuk ke dompet agen; ke pemilik hanya karena dompet agen =
dompet pemilik (D65). Testnet, token demo.
