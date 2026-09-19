# 03 — Evidence and limits

The rule for this file: **every number came from a command that was run**, and "not tested" is
written as "not tested" rather than skipped.

## Proven

| command | result | meaning |
|---|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **21 passed / 0 failed** (offline, ~21 ms) | the soulbound artifact mechanics are right: transfer, approve and burn all refused; `locked()` always true; the ERC-5192 interfaceId matches; a delisted issuer's artifact is refused and returns after relisting |
| `forge test --evm-version cancun --fork-url <chain 97>` | **60 passed / 0 failed** | the whole on-chain layer works against **BAS as actually deployed on chain 97** |
| `forge test --evm-version cancun --fork-url <chain 56>` | **60 passed / 0 failed**, **identical gas** | cross-check: the primitive is the same on mainnet; the result is not a state coincidence |
| `npm run probe` in `web/` | **19/19 passed** against a live chain (17 Sep) · ⚠️ **STALE — not re-run since** | the verification page reads real chain data correctly: identity, status, holder, artifact, prerequisite chain, `isIssuer`. ⚠️ `statusOf` has since widened from 6 to **7 values** (`issuerDelisted`, see [02-architecture.md](02-architecture.md)) and the probe now declares **20 checks**. Until it is re-run against a redeployed fork, treat the probe as **unproven** — the local anvil fork still holds the old 2-field resolver, so re-running today would fail on the schema, not on the page |
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
| ⚠️ "the verification page is tested end to end" | The probe passed, but on an **active** credential. The **REVOKED** path is proved by forge tests only, because the demo data is still incomplete (see below). Fix the seed script before writing that sentence in a submission |
| ❌ "our credential is compatible with the 1EdTech validator" | **Never run.** It is a target, not a result |
| ❌ "HTTP 402 payment works" | What was proven in x402 is **on-chain settlement**. A server answering `402` with a client sending a `PAYMENT` header has **never been executed** |
| ❌ Indonesian e-learning market figures | **Zero primary evidence**, not shrunken numbers. Do not fill with guesses |
| ❌ "no competitors in this niche" | Credentialing competitors (POAP / Galxe / Layer3 / Sismo / Gitcoin Passport) were **never researched**. The "no competitors" claim rests only on four scraped submissions |
| ⚠️ "BAS is a well-maintained project" | Its addresses are alive, but the repo has 3 stars and its last functional commit is May 2024 |

## Known broken and not yet fixed

**`script/SeedDemo.s.sol` leaves incomplete demo state on the local fork.**

The script was made idempotent (3 failing transactions → 1), but **one `attest` transaction still
fails**, and `--slow` **aborts every transaction after a failure**. So: the **base** credential
exists and reads ACTIVE, while the **advanced** credential and the **revocation** never landed.
The cause is **not confirmed**; what is confirmed is that replaying the same call as an `eth_call`
on the immediately preceding block **succeeds** — so it is an ordering/state issue at broadcast
time, not the calldata.

The interesting part: the most likely cause is **our own anti-duplication guard** (`AlreadyIssued`)
doing its job correctly when `--slow` re-executes the script. Our feature was caught in production
by our own tooling. Not a product or security blocker — a demo-convenience blocker.

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
