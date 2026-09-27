---
tags: [module, 01]
---

# 01 - Architecture

**Purpose:** Why the credential lives on a public attestation service instead of our database, and what that buys us that a certificate platform does not normally have.

## Files in this module
- [[01-Architecture/01 - Architecture]]
- [[01-Architecture/A2 - Why BAS and the EAS gap we close]]
- [[01-Architecture/A5 - Gas fronted and recovered]]

## Key facts
- BNB Attestation Service is a fork we do not own; the gap we close (EAS does not enforce prerequisite liveness) is argued in [[01-Architecture/A2 - Why BAS and the EAS gap we close]].
- Gas economics: [[01-Architecture/A5 - Gas fronted and recovered]] - the platform pays issuance, recovers from a fixed share, never per credential.
- The three hashes (`credentialHash`, `rubricHash`, `manifestHash`) and what each one commits.
