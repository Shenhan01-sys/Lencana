# 03 — Evidence and limits

The rule for this file: **every number came from a command that was run**, and "not tested" is
written as "not tested" rather than skipped.

## Proven

| command | result | meaning |
|---|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **21 passed / 0 failed** (offline, ~21 ms) | the soulbound artifact mechanics are right: transfer, approve and burn all refused; `locked()` always true; the ERC-5192 interfaceId matches; a delisted issuer's artifact is refused and returns after relisting |
| `forge test --evm-version cancun --fork-url <chain 97>` | **60 passed / 0 failed** | the whole on-chain layer works against **BAS as actually deployed on chain 97** |
| `forge test --evm-version cancun --fork-url <chain 56>` | **60 passed / 0 failed**, **identical gas** | cross-check: the primitive is the same on mainnet; the result is not a state coincidence |
| `npm run probe` in `web/` | **41 checks / 0 failed** against a live anvil fork of chain 97 (19 Sep) | the verification page reads real chain data correctly: identity, status, holder, artifact, prerequisite chain, `isIssuer`, `isDelisted`. It now walks **four verdicts on one chain**: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while its prerequisite is revoked" — the last two pairs being exactly the distinctions that used to be provable only inside forge tests |
| `forge script … --broadcast` on an anvil fork of 97 | succeeded · paid **0.0002934787 BNB** | resolver + artifact + `registerSchema()` + whitelist actually work on real chain state |
| dry-run of the same script | succeeded · **3,827,994 gas = 0.0003828 BNB** | the deploy path is ready and costs pocket change |
| `eth_getCode` + `eth_call` on BAS | 18,881 B identical on 56 and 97; `getSchemaRegistry()` answers exactly as its README table | the primitive we depend on is real and documented honestly |
| x402 agent-payment PoC | **31 tests passed** (15 unit + 8 fork 97 + 8 fork 56) | agent settlement works on BNB Chain, including settlement that costs the payer no gas |

Of the 60: 30 resolver fork tests + 9 end-to-end fork tests + 21 offline artifact tests.
Everything labelled *fork* is tested against a third party's real deployment, not a copy we made.

## Not proven — and must not be written as if it were

| claim | actual state |
|---|---|
| ❌ "our contracts are live on testnet" | Every success above is a **fork** (real state, no real transaction) or **local anvil**. We have no public address yet |
| ⚠️ "the verification page is tested end to end" | Tested against **real chain state**, which is not the same thing: no browser run, no third-party validator, and the RPC is a node we point at. Safe wording: *the page's data layer is verified against deployed contract state, including the revoked and delisted paths* |
| ❌ "our credential is compatible with the 1EdTech validator" | **Never run.** It is a target, not a result |
| ❌ "HTTP 402 payment works" | What was proven in x402 is **on-chain settlement**. A server answering `402` with a client sending a `PAYMENT` header has **never been executed** |
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
argument: `attest(refUID = uid)` for the advanced course and `revoke(uid)` for the base. Broadcasting
an estimate is what failed; and because `--slow` aborts every transaction after the first failure, the
run left the state half-built.

`--slow` was re-tested on a clean fork on 19 Sep and **does not fix it**: one `--slow` run still
completes only pass 1's work. The fix is structural and lives in the script — it records whether each
credential was already on chain *before* the process started, runs the UID-dependent steps only in
that case, and otherwise stops after the UID-free scenes and prints why. So the documented sequence
is **two runs**: the first seeds everything that needs no UID, the second reads real UIDs, finishes
the chain and the revocation, prints the report, and every run after that is a no-op. Measured on a
clean fork, then measured again by the 41-check probe.

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
