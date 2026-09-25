---
tags: [concept]
---

# Negative Control

**Definition:** a negative control is an input the grader **must fail**, wired into a harness that stops if it passes. For an essay judge it means showing it an answer that reads well and says nothing, and requiring a score below the course pass mark. Without it, "an AI graded this" has no measured content — the grader may be an auto-pass machine.

**Why it is in this vault:** this is not a hypothetical here. A claim was written down and had to be retracted: that a model gave "25/25 on two essays of different quality" — which had never been measured, because the first probe sent **one** essay to every model (`signer/src/judge.js:20-25`, [[00-Overview/04 - Corrections]]). The retraction is the reason the control exists as code rather than as an intention.

**Facts:**
- Three fixtures, three different jobs, all in `signer/fixtures/`: `essai-fasih-tapi-kosong.md` (fluent, empty — the negative control), `essai-230-kata.md` (substantive), `essai-pendek.md` (below the evidence floor).
- The assertions in `npm run judge` (`signer/scripts/judge-check.js`): the mechanical refusal must fire **before** any model call (`:54`); both long answers must produce a grade (`:55-56`); the hollow one must land **below `course.passMark`** (`:58-59`, and the check's own label is `KONTROL NEGATIF`); the substantive one must strictly beat it (`:60-61`); and the per-criterion scores must **not all be equal**, because a uniform mark is the signature of not reading (`:62-63`). Failure is a non-zero exit, not a warning (`:85-86`).
- The control is required to travel: the rival model `qwen/qwen3.8-27b` is held to the same test (`:69-76`), so "why not the fastest model?" is answerable by running it rather than by opinion. Its recorded reason is a saturated ceiling, not leniency — both models fail the hollow essay.
- No API key → exit 2 (`:37-39`). A missing dependency reports as missing, never as a pass.
- Measured: hollow **2-3**, substantive **91-100** across 5 runs, pass/fail decision identical every run (`npm run judge-variance`, 24 Sep) → **D41** ([[00-Overview/03 - Decisions]]). The allowed sentence is "the decision is stable, the score has a range"; the forbidden one is "the score reproduces exactly".
- Scope limit worth keeping in view: these are **fixtures**, not learner work, and one judge model with one rubric is not inter-rater agreement (`signer/fixtures/`, `signer/src/judge.js:14-18`).

**Not to be confused with:** [[Concepts/rubricHash and manifestHash]] — the hashes commit to *which rules were applied*; a negative control shows the grader *can apply them unfavourably*. A perfect `rubricHash` over a judge that cannot flunk certifies nothing.

**Sources:** `signer/scripts/judge-check.js:37-86` · `signer/src/judge.js:14-25,45` · `signer/src/grade.js:25,33,41` · `signer/fixtures/essai-fasih-tapi-kosong.md` · `signer/fixtures/essai-230-kata.md` · `signer/fixtures/essai-pendek.md` · [[04-Signer-Service/S5 - Grading and the model judge]] · [[00-Overview/04 - Corrections]]
