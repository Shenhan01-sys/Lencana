---
tags: [testing, "T78"]
status: active
updated: 2026-10-05
command: railway up (staging dari git archive HEAD + berkas deploy) ke project lencana / production, layanan signer; curl + skrip asap ke domain publik; build produksi web dilayani di IP LAN 172.16.0.2:4174 + Chromium headless dengan peserta sekali-pakai
measured: 2026-10-05
result: SIGNER CLOUD HIDUP DAN DIPAKAI BUILD PRODUKSI — katalog, healthz, preflight CORS, rute bertanda tangan + tolak replay, faucet, dan bayar + daftar Kelas Uji (settlement di chain, struk status 1) semuanya lewat signer-production-e4f2.up.railway.app; Vercel baru ikut sesudah commit front-end didorong
---

# T78 - Uji signer cloud Railway dan build produksi (B154)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B154 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Keputusan:** D74 di [[00-Overview/03 - Decisions]] · **Temuan terkait:** B155 (faucet + gas drip di server publik)

Pertanyaan yang diuji: apakah signer yang berjalan di Railway (project lencana) bisa menggantikan laptop + ngrok untuk
front-end produksi — membaca DB, memeriksa tanda tangan, mencetak koin uji, dan menyelesaikan pembayaran kelas di chain —
dan apakah build produksi front-end yang dibuka dari host publik benar-benar memanggilnya.

## Cara mengulang

1. Staging unggahan: `git archive HEAD signer web/package.json web/package-lock.json web/.npmrc web/tsconfig.json web/src`
   diekstrak ke direktori sementara (hanya berkas ter-commit: `.env`, `signer/.keys`, `signer/.store`, `.mcp.json`,
   `References/` tidak ikut), lalu `railway up <staging> --path-as-root -s signer -e production --ci`.
2. Variabel layanan diisi skrip di luar repo lewat `railway variable set <NAMA> --stdin` (nilai tidak pernah di argv atau
   keluaran); daftar nama diperiksa dengan `railway variable list --json` yang disaring ke nama saja.
3. Asap: `curl` ke `/catalog/published`, `/healthz`, preflight `OPTIONS` dengan `Origin: https://lencana-psi.vercel.app`;
   skrip asap: `POST /me/roles` dari alamat acak sekali pakai, lalu tanda tangan yang sama dikirim ulang.
4. Front-end: `npm run build`, `vite preview --host 172.16.0.2 --port 4174` (host bukan loopback, seperti Vercel), peserta
   sekali-pakai lewat server `127.0.0.1` sekali pakai; panggilan `fetch` halaman dicatat skrip uji.

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | unggahan pertama dengan `railway.json` (builder `DOCKERFILE`) | **gagal**: Railway memakai Railpack ("could not determine how to build the app") — config-as-code tidak dipakai untuk unggahan CLI ini, dan CLI 5.63.1 menandainya usang. `railway.json` dibuang; variabel layanan `RAILWAY_DOCKERFILE_PATH=signer/Dockerfile` dipakai |
| 2 | unggahan kedua | image `node:22-bookworm-slim`, `npm ci` signer (47 paket) + web (55 paket), "Deploy complete" |
| 3 | log start | "tidak ada ../../.env, memakai lingkungan proses saja"; "konteks JSON-LD: 4 salinan dimuat dari signer/contexts (sha256 cocok)"; issuer `…/issuers/agent-cloud`; resolver `0x7CA6…2065` via publicnode |
| 4 | `GET /catalog/published` | **200** (0,5–1,0 s); 0 kursus terbit dari DB — sama dengan signer lokal pada jam yang sama |
| 5 | `GET /healthz` | **200** (0,38 s); x402, relay, deposit `configured: true`, broadcast mati |
| 6 | preflight `OPTIONS /me/records` dari asal Vercel | **204**, `access-control-allow-origin: *`, metode `GET, POST, OPTIONS`, header `content-type, x-payment` |
| 7 | `POST /me/roles`, alamat acak | **200** (3,0 s), peran kosong; kiriman ulang tanda tangan yang sama → **401** "nonce already used (replay)" |
| 8 | build produksi di `172.16.0.2:4174`, dasbor `#/app` | semua panggilan signer ke `signer-production-e4f2.up.railway.app`: `/catalog/published` 200, `/me/roles` 200, `/me/records` 200; Ringkasan tampil |
| 9 | "Ambil koin uji" di halaman Kelas Uji | `POST /faucet` **200** (±10 s), "Koin uji sudah masuk." |
| 10 | "Bayar & daftar · 5 LDC-demo" | `POST /enroll` **402** (syarat x402) → **200** sesudah settlement (±20 s), halaman pindah ke `#/class/uji-bayar-2026`; DB: order `paid`, 5 LDC-demo, tx `0x1ffea27e898ca8c87be3058918ba48edbd28bfc027832f0cb0afc60967cf1e87`; struk chain 97: status `0x1`, blok 134885312 |

## Batas

- Login Privy (email) tidak diuji — butuh kode OTP ke email builder; rutenya `POST /auth/privy` memakai variabel
  `PRIVY_APP_ID` + `PRIVY_APP_SECRET` yang sama dengan signer lokal.
- Vercel belum memakai signer cloud: perubahan default endpoint ada di commit front-end yang menunggu kata dorong builder.
  Sampai itu, `https://lencana-psi.vercel.app` tetap menunjuk `127.0.0.1:8787`.
- Daftar status di signer cloud kosong (penyimpanan `.store` tidak dibawa); dokumen kredensial memang menunjuk daftar status
  di edge worker, bukan signer, dan tidak ada halaman yang membaca rute daftar status signer.
- Pemeriksaan kesehatan Railway tidak terpasang (config-as-code tidak dipakai); deploy dianggap sehat saat kontainer jalan.
- Faucet dan gas drip kini terbuka permanen di domain publik → B155.

## Bersih-bersih

Peserta sekali-pakai: 1 order dan 1 enrollment dihapus dengan saringan persis (alamat + `origin=demo`); kueri ulang
enrollment 0, usaha 0, submission 0. Berkas kuncinya dihapus. Yang permanen dan sengaja dibiarkan: dua transaksi testnet
(mint koin uji + settlement 5 LDC-demo) dan baris nonce dari uji asap. Peramban ditutup sesudah penyimpanannya dikosongkan;
pratinjau LAN dimatikan.
