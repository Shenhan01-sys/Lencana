---
tags: [spec-research, "R6"]
---

# R6 - Toolchain traps that cost time

**Part of:** [[06-Spec-Research/01 - Spec Research]]
**Source:** `foundry.toml:10` · `signer/src/delegation.js:112` · `signer/src/server.js:73`

**Summary:** The lookup table for the toolchain failures that already cost hours in this repository. The hub essay keeps the narrative and the ordering rule; this note is the card you read **while** a command misbehaves, so every entry is fixed in shape: symptom → the literal error text → root cause → the fix, with the file that proves the fix is in use. The pattern across all of them: the message names the wrong layer. "The function does not exist", "the contract is broken", "the feature is unsupported" are what these look like; what they are is evm version, stack depth, a missing `await`, a prefix that got attached, or an endpoint that throttles parallel reads.

**Key points:**
- **Order of suspicion** (the habit that saves the hours): prank → expect → nonce → `block.timestamp` → RPC → evm version → *then* the product. A fork is not an oracle about our code until the flags match.
- Two traps were recorded **before** they were hit the second time (`vm.prank` eaten by a staticcall, and non-ASCII in string literals). If an entry below matches what you are seeing, do not re-derive it — apply the fix and move on.
- Three of these are invisible to the compilers: `parseAbi` is not caught by `tsc` or `vite build`, the `--evm-version` failure is not caught by `forge build`, and the BigInt crash happened **after** money moved. Green typechecks are not evidence for these classes.

**Detail:**

**1. `[NotActivated]` on a BSC fork**
- Symptom: only calls that move variable-sized data (`string`, `bytes`) fail; `address`/`bytes32` getters keep passing → it reads as "that function is missing from the deployed contract".
- Literal: `EvmError: NotActivated` (printed as `[NotActivated]`).
- Root cause: the default profile is `evm_version = "shanghai"` (`foundry.toml:10`, reason at `:8-9`), while the deployed BAS was compiled with a newer target. BSC forks do not report Cancun as activated, so the EVM refuses the opcodes.
- Fix: `--evm-version cancun` on **both** `forge test --fork-url …` and `forge script --rpc-url <97|56> …`. Both fork scripts already pass it (`package.json:10-11`) and `[profile.fork]` carries it (`foundry.toml:19-26`); the offline run deliberately stays on `shanghai` (`package.json:8`). This exact misdiagnosis was corrected publicly → [[00-Overview/04 - Corrections]].

**2. `Stack too deep` in a long `run()`**
- Symptom: a script that was fine at 3 steps stops compiling at 6.
- Literal: `Stack too deep`, as recorded in the file's own explanation (`script/PaidVerificationDemo.s.sol:30-31`).
- Root cause: one function frame holding every local of the whole demo.
- Fix: split the script into stage functions that pass one struct — `run()` calls `_stage1Deploy` / `_stage2Settle` / `_stage3Verify` with a single `Setup memory s` (`script/PaidVerificationDemo.s.sol:58-72`). Do **not** enable via-ir project-wide for one demo script; the file says so at `:29-31`, and our build target for everything else stays `shanghai`.

**3. `vm.sign` returns a struct, not bytes**
- Symptom: assigning the result to `bytes memory`, or feeding it straight where 65 packed bytes belong.
- Root cause: `vm.sign` yields `(uint8 v, bytes32 r, bytes32 s)`.
- Fix: destructure, then pack explicitly: `script/PaidVerificationDemo.s.sol:168` and `:193`, `test/SettlementSplitOnBsc.fork.t.sol:117` (`abi.encodePacked(r, s, v)` at `:118`). Related dependency trap: `forge-std` from **npm** stops at 1.1.2 and is too old for `makeAddr`/`bound`/`vm.sign` — install with `forge install foundry-rs/forge-std --no-git` (`package.json`, `comment`).

**4. Non-ASCII in Solidity string literals**
- Symptom: a file that reads perfectly fails to compile; comments with the same characters are fine.
- Literal: `Error (8936): Invalid character in string`.
- Root cause: comments are unrestricted, **string literals are ASCII-only**. Hit twice by em-dashes in Indonesian revert/console messages.
- Fix: ASCII commas and hyphens inside literals, keep the prose (and the 🔴 markers) in comments. The convention is visible in one file: `script/DeployCredentials.s.sol:37` carries an ASCII `revert("chain ini tidak punya deployment BAS yang terverifikasi")` while `contracts/CredentialResolver.sol:60-67` holds non-ASCII comment text.

**5. `console.log` with many mixed arguments**
- Symptom: a log line that compiles for `address` or `uint256` fails for `bytes32`.
- Root cause: `console2.log(string, bytes32)` has no overload.
- Fix: `console2.logBytes32(v)` — in use at `script/SeedDemo.s.sol:112`, `:266`, `:270` and `script/DeployCredentials.s.sol:77`. Do not "fix" it by casting the hash to `uint`, which prints a number nobody can compare with a `bytes32` in a receipt.

**6. Foundry replaying stale `broadcast/<script>/97/`**
- Symptom: `failed to get account for 0x…` naming an address that exists nowhere in the project, on the **first** real broadcast.
- Root cause: `--slow` inspects senders recorded by earlier runs, and an anvil fork of chain 97 writes into the **same** directory as the public testnet (`broadcast/<Script>/97/`) — Foundry cannot tell the two chains apart by id.
- Fix: archive `broadcast/` before the first broadcast against a real chain. It is never committed (`README.md:59` lists `broadcast/` among the untracked directories), so the collision is purely local state.

**7. A public RPC that accepts single calls and refuses a burst**
- Symptom: four sequential probes return 4/4, and the harness that reads the most dies.
- Literal: `408 Request timeout on the free plan`; the neighbouring class is `os error 10060` / `10061` on endpoints that answer one probe and refuse connections minutes later.
- Root cause: parallel-read throttling on free endpoints — a property of the **transport**, not of the contract being read.
- Fix: measure the endpoint before blaming the code; Foundry's `--retries` does not cover this class. Our server caps verification concurrency at 4 for exactly this reason, and the comment names the arithmetic (25 parallel verifications ≈ 300 simultaneous `eth_call`) at `signer/src/server.js:187-195`. Live endpoints are recorded in `foundry.toml:31-46` with the reason each rejected one was rejected (an expired certificate on one host at `:41`, no historical state on another at `:44`).

**8. `signMessage({ message: { raw } })` where `sign({ hash })` belongs**
- Symptom: a 65-byte, ECDSA-valid signature that the public chain refuses.
- Literal: `InvalidSignature()`.
- Root cause: `signMessage` is JSON-RPC `personal_sign` and always prepends `\x19Ethereum Signed Message:\n32`, so the digest that gets signed is not the EIP-712 digest. Every local test stays green because nothing local re-checks the prefix.
- Fix: `sign({ hash: digest, privateKey })` (`signer/src/delegation.js:112-118`), plus a recover-guard that refuses to return a signature which does not recover to the agent's own address (`:122-126`).

**9. viem's `sign()` returns an object, and `v` may be 0/1**
- Symptom: the same signature works in one path and not another; no message mentions `v`.
- Root cause: `sign()` yields `{ r, s, v }` (other call sites return a 65-byte hex), and some implementations return y-parity instead of the chain-safe 27/28.
- Fix: normalise in exactly one place — `normalizeSignature()` at `signer/src/delegation.js:141-155`.

**10. `recoverAddress` is asynchronous**
- Symptom: a guard that compares an address against a **Promise**, and therefore always "passes" or always fails to match.
- Root cause: viem's `recoverAddress` returns a promise.
- Fix: `await` it (`signer/src/delegation.js:122`). This is the trap that would have made the guard in item 8 decorative.

**11. `JSON.stringify` throws on `BigInt` — after a payment has settled**
- Symptom: the process dies mid-response; money has moved and the client holds no proof.
- Literal: the throw comes from `JSON.stringify` meeting a `bigint`; our own record of the incident is the sentence "Versi pertama berkas ini MATI di tengah permintaan berbayar" (`signer/src/server.js:75-76`).
- Root cause: the verification report carries `uint`s (`issuedAt`, `expiresAt`, token amounts) as `bigint`.
- Fix: `jsonBody()` serialises with a replacer that turns bigints into decimal strings, and the `try/catch` guarantees a 500 that explains instead of a dropped connection (`signer/src/server.js:83-90`) → **D39** ([[00-Overview/03 - Decisions]]). The harness reads the shares **from chain** afterwards, not from the server's own response (`signer/scripts/x402-check.js:152-161`).

**12. Extensionless imports from `web/src` need `tsx`**
- Symptom: a Node script that imports a `.ts` file from `../web/src` fails to resolve, while the same import works under Vite.
- Root cause: those files use extensionless specifiers; plain `node` will not resolve them.
- Fix: run under `tsx` — `npm run serve` is `tsx src/server.js` (`signer/package.json:17`), and the reason is stated in `signer/README.md:27`. Same in `web/` (`web/package.json:12-14`). `engines.node` is `>=22.18` (`signer/package.json:9-11`).

**13. `vm.prank` / `vm.expectRevert` consumed by a staticcall inside an argument**
- Symptom: `NotAnIssuer(0x7Fa9385b…1496)` — an address that is the **test contract**, not the pranked issuer; or `next call did not revert as expected`.
- Root cause: the getter evaluated while building the call's arguments is itself the next external call, so it eats the prank.
- Fix: hoist getter calls into variables, ideally in `setUp()` — that is why `schemaId` is cached there, with the failure spelled out at `test/CredentialResolver.fork.t.sol:87-93`. **This trap was hit twice**, and the second time it was already written down.

**14. A human-readable ABI handed to viem unparsed**
- Symptom: nothing at build time; the first chain call dies.
- Literal: `Cannot use 'in' operator to search for 'name' in function statusOf(bytes32 …)`.
- Root cause: viem needs a parsed ABI; `parseAbi([...])` was skipped. Neither `tsc` nor `vite build` catches it, and because the data layer deliberately never throws, it would have surfaced as **"credential not recognised"** for a valid certificate — the worst possible failure for a verification product.
- Fix: `parseAbi`, stated as mandatory in the file header (`web/src/abi.ts:15-21`). Caught by `npm run probe`, not by the compiler.

**15. `Failure on receiving a receipt`**
- Symptom: a broadcast reports that error and the operator concludes the transaction never happened.
- Root cause: the transaction **was** sent; only the wait failed. Re-running a state-changing script issues twice.
- Fix: read the sender's pending nonce before and after, and stop if it moved. `SeedDemo` is written to be idempotent and refuses to broadcast a guessed UID for the same reason (`script/SeedDemo.s.sol:25-38`) → [[01-Architecture/A2 - Why BAS and the EAS gap we close]].

**Dropped from this list deliberately:** the "a tool exited 0 with empty output, so a `git push` must have happened" trap. It is a real class of mistake and the habit (compare `git ls-remote` with `git rev-parse HEAD`) is sound, but nothing inside `app/` records that incident or its fix, so it is not a claim of this repository. The adjacent, evidenced version is "a build log printing `SUCCESSFUL` is not evidence" (`README.md:58`, [[08-Results/01 - Evidence and Limits]]).

**Related:** [[06-Spec-Research/01 - Spec Research]] · [[01-Architecture/A2 - Why BAS and the EAS gap we close]] ·
[[01-Architecture/A5 - Gas fronted and recovered]] · [[04-Signer-Service/S4 - Delegated issuance]] ·
[[03-Frontend/FE1 - Verifier page and verify.ts]] · [[00-Overview/04 - Corrections]] · [[09-Testing/00 - Hub Testing]]
