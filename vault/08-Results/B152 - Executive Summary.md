---
tags: [results, executive-summary, B152]
status: active
updated: 2026-10-05
---

# B152 - Executive Summary — situs bisa dipasang sebagai aplikasi (PWA)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B152 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B152 - PWA bisa dipasang dan offline]] ·
**Testing:** [[09-Testing/T81 - Uji PWA bisa dipasang dan offline (B152)]] · **OI:** OI-33 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- `web/public/manifest.webmanifest`: nama "Lencana — Trusted Learning", `start_url` `./#/app`, `display` standalone, warna
  `#090a0c` (= latar `body`).
- Ikon dari `lencana-logo.jpg`: `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo 54 % di zona aman),
  `apple-touch-icon.png` 180.
- `web/public/sw.js`: cangkang jaringan-dulu dengan salinan untuk offline; berkas build ber-hash dan ikon cache-dulu; **tidak
  pernah** menyentuh yang beda asal (signer, RPC, tepi, Privy, font), `/signer`, permintaan Range, atau gambar besar tanpa hash.
- `web/src/pwa.ts` mendaftarkan service worker hanya di build produksi; `web/index.html` mendapat empat tag `<head>`;
  `web/src/main.ts` satu impor + satu panggilan (`web/src/main.ts:38`, `web/src/main.ts:41`) — OI-33.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| manifest · ikon PNG · service worker · `theme-color` | tidak ada | ada |
| `Page.getInstallabilityErrors` | — | [] di 127.0.0.1 dan di `https://lencana-psi.vercel.app` (T81 langkah 4, 7) |
| galat manifest | — | [] (T81 langkah 5) |
| isi cache sesudah kunjungan | — | cangkang `/` + 2 berkas ber-hash, 0 entri beda asal — lokal dan Vercel (T81 langkah 3, 7) |
| asal dimatikan, halaman dimuat ulang | — | cangkang, navbar, landing termuat dari service worker (T81 langkah 6) |
| `npm run build` · `tsc` · `probe` | — · — · 118/0 | exit 0 · 0 · 118/0 |

## 3. Status

**SELESAI · LIVE** di `https://lencana-psi.vercel.app` sesudah dorongan `d0ee46c..c786550` (T81 langkah 7). Memasang ke layar
utama HP sungguhan belum tercatat (AC-B152#8 **PARTIAL**).

## 4. Risiko tersisa

- Tombol pasang di HP sungguhan tidak bisa ditekan dari headless; hasil percobaan builder tidak ada di vault.
- Offline disimulasikan dengan mematikan asal, bukan mode pesawat.
- Mengubah strategi cache tanpa menaikkan `VERSION` di `sw.js` membiarkan cache lama; mengganti warna latar halaman tanpa
  menyamakan manifest + `theme-color` membuat warna bilah aplikasi berbeda (OI-33).

## 5. Bukti

Commit `c786550` (kode + T81 langkah 1–6), `f28ac21` (penutupan: T81 langkah 7 di Vercel HTTPS, marker `web/src/pwa.ts` →
SELESAI). T81 langkah 1–7.
