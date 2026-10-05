---
tags: [acceptance-criteria, B151]
status: active
updated: 2026-10-05
---

# AC-B151 - Ruang kelas di HP

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B151 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T77 - Uji peramban ruang kelas di HP (B151)]] ·
**Summary:** [[08-Results/B151 - Executive Summary]] · **OI:** OI-31 di [[10-Contributors/Open-Items-for-Dave]]

Permintaan builder 5 Okt: "di page /class/[nama course] itu pagenya ga mobile friendly banget, cek aja di stealth-browser pakai
viewport mobile". Audit 375 px 5 Okt: tata letak dua kolom desktop tetap dipakai, isi pelajaran berada di luar layar ke kanan,
breadcrumb bilah atas pecah per kata, 30–31 elemen melewati layar di `uji-bayar-2026` dan `web3-dasar-2026`. Acc builder:
"Mobile dulu".

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B151#1 | ≤ 900 px: satu kolom yang digulir halaman, isi lesson terlihat; 0 elemen melewati layar | **PASS** 5 Okt | T77 langkah 1–2 (10 halaman kelas di dua kursus, 0 luapan; sebelumnya 30–31 elemen) |
| AC-B151#2 | bilah atas ringkas 56 px yang menempel: ←, judul kursus terpotong, persen + bar kecil, tombol **Kurikulum**; label katalog, "di penerbit", dan alamat disembunyikan | **PASS** 5 Okt | T77 langkah 1, 8 (`top: 0` di gulir 1190 px) |
| AC-B151#3 | kurikulum jadi laci: fokus ke lesson aktif saat dibuka; tertutup lewat ×, latar, Esc, atau memilih lesson; laci tertutup `visibility: hidden` (tidak tercapai Tab); kunci gulir dilepas saat rute berganti | **PASS** 5 Okt — tombol × hanya dipakai di sela langkah, tanpa diukur tersendiri | T77 langkah 1, 3–6 |
| AC-B151#4 | kaki laci memuat alamat + "Belajar & kredensialku" (pengganti grup alamat di bilah atas) | **PASS** 5 Okt | T77 langkah 3, 6 (`#/app`, kunci gulir tidak terbawa ke dasbor) |
| AC-B151#5 | kuis dan esai dikerjakan dari 375 px | **PASS** 5 Okt — praktik hanya tata letak (formulirnya belum ada, OI-20) | T77 langkah 7 ("1/4 benar = 25 · terbaik 25 · ambang 75", dinilai server), langkah 8 ("Terkirim ke penerbit · 2/5 tanda mekanis terpenuhi · 121 kata") |
| AC-B151#6 | pager Sebelumnya / Selanjutnya dua kolom sama lebar | **PASS** 5 Okt | T77 langkah 9 (159 / 159 px, tinggi 48 px) |
| AC-B151#7 | ≤ 1100 px rail kanan disembunyikan; tablet tetap dua kolom | **PASS** 5 Okt | T77 langkah 10 (1000 px: kurikulum 0–320, isi 320–985, 0 luapan) |
| AC-B151#8 | desktop tidak berubah | **PASS** 5 Okt — dibandingkan lewat ukuran + computed style elemen kunci + tangkapan, bukan semua elemen terhadap HEAD | T77 langkah 11 (1440 px: tiga kolom, bilah atas 64 px, elemen HP `display: none`) |
| AC-B151#9 | `style.css` tidak disunting; gaya di `web/src/pages/class.css` yang dimuat `class.ts`; diserahkan lewat OI-31 | **PASS** 5 Okt | `git show --stat 289f569`: kode hanya `web/src/pages/class.css` (baru) + `web/src/pages/class.ts`; `web/src/pages/class.ts:19` |
| AC-B151#10 | gerbang | **PASS** 5 Okt | `npm run build` (tsc + vite) exit 0, `probe` 118/0 (T77) |
| AC-B151#11 | dipakai di HP sungguhan | **PARTIAL** | diukur di iframe Chromium headless (375×812, 1000, 1440 px) dengan peserta sekali-pakai (kunci perangkat, bukan login Privy); hasil di HP builder tidak tercatat di vault — T77 §Batas |

**Yang ikut ditutup:** tiga cacat temuan T77 (fokus laci jatuh ke ×; lesson aktif tidak bisa difokus karena `transition: all`
di `style.css` ikut mentransisikan `visibility`; tombol pager tidak sama lebar) dan tautan kursus di breadcrumb lesson yang biru
bawaan peramban (semua lebar).
