---
tags: [testing, "T32"]
status: active
updated: 2026-09-30
command: npm run cleanup · npm run cleanup -- --apply
measured: 2026-09-30
result: CLEANUP HIJAU — 6 pemeriksaan / 0 gagal (sisa origin=test = 0)
---

# T32 - signer cleanup.js (B78a: baris tes dibersihkan dengan bukti, bukan ingatan)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B78(a) · **AC:** —

## Kenapa defaultnya DRY-RUN

Alat ini menghapus cascade. Terukur 30 Sep sebelum hapus: **38 enrollment** `origin=test` membawa
**129 attempts**, **144 attempt_components**, **81 lesson_progress**, **209 progress_events**, 0 submissions,
0 orders. Angka ini keluar dari header `content-range` PostgREST, bukan dari perkiraan. Sebelum
menghapus, alat menyimpan daftar baris terdampak ke JSON di **luar repo** (agar bisa ditelusuri balik),
dan sesudah menghapus ia mencetak **kueri ulang sisa** sebagai vonis.

## Yang tidak disentuh dengannya

· `origin=unknown` hanya ikut bila `--include-unknown` diberikan — baris lama tidak bisa dipastikan
  mundur, jadi memaksa mereka jadi "test" adalah fabrikasi;
· kredensial & kertas terbit ada di `signer/.store` + KV tepi, bukan di tabel ini: pembersihan ini tidak
  menyentuh satu pun artefak yang dibaca juri;
· `course_gates` masih membaca baris tes (B78c) — view itu punya konsumen (embedding PostgREST +
  halaman hasil), jadi tidak kutambal diam-diam.

## Jalankan

· `npm run cleanup` → dry-run, hanya menghitung dan menyimpan jejak
· `npm run cleanup -- --apply` → hapus `origin=test` lalu cetak sisa

Terukur 30 Sep: `CLEANUP HIJAU — 6 pemeriksaan, 0 gagal` · sisa `origin=test` → **0**,
`origin=unknown` → 0. Masuk `npm run sync:numbers` sebagai harness ke-15 (ia berhenti di
dry-run tanpa flag, jadi aman dijalankan berulang).

Terkait: [[09-Testing/T21 - signer db-probe.js]], [[09-Testing/T31 - signer identity-check.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B78.
