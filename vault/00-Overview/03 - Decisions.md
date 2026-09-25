---
tags: [overview, decision, hub]
status: active
updated: 2026-09-25
---

# 03 - Decisions

The decisions that shaped the product, each with what forced it. **ID is stable**: `D#` appears in the
architecture essay, in the backlog and in commit messages — do not reuse a number for something else.
Full reasoning per decision lives where it belongs (linked) — this is the index.

| ID | date | decision | what forced it | detail |
|---|---|---|---|---|
| **D15** | 16 Sep | **The credential is not an NFT.** Credential = signed JSON document; chain = anchor + registry; soulbound token = the artifact a user sees | every on-chain token standard we read explicitly contradicts credential semantics, while VC 2.0 / OB 3.0 provide them | [[06-Spec-Research/01 - Spec Research]] |
| **D17** | 16 Sep | No "verifiable inference" claim. No runnable equivalent on BNB in this window | opML / zkML / Bittensor / Allora checked one by one | [[08-Results/01 - Evidence and Limits]] |
| **D21** | 17 Sep | x402 agent payments stay in the product | proven on forks of 97 **and** 56 against canonical Permit2 + proxy, including a zero-gas settlement for the payer | [[04-Signer-Service/01 - Signer Service]] |
| **D22** | 18 Sep | **BAS is the anchor**, not a hand-rolled registry. Contract count 3 → 2 | `timestamp` / `revokeOffchain` / `expirationTime` already exist there. Finding while reading it: **EAS only checks that a prerequisite exists, not that it is still alive** — that gap became our differentiator | [[01-Architecture/01 - Architecture]] |
| **D23** | 18 Sep | The learner pays for **learning**, never for the proof of it. Public verification stays free and wallet-less | the "seamless UX" wording of the track, and the fact that charging for truth is unverifiable | [[00-Overview/01 - Briefing]] |
| **D24 / D24.1 = A** | 16 → 19 Sep | `credentialStatus` follows the specification's Bitstring Status List; the list is **derived from chain state on every request** — and it is **two** lists, `revocation` (permanent) + `suspension` (recoverable) | one bit cannot hold both a permanent revocation and a recoverable issuer delisting | [[04-Signer-Service/S3 - Two status lists]] |
| **D26** | 19 Sep | Repository history starts 17 Sep, and we say so | commit history is judged as evidence of "built during the event" | [[08-Results/01 - Evidence and Limits]] |
| **D30** | 19 Sep | **The agent belongs to a third party; Lencana is the venue.** `delistIssuer()` added *before* any public deploy, giving a fourth verdict `ISSUER_DELISTED` | EAS only lets the original attester revoke, so the platform would otherwise have no power over someone else's agent | [[01-Architecture/01 - Architecture]] |
| **D31** | 19 Sep | **The platform fronts issuance gas** via `attestByDelegation`; the agent stays the `attester` and never touches BNB | "zero-BNB onboarding for an issuer" is only true if someone else broadcasts. It works because `onAttest` gates on `_issuer[attestation.attester]`, **not** `msg.sender` | [[04-Signer-Service/S4 - Delegated issuance]] |
| **D32** | 22 Sep | Two findings, not designs: (1) an EAS UID contains the mined `block.timestamp`, so **scripts may consume hashes, never UIDs** — `SeedDemo` runs twice; (2) `SoulboundCert.mint()` admits only `owner()`, so **the platform mints the artifact** once its issuers are third parties | measured on a clean fork; the earlier "`--slow` fixes it" claim was retracted | [[00-Overview/04 - Corrections]] |
| **D34** | 22 Sep | The learning surface is **typed data + hash-routed templates**, not hand-written pages. Course id `web3-dasar-2026` is the same constant `SeedDemo` hashes into `courseId` | a question from the builder ("a course should have many pages") exposed that the learning surface was **zero** | [[05-Course-Content/01 - Course Content]] |
| **D36** | 22-23 Sep | Delegated issuance proven on the **public** chain: 3 lesson credentials in one transaction, the agent's balance unchanged to the wei | a single-request path built with the batch builder produced `InvalidAddressError`; each shape now has its own builder | [[04-Signer-Service/S4 - Delegated issuance]] |
| **D37** | 23 Sep | **The issuer decides a grade, not us.** `CourseManifest` carries criteria/weights/`passMark`; `rubricHash` (policy only) is printed into the credential; `issue.js` **lost its `--score` flag** | the builder asked "isn't the course provider the one who supplies the rubric?" — and `passMark` turned out to be display text while the platform invented passing with a flag defaulting to 87 | [[05-Course-Content/K2 - The issuer manifest and rubricHash]] |
| **D38** | 23 Sep | `SettlementSplit`: fixed platform share in bps (cap 25%), **no debt ledger**, per-payment replay guard, `platformBps` can only ever be **lowered** | the x402 proxy has exactly one `payTo`, so someone must receive and divide; and "the agent's share" must not become a balance we owe | [[02-Contracts/C3 - SettlementSplit]] |
| **D39** | 24 Sep | The HTTP `402` handshake is executed end-to-end and the harness reads **money from the chain**, not from the server's own response | a `BigInt` serialization crash killed the process *after* a settlement had succeeded — money moved, client got no proof. Worst possible shape for a payment system | [[09-Testing/T6 - npm run x402]] |
| **D40** | 24 Sep | What is sold at that price is a **batch**, not the data. ≤ 25 reports per settlement | the free page returns the same thing anyone can compute themselves, so billing per report sells nothing; break-even at 190,659 gas/settlement ≈ **$5.24 of BNB** for a $0.001 fee | [[04-Signer-Service/S6 - x402 paid verification]] |
| **D41** | 24 Sep | "An agent grades" is allowed **because the judge can fail a submission**: negative control 4-8/100 on a fluent-but-empty essay, 91-100 on a substantive one. Model `openai/gpt-oss-120b`, `temperature 0`, fail-closed | a judge that cannot flunk is not judging. Measured spread is **9 points** (an earlier "±1" claim was mine and wrong); the decision is stable across 5 runs | [[04-Signer-Service/S5 - Grading and the model judge]] |

## Read this before adding a decision

- Check the numbers already used above (and in the essays) before taking a `D#`; a collided number is
  a defect, not a typo.
- A decision that changes a claim in `../README.md` or the UI must update that claim in the same
  commit, or open an item in [[10-Contributors/Open-Items/00 - Hub Open Items]].

**Related:** [[00-Overview/04 - Corrections]] · [[01-Architecture/01 - Architecture]] · [[07-Backlog/01 - Backlog]]
