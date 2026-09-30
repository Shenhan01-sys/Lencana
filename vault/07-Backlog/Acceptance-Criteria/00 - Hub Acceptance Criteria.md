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

| criterion | strongest evidence available — **each figure carries the day it was printed** | where |
|---|---|---|
| **P1** on-chain / chain integration | `forge test` on a fork of 97: **120 passed / 0 failed** in 6 suites (30 Sep; 16 of them are `CourseDeposit`, a contract that is **not deployed**). Forks of 97 **and** 56: 104/0 each (28 Sep — 56 not re-run since). `npm run verify:deploy` 15/15 against chain 97 (28 Sep) | [[09-Testing/T1 - forge test on chain 97]], [[09-Testing/T14 - verify the public deployment]] |
| **P2** clarity of the problem | the six-platform read, with commit SHAs | [[12-LMS-References/L8 - Lencana vs LMS]] |
| **P3** utility / money path | `npm run x402` 20/0 (28 Sep): one payment, two verdicts, settlement + split read from chain | [[09-Testing/T6 - npm run x402]] |
| **P4** correctness of assessment | `rubric-check` **17/0** (30 Sep) + `computeScore` reading the issuer's manifest | [[09-Testing/T5 - npm run rubric]], [[05-Course-Content/K4 - Scoring without the platform deciding]] |
| **P5** honest AI | `npm run judge`: negative control holds — hollow essay **3,0** mean vs substantive 100, 97-point separation, decision right in 5/5 runs (30 Sep); the 24 Sep run printed 7/0 with a spread of 9 | [[09-Testing/T11 - npm run judge]], [[09-Testing/T12 - npm run judge-variance]] |
| **P6** demonstrable product | web `probe.ts` **86/0** (30 Sep, `numbers.json`) running the page's own `verify.ts` against the public chain, plus the learning client and the publisher registry; one full learner flow over HTTP: `verify:attempts:live` 67/0 (29 Sep) | [[09-Testing/T4 - npm run probe]], [[09-Testing/T22 - signer attempts-check.js]] |
| **P7** interoperability | `npm run validator`: `outcome: VALID`, 0 errors, 0 warnings, with the document, its `verificationMethod` and both status lists read from the **durable** host (28 Sep); `verify:edge` **9/0 · 19 dari 19** papers externally checkable (30 Sep, `numbers.json`) | [[09-Testing/T15 - 1EdTech validator]], [[09-Testing/T18 - signer verify-edge.js]] |
| **P11** who signs, who pays | `npm run delegate`: agent is `attester`, its balance unchanged to the wei, platform paid the gas (23 Sep, not re-run) | [[09-Testing/T10 - npm run delegate]] |

*(Koreksi 30 Sep, B117 — tabel ini tadinya memuat angka tanpa tanggal dan tiga di antaranya basi: `forge test`
"100/0", web probe "59/0", dan catatan P7 "the host it followed is temporary". Host itu permanen sejak
28 Sep (B51). Angka di atas dicetak ulang hari ini atau diberi tanggal run aslinya; yang bertanggal lama
memang belum diulang, dan itu ditulis, bukan dirapikan.)*

**Related:** [[00-Overview/02 - Roadmap to the Deadline]] · [[08-Results/01 - Evidence and Limits]]
