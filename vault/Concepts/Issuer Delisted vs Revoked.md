---
tags: [concept]
---

# Issuer Delisted vs Revoked

**Definition:** two facts about two different subjects. **Revoked** = this credential was cancelled by its own attester; permanent, and visible as `revocationTime != 0` on BAS. **Delisted** = the platform currently refuses to stand behind this *issuer*; reversible, and it changes **no byte** of any attestation.

**Why it is in this vault:** because the tempting sentence is false and the safe sentence looks weaker than it is. "The platform can revoke problematic credentials" is not true — EAS admits only the original attester as revoker, and a test proves the platform's own rejection (`test_fork_PlatformTidakBisaMencabutKredensialAgen`, `test/CredentialResolver.fork.t.sol:397-405`, asserting `AccessDenied` and `revoked == false`). And displaying a delisting *as* "revoked" is disprovable by anyone in one `eth_call`, because `revocationTime` stays `0`.

**Facts:**
- Four actions, two mappings (`contracts/CredentialResolver.sol`): `addIssuer` `:183`, `removeIssuer` `:199` (licence gone, issued credentials stay VALID), `delistIssuer` `:213` (licence gone **and** `_delisted` set), `relistIssuer` `:222` (both restored). `addIssuer` cannot silently readmit a delisted agent — `DelistedCannotBeReadmitted` (`:141`, raised `:186`), because readmission is its own event-emitting act.
- What delisting additionally blocks, all three tested: new issuance by that issuer (`NotAnIssuer`, test at `:429`), its credentials being used as a **prerequisite** by a *different, healthy* agent (`PrerequisiteIssuerDelisted`, declared `contracts/CredentialResolver.sol:153`, asserted at `test/CredentialResolver.fork.t.sol:455`), and minting a new artifact (`IssuerDelisted`, `contracts/SoulboundCert.sol:128`). Without the prerequisite rule, delisting would be cosmetic exactly in the scenario a marketplace produces — a learner switching agent mid-course.
- What delisting does **not** do, asserted rather than claimed: `test_fork_Delisting_MenandaiTanpaMencabut` (`test/CredentialResolver.fork.t.sol:411-427`) requires the record to still exist, `revoked` still false, `isAttestationValid(uid)` still true, `revocationTime == 0`, and only `statusOf`'s `issuerDelisted` flag changed.
- Reversibility is structural: the flag lives on the issuer, so `relistIssuer` restores every older credential at once (`test_fork_Relisting_MemulihkanStatusDanHak`, `:462`).
- The two verdicts stay separate in the UI by precedence — credential-level facts first: `REVOKED` (`web/src/verify.ts:706`), `EXPIRED` (`:711`), only then `ISSUER_DELISTED` (`:716`), with the reason text naming the difference (`:717-723`).
- They are separate in the standard's own vocabulary too, which is why there are **two** status lists: `revoked` → the `revocation` purpose ("not reversible"), `issuerDelisted && !revoked` → the `suspension` purpose ("reversible") — mapping at `signer/src/chainStatus.js:48-63`, rationale at `signer/src/statusList.js:8-19`.

**Not to be confused with:** [[Anchored Bits not Membership]] — the distinction above is about *which fact a verdict states*; that note is about *how much a chain witness proves* about a served list. Both are limits on wording, from different directions.

**Sources:** `contracts/CredentialResolver.sol:141,153,183-236,282` · `contracts/SoulboundCert.sol:128` · `test/CredentialResolver.fork.t.sol:397,411,429,455,462` · `web/src/verify.ts:706-723` · `signer/src/chainStatus.js:48-63` · `signer/src/statusList.js:8-19` · [[02-Contracts/01 - Contracts]] · [[04-Signer-Service/S3 - Two status lists]]
