---
tags: [testing, B131, browser]
status: active
updated: 2026-10-03
---

# T57 - Uji peramban satu akun satu peran (B131)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B131 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B131 - Satu akun satu peran, akun dev]] ·
**Harness:** [[09-Testing/T56 - signer account-check.js (B131 satu akun satu peran)]] · **Summary:** [[08-Results/B131 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`, dinyalakan ulang sesudah suntingan B131) + Chromium headless
(MCP) 1440×900; tampilan ponsel 500 px lewat iframe di tab yang sama. Tanggal: 3 Okt dini hari. Lima identitas uji sekali-pakai
(kunci perangkat di sesi tab, kuncinya hanya di scratchpad): A `0xC55C…5491`, B `0x0F7C…A206`, C `0x59A7…855F`, D `0xAcEE…776B`,
E `0xB15e…1A7b`.

| # | langkah | hasil |
|---|---|---|
| 1 | A membuka `#/app/welcome` | tiga kartu pilih peran: Peserta, Penerbit (dengan kolom catatan), Agent Owner, dengan kalimat "satu akun satu peran, tidak bisa diganti"; tanpa pemilih kursi |
| 2 | A: klik "Pilih Agent Owner" | klik pertama hanya mempersenjatai: tombol menjadi "Yakin? Tandatangani pilihan ini" + "Pilihan ini tidak bisa diganti nanti" |
| 3 | A: klik kedua | tanda tangan `lencana-role role=owner` → `#/app/owner`: "Kamu memilih Agent Owner…" (belum punya agen), tanpa tautan ke dasbor peserta, tanpa pemilih kursi |
| 4 | A membuka `#/app/grades` lalu `#/app/pub` | keduanya dikembalikan ke `#/app/owner` |
| 5 | A membuka Akun | kartu kursi: "Satu akun memegang satu peran — dipilih dan ditandatangani akun ini · 3 Okt 2026", hanya baris Agent Owner |
| 6 | B memilih Penerbit dengan catatan "Staf kurikulum (uji T57)" | `#/app/pub`: "Menunggu keputusan penerbit" + catatannya; tanpa tautan ke dasbor peserta |
| 7 | `grant:member` untuk B (`--hire`) | "pengajuan #29 disetujui"; B memuat ulang → dasbor Penerbit (Ringkasan, anggota sejak 3 Okt), tanpa pemilih kursi |
| 8 | `grant:member` untuk A (akun Agent Owner) | **DITOLAK**: "this account holds the Agent Owner role — one account holds one role…" |
| 9 | C memilih Peserta | masuk tur "Bagaimana kursus menjadi bukti"; `#/app/pub` dan `#/app/owner` dikembalikan ke `#/app` |
| 10 | D ditandai dev (`account:dev --apply`) + keanggotaan | Akun: pemilih kursi Peserta / Penerbit dengan tanda "AKUN DEV", kartu kursi menulis "Akun pengembang…" dan menampilkan semua kursi |
| 11 | E (belum berperan), ponsel 500 px, `#/app/welcome` | kartu bertumpuk; catatan selebar kartu, tombol di bawahnya; lebar dokumen 485 ≤ 500 |
| 12 | konsol E di enam rute (`#/app`, Akun, `#/app/pub`, `#/app/owner`, Kursus, onboarding) | 0 error, 0 peringatan |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** di kartu Penerbit, kolom catatan dan tombol "Pilih Penerbit &
ajukan" berdesakan dalam satu baris (kotak aksi onboarding berupa flex tanpa lipatan). Kini catatan dan status mengambil satu baris
penuh dan tombol turun ke bawah (`web/src/pages/seats.css`).

**Bersih-bersih:** baris `account_roles` (4), `member_requests` (1), dan `publisher_members` (2) milik kelima identitas uji dihapus.
Sesudahnya `account_roles` hanya berisi dua akun dummy builder (kueri ulang).

**Yang tidak bisa diuji di sini:** login Privy sungguhan. Akun dummy builder (dev) dan akun email baru diuji builder.
