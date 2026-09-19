# 📚 Project briefing — Lencana

Context notes: **why** the product is shaped like this, not what is in it. To run the code,
[`../README.md`](../README.md) is enough.

> **Deliberate scope.** These notes cover **Lencana only** — the e-course platform with verifiable
> credentials. No other product, track or plan appears here.

| File | Contents | Read it when… |
|---|---|---|
| [01-briefing.md](01-briefing.md) | what the product is, who uses it, the flow from zero to a verified certificate, the demo scenes | you want to understand the product as a person, not as an engineer |
| [02-architecture.md](02-architecture.md) | the four layers, the two contracts, why BAS is reused rather than rewritten, decisions with dates — including **D24.1, taken 19 Sep** and now implemented in `signer/` | you are about to change a contract or the backend |
| [03-evidence-and-limits.md](03-evidence-and-limits.md) | what **is** proven, what is **not**, and the list of claims we forbid ourselves | you are writing UI copy, the repo description, or presentation material |
| [04-technical-reference.md](04-technical-reference.md) | Open Badges 3.0 / VC 2.0 facts taken from the raw specification, plus the toolchain traps that already cost us time | you are touching credential signing or the Foundry rig |
| [05-status-and-tasks.md](05-status-and-tasks.md) | where things stand, the blockers, and the order of work to the deadline | you are continuing this work |

## How to read these notes correctly

Two habits that keep them trustworthy:

1. **Every number came from a command that was run**, not from memory. Wherever you read "passed",
   there is a command that produced it.
2. **Failures are recorded, not hidden.** Several decisions here exist because a previous conclusion
   was wrong and the correction was written down in full. If a figure in these notes ever
   contradicts reality, **trust reality** and update the notes.

## Language policy

Everything in this folder is **English**. The one agreed exception is the verification frontend,
which will carry an **Indonesian / English switch** (tracked in
[05-status-and-tasks.md](05-status-and-tasks.md); not built yet).
