# 02 — Architecture and the decisions behind it

## Four layers, and who owns each

| layer | owner | contents |
|---|---|---|
| **Credential** | us (off-chain) | `OpenBadgeCredential` JSON-LD, signed by the issuer's key. **This is the credential** |
| **Anchor · revocation · expiry · timestamp** | **BAS** (third party, already deployed) | `attest()` / `revoke()` / `timestamp()` / `revokeOffchain()` — **zero Solidity written by us** |
| **Issuer admission + prerequisite chain + delisting** | `contracts/CredentialResolver.sol` (ours) | issuer whitelist; rejects prerequisites that are revoked / expired / belonging to someone else / not ours / **issued by a delisted agent**; `delistIssuer()` as the only brake the platform has over a third-party issuer; `statusOf()` & `holderOf()` for verifiers |
| **Learner artifact** | `contracts/SoulboundCert.sol` (ours) | ERC-721 + ERC-5192; `mint()` refuses a credential that is not live; transfer / approve / burn all refused. **Minted by the platform, not by the agent** — `mint()` admits one owner while issuers are many and third-party (D30) |

```
OpenBadgeCredential JSON  --keccak256-->  credentialHash
                                                 |
                                                 v   attest(schemaUID, abi.encode(hash, courseId, lessonId))
                              BAS on BNB Chain (a fork of EAS 1.3.0, someone else's)
                                    ^
                                    | EAS calls onAttest() BEFORE the attestation is accepted
                          CredentialResolver (ours)   <-- whitelist + revocation-aware chain
                                    |
                    statusOf(hash) / holderOf(hash)   <-- ONE eth_call, no wallet
                                    |
                          SoulboundCert.mint(learner, hash)   <-- refuses a dead credential
```

**The thing not to reverse in your head:** the credential is the **JSON document**, not the NFT. The
chain does only three things JSON cannot — an issuer registry that cannot be censored, a status bit
the issuer cannot hide, and a timestamp. The NFT is the artifact the learner holds.

## Why BAS, and not a contract we wrote

The original plan (13 Sep) was to write `IssuerRegistry.sol` + `CredentialAnchor.sol` from scratch.
After reading `EAS.sol` in the BAS fork and testing it with `eth_call` against the real deployment,
**both of those contracts were duplicating properties this primitive already guarantees**:

| what we planned to write | already in BAS/EAS | property |
|---|---|---|
| `anchor(hash) -> {block, time}` | `timestamp(bytes32)` / `getTimestamp(bytes32)` | **write-once** — `_timestamp` reverts `AlreadyTimestamped()` if already present |
| `revoke(hash)` with no `unrevoke` | `revoke(bytes32 uid)` on the attestation, plus `revokeOffchain(bytes32)` | **write-once**; `revokeOffchain` is also **bound to the revoking address**, so each issuer's status is independent |
| validity status | `Attestation.revocationTime`, `.expirationTime` | native |
| schema registry | `SchemaRegistry.getSchema(uid)` | permissionless, **no fee** |

Decision: **use BAS as the anchor.** We write only the layer no primitive provides — which turns out
to be the actual product.

### 🔴 The real EAS gap we close — this is the technical differentiator

EAS tests a prerequisite for **existence only**:

```solidity
// EAS.sol, _attest()
if (request.refUID != EMPTY_UID) {
    if (!isAttestationValid(request.refUID)) { revert NotFound(); }
}
// and
function isAttestationValid(bytes32 uid) public view returns (bool) { return _db[uid].uid != EMPTY_UID; }
```

So **without an extra layer**, EAS lets an advanced certificate be issued on top of a prerequisite
that is **revoked**, **expired**, **someone else's**, or simply an unrelated attestation. All four
are rejected by `CredentialResolver._validatePrerequisite()`, and each rejection is **proved in fork
tests on two chains**.

Consequence for our wording: *"non-repudiable revocation"* is **default EAS/BAS behaviour, not our
finding**. Ours: the issuer whitelist, the revocation-aware prerequisite chain, and one-call
wallet-free verification.

## Lesson-level granularity (added 19 Sep, before any public deploy)

A course has many lessons, and the course certificate is the accumulation of them. The schema
therefore carries **three** fields:

```solidity
string public constant CREDENTIAL_SCHEMA = "bytes32 credentialHash,bytes32 courseId,bytes32 lessonId";
// _decode() rejects anything that is not exactly 96 bytes -> BadDataLength
```

`lessonId == 0` means a course-level credential. Lessons chain through the **same** `refUID`
mechanism as courses, so "lesson 3 cannot be issued if lesson 2 was revoked" comes free from code
that was already proven — no new mechanism was invented for it.

Two things deliberately stay **off-chain**:

- **Scores.** Raw marks are personal data. They live in the signed VC document, in the standard's
  own fields: `credentialSubject.result[]` (`Result` = `type`, `achievedLevel`, `alignment`,
  `resultDescription`, `status`, `value`) for the results, and `achievement.criteria` (required) for
  the rubric. Only the document's hash reaches the chain.
- **Names.** See the privacy decision below.

What *was* added on-chain, in the same window, because the resolver is effectively write-once:
`lessonOf(uid)` and a per-holder index `credentialsOf(address)` / `credentialCount(address)`. The
index exists because **BAS ships no Indexer for BSC** (only opBNB), so "my certificates" cannot be
built from logs. Known cost, accepted: one array push per issuance, unbounded growth per address,
so the backend must still paginate.

### Privacy: pseudonymous by default, named by choice

The standard is **deliberately asymmetric** here — read from `ob_v3p0_achievementcredential_schema.json`:

| class | name fields? |
|---|---|
| `Profile` (used for `issuer`) | ✅ `name`, `givenName`, `familyName`, `email`, `phone`, `url`, `image`, `address`, `dateOfBirth`, … |
| `AchievementSubject` (the learner) | ❌ **no `name` at all** |

The learner is identified by `id` (an IRI) and/or `identifier[]`, where `IdentityObject` is
`{type, hashed, identityHash, identityType, salt}` with `type/hashed/identityHash/identityType`
required — i.e. **hashed identity plus salt, never plaintext**.

So the disclosure choice is ours to design, in three levels:

| level | what a verifier sees | where the name lives |
|---|---|---|
| **pseudonymous** (default) | the address only | nowhere |
| **named** | name, photo, LinkedIn link, and a badge image carrying the name | `AchievementSubject.id` points at a **learner-controlled `Profile` document**; the name is rendered into the badge `image` |
| **named + provable** | a recruiter types the candidate's email → matched against `identityHash` + published `salt` → confirmed, **without us ever storing the plaintext** | `identifier[]` |

We deliberately do **not** bake a `displayName` into the credential even though
`additionalProperties: true` would allow it: a name inside a signed document **cannot be changed
without re-issuing**, and third-party validators may ignore custom fields. Pointing at a profile
keeps the learner in control and stays 100% standard.

**Three limits that must appear in the UI, not in a FAQ:**

1. **"Anonymous" on a chain can only mean pseudonymous.** `attestation.recipient` is a public
   address forever and `holderOf()` returns it. Hiding it in our UI does not make it unreadable, so
   the label must be **"pseudonymous (address only)"** vs **"named"** — never "anonymous".
2. **`named` is forever.** Once a name is inside a signed, publicly hosted document, **revocation
   does not retract it**. Hence pseudonymous as the default, and the warning appears **at the moment
   of choosing**.
3. **Changing the choice means re-issuing**, not editing: new document → new hash → new attestation,
   old one revoked. Our revocation-aware chain makes that clean.

This feature has **zero on-chain footprint** — it lives entirely in the signed document — so it did
not compete with the schema window above.

## `schemaUID` is derived, not stored

UID schema = `keccak256(abi.encodePacked(string schema, resolver address, revocable))`. Therefore:

- it can be computed **before** registering (that is what `schemaUID()` does);
- **the resolver's address is part of it** → a re-deploy silently creates a different schema, and
  old verifiers stop recognising already-issued credentials. The resolver cannot be "fixed quietly"
  by redeploying. Record the address and the UID after deploying.

## The issuer's chain of trust

One key appears in three places, on purpose:

| place | field |
|---|---|
| credential document | `issuer` (a **required** property in the OB3.0 schema) |
| attestation on chain | `attester` — the column the verification page reads via `statusOf()` |
| whitelist | `CredentialResolver.isIssuer(address)` |

The word is **`Issuer`**, not `Attester` and not `Validator`:

- ~~`Attester`~~ — it is indeed the EAS column name, **but** "Attester" is a standard role in **TEE
  remote attestation** (IETF: Attester / Verifier / Relying Party) and in **Proof-of-Stake**. Naming
  our agent that invites "so you use a TEE?" — which we cannot and will not claim.
- ~~`Validator`~~ — doubly overloaded: a PoS validator, and ERC-8004's `ValidationRegistry`, which we
  deliberately do not fill with real validation.
- ✅ `Issuer` — because **that is literally the field name in the credential document**. UI label,
  document field and contract property become the same word, with nothing lost in translation.

## The agent's role: issuer, **never** verifier

| | who | why |
|---|---|---|
| assess and sign | **AI agent** | the side allowed to be subjective, and the side that makes this an agent project |
| verify | **static deterministic page** | what we sell to a verifier is not an opinion but *"you can repeat this and get the same answer"* |

If the verifier uses AI, the product's value disappears: one probabilistic step in the verification
path turns "cryptographically verifiable" into "probably right". Legitimate: the agent as the
verifier's **assistant** (explaining, batching) — never as the source of truth.

**Bounds on agent claims** (fixed, do not raise them): we may write *"a machine issuer with an
auditable public key, whose issuance log cannot be edited retroactively"*. We may **not** write
*"trustless"*, *"reputation proven on-chain"*, *"the agent cryptographically validates itself"*, or
*"TEE/zkML-verified"*.

## Who owns the agent, and who pays for issuance

**We do not own the agents.** Each agent is deployed, hosted and keyed by its own owner. Lencana is
the venue they work in, and the owner of the rules they must satisfy.

| role | who | what they own | what we own over them |
|---|---|---|---|
| **agent owner / deployer** | third party | the agent's code, model, infrastructure, **issuing key**, ERC-8004 identity NFT | **nothing** — we do not host it and never hold its key |
| **course creator / institution** | third party | course material, rubric, assessment task | the venue, and a revenue share |
| **learner** | user | their wallet; pays enrolment plus x402 to the agent | — |
| **Lencana (us)** | platform | schema, resolver, **admission**, soulbound artifact, verification page, payment rail | ← **this is the product** |

This *strengthens* the pitch rather than weakening it. ERC-8004 reputation is live on chains 97 and
56 and attaches to the **agent's own** identity NFT, so an agent arrives carrying portable
reputation that learners can compare on real numbers. The honest submission line:
*"Lencana does not own the agents. It owns the rules they must satisfy."*

### The hard constraint this creates — read from source, not assumed

Because the issuer is someone else's agent, there is something we assumed we could do and cannot:

```solidity
// EAS.sol, _revoke()  — "Allow only original attesters to revoke their attestations."
if (attestation.attester != revoker) {
    revert AccessDenied();
}
```

`revokeByDelegation()` does not help either: it routes through the same `_revoke()`, and what
`_verifyRevoke()` checks is an EIP-712 signature **from that attester**. Nor can an agent
pre-authorise revocation at onboarding — `RevocationRequestData` carries a `uid`, and the uid of an
attestation that does not exist yet **cannot be known in advance**. There is no blanket
authorisation in EAS.

**So the platform has no revocation power over a third-party agent at all.** Without a countermeasure
a rogue agent — or one whose key leaked — would keep reading `VALID` on our own verification page
forever. That is precisely the failure this product exists to remove.

### The countermeasure: two flags, two verdicts

| action | new issuance | already-issued credentials | verdict |
|---|---|---|---|
| `removeIssuer()` | refused | **stay VALID** | `VALID` |
| `delistIssuer()` | refused | marked | **`ISSUER_DELISTED`** |

The split is deliberate: an agent that leaves amicably must not invalidate thousands of alumni
certificates; an agent that misbehaved must be suppressible. `addIssuer()` **cannot** readmit a
delisted agent (`DelistedCannotBeReadmitted`) — readmission is a separate, event-emitting act so the
governance trail is never a side effect.

Delisting also reaches the prerequisite chain (`PrerequisiteIssuerDelisted`). Without that it would be
cosmetic: a bad agent's credential could still unlock advanced credentials **through a different,
healthy agent** — which is exactly what happens when a learner switches agent mid-course.

**Why this power is safe rather than arbitrary censorship:** its direction is **failsafe**. It can
only ever make a verdict *stricter*, never looser; no input makes a dead credential read alive. It is
`onlyOwner`, it emits, and it is reversible via `relistIssuer()` — all tested, not merely asserted.

**What must not be claimed:** "the platform can revoke problematic credentials" (it cannot, and a test
proves it) · showing delisting as "revoked" (`revocationTime` stays `0` on chain, so anyone can
disprove that in one `eth_call`) · "trustless admission" (the whitelist **is** centralised curation —
that is our value, so say so plainly).

### 🔗 This also answers the open status-list decision

If the bitstring status list is derived **from chain state** (option A below), a delisted issuer's
credentials get their bits set too — so **third-party Open Badges verifiers see the delisting as
well**. Without the flag, delisting would only ever appear on our own page and option A would lose
much of its point. Two decisions taken separately turn out to close each other.

### Gas: fronted by the platform, recovered from the agent's share

Naively, "we pay the gas" means **we send `attest()`** — and EAS records `msg.sender` as the attester,
so *we* would become the issuer and the third-party agent would lose its role entirely. The correct
route already exists:

```solidity
// EAS.sol
function attestByDelegation(DelegatedAttestationRequest calldata delegatedRequest)
    external payable returns (bytes32)
{
    _verifyAttest(delegatedRequest);
    ...
    return _attest(delegatedRequest.schema, data, delegatedRequest.attester, msg.value, true).uids[0];
}                                              // ^^^^^^^^^^^^^^^^^^^^^^ the SIGNER, not msg.sender
```

The agent signs an EIP-712 delegation off-chain — **free, and it needs no BNB at all** — our relayer
sends it and pays the gas, and `attestation.attester` stays the **agent's address**. Whitelist,
delisting, prerequisite checks and revocation rights all keep attaching to the right party.

Parameters verified from source, so the relayer never guesses — and since 19 Sep **every one of them
is also executed against the BAS deployment itself** by 8 fork tests
(`test_fork_Delegasi_*` / `test_fork_BatchDelegasi_*`, chain 97 and 56):

| item | value |
|---|---|
| EIP-712 domain | `EIP1271Verifier("EAS", "1.3.0")` → name `"EAS"`, version `"1.3.0"`; the tests read `getDomainSeparator()` from the contract instead of computing it, so a domain change fails a test rather than producing bad signatures in production |
| `ATTEST_TYPEHASH` | `0xfeb2925a02bae3dae48d424a0437a2b6ac939aa9230ddc55a1a76f065d988076` — hard-coded in the test, deliberately, so a wrong transcription surfaces as `InvalidSignature` instead of a false pass |
| hashed field order | attester, schema, recipient, expirationTime, revocable, refUID, **`keccak256(data.data)`**, value, nonce, deadline |
| nonce | per attester, auto-incremented **inside** the hash (`_nonces[attester]++`), readable via `getNonce(address)`; a batch of 3 raises it by exactly 3 (tested) |
| 🔑 interacts with our whitelist | ✅ `CredentialResolver.onAttest()` gates on `_issuer[attestation.attester]` — the **attester**, not `msg.sender`. Without this, D31 would be impossible: a relayer broadcasting on an agent's behalf would be rejected as an unknown issuer, and — worse — any relayer could impersonate any agent. Both directions are now tested: a valid signature from an unadmitted agent reverts `NotAnIssuer`, and a correctly-relayed credential records the agent as its issuer |
| forged signature | ✅ rejected `InvalidSignature()` (tested) — a delegation is not a way to speak for an agent |
| expiry | ✅ `deadline != NO_EXPIRATION_TIME && deadline < _time()` → `DeadlineExpired()` (tested). **`deadline = 0` means never expires** — use ~15 min |
| agent's own escape hatch | ✅ `increaseNonce(newNonce)` — takes the new value, and invalidates every unused delegation below it (tested). It does **not** lock the agent out: a fresh signature at the new nonce still works |
| contract wallets | ✅ `SignatureChecker.isValidSignatureNow` → **EIP-1271**, so an agent owned by a Safe works |
| batching | ✅ `multiAttestByDelegation` — every lesson of a course in **one** transaction (tested) |
| does it bypass our rules? | ✅ No: a delegated issuance chaining onto a **revoked** prerequisite still reverts `PrerequisiteRevoked` (tested). Delegation changes who pays, never what is allowed |

**Economics — do not over-engineer.** BSC gas per attestation is **sub-cent** (deploying every
contract we wrote costs 0.0003828 BNB). Recovery therefore needs no precision: a flat platform
percentage in `PaymentSplitter`, sized above the expected gas, is enough. **No debt ledger.** The
recorded risk, not built against: an agent that issues a lot but earns little puts us net negative.

**Framing discipline — soften the UX, not the numbers.** To an *agent*, "you never touch gas" is true
and is a real selling point: **zero-BNB onboarding**. In the *submission*, do not hide it —
"the platform fronts issuance gas and recovers it through a fixed share of x402 fees" is a good answer
because it is clear unit economics.

**Limits this adds (they belong in the UI, not a FAQ):**

1. **The relayer can censor.** We see every delegation before it lands and can drop or delay it. We
   **cannot** forge or alter one — it is signed. And the agent can always relay its own `attest()` as
   a fallback, so the censorship is not total.
2. **A leaked delegation is a bearer instrument.** Whoever holds it can submit it and pay the gas.
   The damage is limited to *when*, never *what*, and its nonce is single-use. Mitigation: short
   `deadline`, never `0`.
3. **The relayer wallet becomes critical infrastructure** and a target. For the hackathon: a testnet
   key holding no real funds.

### Who bears which cost

> Learners pay for **the learning**. Learners do not pay for **proof of having succeeded**.

| who | buys what | recipient |
|---|---|---|
| learner | access to course modules | platform / instructor |
| learner | an agent's help inside a course (x402, per session) | **agent owner**, minus the platform share |
| **platform** | gas to publish a credential — fronted, then recovered from that share | relayer wallet |
| recruiter / B2B | **bulk verification** via API | platform |
| **anyone** | **the truth about status** | — **free, wallet-free, forever** |

Putting issuance cost nowhere near the learner is an anti-fraud brake: the party that benefits from
issuing is the party whose money moves. If the learner paid, the victim would be funding the fraud
done to them. The real money is not here anyway — BSC gas is pocket change; what has business value is
repeated verification by parties with a budget.

**Separate these two** (I once conflated them): *"the agent signs"* is about **authority to act**;
*"who bears the cost"* is about whose wallet moves. Under the delegation route they are now cleanly
apart: the agent signs, the platform pays, and the platform's share of the agent's x402 revenue makes
it whole.

There is a **third** axis, and it was discovered by measurement rather than by design: *who mints the
soulbound artifact*. `SoulboundCert.mint()` accepts exactly one caller — its `owner()`. Since D30 the
issuers are many and none of them is us, so one issuance key cannot also be the artifact key for all
of them. The split that survived: **the agent's claim is the attestation, the NFT is the platform's
presentation of it**, minted by the platform's key. Do not describe the artifact as "issued by the
institution" — on chain its minter is us, and that is publicly visible.

## Locked decisions

| date | decision |
|---|---|
| 13 Sep | Chain = **BSC testnet, chain ID 97**. Not opBNB: the hard requirement is an address that **resolves on BscScan**, and `opbnb.bscscan.com` is a separate instance. Mainnet 56 is still used as a **cross-check** in fork tests |
| 13 Sep | Credential primitive = **BAS**, because official EAS is not deployed on BSC |
| 13 Sep | 🔴 **Pivot: the credential is a VC / Open Badges 3.0 document; the NFT is only an artifact.** Every on-chain token standard explicitly denies credential semantics (ERC-721: *"does not define issuer, holder, subject, claim, proof, revocation, expiry, or privacy semantics; minting and burning are outside the specification"*) |
| 13 Sep | Greenfield **out of the critical path** — its testnet is reset after ~7 days, and judging happens later |
| 16 Sep | **BAS becomes the anchor**; the hand-written `IssuerRegistry` + `CredentialAnchor` are deleted (3 contracts → 2) |
| 16 Sep | **Agent = issuer, verifier = deterministic and wallet-free.** ~~Issuance cost borne by the sponsoring institution~~ — **superseded 19 Sep**, see below |
| 16 Sep | OB3.0 specification read from raw files and independently re-verified (see [04-technical-reference.md](04-technical-reference.md)) |
| 17 Sep | Project name: **Lencana**. Agent name: **Issuer** |
| 17 Sep | Public repository created; documentation language = **English** |
| 19 Sep | **Agents are third-party owned; Lencana is only the venue.** The agent itself is the `attester`, holding its own key |
| 19 Sep | **`delistIssuer()` added before any public deploy.** EAS gives the platform no revocation power over a third-party attestation, so delisting is the only brake — and it is a **distinct verdict from `revoked`**. `statusOf()` widened to 7 values |
| 19 Sep | **Issuance gas fronted by the platform via `attestByDelegation`**, recovered from the platform's share of x402 fees. Off-chain only — no contract or `schemaUID` impact |
| 19 Sep | **The platform mints the artifact; the agent only signs the claim.** Found by measuring, not by designing: `SoulboundCert.mint()` admits one `owner()`, which cannot be "each third-party agent". `DeployCredentials` now passes the deployer, not the issuer |
| 19 Sep | **`SeedDemo` is documented as two runs.** An EAS UID contains the mined `block.timestamp`, so no single script run can chain or revoke on a UID it just created. `--slow` was re-tested and does **not** fix it; the script now refuses to broadcast a guessed UID |

## ✅ D24.1 — DECIDED 19 Sep: option A, a bitstring status list derived from chain state

> Taken by the builder on 19 Sep. `signer/` is the implementation; the numbers below are its
> measured state, not a plan. Two things are still open inside A and are named as tasks, not hidden
> in prose: the hash of each served bitstring is **not yet** recorded on BAS via `timestamp()`, and
> the document has **not yet** passed `https://vc.1ed.tech`. Until the second one happens, the word
> to use is "built to the specification", never "interoperable".

An Open Badges verifier **does not read the chain**. Status checking is defined for exactly one type:

> *"A Credential is revoked if the credentialStatus property is present, and the type of the
> CredentialStatus object is `BitstringStatusListEntry`, and if the Credential has been revoked as
> shown in Bitstring Status List v1.0."* — OB3.0 §9.1

If we do not join that to our chain state, the consequence is specific and bad: **our credential
passes a third-party validator while showing "ACTIVE" for a certificate we already revoked on
chain** — exactly the failure this product claims to remove, now demonstrated by someone else's
tool.

| option | contents | cost |
|---|---|---|
| **A** ⭐ **← BUILT** | A bitstring status list **derived from chain state** — read `revocationTime != 0` **and `isDelisted(attester)`**, build the bitstring, sign it as a status list credential, serve it at a URL — and the **bitstring hash recorded with `timestamp()` on BAS**, so anyone can prove the served list was not edited | Interoperable **and** non-repudiable. Honest wording: *"we serve the list; we cannot silently change its hash."* **Bonus since 19 Sep:** because the list is derived from chain state, platform **delisting also reaches third-party verifiers** — otherwise it would only ever appear on our own page. ⚠️ Refined while building: that bonus needs **two** lists (`revocation` + `suspension`), not one — see the note below the table |
| B | Drop `credentialStatus` (allowed — it is optional `[0..1]`) | No work, but standard verifiers never see revocation → our page is the only correct one. That is a closed platform, not public verification |
| C | A custom `type` pointing at our API | ⚠️ **Trap.** `additionalProperties: true` allows it, but §9.1 defines no behaviour for foreign types → validators **skip** the status check and tell nobody. This is B wearing A's clothes |

**What building it changed about the plan.** Option A was written as *one* list whose bits come from
`revocationTime != 0` **or** `isDelisted(attester)`. That would have thrown away the one thing D30 was
built to create: EAS revocation is permanent, delisting is recoverable, and a single bit cannot say
both. The Bitstring Status List spec already offers the vocabulary — `revocation` is *"not
reversible"*, `suspension` is *"reversible"* — and allows more than one `credentialStatus` entry per
credential, so `signer/` publishes **two** lists and the credential references both. The distinction
therefore survives the trip through a third party's tool instead of collapsing at our border.

One thing is deliberately **not** in any list: expiry. The document carries `validUntil` and verifiers
read that themselves; encoding expiry a second time in a bitstring creates two sources of truth that
are allowed to disagree.

## Third-party addresses (verified, not copied from docs)

| | chain 97 (testnet) | chain 56 (mainnet) |
|---|---|---|
| BAS core | `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD` | `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC` |
| SchemaRegistry | `0x08C8b8417313fF130526862f90cd822B55002D72` | `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa` |
| BAS core bytecode size | 18,881 B | 18,881 B — **identical** |

Both confirmed by `eth_getCode` **and** by an `eth_call` to `getSchemaRegistry()` returning the same
address as the repo's deployment table. **Do not write "official BNB Chain programme"** — no such
claim exists in that repository, which also has 3 stars and a last functional commit in May 2024. We
rely on it not because it is popular but because **we tested the address ourselves**.
