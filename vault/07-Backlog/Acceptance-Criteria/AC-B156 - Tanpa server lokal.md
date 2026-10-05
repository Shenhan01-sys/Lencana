---
tags: [acceptance-criteria, B156]
status: active
updated: 2026-10-05
---

# AC-B156 - Tanpa server lokal

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B156 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T80 - Uji alur kerja tanpa server lokal (B156)]] ·
**Summary:** [[08-Results/B156 - Executive Summary]] · **Keputusan:** D75 di [[00-Overview/03 - Decisions]] ·
**Sebelumnya:** [[07-Backlog/Acceptance-Criteria/AC-B154 - Signer di Railway]]

Permintaan builder 5 Okt (sesudah B154 didorong): "Service BE lencana taruh jg aja di railway, biar kita gaada run lcoal server
sama sekali, saya udh upgrade railway ke hobby plan, udh pasti sangat cukup". Keadaan 5 Okt: tiga ketergantungan ke signer
lokal `127.0.0.1:8787` — server dev front-end, `serve-probe` di baterai, dan deploy backend lewat `railway up` dari laptop.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B156#1 | default endpoint di semua lingkungan = signer cloud; signer lokal hanya lewat `VITE_SIGNER_URL`, terowongan hanya lewat `VITE_SIGNER_SAME_ORIGIN=1` | **PASS** 5 Okt | T80 langkah 4 (server dev `127.0.0.1:5173`: `/catalog/published`, `/me/roles`, `/me/records` 200 ke signer cloud, nol panggilan ke :8787); `web/src/learning.ts:73` |
| AC-B156#2 | `serve-probe` di baterai menyalakan signer sementaranya sendiri (port bebas, `LANCENA_ORIGIN=test`) lalu mematikannya | **PASS** 5 Okt | T80 langkah 2 (`--only=serveProbe` 50 / 0 tanpa :8787, 24,5 s, tidak ada `server.js` tertinggal); `signer/scripts/sync-numbers.js:63` |
| AC-B156#3 | baterai penuh hijau tanpa :8787, lalu `--verify` | **PASS** 5 Okt | T80 langkah 3b: **36 / 36** (1.397 pemeriksaan, `numbers.json` 2026-10-05T02:20:29Z — termasuk `probe` web 118/0 di run itu), `--verify` ANGKA HIJAU (68 klaim). Run pertama 35 dari 36: `check:spec` BAS-HASH-14 merah sesaat di sisi edge, diulang sendiri 14 / 0 (langkah 3a) |
| AC-B156#4 | signer demo lokal :8787 dimatikan | **PASS** 5 Okt | T80 langkah 1 dan 3b (port 8787 kosong) |
| AC-B156#5 | dorongan ke `main` mendeploy backend tanpa perintah dari laptop | **PASS** 5 Okt lewat GitHub Actions — ~~pemicu GitHub bawaan Railway~~ tidak mungkin: `deploymentTriggerCreate` ditolak, repo milik akun GitHub `Shenhan01-sys` dan collaborator tidak bisa memasang aplikasi GitHub Railway; pilihan builder: `.github/workflows/deploy-signer.yml` + secret `RAILWAY_TOKEN` | T80 langkah 7–9 (pemicu gagal, dicatat), langkah 10 (run `37259823357` success, deployment `3778fdeb` SUCCESS, uji asap 200); `.github/workflows/deploy-signer.yml:53` |
| AC-B156#6 | layanan Railway punya healthcheck dan kebijakan restart | **PASS** 5 Okt | T80 langkah 5b (`healthcheckPath` `/catalog/published` 120 s, `restartPolicyType` `ON_FAILURE` ×5, dibaca balik dengan `serviceInstance`) |
| AC-B156#7 | signer hasil build dari repo lulus uji asap | **PASS** 5 Okt | T80 langkah 6 (deployment `dc4925c6`: `/catalog/published` 200, `/healthz` 200, `POST /me/roles` 200, ulangan nonce 401) |
| AC-B156#8 | catatan basi diperbarui dengan koreksi terlihat | **PASS** 5 Okt | `git show --stat d0ee46c` (T8, Quick-Reference, `04-Signer-Service/01 - Signer Service`, `signer/README.md`); koreksi `a57e12e` (D75 + T80 sesudah dorongan `d0ee46c` tidak mendeploy) |

**Batas klaim:** server dev Vite dan harness tetap proses sementara di laptop — alat kerja, bukan server yang dibutuhkan produk.
Menguji kode signer yang belum dideploy dari peramban tetap butuh signer lokal sementara (`VITE_SIGNER_URL=http://127.0.0.1:8787`).
`deploymentTriggers` bawaan Railway tetap kosong, jadi deploy hanya datang dari workflow: satu dorongan = satu deploy (T80
langkah 10).
