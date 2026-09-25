---
tags: [template]
---

# Template - Testing

> One file per harness command (or per test item where the harness has none). Paste **real output**,
> dated. This is the file a judge's re-run is compared against.

````markdown
---
tags: [testing, "T6"]
---

# T6 — x402 paid verification (`npm run x402`)

**AC:** [[07-Backlog/Acceptance-Criteria/AC-P3 - Paid verification]] · **Summary:** [[08-Results/P3 - Executive Summary]] ·
**Hub:** [[09-Testing/00 - Hub Testing]]

## Command

```powershell
cd signer
npm run x402          # needs ../.env: RPC_URL, CHAIN_ID=97, issuer + client keys, X402_* vars
```

## Result — 2026-09-25

```
[1] /healthz → payment.configured true …
[20] split ledger: issuer +900, platform +100
20 passed / 0 failed
```

## What this does NOT prove

- The facilitator is us, not a third party.
- The token is a demo ERC-20 with an open `mint`.
- No outside payer has ever hit this endpoint (no public URL yet).

## Failure modes seen

- `TypeError: Do not know how to serialize a BigInt` after settlement (fixed in `jsonBody()`).
- `429` from the judge model → honour `retry-after`.
````

Rules:
- The output block is **verbatim**, not paraphrased. Truncate with `…`, never rewrite.
- "What this does NOT prove" is mandatory. A test record without it invites an overstated claim.
- If the count changed since the last run, say so and say why (e.g. watched set grew).
