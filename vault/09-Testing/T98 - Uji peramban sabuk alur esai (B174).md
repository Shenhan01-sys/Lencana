---
tags: [testing, "T98"]
status: active
updated: 2026-10-07
command: vite dev sementara 127.0.0.1:5174 (kode baru, backend = signer Railway produksi, hanya baca); Chrome 154 headless via `puppeteer-core`; identitas = kunci penerbit dari `app/.env` (dibaca skrip, tidak dicetak), tanpa aksi tulis; skrip scratchpad `certwork/b174-browser.mjs`
measured: 2026-10-07
result: SABUK ALUR ESAI TERUJI — empat benda dari pipeline nyata (0 / 3 / 6 / 0, total 9), tahap diusulkan disorot + bertaut, EN + ID, animasi transform, ponsel 390 px 2×2 tanpa gulir samping, nol galat konsol; tsc 0 · build 0 · probe 267/0
---

# T98 - Uji peramban sabuk alur esai (B174)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B174 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B174 - Sabuk alur esai di dasbor Penerbit]] · **Summary:** [[08-Results/B174 - Executive Summary]]

## Langkah dan hasil (7 Okt ±05.20 WIB)

| # | langkah | hasil |
|---|---|---|
| 1 | `#/app/pub/essays`, 1600 × 1000, EN | empat `.eb-st`: `judge` 0 · `review hot` **3** (bertaut ke tabel) · `done` **6** · `rejected` 0; meja stempel 1 hijau + 3 jingga + 2 abu (= disahkan 1, disesuaikan 3, dinilai kunci penerbit 2); `9 essays in total`; chip "2 graded directly by the publisher key"; catatan tetap; sabuk + 2 kertas berpindah; animasi `eb-hopx`, `eb-hopx`, `eb-press`; `.pb-flow/.pb-stage/.pb-flowbar` = **0**; tanpa gulir samping; SVG `aria-hidden="true"` |
| 2 | `#/app/pub` (Ringkasan) | kartu yang sama, angka sama |
| 3 | ponsel 390 × 844 | 2 × 2, sabuk dan kertas berpindah disembunyikan, label "OR" di antara Diusulkan dan Ditolak, lebar sabuk 312 px, **tanpa gulir samping** |
| 4 | bahasa ID | Diserahkan / menunggu dinilai · Diusulkan / menunggu pengesahan · Final / disahkan atau disesuaikan · Ditolak / tanpa nilai sah |
| 5 | konsol | **nol** galat (`pageerror` dan `console.error`) |

Tangkapan: alat sesi (`b174-essays-desktop`, `b174-pipe-card`, `b174-overview-desktop`, `b174-essays-mobile`).

## Gerbang

```text
cd web && npx tsc --noEmit        → 0
cd web && npm run build           → ✓ built (peringatan ukuran chunk lama, bukan baru)
cd web && npm run probe           → PROBE HIJAU (267 pemeriksaan, 0 gagal)
```

```text
cd signer && npm run check:labels → LABEL HIJAU — 8 pemeriksaan, 0 gagal   (marker Lencana-B174 status=SELESAI ↔ baris B174 tertutup)
cd signer && npm run audit        → AUDIT BERSIH (A10: 28 klaim README cocok dengan numbers.json)
```

## Catatan alat

Angka besar memakai `odometer` lama: `textContent` berisi pita digit ("30123456789"), yang terlihat hanya digit pertama — sama
seperti stepper sebelumnya, bukan galat baru.
