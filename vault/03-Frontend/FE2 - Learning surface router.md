---
tags: [frontend, "FE2"]
---

# FE2 - Learning surface router

**Part of:** [[03-Frontend/01 - Frontend]]
**Source:** `web/src/lms.ts:452`, `web/src/content.ts:26`, `web/src/progress.ts:17`

**Summary:** The learning surface is a hash router plus six templates over typed course data
(`web/src/lms.ts:1-11` explains why it is written by hand). It owns no build tooling, no state
library and no store: `renderLmsRoute()` maps the hash to a string of HTML and writes it into one
mount node. Pages come from data, which is why 34 pages cost six templates — the count is printed by
`npm run inventory` (measured 2026-09-25: 2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes
· 28 quiz questions · 2 rubric-scored essays), not counted by hand. It draws completion, never a
verdict: what it knows is `localStorage`, and it labels that as not evidence.

**Key points:**
- Owned routes (`web/src/lms.ts:441`): `#/learn`, `#/me`, and anything under `#/course/` — the last
  resolves to syllabus (`:156`), `m/<module id>` (`:206`) or `l/<lesson slug>` (`:286`). Unknown
  hashes render a `notFound` page listing the known shapes (`web/src/lms.ts:506`) instead of
  silently bouncing to the catalog (`:54`).
- `renderLmsRoute()` (`web/src/lms.ts:452`) claims a route or cleans up: when the hash is not its
  own it empties the mount, deletes `document.body.dataset.lmsRoute` and returns `false`
  (`web/src/lms.ts:457-460`). That return value is what lets two layers share one page.
- Six lesson kinds with their own render shape and their own way of being assessed
  (`web/src/content.ts:26`), labelled in Indonesian in the surface
  (`bacaan · kuis · esai dinilai agen · praktik · studi kasus · referensi`, `web/src/lms.ts:31`).
- Ten block types, one `switch` (`web/src/content.ts:34`, `web/src/lms.ts:63`); every interpolation
  goes through `esc()` from the shared renderer (`web/src/lms.ts:18`).
- Interaction is one delegated click listener bound once to the mount
  (`web/src/lms.ts:445`, `:463`, `:527`) over six `data-action` values: `mark-done`, `grade`,
  `save-draft`, `finish-essay`, `wipe`, `read-me`. Each ends in a full redraw
  (`web/src/lms.ts:523`), not a partial update.
- Quizzes are graded in the browser: unanswered questions block the grade and blanks count as wrong
  (`web/src/lms.ts:556`), the best score is kept (`web/src/lms.ts:563`), and re-rendering reveals
  each answer's `why` (`web/src/lms.ts:241`).
- Progress is `localStorage` key `lencana-progress-v1` (`web/src/progress.ts:17`); `summarize()`
  reports `readyForCredential` as "every scored component has evidence" (`web/src/progress.ts:132`),
  and the wording was changed because "100/100" read as "grade is good enough"
  (`web/src/lms.ts:140-154`).
- The one chain read in this layer is `#/me`: `credentialsOf(address)` then `statusOf()` per hash,
  over the verifier's own endpoint config (`web/src/lms.ts:375-418`, `:16`, `:17`), displaying the
  first 24 (`web/src/lms.ts:397`). A failed read prints red text, not an empty list.

**Detail:**
- Routing uses `#/…` so it cannot collide with `?q=`, which belongs to the verifier
  (`web/src/lms.ts:10-11`); the "open in verifier" link carries both halves because
  `#/verify` alone does not fill the input (`web/src/lms.ts:28`).
- The catalog is `#/learn`, deliberately not `#/courses` — the latter is the other owner's
  marketplace page, and one route with two owners is how one layer silently overwrites the other
  (`web/src/lms.ts:40-45`).
- `lms.css` is its own file (`web/src/lms.ts:14`) with every selector scoped under `#lms-mount`, plus
  one rule outside it: `body[data-lms-route] #page-courses > .section-container:not(#lms-mount)`
  hides the marketplace while a learning route is active (`web/src/lms.css:15`).
- There is no submit path. `#/me` explains why in the page itself: handing work to the chain is the
  issuer's action, not a button on a reading page (`web/src/lms.ts:355`), and the essay panel states
  that nothing leaves the device yet (`web/src/lms.ts:280-283`).
- Trap: a lesson page's `courseId`/`lessonId` block (`web/src/lms.ts:296-303`) is *material*, not a
  bookmark. The thing that verifies is a `credentialHash` derived from the holder's address too —
  see [[K1 - The content model]].

**Related:** [[FE1 - Verifier page and verify.ts]] · [[FE4 - Mount contract with the maintainer]] ·
[[FE6 - Quirks and open defects]] · [[K1 - The content model]] · [[05-Course-Content/01 - Course Content]]
