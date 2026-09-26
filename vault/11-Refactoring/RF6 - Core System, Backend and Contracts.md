---
tags: [refactoring, "RF6"]
status: active
updated: 2026-09-26
---

# RF6 - Core System, Backend, Contracts and Chain Tooling

What needs refactoring on **our** side — `signer/`, `contracts/`, the chain tooling around x402, and the
shared logic in `web/src/` that is not presentation. Unlike [[RF1 - Consumer Readiness Audit]] this is
not about how the product looks; it is about the four things that stop it from being a service.

**Part of:** [[11-Refactoring/00 - Hub Refactoring]]

## The four structural holes

### 1. Nothing is idempotent, and nothing is queued

Issuance is a script a person runs (`signer/scripts/issue.js`, `delegate.js`). There is no request
record, no state, no retry identity — so the same assessment submitted twice produces two attestations.
Both references that have been running in production hit this: LearnHouse guards issuance because
concurrent completion checks once minted **two** certificates, and Frappe takes a row lock
(`FOR UPDATE`) and checks for a duplicate before inserting ([[L1 - LearnHouse]], [[L2 - Frappe LMS]]).

Refactor: one `issuance` record keyed by `(holder, credentialHash)` with a state machine
`requested → graded → signed → broadcast → anchored → failed`, the transaction hash stored on it, and a
single rule — **a request that already has a hash is never broadcast twice**. `SettlementSplit` already
shows the pattern on the money side (`splitDone[ref]`), so the vocabulary exists in this codebase; it is
the issuance side that has none. Also gives us the queue the essay path needs: today
`web/src/score.ts` ends at `essayScore: null` with nothing behind it.

### 2. There is no index, so "what does this address hold?" cannot be answered

Enumeration only works because `credentialHash = keccak256("vc:" ‖ holder ‖ courseId)` is **derivable**:
for a known catalogue you can compute every candidate hash and read each one. That is a real design
advantage (no registry contract, no graph indexer) and it is currently unused — the portfolio surface
shows fixtures instead, and the signer's own view of the world is a local `store` of watched hashes.

Refactor: make derivation the product. One `enumerate(holder, catalogue)` in the shared layer that
computes candidate hashes and reads them in **one** multicall instead of N round-trips, cached per block
number. Two consequences worth stating: the cost of a portfolio is O(catalogue) reads, not O(credentials)
— fine for 2 courses, and the reason to add multicall before the catalogue grows; and a credential from
a course **not** in the catalogue is invisible, which is correct for a permissionless chain but must be
documented as a limit, not discovered by a judge.

### 3. The signer is a process, not a service

Everything the product claims about availability rests on one Node process with keys in a local `.env`:
no rate limit, no auth on the write paths, no CORS policy, no restart story, and `BASE_URL` baked into
every document at signing time — which is why the URLs inside issued credentials are `127.0.0.1` and why
no third-party validator has ever been run ([[L8 - Lencana vs LMS]] §A, verification row).

Refactor, in the order that buys the most:

| step | what changes | why first |
|---|---|---|
| **Public URL** | `BASE_URL` becomes a real host; one credential re-issued under it; validator run recorded | it is the only blocker between us and an interoperability claim, and it needs almost no code |
| **Split read from write** | the three GET routes (issuer document, both status lists, credential) become stateless and cacheable — an edge function can serve them; `POST /verify`, issuance and anchoring stay on a host with the key | the read half has no state and no signing, so it is the half that can be made durable cheaply |
| **Status lists stop being rebuilt per request** | they are derived from chain state on every call today; cache the derived bitstring per block and invalidate on a new block | each request currently costs RPC round-trips, which is both slow and a rate-limit target |
| **Operational surface** | rate limit per IP, request log with the settlement hash, and `/healthz` extended to report the last anchored block | `/healthz` is already the witness for list membership; it is the natural place |
| **Key handling** | the issuer key moves out of a flat `.env` into whatever the host provides, with the rotation path written down | an agent that signs on behalf of a third party holding a key in a text file is the part of this design that ages worst |

### 4. Money is proven but not attached to anything a user does

The settlement path is real and measured ([[09-Testing/T6 - npm run x402]]): `402` → client signs two
EIP-712 objects → canonical proxy settles → `SettlementSplit` divides → report returned, client sends
**zero** transactions. What is missing is the product around it:

- **Enrolment is the chargeable event, not verification** ([[RF5 - Enrollment and the Paid Path]]).
  Verification stays free and wallet-less — that is D23 and it is the claim the track rewards.
- **The browser never calls it.** `web/src/main.ts` contains no `fetch(` at all; the console is three
  `setTimeout`s (OI-11). So the one thing we can prove is the one thing the product does not show.
- **One payee.** `SettlementSplit` pays a single `payee` plus the platform share. The three-way split
  (platform / agent / publisher) the builder asked about is a real gap; the honest interim answer is that
  the agent's fee is the publisher's to pay out of their share, because the contract deliberately keeps no
  debt ledger ([[02-Contracts/C3 - SettlementSplit]]).
- **Copy the one payment idea from the references:** Moodle refuses to trust a price from the request and
  recomputes it server-side (`transaction_complete.php:54`). Our `checkPayment()` already validates
  token/payTo/amount/deadline/signature — the price must likewise come from the publisher's manifest, not
  from the client.

## Contracts — what to change, and what to leave alone

| contract | refactor | leave alone |
|---|---|---|
| `CredentialResolver` | add a read that answers "is this issuer allowed, and since when" in one call for the UI; consider an event-friendly issuer list so the catalogue of issuers does not live only in our store | the `onAttest` gate on `attestation.attester` — it is the single fact that makes delegated issuance work, and touching it breaks D31 |
| `SoulboundCert` | nothing before the deadline | `mint()` admitting only `owner()`; the platform mints the artifact once issuers are third parties (D32) |
| `SettlementSplit` | a third leg only if the agent's fee must be separable; otherwise document that it is not | `platformBps` only decreasing, the 25 % cap, no debt ledger, `splitDone[ref]` |
| `DemoCourseToken` | replace with a real token **only** in a live deployment; until then every UI mention must say demo | the open `mint` — it is what makes the demo free, and it is labelled |

Two chain-tooling items that are currently outside the repository and therefore not claims we can make:
the broadcast-retry wrapper (pending-nonce guard) and the RPC endpoint measurements both live in a
private research folder. If a note says "we retry safely", that code has to move into `app/`
(`signer/lib/`) first — same rule as everything else in [[Conventions]].

## Priority with four days left

1. **Public URL + validator run** — the only item that converts a forbidden phrase into an allowed one.
2. **Wire the browser to `POST /verify`** (OI-11) — turns an animation into the real receipt; needs item 1.
3. **Issuance idempotency record** — small, and it is the difference between a script and a service.
4. **`enumerate()` + multicall for the portfolio** — makes the derivation advantage visible instead of theoretical.
5. After the deadline: split read/write hosting, status-list caching, key handling, the third split leg,
   and server-side quiz grading ([[L8 - Lencana vs LMS]] C.3).

Nothing in this note requires touching `web/index.html`, `main.ts`, `render.ts`, `style.css` or
`i18n.ts` — those stay with the frontend owner ([[FE4 - Mount contract with the maintainer]]).

**Related:** [[L8 - Lencana vs LMS]] · [[04-Signer-Service/01 - Signer Service]] · [[02-Contracts/01 - Contracts]] · [[09-Testing/00 - Hub Testing]]
