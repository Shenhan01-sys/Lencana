# 05 — Status and order of work

**Last updated: 21 September 2026. Submission deadline: 30 September 2026, 23:59 WIB (≈9 days).**

## Where things stand

| | |
|---|---|
| On-chain layer (3 contracts) | ✅ written · **97 tests pass on fork chain 97 and 56** (23 Sep) · **deployed to public chain 97 (21 Sep)** — addresses and measured cost in [04-technical-reference.md](04-technical-reference.md) §D, re-read from the chain by an independent script (13/13), not trusted from a build log. Third contract (`SettlementSplit`, revenue split) is deployed on 97 and received a **real x402 settlement** on 23 Sep; it has no mainnet deployment and no hosted caller, and the HTTP `402` side has never run — see the limits row below |
| Verification page | ✅ built · typecheck + build pass · **probe 59 checks / 0 failed against the PUBLIC testnet (23 Sep)**, covering four verdicts: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while its prerequisite is revoked" |
| Reproducible demo data | ✅ `SeedDemo` seeds four distinct verdicts and converges in **two documented runs** — now run against public chain 97, and the four credential hashes came out **identical to the fork**, which is the point of hashing (holder, courseId) instead of pointing at a UID |
| Credential-signing backend | ✅ **exists, one command deep, and green against the public chain (21 Sep)**: `app/signer/` issues `OpenBadgeCredential` 3.0 with `DataIntegrityProof` + `eddsa-rdfc-2022`, serves two BitstringStatusLists derived from chain state, and anchors both list hashes with BAS `timestamp()`. `check.js` **53/53**, HTTP `serve-probe` **20/20** (jumlah check tumbuh bersama himpunan pantau; angkanya dicetak oleh run). What is left: the `vc.1ed.tech` run below, and a **public** URL for those lists to live at — the issued document currently carries `http://127.0.0.1:8787/…` |
| Real course content | ✅ **21–22 Sep.** A learning surface exists: **2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 rubric-scored essays**, all six lesson kinds used. Counts come from `npm run inventory`, which reads the course data — not from a number typed into a document. The flagship course id is deliberately `web3-dasar-2026`, the same constant `SeedDemo.s.sol` hashes into `courseId`, and `npm run probe` recomputes the demo learner's `credentialHash` from the course content and asserts it equals the attestation on public chain 97 |
| Learning surface (`web/#/learn`, `#/course/*`, `#/me`) | ✅ built 22 Sep · hash router over typed content, no UI framework (the reason `verify.ts` stays DOM-free and probeable) · progress in localStorage and labelled as **not evidence** · typecheck + build green · probe **59/59** |
| Who decides a grade | ✅ **the issuer, structurally** (22 Sep). `CourseManifest` carries the policy (criteria, weights, `passMark`, every quiz/essay rubric) and `rubricHash` — a keccak over the policy alone — is printed into the credential's `achievement.criteria`, so the platform cannot change the rules after a diploma exists. `web/src/score.ts` computes the composite and knows no institutional numbers; `BELUM_LENGKAP` is a real verdict, deliberately distinct from `0`. `issue.js` **no longer accepts `--score`**: it takes evidence and refuses before spending gas. Harnesses: `npm run rubric` **17/17**, probe **59/59**, signer `npm run check` **53/53**, `npm run judge` 7/7 (negative control), `npm run judge-variance` (spread 91–100, decision stable across 5 runs) |
| Deploy to public testnet | ✅ **done 21 Sep.** Funding was the only blocker and it turned out to be trivial: the whole sequence costs under 0.002 BNB of testnet gas. One rule learned doing it — the faucet claim has to land on the address whose **key** is in `.env`, because `forge` signs with that key and not with a wallet |
| Repository | ✅ `github.com/Shenhan01-sys/Lencana` (public). ⚠️ History starts **17 Sep**, not day one |
| Event registration | ⬜ not done. Required before submitting; the detailed rubric is only opened to registered participants |

## Language policy (why this folder is in English)

All documentation, captions and descriptions in this repository are **English**. One agreed exception:
the verification frontend, which is user-facing, will carry a language switch.

- [ ] 🔤 **Add an Indonesian / English switch to `web/`.** Not a cosmetic feature: the audience for the
      verification page is Indonesian HR staff and learners, while the code, docs and judges' reading
      material are English. Implementation notes, so this does not become a rewrite:
      - keep **all UI strings in one dictionary module** (`web/src/i18n.ts`), never inline in the
        renderer — the renderer is already a pure `report → HTML` function, so it just takes a
        language parameter
      - default **English**, persist the choice in `localStorage` alongside the RPC/address config,
        and set `<html lang>` when it changes
      - keep on-chain **data** untranslated (addresses, hashes, contract names). Only labels,
        verdict titles, reasons and the limits panel are translated — a verdict must not read
        differently in two languages
      - ⚠️ The **verbatim specification quotations** in the limits panel stay in English with the UI
        label translated. Translating a spec quote turns a citation into a paraphrase
- [ ] Solidity test names and revert messages are currently Indonesian. Converting them is cheap but
      touches every test file — decide once, before the demo video, and don't do it halfway
- [x] ~~Redeploy the anvil fork, then re-run `npm run probe`~~ — **done 19 Sep**: fresh fork, contracts
      redeployed from current source, `SeedDemo` run twice, probe **41 checks / 0 failed**. Two
      findings came out of it: `--slow` was never the fix for the failing seed transactions, and
      `SoulboundCert.mint()` accepting only its owner makes the **platform** the artifact minter once
      its issuers are third parties (D30). Both recorded where they belong.
- [x] 🔴 ~~**Issuance relayer** (`attestByDelegation`)~~ → **primitive and execution both proven; the
      hosted service is what remains.** The platform fronts issuance gas while the third-party agent
      stays the `attester` — off-chain only, no contract or `schemaUID` impact. Proven by 8 fork
      tests on 97 and 56 (19 Sep), then **run against the public chain**: `npm run delegate`
      (caller inside this repo, `signer/scripts/delegate.js`) issued 3 lesson credentials in one
      batch (`tx 0xe31a917e…`, 1,024,813 gas) and one singly (`tx 0xbe44e128…`, 370,131 gas), and
      reading the chain back showed `attester` = the agent, **the agent's balance unchanged to the
      wei**, `lessonOf(uid)` equal to the lesson id derived from the course material, and the
      attester nonce advancing once per request. EIP-712 domain `("EAS","1.3.0")`,
      `ATTEST_TYPEHASH 0xfeb2925a…`, field order and both request shapes (single ≠ batch — sharing
      one builder produced `InvalidAddressError`) live in `signer/src/delegation.js` with a guard
      that refuses a signature not recovering to the agent's own address.
      See [02-architecture.md](02-architecture.md#who-owns-the-agent-and-who-pays-for-issuance) and D31/D36.
      ⬜ **Remaining:** a *service* (endpoint + queue + its own key handling) rather than a script a
      person runs, and a **third-party facilitator** for the paid path.
- [x] ~~`PaymentSplitter` — the platform's fixed share is what recovers the fronted gas~~ →
      **`contracts/SettlementSplit.sol`**, deployed on public chain 97
      (`0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE`): fixed platform share in bps with a 25% cap,
      **no debt ledger** (every call pushes all of the money out and keeps nothing), a per-payment
      replay guard, and `platformBps` that can only ever be **lowered**. 22 offline tests + 7 fork
      tests against canonical Permit2 and the canonical x402 proxy, then a real settlement paid into
      it and divided (D38, D39, D40). ⬜ Remaining: a **three-way** split if the agent's own fee
      should be paid separately from the issuer's share — today it is one payee plus the platform.

## What is blocking, and who can unblock it

1. **~~Needs a human, not tooling~~ → done 21 Sep.** One wallet had to hold testnet BNB, and the
   usual diagnosis was **wrong**: the obstacle is not a CAPTCHA but a **mainnet-holding eligibility**.
   The official BNB faucet requires *"0.002 BNB on BSC Mainnet"* and Chainstack's requires 0.08 ETH on
   Ethereum mainnet plus an API key, so a fresh burner wallet fails both. **QuickNode's**
   `faucet.quicknode.com/binance-smart-chain/bnb-testnet` states plainly that *"a brand new wallet can
   claim"* (no account, no minimum, 12 h cooldown) — the only human step is its bot check.
   Two things that runbook settled the argument: the fork estimate (0.0003828 BNB) was slightly under
   and irrelevant — **the full sequence costs under 0.002 BNB**, so 0.01 covers it several times over;
   and the claim must land on **the address whose key is in `.env`**, because `forge` signs with that
   key, not with a wallet. Money that arrives in a wallet can only be a hop, and a wallet cannot send
   anything until it already holds gas — which is the circular trap that made this look hard.
2. **🧠 ~~A decision to take before the backend is written~~ → taken 19 Sep (option A)** — the
   status list is built and served from chain state. What replaced the decision as the blocker is
   the **interoperability run**: until a credential passes `https://vc.1ed.tech`, the phrase to use
   is "built to the specification", never "1EdTech compatible". Three options are still analysed in
   [02-architecture.md](02-architecture.md#d241--decided-19-sep-option-a-a-bitstring-status-list-derived-from-chain-state)
   for the record, with the refinement building it forced: **two** lists (`revocation` +
   `suspension`), because one bit cannot hold both a permanent revocation and a recoverable
   delisting.
3. **✍️ The course itself** — topic, rubric, essay question, and who the demo "institution" is. This
   is a product decision, and nothing demos without it.

## Order of work

| | task | why this position |
|---|---|---|
| 1 | **Public URL for `app/signer/`** — the issuer document and both status lists must be reachable from outside, because a standard verifier *opens those URLs* | the issued credential currently says `http://127.0.0.1:8787/…`; that is a document nobody else can verify, and it is the only thing standing between us and the next row |
| 2 | **Interoperability check**: send a credential to `https://vc.1ed.tech` and record the result. **Before it passes, do not write "1EdTech compatible"** | our strongest missing proof, and it needs almost no new code — only row 1 |
| 3 | **One real course + rubric + essay task**, plus the demo institution's name | a product with no content cannot be demonstrated, and the video has nothing to show |
| 4 | **Agent go/no-go: 23 Sep** — can it sign and anchor one credential end to end without a human? | if not, drop the agent layer and submit Consumer Apps only; the core product stands without it |
| 5 | **Paid verification over x402** (server answers `402`, client sends a `PAYMENT` header) | **never executed at all** — so far only on-chain settlement is proven. Keep it a flat percentage; **no debt ledger** |
| 6 | **Registration + submission wallet + team name** (`luma.com/pcc699dv` and the portal) | without registration the submission is not counted, however good it is |
| 7 | Video ≤5 min (4 scenes) + public repo check | 28–30 Sep |

<details><summary>Closed on the way here (16–21 Sep)</summary>

| was | now |
|---|---|
| `SeedDemo` completing the demo state (advanced credential + revocation) | ✅ four verdicts on public chain 97, in two documented runs |
| the status-list decision (D24.1) | ✅ taken 19 Sep, option A: bitstring derived from chain state — and it came out as **two** lists |
| signing backend: `eddsa-rdfc-2022`, ordered `@context`s, `validUntil`, mandatory `achievement.criteria`, `verificationMethod` as an HTTP URL | ✅ `app/signer/`, 45 + 20 checks green against the public chain |
| deploy to chain 97 | ✅ 21 Sep; addresses and measured cost in [04-technical-reference.md](04-technical-reference.md) §D |

</details>

## Calendar

| dates | target |
|---|---|
| 17–18 Sep | ~~`SeedDemo` clean + REVOKED-path probe green~~ → **done 19 Sep**, one day late: the seed converges in two runs and the probe now covers `REVOKED`, `ISSUER_DELISTED` and the chained path. ⚠️ **status-list decision still not taken** — it has slipped every day since 17 Sep and it blocks the signing backend |
| 19–21 Sep | signing backend working · one real course with content |
| 22–23 Sep | `vc.1ed.tech` check · **agent go/no-go** |
| 24–26 Sep | deploy to 97 · x402 layer (Uji A) · tighten the scenes |
| 27 Sep | **re-check the other participants' submissions** — our "no competitors" number is from 13 Sep, and a last-minute surge is normal |
| 28–29 Sep | video + submission form + verify the repo is public and complete |
| 30 Sep | **submit in the morning**, not at 23:00 |

## Deliberately not built

This list is long, and that is part of the plan — each line is something tempting that does not fit
in 13 days:

- **TEE / zkML / "verifiable inference"** — no runnable equivalent on BSC in this window, and the
  claim itself is banned here
- **ERC-6551** "skill wallet" per learner — status is Review, and it needs a third-party registry
  deploy
- **Multi-issuer marketplace** — content chicken-and-egg, undemonstrable
- **Greenfield on the critical path** — its testnet resets after ~7 days, and judging comes later
- **ERC-4337 / paymasters for onboarding** — zero evidence of availability on BSC. We reach
  "no seed phrase" in a duller way that definitely works: **the issuer pays the gas**
- **Issuer reputation that can go down** — stays a **slide**, not a scene: with one course and one
  agent there is no series of data to show, and presenting it as a scene only invites the answer
  "that is one example"
- **Mainnet.** Testnet satisfies the rules; the requirement is an address that resolves on BscScan
