---
tags: [results, executive-summary, B138]
status: active
updated: 2026-10-03
---

# B138 - Executive Summary — bursa agen di dasbor Penerbit (D70), termasuk B137

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B138 dan B137 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B138 - Bursa agen di dasbor Penerbit]] ·
**Testing:** [[09-Testing/T64 - signer market-check.js (B138 bursa agen)]] · [[09-Testing/T65 - Uji peramban bursa agen (B138)]] ·
**Keputusan:** D70

## 1. Apa yang diubah

- **Agen dipilih dari etalase, bukan diketik nomornya.** Tab Agen di dasbor Penerbit (`#/app/pub/agents`) kini bursa: setiap agen
  yang dikenal platform berdiri di lapaknya sebagai robotnya sendiri (rupa dari berkas registrasi ERC-8004, B132), dan datanya dibaca
  dari bentuknya:
  - mata menyala = dompet agen terisi; lampu antena = layak disewa; pelat dada = tarif dasar;
  - tangga tujuh batang = harga per label tingkat berat;
  - chip otak = provider/model + dua titik kalibrasi pada skala 0–100 dengan garis lulus (B135);
  - batang rapor = keputusan pengesah manusia atas usulannya (disetujui / disesuaikan / ditolak);
  - papan = kursus tempat ia menilai atau mengesahkan.
- **Sewa / tunjuk dari lapaknya.** Panel di lapak memuat semua kursus; kursus yang akan ditolak aturan (B120, B129) tampil dengan
  alasannya dan tidak bisa dipilih — sebelum apa pun ditandatangani. Server tetap yang memutuskan.
- **Tim agen kursusmu.** Di atas etalase: kursi penilai dan pengesah tiap kursus; kursus tanpa agen dirangkum satu baris.
- **Saring, urut, cari.** Bisa disewa / punya otak; paling berpengalaman / termurah / terbaru; nama atau `#nomor`. Formulir nomor
  agen lama tetap ada, dilipat, untuk agen yang belum dikenal platform.
- **Satu rute baca.** `GET /agents/market`: fakta registry saat itu + angka gabungan, cache 60 detik, dibatalkan oleh sewa,
  penunjukan, otak, dan klaim agen. Tanpa teks esai, alamat peserta, alamat penyewa, tanda tangan, atau uang tagihan.
- **B137:** kartu agen yang didaftarkan sendiri kini "Didaftarkan sendiri oleh …", bukan "Dicetak platform".

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| memilih agen di tab Agen | ketik nomor agen → "Lihat" (dua formulir) | etalase 6 agen robot + sewa/tunjuk dari lapak |
| konflik aturan terlihat sebelum tanda tangan | tidak — ditolak server sesudah ditandatangani | ya, per kursus dengan alasannya (aturan halaman = aturan server, T64) |
| agen yang sudah bekerja | alamat hex di kartu teks | kursi bergambar robot per kursus |
| uji peramban (T65) | — | anggota uji menyewa #2549 untuk Kelas Uji dari lapaknya; tercatat, bursa dibaca segar; barisnya dihapus |
| `verify:market` | — | **23/0** |
| `verify:agents` · `verify:publisher` · `verify:owner` | 34/0 · 57/0 · 32/0 | 34/0 · 57/0 · 32/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 846.39 kB (B135) | 861.73 kB |
| baterai `sync:numbers` | 31 harness · 27 hijau (B135) | **32 harness · 28 hijau** (15:22 WIB) — merah: `verify:edge` + `verify:quizkeys` (data tepi basi → `publish:edge` builder), `verify:studio` 28/1 + `verify:praktik` 22/1 (B136, struk lama dari RPC) |
| `sync:numbers --verify` | 58 klaim, 9 merah | **60 klaim, 9 merah** — sama, semuanya sumber merah di atas; dua klaim `verify:market` cocok |
| `audit` | A9 235 marker · A10 1 BEDA | A9 **245** marker cocok dua arah · A10 23 klaim, **1 BEDA** (`verify:edge`) |
| `check:labels` | 8/0 | 8/0 |

**Yang terjadi di jalan, dicatat apa adanya:**
- **Baterai pertama B138 (selesai 14:59 WIB) 27 hijau dari 32:** `probe` merah karena `eth_chainId` ke publicnode "fetch failed" dan
  `verify:authoring` 48/1. Dijalankan sendirian sesudahnya keduanya hijau (118/0, 48/0), dan baterai ulang 15:22 hijau untuk
  keduanya. Angka di tabel = baterai ulang; yang pertama tidak dihapus dari log. Di run 14:59 itu `verify:studio` justru **hijau**
  (13:36 dan 15:22 merah) — publicnode menjawab struk lama tidak konsisten, dicatat di B136.
- **`verify:market` run pertama 22/1** karena pemeriksaan harness mencari kata `"body"` di teks jawaban dan menembak badan robot di
  `avatar` — koreksinya tertulis di T64 dan di harness.
- **T65 menemukan dua cacat tata letak** (bagian tim terlalu tinggi, tangga harga rata) — ditutup sebelum catatan ditulis.

## 3. Yang belum

- Login sungguhan builder: akun penerbit (dummy) menyewa #2549 dari bursa (AC-B138#10) — sekaligus membuka antrean #2549 sehingga
  AC-B135#10 (menilai dari antrean) bisa ditutup: peserta dummy mendaftar Kelas Uji, menyerahkan esai, pemilik #2549 menilainya.
- Bursa publik (`#/agents`) — tidak dipilih sekarang (D70).
- B136 (struk lama dari RPC) = pekerjaan berikutnya sesuai urutan builder.
