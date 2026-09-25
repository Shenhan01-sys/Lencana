---
tags: [template]
---

# Template - Concept Note

> One concept per file, atomic, in `Concepts/`. It exists because a reader who mistakes X for Y writes
> a wrong claim or a wrong contract. Skip anything that is only a restatement of a code path — that
> belongs in the part note.

```markdown
---
tags: [concept]
---

# <Concept name>

**Definition:** 1-2 sentences, no hedging.

**Why it is in this vault:** <the specific confusion or defect it prevents>

**Facts:**
- <the standard's wording, the field name, the numeric limit — with its source>
- <what our code does with it>

**Not to be confused with:** [[<adjacent concept>]] — <one-line difference>

**Sources:** `path/in/app:line` · <external spec section, e.g. "OB 3.0 §9.1">
```

Rules:
- A concept note that only a reader inside the repo could use belongs in a **part note**, not here.
- External standards get quoted with the section and the date they were read (`read 16 Sep from the
  raw spec file`, not "per the spec").
- If the fact was established by measuring, cite the harness, not the memory.
