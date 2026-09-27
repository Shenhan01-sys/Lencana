---
tags: [hub, contributors]
status: active
updated: 2026-09-28
---

# 00 - Hub Contributors

| surface | owner | what that means in practice |
|---|---|---|
| `contracts/`, `signer/`, `web/src/verify.ts` + `render.ts` (the verifier), course data | core system | a change ships with a command that prints the number |
| `web/` UI: landing, agent hub, portfolio, payment console, course surface | Dave — [[10-Contributors/Open-Items-for-Dave]] | findings are reported with a copy-paste patch, not edited in place |
| hosting, wallet funding, event registration, submission form | builder | the only items needing an account or a human action |

**Rules that came from arguments in this project, not preference.**
- Front-end findings are **reported**; the patch ships in the note and the owner applies it.
- A number may not enter submission material unless a command printed it, and no claim may exceed what
  was measured ([[08-Results/01 - Evidence and Limits]]).
- "1EdTech compatible" stays out of every field; the allowed sentence is in
  [[10-Contributors/Claims-Cheat-Sheet]].
- Addresses are read from `broadcast/` or derived in code, never retyped — one retyped address this
  week produced an on-chain artifact we had to revoke.

**Related:** [[10-Contributors/Open-Items/00 - Hub Open Items]] · [[Conventions]]
