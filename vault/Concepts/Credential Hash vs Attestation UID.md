---
tags: [concept]
---

# Credential Hash vs Attestation UID

**Definition:** `credentialHash` is `keccak256(abi.encodePacked("vc:", holder, courseId))` — with `lessonId` appended as a fourth packed element for a lesson-level credential. It denotes *a claim about one learner and one course* and is computable before anything exists on chain. The attestation UID is BAS's identifier for a *recorded attestation*, and it mixes in the timestamp of the mined transaction.

**Why it is in this vault:** two defects it prevents. A script that feeds a UID it just created into a later step of the same run is guessing — `revoke(uid)` then reverts `AttestationNotFound` and `attest(refUID: uid)` reverts `InvalidUID` (`script/SeedDemo.s.sol:29-33`), which is why `SeedDemo` is documented as two runs. And treating the hash as "the attestation" produces claims that are wrong in the other direction: before issuance the UID does not exist, after a re-issue it changes while the hash may not.

**Facts:**
- Two forms, not one — `web/src/content.ts:131-137` packs `['string','address','bytes32']` for a course and `['string','address','bytes32','bytes32']` for a lesson. Passing `EMPTY_UID` as `lessonId` does **not** reproduce the course-level hash (`content.ts:121-129`); the caller must choose. `signer/src/credential.js:31-38` implements the course-level form only.
- Predictable, therefore script-safe: the derivation is recomputed and asserted against chain 97 by two harnesses (`web/scripts/probe.ts:207-211`, `signer/scripts/check.js:34-42`). A change on the Solidity side that is not mirrored in TypeScript turns those red instead of shipping a wrong document.
- The UID formula, as recorded in the repo: `keccak256(schema, recipient, attester, TIME, expirationTime, revocable, refUID, data, bump)` where `TIME` is the mined `block.timestamp` (`script/SeedDemo.s.sol:26-28`, `README.md:151-153`). It cannot be known while the script is still simulating.
- The only bridge from hash to UID is on-chain and exists only after acceptance: `attestationOf(bytes32) → uid`, written inside `onAttest()` (`contracts/CredentialResolver.sol:242-260`, mapping at `:74`), and read by the page to interpret an input (`web/src/verify.ts:463-467`).
- The credential document itself references the **UID** — `statusEntry()` puts it in the `credentialStatus` `id` fragment (`signer/src/statusList.js:86-95`) — so a document can only be assembled after issuance, while a *plan* for one can be assembled from the hash alone.
- Rule of thumb, recorded as **D32** in [[00-Overview/03 - Decisions]]: scripts may consume hashes, never a UID they just created.

**Not to be confused with:** [[Concepts/Anchored Bits not Membership]] — here a predictable identifier is treated as a record; there a fixed-length witness is treated as a statement about membership. Both errors come from reading a hash as the thing itself.

**Sources:** `web/src/content.ts:121-137` · `signer/src/credential.js:31` · `script/SeedDemo.s.sol:25-38` · `contracts/CredentialResolver.sol:74,242` · `signer/src/statusList.js:86-95` · `web/scripts/probe.ts:207-211` · `README.md:151-157` · [[00-Overview/04 - Corrections]] (a first version returned 54 bytes that looked like a hash)
