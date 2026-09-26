---
tags: [lms-reference, "L2"]
status: active
updated: 2026-09-26
---

# L2 - Frappe LMS

**Part of:** [[12-LMS-References/00 - Hub LMS References]]
**Source:** references/frappe-lms @ aae024f — `git log -1` inside the clone prints `aae024f0b20af1fe298839dfa58fa8341a706742`, committed 2026-09-25. Upstream `github.com/frappe/lms`, branch `develop`.

A Frappe Framework app, so the model **is** the DocType: one folder per entity with `<name>.json` (fields, permissions, links) and `<name>.py` (controller hooks). Behaviour sits in two large modules — `lms/lms/api.py` (whitelisted RPC the Vue SPA calls) and `lms/lms/utils.py` (queries, pricing, enrolment). All paths below are relative to `references/frappe-lms/`.

## 1. How it is structured

71 DocType JSON files: 69 under `lms/lms/doctype/`, 2 under `lms/job/doctype/`. The ones that matter, all under `lms/lms/doctype/`:

| concept | DocType(s) | folder |
|---|---|---|
| course · chapter · lesson · ordering rows | `LMS Course`, `Course Chapter`, `Course Lesson`, `Chapter Reference`, `Lesson Reference` | `lms_course/`, `course_chapter/`, `course_lesson/`, `lesson_reference/` |
| enrolment · per-lesson completion | `LMS Enrollment`, `LMS Course Progress` | `lms_enrollment/`, `lms_course_progress/` |
| quiz · question · option · attempt | `LMS Quiz`, `LMS Quiz Question`, `LMS Question`, `LMS Option`, `LMS Quiz Submission`, `LMS Quiz Result` | `lms_quiz/`, `lms_question/`, `lms_option/`, `lms_quiz_submission/` |
| assignment · certificate (free + paid) | `LMS Assignment`(+`Submission`), `LMS Certificate`, `LMS Certificate Request`, `LMS Certificate Evaluation` | `lms_assignment_submission/`, `lms_certificate/`, `lms_certificate_request/`, `lms_certificate_evaluation/` |
| cohort · bundle · money · people · artefacts | `LMS Batch`(+`LMS Batch Enrollment`), `LMS Program`, `LMS Payment`, `LMS Coupon`, `Course Instructor`, `Course Evaluator`, `LMS Course Mentor Mapping`, `LMS Lesson Note`, `LMS Course Review` | `lms_batch/`, `lms_program/`, `lms_payment/`, `course_instructor/`, `lms_course_mentor_mapping/`, `lms_lesson_note/` |

**Progression fields.** `published` (`lms_course/lms_course.json:72`) doubles as the framework's web-publish gate — `"is_published_field": "published"` (`:309`) — so an unpublished course is not served at all, not merely filtered out. `disable_self_learning` (`:95`) means only staff may enrol. `enforce_lesson_completion` (`:102`) carries an honest description (`:101`): a lesson the student cannot complete blocks every lesson after it.
**Sequence is not a field** — it is the child rows' `idx`: `Lesson Reference` is `"istable": 1` (`lesson_reference/lesson_reference.json:22`) with one `lesson` link (`:13`), reordered by RPC that rewrites `idx` (`lms/lms/api.py:1010`, `:1072`).
**No prerequisite field exists anywhere**: searching `prerequisite` across `lms/` returns nothing. The nearest is `LMS Program.enforce_course_order` (`lms_program/lms_program.json:61`), which the server reads and hands to the client (`lms/lms/utils.py:3105`) but never gates on — the `eligible` flag it computes (`:3115-3125`) is consumed only by Vue templates.
**No `free` flag either**: a course is free when `paid_course` is 0 (`lms_course.json:184`); a lesson is free to a guest when `include_in_preview` (`course_lesson/course_lesson.json:46`) meets `LMS Settings.allow_guest_access` (`lms_settings/lms_settings.json:367`).

**How a lesson carries content.** Two parallel bodies — `content` (EditorJS block JSON, `course_lesson.json:135`, `ignore_xss_filter: 1`) and `body` (Markdown, `:68`) — plus `youtube` (`:102`) and `quiz_id` (`:88`); an inline assignment hangs off `question` + `file_type` (`:114`). Instructors get a private pair, `instructor_content` / `instructor_notes` (`:130`), denied to students by a `File` permission hook (`lms/lms/permissions.py:24`, `:258`). A whole chapter may instead be a SCORM package (`course_chapter.json`, `is_scorm_package`).

**How quizzes are scored.** `LMS Quiz` holds `total_marks`, `passing_percentage`, `max_attempts`, `show_answers`, `shuffle_questions`, `limit_questions_to`, `duration`, `enable_negative_marking`+`marks_to_cut`, `enable_proctoring`+`max_violations` (`lms_quiz/lms_quiz.json:60,82,102,112,122,128,141,147,154,162,169`). `LMS Question` has `type` = `Choices | User Input | Open Ended` (`lms_question/lms_question.json:88`), ten fixed option slots each with `is_correct_N` **and** `explanation_N` (`:115-357`), ten accepted free-text `possibility_N` (`:367-417`), per-question `marks` (`:103`). `submit_quiz` (`lms_quiz/lms_quiz.py:165`) re-reads every question server-side; `process_results` (`:539`) grades by exact set-match for multi-correct (`verify_answer`, `:597`), applies negative marks (`:576`), leaves `Open Ended` at `is_correct = 0` for a human (`:578-590`). Score and percentage are then recomputed by the submission's own controller (`lms_quiz_submission/lms_quiz_submission.py:46`, `:58-61`) and read back rather than recalculated (`lms_quiz.py:222-224`), so the two paths cannot drift.

**How completion is computed.** One `LMS Course Progress` row per (member, lesson), `status` in `Complete | Partially Complete | Incomplete` (`lms_course_progress/lms_course_progress.json:50,55`), unique per pair (`lms_course_progress.py:17-27`), writable only for your own account (`:29-42`, an explicit IDOR guard). Course progress = completed rows ÷ lesson count × 100 (`lms/lms/utils.py:392-403`), denormalised onto `LMS Enrollment.progress` (`lms_enrollment/lms_enrollment.json:91`) by `recalculate_course_progress` (`lms/lms/utils.py:3439`). **Unweighted**: a 5-minute lesson counts as much as a 40-minute one. The write path (`course_lesson/course_lesson.py:345`) refuses a locked lesson (`:365`) and can be conditioned on the embedded quiz and assignment having passed (`:393-402`, from `lms_settings.json:555,561`).

**How a certificate is produced.** Free/self-service: `create_certificate(course)` (`lms_certificate/lms_certificate.py:166`) needs an enrolment, `enable_certification` and `progress >= 100` (`:209-221`); the controller re-checks at insert (`:79-95`) and refuses a second certificate for the same member+course (`:101-118`). Paid: buy the certificate separately, then book a slot — `LMS Certificate Request` assigns an evaluator and validates availability, slot and timezone (`lms_certificate_request/lms_certificate_request.py:55,60,83,137`); the evaluator records a rating in `LMS Certificate Evaluation`, mapped into an `LMS Certificate` (`lms_certificate_evaluation.py:84-104`, restricted to the assigned evaluator at `:90-95`). Its name is a random hash (`make_autoname("hash")`, `lms_certificate.py:18-19`).

## 2. Business process

**Roles.** `LMS_ROLES = ["Moderator", "Course Creator", "Batch Evaluator", "LMS Student"]` (`lms/lms/utils.py:46`); `PRIVILEGED_ROLES` adds `System Manager` (`:48`). Instructors are *not* a role but a child table on the course (`Course Instructor`, `lms_course.json:129`), consulted by `is_instructor` (`lms/lms/utils.py:405`). Mentors are a per-course mapping (`lms_course_mentor_mapping.py:9-15`).

**Enrolment.** One `LMS Enrollment` per (member, course), created by an ordinary `frappe.client.insert` from the browser (`frontend/src/components/CourseCardOverlay.vue:189`; staff variant `frontend/src/pages/Forms/CourseEnrollmentForm.vue:145`) — there is no dedicated enrol endpoint. The controller does the work in `before_insert` (`lms_enrollment.py:13-16`): `FOR UPDATE` lock on the course row, then duplicate check (`:49-65`) and eligibility (`:67-108`) — refusing unpublished courses, refusing `disable_self_learning`, and refusing a `paid_course` unless an `LMS Payment` with `payment_received` exists for that member (`:96-108`). Uniqueness is also enforced at DB level (`lms/lms/enrollment_constraints.py:22-30`). `progress` and `purchased_certificate` are server-managed and reverted for non-staff (`:21-31`).

**Payment.** `get_payment_link` (`lms/lms/payments.py:49`) → `get_order_summary` (`lms/lms/utils.py:2584`) reads `course_price`/`currency`/`amount_usd` (`:2603-2623`), applies coupon and Indian GST (`:2639-2655`), writes an `LMS Payment` (`payments.py:151`), then either completes at once when the total is ≤ 0 (`payments.py:105-108`) or hands off to the gateway in `LMS Settings.payment_gateway` (`lms_settings.json:347`) — Razorpay and Stripe are the two `get_payment_id` knows (`lms/lms/utils.py:2909-2918`). The callback runs `complete_enrollment` (`:2849-2869`) → `enroll_in_course` (`:2974-2996`), which re-locks the course row so a duplicate callback is a no-op; paying again for access already held is short-circuited by `already_has_access` (`payments.py:127`).

**Membership tiers: none.** Nothing bundles "a level of access for a recurring price". The two bundling objects are `LMS Batch` — a dated, seat-limited, optionally paid cohort (`start_date`, `end_date`, `seat_count`, `paid_batch`, `amount`, `currency`, `allow_self_enrollment` at `lms_batch/lms_batch.json:83,110,126,131,201,208,318`) — and `LMS Program`, an ordered bundle of courses. Batch enrolment fans out into per-course rows (`lms_batch_enrollment.py:99`).

**Who grades.** Machine-gradable questions grade themselves server-side (§1). Everything else is human: `Open Ended` answers, and `LMS Assignment Submission`, whose `status` is `Pass | Fail | Not Graded | Not Applicable` with an `evaluator` link and `comments` (`lms_assignment_submission/lms_assignment_submission.json:79-93`) — fields a student cannot set, reverted to safe defaults on create (`lms_assignment_submission.py:57-73`), with a notification on change (`:108-122`).

**Completion requires** every lesson Complete (progress 100). **The artefact** is a PDF from a Frappe Print Format: `LMS Certificate.template` (`lms_certificate.json:76`), defaulted from a Property Setter (`lms_certificate.py:189-206`).

**How validity could be checked — and why it cannot really be.** `/courses/<course_name>/<certificate_id>` (`lms/hooks.py:226-233`) redirects to a PDF download (`lms/www/certificate.py:6-13`); a stranger may read the row only when `published` is set (`lms_certificate.py:223-232`, `:235-242`). Verification is therefore *an unguessable URL on the same server that stores the row*: no signature, no hash, no export, and nothing that survives the site going away. This is the structural difference the whole of Lencana exists to remove.

## 3. What Lencana has that Frappe LMS does not

**By design** (a deliberate architectural difference):

- **A signed credential document, not a rendered PDF** — `type: ['VerifiableCredential', 'OpenBadgeCredential']` (`signer/src/credential.js:68`), W3C VC 2.0 first and Open Badges 3.0 second in `@context` (`signer/src/context.js:18-21`). [[04-Signer-Service/S1 - The credential document]]
- **Two Bitstring Status Lists derived from chain state** — `revocation` and `suspension` (`signer/src/statusList.js:30-31`), served at `/credentials/status/{revocation,suspension}` (`signer/src/server.js:310`). Frappe has no revocation concept; a wrongly issued certificate can only be deleted. [[04-Signer-Service/S2 - Status lists from chain state]] · [[04-Signer-Service/S3 - Two status lists]]
- **The issuer owns the rubric and the credential names its version** — `rubricHashOf` commits to the policy only (`web/src/manifest.ts:102-104`) and the 12-hex ref is printed into `achievement.criteria`. Frappe's `passing_percentage` is a mutable column; nothing records which version produced a submitted score. [[05-Course-Content/K2 - The issuer manifest and rubricHash]]
- **A third-party agent signs by EIP-712 delegation while the platform fronts gas** (`signer/src/delegation.js:37`, `:226`, `:232`). Frappe's issuer is always the site itself. [[04-Signer-Service/S4 - Delegated issuance]] · [[01-Architecture/A5 - Gas fronted and recovered]]
- **A chain-enforced prerequisite** — `prereqCourseId` maps to `refUID` and the resolver rejects one that is revoked, expired, someone else's, or from a delisted issuer. [[01-Architecture/A2 - Why BAS and the EAS gap we close]]
- **Machine-to-machine paid verification over x402 through our own split contract** (`signer/src/server.js:273`, price at `:39`; `contracts/SettlementSplit.sol:43`, `:125`). [[02-Contracts/C3 - SettlementSplit]]

**By code** (verified in `app/`): **free, wallet-less public verification** — `verify()` reads `statusOf(bytes32)` over a public RPC (`web/src/verify.ts:281`, `:510`) and prints the raw `cast`/`curl` a reader can re-run (`web/src/verify.ts:756-766`). Frappe's equivalent needs a session on its own server.

## 4. What Frappe LMS has that Lencana lacks

**DESIGN gaps** — we never decided to have these:

| # | they have | our state |
|---|---|---|
| 1 | **An enrolment record**: one row per (member, course) carrying `progress`, `current_lesson`, `payment`, `certificate`, `purchased_certificate` (`lms_enrollment.json:78,91,106,118,123`), read by every other flow | nothing. [[11-Refactoring/RF5 - Enrollment and the Paid Path]] assumes one exists; it does not |
| 2 | **Server-side progress with an ownership rule**: a row per (member, lesson), status enum, DB-level uniqueness, and a controller refusing to write another member's row (`lms_course_progress.py:17-42`) | one `localStorage` key shared by every address in the browser (`web/src/progress.ts:17`). Deliberate — local progress is *not evidence* — but there is no per-learner namespace and nothing survives a device change |
| 3 | **Sequential gating enforced on the write path**: `compute_locked_lessons` (`lms/lms/utils.py:1575-1598`), `save_progress` refusing a locked lesson (`course_lesson.py:365`), `get_lesson_gate` deriving the resume point while distrusting a stored `current_lesson` that is itself locked (`lms/lms/permissions.py:218-249`) | `prereqCourseId` gates *courses*; nothing gates a chapter or a lesson |
| 4 | **Attempt limits and per-question marks**: `max_attempts`, negative marking, `marks`, per-option `explanation` (§1) | one `passPct`, unbounded retries; `attempts` is counted locally (`web/src/progress.ts:24`) and never enforced |
| 5 | **A human grading queue where `Not Graded` is a first-class status**, with `comments`, `evaluator` and a notification on change (`lms_assignment_submission.json:79-93`) | the essay path ends at `essayScore: null` in a struct (`web/src/score.ts:19-25`); nothing queues it, nothing tells the learner it was graded. `BELUM_LENGKAP` is the same idea at score level ([[05-Course-Content/K4 - Scoring without the platform deciding]]) — the missing part is the *record* it refers to |
| 6 | **"Buy the certificate" as a purchase separate from "buy the course"**: independent flags, flows and redirect targets (`lms_course.json:184,270`; `payments.py:200-207`) | one price idea, no such split |
| 7 | **Mentor and evaluator as data**: a per-course mentor mapping and an `evaluator` link on the course (`lms_course.json:276`) | zero occurrences of "mentor" ([[11-Refactoring/RF1 - Consumer Readiness Audit]] 1.6); the mentor panel in [[11-Refactoring/RF4 - Learning Surface Target Shape]] has not decided who rents the agent |
| 8 | **Learner-side artefacts beyond progress**: `LMS Lesson Note` stores a highlight plus a note per (member, lesson) (`lms_lesson_note.json:41,61,70`); `LMS Course Review` a rating | only the essay draft, locally (`web/src/progress.ts:26`) |
| 9 | **Anti-click-through settings**: `lesson_dwell_time`, `enforce_video_completion` (`lms_settings.json:538,549`) | nothing — but note theirs runs client-side only (`frontend/src/utils/lessonProgress.ts:6`); the server never checks dwell |

**IMPLEMENTATION gaps** — we decided these and they are not built; Frappe only shows the shape:

- No enrolment handler at all: `btnEnroll` is declared and translated twice, referenced nowhere else (`web/src/i18n.ts:189`, `:665`, `:1238`), so there is no place for a payment step ([[11-Refactoring/RF1 - Consumer Readiness Audit]] 1.1).
- No account system — wallet connect only, so there is no server-side member to attach progress or enrolment to. Progress is keyed by nothing user-specific (`web/src/progress.ts:17`).
- No dashboard separating demo state from real chain state (RF1.5, RF1.8). The learning surface is handled (`web/src/lms.ts:452`) but unreachable from the main navigation (RF1.3), and there is no mentor anywhere (RF1.6).

## 5. What we deliberately do not take

| not taken | reason |
|---|---|
| The DocType-driven admin surface (71 schemas + generated CRUD + a desk app) | We have no server to host one; our "admin" is a manifest file plus `npm run probe` ([[05-Course-Content/01 - Course Content]]) |
| Server-rendered Frappe website routes wrapping a Vue SPA (`lms/hooks.py:226-233` → `_lms`) | Lencana is hash-routed templates over typed data, no UI framework ([[03-Frontend/01 - Frontend]]) |
| Gateway payments and their coupling — Razorpay/Stripe controllers, GST, coupons, billing addresses | Our rail is x402 + `SettlementSplit` on chain 97 with a demo token ([[02-Contracts/C4 - DemoCourseToken and the x402 interface]]) |
| SCORM, live classes, Zoom/Meet, job board, PWA manifest | Cohort-delivery and hiring features are not our product, and each adds a surface we cannot staff |
| Gamification badges (`lms_badge.json:42-72`: a rule engine firing on a DocType event to grant an image) | Their "badge" does different work from Open Badges; adopting the word would create exactly the confusion [[08-Results/01 - Evidence and Limits]] forbids |
| Proctoring and violation capture (`lms_quiz.py:266`, `:314`; `lms_quiz_submission.json:120`) | Surveillance of a learner contradicts pseudonymous-by-default |
| The unweighted completion percentage | It substitutes a lesson count for the issuer's own weights — the one number we refuse to own ([[05-Course-Content/K4 - Scoring without the platform deciding]]) |
| The certificate as a PDF behind an unguessable URL | That model *is* what we exist to replace (§2) |

## Claims I could not verify from the clone

- Whether `LMS Certificate.published` is ever set automatically: the field exists (`lms_certificate.json:71`) and both permission functions read it (`lms_certificate.py:224`, `:241`), but I found no writer in `lms/`. `_unverified_`
- Whether `max_attempts` is enforced on every entry point — I confirmed the hook (`lms_quiz_submission.py:30`) but read it only at signature level. `_unverified_`
- Whether `enforce_lesson_completion` also gates media *inside* a lesson's EditorJS `content`, not just attached `File` records: `file_has_permission` covers attachments (`permissions.py:258`) and `resolve_lesson_access` the lesson (`:27`), but I did not trace every media route. `_unverified_`
- The certificate's actual print layout — Frappe print formats live in site data, not in the repository.
- The absence of any signature / VC / Open Badges export is a statement about this clone at `aae024f` only; an upstream paid tier or companion app could add one.

**Related:** [[12-LMS-References/00 - Hub LMS References]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] · [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[05-Course-Content/01 - Course Content]] · [[Conventions]]
