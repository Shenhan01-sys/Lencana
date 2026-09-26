---
tags: [refactoring, hub]
status: active
updated: 2026-09-26
---

# 00 - Hub Refactoring

The frontend needs a refactoring pass, not another feature. This folder is the audit and the target
shape; **nothing in `../web/` was edited to produce it** — the findings are for the frontend owner to
execute, and every claim names the file and line it came from.

**Trigger (26 Sep, from the builder):** the app reads as a technology demo, not as a consumer product.
The track is Consumer Apps, and that is the grading axis we are weakest on. Courses open as a card
walkthrough with no enrollment, no payment, no mentor, no per-chapter interactivity; `#/submit` is
confusing enough that a technical user stops and asks what page this is; the demo state and the
logged-in state look identical, so everything appears to be dummy data — and a large part of it is.

## Peta dokumen

| # | note | what it decides |
|---|---|---|
| **RF-0** | [[#RF-0 — my audit ran against a stale checkout; the correction is the finding]] | method: `git fetch` before any audit, and what I got wrong doing it |
| **RF1** | [[RF1 - Consumer Readiness Audit]] | what is broken today, item by item, with `file:line` |
| **RF2** | [[RF2 - Copy and Claims]] | the hero caption, the spec-jargon cards, wording that survives our own limits sheet |
| **RF3** | [[RF3 - Onboarding and Identity]] | wallet-only login → onboarding + profile; Privy as the embedded-wallet route and what it costs us in claims |
| **RF4** | [[RF4 - Learning Surface Target Shape]] | the real learning page: chapters, inline interactivity, mentor sidebar; catalog beyond web3; six LMS references |
| **RF5** | [[RF5 - Enrollment and the Paid Path]] | enrollment is the chargeable event; what exists on chain today and what does not |

Rules of engagement, inherited from [[Conventions]]:

- The frontend files stay the frontend owner's. These notes propose; they do not patch.
- A finding without a `path:line` or a command is not written here.
- Anything the refactoring makes true in the UI must also update [[08-Results/01 - Evidence and Limits]]
  in the same change — a claim the site makes that the vault forbids is the exact defect this whole
  folder exists to remove.
- Existing findings raised against `web/` are tracked in [[10-Contributors/Open-Items-for-Dave]]
  (OI-1…OI-10) and are **not** repeated here; this folder covers consumer shape, not citation errors.

## RF-0 — my audit ran against a stale checkout; the correction is the finding

On 26 Sep I searched the repository for the caption quoted by the builder
("Autonomous AI credentials that prove your on-chain mastery"), got no match, and concluded that the
deployed site was not `main`. **That conclusion was wrong, and the reason matters more than the
conclusion.**

`git fetch` showed four commits I did not have — Dave's `codex/lencana-ui-final` line, merged as
`e2d4a8b`. After merging, the string is exactly where the deployed site says it is:

```powershell
git grep -n "on-chain mastery" -- web
# web/index.html:249:  <span class="nexum-h1-system">Autonomous AI credentials that prove your on-chain mastery.</span>
```

So `lencana-psi.vercel.app` was faithful to `origin/main`; my working copy was behind, and I audited
that stale copy as if it were the product. The rule that was already written down and that I broke
([[08-Results/01 - Evidence and Limits]], `AGENTS.md` rule: the repository is a moving target —
`git fetch` **first**, always) is the reason this folder's first item is a method rule rather than a
design note:

1. `git fetch` + compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/main` **before**
   any audit or claim about the UI, and write the SHA the audit was done against in the note.
2. Re-run the audit after merging. The findings in [[RF1 - Consumer Readiness Audit]] were re-checked
   after the merge and survive: `btnEnroll` is still only a dictionary entry with no reference in any
   `.ts` outside `i18n.ts` (`:189`, `:665`, `:1238`), the route table is unchanged (`main.ts:1147-1157`,
   `:1195`), and `mentor` still has zero occurrences in `web/`.
3. Copy findings, not guesses: the caption critique in [[RF2 - Copy and Claims]] stands on its own
   merits and now cites `index.html:249`.

## Adjacent decision — the public URL needs a server, and half of it needs only a function

Decided 26 Sep: **tunnel first** (`cloudflared`/ngrok) so the 1EdTech validator can be run today.

Why a service at all: the validator does not call our code, it **follows URLs written inside the
credential document** — `issuer.id`, `verificationMethod`, `credentialStatus[].statusListCredential`.
Those URLs must be reachable by a machine that is not us. Two consequences worth stating plainly:

- `BASE_URL` is baked into the document at signing time, so a tunnel URL that changes tomorrow
  invalidates nothing cryptographically but makes the *links* dead. For the validator run that is fine;
  for anything a judge clicks, it is not.
- The read-only half — `GET /issuers/<slug>`, `GET /credentials/status/<purpose>`,
  `GET /credentials/0x…` (`signer/src/server.js:266-277`) — has no state and no signing. It is exactly
  the shape of a serverless/edge function: build the document and the lists, return JSON. Our signer is
  Node + viem, so the port is "re-implement `credential.ts` + `statusList.js` as an edge function",
  not "deploy `server.js`".
- The write half cannot be a stateless function: `POST /verify` holds a key, broadcasts a settlement and
  pays gas (`signer/src/x402.js`), and `npm run anchor` writes to BAS. Those need a resident process and
  a key, i.e. a host or a service with secrets.

**Net:** an edge function can carry the interoperability proof (the validator only reads). It cannot
carry the paid path. So the sequencing is: tunnel → validator run today → edge function for the durable
document+lists URL → keep the settlement/anchoring on a host.

**Related:** [[Index]] · [[07-Backlog/01 - Backlog]] · [[10-Contributors/Open-Items-for-Dave]] · [[03-Frontend/01 - Frontend]]
