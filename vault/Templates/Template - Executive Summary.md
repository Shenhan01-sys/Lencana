---
tags: [template]
---

# Template - Executive Summary

> One per finished backlog item. Four things a reader wants: what changed, what it measured, where it
> stands, what is still risky. Numbers only, no adjectives about quality.

```markdown
---
tags: [exec-summary, "P3"]
---

# P3 — Executive Summary (<title>)

**Backlog:** [[07-Backlog/01 - Backlog]] entry P3 · **Plan:** [[07-Backlog/02 - Plan to the Deadline]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-P3 - Paid verification]] · **Testing:** [[09-Testing/T6 - x402]]

## 1. What changed
<the files/contracts/commands that did not exist before, with paths>

## 2. Result vs bar (real numbers)
| AC | Actual | Verdict |
|---|---|---|
| P3a#1 | <output> | **PASS (public chain)** |
| P3b#2 | <output> | **CODE ONLY** |

## 3. Status
<done / done-with-deviation / partial — name the deviation>

## 4. Remaining risk
<what breaks it, what a judge could catch us on>

## 5. Evidence
<tx hashes, command + date, commit short SHAs>
```

Rules:
- Section 2 must contain **actual values**, not "as expected".
- Section 4 is never empty; if you believe it is, you have not looked for the boundary.
- A deviation the user decided is recorded as a decision with its ID, not hidden in prose.
