---
tags: [testing, "T81"]
status: active
updated: 2026-10-05
command: npm run build; vite preview dist di 127.0.0.1:4175 (konteks aman); Chromium headless 412 px; CDP Page.getInstallabilityErrors + Page.getAppManifest; cache service worker dibaca dari halaman; asal dimatikan lalu halaman dimuat ulang
measured: 2026-10-05
result: BISA DIPASANG DAN MEMBUKA CANGKANGNYA SAAT OFFLINE — 0 galat installability, manifest terbaca tanpa galat, service worker mengendalikan halaman, cache hanya berisi cangkang + berkas build ber-hash; dengan server mati halaman tetap termuat. Lulus juga di Vercel (HTTPS) sesudah didorong — langkah 7
---

# T81 - Uji PWA bisa dipasang dan offline (B152)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B152 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Untuk pemelihara front-end:** OI-33 di [[10-Contributors/Open-Items-for-Dave]]

Pertanyaan yang diuji: apakah situs memenuhi syarat dipasang sebagai aplikasi di HP, apakah service worker hanya menyimpan
yang boleh disimpan (cangkang dan berkas build — bukan jawaban signer, RPC chain, atau dokumen tepi), dan apakah cangkangnya
terbuka saat jaringan putus.

## Cara mengulang

1. `cd web && npm run build`, lalu `npx vite preview --outDir dist --port 4175` (127.0.0.1 = konteks aman, service worker
   boleh jalan tanpa HTTPS).
2. Buka `http://127.0.0.1:4175/`; tunggu `navigator.serviceWorker.ready`; baca `caches.keys()` dan isi tiap cache.
3. CDP `Page.getInstallabilityErrors` dan `Page.getAppManifest`.
4. Matikan server pratinjau (asal tidak terjangkau), muat ulang halaman.

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | build | exit 0; `dist/manifest.webmanifest`, `dist/sw.js`, `dist/icons/` (192, 512, maskable 512, apple-touch 180); tag `<head>` ditulis ulang relatif (`./manifest.webmanifest`, `./icons/…`) mengikuti `base: './'` |
| 2 | service worker | scope `http://127.0.0.1:4175/`, `activated`, **mengendalikan halaman** pada kunjungan pertama (`clients.claim`) |
| 3 | isi cache | `lencana-sw-v1-shell`: `/`; `lencana-sw-v1-build`: `/assets/index-CmWstCOB.css`, `/assets/index-BF23dMCw.js` — keduanya disimpan saat pemasangan dari rujukan cangkang. Tidak ada entri beda asal |
| 4 | `Page.getInstallabilityErrors` | **[]** (tanpa galat) |
| 5 | `Page.getAppManifest` | galat manifest **[]**; `start_url` `…/#/app`, `display` standalone, `theme_color` / `background_color` `rgba(9,10,12,1)`, 3 ikon terbaca |
| 6 | server pratinjau dimatikan, halaman dimuat ulang | termuat dari service worker: judul, navbar + tombol menu, landing terpasang ("Learn, test, and prove it.") — JS dari cache, bukan jaringan |
| 7 | sesudah dorongan `d0ee46c..c786550`: `https://lencana-psi.vercel.app` (HTTPS) | `manifest.webmanifest` **200** `application/manifest+json`, `sw.js` tersaji (bukan tulis-ulang ke `index.html`); service worker scope `https://lencana-psi.vercel.app/`, `activated`, mengendalikan halaman; cache `shell`: `/`, `build`: `/assets/index-BF23dMCw.js`, `/assets/index-CmWstCOB.css` — tanpa entri beda asal; `Page.getInstallabilityErrors` **[]** |

**Gerbang 5 Okt:** `npm run build` exit 0; `tsc` exit 0; `npm run probe` **118 / 0**.

## Batas

- Offline disimulasikan dengan mematikan asal (domain Network CDP tidak tersedia di alat uji ini), bukan mode pesawat.
- Gambar besar tanpa hash (`assets/*.jpg`) sengaja tidak di-cache; yang tampil di tangkapan offline berasal dari cache HTTP
  peramban, bukan service worker.
- ~~Pemasangan ke layar utama dan HTTPS di Vercel diperiksa sesudah didorong (tidak bisa sebelum berkasnya terdeploy).~~
  HTTPS di Vercel diperiksa (langkah 7). Memasang ke layar utama HP sungguhan dicoba builder — headless tidak bisa menekan
  tombol pasang.

## Bersih-bersih

Service worker uji dilepas dan cachenya dihapus sebelum peramban ditutup; server pratinjau dimatikan.
