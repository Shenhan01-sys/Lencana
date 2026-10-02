---
tags: [testing, B133, browser]
status: active
updated: 2026-10-03
---

# T59 - Uji peramban susun kursus sampai dikerjakan peserta (B133)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B133 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B133 - Penerbit menyusun kursus, kunci penerbit menerbitkan]] ·
**Harness:** [[09-Testing/T58 - signer authoring-check.js (B133 susun kursus)]] · **Summary:** [[08-Results/B133 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`, dinyalakan ulang sesudah suntingan B133) + Chromium headless
(MCP) 1440×900, ponsel 500 px lewat iframe. Tanggal: 3 Okt dini hari. Dua identitas uji sekali-pakai (kunci hanya di scratchpad):
penyusun P `0x40Dc…4Fd8`, peserta S `0xeE61…8c9e`.

| # | langkah | hasil |
|---|---|---|
| 1 | P memilih Penerbit di onboarding (B131), lalu `grant:member -- <P> --author` | "susun kursus ya"; menu dasbor Penerbit kini memuat "Susun kursus" |
| 2 | `#/app/pub/author` | tiga lajur Draf / Diajukan / Terbit (0 / 0 / 0) + "Kursus baru" |
| 3 | Kursus baru | editor: tulang silabus (kursus → modul m1 → keping B bacaan-1), batang bobot kuis 60 / esai 40, pin **8 masalah** |
| 4 | isi kursus (judul, id `uji-t59-ringkasan`, topik, deskripsi, untuk siapa, hasil, kriteria) | 6 masalah; judul tampil di tulang |
| 5 | isi modul + lesson bacaan (judul, ringkasan, isi dengan `#` judul, `-` daftar, `>` catatan, `?` coba kerjakan) | 2 masalah tersisa — bobot kuis dan esai tanpa lesson jenisnya |
| 6 | `+K`: kuis satu soal, pilihan benar ditandai, alasan diisi | 1 masalah: "bobot esai 40 tanpa satu pun lesson esai" |
| 7 | `+E`: esai (soal, minimal kata, rubrik 60 + 40, jawaban yang tidak diterima) | "Tanpa masalah — audit yang sama dengan server"; keping B / K / E berwarna menurut jenis |
| 8 | Tandatangani & simpan | "Tersimpan — penerbit menghitung hash yang sama"; kartu di lajur Draf "3 lesson · gratis · siap diajukan" |
| 9 | Tandatangani & ajukan | kartu pindah ke lajur Diajukan; editor menjadi hanya-baca |
| 10 | `course:publish -- --list` lalu `-- 4` (rencana) lalu `-- 4 --apply` | draf #4 masalah 0; `rubricHash` `0x9cbdbfea…`; diterbitkan, pesan bertanda tangan kunci penerbit tercetak |
| 11 | `GET /catalog/published` dan `/criteria/uji-t59-ringkasan` dari signer demo | kursus termuat, dokumen criteria tersaji; 0 kemunculan `"answer"`/`"why"` di katalog publik |
| 12 | S membuka `#/course/uji-t59-ringkasan` | halaman detail kursus sama seperti kursus berkas: penerbit, 1 modul · 3 lesson · 25 menit, silabus, "Mulai belajar" (gratis) |
| 13 | S: Mulai belajar → kelas → lesson kuis → pilih jawaban → "Nilai jawabanku" | dinilai server: **kuis terakhir 100**, "✓ Benar. Kenapa." + alasan yang diketik penyusun (kunci tidak pernah dikirim ke peramban) |
| 14 | P di ponsel 500 px, `#/app/pub/author`, buka kartu terbit | lajur bertumpuk, editor di bawahnya; lebar dokumen 485 ≤ 500; 0 error konsol |

**Bersih-bersih:** draf #4, peran P, pengajuan + keanggotaan P, enrollment S + usaha kuis + komponennya dihapus (kueri ulang 0);
signer demo dinyalakan ulang supaya kursus uji juga hilang dari katalog dalam memorinya (`GET /catalog/published` → kosong).

**Cacat yang ditemukan:** tidak ada pada alur ini. Catatan isi: ringkasan lesson kuis menulis "dua soal" padahal kuisnya satu soal
— itu isi uji, bukan cacat editor; editor tidak memeriksa kecocokan teks ringkasan dengan jumlah soal.
