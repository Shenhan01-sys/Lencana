---
tags: [concept]
---

# Fronted Gas

**Definition:** "fronted" means the platform **broadcasts** a transaction that someone else **authorised by signing**, and pays its BNB at that moment. Recovery is not per-transaction: it happens later, as a fixed share of the fee that transaction eventually earns. Three separate questions, which is the point — *who signs*, *who broadcasts*, *who pays*.

**Why it is in this vault:** collapsing those three produces two forbidden sentences. "Issuance is free" (it is not — someone's wallet paid the gas) and "the agent pays for its own issuance" (it does not, and that is the whole zero-BNB onboarding claim). Collapsing them further produces the accounting mistake this note exists to prevent: treating gas as a percentage line item inside the issuer's share.

**Facts:**
- The mechanism is `attestByDelegation`: the attester recorded by BAS is the EIP-712 **signer**, not `msg.sender` (`signer/src/delegation.js:2-8`). The on-chain gate that makes this admissible checks `_issuer[attestation.attester]` — the signer — not the broadcaster (`contracts/CredentialResolver.sol:243`).
- Measured, not asserted: the agent's balance is required to be unchanged (`signer/scripts/delegate.js:201`) while the platform's address is printed as the payer (`:87`). Scale of what the platform actually paid, from the runs in `README.md:52`: 370,131 gas for one delegated attestation, 1,024,813 gas for three lesson credentials in one batched transaction.
- Recovery is a bps share of the fee and nothing else: `sharesOf()` has exactly two terms — `(amount * platformBps) / 10000` and the remainder to the issuer (`contracts/SettlementSplit.sol:113-114`), capped by `MAX_BPS = 2500` (`:76`) and adjustable only downward (`decreasePlatformBps`, `:183-184`).
- **Gas is never subtracted from the issuer's share.** No BNB leaves the split contract at all — `splitErc20` reads its own **token** balance and pushes tokens out (`:136`), so the gas lives in the broadcaster's accounting, in a different asset and a different transaction. The harness enforces the arithmetic: `payeeGain + platformGain === price` exactly (`signer/scripts/x402-check.js:158`); a gas line item inside the split would break that equality, which is how the rule would announce its own violation.
- The payment rail has a mirror case with a different mechanism: the x402 client also pays no gas and sends no transaction, because EIP-2612 `permit` replaces the `approve` that would have required BNB (`contracts/DemoCourseToken.sol:14-17`). Same outcome, unrelated code path — do not explain one with the other.
- Costs that remain real after fronting: the relayer wallet is critical infrastructure and can delay or drop a delegation (it cannot forge one, it is signed), and a leaked delegation is a bearer instrument — short `deadline`, never `0` → [[01-Architecture/A5 - Gas fronted and recovered]].

**Not to be confused with:** [[Concepts/Batch not Data]] — fronting answers *whose wallet pays for a transaction*; batching answers *what a fee buys*. Both are needed to describe the economics and neither implies the other.

**Sources:** `signer/src/delegation.js:2-8,112-126` · `contracts/CredentialResolver.sol:243` · `signer/scripts/delegate.js:87,201` · `contracts/SettlementSplit.sol:76,113-114,136,183-184` · `signer/scripts/x402-check.js:158` · `contracts/DemoCourseToken.sol:15-19` · `README.md:52` · [[01-Architecture/01 - Architecture]]
