# 04 — Technical reference

## A. Open Badges 3.0 / VC 2.0 — read from the raw specification

The source files were downloaded whole (not search-engine summaries), and the claims below were
**recomputed from them**. This matters: the `credentialStatus` example we previously used **turned
out to be our own invention** — it appears zero times in the actual specification.

**Official status.** 1EdTech (formerly IMS Global). **Final Release** — v1.0 final on **27 May 2024**;
current document **1.4.5, 29 June 2026**. So "industry standard" is **legitimate to write**. What we
may **not** claim: that our credential **passes 1EdTech certification** (the suite requires
membership), and that its reference implementation is publicly auditable (*"Source Code is a
member-only resource"*).

### The correct document shape

| property | rule | consequence for us |
|---|---|---|
| `@context` | `[2..*]`, **ordered**: `https://www.w3.org/ns/credentials/v2` then `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`. *"Open Badges verifiable credentials MUST be serialized with both JSON-LD contexts."* | ⚠️ the OB 3.0.3 context itself contains only **29 terms** and does **not** contain `credentialStatus`, `proof`, `issuer`, `validFrom`, `validUntil`, `statusPurpose`, `statusListIndex`, `statusListCredential` — all supplied by the W3C context. A verifier loading only the OB context is **blind to status and proof** |
| required | `@context`, `id`, `type`, `credentialSubject`, `issuer`, `validFrom` (computed directly from `ob_v3p0_achievementcredential_schema.json`, at the **top level** of the schema) | — |
| `achievement` | requires `id`, `type`, `name`, `description`, **`criteria`** | `criteria` is where **"what the learner had to do to pass"** goes — this is what makes the agent's assessment inspectable by others, not just its verdict |
| holder | `credentialSubject.id` **XOR** `.identifier` | one of them is required |
| expiry | ✅ **`validUntil`** · ❌ **`expirationDate` is NOT part of the VC 2.0 model** (it exists only in the VC 1.1 legacy variant, §B.9.2, *"not intended to be used in the creation of new credentials"*) | expiry must be written at **two layers**: `validUntil` in the document **and** `expirationTime` in the attestation. Different fields on different layers, **not automatically in sync** — the backend must write both from one source |
| `verificationMethod` | §8.5: *"allows the use of an HTTP URL … or a DID URL (e.g. `did:key:123`), but only requires HTTP URL support"* | ✅ **no DID resolver is required** — saves days |
| proof | §8: *"At least one proof mechanism, and the details necessary to evaluate that proof, MUST be expressed."* The closed list is in the **Certification Guide**, not §8 (Errata §1.2 explains the move): **`eddsa-rdfc-2022`** or **`ecdsa-sd-2023`**; verifiers must support **both**. `proofPurpose` is **required** to be `"assertionMethod"` | VC-JWT is also allowed (`alg` minimum `RS256`) but there is **no `JwtCredential` type** in OB3.0 — the format is "JSON Web Token Proof Format", and the only separate property is `endorsementJwt` |

### Revocation — the only type with defined behaviour

> *"A Credential is revoked if the credentialStatus property is present, and the type of the
> CredentialStatus object is `BitstringStatusListEntry`, and if the Credential has been revoked as
> shown in Bitstring Status List v1.0."* — §9.1

```json
"credentialStatus": {
  "id": "https://1edtech.edu/credentials/revocationList#23",
  "type": "BitstringStatusListEntry",
  "statusPurpose": "revocation",
  "statusListIndex": 23,
  "statusListCredential": "https://1edtech.edu/credentials/revocationList"
}
```

`credentialStatus` itself is **optional** (`[0..1]`); inside the object only `type` is required, and
the class is extensible (`additionalProperties: true`). Revision history: **rev 1.3 (9 Oct 2025)**
*"Deprecated [VCRL-10] in favour of [vc-bitstring-status-list]"*, then **rev 1.4.2 (17 Apr 2026)**
updated every example to `BitstringStatusListEntry`.

**Zero occurrences** across the six documents (counted, not felt): `RevocationList2020Status`,
`RevocationList2020StatusService`, `StatusList2021`, `revokedIdList`, `revokedId`.

### Third-party validators and suites (existence verified)

| tool | language | note |
|---|---|---|
| `1EdTech/digital-credentials-public-validator` — official deployment **`https://vc.1ed.tech`** | Java 17 / Spring Boot | *"primarily a validator for Open Badges 3.0"*. ⚠️ Its README also says *"verifybadge.org is not owned or maintained by 1EdTech"* |
| `w3c/vc-data-model-2.0-test-suite` | JavaScript | the official W3C conformance suite; needs a **VC-API** endpoint + `eddsa-rdfc-2022` |
| `digitalcredentials/verifier-core` | TypeScript | verification in browser / Node / React Native; `OpenBadgeCredential` example |
| `Schroedinger-Hat/certo`, `CoopCodeCommun/pyopenbadges` | TS / Python | issue+verify platforms; the Python one claims OB3.0 compliance, JWT still TODO |
| ~~`1EdTech/openbadges-validator-core`~~ | Python | ⚠️ **OB 2.0 and below, NOT OB3.0.** Do not be fooled by the name |

### ⚠️ The specification contradicts itself

§B.6.1 (*Multikey*) writes `"the cryptosuite … MUST be the string eddsa-rdf-2022"` — **without the
`c`** — while §D.1/§D.2 and the Certification Guide use `eddsa-rdfc-2022` (39× vs 7×). **Use the one
with `c`.** If validation is ever rejected for no clear reason, check this spelling before blaming a
library.

## B. Toolchain traps that already cost time here

All of these actually happened. The symptoms are usually **misleading**: they look like "the contract
is broken" or "the feature does not exist" while the cause is elsewhere.

### Foundry

| trap | symptom | fix |
|---|---|---|
| wrong `evm_version` on a fork | `EvmError: NotActivated` **only** on calls moving string/bytes; `address`/`bytes32` getters still pass → **looks like the function is missing from the deployed contract** | `--evm-version cancun` (already set in `[profile.fork]`). **This caused a misdiagnosis that we later corrected publicly** |
| concluding "deployed" from `eth_getCode != 0x` | "there is code" does not prove it is the contract we think it is | compare bytecode size **across chains**, use a negative control, match **selectors in runtime bytecode**, and read an **on-chain constant** and compare it with the documentation |
| **`vm.prank` / `vm.expectRevert` eaten by a staticcall inside an argument** | `NotAnIssuer(0x7Fa9385b…1496)` — that address is `address(this)` of the test contract, not the pranked one; or `next call did not revert as expected` | hoist getter calls into variables (ideally in `setUp`) and use the variable. ⚠️ **this trap was hit twice**, and the second time it was already written down before it happened |
| a helper that asserts "success" reused by a test expecting a revert | `attestation not recorded: 0x000… == 0x000…` | after `expectRevert` matches, **execution continues**. Split `_attemptX()` (no assertion) from `_doX()` (assert + return) |
| `vm.expectEmit` | `Approval != expected log` although the operation succeeded | it compares only the **next** log; our contracts emit `Transfer`/`Approval` first → use `vm.recordLogs()` and scan `topics[0]` yourself |
| a modifier on a test function | the test "passes" without running | `vm.skip(block.chainid != 97 && block.chainid != 56)` — other chains are **skipped, not counted as passing** |
| **`forge script --broadcast` reuses simulation calldata** | simulation fully green, broadcast partially fails. The **EAS attestation UID is derived from `block.timestamp`**, so UID-dependent arguments go stale when mined in a different block | ~~use `--slow`~~ — **that fix was wrong and is retracted.** Re-measured on a clean fork (19 Sep): a single `--slow` run does **not** finish the UID-dependent steps either, and its abort-on-first-failure behaviour is what used to leave the demo state **half-built**. The fix is in our code, not in a flag: never feed a UID into a later step of the same run — gate those steps on "this attestation was already on chain before the process started" and let a second run finish. See [03-evidence-and-limits.md](03-evidence-and-limits.md) |
| a transaction fails with no reason in the log | only `Error: Transaction Failure: <hash>` | the revert reason is **not in the receipt**. Replay the same call as an `eth_call` on the previous block → the real error appears |

### Dependencies

| trap | symptom | fix |
|---|---|---|
| a third-party dependency pinned to an old pragma | `EAS.sol`/`SchemaRegistry.sol` from BAS are `pragma solidity 0.8.19` (pinned) vs OpenZeppelin `^0.8.20` → **cannot live in one build** | do not raise someone else's pin; **move those files out of the build path**, use the interface (`^0.8.0`), and **test behaviour via a fork**. The consequence is stronger evidence: what is tested is the real deployment |
| `forge-std` from npm | `ETARGET No matching version found for forge-std@^1.9.4` | the npm package stopped at **1.1.2**, too old for `makeAddr`/`bound`/`vm.sign`. Use `forge install foundry-rs/forge-std --no-git` (`--no-git` is required when the folder is not yet a git repo) |
| OpenZeppelin ≥ ~5.4 | `The "mcopy" instruction is only available for Cancun-compatible VMs` | pin **5.1.0** and keep the build on `shanghai` |
| `safeTransferFrom(from,to,id)` in OZ 5.x | `Trying to override non-virtual function` | the 3-argument variant is **not** `virtual`; do not override it. Every transfer **and burn** goes through `_update(to, tokenId, auth)` — one override covers both |
| third-party errors cannot be imported | `AlreadyRevoked` etc. are declared inside `contract EAS`, not in `IEAS` | declare `error AlreadyRevoked();` **with exactly that name** in the test file — a selector comes from the signature, not from where it was declared |

### TypeScript / viem — and why `npm run probe` exists

| trap | symptom | fix |
|---|---|---|
| **human-readable ABI passed raw to viem** | `Cannot use 'in' operator to search for 'name' in function statusOf(bytes32 …)`. **Neither `tsc` nor `vite build` catches it** | `parseAbi([...])`. It only surfaces on the first chain call — and because our data layer deliberately never throws, the failure would have shown up as **"credential not recognised" for a perfectly valid certificate**. The probe caught it, not the compiler |
| declaring a function the contract does not have | `The contract function "totalSupply" reverted` — OZ 5.x **removed** `totalSupply` from ERC721 | do not declare functions you have not opened in the contract |
| `readContract` returning `unknown` inside a generic callback | dozens of TS2322 errors from one helper | accept `Promise<unknown>` and cast in **one** place; what protects correctness is the probe, not 33 scattered casts |

### Network — the most frequently misread failure

| symptom | actual cause |
|---|---|
| `os error 10060` / `10061` on a testnet RPC | `data-seed-prebsc-1-s1` / `-2-s1` answer one probe and refuse connections minutes later. Stable: `bsc-testnet.publicnode.com`, `data-seed-prebsc-1-s2/-s3`, `bsc-testnet.drpc.org` |
| Foundry rejects with `invalid peer certificate: certificate expired`, **while Python/PowerShell accept the same host the same day** | `bsc-dataseed.binance.org` is DNS round-robin: different IP, different certificate. For chain 56 under Foundry use `bsc-dataseed1.bnbchain.org` |
| `error -32001 block not found` when forking | that node does not serve the **historical state** a fork needs (`bsc-rpc.publicnode.com` on mainnet is like this) |
| BscScan cannot be used as a verification tool | HTML → 403; API V1 deprecated; Etherscan V2 for BSC = **Paid Tier Only**. What works: **public RPC + `eth_getCode`/`eth_call`**. Side effect: `forge verify-contract` will probably fail — do not spend days there |
| `web_fetch` used to read code | returns a model summary, or nothing on large documents. **Download raw** (`raw.githubusercontent.com`) then read. For big repos: the git tree API in one call (`/git/trees/<branch>?recursive=1`) |
| **Free RPC refuses a BURST while accepting single calls** | Four sequential `eth_getStorageAt` probes return 4/4, yet the 41-read verification probe dies on `408 Request timeout on the free plan`. The capability question is not "can it connect" but "does it survive being hit at once" — measure it. `--retries` on Foundry does not cover this class. |
| `Failure on receiving a receipt` | does **not** mean the transaction was not sent. Re-running a state-changing script without checking will issue twice. Read the sender's pending nonce before and after, and stop if it moved. |
| `failed to get account for 0x…` naming an address that is nowhere in the project, on the **first** real broadcast | `--slow` inspects senders recorded in earlier runs, and an anvil fork of chain 97 writes into the **same** `broadcast/<Script>/97/` directory as the public testnet — Foundry cannot tell them apart. Archive `app/broadcast/` before the first broadcast against a real chain. |

**Probe the endpoints first, then talk about the contract.** Distinguish four different failures:
*connection dead* ≠ *TLS rejected* ≠ *node lacks historical state* ≠ *contract behaves wrongly*.
A fifth one now belongs on that list: *endpoint throttles parallel reads* — it looks exactly like a
bug in the thing being read, because the harness that fails is the one that reads the most.

### Solidity and Windows

- **Non-ASCII characters are rejected in string literals**: `Error (8936): Invalid character in
  string`. Comments are free, **string literals are not**. Hit twice by em-dashes in Indonesian test
  messages. Use ASCII commas/hyphens in messages.
- **`console2.log(string, bytes32)` has no overload** → use `console2.logBytes32(v)`.
- Casting `address` → a `payable` contract must go through `payable(...)` (EAS's SchemaResolver is payable).
- cmd.exe mangles newlines in multi-line `python -c` → always write a `.py` file.
- PowerShell `ConvertFrom-Json` turns large numbers into `[double]` and corrupts wei arithmetic →
  compute in Python with `int(hex, 16)`.

## C. Rules that came out of this list

1. **Behavioural evidence beats structural evidence.**
2. **When a test or investigation fails with a strange cause, suspect the tooling order first** —
   prank, expect, nonce, `block.timestamp`, RPC — **before blaming the product**.
3. **"Assigned to an agent" ≠ "already examined."** Every claim here has a command behind it.
4. **For decisive technical claims, direct verification beats literature synthesis.**

## D. Live deployment — BSC testnet, chain 97

Deployed 21 Sep, and re-read from the chain afterwards rather than trusted from a build log:

| item | address |
|---|---|
| `CredentialResolver` (our layer) | `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` |
| `SoulboundCert` (artifact layer, owned by the platform) | `0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c` |
| our schema UID, registered in the **public** BAS schema registry | `0x70a8c3a3ade3d7595422313112fb24f32e2dd8a65c7609574341a8ac6091a051` |
| BAS core used (not deployed by us) | `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD` |
| BAS schema registry reached through it | `0x08C8b8417313fF130526862f90cd822B55002D72` |
| `SettlementSplit` (revenue split, 10% platform) | `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE` |
| `DemoCourseToken` — labelled demo coin used to pay it | `0xEd19cDeB8b4Bb3355651680b089222d1140bCDDe` |
| Permit2 / x402 exact proxy called by the payment test | `0x000000000022D473030F116dDEE9F6B43aC78BA3` / `0x402085c248EeA27D92E8b30b2C58ed07f9E20001` (neither is ours) |

The last two rows exist because a payment demo is only worth showing if the reader can check which
contracts were actually called. The split contract has **no mainnet deployment and no hosted
caller**; the HTTP side that would use it is still unwritten.

`schemaUID` is a function of the **resolver address**, so these two rows are locked together: a new
resolver means a new schema, and old verifiers stop recognising credentials issued under the old one.
The resolver cannot be quietly "fixed" by redeploying.

Measured cost, at the 0.1 gwei the testnet quoted that day: the whole deployment is
**4,191,202 gas ≈ 0.00042 BNB**, one attestation 316,384 gas, one BAS `timestamp()` anchor ≈ 45,900
gas. The complete sequence — deploy, seed twice, issue, anchor both lists — stays under 0.002 BNB, so
0.01 BNB of testnet faucet money is comfortably enough and cost is not a design constraint here.

What is *not* claimed by this section: source verification on the block explorer (BscScan V1 is
deprecated, Etherscan V2 for BSC is paid), and any mainnet (chain 56) deployment.

