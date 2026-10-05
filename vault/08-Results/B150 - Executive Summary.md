---
tags: [results, executive-summary, B150]
status: active
updated: 2026-10-05
---

# B150 - Executive Summary — isi tidak lagi keluar kartu di HP

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B150 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B150 - Isi tidak keluar kartu di HP]] ·
**Testing:** [[09-Testing/T79 - Uji peramban isi keluar kartu di HP (B150)]] · **OI:** OI-32 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- `web/src/pages/dash-catalog.css`: baris jalur Ringkasan `.ov-path { min-width: 0 }` + `.ov-path-main` kolom `minmax(0, 1fr)`
  (lapis luar saja diukur belum cukup); baris chip katalog memudar di tepi kanan + ruang 24 px di ujung — desain satu baris yang
  digeser dipertahankan (keputusan B127).
- `web/src/lib/charts.ts`: sisi label ambang grafik Nilai diukur sesudah tergambar dan saat layar berubah ukuran.
- `web/src/mobile.css` (baru, satu impor `web/src/main.ts:36`): kolom kartu `minmax(min(360px, 100%), 1fr)`, padding 22 px di
  ≤ 560 px, URL/alamat di kartu memecah, bayangan tepi area geser matriks Verifier. `style.css` tidak disunting.
- **Penjaga marker diperbaiki.** A9 (`npm run audit`) dan `check:labels` melewati setiap direktori bernama `lib`, sehingga marker
  di `web/src/lib/*.ts` tidak pernah diadili. Kini `lib` hanya dilewati di akar repo.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| halaman bermasalah di 375 px (20 rute, tiga kursi) | 5 | 0 luapan, 0 teks terpotong (T79) |
| Ringkasan `#/app` | baris jalur 85–492 px, halaman 492 px | baris 85–321 px di dalam kartu |
| label ambang Nilai | 225–369 px pada kartu 16–344 px | 53–197 px di trek 33–327 px |
| kartu Pusat Kepercayaan / Penerbit | 24–384 px; URL penerbit terpotong 65–473 px | kartu 312 px; URL memecah |
| area geser (matriks Verifier, chip katalog) | terpotong tanpa tanda | bayangan tepi / tepi memudar |
| desktop 1440 px | — | tidak berubah (T79 kolom desktop) |
| marker di `web/src/lib/*.ts` | tidak terbaca penjaga | terbaca: `audit` 283 marker bersih, `check:labels` 8/0, `--self-test` 12/0 |
| `npm run build` · `probe` | — · 118/0 | exit 0 · 118/0 |

**Koreksi yang ditemukan pekerjaan ini:** audit pagi menyebut chip katalog "meluap ke 419–502 px" dan matriks Verifier 671 px.
T79 menunjukkan keduanya area geser — tidak meluap, tapi terpotong tanpa tanda. Tautan 473 px adalah URL yang **terpotong**
kartu `overflow: hidden`.

## 3. Status

**SELESAI** (5 Okt). Diukur di iframe 375 px Chromium headless, bukan HP sungguhan (AC-B150#10 **PARTIAL**).

## 4. Risiko tersisa

- Baris matriks Verifier sangat tinggi di HP — butuh label kolom di markup, diserahkan ke Dave (OI-32).
- Bayangan area geser Verifier memakai warna panel `rgb(16, 19, 24)`; kalau warna panel diubah, `--mobile-scroll-cover` ikut
  diubah (OI-32).
- Halaman penerbit hanya dibuka dengan anggota `hire=1 appoint=1`; tab untuk hak lain bisa berbeda.

## 5. Bukti

Commit `4126d51`. T79 (tabel sebelum + perbaikan 1–5). Baris B150: uji negatif penjaga marker (marker dibalik → audit 1 TEMUAN,
label MERAH; dikembalikan → bersih).
