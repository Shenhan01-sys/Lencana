---
tags: [testing, "T74"]
status: active
updated: 2026-10-05
command: npm run verify:review
measured: 2026-10-05
result: MEJA PENGESAHAN HIJAU — 31 pemeriksaan / 0 gagal (5 Okt, B144; run pertama 31 / 0 hijau)
---

# T74 - signer review-check.js — B144: meja pengesahan agen pengesah

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B144 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B144 - Meja pengesahan agen pengesah]] ·
**Uji peramban:** [[09-Testing/T75 - Uji peramban meja pengesahan (B144)]] · **Summary:** [[08-Results/B144 - Executive Summary]] ·
**Keputusan:** D73

`signer/scripts/review-check.js`, dijalankan `npm run verify:review` (di `signer/`), ikut baterai murah `npm run sync:numbers`.
Prasyarat: `RPC_URL`, `ISSUER_PRIVATE_KEY`, `AGENT_GRADER_PRIVATE_KEY`, `AGENT_REVIEWER_PRIVATE_KEY`, `SUPABASE_URL` + secret key.
Server sendiri di port bebas (`LANCENA_ORIGIN=test`, `ENROLL_PAYWALL=off`), Postgres nyata, registry ERC-8004 dibaca, tanpa gas.
Identitas sama dengan `verify:agents`: penerbit menyewa agen penilai #2534 dan menunjuk agen pengesah #2542 di `web3-dasar-2026`.
Keduanya upsert idempoten, jadi keadaan tim tidak berubah. Satu peserta sekali-pakai menyerahkan esai yang diusulkan #2534.

| bagian | yang dibuktikan |
|---|---|
| persiapan | sewa #2534 + tunjuk #2542 (idempoten) → 200; esai peserta uji → 201; #2534 mengusulkan 80 (cukup-berat) → 200, menunggu pengesahan |
| A — hak baca meja | bentuk pesan salah → 400 sebelum nonce dipakai; dompet lain (#2534) membaca meja #2542 → 403 (dibaca agentWallet-nya); agen tak dikenal → 404; meja #2534 sendiri tidak memuat esai yang ia usulkan |
| B — isi meja | meja #2542 memuat esai peserta uji; teks = yang diserahkan; rubrik + nilai lulus dari manifest dan lesson + kursus esai itu sendiri; usulan per kriteria dalam poin = yang diusulkan, total 80; model, agen pengusul, label ikut; **alamat peserta tidak ada di mana pun dalam jawaban**; kursus tempat ditunjuk tidak basi; tanpa `includeTest` esai peserta uji (`origin=test`) tersembunyi; batas per kursus dipatuhi |
| C — rubrik milik esainya | pengesahan memakai rubrik `uji-bayar-2026` untuk esai `web3-dasar-2026` → 422, tidak ada baris pengesahan; lesson lain di kursus yang sama → ditolak sebelum tanda tangan dibaca, untuk pengesahan **dan** penilaian agen |
| D — pengesahan dari meja | #2542 menyetujui 80 (label sedang) → 200, tagihan `review`; sesudah disahkan butirnya keluar dari meja |
| E — bersih-bersih | `agent_charges`, `judgement_reviews`, `attempt_components`, `submissions`, `attempts`, `lesson_progress`, `progress_events`, `orders`, `enrollments` peserta uji: dihapus, sisa 0 (kueri ulang) |

## Hasil (5 Okt)

```
MEJA PENGESAHAN HIJAU — 31 pemeriksaan, 0 gagal
```

**Uji negatif (aturan vault #14):** pemeriksaan kursus + lesson di `reviewEssay` dimatikan sementara, lalu harness dijalankan →
**MEJA PENGESAHAN MERAH — 31 pemeriksaan, 3 gagal**:
- pengesahan memakai rubrik `uji-bayar-2026` untuk esai `web3-dasar-2026` **diterima** (baris pengesahan tertulis);
- lesson lain tidak ditolak;
- pengesahan sah sesudahnya 409, karena esainya sudah "disahkan" oleh pengesahan palsu itu.

Pemeriksaan dipulihkan (sisa kode uji: 0), lalu harness dijalankan lagi: **31 / 0**. Celahnya nyata sebelum B144, dan harness
ini yang menjaganya. Regresi pada hari yang sama: `verify:agents` 35/0, `verify:db` 70/0, `verify:brain` 60/0,
`verify:attempts` 39/0.

**Batas klaim:**
- Harness memanggil rute HTTP yang sama dengan halaman, bukan halamannya (halaman: T75).
- Identitas pengesah = kunci tim dari `.env`. Di peramban, meja hanya bisa dipakai bila dompet agen = akun pemiliknya — syarat
  yang sama dengan antrean penilai B135.
- Esai uji lama yang belum disahkan: 18 butir `origin=test` di `web3-dasar-2026` (5 Okt), semuanya sisa `verify:brain`.
  Tersembunyi di meja sungguhan; harness memintanya lewat `includeTest`, batas 100.
