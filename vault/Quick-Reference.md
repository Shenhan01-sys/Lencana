---
tags: [reference, commands]
status: active
updated: 2026-09-28
---

# Quick Reference

Every line was run against this working copy. The date is when that number was last printed. **If a
command and a page disagree, the run wins.**

| command (from `app/`) | prints | last |
|---|---|---|
| `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` | 104 passed / 0 failed | 28 Sep |
| `cd web && npx tsc --noEmit && npm run build` | clean | 28 Sep |
| `cd web && npx tsx scripts/probe.ts` | 59 / 0 - the page's own `verify.ts`, four verdicts, public chain 97 | 28 Sep |
| `cd web && npx tsx scripts/rubric-check.ts` | 17 / 0 - policy and material hash separately | 26 Sep |
| `cd web && npx tsx scripts/inventory.ts` | 2 courses · 7 modules · 24 lessons · 412 minutes | 26 Sep |
| `cd signer && node scripts/check.js` | 72 / 0 (grows with the watched set) | 28 Sep |
| `cd signer && node scripts/serve-probe.js` | 42 / 0 - incl. the document route and the served bitstring length | 28 Sep |
| `cd signer && npm run x402` | 20 / 0 - one payment, two verdicts, settlement + split on chain | 28 Sep |
| `cd signer && npm run anchor -- --dry-run` | 14 watched; both served hashes already anchored; 0 new anchors | 28 Sep |
| `cd signer && npm run verify:deploy` | 15 claims / 0 mismatch against chain 97 | 28 Sep |
| `cd signer && npm run validator` | 10 / 0 and `outcome: VALID` from `vc.1ed.tech` | 27 Sep |
| `cd signer && npm run measure:signing` | crypto 133 ms median; full render ~2.0 s (was ~4.4 s) | 27 Sep |
| `powershell -File vault\scripts\sync-vault.ps1` then `check-links.ps1` | `_Auto-Index` + link report | 28 Sep |
| `... check-mermaid.ps1` · `... check-lang.ps1` | `Hazards: 0` · `CJK tokens: 0` | 28 Sep |

**Before any chain write:** `--evm-version cancun` is mandatory on `forge test` AND `forge script`; the
`data-seed-prebsc-*` endpoints are proven flaky, use the `bscTestnet` alias; faucet money must land on
the address whose **key** is in `.env`; and addresses are read from `broadcast/` or derived in code -
never retyped.

**Related:** [[Glossary]] · [[09-Testing/00 - Hub Testing]] · [[08-Results/P2 - Executive Summary]]
