# Lencana

**Learning credentials that anyone can verify — no wallet, no login, and without having to trust
us.**

A micro-course platform where **the issuer of each credential is an AI agent**. Credentials follow
the **Open Badges 3.0 / W3C Verifiable Credentials 2.0** standard, while **who is allowed to
issue** and **whether a certificate has been revoked** are recorded on **BNB Smart Chain**. A
recruiter verifies a certificate by opening a URL in a browser — that is the whole flow.

Built for the **Indonesia Web3 Hackathon 2026** — *Consumer Apps* track (· *AI Agents*), on BNB
Chain.

> ⚠️ **Pre-release status.** No contract has been broadcast to a public testnet yet, and the
> credential-signing backend does not exist yet. The table below draws a hard line between what is
> proven and what merely compiles.

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
| `forge test --no-match-path "*.fork.t.sol"` | **21 passed / 0 failed** (offline) |
| `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` | **60 passed / 0 failed** on **chain 97** |
| `forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/` | **60 passed / 0 failed** on **chain 56**, identical gas figures |
| `npm run probe` in `web/` | **19/19 passed** against a real chain (17 Sep) · ⚠️ **stale, not re-run**: `statusOf` has since widened to 7 values and the probe now declares 20 checks |
| `forge script … --broadcast` on an anvil fork of 97 | deploy succeeded · **0.0003828 BNB** (3,827,994 gas) |
| repo contents read back from the GitHub API | **39 files**; no `node_modules/`, `out/`, `cache/`, `broadcast/`, `dist/`, `.env` |

The fork tests call **BAS (BNB Attestation Service, a fork of EAS 1.3.0) exactly as deployed on
chain** — not a copy we deployed ourselves. Those are also the addresses a judge can open.

**What is not proven, and must not be claimed:** no contract is live on a public testnet (every
success above is a *fork* — real state, no real transaction); the page has never been run against a
third-party validator; the HTTP 402 payment layer has never been executed; and the page's
"revoked" path is still covered only by forge tests, not by the probe. Details:
[`vault/03-evidence-and-limits.md`](vault/03-evidence-and-limits.md).

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

npm test                                     # 21 tests, offline, ~25 ms
npm run test:fork:testnet                    # 60 tests on chain 97
npm run test:fork:mainnet                    # 60 tests on chain 56
```

> ⚠️ **`--evm-version cancun` is mandatory for fork tests**, not decoration. Without it, calls that
> move variable-sized data fail with `EvmError: NotActivated`, which **looks exactly like "that
> function does not exist on the deployed contract"**. Our own build stays on `shanghai`.

Prove it without funds and without a real deploy — fork chain 97 into a local anvil:

```bash
anvil --fork-url https://bsc-testnet.publicnode.com --port 8545 --chain-id 97 --silent

set DEPLOYER_PRIVATE_KEY=<anvil test key #0>
set ISSUER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
forge script script/DeployCredentials.s.sol:DeployCredentials --rpc-url http://127.0.0.1:8545 --broadcast

set ISSUER_PRIVATE_KEY=<anvil test key #1>
set RESOLVER_ADDRESS=<from above>
set CERT_ADDRESS=<from above>
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast --slow
```

**`--slow` on `SeedDemo` is required, not "slow by preference".** EAS computes an attestation UID
partly from `block.timestamp`; a plain `forge script` broadcasts **the calldata produced during
simulation**, so any UID-dependent argument goes stale once it lands in a different block. Without
`--slow`: three transactions fail.

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
([`vault/04-technical-reference.md`](vault/04-technical-reference.md)).

## What is in this repo

```
contracts/
  CredentialResolver.sol     issuer whitelist + prerequisite chain + statusOf()/holderOf()
  SoulboundCert.sol          ERC-721 + ERC-5192; mint refuses a dead credential; no transfer/burn
  interfaces/ICredentialRegistry.sol
lib/bas/src/                 verbatim copy of the BAS interface — auditable, not invented
test/                        21 offline · 30 resolver fork · 9 end-to-end fork
script/                      DeployCredentials.s.sol · SeedDemo.s.sol
web/                         verification page (Vite + vanilla TS + viem, static)
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
| [01-briefing](vault/01-briefing.md) | what the product is, who uses it, the flow from zero to verified, the demo scenes |
| [02-architecture](vault/02-architecture.md) | four layers, why BAS instead of hand-rolled, the EAS gap, agent roles, who pays, decisions with dates |
| [03-evidence-and-limits](vault/03-evidence-and-limits.md) | what is proven, what is not, and the claims we forbid ourselves |
| [04-technical-reference](vault/04-technical-reference.md) | Open Badges 3.0 facts from the raw specification + toolchain traps |
| [05-status-and-tasks](vault/05-status-and-tasks.md) | where it stands, blockers, order of work to the deadline |

> These notes are **only** about Lencana. No other product, track or plan appears in them.

## Language policy

Documentation, captions and descriptions in this repository are **English**. The verification
frontend is the agreed exception: it will ship an **Indonesian / English switch** — tracked as a
task in [`vault/05-status-and-tasks.md`](vault/05-status-and-tasks.md), not built yet.

## License

MIT for the contracts and code (see the `SPDX-License-Identifier` header in each file) — **except**
`lib/bas/src/`, a verbatim copy of the **BAS/EAS** interface kept for auditability. That part is not
our work.
