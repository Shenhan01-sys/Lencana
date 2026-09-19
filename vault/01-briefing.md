# 01 — Product briefing

## One paragraph

**Lencana** is a micro-course platform where **the issuer of the certificate is an AI agent**.
The credential it produces follows the **Open Badges 3.0 / W3C Verifiable Credentials 2.0**
standard, while **who is allowed to issue** and **whether a certificate has been revoked** are
recorded on BNB Chain. The result: a recruiter can confirm a certificate **in a browser** — no
wallet, no account, no trusting our server — and an issuer **cannot pretend it never revoked
something**.

What we sell is not "an NFT certificate". It is **an issuance pipeline for credentials that the
public can audit**, plus **third-party verification**, which is the part nobody had an answer for.

## Why it is shaped like this

The failure we remove is concrete:

> A PDF certificate is forged with Photoshop. A certificate in the issuer's own database is forged
> by the issuer, or by a compromised admin. **An NFT solves neither** — it only moves the question
> to: *who may mint, and how does a verifier know it is real?*

Answering "because blockchain" does not survive a follow-up question. So the product answers four
mechanical questions instead. See [02-architecture.md](02-architecture.md).

## The three people who use it

| | who | relationship to crypto |
|---|---|---|
| **Rina, 24** — learner | takes the course, submits work, receives a certificate | **none.** Never sees a seed phrase, never signs a transaction, never pays for the certificate |
| **A training institution** — issuer and sponsor | writes the course, sets the pass standard | owns the agent, therefore owns the **issuance** key. It is a third party to us: we admit it, and we can delist it, but we cannot sign, speak or revoke on its behalf |
| **Bagas, HR** — verifier | receives hundreds of applicants, wants to know which are real | **none.** Opens a URL, pastes a code |

The hackathon track literally reads *"social, gaming and loyalty with **seamless UX**"*. Wallet-free
onboarding is therefore the product, not a feature. The mechanism is boring and that is the point:
**the learner never sends a transaction**. What pays for that comfort (D31): the platform *fronts*
the issuance gas and recovers it from the issuer's fee share, so "the issuer pays" is true as
economics and false as plumbing — the issuer's key signs, our wallet broadcasts. We deliberately
avoid ERC-4337 / paymasters, because their availability on BSC was never verified.

## The real flow, step by step

**1. Sign in.** Email login. The backend creates an address for the learner; they never hold its
key. They see a catalogue with **one real course we wrote ourselves** — not an empty marketplace,
because a platform with no content cannot be demonstrated.

**2. Learn.** Modules and quizzes. Our own content. (Storing material in IPFS/Greenfield is a later
option, not a critical-path item.)

**3. Assessed by the agent.** The final task is an **open essay**, not multiple choice — a deliberate
choice. Multiple choice does not need an AI, and if the agent only grades ABCD there is no credible
reason for this to be an agent track entry at all. What the agent does and **leaves a trace of**:

```
input    : the learner's answer + the course rubric (criteria, weights, pass threshold)
output   : a score per criterion, written feedback, PASS / NOT YET
recorded : hash(evidence) on-chain + the agent's signature over the credential it produced
```

**4. Issued.** Three objects come out of one flow:

| object | what it is |
|---|---|
| **the credential** | an `OpenBadgeCredential` JSON-LD document, signed by the agent's key. **Off-chain**, portable to any verifier that understands the standard |
| **what reaches the chain** | `keccak256(document)` → an attestation on **BAS**, through our `CredentialResolver` |
| **the artifact** | a soulbound NFT appears in the learner's collection. `mint()` **refuses when the credential is not live** — this is what separates our artifact from a bolted-on NFT |

**5. Shared.** The learner copies a *check code* (hash / UID / URL). They share a way to check, not
a file.

**6. Verified.** This is the peak of the story. The recruiter opens the page, pastes the code, and
gets a verdict, all the raw evidence, and — **commands to repeat the check without our page**
(`cast call …` / a raw JSON-RPC `curl`). Showing how to contradict us is intentional: a claim of
"publicly verifiable" means nothing if the only way to check it is our own tool.

## Four things that make it not a 2021 "NFT diploma"

1. **Certificates are not immortal.** EAS has a native `expirationTime`. Product decision: **removing
   an issuer's permission does NOT cancel credentials already issued** — deliberately separated, so
   revoking one bad issuer cannot wipe out the rights of learners who did nothing wrong.
2. **A prerequisite that is revoked kills what was built on it.** This was a **finding**, not a plan:
   EAS checks only that a prerequisite *exists*. See the "gap" section of
   [02-architecture.md](02-architecture.md).
3. **Bulk verification is an economy, not a button.** A recruiter — or a recruiting agent — can pay
   per check over **x402**, and the agent-payment path on BNB Chain is already proven, including
   settlement that costs the payer no gas. The line: **we charge for convenience, never for truth.**
   The public page stays free forever.
4. **The document is a standard, not our format.** Consequence: our credential should open in
   somebody else's validator. Status of that proof: [03-evidence-and-limits.md](03-evidence-and-limits.md)
   — **not run yet**.

## The demo, as designed

Five minutes, four scenes. Each scene exists because it answers one of the four questions.

| # | scene | what the audience sees |
|---|---|---|
| 1 | **Verification without a wallet** | paste a code → `REVOKED`; another → `EXPIRED`. No wallet is opened during the scene |
| 2 | **Issued by the agent** | essay → agent scores it → signs → credential issued → appears on the learner's device. **Then: revoke the base, try to issue the advanced one → REVERT, live** |
| 3 | **Forgery fails** | transfer the artifact → revert · change one byte of the document → signature fails · mint from an unapproved address → revert |
| 4 | **The economy** | the agent pays for issuance; a recruiter pays for verification; **then show the public page still free, no payment** |

## Limits printed in the UI, not in a footnote

Not boilerplate, and not closable. This product does **not** prove:

- that the **content** of a claim is true — verifying a credential is not evaluating the grading;
- that the **human** behind an address is the person who studied — what binds is an address;
- that a certificate cannot be screenshotted — soulbound binds ownership, not display;
- legal or institutional recognition of any kind.

Writing the limits ourselves is what makes the other claims believable: a judge who tries to break
point four finds we already wrote it down.
