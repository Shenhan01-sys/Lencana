---
tags: [acceptance-criteria, B128]
status: active
updated: 2026-10-02
---

# AC-B128 - Peran akun di core

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B128 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T50 - signer roles-check.js (B128 peran akun)]] ·
[[09-Testing/T51 - Uji peramban kursi akun (B128)]] · **Summary:** [[08-Results/B128 - Executive Summary]] · **Keputusan:** D63

RF7 langkah C dipecah C1 → C2 → C3 (acc per langkah). C1 = peran di core: satu akun login bisa memegang lebih dari satu kursi,
dan setiap kursi dibaca dari fakta yang bisa diperiksa ulang. Pilihan builder 2 Okt (opsi 2): kursi Penerbit = **anggota
penerbit** yang memantau dan, bila hibahnya menyatakan, menyewa agen penilai dan menunjuk agen pengesah; terbit/cabut kredensial
tetap CLI dengan kunci penerbit. Pengesah esai adalah agen AI ERC-8004 (B120) — bukan kursi Penerbit (koreksi builder, D63).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B128#1 | `POST /me/roles` hanya menjawab pemilik alamat (pesan khusus `lencana-roles`, nonce sekali-pakai) dan mengembalikan kursi dari fakta: peserta (setiap akun), penerbit (`issuer` = kunci penerbit, `member` = keanggotaan aktif), Agent Owner (agen yang `ownerOf`-nya alamat itu) | **PASS** 2 Okt | T50 bagian A, B, E |
| AC-B128#2 | keanggotaan penerbit: tabel `publisher_members` (`supabase/migrations/0013_publisher_members.sql`, RLS aktif tanpa policy); hibah dan cabut **hanya** dari pesan bertanda tangan kunci penerbit dengan bentuk tepat (`lencana-member grant member=… hire=0\|1 appoint=0\|1 nonce=…`); kiriman tidak bisa melebihi pesan; tanda tangan tidak bisa dipindah ke anggota lain; replay ditolak; hibah ulang mengganti wewenang; cabut menyisakan jejak (pesan + tanda tangan cabut) | **PASS** 2 Okt | T50 bagian C, D |
| AC-B128#3 | keanggotaan **tidak** membawa wewenang terbit/cabut kredensial — tidak ada kolom, tidak ada pesan, tidak ada rute untuk itu | **PASS** 2 Okt | migrasi 0013 (kolom hanya `can_hire`, `can_appoint`); kartu kursi menampilkan chip "Terbitkan / cabut kredensial — tetap kunci penerbit" padam untuk anggota (T51 langkah 3) |
| AC-B128#4 | Agent Owner dibaca dari `ownerOf` di IdentityRegistry chain 97 untuk agen yang dikenal platform (agen penerbit di manifest + yang pernah disewa/ditunjuk), dengan dompet dan tarif dari registry; penerbit sendiri bukan Agent Owner | **PASS** 2 Okt | T50 bagian B, E (#2534 dan #2542 lewat HTTP) |
| AC-B128#5 | CLI `npm run grant:member -- <alamat> [--hire] [--appoint] \| --revoke` menandatangani dengan kunci penerbit dan menulis lewat verifikasi yang sama; asal baris mengikuti `LANCENA_ORIGIN` | **PASS** 2 Okt | T51 langkah 3, 6, 7; akun builder `0x12f6…11DF` diberi keanggotaan `hire=1 appoint=1`, asal `demo` |
| AC-B128#6 | halaman: kartu "Kursi di akun ini" di Akun (fakta per kursi, wewenang sebagai chip, agen dengan tautan BscScan, "Periksa ulang"); onboarding menampilkan "Kursimu" / "Belum" / "Tak terbaca" dari fakta, tanpa tombol yang pura-pura mendaftarkan; ponsel 500 px tanpa gulir samping | **PASS** 2 Okt | T51 langkah 1–8 |
| AC-B128#7 | gerbang hijau | **PASS** 2 Okt untuk B128 (satu merah warisan) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` run kedua **24 dari 25 harness hijau**, `verify:roles` 39/0 — merah tunggal `verify:quizkeys` 60/66 = criteria kursus B126/B127 belum di tepi (AC-B127#8); `--verify` 43 klaim, hanya T39 + Quick-Reference (quizkeys) merah; `audit` 12 pemeriksaan 0 TEMUAN (A9 174 marker, A10 cocok termasuk baris README `verify:roles`); `check:labels` 8/0; vault Broken 0 · Hazards 0 · CJK 0 · PASTE 5587/5600. Run pertama baterai: `probe:serve` 1 gagal karena signer demo lebih tua dari `src/` (disunting sesudah restart — penjaga B86 bekerja), `check.js` 1 gagal yang barisnya tidak tercatat (diulang sendiri 106/0, di run kedua 106/0) |
| AC-B128#8 | login sungguhan: akun builder melihat kursi Penerbit (anggota, dua wewenang) di Akun dan onboarding | **TERBUKA** | uji builder |

**Batas klaim:** tidak ada pendaftaran penerbit swalayan — hibah hanya dari mesin yang memegang kunci penerbit. Kursi Penerbit dan
Agent Owner belum punya dashboard, dan server **belum** menerima aksi apa pun dengan tanda tangan anggota (C2). Agent Owner hanya
terbaca untuk agen yang dikenal platform: registry tidak bisa ditanya "agen milik siapa saja".
