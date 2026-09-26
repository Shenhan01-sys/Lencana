---
tags: [lms-reference, synthesis, "L7"]
status: active
updated: 2026-09-26
---

# L7 - What an e-course must have

Six platforms, six codebases, one recurring skeleton. This is the minimum shape of an e-course derived
from what all six actually implement — not from product marketing — with our status beside each item.

**Part of:** [[12-LMS-References/00 - Hub LMS References]] · comparison in [[L8 - Lencana vs LMS]]

## The skeleton, and where we stand

| # | required element | who has it (evidence) | Lencana |
|---|---|---|---|
| 1 | **A content hierarchy with stable identity** — course → chapter/section/module → lesson/activity, each with its own id and position | Canvas `ContextModule` + `ContentTag` rows; Moodle course→section→`mod_*`; edX course→chapter→sequential→vertical→component; Frappe DocTypes; Chamilo course→topic; LearnHouse course→activity | ✅ `content.ts` `Course`/`Module`/`Lesson`, position by array order, ids derived (`courseIdOf`, `lessonIdOf`) |
| 2 | **Sequence and gating rules stored as data, enforced server-side** | Canvas `prerequisites` + `completion_requirements` + `unlock_at` + `require_sequential_progress`; Moodle availability rules; edX content-type gating | ⚠️ `prereqCourseId` exists and the **chain** enforces it (`PrerequisiteRevoked`), but chapter-level gating is not expressed at all |
| 3 | **An enrolment record per learner** — the row everything else hangs off | Canvas one progression row per (module, user), unique in DB; LearnHouse `TrailRun`/`TrailStep`; Frappe enrolment doctype with a row lock | ❌ **nothing**. `btnEnroll` is an unreferenced string |
| 4 | **Per-learner progress with an explicit state machine** | Canvas `locked → unlocked → started → completed` + staleness columns + `lock_version`; edX persistent grades; Moodle completion flags per activity | ❌ one global `localStorage` key, no namespace, `wipeCourse()` deletes it |
| 5 | **Assessment with a rubric whose scale is explicit** | edX/ORA points on each rubric **option** (`{name,label,explanation,points,orderNum}`) + `score_type` per assessment; Moodle grade items with weights | ⚠️ `RubricItem {label, max}` is a weight, not a scale; essays get one number |
| 6 | **Two gates: complete ≠ passed, and ungraded ≠ zero** | LearnHouse `is_course_fully_completed` vs `are_course_assignments_passed`; Chamilo `complete` vs `finished` with `score = null`; Moodle behat pins *empty, never zero* | ⚠️ `BELUM_LENGKAP` exists in `score.ts`, but the gate is one: `readyForCredential = gradedWeights === 100` |
| 7 | **Grade provenance — who or what produced this number, and when** | Moodle `rawgrade`, `usermodified`, `aggregationstatus`, `aggregationweight`, plus a history table; edX `assess_type ∈ {full-grade, regrade}` | ⚠️ the document carries `result.method` + `rubricHash`; the learner never sees a breakdown |
| 8 | **A grading workflow when humans or models grade** | ORA leases grading for 8 h (claim/delete lock); Moodle staff grading queues | ❌ `judge.js` is fail-closed with a negative control, but there is no queue, lock or regrade event |
| 9 | **Completion → an artifact whose validity a stranger can check** | all six produce something; **none** produces a signed, revocable, third-party-checkable document (see [[L8 - Lencana vs LMS]] §A) | ✅ the differentiator: OB 3.0 / VC 2.0 + `eddsa-rdfc-2022`, two bitstring lists from chain state, anchored to BAS |
| 10 | **A price and a payment path, with the price computed server-side** | Moodle `enrol_fee` recomputes the amount and refuses a mismatch; edX mode + entitlement; Frappe `paid_course`; LearnHouse groups (EE) | ⚠️ the money path works on chain (`SettlementSplit`, x402) but is attached to verification, not enrolment — and the browser panel is an animation |
| 11 | **Roles and permissions** | Canvas/Moodle/Chamilo role tables; LearnHouse `Rights` buckets; Frappe DocType permissions | ⚠️ issuer whitelist + `onlyOwner` on chain; no product-level roles (learner/publisher/mentor) |
| 12 | **A catalogue that is not one topic** | all six are topic-agnostic by construction | ⚠️ structurally agnostic, practically two web3 courses — the limit is authorial, not technical |

## What this means for our screens

The skeleton maps one-to-one onto the surface described in [[RF4 - Learning Surface Target Shape]]:
catalogue (12) → course page (1, 2) → enrol (3, 10) → chapter page (2, 4) → lesson with inline
interaction (5) → chapter end with two gates (6, 7) → course end requesting the artifact (9) → portfolio
and free public verification. The mentor panel is item 8 made visible; the "no demo/real separation"
complaint is item 3 and 4 missing, which is why every screen looks like a fixture.

Three of the twelve we already do better than any of the six — **2, 9 and the chain-enforced half of 6**.
Three we do not do at all — **3, 4, 8** — and they are the reason the product reads as a demo.

## The rule this note exists to prevent

Knowing the shape of an e-course is not a licence to copy one. Their front ends are server-rendered
admin surfaces built for institutional staff; ours is a dark, typographic, hash-routed page for an
Indonesian learner, with no UI framework. Take items 1-12 as **data model and process**; leave every
pixel to Lencana ([[12-LMS-References/00 - Hub LMS References]]).

**Related:** [[L8 - Lencana vs LMS]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] · [[11-Refactoring/RF6 - Core System, Backend and Contracts]] · [[05-Course-Content/01 - Course Content]]
