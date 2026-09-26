---
tags: [lms-reference, comparison, "L8"]
status: active
updated: 2026-09-26
---

# L8 - Lencana vs the six LMS

The comparison the builder asked for: what separates us **by design**, what actually separates us **in
the code today**, and where our implementation is short. Every cell traces to one of
[[L1 - LearnHouse]] · [[L2 - Frappe LMS]] · [[L3 - Chamilo]] · [[L4 - Moodle]] · [[L5 - Open edX]] ·
[[L6 - Canvas]], or to a file in `app/`.

**Part of:** [[12-LMS-References/00 - Hub LMS References]]

## A. By design — differences we chose, with their evidence

| dimension | what the six do | what we do | why it matters |
|---|---|---|---|
| **The artifact** | a row in their database, rendered to HTML/PDF. Chamilo: three hand-built JSON docs, no JSON-LD context, no `type`, no `id`. Frappe: random-hash filename, no signature. LearnHouse: `CertificateUser` has **no status column**. Moodle: `verify.type = 'hosted'` with the literal comment `// Signed is not implemented yet.`, OB 2.0 only, assertion id `sha1(rand()…)` — an unkeyed label. edX: one unauthenticated lookup on a 32-hex uuid, no signature | an **Open Badges 3.0 / W3C VC 2.0** document, `DataIntegrityProof` + `eddsa-rdfc-2022`, multibase proof value | validity stops depending on "their server is up and their database says so" |
| **Revocation** | Moodle deletes the `badge_issued` row and answers `410 Gone`, so *never issued* becomes indistinguishable from *revoked*. Chamilo deletes `skill_rel_user` and the endpoint exits with an empty 200 while exported copies still read valid. LearnHouse and Frappe cannot express it at all | **two** Bitstring Status Lists derived from chain state per request — `revocation` (permanent) and `suspension` (recoverable) — with both hashes anchored to BAS | a permanent cancellation and a temporary delisting are different facts; one bit cannot hold both |
| **Who owns the rubric** | edX hashes its grading policy (`b64(sha1(sorted json))`) but **records it, never compares it, prints it nowhere**. Moodle rebuilds badge criteria as prose **from live DB rows at export time** | the **issuer** owns criteria, weights, `passMark` in a `CourseManifest`; `rubricHash` is printed into `achievement.criteria`; `issue.js` lost its `--score` flag | the platform cannot change the rules after a credential exists — and unlike edX, ours is published, not just stored |
| **Who may issue** | Chamilo: the issuer **is the platform**, and who may issue is a settings toggle, not a key | a third-party issuer is whitelisted in `CredentialResolver`; its **agent signs** via EAS delegation while the platform broadcasts and pays gas | "an institution issues its own credential" becomes structurally true instead of a claim |
| **Verification** | behind their server, sometimes behind auth; edX's certificate view has no auth decorator but does require the service | **free, wallet-less, from the browser straight to the chain**; the same `verify.ts` the page uses is driven from Node by `scripts/probe.ts` | the person checking a credential never has to trust us |
| **Prerequisites** | Frappe has **no prerequisite concept at all**; its `enforce_course_order` is read server-side but only enforced in Vue templates. Canvas stores `prerequisites` + `completion_requirements` as serialised arrays and gates with a per-user progression row | the chain refuses at attestation time: `PrerequisiteRevoked(bytes32)`, and a credential can be *valid while its prerequisite is revoked* — a case EAS itself does not cover | our gate is not client-side, so it cannot be bypassed by editing a page |
| **Money** | LearnHouse: closed-source (`payments` is in `EE_ONLY_FEATURES`); buying = joining a user group. Frappe: `paid_course` + a row lock and duplicate check. Moodle: `enrol_fee`, one merchant per context, no refunds, but the amount is **recomputed server-side** and a mismatch is refused. edX: sells a **mode** plus an entitlement, payment out of process, paid access enforced by partitioning graded blocks in the content tree. Canvas: one tuition comment in the checked-out paths | x402 `exact` through canonical Permit2 + proxy, settled into `SettlementSplit` (platform share in bps, capped, only ever lowerable, no debt ledger); **the client sends zero transactions** | the split is on chain and auditable — but see C.5: it is not yet attached to enrolment |

## B. By code — what exists in `app/` today

| capability | them | us |
|---|---|---|
| course → chapter → lesson model | all six | ✅ `web/src/content.ts` (`Course`/`Module`/`Lesson`, six lesson kinds) |
| authored content volume | — | ✅ 2 courses · 7 modules · 24 lessons · 34 pages · 412 min · 28 quiz · 2 essays (`npm run inventory`, 26 Sep) |
| issuer-owned rubric + hash in the artifact | edX hashes but does not enforce | ✅ `web/src/manifest.ts`, `rubricHashOf()`; 17 checks (`npm run rubric`) |
| composite scoring with an honest "incomplete" | Moodle pins *ungraded renders empty, never zero*; Chamilo separates `complete` from `finished` | ⚠️ `score.ts` returns `BELUM_LENGKAP`, but the **gate** is one, not two |
| signed credential + revocable status + anchor | none of the six | ✅ `signer/`, 53 checks; 20 over HTTP; 11 credentials watched on chain 97 |
| delegated issuance, issuer pays no gas | none of the six | ✅ `attestByDelegation`, proven on public 97 |
| on-chain revenue split | none of the six | ✅ `SettlementSplit` (`platformBps() = 1000`, `MAX_BPS() = 2500`, read from chain 25 Sep) |
| per-learner enrolment record | Canvas row per (module, user) with a state machine; LearnHouse `TrailRun`/`TrailStep`; Frappe enrolment doctype | ❌ **nothing** |
| server-side progress | all six | ❌ one global `localStorage` key (`progress.ts:17`), no per-address namespace |
| gradebook provenance (who produced this number) | Moodle `rawgrade`/`usermodified`/`aggregationstatus`/`aggregationweight` + history table; edX `score_type`, `assess_type ∈ {full-grade, regrade}` | ⚠️ the document carries `result.method` + `rubricHash`; the UI shows no breakdown |
| human/AI grading workflow with locks | ORA leases grading for 8 h; Moodle staff grading | ⚠️ `judge.js` is fail-closed with a negative control, but there is no queue, no lock, no regrade event |
| payment in the product surface | Frappe/Moodle/edX all have one | ❌ the browser panel is an **animation** (C.5) |
| mentor/assistant surface | — | ❌ zero occurrences of `mentor` in `web/` |

## C. Where our implementation falls short — ranked

1. **There is no enrolment.** `btnEnroll` exists only as a dictionary entry (`web/src/i18n.ts:189, 665, 1238`), referenced nowhere. Everything downstream — payment, progress, assessment, credential — therefore has no entry point. Every one of the six has an enrolment record; it is the load-bearing row of an LMS.
2. **Progress is not owned by anyone.** One global `localStorage` key, no per-address namespace, `wipeCourse()` destroys the only record (LearnHouse keeps the row and flips its status), and Chamilo's own SCORM sandbox **bans** `localStorage` in favour of `cmi.suspend_data`. Consequence: no "continue on another device", and completion is not evidence.
3. **Quiz answers ship in the bundle and are graded in the browser.** `answer: number` is in the content type (`content.ts:53`), so the `kuis` component of a credential rests on a number nobody verified. Needs a decision, not a shrug: label it self-scored, or move grading server-side.
4. **One gate where three references use two.** `readyForCredential: gradedWeights === 100` (`progress.ts:132`) means "everything was graded", not "passed". LearnHouse (`is_course_fully_completed` vs `are_course_assignments_passed`), Chamilo (`complete` vs `finished`, `score = null` unless complete) and Moodle (behat: ungraded renders empty, never zero) independently made the split we collapsed. Our own comment at `lms.ts:143` already admits the consequence.
5. **The payment UI is theatre.** `simulateX402Batch()` (`main.ts:1003`) prints `402 CHALLENGE` → `SIGNED (0.0005 tBNB)` → `SETTLED` → `200 OK (118ms)` from three `setTimeout`s; `main.ts` contains **zero** `fetch(` calls. Meanwhile the real path works and is measured ([[09-Testing/T6 - npm run x402]]). Tracked as OI-11 with OI-2 (wrong route) and OI-7 (wrong asset).
6. **No idempotency guard on issuance.** LearnHouse has one because concurrent completion checks once minted two certificates; Frappe takes a row lock and checks for a duplicate before inserting. Ours relies on the operator running one script.
7. **No gradebook.** The learner never sees which evidence produced which number, though `score.ts` computes the components and Moodle/edX both expose them.
8. **The credential the UI shows is typed by hand** (OI-1) while the real signed document is one `GET` away.
9. **No onboarding and no demo/real separation** ([[11-Refactoring/RF3 - Onboarding and Identity]], RF1.5): wallet connect is the only identity path (`main.ts:504`), and fixtures wear the costume of live data.
10. **The learning surface is unreachable from the navigation**: `index.html` links `#/courses` at 45/177/215/274/406/1587 while `#/learn` appears only inside a comment at `:581`, next to `id="lms-mount"` at `:582`.

## D. What we take, and what we refuse

Take: the enrolment row and its duplicate guard; a per-learner progression record with an explicit state
machine; two gates (complete vs passed) and "ungraded is empty, not zero"; grade provenance columns
(who/what produced the number, and when); server-recomputed prices; rubric points on **options** rather
than one weight per criterion, if essay grading is to be more than a single number.

Refuse: their front ends, wholly — Lencana stays dark, typographic, hash-routed, no UI framework, and
this vault forbids porting their markup, components or navigation
([[12-LMS-References/00 - Hub LMS References]]). Also refuse: client-side enforcement of ordering
(Frappe's `eligible` flag), capability-URL certificates as a validity mechanism, and any payment flow
that trusts a price supplied by the browser.

**Related:** [[L7 - What an e-course must have]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] · [[10-Contributors/Open-Items-for-Dave]] · [[08-Results/01 - Evidence and Limits]]
