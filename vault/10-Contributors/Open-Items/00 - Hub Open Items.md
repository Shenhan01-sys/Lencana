---
tags: [hub, frontend, open-items]
status: active
updated: 2026-09-28
---

# 00 - Hub Open Items

The items live in one document so Dave can read them in a single pass:
**[[10-Contributors/Open-Items-for-Dave]]**. This hub is only the index.

| item | one line |
|---|---|
| OI-1 | the page builds a credential that was never signed, for courses we do not have |
| OI-2 | the payment console targets a route that does not exist; the real one is `POST /verify` |
| OI-3 | the bitstring visualizer shows a simulation and is labelled as our list |
| OI-4 | fake EVM revert strings typed by hand |
| OI-5 | invented metrics and an invented person |
| OI-7 | URLs on a domain the project does not hold |
| OI-11 | `main.ts` contains no `fetch(`: the paid panel is timers, while the same repo settles real payments |
| OI-12 | the shown document still uses the two-entry `credentialStatus` the OB 3.0 schema rejects |

One item per file is deliberately **not** done: each item is a section with a patch, and splitting them
would leave seven files that a reader has to reassemble. If an item needs quoting in a pull request, the
section heading is the anchor.

**Related:** [[03-Frontend/FE6 - Quirks and open defects]] · [[10-Contributors/00 - Hub Contributors]]
