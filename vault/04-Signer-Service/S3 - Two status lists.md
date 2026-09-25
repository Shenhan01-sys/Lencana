---
tags: [signer, "S3"]
---

# S3 - Two status lists

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/statusList.js:9-18`, `signer/src/chainStatus.js:48`, `signer/src/chainStatus.js:59`

**Summary:** There are two `BitstringStatusListCredential`s because two different facts are being
reported, with different owners and different reversibility. `revocation` answers "did the issuer
cancel this credential" — permanent, and it is the issuer's act. `suspension` answers "is this issuer
currently trusted by the platform" — recoverable, and it is the platform's act. Collapsing them into
one list would delete the distinction, because every verifier that does not know our scheme reads a
set bit as revoked. `expired` is in neither list on purpose.

**Key points:**
- Both lists come from the same renderer with a different `purpose`, and every credential carries two
  `credentialStatus` entries (`credential.js:112`, `statusList.js:86`). BSL allows more than one entry
  per credential, so nothing forces compression.
- `revocation` ← `statusOf().revoked`, which is `attestation.revocationTime != 0` in
  `contracts/CredentialResolver.sol:303` — written only by the attester through BAS `revoke()`. BSL's
  wording for this purpose is "cancel the validity … not reversible", which is exactly EAS semantics.
- `suspension` ← `statusOf().issuerDelisted` = `_delisted[a.attester]`
  (`contracts/CredentialResolver.sol:305`), set by `delistIssuer()` (`:214-217`) and cleared by
  `relistIssuer()` (`:222-225`), readable directly as `isDelisted(address)` (`:235`). BSL's wording is
  "temporarily prevent the acceptance … reversible" — the same direction as **D30**, so the
  platform's brake is now visible to tools that are not ours.
- The mapping is two functions, not a branch in the renderer: `revokedUids()` (`chainStatus.js:48`)
  and `suspendedUids()` (`chainStatus.js:59`). The latter is `issuerDelisted && !revoked`, so a
  credential revoked by its own issuer is not *also* reported as suspended — the two lists never hand
  a verifier two flags to arbitrate.
- One bit cannot hold both: `statusSize: 2` with `statusMessage` could encode two states, but a
  standard verifier that does not read our `statusMessage` sees `1` and says "revoked". That would
  tell a learner their certificate is permanently dead when the real fact is "the issuer is paused",
  and it is falsifiable in one `eth_call` (`revocationTime` is still `0`).
- `expired` is deliberately excluded from both (`chainStatus.js:52-57`): the document already carries
  `validUntil` and verifiers read it themselves. Encoding expiry twice creates two sources of truth
  that are allowed to disagree.
- The `suspension` bit reverses with no re-issuance: relisting removes it on the next render, because
  nothing is cached — see [[S2 - Status lists from chain state]].

**Detail:**
- Delisting an issuer **does not cancel credentials already issued**. `delistIssuer()` writes only the
  `_delisted` mapping; it never calls BAS `revoke()`, so every credential that issuer published keeps
  `revocationTime == 0` and its revocation bit stays `0`. What changes is whether the issuer is
  trusted for new work and how the existing ones are labelled — `ISSUER_DELISTED`, never "revoked".
  Full reasoning in [[01-Architecture/01 - Architecture]].
- Both directions are asserted in code, offline (`check.js:143`) and against live chain state
  (`check.js:207-208` revoked → revocation 1 / suspension 0; `check.js:213,217` delisted → suspension
  1 / revocation 0), then again over HTTP per credential
  (`serve-probe.js:108-109`, `pembeda D30 bertahan`).
- The harness refuses to guess which uid owns which bit: it reads the slot map from `/healthz`
  (`serve-probe.js:77`) rather than assuming allocation order, so a changed allocation cannot produce
  a stale green.
- Today's watched set is 11 credentials with 1 revoked and 1 suspended (printed by
  `serve-probe.js:71-72` and by `npm run anchor -- --dry-run`).
- Neither list carries a reason string: `statusSize` is left at its implicit `1` and `statusMessage`
  is not written (`statusList.js:24-25`). A bit answers "flagged or not"; *why* stays on chain.
- Two lists means two 2048-byte bitstrings — and while both are empty they hash identically, which is
  a limit on what an anchor can show, not a bug in this section (`signer/README.md`).

**Related:** [[S2 - Status lists from chain state]] · [[S1 - The credential document]] ·
[[S7 - Server routes and lifecycle]] · [[02-Contracts/01 - Contracts]] ·
[[00-Overview/03 - Decisions]] · [[Concepts/Anchored Bits not Membership]]
