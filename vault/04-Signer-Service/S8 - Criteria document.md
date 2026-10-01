---
tags: [signer, criteria, api]
status: active
updated: 2026-09-27
---

# S8 - The criteria document (`GET /criteria/<slug>`)

Closes **B45** in [[07-Backlog/03 - Findings and Tasks 2026-09-26]]. Built 27 Sep.

## The problem it fixes

Every credential we issue prints two URLs into the paper:

```json
"criteria": { "id": "<baseUrl>/criteria/web3-dasar-2026", … },
"result":  [{ "resultDescription": "<baseUrl>/criteria/web3-dasar-2026#scale", … }]
```

Legal identifiers — and nothing behind them. So the document answered *"which rubric hash"* but not
*"which rubric"*, and the question the whole product exists to answer ("87 ini dari aturan yang mana?")
was delegated to a URL that returned 404. A validator or a recruiter following the link found our
not-found page, which is the same failure we list against every competitor in
[[12-LMS-References/L8 - Lencana vs LMS]].

## What it returns now — measured from the served body, 27 Sep

`signer/src/criteria.js` builds it from the issuer's `CourseManifest` (`web/src/manifest.ts`); the route is
in `signer/src/server.js`. Keys, in order: `id`, `type`, `name`, `description`, `narrative`, `issuer`,
`courseId`, `rubricHash`, `rubricRef`, `manifestHash`, `publishedAt`, `schema`, `policy`, `scale`,
`quizzes`, `essays`, `lessonCount`, `moduleCount`.

```
rubricRef  2a45d0d00bc4     ← the same 12 hex printed in the credential's narrative
passMark   70               weights {kuis 40, esai 40, praktik 20}   validDays 730   prereq null
quizzes    kuis-keselamatan 80% · 5 soal │ kuis-gas 80% · 6 │ kuis-token 80% · 5 │ kuis-akhir 75% · 8
essays     esai-batas-bukti · minWords 400 · rubric total 100 over 5 criteria
scale.id   <baseUrl>/criteria/web3-dasar-2026#scale   (so the fragment has a home)
```

## What it deliberately does **not** contain: the answer keys

`canonicalPolicy()` hashes each quiz question's **`answer`** into `rubricHash` — that is why replacing an
answer key without changing the question count moves the hash ([[05-Course-Content/K2 - The issuer manifest and rubricHash]]).
It does **not** follow that the document may publish them. This endpoint is public and is referenced by
every credential, so publishing `answer` would hand out the exam in exchange for a hash we already have.
The response carries per-question `passPct`, `questionCount`, the prompts, the essay rubric and the
guidance — everything a learner already sees, nothing they must not.

*(1 Oct, B80: until that day the same keys this document withholds were shipped in the browser bundle —
28 of 28, measured on the deployed bundle. They now live only on the server, so this document and the
bundle finally agree on what is public. The `rubricHash` it prints is unchanged and is the value the
public manifest carries → [[09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis)]].)*

`serve-probe.js` asserts exactly that: the literal string `"answer"` must appear nowhere in the body
([[09-Testing/T8 - signer serve-probe.js]]). A guard, not a comment: the day someone "helpfully" forwards
the manifest into this document, the run goes red.

## Two properties that were decided, not inherited

- **Deterministic.** No `Date.now()` anywhere in the module — the only time it carries is
  `manifest.publishedAt`. A document that changes each fetch cannot be quoted, hashed or screenshotted
  into a dispute later.
- **Derived, never typed.** Every number comes from the manifest, so a rubric edit propagates here and to
  `rubricHash` in the same commit. The alternative — writing the criteria page by hand — is how
  [[00-Overview/04 - Corrections]] got its 190-minutes entry.

## Known gaps beside it

`/learners/<address>` and `/achievements/<slug>` are still identifiers with nothing behind them. That is
defensible for a subject identifier (the learner is not a document we publish) and it is **not** the same
defect as this one: nothing in a credential promises those URLs resolve to an explanation of the grade.
Recorded as still-open in [[07-Backlog/03 - Findings and Tasks 2026-09-26]].

**Related:** [[04-Signer-Service/S7 - Server routes and lifecycle]] · [[05-Course-Content/K2 - The issuer manifest and rubricHash]] ·
[[09-Testing/T15 - 1EdTech validator]] · [[Notes/Session-2026-09-27-B41-validator]]
