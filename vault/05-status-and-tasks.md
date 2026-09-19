# 05 — Status and order of work

**Last updated: 17 September 2026. Submission deadline: 30 September 2026, 23:59 WIB (≈13 days).**

## Where things stand

| | |
|---|---|
| On-chain layer (2 contracts) | ✅ written · **60 tests pass on fork chain 97 and 56** · deploy proven on a fork |
| Verification page | ✅ built · typecheck + build pass · **probe 41 checks / 0 failed against live chain state (19 Sep)**, covering four verdicts: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while its prerequisite is revoked" |
| Reproducible demo data | ✅ `SeedDemo` seeds four distinct verdicts and converges in **two documented runs**; verified on a clean fork 19 Sep. The cause of the old failure was EAS's UID formula, not our code — see [03-evidence-and-limits.md](03-evidence-and-limits.md) |
| Credential-signing backend | ⬜ **does not exist.** The blocker is no longer ignorance — the document format is now read. What blocks it: **the status-list decision below** |
| Real course content | ⬜ none. Without it there is nothing to demonstrate |
| Deploy to public testnet | ⬜ keys exist now (burners, generated locally); blocked on **funding** only. The deployer address is the `deployer` line printed by `DeployCredentials.s.sol` |
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
- [ ] 🔴 **Issuance relayer** (`attestByDelegation`). The platform fronts issuance gas while the
      third-party agent stays the `attester`. This is **off-chain only** — no contract and no
      `schemaUID` impact. Everything needed is verified in
      [02-architecture.md](02-architecture.md#who-owns-the-agent-and-who-pays-for-issuance):
      EIP-712 domain `("EAS","1.3.0")`, `ATTEST_TYPEHASH 0xfeb2925a…`, field order, `getNonce()`,
      `multiAttestByDelegation` for batches, `increaseNonce()` as the owner's kill switch.
      Blocked by the same thing as deployment: **a wallet holding testnet BNB**
- [ ] `PaymentSplitter` — the platform's fixed share is what recovers the fronted gas (see the
      economics note in 02-architecture). Keep it a flat percentage; **no debt ledger**

## What is blocking, and who can unblock it

1. **⏰ Needs a human, not tooling** — the BSC testnet faucet is **CAPTCHA-gated**. Fund one wallet
   with testnet BNB and deployment becomes a single command. Measured on a fork: **0.0003828 BNB**.
2. **🧠 A decision to take before the backend is written** — how our on-chain revocation becomes
   visible to a standard Open Badges verifier. Three options are analysed in
   [02-architecture.md](02-architecture.md#one-decision-still-open-a-standard-status-list-vs-our-on-chain-revocation);
   the recommendation is **A**: a bitstring status list **derived from chain state**, its hash
   recorded with `timestamp()` on BAS. **Why it matters and is not cosmetic:** without it, our
   credential can pass a third-party validator while showing "ACTIVE" for a certificate we already
   revoked.
3. **✍️ The course itself** — topic, rubric, essay question, and who the demo "institution" is. This
   is a product decision, and nothing demos without it.

## Order of work

| | task | why this position |
|---|---|---|
| 1 | **Finish `SeedDemo`** so the demo state is complete (advanced credential + revocation land), then run the probe on the **REVOKED** path | small, and it closes the only hole in the layer we are most proud of |
| 2 | **Take the status-list decision** | it determines the credential document's shape — writing the backend first means rewriting it |
| 3 | **Signing backend**: `eddsa-rdfc-2022`, two ordered `@context`s, `validUntil`, mandatory `achievement.criteria`, `verificationMethod` as a plain HTTP URL is enough | the critical path is now the off-chain layer, not the on-chain one |
| 4 | **One real course + rubric + essay task** | a product with no content cannot be demonstrated |
| 5 | **Interoperability check**: send a credential to `https://vc.1ed.tech` and record the result. **Before it passes, do not write "1EdTech compatible"** | our strongest missing proof, and it needs almost no new code |
| 6 | **Deploy to chain 97** → address resolves → fill it into the page | formal work once the wallet is funded |
| 7 | **Paid verification over x402** (server answers `402`, client sends a `PAYMENT` header) | **never executed at all** — so far only on-chain settlement is proven |
| 8 | **Agent go/no-go: 23 Sep** | if the agent cannot sign and anchor one credential **end to end without human intervention**, drop the agent layer and submit Consumer Apps only. The core product stands without it |
| 9 | Video ≤5 min (4 scenes) + submission form + public repo check | 28–30 Sep |

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
