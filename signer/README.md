# `signer/` — the credential is a document

Everything else in this repository proves a fact about a credential on BNB Chain. This package
produces the other half: the **OpenBadgeCredential 3.0 document** an agent signs, plus the
**BitstringStatusList** that lets a standard Open Badges verifier see revocation — because a
standard verifier does not read the chain.

This closes decision **D24.1 = A** (see `../vault/02-architecture.md`).

## What is here

| file | job |
|---|---|
| `src/context.js` | the JSON-LD context URIs in one place, because the `@context` order is itself signed |
| `src/credential.js` | builds an `OpenBadgeCredential`; also `credentialHashOf()`, the JS twin of `_vcHash()` in `CredentialResolver.sol` |
| `src/statusList.js` | Bitstring Status List: index allocation, bitstring encoding, the status list credential itself |
| `src/chainStatus.js` | reads `statusOf()` from the deployed resolver and decides which bits are set |
| `src/store.js` | the append-only allocation record + issued-credential registry on the issuer side |
| `src/lists.js` | renders a status list — **shared by the server and the issuer**, and it also owns `servedHashes()`, the single answer to "which credentials are in the list" (see below: sharing the renderer was not enough) |
| `src/anchor.js` | `timestamp()` of the bitstring hash on BAS, then reads it back |
| `src/issuer.js` | the agent's Ed25519 document key and its issuer document |
| `src/sign.js` | `DataIntegrityProof` + `eddsa-rdfc-2022` sign/verify, and the JSON-LD document loader |
| `src/server.js` | serves `/issuers/:slug`, `/credentials/0x…`, `/credentials/status/{revocation,suspension}`, `/healthz` |
| `scripts/issue.js` | **one command**: score → on-chain attestation (agent's own key) → signed document → status lists → bitstring hash anchored to BAS |
| `scripts/check.js` | 45 checks: document shape, signature, status lists, chain-derived bits, the index invariant, and bitstring determinism under re-render and under reordered input |
| `scripts/serve-probe.js` | 20 checks: the same over HTTP, against the running server (the bit-level ones need `EXPECT_*`; without them it prints the group it skipped) |

## Who owns the bit number

**The issuer allocates the status-list index; the server only reads it.** That rule is the whole
reason `store.js` exists. The index is written *into* the credential at the moment it is issued, and
later read back out of it to find the bit. If the server allocated on its own, the number would
follow whatever order that request happened to iterate in, and an older credential's
`statusListIndex` could point at someone else's bit — a failure that is completely invisible to
signature verification, because the document would still be perfectly valid.

`check.js` proves the invariant instead of trusting it: for every credential in the store, the bit
**at the index the document itself claims**, read from the rendered list, must equal what the chain
says.

## Who decides which credentials are in the list

A second rule sits next to the first, and breaking it is quieter. `lists.js` exports
**`servedHashes()`**, and it is the only place that answer may come from — the server builds its
lists with it, and `issue.js` anchors with it.

Until 21 Sep the issuer anchored `sha256` of a list rendered over **one** credential (the one being
issued) while the server served a list over **all** of them. Both went through the same `renderList`,
so the *rules* were identical and the code looked shared — but the *inputs* differed, so the anchored
hash could never equal the bitstring anyone actually read. Every form was valid, the signature
checked, and the anchor proved nothing. Sharing a function is not sharing a decision.

`check.js` §5c now pins the property that made the bug possible: rendering the same input twice must
give the same hash, and reversing the input order must **not** change it. A served list that depends
on iteration order would silently orphan the index written into every older document.

## Two empty lists share a hash

`sha256("")` of an all-zero bitstring is the same for `revocation` and `suspension`, so anchoring an
empty list records one hash for both purposes — measured, not theorised. Consequence to keep honest:
an anchor is only meaningful **once a bit is set**, and `getTimestamp()` cannot tell you *which*
list a hash belonged to. If that ever matters, the fix is to include the purpose in the anchored
digest, not to hope readers infer it.

This is also why `issue.js` says `sudah ada … — tidak diulang` for the second purpose when both lists
happen to be empty: it is the collision above being detected, not a skipped step.

Two keys per agent, deliberately: the **EOA** is the on-chain `attester` (D30/D31), the **Ed25519
Multikey** signs the document. Standard verifiers only ever see the second one; the two are linked
by the issuer document URL, which is legal because §8.5 of OB3.0 "only requires HTTP URL support".

## Run it

```bash
npm install
node scripts/agent.js                 # creates .keys/agent-demo.json (testnet-only)
node scripts/check.js                 # 45 checks with a chain to read (28 offline)
node src/server.js                    # http://127.0.0.1:8787
node scripts/serve-probe.js           # 20 checks against the running server
node scripts/issue.js --course web3-dasar-2026 --learner 0x… --score 87
```

`check.js` section 5 and the server read `process.env` and **nothing else** — no dotenv, unlike
`issue.js` and `adopt.js`, which read `app/.env` themselves. Run them through an env loader or they
will silently fall back to `http://127.0.0.1:8545` and report failures that mean "not configured".

Against the public BSC testnet (chain 97), the values that produce full coverage:

```bash
set RPC_URL=https://bsc-testnet.publicnode.com
set RESOLVER_ADDRESS=0x7CA624caFDe5cA3A27b33d26be56F73a90792065
set STATUS_HASHES=<comma-separated credential hashes>   # optional: default is everything in the store
set EXPECT_REVOKED=<uid>
set EXPECT_SUSPENDED=<uid>
set EXPECT_CLEAN=<uid>,<uid>
```

`EXPECT_*` drive `serve-probe`'s bit-level checks and take **UIDs, not hashes** — take them from
`/healthz` or `adopt.js`, both of which read them back off the chain. A run without them prints 11
checks and names the skipped group: the number it prints is never a coverage claim. The UIDs that a
`SeedDemo` run *prints* for credentials it minted itself are estimates by design (see the UID rule
in the repo docs); only the values read from the chain afterwards are usable here.

An anvil fork of chain 97 is addressed the same way with `RPC_URL=http://127.0.0.1:8545`.

Without a chain `check.js` still runs and says **which group it skipped** — a green number that hides
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
  after it passes someone else's validator. That test is still open, and it is the single most
  valuable thing left in this package.
- **Everything measured here ran against a local anvil fork of chain 97**, including the one command
  that attests, signs, renders and anchors (`timestamp()` recorded and read back on the fork).
  Nothing in `signer/` has touched a public chain yet — no backend of ours has a public URL, which
  is exactly what the third-party validator test will need.
- **The anchor's precision is stated, not oversold.** `timestamp()` stores `uint64` per `bytes32`
  and keeps no content, so it proves *"this bitstring hash existed at this time"*, not *"we always
  serve this list"*. And two empty lists hash identically (see above), so a hash for an
  all-zero list proves less than one that has a bit set.
- **`IndexAllocator` state lives on the issuer side, deliberately.** The *slot* is ours; the *status*
  is read from chain on every render. Losing the store means old lists cannot be re-derived, not
  that a credential's status becomes wrong.
- **Testnet-only keys.** `.keys/` is gitignored; a production key belongs in a KMS/HSM, not here.
- **JSON-LD contexts are fetched over the network** by the default loader. Vendoring them into
  `makeDocumentLoader` is the known fix if offline determinism ever matters (it also removes a
  runtime dependency on w3.org being up during a demo).

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
