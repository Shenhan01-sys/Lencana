---
tags: [testing, "T1"]
command: forge test --evm-version cancun --fork-url <97>
measured: 2026-09-28
result: 104 passed / 0 failed
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

## Result — 2026-09-28 (verbatim tail)

```
Suite result: ok. 27 passed; 0 failed; 0 skipped
Suite result: ok. 22 passed; 0 failed; 0 skipped
Suite result: ok. 8 passed;  0 failed; 0 skipped
Suite result: ok. 9 passed;  0 failed; 0 skipped
Suite result: ok. 38 passed; 0 failed; 0 skipped
Ran 5 test suites in 19.15s (56.61s CPU time): 104 tests passed, 0 failed, 0 skipped (104 total tests)
```

Run sebelumnya di berkas ini: **97 passed / 0 failed** (25 Sep) dengan tabel yang sama, kecuali dua
suite yang sejak itu bertambah — artefak 21 → **27** (gerbang granularitas kursus D42, batch D43,
`EmptyBatch`/`BatchLengthMismatch`/`BatchTooLarge`, metadata yang ikut status) dan split-on-97 fork
7 → **8** (token demo enam desimal). Angka lama tidak kuhapus: ia tanggalnya, dan halaman ini adalah
riwayat, bukan papan angka.

| suite | n | offline or fork | what it covers |
|---|---|---|---|
| `SoulboundCert.t.sol` | **27** | offline | artifact rules: mint gating, the four refusal conditions, course-granularity gate (D42), batch guards (D43), metadata following status, transfer/approval always reverting |
| `SettlementSplit.t.sol` | 22 | offline | bps cap, one-way `platformBps`, replay guard, `FalseToken`, native rejection, re-entrancy with the same ref |
| `CredentialResolver.fork.t.sol` | 38 | **fork of 97** | the whitelist gate on `attester`, prerequisite-alive check, delist/relist, `statusOf()` fields, delegated attestation |
| `CredentialEndToEndOnBsc.fork.t.sol` | 9 | **fork of 97** | the whole chain path against real BAS at `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD` |
| `SettlementSplitOnBsc.fork.t.sol` | **8** | **fork of 97** | settlement through the **canonical** Permit2 + `x402ExactPermit2Proxy`, identified by the proxy's own constants |

## What this does NOT prove

- A fork is not a broadcast. Deployment and real transactions are a separate record ([[T14 - verify the public deployment]]) and the paid run ([[T6 - npm run x402]]).
- Nothing here touches mainnet (56). The 56 figures are dated [[T2 - forge test on chain 56]].
- Test counts are properties of these files, not of the product's quality; a passing test proves the
  behaviour it asserts and nothing adjacent.

**Related:** [[02-Contracts/01 - Contracts]] · [[04-Signer-Service/S4 - Delegated issuance]]
