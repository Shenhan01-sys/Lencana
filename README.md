# Lencana

**Learning credentials that anyone can verify — no wallet, no login, and without having to trust
us.**

A micro-course platform where **the issuer of each credential is an AI agent**. Credentials follow
the **Open Badges 3.0 / W3C Verifiable Credentials 2.0** standard, while **who is allowed to
issue** and **whether a certificate has been revoked** are recorded on **BNB Smart Chain**. A
recruiter verifies a certificate by opening a URL in a browser — that is the whole flow.

Built for the **Indonesia Web3 Hackathon 2026** — *Consumer Apps* track (· *AI Agents*), on BNB
Chain.

> **Status 28 Sep.** The on-chain layer is deployed on BNB Chain testnet (chain 97) and every number
> below is printed by a command that ran. What changed this week is availability, not features: the
> credential-signing backend now publishes its documents to a **durable public host**
> (`https://lencana-edge.hansgunawan775.workers.dev`), and a third-party validator — 1EdTech's
> `vc.1ed.tech` OB 3.0 inspector — returned **`outcome: VALID`, 14 checks, 0 errors, 0 warnings** for
> a credential issued under it, with the document, its `verificationMethod` and both status lists all
> read over the public internet (`npm run validator -- --record`, ledger:
> [`vault/09-Testing/T15%20-%201EdTech%20validator.md`](vault/09-Testing/T15%20-%201EdTech%20validator.md)).
>
> What we still forbid ourselves from saying, and why, is written next to the evidence rather than
> footnoted: that validator is a member tool, not a conformance certification; **2 of the 8 papers we
> hold** are currently checkable end-to-end by a stranger — the other six print hosts that are
> loopback or a dead tunnel, and `publish` cannot fix a URL that is already inside a signed document
> ([`vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md`](vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md)
> B51/B54); and the demo corpus's artefacts live on a contract deployed **before** our own
> course-granularity and batching rules existed, so those rules are proven in source, in fork tests
> and on one live instance — not on the old one (decision D46).

---

## Why this exists

A PDF certificate is forged with Photoshop. A certificate in the issuer's database is forged
**by the issuer itself**, or by a compromised admin. An NFT fixes neither — it only moves the
question to: *who may mint this, and how does a checker know it is genuine?*

"Because blockchain, because NFT" does not survive scrutiny. So this project answers **four
mechanical questions** instead of one slogan:

| # | question | answer | where |
|---|---|---|---|
| a | Who may issue, and how is that bound on-chain? | Address whitelist; an unapproved issuer makes the transaction **revert** | `contracts/CredentialResolver.sol` |
| b | What stops a holder selling or moving the certificate? | **Soulbound** NFT (ERC-5192): transfer, approval **and burn** are all rejected | `contracts/SoulboundCert.sol` |
| c | How does someone verify without a wallet and without crypto? | Static page, **one `eth_call`** straight to the chain — our backend is not in this path | `web/` |
| d | What happens when a credential is revoked — and can that revocation be denied? | `revoke()` on BAS; **there is no `unrevoke`** | third-party primitive + `CredentialResolver` |

## Proven

Every number below is the output of a command that was run, not a plan.

| command | result |
|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **49 passed / 0 failed** (offline, 28 Sep: 27 artefact + 22 settlement split) |
| `forge test --evm-version cancun --fork-url <public chain 97>` | **104 passed / 0 failed** on **chain 97** (28 Sep; 5 suites — 27 artefact, 22 settlement, 8 split-on-97, 9 end-to-end, 38 resolver) |
| `forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/` | **104 passed / 0 failed** on **chain 56** (28 Sep), same suites, same composition |
| `npm run probe` in `web/` | **59 checks / 0 failed** against **public chain 97** (28 Sep, re-run today) — four verdicts exercised (`VALID`, `REVOKED`, `ISSUER_DELISTED`, "valid but its prerequisite is revoked") **plus an audit of the course content and of who holds grading authority**: every lesson slug unique, every quiz answer inside the option range, every rubric summing to 100, the demo learner's `credentialHash` **recomputed from the course data** and asserted equal to the attestation on chain, and every course required to have an issuer manifest whose `rubricHash` a credential can point at. Earlier runs: 51 (22 Sep), 41 on a fork (19 Sep) |
| `npm run rubric` in `web/` | **17 checks / 0 failed** — the grading rule as arithmetic: both sides of the pass mark (69.6 → 70 passes, 68.8 → 69 does not), refusal to score an incomplete submission, refusal to score a manifest whose weights sum to 90, and `rubricHash` sensitivity: flipping an answer key changes it, fixing a typo in the reading material does not |
| `npm run inventory` in `web/` | **2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 rubric-scored essays**, all six lesson kinds used. Printed from the data, not typed into a document — which is the only reason a page count may appear in this README |
| `npm run check` in `signer/` | **76 checks / 0 failed** against **public chain 97** (28 Sep; it grows with the watched set — the authoritative number is whatever the run prints) — OpenBadgeCredential 3.0 built and signed with `DataIntegrityProof` + `eddsa-rdfc-2022`; tampering, a swapped verification method and an unlisted key all fail to verify; served bits are read **from `statusOf()` on the deployed resolver**, every credential's bit is checked **at the index the document itself claims**, and rendering the watched set twice (or in a different order) must produce the **same** bitstring hash |
| `npm run delegate` in `signer/` | green on public 97 (22–23 Sep): batch `tx 0xe31a917e…` (3 lesson credentials, 1,024,813 gas) and single `tx 0xbe44e128…` (370,131 gas). Read back from chain: `attester` is the **agent**, the agent's balance is **unchanged to the wei**, `lessonOf(uid)` equals the lesson id derived from the course material, and the attester nonce advanced once per request |
| `SettlementSplit` fork tests | 8 passed on **97 and 56** (28 Sep) against canonical Permit2 + canonical `x402ExactPermit2Proxy` (not our copies): settlement lands in the split and divides 90/10, with the client's transaction count never moving |
| `forge script script/PaidVerificationDemo.s.sol --broadcast` | executed on public 97 (23 Sep): 2,806,675 gas **paid by the platform**, settlement `tx 0x32fb6fc0…` status 1, and RPC read-back shows issuer `900` / platform `+100` / split `0` / `splitDone(ref)=true`. The demo client held no BNB and sent no transaction |
| `npm run x402` in `signer/` | **20 checks / 0 failed** against the running server, paying on public chain 97 (24 Sep) | the paid handshake happens, and what it sells is **batch**, not data: `402` + `accepts[]` when unpaid; then one settlement (`settleTx 0x3486ff75…` 114,728 gas + `splitTx 0xb2f045d0…` 75,931 gas = **190,659 gas = 0.0000190659 BNB, measured from receipts**) serves `credentialHashes: [a, b]` and returns two reports with **different verdicts** (`REVOKED`, `VALID`) — proof it isn't one result copied twice — while issuer revenue rises by exactly **one** price (900), not two. On chain, not per the response: issuer +900, platform +100, client −1000 holding **0 BNB, 0 transactions** |
| `node scripts/issue.js` in `signer/` | **one command, green on public 97** (21 Sep): score → attestation under the **agent's own key** (gas 316,384) → signed document → both status lists → each list's bitstring hash anchored to BAS via `timestamp()` and **read back** (gas ≈45,900). The anchored hash is the hash of the list the server actually serves — that property was broken until it was measured |
| `npm run probe:serve` in `signer/` | **48 checks / 0 failed** (28 Sep) against the running server — same assertions, everything over HTTP, so the issuer document and the two status lists are verified the way a third-party tool would verify them. Since B48 it also requires **every** agent in `.keys/` to answer at its own URL and verifies a credential against the issuer document *that credential points at* |
| `forge script … --broadcast` on **public chain 97** | deploy succeeded (21 Sep) · 4,191,202 gas · **≈0.00042 BNB** at the 0.1 gwei the testnet quoted. Re-verified independently from the RPC by a separate script (**13/13**), because a build log saying "SUCCESSFUL" is not evidence |
| `npm run validator` in `signer/` | **10 checks / 0 failed**, and the third party's own verdict: **`outcome: VALID` · 14 checks · 0 errors · 0 warnings** (28 Sep, two credentials: `0xd0bce6f4…` and `0x44d4946e…`). The harness reads the document back over HTTP, follows the URLs inside it, uploads it, and polls `/api/validate` — it does not read the verdict off the HTML page, which prints a conformance sentence as a template for *any* upload |
| `npm run publish:edge` in `signer/` | **26 / 27 routes read correctly back through the worker** (28 Sep; the 27th is a course that no longer exists in the catalogue and is reported as such, not counted green), both status lists `matchesChainNow`. Signs in Node, writes Workers KV, then verifies over the URLs a stranger would click |
| `npm run verify:edge` in `signer/` | **5 / 0 failed**, plus the measurement we print rather than hide: **2 of 8 papers** in the store are currently checkable end-to-end by someone else (3 print `127.0.0.1`, 3 print a tunnel host that now returns `ENOTFOUND`) |
| `npm run verify:live-cert` in `signer/` | **17 / 0 failed** on the artefact layer a stranger can open in an explorer: code length equals our build artifact, `mintBatch`/`lessonOf`/`attestationOf` present, `ownerOf == holderOf`, `tokenId == uint256(credentialHash)`, `external_url` byte-for-byte the URL the validator followed, non-owner `mint` rejected with `NotIssuer` |
| `npm run verify:deploy` in `signer/` | green (28 Sep) — every quoted address re-read from chain, with expectations parsed from our own source; it also asserts the *limit*: the deployed demo certificate does **not** contain the D42/D43 markers, so if that ever changes the documents have to change in the same commit |
| files in the repo | **250 tracked** (`git ls-files`, 28 Sep). No `node_modules/`, `out/`, `cache/`, `broadcast/`, `dist/`, `.env`, `signer/.keys/`, `signer/.store/` — which means the numbers above are re-runnable **with our `.env`, our keys and our credential store**; a fresh clone needs its own issuer key, a funded wallet and `npm run issue` before any of it prints |

The fork tests call **BAS (BNB Attestation Service, a fork of EAS 1.3.0) exactly as deployed on
chain** — not a copy we deployed ourselves. Those are also the addresses a judge can open.

**What we still forbid ourselves from saying.** The 1EdTech OB 3.0 validator was first run on 27 Sep
and the document came back with **2 errors** (`credentialStatus` must be one object; the bitstring was
8× shorter than BSL's minimum). Both were real and ours. Since then, two credentials issued under the
durable host have come back **`outcome: VALID` — 14 checks, 0 errors, 0 warnings** (28 Sep), with the
document, the `verificationMethod` and both status lists fetched over the public internet. So the
sentence we allow is *"a credential from this backend passes the 1EdTech OB 3.0 validator"*;
**not** "certified", **not** "conformant", **not** "1EdTech compatible" — that tool is a member
validator, not a conformance certification, and its response reports counts without itemising which
checks passed. Also unproven, and said out loud: only **2 of the 8 papers** we hold are currently
checkable end-to-end by someone else (B54); the paid path has no third-party facilitator and no
outside payer; the graded essays are fixtures judged by a model at temperature 0, not real learners;
and the demo corpus's artefacts sit on a contract deployed before our own granularity/batching rules,
so those rules are proven in source, in fork tests and on one live instance — not on that one (D46).
Details: [`vault/10-Contributors/Claims-Cheat-Sheet.md`](vault/10-Contributors/Claims-Cheat-Sheet.md)
and [`vault/08-Results/01%20-%20Evidence%20and%20Limits.md`](vault/08-Results/01%20-%20Evidence%20and%20Limits.md).

## How it works

```
OpenBadgeCredential JSON (off-chain, signed by the issuer's key)
        │ keccak256
        ▼
   credentialHash ──► attest() ──►  BAS on BNB Chain  (owned by someone else)
                                        ▲
             EAS calls onAttest()        │  issuer whitelist
             BEFORE the attestation      │  + revocation-aware prerequisite chain
             is accepted                 │
                                  CredentialResolver.sol  (ours)
                                        │
                        statusOf() / holderOf()  ◄── ONE eth_call, no wallet
                                        │
                          SoulboundCert.sol ── mint() REFUSES a dead credential
```

**The one thing not to get backwards:** the credential is the **JSON document**, not the NFT. The
chain does only three things JSON cannot — an issuer registry that cannot be censored, a status bit
the issuer cannot hide, and a timestamp. The soulbound NFT is the **artifact** the learner sees and
owns, and the contract refuses to mint an artifact for a credential that is not live.

### 🔴 A real gap in EAS that we close

This was a finding, not a plan — and it is now the main technical differentiator. EAS checks that a
prerequisite **exists**, nothing more:

```solidity
// EAS.sol, _attest()
if (request.refUID != EMPTY_UID) {
    if (!isAttestationValid(request.refUID)) { revert NotFound(); }
}
// and
function isAttestationValid(bytes32 uid) public view returns (bool) { return _db[uid].uid != EMPTY_UID; }
```

So plain EAS **allows** an advanced certificate to be issued on top of a prerequisite that was
**revoked**, that **expired**, that **belongs to someone else**, or that is simply some unrelated
attestation on the chain. All four are rejected by `CredentialResolver`, and each rejection is
**proved by a revert in fork tests on two chains**.

We accept the consequence: *"non-repudiable revocation"* is **default EAS/BAS behaviour, not our
discovery**. Ours are the issuer whitelist, the revocation-aware prerequisite chain, and the
one-call wallet-free verification.

## Running it

Requirements: **Foundry 1.5.1** (`forge`/`cast`/`anvil`), **Node 22**, Python 3.12 for the
verification scripts.

```bash
npm install                                  # OpenZeppelin 5.1.0
forge install foundry-rs/forge-std --no-git  # --no-git is required while the folder is not a git repo

npm test                                     # 49 tests, offline, ~35 ms
npm run test:fork:testnet                    # 104 tests against public chain 97
npm run test:fork:mainnet                    # 104 tests against public chain 56
```

> ⚠️ **`--evm-version cancun` is mandatory for fork tests**, not decoration. Without it, calls that
> move variable-sized data fail with `EvmError: NotActivated`, which **looks exactly like "that
> function does not exist on the deployed contract"**. Our own build stays on `shanghai`.

Prove it without funds and without a real deploy — fork chain 97 into a local anvil:

```bash
anvil --fork-url https://bsc-testnet.publicnode.com --port 8545 --chain-id 97 --silent

set DEPLOYER_PRIVATE_KEY=<anvil test key #0>
set ISSUER_ADDRESS=<anvil test key #1 address>
forge script script/DeployCredentials.s.sol:DeployCredentials --rpc-url http://127.0.0.1:8545 --broadcast

set ISSUER_PRIVATE_KEY=<anvil test key #1>
set ISSUER_B_PRIVATE_KEY=<anvil test key #2>
set RESOLVER_ADDRESS=<from above>
set CERT_ADDRESS=<from above>
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast
```

**`SeedDemo` is run TWICE, and that is a property of EAS, not of the script.** An attestation UID
is `keccak256(schema, recipient, attester, block.timestamp, expirationTime, revocable, refUID,
data, bump)` — it contains the timestamp of the **mined** transaction, which the script cannot know
while it is still simulating. Two steps need a real UID: issuing the advanced course *on top of*
the basic one (`refUID`), and revoking the basic one. So the first run seeds everything that needs
no UID and stops; the second run finds those attestations already on chain, reads their real UIDs,
and finishes the chain, the revocation and the report. The script is idempotent from there on.

It does **not** broadcast stale calldata when run once, and `--slow` is neither required nor
sufficient — both were measured on a clean fork (19 Sep): one run with `--slow` still leaves
pass 1's job unfinished. What the page consumes is the credential **hash**, which is deterministic;
that is why the printed UIDs carry a warning and the hashes do not.

### Verification page

```bash
cd web && npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # dist/ = static page, hostable anywhere
npm run probe     # test the data layer from Node, no browser
```

This page **has no backend, and deliberately does not need one** — that is the product. The RPC URL
and contract addresses live in `localStorage` via the *verification configuration* panel, because
our contracts were not deployed when the page was written. The page **deliberately uses no sample
data**: a fake number that looks convincing is worse than an empty page that is honest.

`npm run probe` runs **the same file** the page uses (`web/src/verify.ts`) against the same RPC. So
"the page reads the right data" is **testable**, rather than inferred from how it renders — and that
is exactly how the probe caught bugs invisible to `tsc` and `vite build`
([`vault/06-Spec-Research/R6 - Toolchain traps that cost time.md`](vault/06-Spec-Research/R6%20-%20Toolchain%20traps%20that%20cost%20time.md)).

## What is in this repo

```
contracts/
  CredentialResolver.sol     issuer whitelist + prerequisite chain + statusOf()/holderOf()
  SoulboundCert.sol          ERC-721 + ERC-5192; mint refuses a dead credential; no transfer/burn
  interfaces/ICredentialRegistry.sol
lib/bas/src/                 verbatim copy of the BAS interface — auditable, not invented
test/                        49 offline · 104 fork per chain (27 artefact + 22 settlement + 8 split + 9 end-to-end + 38 resolver)
script/                      DeployCredentials.s.sol · SeedDemo.s.sol
web/                         verification page (Vite + vanilla TS + viem, static)
signer/                      OpenBadgeCredential 3.0 signing + BitstringStatusList derived from chain
                             (plain ESM; see signer/README.md for what it does not claim yet)
vault/                       project context: why it is shaped like this
```

Why `lib/bas/src/` is committed rather than installed: we **cannot compile** `EAS.sol` /
`SchemaRegistry.sol` from BAS in this rig (they are pinned to `pragma solidity 0.8.19`, which
conflicts with OpenZeppelin's `^0.8.20`). We did not raise someone else's pin — we removed those
files from the build path, use the interface, and **test behaviour through a fork**. The side
effect is better evidence: what gets tested is the deployment a judge can open.

## Limits we state ourselves

This is not boilerplate and it is not hidden behind a tab. This system does **not** prove:

- that the **content** of a claim is true — *"verification of a credential does not imply
  evaluation of the truth of claims encoded in the credential"* (VC 2.0);
- that the **human** behind an address is the person who studied — what is bound is an address;
- that a certificate cannot be screenshotted;
- any **legal or institutional** recognition. We do not write "legally valid".

We also do not claim: *"trustless"*, *"zkML-verified"*, *"TEE-verified"*, or that BAS is an
"official BNB Chain programme" (no such claim exists in its repository). If this page turns out to
work with third-party validators, we will say so **after** proving it — not before.

Stating the limits is what makes the remaining claims worth anything.

## In `vault/`

| file | about |
|---|---|
| [README](vault/README.md) | index + how to read these notes |
| [01 - Briefing](vault/00-Overview/01%20-%20Briefing.md) | what the product is, who uses it, the flow from zero to verified, the demo scenes |
| [01 - Architecture](vault/01-Architecture/01%20-%20Architecture.md) | four layers, why BAS instead of hand-rolled, the EAS gap, agent roles, who pays |
| [03 - Decisions](vault/00-Overview/03%20-%20Decisions.md) · [04 - Corrections](vault/00-Overview/04%20-%20Corrections.md) | every decision with its date and what it cost, and the claims we retracted ourselves |
| [01 - Evidence and Limits](vault/08-Results/01%20-%20Evidence%20and%20Limits.md) | what is proven, what is not, and the claims we forbid ourselves |
| [01 - Spec Research](vault/06-Spec-Research/01%20-%20Spec%20Research.md) · [R6 - Toolchain traps](vault/06-Spec-Research/R6%20-%20Toolchain%20traps%20that%20cost%20time.md) | Open Badges 3.0 facts from the raw specification + the traps that cost hours |
| [01 - Backlog](vault/07-Backlog/01%20-%20Backlog.md) · [03 - Findings and Tasks](vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md) | where it stands, blockers, order of work to the deadline |
| [00 - Hub Testing](vault/09-Testing/00%20-%20Hub%20Testing.md) | one record per command: what was run, when, with the output pasted |

> These notes are **only** about Lencana. No other product, track or plan appears in them.

## Language policy

Documentation, captions and descriptions in this repository are **English**. The verification
frontend is the agreed exception and it is **built**: an Indonesian / English switch lives in
`web/src/i18n.ts` with the strings as one dictionary, wired at `web/src/main.ts:1512-1522` and
`:1848-1849`, remembered per visitor (`getSavedLanguage` / `saveLanguage`) and settable from the URL
(`?lang=`). What is still uneven is coverage: some simulation copy in `web/src/main.ts` is written
inline in one language only, and that is tracked as an open item rather than claimed as finished.

## License

MIT for the contracts and code (see the `SPDX-License-Identifier` header in each file) — **except**
`lib/bas/src/`, a verbatim copy of the **BAS/EAS** interface kept for auditability. That part is not
our work.
