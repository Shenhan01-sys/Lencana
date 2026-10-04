---
tags: [testing, "T76"]
status: active
updated: 2026-10-05
command: vite dev + Chromium headless; iframe 375×812 (dan 1200 px untuk desktop); identitas peserta uji lewat server 127.0.0.1 sekali pakai
measured: 2026-10-05
result: MENU HAMBURGER JALAN DI LEBAR HP — lima menu tercapai dari panel dengan tanda aktif yang benar, EN/ID pindah ke panel, panel tertutup oleh tautan/Esc/latar; navbar tidak lagi meluap di Verifier dan Penerbit; desktop tidak berubah
---

# T76 - Uji peramban menu hamburger navbar (B149)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B149 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Untuk pemelihara front-end:** OI-30 di [[10-Contributors/Open-Items-for-Dave]]

Pertanyaan yang diuji: sesudah `web/src/nav-mobile.ts` + `nav-mobile.css` dipasang dari `main.ts`, apakah semua menu navbar
bisa dicapai dari layar HP, apakah panelnya mengikuti keadaan navbar asli (bahasa, tautan Dasbor yang hanya muncul sesudah
login, tanda aktif), apakah navbar berhenti meluap di halaman selain beranda, dan apakah desktop tetap sama.

## Cara mengulang

1. `cd web && npm run dev` (5173).
2. Identitas peserta uji diserahkan ke halaman lewat server `127.0.0.1` sekali pakai (kunci tidak dicetak), supaya tautan
   Dasbor ikut tampil; bahasa lewat `localStorage['lencana_lang']`.
3. Chromium headless tidak bisa lebih sempit dari 500 px, jadi halaman dimuat di iframe 375×812 dari asal yang sama; setiap
   rute dimuat penuh (`/?n=<acak>#<rute>`). Per rute: tombol `.nav-burger` terlihat, jumlah elemen navbar yang melewati lebar
   layar, isi panel sesudah tombol diklik, lalu Esc.

## Hasil 5 Okt

| # | rute / langkah | hasil |
|---|---|---|
| 1 | `#/` (ID, login peserta uji) | tombol tampil di kanan (tepi 337 px); **0** elemen navbar melewati lebar layar; panel: Katalog Kursus · Dashboard · Periksa Bukti · Pusat Kepercayaan · Penerbit, lalu EN / ID (ID aktif) dan nama jaringan; terbuka → `aria-expanded=true` dan gulir halaman terkunci (`html.nav-open`); Esc → tertutup, `aria-expanded=false` |
| 2 | `#/verify` | **0** luapan (audit 375 px 5 Okt, sebelum B149: navbar meluap ke **386 px**); "Periksa Bukti" bertanda aktif |
| 3 | `#/publishers` | **0** luapan; "Penerbit" aktif |
| 4 | `#/app` | **0** luapan; "Dashboard" aktif — tautan khusus akun ikut terbaca dari navbar |
| 5 | `#/agent-hub`, interaksi | "Pusat Kepercayaan" aktif; fokus pindah ke tautan pertama; panel menempel di bawah navbar (70 px). EN di panel → menu menjadi Courses · Dashboard · Check Proof · Trust Center · Publishers, EN aktif, `lencana_lang=en`, panel tetap terbuka, nama jaringan "BNB Smart Chain Testnet". Klik "Check Proof" → `#/verify`, panel tertutup, kunci gulir lepas. Buka lagi, ketuk latar → tertutup |
| 6 | 1200 px, `#/verify` | tombol hamburger `display: none`, `.nav-links` tetap `flex`, pemilih bahasa navbar tetap tampil, panel tersembunyi |

Dua hash salah ketik di skrip uji (`#/courses`, `#/trust`) jatuh ke halaman bawaan; hasilnya sama dengan baris 1 (0 luapan,
tanpa tanda aktif). Tangkapan panel terbuka di 375 px disimpan di luar repo.

**Gerbang 5 Okt:** `npm run build` (tsc + vite) exit 0; `npm run probe` **118 / 0**; `npm run audit` bersih.

## Batas

- Iframe 375 px di Chromium headless, bukan HP sungguhan; builder melihatnya di HP sendiri.
- Identitas uji memakai kunci perangkat, bukan login Privy builder.
- Gulir di balik panel dikunci dengan `overflow: hidden` pada `html` dan `body`; Safari iOS lama bisa tetap menggulir lewat
  sentuhan. Tidak diuji — tidak ada perangkat iOS di mesin ini.
- Isi yang keluar dari kartu (B150) dan halaman kelas (B151) di luar B149.

## Bersih-bersih

Tidak ada baris database. Identitas uji hanya ada di penyimpanan sesi peramban headless; peramban ditutup sesudah
penyimpanannya dikosongkan.
