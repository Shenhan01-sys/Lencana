---
tags: [frontend, "FE4"]
---

# FE4 - Mount contract with the maintainer

**Part of:** [[03-Frontend/01 - Frontend]]
**Source:** `web/src/main.ts:5`, `web/src/main.ts:1180`, `web/index.html:518`

**Summary:** Two people edit this directory and one page renders both their layers, so the boundary
has to be written down rather than remembered. The frontend maintainer owns the page shell and the
verifier's presentation; the learning surface owns the content model and its router. The seam is
small on purpose: one imported function, one call per route change, one `<div>` id, one `body`
attribute. Nothing here is a claim about what was measured — the checks below are, and each names the
command that produced its number.

**Key points:**
- **Owned by the maintainer** (`vault/AGENTS.md` rule 10): `web/index.html`, `web/src/main.ts`,
  `web/src/render.ts`, `web/src/style.css`, `web/src/i18n.ts`.
- **Owned by this side**: `web/src/verify.ts`, `abi.ts`, `config.ts`, `lms.ts`, `lms.css`,
  `content.ts`, `manifest.ts`, `score.ts`, `progress.ts`, `courses/*.ts`, `scripts/*.ts`.
- **Shared constraint on two of his files.** `verify.ts` must stay DOM-free because
  `web/scripts/probe.ts:25` imports it from Node and `signer/src/server.js:29` does the same;
  `render.ts` must stay importable in Node because `web/scripts/probe.ts:26` calls `renderReport()`
  and asserts on the returned string (`web/scripts/probe.ts:118`, `:166`). Wrapping either in a
  component turns the harness into theatre.
- The seam, in both directions: `web/src/main.ts:5` imports `renderLmsRoute`, `main.ts:1157-1160`
  maps the learning routes to `page-courses`, and `main.ts:1180` calls it on **every** route change.
  The mount node is `web/index.html:518` (`id="lms-mount"`, inside `id="page-courses"` at `:515`);
  `getMount()` is `web/src/lms.ts:437`, and a missing mount makes `renderLmsRoute()` return `false`
  at `web/src/lms.ts:454` — the surface disappears, the rest of the page keeps working.

**Detail:**
- **What must survive a redesign.** (1) `id="lms-mount"`; (2) `id="page-courses"` plus the
  `.page-view` / `hidden` toggling in `web/src/main.ts:1169-1175`; (3) the `body[data-lms-route]`
  attribute, set at `web/src/lms.ts:467` and deleted at `:459`, which is the only thing
  `web/src/lms.css:15` keys on; (4) the route prefixes `#/learn`, `#/course/…`, `#/me` still reaching
  `renderLmsRoute()`; (5) the exported names `renderLmsRoute` (`web/src/lms.ts:452`) and `bindLms`
  (`:527`); (6) the verifier ids `input`, `go`, `out`, `status`, `banner` (`web/src/main.ts:13-17`,
  declared in `web/index.html:962`, `:972`, `:981`, `:1002`, `:1048`) and the `?q=` read at
  `web/src/main.ts:2386`.
- **Storage keys are part of the contract**: `lencana-progress-v1` (`web/src/progress.ts:17`),
  `bnb-credential-endpoint-v1` (`web/src/config.ts:12`), `lencana_lang` (`web/src/i18n.ts:16`).
  Renaming one silently resets every learner's device.
- **Run before pushing**, from `app/web/`: `npx tsc --noEmit`, then `npm run build`, then
  `npx tsx scripts/probe.ts`. On 2026-09-25 the first two were clean and the probe printed **59
  checks / 0 failed** against public chain 97. `probe` reads its target from the environment
  (`RPC_URL`, `RESOLVER_ADDRESS`, `CERT_ADDRESS`, `BAS_ADDRESS`, `CHAIN_ID` at
  `web/scripts/probe.ts:35-41`; `DEMO_HASH`, `DEMO_REVOKED_HASH`, `DEMO_CHAINED_HASH`,
  `DEMO_DELISTED_HASH` at `:87`, `:123`, `:136`, `:151`) and prints how many checks actually ran
  plus any skipped group (`:266-267`) — a small number is visible, not implied.
  `npx tsx scripts/rubric-check.ts` (17 / 0 the same day) and `npm run inventory` cover the content
  layer, which the probe also audits.
- **Merge policy.** For `index.html`, `main.ts`, `style.css`, `render.ts`, `i18n.ts` the frontend
  maintainer's version wins; this side re-applies its own files on top and **re-runs the harness in
  the same push** rather than arguing the diff. Never force-push `main`.
- **A push is proven by comparing hashes**, not by the absence of error output:
  `git ls-remote origin refs/heads/main` must equal `git rev-parse HEAD`. A rejected non-fast-forward
  still prints a normal build log.
- If a redesign removes the learning routes entirely, delete the branch at
  `web/src/main.ts:1157-1160` **and** the call at `:1180`; leaving the call in place keeps
  `#/…` routes swallowing keystrokes into an invisible mount.

**Related:** [[FE1 - Verifier page and verify.ts]] · [[FE2 - Learning surface router]] ·
[[FE6 - Quirks and open defects]] · [[00-Overview/01 - Briefing]] · [[Conventions]] · [[AGENTS]]
