---
tags: [hub, acceptance-criteria]
status: active
updated: 2026-09-28
---

# 00 - Hub Acceptance Criteria

The hackathon rubric, and for each criterion the **evidence we actually have today** — not a wish list.
Part notes with the `AC-` prefix are still unwritten (tracked as documentation debt in
[[07-Backlog/03 - Findings and Tasks 2026-09-26]]); until then this page is the single place, because
inventing one file per criterion would put text in the vault that no run supports.

| criterion | strongest evidence available | where |
|---|---|---|
| **P1** on-chain / chain integration | `forge test` 100/0 on forks of 97 and 56 against real BAS; `npm run verify:deploy` 15/15 against chain 97 | [[09-Testing/T1 - forge test on chain 97]], [[09-Testing/T14 - verify the public deployment]] |
| **P2** clarity of the problem | the six-platform read, with commit SHAs | [[12-LMS-References/L8 - Lencana vs LMS]] |
| **P3** utility / money path | `npm run x402` 20/0: one payment, two verdicts, settlement + split read from chain | [[09-Testing/T6 - npm run x402]] |
| **P4** correctness of assessment | `rubric-check` 17/0 + `computeScore` reading the issuer's manifest | [[09-Testing/T5 - npm run rubric]], [[05-Course-Content/K4 - Scoring without the platform deciding]] |
| **P5** honest AI | `npm run judge` 7/0 with the negative control; `judge-variance` spread 9, decision stable | [[09-Testing/T11 - npm run judge]], [[09-Testing/T12 - npm run judge-variance]] |
| **P6** demonstrable product | web `probe.ts` 59/0 running the page's own `verify.ts` against the public chain | [[09-Testing/T4 - npm run probe]] |
| **P7** interoperability | `npm run validator`: `outcome: VALID`, 0 errors, 0 warnings — with the caveat that the host it followed is temporary | [[09-Testing/T15 - 1EdTech validator]] |
| **P11** who signs, who pays | `npm run delegate`: agent is `attester`, its balance unchanged to the wei, platform paid the gas | [[09-Testing/T10 - npm run delegate]] |

**Related:** [[00-Overview/02 - Roadmap to the Deadline]] · [[08-Results/01 - Evidence and Limits]]
