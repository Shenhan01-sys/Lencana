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
