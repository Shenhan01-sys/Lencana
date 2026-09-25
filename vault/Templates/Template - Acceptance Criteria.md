---
tags: [template]
---

# Template - Acceptance Criteria

> One file per backlog item. Given/When/Then with a **numeric** PASS bar, and a status that names the
> layer it was proven at. The same IDs (`P3a#2`) are reused in the testing note and the summary.

```markdown
---
tags: [acceptance, "AC-P3"]
---

# AC-P3 — <title>

**Backlog:** [[07-Backlog/01 - Backlog]] entry **P3** · **Plan:** [[07-Backlog/02 - Plan to the Deadline]] ·
**Testing:** [[09-Testing/T6 - x402]] · **Summary:** [[08-Results/P3 - Executive Summary]]

## a — <criterion group>

| # | Criterion (Given/When/Then) | PASS bar | Status | Date | Evidence |
|---|---|---|---|---|---|
| 1 | Given …, When …, Then … | <measurable> | **PASS (public chain)** | 2026-09-25 | `npm run x402` → `20/20`; `tx 0x…` |
| 2 | … | … | **CODE ONLY** (browser click-through ⏳) | — | `signer/src/server.js:259` |

## b — <next group>
```

Rules:
- Status vocabulary is fixed: `PASS (<layer>)` · `PARTIAL` · `FAIL-SKIP` · `PENDING (device/human)` ·
  `CODE ONLY`. Layers: `offline` / `fork` / `public chain` / `HTTP` / `browser` / `code only`.
- A criterion with no number in the PASS bar is not a criterion, it is a wish.
- `FAIL-SKIP` is allowed and must say who decided to skip and why.
- Never move a status forward without an evidence cell that another person could re-run.
