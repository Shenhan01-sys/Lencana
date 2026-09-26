---
tags: [lms-reference, hub]
status: active
updated: 2026-09-26
---

# 00 - Hub LMS References

Six open-source learning platforms, cloned shallow into `references/` at the workspace root
(**not** part of `app/`, and `/references/` is gitignored), so that what we say about "how an e-course
should be shaped" comes from reading their code instead of from memory. Each note is one platform,
written from the clone named below.

| note | upstream | clone dir | SHA analysed |
|---|---|---|---|
| [[L1 - LearnHouse]] | `github.com/learnhouse/learnhouse` | `references/learnhouse` | `dev` @ `5e28b07` |
| [[L2 - Frappe LMS]] | `github.com/frappe/lms` | `references/frappe-lms` | `develop` @ `aae024f` |
| [[L3 - Chamilo]] | `github.com/chamilo/chamilo-lms` | `references/chamilo-lms` | `master` @ `a6cceea` |
| [[L4 - Moodle]] | `github.com/moodle/moodle` | `references/moodle` | `main` @ `e68a1418b` |
| [[L5 - Open edX]] | `github.com/openedx/edx-platform` | `references/edx-platform` | `master` @ `303f778` |
| [[L6 - Canvas]] | `github.com/instructure/canvas-lms` | `references/canvas-lms` (sparse) | see `_research/out/clone_canvas.log` |
| [[L7 - What an e-course must have]] | — | synthesis of the six | — |
| [[L8 - Lencana vs LMS]] | — | the comparison matrix + our gap list | — |

> ## 🚫 What this folder is NOT: do not copy their front end
>
> The references are studied for **structure, mechanics and business process** — what a course is made
> of, how a learner moves through it, who grades, what completion means, what gets sold, how a
> certificate is issued. They are **not** a design source.
>
> Lencana keeps its own surface: dark, typographic, evidence-forward, Indonesian-first, no UI framework,
> hash-routed templates over typed data ([[03-Frontend/01 - Frontend]]). Concretely, an agent working in
> this vault or in `app/web/` must not: copy or port their HTML/CSS/components/page layouts, reproduce
> their wording, adopt their navigation patterns wholesale, or introduce their framework (React apps,
> Dojo, Mustache templates, Django templates). If a structure is worth having, describe it here in prose
> and let the frontend owner implement it in Lencana's idiom.
>
> A note that would make sense in Moodle's UI is out of scope. A note that says *"Lencana has no concept
> of an enrolment record, Moodle does, here is the shape of it"* is in scope.

## Reviewer kit — reproduce the source and challenge these notes

Decided 26 Sep: **the reference source code is not committed to this repository.** Only the analysis is.
The clones live locally in `references/` (gitignored), and the source is handed to a reviewer directly.
Reasons, so nobody re-litigates it later: ~1 GB of third-party code in a public submission repo, GPL/AGPL
licences that would have to travel with it, and large blobs that cannot be removed from history without
rewriting the very history that proves the project was built during the hackathon.

So a claim in these notes is only as good as its reproducibility. Everything below is what a reviewer
needs to get the *identical* trees and check every line we cited.

```powershell
# exact trees analysed (shallow, source only — nothing is installed, no node_modules)
cd <workspace root>
git clone --depth 1 --single-branch https://github.com/learnhouse/learnhouse.git   references/learnhouse   # dev      @ 5e28b07
git clone --depth 1 --single-branch https://github.com/frappe/lms.git               references/frappe-lms  # develop  @ aae024f
git clone --depth 1 --single-branch https://github.com/chamilo/chamilo-lms.git      references/chamilo-lms # master   @ a6cceea
git clone --depth 1 --single-branch https://github.com/moodle/moodle.git            references/moodle      # main     @ e68a1418b
git clone --depth 1 --single-branch https://github.com/openedx/edx-platform.git     references/edx-platform# master   @ 303f778
# canvas is huge: take only the paths that answer structural questions
git clone --depth 1 --single-branch --filter=blob:none --no-checkout https://github.com/instructure/canvas-lms.git references/canvas-lms
git -C references/canvas-lms sparse-checkout init --cone
git -C references/canvas-lms sparse-checkout set app/models app/controllers db/migrate lib config db/views spec/models
git -C references/canvas-lms checkout
```

Measured footprint on 26 Sep (shallow, source only): moodle 430.8 MB · chamilo 316.3 MB ·
edx-platform 120.9 MB · frappe-lms 63.5 MB · learnhouse 53.3 MB · canvas sparse (see
`_research/out/clone_canvas.log`). Note `github.com/openedx/openedx-platform` does not exist — the
repository is `openedx/edx-platform`.

**Checking any citation in these notes** (every one is `references/<dir>/<path>:<line>`):

```powershell
# what is actually on the cited line — if it does not say what the note says, the note is wrong
powershell -NoProfile -Command "(Get-Content references/moodle/<path>)[<line>-1]"
# find the real home of a concept when a citation looks off
git -C references/<dir> grep -n "completion" -- "*.php" | head -40
git -C references/<dir> grep -rn "OpenBadge" -- .
```

**Where these notes are most likely to have holes** — check these first, they are the load-bearing
comparisons:

| claim area | how to challenge it |
|---|---|
| "their badge/certificate cannot be revoked / is not anchored" | search each repo for badge, assertion, revocation, verification URL, blockchain; Chamilo and Moodle both emit Open Badges, so the version and the signer matter, not the word "badge" |
| "their paid enrolment works like X" | Moodle `enrol/payment`, edX entitlements/verified-track, Frappe pricing fields, Canvas e-commerce — find the money path in code, not in docs |
| "completion is computed server-side" | locate the completion/progress table or model and the code that writes it; our equivalent is `localStorage`, which is the whole gap |
| "their gradebook shows which evidence produced which number" | Moodle gradebook, edX ORA rubric breakdown, Canvas gradebook — compare against our `score.ts` components |
| anything about their UI | out of scope by rule, and the fastest way for a reviewer to catch us over-reading a template |

A reviewer who disagrees should say which file and line, and what the note should have said — the notes
are written to be replaced, not defended. Corrections go in [[00-Overview/04 - Corrections]] with the
evidence, the way every other correction in this vault is recorded.

## The five questions every note answers

1. **How is it structured?** Directories and the files that define a course: what is a course, a
   section/chapter, an activity/lesson, an assignment, a quiz. Real paths, real names.
2. **What is its business process?** Roles (student, teacher, manager, admin), how enrolment happens,
   whether anything is paid and how, who grades and when, what completion requires, what the artifact at
   the end is (badge, certificate, transcript), and how its validity is checked afterwards.
3. **What does Lencana have that they do not?** Split into *by design* (a deliberate difference in our
   architecture) and *by code* (something that actually exists in `app/`, cited).
4. **What do they have that Lencana lacks?** Split into **design gap** (we never decided to have it — it
   needs a decision, maybe never) and **implementation gap** (we did decide to have it and it is not built,
   or it is built and not wired).
5. **What we deliberately do not take**, and why — including anything that would break our limits sheet
   ([[08-Results/01 - Evidence and Limits]]).

## Citation rules (same as the rest of this vault)

- Claims about a reference: `references/<dir>/<path>:line` **plus** the upstream URL and the SHA in the
  table above, because the clone is local and not committed. If the claim is only about their concept and
  not their code, say so.
- Claims about Lencana: a path inside `app/`, and reproducible by a command run from `app/` — the
  references are analysis material, never evidence for a product claim.
- No invented line numbers: open the file at the line you cite. Where a figure could not be verified,
  write `_unverified_` instead.
- **English**, technical identifiers quoted as written; UI strings from the references stay in their own
  language.

## Where this feeds

[[11-Refactoring/RF4 - Learning Surface Target Shape]] (the screen-by-screen target for our own learning
surface) · [[05-Course-Content/01 - Course Content]] (our data model) ·
[[11-Refactoring/RF5 - Enrollment and the Paid Path]] (what enrolment should cost and do) ·
[[07-Backlog/01 - Backlog]] (the gaps that become work)

**Related:** [[Index]] · [[11-Refactoring/00 - Hub Refactoring]] · [[Conventions]]
