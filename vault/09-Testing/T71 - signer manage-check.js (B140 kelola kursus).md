---
tags: [testing, "T71"]
status: active
updated: 2026-10-04
command: npm run verify:manage
measured: 2026-10-04
result: KELOLA KURSUS HIJAU — 55 pemeriksaan / 0 gagal (4 Okt, B140; run pertama 55 / 1 = tembakan palsu harness, dikoreksi)
---

# T71 - signer manage-check.js — B140: kelola kursus terbit dari dasbor

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B140 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B140 - Kelola kursus terbit dari dasbor]] ·
**Uji peramban:** [[09-Testing/T70 - Uji peramban kelola kursus (B140)]] · **Summary:** [[08-Results/B140 - Executive Summary]] ·
**Keputusan:** D72

`signer/scripts/manage-check.js`, dijalankan `npm run verify:manage` (di `signer/`), ikut baterai murah `npm run sync:numbers`.
Prasyarat: `SUPABASE_URL` + secret key, `ISSUER_PRIVATE_KEY` + `ISSUER_ADDRESS`, `RPC_URL`. Server sendiri di port bebas
(`LANCENA_ORIGIN=test`, `CATALOG_TTL_MS=0`), Postgres nyata, tanpa gas. Alamat sekali-pakai: penyusun A (`author=1 publish=1`),
anggota P (`publish=1`), anggota N (tanpa keduanya), bukan anggota X, peserta S1/S2; id kursus acak `uji-kelola-<acak>`.

| bagian | yang dibuktikan |
|---|---|
| A — hak | pesan hibah tanpa `publish=1` tidak bisa dipakai untuk `publish=1` → 400; hibah A/P/N → `canPublish` true/true/false; daftar draf menyebut `canAuthor` + `canPublish` |
| B — terbit dari dasbor | penyusun memutuskan drafnya sendiri → 403 (empat mata); anggota tanpa `publish=1` → 403; bukan anggota → 403; pesan peminta yang menyebut keputusan lain → 400; P menerbitkan → `published`, `rubricHash` = hitungan dari isi + kunci tersimpan; pesan kunci penerbit berbentuk CLI (tanpa `supersedes`); jejak `course_actions` menyimpan peminta + pesan + tanda tangannya + pesan kunci penerbit; katalog publik memuatnya (versi 1, tidak diarsipkan, tanpa kunci kuis); peserta S1 mendaftar |
| C — versi baru, aturan nilai sama | anggota tanpa `author=1` → 403; kursus berkas tidak bisa disunting dari dasbor → 404; versi 2 menyalin isi + kunci (kunci hanya untuk penyusunnya), `supersedes` = versi 1; versi baru kedua selagi yang pertama terbuka → 409; anggota lain melihat versi 2 tanpa kunci; ganti judul saja → tanpa masalah; terbit → versi 1 `superseded`, versi 2 `published` dengan id sama; pesan kunci penerbit menyebut `supersedes=<versi 1>`; katalog memuat isi baru (versi 2); S1 tetap terdaftar (enroll idempoten → 200) |
| D — aturan nilai berubah | versi 3 dari versi 2; versi bermasalah tidak bisa diajukan → 422; aturan sama tapi id diganti → audit menuntut id lama; aturan berubah dengan id baru → terbit sebagai kursus baru, versi 2 tetap terbit tapi diarsipkan; katalog: id lama tetap dimuat (`archived=true`), id baru `archived=false` |
| E — arsip | S1 di kursus arsip → 200 (idempoten); peserta baru S2 → 409 `archived`; anggota tanpa `publish=1` memulihkan → 403; P memulihkan → `archivedAt` null, pesan kunci penerbit `lencana-course archive course=… on=0`; S2 bisa mendaftar; P mengarsipkan lagi → jejak arsip/pulihkan dengan peminta P; kursus yang tidak ada → 404 |
| F — hapus | anggota tanpa `author=1` → 403; penyusun menghapus draf yang belum diajukan → 200, baris hilang, jejak hapus tersisa (`draft_id` null); draf yang sudah diajukan → 409; P menolak dengan catatan → `rejected`, catatan tersimpan; draf yang ditolak tidak bisa dihapus → 409 |
| G — bentuk pesan | pesan terbit versi baru TANPA `supersedes` ditolak, juga untuk kunci penerbit (bentuk CLI); dengan `supersedes` → terbit, versi sebelumnya `superseded` |
| H — bersih-bersih | `lesson_progress`, `progress_events`, `orders`, `enrollments`, `course_actions`, `course_drafts` (rantai `supersedes` diputus dulu), `publisher_members`, `account_roles` alamat uji: dihapus, sisa 0 (kueri ulang) |

## Hasil (4 Okt)

```
KELOLA KURSUS HIJAU — 55 pemeriksaan, 0 gagal
```

Run pertama (siang, backend B140) **55 / 1** — tembakan palsu harness: pemeriksaan pesan kunci penerbit membaca
`decided_message` dari jawaban rute, padahal kolom itu sengaja tidak ada di `DRAFT_COLS`; harness kini membacanya langsung dari
Postgres, lalu **55 / 0**. Baterai `sync:numbers` malam (sesudah layar dan perbaikan dari T70, termasuk `course_actions.note`
yang kini hanya catatan manusia): **55 / 0**. Regresi pada hari yang sama: `verify:authoring` 48/0,
`verify:publisher` 57/0, `verify:roles` 39/0.

Satu salah rancang tertangkap sebelum kode, dicatat di sini karena harness ini yang menjaganya: `canonicalPolicy` ikut menghitung
id kursus, jadi "aturan nilai sama?" tidak bisa dijawab dengan membandingkan `rubricHash` dua versi yang id-nya berbeda.
`policyHashAs` (`web/src/authoring.ts`) menghitung aturan versi baru seolah ber-id sama dengan versi dasarnya; bagian D
membuktikan kedua arah (aturan sama + id baru → ditolak; aturan berubah + id lama → ditolak).

**Batas klaim:** harness memanggil rute HTTP yang sama dengan halaman, bukan halamannya (halaman: T70). Hanya kursus database.
Kursus berkas diubah lewat kode. Tidak ada kredensial yang diterbitkan di harness ini, jadi "kredensial lama tetap menunjuk
aturannya" adalah sifat rancangan (versi lama tidak diubah, `rubricHash`-nya tetap), bukan hal yang diukur di sini.
