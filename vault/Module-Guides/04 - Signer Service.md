---
tags: [module, 04]
---

# 04 - Signer Service

**Purpose:** The one component that holds keys: it signs the issuer's claim, builds the status lists from chain state, settles payments, and serves the URLs printed inside every credential.

## Files in this module
- [[04-Signer-Service/01 - Signer Service]]
- [[04-Signer-Service/S1 - The credential document]]
- [[04-Signer-Service/S2 - Status lists from chain state]]
- [[04-Signer-Service/S3 - Two status lists]]
- [[04-Signer-Service/S4 - Delegated issuance]]
- [[04-Signer-Service/S5 - Grading and the model judge]]
- [[04-Signer-Service/S6 - x402 paid verification]]
- [[04-Signer-Service/S7 - Server routes and lifecycle]]

## Key facts
- Serving order and the two contract bugs found here in September (the document route returning a store row; `/criteria` and `/results` pointing at nothing) are in [[04-Signer-Service/S7 - Server routes and lifecycle]].
- A served list cannot be older than the chain, and an anchor proves which bits were served - not who was in the list ([[04-Signer-Service/S2 - Status lists from chain state]]).
- The agent signs, the platform broadcasts: [[04-Signer-Service/S4 - Delegated issuance]].
