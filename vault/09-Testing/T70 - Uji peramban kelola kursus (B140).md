---
tags: [testing, "T70"]
status: active
updated: 2026-10-04
command: vite dev + signer demo lokal + Chromium headless 1440 px dan iframe 375 px; penyusun uji A (author=1) + anggota uji M (publish=1)
measured: 2026-10-04
result: KELOLA KURSUS DARI HALAMAN JALAN — terbit dari dasbor, versi baru menggantikan di tempat, arsip/pulihkan, hapus draf; 3 cacat ditemukan dan ditutup
---

# T70 - Uji peramban kelola kursus terbit (B140)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B140 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B140 - Kelola kursus terbit dari dasbor]] ·
**Harness:** [[09-Testing/T71 - signer manage-check.js (B140 kelola kursus)]] · **Summary:** [[08-Results/B140 - Executive Summary]] ·
**Keputusan:** D72 di [[00-Overview/03 - Decisions]]

Pertanyaan yang diuji: apakah penerbit bisa mengelola kursus database dari HALAMAN tanpa CLI. Yang diuji: anggota `publish=1`
menerbitkan, penyusun menyusun versi baru dari kursus terbit, versi baru menggantikan versi lama di tempat, arsip
menyembunyikan kursus dari katalog dan detailnya, pulihkan, dan hapus draf yang belum diajukan. Server yang memutuskan;
`verify:manage` (T71) membuktikan aturannya lewat HTTP. Uji ini membuktikan bahwa layarnya memakai aturan itu dengan benar.

## Cara mengulang

1. `cd web && npm run dev` (5173); `cd signer && LANCENA_ORIGIN=demo npm run serve` (8787).
2. Dua identitas uji (kunci perangkat, bukan akun builder): penyusun **A** diberi `npm run grant:member -- <A> --author`,
   anggota **M** diberi `npm run grant:member -- <M> --publish` (keduanya `LANCENA_ORIGIN=test`, supaya dikenali sebagai baris uji).
3. A menyimpan + mengajukan draf `uji-t70-<acak>`, lalu menyimpan draf kedua `uji-t70-hapus-<acak>` tanpa diajukan. Di run ini
   keduanya disemai lewat rute bertanda tangan yang sama dengan halaman (`POST /publisher/drafts/save`, `/submit`) dari skrip
   sekali pakai; menyusun dari halaman sudah dibuktikan T59.
4. Identitas diserahkan ke halaman lewat server `127.0.0.1` sekali pakai (kunci tidak pernah dicetak), lalu buka
   `#/app/pub/author`.

## Hasil 4 Okt (21.21–21.30 WIB)

| # | siapa | langkah | hasil |
|---|---|---|---|
| 1 | M | buka draf yang diajukan A (halaman dalam bahasa Inggris) | kotak keputusan: "Note for the author (optional, up to 280 characters)", **Sign & publish**, **Return with a note**, "The server signs this decision with the publisher key and records you as the member who asked." — dan "2 problems" palsu (cacat 1 di bawah) |
| 2 | M | terbitkan | "Published."; kartu pindah ke lajur Terbit; riwayat "published … by you" |
| 3 | A | **Sunting jadi versi baru** pada kursus terbit, ganti judul, simpan, ajukan | draf v2 (`supersedes` = draf #68) dengan id sama; kartu bertanda `v2` |
| 4 | M | terbitkan v2 | versi lama `superseded`, v2 `published` dengan id sama (menggantikan di tempat); riwayat menautkan v2 ke v1 |
| 5 | M | **Arsipkan** | "Archived."; tag `archived`; tombol berganti **Pulihkan** |
| 6 | M | `#/course/uji-t70-<acak>` (M tidak terdaftar di kursus itu) | "This course is archived — it takes no new learners. Enrolled learners keep their class, and its credentials stay verifiable." di tempat tombol daftar; **tidak ada** tombol daftar |
| 7 | M | beranda `#/` | katalog 7 kartu, kursus uji **tidak ada** |
| 8 | M | **Pulihkan** | "Restored to the catalogue."; tag hilang; tombol kembali **Arsipkan**; riwayat "restored" |
| 9 | A | **Hapus draf** pada draf yang belum diajukan | klik pertama berubah jadi "Klik lagi untuk menghapus"; klik kedua → "Draft deleted.", lajur Draf kosong, riwayat "deleted … by you" |
| 10 | A | iframe 375 px | tidak ada elemen yang melewati lebar layar; tombol kelola dan riwayat terbungkus rapi |

Tangkapan layar ada di scratchpad sesi (`t70-1-decide.png` … `t70-8-mobile-bar.png`) dan tidak disimpan ke repo.

## Cacat yang ditemukan uji ini (semuanya ditutup di B140)

1. **"2 masalah" palsu untuk pembaca yang bukan penyusun.** Draf orang lain dibaca TANPA kunci kuis (kunci hanya untuk
   penyusunnya), jadi audit halaman melaporkan "soal tanpa kunci" yang tidak ada. Perbaikan: draf hanya-baca tanpa kunci
   menampilkan audit server yang tersimpan (`web/src/pages/authoring-view.ts` `audit`).
2. **Pesan sesudah terbit tidak gramatikal:** "Published. replaced the published version in place." Diganti satu kalimat per
   kasus: "Published — it replaced the previous version in place." / "Published under a new id — the previous version was archived."
3. **Riwayat mencampur bahasa.** Server menulis teks mesin berbahasa Indonesia ("menggantikan versi #68 (…, superseded)") ke kolom
   `course_actions.note`, yang tampil mentah di UI berbahasa Inggris dan bercampur dengan catatan manusia. Perbaikan: `note`
   hanya berisi catatan manusia (`signer/src/db.js` `decideDraft`). Halaman membaca versi yang digantikan dari datanya
   (`draft_id` → `supersedes`) dan menulis "replaced v1" / "archived the previous version" dalam bahasa yang dipilih.
   Baris jejak langkah 4 masih memuat teks lama karena ditulis sebelum perbaikan, dan baris itu ikut dihapus saat bersih-bersih.

## Batas

- Penolakan dari halaman, penyusun yang mencoba memutuskan drafnya sendiri, dan jalur "aturan nilai berubah → id baru"
  tidak diklik di peramban. Semuanya dibuktikan `verify:manage` (T71 bagian B, D, F) lewat rute yang sama.
- Katalog beranda sesudah dipulihkan (langkah 8) tidak diperiksa ulang di peramban. Harness T71 bagian E membuktikan
  enroll menerima peserta baru lagi.
- Halaman detail kursus arsip untuk peserta yang SUDAH terdaftar (pemberitahuan + tautan ke kelasnya) tidak dilihat di peramban —
  M tidak terdaftar di kursus itu. Harness T71 bagian E membuktikan enroll lamanya tetap 200.
- Identitas uji memakai kunci perangkat, bukan login Privy builder.

## Temuan di luar B140 (dicatat sebagai B147, belum dikerjakan)

- Silabus di halaman detail kursus menulis jenis lesson dalam bahasa Indonesia meski halaman berbahasa Inggris ("bacaan",
  "kuis", "esai dinilai agen"): petanya satu bahasa di `web/src/lesson-views.ts:169`. Sudah ada sebelum B140.
- Tautan "Open course page" di editor Susun kursus tampil sebagai tautan biru bawaan peramban di atas tema gelap
  (`web/src/pages/authoring-view.ts`, baris `rubricHash`). Sudah ada sejak B133.

## Bersih-bersih

Sesudah uji, baris uji dihapus dengan saringan persis (id kursus uji, alamat A dan M, `origin=test` untuk keanggotaan):
6 baris `course_actions`, 2 draf (rantai `supersedes` diputus dulu), 2 keanggotaan, 0 peran. Kueri ulang: semuanya 0. Signer demo
lalu dinyalakan ulang karena katalog database ada di memorinya; `GET /catalog/published` → `courses: []`.
