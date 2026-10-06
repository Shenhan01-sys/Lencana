---
tags: [acceptance-criteria, B131]
status: active
updated: 2026-10-03
---

# AC-B131 - Satu akun satu peran, akun dev

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B131 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T56 - signer account-check.js (B131 satu akun satu peran)]] ·
[[09-Testing/T57 - Uji peramban satu akun satu peran (B131)]] · **Summary:** [[08-Results/B131 - Executive Summary]] · **Keputusan:** D66

Permintaan builder 2 Okt malam: "toggle switching role dikasih ke akun dummy saya aja … di real life tiap user hanya boleh pegang 1
role". Pilihan builder 3 Okt: **pilih sekali saat onboarding**.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B131#1 | akun memilih peran sekali lewat `POST /me/role`: pesan `lencana-role role=<peran> nonce=…` ditandatangani akun itu (untuk Penerbit juga `issuer=<alamat>`); pesan salah bentuk, peran tak dikenal, pesan peran lain, penerbit lain, kunci lain → ditolak; pilihan kedua → 409 (kunci primer `account_roles`, migrasi 0016) | **PASS** 3 Okt | T56 A–D |
| AC-B131#2 | peran efektif satu sumber (`signer/src/account.js` `accountOf`): dev → kunci penerbit → pilihan → rekaman (sudah belajar = Peserta) → keanggotaan → `ownerOf`; dipakai server dan CLI (`grant:member`, `agent:mint`) | **PASS** 3 Okt | T56 E; T57 langkah 8 |
| AC-B131#3 | server menolak aksi peran lain untuk akun nyata: belajar/bayar/koin uji untuk Penerbit + Agent Owner; pengajuan, dasbor penerbit, aksi anggota untuk Peserta + Agent Owner; dasbor Agent Owner untuk Peserta + Penerbit; hibah keanggotaan dan cetak agen untuk akun berperan lain. Fakta kursi tetap syarat: memilih Penerbit tidak memberi kursi sebelum kunci penerbit menyetujui, memilih Agent Owner tidak memberi agen | **PASS** 3 Okt | T56 B–E |
| AC-B131#4 | memilih Penerbit = mengajukan keanggotaan (catatan ikut); pengajuan lewat rute lama dari akun tanpa peran juga mencatat peran Penerbit — kontrak rute B129 tetap | **PASS** 3 Okt | T56 C, E; `verify:publisher` 57/0 |
| AC-B131#5 | akun dev hanya ditandai CLI platform (`npm run account:dev`), tidak lewat HTTP; akun dev memegang semua kursi menurut fakta dan satu-satunya yang melihat pemilih kursi; dua akun dummy builder bertanda dev | **PASS** 3 Okt | T56 F; T57 langkah 10; `account:dev -- --list` 2 akun |
| AC-B131#6 | halaman: onboarding pilih peran dengan konfirmasi dua klik; akun berperan dikirim ke dasbornya sendiri; kartu Akun menampilkan satu peran dan alasannya; kotak pengajuan memperingatkan bahwa mengajukan = memilih peran Penerbit; ponsel 500 px; 0 error konsol | **PASS** 3 Okt | T57 |
| AC-B131#8 | gerbang | **PASS** 3 Okt untuk B131 (dua merah warisan: data tepi basi) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` **26 dari 28 harness hijau** (`verify:account` 50/0, `verify:publisher` 57/0, `verify:roles` 39/0, `verify:owner` 32/0) — dua merah `verify:edge` (state tepi 30,3 jam > 26 jam) dan `verify:quizkeys` 60/66 (criteria B126/B127 belum di tepi), keduanya disembuhkan `npm run publish:edge` oleh builder; `--verify` 52 klaim, 5 merah — semuanya sumber edge/quizkeys yang tidak terbaca; `audit` 12 pemeriksaan, 1 TEMUAN = A10 baris README `verify:edge` (sebab yang sama), A9 201 marker cocok; `check:labels` 8/0; vault 0 tautan rusak, PASTE 5587/5600 |
| AC-B131#9 | **admin Lencana adalah peran sendiri (D77):** alamat di `ADMIN_ADDRESSES` (bukan kunci penerbit) berperan `admin` — `/me/roles` tanpa kursi peserta / penerbit / Agent Owner, rute peserta, dasbor penerbit, dan dasbor Agent Owner → 403 "Lencana admin account", `/me/role` → 409, hibah keanggotaan oleh kunci penerbit ditolak; web: semua dasbor peran lain memindahkan ke `#/app/admin`, Akun hanya baris Admin | **PASS** 6 Okt malam | `verify:publisher` 89/0 (grup G; uji negatif: aturan admin dimatikan → 4 merah, dipulihkan → hijau); T95 langkah 31–34 |
| AC-B131#7 | login sungguhan builder: akun dummy 1 dan 2 tetap bisa berpindah kursi; akun email baru memilih satu peran | **TERBUKA** | uji builder |

**Batas klaim:** penolakan ditegakkan server untuk rute bertanda tangan Lencana. Kepemilikan NFT agen di chain tidak bisa dicegah
siapa pun; ia hanya tidak memberi kursi kepada akun yang berperan lain. Akun Privy ketiga `0x5d93…80C2` (login 2 Okt) belum
ditandai dev, menunggu konfirmasi builder.
