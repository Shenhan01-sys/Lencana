---
tags: [content, "K4"]
---

# K4 - Scoring without the platform deciding

**Part of:** [[05-Course-Content/01 - Course Content]]
**Source:** `web/src/score.ts:71`, `web/src/score.ts:39`, `signer/scripts/issue.js:63`

**Summary:** `computeScore()` turns evidence into a composite **against a manifest**. It contains
arithmetic and no institution: every weight, the pass mark and the number of quizzes that must be
present are read from the issuer's policy object ([[K2 - The issuer manifest and rubricHash]]). Its
most important output is a third verdict that is not a number. `BELUM_LENGKAP` exists so that a
missing submission can never be reported as a failed one — the difference matters because the number
leaves the pipeline signed by an agent's key.

**Key points:**
- Three verdicts (`web/src/score.ts:39-41`): `LULUS`, `TIDAK_LULUS`, `BELUM_LENGKAP`. `total` is
  `null` for as long as the verdict is `BELUM_LENGKAP` (`:117`, `:124`), so there is no half-number to
  quote.
- Why `BELUM_LENGKAP` is not `0` (`web/src/score.ts:8-13`): `0` is a statement about the learner,
  "nothing to score" is a statement about the tool. A learner may fail; a learner may not fail because
  our pipeline ran out of data — and the wrong statement would go out under a signature.
- Evidence is what comes in (`web/src/score.ts:19-25`): one number per quiz taken, a praktik boolean,
  and `essayScore: null` when nobody has graded. The number of quizzes *required* is derived from the
  course: `quizCount(m)` (`:51-53`, used at `:77`), so partial work yields
  `kuis: 2/4 dikerjakan — kriteria penerbit menuntut semuanya` (`:81`) instead of a partial score.
- Out-of-range input is recorded as missing, not silently clamped into a verdict (`:83`, `:91`);
  `clamp()` only bounds components that are already admissible (`:97`).
- **Weights must sum to 100 or nothing is scored.** Checked before the total, and the message names
  the manifest rather than the learner — `manifest rusak, tidak ada nilai yang boleh diterbitkan`
  (`:112-121`). Asserted by `web/scripts/rubric-check.ts:64-69`, which sets `esai` to 30 and requires
  the refusal.
- The threshold is tested on both sides of the rounding: 0.4·62 + 0.4·62 + 0.2·100 = 69.6 → **70 →
  LULUS** at `passMark` 70, and 68.8 → **69 → TIDAK_LULUS** (`web/scripts/rubric-check.ts:45-53`; the
  rounding is `Math.round` at `web/src/score.ts:127-129`).
- No institutional numbers in this module: weights, `passMark` and the quiz requirement are read from
  the manifest (`web/src/score.ts:72-74`, `:112`, `:129`). The literals in the file are scale bounds
  (0, 100) and the `/100` divisor — not a grade policy.
- `signer/scripts/issue.js` no longer accepts a score. `--score` was removed; the header states that
  what enters the script is **evidence**, and the number is computed against the issuer's manifest
  (`signer/scripts/issue.js:8`, `:63-64`). Flags are `--quiz 80,80,90,90`, `--essay-score`,
  `--no-praktik` (`:68-72`).
- Refusal paths that cost nothing to hit: an unknown course id stops before any gas moves
  (`signer/scripts/issue.js:87-94`); `--essay-score` survives only to exercise the arithmetic, and if
  a judged essay produces a different number the script stops rather than picking one (`:135-137`); a
  judge that returns no score is an error, not a default (`:130-133`).
- What the document then carries: `score = String(grade.total)` (`signer/scripts/issue.js:246`) — and
  **nothing else about the method**. `issue.js` also builds `method` and `comment` naming the rubric
  version and the judge model (`:249-256`), but `credential.js` does not emit them: OB 3.0's `Result` is
  `{achievedLevel, resultDescription, status, value}`, and an out-of-context term is silently dropped
  during canonicalisation (`credential.js:96-108`). Verified against the stored documents on 26 Sep —
  `result[0]` has four keys. So the credential says **which rubric**, not **which judge** → **B44**
  ([[07-Backlog/03 - Findings and Tasks 2026-09-26]], [[00-Overview/04 - Corrections]]).

**Detail:**
- Measured on public chain 97 (2026-09-25): the first credential whose number did not come from a
  human typing a flag came out **94** against the issuer's `passMark` **70**
  (`vault/08-Results/01 - Evidence and Limits.md:12`; `web/src/courses/web3-dasar.ts:43`).
- `formatScore()` prints one line that hides nothing — `LULUS 88/70 (kuis=80×40% esai=90×40%
  praktik=100×20%) · rubrik <12hex>`, with a `belum:` clause listing what is missing
  (`web/src/score.ts:136-142`). It is what both the CLI and the pages show.
- `quizCount`/`essayCount` accept either the kind or the payload (`web/src/score.ts:51-57`) because
  `auditCourse` already forces the two to agree (`web/src/content.ts:228-231`).
- The boundary holds on the display side too: the learning surface reports "evidence for
  X/100 scored components", never a readiness to pass, and says the final number is computed against
  the issuer's rubric, not by the page (`web/src/lms.ts:140-154`).
- What this module does **not** decide: whether the essay deserves its number. That is the judge's
  output, and it is judged by a negative control — see
  [[04-Signer-Service/S5 - Grading and the model judge]].

**Related:** [[K1 - The content model]] · [[K2 - The issuer manifest and rubricHash]] ·
[[FE2 - Learning surface router]] · [[04-Signer-Service/S5 - Grading and the model judge]]
