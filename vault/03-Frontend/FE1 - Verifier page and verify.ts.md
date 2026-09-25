---
tags: [frontend, "FE1"]
---

# FE1 - Verifier page and verify.ts

**Part of:** [[03-Frontend/01 - Frontend]]
**Source:** `web/src/verify.ts:281`, `web/src/render.ts:528`, `web/src/main.ts:2386`

**Summary:** The verifier is one function over one input: interpret the string, read chain state
with `eth_call`, return a `Report`. There is no server in this path and no signer — `verify.ts`
imports only viem's `createPublicClient`/`http` (`web/src/verify.ts:15`). It is deliberately
DOM-free, which is what lets `web/scripts/probe.ts:25` import the same file from Node and assert its
values against chain 97; that is the difference between "the page reads the right data" being
testable and being inferred from how it renders. The page prints the verdict, every read it made
(including the failed ones), and the commands needed to repeat the check without the page.

**Key points:**
- Input is interpreted into one of five readings (`web/src/verify.ts:38`): `bytes32` is tried first
  as a `credentialHash` via `attestationOf()`, then as our own attestation UID via `issuedHere()`
  (`web/src/verify.ts:459`); a decimal string is a soulbound `tokenId` read through `credentialOf()`
  (`web/src/verify.ts:482`); a 20-byte address becomes an issuer/collection check — `isIssuer` +
  `balanceOf` (`web/src/verify.ts:445`); anything else is `unresolved` with a note, not an error.
- `Verdict` has eight values (`web/src/verify.ts:49`). Only four are about the credential — `VALID`,
  `REVOKED`, `EXPIRED`, `ISSUER_DELISTED` — the rest are about our inability to answer: `NOT_FOUND`,
  `WRONG_CHAIN`, `NOT_CONFIGURED`, `UNREACHABLE`. A dead node must never read as a forged
  certificate, so `rpcChainId === null` returns before any credential logic
  (`web/src/verify.ts:398`).
- The decision ladder (`web/src/verify.ts:694`) is ordered on purpose: credential-level facts
  outrank the issuer-level judgement. `ISSUER_DELISTED` is not a synonym of `REVOKED` — the
  attestation is still on chain with `revocationTime = 0` (`web/src/verify.ts:716`), which is why
  the probe asserts both flags at once.
- Every read goes through one helper that logs and never throws (`web/src/verify.ts:336`); the log
  becomes a table with an ok/fail column (`web/src/render.ts:724`) and the page header prints
  `verdict / reads / failed / ms / block` (`web/src/main.ts:1609`).
- `decodeData()` expects 96 bytes of `attestation.data` (three words: credentialHash, courseId,
  lessonId) and reports a strange length instead of swallowing it (`web/src/verify.ts:219`).
- Reproduction is part of the product, not a footer: `finish()` builds the `cast call` lines, two
  raw JSON-RPC `curl` lines and a selector table from the same endpoint
  (`web/src/verify.ts:753-775`).
- Nine limit strings are attached to every report (`web/src/verify.ts:139`).

**Detail:**
- `verify()` runs in numbered sections (`web/src/verify.ts:351`, `:424`, `:441`, `:500`, `:539`,
  `:600`, `:625`, `:668`, `:687`, `:694`). The prerequisite walk (`web/src/verify.ts:600`) is a loop
  capped at 12 hops that reads each link's `revocationTime`/`expirationTime` and pushes
  `ACTIVE`/`REVOKED`/`EXPIRED`/`UNKNOWN` nodes; a broken link is added to `reasons`
  (`web/src/verify.ts:735`) while the verdict itself can stay `VALID` — that distinction is probe
  section 6 (`web/scripts/probe.ts:136-149`), not UI copy.
- The tuple order in `statusOf()` is load-bearing: seven values with `issuerDelisted` **fourth**
  (`web/src/abi.ts:30`), destructured by name (`web/src/verify.ts:518`) so an arity change fails
  compilation instead of silently showing the issuer's address as a timestamp.
- `parseAbi` is required, not stylistic: viem rejects a raw human-readable ABI, neither
  `npx tsc --noEmit` nor `npm run build` catches it, and because the data layer never throws, the
  symptom would be "credential not recognised" for a valid certificate (`web/src/abi.ts:14-21`).
- Endpoint config lives in `localStorage` under `bnb-credential-endpoint-v1` with three presets
  (`web/src/config.ts:12`, `:16`); `defaultEndpoint()` carries the public 97 deployment
  (`web/src/verify.ts:159`).
- The page reads `?q=` once at boot and runs immediately (`web/src/main.ts:2386`); hash routing
  maps `#/verify` to `page-verify` (`web/src/main.ts:1151`). `render.ts` is string-only — no
  `document`, no `window` — because `web/scripts/probe.ts:26` calls `renderReport()` from Node.
- What this path does **not** do: hold a key, broadcast a transaction, or grade anything. It reads.
  `verifyFromNode()` (`web/src/verify.ts:777`) exists only so a script can call `verify()` without a
  browser; it is the same function, not a second implementation.

**Related:** [[FE2 - Learning surface router]] · [[FE4 - Mount contract with the maintainer]] ·
[[FE6 - Quirks and open defects]] · [[02-Contracts/01 - Contracts]] ·
[[04-Signer-Service/S6 - x402 paid verification]] · [[Concepts/DOM-free Verification Module]]
