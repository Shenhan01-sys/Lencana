---
tags: [testing, "T3"]
command: npx tsc --noEmit; npm run build
measured: 2026-09-25
result: clean, 436 modules, built in 2.19s
---

# T3 - web typecheck and build

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P6

## Command

```powershell
cd app/web
npx tsc --noEmit
npm run build
```

## Result — 2026-09-25 (verbatim tail of the build)

```
✓ 436 modules transformed.
dist/index.html                 115.96 kB │ gzip:  24.57 kB
dist/assets/index-BAln6V0L.css  127.53 kB │ gzip:  21.46 kB
dist/assets/ccip-CdrIGEUJ.js      2.93 kB │ gzip:   1.36 kB │ map:    11.20 kB
dist/assets/index-BL86orMv.js   503.72 kB │ gzip: 159.36 kB │ map: 1,936.46 kB
✓ built in 2.19s
```

`tsc --noEmit` produced no output and exit code 0.

## What this does NOT prove

Almost nothing about behaviour. It proves the page **compiles**. It cannot see a wrong address, a
fabricated URL, a simulated revert presented as a real one, or a route that does not exist on our
server — all of which have been in this tree while green → [[FE6 - Quirks and open defects]].
That is precisely why [[T4 - npm run probe]] exists: it imports the module the page actually uses and
runs it against the public chain from Node.

Re-run this after any merge from the frontend maintainer, together with T4 → [[FE4 - Mount contract with the maintainer]].

**Related:** [[03-Frontend/01 - Frontend]] · [[09-Testing/00 - Hub Testing]]
