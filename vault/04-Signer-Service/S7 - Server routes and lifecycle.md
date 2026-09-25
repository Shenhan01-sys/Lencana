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
| `GET /issuers/<slug>`, `GET /issuers` | `server.js:268` | the issuer document, i.e. the `assertionMethod` list verifiers resolve keys from |
| `GET /credentials/status/revocation` | `server.js:269` | signed `BitstringStatusListCredential`, rebuilt from chain per request |
| `GET /credentials/status/suspension` | `server.js:270` | same, other purpose — see [[S3 - Two status lists]] |
| `POST /verify` | `server.js:273` | the **only** route that asks for money → [[S6 - x402 paid verification]] |
| `GET /credentials/0x…` | `server.js:276-280` | the stored signed document, or 404 `belum diterbitkan lewat backend ini` |
| `GET /healthz` | `server.js:281-310` | the operational witness (below) |
| any other path | `server.js:311` | 404 plus a hint listing the real routes |
| any thrown error | `server.js:312-315` | 500 carrying `err.message`, so a config failure reads as a config failure |

- `/healthz` reports `ok`, `baseUrl`, `resolver`, `rpc`, `watched`, then per purpose
  `flagged` / `bitstringHash` / `unallocated` / `slots`, plus `sha256OfEncodedList` and
  `payment: {route, priceAtomic, network, token, split, payee, configured}` (`server.js:284-309`).
  Payment terms are published so anyone can open the paid route and discover them, rather than reading
  a price out of our documentation.
- It is also the **only** place the uid → bit-slot map is published, which is why
  `scripts/serve-probe.js:77` reads the map instead of inferring it from allocation order: if slots
  ever move, the harness stays correct.
- Every response sets `access-control-allow-origin: *` and `cache-control: no-store` (`server.js:91-101`):
  a verifier fetches from a browser, and a cached list is a list staler than the chain.
- `readJsonBody()` caps the request at 64 000 characters (`server.js:103-119`); without that, one large
  POST is enough to exhaust the process.
- `buildList()` refuses rather than faking: with no `RESOLVER_ADDRESS`, no `RPC_URL`, or an empty watched
  set it throws (`server.js:62-66`) instead of serving a valid-looking all-zero list.
- `BASE_URL` defaults to `http://127.0.0.1:8787` (`server.js:31-33`) and is the prefix of every URL
  written *into* a document (`credential.js:67,82`, `statusList.js:90,94`). The credentials issued here
  today therefore carry loopback URLs, and an outside verifier cannot resolve `verificationMethod` or a
  status list — the blocker in front of the interoperability test, a deployment fact, not a code defect.

**Detail:**
- `jsonBody()` (`server.js:83-89`) exists because of a specific failure: the `report` from
  `web/src/verify.ts` carries `bigint` values, `JSON.stringify` throws on a BigInt, and the first
  version of this file died **mid-request on the paid route — after the settlement had already
  succeeded**. Money moved, the client received no proof: the worst shape a payment system can have.
  The single bigint-safe serialiser emits bigints as decimal strings, and the `try/catch` guarantees an
  explanatory 500 instead of a dropped connection (**D39**).
- It must run under `tsx`: `npm run serve` is `tsx src/server.js` (`signer/package.json`) because
  `server.js:28` imports `verify`/`defaultEndpoint` from `web/src/verify.ts` and `chainStatus.js:19`
  imports `web/src/abi.ts` — those files use extensionless imports. `engines.node` is `>=22.18`; if the
  server dies with `Unknown file extension ".ts"`, check the runner and the Node version before the code.
- Boot loads one agent key: `loadKey(AGENT_SLUG)` (`server.js:48`). `.keys/` is gitignored and testnet
  only. `scripts/agent.js` creates it as an explicit command on purpose — a key minted silently by a
  running process is a key nobody knows to back up (`scripts/agent.js:8-11`).
- `scripts/serve-probe.js` is the HTTP twin of `check.js`: the document loader is built **from HTTP
  responses** (`:39-45`), so an unserved issuer document fails the probe even when the cryptography is
  perfect. Its 20 checks (0 failed, measured 2026-09-25) include bit-level ones keyed on
  `EXPECT_REVOKED` / `EXPECT_SUSPENDED` / `EXPECT_CLEAN` **as UIDs**; without them it names the group it
  skipped instead of printing a smaller silent green (`:93`).
- `server.js:325` exports `server` and `buildList`, so a harness can drive it in-process without exposing a port.
- What is deliberately **not** here: no authentication, no rate limiting, no cache, no database. State is
  `.store/state.json` (slot allocations, issued-credential records — [[S2 - Status lists from chain
  state]]); everything else is read from chain per request. Third-party JSON-LD contexts are still
  fetched over the network during verification, so a w3.org outage is a demo outage.

**Related:** [[S1 - The credential document]] · [[S2 - Status lists from chain state]] ·
[[S6 - x402 paid verification]] · [[01-Architecture/01 - Architecture]] · [[09-Testing/00 - Hub Testing]]
