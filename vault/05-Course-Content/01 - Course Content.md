---
tags: [content, hub]
status: active
updated: 2026-10-03
---

# 01 - Course Content

The learning material is **data**, and the grading **policy** is data owned by the issuer. That
separation is the whole answer to "who decides a grade" ([[00-Overview/03 - Decisions]] D37), and it
is enforced by code, not by convention.

~~Measured by `npm run inventory` (25 Sep): **2 courses · 7 modules · 24 lessons · 34 pages ·
412 minutes · 28 quiz questions · 2 rubric-scored essays**, all six lesson kinds in use
(`bacaan` 9 · `kuis` 5 · `esai` 2 · `praktik` 4 · `kasus` 2 · `referensi` 2).~~ *(Koreksi 3 Okt: angka 25 Sep itu basi
sejak B127 (2 Okt) menambah lima kelas singkat, tiga di antaranya non-teknis dengan bobot praktik 0, dan B126 menambah kelas
uji `unlisted` di luar katalog publik. Hitungan katalog terkini hanya dari [[09-Testing/T13 - npm run inventory]] dan baris
materinya di [[10-Contributors/Claims-Cheat-Sheet]] — halaman ini tidak menyalinnya lagi.)* The flagship course id
is `web3-dasar-2026` — the same 15-character string `../script/SeedDemo.s.sol` hashes into
`courseId`, which is what makes the demo credential and the page point at the same object.

| file | owns |
|---|---|
| `web/src/content.ts` | the types: `LessonKind`, the `Block` union, `Course`/`Module`/`Lesson`, `criteria`/`weights`/`passMark`/`validDays`/`prereqCourseId`, `courseIdOf`, `lessonIdOf`, `credentialHashOf`, and the auditors `auditCourse`/`auditCatalog` |
| `web/src/courses/*.ts` | the actual material (Indonesian, because the learner is Indonesian) |
| `web/src/manifest.ts` | `CourseManifest` — the **issuer's** policy object, `canonicalPolicy()`, `rubricHashOf()`, `manifestHashOf()`, the demo publisher |
| `web/src/score.ts` | the composite: `computeScore()` → `LULUS` / `TIDAK_LULUS` / `BELUM_LENGKAP`, knowing no institutional numbers |
| `web/src/progress.ts` | completion in `localStorage`, labelled **not evidence** *(Koreksi 3 Okt: ini bukan lagi tempat progres peserta. Sejak 28 Sep (B72) enrollment, progres per lesson, dan usaha yang dinilai hidup di Postgres lewat signer — halaman memanggilnya dari `web/src/learning.ts` — dan ruang kelas (`web/src/pages/class.ts`) memakai `progress.ts` hanya sebagai salinan lokal: draf esai dan tanda selesai di perangkat. Tetap bukan bukti.)* |
| `web/src/courses/*.keys.ts`, `web/src/manifest-keys.ts` *(baris ditambahkan 3 Okt)* | kunci jawaban kuis (`answer` + `why`) — hanya diimpor server dan skrip Node, tidak ada di bundel browser sejak B80 (D56) |
| `web/src/pricing.ts` *(baris ditambahkan 3 Okt)* | harga kursus (B125, D60): satu sumber untuk halaman dan server, sengaja **di luar** manifest supaya harga tidak menggeser `manifestHash` |

## Parts

- [[K1 - The content model]] — the block types, why lesson kinds are a closed set, the id derivation (`vc:` + holder + courseId [+ lessonId]), and what `auditCatalog` refuses
- [[K2 - The issuer manifest and rubricHash]] — policy vs material, why a typo fix must not move `rubricHash`, and what gets printed into `achievement.criteria`
- [[K4 - Scoring without the platform deciding]] — the three verdicts, why `BELUM_LENGKAP` is not `0`, and the refusal path in `issue.js` that costs gas to skip

## Reproduce

```powershell
cd app/web
npx tsx scripts/inventory.ts       # the counts above, printed from the data
npx tsx scripts/rubric-check.ts    # 17 checks / 0 failed (25 Sep)
npx tsx scripts/probe.ts           # ~~59 checks / 0 failed~~ — 18 of them audit content and authority (lihat koreksi di bawah)
```

*(Koreksi 3 Okt: "59 checks" adalah angka 25 Sep; probe tumbuh bersama katalog dan manifest penerbit (B105, B126, B127).
Angka terkini dan riwayatnya hanya di [[09-Testing/T4 - npm run probe]] dan `09-Testing/numbers.json`. Bagian "18 of them"
juga belum diukur ulang sejak 25 Sep — `_unmeasured_`.)*

**Related:** [[03-Frontend/01 - Frontend]] · [[04-Signer-Service/S5 - Grading and the model judge]] · [[Concepts/rubricHash and manifestHash]]
