---
tags: [acceptance-criteria, B161]
status: active
updated: 2026-10-05
---

# AC-B161 - Antrean pengesahan dan batas 1000 baris

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B161 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T74 - signer review-check.js (B144 meja pengesahan)]] ·
**Summary:** [[08-Results/B161 - Executive Summary]] · **Asal:** B144 (meja pengesahan agen pengesah)

Ditemukan baterai penuh 5 Okt sesudah B157/B160: `verify:review` merah 31 / 1 (komponen nilai butir uji hilang diam-diam dari antrean). Bukan permintaan
builder; kerja kecil yang menjadi syarat baterai hijau.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B161#1 | komponen nilai ikut untuk setiap butir yang dikembalikan antrean, walau antrean (`includeTest`) memuat ratusan baris `judged` | **PASS** 5 Okt | `verify:review` **31 / 0** pada keadaan database yang sama persis yang merahkannya (31 / 1): 133 sisa uji `web3-dasar` + 1 `uji-bayar` masih ada; `web3-dasar-2026` `includeTest` `limit` 500 dan 100: 25 butir, **0** tanpa komponen |
| AC-B161#2 | antrean nyata #2547 (tanpa `includeTest`) memuat esai #964 dengan poin per kriteria | **PASS** 5 Okt | `#964@uji-bayar-2026`, usulan 98, poin 40/40, 40/40, 18/20, lima tanda mekanis benar |
| AC-B161#3 | baris uji disaring di SQL saat `includeTest` mati, tanpa mengubah hasil | **PASS** 5 Okt | `verify:review` "tanpa includeTest esai peserta uji (origin=test) tersembunyi" hijau; saringan JS lama tetap |
| AC-B161#4 | komponen dibaca per potongan kecil (25 butir) dan hanya untuk butir yang dikembalikan | **PASS** 5 Okt — dibaca dari kode | `signer/src/db.js` `COMPONENT_CHUNK`, `queuePendingReviews` |
| AC-B161#5 | tidak ada baris yang dihapus; `cleanup -- --apply` tidak dijalankan | **PASS** 5 Okt | sisa uji `origin=test` tetap ada (133 + 1 `judged`); pembersihan = keputusan builder |
| AC-B161#6 | regresi dijaga oleh tes yang gagal bila bug kembali | **PARTIAL** | pemeriksaan "usulan per kriteria dalam poin" di `verify:review` menangkapnya (sudah terbukti merah), tetapi hanya bila sisa uji cukup banyak; tidak ada tes deterministik tanpa database |
| AC-B161#7 | gerbang | lihat Summary (baterai penuh, `audit`, `check:labels`) | — |

**Batas klaim:** perbaikan menghilangkan pembacaan massal yang rawan terpotong; ia **tidak** membersihkan sisa uji, dan tidak mengaudit semua pembacaan
PostgREST lain di signer (hanya pola `attempt_components` `in.(…)` yang dicari — satu tempat).
