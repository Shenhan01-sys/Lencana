---
tags: [results, executive-summary, B166]
status: active
updated: 2026-10-06
---

# B166 - Executive Summary — Lencana selalu gelap

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B166 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B166 - Lencana selalu gelap]] · **Testing:** [[09-Testing/T89 - Uji peramban Lencana selalu gelap (B166)]] · **Asal:** temuan T88 langkah 19 (B165)

## 1. Apa yang diubah

Satu berkas: `web/src/style.css`. Blok `@media (prefers-color-scheme: light)` (token terang: `--bg-app` `#f5f5f5`, `--text-main` `#1e2329`, emas `#d99e00`, …) dibuang dan `:root` diberi
`color-scheme: dark`, supaya kontrol bawaan peramban (isian, bilah gulir, dialog) ikut gelap. Tidak pernah ada tombol tema; yang terjadi hanya efek samping pengaturan sistem pengguna: di sistem terang
tulisan "Lencana" di navbar menjadi gelap di atas gelap dan kapsul menjadi terang. Keputusan builder 5 Okt malam: "Iya, slalu gelap".

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| token FE di sistem disetel terang | berbeda dari sistem gelap (`--bg-app` `#f5f5f5`) | identik dengan sistem gelap (T89 langkah 1) |
| tulisan "Lencana" di navbar, sistem terang | gelap di atas gelap (T88 langkah 19) | `rgb(234,236,239)` (T89 langkah 2) |
| lembar dan penampil sertifikat, sistem terang | gelap | gelap (T89 langkah 3) |
| `tsc` · `probe` · `build` | 0 · 210/0 · 0 | 0 · 212/0 · 0 (+2 adalah pemeriksaan B167, bukan B166) |

## 3. Status

~~**SELESAI di kode, belum LIVE** — belum didorong.~~ **SELESAI · LIVE** — didorong `e2fc546..539d02e` atas kata builder ("Gas", 6 Okt 00.34 WIB); bundel produksi `assets/index-Czasyl8x.js` = build lokal, CSS produksi tanpa `prefers-color-scheme: light` dan dengan `color-scheme: dark`; T89 diulang di produksi dengan hasil sama (AC-B166#8 PASS); run `deploy-signer` 37349466841 sukses. **TANPA TAG KODE**: satu-satunya berkas yang berubah, `web/src/style.css`, tidak dipindai penjaga marker.

## 4. Risiko tersisa

- Hanya halaman Kredensial dan lembar yang dibuka di sistem terang; halaman lain memakai token yang sama tetapi tidak diperiksa satu per satu.
- Warna yang ditulis tetap (bukan token) di halaman lain tidak pernah ikut berubah, jadi tidak ada risiko baru; tetapi tidak ada audit menyeluruh bahwa semuanya cukup kontras di atas gelap.

## 5. Bukti

T89 langkah 1–4; `web/src/style.css` (komentar penjelas dan `color-scheme: dark`).
