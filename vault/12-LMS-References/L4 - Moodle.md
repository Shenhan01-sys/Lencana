---
tags: [lms-reference, "L4"]
status: active
updated: 2026-09-26
---

# L4 - Moodle

**Part of:** [[12-LMS-References/00 - Hub LMS References]]
**Source:** references/moodle @ e68a1418b (`github.com/moodle/moodle`, branch `main`, commit dated 2026-09-16, read 2026-09-26)

**Summary:** Moodle is the reference for **bookkeeping**, not for trust. Everything it does well — which
activity produced which number, who last touched it, whether the number was used or dropped — it does by
*storing more rows* and by *serving its own JSON from its own URL*. Nothing in `badges/` is signed
(`'verify' => ['type' => 'hosted', // Signed is not implemented yet.]`,
`references/moodle/public/badges/classes/local/backpack/ob/v2p0/assertion_exporter.php:62`) and nothing is
anchored anywhere. That is the exact seam Lencana sits on. But its **gradebook** and its **payment
subsystem** are two structures we have no equivalent of, and both are worth stealing as data shapes.

> **Path note, verified before anything else.** At this SHA Moodle has moved its whole web-accessible tree
> under `public/`. `git status` is clean and `git ls-files` counts 62,675 files, so the checkout is complete:
> there is no top-level `course/`, `mod/`, `enrol/` or `badges/` any more. Every path below therefore starts
> `references/moodle/public/…`. Older Moodle documentation will not match this clone.

## 1. Composition: course → section → activity module

Three tables, and the third is a pointer, not content:

| level | table | what it holds |
|---|---|---|
| course | `course` (`references/moodle/public/lib/db/install.xml:70`) | `format` (default `topics`, `:80`), `enablecompletion` (`:102`), `showcompletionconditions` (`:107`) |
| section | `course_sections` (`:382`) | `sequence` — a **text field listing course-module ids in order** (`:390`), plus per-section `availability` JSON (`:392`) |
| activity | `course_modules` (`:324`) | `course` / `module` / `instance` / `section` (`:327-330`) |

`course_modules` is the join, not the thing: `module` points at a row of `modules` (`:816`, the site-wide
registry of installed activity types) and `instance` points at a row in **that plugin's own table**. So a quiz
lives in `quiz` (`references/moodle/public/mod/quiz/db/install.xml:7`), an assignment in `assign`
(`references/moodle/public/mod/assign/db/install.xml:7`), and `course_modules` only carries the cross-cutting
policy: visibility, grouping, completion, restrictions.

**Where content actually lives.** Structured text is DB columns (`course_sections.summary`, `quiz.intro`,
`assign.intro`); binaries are *not*. Uploaded files go into a content-addressed pool keyed by SHA-1 of the
bytes — `files` table, "content is stored in sha1 file pool" with `contenthash` (`install.xml:2656`, `:2659`).
This is the same instinct as our `manifestHash`/`rubricHash` split ([[05-Course-Content/K2 - The issuer
manifest and rubricHash]]), applied to blobs instead of policy: identity is a function of content, so an edit
cannot pass as the same object.

**The `mod_*` plugin contract** is documented in-tree and is naming-convention based, not interface based:
`references/moodle/public/mod/README.txt:9-31` — every module ships `mod_form.php`, `version.php`,
`db/install.xml`, `index.php`, `view.php`, `lib.php`, and implements `modulename_add_instance()`,
`modulename_user_complete()`, `modulename_user_outline()`, `modulename_cron()`. 23 activity modules have a
`version.php` at this SHA (counted: `assign, bigbluebuttonbn, book, choice, data, feedback, folder, forum,
glossary, h5pactivity, imscp, label, lesson, lti, page, qbank, quiz, resource, scorm, subsection, url, wiki,
workshop`). Everything a course page needs about one activity is assembled into a `cm_info` object
(`references/moodle/public/course/classes/cm_info.php:187`) via `get_fast_modinfo()`
(`references/moodle/public/lib/modinfolib.php:58`), built in three documented stages — cacheable,
user-dependent, then view-only (`cm_info.php:36-46`). Course *layout* is a separate plugin axis: 4 formats
(`topics`, `weeks`, `singleactivity`, `social`), selected by the `course.format` string.

**A quiz** = settings row (`quiz`) + ordered slots (`quiz_slots`, `install.xml:76`) + attempts
(`quiz_attempts:148`) carrying `sumgrades` per attempt and a `state` of `inprogress|overdue|finished|abandoned`
+ one collapsed row per learner in `quiz_grades:178`, chosen by `quiz.grademethod` (`QUIZ_GRADEHIGHEST`,
`QUIZ_GRADEAVERAGE`, first or last attempt — `:23`). Individual question marks are not in `mod_quiz` at all;
they live in the shared question engine (`question_attempts`, `install.xml:1595`).

**An assignment** = `assign` + `assign_submission` (`:59`, explicitly "metadata … does not include the
submission itself which is stored by plugins") + `assign_grades` (`:83`) where `grader` and `grade` sit side
by side. Grading is a **state machine**, not a boolean: `notmarked → inmarking → readyforreview → inreview →
readyforrelease → released` (`references/moodle/public/mod/assign/locallib.php:64-69`), plus blind marking,
marker allocation and multi-marking (`assign.markingworkflow`, `.blindmarking`, `.markercount`).

## 2. Completion, restrictions and the gradebook

**Per activity.** `course_modules.completion` is a three-valued switch — 0 off, 1 manual (learner ticks it),
2 automatic by rules (`install.xml:340`) — with `completionview`, `completionpassgrade` (`:344`) and
`completionexpected` alongside. Automatic state is computed in `completion_info::internal_get_state()`
(`references/moodle/public/lib/completionlib.php:688`): core rules, then the plugin's own rules via
`activity_custom_completion`, then all results **AND-ed** with a preference order (`:724-737`). States are
`INCOMPLETE 0 / COMPLETE 1 / COMPLETE_PASS 2 / COMPLETE_FAIL 3` (`:73-89`) — note that *"completed and failed"*
is a first-class state, which is why a learner can see "you did this, you did not pass". Per-learner state is
one row in `course_modules_completion` (`install.xml:365`) with an `overrideby` column recording a manual
override of an automatic state.

**Per course.** Not a roll-up of activities: a separate criteria table, `course_completion_criteria`
(`install.xml:162`), with eight pluggable criterion types — self, date, unenrol, activity, duration, grade,
role, course (`references/moodle/public/completion/criteria/completion_criteria.php:42-78`) — aggregated ALL or
ANY per type. Result lands in `course_completions` (`install.xml:203`), which keeps `timeenrolled`,
`timestarted` **and** `timecompleted` as three separate facts.

**Restrictions** are a JSON boolean tree stored in one text column on both the section and the activity
(`install.xml:392`, `:346`), shaped `{"op":"&","showc":[…],"c":[…]}`
(`references/moodle/public/availability/classes/info.php:595`), evaluated by
`core_availability\info::is_available()` (`:175`). Conditions are themselves plugins — six ship: `completion`,
`date`, `grade`, `group`, `grouping`, `profile`. The `grade` condition gates on a *grade item id* with min/max
(`references/moodle/public/availability/condition/grade/classes/condition.php:92`), i.e. "you may not open
chapter 4 until item 12 is ≥ 70" is data, not code.

**The gradebook — the concept our UI lacks.** `grade_items` (`install.xml:2020`) are the columns; one activity
can own several. `grade_grades` (`:2069`) is one row per (item, learner) and it is where the provenance lives:
`rawgrade`/`rawgrademax`/`rawgrademin` frozen *at the time the grade was stored*, `finalgrade` as the cached
post-aggregation value, `usermodified` = "the userid of the person who last modified this grade" (`:2078`),
`overridden` (`:2084`), `excluded` (`:2085`), `feedback` text, and — the two that matter most to us —
`aggregationstatus` ∈ `unknown|dropped|novalue|used` (`:2092`) and `aggregationweight`, "the percent this item
contributed to the aggregation" (`:2093`). Every change is also appended to `grade_grades_history` (`:2219`).

The learner-facing report renders exactly this, and the column set is asserted in its own acceptance test:
`Grade item | Calculated weight | Grade | Range | Percentage | Contribution to course total`
(`references/moodle/public/grade/report/user/tests/behat/user_view.feature:60-71`), including the row
`Test quiz one | 0.00 %( Empty ) | - | 0–100 | - | 0.00 %` — an ungraded item shows as *empty*, never as zero.
`fill_contributions_column()` (`references/moodle/public/grade/report/user/classes/report/user.php:989`) walks
up the parent chain multiplying normalised value by each ancestor's weight; each row keeps a `cmid`
(`:544`) so the number links back to the activity that produced it.

**Lencana's position.** `web/src/score.ts:29` already models a per-component `{name, weight, raw, earned}` and
`web/src/score.ts:40` refuses to emit a number while the verdict is `BELUM_LENGKAP`, with `missing[]`
(`:80-95`) as the human-readable gap list — the same instinct as `aggregationstatus = novalue`. What we lack is
**persistence and history**: `computeScore` is a pure function over evidence held in `localStorage`
(`web/src/progress.ts:17,48`), so there is no row, no `usermodified`, no trail, and the learner never sees the
weight × contribution arithmetic that `formatScore()` can already print. The structure to take is
"one stored row per (component, learner) carrying raw, weight, contribution, status and who set it", not their
table layout.

## 3. Enrolment, and what paying for a course looks like

`enrol_plugin` is the abstract base and is documented as such ("this is also the main source of
documentation", `references/moodle/public/lib/enrollib.php:1873-1881`); `enrol_get_plugin()` (`:142`) resolves
by name, `enrol_user()` (`:2112`) writes the participation row, `enrol_page_hook()` (`:2790`) lets a plugin
draw its own enrolment UI and `can_self_enrol()` (`:2802`) gates it. **13 enrol plugins** ship (counted, each
has a `version.php`): `category, cohort, database, fee, flatfile, guest, imsenterprise, ldap, lti, manual,
meta, paypal, self`.

Two tables carry everything: `enrol` (`install.xml:255`) = one *instance* of a plugin on one course, and
`user_enrolments` (`:302`) = one participation row, unique per (`enrolid`, `userid`) with the comment "Only one
enrolment per plugin allowed", plus `timestart`/`timeend`/`status`. **An enrolment is a first-class,
time-bounded, attributable object.** Lencana has no such record at all (see §5).

**Paid enrolment.** Note the rename: the plugin the hub brief calls `enrol/payment` is `enrol_fee` at this SHA
(`references/moodle/public/enrol/fee/version.php:29`). It does not handle money itself; it delegates to a
generic payment subsystem via three callbacks (`references/moodle/public/enrol/fee/classes/payment/
service_provider.php`): `get_payable()` returns `(amount, currency, accountId)` read straight off the enrol
instance (`:43-49`), `get_success_url()` (`:58-64`), and `deliver_order()` (`:73-92`) which simply calls
`$plugin->enrol_user($instance, $userid, $instance->roleid, $timestart, $timeend)`. Price and currency are
per-instance columns on `enrol` (`cost` `install.xml:270`, `currency` `:271`); the receiving account is chosen
per instance in the settings form (`customint1`,
`references/moodle/public/enrol/fee/classes/plugin.php:346`).

**Who receives the money.** A `payment_accounts` row (`install.xml:4524`) bound to a `contextid` — so the
account belongs to a site or a category, and whoever manages that context manages the account. Each account
carries one or more `payment_gateways` rows (`:4540`) holding that gateway's own `config` blob (PayPal client
id + secret). **There is no platform/author split anywhere**: one amount, one account, one merchant. Our
`SettlementSplit` + `platformBps` ([[02-Contracts/C3 - SettlementSplit]],
[[01-Architecture/A5 - Gas fronted and recovered]]) has no Moodle counterpart.

**Confirmation is server-side and refuses a client-supplied price.** `transaction_complete::execute()`
(`references/moodle/public/payment/gateway/paypal/classes/external/transaction_complete.php:61`) recomputes
the expected amount from `get_payable()` + surcharge (`:72-78`), fetches the order from PayPal, compares
`amount.value` and `currency_code` against its own number (`:92`), and only then captures, records and
delivers (`:94-108`). The doc comment states the reason: "This function does not take cost as a parameter as we
cannot rely on any provided value" (`:54`). Ledger: `payments` (`install.xml:4555`) stores
`component/paymentarea/itemid/userid/amount/currency/accountid/gateway` and nothing else — `save_payment()`
inserts it (`references/moodle/public/payment/classes/helper.php:273`, `:288`); the gateway keeps its own
reference separately (`paygw_paypal.pp_orderid`, `references/moodle/public/payment/gateway/paypal/db/
install.xml:7-11`).

**Refunds: not expressible.** `grep -i refund` over `public/payment/` and `public/enrol/fee/` returns **zero
matches**; `payments` has no status, void or refund column. A paid enrolment can be removed (`user_enrolments`
row deleted, enrolment expiries processed by `enrol/fee/classes/task/process_expirations.php`) but the money is
not reversed by Moodle — that happens out of band at the gateway.

**Self-enrolment and keys.** `enrol_self` gates on `can_self_enrol()` (`references/moodle/public/enrol/self/
lib.php:275`): not a guest, not already enrolled (`:284`), instance currently open, and holding
`enrol/self:enrolself` in the course context (`:296`). The key is a shared secret in `enrol.password`
(`install.xml:269`), auto-generated as 20 random characters when the site requires it (`lib.php:394-395`),
optionally validated against the site password policy (`:766-775`), and **doubled as a group key**: if
`customint1` is set, the same string also places the learner in the matching group (`:193-201`).

## 4. Badges — precisely

| question | Moodle at e68a1418b |
|---|---|
| **OB version** | **2.0 / 2.1 only.** `OPEN_BADGES_V1 = 1`, `OPEN_BADGES_V2 = 2`, `OPEN_BADGES_V2P1 = 2.1` (`references/moodle/public/lib/badgeslib.php:111-117`); `@context` is the literal `https://w3id.org/openbadges/v2` (`:122`). There is **no V3 constant**; the default when no backpack is configured is `OPEN_BADGES_V2` (`:1121-1123`). A class comment calls the assertion "achievement credential from OBv3.0 onwards" (`references/moodle/public/badges/classes/achievement_credential.php:25`) but that class is a DB row holder and the emitted JSON is v2 — the naming follows the spec's rename, not its version. |
| **What the assertion contains** | `@context`, `type: Assertion`, `id` (the site's own JSON URL), `recipient`, `verify`, `issuedOn`, nested `badge`, `evidence` (a `/badges/badge.php?hash=` URL), optional `expires`, `tags` (`references/moodle/public/badges/classes/local/backpack/ob/v2p0/assertion_exporter.php:55-92`). Recipient is `type: email`, always `hashed: true`, identity `sha256$` of *email + a site-wide salt* (`.../v2p0/recipient_exporter.php:48-57`). The nested BadgeClass carries `criteria` as **prose** — `markdown_badge_criteria()` output regenerated from live DB rows on every request (`.../v2p0/badge_exporter.php:85`, `:135-148`; `references/moodle/public/badges/classes/badge.php:882`). |
| **Who signs it** | **Nobody.** `verify.type` is hard-coded `'hosted'` with the comment `// Signed is not implemented yet.` (`assertion_exporter.php:62`). Validity = "this URL, on the issuer's server, still says so". The document's identifier `uniquehash` is `sha1(rand() . $userid . $this->id . $now)` (`badge.php:437`) — an unkeyed collision-resistant label, not a signature and not verifiable offline. The badge image is "baked" with the assertion JSON in a PNG `iTXt` chunk keyed `openbadges` (`references/moodle/public/lib/badgeslib.php:766-768`), so the *pointer* travels with the image; the *proof* does not. |
| **Is revocation expressible?** | **Yes, but as mutation, not as state.** Revoking deletes the row: `award_manager::process_manual_revoke()` runs `$DB->delete_records('badge_issued', …)` (`references/moodle/public/badges/classes/award_manager.php:76`, `:100`). The public endpoint then notices the hash is gone (`helper::assertion_exists()` queries `badge_issued`, `references/moodle/public/badges/classes/local/backpack/helper.php:55`), swaps in `revoked_assertion_exporter` (`.../ob_factory.php:44`), and serves `{'id': …, 'revoked': true}` (`.../v2p0/revoked_assertion_exporter.php:44-48`) with `HTTP/1.0 410 Gone` (`references/moodle/public/badges/json/assertion.php:45-46`). So the revocation is real and machine-readable **only while the issuer's HTTP server is up and honest** — it cannot be checked against anything the issuer does not control, and the deleted row leaves no distinction between "never issued" and "issued then revoked". |
| **Anything anchored to a blockchain?** | **No.** `grep -iE "blockchain\|verifiable credential\|statusList\|data-integrity\|Ed25519\|proof"` over `public/badges/` returns **zero matches**. Repo-wide hits for those words are all vendored third-party code (`lib/aws-sdk` Managed Blockchain clients, `lib/tcpdf` bit-packing, `lib/webauthn` DER bit strings, a `.fa-ethereum` CSS class) — none in the badge path. |

**Against ours.** Lencana issues an OB 3.0 credential in a VC 2.0 envelope:
`type: ['VerifiableCredential','OpenBadgeCredential']` with `@context = [VC v2, OB v3]`
(`signer/src/credential.js:68`; `signer/src/context.js:18,30`), a `Result` object per OB 3.0
(`credential.js:103-111`), `validUntil` rather than `expirationDate` (`:72`), and a **signed** document
(DataIntegrityProof, `eddsa-rdfc-2022` — `signer/package.json:5`, checked by `signer/scripts/check.js:63`).
Recipient is an on-chain address bound by `holderOf()`/soulbound artefact, not a salted email
(`credential.js:78-84`). Status is **two** Bitstring Status List entries — revocation *and* suspension — both
derived from chain state (`credential.js:111-114`; `signer/src/statusList.js:91,130,138`;
[[04-Signer-Service/S3 - Two status lists]], [[04-Signer-Service/S2 - Status lists from chain state]]), and the
credential prints the **rubric version** into itself: `criteria: "<criteria> [rubrik <rubricRef>]"`
(`signer/scripts/issue.js:241`). Verification is free, wallet-less and against the chain via a public client
(`web/src/verify.ts:191-192`). Anchoring is on BAS, the EAS fork ([[01-Architecture/A2 - Why BAS and the EAS
gap we close]]). The load-bearing differences are three: our criteria are a **hash commitment** where theirs
are regenerated prose; our revocation is **readable from a ledger the issuer cannot edit** where theirs is a
row deletion behind the issuer's own URL; and our suspension is a distinct, expressible state
([[Concepts/Issuer Delisted vs Revoked]]) where Moodle has only issued-or-gone.

## 5. What Lencana has that Moodle does not

*By design* — deliberate architectural differences, each one a thing Moodle's model cannot express:

- **Issuer-owned rubric committed into the credential.** Moodle's `criteria` narrative is rebuilt from the
  live database at export time (§4). Ours is `rubricHash = keccak256(canonicalPolicy(manifest))`
  (`web/src/manifest.ts:102`) and the short form is printed into the signed document
  (`signer/scripts/issue.js:241`), so a rubric edit after issuance is detectable rather than silent
  ([[Concepts/rubricHash and manifestHash]]).
- **Third-party agent signs via EAS delegation while the platform fronts gas.**
  `signDelegatedAttestation()` (`signer/src/delegation.js:108`) and `relayDelegated()` (`:215`); the platform
  never holds the issuer key ([[04-Signer-Service/S4 - Delegated issuance]]). Moodle has one issuer: the site.
- **Free, wallet-less public verification against chain state**, not against the issuer's uptime
  (`web/src/verify.ts:191-192`).
- **x402 paid machine verification settled through a split contract** — `SettlementSplit.sol` with a
  per-payment `ref` replay guard and a `platformBps` that can only be lowered
  ([[04-Signer-Service/S6 - x402 paid verification]], [[11-Refactoring/RF5 - Enrollment and the Paid Path]]).
  Moodle's payment path is one merchant, one amount, no split (§3).
- **Grading authority sits outside the platform.** `computeScore()` holds no institutional constants and
  refuses to publish a number when weights do not sum to 100 (`web/src/score.ts:71`, `:112-121`;
  [[05-Course-Content/K4 - Scoring without the platform deciding]]). In Moodle the site *is* the institution,
  so this separation is not a problem it has.

*By code* — verified to exist in `app/`, not merely intended: the typed content model with six interaction
kinds and a DOM-free auditor (`web/src/content.ts:26,34`, `auditCourse`/`auditCatalog`), the manifest registry
(`web/src/manifest.ts`), the three-verdict scorer (`web/src/score.ts:39-40`), the delegated signer
(`signer/src/delegation.js`), the two status lists (`signer/src/statusList.js`) and the four deployed
contracts (`contracts/{CredentialResolver,SoulboundCert,SettlementSplit,DemoCourseToken}.sol`).

## 6. What Moodle has that Lencana lacks

**Design gaps** — we never decided to have these; each needs a decision, and some should stay "no":

| Moodle structure | evidence | our state | decision needed |
|---|---|---|---|
| An **enrolment record** as a time-bounded, attributable object | `user_enrolments` (`install.xml:302`) | none — no table, no type, no route | yes: RF5 assumes one exists |
| **Gradebook persistence + history** (raw/final, weight, contribution, `used|dropped|novalue`, who modified) | `grade_grades` (`install.xml:2069-2093`), `grade_grades_history` (`:2219`) | `Component` computed then discarded (`web/src/score.ts:29`) | yes — this is the single highest-value item |
| **Restriction rules as data** gating a chapter on another item's grade/completion | `availability` JSON tree (`install.xml:346,392`), grade condition (`condition.php:92`) | only `prereqCourseId` at course level (`web/src/content.ts:100`), enforced on chain | yes: per-chapter gating is specced in RF4 but unmodelled |
| **Completion state ≠ pass state** (`COMPLETE_FAIL`) and per-criterion course completion | `completionlib.php:84-89`; `completion_criteria.php:42-78` | `done: boolean` (`web/src/progress.ts:22`) | yes |
| **Assignment grading workflow** (draft → submitted, notmarked → released, blind marking, second marker) | `assign_submission.status` (`mod/assign/db/install.xml:59`); `locallib.php:64-69` | essay has a local `draft` string and no states | yes for states; blind marking / second marker = probably never |
| **Roles beyond learner/issuer** — 8 archetypes incl. non-editing teacher, manager, coursecreator | `accesslib.php:2204-2238` | none | yes for "mentor"; the rest, no |
| **Payment accounts bound to a context** so an institution, not the platform, owns the merchant record | `payment_accounts.contextid` (`install.xml:4524`) | publisher named in the manifest, no account object | yes, if publishers ever onboard (currently on the limits sheet, [[08-Results/01 - Evidence and Limits]]) |

**Implementation gaps** — decided, not built, or built and not wired:

- **No enrolment handler at all.** `btnEnroll` is declared at `web/src/i18n.ts:189` and translated at `:665`
  (`'Start Course'`) and `:1238` (`'Mulai Belajar'`), and referenced nowhere else — re-verified from `app/` on
  2026-09-26 with `findstr /s /n /c:"btnEnroll" web\src\*.ts web\index.html` → exactly those three lines
  ([[11-Refactoring/RF1 - Consumer Readiness Audit]] 1.1).
- **No payment step in the learner flow.** The browser-side x402 is a **timer-driven simulation**:
  `simulateX402Batch()` sets `'402 CHALLENGE'`, `'SIGNED (0.0005 tBNB)'`, `'SETTLED'`, `'200 OK (118ms)'` from
  three `setTimeout`s at 350/850/1350 ms and makes no network call (`web/src/main.ts:1003-1070`). The real
  settlement lives in `signer/` and is not reachable from the learning surface.
- **No demo-vs-real separation.** The same screen shows simulated numbers and real chain reads with no marker
  distinguishing them (RF1 1.5, 1.8) — Moodle's equivalent seam is explicit: `paygw_paypal` config carries
  `environment == 'sandbox'` and branches on it (`transaction_complete.php:71-72`).
- **No mentor / assistant / non-editing-teacher surface.** `findstr /s /i /n /c:"mentor"` over
  `web/src/main.ts`, `web/src/i18n.ts`, `web/index.html` → 0 matches (RF1 1.6), re-verified 2026-09-26.
- **Progress is `localStorage` only** and is documented as *not evidence* (`web/src/progress.ts:1-13`,
  `:17,48`) — correct as a trust claim, but it means no server-side progress, no cross-device continuity and
  nothing for a gradebook row to reference.
- **Learning surface is not linked from the main navigation.** Nav is Home / Courses / AI Assessment /
  Verifier / Portfolio / Agent Hub (`web/index.html:44-49`); the string `#/learn` appears in that file only
  inside a comment at `:581`. 34 pages of content are one typed URL from invisible (RF1 1.3,
  [[03-Frontend/FE6 - Quirks and open defects]]).
- **Wallet-connect is the only identity path** — `eth_requestAccounts` at `web/src/main.ts:504`, plus a
  hand-typed address field for reading one's own credentials (`web/src/lms.ts:338`). Moodle separates
  *authentication* (18 `auth/` plugins) from *enrolment* (13) from *identity in a credential* (salted email);
  we currently collapse all three into "connect a wallet".

## 7. What we deliberately do not take

- **The plugin API.** 23 `mod_*` + 13 `enrol_*` + 4 course formats + 6 availability conditions + 8 badge
  criteria + 9 completion criteria, all resolved by naming convention (`mod/README.txt:21-31`). That surface
  only pays for itself with third-party authors; we have one publisher and a hard deadline, and a convention-
  based plugin system is untestable by our probe. Our equivalent is a discriminated union checked by
  `auditCourse` (`web/src/content.ts:34`).
- **A server-rendered admin surface.** Moodle's authoring, grading and configuration are PHP pages behind
  login. Lencana is a static, hash-routed, DOM-free-typed surface on purpose so the same content module runs
  in Node for `npm run probe` ([[03-Frontend/01 - Frontend]]). Taking their admin shape means taking a server,
  sessions, and a second place where a claim can be made without evidence.
- **SCORM / IMS packages** (`public/mod/scorm`, `public/mod/imscp`). A packaging standard for reselling
  content we would then not be able to hash, audit or re-rubric — it directly conflicts with
  `manifestHash` ([[Concepts/rubricHash and manifestHash]]).
- **Hosted verification as the validity model.** `verify.type = 'hosted'` is the one thing we must *not* take:
  it makes the issuer's uptime and honesty the definition of truth, which is the sentence this vault has
  refused since D23 ([[00-Overview/03 - Decisions]]).
- **Salted-email recipient identity** (`recipient_exporter.php:48-57`). Depends on a secret the verifier
  cannot obtain, so it proves nothing to a third party; our recipient is a public address bound on chain.
- **A platform-side grade override.** `grade_grades.overridden` / `excluded` and `course_modules_completion.
  overrideby` let the institution overrule the evidence. Useful in a real LMS, fatal to ours: our number must
  be reproducible from the issuer's rubric plus the evidence, or `rubricHash` commits to nothing.
- **The `enrol` table's generic `customint1..8` / `customchar1..3` / `customtext1..4` columns**
  (`install.xml:273-289`). One schema for thirteen plugins is why `customint1` means "payment account" in
  `enrol_fee` and "group key" in `enrol_self`. Typed fields per payment path beat a spare-column convention.

**Related:** [[12-LMS-References/00 - Hub LMS References]] · [[11-Refactoring/RF4 - Learning Surface Target
Shape]] · [[11-Refactoring/RF5 - Enrollment and the Paid Path]] · [[05-Course-Content/K2 - The issuer manifest
and rubricHash]] · [[05-Course-Content/K4 - Scoring without the platform deciding]] ·
[[04-Signer-Service/S1 - The credential document]] · [[08-Results/01 - Evidence and Limits]]

## Claims I could not verify

1. **Whether OB 3.0 support is in progress.** `achievement_credential.php:25` uses OBv3.0 vocabulary and is
   dated 2025, and `UPGRADING.md:89` mentions fields removed "due to … their absence from the official
   specification … do not appear in OBv3.0" — but every emitter I opened writes `@context:
   https://w3id.org/openbadges/v2`. I found no v3 exporter. I did not read the whole of `badges/` (≈100 files),
   so "no OB 3.0 emission anywhere" is stronger than what I checked; "no OB 3.0 emission in the assertion /
   badge / issuer exporters" is what I verified.
2. **Refunds.** Zero `refund` matches in `public/payment/` and `public/enrol/fee/`, and no status column on
   `payments`. I did **not** read the PayPal gateway's API wrapper end to end, so I cannot rule out a
   refund call reachable from elsewhere (e.g. an admin tool). What I can say is that the core payment
   subsystem does not model one.
3. **Whether `enrol/paypal` (the legacy plugin, distinct from `enrol/fee`) still sells courses**, and how it
   differs. It has a `version.php` and its own `install.xml`; I did not open it. The brief asked about
   `enrol/payment` (= `enrol/fee`), so I stayed there.
4. **Line numbers inside files I read as whole-file dumps rather than by grep** — `enrol/fee/classes/payment/
   service_provider.php`, `badges/classes/achievement_credential.php`, `badges/json/assertion.php`,
   `payment/gateway/paypal/db/install.xml`. I derived them by counting from the file start against
   grep-confirmed anchors in the same file; they agreed every time I cross-checked, but the ones cited inline
   above (`:43-49`, `:58-64`, `:73-92`, `:25`, `:7-11`) were counted, not grep-confirmed. Treat as
   `_unverified_` if exactness matters.
5. **Moodle's role archetypes.** I read the archetype *map* in `accesslib.php:2204-2238` (8 names) but not the
   capability definitions in `lib/db/access.php`, so the counts of capabilities per role are not stated here.
6. **"62,675 files"** came from `git ls-files | find /c /v ""` run in `references/moodle`. That counts tracked
   paths, not working-tree files, and `references/` is gitignored at workspace level — so it is a property of
   the upstream tree, not a measurement of `app/`, and per [[Conventions]] it is not a product claim.
7. **Nothing about Moodle was executed.** No install, no PHPUnit, no Behat run. Every Moodle statement here is
   read from source at one commit; I have no runtime evidence for any of it.
