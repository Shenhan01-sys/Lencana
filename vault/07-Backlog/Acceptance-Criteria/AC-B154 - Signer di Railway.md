---
tags: [acceptance-criteria, B154]
status: active
updated: 2026-10-05
---

# AC-B154 - Signer di Railway

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B154 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]] ·
**Summary:** [[08-Results/B154 - Executive Summary]] · **Keputusan:** D74 di [[00-Overview/03 - Decisions]] ·
**Lanjutan:** B155 ([[07-Backlog/Acceptance-Criteria/AC-B155 - Batas faucet dan gas]]), B156 ([[07-Backlog/Acceptance-Criteria/AC-B156 - Tanpa server lokal]])

Permintaan builder 5 Okt: "saya udh ada server cloud nih buat BE dan sebagainya kecuali FE pakai vercel aja, km bisa pakai railway
cli saya dan deploy di project bernama "lencana" ya, untuk env dll km urus semuanya sendiri aja". Keadaan 5 Okt: build produksi
front-end menunjuk signer `127.0.0.1:8787`, jadi di Vercel dan HP kelas, login, dan dasbor hanya hidup selama laptop + ngrok
menyala. Rinciannya didelegasikan builder (D74); dorongan front-end hanya atas kata builder.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B154#1 | image Docker dari berkas ter-commit saja (`git archive HEAD`): `.env`, `signer/.keys`, `signer/.store`, `.mcp.json`, `References/` tidak ikut terunggah; builder dipilih lewat ~~`railway.json`~~ variabel `RAILWAY_DOCKERFILE_PATH` *(koreksi saat dikerjakan: unggahan pertama dengan `railway.json` gagal, Railway memakai Railpack)* | **PASS** 5 Okt | T78 §Cara mengulang 1; langkah 1 (gagal, dicatat) dan 2 (`node:22-bookworm-slim`, "Deploy complete"); `signer/Dockerfile` |
| AC-B154#2 | rahasia hanya di variabel layanan, dikirim lewat stdin (tidak di argv atau keluaran); kunci Groq / Cloudflare / R2 / agen lain tidak dikirim | **PASS** 5 Okt | T78 §Cara mengulang 2 (`railway variable set <NAMA> --stdin`, daftar dibaca nama saja); baris B154 (21 variabel layanan + `RAILWAY_DOCKERFILE_PATH`) |
| AC-B154#3 | kunci daftar status khusus cloud `agent-cloud`, bukan `agent-edge` yang menandatangani kredensial | **PASS** 5 Okt | T78 langkah 3 (issuer `…/issuers/agent-cloud`); `signer/scripts/cloud-start.sh` |
| AC-B154#4 | `/catalog/published` dan `/healthz` menjawab 200 dari domain publik | **PASS** 5 Okt | T78 langkah 4–5 |
| AC-B154#5 | preflight CORS dari asal Vercel | **PASS** 5 Okt | T78 langkah 6 (204, `access-control-allow-origin: *`) |
| AC-B154#6 | satu rute bertanda tangan yang membaca DB; tanda tangan yang dikirim ulang ditolak | **PASS** 5 Okt | T78 langkah 7 (`POST /me/roles` 200, ulangan 401 "nonce already used (replay)") |
| AC-B154#7 | build produksi di host bukan loopback memakai signer cloud: dasbor, faucet, bayar + daftar Kelas Uji | **PASS** 5 Okt | T78 langkah 8–10 (`/me/roles`, `/me/records` 200; faucet 200; `POST /enroll` 402 → 200, struk chain 97 status `0x1`) |
| AC-B154#8 | front-end produksi didorong hanya atas kata builder, lalu halaman Vercel terbukti memanggil signer cloud | **PASS** 5 Okt | T78 langkah 11 (dorongan `2c42604..67a6549` atas "Gas"; bundel `assets/index-BhLAFVG6.js`; `GET …/catalog/published` 200 dari halaman Vercel) |
| AC-B154#9 | marker di `signer/scripts/cloud-start.sh` diadili penjaga (A9 + `check:labels` sebelumnya tidak memindai `.sh`) | **PASS** 5 Okt | baris B154: uji negatif (marker dibalik ke SELESAI) → audit 1 TEMUAN + label MERAH; dikembalikan → audit bersih (281 marker), label 8/0, `--self-test` 12 fixture 0 luput |
| AC-B154#10 | gerbang | **PASS** 5 Okt | `tsc` exit 0, `probe` 118/0 (baris B154) |
| AC-B154#11 | login Privy (email) dari HP oleh builder, lewat signer cloud | **OPEN** | tidak diuji — butuh kode OTP ke email builder; rute `POST /auth/privy` memakai `PRIVY_APP_ID` + `PRIVY_APP_SECRET` yang sama dengan signer lokal (T78 §Batas) |

**Batas klaim:** daftar status di signer cloud kosong (`.store` tidak dibawa); dokumen kredensial menunjuk daftar status di edge
worker, bukan signer. ~~Pemeriksaan kesehatan Railway tidak terpasang (T78 §Batas).~~ *(Sejak B156: healthcheck
`/catalog/published` terpasang dan dibaca balik — T80 langkah 5b.)* Faucet dan gas drip yang jadi publik ditangani B155.
