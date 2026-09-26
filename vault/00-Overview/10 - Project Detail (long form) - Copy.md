# Lencana — course credentials that stand on their own

> Finish the course, get the credential, rubric signed, status on BNB Chain, nothing rewritten quietly.

A micro-course platform for institutions that want their certificates to outlive their own websites. The
institution's **own agent** grades and signs each credential; Lencana relays it and pays the gas.
Repo `github.com/Shenhan01-sys/Lencana` · **BNB Smart Chain testnet, chain 97**.

## Why

A finished course leaves the learner holding a PDF. To check it, someone must find the issuer, ask, and
believe the answer — and the record underneath (rubric, weights, grade) sits in the issuer's database and
can change afterwards, silently. Revocation is barely modelled either: we read six open-source learning
platforms at pinned commits (Moodle, Open edX, Canvas, Chamilo, Frappe LMS, LearnHouse) and in none can a
stranger tell whether a credential is still valid without asking its issuer. Moodle's badge exporter says
it outright: *"Signed is not implemented yet."*

## What we built

1. **The rubric is sealed with the result.** `rubricHash` — a keccak over the grading policy alone — is
   printed into the credential's `achievement.criteria`. Fixing a typo in the material moves the material
   hash, **not** the policy hash; editing a rubric moves both, so a later cohort is visibly graded under
   different rules.
2. **The issuer signs, not the platform.** `attestByDelegation` on BNB Attestation Service (a public
   EAS 1.3.0 deployment) records the institution's agent as `attester` while Lencana broadcasts — the
   issuer needs no wallet and no gas money.
3. **The verdict is a chain read.** One `statusOf(credentialHash)` answers `exists / revoked / expired /
   issuerDelisted / issuer / issuedAt / expiresAt`. The verifier page's own module (`web/src/verify.ts`,
   no DOM, no framework) is the same file our harness runs against public chain 97 — four verdicts,
   including *valid while its prerequisite has been revoked*.
4. **Revocation is expressed, not implied.** Two Bitstring Status Lists — `revocation` (permanent) and
   `suspension` (recoverable) — are rebuilt from chain state on every request, and both bitstring hashes
   are timestamped on chain, so a served list cannot be retro-dated.
5. **The artefact.** The credential is Open Badges 3.0 / VC 2.0 signed with `eddsa-rdfc-2022`, held off
   chain. Learners also get an ERC-721 + ERC-5192 soulbound token per credential, mintable only while it
   is live and never transferable — a displayable achievement, not a diploma.
6. **Machine callers pay.** `POST /verify` answers `402 Payment Required`; the client signs two EIP-712
   payloads and sends **zero transactions**; the x402 proxy settles and `SettlementSplit` divides.

## Contracts (chain 97, matched against `broadcast/DeployCredentials.s.sol/97/run-latest.json`)

| contract | address | job |
|---|---|---|
| CredentialResolver | `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` | issuer admission, the 7-field status read, prerequisite enforcement EAS lacks |
| SoulboundCert | `0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c` | refuses a credential that is not live; transfers always revert |
| SettlementSplit | `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE` | one payment in, divided, **keeps nothing**; `platformBps()` = 1000, cap 2500, can only be lowered |
| DemoCourseToken | `0xEd19cDeB8b4Bb3355651680b089222d1140bCDDe` | demo ERC-20 the fee is paid in — open `mint`, never meant for mainnet |

Not ours: BAS `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD`, Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`, x402 proxy `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`.

One settlement + split measured **190,659 gas**. At a $0.001 fee the break-even BNB price is ≈ **$5.24**,
so verification is sold **in batches** (≤25 reports per payment), not per lookup — and gas is a cost of
issuance, never a percentage skimmed off the issuer's share.

## The courses

2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 rubric-scored essays,
all six lesson kinds used (printed by `scripts/inventory.ts`, not typed).

## Measured (26 Sep, from the repo root)

`forge test --evm-version cancun --fork-url <97>` **97 / 0** · web `probe.ts` **59 / 0** ·
`rubric-check.ts` **17 / 0** · signer `check.js` **53 / 0** (one flipped byte kills the signature) ·
`npm run x402` **20 / 0**, one payment buying two credentials with different verdicts ·
`npm run judge` **7 / 0** — negative control: a fluent but empty essay scores **8/100** ·
`judge-variance`: the same essay scored **91–100** over 5 runs while the pass/fail decision never moved.

## Limits — read before believing the above

The 1EdTech validator has **not** been run against our document: the agent record was created with a
loopback `verificationMethod`, and document URLs are written at issuance — so: new agent under a public
URL, fresh issuance, then the upload. Until that lands we say *built to the specification*, never
*compatible*. No real institution and no real learner: the publisher is fictitious and labelled so, graded
essays are fixtures. **No enrolment record** — progress is `localStorage`, labelled *not evidence*, our
largest product hole. On the paid path we are our own facilitator. Testnet only, and source is unverified
on the explorer — so check us by running the commands above. The grading **method** (which rubric, which
model) sits in our logs and the attestation provenance, not inside the credential.
