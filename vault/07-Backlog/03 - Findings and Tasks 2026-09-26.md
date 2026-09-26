---
tags: [backlog, tasks]
status: active
updated: 2026-09-26
---

# 03 - Findings and Tasks, 26 Sep

Born from reading the contract and the server this session. Each task states who owns it and what
counts as proof — no task here is "polish X".

## Core system (ours)

| # | task | why now | proof it is done |
|---|---|---|---|
| **B38** | `tokenURI` is **frozen at mint** — `_uris[tokenId] = uri` (`contracts/SoulboundCert.sol:132`) and there is no burn path. A revoked credential therefore keeps an artefact whose metadata still looks valid forever | contradicts the thing we sell ("revocation is visible"). The wallet/marketplace view becomes the one place our story is false | `tokenURI()` resolves to a **live** view (status included), or points at `…/credentials/<hash>`; a fork test asserts a revoked credential's artefact reports revoked through `tokenURI` |
| **B39** | **Decide artefact granularity.** Lesson-level credentials exist; if each gets an artefact, one learner carries ~24 tokens per course | portfolio becomes noise, and "soulbound achievement" loses meaning | a written decision in [[00-Overview/03 - Decisions]] + mint restricted to that level + a test that refuses the other level |
| **B40** | Batch minting. The platform broadcasts, so artefact gas scales per credential | we already proved batch settlement (≤25 per x402 payment); issuance/mint has no equivalent | one call minting N artefacts, gas per artefact printed by a fork test |
| **B41** | The last validator step: `verificationMethod` came from the agent record created with `http://127.0.0.1:8787/…`, and `npm run agent` refuses to overwrite ("sudah ada … tidak ditimpa") — so `BASE_URL` never reaches issuer identity | until this runs, "1EdTech compatible" stays banned; it is our only remaining strong claim | `POST /upload` with part `file` to `vc.1ed.tech`, verdict pasted verbatim into `09-Testing/T15` — pass **or** fail |
| **B42** | Harness blind spot: `serve-probe` never starts the server with a **cold store**. Today the credential route and list rendering depend on store warmth | this is exactly how a "green 20/20" hid a real path failure | a probe run against a fresh store dir, or an explicit cold-store test |
| **B43** | Documentation debt: `09-Testing/T6`, `T9`–`T14` unwritten; `08-Results/00 - Hub Results`, `10-Contributors/00 - Hub Contributors`, `07-Backlog/02 - Plan`, `Glossary`, `Quick-Reference` missing; 69 unresolved vault links; 13 Module-Guides still `_TODO` | every number quoted in submission material should have a home page with its date | `scripts\sync-vault.ps1` then `check-links.ps1` → `Broken: 0` |

## Frontend owner (Dave) — see [[10-Contributors/Open-Items-for-Dave]]

- **OI-11** stays the most serious: `main.ts` contains **no `fetch(`** at all and `simulateX402Batch()`
  (`main.ts:1003`) prints `402 CHALLENGE → SIGNED (0.0005 tBNB) → SETTLED → 200 OK (118ms)` from three
  `setTimeout`s. We settle real payments on chain 97 in the same repo — the UI should show that, not a
  timer. Smallest step: `POST {BASE_URL}/verify`, render `accepts[]`, `X-PAYMENT-RESPONSE`, tx hash;
  print "server tidak terhubung" when unreachable.
- **B38 pairs with a UI rule**: wherever an artefact is displayed, status is fetched, never assumed
  (no burn exists by design).
- **B39 is a product decision they must be told about**, not a code task.

## Facts locked this session (so nobody re-derives them)

- `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` (CredentialResolver, chain 97) appears in
  `broadcast/DeployCredentials.s.sol/97/run-latest.json`, in `web/src/verify.ts` as the page's default
  endpoint, and in `vault/02-Contracts` → safe to type into the submission form. Network = BSC Testnet.
- The other three addresses are listed in `vault/02-Contracts/01 - Contracts.md:15-18` and belong in the
  description box, cross-checked individually before use.
- Submission copy (tagline + problem statement at 1655/2000 chars) lives in
  [[00-Overview/08 - Submission Copy]]; banned sentences in [[10-Contributors/Claims-Cheat-Sheet]].

**Related:** [[07-Backlog/01 - Backlog]] · [[02-Contracts/C2 - SoulboundCert]] ·
[[11-Refactoring/RF6 - Core System, Backend and Contracts]]
