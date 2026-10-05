---
tags: [acceptance-criteria, B149]
status: active
updated: 2026-10-05
---

# AC-B149 - Menu hamburger navbar HP

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B149 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T76 - Uji peramban menu hamburger navbar (B149)]] ·
**Summary:** [[08-Results/B149 - Executive Summary]] · **OI:** OI-30 di [[10-Contributors/Open-Items-for-Dave]]

Permintaan builder 5 Okt: "Kalau mobile view mending navbarnya dikasih humburger icon aja, soalnya banyak tuh menunya". Audit
375 px 5 Okt: `.nav-links` disembunyikan di media query HP tanpa pengganti, jadi menu Kursus / Periksa Bukti / Pusat Kepercayaan /
Penerbit / Dasbor tidak tercapai dari navbar; di halaman selain beranda navbar meluap ke 386 px. Acc builder: "Mobile dulu".

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B149#1 | di ~~≤ 900 px~~ **≤ 860 px** tombol hamburger tampil di navbar dan membuka panel berisi semua menu navbar yang hidup *(koreksi saat dikerjakan: 860 px = titik `style.css` menyembunyikan `.nav-links`)* | **PASS** 5 Okt | T76 langkah 1 (tombol di tepi 337 px; panel: Katalog Kursus · Dashboard · Periksa Bukti · Pusat Kepercayaan · Penerbit) |
| AC-B149#2 | panel dibangun ulang dari tautan navbar setiap dibuka: teks per bahasa, Dasbor hanya sesudah login, tanda aktif mengikuti rute; tidak ada daftar menu kedua yang bisa basi | **PASS** 5 Okt | T76 langkah 1–5 (aktif benar di `#/verify`, `#/publishers`, `#/app`, `#/agent-hub`; EN → Courses · Dashboard · Check Proof · Trust Center · Publishers) |
| AC-B149#3 | pemilih EN/ID dan nama jaringan pindah ke panel; tombol panel meneruskan klik ke tombol EN/ID asli | **PASS** 5 Okt | T76 langkah 1, 5 (`lencana_lang=en`, panel tetap terbuka, "BNB Smart Chain Testnet") |
| AC-B149#4 | panel tertutup saat tautan dipilih, Esc, ketuk latar, atau layar melebar; `aria-expanded` mengikuti; gulir halaman terkunci selama terbuka | **PASS** 5 Okt untuk tautan / Esc / latar, `aria-expanded`, dan kunci gulir — tutup saat layar melebar dijaga kode (`web/src/nav-mobile.ts`) tanpa pasangan uji | T76 langkah 1, 5 |
| AC-B149#5 | navbar tidak meluap di halaman selain beranda (sebelumnya 386 px) | **PASS** 5 Okt | T76 langkah 2–4 (0 elemen navbar melewati lebar layar di `#/verify`, `#/publishers`, `#/app`) |
| AC-B149#6 | desktop tidak berubah | **PASS** 5 Okt | T76 langkah 6 (1200 px: tombol `display: none`, `.nav-links` tetap `flex`, pemilih bahasa navbar tetap tampil) |
| AC-B149#7 | `index.html` dan `style.css` tidak disunting; berkas pemelihara front-end yang tersentuh hanya `main.ts` (satu impor + satu panggilan), diserahkan lewat OI-30 | **PASS** 5 Okt | `git show --stat 0bfeac0`: kode hanya `web/src/main.ts` (+3), `web/src/nav-mobile.ts`, `web/src/nav-mobile.css`; `web/src/main.ts:34`, `web/src/main.ts:814` |
| AC-B149#8 | gerbang | **PASS** 5 Okt | `npm run build` (tsc + vite) exit 0, `probe` 118/0, `audit` bersih (T76) |
| AC-B149#9 | dipakai di HP sungguhan | **PARTIAL** | lebar HP hanya diukur di iframe 375×812 Chromium headless dengan identitas uji (kunci perangkat, bukan login Privy); hasil di HP builder tidak tercatat di vault; kunci gulir di Safari iOS lama tidak diuji (tidak ada perangkat iOS) — T76 §Batas |

**Batas klaim:** isi yang keluar dari kartu (B150) dan halaman kelas (B151) di luar B149. Panel mengikuti navbar asli lewat nama
`.nav-links`, `.nav-actions`, `#lang-en`, `#lang-id`, `#badge-name` dan titik 860 px; mengganti salah satunya memutus panel
(OI-30).
