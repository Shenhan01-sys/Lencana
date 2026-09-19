# `signer/` — the credential is a document

Everything else in this repository proves a fact about a credential on BNB Chain. This package
produces the other half: the **OpenBadgeCredential 3.0 document** an agent signs, plus the
**BitstringStatusList** that lets a standard Open Badges verifier see revocation — because a
standard verifier does not read the chain.

This closes decision **D24.1 = A** (see `../vault/02-architecture.md`).

## What is here

| file | job |
|---|---|
| `src/context.js` | the JSON-LD context URIs, in one place, in the order that is signed |
| `src/credential.js` | builds an `OpenBadgeCredential`; also `credentialHashOf()`, the TypeScript twin of `_vcHash()` in `CredentialResolver.sol` |
| `src/statusList.js` | Bitstring Status List: index allocation, bitstring encoding, the status list credential itself |
| `src/chainStatus.js` | reads `statusOf()` from the deployed resolver and decides which bits are set |
| `src/issuer.js` | the agent's Ed25519 document key and its issuer document |
| `src/sign.js` | `DataIntegrityProof` + `eddsa-rdfc-2022` sign/verify, and the JSON-LD document loader |
| `src/server.js` | serves `/issuers/:slug`, `/credentials/status/{revocation,suspension}`, `/healthz` |
| `scripts/check.js` | 36 checks: document shape, signature, status list, and bits derived from chain |
| `scripts/serve-probe.js` | 19 checks: the same, but everything fetched over HTTP |

Two keys per agent, deliberately: the **EOA** is the on-chain `attester` (D30/D31), the **Ed25519
Multikey** signs the document. Standard verifiers only ever see the second one; the two are linked
by the issuer document URL, which is legal because §8.5 of OB3.0 "only requires HTTP URL support".

## Run it

```bash
npm install
node scripts/agent.js                 # creates .keys/agent-demo.json (testnet-only)
node scripts/check.js                 # 36 checks, offline
node src/server.js                    # http://127.0.0.1:8787
node scripts/serve-probe.js           # 19 checks against the running server
```

`check.js` section 5 and the server need a chain to read; set them the same way `web/`'s probe does:

```bash
set RPC_URL=http://127.0.0.1:8545
set RESOLVER_ADDRESS=0xE01a16E50FD9D8c0Ff4230874F8D8C086e811627
set STATUS_HASHES=<comma-separated credential hashes>
```

Without them `check.js` still runs and says **which group it skipped** — a green number that hides
an untested path is the failure mode this repo complains about in other people's research.

Requires **Node ≥ 22.18**. This package is plain ESM JavaScript — but `chainStatus.js` imports
`web/src/abi.ts` directly rather than copying the ABI a second time, and that only works because
Node 22 strips TypeScript types on import by default. If `npm run check` dies with
`Unknown file extension ".ts"`, the Node version is the first thing to look at, not the code.

## Two status lists, not one

| list | OB/BSL meaning | our chain fact | reversible? |
|---|---|---|---|
| `revocation` | "cancel the validity … not reversible" | `revoke()` by the issuing agent (EAS) | no |
| `suspension` | "temporarily prevent acceptance … reversible" | `delistIssuer()` by the platform (D30) | yes — `relistIssuer()` |

Collapsing both into one list would erase the distinction D30 exists to create, and every third-party
verifier would read a recoverable delisting as a permanent revocation. BSL allows multiple
`credentialStatus` entries per credential, so there is no reason to compress them.

`expired` is deliberately **not** in any list: the document already states `validUntil` and verifiers
read that themselves. Encoding it twice would create two sources of truth that are allowed to
disagree.

## What this does *not* claim yet

- **Not yet tested against `https://vc.1ed.tech`.** The document is built to the specification and
  to the terms that actually exist in the published contexts, but interoperability is only claimed
  after it passes someone else's validator. That test is still open.
- **The bitstring hash is not yet anchored to BAS.** `sha256Hex(encodedList)` is computed and
  reported; calling `timestamp()` on BAS with it is the next step. Until then "we serve the list;
  you can check the hash we published" is only half-defensible.
- **The issue → anchor → sign pipeline is not wired end to end.** `check.js` proves each stage and
  the chain-derived list proves the status path; the single command that takes an assessment result
  and produces a signed, anchored, status-listed credential is still to come.
- **`IndexAllocator` state lives on the issuer side.** The *slot* is ours; the *status* is read from
  chain every request. Losing the allocator means old lists can't be re-derived, not that a
  credential's status becomes wrong.
- **Testnet-only keys.** `.keys/` is gitignored; a production key belongs in a KMS/HSM, not here.

## Three things measured while building this, so they are not rediscovered painfully

1. **`Result` in OB 3.0 is `{ achievedLevel?, resultDescription?, status?, value }`** — read from
   `context-3.0.3.json` itself. `achievementId`, `identity`, `resultScore` and `statement` are
   **Open Badges 2.0** shapes; jsonld 9 in safe mode drops unknown properties and then fails with
   "did not expand into an absolute IRI", which points at the wrong file entirely.
2. **`https://w3id.org/vc/status-list/2021/v1` is the wrong context for Bitstring lists.** It defines
   the `StatusList2021*` family. `BitstringStatusListCredential`, `BitstringStatusList`
   (`encodedList`, `statusPurpose`, `ttl`) and `BitstringStatusListEntry` (`statusListIndex`,
   `statusListCredential`, `statusSize`, `statusMessage`) all live inside
   `https://www.w3.org/ns/credentials/v2`.
3. **`Profile` is an Open Badges term, not a W3C one.** A status list credential signed with only
   the W3C context must use a bare issuer URL; `issuer.type = "Profile"` fails expansion there.

## Related

`../vault/02-architecture.md` · `../vault/03-evidence-and-limits.md` · `../web/scripts/probe.ts` ·
`../test/CredentialResolver.fork.t.sol`
