---
tags: [signer, hub]
status: active
updated: 2026-09-25
---

# 01 - Signer Service

`../signer/` — the piece that turns an assessment into a standard document, and the piece that
handles money. Node, no framework, `tsx` for anything that imports from `../web/src` (those files use
extensionless imports → [[R6 - Toolchain traps that cost time]]).

Three responsibilities that must not be merged in the reader's head:

| | what it does | who it belongs to |
|---|---|---|
| **Document** | builds `OpenBadgeCredential` (VC 2.0) with `DataIntegrityProof` / `eddsa-rdfc-2022`, and two `BitstringStatusListCredential`s derived from chain state on every request | the platform, as a service to the issuer |
| **Agent** | signs attestations **as the third-party issuer** through `attestByDelegation`, grades essays (mechanically against the issuer's rubric, or with a model), and anchors list hashes to BAS | the issuer's key signs; the platform pays gas |
| **Payment** | answers `402 Payment Required`, verifies the x402 `exact` scheme's signature and target, broadcasts the settlement, then splits it in `SettlementSplit` | the platform |

`src/server.js` is the product. Everything named `check` / `probe` / `x402` / `judge` / `delegate` /
`anchor` is a **harness** so a stranger can re-run a claim from a clone — not a feature the user is
supposed to type.

## Parts

- [[S1 - The credential document]] — field order, the `id` XOR `identifier` rule, `result[].value`, `verificationMethod` as an HTTP URL, multibase proof value
- [[S2 - Status lists from chain state]] — `LIST_BITS = 16384`, slot allocation, `servedHashes()` as the single source, and what an anchor does **not** prove
- [[S3 - Two status lists]] — why one bit cannot hold both a permanent revocation and a recoverable delisting
- [[S4 - Delegated issuance]] — the EIP-712 domain read from the contract, `ATTEST_TYPEHASH`, single vs batch request shapes, the recover-guard, agent balance unchanged to the wei
- [[S5 - Grading and the model judge]] — `grade.js` (mechanical, refuses) vs `judge.js` (model, fail-closed), the negative control, measured spread
- [[S6 - x402 paid verification]] — the handshake, the guards that refuse to pay gas for someone else's transfer, batch pricing and the break-even arithmetic
- [[S7 - Server routes and lifecycle]] — every route, `/healthz` as the state witness, `jsonBody()` and the BigInt failure it exists for

## Reproduce

```powershell
cd app/signer
npm install
node scripts/check.js            # 53 checks / 0 failed (25 Sep) — needs ../.env values in the environment
node scripts/serve-probe.js      # 20 checks / 0 failed (25 Sep) — in-process HTTP, no port exposure
```

⚠️ The chain-reading harnesses read `process.env` directly. Without `RPC_URL`, `RESOLVER_ADDRESS`,
`BAS_ADDRESS` and the watched hashes they **fall back to defaults and skip whole groups of checks**
while still printing a green line — the summary reports the skipped group, and reading only the count
is how a false green gets believed. See [[09-Testing/00 - Hub Testing]].

**Related:** [[02-Contracts/01 - Contracts]] · [[05-Course-Content/01 - Course Content]] · [[00-Overview/03 - Decisions]]
