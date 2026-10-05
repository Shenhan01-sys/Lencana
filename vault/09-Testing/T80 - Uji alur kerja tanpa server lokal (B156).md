---
tags: [testing, "T80"]
status: active
updated: 2026-10-05
command: signer lokal :8787 dimatikan; npm run sync:numbers (penuh dan --only=serveProbe); server dev web di 127.0.0.1:5173 + Chromium headless; railway service source connect + deployment list + uji asap domain publik
measured: 2026-10-05
result: TIDAK ADA SERVER LOKAL YANG DIBUTUHKAN — baterai hijau tanpa :8787 (serve-probe menyalakan signer sementaranya sendiri), server dev lokal memakai signer cloud, dan backend terdeploy dari main GitHub (deploy pertama sukses, uji asap hijau)
---

# T80 - Uji alur kerja tanpa server lokal (B156)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B156 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Keputusan:** D75 di [[00-Overview/03 - Decisions]] · **Sebelumnya:** [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]]

Pertanyaan yang diuji: sesudah signer demo lokal `127.0.0.1:8787` dimatikan, apakah (1) baterai uji tetap hijau, (2) server
dev front-end di laptop tetap bisa dipakai, dan (3) backend tetap terdeploy tanpa perintah dari laptop.

## Cara mengulang

1. Pastikan tidak ada yang mendengarkan port 8787 (`Get-NetTCPConnection -LocalPort 8787` kosong).
2. `cd signer && npm run sync:numbers -- --only=serveProbe`, lalu `npm run sync:numbers` (penuh), lalu `-- --verify`.
3. `cd web && npm run dev`, buka `#/app` dengan identitas uji (server `127.0.0.1` sekali pakai), catat panggilan `fetch`.
4. `railway service source connect --repo Shenhan01-sys/Lencana --branch main --service signer`, lalu
   `railway deployment list -s signer --json` (hanya id/status/commit dicetak) dan uji asap domain publik.

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | port 8787 sesudah signer demo dimatikan | kosong (anak proses yang selamat dari TaskStop dimatikan per port) |
| 2 | `sync:numbers -- --only=serveProbe` | **50 / 0** dalam 24,5 detik; signer sementara di port bebas dinyalakan dan dimatikan baterai; sesudahnya tidak ada `server.js` yang tertinggal |
| 3a | baterai penuh tanpa :8787, run pertama (01:58Z) | 36 harness berjalan, **35 hijau**; `serve-probe` **50 / 0** lewat signer sementaranya sendiri. Merah: `check:spec` 1 dari 14 — `BAS-HASH-14` "tepi menjawab tapi penambatan tidak cocok: revocation=false suspension=false". Bukan kode: sesudahnya `/healthz` edge melaporkan `matchesChainNow: true` untuk kedua daftar (38 hash diperiksa, 0 tak terperiksa) dan `npm run check:spec` sendiri **14 / 0**; kedua dokumen daftar status di edge ditandatangani 4 Okt 13:05Z, sebelum run hijau sebelumnya (19:03Z) maupun run ini, jadi dokumennya tidak berubah. Dugaan (tidak dibuktikan): pembacaan chain oleh edge sesaat gagal saat run ini |
| 3b | baterai penuh tanpa :8787, run kedua (versi akhir `withOwnSigner`, jeda juga sesudah jawaban non-200) | **36 / 36 hijau**, 1.397 pemeriksaan (`numbers.json` dicatat 2026-10-05T02:20:29Z); `serve-probe` **50 / 0**, `check:spec` **14 / 0**; sesudahnya tidak ada `server.js` tertinggal dan port 8787 kosong; `sync:numbers -- --verify` **ANGKA HIJAU** (68 klaim) |
| 4 | server dev `127.0.0.1:5173`, `#/app` (peserta L_b143) | panggilan signer ke `signer-production-e4f2.up.railway.app`: `/catalog/published` 200, `/me/roles` 200, `/me/records` 200; tidak ada panggilan ke `127.0.0.1:8787`; Ringkasan tampil |
| 5 | sambungkan layanan ke GitHub | sumber `Shenhan01-sys/Lencana` cabang `main`; dua deployment terpicu (perintah dijalankan dua kali), yang terbaru `dc4925c6` **SUCCESS** dari commit `67a6549`, yang lain diganti |
| 5b | pengaturan layanan lewat `railway api` (`serviceInstanceUpdate`), dibaca balik dengan `serviceInstance` | `healthcheckPath` `/catalog/published` (120 s) — dorongan tidak memindahkan lalu lintas ke kontainer yang belum menjawab; `restartPolicyType` `ON_FAILURE` ×5; `watchPatterns` `/signer/**`, `/web/src/**`, `/web/package.json`, `/web/package-lock.json`, `/web/.npmrc`, `/web/tsconfig.json` — commit yang hanya menyentuh vault tidak mendeploy ulang backend; sumber `Shenhan01-sys/Lencana` |
| 6 | uji asap signer hasil build GitHub | `/catalog/published` 200, `/healthz` 200 (0,38 s), `POST /me/roles` alamat acak 200, ulangan nonce **401**; log start: tanpa `.env`, konteks JSON-LD sha256 cocok, issuer `agent-cloud` |

## Batas

- Server dev Vite dan harness tetap proses sementara di laptop — alat kerja untuk melihat dan menguji perubahan sebelum
  didorong, bukan server yang dibutuhkan produk.
- Menguji kode signer yang belum dideploy dari peramban tetap butuh signer lokal sementara
  (`VITE_SIGNER_URL=http://127.0.0.1:8787 npm run dev`).
- Deploy otomatis diuji dengan pemicu sambungan; deploy dari dorongan berikutnya diperiksa saat dorongan itu terjadi.

## Bersih-bersih

Tidak ada baris yang ditulis selain nonce tanda tangan. Peramban ditutup sesudah penyimpanannya dikosongkan.
