---
tags: [content, "K2"]
---

# K2 - The issuer manifest and rubricHash

**Part of:** [[05-Course-Content/01 - Course Content]]
**Source:** `web/src/manifest.ts:40`, `web/src/manifest.ts:53`, `web/src/manifest.ts:102`

**Summary:** `CourseManifest` is the issuer's object, not the platform's: it names who published,
when, and against which grading policy — and it wraps the course material without being merged into
it. Two hashes come out of it and they answer different questions. `rubricHash` commits to the
*policy*, so a credential can say which rubric produced its number; `manifestHash` commits to the
*whole manifest including lesson text*, so a reader can ask whether the material they read is the
material that graded them. The split is asserted by `npx tsx scripts/rubric-check.ts` (**17 checks /
0 failed**, 2026-09-25) rather than argued in prose.

**Key points:**
- Shape (`web/src/manifest.ts:40-47`): `schema` (the literal `lencana.course-manifest/v1`, `:28`),
  `issuer`, `publishedAt`, `course`. `Issuer` is `slug`, `name`, `controllerUrl` and an optional `eoa`
  — the optional field is the address recorded as `attester`, i.e. what ties a manifest to the
  on-chain issuer whitelist (`:30-38`). Both demo manifests leave `eoa` unset (`:144-148`, `:155-168`).
- Why it exists at all: before it, `weights`, `passMark` and the rubric lived in `web/src/courses/*.ts`
  — the platform's repo — while every document we print says the *issuer* declares the pass
  (`web/src/manifest.ts:4-9`). Moving the numbers was not enough; the type had to change so a missing
  policy is a compile error.
- `canonicalPolicy()` (`:53-100`) serialises field by field, never `JSON.stringify` on the raw object:
  key order in JS follows the source text, so a reformat would otherwise change the hash and make an
  older credential's commitment look broken (`:49-52`). Quizzes sort by lesson slug, questions sort by
  id and each contributes `{id, answer, options.length, prompt}` — a question is committed by its
  content, not by the count (`:61-63`); essays sort by slug with the rubric sorted by label.
- `rubricHashOf` = `keccak256(toBytes(canonicalPolicy(m)))` (`:102-104`): **policy only** — schema,
  courseId, criteria, weights, passMark, validDays, prereq, quiz keys, essay rubrics.
- `manifestHashOf` (`:112-124`) = the policy string **plus** issuer, `publishedAt` and every lesson's
  blocks. Separated deliberately: fixing a typo in the material must not invalidate an issued
  diploma, and swapping an answer key must not look like nothing happened (`:106-111`).
- What reaches a credential: `criteria: "<course.criteria> [rubrik <rubricRef>]"`
  (`signer/scripts/issue.js:241`), where `rubricRef` is `shortHash(rubricHash)` = the first 12 hex
  characters (`web/src/manifest.ts:126-128`, surfaced as `Score.rubricRef` in `web/src/score.ts:131`).
  The achievement's `name` and `description` also come from the manifest, not from the caller
  (`signer/scripts/issue.js:239-240`).

**Detail:**
- The measured consequence of the split, each one an assertion in the harness
  (`web/scripts/rubric-check.ts`): appending ` (typo)` to a lesson paragraph leaves `rubricHash`
  **unchanged** (`:90-92`) while `manifestHash` **moves** (`:93-94`); moving 5 points between two
  rubric items with the same total changes it (`:80-89`); changing one answer key changes it
  (`:103-110`); reordering the written keys does not (`:97-98`).
- The demo publisher is labelled fictitious where it appears: `Yayasan Literasi Digital Nusantara
  (institusi demo, fiktif)` (`web/src/manifest.ts:144-146`), the same string as each course's
  `institution` (`web/src/courses/web3-dasar.ts:20`, `web/src/courses/web3-lanjut.ts:20`). The reason
  is in the file: issuing a diploma under a real institution's name for a demo costs integrity points,
  and no specification prevents it — the only brake is us (`web/src/manifest.ts:140-143`). Its
  `controllerUrl` is still `http://127.0.0.1:8787/…` (`:147`), which is a stated limit elsewhere, not
  a claim of public reachability.
- Stated in code, not in a footnote: this is a commitment over **our** canonical serialisation —
  sorted keys, some fields dropped, some added — not a standard canonical form like JCS or RDFDS.
  Two parties wanting to cross-check each other have to use this function
  (`web/src/manifest.ts:22-26`).
- `publishedAt` must keep its timezone offset; seconds at zero are fine, a missing zone is not
  (`web/src/manifest.ts:43`).
- The catalog is gated on this: `probe` requires every course to have a manifest and its
  `rubricHash` to be 32 bytes (`web/scripts/probe.ts:227-233`). A course without one cannot explain
  the number in its own credential.
- The manifest is not signed and not stored on chain. The page imports the same array it reads
  (`web/src/lms.ts:21`); the anchored objects on chain are the credential hash and the status lists.

**Related:** [[K1 - The content model]] · [[K4 - Scoring without the platform deciding]] ·
[[04-Signer-Service/S5 - Grading and the model judge]] · [[Concepts/rubricHash and manifestHash]] ·
[[05-Course-Content/01 - Course Content]]
