---
tags: [testing, "T14"]
command: npm run verify:deploy
measured: 2026-09-28
result: 15 claims / 0 mismatch
---

# T14 - `npm run verify:deploy` (alamat yang dikutip form, dibaca dari chain)

**Perintah:** `cd signer && npm run verify:deploy`. Dibuat 28 Sep.
**Hasil run pertama:** 15/15 cocok; **pada saat dibuat ia merah 2 baris** — dan itu temuan, bukan
kegagalan skrip (lihat di bawah).

Yang dibandingkan adalah **klaim yang kami tulis sendiri** vs **nilai yang dibaca RPC publik chain 97**
saat ini: `chainId`, kelima alamat berupa kontrak ber-code, `schemaUID()` terisi, `isIssuer(agen)`,
`supportsInterface(ERC-5192)`, `name()`/`symbol()` **dibaca dari `script/DeployCredentials.s.sol`**
(bukan dari chain, supaya tidak membandingkan chain dengan dirinya sendiri), `platformBps()`,
`MAX_BPS`, `sharesOf(1000)`, dan `decimals()` token.

```
split.platformBps() = 1000 (10 %)      kami="1000" chain="1000"
split.MAX_BPS = 2500                   kami="2500" chain="2500"
split.sharesOf(1000) = 100             kami="100"   chain="100"
token.decimals() = 6                   kami="6"     chain="6"      (sebelumnya chain="18")
```

## Dua hal yang ditemukan perintah ini pada hari pertama

1. **`DemoCourseToken` tidak pernah meng-override `decimals()`** — OZ membalas 18 sementara komentar
   kami (empat berkas) dan constructor `1_000_000e6` mengasumsikan 6. Artinya `PRICE = 1000` yang kami
   sebut "$0,001" sebenarnya 1e-15 unit di chain yang ter-deploy. Diperbaiki di kontrak, dikunci test
   `test_TokenDemoBenarBenEnamDesimal`, dan token di-deploy ulang ke `0x0B2fA5…` (yang lama tetap ada
   sebagai riwayat settlement 23-24 Sep).
2. **Baris T14 ini sendiri adalah klaim yang salah sebelumnya**: `00 - Hub Testing` mencantumkan
   `scripts/verify-deploy.js` sejak lama dan berkasnya tidak pernah ada. Hub itu menyebutkan perkakas
   yang tidak kami punya — persis kelas kesalahan yang kami tuntut dari materi orang lain.

**Lihat juga:** [[02-Contracts/01 - Contracts]] · [[04-Signer-Service/S7 - Server routes and lifecycle]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
