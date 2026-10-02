---
tags: [acceptance-criteria, B133]
status: active
updated: 2026-10-03
---

# AC-B133 - Penerbit menyusun kursus, kunci penerbit menerbitkan

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B133 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T58 - signer authoring-check.js (B133 susun kursus)]] ·
[[09-Testing/T59 - Uji peramban susun kursus sampai dikerjakan peserta (B133)]] · **Summary:** [[08-Results/B133 - Executive Summary]] ·
**Keputusan:** D67

Pertanyaan builder 2 Okt malam: "untuk publisher masa gabisa bikin course baru?". Pilihan 3 Okt: **anggota menyusun, kunci penerbit
menerbitkan**.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B133#1 | hak susun lahir dari hibah kunci penerbit (`author=1`, migrasi 0017 `publisher_members.can_author`); pesan hibah lama tanpa `author=` tetap sah (= 0) dan tidak bisa dipakai untuk author=1; akun berperan lain ditolak (B131) | **PASS** 3 Okt | T58 A |
| AC-B133#2 | simpan draf: isi dinormalkan dengan modul skema yang sama di halaman dan server (`web/src/authoring.ts`), penyusun menandatangani keccak isi, server menyimpan hanya bila hash-nya sama; field asing, hash lain, kunci lain, replay → ditolak; hanya penyusun yang menyunting; kunci kuis hanya untuk penyusunnya | **PASS** 3 Okt | T58 B; T59 langkah 8 |
| AC-B133#3 | audit draf = aturan kursus berkas (`auditCourse`) + batas editor (bacaan/kuis/esai, praktik 0) + kunci lengkap + id belum dipakai; draf bermasalah tidak bisa diajukan; draf diajukan terkunci | **PASS** 3 Okt | T58 B–C; T59 langkah 3–9 |
| AC-B133#4 | terbit/tolak hanya kunci penerbit (`npm run course:publish`): audit ulang isi tersimpan, `rubricHash` + `manifestHash` dihitung dan `rubricHash` ikut ditandatangani; tolak membawa catatan dan mengembalikan draf ke penyusun | **PASS** 3 Okt | T58 D, F; T59 langkah 10 |
| AC-B133#5 | kursus terbit masuk katalog server di jalur yang sama dengan kursus berkas (manifest berkunci, manifest publik, harga; kursus berkas tidak pernah ditimpa; `rubricHash` dicocokkan ulang saat dimuat); `GET /catalog/published` tanpa kunci; criteria tersaji; CLI terbit kredensial dan `publish:edge` memuatnya juga | **PASS** 3 Okt | T58 D; T59 langkah 11 |
| AC-B133#6 | peserta mendaftar dan mengerjakan kursus database dari halaman; kuis dinilai server dengan kunci tersimpan | **PASS** 3 Okt | T58 E; T59 langkah 12–13 |
| AC-B133#7 | halaman "Susun kursus": lajur draf/diajukan/terbit, tulang silabus dengan pin masalah, batang bobot, editor kursus/modul/lesson (bacaan, kuis dengan kunci + alasan, esai dengan rubrik), pratinjau, simpan + ajukan bertanda tangan; ponsel 500 px; 0 error konsol | **PASS** 3 Okt | T59 |
| AC-B133#8 | gerbang hijau | **PASS** 3 Okt untuk B133 (dua merah warisan: data tepi basi) | `tsc`, build, `probe` 118/0; baterai `sync:numbers` **27 dari 29 harness hijau** (`verify:authoring` 48/0, `verify:account` 50/0, `verify:publisher` 57/0, `verify:roles` 39/0, `verify:owner` 32/0) — dua merah `verify:edge` (umur state tepi) dan `verify:quizkeys` tetap 60/66 (pemindaian bundel tidak bertambah gagal sesudah editor masuk bundel), keduanya disembuhkan `npm run publish:edge` oleh builder; `--verify` 54 klaim, 5 merah — semuanya sumber edge/quizkeys; `audit` 1 TEMUAN = A10 baris README `verify:edge` (sebab yang sama), A9 213 marker cocok, A10 20 baris; `check:labels` 8/0; vault 0 tautan rusak, PASTE 5587/5600 |
| AC-B133#9 | login sungguhan builder: akun dummy (dev, sudah anggota) diberi `--author`, menyusun dan mengajukan; builder menerbitkan dengan CLI | **TERBUKA** | uji builder |

**Batas klaim:** menerbitkan tetap CLI di mesin pemegang kunci penerbit, bukan tombol di halaman. Lesson praktik (bukti chain) tidak
disusun dari halaman. Dokumen criteria kursus database ada di signer seketika, tetapi di tepi baru sesudah builder menjalankan
`npm run publish:edge`. Kursus terbit tidak bisa ditarik kembali dari halaman. Testnet, token demo.
