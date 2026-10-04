---
tags: [results, executive-summary, B144]
status: active
updated: 2026-10-05
---

# B144 - Executive Summary — meja pengesahan agen pengesah (D73)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B144 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B144 - Meja pengesahan agen pengesah]] ·
**Testing:** [[09-Testing/T74 - signer review-check.js (B144 meja pengesahan)]] · [[09-Testing/T75 - Uji peramban meja pengesahan (B144)]] ·
**Keputusan:** D73

## 1. Apa yang diubah

- **Antrean pengesahan.** Rute baru `POST /owner/agents/review-queue` (pesan `lencana-agent-review-queue agent=<id> nonce=…`,
  ditandatangani dompet agen pengesah) mendaftar esai yang sudah punya usulan dan belum disahkan, dari kursus tempat penerbit
  menunjuk agen itu. Isinya teks esai, soal + rubrik + nilai lulus dari manifest, serta usulan penilai per kriteria (poin) + total
  + model + agen pengusul + label — **tanpa alamat peserta**. Esai yang akan ditolak rute pengesahan tidak ikut, dan baris harness
  (`origin=test`) tersembunyi kecuali diminta (`signer/src/review.js`, `signer/src/db.js` `queuePendingReviews`).
- **Meja di dasbor Agent Owner** (`web/src/pages/review-desk.ts`), di kartu agen yang ditunjuk sebagai pengesah: tumpukan map →
  periksa (teks, tugas, tanda mekanis, penggaris usulan) → **pendapat kedua** dari otak agen pengesah (bila terkalibrasi; kunci
  API hanya di peramban) dengan selisih per kriteria → tiga cap **Setujui / Sesuaikan / Tolak** → tangga label dengan bayaran
  agen → tanda tangan → hasil + tagihan. Keputusan dikirim ke `POST /essay/review` yang sudah ada.
- **Celah integritas ditutup.** `POST /essay/review` dulu mengambil rubrik + nilai lulus dari kursus/lesson yang dikirim peminta
  tanpa mencocokkannya dengan esainya. Pengesah kursus A bisa menyesuaikan esai A memakai rubrik kursus lain. Kini kursus **dan**
  lesson wajib milik esai itu. Penilaian agen (`/essay/judgement`) yang sudah mencocokkan kursus kini juga mencocokkan lesson.
- **Privasi tercatat:** pembaca teks esai bertambah satu, yaitu dompet pengesah yang ditunjuk (`signer/src/server.js`, komentar
  rute `/essay`). Penunjukannya adalah izin penerbit agar agen mengesahkan nilai akhirnya.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| mengesahkan esai sebagai agen pengesah | hanya skrip bertanda tangan (`POST /essay/review`) | meja di dasbor Agent Owner, termasuk dari HP (375 px) |
| melihat esai + usulan sebelum memutuskan | tidak ada rute | antrean bertanda tangan dompet pengesah, tanpa alamat peserta |
| pendapat kedua | — | otak agen pengesah menilai esai yang sama; T75: Groq 99 vs usulan 60, diputuskan 98 |
| rubrik pengesahan | dari kursus/lesson yang dikirim peminta (rubrik kursus lain diterima) | wajib milik esainya; uji negatif 31 / 3 membuktikan celahnya nyata |
| `verify:review` | — | **31/0** |
| `verify:agents` · `verify:db` · `verify:brain` · `verify:attempts` | 35/0 · 70/0 · 60/0 · 39/0 | 35/0 · 70/0 · 60/0 · 39/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 832.41 kB (B147) | 847.35 kB |
| baterai `sync:numbers` | 35 harness · 35 hijau (B148) | **36 harness · 36 hijau** (5 Okt 02.03 WIB) |
| `sync:numbers --verify` | 66 klaim hijau | **68 klaim hijau** |
| `audit` | 12 · 0 temuan (271 marker, 26 klaim) | 12 · 0 temuan — A9 **277** marker, A10 **27** klaim (termasuk `verify:review`) |
| `check:labels` | 8/0 | 8/0 |

**Yang terjadi di jalan, dicatat apa adanya:**
- **Rute baru sempat tidak terjangkau** karena belum masuk daftar path blok database di `server.js`. Tertangkap saat membaca kode,
  sebelum dijalankan.
- **18 esai `origin=test` berusulan tanpa pengesahan** di `web3-dasar-2026`, semuanya sisa `verify:brain` (satu per baterai sejak
  3 Okt). Karena itu baris uji disembunyikan di meja sungguhan.
- **T75 menemukan satu cacat kecil** (tautan "Isi dari pendapat kedua" tetap tampil sesudah keputusan terkirim), ditutup.

## 3. Yang belum

- **Uji builder dari HP dengan akun Privy** (AC-B144#10): agen pengesah yang dompetnya = akun builder ditunjuk di kursus yang
  punya usulan, lalu mengesahkan dari meja. Kandidatnya #2547 (akun 2 builder), karena #2549 sudah jadi penilai kursus itu dan
  satu agen tidak boleh jadi penilai sekaligus pengesah di kursus yang sama.
- Agen tim #2542 tetap mengesahkan lewat skrip, karena dompetnya bukan akun pemiliknya.
- Tidak ada halaman untuk pengesah manusia; akun hanya punya peran peserta / penerbit / Agent Owner.
- Pengamatan T75: angka bayaran di tangga label terpotong pada 375 px (komponen B135).
