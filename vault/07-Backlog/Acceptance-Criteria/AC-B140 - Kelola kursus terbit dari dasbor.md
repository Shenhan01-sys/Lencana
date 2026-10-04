---
tags: [acceptance-criteria, B140]
status: active
updated: 2026-10-04
---

# AC-B140 - Kelola kursus terbit dari dasbor

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B140 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T71 - signer manage-check.js (B140 kelola kursus)]] ·
[[09-Testing/T70 - Uji peramban kelola kursus (B140)]] · **Summary:** [[08-Results/B140 - Executive Summary]] · **Keputusan:** D72

Pertanyaan builder 3 Okt (uji dari HP): "kamu mau manage courses gimana? Misal mau hapus edit atau bikin course baru". Pilihan
builder (D72): **edit = draf versi baru**, **hapus = arsipkan** (draf yang belum diajukan boleh dihapus sungguhan), **tombol
Terbitkan/Tolak/Arsipkan di dasbor** untuk anggota yang diberi hak `publish=1` oleh kunci penerbit. Server menandatangani keputusan
dengan kunci penerbit dan mencatat siapa yang meminta.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B140#1 | hak `publish=1` hanya dari hibah kunci penerbit yang pesannya menyatakan `publish=1` (pesan hibah tanpa `publish=1` = tanpa hak, dan tidak bisa dipakai untuk meminta hak itu); anggota tanpa hak dan bukan anggota → 403 | **PASS** 4 Okt | T71 A |
| AC-B140#2 | terbit/tolak dari dasbor: server mengaudit ulang isi tersimpan, menandatangani keputusan dengan kunci penerbit (pesan sama dengan CLI `course:publish`), `rubricHash` = hitungan; jejak `course_actions` menyimpan peminta + pesan dan tanda tangannya + pesan dan tanda tangan kunci penerbit | **PASS** 4 Okt | T71 B; T70 langkah 1–2 |
| AC-B140#3 | penyusun tidak bisa memutuskan drafnya sendiri dari dasbor (CLI kunci penerbit tetap bisa); halaman tidak menawarkan tombolnya | **PASS** 4 Okt untuk server — halamannya (catatan "draf milikmu sendiri") tidak diklik di uji peramban | T71 B; `web/src/pages/authoring-view.ts` `ownDraft` |
| AC-B140#4 | sunting = versi baru dengan aturan nilai sama: salinan versi terbit (kunci kuis ikut, hanya untuk penyusunnya), satu draf terbuka per id, terbit **menggantikan di tempat** (versi lama `superseded`, id sama, katalog memuat isi baru) | **PASS** 4 Okt | T71 C; T70 langkah 3–4 |
| AC-B140#5 | aturan nilai berubah: id lama ditolak audit dengan saran `<id>-v<n>` (aturan sama tapi id diganti juga ditolak); id baru terbit sebagai kursus baru, versi lama tetap dimuat dengan aturannya tapi diarsipkan, jadi peserta lamanya tetap masuk kelas | **PASS** 4 Okt untuk server dan audit bersama — tidak diklik di peramban | T71 D; `web/src/authoring.ts` `versionProblems` |
| AC-B140#6 | arsip: hilang dari katalog, halaman detail tanpa tombol daftar, peserta lama tetap masuk, `POST /enroll` peserta baru → 409; pulihkan mengembalikannya | **PASS** 4 Okt | T71 E; T70 langkah 5–8 |
| AC-B140#7 | hapus hanya draf yang belum pernah diajukan, oleh penyusunnya, dua klik; jejaknya tetap tersisa (`draft_id` null); draf yang pernah diputuskan tidak bisa dihapus | **PASS** 4 Okt | T71 F; T70 langkah 9 |
| AC-B140#8 | pesan kunci penerbit untuk versi baru wajib menyebut `supersedes=<id>`, bentuknya sama untuk CLI dan server | **PASS** 4 Okt | T71 G |
| AC-B140#9 | ponsel 375 px tanpa geser horizontal | **PASS** 4 Okt | T70 langkah 10 |
| AC-B140#10 | riwayat kelola dalam bahasa halaman: catatan manusia apa adanya, versi yang digantikan dibaca dari data (bukan teks mesin di kolom catatan) | **PASS** 4 Okt (sesudah perbaikan dari T70) | T70 cacat 3 |
| AC-B140#11 | gerbang | **PASS** 4 Okt malam | `tsc` 0, build (entry 831.92 kB), `probe` 118/0; baterai ulang 22.20 WIB **34 harness · 34 hijau** (`verify:manage` 55/0) — baterai pertama 34 · 33, `check.js` gagal mengambil konteks JSON-LD dari jaringan (B148); `--verify` **64 klaim hijau** (dua klaim baru `verify:manage`: T71 + Quick-Reference); `audit` 12 pemeriksaan · 0 temuan (A9 264 marker, A10 25 klaim); `check:labels` 8/0 — rincian [[08-Results/B140 - Executive Summary]] §2 |
| AC-B140#12 | uji builder dari HP dengan akun Privy-nya: hak `publish=1` diberikan (`npm run grant:member -- <alamat> --publish`), lalu terbitkan/arsipkan dari dasbor — jalur tanda tangan Privy untuk rute baru ini belum pernah dijalankan (T70 memakai kunci perangkat uji) | **TERBUKA** | uji builder |

**Batas klaim:** hanya kursus database (B133). Kursus berkas (`web/src/courses/*.ts`) tetap diubah lewat kode dan review, dan
tidak bisa diarsipkan dari dasbor. Testnet; identitas uji, bukan akun builder.
