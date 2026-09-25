---
tags: [contract, "C2"]
---

# C2 - SoulboundCert

**Part of:** [[02-Contracts/01 - Contracts]]
**Source:** `contracts/SoulboundCert.sol:107` (`mint`) · `contracts/SoulboundCert.sol:187` (`_update`, the backstop)

**Summary:** The artifact a learner sees, owns and exhibits: an ERC-721 that also declares ERC-5192 (`locked`), so a wallet can detect
"soulbound" through a standard path instead of a private convention. It is **not** the credential: the credential stays the signed
`OpenBadgeCredential` JSON and the source of truth stays the BAS attestation. What this contract adds is one guarantee, that the artifact cannot
exist unless the credential is live and cannot move once it exists. `mint()` admits exactly one caller, `owner()`, which since D30 is the
platform and not the issuing agent.

**Key points:**
- `mint(address learner, bytes32 credentialHash, string calldata uri) external returns (uint256)` (`:107`) opens with
  `if (msg.sender != owner()) revert NotIssuer(msg.sender)` (`:108`). One key can only be one address while issuers are many and third-party, so
  **the platform mints the artifact** and the agent only signs the claim → [[00-Overview/03 - Decisions]] D30/D32. The minter is public:
  `CertBound`'s fourth argument is `msg.sender` (`:139`), so never describe the artifact as "issued by the institution".
- Status and holder come from the registry, not from recomputation: one `registry.statusOf(credentialHash)` (`:119`, four destructured values)
  and one `registry.holderOf(credentialHash)` (`:130`), through `contracts/interfaces/ICredentialRegistry.sol`.
- `tokenId = uint256(credentialHash)` (`:116`) is a lossless reinterpretation of the same 256 bits, so one-credential-one-artifact is enforced by
  overlapping keys (`credentialOf` `:67`, `tokenOfCredential` `:64`) rather than by extra bookkeeping.
- Every condition a credential must satisfy to become an artifact has its own error, in the code's order:

| guard | line | error (verbatim) |
|---|---|---|
| caller is not `owner()` | `:108` | `NotIssuer(address sender)` |
| `learner` is zero | `:109` | `ZeroAddress()` |
| `uri` empty | `:110` | `EmptyURI()` |
| hash is zero | `:111` | `ZeroCredential()` |
| already bound | `:117` | `AlreadyBound(bytes32 credentialHash)` |
| `!exists` | `:120` | `CredentialNotFound(bytes32 credentialHash)` |
| `revoked` | `:121` | `CredentialRevoked(bytes32 credentialHash)` |
| `expired` | `:122` | `CredentialExpired(bytes32 credentialHash)` |
| `issuerDelisted` | `:128` | `IssuerDelisted(bytes32 credentialHash)` |
| `holderOf() != learner` | `:131` | `WrongHolder(bytes32 credentialHash, address expected, address asked)` |

- ERC-5192 is declared by hand (`:11`) because OZ 5.1.0 ships no `IERC5192`. The id `0xb45a3c0e` (`:58`) is the selector of `locked(uint256)`
  and is **recomputed** in `test/SoulboundCert.t.sol:89` against `type(IERC5192).interfaceId` rather than trusted from a note; the same test
  keeps ERC-721 (`0x80ac58cd`) detected and a foreign id not.
- Removal is total: `transferFrom` (`:164`) and `safeTransferFrom` (`:171`) revert `NotTransferable()`, `approve` (`:177`) and
  `setApprovalForAll` (`:181`) revert `NotDelegable()`. Only the 4-argument `safeTransferFrom` is `virtual` in OZ 5.1.0 and the 3-argument form
  calls it internally, so one override covers both (`test/SoulboundCert.t.sol:210`).

**Detail:**
- `_update(address to, uint256 tokenId, address auth)` (`:187`) is the structural guard: in OZ 5.x every move and every burn passes through it,
  and `from != address(0)` means transfer *or* burn, so both revert `NotTransferable()` (`:189`). Before touching anything, know that there is
  no supported way to destroy a wrongly minted artifact, not by the holder and not by us; the only remedy is to revoke the credential.
- Delisting withholds the artifact and nothing else. `revoked` stays `false`, the BAS record is untouched, and after `relistIssuer` the same
  mint succeeds with no change to the credential (`test/SoulboundCert.t.sol:153`, `:162`). Equally, revoking or expiring a credential never
  changes or removes the artifact: it becomes a historical record, not evidence of validity.
- `tokenURI` provenance: the string is written once at mint (`:135`) and returned verbatim (`:153-155`). There is no setter and no `_baseURI`,
  so the pointer is frozen at mint time and addresses a *location*, never content. No personal data reaches this contract, which is also
  ERC-721's own warning about `ownerOf` being queryable across token ids.
- `locked(tokenId)` (`:148`) is `true` for any existing token and starts with `_requireOwned` (`:149`), so an unknown id reverts OZ's
  `ERC721NonexistentToken(uint256)` (`node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol:452`).
- Trap: the error name `NotIssuer` predates the ownership split. Read it as "not the admitted artifact printer", not "not the credential's
  issuer"; the credential's issuer is the `attester` BAS recorded and never calls this contract. If agents ever mint, what changes is this
  contract (a minter set).
- Coverage: 21 offline tests in `test/SoulboundCert.t.sol` run against a **stub** registry, proving token mechanics and nothing about BAS. The
  live path is `test/CredentialEndToEndOnBsc.fork.t.sol` (9 fork tests). Stale pointer while reading: `test/SoulboundCert.t.sol:10` names
  `test/SoulboundCertOnBsc.fork.t.sol`, a file that does not exist in `test/`.
- Deployed on chain 97 at `0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c`; `script/DeployCredentials.s.sol:70` passes
  `("Lencana", "LNC", deployer)`, so the platform address is `owner()`. `script/SeedDemo.s.sol:306` mints only when
  `tokenOfCredential(hash) == 0`, which is what keeps the demo script re-runnable against `AlreadyBound`.

**Related:** [[02-Contracts/01 - Contracts]] · [[02-Contracts/C1 - CredentialResolver]] · [[01-Architecture/01 - Architecture]] ·
[[00-Overview/03 - Decisions]] · [[00-Overview/04 - Corrections]] · [[09-Testing/00 - Hub Testing]] · [[10-Contributors/Claims-Cheat-Sheet]]
