---
tags: [testing, "T56"]
status: active
updated: 2026-10-03
command: npm run verify:account
measured: 2026-10-03
result: SATU PERAN HIJAU — 50 pemeriksaan / 0 gagal (3 Okt, B131; run pertama 44 / 6 merah karena id kursus salah di harness, run kedua 48 / 2 merah karena bertabrakan dengan baterai yang sedang jalan — lihat di bawah)
---

# T56 - signer account-check.js — B131: satu akun satu peran

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B131 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B131 - Satu akun satu peran, akun dev]] ·
**Uji peramban:** [[09-Testing/T57 - Uji peramban satu akun satu peran (B131)]] ·
**Summary:** [[08-Results/B131 - Executive Summary]] · **Keputusan:** D66

`signer/scripts/account-check.js`, dijalankan `npm run verify:account` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key,
`ISSUER_PRIVATE_KEY` + `ISSUER_ADDRESS`, `RPC_URL`, `AGENT_OWNER_PRIVATE_KEY` (pemilik agen demo #2534, untuk peran yang diturunkan
dari `ownerOf`). Server sendiri di port bebas, `LANCENA_ORIGIN=test`, `ENROLL_PAYWALL=off`. Tanpa gas. Tujuh alamat sekali-pakai;
semua barisnya dihapus di G dan sisanya dihitung ulang dari database.

| bagian | yang dibuktikan |
|---|---|
| A — `POST /me/role` | tanpa pesan → 400; peran tak dikenal → 400; pesan untuk Peserta dikirim sebagai Agent Owner → 400; memilih Penerbit dengan penerbit lain di pesan → 400; kunci lain atas nama akun → 401; sesudah semua penolakan akun tetap belum berperan dan boleh memilih |
| B — Peserta | pilih → 201; `/me/roles` `account` = learner lewat `chosen`, bukan dev, tidak bisa memilih lagi; memilih lagi → 409; daftar kelas → 200; mengajukan anggota → 403; dasbor penerbit → 403 (karena peran); dasbor Agent Owner → 403 (karena peran); hibah keanggotaan oleh kunci penerbit → 409 |
| C — Penerbit | pilih dengan catatan → 201 + pengajuan `pending` + catatan; `/me/roles`: peran publisher, kursi fakta belum ada, pengajuan pending; daftar kelas → 403; koin uji → 403; dasbor Agent Owner → 403; dasbor penerbit sebelum disetujui → 403; hibah kunci penerbit → 200 dan menutup pengajuan pilihan itu; dasbor penerbit → 200 |
| D — Agent Owner | pilih → 201; daftar kelas → 403; mengajukan → 403; hibah → 409; tanpa agen dasbor → 403 **karena fakta `ownerOf`, bukan karena peran** |
| E — tanpa pilihan | akun baru langsung belajar → 200 dan terbaca learner lewat `records`; lalu memilih Penerbit → 409, mengajukan → 403; kunci penerbit = publisher lewat `issuer` dan ditolak belajar; pemilik agen #2534 = owner lewat `agents` (chain) dan ditolak belajar, memilih → 409; akun tanpa peran yang mengajukan lewat rute lama `POST /me/member-request` → 201 + peran publisher tercatat, lalu ditolak belajar |
| F — akun dev | ditandai langsung di database (tidak ada rute HTTP untuk itu); `/me/roles` dev = true; memilih → 409; daftar kelas → 200; hibah → 200; dasbor penerbit → 200 (dua kursi sekaligus); dua akun dummy builder bertanda dev |
| G — bersih-bersih | `publisher_members`, `member_requests`, `account_roles`, `enrollments` alamat uji: dihapus, sisa 0 (kueri ulang) |

## Hasil (3 Okt)

```
SATU PERAN HIJAU — 50 pemeriksaan, 0 gagal
```

**Dua run merah sebelum hijau, dicatat apa adanya:**
1. 44 / 6 — harness memakai id kursus `web3-dasar`, padahal id katalog `web3-dasar-2026`. Enroll menjawab 400, sehingga
   enam pemeriksaan yang bergantung pada pendaftaran gagal. Kesalahan harness, bukan server.
2. 48 / 2 — dijalankan saat baterai `sync:numbers` sedang menjalankan `verify:publisher` versi baru. Harness itu menjadikan kunci
   pemilik agen tim akun dev **sementara**, sehingga harness ini melihat kunci itu sebagai dev dan pendaftaran kelasnya lolos (satu
   enrollment uji, #263). Baris #263 dihapus. Enrollment yang sama sesaat menjadikan kunci tim "Peserta lewat rekaman", dan itulah
   sebab `verify:owner` merah 14 di baterai pertama 3 Okt; dijalankan sendiri `verify:owner` hijau 32/0. Pelajarannya: **dua harness
   yang menyentuh kunci tim yang sama tidak boleh berjalan bersamaan.**

**Batas klaim:** peran untuk rute peserta dibaca murah dulu (database). Bacaan chain (`ownerOf`) dipakai hanya bila akun belum
berperan menurut database, yaitu pada enroll atau koin uji pertama. Kepemilikan agen sesudah akun memilih peran tidak mengubah
perannya: rekaman dan pilihan mendahului fakta.
