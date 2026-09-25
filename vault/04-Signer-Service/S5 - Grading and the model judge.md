---
tags: [signer, "S5"]
---

# S5 - Grading and the model judge

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/grade.js:40`, `signer/src/judge.js:63`, `signer/scripts/judge-check.js`

**Summary:** Two files with two different jobs. `grade.js` is mechanical and reserves the right to
refuse; `judge.js` is the one seam where a model enters, and it is fail-closed. They report two numbers
that must never be merged — `scoreMechanical` (what a written rule can check) and `finalScore` (`null`
until a judge, model or human, is injected). A refusal here stops issuance, so "an agent graded this"
is a claim with a command behind it rather than a sentence.

**Key points:**
- `MECHANICAL_SIGNS` is exactly five checks derivable from the text alone (`grade.js:25-31`): length vs
  the lesson's `minWords`, an `0x…` address, an openable URL, a concrete function or command, and the
  writer stating their own limits. `scoreMechanical = passed / 5 × 100` (`grade.js:53`).
- The gate is versioned — `GRADER_NAME = 'rubric-mechanical-v1'` (`grade.js:33`) — so a printed score can
  be attributed to a checker version instead of to luck.
- Every rubric criterion starts as `method: 'requires-judgement', score: null` (`grade.js:67`). Some
  criteria are judgement ("tell a finding apart from a guess"); no regex may claim otherwise, and a
  check dressed up as a judgement is the fastest way to build a product that deceives its own verifier.
- Verdicts: `NOT_AN_ESSAY_LESSON` (`grade.js:41`), `INSUFFICIENT_EVIDENCE` — under half of `minWords`, or
  zero mechanical signs (`grade.js:58-66`), `AWAITING_JUDGE` (`grade.js:69-78`), `PARTIAL_JUDGEMENT`
  (`grade.js:90-97`), `GRADED` (`grade.js:99`). Each refusal keeps `finalScore: null`.
- `judge.js` calls `openai/gpt-oss-120b` (`judge.js:45`) at `temperature: 0` (`judge.js:71`) with
  `response_format: {type: "json_object"}` (`judge.js:73`), sending the rubric labels with their maxima,
  the task, the lesson's `guidance` (what is explicitly not accepted) and the answer (`judge.js:76-83`).
- Fail-closed, in both directions: no `GROQ_API_KEY` throws rather than degrading (`judge.js:65`), and a
  criterion the model skipped throws `kriteria "…" tidak dinilai model` (`judge.js:133`) — it is **not**
  filled with 0 and **not** averaged. Scored values are clamped to `0..max` (`judge.js:134`).
- `429` is honoured, not treated as failure: `retry-after` is read (`judge.js:112-113`), a missing header
  pauses 15 s, and the loop gives up past 180 s cumulative (`judge.js:99`) — reporting "the judge is
  broken" when it meant "wait" would be its own lie. Measured account quota for this model is
  8,000 tokens/min at ~1,400 tokens per call, i.e. ~5 calls/min (`judge.js:89-91`).
- `npm run judge` (`scripts/judge-check.js`) proves the judge can **flunk**: the fluent-but-empty fixture
  must land below `course.passMark` (`judge-check.js:58`), the substantive one must beat it
  (`:60`), per-criterion scores must not all be identical (`:62`), the mechanical refusal must fire before
  any model call (`:54`), and the rival model `qwen/qwen3.8-27b` is held to the same test (`:69-80`). Any
  failure exits non-zero.
- `npm run judge-variance` runs the same essay N times (`JUDGE_RUNS`, default 5) and prints min, max,
  spread, mean for both classes plus whether the pass/fail decision moved. Measured 24 Sep: substantive
  **91-100, spread 9, mean 96.4**, hollow **2-3**, decision identical in all five runs (`judge.js:34-37`).
  The sentence we allow: the decision is stable, the score has a range. The sentence we forbid: "the
  score reproduces exactly".

**Detail:**
- Model choice is recorded with its measurement, in the file header (`judge.js:14-18`): gpt-oss-120b
  scored 99 substantive / 6 hollow; gpt-oss-20b ~95 / 4; qwen3.8-27b 100 / 8. The reason qwen is not the
  default is stated small and correctly — a saturated ceiling and no `structured_outputs` — not leniency.
- The retracted claim stays in the code as a correction: an initial report said one model gave "25/25 on
  two essays of different quality", which was never measured, because the first probe sent one essay to
  every model (`judge.js:20-25`, [[00-Overview/04 - Corrections]]). See [[Concepts/Negative Control]].
- Callers refuse to publish on a refusal. `scripts/issue.js:129-134` exits 3 while `finalScore` is
  `null`; `scripts/delegate.js:124-137` exits 3 on `INSUFFICIENT_EVIDENCE`, `AWAITING_JUDGE` and anything
  that is not `GRADED`. The escape hatch `--allow-unjudged` prints that the number is mechanical and must
  not be written up as "AI menilai" (`delegate.js:124-126`).
- Two gate measurements, both refusals, on the fixtures: `essai-pendek.md` → `INSUFFICIENT_EVIDENCE`
  mekanis=20 (33/400 words, 1/5 signs); `essai-230-kata.md` → `AWAITING_JUDGE` mekanis=80 (4/5 signs) —
  the second answer is substantively good and still produces no grade, because the criteria that require
  judgement have nobody judging them yet (`signer/README.md`).
- **Limits, said plainly.** The essays the demo grades are fixtures in `signer/fixtures/`, not learner
  work. One judge model, one rubric, no second-opinion agreement and no inter-rater measurement; the
  spread above is one essay, one day, `temperature: 0`. `npm run check` (53 checks / 0 failed) does not
  call the model at all — the model paths are `npm run judge` and `npm run judge-variance`, both `tsx`
  because they import `web/src/courses/index.ts`. Rubric and pass mark belong to the issuer's manifest:
  see [[05-Course-Content/01 - Course Content]].

**Related:** [[S1 - The credential document]] · [[S4 - Delegated issuance]] ·
[[05-Course-Content/01 - Course Content]] · [[00-Overview/04 - Corrections]] ·
[[09-Testing/00 - Hub Testing]] · [[Concepts/Negative Control]]
