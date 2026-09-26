---
tags: [refactoring, "RF4"]
status: active
updated: 2026-09-26
---

# RF4 - Learning Surface Target Shape

The builder's complaint: "course content is a popup modal with nothing to do but a next card". The code
says something better than that — and shows it worse. **The content model is already a real curriculum;
the surface does not behave like one.**

## What the data already is

`web/src/content.ts` defines courses → modules → lessons, and a lesson body as a list of typed blocks
with six interaction kinds — `bacaan`, `kuis`, `esai`, `praktik`, `kasus`, `referensi`. The catalogue as
of 26 Sep (`npm run inventory`): **2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes ·
28 quiz questions · 2 rubric-scored essays**. Each course carries its issuer's policy — criteria, weights,
`passMark`, validity days, and an optional `prereqCourseId` — so per-chapter gating is expressible today
([[05-Course-Content/K1 - The content model]], [[05-Course-Content/K2 - The issuer manifest and rubricHash]]).

## Target shape (screen by screen)

| screen | what the learner does | what it must show | already possible with current data |
|---|---|---|---|
| **Catalogue** `#/learn` | pick a course | duration, module count, what you'll be able to prove, price, publisher (not "issuer") | yes — `courses/index.ts` exposes the stats |
| **Course** `#/course/<id>` | read the syllabus, enroll | one row per chapter with its lessons, its quiz count, and the chapter's pass bar | yes — modules + `lessonIdOf` |
| **Chapter** `#/course/<id>/m/<mid>` | work through lessons in order | progress within the chapter, the next incomplete lesson, the chapter's rubric | yes — module → lesson list |
| **Lesson** `#/course/<id>/l/<slug>` | read → answer → try → submit | the interaction **inside** the page: inline quiz with per-answer feedback, essay box with the rubric visible, praktik checklist with the command to run | yes — the `Block` union already carries quiz/essay/task/callout |
| **Chapter end** | "selesaikan bab" | computed score vs that chapter's/issuer's `passMark`, and what is missing (`BELUM_LENGKAP`, not 0) | yes — `score.ts` computes it |
| **Course end** | ask for the credential | what will be signed, who signs it, that verification afterwards is free | the pieces exist on chain; the UI must stop hand-typing the document (OI-1) |
| **Sidebar, everywhere** | get unstuck without leaving the page | chapter outline with ticks **+ a mentor panel** | outline yes; mentor no (RF1.6: zero occurrences) |

## The mentor panel

This is where the agentic half becomes visible to the person paying for it: a right-hand panel, present
per lesson, that answers against **that lesson's text and the issuer's rubric**, and can point at the
learner's own gap ("kuis bab 2: 3 dari 4, yang salah adalah soal tentang gas"). For the demo it can be
wired to the assessment plumbing that already exists — `signer/src/judge.js` (a model call with the
rubric, fail-closed) and `signer/src/grade.js` (mechanical scoring that refuses incomplete evidence).

Two constraints, because this is the part most likely to become an overstated claim:

1. **Who rents the agent is a product decision the UI must state.** The vault's current position is that
   the **publisher/issuer** owns the agent and the platform fronts its gas
   ([[00-Overview/03 - Decisions]] D31, [[01-Architecture/A5 - Gas fronted and recovered]]). A "mentor you
   pay for" is a different arrangement and must be decided, not implied.
2. **A mentor is a model.** Its number has a measured spread ([[09-Testing/T12 - npm run judge-variance]]),
   so the panel is advice, never assessment, and the UI must keep those two words apart.

## The catalogue is not a web3 catalogue

Lencana is the venue, not the subject. `Course` has no field that requires a technical topic — the limit
is authorial, not structural, so the first fix is to publish at least one non-technical course and to
stop describing the product as "web3 courses" in learner-facing copy. Web3 is where the proof lives; the
content can be anything with a rubric (which is also what a real marketplace pitch would need, and what
[[08-Results/01 - Evidence and Limits]] currently forbids us to claim we have).

## Reference structures (design stays Lencana)

Looked at as *information architecture*, not as UI. Not audited at code level in this pass — treat as a
reading list for the frontend owner, in the order most useful to us:

| project | what is worth stealing | why it fits our model |
|---|---|---|
| [Frappe LMS](https://github.com/frappe/lms) | course → chapter → lesson, with a left outline, progress ticks and inline quiz blocks | the closest match to our `Course/Module/Lesson` types, with the least ceremony |
| [LearnHouse](https://github.com/learnhouse/learnhouse) | creator/publisher surfaces (who authors, who publishes) and a modern card catalogue | our publisher story is a manifest — the UI has to express ownership without lying about it |
| [Canvas LMS](https://github.com/instructure/canvas-lms) | **modules with prerequisites, requirements and completion gates**; a separate Student view | exactly our `prereqCourseId` + per-chapter `passMark` gating, already specced by an industry |
| [Moodle](https://github.com/moodle/moodle) | course → section → activity, completion tracking, gradebook | the gradebook is the missing concept in our UI: the learner never sees which evidence produced which number |
| [Open edX](https://github.com/openedx/edx-platform) | unit/block sequencing, "sequence" bottom bar with status per unit | a good pattern for "next incomplete", which our card walkthrough lacks |
| [Chamilo](https://github.com/chamilo/chamilo-lms) | course → topic → exercise, and a skills ladder | the skills ladder is the honest version of the "profile" the hero copy keeps promising |

Copy none of their visual language: Lencana's surface is dark, typographic and evidence-forward
([[03-Frontend/01 - Frontend]]).

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]
**Related:** [[05-Course-Content/01 - Course Content]] · [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[00-Overview/05 - Demo Scenes]]
