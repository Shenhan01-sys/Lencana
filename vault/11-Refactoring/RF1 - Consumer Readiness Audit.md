---
tags: [refactoring, "RF1"]
status: active
updated: 2026-10-03
---

# RF1 - Consumer Readiness Audit

What the shipped `web/` does today, measured by reading it on 26 Sep. Severity is judged against one
question only: **would a non-technical Indonesian learner know what to do next?**

> ⚠️ **State as of 26 Sep — partly stale (correction 3 Oct).** Five of the nine defects below are resolved;
> the table is kept as it was measured. Re-read in `app/` on 3 Oct:
> - **1.1** — enrolment exists since 28 Sep (B72: the page calls `POST /enroll`); the course-card button now has a
>   handler (`web/src/main.ts:1727`); since B125 a paid course is paid for before enrolment, from the course page.
> - **1.3** — the learning surface is reachable: FE7 replaced `#/learn` with the classroom `#/class/<course>` (old
>   links redirect, `web/src/main.ts:1011`), and since B124 the nav after login has "Dashboard" → `#/app`
>   (`web/index.html:41`).
> - **1.4** — `#/submit`, `#ai-evaluator` and `#/portfolio` are no longer pages: B123 (D59) redirected them, and they
>   now land on `#/app` (`web/src/main.ts:1019`).
> - **1.5** — the sentence quoted below sits on the portfolio page (`web/index.html:1414`), which no route shows any
>   more; the internal area `#/app` (B124) draws the learner's state from `POST /me/records` instead. The string
>   itself is still in `web/src/i18n.ts:1034`.
> - **1.9** — the diploma modal's button is on that same portfolio page (`web/index.html:1389`), so the hand-typed
>   document has no route left; its markup and handler (`web/src/main.ts:852`) are still in the tree.
>
> Still true: **1.6** (zero `mentor` in `web/`). Not re-measured: 1.2, 1.7, 1.8. The inventory and `src/lms.ts` in
> "What is *not* broken" are 26 Sep: the public catalogue is 7 courses since B127, and `lms.ts` no longer exists
> (FE7). See [[08-Results/B123 - Executive Summary]], [[08-Results/B124 - Executive Summary]],
> [[08-Results/B125 - Executive Summary]], [[03-Frontend/FE7 - Merge cabang FE 1 Okt]].

## Verified defects

| # | finding | evidence | why it hurts a consumer track |
|---|---|---|---|
| 1.1 | **The enrollment button exists only as a word.** `btnEnroll` is declared in the type and translated twice, and referenced nowhere else | `src/i18n.ts:189` (type), `:665` `'Start Course'`, `:1238` `'Mulai Belajar'`; `findstr /s /n /c:"btnEnroll" src\*.ts` returns only those three lines | the core action of an e-learning product — enroll — has no handler. Everything downstream (payment, progress, assessment) therefore has no entry point |
| 1.2 | **The app funnels into the verifier.** 11 of the 14 hash assignments in `main.ts` send the user to `#/verify` | `src/main.ts:1786, 1797, 1807, 1813, 1862, 1943, 1956, 1985, 2017, 1929→, 2029` | a learning platform that keeps returning you to a credential checker reads as a validation tool, not a product you study in |
| 1.3 | **The learning surface is not reachable from the navigation.** Routes `#/learn`, `#/course/*`, `#/me` are handled, but no nav item points at them | handled at `src/main.ts:1157`; nav at `index.html:43-49` has no `#/learn` (already logged in [[03-Frontend/FE6 - Quirks and open defects]]) | 34 pages of real course content are one typed URL away from being invisible |
| 1.4 | **Page names are internal vocabulary.** `#/submit` (alias `#ai-evaluator`) is labelled "AI Evaluation Submission Portal" | `src/main.ts:1149`; `src/i18n.ts:1479`, `:1089` | a learner does not "submit to an evaluator"; they finish a lesson and hand in an assignment. This is the page the builder could not parse |
| 1.5 | **The UI narrates state it cannot observe.** Copy asserts "Prerequisite unlocked · Currently enrolled in Study Room · Awaiting capstone defense essay submission" as a static string | `src/i18n.ts:957` | this is why demo and logged-in look identical: the sentence is not derived from anything, so the app can never show a real "you are here" |
| 1.6 | **No mentor, no helper, no assistant anywhere** | `findstr /s /n /c:"mentor" src\main.ts src\i18n.ts index.html` → 0 | the agentic half of the product is invisible to the learner, who is the audience the agent is supposed to serve |
| 1.7 | **Spec jargon in consumer surfaces** — a card titled "W3C Bitstring Status List (Chain-State Derived)" on `#/agent-hub` | `src/i18n.ts:980` (EN), `:1553` (ID), rendered by `src/main.ts:1406` | the mechanism is ours and it is real; presenting it as a hero card to a learner is a developer writing to other developers |
| 1.8 | **Fixtures wear the costume of live data** — persona names, rubric ids, grade numbers and gas totals are strings in the dictionary | `src/i18n.ts:584, 630-631, 668, 947, 950, 955, 1006, 1018, 1209, 1520-1523, 1591` | see OI-5 in [[10-Contributors/Open-Items-for-Dave]]; the specific risk is that a judge mistakes one for a measurement |
| 1.9 | **The "popup modal" impression has a real source, but it is not the course list** | `findstr /n /c:"Modal" index.html` → 0; course cards are not modals. The modal in the tree is the **diploma**: `src/main.ts:2048` `#diplomaModal`, `:231` `btnCloseDiploma` | what reads as "course content in a popup" is a hand-typed credential document in a modal (OI-1) — a fake artifact that happens to be the most polished screen in the app |

## What is *not* broken

Say it plainly so the refactoring does not undo it: the data model behind learning is correct and
already richer than the UI shows. `src/content.ts` carries courses → modules → lessons with six
interaction kinds (`bacaan`, `kuis`, `esai`, `praktik`, `kasus`, `referensi`), `src/courses/` ships
**2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 essays** (printed by
`npm run inventory`, re-run 26 Sep), `src/lms.ts` renders them hash-routed with no UI framework, and
`src/progress.ts` stores completion locally and labels it **not evidence**. The audit's verdict is not
"there is no learning product" — it is **"the learning product has no front door."**

## The one flow the app is missing

```
browse → enroll (paid) → study per chapter → interact → submit → agent assesses
       → credential → portfolio → free public verification
```

Today it is: ~~`landing (fixtures) → verifier → modal (typed document)`~~ *(correction 3 Oct: that was 26 Sep. Since
B123–B125 the flow is login (Privy) → onboarding `#/app/welcome` → course page `#/course/<id>` → pay (paid courses) →
classroom `#/class/<course>` → internal area `#/app`; the typed-document modal has no route — see the banner above.)*
RF3 supplies the front door,
RF4 the study loop, RF5 the money step.

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]
**Related:** [[03-Frontend/01 - Frontend]] · [[10-Contributors/Open-Items-for-Dave]] · [[00-Overview/01 - Briefing]]
