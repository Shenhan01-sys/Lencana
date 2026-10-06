---
tags: [acceptance-criteria, B129]
status: active
updated: 2026-10-06
---

# AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B129 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]] ·
[[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]] · **Summary:** [[08-Results/B129 - Executive Summary]] · **Keputusan:** D64, D76 (admin Lencana) · isi halaman Admin diperluas di [[07-Backlog/Acceptance-Criteria/AC-B172 - Halaman Admin ringkasan jejak kesehatan]] (B172)

RF7 langkah C2. Builder mencoba dua akun dan bertanya bagaimana menjadi penerbit (2 Okt). Pilihan builder: **ajukan → disetujui
kunci penerbit**, dan C2 sekarang dengan pemilih kursi Peserta/Penerbit. Terbit/cabut kredensial dan pembayaran tagihan agen tetap
pada kunci penerbit.

**Pembaruan 6 Okt malam (D76):** builder memindahkan *keputusan atas pengajuan* ke admin Lencana (alamat di `ADMIN_ADDRESSES`; sementara akun builder shenhan604). AC-B129#2 tetap benar untuk jalur kunci penerbit (CLI); AC-B129#10–#14 menambahkan jalur admin.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B129#1 | akun mengajukan keanggotaan dengan tanda tangannya sendiri (`lencana-member-request issuer=… nonce=…`), catatan opsional ≤ 280 karakter; paling banyak satu pengajuan menunggu per akun; pengajuan **tidak** memberi kursi; status terbaca di `/me/roles` | **PASS** 2 Okt | T52 A; T53 langkah 1–2, 11 |
| AC-B129#2 | hanya kunci penerbit yang memutuskan: hibah keanggotaan menutup pengajuan sebagai `approved`, pesan tolak bertanda tangan menutupnya sebagai `rejected` (CLI `--reject` atau `POST /publisher/members` dengan `reject`); sesudah ditolak boleh mengajukan lagi; anggota tidak bisa mengajukan lagi | **PASS** 2 Okt | T52 A; T53 langkah 3 |
| AC-B129#3 | CLI `npm run grant:member -- --list` menampilkan pengajuan yang menunggu beserta catatannya | **PASS** 2 Okt | T53 langkah 3, 11 |
| AC-B129#4 | `POST /publisher/overview` (pesan `lencana-publisher`) hanya menjawab pemegang kursi Penerbit; tanpa pesan / pesan keperluan lain → 400, kunci lain → 401, tanpa kursi → 403 | **PASS** 2 Okt | T52 B |
| AC-B129#5 | angka dasbor bisa ditelusuri: kotor = order lunas yang tercantum (dengan tx), potongan = `platformBps` dibaca dari `SettlementSplit` di chain, platform + bersih = kotor, per kursus = total; baris harness disaring kecuali diminta; tanpa teks esai; "menunggu pengesahan" = usulan model/agen saja (aturan view gerbang 0009) | **PASS** 2 Okt | T52 B; T53 langkah 5, 10 |
| AC-B129#6 | anggota bertindak dengan tanda tangannya sendiri sesuai hibah: `hire=1` menyewa agen penilai, `appoint=1` menunjuk agen pengesah; `hired_by`/`added_by` = anggota; tidak untuk agen yang ia miliki/operasikan; aturan B120 tetap | **PASS** 2 Okt | T52 C, D; T53 langkah 8–9, 12 |
| AC-B129#7 | halaman: pemilih kursi hanya untuk pemegang kursi Penerbit; dasbor `#/app/pub` enam bagian (Ringkasan, Kursus, Peserta, Esai, Agen, Pendapatan); kotak pengajuan di Akun, onboarding, dan dasbor untuk yang belum anggota; ponsel 500 px tanpa gulir samping; 0 error konsol | **PASS** 2 Okt | T53 |
| AC-B129#8 | gerbang hijau | **PASS** 2 Okt untuk B129 (satu merah warisan) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` **25 dari 26 harness hijau** (`verify:publisher` 53/0, `verify:roles` 39/0, `verify:agents` 34/0) — merah tunggal `verify:quizkeys` 60/66 = criteria kursus B126/B127 belum di tepi (AC-B127#8); `--verify` 44 klaim, hanya T39 + Quick-Reference (quizkeys) merah; `audit` 12 pemeriksaan 0 TEMUAN (A9 184 marker, A10 cocok termasuk baris README `verify:publisher`); `check:labels` 8/0; vault Broken 0 · Hazards 0 · CJK 0 · PASTE 5587/5600 |
| AC-B129#9 | login sungguhan: akun 1 builder membuka dasbor penerbit; akun 2 mengajukan dari halaman lalu disetujui | **TERBUKA** | uji builder (persetujuan: `npm run grant:member -- --list`, lalu `npm run grant:member -- <alamat> --hire --appoint`) |
| AC-B129#10 | rute admin: `POST /admin/overview` (pesan `lencana-admin overview nonce=…`) hanya menjawab alamat di `ADMIN_ADDRESSES`; bukan admin → 403 SEBELUM tanda tangan dipakai; tanda tangan untuk keperluan lain (`lencana-roles`) → 400; tanda tangan kunci lain atas alamat admin → 401; nonce yang dipakai ulang ditolak | **PASS** 6 Okt malam | `verify:publisher` grup G (T52); uji negatif: `isAdmin` dipaksa benar → 2 cek merah, dikembalikan → hijau |
| AC-B129#11 | admin memutuskan: `POST /admin/members` `grant` (wewenang `hire/appoint/author/publish` tercantum di pesan; isi tubuh yang tidak cocok dengan pesan ditolak), `reject`, `revoke`; aksi lain → 400; pengajuan yang diputuskan tidak lagi menunggu; akun bukan admin → 403 | **PASS** 6 Okt malam | `verify:publisher` grup G (T52); T95 langkah 18–22 |
| AC-B129#12 | `/me/roles` menandai `admin: true` hanya untuk alamat admin; `/healthz` hanya melaporkan JUMLAH admin (alamat tidak bocor); catatan pemohon disaring (karakter kontrol dibuang) dan item overview hanya `{id, address, note, at}` | **PASS** 6 Okt malam | `verify:publisher` grup G (T52) |
| AC-B129#13 | halaman `#/app/admin` + baris "Admin Lencana" di Akun: daftar pengajuan (alamat, catatan, tanggal), dialog izin sebelum menyetujui, Tolak, daftar anggota dengan Cabut; akun bukan admin melihat pesan ditolak (bukan daftar); kartu Tim di dasbor Penerbit hanya membaca, tanpa tombol; 0 galat konsol | **PASS** 6 Okt malam (peramban lokal, signer lokal) | T95 langkah 18–24 |
| AC-B129#14 | produksi: variabel Railway `ADMIN_ADDRESSES` diisi alamat akun builder; sesudah dorongan, `/healthz` melaporkan `admins: 1` dan akun itu membuka `#/app/admin` | **TERBUKA** (kode LIVE sejak `483f083`; `/healthz` admins 1) | uji builder: masuk sebagai shenhan604@gmail.com, buka `https://lencana-psi.vercel.app/#/app/admin` |
| AC-B129#15 | akun admin sementara hanya admin (D77): akun shenhan604 tidak lagi anggota penerbit dan bukan akun dev (dicabut di produksi 6 Okt malam: `account_roles` kosong, keanggotaan aktif 0); setelah dorongan, ia masuk langsung ke `#/app/admin` | **PASS** (data) · **TERBUKA** (login sungguhan sesudah dorongan) | database: kueri ulang `account_roles` null, `memberships` kosong; kode: AC-B131#9 |

**Batas klaim:** tidak ada pendaftaran penerbit swalayan — akun hanya *mengajukan*; sejak D76 yang memutuskan adalah admin Lencana (sementara satu akun, daftar di variabel server; tanpa tabel admin, tanpa pemulihan admin selain mengganti variabel) atau kunci penerbit lewat CLI. Dasbor membaca; menerbitkan, mencabut, dan membayar tagihan agen tidak ada di halaman.
