---
tags: [results, summary]
status: active
updated: 2026-09-28
---

# P2 - Executive summary

**What Lencana is.** A micro-course platform whose output is a credential that keeps working after the
issuing institution's website is gone. The institution's own agent grades and signs; Lencana broadcasts
and pays the gas; anyone can check the result from a public chain without an account.

**The problem it removes.** A course certificate today is a file whose meaning depends on asking the
issuer — and the record behind it (rubric, weights, grade) is editable in the issuer's database without
leaving a trace. We read six open-source learning platforms at pinned commits and none of them lets a
stranger tell a valid credential from a withdrawn one; Moodle's own exporter says "Signed is not
implemented yet".

**What is provably built.**
- The grading policy is committed as `rubricHash` and printed inside the credential; material edits move
  the material hash, not the policy hash.
- Status is one chain read (`statusOf`, seven fields), and revocation is expressed by two Bitstring
  Status Lists whose served bitstrings are timestamped on chain.
- The learner gets a non-transferable ERC-721 + ERC-5192 artefact whose metadata is composed live, so a
  revoked credential does not present itself as valid in a wallet.
- Machine callers pay over x402 (`exact`, Permit2): the client signs two payloads and sends zero
  transactions; `SettlementSplit` divides and keeps nothing; the platform share can only ever go down.
- A credential issued by this backend was submitted to the 1EdTech Open Badges 3.0 validator and returned
  **0 errors, 0 warnings** (27 Sep, `npm run validator`).

**What is not true yet, in one breath.** One fictitious issuer on BNB Chain **testnet**, no real
institution, no enrolment record (progress is browser storage), we are our own payment facilitator, the
durable public host that the validator followed is still a temporary tunnel, and contract source is not
verified on the explorer. Detail and dates: [[08-Results/01 - Evidence and Limits]].

**Related:** [[00-Overview/06 - Business Process]] · [[00-Overview/08 - Submission Copy]]
