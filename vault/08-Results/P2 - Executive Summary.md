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

**What is not true yet, in one breath (as of 30 Sep).** One fictitious issuer on BNB Chain **testnet**, no
real institution, the demo issuer's agent key is held by the platform, quiz answer keys ship in the browser
bundle *(1 Oct correction, B80: no longer — the keys live on the server only and `/grade` returns per-question
feedback after submission; retakes are unlimited, so a learner can still converge on the keys)*, a learner's identity is a device key with no recovery, we are our own payment facilitator, and
contract source is not verified on the explorer. Detail and dates: [[08-Results/01 - Evidence and Limits]]
and [[10-Contributors/Claims-Cheat-Sheet]].

*(Koreksi 30 Sep, B117 — dua kalimat di paragraf ini sudah tidak benar dan tidak boleh dikutip dari versi
lamanya: (1) "no enrolment record (progress is browser storage)" — sejak 28 Sep enrollment, progres dan usaha
hidup di Postgres di bawah tanda tangan peserta, dan penerbitan membacanya (`issue --from-attempts`,
[[09-Testing/T22 - signer attempts-check.js]]); (2) "the durable public host … is still a temporary tunnel" —
sejak 28 Sep dokumen disajikan dari tepi tetap `lencana-edge…workers.dev`, dan validator berkata
`outcome: VALID` terhadap host itu ([[09-Testing/T15 - 1EdTech validator]],
[[04-Signer-Service/S10 - Edge surface]]). Butir validator di atas juga menyebut "27 Sep": run itu sah,
tetapi hostnya sudah mati — yang bisa diulang orang hari ini adalah run 28 Sep di host tetap.)*

**Related:** [[00-Overview/06 - Business Process]] · [[00-Overview/08 - Submission Copy]]
