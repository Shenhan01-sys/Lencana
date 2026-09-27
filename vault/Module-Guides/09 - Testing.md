---
tags: [module, 09]
---

# 09 - Testing

**Purpose:** One note per harness, each stating the command, the date it last ran, the number it printed and the group it skipped - so a green line is never read as full coverage.

## Files in this module
- [[09-Testing/00 - Hub Testing]]
- [[09-Testing/T1 - forge test on chain 97]]
- [[09-Testing/T2 - forge test on chain 56]]
- [[09-Testing/T3 - web typecheck and build]]
- [[09-Testing/T4 - npm run probe]]
- [[09-Testing/T5 - npm run rubric]]
- [[09-Testing/T7 - signer check.js]]
- [[09-Testing/T8 - signer serve-probe.js]]

## Key facts
- The vault has its own guards: `scripts/sync-vault.ps1`, then `check-links.ps1`, `check-mermaid.ps1` and `check-lang.ps1`; all four are required after an edit (see [[Conventions]]).
- Counts grow with the watched set on purpose: the run prints them, the page does not decide them ([[09-Testing/00 - Hub Testing]]).
- Interoperability is a run, not a belief: [[09-Testing/T15 - 1EdTech validator]].
