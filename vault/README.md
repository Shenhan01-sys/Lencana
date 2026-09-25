---
tags: [reference, hub]
---

# 📚 Lencana vault

Context notes: **why** the product is shaped like this, not what is in it. To run the code,
[`../README.md`](../README.md) is enough. Judges and contributors read this folder; so do AI agents
(see [`AGENTS.md`](AGENTS.md)).

> **Deliberate scope.** These notes cover **Lencana only** — the e-course platform with verifiable
> credentials. No other product, track or plan appears here.
>
> **Start at** [`START-HERE.md`](START-HERE.md). This file is only the two habits that keep the
> folder trustworthy.

1. **Every number came from a command that was run**, and each number lives in exactly one place
   ([`09-Testing/`](09-Testing/) for harness results). Elsewhere it is linked, not restated. Where a
   page and a fresh run disagree, **the run wins** — fix the page.
2. **Failures are recorded, not hidden.** Several decisions here exist because an earlier conclusion
   was wrong and the correction was written down in full
   ([`00-Overview/04 - Corrections.md`](00-Overview/04%20-%20Corrections.md)).

## Structure

| folder | what is in it |
|---|---|
| `00-Overview/` | the product as a person would describe it, roadmap, decisions, corrections, demo scenes |
| `01-Architecture/` | the layers and who owns each, why BAS is reused, the EAS gap |
| `02-Contracts/` | one note per deployed contract, function by function |
| `03-Frontend/` | verifier page + learning surface + the mount contract with the frontend maintainer |
| `04-Signer-Service/` | the credential document, status lists, agent delegation, grading, payment |
| `05-Course-Content/` | course data model, issuer manifests, grading authority |
| `06-Spec-Research/` | facts taken from the raw specifications, not from summaries |
| `07-Backlog/` | work left, risks, plan to the deadline, acceptance criteria per item |
| `08-Results/` | evidence and limits, plus one executive summary per finished item |
| `09-Testing/` | one record per harness command, with its real output |
| `10-Contributors/` | ownership, claims cheat-sheet, open items for the frontend maintainer |
| `Concepts/` | atomic concept notes (credential hash vs UID, rubricHash, fronted gas, …) |
| `Module-Guides/`, `Notes/`, `Templates/`, `scripts/` | the scaffolding, per [`Conventions.md`](Conventions.md) |

## Language policy

Everything in this folder is **English** — it ships inside the product repository and judges read it.
The product UI is Indonesian-first with an EN switch; that exception belongs to `web/`, not here.

Rules in full: [`Conventions.md`](Conventions.md) · for agents: [`AGENTS.md`](AGENTS.md)
