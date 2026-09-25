---
tags: [concept]
---

# rubricHash and manifestHash

**Definition:** two keccak256 commitments over the issuer's `CourseManifest`, deliberately split. `rubricHashOf()` hashes the **assessment policy only** (`web/src/manifest.ts:102-104`); `manifestHashOf()` hashes the **whole manifest including lesson text** (`:112-124`). Policy versus material — that is the entire difference.

**Why it is in this vault:** it stops two sentences that are both wrong and both easy to write. "We fixed a typo in a lesson, so the rubric of issued diplomas changed" (it did not: `rubricHash` is unchanged — `web/scripts/rubric-check.ts:92`). And the mirror failure, "we swapped an answer key and nothing moved" (it moved: `rubric-check.ts:110`). If the two hashes were one hash, both statements would be true at once and neither could be checked.

**Facts:**
- What `rubricHash` commits to, enumerated field by field in `canonicalPolicy()` (`web/src/manifest.ts:53-100`): schema id, course id, `criteria`, the three `weights`, `passMark`, `validDays`, `prereqCourseId`, every quiz (question id, answer key, option count, prompt) and every essay (slug, `minWords`, prompt, rubric label + max, guidance). Written explicitly rather than as `JSON.stringify` of the object, because JS key order would move the hash on a cosmetic edit (`:49-52`) — and that is tested: a different written key order yields the same hash (`rubric-check.ts:98`).
- What only `manifestHash` adds: issuer fields, `publishedAt`, and each lesson's `title`/`summary`/`blocks` (`:116-123`). Its stated use is "the material you read today is the material that graded you" (`:107-111`).
- Sensitivity, all measured by `npm run rubric` (17 checks / 0 failed, 25 Sep): rubric weights moved between two criteria while keeping the same total → hash changes (`:87-88`); answer key flipped → changes (`:110`); typo fixed in reading text → `rubricHash` unchanged, `manifestHash` changed (`:92-94`).
- What reaches the credential: the issuer's `criteria` text plus ` [rubrik <12 hex>]`, where the 12 hex are `shortHash(rubricHash)` (`signer/scripts/issue.js:235-241`, `web/src/manifest.ts:126-128`). A score can therefore be attributed to a policy version from the document alone; the store keeps `rubricHash`/`rubricRef` beside the score (`issue.js:274-277`).
- The commitment has a stated ceiling: it is a commitment to **our canonical serialisation**, not to JCS/RDFDS, so two parties comparing must call the same function (`web/src/manifest.ts:19-23`). It is not a hash of the learner's work and not a certification.
- Authority, not arithmetic: the manifest is the issuer's, and that is what **D37** fixed — `passMark` had been display text while the platform invented a passing grade from a CLI flag, since removed ([[00-Overview/03 - Decisions]]).

**Not to be confused with:** [[Concepts/Credential Hash vs Attestation UID]] — that pair identifies *a credential*; this pair commits to *the rules* and to *the material*. Neither is on chain: only the credential hash reaches BAS.

**Sources:** `web/src/manifest.ts:49-128` · `web/scripts/rubric-check.ts:72-110` · `signer/scripts/issue.js:229-241,274-277` · `web/src/score.ts:75,119` · [[05-Course-Content/K2 - The issuer manifest and rubricHash]] · [[09-Testing/00 - Hub Testing]]
