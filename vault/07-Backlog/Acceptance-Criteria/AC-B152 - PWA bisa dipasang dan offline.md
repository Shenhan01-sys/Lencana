---
tags: [acceptance-criteria, B152]
status: active
updated: 2026-10-05
---

# AC-B152 - PWA bisa dipasang dan offline

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B152 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T81 - Uji PWA bisa dipasang dan offline (B152)]] ·
**Summary:** [[08-Results/B152 - Executive Summary]] · **OI:** OI-33 di [[10-Contributors/Open-Items-for-Dave]]

Permintaan builder 5 Okt: "ada task baru, dibuat jadi pwa jg". Keadaan 5 Okt: tidak ada web manifest, service worker,
`theme-color`, maupun ikon PNG. Dikerjakan dalam urutan "Mobile dulu" yang disetujui builder.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B152#1 | manifest: nama, `start_url` ke dasbor (`./#/app`), `display` standalone, warna tema = latar `body` (`#090a0c`), ikon 192 / 512 / maskable 512 + apple-touch 180 dari logo | **PASS** 5 Okt | T81 langkah 1, 5 (galat manifest [], `theme_color` / `background_color` `rgba(9,10,12,1)`, 3 ikon terbaca) |
| AC-B152#2 | syarat dipasang terpenuhi, termasuk di HTTPS | **PASS** 5 Okt | T81 langkah 4 (127.0.0.1) dan langkah 7 (`https://lencana-psi.vercel.app`): `Page.getInstallabilityErrors` [] |
| AC-B152#3 | service worker mengendalikan halaman | **PASS** 5 Okt | T81 langkah 2, 7 (`activated`, mengendalikan halaman sejak kunjungan pertama) |
| AC-B152#4 | yang disimpan hanya cangkang + berkas build ber-hash; **tidak pernah** yang beda asal (signer, RPC chain, dokumen tepi, Privy, font) | **PASS** 5 Okt — dibaca dari isi cache sesudah kunjungan, lokal dan Vercel | T81 langkah 3, 7 (`shell`: `/`; `build`: 2 berkas ber-hash; 0 entri beda asal) |
| AC-B152#5 | cangkang tampil saat jaringan putus | **PASS** 5 Okt — offline disimulasikan dengan mematikan asal, bukan mode pesawat | T81 langkah 6 (judul, navbar, landing termuat; JS dari cache) |
| AC-B152#6 | pendaftaran satu baris, hanya di build produksi; berkas pemelihara front-end yang tersentuh: `index.html` (empat tag `<head>`) dan `main.ts` (satu impor + satu panggilan), diserahkan lewat OI-33 | **PASS** 5 Okt untuk jejak berkas — "hanya build produksi" dijaga kode (`web/src/pwa.ts`) tanpa pasangan uji di server dev | `git show --stat c786550`; `web/src/main.ts:38`, `web/src/main.ts:41` |
| AC-B152#7 | gerbang | **PASS** 5 Okt | `npm run build` exit 0, `tsc` 0, `probe` 118/0 (T81) |
| AC-B152#8 | dipasang ke layar utama HP sungguhan | **PARTIAL** | syarat pasang terukur (#2), tetapi tombol pasang tidak bisa ditekan dari Chromium headless; percobaan builder di HP tidak tercatat di vault — T81 §Batas |

**Batas klaim:** gambar besar tanpa hash (`assets/*.jpg`) sengaja tidak di-cache service worker; yang tampil di tangkapan offline
berasal dari cache HTTP peramban. Mengubah strategi cache di `web/public/sw.js` = naikkan `VERSION` (OI-33).
