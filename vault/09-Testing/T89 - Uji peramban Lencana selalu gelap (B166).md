---
tags: [testing, "T89"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core` dengan `prefers-color-scheme` diemulasikan `light` dan `dark`; halaman `#/app/credentials` dengan identitas uji (alamat B153 publik, kunci acak)
measured: 2026-10-06
result: DI SISTEM TERANG TOKEN FE SAMA PERSIS DENGAN DI SISTEM GELAP — `--bg-app` #0b0e11, `--text-main` #eaecef, `--bnb-gold` #f0b90b, `color-scheme` dark; tulisan "Lencana" di navbar rgb(234,236,239) (sebelum B166 gelap di atas gelap, T88 langkah 19); lapisan dan lembar sertifikat tetap gelap; nol galat konsol. LIVE sudah: skrip diulang terhadap produksi (`index-Czasyl8x.js`) dengan hasil sama
---

# T89 - Uji peramban Lencana selalu gelap (B166)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B166 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B166 - Lencana selalu gelap]] · **Summary:** [[08-Results/B166 - Executive Summary]] · **Terkait:** T88 (temuan asal, langkah 19), T90

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara).
2. Dua konteks Chrome bersih, satu dengan `prefers-color-scheme: light` dan satu `dark` (`page.emulateMediaFeatures`), identitas uji dipasang lewat `evaluateOnNewDocument` seperti di T88.
3. Buka `#/app/credentials`, tunggu `.cred-card`, baca `getComputedStyle` token di `:root` dan warna elemen; lalu buka lembar B153 dan baca latar lapisan dan lembar.

## Hasil 6 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | token di sistem **terang** vs **gelap** | identik: `--bg-app` `#0b0e11`, `--text-main` `#eaecef`, `--bnb-gold` `#f0b90b`; `color-scheme` terbaca `dark` |
| 2 | warna di sistem terang | `body` `rgb(11,14,17)`, teks `rgb(248,249,250)`; judul halaman dan judul kartu `rgb(248,249,250)`; tulisan "Lencana" di navbar **`rgb(234,236,239)`** (T88 langkah 19 mencatatnya gelap); kapsul "BNB Smart Chain Testnet" dan saklar bahasa gelap di tangkapan (sebelum B166 keduanya putih di sistem terang, T88 `b165-sistem-terang-daftar.png`) |
| 3 | lembar di sistem terang | lapisan `rgb(11,14,17)`, lembar `rgb(11,14,17)`, `data-paper` `gelap` |
| 4 | galat | `pageerror` dan `console.error`: **0** |

Tangkapan: `b166-sistem-terang.png` (daftar kartu di sistem terang — gelap penuh, navbar terbaca).

## LIVE (6 Okt, sesudah dorongan `e2fc546..539d02e`)

Skrip yang sama dijalankan terhadap `https://lencana-psi.vercel.app/` sesudah bundel produksi berganti dari `assets/index-DjuuhFae.js` ke `assets/index-Czasyl8x.js` (935.503 byte — nama dan ukuran sama dengan `npm run build` lokal).
CSS produksi `assets/index-8FlGF6oI.css` tidak lagi memuat `prefers-color-scheme: light` dan memuat `color-scheme: dark`. Hasil: token di sistem terang = sistem gelap (`--bg-app` `#0b0e11`, `--text-main` `#eaecef`, `--bnb-gold` `#f0b90b`),
`color-scheme` dark, `body` `rgb(11,14,17)`, tulisan "Lencana" di navbar `rgb(234,236,239)`, lapisan dan lembar `rgb(11,14,17)`, `pageerror`/`console.error` 0. Run `deploy-signer` 37349466841 sukses (1m1s; dipicu filter jalur, signer tidak berubah).

## Batas

- Hanya halaman Kredensial dan lembar yang dibuka di sistem terang; halaman lain memakai token yang sama tetapi tidak dibuka satu per satu.
- Chrome 154, tanpa perangkat dengan mode terang sungguhan (emulasi media).
- ~~Produksi belum menjalankan perubahan ini (AC-B166#8 OPEN) sampai dorongan atas kata builder.~~ Produksi sudah menjalankannya dan skripnya diulang (bagian "LIVE"; AC-B166#8 PASS).
