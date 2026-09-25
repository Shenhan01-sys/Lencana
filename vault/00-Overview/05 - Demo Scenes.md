---
tags: [overview, demo]
status: active
updated: 2026-09-25
---

# 05 - Demo Scenes

Five minutes, four scenes. Each scene answers one of the four mechanical questions in
[[00-Overview/01 - Briefing]], and each is listed here with **the command or page that makes it
happen** — a scene with no runnable trigger is a slide, not a demo.

| # | scene | what the audience sees | how it is actually produced | honest limits to say out loud |
|---|---|---|---|---|
| 1 | **Verification without a wallet** | paste a code → `REVOKED`; paste another → `ISSUER_DELISTED`; then the same check as a `cast call` / raw JSON-RPC `curl` the viewer can run | `web/` verifier page against public chain 97 → `npm run probe` (59 checks, 25 Sep) proves the page uses the same `verify.ts` the harness does | no third-party validator has seen our document yet → [[07-Backlog/Acceptance-Criteria/AC-P7 - Public URL and validator run]] |
| 2 | **Issued by the agent** | essay → agent scores it against **its own** rubric → signs → attestation lands with the agent as `attester` → artifact appears. Then revoke the base credential and try the advanced one → **revert, live** | `cd signer && npm run delegate -- --essay --judge` then `npm run anchor` → [[09-Testing/T10 - npm run delegate]], [[09-Testing/T11 - npm run judge]] | the graded essays in the demo are **fixtures**, not a real learner; the model's number has a measured spread of 9 |
| 3 | **Forgery fails** | transfer the artifact → revert · flip one byte of the document → signature invalid · mint from an unapproved address → revert | `forge test --evm-version cancun --fork-url <97>` (97 tests, 25 Sep) + `cd signer && npm run check` (53/53, which flips a byte and re-verifies) | this scene is **real**, not simulated — which is why the playground in `web/` must not present simulated reverts next to it → [[10-Contributors/Open-Items/OI-4 - Simulated EVM reverts]] |
| 4 | **The economy** | an unpaid `POST /verify` answers `402` + `accepts[]`; the client signs two EIP-712 objects and sends **zero transactions**; settlement lands, the split pays issuer 900 / platform 100; the batch returns two reports with **different** verdicts for one payment | `cd signer && npm run x402` → [[09-Testing/T6 - npm run x402]] | we are the facilitator; the token is a demo ERC-20 with an open `mint`; the server is local, so no outsider has ever paid us |

## What the designed script says vs what exists

The briefing's original scene 1 said "another → `EXPIRED`". **`EXPIRED` is not seeded**: `SeedDemo`
produces four states (valid, revoked, issuer-delisted, valid-while-its-prerequisite-is-revoked), and
the expiry path is covered in tests, not by a demo credential. Either seed one for the video or show
`ISSUER_DELISTED` in that slot — do not narrate a verdict the audience cannot paste.

Scene 2's "appears on the learner's device" is honest only for the demo wallet whose key is in the
harness; there is no account system.

## Prep checklist before recording

- [ ] chain state is what the notes claim: `npm run anchor -- --dry-run` should print the watched set
      (11 on 25 Sep) and the two list hashes → [[09-Testing/T9 - npm run anchor]]
- [ ] the RPC you record against is the one in the notes (public 97, not a local anvil)
- [ ] the limits panel is on screen in scene 1, not in a footnote
- [ ] no scene depends on `_research/` or any file outside this repository

**Related:** [[07-Backlog/02 - Plan to the Deadline]] · [[08-Results/01 - Evidence and Limits]]
