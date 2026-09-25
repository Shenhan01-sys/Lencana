---
tags: [concept]
---

# Anchored Bits not Membership

**Definition:** what we anchor to BAS is the SHA-256 of the served `encodedList` — a **fixed-length** bitstring. The anchor therefore witnesses *which bits are set in a 2048-byte array*, and never *which credentials are members of the list*.

**Why it is in this vault:** it prevents the single most overstated sentence this product could write about itself — "our status list is anchored on chain, so we cannot lie about its contents". Membership is not covered by the anchor, and a reader who assumes it is will trust the wrong component.

**Facts:**
- The mechanism: `LIST_BITS = 16384` (`signer/src/statusList.js:34`) and `new Uint8Array(LIST_BITS / 8)` (`:104`) — the array is 2048 bytes whether it holds 5 members or 8; index 0 is the leftmost bit (`:109`). The anchored value is `0x` + SHA-256 hex of the served string (`signer/src/anchor.js:44`), written with BAS `timestamp()`, which stores a `uint64` per `bytes32` and **keeps no content** (`lib/bas/src/IEAS.sol:333,363`).
- Measured, in the script's own header (`signer/scripts/anchor.js:11-13`): adopting three lesson credentials moved the list from 5 to 8 members and **both hashes stayed the same** — revocation `0x1c27a74cbd081a51…`, suspension `0x1c6997d2a2a6032a…` — because members with a zero bit change no byte. Re-run 2026-09-25: the hashes are still those two with 11 members watched (1 revoked, 1 suspended).
- Corollary that surprises people: two empty lists hash identically, so an anchor on an all-zero list proves less than one with a bit set, and `timestamp()` proves only *"this hash existed at this time"* — stated as the limit of the claim in `signer/README.md:66` and `:188-191`.
- What witnesses membership instead: `/healthz` reports `watched`, `flagged` and `unallocated` (`signer/src/lists.js:51`, served at `signer/src/server.js:290-299`), and `signer/scripts/check.js:186-187` requires the chain to recognise **every** watched credential (printed 11/11 by `npm run check`, 25 Sep). Membership is witnessed by the server being asked, not by the anchor.
- A related defect already fixed here: the anchored hash once came from a *different input set* than the served list — same renderer, different hashes, so the anchor proved nothing about anything anyone had read. `servedHashes()` is now the single source (`signer/src/lists.js:18-30`, recorded in [[00-Overview/04 - Corrections]]).
- If binding membership ever becomes a requirement, the fix is named, not bought: fold a digest of the member set into the anchored payload and accept that every adoption writes a new stamp (`signer/scripts/anchor.js:24-26`).

**Not to be confused with:** [[Concepts/Credential Hash vs Attestation UID]] — there the error is reading a predictable identifier as an existing record; here it is reading a fixed-length witness as a statement about a set. The anchor is *after the fact and narrow*; the hash is *before the fact and complete*.

**Sources:** `signer/src/statusList.js:34,104,109` · `signer/src/anchor.js:11-26,44` · `signer/src/lists.js:18-52` · `signer/scripts/anchor.js:10-26,73-76` · `signer/scripts/check.js:186-187` · `lib/bas/src/IEAS.sol:333,363` · [[04-Signer-Service/S2 - Status lists from chain state]] · [[04-Signer-Service/S3 - Two status lists]]
