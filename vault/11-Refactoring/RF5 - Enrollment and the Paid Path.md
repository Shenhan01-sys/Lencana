---
tags: [refactoring, "RF5"]
status: active
updated: 2026-09-26
---

# RF5 - Enrollment and the Paid Path

**There is no enrollment, so there is nothing to pay for.** `btnEnroll` is a translated word with no
handler (RF1.1). That is the reason the money path looks disconnected from the product: the x402 machinery
is real, but it is bolted to the one action a learner never has to buy.

## What already works, and where it sits

| piece | state today |
|---|---|
| `POST /verify` answering `402 Payment Required`, settling via canonical Permit2 + `x402ExactPermit2Proxy`, splitting in `SettlementSplit` | working on chain 97 — [[09-Testing/T6 - npm run x402]], [[04-Signer-Service/S6 - x402 paid verification]] |
| Price | `X402_PRICE` in **atomic units of the demo ERC-20** (`signer/src/server.js:39`) — not BNB, so the UI in OI-7 is doubly wrong |
| Platform share | read from chain 97 on 25 Sep: `platformBps() = 1000` (10 %), `MAX_BPS() = 2500` — [[01-Architecture/A5 - Gas fronted and recovered]] |
| Batch rule | ≤ 25 reports per settlement; per-report pricing was rejected because the break-even on a $0.001 fee is ≈ $5.24 of BNB ([[00-Overview/03 - Decisions]] D40) |

## Why enrollment is the right thing to charge for

The D40 arithmetic was about a *verification* fee, and it nearly drowned the product: charging for a
machine-readable lookup costs more in gas than it earns unless it is batched. An **enrollment** is a
different object — priced by a human, in the range where gas is a rounding error — and it fits the
economics we already built:

```
learner pays publisher's price for a course  →  settlement  →  SettlementSplit
   publisher / issuer share  (their price, their rubric — D37)
   platform share            (fixed bps, can only be lowered — D38)
   gas                       (paid by whoever broadcasts, never a line item — A5)
```

That is the version of the split the builder asked about weeks ago (platform / agent / publisher), and it
is one `payee` plus `platformBps` away from what is deployed — the third leg (the agent's own fee) is the
open item in [[07-Backlog/01 - Backlog]].

## Scope for the refactor, smallest first

1. `#/course/<id>` → **Enroll**: price shown from the publisher's manifest, one confirmation screen, and
   the payment state *clearly marked demo* while the token is `DemoCourseToken` with an open `mint`.
2. Enrollment writes progress under the learner's address (RF3 step 3) and unlocks the chapters.
3. Reuse the existing settlement path rather than inventing a second one; the split contract already takes
   a per-payment `ref` with a replay guard, which is exactly what "one enrollment, once" needs.
4. Keep verification free and wallet-less, visibly. If we ever charge for both, we are charging for truth,
   which is the sentence this vault has refused since D23.

**Do not** let the UI imply a real marketplace: no third-party facilitator, no outside payer, no publisher
onboarding (all three are on the limits sheet — [[08-Results/01 - Evidence and Limits]]).

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]
**Related:** [[11-Refactoring/RF3 - Onboarding and Identity]] · [[02-Contracts/C3 - SettlementSplit]] · [[04-Signer-Service/S6 - x402 paid verification]]
