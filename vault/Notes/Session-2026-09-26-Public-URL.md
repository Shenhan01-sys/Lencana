---
tags: [note, session, public-url]
status: active
updated: 2026-09-26
---

# Session-2026-09-26 - Public URL for the signer, and what it exposed

Continues the row "public URL → validator run" in [[00-Overview/02 - Roadmap to the Deadline]] and
[[11-Refactoring/RF6 - Core System, Backend and Contracts]].

## What got proven

**The signer can be read from the public internet.** A Cloudflare quick tunnel
(`https://accompanied-union-reflect-springfield.trycloudflare.com` → `127.0.0.1:8787`) served
`GET /healthz` to an outside client with `Server: cloudflare` and a `CF-Ray` header, and the body's own
`baseUrl` field matched the tunnel host — so the response came from our process, not a cached page. The
body reported: resolver `0x7CA624caFDe5cA3A27b33d26be56F73a90792065`, rpc `bsc-testnet.publicnode.com`,
11 credentials watched, `revocation.bitstringHash 0x1c27a74cbd081a516e2dfea1d179d480eb28a00f04cfb5c53f17c8e1cdd168cb`,
`suspension.bitstringHash 0x1c6997d2a2a6032a9b6151183e0924a564cb939400d4a358a3dd9b5c3a41450e` (both equal to
the anchored values in [[09-Testing/T9 - npm run anchor]]), and `payment { route: POST /verify,
priceAtomic: 1000, network: eip155:97, token 0xEd19cDeB…, split 0xcB00E62B…, configured: true }`.

**Two tooling facts, measured the hard way:**

1. **`localhost.run` anonymous tunnels cannot be used for a verifier.** The domain only becomes live
   after a human opens a confirmation page in a browser; every non-browser client got an empty reply
   (`curl` exit 52, `http=000`) while the same server answered `200` locally. A validator dereferencing
   our URLs would see a dead endpoint. This is why the route switched to cloudflared.
2. **A quick tunnel gives a new random domain per run.** Two of my steps used the *previous* domain and
   signed/served with the wrong `BASE_URL`. Anything that bakes `BASE_URL` into documents must read it
   from the tunnel process output in the same step, not from memory.
   Helper left in place: `_research/serve_public.ps1 <tunnel-url>` (frees 8787 first, then serves).

## What blocked the validator run

`GET /credentials/0x…` returned **404 from our own server** — locally as well as through the tunnel, so
not a tunnel problem. Two lines of `server.js` explain the shape of it: the route exists at `:276`
(`path.startsWith('/credentials/0x')`) and the 404 comes from the catch-all at `:310`. Meanwhile the
second `/healthz` answered `ok: false` with:

> `chain membaca status sebagai 1, tapi itu tidak ada di daftar kita`

That is the local store and the chain disagreeing: a credential whose status bit is set is not in the
store this process reads, so list rendering bails out — and the document route is downstream of the same
state. The first `/healthz` of the session was consistent (11 watched, 1 flagged, `unallocated: 0`), so
the drift happened between the two server instances, after the machine slept and the 2-day-old process
was replaced.

**This is the defect worth keeping, not hiding.** `/healthz` is exactly the place designed to refuse to
serve an inconsistent view, and an external request is what surfaced it. Until it is fixed, "public URL
works" is proven only for the health route, and the phrase "1EdTech compatible" stays forbidden.

## Next actions, in order

1. Re-seed the store from chain with the explicit list — `node scripts/adopt.js --hashes <the 11 from
   /healthz>` (`npm run adopt` is `--demo`, which adopts only the four seeded states; that asymmetry is
   itself a trap worth a line in [[06-Spec-Research/01 - Spec Research]]).
2. `GET /healthz` must return `ok: true` with 11 watched, then `GET /credentials/0x…` must return 200
   with a `proof` whose `verificationMethod` and `credentialStatus` URLs are the tunnel host.
3. Run the validator — form discovered earlier at `GET /upload?validatorId=OB30Inspector`
   (`POST https://vc.1ed.tech/upload`, `multipart/form-data`, fields `uri` **or** `file`, plus
   `validatorId`, no CSRF token):
   `curl -F "uri=https://<tunnel>/credentials/0x…" -F "validatorId=OB30Inspector" https://vc.1ed.tech/upload`
4. Record the response verbatim in `09-Testing/T15 - 1EdTech validator.md` — pass **or** fail — and only
   then touch the wording in [[08-Results/01 - Evidence and Limits]].
5. Note for the video: a quick-tunnel domain dies with the process, so anything a judge clicks needs the
   durable half of [[11-Refactoring/RF6 - Core System, Backend and Contracts]] (edge function for the
   three read routes).

**Related:** [[09-Testing/00 - Hub Testing]] · [[04-Signer-Service/S7 - Server routes and lifecycle]] · [[00-Overview/02 - Roadmap to the Deadline]]
