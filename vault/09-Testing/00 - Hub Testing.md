---
tags: [testing, hub]
status: active
updated: 2026-09-25
---

# 00 - Hub Testing

**This folder is the only home for measured numbers.** Every count, hash, gas figure and address quoted
elsewhere in this vault or in `../README.md` comes from a record here, with the command that produced
it and the date it was run. A number that appears somewhere else without a date is a defect in the
other page, not a second measurement.

Run from `app/` unless stated. Re-run everything with:

```powershell
cd app;  forge build
cd web;  npx tsc --noEmit; npm run build; npx tsx scripts/probe.ts; npx tsx scripts/rubric-check.ts; npx tsx scripts/inventory.ts
cd ../signer; node scripts/check.js; node scripts/serve-probe.js; node scripts/anchor.js --dry-run
```

⚠️ **A green line is not a scope statement.** The chain-reading harnesses take their configuration from
`process.env` and **skip whole groups** when the RPC / resolver / watched-hash variables are absent —
they still print "HIJAU", with the skipped group named underneath. On 25 Sep that difference was
measured directly: without those variables `check.js` reported **28** checks and `serve-probe.js` **11**;
with them, **53** and **20**. Always read the group list, not only the count → [[04-Signer-Service/01 - Signer Service]].

## Peta dokumen — harness ↔ klaim ↔ item backlog

| # | Command | Measured | Result | What it actually proves | Proves claim of |
|---|---|---|---|---|---|
| [[T1 - forge test on chain 97]] | `forge test --evm-version cancun --fork-url <97>` | **2026-09-28** | **104 passed / 0 failed** | every on-chain layer against real BAS on a fork of the public testnet | P1, P2 |
| [[T2 - forge test on chain 56]] | same, `--fork-url <56>` | **2026-09-28** | 104 passed / 0 failed | the same suite against mainnet state; identical counts on both chains | P1 |
| [[T3 - web typecheck and build]] | `npx tsc --noEmit` · `npm run build` | **2026-09-25** | clean · 436 modules · 2.19 s | the page compiles; nothing about behaviour | P6 |
| [[T4 - npm run probe]] | `npx tsx scripts/probe.ts` | **2026-09-25** | **59 / 0 failed** | the *real* `verify.ts` reads public chain 97 correctly for four verdicts, and the course content + grading authority are internally consistent | P1, P6, P4 |
| [[T5 - npm run rubric]] | `npx tsx scripts/rubric-check.ts` | **2026-09-25** | **17 / 0 failed** | the pass mark is computed, and policy vs material hash separately | P4 |
| [[T6 - npm run x402]] | `npm run x402` in `signer/` | 2026-09-24 | **20 / 0 failed**, 190,659 gas settled | the paid handshake end-to-end on the public chain, with money read back from chain | P3 |
| [[T7 - signer check.js]] | `node scripts/check.js` | **2026-09-28** | **74 / 0 failed** (15 kredensial diawasi) | document shape, signature round-trip, list bits derived from `statusOf()` | P1, P6 |
| [[T8 - signer serve-probe.js]] | `node scripts/serve-probe.js` | **2026-09-28** | **48 / 0 failed** | the same through HTTP against the running server, **plus** every agent in `.keys/` served at its own URL (**B48**) | P1 |
| [[T9 - npm run anchor]] | `node scripts/anchor.js --dry-run` | **2026-09-25** | 11 watched, 1 bit each, both hashes unchanged | anchoring is idempotent; also the witness of list membership | P1 |
| [[T10 - npm run delegate]] | `npm run delegate` | 2026-09-23 | batch 3 credentials / 1 tx; single 1 tx | the agent signs, the platform pays, agent balance unchanged | P1, P11 |
| [[T11 - npm run judge]] | `npm run judge` | 2026-09-24 | **7 / 0 failed** | the judge can fail a fluent-but-empty essay (negative control) | P5 |
| [[T12 - npm run judge-variance]] | `npm run judge-variance` | 2026-09-24 | substantive **91-100**, spread 9, decision stable 5/5 | the model's number has a range; the verdict does not move | P5 |
| [[T13 - npm run inventory]] | `npx tsx scripts/inventory.ts` | **2026-09-25** | 2 · 7 · 24 · 34 pages · 412 min · 28 · 2 | the size of the learning surface, printed from the data | P6 |
| [[T14 - verify the public deployment]] | `node scripts/verify-deploy.js` in `signer/` | see record | — | the four deployed addresses are what the notes claim, read from the RPC | P1 |
| [[T15 - 1EdTech validator]] | `npm run validator -- --record` | **2026-09-28** | **10 / 0 failed**, validator `outcome: VALID`, 14 checks, 0 error 0 warning | a third party opens our URLs and reads our paper the way its own software would | P1, P6 |
| [[T16 - npm run publish edge]] | `npm run publish:edge` | **2026-09-28** | **26 / 27** rute (yang ke-27 = kursus yang memang tidak ada lagi di katalog), kedua daftar `matchesChainNow` | the URLs printed inside a credential answer from a host that does not die with the laptop | P1, P6 |
| [[T17 - signer verify-live-cert.js]] | `node scripts/verify-live-cert.js` | **2026-09-28** | **17 / 0 failed** (+1 printed as `info`), dua artefak diperiksa satu per satu | the artefact layer a stranger can open in an explorer really enforces D42/D43, and every paper the ledger calls VALID on a durable host has an artefact whose `external_url` is that exact URL | P1 |
| [[T18 - signer verify-edge.js]] | `npm run verify:edge` | **2026-09-28** | **5 / 0 failed** + terukur **2 dari 8** kertas dapat diperiksa orang sepenuhnya | nothing we issued is stranded behind a host that only this laptop can reach — and how much of it is | P1, P6 |
| [[T19 - signer e2e.js]] | `npm run e2e` | **2026-09-28** | **42 / 0 failed** (run pertama 40 dengan 2 merah, keduanya asumsi harnessnya sendiri) | chain, daftar tersaji, URL di dalam kertas, artefak di wallet dan verdict pihak ketiga menunjuk **benda yang sama** — bukan lima lapis yang hijau sendirian-sendirian | P1, P6 |
| [[T20 - signer journey.js]] | `npm run journey` | **2026-09-28** | **34 / 0 failed**, 10 tahap; 2 permukaan dilaporkan sebagai TIDAK ADA DI CORE | seluruh perjalanan peserta di sisi core, dari kunci baru sampai prasyarat dicabut — dan inilah permukaan yang akan dipanggil FE | P1, P6 |
| [[T21 - signer db-probe.js]] | `npm run verify:db` | **2026-09-28** | **12 / 0 failed** | state belajar sungguh di Postgres; yang menahan akses adalah tanda tangan peserta (nonce sekali pakai), bukan RLS — karena secret key menembusnya (`BYPASSRLS`) — dan `attempt_hash` dihitung dari rekaman, bukan dikirim klien | P1 |

## Conventions for this folder

- One record per command, never one file for many commands. Template: `Templates/Template - Testing.md`.
- Output is pasted **verbatim**; truncate with `…`, never rewrite.
- Every record carries **"what this does NOT prove"** — that column is the reason a judge should trust
  the others.
- If a re-run changes a count, update the record and the pages that quoted it; the old number stays in
  [[00-Overview/04 - Corrections]] if it was ever wrong.

**Related:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · [[08-Results/00 - Hub Results]] · [[Quick-Reference]]
