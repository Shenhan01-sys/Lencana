---
tags: [results, executive-summary, B149]
status: active
updated: 2026-10-05
---

# B149 - Executive Summary — menu hamburger navbar di HP

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B149 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B149 - Menu hamburger navbar HP]] ·
**Testing:** [[09-Testing/T76 - Uji peramban menu hamburger navbar (B149)]] · **OI:** OI-30 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- **Modul baru** `web/src/nav-mobile.ts` + `web/src/nav-mobile.css`, dipasang dengan satu impor dan satu panggilan dari
  `web/src/main.ts` (`web/src/main.ts:34`, `web/src/main.ts:814`). Di ≤ 860 px tombol hamburger di ujung navbar membuka panel.
- **Panel tanpa daftar menu sendiri.** Isinya dibangun ulang dari `.nav-links a` yang hidup setiap dibuka: teks per bahasa,
  Dasbor hanya sesudah login, tanda aktif tetap diurus `main.ts`. Nama jaringan dan pemilih EN/ID (meneruskan klik ke tombol
  asli) ikut di panel.
- **Pemilih bahasa navbar disembunyikan di ≤ 860 px** — penyebab navbar meluap ke 386 px di halaman selain beranda.
- Titik lebar ~~900 px~~ **860 px** — dikoreksi saat dikerjakan: 860 px adalah titik `style.css` menyembunyikan `.nav-links`;
  900 px akan memunculkan tombol di samping menu yang masih tampil.
- `index.html`, `style.css`, `i18n.ts` tidak disunting; serah terima ke Dave lewat OI-30.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| menu navbar yang tercapai di 375 px | tidak ada — 5 menu disembunyikan tanpa pengganti | 5 menu di panel, tanda aktif benar (T76 langkah 1–5) |
| luapan navbar di `#/verify` (375 px) | sampai 386 px | 0 elemen melewati layar (T76 langkah 2) |
| desktop 1200 px | — | tidak berubah (T76 langkah 6) |
| `npm run build` | — | exit 0 |
| `probe` | 118/0 | 118/0 |
| `audit` | — | bersih |

## 3. Status

**SELESAI** (5 Okt). Diukur di iframe 375 px Chromium headless, bukan HP sungguhan (AC-B149#9 **PARTIAL**).

## 4. Risiko tersisa

- HP sungguhan belum tercatat; di Safari iOS lama gulir di balik panel bisa tetap jalan lewat sentuhan (`overflow: hidden` pada
  `html` + `body`) — tidak diuji, tidak ada perangkat iOS.
- Panel bergantung pada nama `.nav-links`, `.nav-actions`, `#lang-en`, `#lang-id`, `#badge-name` dan titik 860 px; mengganti
  salah satunya tanpa menyesuaikan `nav-mobile.ts` / `nav-mobile.css` memutus panel (OI-30).
- Identitas uji memakai kunci perangkat, bukan login Privy.

## 5. Bukti

Commit `0bfeac0`. T76 langkah 1–6. Gerbang: `npm run build` exit 0, `probe` 118/0, `audit` bersih (5 Okt).
