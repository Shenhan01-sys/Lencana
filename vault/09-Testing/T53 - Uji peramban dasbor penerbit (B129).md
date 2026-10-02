---
tags: [testing, B129, browser]
status: active
updated: 2026-10-02
---

# T53 - Uji peramban dasbor penerbit (B129)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B129 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit]] ·
**Harness:** [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]] · **Summary:** [[08-Results/B129 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`) + Chromium headless (MCP), 1440×900 dan 500×900, bahasa ID.
Tanggal: 2 Okt. Dua identitas uji sekali-pakai **dibuat di dalam peramban** (`createDeviceLearner()`, kunci tidak keluar dari tab):
`0xADA3…70Be` (1440 px) dan `0xd520…A135` (500 px). Persetujuan lewat `npm run grant:member` dengan `LANCENA_ORIGIN=test`.
Sesudah uji, semua baris kedua identitas itu dihapus (1 sewa, 1 penunjukan, 2 keanggotaan, 2 pengajuan); sisa tabel: 1 anggota
(akun builder), 0 pengajuan, sewa dan penunjukan demo `web3-dasar-2026` utuh.

| # | langkah | hasil |
|---|---|---|
| 1 | akun baru → `#/app/welcome` | Penerbit "Belum" dengan tombol **Ajukan jadi anggota** + satu kalimat "kunci penerbit yang memutuskan"; Agent Owner "Belum" |
| 2 | klik Ajukan | "Menunggu keputusan penerbit · Diajukan 2 Okt 2026, 16.17" |
| 3 | `grant:member -- --list` lalu `grant:member -- 0xADA3… --hire --appoint` | daftar: 1 pengajuan (asal demo); hibah: "pengajuan #4 disetujui" |
| 4 | muat ulang onboarding | Penerbit **Kursimu** + **Buka dasbor penerbit** → `#/app/pub` |
| 5 | Ringkasan | pemilih kursi Peserta/Penerbit di menu samping; kepala "PENERBIT · Yayasan Literasi Digital Nusantara (institusi demo, fiktif)", "Anggota sejak 2 Okt 2026", dua wewenang menyala; ubin 7 dari 8 kursus · 9 peserta · 10.8 LDC-demo bersih · 3 esai menunggu; "Ke mana uangnya": kotor 12 LDC-demo dari 1 pendaftaran lunas → 10.8 penerbit / 1.2 platform 10% (dibaca dari `SettlementSplit`, tautan kontrak `0xcB00…1bBE`); tagihan agen jatuh tempo 0; alur esai 0 → 3 → final 5 (2 dinilai langsung kunci penerbit) / ditolak 0; tabel per kursus; tim |
| 6 | Kursus | 8 kartu lencana: harga, terdaftar/kotor/bersih/menunggu, batang bobot + garis ambang, rubricHash, agen penilai #2534 dan pengesah #2542 + satu alamat (bukan agen) di Web3 Dasar |
| 7 | Esai | alur + tabel (lesson, peserta, usaha, kata, usulan + oleh, status, keputusan, waktu) — tanpa teks karangan |
| 8 | Agen → Sewa: `uji-bayar-2026` + `2534` → "Baca agen dari registry" → "Tandatangani & sewa" | kartu identitas dari registry (dompet `0xFd26…0094`, Agent Owner `0x067c…0c4f`, tarif dasar 0.002, 0.002–0.0026 LDC-demo per aktivitas); sesudah tanda tangan daftar "Agen penilai yang disewa" memuat #2534 untuk Kelas Uji **oleh anggota 0xADA3…70Be** |
| 9 | Agen → Tunjuk: `uji-bayar-2026` + `2542` | tercatat **oleh anggota 0xADA3…70Be**; aturan agen sendiri / B120 diuji di T52 |
| 10 | Pendapatan + saklar "Sertakan baris uji harness" | kartu uang, batang kotor per kursus, tabel order dengan tx; saklar menyala: kotor **57 LDC-demo dari 7 pendaftaran lunas** (= 10+10+5+10+4+6+12) |
| 11 | ponsel 500 px, identitas kedua: `#/app/pub` tanpa kursi | kartu "Kamu belum memegang kursi Penerbit" + kotak catatan + Ajukan; diajukan dengan catatan → `--list` menampilkan catatannya → disetujui **hire saja** |
| 12 | ponsel: dasbor | pemilih kursi di atas isi; ubin 2×2; wewenang tunjuk padam; Agen: formulir tunjuk terkunci "Keanggotaanmu tidak mencakup penunjukan (appoint=1)"; lebar dokumen 485 ≤ 500 sesudah muat |
| 13 | konsol, delapan rute di ponsel (enam bagian penerbit, Ringkasan peserta, Akun) | 0 error, 0 peringatan |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** (a) dasbor menghitung esai yang dinilai langsung oleh kunci
penerbit sebagai "menunggu pengesahan" (5 alih-alih 3) — kini aturan view gerbang 0009, dan T52 menuntutnya. (b) Tombol
"Tandatangani & tunjuk" tampil sebelum fakta agen dibaca: `display` dari `.app-btn` menimpa atribut `hidden`. (c) Angka uang di
kartu kursus terlipat di empat kolom — kini 2×2. (d) Tautan kontrak tampil biru bawaan peramban — kini emas mono seperti tautan lain.
(e) Penjelasan pengajuan di kartu onboarding enam baris — kini satu kalimat (penjelasan lengkap tetap di Akun dan dasbor). (f) Pengesah
yang bukan agen tertulis "alamat" seperti kode — kini label "alamat, bukan agen".

**Yang tidak diuji:** login sungguhan dengan akun builder (akun 1 sudah anggota; akun 2 bisa mengajukan dari halaman); pembayaran
tagihan agen (tetap kunci penerbit); dasbor Agent Owner (C3).
