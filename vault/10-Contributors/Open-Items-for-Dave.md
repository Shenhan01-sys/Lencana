---
tags: [contributor, open-item, hub]
status: active
updated: 2026-09-26
---

# Open Items for the Frontend

Raised against `web/` while the vault was being restructured. Every row names what the product prints,
what is actually true, and the command that shows it. Nothing here is a style opinion — if a line is
wrong, the evidence column says so.

**Ownership:** `web/index.html`, `web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts` are yours and
your version wins on merge (`-X theirs` for those files), then the harnesses get re-run. What must not
disappear is `#lms-mount` (`web/index.html:518`) and the `renderLmsRoute()` call (`web/src/main.ts:1180`)
— without them the learning surface renders nothing. Never `--force` `main`; prove a push with
`git ls-remote origin refs/heads/main` vs `git rev-parse HEAD`, not with silence.

## Peta dokumen

| # | item | evidence | status |
|---|---|---|---|
| **OI-1** | a credential document is typed into the page by hand | `web/src/main.ts:2084-2096` | OPEN |
| **OI-2** | a route the server does not answer | request label in the batch console panel | OPEN |
| **OI-3** | a simulated 256-bit list called on-chain | `FRONTEND_ITERATION.md:219-232` vs `signer/src/statusList.js:34` | OPEN |
| **OI-4** | EVM reverts that no contract emits | see the error table below | OPEN |
| **OI-5** | a person and a grade that were never assessed | `web/src/main.ts:740-775` | OPEN |
| **OI-6** | URLs on a domain this repo does not serve | 20 occurrences in 3 shipped files | OPEN |
| **OI-7** | native coin and prices that are not ours | `web/src/main.ts:2170` + fee table | OPEN |
| **OI-8** | hero claims the product does not have | `web/index.html:237` | OPEN |
| **OI-9** | docs that describe pages that are not built | `vault/00-Overview/01 - Briefing.md:64`, `FRONTEND_ITERATION.md:124` | OPEN |

## OI-1 — the fake document (the one that can cost credibility)

The diploma modal renders an object that *looks* like our Open Badges 3.0 credential:
`:2085` `"id": "https://lencana.io/credentials/0x…"`, `:2086` + `:2089` a `verificationMethod` whose
`controller` is `https://lencana.io#controller`, `:2096` a `statusListCredential` ending `#slot14`.
None of those URLs exist. Our real document is served by `GET /credentials/0x…`
(`signer/src/server.js:276`) and its own URLs are built from `BASE_URL` (`:238`, `:245`) — which today
resolves to `127.0.0.1`, and that is the honest state of the product.

**Fix:** fetch the real document and render it. Two properties make hand-typing dangerous: a real
`proof` object exists only for the served document, and `signer/scripts/check.js:256-266` asserts the
status **entry** id is not the list URL — a hand-typed object fails no test because it never reaches one.

## OI-2 — the batch console advertises a route that is not answered

The only verification endpoint is `POST /verify` (`signer/src/server.js:289`); batch is accepted
*inside* it (≤ 25 hashes, `:33`). A panel labelled `POST /api/v1/verify/batch` teaches a reader a URL
that 404s. Confirm the exact line with `findstr /s /n /c:"verify/batch" web\src\main.ts`.

## OI-3 — 256 bits called "derived directly from on-chain smart contract storage"

`signer/src/statusList.js:34` sets `LIST_BITS = 16384`; the served list is 2048 bytes of gzip+base64url
(`:104`). A 16×16 grid with a **Simulate State Flip** button is a teaching animation — say that in the
caption. Reading the real one is one `fetch`: `/credentials/status/revocation`, whose `…statusList.encodedList`
is what `check.js` decodes.

## OI-4 — revert strings: two real, two invented

| the UI prints | truth |
|---|---|
| `AttestationNotFound(0x7e3a1f8d9…)` | the name is real, in the dependency (`lib/bas/src/EAS.sol:552,624`), and it carries **no argument**. Ours is `UnknownAttestation(bytes32 uid)` (`contracts/CredentialResolver.sol:136`) |
| `ErrLocked(1)` | no such error in this repository. The artifact blocks with `NotTransferable()` (`contracts/SoulboundCert.sol:103`) |
| `checkPrerequisites(…)` | no such function; the check is inside `onAttest` (`contracts/CredentialResolver.sol:243`) |
| `NotAnIssuer(attestation.attester)`, `PrerequisiteRevoked(prereq)` | **real** — `:135` and `:149`; keep these, they are the best two things in the playground |

Full honest set: `NotAnIssuer(address)` · `UnknownAttestation(bytes32)` · `NotExpired()` ·
`PrerequisiteRevoked(bytes32)` · `PrerequisiteNotOurs(bytes32)` · `PrerequisiteIssuerDelisted(bytes32)` ·
`BadDataLength()` · `IssuerDelisted()` · `NotTransferable()` · `CredentialAlreadyMinted(bytes32)`.
Every name is in `contracts/`, no invented `0x` arguments.

## OI-5 — an invented learner and an invented grade

`:740` a hardcoded address, `:746` the name `'Rina Oktaviani'`, `:748` a `did:pkh:eip155:97:…` string
computed in the browser, `:770-775` a share line that calls the issuing organisation "Lencana
Decentralized Protocol". Nothing in the credential system knows a name or a DID.
`:753` already builds its QR from `window.location.origin` — that is the pattern to follow: show a real
hash, a real verdict, and "demo learner" where the learner is one of the seeded addresses.

## OI-6 — the domain

`findstr /s /c:"lencana.io" web\src\main.ts web\src\render.ts web\index.html` = **20** (17 / 1 / 2), and
it is in user-facing output: a QR that 404s, share URLs, the spec-compliance table. We do not serve that
domain; the page is built for Vercel (`vercel.json`). Use `window.location.origin`, or label the URLs
`illustrative`.

## OI-7 — the money the product does not move

`:2170` prints "Live BNB Network Gas Price … (0.0005 tBNB)" and the batch panel quotes per-settlement
fees in BNB. What our payments move is **one demo ERC-20** (`contracts/DemoCourseToken.sol`, open
`mint`) at `X402_PRICE` atomic units (`signer/src/server.js:39`); the only BNB in this system is gas.
Label the panel "illustrative network data" and print the asset actually settled.

## OI-8 — the hero badge

`web/index.html:237` reads "AUTONOMOUS AI ACADEMY · FULLY ON-CHAIN DIPLOMAS · DAO-GOVERNED CURRICULUM".
The third is explicitly forbidden in our own limits sheet (`vault/08-Results/01 - Evidence and Limits.md:170`:
never write "kurikulumnya dipilih lewat voting" — there is no voting), the second is not what we ship
(the credential is an off-chain signed document anchored on chain; that distinction is the product's
thesis, see [[00-Overview/01 - Briefing]] D15), and the first describes a curriculum committee we do not
have. Pick claims the four scenes can survive.

## OI-9 — documents that describe unbuilt pages

`vault/00-Overview/01 - Briefing.md:64` still says "**Sign in.** Email login. The backend creates an
address for the learner" — there is no email path; identity is a wallet (`web/src/main.ts:184`), which is
also what the vault now records. `FRONTEND_ITERATION.md:124` promises "6 pages" of which two
(`#/developer`, `#/verify?mode=advanced`) are not in the router's route list, and its links point at
`file:///C:/Project_Dave/…`, which resolves on one machine on earth. Make them repo-relative
(`vault/…`) and say which pages are intent vs shipped — a judge who clicks a nav item that 404s stops
believing the pages that work.

## Re-run before you push

```powershell
cd app/web && npx tsc --noEmit && npm run build && npx tsx scripts/probe.ts   # clean, clean, 59 checks (26 Sep)
cd app/signer && node scripts/check.js && node scripts/serve-probe.js         # 53 checks, 20 checks
cd app && forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com   # 97 passed
```
Numbers and what each one does *not* prove: [[09-Testing/00 - Hub Testing]]. Sentences we have banned
for ourselves, including "1EdTech compatible": [[08-Results/01 - Evidence and Limits]].

**Related:** [[03-Frontend/01 - Frontend]] · [[Index]]
