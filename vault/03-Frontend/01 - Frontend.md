---
tags: [frontend, hub]
status: active
updated: 2026-09-25
---

# 01 - Frontend

`../web/` — two surfaces in one page, deliberately different in kind.

1. **The verifier** (`#/verify`, `?q=`): reads chain state directly from the browser over JSON-RPC,
   no server, no wallet. Its honesty depends on one design rule — `src/verify.ts` is **pure and
   DOM-free**, so the same file the page imports can be driven from Node by `scripts/probe.ts`. The
   moment someone wraps a component around the fetch, the probe becomes theatre
   → [[Concepts/DOM-free Verification Module]].
2. **The learning surface** (`#/learn`, `#/course/*`, `#/me`): hash-routed templates over typed
   course data, no UI framework. **34 pages** measured by `npm run inventory`, not counted by hand
   → [[05-Course-Content/01 - Course Content]].

Bilingual (`src/i18n.ts`, EN/ID, persisted). The rest of the routes (`#/`, `#/courses`, `#/submit`,
`#/portfolio`, `#/agent-hub`) are the frontend maintainer's — see
[[FE4 - Mount contract with the maintainer]] before editing anything in this folder.

## Parts

- [[FE1 - Verifier page and verify.ts]] — inputs accepted (hash / UID / token id / address), the four verdicts, the raw-evidence and `cast`/`curl` panels
- [[FE2 - Learning surface router]] — routes, templates, the lesson kinds, and where progress is stored
- [[FE4 - Mount contract with the maintainer]] — the DOM nodes and calls that must survive a redesign, and the merge policy
- [[FE6 - Quirks and open defects]] — what is currently misleading in the shipped UI, by reference to the open items

## Reproduce

```powershell
cd app/web
npx tsc --noEmit && npm run build        # both clean on 25 Sep
npx tsx scripts/probe.ts                 # 59 checks / 0 failed against public chain 97 (25 Sep)
```

**Related:** [[05-Course-Content/01 - Course Content]] · [[04-Signer-Service/01 - Signer Service]] · [[10-Contributors/00 - Hub Contributors]]
