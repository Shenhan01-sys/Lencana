---
tags: [lms-reference, "L3"]
status: active
updated: 2026-09-26
---

# L3 - Chamilo

**Part of:** [[12-LMS-References/00 - Hub LMS References]]
**Source:** references/chamilo-lms @ a6cceea
**Summary:** Chamilo 2 is a two-generation codebase — a Symfony/Doctrine core in `src/` and a
procedural layer in `public/main/` that still owns enrolment, certificates and badges. Its *structures*
are worth reading: a resource/link split, a dated session-cohort layer with four coach roles, a
configurable completion rule that separates "evaluable" from "passed", and a payment plugin with a real
revenue split. Its *credential* layer is the inverse of ours: three hand-built JSON documents, unsigned,
hosted-verified, with no field in which revocation could even be written.

## 1. Structure

- **Resource vs link.** A thing (`ResourceNode`) is separated from where it is visible (`ResourceLink`):
  one link row per (course, session, usergroup, group, user), with `visibility` DRAFT 0 / PENDING 1 /
  PUBLISHED 2 and `start_visibility_at` / `end_visibility_at`
  (`references/chamilo-lms/src/CoreBundle/Entity/ResourceLink.php:27,44-46,95-101`). The same document
  reaches three cohorts on three different windows without being copied.
- **A course is composed of tools, not chapters.** `tool` is the platform registry
  (`references/chamilo-lms/src/CoreBundle/Entity/Tool.php:20-31`); `c_tool` is its per-course activation
  plus `position` (`references/chamilo-lms/src/CourseBundle/Entity/CTool.php:42-76`). The curriculum is
  the tool list: `CCourseDescription` (syllabus/topics), `CDocument`, `CLp`+`CLpItem` (learning path),
  `CQuiz`+`CQuizQuestion`+`CQuizRelQuestion` (exercise), `CStudentPublication`+`…Assignment` (work),
  `CForum*`, `CWiki`, `CAttendance`, `CPeerAssessment*` — 110 entity files under
  `references/chamilo-lms/src/CourseBundle/Entity/`.
- **Learning paths are the sequencing layer.** `lp_type` 1 = Chamilo LP, 2 = SCORM, 3 = AICC
  (`references/chamilo-lms/src/CourseBundle/Entity/CLp.php:125`), with `prerequisite:336`,
  `max_attempts:360`, `subscribe_users:363`, `published_on`/`expired_on:375-379`, `next_lp_id:389`,
  `prevent_reinit:317`, `use_max_score:347`. Items carry `min_score`/`max_score`/`mastery_score` and a
  `prerequisite` expression with `prerequisite_min_score`/`prerequisite_max_score`
  (`references/chamilo-lms/src/CourseBundle/Entity/CLpItem.php:49-55,61-62,82-86`) — gating per item,
  not only per course.
- **Content lives in DB *and* on disk.** Structure is Doctrine rows; bytes are files. SCORM zips are
  registered as document resources and extracted into a course folder
  (`references/chamilo-lms/src/CoreBundle/Service/LearningPath/ScormPackageImporter.php:138-140,188-194`);
  `CLp.path:294` names the folder. Certificates are HTML files under `certificates/`
  (`references/chamilo-lms/src/CoreBundle/Service/Gradebook/GradebookCertificateGenerator.php:315,371`).
- **Progress is a separate tracking layer.** `TrackECourseAccess` (login/logout/`counter`/`user_ip`,
  `references/chamilo-lms/src/CoreBundle/Entity/TrackECourseAccess.php:17,40-52`), `TrackEExercise` (one
  row per attempt: `exe_date`, `score`, `max_score`, `status`, `exe_duration`, `orig_lp_id`,
  `…/TrackEExercise.php:42,103-155`), `TrackEAttempt` + `TrackEAttemptQualify` (per answer, per
  correction), `CLpView` (`view_count`, `last_item`, `progress`, `completion_date`,
  `references/chamilo-lms/src/CourseBundle/Entity/CLpView.php:18,46-55`), and rollups
  `CourseRelUser.progress:142` / `SessionRelCourseRelUser.progress:138`.
- **Completion is a configurable rule.** `CourseCompletionRuleEvaluator` reads a versioned JSON rule from
  a hidden course extra field `course_completion_rule`
  (`references/chamilo-lms/src/CoreBundle/Component/Gradebook/CourseCompletionRuleEvaluator.php:26-27,343`),
  whose components are typed `forum | work | evaluation | exercise`, each with a declared `calculation`
  and a `weight`, and it refuses to score if a referenced resource no longer exists (`:395-460`). It then
  separates three facts (`:260-262`): `complete` = zero rule errors, `score` = `null` unless complete,
  `finished` = complete **and** `partialScore >= minimumScore`; abandoned attempts are excluded from the
  best-ratio query (`attempt.status <> 'incomplete'`, `:708`). That is our
  `BELUM_LENGKAP / TIDAK_LULUS / LULUS` with `total: null` (`web/src/score.ts:39-41`) reached from the DB
  side — see [[05-Course-Content/K4 - Scoring without the platform deciding]].
- **Certificates come from the gradebook tree.** `GradebookCategory` (`weight`, `visible`,
  `generate_certificates`, `certif_min_score` — `references/chamilo-lms/src/CoreBundle/Entity/GradebookCategory.php:121-139`)
  → `GradebookEvaluation` / `GradebookLink` → `GradebookResult` → `GradebookCertificate`
  (`score_certificate`, `created_at`, `path_certificate`, `downloaded_at`, `publish`, `expiry_date` —
  `references/chamilo-lms/src/CoreBundle/Entity/GradebookCertificate.php:16,37-62`), plus
  `GradebookCertificateExpiryNotification` and an `ABOUT_TO_EXPIRE / EXPIRED` enum.

## 2. Business process

- **Roles.** Platform roles are `ROLE_STUDENT / TEACHER / ADMIN / SESSION_MANAGER / STUDENT_BOSS /
  INVITEE / HR` (`references/chamilo-lms/src/CoreBundle/Entity/User.php:1872-1905`), plus **context roles
  computed per request and never stored** (`ROLE_CURRENT_COURSE_TEACHER`, `…_SESSION_STUDENT`,
  `…_GROUP_TEACHER` — `:164-173`). Inside a session a role is a number: `STUDENT 0, DRH 1, COURSE_COACH 2,
  GENERAL_COACH 3, SESSION_ADMIN 4` (`references/chamilo-lms/src/CoreBundle/Entity/Session.php:206-210`).
- **Enrolment is three records, not one.** `course_rel_user` (`relation_type`, `status` TEACHER=1 /
  STUDENT=5, `is_tutor`, `sort`, `user_course_cat`, `legal_agreement`, `progress` —
  `references/chamilo-lms/src/CoreBundle/Entity/CourseRelUser.php:87-143`); `session_rel_user`
  (`duration`, `registered_at`, **per-user** `access_start_date`/`access_end_date`,
  `moved_to`/`moved_status`/`moved_at`, `new_subscription_session_id` —
  `references/chamilo-lms/src/CoreBundle/Entity/SessionRelUser.php:50-132`); `session_rel_course_rel_user`
  (`status`, `visibility`, `legal_agreement`, `progress`, unique on session+course+user+status —
  `references/chamilo-lms/src/CoreBundle/Entity/SessionRelCourseRelUser.php:54-138`).
- **Sessions are the dated cohort.** Three date ranges — `display_*` (visible in catalogue), `access_*`
  (may study), `coach_access_*` (coach works before/after learners) — plus `validity_in_days`,
  `days_to_reinscription`, lifecycle `PLANNED 1 / PROGRESS 2 / FINISHED 3 / CANCELLED 4` and visibility
  `READ_ONLY 1 / VISIBLE 2 / INVISIBLE 3 / AVAILABLE 4 / LIST_ONLY 5`
  (`references/chamilo-lms/src/CoreBundle/Entity/Session.php:200-216,385-473`). **`nbr_users` is a counter,
  not a quota** (`:358-359`, incremented at `:841`); I found no seat cap in core.
- **Self-enrolment is a course flag plus a shared secret.** `Course.subscribe` (default true),
  `unsubscribe` (default false), `registration_code`
  (`references/chamilo-lms/src/CoreBundle/Entity/Course.php:325-335,396-397`), surfaced in settings as
  `course_registration_password` (`references/chamilo-lms/src/CoreBundle/State/CourseSettings/CourseSettingsManager.php:428`).
- **Enrolment is a vetoable event.** `CourseManager::subscribeUser()` dispatches
  `chamilo.event.course_user_subscription_check` for student status and aborts with the event's own
  message if `!isAllowed()` (`references/chamilo-lms/public/main/inc/lib/course.lib.php:800,866-885`;
  name at `references/chamilo-lms/src/CoreBundle/Event/Events.php:17`; second dispatch in
  `sessionmanager.lib.php:2764`). Price, capacity, prerequisites and legal consent can all hang off it.
- **Money is one plugin, not core.** `public/plugin/BuyCourses` has its own tables (sale, item,
  item_rel_beneficiary, transfer, commission, paypal_payouts, services, invoices, coupons,
  subscriptions, frozen_enrollment, audit —
  `references/chamilo-lms/public/plugin/BuyCourses/src/buy_course_plugin.class.php:37-65`), six payment
  types (PayPal, bank transfer, Culqi, Redsys TPV, Stripe, Cecabank — `:69-74`) and three product types
  (course, session, service — `:66-68`). `completeSale()` converts a paid sale into an enrolment:
  `CourseManager::subscribeUser()` or `SessionManager::subscribeUsersToSession()` (`:3418-3447`).
- **Revenue split.** `storeSubscriptionPayouts()` reads one platform commission percentage, computes the
  teachers' pool, takes each beneficiary's `commissions` percent of that pool and writes a **pending
  payout row** (`:4399-4430`) whose status an admin can flip by hand (`setStatusPayouts()`,
  `:4439-4449`). Same three-party idea as [[02-Contracts/C3 - SettlementSplit]], as a mutable ledger.
- **Who grades, and when.** Objective questions auto-grade; free-text waits for a human, whose write is
  attributed and staged: `recordCorrectionHistory()` stores `author` (the grading user id), `marks`,
  `teacher_comment`, `session_id` and a `final` flag that exists "to distinguish a draft correction save
  from a validated one"
  (`references/chamilo-lms/src/CoreBundle/State/Exercise/ExerciseRuntimeCorrectionProcessor.php:296-311`;
  `references/chamilo-lms/src/CoreBundle/Entity/TrackEAttemptQualify.php:30-68`; migration
  `references/chamilo-lms/src/CoreBundle/Migrations/Schema/V300/Version20260828120000.php:16,21`).
  Assignments carry `qualification`, `date_of_qualification`, `accepted`, `weight`
  (`references/chamilo-lms/src/CourseBundle/Entity/CStudentPublication.php:145-212`), and peer assessment
  has its own criteria tables.
- **End artifact (a): a certificate, verified by URL.** HTML at `/certificates/<sha256>.html` where the
  filename is `hash('sha256', $userId.$catId.bin2hex(random_bytes(16)))`
  (`references/chamilo-lms/src/CoreBundle/Repository/GradebookCertificateRepository.php:210`; URL built in
  `references/chamilo-lms/public/main/inc/lib/certificate.lib.php:613-614`, QR at `:696-716`).
  Authenticity is an unguessable filename, not a signature. Third parties instead look a holder up **by
  name** via `GET /gradebook/certificate-search?firstname=&lastname=` — an operation with no `security:`
  attribute, gated only by the `certificate.allow_public_certificates` setting
  (`references/chamilo-lms/src/CoreBundle/ApiResource/Gradebook/GradebookCertificateSearch.php:20-49`;
  `references/chamilo-lms/src/CoreBundle/State/Gradebook/GradebookCertificateSearchProvider.php:66-87,158-166`),
  and a listed certificate additionally requires the enrolment row to still exist (`:190-207`).
- **End artifact (b): an Open Badge per skill** — section 3.

## 3. Special focus — badges

Three hand-built JSON documents. No JSON-LD context, no `type`, no `id` anywhere:
assertion `references/chamilo-lms/public/main/skills/assertion.php:38-59`, badge class
`references/chamilo-lms/public/main/skills/class.php:18-24`, issuer
`references/chamilo-lms/public/main/skills/issuer.php:11-14` (`name` = the platform's `Institution`
setting, `url` = the platform root — the platform *is* the issuer).

| question | answer | proof (`references/chamilo-lms/…`) |
|---|---|---|
| OB version | **Neither 3.0 nor 2.0.** A 1.x-era field set: `uid`, integer `issuedOn` from `strtotime()`, `badge` as a bare URL. No `@context`/`type`/`id`, so it is not a valid 2.0 assertion and has no 3.0 `Achievement`/`AchievementSubject` | `public/main/skills/assertion.php:40-47` |
| assertion contents | exactly `uid` (the `skill_rel_user` row id), `recipient{type,hashed,identity}`, `issuedOn`, `badge`, `verify{type,url}` — and nothing else: no score, no criteria, no evidence, no expiry | `:40-53` |
| signed? by whom? | **Not signed by anyone.** `verify.type = 'hosted'` and `verify.url` points back at `assertion.php` itself: the document's only trust statement is "ask my server". No JWS, no key, no `publicKey`, no DID, no proof object in `public/main/skills/` — grepping that folder for `sign\|hash\|revok\|salt` returns only `'hashed' => false` | `:48-53`, `:43` |
| revocation expressible? | **No.** No `Skill*` entity in `src/CoreBundle/Entity` has a `revoked*`, `expires` or `valid_until` column (grep: 0 matches). The only removal is deleting the row via the API Platform `Delete` op; `assertion.php` then fails its `userHasSkill()` gate and `exit`s with an empty 200 body — indistinguishable from a bug, while every exported copy still reads as valid | `src/CoreBundle/Entity/SkillRelUser.php:31`, `public/main/skills/assertion.php:21-23` |
| anchored to a blockchain? | **No.** grep for `blockchain\|ethereum\|web3\|bitcoin` across every `*.php` in the clone: 0 matches | — |
| baked image | the PNG export writes a `tEXt` chunk keyed `openbadges` whose value is **the assertion URL**, not the assertion, protected only by PNG's CRC32 (`addChunk` = `key\0value` + crc32). Anyone with an image editor can rebake it | `public/main/inc/lib/SkillModel.php:2589,2617`; `public/main/inc/lib/baker.lib.php:74-86` |
| export path | a `<script src="<backpack>/issuer.js">` tag; the backpack is a setting defaulting to `https://www.badgecraft.eu/`, with `https://backpack.openbadges.org/` hardcoded as fallback in two places | `public/main/inc/lib/SkillModel.php:2575-2586`; `src/CoreBundle/Settings/SkillSettingsSchema.php:31`; `src/CoreBundle/State/Gradebook/GradebookBadgesProvider.php:92-105` |
| who may issue | a platform **setting**, not a key: `skills_teachers_can_assign_skills`, `allow_hr_skills_management`, `badge_assignation_notification` | `src/CoreBundle/Settings/SkillSettingsSchema.php:20-28` |

**What their badge cannot do that ours can** (ours: `signer/src/credential.js`, `signer/src/statusList.js`,
`signer/src/anchor.js`, `signer/src/sign.js`):

1. **Verify without their server.** Theirs is `verify.type='hosted'` + a URL into their own PHP
   (`public/main/skills/assertion.php:48-53`). Ours carries a Data-Integrity proof with
   `proofPurpose: assertionMethod`; a third party checks the signature and reads the key from
   `proof.verificationMethod` via the issuer document — never calling us (`signer/src/sign.js:34,84,97`).
2. **Say "revoked" or "suspended".** They have no field for it. Ours carries `credentialStatus` as an
   array of **two** `BitstringStatusListEntry` — `statusPurpose: 'revocation'` and `'suspension'`
   (`signer/src/credential.js:112-115`, `signer/src/statusList.js:30-31,91-92`) — so delisting an issuer
   and revoking one credential stay different facts ([[04-Signer-Service/S3 - Two status lists]],
   [[Concepts/Issuer Delisted vs Revoked]]).
3. **Prove the list was what we said, when we said it.** The bitstring's SHA-256 goes to BAS
   `timestamp()` and anyone reads it back with `getTimestamp()` (`signer/src/anchor.js:2,45,63-84`,
   `signer/src/credential.js:123`). Their "list" is a `SELECT` on `skill_rel_user`.
4. **Name the rubric that produced the number.** Their assertion holds no result at all, and `criteria` is
   a URL to a page rendered live from the DB row (`public/main/skills/criteria.php:24-42`) — editable after
   issuance with nothing to detect it. Ours prints `[rubrik <12 hex>]` into
   `achievement.criteria.narrative` (`signer/scripts/issue.js:241`, `web/src/manifest.ts:102-104`) —
   [[05-Course-Content/K2 - The issuer manifest and rubricHash]].
5. **Bind the holder cryptographically.** Their binding is a **plaintext email** on a public JSON endpoint
   (`public/main/skills/assertion.php:43-44`). Ours is the wallet address that is also the chain-side
   holder, with `credentialHash = keccak256("vc:" ‖ holder ‖ courseId)` (`web/src/content.ts:131`).
6. **Expire.** Their badge has no expiry field at all — their *certificate* has `expiry_date`
   (`src/CoreBundle/Entity/GradebookCertificate.php:61-62`), the skill row has none. Ours writes
   `validUntil` (VC 2.0) and the BAS attestation's `expirationTime` from one shared number
   (`signer/src/credential.js:72`).

Worth keeping even so: their issuance row has content ours lacks — `validation_status`, non-zero only when
`skill_rel_item.requires_validation = 1` (`src/CoreBundle/Entity/SkillRelUser.php:93`,
`src/CoreBundle/Entity/SkillRelItem.php:50-51`), a mandatory `argumentation` + `argumentation_author_id`
(`:97-101`), an `acquired_level` rung (`:83`), and per-badge feedback comments with a numeric value
averaged by `getAverage()` (`src/CoreBundle/Entity/SkillRelUserComment.php:30-36`,
`SkillRelUser.php:265`). All of it stays in their DB; none of it reaches the badge.

## 4. What Lencana has that Chamilo does not

**By design.** The issuer is a key outside the platform, and the platform never decides the number —
theirs is `api_get_setting('Institution')` (`public/main/skills/issuer.php:12`). Grading policy is
committed by hash *before* the credential exists, so the rubric cannot be swapped under an issued diploma;
theirs (`certif_min_score`, the completion-rule JSON) is live DB state with no record of which version
graded a given holder. And verification is a read of public chain state, so it survives us — theirs is a
PHP endpoint plus a name search in our own database.

**By code** (all in `app/`): OB 3.0 / VC 2.0 document with
`type: ['VerifiableCredential','OpenBadgeCredential']`, `validFrom`/`validUntil`, `AchievementSubject`,
`achievement.criteria`, `result[]` (`signer/src/credential.js:46,68-72,112`); two chain-derived status
lists anchored on BAS (`signer/src/statusList.js:30-31,91-92,130-139`, `signer/src/anchor.js:63-84`,
`signer/src/chainStatus.js`); a third-party agent signing an EIP-712 BAS digest while the platform
broadcasts and pays gas, with `attester` = the agent's own address (`signer/src/delegation.js:2-19,108-116`,
[[01-Architecture/A5 - Gas fronted and recovered]]); `rubricHash` printed into the credential
(`web/src/manifest.ts:53-104`, `signer/scripts/issue.js:235-252`); wallet-less free verification from the
browser against a public RPC (`web/src/verify.ts:159-191`) alongside paid machine verification over x402 —
`402`, Permit2 settlement, split through `SettlementSplit`, batch ≤ 25 (`signer/src/server.js:39,131,229-263`,
`signer/src/x402.js:60-221`, [[04-Signer-Service/S6 - x402 paid verification]]); and `BELUM_LENGKAP` with
`total: null` so missing evidence is never reported as failure (`web/src/score.ts:8-13,39-41`).

## 5. What Chamilo has that Lencana lacks

**Implementation gaps** (we decided to have these; they are not built or not wired — all logged in
[[11-Refactoring/RF1 - Consumer Readiness Audit]]):

| theirs | ours today |
|---|---|
| three enrolment records per context, a vetoable subscription event | `btnEnroll` is declared and translated and referenced nowhere — `web/src/i18n.ts:189,665,1238`; see [[11-Refactoring/RF5 - Enrollment and the Paid Path]] |
| six gateways, coupons, recurring subscriptions, invoices, sale → enrolment | the x402 verification fee, which no learner must pay in order to study |
| four coach roles with their own access window (`Session.php:208-209,422-432`) | zero occurrences of "mentor" in the learner surface (RF1.6) |
| server-side tracking: access, attempts, durations, LP completion | `localStorage` under `lencana-progress-v1`, labelled not-evidence (`web/src/progress.ts:17,35,48`). Their own SCORM sandbox **rejects** `localStorage`/`sessionStorage`/`indexedDB` in generated activities and demands `cmi.suspend_data` instead (`references/chamilo-lms/src/CoreBundle/Service/Toolbox/ToolboxAiGenerator.php:277-279`) |
| — | learning surface routes exist with no navigation entry (RF1.3); no demo-vs-real state separation (RF1.5, RF1.8) |

**Design gaps** (nobody decided):

- **A skills ladder.** `SkillLevelProfile` → ordered `Level` rows (`skill_level`: `title`, `position`,
  `short_title` — `references/chamilo-lms/src/CoreBundle/Entity/Level.php:16-38`) → `SkillRelSkill`
  parent/child with a `level` (`references/chamilo-lms/src/CoreBundle/Entity/SkillRelSkill.php:12,30-35`) →
  skills bound to concrete course items with `obtain_conditions` (`SkillRelItem.php:44-45`) and to gradebook
  categories (`SkillRelGradebook.php:11-29`). We have `level: 'dasar'|'menengah'|'lanjutan'` on a course
  (`web/src/content.ts:94`) and `prereqCourseId` (`:100`), but no competency object that outlives a course
  and accumulates across issuers. This is the honest version of the "profile" our copy keeps promising
  ([[11-Refactoring/RF4 - Learning Surface Target Shape]]).
- **A cohort layer.** Dated sessions with separate display/access/coach windows, a lifecycle status,
  per-user date overrides, and `moved_to`/`moved_status` to push a learner into the next run
  (`references/chamilo-lms/src/CoreBundle/Entity/SessionRelUser.php:108-132`). Our courses are permanent
  and unscheduled.
- **Grader attribution and staged correction.** Who graded, what they wrote, and whether it was final
  (`references/chamilo-lms/src/CoreBundle/State/Exercise/ExerciseRuntimeCorrectionProcessor.php:296-311`).
  We name the agent key and the judge model (`signer/scripts/issue.js:249-252`) but keep no per-answer
  correction history.
- **A gradebook that mixes evidence kinds.** Their rule sums forum posts, assignment qualifications,
  gradebook evaluations and exercise best-ratio into one weighted score with per-component status
  (`CourseCompletionRuleEvaluator.php:120-262`). Our three components are fixed (`web/src/score.ts`) and
  cannot express "two forum posts are worth 10 points".
- **Peer assessment with published criteria** (`CPeerAssessmentCriteria`,
  `CPeerAssessmentCorrectionCriteria` under `references/chamilo-lms/src/CourseBundle/Entity/`).
- **Expiry notification** (`GradebookCertificateExpiryNotification`). Our `validDays` is in the manifest;
  nothing tells a learner their credential is about to lapse.

## 6. What we deliberately do not take

| not taken | reason |
|---|---|
| two-generation codebase: Symfony core + procedural `public/main/` owning enrolment, certificates, badges | our whole argument is that the credential layer is small enough to audit; a 61-line assertion that survives unnoticed for a decade is what splitting it across runtimes produces |
| tool-as-curriculum (110 `C*` entities) | six closed lesson kinds and a closed `Block` union let `auditCourse` check every page in Node ([[05-Course-Content/K1 - The content model]]) |
| server-side tracking of reads, IPs and dwell time (`TrackECourseAccess.user_ip`) | we decided not to collect it (`web/src/progress.ts:1-14`); it adds personal-data duties and zero bits of evidence |
| plaintext-email recipient identity on a public endpoint (`assertion.php:43-44`) | we use an address — already public, and already the chain-side holder |
| name-indexed public certificate search (`GradebookCertificateSearchProvider.php:66-87`) | verification by looking a person up is a directory of who studied what; ours is by presenting a hash ([[03-Frontend/FE1 - Verifier page and verify.ts]]) |
| shared-secret course password (`Course.php:334`, `CourseSettingsManager.php:428`) | one leaked string enrols everybody, and it cannot be revoked per learner |
| capability-URL certificates (`GradebookCertificateRepository.php:210`) | "unguessable filename" is a secret, not a proof — and it dies with the server, or leaks when the file is forwarded |
| mutable payout ledger (`buy_course_plugin.class.php:4439-4449`) | an admin-editable `status` column is precisely what the on-chain split exists to remove |
| hosted badge verification + a third-party `<script>` backpack tag (`SkillModel.php:2575-2586`) | a script from someone else's origin on the page that shows a learner their own credential is a supply-chain dependency in the worst place |

## Claims I could not verify

- **Session seat quotas.** `Session.nbr_users` is a counter (`references/chamilo-lms/src/CoreBundle/Entity/Session.php:358-359,841`)
  and the only ceiling I found is a hosting-plan limit called from the BuyCourses subscriber
  (`…/EventSubscriber/BuyCoursesCourseUserSubscriptionEventSubscriber.php:48-52`); I did not open
  `wouldCourseUserSubscriptionExceedHostingLimit()`, so "no seat cap in core" is a search result, not a
  proof. _unverified_
- **Which Open Badges version they target.** No file in the clone names a spec version; "1.x-era field set"
  is my reading of the emitted JSON, not a string in their code. _unverified_
- **Whether skills are ever awarded automatically** on course or learning-path completion, versus always by
  a human through `assign.php` / `SkillModel::addSkillToUser()`
  (`references/chamilo-lms/public/main/inc/lib/SkillModel.php:617`). I did not trace its callers. _unverified_
- **Whether `public/main/skills/assertion.php` is reachable anonymously.** It requires only
  `global.inc.php` plus its own `userHasSkill()` gate (`:11-23`), which reads as deliberately public, but I
  did not run the application. _unverified_
- **Line ranges** written `a-b` were opened and read as blocks; every single-line citation was opened at
  that line. Nothing here was measured by installing or running Chamilo — no database, no HTTP request.

**Related:** [[12-LMS-References/00 - Hub LMS References]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] ·
[[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[04-Signer-Service/S1 - The credential document]] ·
[[02-Contracts/C3 - SettlementSplit]] · [[08-Results/01 - Evidence and Limits]]
