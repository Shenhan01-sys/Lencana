---
tags: [lms-reference, "L6"]
status: active
updated: 2026-09-26
---

# L6 - Canvas

**Part of:** [[12-LMS-References/00 - Hub LMS References]]
**Source:** references/canvas-lms @ 1c9f0bb (sparse: app/models, app/controllers, db/migrate, db/views, lib, config, spec/models)

**Summary:** Of the six references, Canvas matters most for our learning surface for one reason: its chapter gate is a **first-class, per-learner, server-computed record**. Requirements are data on the chapter; whether *this* student met them is one row per (module, user), recomputed server-side and cached behind an explicit staleness flag. That is precisely the object we fake in `localStorage`.

**Key points:**
- Six requirement types, orthogonal to item type: `must_view`, `must_mark_done`, `must_contribute`, `must_submit`, `min_score`, `min_percentage` (`references/canvas-lms/app/models/context_module.rb:968`).
- Progression is a state machine, not a boolean: `locked → unlocked → started → completed` (`references/canvas-lms/app/models/context_module_progression.rb:540`).
- Course completion is never stored — it is derived on every read (`references/canvas-lms/app/models/course_progress.rb:184`).
- No payment code in this tree; the only money hook is one comment and one workflow state (`references/canvas-lms/app/models/enrollment.rb:832`).

## 1. How it is structured

Four tables carry a course, from the squashed init `references/canvas-lms/db/migrate/20101210192618_init_canvas_db.rb` (see §10):

| concept | table | load-bearing columns | line |
|---|---|---|---|
| chapter | `context_modules` | `position`, `prerequisites` `:1738`, `completion_requirements` `:1739`, `unlock_at` `:1743`, `require_sequential_progress` `:1745`, `completion_events` `:1747`, `requirement_count` `:1748` | `:1733` |
| chapter item | `content_tags` | `content_id/content_type` (polymorphic), `context_module_id`, `position`, `indent`, `tag_type`, `workflow_state` | `:1649` |
| per-learner progress | `context_module_progressions` | `requirements_met`, `incomplete_requirements`, `workflow_state`, `current_position` `:1761`, `completed_at`, `current`, `evaluated_at`, `lock_version` | `:1754` |
| enrolment | `enrollments` (+ `enrollment_states`, `scores`) | `course_section_id`, `type`, `role_id`, `workflow_state`, `self_enrolled` | `references/canvas-lms/app/models/enrollment.rb:33` |

Two structural choices are the interesting ones. **A module item is not its own record**: `ContextModuleItem` is a mixin included into `Assignment`, `Attachment`, `WikiPage` etc. that adds a `context_module_tags` association filtered to `tag_type='context_module'` (`references/canvas-lms/app/models/context_module_item.rb:21`, `:26`, `:29`), so the chapter owns position, indent and requirement while the content object owns the content — one assignment can sit in three chapters at three positions. `ContentTag`'s frozen type list even includes two *tableless* entries (`ContextModuleSubHeader`, `ExternalUrl`), so a heading and an outbound link are items with the same standing as an assignment (`references/canvas-lms/app/models/content_tag.rb:26`, `:38`). **Order is enforced twice**: `acts_as_list scope: :context_module` keeps `position` contiguous (`:99`), and `require_sequential_progress` turns that order into a gate — the progression stores a `current_position`, and an item is locked while its position is ahead of it (`references/canvas-lms/app/models/context_module.rb:477`, `references/canvas-lms/app/models/context_module_progression.rb:429`).

## 2. Modules, requirements, prerequisites

`completion_requirements` is a serialised array of `{id:, type:, min_score?}` whose `id` is the **ContentTag id** — the requirement attaches to an item's placement, not to the content (`references/canvas-lms/app/models/context_module.rb:43`, `:545`). The writer validates it: a scoreable type is dropped unless the tag itself is scoreable, so an author cannot demand a grade from a reading page (`:567`; `references/canvas-lms/app/models/content_tag.rb:275`). `requirement_count` is the "any N of these" knob, blank or 0 meaning all (`references/canvas-lms/app/models/context_module_progression.rb:153`). Prerequisites are a separate serialised array of `{id:, type: "context_module"}` — chapter-to-chapter only, validated against module position so a chapter cannot depend on a later one (`references/canvas-lms/app/models/context_module.rb:42`, `:515`) — and `unlock_at` is checked before prerequisites are even considered (`references/canvas-lms/app/models/context_module_progression.rb:420`).

**One method with four verbs advances a learner.** `ContextModule#update_for(user, action, tag, points)` refuses unless the caller `participate_as_student`, refuses if the progression is `locked` (`references/canvas-lms/app/models/context_module.rb:939`), and `completion_requirement_for` does the verb → requirement mapping below (`:948`).

| requirement | verb that satisfies it | who fires it, and from where | citation |
|---|---|---|---|
| `must_view` | `:read` | serving a file, external URL, wiki page, quiz or LTI launch | `references/canvas-lms/app/controllers/application_controller.rb:2421` → `references/canvas-lms/app/models/content_tag.rb:571` |
| `must_mark_done` | `:done` | `PUT …/modules/<m>/items/<id>/done`, whose whole body is that call; the `DELETE` twin calls `uncomplete_requirement` | `references/canvas-lms/app/controllers/context_module_items_api_controller.rb:668`, `:671`, `:677` |
| `must_contribute` | `:contributed` | a discussion entry or a wiki-page edit | `references/canvas-lms/app/models/context_module.rb:957` |
| `must_submit`, `min_score`, `min_percentage` | `:scored` (with the score) or `:submitted` | the submission itself, after save, through a queued job | `references/canvas-lms/app/models/submission.rb:1580`, `:1583` |

`min_score` compares recorded points against the requirement and refuses while the assignment is muted (`references/canvas-lms/app/models/context_module_progression.rb:329`); a submitted-but-ungraded scoreable item is parked in `incomplete_requirements`, which is what moves a progression from `unlocked` to `started` (`:160`).

## 3. Completion: who computes it, where the record lives

Server-side, per learner, one row. `ContextModuleProgression` belongs to a module and a user, serialises `requirements_met` / `incomplete_requirements`, and stamps `completed_at` in a `before_save` derived from the workflow state (`references/canvas-lms/app/models/context_module_progression.rb:21`, `:33`, `:43`). The row is unique per (user, module) at DB level (`db/migrate/20101210192618_init_canvas_db.rb:1769`) and is created lazily, only for the actually-enrolled (`references/canvas-lms/app/models/context_module.rb:1018`).

Three mechanics make it trustworthy rather than merely stored. *Staleness is a column*: `current` boolean plus `evaluated_at`, and `outdated?` turns true once the chapter is edited after the last evaluation (`references/canvas-lms/app/models/context_module_progression.rb:388`) — so editing a chapter flips every progression to `current = false` in batches and queues re-evaluation (`references/canvas-lms/app/models/context_module.rb:111`, `:127`), while *tightening* requirements on a live chapter offers an explicit relock back to `locked` (`:91`). *Optimistic locking, retried*: `lock_version` with a five-to-ten attempt loop around `StaleObjectError` (`references/canvas-lms/app/models/context_module_progression.rb:451`, `:348`). *Completion propagates outward*: entering `completed` invalidates and re-queues dependent chapters and fires `completion_events`, of which there is currently exactly one, `:publish_final_grade` (`references/canvas-lms/app/models/context_module_progression.rb:500`; `references/canvas-lms/app/models/context_module.rb:1070`).

**Course completion is not a record.** `CourseProgress` is a plain Ruby object, not an `ApplicationRecord`: `completed?` is `has_requirements? && every module progression completed`, `progress_percent` is derived from requirement counts, and it refuses to answer at all unless the course `module_based?` and the user is a student (`references/canvas-lms/app/models/course_progress.rb:21`, `:184`, `:156`, `:226`; `references/canvas-lms/app/models/course.rb:656`). Tested at `references/canvas-lms/spec/models/context_module_progression_spec.rb:109`.

**The contrast with us, concretely.** Ours is `web/src/progress.ts:17` — one `localStorage` key `lencana-progress-v1` holding `{courseId: {lessonSlug: {done, kind, score, attempts, draft, at}}}`, written by `recordLesson` (`:62`) when a button carrying `data-action="mark-done"` is clicked (`web/src/lms.ts:325`). No per-learner identity, no staleness, no lock, no requirement type, and nothing another party can read. That is deliberate — the file's own header says a local flag is not evidence and must never be dressed as one — but it means Canvas's *gate* has no counterpart here: we can display `done`; we cannot enforce `must_submit` or `min_score`, because nobody computes it and no record survives the browser.

## 4. Grading

`AbstractAssignment` carries the policy: `ALLOWED_GRADING_TYPES = points | percent | letter_grade | gpa_scale | pass_fail | not_graded` (`references/canvas-lms/app/models/abstract_assignment.rb:43`), an `assignment_group` for weighting (`:114`), a `grading_standard` (`:125`), and `score_to_grade` / `grade_to_score` (`:1793`, `:1862`). `Submission` is one row per (assignment, user) with `belongs_to :user`, `:grader`, `:grading_period`, workflow `submitted → graded` (`references/canvas-lms/app/models/submission.rb:142`, `:149`, `:370`, `:376`), a numeric `score` beside a string `grade`, and `posted_at` — the learner cannot see the number until it is posted (`:3246`, `:3271`). The gradebook reads `Score` rows, one per enrolment (optionally per grading period or assignment group), holding `current_score`, `unposted_current_score`, `final_score`, `unposted_final_score` and `override_score`: the posted/unposted split lives in the schema, not in a view (`references/canvas-lms/app/models/score.rb:21`, `:24`, `:31`; `references/canvas-lms/app/models/enrollment.rb:49`). Who grades is a role plus, optionally, moderation — `moderated_grading`, `grader_count`, `final_grader_id`, one `ProvisionalGrade` per grader, and a `ModeratedGrading::Selection` recording which provisional grade was chosen for which student (`references/canvas-lms/app/models/abstract_assignment.rb:53`; `references/canvas-lms/app/models/moderated_grading/selection.rb:20`).

**"Which evidence produced which number" is answered four ways**, all server-side:

| answer | mechanism | citation |
|---|---|---|
| per-criterion breakdown | `RubricAssociation#assess` walks the criteria, builds a `ratings` array of `{criterion_id, points, description, comments, above_threshold}`, sums it into `score`, and saves a `RubricAssessment` whose `data` column **is** that array — the breakdown survives with the grade | `references/canvas-lms/app/models/rubric_association.rb:302`; `references/canvas-lms/app/models/rubric_assessment.rb:33`, `:38` |
| which rubric version | the rubric is `serialize :data` plus `simply_versioned`, so an old assessment can be read against the version it was made with | `references/canvas-lms/app/models/rubric.rb:77`, `:78` |
| who changed it, when | `SubmissionVersion` indexes every saved version; `Auditors::ActiveRecord::GradeChangeRecord` is a month-partitioned audit row per change naming student, grader, assignment, submission version and `graded_anonymously` | `references/canvas-lms/app/models/submission_version.rb:21`; `references/canvas-lms/app/models/auditors/active_record/grade_change_record.rb:21`, `:28`, `:36` |
| mastery of an outcome | `LearningOutcomeResult` ties an outcome to the artifact that produced its score, and records `possible`, `score` and a computed `mastery` | `references/canvas-lms/app/models/learning_outcome_result.rb:21`, `:27`, `:36` |

## 5. Enrolment and money

One `enrollments` table, STI by `type` (`Student`/`Teacher`/`Ta`/`Designer`/`Observer`Enrollment — `references/canvas-lms/app/models/enrollment.rb:22`), with `role_id` so custom roles sit under a base type, and a **mandatory** `course_section_id`: enrolment is always into a section of a course (`:33`, `:34`, `:51`; `references/canvas-lms/app/models/course_section.rb:26`, `:30`). States are `invited | creation_pending | active | deleted | rejected | completed | inactive` (`:29`, `:811`), and a separate 1-1 `EnrollmentState` row caches the *effective* state derived from term and section dates, because "active" plus an ended term is really soft-concluded (`references/canvas-lms/app/models/enrollment_state.rb:20`, `:86`). Entry is by admin/teacher creation (`references/canvas-lms/app/controllers/enrollments_api_controller.rb:676`), by an invitee accepting (`references/canvas-lms/app/models/enrollment.rb:756`), or by **self-enrolment with a join code** — gated by an account setting, a 6-character unambiguous-charset code and an optional `self_enrollment_limit`; the endpoint refuses unless the code resolves and `user_id == "self"` (`references/canvas-lms/app/models/course.rb:1625`, `:1633`, `:1658`; `references/canvas-lms/app/models/account.rb:2267`; `references/canvas-lms/app/controllers/enrollments_api_controller.rb:785`).

**What is NOT in this tree.** Searching `app/models`, `app/controllers`, `lib` and `config` for `stripe|paypal|braintree|billing|invoice|checkout|purchase|e-commerce|payment_gateway` yields exactly one Ruby hit and it is a comment: `# Inactive is a "hard" state, i.e. tuition not paid` (`references/canvas-lms/app/models/enrollment.rb:832`), with `state :inactive` next (`:833`), reached by `Enrollment#deactivate` (`:627`); `EnrollmentState#restricted_access` collapses to `:inactive` (`references/canvas-lms/app/models/enrollment_state.rb:89`). Canvas OSS therefore models the *consequence* of not paying — an enrolment that grants no rights — and leaves price, cart, transaction and gateway outside the tree. There is no price field on `Course` or `Enrollment` in the checked-out paths, and `paypal:` appears only as an **empty** key in some `config/locales/*.yml`, with zero occurrences in any `.rb`.

## 6. Mastery paths and student view

Both present. **Mastery paths** are `ConditionalRelease`: a `Rule` has one `trigger_assignment` and many ordered `ScoringRange`s (`lower_bound`/`upper_bound` over a 0..1 score), each pointing at `AssignmentSet`s, and `assignment_sets_for_score(score)` is the entire branching decision (`references/canvas-lms/app/models/conditional_release/rule.rb:21`, `:27`, `:31`, `:88`; `references/canvas-lms/app/models/conditional_release/scoring_range.rb:21`, `:56`). It hangs off the grade-change path: a graded *and posted* submission queues `ConditionalRelease::OverrideHandler`, then re-fires the module action (`references/canvas-lms/app/models/submission.rb:2373`, `:2394`). **Student view** is a deliberately fake enrolment — `StudentViewEnrollment < StudentEnrollment`, whose only body is `fake_student? → true` (`references/canvas-lms/app/models/student_view_enrollment.rb:21`) — backed by `Course#student_view_student`, which creates a `Test Student`, sets `preferences[:fake_student]` and gives it an HMAC-derived pseudonym (`references/canvas-lms/app/models/course.rb:4396`, `:4407`). It is excluded from normal enrolment queries by a `not_student_view` validation (`references/canvas-lms/app/models/enrollment.rb:63`) and exempted from the term-start wait (`references/canvas-lms/app/models/enrollment_state.rb:190`). The rule-editing UI is outside the sparse checkout.

## 7. What Lencana has that Canvas does not

*By design* — Canvas has no notion of any of these, and nothing in the tree would host them:

| ours | verified at | Canvas |
|---|---|---|
| Signed, portable credential document (OB 3.0 over VC 2.0) as the end-of-course artifact | `signer/src/credential.js:46`, type array `:68`, `credentialStatus` `:112` | `grep -i 'open_badge\|badgr\|verifiable_credential\|completion_certificate'` over `app`, `lib`, `config` → **0 hits**; every `badge` hit is a notification counter (`references/canvas-lms/app/models/user.rb:2221`) |
| Status derived from chain state, as two Bitstring Status Lists anchored on BAS | `signer/src/lists.js:9`, `:41`, `:55`; indices cross-checked against the document at `signer/scripts/issue.js:263`, `:265` | `Enrollment#conclude`/`deactivate` (`references/canvas-lms/app/models/enrollment.rb:615`, `:627`) and soft-delete only — nothing can invalidate a *claim* after the fact |
| Grading policy committed by hash **into** the artifact | `web/src/manifest.ts:53`, `:102`; printed into `achievement.criteria` at `signer/scripts/issue.js:241`, named in `result.method` at `:250` | The rubric is versioned (`references/canvas-lms/app/models/rubric.rb:78`) but the version stays inside Canvas's DB; a transcript leaves without it |
| Third-party issuer signs; the platform only broadcasts and fronts gas | `signer/src/delegation.js:1` — EIP-712 delegation, `attester` = agent, never `msg.sender` | No separation between who owns the judgement and who runs the server: the grader is a user row in the same database as the grade |
| Free, wallet-less public verification | `web/src/verify.ts` (DOM-free by design); `web/src/lms.ts:389` reads `credentialsOf(address)` straight from the resolver, no backend | Verification is a login plus a permission check (`set_policy`, e.g. `references/canvas-lms/app/models/score.rb:45`) |
| x402 paid machine verification with an on-chain split | `signer/src/x402.js:1`; [[11-Refactoring/RF5 - Enrollment and the Paid Path]], [[02-Contracts/C3 - SettlementSplit]] | One comment (§5) |

*By code*, the honest counterweight: our per-criterion breakdown already exists and travels in the credential — `result.comment` carries `${name} ${raw}×${weight}%` per component plus `esai: ${label} ${score}/${max}` per rubric line (`signer/scripts/issue.js:253`), and `web/src/score.ts:39` returns a `components[]` array with `weight`/`raw`/`earned`. Structurally that is Canvas's `RubricAssessment#data`, in a document instead of a row.

## 8. What Canvas has that Lencana lacks

**Design gap** = never decided, needs a decision before code. **Implementation gap** = decided and not built, or built and not wired. Every Lencana line below was re-read in `app/` on 26 Sep.

| what Canvas has | gap | our state, cited |
|---|---|---|
| Requirement types orthogonal to item type | design | a lesson has a `kind` and a quiz `passPct` (`web/src/content.ts:26`) but nothing saying "needs a submission" vs "needs a score ≥ N" vs "needs a contribution" |
| Chapter-to-chapter prerequisites, unlock dates, "any N of these", sequential lock | design | `prereqCourseId` (`web/src/content.ts:100`) is course-to-course only, enforced on chain by `refUID` |
| Sections and cohorts | design | one flat catalogue per course; Canvas cannot represent an enrolment without a section (`references/canvas-lms/app/models/enrollment.rb:51`). Whether we ever need cohorts is undecided |
| Five enrolment types plus custom roles | design | wallet-connect and nothing else; `mentor` → 0 occurrences in `web/src/main.ts`, `web/src/i18n.ts`, `web/index.html` ([[11-Refactoring/RF1 - Consumer Readiness Audit]] 1.6). Whether the issuer's agent is a role *in the learning surface* is open ([[11-Refactoring/RF4 - Learning Surface Target Shape]]) |
| Posting as a separate act from grading (`posted_at`) | design | no such pause: the number is either computed or `BELUM_LENGKAP` (`web/src/score.ts:40`). That may be right for us; it has not been argued |
| An enrolment record at all | implementation | `btnEnroll` occurs exactly three times in all of `web/src` — `web/src/i18n.ts:189` (type), `:665` (`'Start Course'`), `:1238` (`'Mulai Belajar'`) — and nowhere else, `web/index.html` included |
| A payment step | implementation | nothing for one to hang off ([[11-Refactoring/RF5 - Enrollment and the Paid Path]]) |
| A reachable learning surface | implementation | `web/index.html` links `#/courses` (the marketplace page) at lines 45, 177, 215, 274, 406, 1587; `#/learn`, `#/course/<id>` and `#/me` appear only in a comment at `:581`, beside the mount `id="lms-mount"` at `:582` — the router handles all three |
| Server-side progress (§3) | implementation | device-local only, and no demo-vs-real separation: one build, one `DemoCourseToken`, one set of fixtures (RF1.8) |

## 9. What we deliberately do not take

| not taking | reason |
|---|---|
| The polymorphic `ContentTag` indirection | It exists because Canvas has ~15 database-authored content types across many institutions. Ours are six kinds authored in TypeScript and audited by `auditCourse` (`web/src/content.ts:187`); the indirection would cost the DOM-free auditability that makes `npm run probe` possible |
| Serialised requirement/progress blobs in a relational DB | We have no database by design; if progress ever needs a server, the honest shape for us is an attestation, not a mutable row |
| Section/term/date-driven enrolment state (`EnrollmentState`, `state_valid_until`, the ~5-minute recalculation job) | Complexity bought for institutional calendars. Our validity window is one manifest number (`web/src/content.ts:106` `validDays`) and one `validUntil` in the credential |
| Moderated grading, provisional grades, anonymous grading | Assumes several human graders per submission. We have one issuer policy and one judge seam; importing it would imply staffing we do not have and cannot claim |
| The gradebook as a spreadsheet surface (`gradebook_upload`, `gradebook_csv`, what-if grades, custom columns) | An institution's reporting tool. Our equivalent output is one credential plus `formatScore`'s single honest line (`web/src/score.ts:136`) |
| `completion_events` → auto-publish final grades | The mechanism (chapter completes → server action) is exactly right; the *event* is not, because for us the trigger must be an issuer decision, never a platform-side automatic publication. Take the hook, refuse the default |
| Join-code self-enrolment as our paid path | A shared secret plus a headcount limit is not a payment. If we build enrolment it goes through the existing settlement/split path, not a code |
| Anything about their interface | Out of scope by the hub's rule; every structure above is given as data and control flow so our frontend owner can express it in Lencana's own idiom |

## 10. Claims I could not verify — check these first

1. **`db/views` does not exist at this commit.** The hub's sparse-checkout list names it, but `git -C references/canvas-lms ls-tree -r --name-only HEAD -- db/views` returns nothing and `db/` contains only `migrate/`. Nothing here rests on a database view; the hub's command should be corrected ([[00-Overview/04 - Corrections]]).
2. **`db/migrate` is squashed.** Only 95 migration files are present and everything before 2023 lives in `20101210192618_init_canvas_db.rb`, so the column lists above are the current schema as that init expresses it, not a historical sequence. There is no `db/schema.rb`/`structure.sql` in the sparse set either: "a boolean `current`" means `t.boolean :current` at `db/migrate/20101210192618_init_canvas_db.rb:1763`, not a live `\d`.
3. **`simply_versioned` is unread.** The macro is called at `references/canvas-lms/app/models/rubric.rb:78`; the implementation is a vendored gem outside the checkout, so the claim is "the rubric is versioned", not a mechanism.
4. **The mastery-path editing surface** (`ConditionalRelease::Service`'s HTTP side, the rule editor) is outside the checkout. Whether a rule can branch on anything other than one trigger assignment's score is _unverified_ — the models suggest not.
5. **"No payment code" is scoped to four directories** at 1c9f0bb. `app/services`, `gems/`, `plugins/` and the JS trees are outside the sparse set, and Canvas's real commerce lives in a separate product. The honest statement is *"no payment code in the checked-out paths"*, never *"Canvas has no commerce"*.
6. **The `paypal:` locale keys are empty** in the files sampled (`config/locales/en-AU.yml:27254`, `config/locales/en-GB.yml:27250`), and `config/locales/en.yml` has no such key. I did not open all 38 matching files, so "leftover translation keys" is the likely reading, not a proven one.
7. **Line numbers move.** Every citation was confirmed by printing the numbered line on 26 Sep 2026 against the local clone at `1c9f0bb`. Re-check the load-bearing four before quoting this note elsewhere: `context_module_progression.rb:540` (the states), `context_module.rb:948` (verb → requirement), `course_progress.rb:184` (course completion is derived), `enrollment.rb:832` (the only money comment).

**Related:** [[12-LMS-References/00 - Hub LMS References]] · [[11-Refactoring/RF4 - Learning Surface Target Shape]] · [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[05-Course-Content/K4 - Scoring without the platform deciding]] · [[Concepts/rubricHash and manifestHash]]
