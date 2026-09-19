# 02 — Architecture and the decisions behind it

## Four layers, and who owns each

| layer | owner | contents |
|---|---|---|
| **Credential** | us (off-chain) | `OpenBadgeCredential` JSON-LD, signed by the issuer's key. **This is the credential** |
| **Anchor · revocation · expiry · timestamp** | **BAS** (third party, already deployed) | `attest()` / `revoke()` / `timestamp()` / `revokeOffchain()` — **zero Solidity written by us** |
| **Issuer authorisation + prerequisite chain** | `contracts/CredentialResolver.sol` (ours) | issuer whitelist; rejects prerequisites that are revoked / expired / belonging to someone else / not ours; `statusOf()` & `holderOf()` for verifiers |
| **Learner artifact** | `contracts/SoulboundCert.sol` (ours) | ERC-721 + ERC-5192; `mint()` refuses a credential that is not live; transfer / approve / burn all refused |

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

## Who bears the cost

> Learners pay for **the learning**. Learners do not pay for **proof of having succeeded**.

| who | buys what | recipient |
|---|---|---|
| learner | access to course modules | platform / instructor |
| **sponsoring institution** (its agent signs) | publishing a credential on chain | gas: the facilitator · price: the issuer's budget |
| recruiter / B2B | **bulk verification** via API | platform |
| **anyone** | **the truth about status** | — **free, wallet-free, forever** |

Putting the fee on the **issuer** is an anti-fraud brake: issuing a fake burns the issuer's money. If
the learner paid, the victim would be funding the fraud done to them. The real money is not here
anyway — BSC gas is pocket change; what has business value is repeated verification by parties with
a budget.

**Separate these two** (I once conflated them): *"the agent pays"* means the agent **signs**; the one
**bearing** the cost is the institution funding that wallet. What makes it an agent is **authority to
act**, not ownership of the money.

## Locked decisions

| date | decision |
|---|---|
| 13 Sep | Chain = **BSC testnet, chain ID 97**. Not opBNB: the hard requirement is an address that **resolves on BscScan**, and `opbnb.bscscan.com` is a separate instance. Mainnet 56 is still used as a **cross-check** in fork tests |
| 13 Sep | Credential primitive = **BAS**, because official EAS is not deployed on BSC |
| 13 Sep | 🔴 **Pivot: the credential is a VC / Open Badges 3.0 document; the NFT is only an artifact.** Every on-chain token standard explicitly denies credential semantics (ERC-721: *"does not define issuer, holder, subject, claim, proof, revocation, expiry, or privacy semantics; minting and burning are outside the specification"*) |
| 13 Sep | Greenfield **out of the critical path** — its testnet is reset after ~7 days, and judging happens later |
| 16 Sep | **BAS becomes the anchor**; the hand-written `IssuerRegistry` + `CredentialAnchor` are deleted (3 contracts → 2) |
| 16 Sep | **Agent = issuer, verifier = deterministic and wallet-free. Issuance cost borne by the sponsoring institution** |
| 16 Sep | OB3.0 specification read from raw files and independently re-verified (see [04-technical-reference.md](04-technical-reference.md)) |
| 17 Sep | Project name: **Lencana**. Agent name: **Issuer** |
| 17 Sep | Public repository created; documentation language = **English** |

## 🔴 One decision still open: a standard status list vs our on-chain revocation

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
| **A** ⭐ | A bitstring status list **derived from chain state** (read `revocationTime != 0` → build the bitstring → sign it as a status list credential → serve it at a URL), and the **bitstring hash recorded with `timestamp()` on BAS**, so anyone can prove the served list was not edited | Interoperable **and** non-repudiable. Honest wording: *"we serve the list; we cannot silently change its hash."* ±1–2 days |
| B | Drop `credentialStatus` (allowed — it is optional `[0..1]`) | No work, but standard verifiers never see revocation → our page is the only correct one. That is a closed platform, not public verification |
| C | A custom `type` pointing at our API | ⚠️ **Trap.** `additionalProperties: true` allows it, but §9.1 defines no behaviour for foreign types → validators **skip** the status check and tell nobody. This is B wearing A's clothes |

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
