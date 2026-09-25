---
tags: [concept]
---

# DOM-free Verification Module

**Definition:** `web/src/verify.ts` performs chain reads and returns a `Report`. It never touches `document`, `window` or `localStorage`, and its companion `render.ts` returns **strings** rather than mutating a page. "DOM-free" is the property that lets the exact same file run under Node.

**Why it is in this vault:** if a fetch or a status write ever moves into the component layer, `web/scripts/probe.ts` can no longer drive the real code path — it would be testing a reimplementation of the page instead of the page, and `npm run probe` would keep printing green while telling nobody anything. That is the moment a harness becomes theatre, and this note names it before it happens.

**Facts:**
- The rule is written where it can be enforced — the file header states the reason is practical and already proven necessary: this file runs in Node against a real fork, so "the page reads the right data" is *testable* rather than inferred from rendering (`web/src/verify.ts:1-11`). It is also recorded as a deliberate consequence of having no UI framework (`web/package.json`, `comment`: "`src/verify.ts` juga bebas-DOM supaya bisa dijalankan dari Node").
- The probe imports the **same module the page imports**: `import { verify, type Endpoint, type Report } from '../src/verify'` (`web/scripts/probe.ts:25`) and `web/src/main.ts:1` — one line apart in two different files, same specifier. It also imports `renderReport` from `../src/render` (`probe.ts:26`), which returns a string (`web/src/render.ts:528`), so the render path stays Node-drivable too.
- Verified on the current tree: no occurrence of `document`, `window`, `localStorage` or a bare `fetch(` in `web/src/verify.ts`. DOM access lives in `main.ts`, `lms.ts` and `i18n.ts` — the surfaces the probe does not depend on for verdicts.
- Second consumer of the same property: the paid route imports `verify()` from here (`signer/src/server.js:29`), so the free page and the paid report cannot drift → [[Concepts/Batch not Data]].
- The companion rule is **no silent failure**: every read is recorded as `ReadLog` — label, target, arguments, ok, result (`web/src/verify.ts:9-10,36`) — and the list is displayed, so a failed read appears as a failed read instead of dressing up as "credential not recognised". That is why the `parseAbi` bug could have been catastrophic and was instead caught by a harness → [[R6 - Toolchain traps that cost time]].
- Because the module is data-in/data-out, the same probe also audits course content and grading authority (`web/scripts/probe.ts:196-235`) — possible only because `content.ts` and `manifest.ts` are typed data, not components.
- **Measure of this property, 2026-09-25:** `npx tsx scripts/probe.ts` → 59 checks / 0 failed against public chain 97 ([[09-Testing/00 - Hub Testing]]). The number is a consequence of the rule; a DOM-touching `verify.ts` would keep the number and lose the meaning.

**Not to be confused with:** [[Concepts/Negative Control]] — that concept demands a harness be able to *fail*; this one demands the harness be pointed at *the real code*. A green probe over a copy proves neither.

**Sources:** `web/src/verify.ts:1-11,36` · `web/src/render.ts:528` · `web/scripts/probe.ts:1-26,196-235` · `web/src/main.ts:1` · `web/package.json` (`comment`) · `signer/src/server.js:29` · [[03-Frontend/01 - Frontend]] · [[03-Frontend/FE1 - Verifier page and verify.ts]]
