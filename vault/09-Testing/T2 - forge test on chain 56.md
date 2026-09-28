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
**9** end-to-end di fork 56, **38** resolver fork — komposisi identik dengan
[[T1 - forge test on chain 97]], dan itu memang gunanya menjalankan test yang sama terhadap state
mainnet.

## "Identical gas figures" — kalimat lama itu salah, dan ini angkasanya

Halaman ini ditulis warisan: baris *"identical gas figures"* berasal dari run 23 Sep dan tidak pernah
diuji lagi, sementara angkanya (97 test) sudah tiga hari tidak benar. 28 Sep kucocokkan dua run dari
satu perintah yang sama, baris per baris, **104 dari 104 test terhitung di kedua sisi** — termasuk
satu fuzz test yang tidak mencetak satu angka gas pun (`runs: 256, mean, median`) dan dulu hilang dari
perbandingan tanpa suara.

| | |
|---|---|
| test yang sama di kedua run | 104 · 0 hanya di satu sisi |
| gas berbeda | **7 test**, semuanya di jalur settlement/proxy fork |
| besar bedanya | **+13 gas, persis sama di ketujuhnya** (mis. `test_fork_pembayaran_masuk_ke_split_lalu_terbagi` 206.759 → 206.772; `test_fork_proxinya_memang_proxy_exact_x402` 19.406 → 19.419) |
| sisanya | 97 test angka gas-nya identik byte untuk byte, fuzz test identik runs/mean/median |

Yang +13 itu semuanya memanggil **proxy x402 kanonis dan BAS yang ter-deploy di chain
masing-masing** — jadi bedanya bukan perilaku kontrak kita, melainkan state milik deployment yang
kita fork: jumlah slot yang dibaca berbeda 13 gas di 56 dibanding 97. Itu penjelasan yang masuk akal
dan **bukan** klaim yang sudah kumenangkan: yang terbukti di sini hanyalah "bedanya 13, selalu di
jalur yang menyentuh pihak ketiga, dan tidak pernah membalikkan satu assertion pun". Yang tidak boleh
lagi ditulis: "identical gas figures". Yang boleh: *komposisi dan verdict identik di kedua chain;
7 test berbeda 13 gas karena state proxy/BAS milik deployment yang di-fork berbeda.*

Cara memeriksa ulang tanpa perkakas milikku: `npm run test:chains` lalu bandingkan kolom
`(gas: …)` antara blok 97 dan blok 56 — 104 baris tiap blok.

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
