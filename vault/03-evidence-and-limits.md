# 03 — Evidence and limits

The rule for this file: **every number came from a command that was run**, and "not tested" is
written as "not tested" rather than skipped.

## Proven

| command | result | meaning |
|---|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **43 passed / 0 failed** (offline: 21 artifact + 22 settlement split) | the soulbound artifact mechanics are right: transfer, approve and burn all refused; `locked()` always true; the ERC-5192 interfaceId matches; a delisted issuer's artifact is refused and returns after relisting. The settlement tests prove the split arithmetic and its guards: rounding remainder goes to the **issuer**, `platformBps` can only ever be **lowered**, a replayed payment reference reverts, a token that returns `false` cannot fake success, a re-entrant token is refused, and a payee that rejects BNB aborts the whole distribution — platform included |
| `forge test --evm-version cancun --fork-url <chain 97>` | **90 passed / 0 failed** (23 Sep) | the whole on-chain layer works against **BAS as actually deployed on chain 97** |
| `forge test --evm-version cancun --fork-url <chain 56>` | **90 passed / 0 failed** (23 Sep), **identical gas** | cross-check: the primitive is the same on mainnet; the result is not a state coincidence |
| `npm run probe` in `web/` | **59 checks / 0 failed** against **public chain 97** (23 Sep); 51 on 22 Sep, 41 on an anvil fork (19 Sep) | the verification page reads real chain data correctly: identity, status, holder, artifact, prerequisite chain, `isIssuer`, `isDelisted`. It walks **four verdicts on one chain**: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while its prerequisite is revoked" — the last two pairs being exactly the distinctions that used to be provable only inside forge tests. Eighteen of the 59 audit **course content and grading authority** instead of the chain: unique slugs, in-range answer keys, rubrics summing to 100, the demo credential hash recomputed from the material and required to equal the attestation on chain, and every course having an issuer manifest whose `rubricHash` the credential can point at |
| `npm run inventory` in `web/` | 2 courses · 7 modules · 24 lessons · 34 pages · 412 min · 28 quiz questions · 2 essays | the learning surface is a real one and its size is a derived number. One renderer over typed content is why "many pages" did not cost many components |
| `npm run check` in `signer/` | **49 checks / 0 failed** against public chain 97 (23 Sep; 45 on 21 Sep) | An `OpenBadgeCredential` 3.0 is built and signed with `DataIntegrityProof` + `eddsa-rdfc-2022` — the cryptosuite the certification guide actually lists. Changing a score, pointing the proof at another key, or deleting the key from the issuer document each make verification fail. The status bits are read from `statusOf()` on the deployed resolver, for every credential in the store the bit is checked **at the index the document itself claims**, and re-rendering the watched set (same order or reversed) must yield the **same** hash — the property that makes an anchored hash mean anything |
| `node scripts/issue.js` in `signer/` | one command, green on **public chain 97** (21 Sep; first run on a fork 19 Sep) | score → attestation under the **agent's own key** (gas 316,384) → signed document → both status lists → bitstring hash anchored to BAS with `timestamp()` (≈45,900 gas) and **read back with `getTimestamp()`**. This is the pipeline the video needs; it is not yet four manual commands |
| `npm run delegate` in `signer/` | green on public chain 97 (22 Sep): batch `tx 0xe31a917e…`, 1,024,813 gas for three lesson credentials; single `tx 0xbe44e128…`, 370,131 gas | **the agent signs, the platform broadcasts.** Read back from chain, not from the script's return value: recorded `attester` = the agent's address, the **agent's balance unchanged to the wei**, `lessonOf(uid)` equals the lesson id derived from the course material, the attester nonce advanced exactly once per request, and the learner's `credentialCount` grew. This is what turns "third-party AI issuers that hold no BNB" from a plan into a demonstrated property — and it works only because `onAttest` gates the *attester*, not `msg.sender` |
| `npm run anchor` in `signer/` | idempotent; two later measurements both reported **hash unchanged** while the watched set grew 5 → 8 → 9 | measured limit, stated rather than glossed: the bitstring is a fixed 2048 bytes, so an anchor witnesses **which bits are set**, not **who is in the list**. Membership is witnessed elsewhere — `/healthz` reports `watched`, `flagged`, `unallocated`, and a check requires every watched credential to be recognised on chain |
| `npm run probe:serve` in `signer/` | **20 checks / 0 failed** against the running server over HTTP, against public chain 97 (21 Sep; 19 on a fork 19 Sep) | Same assertions over HTTP — the difference between "a function that signs" and "URLs a third party can open". The issuer document is fetched, and each status list is verified against the key **that response** publishes |
| `forge script … --broadcast` on an anvil fork of 97 | succeeded · paid **0.0002934787 BNB** | resolver + artifact + `registerSchema()` + whitelist actually work on real chain state |
| dry-run of the same script | succeeded · **3,827,994 gas = 0.0003828 BNB** | the deploy path is ready and costs pocket change |
| `forge script … --broadcast` on **public chain 97** (21 Sep) | succeeded · 4,191,202 gas ≈ **0.00042 BNB**; re-verified from the RPC by a separate script, **13/13** | the credential layer is live on the public testnet — `CredentialResolver 0x7CA624…`, `SoulboundCert 0xA5eB80…`, schema UID registered in the **public** BAS registry pointing at our resolver. A build log printing `SUCCESSFUL` is not evidence, which is why the re-verification reads code, `owner`, `isIssuer`, `isDelisted`, `credentialCount` and the registry record over plain RPC. ⚠️ Source verification on the explorer is **not** available (BscScan V1 deprecated, Etherscan V2 for BSC paid): the address resolves and is readable, that is all that is claimed |
| `eth_getCode` + `eth_call` on BAS | 18,881 B identical on 56 and 97; `getSchemaRegistry()` answers exactly as its README table | the primitive we depend on is real and documented honestly |
| x402 agent-payment PoC | **31 tests passed** (15 unit + 8 fork 97 + 8 fork 56) | agent settlement works on BNB Chain, including settlement that costs the payer no gas |
| `SettlementSplit` against the **real** x402 stack | 7 fork tests on chain 97 **and** 56, using canonical Permit2 + canonical `x402ExactPermit2Proxy`: settlement lands in our split, then divides 90/10, and the client's transaction count never moves | this is the "not a mock" layer: the contracts being called are the ones anyone else would call, at their real addresses, verified by their own on-chain constants |
| `forge script script/PaidVerificationDemo.s.sol --broadcast` on **public chain 97** (23 Sep) | executed · **2,806,675 gas paid by the platform** · settlement tx `0x32fb6fc0…` status 1 · token `0xEd19cDeB…`, split `0xcB00E62B…` | a real payment reached our split contract and was divided. Read back over RPC rather than trusted from the script: issuer holds `900`, platform gained `100`, split holds `0`, `splitDone(ref) = true`, `platformBps() = 1000`, and the settlement receipt's logs are exactly `Approval(client→Permit2)` → `Transfer(client→split)` → `SettledWithPermit` from the canonical proxy. The client held **no BNB and sent no transaction** |

Of the 97: 21 offline artifact + 22 offline settlement-split + 38 resolver fork + 9 end-to-end fork + 7 settlement fork. **The number to quote is whatever `forge test` prints today** — it is not maintained in prose anywhere else, and the count is not a claim about quality either way.
Everything labelled *fork* is tested against a third party's real deployment, not a copy we made.

## Not proven — and must not be written as if it were

| claim | actual state |
|---|---|
| ✅ ~~"our contracts are live on testnet"~~ → **they are**, since 21 Sep | `CredentialResolver` + `SoulboundCert` are on **public chain 97** (§D of 04, re-read from the RPC by a separate script 13/13, and the address resolves in `testnet.bscscan.com` — confirmed by eye 22 Sep, since BscScan returns 403 to our tooling). What is *not* true: nothing is on **mainnet (56)**, and no source is verified on an explorer (V1 API deprecated, V2 paid) |
| ⚠️ "the verification page is tested end to end" | Tested against **real chain state**, which is not the same thing: no browser run, no third-party validator, and the RPC is a node we point at. Safe wording: *the page's data layer is verified against deployed contract state, including the revoked and delisted paths* |
| ❌ "our credential is compatible with the 1EdTech validator" | **Never run.** It is a target, not a result |
| ❌ "verifikasi berbayar sudah dipakai orang" | Uang benar-benar mengalir on-chain lewat split (lihat tabel Proven), tapi sisi **HTTP belum pernah jalan**: server menjawab `402 Payment Required`, klien membayar, `PAYMENT-RESPONSE` kembali. Selain itu, pada uji nyata kitanyalah yang **memainkan peran fasilitator** — di produksi itu pihak ketiga yang membayar gas — dan tokennya koin demo ber-`mint` terbuka dengan label yang jelas. Kalimat yang benar: *"jalur uang bekerja on-chain"*, bukan *"verifikasi berbayar sudah live"* |
| ❌ Indonesian e-learning market figures | **Zero primary evidence**, not shrunken numbers. Do not fill with guesses |
| ❌ "no competitors in this niche" | Credentialing competitors (POAP / Galxe / Layer3 / Sismo / Gitcoin Passport) were **never researched**. The "no competitors" claim rests only on four scraped submissions |
| ⚠️ "BAS is a well-maintained project" | Its addresses are alive, but the repo has 3 stars and its last functional commit is May 2024 |

## Solved: the seed script that could not finish in one run

`script/SeedDemo.s.sol` used to leave incomplete demo state: the base credential read ACTIVE while
the advanced credential and the revocation never landed. The suspicion recorded here for two days
("probably our own `AlreadyIssued` guard firing under `--slow`") was **wrong**.

The confirmed cause is the primitive, not our code. An EAS UID is
`keccak256(schema, recipient, attester, block.timestamp, expirationTime, revocable, refUID, data, bump)`
— it contains the timestamp of the **mined** transaction. A script can only ever hold a simulation
estimate for a credential it is creating in the same process, and two steps need that value as an
argument: `attest(refUID = uid)` for the advanced course and `revoke(uid)` for the base. Both revert with
EAS's **`NotFound()`** (selector `0xc5723b51`; `EAS.sol:468-472` for the refUID check, `:517-520` for the
revoke check), and the failure then *cascades*: the artifact mint of the advanced credential dies next
with our own `CredentialNotFound(bytes32)` (`0x0d99a0d1`) because that attestation never landed.
Broadcasting an estimate is what failed; and because `--slow` aborts every transaction after the first
failure, the run left the state half-built.

`--slow` was re-tested on a clean fork on 19 Sep and **does not fix it**: one `--slow` run still
completes only pass 1's work. The old "3 failing transactions → 1" figure is now explained rather than
remembered: the first failure was the UID-guessing `attest`, so each fix upstream changed how many
transactions were left to fail — that number was never measuring a single cause. The fix is in our code,
not in a flag: the script records whether each credential was already on chain *before* the process
started, runs the UID-dependent steps only in that case, and otherwise stops after the UID-free scenes
and prints why. So the documented sequence is **two runs**: the first seeds everything that needs no UID,
the second reads real UIDs, finishes the chain and the revocation, prints the report, and every run after
that is a no-op. Measured on a clean fork, then measured again by the 41-check probe.

The general rule taken from this: **a script may consume hashes, which it can compute, but never
UIDs, which only the chain knows.** Every input the page and the probe take is a credential hash for
exactly that reason.

## Claims we forbid ourselves

Not style advice. Each of these was disproven by a specification or by our own tests:

| claim | why it is banned |
|---|---|
| "The certificate is legally / institutionally **valid**" | "Valid" implies legal recognition. **Zero basis.** What we can say: *cryptographically verifiable and publicly auditable* |
| "The certificate **cannot be forged**" | Only signature authenticity + anchor existence are proven. **The claim's content is not evaluated.** VC 2.0: *"Verification of a credential does not imply evaluation of the truth of claims encoded in the credential."* |
| "Soulbound prevents screenshots" | What binds is an **address**, and metadata can be mutable/off-chain. Badge images can be copied |
| "Proven that this person studied" | DID Core: *"cryptographic proof alone is insufficient for high-assurance identity decisions"* |
| "Only a legitimate issuer can mint **because it is an NFT**" | Not a property of any token standard: ERC-721 *"minting and burning are outside the specification"*. What blocks it is **our whitelist** |
| "Learner data is private **because it is on-chain**" | ERC-721: *"privacy cannot be achieved if `ownerOf` can be queried across token IDs"*. Which is why **no personal data is ever on chain** — only a credential hash and a course id |
| "Non-repudiable revocation is our invention" | It is **built-in EAS/BAS behaviour**. We use it; we did not find it |
| "Trustless" / "zkML-verified" / "TEE-verified" | No equivalent we can run on BSC in this window, and ERC-7857 would require `IERC7857DataVerifier` + a Sealed Executor, which we do not implement |
| "BAS is an official BNB Chain programme" | That claim does not exist in its repository |
| "Compatible with the 1EdTech validator" | Never run |

## What we MAY claim — and it stays strong

1. Credentials follow **W3C VC Data Model 2.0** and are shaped as **Open Badges 3.0** (Final Release
   since 27 May 2024) → portable to any verifier that understands the standard.
2. **Issuer identity** is bound to the key that signed the document **and** registered in a public
   contract that resolves on BscScan.
3. **Existence and issuance time** are provable from a hash + block and **cannot be edited
   retroactively**.
4. **Revocation cannot be disavowed**: once revoked, permanently readable as revoked.
5. **Verification needs no wallet, account or crypto** — a browser is enough, and we print the
   commands so the check can be repeated without our page.
6. **Stated limits**: this system does not prove a claim is true, does not prove the human behind an
   address, and does not prevent copying the display.

Point 6 is not a concession. It is why points 1–5 can be believed.
