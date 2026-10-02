---
tags: [reference, glossary]
status: active
updated: 2026-10-03
---

# Glossary

Only terms this repository actually uses, each with where it lives in code. No marketing vocabulary, and
no term that exists only in the pitch.

| term | what it means here | where |
|---|---|---|
| **attestation** | the on-chain record: three `bytes32` (credential, course, lesson) plus attester, recipient, time | `contracts/CredentialResolver.sol`, BNB Attestation Service |
| **attester** | ~~the issuer's agent EOA that signed the claim~~ the **publisher's key** (EOA) that signed the claim - never the platform *(Koreksi 3 Okt, D54: "agent EOA" dulu berarti kunci penerbit; sejak 1 Okt "agen" berarti agen penilai ERC-8004 sewaan yang hanya menilai dan mengusulkan angka — agen tidak pernah menjadi attester, tidak menandatangani dan tidak mencabut kredensial. `npm run admit` menerima kunci penerbit dan menolak dompet agen.)* | `signer/src/delegation.js` |
| **`credentialHash`** | `keccak256(abi.encodePacked("vc:", holder, courseId))` - identity only, no grade | `web/src/content.ts`, `signer/src/credential.js` |
| **`rubricHash`** | keccak over the grading **policy** only; printed into `achievement.criteria` | `web/src/manifest.ts` |
| **`manifestHash`** | policy **and** material; a typo in course text moves this one, not `rubricHash` | `web/src/manifest.ts` |
| **`uid`** | attestation id; mixes in the mined block timestamp, so it can never be predicted or used as the credential identifier | `signer/scripts/issue.js` |
| **`statusOf`** | one read returning `exists / revoked / expired / issuerDelisted / issuer / issuedAt / expiresAt` | `contracts/CredentialResolver.sol` |
| **delisting vs revocation** | delisting pauses an issuer and is recoverable; revocation ends one credential permanently | [[04-Signer-Service/S3 - Two status lists]] |
| **soulbound artefact** | ERC-721 + ERC-5192 display token, `tokenId = uint256(credentialHash)`, non-transferable, **not** the credential | [[02-Contracts/C2 - SoulboundCert]] |
| **anchored bits** | the served bitstring's SHA-256 timestamped on chain: proves which bits were served, not who was in the list | [[Concepts/Anchored Bits not Membership]] |
| **`exact` (x402)** | payment scheme where the client signs two EIP-712 payloads and sends zero transactions | [[04-Signer-Service/S6 - x402 paid verification]] |
| **fronted gas** | platform pays issuance gas and recovers it from a fixed share of revenue, never as a cut of one issuer's payout | [[Concepts/Fronted Gas]] |
| **negative control** | a grader that cannot fail a fluent-but-empty answer certifies nothing | [[Concepts/Negative Control]] |
| **built to the specification** | ~~the only interoperability sentence allowed until a conformance body says otherwise~~ *(Koreksi 3 Okt: bukan satu-satunya lagi sejak 28 Sep — kalimat yang boleh kini juga "kredensial dari backend ini **lolos** validator OB 3.0 milik 1EdTech (`vc.1ed.tech`)", dengan batasnya: validator anggota, **bukan** sertifikasi; "compatible/certified/conformant" tetap dilarang. Rumusan persisnya hanya di baris pertama [[10-Contributors/Claims-Cheat-Sheet]], buktinya [[09-Testing/T15 - 1EdTech validator]].)* | [[10-Contributors/Claims-Cheat-Sheet]] |

**Related:** [[Quick-Reference]] · [[Conventions]] · [[00-Overview/06 - Business Process]]
