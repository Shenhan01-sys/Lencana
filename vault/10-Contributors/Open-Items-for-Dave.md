---
tags: [contributor, open-item, hub]
status: active
updated: 2026-09-26
---

# Open Items for the Frontend

Raised against `web/` while the vault was being restructured, and re-checked line by line on 26 Sep
against the files as they are now. Every row names what the product prints, what is actually true, and
the command that shows it. Nothing here is a style opinion.

**Ownership:** `web/index.html`, `web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts` are yours and
your version wins on merge (`-X theirs` for those files), then the harnesses get re-run. What must not
disappear is `#lms-mount` (`web/index.html:518`) and the `renderLmsRoute()` call (`web/src/main.ts:1180`)
— without them the learning surface renders nothing. Never `--force` `main`; prove a push with
`git ls-remote origin refs/heads/main` vs `git rev-parse HEAD`, not with silence.

## Peta dokumen

| # | item | evidence | status |
|---|---|---|---|
| **OI-1** | two credential documents typed into the page by hand | `web/src/main.ts:1104-1111`, `:2079-2105` | OPEN |
| **OI-2** | a route the server does not answer | `web/index.html:1347`, `:1358` vs `signer/src/server.js:289` | OPEN |
| **OI-3** | a simulated 256-bit list called on-chain | `web/src/main.ts:816`, `style.css:6134` vs `signer/src/statusList.js:34` | OPEN |
| **OI-4** | EVM reverts that no contract emits | `web/src/main.ts:907-945` vs the error table below | OPEN |
| **OI-5** | a learner, a grade and a rubric id that were never produced | `web/src/main.ts:745`, `:971`, `web/src/i18n.ts:584,947,955,1006` | OPEN |
| **OI-6** | URLs on a domain this repository does not serve | 20 occurrences: `main.ts` 17, `index.html` 2, `render.ts` 1 | OPEN |
| **OI-7** | native coin and prices that are not ours | `web/src/main.ts:2170` + the fee cells in the same panel | OPEN |
| **OI-8** | hero claims the product does not have | `web/index.html:237`, `web/src/i18n.ts:1018` | OPEN |
| **OI-9** | documents describing pages and logins that are not built | `FRONTEND_ITERATION.md:124` + its `file:///C:/…` links | OPEN |
| **OI-10** | a config preset pointing at addresses that are not ours | `web/src/config.ts:23-24`, `:34-35` | OPEN — needs your call |

## OI-1 — the hand-typed documents

`web/src/main.ts` renders the credential shape twice: a JSON-LD block at `:1104-1111` whose
`"score": "93/100 (Honors)"` and `"proofValue": "0x4e2...71b...1b"` are literal strings with an elided
hash, and the diploma modal at `:2079-2105` whose `:2085` carries
`statusListCredential: 'https://lencana.io/credentials/status/revocation#slot14'`.

Correcting what my first draft of this row claimed: those objects **do** have a `proof` block — that is
exactly what makes them convincing. The defect is that `proofValue` is a fixed literal and **nothing in
`web/src/` signs anything**; the only signature in the page is a string (`main.ts:1067`). A real proof
exists only for what the server emits at `GET /credentials/0x…` (`signer/src/server.js:276`), whose URLs
are built from `BASE_URL` (`:238`, `:245`) and currently resolve to `127.0.0.1` — which is the honest
state of the product.

**Fix:** fetch and render the real document. `signer/scripts/check.js` proves for the served document
that a flipped byte kills the signature and that the status **entry** id is not the list URL; a
hand-typed object fails none of that because it never reaches a test.

## OI-2 — the batch console advertises a route that is not answered

`web/index.html:1347` and `:1358` present `POST /api/v1/verify/batch`. The server's only verification
route is `POST /verify` (`signer/src/server.js:289`), and batch is accepted *inside* it — up to 25 hashes
per payment (`:33`). A reader who copies the URL from our own UI gets a 404.

## OI-3 — 256 bits labelled "derived directly from on-chain smart contract storage"

`web/src/main.ts:816` builds 256 cells and `style.css:6134` lays them out 16-wide, with a
**Simulate State Flip** button (`main.ts:877`); the caption in `FRONTEND_ITERATION.md:219-232` says the
matrix is derived from chain storage. `signer/src/statusList.js:34` sets `LIST_BITS = 16384` and the
served list is 2048 bytes of gzipped base64url (`:104`). A teaching animation is fine — say it is one,
or read the real thing with one `fetch` of `/credentials/status/revocation` and decode
`…statusList.encodedList` the way `check.js` does.

## OI-4 — revert strings: two real, two invented

Measured against the declared errors, not against memory:

| the UI prints (`web/src/main.ts`) | truth |
|---|---|
| `AttestationNotFound(0x7e3a1f8d9…)` (`:912`) | no error by that name anywhere in the tree. The dependency's is `NotFound()` — **no argument** (`lib/bas/src/Common.sol:16`). We report absence as `NOT_FOUND` in the verdict, which is a page state, not a revert |
| `ErrLocked(1)` (`:924`) | no such error. The artifact blocks with `NotTransferable()` (`contracts/SoulboundCert.sol:81`, used at `:165`, `:172`, `:189`) |
| `checkPrerequisites(…)` (`:942`) | no such function; the rule is applied inside `onAttest` (`contracts/CredentialResolver.sol:243`) |
| `NotAnIssuer(0xBadBot)` (`:934`), `PrerequisiteRevoked(…)` (`:945`) | **both real** — `error NotAnIssuer(address sender)` (`:142`), `error PrerequisiteRevoked(bytes32 prereqUid)` (`:145`); keep them, but print an address for the first and a 32-byte uid for the second |

The full honest set, all of it declared in `contracts/`: `NotAnIssuer(address)` · `UnknownSchema(bytes32)`
· `NotExpired()` · `BadAttestationData()` · `BadSchemaId(bytes32)` · `BadUID(bytes32)` ·
`BadDataLength()` · `PrerequisiteNotOurs(bytes32)` · `PrerequisiteRevoked(bytes32)` ·
`PrerequisiteIssuerDelisted(bytes32)` · `IssuerDelisted()` · `NotTransferable()` ·
`CredentialAlreadyMinted(bytes32)` · plus `NotFound()` from the dependency. No invented `0x` arguments.

## OI-5 — a learner, a grade and a rubric id that were never produced

`web/src/main.ts:745` sets the profile name to `'Rina Oktaviani'` (same string in
`i18n.ts:636/947/950/1209/1520/1523`), `:748` computes a `did:pkh:eip155:97:…` in the browser, `:971`
lists her with a truncated hash `0x0b95c8...67fa`, and `i18n.ts:955`/`:1528` print
`Rubric #0x91a7 · Score 93/100`. None of it comes from the system: the real `rubricHash` for
`web3-dasar-2026` is `0x2a45d0d00bc46f3d…` (printed by `npm run rubric`), the composite a learner
actually gets is computed by `web/src/score.ts`, and no DID is issued or resolved anywhere — the id our
system really uses is `keccak256` over `(holder, courseId)`, see
[[05-Course-Content/K1 - The content model]]. `:753` already builds its QR from
`window.location.origin`; use that pattern and label the seeded demo learner as one.

## OI-6 — the domain

`findstr /s /c:"lencana.io" web\src\main.ts web\src\render.ts web\index.html` → **20** (17 / 1 / 2), and
they are in user-facing output: the QR that 404s, the share URLs, the spec-compliance table
(`index.html:1550-1591`). This repository does not serve that domain; the page is built for Vercel
(`vercel.json`). Use `window.location.origin`, or label them illustrative.

## OI-7 — the money the product does not move

`web/src/main.ts:2170` prints "Live BNB Network Gas Price … (0.0005 tBNB)" and the batch panel quotes
per-settlement fees in BNB. What our payments move is **one demo ERC-20** (`contracts/DemoCourseToken.sol`,
open `mint`) priced in atomic units by `X402_PRICE` (`signer/src/server.js:39`); the only BNB in this
system is gas. Label the panel as network background and print the asset actually settled.

## OI-8 — claims that outrun the four scenes

`web/index.html:237` reads "AUTONOMOUS AI ACADEMY · FULLY ON-CHAIN DIPLOMAS · DAO-GOVERNED CURRICULUM",
and `i18n.ts:1018`/`:1591` say the work was "Evaluated by autonomous domain AI agent against on-chain
rubric". Three problems, all ours to lose: there is no curriculum vote (our own limits sheet forbids the
sentence — `vault/08-Results/01 - Evidence and Limits.md:170`), the credential is an off-chain signed
document *anchored* on chain (that distinction is the product's thesis, [[00-Overview/01 - Briefing]]
D15), and the judge is a model whose measured spread is 9 points on the same essay
([[09-Testing/00 - Hub Testing]]) — "autonomous" without that sentence is an overstatement.

## OI-9 — documents that describe unbuilt pages

`FRONTEND_ITERATION.md:124` promises "1EdTech conformance for credential issuance, verification, and
portfolio pages — 6 pages" while `web/src/main.ts` has no `#/developer` route, and its links are written
as `file:///C:/Project_Dave/lencana/…`, which resolves on exactly one machine. Make them repo-relative
(`vault/…`), and mark which of the six are intent rather than shipped — a judge who clicks a dead nav
item stops believing the pages that work. (The vault's own "email login" line is fixed: identity here is
a wallet, `main.ts:184`.)

## OI-10 — a preset pointing at addresses that are not ours

`web/src/config.ts:23-24` and `:34-35` set resolver `0xe01a16e50fd9d8c0ff4230874f8d8c086e811627` /
artifact `0x021356a0e3b9ab440a571d4af62b215841a7c891`. What is deployed and used by every harness is
`CredentialResolver 0x7CA624caFDe5cA3A27b33d26be56F73a90792065` / `SoulboundCert
0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c` (chain 97). If those two entries are meant to be *local
anvil* presets, say so in the label; if either is presented as the public testnet, a reader selecting it
sees "not found" for credentials that are live. Your call — I have not touched the file.

## Re-run before you push

```powershell
cd app/web && npx tsc --noEmit && npm run build && npx tsx scripts/probe.ts   # clean, clean, 59 checks (26 Sep)
cd app/signer && node scripts/check.js && node scripts/serve-probe.js         # 53 checks, 20 checks
cd app && forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com   # 97 passed
```
Numbers and what each one does *not* prove: [[09-Testing/00 - Hub Testing]]. Sentences we have banned
for ourselves, including "1EdTech compatible": [[08-Results/01 - Evidence and Limits]]. Depth on the
page itself: [[03-Frontend/FE6 - Quirks and open defects]].

**Related:** [[03-Frontend/01 - Frontend]] · [[10-Contributors/00 - Hub Contributors]] · [[Index]]
