---
tags: [testing, "T84"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174; Chromium headless 1280 px; `feeLadder()` dari `web/src/pages/fee-ladder.ts` dipasang langsung di dalam `.app-shell .ab` dengan tujuh label `signer/src/pricing.js` dan kartu tarif dari tarif dasar 2000 (sama dengan tagihan #159 Kelas Uji); kotak 760 px dan 375 px
measured: 2026-10-05
result: LABEL DAN BAYARANNYA TERBACA SEBELUM MENANDATANGANI — tinggi batang = bayaran (76,92 % → 100 %, sumbu utuh), lapis emas = kenaikan (0 → 25,8 px), papan bacaan menulis label + tingkat + bayaran + % dari dasar; pratinjau saat disorot/difokus; panah/Home/End memilih seperti radio; disable() mengunci; teks pengesah berbeda; tanpa kartu tarif jatuh ke tinggi per tingkat; 375 px 0 luapan
---

# T84 - Uji peramban pemilih label tingkat berat (B159)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B159 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B159 - Pemilih label tingkat berat]] · **Summary:** [[08-Results/B159 - Executive Summary]]

Pertanyaan yang diuji: apakah penilai/pengesah bisa membaca label dan bayarannya sebelum menandatangani, apakah tangga
menggambarkan bayaran dengan jujur (selisih +30 % tidak tampil berkali lipat), dan apakah pemilihnya bisa dipakai dengan
papan ketik.

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji).
2. Buka `http://127.0.0.1:5174/`. Di konsol impor CSS dasbor (`/src/style.css`, `/src/pages/dashboard.css`,
   `/src/pages/owner.css`) lalu `/src/pages/fee-ladder.ts`; pasang `feeLadder('id', 'grade', labels, rateCard, onPick)` di
   dalam `<div class="app-shell"><div class="ab">`. `rateCard` = `priceFor(2000, label)` untuk tujuh label (2000 … 2600).
3. Sorot/fokus/klik batang dengan event, panah lewat `keydown`; baca `--h`, tinggi lapis, kelas papan bacaan, teks, dan
   label yang diterima `onPick`.

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | dipasang, belum memilih | 7 batang; judul "Seberapa berat menilai esai ini?"; papan bacaan bergaris putus "Pilih tingkat — bayarannya tampil di sini."; garis "tarif dasar 0.002" |
| 2 | tinggi batang | `--h` 76.92 % · 80.76 · 84.61 · 88.46 · 92.3 · 96.15 · 100 % (bayaran / bayaran tertinggi); lapis dasar 86,1 px di ketujuhnya; lapis emas 0 · 4,3 · 8,6 · 12,9 · 17,2 · 21,5 · 25,8 px *(run pertama lapis emas tingkat 1 = 2,0 px karena `min-height` — menggambar kenaikan yang tidak ada; dibuang, diukur ulang 0)* |
| 3 | sorot batang ke-4 | papan "pratinjau": "Sedang · tingkat 4 dari 7 · 0.0023 LDC-demo · +15% dari tarif dasar"; lepas → kembali kosong |
| 4 | klik batang ke-7 | `onPick('sangat-berat')`; `aria-checked` hanya batang 7, `tabindex` 0 hanya batang 7; papan "Sangat berat · tingkat 7 dari 7 · 0.0026 LDC-demo · +30% dari tarif dasar" |
| 5 | papan ketik | → dari batang 1: "Ringan +5%"; End: "Sangat berat +30%"; ←: "Berat +25%"; Home: "Sangat ringan = tarif dasar"; fokus ikut pindah; `onPick` menerima keempatnya berurutan |
| 6 | fokus / lepas fokus (event eksplisit — jendela headless tidak berfokus, `focus()` tidak memancarkan event) | fokus batang 3 → "pratinjau · Cukup ringan"; lepas → kembali ke pilihan |
| 7 | `disable()` sesudah tanda tangan | ketujuh batang `disabled`; klik sesudahnya tidak memanggil `onPick` |
| 8 | peran pengesah | judul "Seberapa berat mengesahkan penilaian ini?" |
| 9 | kartu tarif kosong | tinggi jatuh ke tingkat (14,3 % … 100 %), tanpa garis dasar; papan "Cukup ringan · tingkat 3 dari 7" tanpa bayaran |
| 10 | tampilan | 760 px dan kotak 375 px: tujuh batang 39 px, papan bacaan dua kolom, **0 elemen melewati tepi kanan**; garis tarif dasar ditulis di dalam lapis dasar supaya tidak menutup tutup emas batang ke-2; tangkapan di scratchpad sesi, tidak di repo |

Sesudah uji: peramban ditutup, server dev :5174 dimatikan (port bebas).

**Gerbang 5 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **118 / 0**; `npm run build` exit 0.

## Batas

- Komponen dipasang sendiri, bukan lewat antrean agen / meja pengesahan sungguhan (keduanya memerlukan login + antrean dari
  signer). Pemasangannya di `web/src/pages/agent-brain.ts` dan `web/src/pages/review-desk.ts` diperiksa `tsc`, bukan peramban.
- Kotak 375 px di jendela 1280 px: aturan `@media (max-width: 560px)` di `fee-ladder.css` tidak aktif di uji ini.
- Hover CSS (`:hover`) tidak terpicu oleh event buatan; yang diuji adalah pratinjau papan bacaan.
