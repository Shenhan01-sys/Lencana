---
tags: [lms-reference, "L1"]
---

# L1 - LearnHouse

**Part of:** [[12-LMS-References/00 - Hub LMS References]]
**Source:** references/learnhouse @ 5e28b07

**Summary:** A multi-tenant, API-first LMS. A FastAPI/SQLModel backend (`apps/api`) owns every fact, a separate web app renders it, and no course content lives in files — the inverse of our `web/src/courses/*.ts`. Two ideas worth stealing: **separate "finished" from "earned"**, and **make paid access a group-membership question**. Its certificate is the weak part: a DB row readable by anyone holding its UUID, unsigned and unrevocable. Everything about *charging learners* lives in a closed `ee/` package that is **not in this clone**, which limits several claims below.

## 1. How it is structured

Monorepo: `apps/api`, `apps/web`, `apps/collab`, `apps/cli`, `apps/e2e`, `docs/`. Content is authored through the API into Postgres. Every table carries `org_id`. Paths below are relative to `references/learnhouse/apps/api/src/`.

| concept | where | notes |
|---|---|---|
| Course | `db/courses/courses.py:48` base, `:62` table | `name, description, about, learnings, tags, public, published, open_to_contributors` + `seo`/`extra_metadata` JSONB (`CourseSEO` at `:13`). No price, no pass mark, no prerequisite |
| Chapter | `db/courses/chapters.py:16`, table `:29` | carries `lock_type` — PUBLIC / AUTHENTICATED / RESTRICTED (`LockType`, `:10`); `ChapterRead.is_locked` is computed per request (`:62`) so a locked chapter still renders as a locked row |
| Activity (= our lesson) | `db/courses/activities.py:8` type enum, `:44` base, table `:54` | types VIDEO / DOCUMENT / DYNAMIC / ASSIGNMENT / CUSTOM / SCORM; body is an **untyped** `content: dict`; versioning fields `:68-72`; `is_locked` `:109` |
| Chapter↔activity order | `db/courses/chapter_activities.py:5`, `order` `:10` | an activity can be reused across chapters |
| Block | `db/courses/blocks.py:7` (QUIZ, VIDEO, DOCUMENT_PDF, IMAGE, AUDIO, CUSTOM), table `:22` | hangs off an activity; `content` JSON again |
| Assignment | `db/courses/assignments.py:155` | the assessed object — see §2 |
| AssignmentTask | `:186` types (FILE_SUBMISSION, QUIZ, FORM, CODE, SHORT_ANSWER, NUMBER_ANSWER, CUSTOM, OTHER), table `:249`, `max_grade_value` default 100 at `:220` | one assignment = many tasks, each auto- or manually graded |
| Submissions | `:328` per task, `:447` per assignment | both have DB unique constraints — `(user, task)`, `(user, assignment)` — added because a double-click created duplicate rows and duplicate certificates |
| Progress | `db/trails.py:17` → `db/trail_runs.py:21` → `db/trail_steps.py:13` | `Trail` is one per user per org; `TrailRun` is one per course with `StatusEnum` IN_PROGRESS / COMPLETED / PAUSED / CANCELLED (`:14`); `TrailStep` holds `complete`, `teacher_verified`, `grade: str` (`:27-29`). **`TrailRun` is the enrolment row** — "Trail" is *not* an authored learning path |
| Certificate | `db/courses/certifications.py:9` `Certifications` (per-course `config` JSON), `:38` `CertificateUser` | `CertificateUser` has **no status column** — issued or deleted, nothing between |
| Board | `db/boards.py:26`, members `:40` (owner/editor/viewer), `ydoc_state` bytes | a collaborative canvas, **not** a course noticeboard |

Quizzes are graded server-side, per question: `services/courses/activities/assignments.py:577` `_grade_quiz_task`, with response type (single/multiple) and grading mode (all-or-nothing / partial credit) resolved in `services/courses/activities/quiz_modes.py:24-30`. Aggregate grade and pass flag at `assignments.py:982`; thresholds `DEFAULT_PASSING_THRESHOLD_PERCENTAGE = 50.0` (`:438`) and `LETTER_PASSING_THRESHOLD_PERCENTAGE = 60.0` (`:443`). Routes mount in `router.py` under `/api/v1`: `/courses`, `/chapters`, `/activities`, `/blocks`, `/assignments`, `/certifications`, `/trail`, `/usergroups`, `/roles`, `/orgs`, `/admin`, `/ai`, `/analytics`, `/audit`, `/plans`.

## 2. Business process

**Roles.** `db/roles.py:39` `Rights` is a per-resource CRUD matrix with separate `*_own` variants over courses, chapters, activities, assignments, usergroups, roles, communities, discussions, boards, playgrounds and the dashboard; roles are GLOBAL / ORGANIZATION / ORGANIZATION_API_TOKEN (`:109`). Orthogonally, `db/resource_authors.py:7` records **per-resource authorship** — CREATOR / CONTRIBUTOR / MAINTAINER / REPORTER, each ACTIVE / PENDING / INACTIVE — keyed by `resource_uuid` (`:19`). Access is then `isAuthor OR isRole OR hasUserGroupAccess OR hasPaidEnrollmentAccess` (`security/rbac/rbac.py:505-520`), under a superadmin bypass.

**Enrolment.** Self-serve `POST /api/v1/trail/add_course/{course_uuid}` (`routers/trail.py:94`) creates a `TrailRun` (`services/trail/trail.py:453`). It is also created lazily — marking any activity done creates the run if absent (`trail.py:263`) — so "enrol" and "start reading" are nearly the same act. Admins enrol, bulk-enrol and unenrol (`routers/admin.py:464`, `:492`, `:1039`, roster `:1072`). No application step, no capacity.

**Money — two layers, only the first fully readable here.**
1. *The org pays LearnHouse*: SaaS plans in `security/features_utils/plans.py:19` (`free / personal / personal-family / standard / pro / enterprise`); free = 1 course, 10 members, 5 assignments, watermarked (`:51-79`); `certifications` needs `pro`, `payments` needs `standard` (`:147`); the certifications router is plan-gated at `router.py:253`; limits are public at `routers/plans.py`.
2. *The learner pays the org*: **closed**. `core/deployment_mode.py:25` lists `payments` in `EE_ONLY_FEATURES`; routers mount via `register_ee_routers()` (`router.py:393`); the access check imports `ee.services.payments.payments_access.check_enrollment_access` inside a `try/except` that silently degrades to community edition (`rbac.py:510-512`). The shape is still legible from the seams: `migrations/payments_to_offers_migration.py:34-38` imports `PaymentsOffer / PaymentsEnrollment / PaymentsProduct`, and the offer it builds (`:77-90`) carries `usergroup_id`, `offer_type` (ONE_TIME / SUBSCRIPTION), `price_type` (FIXED_PRICE / CUSTOMER_CHOICE), `amount`, `currency`, `provider_product_id`, `is_publicly_listed`. **Buying an offer = joining a UserGroup; the group is bound to the course by `db/usergroup_resources.py:6`; RBAC then grants read.** The learner-facing store and checkout calls *are* in the OSS web app (`apps/web/services/payments/offers.ts:47` public offer, `:55` listing, `:78` checkout with `redirect_uri`; pages under `apps/web/app/orgs/[orgslug]/(withmenu)/store/`), provider Stripe (`apps/web/services/payments/providers/stripe.ts`).

**Who grades what, when.** Auto-grading runs on submit when every task is auto-gradable (`auto_grading`, `assignments.py:50`); file uploads force a human. `manually_graded` (`:292`) marks a teacher override so the aggregate never recomputes over it. Retries are capped (`allow_retries` `:66`, `max_retries` `:70`, `attempt_number` reset in place on the submission row). Deadlines are optional by design and an unparseable one locks nobody out (`:44`); `LATE` is a distinct status (`:379`). Answer keys are withheld server-side unless the author opts in (`show_correct_answers` `:60`), and a model answer is released per `SolutionRevealEnum` NEVER / ON_SUBMISSION / AFTER_GRADING (`:16-31`).

**Completion requires two different things.** `services/courses/certifications.py:554` `is_course_fully_completed` = every **published** activity has a completed `TrailStep` (drafts excluded, `:567`, so a draft can never make a course unfinishable). `:650` `are_course_assignments_passed` = every assignment GRADED **and** passed, with a formative `ungraded` one (`assignments.py:81`) satisfied by handing in. The docstring states the split: *completion means "all activities done", certification means "all assessments passed"* (`:669`). `:756` runs both, then creates the certificate; `:598` keeps `TrailRun.status` in sync and deliberately touches only the completion-derived states (`:628`).

**The artifact and how it is checked.** A `CertificateUser` row with a UUID, served by `GET /api/v1/certifications/certificate/{user_certification_uuid}` (`routers/courses/certifications.py:181`). Validity = reachability: `certifications.py:865` reads *"# No RBAC check - allow anyone to access certificates by UUID"*. No signature, no issuer key, no expiry, no revocation, and nothing to check against if their server is down.

## 3. What Lencana has that LearnHouse does not

**By design.**
- **A credential is a signed document, not a row.** Ours is an OB3.0 / VC2.0 document whose hash is anchored on chain, with two Bitstring Status Lists derived from chain state ([[04-Signer-Service/S2 - Status lists from chain state]], [[04-Signer-Service/S3 - Two status lists]]). Theirs is `SELECT … WHERE user_certification_uuid = ?`.
- **Status can fail four distinguishable ways.** `statusOf()` separates revoked / expired / issuer-delisted / unknown ([[01-Architecture/01 - Architecture]]); `CertificateUser` has no status column (`db/courses/certifications.py:38`).
- **The issuer is a third party and owns the rubric.** `rubricHash` is printed into the credential (`web/src/manifest.ts:102`, [[05-Course-Content/K2 - The issuer manifest and rubricHash]]). Their pass mark is a **platform default** (`assignments.py:438`, `:443`), overridable per assignment (`:74`) through `AssignmentUpdate` (`:148`) with nothing recording the previous value — an instructor can move the bar after submissions exist and no reader would ever know.
- **The agent signs by EAS/BAS delegation while the platform pays gas** ([[04-Signer-Service/S4 - Delegated issuance]], [[01-Architecture/A5 - Gas fronted and recovered]]).
- **Verification is free, public, wallet-less** ([[03-Frontend/FE1 - Verifier page and verify.ts]]); paid machine-to-machine verification settles via x402 and splits in `SettlementSplit` ([[04-Signer-Service/S6 - x402 paid verification]], [[02-Contracts/C3 - SettlementSplit]]). They charge the *org* for a feature; they have no machine-facing verification product.
- **Prerequisites are a first-class enforced relation** — `prereqCourseId` (`web/src/content.ts:100`), audited against the catalogue (`:280`), enforced at issuance. A grep for `prerequisite` across `apps/api/src` returns only unrelated hits in tests and the nudges scheduler: **they have no prerequisite concept at all.**

**By code.**
- A DOM-free typed model a Node harness can audit: `auditCourse` (`web/src/content.ts:187`) and `auditCatalog` (`:280`) refuse a bad answer key, a duplicate slug, weights not summing to 100. Their `Activity.content` is an untyped JSON dict; nothing validates it.
- A third verdict that is not a number: `BELUM_LENGKAP` (`web/src/score.ts:39`), so missing evidence is never reported as failure ([[05-Course-Content/K4 - Scoring without the platform deciding]]). `compute_assignment_grade` returns a number and a boolean only.
- Ids derived from content rather than allocated: `web/src/content.ts:112`, `:116`, `:131`.

## 4. What LearnHouse has that Lencana lacks

**Design gap** — never decided; each needs a decision, not a ticket.
1. **Two gates instead of one.** We collapse "done" and "earned" into `readyForCredential` (`web/src/progress.ts:132`), true when *every component has some evidence* — not when the learner passed. `computeScore` produces the verdict, but the surface shows the first number; RF4 already flags the misleading column ([[11-Refactoring/RF4 - Learning Surface Target Shape]]).
2. **Formative work.** Their `ungraded` assignment (`assignments.py:81`) is satisfied by handing in and never blocks a certificate. All six of our lesson kinds feed `gradedWeights`; we cannot mark one "practice, not assessed".
3. **Retries, deadlines, lateness** (`assignments.py:66-70`, `:447`, `:44`, `:379`). We increment `attempts` (`web/src/lms.ts:564`) with no cap and have no time dimension on any lesson.
4. **Answer-key reveal policy** (`assignments.py:16-31`, `:60`). Our key ships in the bundle (`answer: number`, `web/src/content.ts:53`) and grading happens in the browser (`web/src/lms.ts:561-564`) — so a quiz score is not merely "not evidence", it is self-serviceable. Consistent with our stance that localStorage is not proof (`web/src/progress.ts:5-12`), but it means the `kuis` component of a credential rests on a number nobody verified.
5. **Content versioning with a bound.** `ActivityVersion` (`db/courses/activity_versions.py:17`) keeps the last `MAX_ACTIVITY_VERSIONS = 20` saves (`services/courses/activities/versioning.py:19`). `manifestHash` detects change but stores no history, so an issuer cannot show what version 3 said.
6. **Authorship as a record**, including PENDING contributors (`db/resource_authors.py:7`, `:19`). Our `Issuer` is one hardcoded object (`web/src/manifest.ts:144-148`).
7. **Draft vs published** (`certifications.py:567`). Our catalogue is all-or-nothing: if it is in `COURSES` it is live and counted.
8. **A learner-facing tutor grounded in the course**: `POST /api/v1/ai/rag/chat` (`routers/ai/rag.py:145`) over `CourseEmbedding` chunks (`db/course_embeddings.py:7`, pgvector 768). Our `judge.js` is an assessor, not a helper — RF1.6 measured **zero** occurrences of `mentor` in `app/web`, re-confirmed here across `*.{ts,html}`.
9. **Each completion emits analytics, an audit event and webhooks** (`services/trail/trail.py:311`). We emit nothing, so an issuer cannot see a learner struggling.

**Implementation gap** — decided, not built. The known list holds: `btnEnroll` is declared (`web/src/i18n.ts:189`) and translated (`:665`, `:1238`) and referenced nowhere else; no payment step ([[11-Refactoring/RF5 - Enrollment and the Paid Path]]); no account system, wallet only; no dashboard separating fixtures from live state ([[11-Refactoring/RF1 - Consumer Readiness Audit]] 1.5, 1.8); the surface is not in the navigation (`#/learn` occurs in `index.html:581` only inside a comment; handled at `main.ts:1157`). Four more, learned from their code:
- **Server-side progress.** Ours is one localStorage key (`web/src/progress.ts:17`) written by a read-modify-write (`:63-75`), so two tabs racing lose a write and a device change loses everything; theirs is rows with unique constraints precisely because of that race (`db/trail_steps.py:16-25`). The real consequence is not "add a backend" — it is that **the issuer's agent has no channel to receive evidence**, which is why `issue.js` still takes numbers as typed flags (K4).
- **Idempotent issuance.** `CertificateUser` is unique per `(user, certification)` (`db/courses/certifications.py:44`) because two concurrent completion checks once minted two certificates. Our issuance path has no equivalent guard documented.
- **Un-enrol is a state, not a deletion.** They keep the `TrailRun` and flip status, leaving PAUSED and CANCELLED alone (`certifications.py:628`). Our `wipeCourse()` (`web/src/progress.ts:137`) destroys the only record, silently.
- **Human grades are marked as human** (`assignments.py:292`) so the aggregate never overwrites them. Our `essayScore` is a bare `number | null` (`web/src/score.ts:24`) with no provenance, so the credential cannot say whether a model or a person produced it.

## 5. What we deliberately do not take

| not taking | why |
|---|---|
| Multi-tenancy (`org_id` everywhere) | We are one venue with third-party issuers, not a white-label SaaS. Our tenant boundary is the resolver's issuer whitelist, which is on chain and cannot be a column |
| Plan tiers gating features (`plans.py:19`) | Selling "certificates" as a plan upgrade is exactly what our limits sheet forbids ([[08-Results/01 - Evidence and Limits]]) |
| Stripe Connect, offers, checkout | RF5 is explicit: no third-party facilitator, no outside payer, no publisher onboarding |
| SCORM import | EE-only even for them, and it would put a foreign runtime inside a hash-routed, framework-free surface |
| Per-course SEO JSONB (`courses.py:13`) | Not the product we are building |
| AI course generation, magicblocks, playgrounds, podcasts, boards, communities, nudges | Large surface area with no bearing on "is this credential true" |
| Certificate as a capability URL | Our whole differentiator is that validity does not depend on our server being up, or on holding a secret string |
| A 50 % platform default pass mark | A platform-side default is precisely "the platform decides", which we removed (`web/src/score.ts:5-9`) |
| Their front end | Per the hub rule: structure only, described in prose above, to be implemented in Lencana's own idiom |

## Claims I could not verify from this clone

- Anything inside `ee/`: the real `PaymentsOffer` / `PaymentsEnrollment` / `PaymentsProduct` models, the Stripe webhook handler, the checkout implementation, the enrollment-access query. Only import sites are readable. The offer fields quoted in §2 come from a migration that *constructs* one (`payments_to_offers_migration.py:77-90`), not from its model definition.
- Whether paying writes the `UserGroup` membership row directly or only records a purchase a webhook later fulfils. Inferred from that migration's docstring and `rbac.py:505-520`, not read from code.
- The seeded built-in role names. `"student"` / `"teacher"` / `"admin"` appear only in tests and fixtures; I found no seed creating `TYPE_GLOBAL` roles, so §2 lists the *permission buckets* from `db/roles.py:39`, not observed role rows.
- Whether deleting a `Certifications` config (`routers/courses/certifications.py:126`) touches issued `CertificateUser` rows. I confirmed that router exposes no revoke endpoint, but did not read the DELETE body.
- Whether `apps/collab` is required for boards in production, and whether boards are used inside courses — I read the model (`db/boards.py`), not its call sites.
- All `apps/web/**` line numbers except the three cited from `services/payments/offers.ts` (`:47`, `:55`, `:78`). I listed those files but opened few, and per the hub rule did not study their UI.
- Any runtime behaviour. No server was started; every claim above is read from source.

**Related:** [[12-LMS-References/00 - Hub LMS References]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] · [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[05-Course-Content/01 - Course Content]] · [[07-Backlog/01 - Backlog]]
