---
tags: [testing, "T79"]
status: active
updated: 2026-10-05
command: vite dev + signer demo lokal + Chromium headless; iframe 375×812 dan 1440 px; tiga kursi (peserta L_b143, pemilik agen #2548, anggota penerbit) lewat server identitas 127.0.0.1 sekali pakai
measured: 2026-10-05
result: TIDAK ADA LAGI ISI YANG KELUAR KARTU DI 375 PX — 20 rute berbeda di tiga kursi (termasuk halaman publik) diaudit, 5 bermasalah diperbaiki dan diukur ulang 0 luapan / 0 teks terpotong; area geser (matriks Verifier, chip katalog) kini bertanda; desktop tidak berubah
---

# T79 - Uji peramban isi keluar kartu di HP (B150)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B150 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Untuk pemelihara front-end:** OI-32 di [[10-Contributors/Open-Items-for-Dave]]

Pertanyaan yang diuji: di lebar HP, adakah isi yang keluar dari kartunya atau dari layar — di dasbor ketiga kursi dan di
halaman publik — dan sesudah diperbaiki, apakah desktop tetap sama.

## Cara mengulang

1. `cd web && npm run dev` (5173); `cd signer && LANCENA_ORIGIN=demo npm run serve` (8787).
2. Identitas uji diserahkan ke halaman lewat server `127.0.0.1` sekali pakai (kunci tidak dicetak): peserta L_b143
   (terdaftar di Kelas Uji), R_owner (pemilik agen #2548), M_member (anggota penerbit `hire=1 appoint=1`).
3. Halaman dimuat penuh di iframe 375×812 dari asal yang sama. Alat audit menandai tiga hal: (a) elemen yang melewati tepi
   layar dan **tidak** berada di dalam pembungkus yang memotong/menggeser; (b) elemen yang melewati tepi kartu terdekatnya
   (kelas `card`/`panel`/`box`/`tile`) bila kartunya tidak memotong; (c) teks yang terpotong pembungkus `overflow: hidden`
   (latar dekoratif dikecualikan). Area yang bisa digeser diperiksa terpisah (`scrollWidth` vs `clientWidth`) dan dilihat.

## Sebelum perbaikan (5 Okt)

| halaman (375 px) | temuan |
|---|---|
| `#/app` Ringkasan (peserta) | `.ov-path-top`, `.ov-pbar`, `small` di 85–492 px pada `.ov-card` 16–344 px; halaman selebar 492 px |
| `#/app/grades` Nilai | label ambang `.ch-pass-label` 225–369 px pada kartu `.gr-course` 16–344 px |
| `#/agent-hub` Pusat Kepercayaan | 3 × `.agent-card` 24–384 px (kolom grid minimal 360 px); halaman 384 px |
| `#/publishers` Penerbit | `.agent-card` 24–384 px + URL dokumen penerbit **terpotong** 65–473 px oleh kartu `overflow: hidden` |
| `#/verify` Verifier | matriks 673 px di dalam area geser 274 px — bisa digeser, tanpa tanda apa pun |
| `#/app/courses` Katalog | chip saring di area geser 290 px (isi 414 / 497 / 365 px) terpotong tegas di tepi, tanpa tanda geser. Temuan audit pagi (chip meluap ke 419–502 px) **tidak terulang** — barisnya memang area geser |
| bersih | peserta: `#/app/classes`, `/credentials`, `/wallet`, `/account`, beranda, detail kursus; pemilik: `#/app/owner`; penerbit: `#/app/pub` + agents, author, courses, essays, learners, revenue |

## Perbaikan dan hasil

| # | perbaikan | sesudahnya (375 px) | desktop 1440 px |
|---|---|---|---|
| 1 | `web/src/pages/dash-catalog.css`: `.ov-path { min-width: 0 }` + `.ov-path-main { grid-template-columns: minmax(0, 1fr) }` | **0**; baris 85–321 px, judul ber-ellipsis. *(Perbaikan lapis luar saja diukur masih menyisakan isi 85–492 px — lapis dalamnya juga grid `auto`.)* | baris 365–865 px di kartunya |
| 2 | `web/src/lib/charts.ts`: sisi label ambang diukur sesudah tergambar (dan saat layar berubah ukuran), bukan dari angka ambang saja | **0**; label 53–197 px di dalam trek 33–327 px, pindah ke kiri garis | label tetap di kanan garis (1023–1167 di trek 493–1350), sama seperti sebelumnya |
| 3 | `web/src/mobile.css` (baru, satu impor di `main.ts`): kolom kartu `minmax(min(360px, 100%), 1fr)`, padding 22 px di ≤ 560 px, URL/alamat di kartu memecah | **0** luapan, **0** terpotong; kartu 312 px; URL penerbit memecah ke baris berikut | tiga kolom ±363 px, padding 40 px |
| 4 | `web/src/mobile.css`: bayangan tepi area geser matriks Verifier (lapis `local` sewarna panel `rgb(16, 19, 24)` + lapis `scroll` emas) | 4 lapis latar terpasang; cahaya emas tipis di tepi kanan | tidak berlaku (≤ 760 px) |
| 5 | `web/src/pages/dash-catalog.css`: tepi kanan baris chip memudar + ruang 24 px di ujung | pudar terlihat; di ujung geser chip terakhir berhenti di 295 px, tepi baris 325 px | tidak berlaku (≤ 860 px) |

**Gerbang 5 Okt:** `npm run build` (tsc + vite) exit 0; `npm run probe` **118 / 0**.

**Pengamatan yang tidak dikerjakan di B150:**
- Baris matriks Verifier sangat tinggi di HP (kolom sempit, deskripsi aturan membungkus panjang). Tata letak bertumpuk per
  baris butuh label kolom di markup (`index.html` + perender matriks) — diserahkan ke Dave (OI-32).
- Label bilah tab bawah dasbor terpotong di 375 px ("Ringka…", "Kreden…") — ellipsis yang disengaja, bukan luapan.

## Batas

- Iframe di Chromium headless, bukan HP sungguhan; identitas uji memakai kunci perangkat, bukan login Privy.
- Halaman penerbit dibuka dengan anggota `hire=1 appoint=1`; isi tab untuk hak lain (susun/terbit) bisa berbeda.

## Bersih-bersih

Tidak ada baris yang ditulis selain nonce tanda tangan baca. Penyimpanan peramban dikosongkan lalu peramban ditutup.
