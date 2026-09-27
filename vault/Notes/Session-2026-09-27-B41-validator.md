---
tags: [note, session, validator, issuance]
status: active
updated: 2026-09-27
---

# Session-2026-09-27 - B41: the validator run, and what it found in us

Continues [[Notes/Session-2026-09-26-Public-URL]] (the five-step chain) and
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] (**B41**, **B45**).

Everything below was executed today against public chain 97 through a live tunnel. No number here is
carried over from yesterday's notes.

## The chain, step by step

| # | step | measured result |
|---|---|---|
| 1 | tunnel up, domain read **from its own log** (never from notes — random per run) | `genres-wines-insulation-useful.trycloudflare.com` |
| 2 | new agent identity created **under that `BASE_URL`** (`npm run agent --slug agent-b41`) | `verificationMethod` = `…/issuers/agent-b41#z6MkniaArHmQ6ncenEKaoE3bkEDdg4Pd3eStb3mP5JCj9Uhr` — the field that yesterday carried a loopback URL |
| 3 | `addIssuer` | **not needed.** `agent.js` stores only the Ed25519 signing key; the `attester` EOA is `ISSUER_PRIVATE_KEY`, unchanged and already whitelisted (`isIssuer = true`, `isDelisted = false`, read back from the resolver). Yesterday's step list assumed a new EOA — corrected below |
| 4 | issue one credential with a **model-graded essay** | composite **92** against the issuer's `passMark` **70**; `attest` **333.484 gas**; uid `0x40fe765b…`; slots revocation **24** / suspension **25** |
| 5 | `POST /upload` with part `file`, then read the real verdict | **`outcome: ERROR` — 2 errors, 0 warnings, 14 tests run.** Verbatim in [[09-Testing/T15 - 1EdTech validator]] |

Grading detail (it is the first credential whose essay number came from a model *and* whose text was
written for this run, not a stored fixture): five mechanical signs → **3/5, `scoreMechanical` 60** (the
essay names a concrete function and states its own limits; it contains no `0x…` and no URL — deliberate,
the task never asks for one), then `openai/gpt-oss-120b` at `temperature: 0` → **99**; weights from the
manifest: kuis 80×40 % + esai 99×40 % + praktik 100×20 % = **92**. Rubric reference unchanged:
`2a45d0d00bc4`.

## The mistake I made, and what it cost

I passed the learner address by **typing it** (`0x518bD439…`) after deriving a different one
(`0xc7B8D9C3…` from `keccak256("lencana-b41-probe-learner")`). The first issuance therefore produced a
live credential whose holder I cannot derive from anything in the repo — an unaccountable artifact on a
public chain, which is exactly the class of thing we criticise in other people's demos.

What I did about it, in order: revoked it through the real path (`bas.revoke()`, tx `0xb93892a6…`,
**75.532 gas**, block 133,423,885 — `statusOf` read back `revoked: false → true`), re-anchored the
revocation list (new hash `0x1665351d516a84…`, tx `0x21554204…`, 45.869 gas; the suspension list printed
*"sudah ter-anchor"* and cost nothing, which is the idempotence claim working as designed), then re-issued
correctly. `EXPECT_REVOKED` in `.env` went from 1 uid to 2 **so that the harness would count the bit that
is really set** — the alternative was a green number that lies.

The rule this reinforces is already in [[Conventions]] and I broke it anyway: addresses are parsed out of
source or derived in code, never retyped. Cost of the break: two extra chain writes and one revoked
credential that will outlive the tunnel.

## What the run found in our own code (not in the specification)

1. **`GET /credentials/<hash>` was not returning a credential.** That URL *is* the document's `id`, and
   the response was our internal store row (`credentialHash`, `uid`, `evidence`, `essayGrading`, the real
   document nested one level down). My substring count yesterday ("127.0.0.1 appears 13 times") was run on
   that row and read as if it were the document — the conclusion happened to be right, the measurement was
   not looking at the thing it claims to look at. Fixed in `signer/src/server.js`: the route serves the
   signed document, the record stays at `?format=record`, and a credential adopted from chain that has no
   document of ours now answers **409** instead of pretending.
2. **Nothing had ever tested that route.** `serve-probe.js` fetched the issuer document, both lists and the
   bit map — 20 checks, zero on the route printed on every certificate. It is now **35 checks**, and the
   new ones include verifying the document's signature against the key obtained **over HTTP**, the way a
   stranger does. `check.js` is 61/0 (up from 53 as the watched set grew), `probe:serve` 35/0, both through
   the tunnel.
3. **`/criteria/<slug>` was a promise with nothing behind it** — every credential prints
   `achievement.criteria.id` and `result[0].resultDescription` pointing there. **B45 is done**: the route
   serves the issuer's policy (weights, pass mark, `validDays`, prerequisite, essay prompt with
   per-criterion maxima, `rubricHash` + the 12-hex `rubricRef` that matches the credential's narrative).
   It deliberately **excludes quiz answer keys** even though `canonicalPolicy()` hashes them — publishing
   them would leak the exam to buy a hash — and `probe:serve` asserts the string `"answer"` appears
   nowhere in the response. See [[04-Signer-Service/S8 - Criteria document]].
4. **Serving one slug orphans the other identities.** With `AGENT_SLUG=agent-b41`, `…/issuers/agent-demo`
   is now **404**, so the four seeded demo credentials' `verificationMethod` does not resolve on this
   instance. That is a real operational trap for the video: switch the slug and the earlier demo becomes
   unverifiable by design. Logged as **B48** (serve every key in `.keys/`, or pin one slug for the demo).

## And what the validator found in our design

Two errors, both about the **document shape**, neither about the chain layer — full text and my reading in
[[09-Testing/T15 - 1EdTech validator]]:

- `$.credentialStatus: array found, object expected` — our two-list design is the thing we sell against
  six platforms, and the published OB 3.0 JSON Schema admits **one** object. Waiting on the spec quotes
  before restructuring, because the fix is a design decision, not a syntax edit.
- `revocation bitstring length is less than minimumNumberOfEntries` — measured first so we do not guess:
  the list we serve inflates to exactly **2048 bytes = 16384 bits** with 2 bits set, and the highest index
  any document references is 25. So this is not a short array; it is a capacity we never *declare*.

Until both are resolved, the sentence stays **"built to the specification"** — and it is now a weaker
sentence than before, in a good way: we have a run, a number, and two named defects instead of an
untested claim.

## Caveat that must not be lost

Every URL in the credential issued today points at a **quick-tunnel domain that dies with the process**.
It is valid for a validator run; it is not something to put in front of a recruiter or in the video. The
durable answer is already written in [[11-Refactoring/RF6 - Core System, Backend and Contracts]] (edge
functions for the read routes) — with one more route to move than when that page was written:
`/issuers/<slug>`, `/credentials/status/{revocation,suspension}`, `/credentials/<hash>`, **`/criteria/<slug>`**.

**Related:** [[09-Testing/T15 - 1EdTech validator]] · [[04-Signer-Service/S8 - Criteria document]] · [[04-Signer-Service/S7 - Server routes and lifecycle]] ·
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · [[04-Signer-Service/S3 - Two status lists]] · [[Notes/Session-2026-09-26-Public-URL]]
