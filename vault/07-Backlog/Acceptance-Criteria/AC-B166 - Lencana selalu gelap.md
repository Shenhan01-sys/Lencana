---
tags: [acceptance-criteria, B166]
status: active
updated: 2026-10-06
---

# AC-B166 - Lencana selalu gelap

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B166 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T89 - Uji peramban Lencana selalu gelap (B166)]] ·
**Summary:** [[08-Results/B166 - Executive Summary]] · **Terkait:** B165 (temuan T88 langkah 19), [[03-Frontend/01 - Frontend]]

Keputusan builder 5 Okt malam ("Iya, slalu gelap") atas temuan B165: di sistem yang disetel terang, token FE di `web/src/style.css` (blok `@media (prefers-color-scheme: light)`)
menukar sebagian tampilan — latar body tetap gelap tetapi tulisan "Lencana" di navbar menjadi gelap di atas gelap dan kapsul menjadi terang. Tidak pernah ada tombol tema.
Yang berubah: blok media itu dibuang dan `:root` mendapat `color-scheme: dark`. Tidak ada berkas lain yang berubah.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B166#1 | blok `@media (prefers-color-scheme: light)` di `web/src/style.css` tidak ada lagi; `:root` memuat `color-scheme: dark` | **PASS** | `grep` hanya menemukan kata itu di komentar penjelasan; T89 membaca `color-scheme` = `dark` |
| AC-B166#2 | dengan sistem disetel terang, token FE **sama persis** dengan di sistem gelap | **PASS** | T89: `--bg-app` `#0b0e11`, `--text-main` `#eaecef`, `--bnb-gold` `#f0b90b` di kedua sistem |
| AC-B166#3 | dengan sistem terang, tulisan "Lencana" di navbar terang (tidak gelap di atas gelap) dan teks halaman terang di atas latar gelap | **PASS** | T89: navbar `rgb(234,236,239)`; `body` `rgb(11,14,17)` dengan teks `rgb(248,249,250)`; judul halaman dan judul kartu `rgb(248,249,250)`; tangkapan `b166-sistem-terang.png` |
| AC-B166#4 | lapisan dan lembar sertifikat tetap gelap di sistem terang | **PASS** | T89: lapisan `rgb(11,14,17)`, lembar `rgb(11,14,17)`, `data-paper` `gelap` |
| AC-B166#5 | halaman lain di sistem terang | **PARTIAL** | hanya halaman Kredensial (dan lembar) yang dibuka di sistem terang; halaman lain memakai token yang sama (AC#2) tetapi tidak dibuka satu per satu |
| AC-B166#6 | tidak ada tombol tema dan tidak ada kode pemilih tema di `web/src` | **PASS** | `grep -rn "prefers-color-scheme" web/src` → hanya komentar di `style.css` |
| AC-B166#7 | gerbang | **PASS** | `tsc` 0, `build` 0, `probe` 212/0 (tidak ada pemeriksaan B166 di `probe` — perubahannya CSS), `audit` bersih, `check:labels` 8/0; baterai di Summary |
| AC-B166#8 | **LIVE** | ~~**OPEN** — menunggu dorongan atas kata builder~~ **PASS** 6 Okt — didorong `e2fc546..539d02e` atas kata builder ("Gas", 6 Okt 00.34 WIB); bundel produksi `assets/index-Czasyl8x.js` (935.503 byte) sama dengan `npm run build` lokal dan CSS produksi `index-8FlGF6oI.css` tidak lagi memuat `prefers-color-scheme: light` dan memuat `color-scheme: dark`; skrip T89 diulang terhadap produksi: token terang = gelap (`#0b0e11` / `#eaecef` / `#f0b90b`), `color-scheme` dark, tulisan "Lencana" `rgb(234,236,239)`, lembar dan lapisan gelap, nol galat | T89 §LIVE |

**Batas klaim:** "selalu gelap" diuji di halaman Kredensial; cetak sertifikat dengan latar terang (B167) adalah pilihan terpisah yang hanya berlaku di media `print`.
