---
tags: [testing, "T67"]
status: active
updated: 2026-10-03
command: vite dev + Chromium headless 1440 dan 500 px; perbandingan computed style CSS HEAD vs CSS kerja
measured: 2026-10-03
result: UI LAMA HILANG, HALAMAN PUBLIK UTUH — 794 elemen × 4 rute × 2 lebar, beda hanya di elemen video baru dan fase animasi
---

# T67 - Uji peramban: UI lama dibuang, video latar pindah ke landing baru (B139)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B139 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Keputusan:** D71 di [[00-Overview/03 - Decisions]] · **Untuk Dave:** OI-29 di [[10-Contributors/Open-Items-for-Dave]]

Pertanyaan yang diuji: sesudah dok demo, landing lama, tiga halaman lama tak terjangkau, tiga modalnya, kodenya di `main.ts`,
dan aturan CSS-nya dibuang — (1) apakah sisa UI lama benar-benar hilang, (2) apakah video latar hero tampil di landing
baru, dan (3) apakah halaman yang dipertahankan berubah sedikit pun.

## Cara mengulang

1. `cd web && npm run dev` (5173) — signer lokal tidak diperlukan untuk langkah 1–3.
2. Chromium headless. Headless melapor `prefers-reduced-motion: reduce` secara bawaan; untuk melihat videonya, jalankan
   dengan `--force-prefers-no-reduced-motion --autoplay-policy=no-user-gesture-required`.
3. Perbandingan CSS: taruh CSS HEAD sementara di `web/public/` (`git show HEAD:web/src/style.css > web/public/b139-head.tmp.css`,
   **hapus lagi sesudahnya**), lalu di konsol halaman: matikan `<link>` `/src/style.css`, pasang `<style>` berisi CSS kerja di
   tempatnya, dan untuk tiap rute ambil `getComputedStyle` setiap elemen `body *` (33–39 properti: display, posisi, ukuran,
   warna, latar, font, margin, padding, grid/flex, opacity, z-index, border, transform, overflow), tukar isi `<style>` ke CSS
   HEAD, ambil lagi, bandingkan per elemen.

## Hasil 3 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | id lama di DOM: `demo-dock`, `page-home`, `page-courses`, `page-submit`, `page-portfolio`, `study-modal`, `mint-modal`, `diploma-modal`, `hero-tree-canvas` | **0 tersisa**; `.page-view` tinggal `page-new-app`, `page-verify`, `page-agent-hub`, `page-publishers` |
| 2 | video, `prefers-reduced-motion: reduce` | `.hero-video` **tidak dibuat**, lapisan gelap `.hero-video-wash` tetap — sesuai rancangan |
| 3 | video, tanpa reduced-motion, 1440 px | berjalan: `paused=false`, `muted=true`, `readyState=4`, 1409×684 px di belakang hero; teks hero terbaca (lapisan gelap kiri), kartu LENCANA utuh |
| 4 | 500 px | video + lapisan gelap vertikal; judul, deskripsi, dua tombol terbaca |
| 5 | computed style 1440 px, 794 elemen | `#/verify` 4 beda · `#/agent-hub` 15 · `#/publishers` 3 · `#/` 6 — **semuanya** elemen video baru (`hero-stage`, `hero-video`, `hero-video-wash`, dan tinggi kontainernya karena di CSS HEAD video itu tak bergaya) atau fase animasi (`seal-ticks` 1, `mini-bar` 12) |
| 6 | computed style 500 px, 794 elemen (elemen video dikecualikan) | `#/verify` **0** · `#/agent-hub` 12 (semuanya `mini-bar`, fase animasi) · `#/publishers` **0** · `#/` 3 (tinggi kontainer, sebab sama dengan langkah 5) |

**Batas:** dasbor `#/app` tidak ikut dibandingkan (perlu login). Aturan pemangkasnya sendiri yang menjaganya: aturan CSS hanya
dibuang bila **setiap** selektornya menyebut kelas/id yang tidak lagi ada di `index.html` **maupun di berkas `.ts` mana pun**
(kelas yang dirakit runtime `prefix-${x}` dikecualikan) — dasbor dibangun seluruhnya dari `.ts`, jadi tidak ada selektor
miliknya yang memenuhi syarat itu. Satu kelemahan pemangkasnya diakui dan diperiksa terpisah: kelas di dalam `:not()` diperlakukan
seperti kelas biasa, padahal `.a:not(.kelas-hilang)` tetap cocok dengan `.a`. Selisih multiset prelude aturan HEAD vs kerja
menunjukkan **tidak satu pun** aturan yang dibuang memakai `:not()/:is()/:where()/:has()`, jadi kelemahan itu tidak mengenai apa pun.

## Gerbang

`npx tsc --noEmit -p .` 0 galat · `vite build` lolos · `npm run probe` **118 / 0** (3 Okt). Baterai `sync:numbers` ulang 3 Okt:
**33 harness · 31 hijau**; merah `verify:edge` + `verify:quizkeys` 66/6 sama dengan baterai B136/B138 (data tepi basi, bukan B139).
Baterai pertama menangkap `serve-probe` 50/1, yang **50/0** saat diulang sendirian — `numbers.json` ditulis dari baterai ulang.
