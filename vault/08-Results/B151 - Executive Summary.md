---
tags: [results, executive-summary, B151]
status: active
updated: 2026-10-05
---

# B151 - Executive Summary — ruang kelas bisa dipakai dari HP

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B151 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B151 - Ruang kelas di HP]] ·
**Testing:** [[09-Testing/T77 - Uji peramban ruang kelas di HP (B151)]] · **OI:** OI-31 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- **`web/src/pages/class.css` (baru, dimuat `web/src/pages/class.ts:19`).** ≤ 900 px: satu kolom yang digulir halaman (bukan
  kotak 100vh dengan gulir di dalam), bilah atas 56 px yang menempel, kurikulum menjadi laci kiri, pager dua kolom sama lebar.
  ≤ 1100 px: rail kanan disembunyikan (referensinya juga ada di badan lesson). `style.css` tidak disunting.
- **Laci kurikulum** (tombol **Kurikulum**): tutup lewat ×, latar, Esc, atau memilih lesson; fokus ke lesson aktif;
  `visibility` supaya laci tertutup tidak tercapai Tab; kunci gulir dilepas saat rute berganti; kaki laci memuat alamat +
  "Belajar & kredensialku".
- `web/src/pages/class.ts`: markup tombol + laci + latar; label bilah atas dipecah ke `span` (teks desktop sama persis).
- Ikut ditutup: tautan kursus di breadcrumb lesson yang biru bawaan peramban (semua lebar), dan tiga cacat temuan T77.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| isi lesson di 375 px | di luar layar ke kanan (kurikulum 320 px + rail 240 px berdampingan) | satu kolom, terlihat |
| elemen melewati layar | 30–31 di `uji-bayar-2026` dan `web3-dasar-2026` | 0 di 10 halaman kelas dua kursus (T77 langkah 1–2) |
| kuis dari 375 px | — | dinilai server: "1/4 benar = 25 · terbaik 25 · ambang 75" (T77 langkah 7) |
| esai dari 375 px | — | "Terkirim ke penerbit · 2/5 tanda mekanis terpenuhi · 121 kata" (T77 langkah 8) |
| pager Sebelumnya / Selanjutnya | — | 159 / 159 px, tinggi 48 px (T77 langkah 9) |
| tablet 1000 px | — | dua kolom, rail disembunyikan, 0 luapan (T77 langkah 10) |
| desktop 1440 px | tiga kolom | tiga kolom, tidak berubah (T77 langkah 11) |
| `npm run build` · `probe` | — · 118/0 | exit 0 · 118/0 |

## 3. Status

**SELESAI** (5 Okt). Diukur di iframe Chromium headless dengan peserta sekali-pakai (kunci perangkat), bukan HP sungguhan dengan
login Privy (AC-B151#11 **PARTIAL**).

## 4. Risiko tersisa

- HP sungguhan belum tercatat di vault.
- Praktik tidak dikirim dari halaman — formulirnya memang belum ada (OI-20); yang diuji tata letaknya.
- `.lesson-item { transition: all }` di `style.css` ikut mentransisikan `visibility`; aturan HP di `class.css` mempersempitnya.
  Titik 900 / 1100 px terikat ke `(min-width: 901px)` di `bindCurriculumGlobals` (OI-31).
- Desktop dibandingkan lewat ukuran + computed style elemen kunci + tangkapan, bukan semua elemen terhadap HEAD.

## 5. Bukti

Commit `289f569`. T77 langkah 1–11, tiga cacat yang ditemukan dan ditutup, bersih-bersih (kueri ulang enrollment 0, usaha 0,
submission 0).
