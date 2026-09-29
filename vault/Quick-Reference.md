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
| `cd web && npm run probe` | 59 / 0 - the page's own `verify.ts`, four verdicts, public chain 97. Sejak 28 Sep memuat `../.env` sendiri (`scripts/load-env.ts`): sebelumnya `npm run probe` di clone bersih memeriksa `0x0000…` di port lokal dan keluar merah sementara README menjanjikan sebuah angka | 28 Sep |
| `cd web && npx tsx scripts/rubric-check.ts` | 17 / 0 - policy and material hash separately | 28 Sep |
| `cd web && npx tsx scripts/inventory.ts` | 2 courses · 7 modules · 24 lessons · 412 minutes | 26 Sep |
| `cd signer && node scripts/check.js` | **88 / 0** (grows with the watched set; 76 earlier the same day) | 28 Sep |
| `cd signer && node scripts/serve-probe.js` | 48 / 0 - document route, served bitstring length, every agent in `.keys/` at its own URL (B48), and since 28 Sep the **bit counts are compared with chain state**, not with a hand-maintained `EXPECT_*` list | 28 Sep |
| `cd signer && npm run x402` | 20 / 0 - one payment, two verdicts, settlement + split on chain | 28 Sep |
| `cd signer && npm run anchor -- --dry-run` | **22** watched · revocation **5** bits · suspension **1** bit · both served hashes already anchored; 0 new anchors. Also loads `../.env` itself since 28 Sep | 28 Sep |
| `cd signer && npm run verify:deploy` | green - claims vs chain 97, plus the enforcement parity block (build has `mintBatch`, `CERT_ADDRESS` provably does not) | 28 Sep |
| `cd signer && npm run publish:edge` | **44 / 45** routes read back through the worker; both lists `matchesChainNow` | 28 Sep |
| `cd signer && npm run verify:edge` | 5 / 0 **+ printed measurement: 8 of 14 papers are externally checkable end-to-end** | 28 Sep |
| `cd signer && npm run verify:live-cert` | **35 / 0** on `LIVE_CERT_ADDRESS` — five artefacts checked one by one (not the last ledger row only) | 28 Sep |
| `cd signer && npm run e2e` | **42 / 0** — chain == served list == URL inside the paper == artefact == third-party verdict | 28 Sep |
| `cd signer && npm run journey` | **34 / 0**, 10 stages — the whole participant journey on the core side; 2 surfaces reported as NOT IN CORE rather than passed | 28 Sep |
| `cd signer && npm run validator` | 10 / 0 and `outcome: VALID` from `vc.1ed.tech` — five distinct credentials, all under the durable host | 28 Sep |
| `cd signer && npm run measure:signing` | crypto 133 ms median; full render ~2.0 s (was ~4.4 s) | 27 Sep |
| `powershell -File vault\scripts\sync-vault.ps1` then `check-links.ps1` | `_Auto-Index` + link report — **two counts**: wikilinks AND relative markdown links across every repo markdown file | 28 Sep |
| `... check-mermaid.ps1` · `... check-lang.ps1` · **`... check-paste.ps1`** | `Hazards: 0` · `CJK tokens: 0` · `PASTE HIJAU — 5,587/5,600` (the submission field's ceiling; the artifact crept four past it on 28 Sep with every other gate green) | 28 Sep |

**Before any chain write:** `--evm-version cancun` is mandatory on `forge test` AND `forge script`; the
`data-seed-prebsc-*` endpoints are proven flaky, use the `bscTestnet` alias; faucet money must land on
the address whose **key** is in `.env`; and addresses are read from `broadcast/` or derived in code -
never retyped.

**Related:** [[Glossary]] · [[09-Testing/00 - Hub Testing]] · [[08-Results/P2 - Executive Summary]]
