---
tags: [contract, hub]
status: active
updated: 2026-09-25
---

# 01 - Contracts

`../contracts/` — four contracts, **two of which do the work we claim**. Neither `SettlementSplit`
nor `DemoCourseToken` is required for a credential to be verifiable: remove the money path and the
product still stands, which is the point (verification is free → [[00-Overview/03 - Decisions]] D23).

| contract | on chain 97 | role |
|---|---|---|
| `CredentialResolver.sol` | `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` | registry of allowed issuers + the EAS/BAS hook that decides whether an attestation is admissible, and the 7-field status read that every verdict comes from |
| `SoulboundCert.sol` | `0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c` | the artifact: ERC-721 + ERC-5192, minting refuses a credential that is not live, transfers always revert |
| `SettlementSplit.sol` | `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE` | receives one payment, divides it, keeps nothing, cannot raise its own fee |
| `DemoCourseToken.sol` | `0xEd19cDeB8b4Bb3355651680b089222d1140bCDDe` | the ERC-20 the demo is paid in. **Open `mint`, never mainnet** — labelled as a demo everywhere it appears |

Plus `contracts/interfaces/IX402ExactPermit2Proxy.sol`, which is a **mirror of a contract we did not
deploy** — the canonical proxy. Fork tests identify it by its own constants rather than trusting an
address in a document ([[06-Spec-Research/R5 - x402 exact Permit2 and the proxy]]).

## Parts

- [[C1 - CredentialResolver]] — `statusOf()`'s seven fields, the `onAttest` gate on `attester`, `delistIssuer`/`relistIssuer`, the prerequisite check that EAS does not do, and the real error names
- [[C2 - SoulboundCert]] — why `mint()` only admits `owner()`, the four conditions a credential must satisfy to become an artifact, `NotTransferable()`
- [[C3 - SettlementSplit]] — `sharesOf()` flooring the platform share, `splitDone[ref]`, one-way `platformBps`, and the deliberate absence of a debt ledger
- [[C4 - DemoCourseToken and the x402 interface]] — what a demo token may and may not be used to claim, and how the proxy interface was derived

## Reproduce

```powershell
cd app
forge build
forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com   # 97 passed / 0 failed (25 Sep)
```

⚠️ `--evm-version cancun` is mandatory on `forge test` **and** `forge script` → [[R6 - Toolchain traps that cost time]].

**Related:** [[01-Architecture/01 - Architecture]] · [[09-Testing/T1 - forge test on chain 97]] · [[05-Course-Content/01 - Course Content]]
