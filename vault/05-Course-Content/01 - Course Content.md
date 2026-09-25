---
tags: [content, hub]
status: active
updated: 2026-09-25
---

# 01 - Course Content

The learning material is **data**, and the grading **policy** is data owned by the issuer. That
separation is the whole answer to "who decides a grade" ([[00-Overview/03 - Decisions]] D37), and it
is enforced by code, not by convention.

Measured by `npm run inventory` (25 Sep): **2 courses · 7 modules · 24 lessons · 34 pages ·
412 minutes · 28 quiz questions · 2 rubric-scored essays**, all six lesson kinds in use
(`bacaan` 9 · `kuis` 5 · `esai` 2 · `praktik` 4 · `kasus` 2 · `referensi` 2). The flagship course id
is `web3-dasar-2026` — the same 15-character string `../script/SeedDemo.s.sol` hashes into
`courseId`, which is what makes the demo credential and the page point at the same object.

| file | owns |
|---|---|
| `web/src/content.ts` | the types: `LessonKind`, the `Block` union, `Course`/`Module`/`Lesson`, `criteria`/`weights`/`passMark`/`validDays`/`prereqCourseId`, `courseIdOf`, `lessonIdOf`, `credentialHashOf`, and the auditors `auditCourse`/`auditCatalog` |
| `web/src/courses/*.ts` | the actual material (Indonesian, because the learner is Indonesian) |
| `web/src/manifest.ts` | `CourseManifest` — the **issuer's** policy object, `canonicalPolicy()`, `rubricHashOf()`, `manifestHashOf()`, the demo publisher |
| `web/src/score.ts` | the composite: `computeScore()` → `LULUS` / `TIDAK_LULUS` / `BELUM_LENGKAP`, knowing no institutional numbers |
| `web/src/progress.ts` | completion in `localStorage`, labelled **not evidence** |

## Parts

- [[K1 - The content model]] — the block types, why lesson kinds are a closed set, the id derivation (`vc:` + holder + courseId [+ lessonId]), and what `auditCatalog` refuses
- [[K2 - The issuer manifest and rubricHash]] — policy vs material, why a typo fix must not move `rubricHash`, and what gets printed into `achievement.criteria`
- [[K4 - Scoring without the platform deciding]] — the three verdicts, why `BELUM_LENGKAP` is not `0`, and the refusal path in `issue.js` that costs gas to skip

## Reproduce

```powershell
cd app/web
npx tsx scripts/inventory.ts       # the counts above, printed from the data
npx tsx scripts/rubric-check.ts    # 17 checks / 0 failed (25 Sep)
npx tsx scripts/probe.ts           # 59 checks / 0 failed — 18 of them audit content and authority
```

**Related:** [[03-Frontend/01 - Frontend]] · [[04-Signer-Service/S5 - Grading and the model judge]] · [[Concepts/rubricHash and manifestHash]]
