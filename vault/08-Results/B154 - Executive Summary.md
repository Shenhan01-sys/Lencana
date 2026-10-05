---
tags: [results, executive-summary, B154]
status: active
updated: 2026-10-05
---

# B154 - Executive Summary — signer di Railway, front-end tetap di Vercel (D74)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B154 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B154 - Signer di Railway]] ·
**Testing:** [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]] · **Keputusan:** D74 di [[00-Overview/03 - Decisions]] ·
**Lanjutan:** [[08-Results/B155 - Executive Summary]] · [[08-Results/B156 - Executive Summary]]

## 1. Apa yang diubah

- **Image + start.** `signer/Dockerfile` (Node 22, `npm ci` signer + web) dan `signer/scripts/cloud-start.sh` (menulis kunci
  `agent-cloud` dari variabel saat start, lalu membuang variabelnya). Konteks unggahan dari `git archive HEAD` — `.env`,
  `signer/.keys`, `signer/.store`, `.mcp.json`, `References/` tidak pernah ikut.
- **Layanan `signer` di project lencana**, domain bawaan Railway `https://signer-production-e4f2.up.railway.app`. 21 variabel
  layanan dikirim lewat stdin (15 dari `app/.env` yang dibaca server + `AGENT_SLUG`, `BASE_URL`, `HOST`, `PORT`,
  `LANCENA_ORIGIN`, `AGENT_KEY_JSON_B64`) + `RAILWAY_DOCKERFILE_PATH`; kunci Groq / Cloudflare / R2 / agen lain tidak dikirim.
- **Front-end** (`web/src/learning.ts`): host publik tanpa proxy → signer cloud (`VITE_SIGNER_URL` bisa menimpa); endpoint hanya
  disimpan bila berbeda dari default; kunci simpanan lama yang diam-diam berisi `127.0.0.1` diganti `lencana-signer-url-v2`.
- **Penjaga marker** A9 + `check:labels` kini juga memindai `.sh`. Ikut dibuang: berkas kosong `signer/{const` (sisa salah ketik
  shell sejak `44053f7`). `signer/README.md`: bagian "Hosted copy" + koreksi terlihat atas klaim basi bahwa server tidak membaca
  `app/.env`.
- *(Koreksi saat dikerjakan: rancangan memakai `railway.json`; unggahan pertama gagal karena Railway memakai Railpack — diganti
  variabel `RAILWAY_DOCKERFILE_PATH`, berkasnya dibuang. T78 langkah 1.)*

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| backend untuk Vercel / HP | laptop + ngrok (build produksi menunjuk `127.0.0.1:8787`) | signer cloud di Railway |
| `/catalog/published` · `/healthz` dari domain publik | — | 200 · 200 (T78 langkah 4–5) |
| preflight CORS dari asal Vercel | — | 204, `*` (T78 langkah 6) |
| rute bertanda tangan · kiriman ulang | — | 200 · 401 replay (T78 langkah 7) |
| faucet · bayar + daftar Kelas Uji dari build produksi | hanya selama laptop menyala | 200 · 402 → 200, struk chain 97 status `0x1` (T78 langkah 9–10) |
| halaman Vercel memanggil signer cloud | tidak | ya — bundel `assets/index-BhLAFVG6.js`, `/catalog/published` 200 (T78 langkah 11) |
| login Privy dari HP lewat signer cloud | — | _unmeasured_ |
| `audit` · `check:labels` · `--self-test` | — | 281 marker bersih · 8/0 · 12 fixture 0 luput |
| `tsc` · `probe` | — · 118/0 | exit 0 · 118/0 |

## 3. Status

**LIVE** — signer cloud hidup dan dipakai `https://lencana-psi.vercel.app` sejak dorongan `2c42604..67a6549` (atas "Gas"
builder). Baris B154 tetap **TERBUKA** sampai login Privy dari HP oleh builder (AC-B154#11 **OPEN**).

## 4. Risiko tersisa

- Login Privy belum diuji di signer cloud — butuh OTP ke email builder.
- Daftar status di signer cloud kosong (`.store` tidak dibawa); dokumen kredensial menunjuk daftar status di edge worker, dan
  tidak ada halaman yang membaca rute daftar status signer.
- Faucet dan gas drip jadi terbuka permanen di domain publik → B155 (ditutup 5 Okt dengan batas IP + kuota harian).
- ~~Pemeriksaan kesehatan Railway tidak terpasang.~~ *(Terpasang di B156: `/catalog/published`, T80 langkah 5b.)*

## 5. Bukti

Commit `67a6549` (kode + T78 langkah 1–10), `4126d51` (T78 langkah 11 dicatat sesudah dorongan). T78 langkah 1–11. D74.

## 6. Catatan 5 Okt malam — "backend Lencana sudah di Railway? kok hanya x402 yang kelihatan"

Pertanyaan builder sesudah melihat dasbor Railway. Jawabannya dibaca hari itu (bukan dari ingatan):

- **Satu service, seluruh backend.** Akun Railway yang login di laptop (workspace "Hans Gunawan's Projects") memegang tiga project — `lencana`,
  `fabius-engine`, `tessera-backend`; **tidak ada** yang bernama x402. Project `lencana` (environment `production`) berisi tepat **satu** service,
  `signer`, domain `signer-production-e4f2.up.railway.app` (dibaca lewat `railway api`). Proses itu satu: rute belajar (`/enroll`, `/progress`,
  `/grade`, `/essay`, `/praktik`, `/me/records`), kredensial dan daftar status, relay, dan x402 (`/verify` berbayar; pembayaran `/enroll`).
- **Kenapa kelihatannya hanya x402.** Banner log saat start hanya mencetak empat URL dan satu keterangan — `/verify (POST, x402 exact, harga 1000 @
  eip155:97)` — jadi di tab Logs, itulah satu-satunya baris yang menyebut jenis layanan. Dan `GET /` di domain itu menjawab 404 dengan petunjuk yang hanya
  menyebut sebagian rute (kredensial, status, `/verify`, `/relay`, `/deposit`, `/healthz`). Deploy diunggah dari GitHub Actions (`railway up`), bukan
  pemicu GitHub bawaan Railway, jadi metadata deployment terbaru tidak memuat `commitHash` maupun `repo` (dibaca lewat `railway deployment list --json`,
  status SUCCESS) dan layanan memang tidak bertaut ke repo GitHub (pemicunya Actions).
- **Bukti jalan (5 Okt 16.0x WIB).** `GET /healthz` → `ok:true`, `paywall:on`, `agent:agent-cloud`, `startedAt` 2026-10-05T09:04:30Z;
  `GET /progress?learner=<akun builder>&course=uji-bayar-2026` → `enrollmentId 580`, `lessonsCompleted 1` dari `lessonsTotal 4`, `gradedAttempts 2`,
  `bestScore 98` — dibaca dari database lewat Railway; `POST /grade` dengan badan kosong → 400 `requires lesson (quiz slug)` (rute belajar, bukan x402).
- **Tidak diubah.** Banner log dan petunjuk 404 tetap; melengkapinya (semua keluarga rute) bisa jadi satu baris backlog bila builder mau — tidak dibuat
  tanpa permintaan. Kalau dasbor yang dibuka builder menampilkan sesuatu bernama x402, itu bukan project di akun Railway ini (akun lain atau
  workspace lain) — belum dicek karena tidak terlihat dari sini.
