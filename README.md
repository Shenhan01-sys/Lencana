# Lencana

**Learning credentials that anyone can verify — no wallet, no login, and without having to trust
us.**

A micro-course platform where ~~**the issuer of each credential is an AI agent**~~ *(Correction 3 Oct,
decision D54: AI agents only **grade and propose scores** — ERC-8004 grading agents hired per activity; the
**publisher's key** signs and revokes every credential, and the verifier page shows the agent is not its
signer)*. Credentials follow
the **Open Badges 3.0 / W3C Verifiable Credentials 2.0** standard, while **who is allowed to
issue** and **whether a certificate has been revoked** are recorded on **BNB Smart Chain**. A
recruiter verifies a certificate by opening a URL in a browser — that is the whole flow.

**Who the issuer is, on this deployment.** Each credential is signed by an issuer *agent* (an Ed25519
key). The on-chain issuer registry is an address allowlist, and on this testnet deployment **the
platform registered that issuer** (CredentialResolver.addIssuer) and **holds the agent key** on its own
machine. Self-service onboarding, where the institution runs that registration itself and keeps its own
key, is the roadmap — it is not a feature a stranger can click here. What we can defend, and what the
harness proves, is narrower: **the signing authority is an address that is separately registered,
listed, and delistable on chain**, and the credential names the document that carries its key
(verified by `npm run check:identity`: builder, local signer and the durable edge serve the *same*
issuer document — one hash).

Built for the **Indonesia Web3 Hackathon 2026** — *Consumer Apps* track (· *AI Agents*), on BNB
Chain.

> **Status 28 Sep.** The on-chain layer is deployed on BNB Chain testnet (chain 97) and every number
> below is printed by a command that ran. What changed this week is availability, not features: the
> credential-signing backend now publishes its documents to a **durable public host**
> (`https://lencana-edge.hansgunawan775.workers.dev`), and a third-party validator — 1EdTech's
> `vc.1ed.tech` OB 3.0 inspector — returned **`outcome: VALID`, 14 checks, 0 errors, 0 warnings** for
> a credential issued under it, with the document, its `verificationMethod` and both status lists all
> read over the public internet (`npm run validator -- --record`, ledger:
> [`vault/09-Testing/T15%20-%201EdTech%20validator.md`](vault/09-Testing/T15%20-%201EdTech%20validator.md)).
>
> What we still forbid ourselves from saying, and why, is written next to the evidence rather than
> footnoted: that validator is a member tool, not a conformance certification; ~~**2 of the 8 papers we
> hold** are currently checkable end-to-end by a stranger — the other six print hosts that are
> loopback or a dead tunnel, and `publish` cannot fix a URL that is already inside a signed document~~
> ([`vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md`](vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md)
> B51/B54) *(Correction 3 Oct: closed since — `npm run rehost` re-signed the stranded papers with the same key and
> zero transactions, and `npm run verify:edge` measured 26 of 26 papers checkable end-to-end on 1 Oct evening; see the
> `verify:edge` row below)*; and the demo corpus's artefacts live on a contract deployed **before** our own
> course-granularity and batching rules existed, so those rules are proven in source, in fork tests
> and on one live instance — not on the old one (decision D46).

---

## Why this exists

A PDF certificate is forged with Photoshop. A certificate in the issuer's database is forged
**by the issuer itself**, or by a compromised admin. An NFT fixes neither — it only moves the
question to: *who may mint this, and how does a checker know it is genuine?*

"Because blockchain, because NFT" does not survive scrutiny. So this project answers **four
mechanical questions** instead of one slogan:

| # | question | answer | where |
|---|---|---|---|
| a | Who may issue, and how is that bound on-chain? | Address whitelist; an unapproved issuer makes the transaction **revert** | `contracts/CredentialResolver.sol` |
| b | What stops a holder selling or moving the certificate? | **Soulbound** NFT (ERC-5192): transfer, approval **and burn** are all rejected | `contracts/SoulboundCert.sol` |
| c | How does someone verify without a wallet and without crypto? | Static page, **one `eth_call`** straight to the chain — our backend is not in this path | `web/` |
| d | What happens when a credential is revoked — and can that revocation be denied? | `revoke()` on BAS; **there is no `unrevoke`** | third-party primitive + `CredentialResolver` |

## Proven

Every number below is the output of a command that was run, not a plan.

| command | result |
|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **65/0 passed / failed** (offline, 30 Sep — the three `*.fork.t.sol` files are *excluded* by the flag, so nothing is "skipped" on this row; they run on the next row. This row used to carry **66/0**, which is what plain `forge test` prints — 66 passed / 0 failed / 9 skipped — so the number and the command that names it had drifted apart while A10 stayed green. B114: the harness now runs exactly the command written here) |
| `forge test --evm-version cancun --fork-url <public chain 97>` | **120 passed / 0 failed** on **chain 97** (30 Sep — whole suite, fork enabled: `forge test --rpc-url …/97 --evm-version cancun`; 28 Sep; 5 suites — 27 artefact, 22 settlement, 8 split-on-97, 9 end-to-end, 38 resolver) |
| `forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/` | **104 passed / 0 failed** on **chain 56** (28 Sep), same suites, same composition |
| `npm run probe` in `web/` | **118/0 checks / failed** against **public chain 97** (2 Oct, B127: +20 for five new short courses — each carries an issuer manifest, a well-formed `rubricHash`, a decision on full evidence and a refusal on none — and +6 for zero-weight components: a course with no on-chain practice reaches a decision on quiz + essay alone, and the content audit refuses a weight without lessons of its kind in both directions; 92/0 earlier on 2 Oct: +4 for the B126 test class; 88/0 on 1 Oct: +2 for B80 — the quiz questions the page imports carry no answer keys, and the per-question feedback is read from `/grade`'s reply; 86/0 on 30 Sep. The path to that number is recorded because two of its steps were mistakes I made and the probe caught: 73 before B105, then 82 with the publisher-registry assertions, then **86** after the page's public issuer-document URL was proven over the network instead of derived from the manifest slug — the derived one answered **404**, because the edge serves issuer documents per *agent* slug and the publisher-to-agent mapping is not in the manifest. An earlier version of this row carried 82 with a note that the full `sync:numbers` could not finish; that blocker is cleared — see **B115**. 28 Sep: 59) — four verdicts exercised (`VALID`, `REVOKED`, `ISSUER_DELISTED`, "valid but its prerequisite is revoked") **plus an audit of the course content and of who holds grading authority**: every lesson slug unique, every quiz answer inside the option range (since B80 that one check moved out of this probe — the page no longer holds the keys — into `verify:quizkeys` and the load-time guard of `web/src/manifest-keys.ts`), every rubric summing to 100, the demo learner's `credentialHash` **recomputed from the course data** and asserted equal to the attestation on chain, and every course required to have an issuer manifest whose `rubricHash` a credential can point at. Earlier runs: 51 (22 Sep), 41 on a fork (19 Sep) |
| `npm run rubric` in `web/` | **17 checks / 0 failed** — the grading rule as arithmetic: both sides of the pass mark (69.6 → 70 passes, 68.8 → 69 does not), refusal to score an incomplete submission, refusal to score a manifest whose weights sum to 90, and `rubricHash` sensitivity: flipping an answer key changes it, fixing a typo in the reading material does not |
| `npm run inventory` in `web/` | **7 courses · 15 modules · 46 lessons · 69 pages · 585 minutes · 48 quiz questions · 7 rubric-scored essays** in the public catalogue (2 Oct: +5 short courses for B127, three of them non-technical, graded without an on-chain practice component; until then 2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 essays). All six lesson kinds used; the unlisted test class is not counted. Printed from the data, not typed into a document — which is the only reason a page count may appear in this README |
| `npm run check` in `signer/` | **114/0 checks / failed** against **public chain 97** (4 Oct afternoon, after the agent-brain-to-credential run (B143) added one more paper — corpus 30; 112/0 earlier that day, after the second full end-to-end run added three more papers — corpus 29; 106/0 on 1 Oct evening, after the full end-to-end run added three papers — one through the learner flow, two through the credential-lifecycle journey; 100/0 earlier that day, after the 23rd paper was issued with its practice graded by chain — B121; 98/0 on 30 Sep evening, after the 22nd paper was issued through the B104 review chain; 96/0 after B102 added two specimen papers and a fourth issuer document; 91/0 earlier that day; 88/0 before B84(b) added the issuer-key invariant checks below — it grows with the watched set, and the authoritative number is whatever the run prints) — OpenBadgeCredential 3.0 built and signed with `DataIntegrityProof` + `eddsa-rdfc-2022`; tampering, a swapped verification method and an unlisted key all fail to verify; served bits are read **from `statusOf()` on the deployed resolver**, every credential's bit is checked **at the index the document itself claims**, rendering the watched set twice (or in a different order) must produce the **same** bitstring hash, and for every paper in the store the key that signed it must be **listed in the issuer document it points at** (measured 1 Oct evening: 26 papers over 4 issuer documents — 19 + 3 + 3 + 1 — all listed; 23 earlier that day; 22 on 30 Sep evening; 19 over 3 before the B102 specimens and the B104 test paper) |
| `npm run delegate` in `signer/` | green on public 97 (22–23 Sep): batch `tx 0xe31a917e…` (3 lesson credentials, 1,024,813 gas) and single `tx 0xbe44e128…` (370,131 gas). Read back from chain: `attester` is the **agent**, the agent's balance is **unchanged to the wei**, `lessonOf(uid)` equals the lesson id derived from the course material, and the attester nonce advanced once per request |
| `SettlementSplit` fork tests | 8 passed on **97 and 56** (28 Sep) against canonical Permit2 + canonical `x402ExactPermit2Proxy` (not our copies): settlement lands in the split and divides 90/10, with the client's transaction count never moving |
| `forge script script/PaidVerificationDemo.s.sol --broadcast` | executed on public 97 (23 Sep): 2,806,675 gas **paid by the platform**, settlement `tx 0x32fb6fc0…` status 1, and RPC read-back shows issuer `900` / platform `+100` / split `0` / `splitDone(ref)=true`. The demo client held no BNB and sent no transaction |
| `npm run x402` in `signer/` | **20 checks / 0 failed** against the running server, paying on public chain 97 (24 Sep) | the paid handshake happens, and what it sells is **batch**, not data: `402` + `accepts[]` when unpaid; then one settlement (`settleTx 0x3486ff75…` 114,728 gas + `splitTx 0xb2f045d0…` 75,931 gas = **190,659 gas = 0.0000190659 BNB, measured from receipts**) serves `credentialHashes: [a, b]` and returns two reports with **different verdicts** (`REVOKED`, `VALID`) — proof it isn't one result copied twice — while issuer revenue rises by exactly **one** price (900), not two. On chain, not per the response: issuer +900, platform +100, client −1000 holding **0 BNB, 0 transactions** |
| `node scripts/issue.js` in `signer/` | **one command, green on public 97** (21 Sep): score → attestation under the **agent's own key** (gas 316,384) → signed document → both status lists → each list's bitstring hash anchored to BAS via `timestamp()` and **read back** (gas ≈45,900). The anchored hash is the hash of the list the server actually serves — that property was broken until it was measured |
| `npm run probe:serve` in `signer/` | **50/0 checks / failed** (30 Sep evening; 49 earlier that day, before the fourth agent of B102; 28 Sep: 48) against the running server — same assertions, everything over HTTP, so the issuer document and the two status lists are verified the way a third-party tool would verify them. Since B48 it also requires **every** agent in `.keys/` to answer at its own URL and verifies a credential against the issuer document *that credential points at* |
| `forge script … --broadcast` on **public chain 97** | deploy succeeded (21 Sep) · 4,191,202 gas · **≈0.00042 BNB** at the 0.1 gwei the testnet quoted. Re-verified independently from the RPC by a separate script (**13/13**), because a build log saying "SUCCESSFUL" is not evidence |
| `npm run validator` in `signer/` | **10 checks / 0 failed**, and the third party's own verdict: **`outcome: VALID` · 14 checks · 0 errors · 0 warnings** (28 Sep, two credentials: `0xd0bce6f4…` and `0x44d4946e…`). The harness reads the document back over HTTP, follows the URLs inside it, uploads it, and polls `/api/validate` — it does not read the verdict off the HTML page, which prints a conformance sentence as a template for *any* upload |
| `npm run publish:edge` in `signer/` | **26 / 27 routes read correctly back through the worker** (28 Sep; the 27th is a course that no longer exists in the catalogue and is reported as such, not counted green), both status lists `matchesChainNow`. Signs in Node, writes Workers KV, then verifies over the URLs a stranger would click |
| `npm run verify:edge` in `signer/` | **10/0 / failed**, **26 dari 26** papers readable (1 Oct evening, after the full end-to-end run; 23 of 23 earlier that day; 22 of 22 on 30 Sep evening, before the B121 test paper whose practice was graded by chain; 9/0 with 19 of 19 earlier on 30 Sep, before B102 added two specimen papers under a fourth issuer document and B104 one test paper issued through the human-review chain; 28 Sep: 5). The measurement this row used to print rather than hide — **2 of 8 papers** checkable end-to-end by someone else (28 Sep: 3 printed `127.0.0.1`, 3 a tunnel host that returned `ENOTFOUND`) — is history, closed by `npm run rehost`; it stays here because it is why the number is measured at all *(3 Oct: a separate run printed TEPI MERAH — 10 checks, 1 failed — because the edge state was 30.3 hours old against a 26-hour limit; 26 of 26 papers were still readable. The fix is `npm run publish:edge`, run by the builder)* |
| `npm run verify:live-cert` in `signer/` | **59/0 / failed** (4 Oct — the second end-to-end journey minted two more artefacts; 47/0 on 1 Oct evening — the end-to-end journey minted two more artefacts in one `mintBatch`, and each artefact is checked on its own; 30 Sep: 35; 28 Sep: 17) on the artefact layer a stranger can open in an explorer: code length equals our build artifact, `mintBatch`/`lessonOf`/`attestationOf` present, `ownerOf == holderOf`, `tokenId == uint256(credentialHash)`, `external_url` byte-for-byte the URL the validator followed, non-owner `mint` rejected with `NotIssuer` |
| `npm run verify:deploy` in `signer/` | green (28 Sep) — every quoted address re-read from chain, with expectations parsed from our own source; it also asserts the *limit*: the deployed demo certificate does **not** contain the D42/D43 markers, so if that ever changes the documents have to change in the same commit |
| `npm run verify:attempts` in `signer/` | **39/0 checks / failed** (1 Oct; 38/0 on 30 Sep evening, before B121 required practice to be graded by chain; 31/0 before B104 added the human-review rule: a model-graded essay does not issue until a second key appointed by the publisher signs `approved` or `adjusted`, and an adjusted score is the reviewer's, not the model's) — the learner trail as arithmetic: enroll → server-graded quiz → publisher-signed essay judgement → chain-checked practice → `issue --from-attempts` → `/results/…` printing the same `attempt_hash`; refusals assert they are not usage strings |
| `npm run verify:quizkeys` in `signer/` | ~~**30/0 / failed** (1 Oct, B80)~~ *(Correction 3 Oct: the same harness now prints **KUNCI KUIS MERAH — 66 checks, 6 failed** (`npm run sync:numbers`, 3 Oct). Not a key leak: the criteria documents of the B126 test class and the five B127 courses are not yet published to the edge, so their `rubricHash` cannot be matched there; the fix is `npm run publish:edge`, run by the builder. The description below is the 1 Oct run with two courses)* — quiz answer keys no longer reach the browser. Measured before the change: the bundle deployed on Vercel carried **28 of 28** answer explanations and 28 `answer:<n>` literals. Now the keys live in `web/src/courses/*.keys.ts`, loaded only by the server through `web/src/manifest-keys.ts`; the harness builds the web bundle and finds **0 of 28** explanations and 0 key literals in the JS and the source maps (while finding 28 of 28 question prompts — the scanner can see), checks both courses' `rubricHash` is unchanged and equals the criteria documents on the edge, and that `/grade` answers with per-question right/wrong plus the reason **after** submission, never the index of the right option. Run against the old deployed bundle it goes red (2 failures), as it should. **Not "cheat-proof":** retakes are unlimited, so per-question feedback still lets a learner converge on the keys |
| `npm run verify:praktik` in `signer/` | *(3 Oct afternoon: **red, 22 checks / 1 failed** — the run stops at part E because `bsc-testnet.publicnode.com` no longer serves the fixed transaction receipt it re-reads, while BNB Chain's own testnet RPC still does; four runs earlier the same day were 32/0; finding B136 — **green again the same evening, 32/0, after B136**: the fixed receipt now comes from BNB Chain's own testnet RPC)* **32/0 / failed** without gas and **32/0** with one fresh 0.001 tBNB transfer (1 Oct, B121 core) — practice is graded by **chain**, not by the learner's number: `POST /praktik` re-reads chain 97 for what the learner says they did (a transfer's block, block time, gas used and balance change *including the fee*; a wallet balance; raw `eth_call` outputs; token allowances) and records the attempt only if all of it matches; a wrong answer gets the names of the failing checks, never the right values; one transaction or wallet proves one learner. `POST /attempts` no longer accepts quiz, essay or practice scores from the learner — until 1 Oct it did. One test paper has been issued with its practice graded by chain (`0x372c2518…`). **The learning page does not call the route yet** |
| `npm run verify:privy` in `signer/` | **41/0 / failed** (1 Oct, B82, decision D57; 38 before B122 added three CORS-preflight checks — until that evening every `OPTIONS` to a write route answered 405, so no write from the learning page ever reached the publisher from a real browser) — learner sign-in through **Privy**: email + one-time code gives the learner an embedded wallet, the same address on any device. Writes are still signed per request; the server only *binds* the address to the account. The harness proves the app secret against Privy's users API with a forged-secret control (401), refuses forged access tokens (Privy-shaped claims signed by a random key; `alg=none`), checks that only embedded wallets count, runs `POST /auth/privy` over HTTP — including a server without the secret, which answers 503 — binds against real Postgres (two concurrent binds to two accounts → exactly one wins; no email column; the publishable key reads `[]`), and builds the web bundle: the Privy SDK is in a lazily-loaded chunk, the entry does not carry it, and the secret appears nowhere in `dist/`. **Not proven by it:** a real sign-in — that needs an inbox or a Privy test account. B82 stays open until the builder signs in from two browsers and gets the same address |
| `npm run verify:records` in `signer/` | **17/0 / failed** (2 Oct; 16/0 at B124 before the B126 `chainChecked` field) — a learner's records (enrollments, progress, graded attempts) are personal data: `POST /me/records` answers only the owner of the address, with a signature over a message made for this route alone (`lencana-records`) and a one-time nonce; no signature, a signature made for another route, another key, and a replay are all refused; the projection carries no essay text and no answer keys, and another valid learner sees only their own rows |
| `npm run verify:paywall` in `signer/` | **24/0 / failed** without gas (2 Oct; 23/0 at B125, decision D60) and **31/0** with one real settlement on chain 97 (`--live`, 2 Oct, settlement tx `0x675472b0…` status 1) — paid courses: `POST /enroll` answers 402 with x402 terms, the learner only signs a token permit (EIP-2612 + Permit2 witness) and the enroll message, the publisher broadcasts the settlement and the `SettlementSplit` division, and only then is the enrollment written with its order and tx; test coins once per address per 24 h; enrollments that existed before prices still work. Demo token on testnet |
| `npm run check:samples` in `signer/` | **11/0 / failed** (2 Oct, after the `delisted` sample was mounted in the UI — B123; 9/0 on 30 Sep evening; 5/0 before B102) — every `SAMPLE_HASHES` value in the UI is measured: 200 from the edge AND its chain status matches its label; and each of the four states the verifier sells (valid / revoked / expired / delisted) must have a specimen that is 200 at the edge and reads that state on chain. Until 30 Sep `expired` and `delisted` had none; `npm run specimen` is how the two were made, with every address derived from a label in that file |
| `npm run check:spec` (+ `-- --self-test`) in `web/` | **14/0 / failed** against the document the edge serves; the self-test corrupts that same document and requires **11 rows to go red** — the counter is proven able to fail |
| `npm run probe:cold` in `signer/` | **23/0 / failed** (30 Sep) — what a fresh clone actually sees: an empty `.store/`. Found `/healthz` 500 on that state and the two causes were separated |
| `npm run check:identity` in `signer/` | **9/0 / failed** (30 Sep evening; 8/0 before the fourth agent of B102) — the issuer document is byte-identical across builder / local signer / durable edge (`25495c4988aaf722`), for **every** agent referenced by an issued paper, and no key record stores a dead host |
| `npm run verify:agent` in `signer/` | **24/0 / failed**, read-only (1 Oct, after decision D54) — the grading agent is ERC-8004 agent **#2534** in the IdentityRegistry BNB provides on chain 97 (`0x8004A818BFB912233c491871b3d84c89A494BD9e`), owned by a separate *Agent Owner* key. **The publisher stays the attester:** the agent's wallet is its own operational key, the verifier page proves the agent is *not* the signer of the credential, and `npm run admit` admits publisher keys and refuses agent keys. *(Earlier the same day this row read 23/0 with the agent wallet = attester — the model before D54.)* **Identity only, not reputation** |
| `npm run verify:agents` in `signer/` | **34/0 / failed** without gas and **40/0** with two real x402 payments (1 Oct) — publishers rent grading agents per activity (B119): the agent picks one of seven difficulty labels inside its signed judgement, the price is the base tariff its Agent Owner wrote in the registry plus 5% per level, and the charge is paid over x402 straight to the agent's wallet (+2160 of a 2400 charge, 10% to the platform through `SettlementSplit`). Reviewers may be agents too (B120): a different ERC-8004 agent (#2542) with a different owner, whose review is charged the same way; the same agent or owner cannot both grade and review one course, checked when appointing a reviewer and again when hiring a grader. No UI yet; demo token on testnet *(2 Oct, B129: members of the publisher now hire and appoint agents from the publisher dashboard with their own signature — see `verify:publisher` below; paying agent charges still has no UI)* |
| `npm run verify:roles` in `signer/` | **39/0 / failed** (2 Oct, B128, decision D63) — ~~one signed-in account can hold more than one seat, and~~ *(3 Oct, B131/D66: a real account now holds one role, chosen once — see `verify:account`; only the builder's developer accounts hold several seats)* each seat is read from a fact anyone can re-check rather than chosen on a page: **publisher** = the issuer key itself, or a membership that key signed (`lencana-member grant member=… hire=0\|1 appoint=0\|1 nonce=…`, stored with its signature); **Agent Owner** = `ownerOf(agentId)` in the ERC-8004 registry on chain 97 (#2534 and #2542 read back over HTTP). Refused: a membership signed by any other key, a request body claiming more than the signed message, a signature moved to another member, `hire=10` passing as `hire=1`, replays; a re-grant replaces the rights and a revoke removes the seat. **A membership never carries issuing or revoking credentials** — that stays with the issuer key. No publisher or Agent Owner dashboard yet, and no self-service publisher sign-up *(B129, same day: the publisher dashboard and a signed membership request now exist — next row; approval still only by the issuer key)* |
| `npm run verify:publisher` in `signer/` | ~~53/0~~ **57/0 / failed** *(3 Oct, after B131: +2 checks that make the team's agent-owner keys developer accounts for the length of the run, +1 that the first application of an account without a role records the publisher role, +1 cleanup)* (2 Oct, B129, decision D64) — the publisher seat end to end. An account applies with its own signature; the request alone grants nothing, one pending request per account, and only the issuer key decides: the membership grant closes the request as approved, a signed reject closes it as rejected. The publisher dashboard (`POST /publisher/overview`) answers seat holders only, and its numbers are traceable: gross = the paid orders it lists with their transactions, the platform fee = `platformBps` read from `SettlementSplit` on chain at that moment, platform + net = gross to the unit, harness rows excluded unless asked, no essay text in the reply, and only model/agent proposals count as awaiting approval (the gate view's own rule). Members act with their own signature within their grant — `hire=1` hires a grading agent, `appoint=1` appoints a reviewer agent — never an agent they own, and the B120 rule (a course's grader cannot be its reviewer) still holds. Issuing/revoking credentials and paying agent charges stay with the issuer key |
| `npm run verify:owner` in `signer/` | **32/0 / failed** (2 Oct, B130, decision D65) — the Agent Owner seat: `POST /owner/overview` answers only an address that `ownerOf` says owns an agent the platform knows, reading identity, agent wallet and tariff from the ERC-8004 registry at that moment, and hires, activity and charges from the database (the harness recounts them). `POST /owner/gas` drips test gas only to owners of agents the platform minted, and only when the balance is low. ERC-8004 clears the agent wallet whenever an identity changes hands, and the dashboard reports that as "not hireable" with the reason. One full run on chain 97 (record T55): the platform minted agent **#2546** for a test account (register, registration file, tariff, `transferFrom`, gas); that account set its own agent wallet (`setAgentWallet` `0x3331a22f…`, 67,528 gas) and tariff (`0x727722f2…`) from the page, and a publisher member then hired it. Agent **#2547** was minted the same way for the builder's second account — its wallet is set by its owner, not by us *(done the same evening from the builder's Privy wallet: `setAgentWallet` `0xfd0486d2…` — the first attempt was refused because the embedded wallet signs EIP-1559 and ignored our `gasPrice`, leaving fee 0; the page now sends EIP-1559 fees explicitly)*. Demo token on testnet |
| `npm run verify:account` in `signer/` | **50/0 / failed** (3 Oct, B131, decision D66) — one real account holds one role. The role is chosen once at onboarding with the account's own signature (`lencana-role role=… nonce=…`, `POST /me/role`) and cannot be changed: a second choice is refused by the table's primary key. Choosing Publisher is the membership application (the seat still needs the issuer key's approval), and choosing Agent Owner gives no agent. Accounts that never chose get their role from records and facts: an account that already takes courses is a learner, the issuer key and its members are publishers, an `ownerOf` owner is an Agent Owner. The server refuses another role's actions: publishers and Agent Owners cannot enrol, pay or take test coins; learners cannot apply, open the publisher or Agent Owner dashboard, or receive a membership; nobody grants a membership or mints an agent for an account with another role. Developer accounts — the builder's two test accounts, marked only by the platform CLI `npm run account:dev` — hold every seat their facts give them and are the only ones that see the seat switcher |
| `npm run verify:authoring` in `signer/` | **48/0 / failed** (3 Oct, B133, decision D67) — a publisher writes a new course from the page, and only the issuer key publishes it. A member whose grant says `author=1` saves a draft by signing the keccak hash of its content (`lencana-draft save … hash=…`), and the server stores it only if it computes the same hash with the same schema module the page uses; unknown fields, a hash that does not match, another key, and replays are refused. The draft is audited with the same rules as the file courses (plus: every quiz question has a key, the course id is not taken), a draft with problems cannot be submitted, and a submitted draft cannot be edited. The issuer key publishes with `npm run course:publish`, signing `lencana-course publish draft=… course=… rubric=<rubricHash>` where the rubric hash is recomputed from the stored content and keys. The published course joins the server's catalogue in the same arrays as the file courses: the public catalogue (`GET /catalog/published`) carries no answer keys, its criteria document names the signed rubric hash, and a new learner enrolls and has the quiz graded by the server with the stored keys (all correct = 100). Quiz answer keys are shown only to the draft's own author. Practice lessons (chain proofs) are not authored from the page, and the criteria document reaches the edge only when the builder runs `npm run publish:edge` |
| `npm run verify:studio` in `signer/` | **28/0 / failed** (3 Oct evening, after B136; ~~27/1~~ that afternoon — the one failing check re-read the 2 Oct `register()` receipt of agent #2546, which the public RPC in `RPC_URL` (`bsc-testnet.publicnode.com`) stopped serving consistently; since B136 old receipts also come from BNB Chain's own testnet RPC, see `verify:history`). B132, decision D68 — the Agent Owner dashboard shows each agent as a grading robot its owner assembles (head, eyes, body, tool, colour, name), and the agent's data is read off the robot: eyes lit = agent wallet verified, antenna = hireable, chest plate = base tariff, paper stack = gradings, jar = fees paid, desk plates = where it works. The look is stored on chain in the agent's ERC-8004 registration file (`lencana:avatar` + an SVG `image`), written by the owner's own wallet with `setAgentURI` over a template the platform serves (it points back to the agent and keeps the correct role sentence). Without gas, the harness checks that all 864 part combinations render, that the static image stays under 4 KB (largest 1,698 characters) and is deterministic, and that malformed looks are rejected. It also checks how the server treats an owner who registers an agent themselves: the platform only learns of it after reading the receipt on chain (sent to the registry, a `Registered` event for that id with this account as owner, `ownerOf` still this account), so claiming another address's registration, a forged key, a missing transaction and a learner account are all refused, and test gas goes only to Agent Owner accounts that qualify. One real run on chain 97 (record T61): a test account chose Agent Owner, assembled a robot and registered agent **#2548** itself (`register` `0xb9cc49dc…` plus look and tariff from its wallet, four transactions, about 0.0003 tBNB), then changed the look again; the registration file read back from chain carries the new look and still points back. The robots do not grade anything yet — agent grading is signed by the agent wallet and has no screen. Demo token on testnet |
| `npm run verify:brain` in `signer/` | **60/0 / failed** (3 Oct, B135, decision D69) — an Agent Owner gives their agent a brain: one of seven LLM providers (OpenAI, Anthropic, Qwen, xKiro, Groq, GLM through Zhipu BigModel, DeepSeek), a model read from the provider's own model list, and the owner's own API key, which stays in the owner's browser and is never sent to Lencana's server. Before the brain is recorded, the model must pass a calibration on the same rubric, essays and prompt as the publisher's judge (`npm run judge`): the fluent-but-empty essay must score below the pass mark (70) and the substantive one at or above it. The calibration runs in the owner's browser, so the two scores are the owner's signed report — the server checks the rule and that the signer owns the agent (`ownerOf`), but it cannot replay the model call. The agent wallet then reads the essays waiting in courses that hire the agent (never the operator's own essays, never a learner's address), the model proposes per-criterion scores, and the owner picks the difficulty label and signs; a judgement that names another model than the recorded brain is refused before anything changes. Without keys or gas, the harness checks that the judge prompt is one source for the server and the browser and byte-identical to the 24 Sep text (sha256), that the calibration copies equal the fixture files, the request shape for all seven providers against a mocked fetch (URL, auth headers, body, JSON mode, retries without a refused parameter — which then report temperature as not used), and the brain, queue and judgement routes over HTTP. `npm run verify:brain:live` adds one real calibration through the browser adapter with the team's Groq key: `openai/gpt-oss-120b` gave the substantive essay **99** and the empty one **3** (3 Oct). In a real browser (record T63), 13 of the 14 provider endpoints (model list + chat, seven providers) were readable from the page — a fake key got a 401, xKiro's public model list a 200 — and the fourteenth, Z.ai's international chat endpoint, sends no CORS headers at all, so GLM goes through Zhipu BigModel. **Not a product claim:** agents do not grade on their own yet — every judgement still needs the owner's signature in the browser (full automation is the next backlog), and agents without a recorded brain are still accepted on the B119 route |
| `npm run verify:market` in `signer/` | **23/0 / failed** (3 Oct, B138, decision D70) — the publisher dashboard's Agents tab is an agent market instead of a form that asks for an agent number. Every agent the platform knows (six on chain 97 today) stands as its own robot (its look read from the ERC-8004 registration file) with its tariff ladder, its recorded brain and calibration (B135), its record (gradings, reviews, and the human reviewers' verdicts on its proposals) and where it already works; a member hires or appoints it from its card, and the courses where a rule would refuse it are shown with the reason before anything is signed. The server still decides. The data comes from one read route, `GET /agents/market`: registry facts read at that moment plus aggregate counts, cached for 60 seconds and invalidated by any hire, appointment, brain or claim — no essay text, no learner addresses, no hirer addresses, no signatures. Without gas, the harness checks the page's conflict rules against every B120/B129 rule, the entry shape, that no learner address appears, that "hireable" matches `GET /agents/<id>/rates`, the cache and its invalidation, and that the page and the server agree on a real refusal (agent #2542, the reviewer of a course, cannot be hired as its grader). In a real browser (record T65) a test member saw the six agents, the refusals with their reasons, and hired agent #2549 for the test course from its card; the row was removed afterwards. **Not a product claim:** the market lists only agents the platform already knows, and it lives inside the publisher dashboard, not on a public page |
| `npm run verify:history` in `signer/` | **10/0 / failed** (3 Oct, B136) — chain history (receipts, transactions, past blocks) is read from `RPC_URL` first and then from BNB Chain's own testnet RPCs, whose chain id is checked before their answer is used; "not found on any endpoint" is now told apart from "the endpoints could not be read" (before, any RPC error read as "transaction not found"). Why: on 3 Oct the public RPC in `RPC_URL` (`bsc-testnet.publicnode.com`) served the old transactions but not their receipts, and not consistently — `verify:studio` was red at 13:36 and 15:22 WIB and green at 14:59 for the same receipt — while four BNB Chain RPCs always found them. The self-registered agent claim and the "transaction" practice proof read such receipts. The harness checks the reader with mocked clients and reads the two receipts that had gone missing (agent #2546's `register()` of 2 Oct and the practice harness's fixed transfer): both now come from the fallback. Current state (`ownerOf`, balances) is still read from `RPC_URL` only |
| `npm run verify:manage` in `signer/` | **55/0 / failed** (4 Oct, B140, decision D72) — a publisher manages its published database courses from the dashboard instead of the CLI. The issuer key can grant a member `publish=1`; that member publishes or returns a submitted draft, and archives or restores a course, by signing a request — the server re-audits the stored content, signs the decision with the issuer key (the same message shape as `npm run course:publish`), and records both messages and signatures in `course_actions`. An author cannot decide their own draft from the dashboard. Editing a published course drafts a new version: with the same grading rules it keeps the course id and replaces the old version in place; with changed rules it must take a new id, and the old version stays loaded but archived, so its learners keep their class. An archived course leaves the catalogue and `POST /enroll` refuses new learners (409). Only a draft that was never submitted can be deleted, by its author, and the deletion stays in the log. Without gas, the harness drives all of this over HTTP with throwaway addresses and removes its rows afterwards. In a real browser (record T70) a test author drafted a new version and deleted an unsubmitted draft, and a test member published both versions, archived the course and restored it. **Not a product claim:** course files under `web/src/courses/` are still changed through code review, and the builder has not yet run it from their own Privy account |
| `npm run check:contexts` in `signer/` | **23/0 / failed** (4 Oct, B148) — signing and verifying a credential no longer depend on third-party websites. Until 4 Oct every signing or verifying process fetched the JSON-LD contexts over HTTP with no cache: one `check.js` run fetched `https://www.w3.org/ns/credentials/v2` 41 times, and the Open Badges context at `purl.imsglobal.org` took 2–7.7 s per request and sometimes hit the 10 s client timeout, failing `check.js` 2 runs out of 4 that night. The four contexts our documents use (VC 2.0, Open Badges 3.0.3, Data Integrity v2, Multikey v1) now ship in `signer/contexts/`, fetched with the same `jsonld` loader as before (`npm run contexts:fetch`, compare-only unless `-- --apply`), with a sha256 per copy that the signer checks at start. Other context hosts are cached on disk after their first fetch; issuer key documents are never cached. With every fetch to w3.org / w3id.org / purl.imsglobal.org blocked, the harness signs and verifies a sample credential, re-verifies the 30 credentials in the local store, and checks the disk cache against a local server; `check.js` passes 114/0 with zero context fetches. `-- --online` (not in the battery) compares the copies with the live documents: all four the same, and the sample credential canonicalizes to the same 34 quads |
| `npm run verify:review` in `signer/` | **31/0 / failed** (5 Oct, B144, decision D73) — a reviewer agent's owner reviews essays from the Agent Owner dashboard instead of a script. A new signed route, `POST /owner/agents/review-queue`, lists the essays that already carry a proposed score and are not yet reviewed, from the courses where a publisher appointed that agent as reviewer: the essay text, the publisher's rubric and pass mark, the proposal per criterion with its model, proposing agent and label — never the learner's address. Only the reviewer agent's own wallet (the address that signs its decisions) can read it; harness learners (`origin=test`) stay hidden unless asked for. On the desk the owner can ask the agent's own calibrated brain (B135) for a second opinion on the same rubric, then approves, adjusts per criterion or rejects, picks the difficulty label that sets the fee, and signs; `POST /essay/review` records it and bills the review. The same change closed an integrity hole: `/essay/review` took the rubric and pass mark from the course and lesson named in the request without matching them to the essay, so a reviewer appointed to course A could adjust an essay of A against another course's rubric — with the new check switched off the harness goes red (31/3) because that forged review is accepted. In a real browser (record T75) a test owner asked Groq for a second opinion (99), adjusted a proposed 60 to 98 and approved another essay from a 375 px screen. **Not a product claim:** the desk works only when the reviewer agent's wallet is its owner's account (the team reviewer #2542 still signs from a script), and the builder has not yet run it from their own Privy account |
| `npm run verify:deposit` in `signer/` | **27/0 / failed** without gas, and **38/0** for one real deposit run end to end on chain 97 (30 Sep) — `CourseDeposit` at `0xbeB57bC1a3Ad050b66Ad6ce1E2e42a6cd040E6c3`: a learner's deadline premium is held until the issuer signs the outcome. `policyHash` is computed from the publisher manifest, `issuedAt` is read from BAS rather than from the request, a validly signed `refundBps` that contradicts the policy is still refused, and the premium came back whole. **Not a product claim:** no page uses it, it is not wired to course payment, and the late/forfeit path is proven only in `forge test` (16 passed) |
| `npm run check:labels` in `signer/` | **8/0 / failed** (30 Sep) — every closed backlog line carries a marker in the code it points at, every marker agrees with its line, no pre-B112 tag shape survives anywhere in the code, every marker sits on a comment line, no marker is missing its status, and no ID is marked twice in the same file |
| files in the repo | **349 tracked** (`git ls-files`, 1 Oct evening, with the end-to-end record T40 staged; 348 with B80; 341 with B121; 334 with B119/B120 earlier that day; 324 on 30 Sep evening, 305 earlier that day). No `node_modules/`, `out/`, `cache/`, `broadcast/`, `dist/`, `.env`, `signer/.keys/`, `signer/.store/` — which means the numbers above are re-runnable **with our `.env`, our keys and our credential store**; a fresh clone needs its own issuer key, a funded wallet and `npm run issue` before any of it prints |

The fork tests call **BAS (BNB Attestation Service, a fork of EAS 1.3.0) exactly as deployed on
chain** — not a copy we deployed ourselves. Those are also the addresses a judge can open.

**What we still forbid ourselves from saying.** The 1EdTech OB 3.0 validator was first run on 27 Sep
and the document came back with **2 errors** (`credentialStatus` must be one object; the bitstring was
8× shorter than BSL's minimum). Both were real and ours. Since then, two credentials issued under the
durable host have come back **`outcome: VALID` — 14 checks, 0 errors, 0 warnings** (28 Sep), with the
document, the `verificationMethod` and both status lists fetched over the public internet. So the
sentence we allow is *"a credential from this backend passes the 1EdTech OB 3.0 validator"*;
**not** "certified", **not** "conformant", **not** "1EdTech compatible" — that tool is a member
validator, not a conformance certification, and its response reports counts without itemising which
checks passed. Also unproven, and said out loud: ~~only **2 of the 8 papers** we hold are currently
checkable end-to-end by someone else (B54)~~ *(Correction 3 Oct: no longer unproven — 26 of 26 papers checkable
end-to-end, `npm run verify:edge`, 1 Oct evening; B54 is the history of why it is measured)*; the paid path has no third-party facilitator and no
outside payer; the graded essays are fixtures judged by a model at temperature 0, not real learners;
and the demo corpus's artefacts sit on a contract deployed before our own granularity/batching rules,
so those rules are proven in source, in fork tests and on one live instance — not on that one (D46).
Details: [`vault/10-Contributors/Claims-Cheat-Sheet.md`](vault/10-Contributors/Claims-Cheat-Sheet.md)
and [`vault/08-Results/01%20-%20Evidence%20and%20Limits.md`](vault/08-Results/01%20-%20Evidence%20and%20Limits.md).

## How it works

```
OpenBadgeCredential JSON (off-chain, signed by the issuer's key)
        │ keccak256
        ▼
   credentialHash ──► attest() ──►  BAS on BNB Chain  (owned by someone else)
                                        ▲
             EAS calls onAttest()        │  issuer whitelist
             BEFORE the attestation      │  + revocation-aware prerequisite chain
             is accepted                 │
                                  CredentialResolver.sol  (ours)
                                        │
                        statusOf() / holderOf()  ◄── ONE eth_call, no wallet
                                        │
                          SoulboundCert.sol ── mint() REFUSES a dead credential
```

**The one thing not to get backwards:** the credential is the **JSON document**, not the NFT. The
chain does only three things JSON cannot — an issuer registry that cannot be censored, a status bit
the issuer cannot hide, and a timestamp. The soulbound NFT is the **artifact** the learner sees and
owns, and the contract refuses to mint an artifact for a credential that is not live.

### 🔴 A real gap in EAS that we close

This was a finding, not a plan — and it is now the main technical differentiator. EAS checks that a
prerequisite **exists**, nothing more:

```solidity
// EAS.sol, _attest()
if (request.refUID != EMPTY_UID) {
    if (!isAttestationValid(request.refUID)) { revert NotFound(); }
}
// and
function isAttestationValid(bytes32 uid) public view returns (bool) { return _db[uid].uid != EMPTY_UID; }
```

So plain EAS **allows** an advanced certificate to be issued on top of a prerequisite that was
**revoked**, that **expired**, that **belongs to someone else**, or that is simply some unrelated
attestation on the chain. All four are rejected by `CredentialResolver`, and each rejection is
**proved by a revert in fork tests on two chains**.

We accept the consequence: *"non-repudiable revocation"* is **default EAS/BAS behaviour, not our
discovery**. Ours are the issuer whitelist, the revocation-aware prerequisite chain, and the
one-call wallet-free verification.

## Running it

Requirements: **Foundry 1.5.1** (`forge`/`cast`/`anvil`), **Node 22**, Python 3.12 for the
verification scripts.

```bash
npm install                                  # OpenZeppelin 5.1.0
forge install foundry-rs/forge-std --no-git  # --no-git is required while the folder is not a git repo

npm test                                     # 49 tests, offline, ~35 ms
npm run test:fork:testnet                    # 104 tests against public chain 97
npm run test:fork:mainnet                    # 104 tests against public chain 56
```

> ⚠️ **`--evm-version cancun` is mandatory for fork tests**, not decoration. Without it, calls that
> move variable-sized data fail with `EvmError: NotActivated`, which **looks exactly like "that
> function does not exist on the deployed contract"**. Our own build stays on `shanghai`.

Prove it without funds and without a real deploy — fork chain 97 into a local anvil:

```bash
anvil --fork-url https://bsc-testnet.publicnode.com --port 8545 --chain-id 97 --silent

set DEPLOYER_PRIVATE_KEY=<anvil test key #0>
set ISSUER_ADDRESS=<anvil test key #1 address>
forge script script/DeployCredentials.s.sol:DeployCredentials --rpc-url http://127.0.0.1:8545 --broadcast

set ISSUER_PRIVATE_KEY=<anvil test key #1>
set ISSUER_B_PRIVATE_KEY=<anvil test key #2>
set RESOLVER_ADDRESS=<from above>
set CERT_ADDRESS=<from above>
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast
```

**`SeedDemo` is run TWICE, and that is a property of EAS, not of the script.** An attestation UID
is `keccak256(schema, recipient, attester, block.timestamp, expirationTime, revocable, refUID,
data, bump)` — it contains the timestamp of the **mined** transaction, which the script cannot know
while it is still simulating. Two steps need a real UID: issuing the advanced course *on top of*
the basic one (`refUID`), and revoking the basic one. So the first run seeds everything that needs
no UID and stops; the second run finds those attestations already on chain, reads their real UIDs,
and finishes the chain, the revocation and the report. The script is idempotent from there on.

It does **not** broadcast stale calldata when run once, and `--slow` is neither required nor
sufficient — both were measured on a clean fork (19 Sep): one run with `--slow` still leaves
pass 1's job unfinished. What the page consumes is the credential **hash**, which is deterministic;
that is why the printed UIDs carry a warning and the hashes do not.

### Verification page

```bash
cd web && npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # dist/ = static page, hostable anywhere
npm run probe     # test the data layer from Node, no browser
```

This page **has no backend, and deliberately does not need one** — that is the product. The RPC URL
and contract addresses live in `localStorage` via the *verification configuration* panel, because
our contracts were not deployed when the page was written. The page **deliberately uses no sample
data**: a fake number that looks convincing is worse than an empty page that is honest.

`npm run probe` runs **the same file** the page uses (`web/src/verify.ts`) against the same RPC. So
"the page reads the right data" is **testable**, rather than inferred from how it renders — and that
is exactly how the probe caught bugs invisible to `tsc` and `vite build`
([`vault/06-Spec-Research/R6 - Toolchain traps that cost time.md`](vault/06-Spec-Research/R6%20-%20Toolchain%20traps%20that%20cost%20time.md)).

## What is in this repo

```
contracts/
  CredentialResolver.sol     issuer whitelist + prerequisite chain + statusOf()/holderOf()
  SoulboundCert.sol          ERC-721 + ERC-5192; mint refuses a dead credential; no transfer/burn
  interfaces/ICredentialRegistry.sol
lib/bas/src/                 verbatim copy of the BAS interface — auditable, not invented
test/                        49 offline · 104 fork per chain (27 artefact + 22 settlement + 8 split + 9 end-to-end + 38 resolver)
script/                      DeployCredentials.s.sol · SeedDemo.s.sol
web/                         verification page (Vite + vanilla TS + viem, static)
signer/                      OpenBadgeCredential 3.0 signing + BitstringStatusList derived from chain
                             (plain ESM; see signer/README.md for what it does not claim yet)
vault/                       project context: why it is shaped like this
```

Why `lib/bas/src/` is committed rather than installed: we **cannot compile** `EAS.sol` /
`SchemaRegistry.sol` from BAS in this rig (they are pinned to `pragma solidity 0.8.19`, which
conflicts with OpenZeppelin's `^0.8.20`). We did not raise someone else's pin — we removed those
files from the build path, use the interface, and **test behaviour through a fork**. The side
effect is better evidence: what gets tested is the deployment a judge can open.

## Limits we state ourselves

This is not boilerplate and it is not hidden behind a tab. This system does **not** prove:

- that the **content** of a claim is true — *"verification of a credential does not imply
  evaluation of the truth of claims encoded in the credential"* (VC 2.0);
- that the **human** behind an address is the person who studied — what is bound is an address;
- that a certificate cannot be screenshotted;
- any **legal or institutional** recognition. We do not write "legally valid";
- that an institution **onboarded itself**, or that the institution holds the agent key today — on
  this deployment the platform performed the on-chain registration and keeps `.keys/agent-edge.json`.
  "The issuer is an AI agent owned by the institution" is therefore **not** a sentence we print; the
  sentence we can back with a command is "the credential names an issuer document, that document's key
  signed it, and the registry that allows or delists it is on chain" (`npm run check:identity`).

We also do not claim: *"trustless"*, *"zkML-verified"*, *"TEE-verified"*, or that BAS is an
"official BNB Chain programme" (no such claim exists in its repository). If this page turns out to
work with third-party validators, we will say so **after** proving it — not before.

Stating the limits is what makes the remaining claims worth anything.

## In `vault/`

| file | about |
|---|---|
| [README](vault/README.md) | index + how to read these notes |
| [01 - Briefing](vault/00-Overview/01%20-%20Briefing.md) | what the product is, who uses it, the flow from zero to verified, the demo scenes |
| [01 - Architecture](vault/01-Architecture/01%20-%20Architecture.md) | four layers, why BAS instead of hand-rolled, the EAS gap, agent roles, who pays |
| [03 - Decisions](vault/00-Overview/03%20-%20Decisions.md) · [04 - Corrections](vault/00-Overview/04%20-%20Corrections.md) | every decision with its date and what it cost, and the claims we retracted ourselves |
| [01 - Evidence and Limits](vault/08-Results/01%20-%20Evidence%20and%20Limits.md) | what is proven, what is not, and the claims we forbid ourselves |
| [01 - Spec Research](vault/06-Spec-Research/01%20-%20Spec%20Research.md) · [R6 - Toolchain traps](vault/06-Spec-Research/R6%20-%20Toolchain%20traps%20that%20cost%20time.md) | Open Badges 3.0 facts from the raw specification + the traps that cost hours |
| [01 - Backlog](vault/07-Backlog/01%20-%20Backlog.md) · [03 - Findings and Tasks](vault/07-Backlog/03%20-%20Findings%20and%20Tasks%202026-09-26.md) | where it stands, blockers, order of work to the deadline |
| [00 - Hub Testing](vault/09-Testing/00%20-%20Hub%20Testing.md) | one record per command: what was run, when, with the output pasted |

> These notes are **only** about Lencana. No other product, track or plan appears in them.

## Language policy

~~Documentation, captions and descriptions in this repository are **English**.~~ *(Correction 3 Oct:
since the builder's decision of 28 Sep — rule 9 in [`vault/AGENTS.md`](vault/AGENTS.md), which also closed
B79 — Indonesian is allowed in the documentation; what still counts as a defect is an unsourced number or a
claim without a command, not the language. Web UI copy stays Indonesian-first.)* The verification
frontend is the agreed exception and it is **built**: an Indonesian / English switch lives in
`web/src/i18n.ts` with the strings as one dictionary, wired at `web/src/main.ts:1512-1522` and
`:1848-1849`, remembered per visitor (`getSavedLanguage` / `saveLanguage`) and settable from the URL
(`?lang=`). What is still uneven is coverage: ~~some simulation copy in `web/src/main.ts` is written
inline in one language only, and that is tracked as an open item rather than claimed as finished.~~
*(Correction 3 Oct: the public simulations — Tamper Playground, the timer-driven x402 console, the bitstring
matrix — were removed in B123 (decision D59), so that copy no longer exists.)*

## License

MIT for the contracts and code (see the `SPDX-License-Identifier` header in each file) — **except**
`lib/bas/src/`, a verbatim copy of the **BAS/EAS** interface kept for auditability. That part is not
our work.
