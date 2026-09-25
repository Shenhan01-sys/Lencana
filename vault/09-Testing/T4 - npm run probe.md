---
tags: [testing, "T4"]
command: npx tsx scripts/probe.ts
measured: 2026-09-25
result: 59 checks / 0 failed against public chain 97
---

# T4 - npm run probe

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1, P6

## Command

```powershell
cd app/web
npx tsx scripts/probe.ts     # needs RPC_URL, RESOLVER_ADDRESS, CERT_ADDRESS, BAS_ADDRESS, DEMO_HASH* in the environment
```

`tsx` is required because the probe imports `src/*.ts` files that use extensionless internal imports.

## Result — 2026-09-25 (excerpt, verbatim)

```
  ok    hash asing -> NOT_FOUND
  ok    address -> ditafsirkan issuerAddress
  ok    masukan buruk -> unresolved, tidak crash
  ok    kredensial nyata -> keputusan VALID
  ok    kredensial nyata -> holder = peserta
  ok    kredensial nyata -> artefak terhubung
  ok    kredensial nyata -> artefak locked
  ok    kredensial nyata -> schema UID cocok
  ok    kredensial nyata -> rantai AKTIF
  ok    yang dicabut -> REVOKED
  ok    yang dicabut -> rantai atasnya ikut tertutup
  ok    menumpang yang dicabut -> dikenali
  …
PROBE HIJAU (59 pemeriksaan, 0 gagal)
```

The four verdicts it distinguishes: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while the
credential it is built on has been revoked" — the last one is the gap EAS leaves open
([[A2 - Why BAS and the EAS gap we close]]).

18 of the 59 do not touch the chain at all: they audit the **course data and the grading authority** —
unique lesson slugs, quiz answers inside their option range, every rubric summing to 100, the demo
learner's `credentialHash` **recomputed from the course content** and asserted equal to the attestation
read from chain 97, and every course required to have an issuer manifest with a `rubricHash`
([[K2 - The issuer manifest and rubricHash]]).

## What this does NOT prove

- Nothing about rendering in a real browser: it drives `verify.ts` and `render` functions in Node.
  A human has never clicked through `#/learn` ([[07-Backlog/01 - Backlog]] P12).
- It proves the page uses the same code as the harness — not that the page is what a judge will see
  after the next front-end merge. Re-run T3 + T4 after every merge → [[FE4 - Mount contract with the maintainer]].
- It does not validate the document against a third-party validator; that is P7.

**Related:** [[FE1 - Verifier page and verify.ts]] · [[Concepts/DOM-free Verification Module]]
