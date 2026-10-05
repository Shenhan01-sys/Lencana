---
tags: [acceptance-criteria, B150]
status: active
updated: 2026-10-05
---

# AC-B150 - Isi tidak keluar kartu di HP

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B150 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T79 - Uji peramban isi keluar kartu di HP (B150)]] ·
**Summary:** [[08-Results/B150 - Executive Summary]] · **OI:** OI-32 di [[10-Contributors/Open-Items-for-Dave]]

Permintaan builder 5 Okt: "beberapa ada yg keluar card, mungkin design dan layoutnya bisa disesuaikan lagi". Audit 375 px 5 Okt:
Ringkasan meluap ke 492 px, label ambang Nilai keluar kartu, kartu Pusat Kepercayaan/Penerbit sampai 384 px, chip katalog dan
matriks Verifier melebar. *(Koreksi saat dikerjakan, T79: chip katalog dan matriks Verifier ternyata area geser — tidak meluap,
tapi terpotong tanpa tanda; tautan 473 px adalah URL dokumen penerbit yang **terpotong** kartu `overflow: hidden`.)* Acc
builder: "Mobile dulu".

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B150#1 | Ringkasan `#/app`: baris jalur belajar tetap di dalam `.ov-card` (sebelumnya 85–492 px, halaman 492 px) | **PASS** 5 Okt | T79 perbaikan 1 (0 luapan; baris 85–321 px, judul ber-ellipsis) |
| AC-B150#2 | Nilai `#/app/grades`: label ambang grafik di dalam kartu, sisinya dipilih menurut ruang sesudah tergambar | **PASS** 5 Okt | T79 perbaikan 2 (label 53–197 px di trek 33–327 px; sebelumnya 225–369 px pada kartu 16–344 px) |
| AC-B150#3 | Pusat Kepercayaan dan Penerbit: kartu mengikuti lebar layar; URL dokumen penerbit memecah, tidak terpotong | **PASS** 5 Okt | T79 perbaikan 3 (0 luapan, 0 terpotong; kartu 312 px) |
| AC-B150#4 | area geser bertanda: matriks Verifier (bayangan tepi) dan chip saring katalog (tepi memudar + ruang 24 px di ujung) | **PASS** 5 Okt | T79 perbaikan 4–5 |
| AC-B150#5 | audit ulang di 375 px: 0 luapan dan 0 teks terpotong di semua rute yang diaudit (20 rute, tiga kursi, termasuk halaman publik) | **PASS** 5 Okt | T79 (5 halaman bermasalah → 0; daftar rute bersih di tabel "Sebelum perbaikan") |
| AC-B150#6 | desktop tidak berubah | **PASS** 5 Okt | T79 kolom "desktop 1440 px" perbaikan 1–3 |
| AC-B150#7 | `style.css` tidak disunting; berkas pemelihara front-end yang tersentuh hanya `main.ts` (satu impor `mobile.css`), diserahkan lewat OI-32 | **PASS** 5 Okt | `git show --stat 4126d51`: kode `web/src/pages/dash-catalog.css`, `web/src/lib/charts.ts`, `web/src/mobile.css` (baru), `web/src/main.ts` (+2); `web/src/main.ts:36` |
| AC-B150#8 | marker B150 di `web/src/lib/charts.ts` diadili penjaga (temuan saat mengerjakan: A9 dan `check:labels` melewati setiap direktori bernama `lib`, bukan hanya di akar) | **PASS** 5 Okt | baris B150: `audit` 283 marker bersih, `check:labels` 8/0, `--self-test` 12/0; uji negatif (marker dibalik ke TERBUKA) → audit 1 TEMUAN + label MERAH, dikembalikan → bersih |
| AC-B150#9 | gerbang | **PASS** 5 Okt | `npm run build` (tsc + vite) exit 0, `probe` 118/0 (T79) |
| AC-B150#10 | dipakai di HP sungguhan | **PARTIAL** | diukur di iframe 375×812 Chromium headless dengan identitas uji (kunci perangkat, bukan login Privy); hasil di HP builder tidak tercatat di vault; halaman penerbit hanya dibuka dengan anggota `hire=1 appoint=1` — T79 §Batas |

**Batas klaim / di luar cakupan:** baris matriks Verifier sangat tinggi di HP — tata letak bertumpuk butuh label kolom di markup,
diserahkan ke Dave (OI-32). Label bilah tab bawah dasbor yang ber-ellipsis di 375 px disengaja, bukan luapan.
