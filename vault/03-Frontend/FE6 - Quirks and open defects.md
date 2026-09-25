---
tags: [frontend, "FE6"]
---

# FE6 - Quirks and open defects

**Part of:** [[03-Frontend/01 - Frontend]]
**Source:** `web/src/main.ts:894`, `web/src/main.ts:2043`, `web/src/render.ts:217`, `web/index.html:1826`

**Summary:** Two kinds of content live in this page. The one [[FE1 - Verifier page and verify.ts]]
describes is exercised from Node against chain 97; the panels below are markup and string literals
that read as evidence to a visitor. For each case: what the UI prints, what the code produces, and the
open item tracking it (cites read in the current tree, 2026-09-25).

**Key points:**
- **Hand-typed credential document** — `CANONICAL_DEMO_JSONLD` (`web/src/main.ts:2043`),
  `RINA_CREDENTIAL_JSONLD` (`:1072`), `generateCanonicalJsonLd()` from a live `Report`
  (`web/src/render.ts:217`), inline copy (`web/index.html:1550-1591`). The UI prints `id`/`url` values
  on `https://lencana.io` (`web/src/main.ts:2048`, `web/src/render.ts:220`), a `statusListIndex: '14'`
  with an id ending `#slot14` (`:2085`), a `proof` whose `proofValue` is a fixed literal (`:2105`,
  `web/src/render.ts:295`), and `result.value: '93'` (`:2078`). Nothing in `web/src/` signs. One
  field **is** real: `0x0b95c83b…` is a live credential (`signer/scripts/check.js:37`,
  `signer/scripts/adopt.js:43`), which is what makes the rest convincing. The signed document is
  built and served by `signer/` (`signer/README.md:27`). →
  [[10-Contributors/Open-Items/OI-1 - Fabricated credential document]]
- **Payment console.** Prints `POST /api/v1/verify/batch [10 hashes]` (`web/index.html:1347`) and
  `WWW-Authenticate: x402 amount=0.0005 tBNB` (`:1358`), both also in the dictionaries. The route is
  `POST /verify` (`signer/src/server.js:273`, restated at `:304`) and the price is atomic units of
  the demo ERC-20 — `PRICE = 1000` at 6 decimals (`signer/src/server.js:38-39`) — not tBNB. The
  button runs four `setTimeout` steps (`web/src/main.ts:1003-1070`) and sends no request. →
  [[10-Contributors/Open-Items/OI-2 - Payment console shows a route that does not exist]]
- **Bitstring panel.** Headed "computed directly from live smart contract storage"
  (`web/index.html:1826-1829`) at a stated 256 bits (`:1847`), drawn as 256 cells in 16 columns
  (`web/src/main.ts:816`, `web/src/style.css:6134`). The real list is `LIST_BITS = 16384`
  (`signer/src/statusList.js:34`). "Simulate State Flip" (`web/index.html:1832-1834`) calls
  `toggleBitstringState()` (`web/src/main.ts:877`), which writes three entries of an in-memory array
  (`:880-886`) and a multibase string computed from the counters (`:873`). →
  [[10-Contributors/Open-Items/OI-3 - Bitstring visualizer mislabels a simulation]]

**Detail:**
- **Printed reverts** (`simulateAttack()`, `web/src/main.ts:894`): `AttestationNotFound(0x7e3a1f8d9...)`
  (`:912`) — no such error exists here, and BAS declares `NotFound()` with no argument
  (`lib/bas/src/Common.sol:16`); `ErrLocked(1)` (`:924`) — the contract reverts `NotTransferable()`
  (`contracts/SoulboundCert.sol:81`, raised at `:165`, `:172`, `:189`); `checkPrerequisites(refUID)`
  (`:942`) — the function is `_validatePrerequisite`, called from `onAttest`
  (`contracts/CredentialResolver.sol:348`, `:251`). Two are genuine: `NotAnIssuer` (`:934`) is
  `error NotAnIssuer(address)` (`:142`), though its printed argument is a 32-byte hash where the
  error carries an address; `PrerequisiteRevoked` (`:945`) is real and raised (`:145`, `:358`). →
  [[10-Contributors/Open-Items/OI-4 - Simulated EVM reverts]]
- **Fixed scores and a fixed person.** `93/100` with an honors level appears as dictionary strings
  (`web/src/i18n.ts:584`, `:1006`), page markup (`web/index.html:1461`, `:1467`) and terminal lines
  written by `simulateAiEvaluation()` (`web/src/main.ts:2324`, `:2340`); its component weights
  40/30/30 (`:2294-2321`) match neither course (`web/src/courses/web3-dasar.ts:42`,
  `web/src/courses/web3-lanjut.ts:37`). Measured for the flagship course: a model-graded composite of
  **94** against `passMark` 70 (`vault/08-Results/01 - Evidence and Limits.md:12`). `Rina Oktaviani`
  is a literal (`web/src/main.ts:745`, `web/src/i18n.ts:947`); nine further names and scores sit in
  `CANDIDATE_BATCH_DATA` (`:970-981`), whose verdict column is a string, not a read. The rubric
  reference `#0x91a7` is not the issued format — `shortHash()` gives 12 hex characters
  (`web/src/manifest.ts:126`), and criteria ends `[rubrik <12hex>]` (`signer/scripts/issue.js:241`). →
  [[10-Contributors/Open-Items/OI-5 - Invented numbers and an invented person]]
- **The domain.** Counted 2026-09-25 by a literal match over shipped files: **20** —
  `web/src/main.ts` 17, `web/src/render.ts` 1, `web/index.html` 2 (plus one in
  `FRONTEND_ITERATION.md:254`); that it is a domain we do not hold is recorded in
  [[00-Overview/04 - Corrections]]. → [[10-Contributors/Open-Items/OI-7 - A domain the project does not hold]]
- **Untracked quirks.** Nothing links to the learning surface: the nav offers `#/`, `#/courses`,
  `#/submit`, `#/verify`, `#/portfolio`, `#/agent-hub` (`web/index.html:43-49`) and `#/learn` appears
  only in a comment (`:517`). `PRESETS[1]`, labelled "BSC Testnet (97) — target submission"
  (`web/src/config.ts:30-37`), sets resolver and cert addresses different from `defaultEndpoint()`
  (`web/src/verify.ts:159-168`), so selecting it replaces the working default. And `report.limits`
  (`web/src/verify.ts:139`) is not read by the page at all.

**Related:** [[FE1 - Verifier page and verify.ts]] · [[FE2 - Learning surface router]] ·
[[FE4 - Mount contract with the maintainer]] · [[00-Overview/04 - Corrections]] ·
[[08-Results/01 - Evidence and Limits]] · [[10-Contributors/Open-Items/00 - Hub Open Items]]
