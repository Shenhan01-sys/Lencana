---
tags: [testing, "T8"]
command: node scripts/serve-probe.js
measured: 2026-09-25
result: 20 checks / 0 failed
---

# T8 - signer serve-probe.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app/signer
node scripts/serve-probe.js
```

It starts the server **in-process on loopback** and asks it the same questions over HTTP that
[[T7 - signer check.js]] asks in-memory. No port is exposed to the network.

## Result — 2026-09-25 (excerpt, verbatim)

```
  ok    dokumen issuer tersaji lewat HTTP
  ok    verification method-nya punya publicKeyMultibase
  ok    list revocation: adalah BitstringStatusListCredential
  ok    list revocation: credentialSubject.statusPurpose cocok
  ok    list revocation: encodedList multibase base64url (u…)
  ok    list revocation: tanda tangannya SAH terhadap dokumen issuer yang disajikan
  ok    list suspension: adalah BitstringStatusListCredential
  ok    …
  ok    /healthz melaporkan kedua list
  ok    server memetakan slot untuk setiap kredensial yang diawasi

  chain: 11 kredensial diawasi · 1 revoked · 1 suspended · hash 0x1c27a74cbd081a…

PROBE SERVE HIJAU — 20 pemeriksaan, 0 gagal
```

The point of the last check: the **hash that gets anchored is the hash the server actually serves**.
That linkage was a bug before `servedHashes()` existed (the anchor recorded a one-credential list
nobody read) → [[00-Overview/04 - Corrections]].

## What this does NOT prove

- Nothing about reachability. Every URL inside the served documents is `http://127.0.0.1:8787/…`, so a
  third-party verifier following those links finds nothing. Loopback success is the reason P7 exists.
- No authentication, rate limit or concurrency behaviour: this is a correctness probe, not a load test.

**Related:** [[S7 - Server routes and lifecycle]] · [[T9 - npm run anchor]]
