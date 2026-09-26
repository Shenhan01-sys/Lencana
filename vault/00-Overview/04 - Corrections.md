---
tags: [overview, correction]
status: active
updated: 2026-09-25
---

# 04 - Corrections

Wrong claims that were written down here or in the UI, and what replaced them. Kept on purpose: a
vault that only records successes cannot tell you which of its numbers to trust. Each row names the
thing that caught the error — that is the part worth copying.

| claimed | true | caught by |
|---|---|---|
| "`--slow` fixes the failing `SeedDemo` transactions" (17 Sep) | No. The UID contains the mined `block.timestamp`, so a UID-dependent step is stale by construction. Fix is in code: two documented runs, gate on "already on chain before this process started" → **D32** | clean fork + reading `_getUID` |
| `credentialHashOf = encodePacked(...)` | Must be `keccak256(encodePacked(...))`. My first version returned **54 bytes** that looked like a hash | `web/scripts/probe.ts` — the check that existed precisely to catch this |
| "the judge model gave 25/25 to **two** essays of different quality" | **Never measured** — the first probe sent one essay to every model. Measured later: 100 and **8**, so it *can* fail an empty answer; the real reason it is not our default is a saturated ceiling, not leniency | a builder question ("where did that number come from?") followed by an actual run |
| "at `temperature 0` the score drifts ±1" | Spread is **9 points** (91-100 on the same substantive essay, 5 runs). What is stable is the **pass/fail decision**, not the number | `npm run judge-variance` |
| tx hashes `0xb477b7e7…` / `0x26d067b8…` written into a note | Wrong — abbreviated from memory. Real: `0x54b2d531…` / `0x0694ae2d…`, later `0x3486ff75…` / `0xb2f045d0…` | re-running the harness and reading its log file |
| "12 watched credentials" | **11** — the dry run prints it | `npm run anchor -- --dry-run` |
| "97 tests pass on chain 97 **and** 56" (quoted on 25 Sep as if both were fresh) | Only 97 was re-run on 25 Sep. The 56 figure is dated 23 Sep and must carry that date | writing this page |
| "the signer server anchors the list it serves" | It did **not**: `issue.js` anchored a one-credential list while the server served all of them. Single source now, `servedHashes()` in `signer/src/lists.js` | comparing the anchored hash with the served hash |
| `attestByDelegation` works with the batch request shape | It does not — an array landed where a struct belonged → `InvalidAddressError`. Caught before any gas moved | running `npm run delegate` on the public chain |
| "nothing in `signer/` has touched a public chain yet" | Obsolete from 21 Sep onward | re-reading the line while writing a new one |
| **In the shipped UI, still open:** a hand-typed "Open Badges 3.0 document" with 17 URLs on a domain we do not hold | The real document is served by `GET /credentials/0x…` and is signed. One field of the typed object (`0x0b95c83b…`) **is** a live credential, which is what makes the rest convincing | the front-end merge audit → [[10-Contributors/Open-Items/OI-1 - Fabricated credential document]] |
| `../README.md` "no contract has been broadcast to a public testnet yet" | False since 21 Sep: 4 contracts on 97, re-read from the RPC | this audit |
| [[00-Overview/01 - Briefing]] "Sign in. Email login. The backend creates an address for the learner" | Not built. There is no email login and no account: progress is `localStorage`, and the UI's "Sign in with Browser" is a wallet prompt, not the described flow | grepping `web/` for login/email while writing this page |
| [[05-Course-Content/K4 - Scoring without the platform deciding]] "**What the document then carries**: `score` plus a `result.method` naming the rubric version and, when a model graded, that model" | `issue.js` **builds** that string (`method`, `comment`) and `credential.js` never emits it: OB 3.0's `Result` is `{achievedLevel, resultDescription, status, value}` and out-of-context terms are dropped in canonicalisation. The stored documents show it — `result[0]` has four keys, no `method`. So the credential names the rubric, not the judge → **B44** | dumping a real credential from `signer/.store/state.json` to paste into [[00-Overview/10 - Project Detail (long form)]] and noticing the field was missing |
| The §19 Mermaid diagram in [[00-Overview/10 - Project Detail (long form)]] "renders fine" | It did **not** — `Note over IS,ST: … number;<br/>…` ends the statement at the `;`, so the parser saw a second, empty arrow: `Parse error on line 10 … Expecting 'NEWLINE', 'SOLID_ARROW', …`. The same class of bug was then found in one diagram in [[00-Overview/09 - Project Detail (submission)]]. Fixed both; no literal `;` remains on any `sequenceDiagram` line in this vault | `mermaid@11` `parse()` run over **every** block in the vault (18 blocks, 0 failures after the fix), then re-proved by re-inserting the semicolon and watching it fail again. Now guarded by `scripts\check-mermaid.ps1` → [[Conventions]] |
| [[00-Overview/10 - Project Detail (long form)]] written for a **"±68k character" field** | The form's "Project Detail" ceiling is **5,600 characters**. 62k characters of work were not wasted — the long page stays as the reference behind the submission text — but the *pasteable* artifact is now `10 - Project Detail (long form) - Copy.md` (5,508 chars, no diagram, no vault paths, no internal ticket IDs). Rule learned: field limits get **measured from the form before** the prose is sized to them, and the condensed version drops everything that only means something inside our own workspace | discovered by the builder pasting it on 27 Sep; recorded in [[00-Overview/08 - Submission Copy]] |
| The flagship course's own blurb: *"Seratus sembilan puluh menit"* | The data computes **307** minutes for that course (412 for the catalog). The sentence was not harmless: `achievement.description` is copied from `blurb` into every signed credential, so the wrong number went out under an agent's signature. Copy corrected to a duration-free sentence and `auditCourse` now **refuses** any blurb containing `menit`. `rubricHash` unchanged (`0x2a45d0d00bc46f3d`) — material moved, policy did not, exactly as §5 of the project detail claims | `npm run inventory` compared against the prose, 26 Sep |

## The habit this table is meant to teach

Every row was caught by **running something**, never by re-reading the prose. A claim that has no
command attached is a guess with better formatting — which is why [[AGENTS]] rule 1 forbids writing
numbers that were not just produced, and [[09-Testing/00 - Hub Testing]] is the only home for them.

**Related:** [[00-Overview/03 - Decisions]] · [[08-Results/01 - Evidence and Limits]] · [[10-Contributors/Claims-Cheat-Sheet]]
