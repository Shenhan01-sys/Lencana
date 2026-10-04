---
tags: [results, executive-summary, B140]
status: active
updated: 2026-10-04
---

# B140 - Executive Summary — kelola kursus terbit dari dasbor (D72)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B140 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B140 - Kelola kursus terbit dari dasbor]] ·
**Testing:** [[09-Testing/T71 - signer manage-check.js (B140 kelola kursus)]] · [[09-Testing/T70 - Uji peramban kelola kursus (B140)]] ·
**Keputusan:** D72

## 1. Apa yang diubah

- **Terbit dari dasbor, bukan hanya CLI.** Kunci penerbit kini bisa memberi anggota hak `publish=1`
  (`npm run grant:member -- <alamat> --publish`). Anggota itu menerbitkan atau mengembalikan draf dari Susun kursus. Ia
  menandatangani permintaannya. Server mengaudit ulang isi tersimpan, lalu menandatangani keputusan dengan kunci penerbit
  (pesan sama dengan CLI `course:publish`). Kedua pesan + tanda tangan dicatat di tabel baru `course_actions`. Penyusun tidak bisa
  memutuskan drafnya sendiri dari dasbor; CLI kunci penerbit tetap bisa.
- **Sunting = versi baru.** "Sunting jadi versi baru" menyalin kursus terbit (isi, kunci kuis, harga) jadi draf versi n+1.
  Kalau aturan nilai tetap sama, id kursus juga sama, dan versi baru menggantikan versi lama di tempat (versi lama `superseded`).
  Kalau aturan nilai berubah, id wajib baru (audit menyarankan `<id>-v<n>`), dan versi lama tetap dimuat tapi diarsipkan. Aturan
  ini satu sumber untuk halaman dan server (`web/src/authoring.ts` `versionProblems`). Dua aturan nilai dibandingkan dengan id
  yang disamakan, karena `canonicalPolicy` ikut menghitung id kursus.
- **Hapus = arsipkan.** Kursus yang diarsipkan hilang dari katalog, dan halaman detailnya mengganti tombol daftar dengan
  pemberitahuan. `POST /enroll` menolak peserta baru (409), sedangkan peserta lama tetap masuk. Kertas yang sudah terbit tidak
  disentuh, karena arsip hanya menandai baris kursusnya (`archived_at`).
  Pulihkan mengembalikannya. Yang benar-benar terhapus hanya draf yang belum pernah diajukan, dihapus penyusunnya dengan dua klik,
  dan jejaknya tetap tersisa.
- **Riwayat kelola** di bawah Susun kursus: siapa meminta apa, dengan versi yang digantikan dibaca dari data, dalam bahasa halaman.
- **Data:** migrasi `supabase/migrations/0019_course_manage.sql` (`can_publish`, `supersedes`, `version`, `archived_at`, status
  `superseded`, satu baris terbit + satu draf terbuka per id, tabel `course_actions`).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| menerbitkan kursus database | hanya CLI kunci penerbit (`npm run course:publish`), tidak bisa dari HP | tombol di dasbor untuk anggota `publish=1`; CLI tetap jalan |
| mengubah kursus terbit | tidak bisa | versi baru dari kursus terbit; id sama bila aturan nilai sama, id baru bila berubah |
| menghapus / menyembunyikan kursus | tidak bisa | arsip/pulihkan; hapus sungguhan hanya draf yang belum diajukan |
| jejak keputusan | pesan kunci penerbit di baris draf | + `course_actions`: peminta, pesan + tanda tangannya, pesan + tanda tangan kunci penerbit; draf yang dihapus tetap meninggalkan jejak |
| uji peramban (T70) | — | terbit, versi baru, arsip, pulihkan, hapus draf; 375 px tanpa geser; 3 cacat ditutup |
| `verify:manage` | — | **55/0** |
| `verify:authoring` · `verify:publisher` · `verify:roles` | 48/0 · 57/0 · 39/0 | 48/0 · 57/0 · 39/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 861.73 kB (B138, sebelum B139 membuang UI lama) | 831.92 kB |
| baterai `sync:numbers` | 33 harness · 33 hijau (B141) | **34 harness · 34 hijau** (baterai ulang 22.20 WIB) |
| `sync:numbers --verify` | 62 klaim hijau | **64 klaim hijau** — dua klaim `verify:manage` baru (T71, Quick-Reference) cocok |
| `audit` | A9 + A10 bersih | 12 pemeriksaan · 0 temuan — A9 **264** marker cocok dua arah, A10 **25** klaim README (termasuk `verify:manage`) |
| `check:labels` | 8/0 | 8/0 |

**Yang terjadi di jalan, dicatat apa adanya:**
- **`verify:manage` run pertama 55/1** — tembakan palsu harness (membaca `decided_message` dari jawaban rute, padahal kolom itu
  sengaja tidak dikirim); harness kini membacanya dari Postgres. Koreksinya tertulis di T71.
- **Satu salah rancang tertangkap sebelum kode:** `canonicalPolicy` ikut menghitung id kursus, jadi aturan nilai dua versi dengan id
  berbeda tidak bisa dibandingkan lewat `rubricHash`; `policyHashAs` menghitungnya dengan id yang disamakan.
- **T70 menemukan tiga cacat** (masalah audit palsu untuk pembaca yang bukan penyusun, kalimat sesudah terbit, riwayat yang
  bercampur bahasa) — ditutup sebelum catatan ditulis.
- **Baterai pertama malam itu 34 · 33:** `check.js` gagal mengambil konteks Open Badges dari `purl.imsglobal.org`; dijalankan
  sendirian sekali gagal, sekali **114/0**, dan hijau di baterai ulang. Bukan dari B140 — dicatat sebagai B148 (konteks JSON-LD
  diambil dari jaringan oleh setiap proses yang menandatangani). Angka di tabel = baterai ulang.

## 3. Yang belum

- **Uji builder dari HP dengan akun Privy-nya** (AC-B140#12): beri hak `publish=1` ke alamat akun penerbit builder, lalu terbitkan
  dan arsipkan dari dasbor. Jalur tanda tangan Privy untuk rute baru ini belum pernah dijalankan; T70 memakai kunci perangkat uji.
- Kursus berkas (`web/src/courses/*.ts`) tetap diubah lewat kode dan review; dasbor hanya mengelola kursus database (B133).
- B147 (dua cacat tampilan lama yang terlihat di T70) dicatat, belum dikerjakan.
