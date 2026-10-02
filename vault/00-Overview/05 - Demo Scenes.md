---
tags: [overview, demo]
status: active
updated: 2026-10-03
---

# 05 - Demo Scenes

Five minutes, four scenes. Each scene answers one of the four mechanical questions in
[[00-Overview/01 - Briefing]], and each is listed here with **the command or page that makes it
happen** — a scene with no runnable trigger is a slide, not a demo.

| # | scene | what the audience sees | how it is actually produced | honest limits to say out loud |
|---|---|---|---|---|
| 1 | **Verification without a wallet** | paste a code → `REVOKED`; paste another → `ISSUER_DELISTED`; then the same check as a `cast call` / raw JSON-RPC `curl` the viewer can run | `web/` verifier page against public chain 97 → `npm run probe` (59 checks, 25 Sep) proves the page uses the same `verify.ts` the harness does; tutup adegan ini dengan `npm run validator` di terminal yang sama — 10 pemeriksaan, lalu `outcome: VALID` dari `vc.1ed.tech` | ~~tidak ada validator pihak ketiga yang pernah melihat dokumen kita~~ → **sudah**, dan sejak 28 Sep **di host yang tidak mati**: `npm run validator` hijau, `outcome VALID`, 0 error/0 warning terhadap `https://lencana-edge.hansgunawan775.workers.dev` (dokumen + `verificationMethod` + kedua daftar dibaca dari sana) → [[09-Testing/T15 - 1EdTech validator]], [[09-Testing/T16 - npm run publish edge]]. Batas yang tersisa di adegan ini dan harus disebut, bukan disembunyikan: tepi **tidak menandatangani** apa pun — tanda tangan dibuat saat menerbitkan, dan setiap permintaan hanya membuktikan bit yang disajikan masih sama dengan chain |
| 2 | **Issued by the agent** | essay → agent scores it against **its own** rubric → signs → attestation lands with the agent as `attester` → artifact appears. Then revoke the base credential and try the advanced one → **revert, live** | `cd signer && npm run delegate -- --essay --judge` then `npm run anchor` → [[09-Testing/T10 - npm run delegate]], [[09-Testing/T11 - npm run judge]] | the graded essays in the demo are **fixtures**, not a real learner; the model's number has a measured spread of 9 |
| 3 | **Forgery fails** | transfer the artifact → revert · flip one byte of the document → signature invalid · mint from an unapproved address → revert | `forge test --evm-version cancun --fork-url <97>` (104 tests, 28 Sep) + `cd signer && npm run check` (74/74 on 28 Sep, which flips a byte and re-verifies) | this scene is **real**, not simulated — which is why the playground in `web/` must not present simulated reverts next to it → [[10-Contributors/Open-Items-for-Dave|OI-4]] |
| 4 | **The economy** | an unpaid `POST /verify` answers `402` + `accepts[]`; the client signs two EIP-712 objects and sends **zero transactions**; settlement lands, the split pays issuer 900 / platform 100; the batch returns two reports with **different** verdicts for one payment | `cd signer && npm run x402` → [[09-Testing/T6 - npm run x402]] | we are the facilitator; the token is a demo ERC-20 with an open `mint`; the server is local, so no outsider has ever paid us |

## What the designed script says vs what exists

The briefing's original scene 1 said "another → `EXPIRED`". ~~**`EXPIRED` is not seeded**: `SeedDemo`
produces four states (valid, revoked, issuer-delisted, valid-while-its-prerequisite-is-revoked), and
the expiry path is covered in tests, not by a demo credential. Either seed one for the video or show
`ISSUER_DELISTED` in that slot~~ *(Koreksi 3 Okt: since B102 (closed 30 Sep) an `EXPIRED` specimen exists on chain 97 —
`0x202f8edf…`, issued with a deliberately short validity, alongside a `delisted` specimen; `npm run check:samples`
demands a specimen for all four states → [[09-Testing/T26 - signer sample-check.js]]. The page has no sample button
for it (`SAMPLE_HASHES` at `web/src/main.ts:68` holds valid, revoked, delisted, format), so paste the hash by hand in
that slot.)* — do not narrate a verdict the audience cannot paste.

Scene 2's "appears on the learner's device" is honest only for the demo wallet whose key is in the
harness; ~~there is no account system~~ *(Koreksi 3 Okt: an account system exists since D57 (1 Okt) — email login
through Privy, the learner's address is the embedded wallet, bound to the account in `learner_accounts` — and since
B123/D59 (2 Okt) it is the only way into the page. Scene 2 itself still runs on harness fixtures, so its artefact goes
to the harness wallet, not to a logged-in account.)*

*(Koreksi 3 Okt, D54 — for scene 2: "the agent … signs" means the **publisher's** signing key, named `agent-*` in
`signer/.keys/`, not an ERC-8004 AI agent. Since D54 (1 Okt) AI agents only grade and propose scores; the publisher key
signs and revokes credentials — see [[10-Contributors/Claims-Cheat-Sheet]].)*

## Prep checklist before recording

- [ ] chain state is what the notes claim: `npm run anchor -- --dry-run` prints the watched set
      (16 on 28 Sep) and the two list hashes → [[09-Testing/T9 - npm run anchor]]
- [ ] **no credential shown to the audience was minted on a quick tunnel.** Proved 28 Sep: yesterday's
      `outcome: VALID` artefact is now `ENOTFOUND` for everyone, because URLs are written at issuance.
      Mint on the durable host first, then `cd signer && npm run validator -- --record` must be green
      **against that host** on the day you record — a pass on a dying tunnel is not a pass a judge can repeat.
- [ ] `cd signer && npm run e2e` is green on the day of recording → [[09-Testing/T19 - signer e2e.js]].
      This is the one command that checks the five things the four scenes assert are the same object:
      the chain's bit, the served list, the URL inside the paper, the artefact in the wallet, and the
      third-party verdict. If a scene is re-shot after anything is re-issued, run it again — a green
      harness from yesterday describes yesterday's chain.
- [ ] the RPC you record against is the one in the notes (public 97, not a local anvil)
- [ ] the limits panel is on screen in scene 1, not in a footnote
- [ ] no scene depends on `_research/` or any file outside this repository

**Related:** [[00-Overview/02 - Roadmap to the Deadline]] · [[08-Results/01 - Evidence and Limits]]
