---
tags: [overview, roadmap, hub]
status: active
updated: 2026-09-25
---

# 02 - Roadmap to the Deadline

**Today: 25 September 2026 · deadline 30 September 2026, 23:59 WIB · 5 days left.**
Backlog detail lives in [[07-Backlog/01 - Backlog]]; this page is only the day-by-day shape and what
each day is worth.

| day | work | why here |
|---|---|---|
| **25 Sep** (today) | vault restructure + contributor layer (this folder); front-end open items written up with evidence; refresh `../README.md`, which still says "no contract has been broadcast to a public testnet" | the repository's face contradicts the code; judges read the face first |
| **26 Sep** | **public URL for `signer/`** → re-issue one credential with a real `BASE_URL` → run `https://vc.1ed.tech` and record the result verbatim | our strongest missing proof, and it needs almost no new code. Full plan: [[07-Backlog/Acceptance-Criteria/AC-P7 - Public URL and validator run]] |
| **27 Sep** | paid path on the hosted service (rate limit, batch log), and one **real** essay (not a fixture) scored by the judge | monetisation + the AI track claim; today every grade the model produced was on our own fixture text |
| **28-29 Sep** | video ≤ 5 min (the four scenes in [[00-Overview/05 - Demo Scenes]]), final README, submission form, market evidence for impact/viability | the artefacts already exist on chain; this is assembly |
| **30 Sep** | submit **in the morning**, not at 23:00 | portal risk, not code risk |

## Human-only items (nothing I do can close these)

- [ ] **Registration** at `https://luma.com/pcc699dv` + team name + submission wallet. Without
      registration the submission is not counted, however good it is.
- [ ] **Decision on the public URL**: tunnel (temporary, enough for the validator run) or hosting
      (survives for the video and for judges). This exposes a port / spends a service, so it is not
      taken on someone else's broad approval. See [[07-Backlog/01 - Backlog]] entry **P7**.
- [ ] A human click-through of `#/learn` in a browser — never done; the probe covers data, not feel.
- [ ] Source verification on the explorer is **not** available to us (V1 deprecated, V2 paid); the
      claim stays "the address resolves on `testnet.bscscan.com`" and nothing stronger.

## What gets dropped if we run out of time

In this order, because each is optional relative to its cost: a three-way revenue split (today: one
payee + platform share), the issuance relayer *as a service* (the primitive and the execution are
already proven — [[04-Signer-Service/01 - Signer Service]]), and any further course content beyond
the two we ship. What must not be dropped: scenes 1-3 of the demo and the limits panel.
