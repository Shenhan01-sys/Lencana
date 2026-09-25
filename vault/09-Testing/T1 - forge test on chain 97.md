---
tags: [testing, "T1"]
command: forge test --evm-version cancun --fork-url <97>
measured: 2026-09-25
result: 97 passed / 0 failed
---

# T1 - forge test on chain 97

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1, P2 · **Summary:** [[08-Results/P2 - Executive Summary]]

## Command

```powershell
cd app
forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com
```

`--evm-version cancun` is not decoration: BSC forks report no Cancun activation and the run dies with
`[NotActivated]` without it → [[R6 - Toolchain traps that cost time]].

## Result — 2026-09-25 (verbatim tail)

```
Ran 22 tests for test/SettlementSplit.t.sol:SettlementSplitTest        → ok
Ran 21 tests for test/SoulboundCert.t.sol:SoulboundCertTest            → ok
Ran  7 tests for test/SettlementSplitOnBsc.fork.t.sol:...ForkTest      → ok
Ran  9 tests for test/CredentialEndToEndOnBsc.fork.t.sol:...ForkTest   → ok
Ran 38 tests for test/CredentialResolver.fork.t.sol:...ForkTest        → ok
Ran 5 test suites in 34.52s (87.50s CPU time): 97 tests passed, 0 failed, 0 skipped (97 total tests)
```

| suite | n | offline or fork | what it covers |
|---|---|---|---|
| `SoulboundCert.t.sol` | 21 | offline | artifact rules: mint gating, the four refusal conditions, transfer/approval always reverting |
| `SettlementSplit.t.sol` | 22 | offline | bps cap, one-way `platformBps`, replay guard, `FalseToken`, native rejection, re-entrancy with the same ref |
| `CredentialResolver.fork.t.sol` | 38 | **fork of 97** | the whitelist gate on `attester`, prerequisite-alive check, delist/relist, `statusOf()` fields, delegated attestation |
| `CredentialEndToEndOnBsc.fork.t.sol` | 9 | **fork of 97** | the whole chain path against real BAS at `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD` |
| `SettlementSplitOnBsc.fork.t.sol` | 7 | **fork of 97** | settlement through the **canonical** Permit2 + `x402ExactPermit2Proxy`, identified by the proxy's own constants |

## What this does NOT prove

- A fork is not a broadcast. Deployment and real transactions are a separate record ([[T14 - verify the public deployment]]) and the paid run ([[T6 - npm run x402]]).
- Nothing here touches mainnet (56). The 56 figures are dated [[T2 - forge test on chain 56]].
- Test counts are properties of these files, not of the product's quality; a passing test proves the
  behaviour it asserts and nothing adjacent.

**Related:** [[02-Contracts/01 - Contracts]] · [[04-Signer-Service/S4 - Delegated issuance]]
