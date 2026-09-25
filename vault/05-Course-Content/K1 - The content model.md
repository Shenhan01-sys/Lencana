---
tags: [content, "K1"]
---

# K1 - The content model

**Part of:** [[05-Course-Content/01 - Course Content]]
**Source:** `web/src/content.ts:26`, `web/src/content.ts:187`, `web/src/content.ts:280`

**Summary:** One file declares the shape of every learning page (`web/src/content.ts`) and another
holds the pages themselves (`web/src/courses/*.ts`, Indonesian because the learner is Indonesian). The
types are strict and the module is DOM-free, which is what lets `npx tsx scripts/probe.ts` audit the
material from Node rather than trust what the browser shows. The auditors refuse specific things; a
broken answer key, a duplicate slug or a rubric that does not sum to 100 turns the harness red
instead of turning up as a wrong grade later. Nothing here decides a verdict — see [[K4 - Scoring
without the platform deciding]].

**Key points:**
- `LessonKind` is a **closed set of six**: `bacaan · kuis · esai · praktik · kasus · referensi`
  (`web/src/content.ts:26`, mirrored by `LESSON_KINDS` at `:28`). It is closed because each kind owns
  a render shape and an assessment path, not because six is a nice number: `kuis` must carry `quiz` and
  `esai` must carry `essay`, and no other kind may carry either
  (`web/src/content.ts:228-231`), while `lms.ts` picks one template per kind
  (`web/src/lms.ts:31`, `web/src/lms.ts:228`, `:256`). `probe` additionally requires all six to be
  **used** in the catalog, so the set is not decorative (`web/scripts/probe.ts:188-189`).
- `Block` is a union of ten variants (`web/src/content.ts:34-46`): `p`, `h`, `ul`, `ol`, `code`,
  `note`, `quote`, `terms`, `links`, `try`. Deliberately few, so one renderer keeps the page shape and
  `auditCourse` has something to check.
- Ids are derived, never typed: `courseIdOf = keccak256(toBytes(course.id))` (`:112`),
  `lessonIdOf = keccak256(toBytes(course.id + "/" + lesson.slug))` (`:116`), and
  `credentialHashOf(holder, courseId, lessonId?)` (`:131`) in **two shapes** — course level packs
  `["vc:", address, bytes32]`, lesson level packs `["vc:", address, bytes32, bytes32]`. The extra
  component is the whole difference; passing `EMPTY_UID` as `lessonId` does **not** reproduce the
  course hash (`:121-130`). These mirror the Solidity sources: `script/SeedDemo.s.sol:273-274` and
  `test/CredentialResolver.fork.t.sol:790-791`.
- `auditCourse` (`:187`) refuses: empty `id`/`criteria`/title/summary, `passMark` outside 1..100,
  non-positive `validDays`, a course that is its own prerequisite, weights not summing to 100, modules
  or lesson ids that are not `[a-z0-9-]`, duplicate module ids or lesson slugs (a slug collision
  collides `lessonId`), an empty module, a lesson without blocks, non-absolute `links` URLs (`:238`),
  an answer key outside `0..options.length-1` (`:253`), a quiz option that is blank or a question
  without `why`, an essay rubric not summing to 100 (`:263`), `minWords < 30` (`:265`), and an essay
  without guidance (`:266`).
- `auditCatalog` (`:280`) adds the cross-course checks `auditCourse` cannot see: duplicate course ids
  in the registry (`:284`) and a `prereqCourseId` pointing at a ghost (`:287`) — the same relation the
  chain enforces through `refUID`. `probe` calls them through `auditAll()` (`web/scripts/probe.ts:178`
  → `web/src/courses/index.ts:54-55`).

**Detail:**
- The course `id` is chain material, not a label: `SeedDemo.s.sol` hashes `keccak256("web3-dasar-2026")`
  into `courseId` (`script/SeedDemo.s.sol:58`), and `probe` re-derives it from the data rather than
  comparing it to a copied constant (`web/scripts/probe.ts:202-210`). Renaming the id does not rename
  the credential — it orphans it.
- `pages` is computed from structure: `1 + modules + lessons` per course (`web/src/content.ts:170`)
  plus one catalog (`web/src/courses/index.ts:40`). That derivation is the only reason a page count
  may appear anywhere in this repo; measured by `npm run inventory` on 2026-09-25: **34**.
- Trap: `credentialHashOf` must wrap `encodePacked` in `keccak256`. The first version returned 54
  bytes that looked like a hash, and only the probe's length check caught it
  (`web/src/content.ts:133-136`, recorded in [[00-Overview/04 - Corrections]]).
- `quiz.answer` is an **index**, validated against the option count; `why` is mandatory because a
  quiz without reasons trains guessing (`web/src/content.ts:52-56`).

**Related:** [[K2 - The issuer manifest and rubricHash]] · [[K4 - Scoring without the platform deciding]] ·
[[FE2 - Learning surface router]] · [[05-Course-Content/01 - Course Content]]
