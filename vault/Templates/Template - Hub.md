---
tags: [template]
---

# Template - Hub

> One hub per module folder (and per per-item sub-folder). It is a **map**, not an essay: the body
> explains what the folder is for, then lists every part with a one-line gloss.

````markdown
---
tags: [<area>, hub]
---

# <NN> - <Title>

<2-5 dense sentences: what this layer is, what it is NOT, and the one fact a newcomer must not miss.>

## Parts

- [[<Prefix>1 - <Title>]] — <what is in it>
- [[<Prefix>2 - <Title>]] — <what is in it>

## Related

- [[<other hub>]] · [[Quick-Reference]]
````

```dataview
LIST FROM #<area> SORT file.name ASC
```

Rules:
- Heading `## Parts` lists **every** file in the folder — a file missing from the map is invisible.
- Every list item gets a gloss, not just a link.
- `**Source:**` for a hub is the directory it documents, e.g. ``signer/src/``.
- For a **per-item** hub, replace `## Parts` with a **document map** table (see `Template - Acceptance Criteria`).
- The trailing `dataview` block is what keeps the map honest when files are added by hand.
