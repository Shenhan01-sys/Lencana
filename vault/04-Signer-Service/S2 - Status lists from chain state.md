---
tags: [signer, "S2"]
---

# S2 - Status lists from chain state

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/lists.js:40`, `signer/src/statusList.js:103`, `signer/src/chainStatus.js:25`

**Summary:** A status list is never stored — it is rebuilt from deployed contract state on every
request, then signed. The only thing kept on disk is the **slot number** each credential occupies, and
that lives on the issuer side, not the server's. What reaches the chain is the SHA-256 of the served
bitstring, and it proves less than it sounds like: bits, not membership.

**Key points:**
- The per-request pipeline is `buildList()` (`signer/src/server.js:62`) → `servedHashes()`
  (`signer/src/lists.js:28`) → `renderList()` (`lists.js:40`) → `readChainStatuses()` → `encodeList()`
  → `statusListCredential()` → `signDocument()`. No cache: the served list can never be older than the
  chain, and it cannot lag behind a delisting that was later reversed.
- Two reads per hash — `attestationOf()` (`chainStatus.js:29`) then `statusOf()` (`chainStatus.js:34`).
  A hash with an empty UID or `exists == false` is **dropped**, not defaulted to zero.
- `LIST_BITS = 16384` (`statusList.js:34`) and `new Uint8Array(LIST_BITS / 8)` (`statusList.js:104`)
  make the bitstring a fixed **2048 bytes**. Index 0 is the leftmost bit
  (`0x80 >> (index % 8)`, `statusList.js:109`), mirrored by `decodeBit()` (`statusList.js:149-152`) so
  `check.js` can prove bit semantics instead of assuming them.
- `encodedList` is multibase `u` + base64url without padding, of the gzip of those bytes
  (`statusList.js:36,111`). The anchored value is `0x` + SHA-256 hex of that exact served string
  (`signer/src/anchor.js:44`) — BAS `timestamp()` stores a `uint64` per `bytes32` and keeps no content.
- Allocation is the issuer's act: `IndexAllocator.slot()` at issuance (`statusList.js:60`, used by
  `scripts/issue.js:222-225` and `scripts/delegate.js:217-228`); the server only ever calls `peek()`
  (`statusList.js:76`, `lists.js:50`). If the server allocated, the number would follow that
  request's iteration order and an older document's `statusListIndex` could point at someone else's
  bit — a failure signature verification cannot see, because the document stays perfectly valid.
- `loadAllocator()` (`signer/src/store.js:56`) persists to a plain-text JSON store; `commit()`
  re-reads the file and patches only `nextIndex` and `byUid` (`store.js:69`), because the first
  version wrote back its start-of-process copy and silently erased `watchCredential` records.
  `watchedHashes()` = credentials issued here **∪** credentials adopted from chain (`store.js:43`);
  `STATUS_HASHES` wins when set, as a manual lever (`lists.js:28`).
- `renderList()` returns `unallocated` and `/healthz` prints it (`lists.js:51`,
  `server.js:290-299`): a watched credential with no slot does not set a bit, and that must be
  visible rather than a list that looks right while quietly short.
- `servedHashes()` exists because the anchor once anchored a list the server never served: same
  renderer, different input set, so the anchored hash could never equal any bitstring anyone read
  (`lists.js:18-26`, recorded in [[00-Overview/04 - Corrections]). Sharing a function is not sharing
  a decision.

**Detail:**
- 🔴 The measured limit (`scripts/anchor.js:10-13`): adopting three lesson credentials moved the list
  from 5 to 8 members and **both hashes stayed the same** — revocation `0x1c27a74cbd081a51…`,
  suspension `0x1c6997d2a2a6032a…` — because new members with zero bits change no byte of a fixed
  2048-byte array. So an anchor witnesses *which bits are set*, never *who is in the list*; the server
  is still trusted for the watched set. See [[Concepts/Anchored Bits not Membership]].
- The command that witnesses the served list is `npm run anchor` (`signer/package.json` →
  `node scripts/anchor.js`). It renders both lists, compares each hash with `getTimestamp()`, and
  writes only when absent — idempotent, so an unchanged list costs no gas (`scripts/anchor.js:73-76`).
  `--dry-run` stops before writing; the run on 2026-09-25 printed
  `sudah ter-anchor revocation: 11 kredensial, 1 bit terpasang … sejak 1790008783` and the suspension
  line `sejak 1790008791`, i.e. nothing needed writing.
- Membership is witnessed by other means, and they are not the anchor: `/healthz` reports
  `watched`, `flagged`, `unallocated`, and `scripts/check.js:186` requires the chain to recognise
  every watched credential — currently **11/11**, with 1 revoked and 1 suspended.
- Determinism is a tested property, not a hope: re-rendering the same input must give the same hash,
  and reversing the input order must **not** change it (`check.js:302-303`). Without it, the index
  written into every older document loses its meaning.
- Two empty lists hash identically (`signer/README.md`, measured), so an anchor is only meaningful
  once a bit is set, and `getTimestamp()` cannot say which purpose a hash belonged to. If binding
  membership ever matters, the fix is to fold a digest of the member set into the anchored payload
  (`scripts/anchor.js:24-26`) — not to buy another tool.

**Related:** [[S1 - The credential document]] · [[S3 - Two status lists]] ·
[[S7 - Server routes and lifecycle]] · [[Concepts/Anchored Bits not Membership]] ·
[[02-Contracts/01 - Contracts]] · [[09-Testing/00 - Hub Testing]]
