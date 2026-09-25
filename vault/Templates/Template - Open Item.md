---
tags: [template]
---

# Template - Open Item

> One per finding aimed at a specific contributor (usually the frontend maintainer). The point is
> that the reader can act without asking a question: quote, fact, minimal edit, verification command.

````markdown
---
tags: [open-item, "OI-3"]
---

# OI-3 — <short title>

**Owner:** <name/role> · **Raised:** 2026-09-__ · **Severity:** <misleading-output | broken-link | wrong-number | scope> ·
**Status:** OPEN / FIXED (commit `…`) · **Hub:** [[10-Contributors/Open-Items/00 - Hub Open Items]]

## What the product currently says
> <verbatim quote>  — `web/src/main.ts:2085`

## What is actually true
<the measured fact, with the file/line or command that shows it>

## Why it matters
<who is misled, and what they would conclude>

## Minimal fix
<the smallest edit; a patch block if it is short>

## Verify
```powershell
cd web && npx tsx scripts/probe.ts
```
````

Rules:
- Never "this is wrong" without the correct value and where it came from.
- If the finding is about a number, link the harness that prints it ([[09-Testing/00 - Hub Testing]]).
- Do not fix someone else's file and leave the note OPEN — either fix + mark FIXED with the commit,
  or leave the file alone.
