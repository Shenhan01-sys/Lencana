---
tags: [signer, "S7"]
---

# S7 - Server routes and lifecycle

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/server.js:266-310`, `signer/src/server.js:31`, `signer/src/server.js:83`

**Summary:** One `node:http` server, no framework, ~325 lines, serving exactly the documents a third
party verifier will open: the issuer document, both status lists, the credential itself, an
operational witness, and one paid route. Two properties are deliberate — the bitstring is rebuilt from
chain state on every request, and the process holds no credential state of its own. Everything else in
`signer/scripts/` is a harness, not a feature.

**Key points — the routes, in the order the handler tests them:**

| route | code | returns |
|---|---|---|
| `GET /issuers/<slug>`, `GET /issuers` | `server.js:278-296` | the issuer document, i.e. the `assertionMethod` list verifiers resolve keys from. **Every** agent in `.keys/` answers at its own URL since 28 Sep (**B48**); `/issuers` alone still means "the slug this process signed with". An unknown slug gets 404 **with the list of known ones** |
| `GET /criteria/<courseId>` | `server.js:276-288` | the issuer's assessment policy: weights, pass mark, `validDays`, prerequisite, essay prompt + per-criterion maxima, `rubricHash` and the 12-hex `rubricRef`, **no quiz answer keys** → [[S8 - Criteria document]] |
| `GET /credentials/status/revocation` | `server.js:289` | signed `BitstringStatusListCredential`, rebuilt from chain per request |
| `GET /credentials/status/suspension` | `server.js:290` | same, other purpose — see [[S3 - Two status lists]] |
| `POST /verify` | `server.js:293` | the **only** route that asks for money → [[S6 - x402 paid verification]] |
| `GET /results/<courseId>/<credentialHash>` | `server.js:297-311` | the result document: the number, the five mechanical signs with what passed, the judge model + temperature, the rubric ref, and pointers to the credential + chain attestation — **without** quiz answer keys or the learner's essay text. A `courseId` that does not match the hash is answered 404, not served → [[S9 - Result document]] |
| `GET /credentials/<hash>` | `server.js:313-327` | **the signed Verifiable Credential** — this URL *is* the document's `id`. `?format=record` gives the internal record (evidence, rubric, judge); a credential adopted from chain that has no document of ours gets **409**, and an unknown hash gets the 404 that says so |
| `POST /relay`, `GET /relay/<id>` | `signer/src/relay.js` (ditambahkan 30 Sep, B97) | the issuance relayer as a service: an agent hands in a delegation it signed elsewhere; every refusal (foreign schema, unadmitted or delisted attester, signature not recovering to the attester, nonce already taken by the queue, credential already issued, `deadline` 0/past/too far, `value` ≠ 0) happens **before gas**; a valid request is queued idempotently. Broadcasting is **off unless `RELAY_BROADCAST=1`**; one broadcast from the queue was read back from chain 97 on 30 Sep → [[09-Testing/T33 - signer relay-check.js]] |
| `GET /healthz` | `server.js:329-357` | the operational witness (below) |
| any other path | `server.js:358-361` | 404 plus a hint listing the real routes |
| any thrown error | `server.js:346-349` | 500 carrying `err.message`, so a config failure reads as a config failure |

⚠️ **What this table used to say, and why it was wrong.** Until 27 Sep the `GET /credentials/…` row read
*"the stored signed document"*. It was not: `getCredentialByHash()` returns the **store row**, and
`send(res, 200, found)` returned that row with the real document nested one key down. Nothing tested the
route, so the claim survived a full harness — see [[Notes/Session-2026-09-27-B41-validator]]. Two guards
now keep it honest: `serve-probe` fetches the route and requires a credential-shaped body, and it requires
`"answer"` to appear nowhere in `/criteria`.

⚠️ **One slug, orphaned identities — closed 28 Sep, and it closed by breaking a harness.** `issuerDoc`
is still built once at start-up from `AGENT_SLUG`, so `/issuers/<other>` used to answer 404 even though
`.keys/<other>.json` exists. With `AGENT_SLUG=agent-b41` live, the four seeded demo credentials'
`verificationMethod` (…`/issuers/agent-demo`) did not resolve on that instance — switching identity for
one run silently breaks the documents of the previous one, which is exactly the failure we sell against
other platforms. Now every agent in `.keys/` is served at its own URL from its **public** fields only
(`listAgents()` + `issuerDocumentFor()`), `/healthz` names the serving slug and the full slug list, and
`serve-probe` verifies a credential against the issuer document *that credential points at* rather than
against whichever slug happened to be started. The first run of that code caught my own omission —
`listAgents()` did not return `publicKeyMultibase`, so the served issuer document had no key in it and
every signature check went red on a well-shaped document → [[00-Overview/04 - Corrections]].

- `/healthz` reports `ok`, `baseUrl`, `resolver`, `rpc`, `agent`, `agentSlugs`, `watched`, then per purpose
  `flagged` / `bitstringHash` / `unallocated` / `slots`, plus `sha256OfEncodedList` and
  `payment: {route, priceAtomic, network, token, split, payee, configured}`.
  Payment terms are published so anyone can open the paid route and discover them, rather than reading
  a price out of our documentation.
- It is also the **only** place the uid → bit-slot map is published, which is why
  `scripts/serve-probe.js:77` reads the map instead of inferring it from allocation order: if slots
  ever move, the harness stays correct.
- Every response sets `access-control-allow-origin: *` and `cache-control: no-store` (`server.js:94-102`):
  a verifier fetches from a browser, and a cached list is a list staler than the chain.
- `readJsonBody()` caps the request at 64 000 characters (`server.js:105-121`, the test is at `:111`);
  without that, one large POST is enough to exhaust the process.
- `buildList()` refuses rather than faking: with no `RESOLVER_ADDRESS`, no `RPC_URL`, or an empty watched
  set it throws (`server.js:64-68`) instead of serving a valid-looking all-zero list.
- `BASE_URL` defaults to `http://127.0.0.1:8787` and is the prefix of every URL written *into* a document
  — and, because `credential.js` stamps them at **issuance**, into the store too. That is the whole reason
  **B41** needed a new agent identity instead of a new host: the seeded demo credentials still point at
  loopback, while the credential issued 28 Sep under the edge host contains `127.0.0.1` **nol** kali dan
  host publiknya **sepuluh** kali (dihitung dari respons rute itu sendiri, 28 Sep). A deployment fact with
  an immutable consequence — re-issue, do not patch.
  The durable host itself is [[S10 - Edge surface]]; **B48** is what makes the old loopback documents still
  resolvable on any machine that has their keys.
- `src/env.js` loads `../.env` into `process.env` before any constant is read (server, `check.js`,
  `serve-probe.js`), and **values already in the process win**. Not a dependency-avoidance flourish:
  without it a harness does not fail, it *skips* the chain-dependent group and still prints a smaller
  green number — the exact failure mode we accuse other people's research notes of.

**Detail:**
- `jsonBody()` (`server.js:85-90`) exists because of a specific failure: the `report` from
  `web/src/verify.ts` carries `bigint` values, `JSON.stringify` throws on a BigInt, and the first
  version of this file died **mid-request on the paid route — after the settlement had already
  succeeded**. Money moved, the client received no proof: the worst shape a payment system can have.
  The single bigint-safe serialiser emits bigints as decimal strings, and the `try/catch` guarantees an
  explanatory 500 instead of a dropped connection (**D39**).
- It must run under `tsx`: `npm run serve` is `tsx src/server.js` (`signer/package.json`) because
  `server.js:31` imports `verify`/`defaultEndpoint` from `web/src/verify.ts`, `server.js:29` imports
  `manifestOf` from `web/src/manifest.ts`, and `chainStatus.js:19` imports `web/src/abi.ts` — those files
  use extensionless imports. `engines.node` is `>=22.18`; if the server dies with
  `Unknown file extension ".ts"`, check the runner and the Node version before the code.
- Boot loads one agent key: `loadKey(AGENT_SLUG)` (`server.js:50`). `.keys/` is gitignored and testnet
  only. `scripts/agent.js` creates it as an explicit command on purpose — a key minted silently by a
  running process is a key nobody knows to back up (`scripts/agent.js:8-11`).
- `scripts/serve-probe.js` is the HTTP twin of `check.js`: the document loader is built **from HTTP
  responses** (`:39-45`), so an unserved issuer document fails the probe even when the cryptography is
  perfect. Its 20 checks (0 failed, measured 2026-09-25) include bit-level ones keyed on
  `EXPECT_REVOKED` / `EXPECT_SUSPENDED` / `EXPECT_CLEAN` **as UIDs**; without them it names the group it
  skipped instead of printing a smaller silent green (`:93`).
- `server.js:325` exports `server` and `buildList`, so a harness can drive it in-process without exposing a port.
- What is deliberately **not** here: no authentication, no rate limiting, no cache, no database. State is
  `.store/state.json` (slot allocations, issued-credential records — [[S2 - Status lists from chain state]]); everything else is read from chain per request. Third-party JSON-LD contexts are still
  fetched over the network during verification, so a w3.org outage is a demo outage.

**Related:** [[S1 - The credential document]] · [[S2 - Status lists from chain state]] ·
[[S6 - x402 paid verification]] · [[01-Architecture/01 - Architecture]] · [[09-Testing/00 - Hub Testing]]
