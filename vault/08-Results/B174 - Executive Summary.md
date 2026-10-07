---
tags: [results, executive-summary, B174]
status: active
updated: 2026-10-07
---

# B174 - Executive Summary — sabuk alur esai di dasbor Penerbit

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B174 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B174 - Sabuk alur esai di dasbor Penerbit]] · **Testing:** [[09-Testing/T98 - Uji peramban sabuk alur esai (B174)]]

Builder 7 Okt pagi, sesudah menonton draf video B173: "Essay pipeline tolong diperbagus dong UI-nya, lalu generate ulang videonya".

## 1. Apa yang diubah

- **`web/src/pages/essay-belt.ts` (baru) + `essay-belt.css`:** alur esai sebagai benda di satu sabuk — bahasa visual yang sama dengan sabuk Admin
  (FE11, disetujui builder "udh nice"): baki kertas masuk, robot pengusul yang menyodorkan kertas bertag "?" (nilai menunggu pengesahan), meja
  stempel (kertas berstempel hijau = disahkan, jingga = disesuaikan, abu = dinilai langsung kunci penerbit), tong (ditolak). Jumlah benda =
  jumlah esai; kertas kecil berpindah tahap di sabuk; stempel menekan. Gaya solid palet Lencana, gerak hanya `transform`, padam bila gerak dikurangi.
- **`web/src/pages/publisher.ts`:** `pipelineCard` memakai sabuk itu (Ringkasan + Esai); kepala kartu, chip "Also counted", dan catatan tetap.
- **`web/src/pages/publisher.css`:** CSS stepper B129 yang tidak terpakai dibuang.

## 2. Hasil vs KPI

Empat tahap dari data nyata (0 / 3 / 6 / 0, total 9) · tahap menunggu disorot + bertaut · EN + ID · ponsel 2×2 tanpa gulir samping ·
nol galat konsol · `tsc` 0 · `build` 0 · `probe` 267/0.

## 3. Status

SELESAI di kode (commit lokal); LIVE menunggu dorongan atas kata builder (AC-B174#8).

## 4. Risiko tersisa

Benda dibatasi 8–12 per tahap (angka besar di bawahnya tetap angka penuh); belum diuji di Safari/Firefox.

## 5. Bukti

T98; commit lokal B174 (lihat `git log`); halaman yang sama direkam ulang untuk video B173 v3.
