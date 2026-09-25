---
tags: [template]
---

# Template - Part Note

> One part = one topic = one node in the graph. Depth lives here; the hub only routes.

```markdown
---
tags: [<area>, "<Identity>"]
---

# <Identity> - <Title>

**Part of:** [[<hub>]]
**Source:** `path/from/app/root.ext:line`  (or the spec file it was read from)

**Summary:** 3-6 sentences. What it does, what it deliberately does not do.

**Key points:**
- 4-8 concrete points. Names, not vibes: function signature, field, guard, verdict.
- Any figure here came from a command that was run — say which one.

**Detail:**
- Facts a reader needs to change this safely: invariants, ordering constraints, error names.
- The trap that already cost someone time, if there is one.

**Related:** [[<sibling part>]] · [[<concept note>]]
```

Rules:
- `<Identity>` matches the file-name prefix (`A3`, `C2`, `FE4`, `S6`, `R1`, `T5`, `OI-3`).
- Non-`.md` sources are inline code, **never** wikilinks.
- "It doesn't handle X" is worth more than a paragraph restating the code.
