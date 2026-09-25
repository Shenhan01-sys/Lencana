---
tags: [concept]
---

# Batch not Data

**Definition:** what the paid route sells is **a batch of machine-readable reports per on-chain settlement**, not the information. The same `verify()` that answers the free page answers the paid route, so the truth itself is not the product; amortising a fixed gas cost across up to 25 credentials is.

**Why it is in this vault:** it prevents the sentence "verification is behind a paywall", which is false here (**D23**: the learner never pays for proof, and public verification stays free, wallet-less, forever) — and prevents its mirror mistake, billing per report, which charges a fixed on-chain cost N times while selling nothing N times larger.

**Facts:**
- Same implementation, two doors: `POST /verify` imports the browser's own data layer — `import { verify as verifyCredential } from '../../web/src/verify.ts'` (`signer/src/server.js:29`), called per hash at `:192`. A paid report cannot diverge from the free verdict without the free page being wrong too.
- The cost side is fixed per settlement: 114,728 gas (`settleWithPermit`) + 75,931 gas (`splitErc20`) = **190,659**, read from the two receipts (`README.md:55`; encoded as `PER_VERIFICATION_GAS = 190659`, `signer/src/server.js:230`). The price is `BigInt(process.env.X402_PRICE ?? '1000')` atomic units of a 6-decimal demo token (`:39`).
- Hence the rule, written in the file it governs (`signer/src/server.js:223-228`): one payment must serve many verifications, and that is *the only reason this route may charge at all*. `BATCH_MAX = 25` (`:229`) → 190,659 / 25 ≈ 7,626 gas per report (arithmetic on the two cited figures, not a separate measurement).
- Batch inputs are validated, normalised and de-duplicated: `^0x[0-9a-fA-F]{64}$` per item, lower-cased, over 25 rejected with the limit named (`signer/src/server.js:232-247`). Concurrency is capped at 4 per request (`:189`) because 25 parallel verifications ≈ 300 simultaneous `eth_call` and the public RPC was tested refusing exactly that — the "faster" version returns half-empty reports → [[R6 - Toolchain traps that cost time]].
- The proof that a batch is not one answer copied twice is measured, not asserted: one payment for two hashes returned **two different verdicts**, `REVOKED` and `VALID`, in one settlement, and issuer revenue rose by exactly **one** price (900 of 1000), not two (`signer/scripts/x402-check.js:192-205`, `README.md:55`).
- `report` stays populated only for a single hash so an existing client cannot silently change meaning (`signer/src/server.js:217-220`); batch responses carry `reports[]` plus `batch: {requested, served, perSettlementGas}` (`:215`).

**Not to be confused with:** [[Concepts/Fronted Gas]] — that concept is about *whose wallet pays* for a transaction; this one is about *how much a fee delivers*. Both constrain the wording about money, from different sides: one forbids "issuance is free", this one forbids "verification is paid".

**Sources:** `signer/src/server.js:29,39,189,192,215,217-220,223-230,232-247` · `signer/scripts/x402-check.js:152-205` · `contracts/SettlementSplit.sol:112-114` · `README.md:55` · [[04-Signer-Service/S6 - x402 paid verification]] · [[00-Overview/03 - Decisions]] D23, D40
