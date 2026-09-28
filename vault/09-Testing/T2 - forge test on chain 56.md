---
tags: [testing, "T2"]
command: forge test --evm-version cancun --fork-url <56>
measured: 2026-09-28
result: 104 passed / 0 failed
---

# T2 - forge test on chain 56

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app
forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/
```

## Result — 2026-09-28 (verbatim tail)

```
Ran 5 test suites in 6.93s (17.02s CPU time): 104 tests passed, 0 failed, 0 skipped (104 total tests)
```

Per suite dalam run yang sama: **22** settlement split, **27** artefak, **8** split-on-56 fork,
**9** end-to-end di fork 56, **38** resolver fork. Angka gas cocok dengan
[[T1 - forge test on chain 97]] suite demi suite — itu memang gunanya menjalankan test yang sama
terhadap state mainnet.

**Riwayat yang sengaja tidak kuhapus:** halaman ini punya front-matter bertanggal 28 Sep dengan angka
104, sementara tubuh tempelannya masih 23 Sep dengan angka 97 dan tulisan "not re-run since".
Kontradiksi dalam satu berkas itu membuat klaim "104/0 di 97 DAN 56" bertumpu pada run yang
catatannya sendiri bilang belum diulang — persis kegagalan yang kita catat untuk catatan riset orang
lain. Kedua chain sekarang diulang pada hari yang sama, dan tempelan yang di atas adalah run hari ini;
run 23 Sep (97/0) tetap fakta riwayat → [[00-Overview/04 - Corrections]].

## Why run the suite against mainnet state at all

`CredentialResolver` and the split tests speak to the **canonical** BAS and the canonical x402 proxy.
Passing on 56 proves the interfaces and constants match the production deployment — it does **not**
mean we are deployed there, and we are deliberately not (testnet satisfies the rules; the requirement
is an address that resolves on an explorer).

## What this does NOT prove

- No deployment, no transaction, no funds on chain 56. See [[08-Results/01 - Evidence and Limits]].
- That RPC endpoints are reliable under burst: public endpoints on this project have returned
  `Request timeout on the free plan`, HTTP 500 and 7/10 flakiness. Endpoint choice is documented in
  [[R6 - Toolchain traps that cost time]].

**Related:** [[T1 - forge test on chain 97]] · [[02-Contracts/01 - Contracts]]
