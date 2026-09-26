---
tags: [refactoring, "RF3"]
status: active
updated: 2026-09-26
---

# RF3 - Onboarding and Identity

**Problem.** The only way into a personal experience today is connecting a wallet. For an Indonesian
learner who has never held a chain address, that is not an onboarding flow — it is a wall — and after it
there is still no profile, no "my courses", and no difference between a signed-in and an anonymous visit
(RF1.5).

## What the identity actually has to be

The system's unit of identity is **an address**, because the credential's subject id is derived from one:
`credentialHash = keccak256(abi.encodePacked("vc:", holder, courseId))`
([[05-Course-Content/K1 - The content model]]). Nothing else in the product needs a personal identifier:
issuance, progress, portfolio and verification all key off that hash. So onboarding has to produce an
address and then can forget about identity entirely.

That is why the proposed direction is sound: an **embedded-wallet provider (Privy, or a comparable
service)** gives a learner an address from an email/OTP or social login, without a seed phrase. It fits
our security model rather than bending it — the whitelist that matters is the **issuer/attester** list in
`CredentialResolver` (`:142`, `:243`), and a learner address never needs to be on it.

## What it costs, stated before anyone agrees to it

| cost | detail |
|---|---|
| **An external dependency on the demo's critical path** | if their service or their quota is down when a judge opens the page, sign-in fails. Today the page works offline against an RPC |
| **A project id / key in the frontend** | it is a publishable id, not a secret — but it must come from an env var at build time and never be committed. `web/.env*` handling must be checked before this lands |
| **Custody language** | the key is held with the provider's infrastructure and is exportable. Our copy must say "wallet kamu dibuatkan untukmu, bisa diekspor" — never "kami tidak pernah pegang kunci kamu", because with an embedded wallet *someone* does |
| **Non-custodial fallback** | the existing browser-wallet path stays. It is the escape hatch and the proof that the product does not require the provider |
| **Time** | this is the largest of the five refactoring items with 4 days left. It is scoped below so it can be cut cleanly |

## Minimum version that still reads as consumer onboarding

1. `#/onboarding` (a route, not a modal): **email + OTP or Google** through the provider → an address
   appears, labelled "ini alamat belajarmu".
2. One short profile step: name (optional), goal, and an explicit line explaining what the address is for.
   No KYC, nothing that implies identity verification we do not perform.
3. Progress and portfolio move from anonymous-localStorage to keyed-by-address, so returning on another
   device shows something real. `web/src/progress.ts` currently stores `lencana-progress-v1` and is
   labelled not evidence — keep that label; it is still not evidence.
4. "Demo mode" stays available **without** sign-in, visibly badged as demo. That single badge is what
   removes the confusion the builder reported: right now nothing on screen distinguishes fixture from
   state.
5. Sign-in never gates the verifier. Verification stays wallet-less and free — that is D23, and it is the
   claim the track rewards.

**Cut line if there is no time:** steps 1-2 by themselves, keeping today's wallet connect as the only
provider. Do not ship a half-wired provider: a login button that errors is worse than no login button
(RF1.1 is exactly that story, one word away from working).

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]
**Related:** [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[03-Frontend/FE4 - Mount contract with the maintainer]] · [[Concepts/DOM-free Verification Module]]
