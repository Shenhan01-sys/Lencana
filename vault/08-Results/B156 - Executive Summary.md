---
tags: [results, executive-summary, B156]
status: active
updated: 2026-10-05
---

# B156 - Executive Summary — tidak ada server lokal: backend hanya di Railway (D75)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B156 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B156 - Tanpa server lokal]] ·
**Testing:** [[09-Testing/T80 - Uji alur kerja tanpa server lokal (B156)]] · **Keputusan:** D75 di [[00-Overview/03 - Decisions]] ·
**Sebelumnya:** [[08-Results/B154 - Executive Summary]]

## 1. Apa yang diubah

- **`web/src/learning.ts`:** default endpoint di semua lingkungan (produksi, server dev lokal, Node) = signer cloud
  (`web/src/learning.ts:73`); signer lokal hanya lewat `VITE_SIGNER_URL`, terowongan hanya lewat `VITE_SIGNER_SAME_ORIGIN=1`
  (tidak lagi otomatis untuk server dev).
- **`signer/scripts/sync-numbers.js`:** harness `serve-probe` memakai signer sementara di port bebas (`LANCENA_ORIGIN=test`) yang
  dinyalakan dan dimatikan baterai (`withOwnSigner`, `signer/scripts/sync-numbers.js:63`); `BASE_URL` di lingkungan tetap menang.
- **Signer demo lokal :8787 dimatikan.**
- **Deploy dari dorongan.** ~~Layanan Railway tersambung ke `main` GitHub dan mendeploy sendiri seperti Vercel.~~ Sambungan sumber
  hanya mendeploy sekali; pemicu dari dorongan ditolak Railway karena repo milik akun GitHub `Shenhan01-sys` dan collaborator
  tidak bisa memasang aplikasi GitHub Railway (T80 langkah 7–9). Pilihan builder: **GitHub Actions** —
  `.github/workflows/deploy-signer.yml` menjalankan `railway up --ci --service signer` lalu uji asap untuk dorongan ke `main`
  yang menyentuh `signer/**` atau berkas `web` yang diimpor server; token project dibuat builder di dasbor Railway dan disimpan
  sebagai secret `RAILWAY_TOKEN`.
- Layanan Railway: healthcheck `/catalog/published` (120 s), restart `ON_FAILURE` ×5. Catatan basi diperbarui dengan koreksi
  terlihat: T8, Quick-Reference, `04-Signer-Service/01 - Signer Service`, `signer/README.md`.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| signer lokal :8787 | menyala terus (dev, uji HP, baterai) | dimatikan, port kosong (T80 langkah 1) |
| `serve-probe` | menuntut :8787 hidup | **50/0** lewat signer sementara milik baterai, 24,5 s (T80 langkah 2) |
| baterai penuh tanpa :8787 | tidak bisa | run pertama 35 dari 36 (`check:spec` BAS-HASH-14 merah sesaat di sisi edge); run kedua **36 · 36 hijau**, 1.397 pemeriksaan (`numbers.json` 2026-10-05T02:20:29Z, `probe` web 118/0) |
| `sync:numbers --verify` | — | ANGKA HIJAU, 68 klaim |
| server dev lokal | memakai `127.0.0.1:8787` | signer cloud, 0 panggilan ke :8787 (T80 langkah 4) |
| deploy backend | `railway up` dari laptop | dorongan ke `main` → workflow `deploy-signer` → deployment `3778fdeb` SUCCESS, uji asap 200 (T80 langkah 10) |

## 3. Status

**SELESAI · LIVE** (5 Okt). Jalur deploy dari dorongan terbukti satu kali: dorongan `f28ac21..729dad4` → run `37259823357`
success → deployment `3778fdeb`; `/healthz` cloud mulai 03:34:06Z memuat kode B155 dari dorongan itu.

## 4. Risiko tersisa

- `deploymentTriggers` bawaan Railway tetap kosong; deploy hanya datang dari workflow. Tanpa secret `RAILWAY_TOKEN` langkah
  deploy dilewati dengan peringatan dan `exit 0` (`.github/workflows/deploy-signer.yml:50`) — menurut kodenya run tetap hijau tanpa deploy, karena uji asap mengenai deployment lama.
- Dorongan yang hanya menyentuh vault tidak memicu deploy menurut filter `paths:` workflow — belum diamati pada dorongan
  sungguhan (_unmeasured_).
- Sebab merah sesaat `check:spec` BAS-HASH-14 di run pertama tidak dibuktikan (dugaan: pembacaan chain oleh edge gagal sesaat).
- Menguji kode signer yang belum dideploy dari peramban tetap butuh signer lokal sementara (`VITE_SIGNER_URL`).

## 5. Bukti

Commit `d0ee46c` (kode + T80 langkah 1–6), `a57e12e` (koreksi: dorongan belum mendeploy, T80 langkah 7), `f28ac21` (T80 langkah 8), `729dad4`
(workflow `deploy-signer.yml` + T80 langkah 9), `e36765f` (penutupan: T80 langkah 10, marker → SELESAI). T80 langkah 1–10. D75.
