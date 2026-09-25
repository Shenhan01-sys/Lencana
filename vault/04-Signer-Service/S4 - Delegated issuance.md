---
tags: [signer, "S4"]
---

# S4 - Delegated issuance

**Part of:** [[04-Signer-Service/01 - Signer Service]]
**Source:** `signer/src/delegation.js:60`, `signer/src/delegation.js:108`, `signer/src/delegation.js:215`

**Summary:** This is **D31** in code: the third-party agent signs an EIP-712 attestation off chain and
the platform broadcasts it, so the recorded `attester` is the agent while the agent's BNB balance does
not move. `delegation.js` is a trust boundary, not a convenience wrapper — either the digest matches
what `EIP1271Verifier` expects or the public chain reverts `InvalidSignature()` with no further
explanation. Nothing here is guessed: the domain is read from the contract, the typehash is a number.

**Key points:**
- `readDelegationContext()` (`delegation.js:60`) reads `getDomainSeparator()`, `getNonce(attester)` and
  the chain id from the deployed BAS in one `Promise.all`. Domain and nonce are **never recomputed**,
  so if BAS changes its domain the code stays correct and a test goes red instead of a signature
  breaking in production.
- `ATTEST_TYPEHASH` (`delegation.js:37`) is stored as the digest value, deliberately not as a
  `keccak256("Attest(...)")` string: the string was never transcribed out of `EIP1271Verifier.sol`, the
  number was exercised by the fork suite. A wrong transcription then fails as `InvalidSignature`, not as
  a false pass.
- `attestDigest()` (`delegation.js:78`) encodes **every** field as one 32-byte word with
  `encodeAbiParameters` — `uint64 expirationTime`, `bool revocable` and `uint256 value` all widened.
  EIP-712 struct hashing is `abi.encode` per field; running `encodePacked` on a `uint64` produces 8
  bytes and a signature the public chain rejects while every local test stays green
  (`delegation.js:14-18`).
- Hashed field order: typehash, attester, schema, recipient, expirationTime, revocable, refUID,
  `keccak256(data)`, value, nonce, deadline → `keccak256(0x1901 ‖ domain ‖ structHash)`
  (`delegation.js:96`). Nonce is inside the digest and BAS does `_nonces[attester]++` during
  verification, so a delegation seized by a relayer is single-use.
- `data` is exactly three `bytes32` — credentialHash, courseId, lessonId (`delegation.js:52`), the shape
  the resolver decodes (`contracts/CredentialResolver.sol:338`, `BadDataLength` at `:343`); course-level
  credentials use `EMPTY_UID` for `lessonId`.
- `signDelegatedAttestation()` uses viem's `sign({ hash })`, **not** `signMessage({ message: { raw } })`
  (`delegation.js:112-118`): `signMessage` is `personal_sign` and always prefixes
  `\x19Ethereum Signed Message:\n32`, which yields a 65-byte, ECDSA-valid, chain-refused signature.
  `normalizeSignature()` (`:143`) fixes `v` as 0/1 vs 27/28 in exactly one place.
- The recover-guard (`delegation.js:122-125`) refuses to return a signature that does not recover to the
  agent's own address, and sign and relay share one object (`:101-106`): the return value is the complete
  entry — signed fields plus signature — and the broadcaster consumes exactly that. Neither is
  ceremonial: a mis-normalised `v` or a prefixed digest recovers to *some other* address, and what is
  broadcast can no longer differ from what was signed.
- `toSingleRequest()` (`:195`) and `toMultiRequest()` (`:175`) are separate builders, not one builder
  with an optional array: `attestByDelegation` takes one `AttestationRequestData` + one signature,
  `multiAttestByDelegation` takes parallel `data[]` / `signatures[]`. One shared builder sent an array
  into a struct position and produced `InvalidAddressError: Address "[object Object]"` — client-side,
  before any gas moved, which is precisely why review missed it: the batch path already worked.
  `relayDelegated()` additionally refuses a single-path call with anything but one entry (`:230`).

**Detail:**
- The gate that makes the whole design legal is on chain: `onAttest()` checks
  `_issuer[attestation.attester]`, not `msg.sender` (`contracts/CredentialResolver.sol:243`). Without
  it, a relayer broadcasting for an agent would be rejected as an unknown issuer — and any relayer
  could impersonate any agent. See [[02-Contracts/01 - Contracts]] and [[Concepts/Fronted Gas]].
- `npm run delegate` (`signer/scripts/delegate.js`) reads every claim back from the chain rather than
  from return values: `attester = AGEN, bukan penyiar` (`:197`), `saldo agen TIDAK berubah (nol gas di
  sisi agen)` (`:201`), `credentialCount` +1, `nonce agen naik N -> N+1` (`:206`), and
  `lessonOf(uid)` equal to the lesson id derived from the course material — not a pasted constant.
- The batch form was proven on the public testnet: three lesson credentials in one transaction, agent
  balance unchanged to the wei (**D36**). `relayDelegated()` does **not** parse UIDs out of logs; the
  readback goes through `attestationOf(hash)`, which proves BAS recorded the attestation *and* our
  resolver indexed it (`delegation.js:205-214`).
- The adoption step is inside the same run (`delegate.js:217-228`): the credential is watched and
  allocated the moment it is issued, so a served list can never quietly omit it. `--dry-run` stops after
  signing and says which claims it therefore did not make (`:171-175`); default deadline is 900 s
  (`:149`), and `deadline = 0` is warned about because it means "never expires" (`:150`).
- What the platform holds is timing, not authorship: it can delay or drop a broadcast, it cannot author
  or alter a claim, and the agent can always relay its own `attest()` as a fallback.

**Related:** [[S1 - The credential document]] · [[S5 - Grading and the model judge]] · [[S6 - x402 paid verification]] ·
[[02-Contracts/01 - Contracts]] · [[01-Architecture/01 - Architecture]] · [[00-Overview/03 - Decisions]] · [[Concepts/Fronted Gas]]
