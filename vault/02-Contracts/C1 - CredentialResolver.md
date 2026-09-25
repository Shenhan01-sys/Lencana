---
tags: [contract, "C1"]
---

# C1 - CredentialResolver

**Part of:** [[02-Contracts/01 - Contracts]]
**Source:** `contracts/CredentialResolver.sol:243` (admission gate) · `contracts/CredentialResolver.sol:282` (status read)

**Summary:** The only credential-layer contract we wrote; anchoring, revocation, expiry and the schema registry belong to BAS. It is an EAS
`SchemaResolver`, so BAS calls `onAttest()` **before** accepting an attestation, and a revert there rejects the whole `attest()`. It answers the
two questions the primitive cannot: is this issuer admitted, and is this attestation one of *our* credentials (`issuedHere`). It adds the
prerequisite-liveness check EAS does not perform, and holds the platform's only brake on a third-party agent (`delistIssuer`). It stores no names, no scores, no personal data, and it has no revocation power at all: EAS reserves revocation for the original attester.

**Key points:**
- `onAttest()` gates on `_issuer[attestation.attester]`, **not** `msg.sender` (`:243`), reverting `NotAnIssuer(address sender)` (`:142`).
- That single fact enables delegated issuance: BAS records the **signer** of an `attestByDelegation` request as `attester`, so our relayer pays
  the gas while the agent stays the issuer → [[00-Overview/03 - Decisions]] D31. Both directions are tested on the live deployment:
  `test/CredentialResolver.fork.t.sol:575` (a relayed credential records the agent, not the relayer) and `:610` (a *valid* signature from an
  agent we never admitted still reverts `NotAnIssuer`).
- Five reverts guard the prerequisite chain, in the order the code checks them: `PrerequisiteNotOurs(bytes32 prereqUid)` `:354` →
  `PrerequisiteRevoked` `:358` → `PrerequisiteExpired` `:360` → `PrerequisiteWrongHolder` `:362` → `PrerequisiteIssuerDelisted` `:369`. The
  delisting check is last so a more specific rejection wins.
- EAS checks a prerequisite for existence only. Proof available from inside `app/`: an unrelated uid is stopped by **EAS's** `NotFound()`
  (`test/CredentialResolver.fork.t.sol:303`), while a *revoked* prerequisite gets through EAS and is stopped by **our**
  `PrerequisiteRevoked` (`:281`). If EAS checked liveness, our error could never surface.
- `removeIssuer` (`:199`) revokes the right to issue and leaves old credentials VALID; `delistIssuer` (`:213`) additionally makes them read
  `issuerDelisted`. Two verdicts, never to be merged in the UI. `addIssuer` cannot undo a delisting
  (`DelistedCannotBeReadmitted(address issuer)` `:141`); recovery is `relistIssuer` (`:222`), and all four calls are `onlyOwner` and emit.
- `schemaUID()` is **derived, never stored**: `keccak256(abi.encodePacked(CREDENTIAL_SCHEMA, address(this), SCHEMA_REVOCABLE))` (`:165`). The
  resolver address is inside the hash, so a redeploy silently means a different schema.
  `test/CredentialResolver.fork.t.sol:197` recomputes it against the live registry and checks the stored resolver address and `revocable == true`.

**Detail:**
- `statusOf(bytes32)` (`:282`) returns seven values in one `eth_call`, no wallet and no indexer (BAS ships an Indexer for opBNB only, so BSC
  verification must be a direct read). What each field is for:

| field | read from | meaning |
|---|---|---|
| `exists` | uid known **and** `issuedHere[uid]` (`:296`) | "a credential we recognise", not "a record exists" |
| `revoked` | `a.revocationTime != 0` | the attester's own act, permanent |
| `expired` | `expirationTime != NO_EXPIRATION_TIME && block.timestamp > expirationTime` | detected with no action by anyone |
| `issuerDelisted` | `_delisted[a.attester]` (`:305`) | the platform's judgement of the issuer, recoverable |
| `issuer` | `a.attester` | the key that signed the claim |
| `issuedAt` | `a.time` | EAS record time |
| `expiresAt` | `a.expirationTime` | `0` = `NO_EXPIRATION_TIME` (`lib/bas/src/Common.sol:9`) |

- Invariant: one `credentialHash` maps to exactly one uid (`AlreadyIssued(bytes32 credentialHash)` `:249`), and every read path checks **both**
  `attestationOf != EMPTY_UID` and `issuedHere[uid]` (`:296`, `:317`). Without the second check, any attestation published under someone else's
  schema that happened to collide with our hash would read as ours.
- `_decode` requires exactly 96 bytes or reverts `BadDataLength()` (`:343`), so a future schema change fails hard instead of shifting every
  field one word; `registerSchema()` is permissionless at the registry but wrapped so a second call is loud, `SchemaAlreadyRegistered()`
  (`:154`).
- `_credentialsOf` is pushed once per issuance (`:257`) because "my certificates" cannot be rebuilt from logs on BSC. Accepted cost: unbounded
  growth per address, and `credentialsOf` (`:325`) has no pagination, so a backend still has to limit reads.
- The delisting flag only ever tightens a verdict: no input makes a dead credential read alive, which is why `onlyOwner` plus events is enough
  control (`test/CredentialResolver.fork.t.sol:491`). `revoked` is the attester's act and permanent, `issuerDelisted` is the platform's
  judgement and reversible.
- Trap that already cost time: `schemaUID()` is an external call, so writing it inside an argument list *after* `vm.prank` burns the prank and
  `attest()` then runs as the test contract. The symptom misleads badly: `NotAnIssuer(0x7Fa9...)`, an address with nothing to do with the bug.
  The uid is cached in `setUp` instead (`test/CredentialResolver.fork.t.sol:87-91`, `:139`).
- `EAS.sol` is not vendored in `app/` (only `lib/bas/src/IEAS.sol`, `ISchemaRegistry.sol`, `Common.sol`), so behaviour is asserted against the
  deployment and EAS error *selectors* are mirrored as bare declarations (`test/CredentialResolver.fork.t.sol:24-33`). Those names must match
  exactly: an error selector is its signature.
- Deployed on chain 97 at `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` by `script/DeployCredentials.s.sol:61-63` (constructor →
  `registerSchema()` → `addIssuer(issuer)`). 38 fork tests in `CredentialResolverForkTest`, from the 25 Sep run whose command is in the hub.

**Related:** [[02-Contracts/01 - Contracts]] · [[02-Contracts/C2 - SoulboundCert]] · [[01-Architecture/01 - Architecture]] ·
[[00-Overview/03 - Decisions]] · [[06-Spec-Research/01 - Spec Research]] · [[09-Testing/00 - Hub Testing]] · [[10-Contributors/Claims-Cheat-Sheet]]
