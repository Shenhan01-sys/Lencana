---
tags: [testing, "T2"]
command: forge test --evm-version cancun --fork-url <56>
measured: 2026-09-23
result: 97 passed / 0 failed
---

# T2 - forge test on chain 56

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app
forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/
```

## Result — 2026-09-23 (not re-run since)

`97 tests passed, 0 failed, 0 skipped`, same five suites, **identical gas figures** to
[[T1 - forge test on chain 97]].

**⚠️ Date this figure honestly.** It was measured on 23 Sep on the commit of that day. The 25 Sep
re-run was done against chain 97 only. Writing "97 tests pass on 97 and 56" without dates implies both
were re-measured; they were not → [[00-Overview/04 - Corrections]].

## Why run the suite against mainnet state at all

`CredentialResolver` and the split tests speak to the **canonical** BAS and the canonical x402 proxy.
Passing on 56 proves the interfaces and constants match the production deployment — it does **not**
mean we are deployed there, and we are deliberately not (testnet satisfies the rules; the requirement
is an address that resolves on an explorer).

## What this does NOT prove

- No deployment, no transaction, no funds on chain 56. See [[08-Results/01 - Evidence and Limits]].
- That RPC endpoints are reliable under burst: public endpoints on this project have returned
  `Request timeout on the free plan`, HTTP 500 and 7/10 flakiness. Endpoint choice is documented in
  [[R6 - Toolchain traps that cost time]].

**Related:** [[T1 - forge test on chain 97]] · [[02-Contracts/01 - Contracts]]
