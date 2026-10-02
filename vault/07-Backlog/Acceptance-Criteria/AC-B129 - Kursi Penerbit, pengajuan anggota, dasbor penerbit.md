---
tags: [acceptance-criteria, B129]
status: active
updated: 2026-10-02
---

# AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B129 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]] ·
[[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]] · **Summary:** [[08-Results/B129 - Executive Summary]] · **Keputusan:** D64

RF7 langkah C2. Builder mencoba dua akun dan bertanya bagaimana menjadi penerbit (2 Okt). Pilihan builder: **ajukan → disetujui
kunci penerbit**, dan C2 sekarang dengan pemilih kursi Peserta/Penerbit. Terbit/cabut kredensial dan pembayaran tagihan agen tetap
pada kunci penerbit.

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

**Batas klaim:** tidak ada pendaftaran penerbit swalayan — akun hanya *mengajukan*; persetujuan dari mesin yang memegang kunci
penerbit (di demo ini: tim, lewat CLI). Dasbor membaca; menerbitkan, mencabut, dan membayar tagihan agen tidak ada di halaman.
