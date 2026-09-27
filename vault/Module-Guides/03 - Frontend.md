---
tags: [module, 03]
---

# 03 - Frontend

**Purpose:** The verification surface and the learning surface: what is genuinely wired to the chain, and what is still theatre - the honest split, recorded per file and line.

## Files in this module
- [[03-Frontend/01 - Frontend]]
- [[03-Frontend/FE1 - Verifier page and verify.ts]]
- [[03-Frontend/FE2 - Learning surface router]]
- [[03-Frontend/FE4 - Mount contract with the maintainer]]
- [[03-Frontend/FE6 - Quirks and open defects]]

## Key facts
- `web/src/verify.ts` is DOM-free on purpose so the harness can run the page logic itself ([[09-Testing/T4 - npm run probe]]).
- Findings on Dave's surface are reported with a ready patch, never edited in place: [[10-Contributors/Open-Items-for-Dave]].
- OI-11 is the serious one: `main.ts` contains no `fetch(`, so its payment panel is timers.
