---
tags: [module, 02]
---

# 02 - Contracts

**Purpose:** The ~~four~~ five contracts on BNB Chain testnet *(Koreksi 3 Okt: `CourseDeposit` dideploy 30 Sep malam, B90)*, what each refuses, and the command that proves the addresses we quote are real.

## Files in this module
- [[02-Contracts/01 - Contracts]]
- [[02-Contracts/C1 - CredentialResolver]]
- [[02-Contracts/C2 - SoulboundCert]]
- [[02-Contracts/C3 - SettlementSplit]]
- [[02-Contracts/C4 - DemoCourseToken and the x402 interface]]
- [[02-Contracts/C5 - CourseDeposit]]

## Key facts
- `cd signer && npm run verify:deploy` compares our documented claims with chain 97: 15 checks, 0 mismatch on 28 Sep.
- `--evm-version cancun` is mandatory on `forge test` AND `forge script`; the repo records why.
- Revocation is permanent and delisting is recoverable, and the two are different admin actions - see [[02-Contracts/C1 - CredentialResolver]].
