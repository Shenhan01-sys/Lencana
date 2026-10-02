---
tags: [testing, B127, browser]
status: active
updated: 2026-10-02
---

# T49 - Uji peramban halaman Kursus dan Ringkasan (B127)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B127 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B127 - Halaman Kursus, lima kelas singkat, Ringkasan berisi]] ·
**Summary:** [[08-Results/B127 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (paywall `on`; `LANCENA_ORIGIN=test` selama transaksi uji, lalu `demo`) + Chromium
headless (MCP), 1440×900 dan 500×900, bahasa ID. Tanggal: 2 Okt. Identitas uji sekali-pakai yang sama dengan T48 (`0x9541…9785`,
saldo chain 35 LDC-demo di awal; dua pendaftarannya dari T48 masih ada). Transaksi di bawah sungguhan di chain 97.

| # | langkah | hasil |
|---|---|---|
| 1 | tamu: beranda | katalog publik 7 kursus (kelas uji tidak); dua kursus bergambar khusus, lima kursus baru tampil dengan emblem lencananya (warna topik + monogram) |
| 2 | `#/app/courses` | menu sidebar "Kursus"; kolom cari + chip Tingkat/Topik/Status + Urutkan; "8 kursus · 2 terdaftar"; kartu lencana dengan tag tingkat/topik, ringkasan, modul · lesson · menit, batang bobot + ambang, harga |
| 3 | cari & saring | "phishing" → 1 (Keamanan Akun); "allowance izin" → 1 (semua kata harus cocok); "zzqx" → 0 + kotak kosong, "Atur ulang saringan" → 8; topik Keuangan → 1; + Terdaftar → 0 |
| 4 | pratinjau Literasi Keuangan | panel samping: emblem, tag, penerbit; 2 modul · 5 lesson · 37 menit · 4 soal · 1 esai · 365 hari; hasil belajar, sasaran; cara dinilai: Kuis 50 / Esai 50, garis ambang 65, "Praktik 0% — tidak dinilai (bobot 0)", rubricHash `9912a11ffe46`; silabus; harga 4, saldo 35 |
| 5 | "Bayar & daftar · 4 LDC-demo" dari pratinjau | "Lunas — membuka kelas…" dalam 6,9 detik → `#/class/literasi-keuangan-2026`, panel tertutup, chip 35 → 31; tx `0x1726d536…5874` sukses (blok 134379238) |
| 6 | kuis Literasi, 3 dari 4 benar | dinilai server 75 |
| 7 | tautan langsung `#/app/courses/membaca-bscscan-2026` → bayar 6 | pratinjau terbuka langsung; lunas, tx `0x1bd87931…2e73` sukses (blok 134379779); kuis 2 dari 4 → 50 |
| 8 | `#/app` (Ringkasan) | ubin 4 kursus · 0 lesson · 5 usaha dinilai · saldo 25 (= 35 − 4 − 6, koin + angka bergulir); Lanjutkan belajar: 3 kelas terakhir aktif + "Lihat semua kelas (4)"; Perlu perhatianmu: ulangi kuis (0 vs ambang 80, 50 vs 75), kirim esai ×4 |
| 9 | Ringkasan bawah | Menuju kredensial: Kelas Uji 50/60, Web3 Dasar 0/70, Literasi 37,5/65, BscScan 20/65 (batang warna topik + garis ambang); Aktivitas terbaru: 7 kejadian bertaut tx + waktu relatif; Kursus untukmu: Token 8 · Keamanan 10 · Menulis 12 + "Lihat semua kursus (8)" |
| 10 | ponsel 500 px: Kursus, pratinjau, Ringkasan | tab bawah 7 menu berlabel pendek (Ringkasan · Kursus · Kelas · Nilai · Kredensial · Dompet · Akun); pratinjau layar penuh; ubin 2×2 |
| 11 | konsol, 10 langkah (Ringkasan, Kursus + pratinjau, tautan langsung, Nilai, Dompet, Kelas, detail publik, beranda) | 0 error, 0 peringatan; panel tertutup saat rute berganti, kunci gulir dilepas |
| 12 | waktu rekaman sampai status "terdaftar" (tautan langsung, akun 4 kursus) | sebelum: >9 detik; sesudah `learnerRecords` serentak: 1,9 detik di peramban (fungsi saja 1,5–3,4 detik) |
| 13 | beranda 1440 px | kartu emblem: kisi tipis + cahaya warna topik, emblem berputar saat disorot |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:**
(a) `h()` di `web/src/lib/ui.ts` memasang gaya lewat `Object.assign`, yang diam-diam mengabaikan custom property — `--tc`/`--i` tidak
pernah terpasang sejak B126 (warna topik kartu, jeda urutan masuk, batang "Menuju kredensial" kosong); kini `setProperty`.
(b) Kaki panel pratinjau memakan ±350 px dari 900 — dipadatkan. (c) Chip "Belum lengkap" terlipat. (d) Toolbar saringan setinggi
setengah layar ponsel — tiap grup chip kini satu baris geser. (e) Lima kursus baru di beranda memakai satu gambar cadangan yang
sama — kini emblemnya masing-masing. (f) Halaman Kursus menunggu rekaman (tanda tangan + penerbit) sebelum tampil, sehingga
tautan langsung baru membuka pratinjau sesudah >6 detik — kini katalog tampil seketika dan status "terdaftar" menyusul.
(g) Rekaman per kursus dibaca berurutan di server — kini serentak.

**Yang tidak diuji:** login sungguhan (AC-B127#9); esai dan praktik di kelas baru (alur yang sama dengan kursus lain).
