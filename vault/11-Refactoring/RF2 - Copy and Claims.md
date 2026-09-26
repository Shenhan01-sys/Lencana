---
tags: [refactoring, "RF2"]
status: active
updated: 2026-09-26
---

# RF2 - Copy and Claims

The wording problems are not cosmetic: several sentences make a claim the repository itself has decided
it cannot make.

## The hero caption

The shipped hero line, at `web/index.html:249` (`class="nexum-h1-system"`):
*"Autonomous AI credentials that prove your on-chain mastery."*
Proposed replacement from the builder: *"…prove your skills and profile master on-chainly."*

Verdict on the proposal: **the direction is right, the sentence is not English.** `on-chainly` is not a
word, and "profile master" reads as a person's job title. What the direction gets correct is the object
of the proof — a learner's ability, not their familiarity with chains. Web3 is the rail, not the subject
([[11-Refactoring/RF4 - Learning Surface Target Shape]]).

Three candidates that survive [[08-Results/01 - Evidence and Limits]]:

| EN | ID | what it promises |
|---|---|---|
| "Credentials that prove what you can actually do." | "Kredensial yang membuktikan apa yang benar-benar bisa kamu lakukan." | safest; no actor claim at all |
| "Your work, graded by your course's agent, verifiable by anyone." | "Tugasmu dinilai agen kursus tersebut, bisa diperiksa siapa pun." | keeps the AI and the on-chain half, and names who does each |
| "Learn it. Prove it. Without asking anyone's permission." | "Pelajari. Buktikan. Tanpa perlu izin siapa pun." | consumer voice; the third clause is what our verifier actually demonstrates |

Avoid "Autonomous AI credentials" as a noun phrase: the credential is not autonomous — an *assessment*
is, partly, by a model whose measured spread on one essay is 9 points
([[09-Testing/T12 - npm run judge-variance]]). A headline that promises autonomy is a promise the limits
sheet cancels. And if "on chain" appears at all, it is two words, not hyphenated, not "-ly".

## Sentences that should not survive the refactor

| where | now | problem | rewrite |
|---|---|---|---|
| `i18n.ts:1063`, `:1617`, `:1018` | "Zero human grading latency", "Evaluated by autonomous domain AI agent against on-chain rubric" | selling the *absence of a human* as a feature. To a learner paying for a course that reads like nobody will read their work | "Dinilai otomatis oleh agen penerbit terhadap rubrik penerbit — angka model punya rentang, keputusan lulus tidak" |
| `i18n.ts:1479`, `:1089` | "AI Evaluation Submission Portal" | nobody's first language for "hand in your assignment" | "Kumpulkan tugas" / "Submit your work" |
| `i18n.ts:980`, `:1553` | "W3C Bitstring Status List (Chain-State Derived)" | a standard's file format as a consumer card title | "Daftar status kredensial — dicabut atau tidak, dibaca langsung dari chain" |
| `i18n.ts:1081` | kicker "…TEST SUITE" | implies an external conformance run; ours is a self-check, and the 1EdTech validator has never seen the document | "Pemeriksaan mandiri terhadap spesifikasi" |
| `i18n.ts:668` | "18,450 BNB Gas Saved" | an unsourced aggregate; and our own economics say the platform *pays* gas, so "saved" is the wrong verb | delete, or show a computed figure with its source |

## Rules for whoever writes the next string

1. A learner-facing sentence may not contain a standard's name, a hash, or an address. Those belong in
   the evidence panel, which is for the verifier persona — the split already exists in the code
   ([[03-Frontend/FE1 - Verifier page and verify.ts]]).
2. If the UI states a fact about state (enrolled, unlocked, awaiting submission), that fact must come
   from `progress.ts` or the chain, never from the dictionary.
3. If the UI states a number about the product's performance, it must be printable by a command in this
   repo → [[09-Testing/00 - Hub Testing]].
4. Indonesian first, English second: the learner is Indonesian, the judge reads English, and the two
   audiences are on different screens.

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]
**Related:** [[10-Contributors/Claims-Cheat-Sheet]] · [[08-Results/01 - Evidence and Limits]] · [[00-Overview/01 - Briefing]]
