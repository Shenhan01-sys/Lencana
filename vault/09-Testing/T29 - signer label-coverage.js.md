---
tags: [testing, "T29"]
status: active
updated: 2026-09-30
command: npm run check:labels
measured: 2026-09-30
result: LABEL HIJAU — 4 pemeriksaan / 0 gagal (73 tag di 42 ID; 43 tertutup = 39 bertanda + 4 beralasan; 6 baris mengumumkan `TANPA TAG KODE` tapi dua di antaranya (B77, B99) masih terbuka, jadi yang benar-benar dihitung sebagai penutupan adalah 4 (B43 B71 B74 B76). Lubang 0, bandel 0.)
---

# T29 - signer label-coverage.js (aturan #18 ditegakkan dua arah)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** aturan #18, B78 · **AC:** —

A9 di `npm run audit` mengadili **konsistensi** tag. Berkas ini mengadili **kelengkapan**:
ID yang ditutup tanpa satu pun tag dan tanpa alasan akan lolos dari A9 selamanya, dan itu membuat
klaim "source code sudah berlabel" jadi angka di chat, bukan keadaan di repo.

| pemeriksaan | maksud |
|---|---|
| ID tertutup punya tag **atau** barisnya menulis `TANPA TAG KODE` | baseline 0 lubang; naik = merah |
| tiap tag cocok dengan status barisnya | baseline 0 bandel |
| `TANPA TAG KODE` yang diumumkan memang benar tidak bertanda | tadinya pemeriksaan ini tautologi (senantiasa benar) — hijau pinjaman, sudah kuganti |
| tidak ada baris TERBUKA yang ditandai `SELESAI` | arah kedua, sama dengan A9 |

Terukur 30 Sep: `73 tag di 42 ID · 65 baris · **43 tertutup = 39 bertanda + 4 beralasan**; 6 baris mengumumkan `TANPA TAG KODE` tapi dua di antaranya (B77, B99) masih terbuka, jadi yang benar-benar dihitung sebagai penutupan adalah 4 (B43 B71 B74 B76). Lubang 0, bandel 0. → LABEL HIJAU 4/0`.

**Koreksi 30 Sep:** angka yang kutulis di halaman ini sebelumnya (47 tertutup / 41 bertanda + 6 beralasan, lalu "37+6", dan "38+2") **semuanya gelembung** — penjaga membaca status dari seluruh baris, sehingga kata `SELESAI` di dalam kalimat counted sebagai baris tertutup. Setelah pembacaan diperbaiki (sel pertama saja) dan `check:labels` dipasang, yang terukur: **43 tertutup · 37 bertanda · 6 beralasan · 0 lubang**, 73 tag di 42 ID. Satu tag juga ternyata bohong dan diluruskan: `[B52] SELESAI` → `TERBUKA`.
Tergabung ke `npm run sync:numbers` sebagai harness ke-13.

Terkait: [[09-Testing/T27 - signer cold-store-probe.js]], [[09-Testing/T18 - signer verify-edge.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B78.
