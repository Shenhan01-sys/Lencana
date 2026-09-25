---
tags: [signer, "S1"]
---

# S1 - The credential document

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/credential.js:46`, `signer/src/context.js:30`, `signer/src/sign.js:79`

**Summary:** `buildOpenBadgeCredential()` returns an unsigned `OpenBadgeCredential` plus the
`credentialHash` and the two status-list slots it just allocated; `signDocument()` then attaches the
`DataIntegrityProof`. Each field rule below exists because the raw OB 3.0 / VC 2.0 context files were
read rather than remembered — see [[06-Spec-Research/01 - Spec Research]]. The document carries no
learner name and no DID, and it holds no score of its own: that arrives from
[[S5 - Grading and the model judge]].

**Key points:**
- `@context` is exactly two URIs, in this order: `https://www.w3.org/ns/credentials/v2`, then
  `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json` (`signer/src/context.js:18,21,30`).
  The order is part of what gets signed — RDFC-2022 canonicalises the document. The OB context does
  **not** provide `credentialStatus`, `proof` or `validUntil`; those come from the W3C one.
- Type inheritance (`signer/src/credential.js:68-104`): `['VerifiableCredential',
  'OpenBadgeCredential']` → `credentialSubject.type = 'AchievementSubject'` →
  `achievement.type = ['Achievement']` → `result[].type = ['Result']`. `issuer` is an object with
  `type: 'Profile'` (`:69`) — while the status-list document uses a **bare issuer URL**
  (`signer/src/statusList.js:118`), because `Profile` is an Open Badges term and that document
  carries only the W3C context.
- `validFrom` / `validUntil` (`:70`, `:72`). `issuanceDate` is a VC 1.1 property and
  `expirationDate` is not VC 2.0 at all, so neither is ever written. Asserted, not commented:
  `signer/scripts/check.js:65` and `:67` test the legacy fields `=== undefined`.
- `achievement.criteria` (`credential.js:90`) is mandatory even though `narrative` is optional — `check.js:69`.
- `id` XOR `identifier` (`credential.js:82`, `check.js:70`). We emit
  `${baseUrl}/learners/0x…`. Choosing `identifier` means adopting the `IdentityObject` scheme
  (identityType + identityHash + hashed + salt); the address is bound cryptographically already, but
  on chain — see [[02-Contracts/01 - Contracts]].
- `result[].value` is a **string** (`credential.js:106`), with `resultDescription` pointing at the
  rubric URL. The OB 2.0 shapes (`resultScore`, `achievementId`, `identity`, `statement`) are not
  terms in context 3.0.3: jsonld 9 in safe mode drops unknown properties and then fails as "did not
  expand into an absolute IRI" — a message that points at the wrong file entirely.
- `credentialStatus` is two entries (`credential.js:112`); `statusListIndex` is a base-10 integer
  expressed as a string (`statusList.js:93`), and the entry's `id` must differ from the list URL, so
  it carries a `#uid` fragment (`statusList.js:88-90`; `check.js:78`, `:84`).
- Proof shape: `DataIntegrityProof`, `cryptosuite: eddsa-rdfc-2022`, `proofPurpose:
  assertionMethod`, `verificationMethod` as an **HTTP URL with a fragment**, `proofValue` multibase
  base58btc (leading `z`) — `check.js:94-99`. `signDocument` throws if the suite produced anything
  else (`sign.js:89-92`); a different cryptosuite would still "succeed" locally and be refused by a
  validator.
- Verification is handed **no key**: it reads one from `proof.verificationMethod` via the issuer
  document (`sign.js:100`), so the caller cannot improve the result. Round trip: `check.js:101-102`
  verifies the signed document, then `check.js:104-107` edits one field
  (`result[0].value`: `87` → `100`) and requires `verified === false`. Two sharper refusals sit next
  to it — repointing `verificationMethod` at another well-formed key (`check.js:112`) and emptying
  `assertionMethod` in the issuer document (`check.js:121`) — the document-layer twin of the
  on-chain issuer whitelist.

**Detail:**
- One number feeds two layers: `expiresAtUnix` becomes `validUntil` in the document and the BAS
  attestation `expirationTime` (`signer/scripts/issue.js:194`). They do not sync by themselves;
  writing them from two values is how "expired" would read differently on our page than on a
  third-party validator.
- `credentialHashOf()` (`credential.js:31`) is the JS twin of `_vcHash()`. It is the **course-level**
  form; lesson-level hashes come from `web/src/content.ts`, where omitting `lessonId` is not the same
  as passing `EMPTY_UID`. `check.js:38-42` binds the JS derivation to a hash read off chain 97, so a
  change to the Solidity side that is not mirrored here turns this harness red.
- `makeDocumentLoader()` (`sign.js:47`) serves our own URLs from memory, splits the `#fragment`
  before lookup, and pulls the requested key out of `assertionMethod`. Returning `undefined` for a
  de-listed key is intentional — verification must fail, not fall through to the network.
- Third-party contexts are still fetched over the network by jsonld's default loader — the known
  place to vendor them if offline determinism ever matters. The document's own `id` is
  `${baseUrl}/credentials/<hash>`, the same path the server answers (see
  [[S7 - Server routes and lifecycle]]), so a link printed on a diploma resolves.

**Related:** [[S2 - Status lists from chain state]] · [[S3 - Two status lists]] ·
[[S5 - Grading and the model judge]] · [[S7 - Server routes and lifecycle]] ·
[[06-Spec-Research/01 - Spec Research]] · [[02-Contracts/01 - Contracts]] · [[01-Architecture/01 - Architecture]]
