---
tags: [testing, "T58"]
status: active
updated: 2026-10-03
command: npm run verify:authoring
measured: 2026-10-03
result: SUSUN KURSUS HIJAU — 48 pemeriksaan / 0 gagal (3 Okt, B133; run pertama 48 / 0 hijau)
---

# T58 - signer authoring-check.js — B133: Penerbit menyusun kursus

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B133 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B133 - Penerbit menyusun kursus, kunci penerbit menerbitkan]] ·
**Uji peramban:** [[09-Testing/T59 - Uji peramban susun kursus sampai dikerjakan peserta (B133)]] ·
**Summary:** [[08-Results/B133 - Executive Summary]] · **Keputusan:** D67

`signer/scripts/authoring-check.js`, dijalankan `npm run verify:authoring` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key,
`ISSUER_PRIVATE_KEY` + `ISSUER_ADDRESS`, `RPC_URL`. Server sendiri di port bebas (`LANCENA_ORIGIN=test`, `ENROLL_PAYWALL=off`,
`CATALOG_TTL_MS=0` supaya katalog dimuat ulang tiap permintaan). Tanpa gas. Enam alamat sekali-pakai dan dua id kursus acak
(`uji-susun-<acak>`); semua barisnya dihapus di G dan sisanya dihitung ulang dari database.

| bagian | yang dibuktikan |
|---|---|
| A — hak susun | bukan anggota → 403; akun Peserta → 403 karena perannya (B131); anggota tanpa `author=1`: daftar draf 200 dengan `canAuthor false`, simpan → 403; pesan hibah tanpa `author=1` tidak bisa dipakai untuk author=1 → 400; hibah `author=1` → 200; nama lembaga dari kursi |
| B — simpan | field asing → 400 + daftar masalah; hash di pesan ≠ isi → 400; kunci lain → 401; soal tanpa kunci → tersimpan dengan masalah audit; id kursus berkas (`web3-dasar-2026`) → audit "sudah dipakai"; suntingan lengkap → tanpa masalah; **hash tersimpan = hash yang dihitung klien dengan modul skema yang sama** (`web/src/authoring.ts`); lembaga diisi server; penyusun lain menyunting → 403; kunci kuis hanya untuk penyusunnya |
| C — ajukan | draf bermasalah → 422; hash lain → 400; sah → `submitted`; menyunting sesudah diajukan → 409 |
| D — terbit | rencana terbit mengaudit ulang isi tersimpan; kunci lain → ditolak (auth); `rubricHash` lain di pesan → ditolak (input); kunci penerbit → `published`, `rubricHash` = hitungan; katalog publik memuatnya **tanpa** `answer`/`why`; manifest publik + dokumen criteria membawa `rubricHash` yang ditandatangani |
| E — belajar | peserta baru mendaftar kursus database → 200; kuis dinilai server dengan kunci tersimpan: benar semua = 100, `rubricHash` = yang ditandatangani |
| F — tolak | draf kedua diajukan, ditolak kunci penerbit dengan catatan, penyusun menyuntingnya lagi → kembali `draft` |
| G — bersih-bersih | `attempt_components`, `submissions`, `attempts`, `lesson_progress`, `progress_events`, `orders`, `enrollments`, `course_drafts`, `publisher_members`, `account_roles` alamat uji: dihapus, sisa 0 (kueri ulang) |

## Hasil (3 Okt)

```
SUSUN KURSUS HIJAU — 48 pemeriksaan, 0 gagal
```

Regresi pada hari yang sama, sesudah bentuk pesan hibah menerima `author=`: `verify:roles` 39/0, `verify:publisher` 57/0,
`verify:account` 50/0.

**Batas klaim:** jalur terbit diuji lewat fungsi yang sama dengan CLI (`publishPlan` + `decideDraft`), bukan lewat proses CLI-nya;
CLI-nya sendiri dijalankan di T59. Lesson praktik tidak bisa disusun dari halaman. Dokumen criteria kursus database di tepi menunggu
`npm run publish:edge` (yang kini memuat kursus database lebih dulu).
