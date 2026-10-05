---
tags: [signer, hub]
status: active
updated: 2026-10-03
---

# 01 - Signer Service

`../signer/` — the piece that turns an assessment into a standard document, and the piece that
handles money. Node, no framework, `tsx` for anything that imports from `../web/src` (those files use
extensionless imports → [[R6 - Toolchain traps that cost time]]).

Three responsibilities that must not be merged in the reader's head:

| | what it does | who it belongs to |
|---|---|---|
| **Document** | builds `OpenBadgeCredential` (VC 2.0) with `DataIntegrityProof` / `eddsa-rdfc-2022`, and two `BitstringStatusListCredential`s derived from chain state on every request | the platform, as a service to the issuer |
| ~~**Agent**~~ **Kunci penerbit** *(Koreksi 3 Okt, D54)* | signs attestations **as the third-party issuer** through `attestByDelegation`, grades essays (mechanically against the issuer's rubric, or with a model), and anchors list hashes to BAS *(Koreksi 3 Okt: baris ini dulu berlabel "Agent" karena kunci penerbit kami sebut "agen penerbit". Sejak D54 (1 Okt) kata "agen" berarti agen penilai ERC-8004 sewaan (B119/B120): ia hanya menilai dan mengusulkan angka, dibayar per aktivitas, dan **tidak pernah** menandatangani atau mencabut kredensial — yang menandatangani attestation dan kredensial tetap kunci penerbit di `signer/.keys/`. Lihat [[00-Overview/03 - Decisions]] D54 dan [[10-Contributors/Claims-Cheat-Sheet]].)* | the issuer's key signs; the platform pays gas |
| **Payment** | answers `402 Payment Required`, verifies the x402 `exact` scheme's signature and target, broadcasts the settlement, then splits it in `SettlementSplit` *(Koreksi 3 Okt: tadinya hanya `POST /verify`; kini tiga rute meminta bayaran — `POST /verify`, `POST /enroll` untuk kursus berbayar (B125, D60; koin uji lewat `POST /faucet`), dan `POST /agent-charges/<id>/pay` untuk tagihan agen sewaan (B119, payee = dompet agen) — rincian di [[S7 - Server routes and lifecycle]].)* | the platform |
| **Learning state, accounts, roles** *(baris ditambahkan 3 Okt sebagai koreksi terlihat: tabel ini tadinya hanya tiga tanggung jawab, padahal sebagian besar rute sejak 28 Sep ada di sini)* | enrollment, progres, kuis (`POST /grade`), esai, praktik (`POST /praktik`, B121) di Postgres; ikatan alamat ↔ login Privy (`POST /auth/privy`, B82/D57); rekaman milik peserta (`POST /me/records`, B124); kursi akun dari fakta (`POST /me/roles`, B128); pengajuan + keanggotaan penerbit dan dasbor penerbit (`POST /me/member-request`, `POST /publisher/members`, `POST /publisher/overview`, `POST /publisher/agents/hire`, `POST /publisher/reviewers` — B128/B129); dasbor Agent Owner (`POST /owner/overview`, `POST /owner/gas` — B130). Daftar rute: `signer/src/server.js:580-584` (dibaca 3 Okt; berkas sedang disunting untuk B131, jadi nomor barisnya bisa bergeser) | the platform; setiap tulisan atau bacaan pribadi tetap butuh tanda tangan akun itu atas nonce sekali pakai, dan keanggotaan hanya lahir dari tanda tangan kunci penerbit |

*(Koreksi 30 Sep, B117: baris "Document" di atas menulis daftar status "derived from chain state on every
request". Itu benar untuk signer lokal. Di tepi publik, sejak 28 Sep, daftar ditandatangani saat
`publish:edge` dan tiap permintaan hanya mencocokkannya dengan chain — D44, [[S10 - Edge surface]]. Angka di
bagian "Reproduce" di bawah bertanggal 25–28 Sep; angka kini ada di `09-Testing/numbers.json`.)*

`src/server.js` is the product. Everything named `check` / `probe` / `x402` / `judge` / `delegate` /
`anchor` is a **harness** so a stranger can re-run a claim from a clone — not a feature the user is
supposed to type.

## Parts

- [[S1 - The credential document]] — field order, the `id` XOR `identifier` rule, `result[].value`, `verificationMethod` as an HTTP URL, multibase proof value
- [[S2 - Status lists from chain state]] — `LIST_BITS = 131.072`, slot allocation, `servedHashes()` as the single source, and what an anchor does **not** prove
- [[S3 - Two status lists]] — why one bit cannot hold both a permanent revocation and a recoverable delisting
- [[S4 - Delegated issuance]] — the EIP-712 domain read from the contract, `ATTEST_TYPEHASH`, single vs batch request shapes, the recover-guard, agent balance unchanged to the wei
- [[S5 - Grading and the model judge]] — `grade.js` (mechanical, refuses) vs `judge.js` (model, fail-closed), the negative control, measured spread
- [[S6 - x402 paid verification]] — the handshake, the guards that refuse to pay gas for someone else's transfer, batch pricing and the break-even arithmetic
- [[S7 - Server routes and lifecycle]] — every route, `/healthz` as the state witness, `jsonBody()` and the BigInt failure it exists for
- [[S8 - Criteria document]] — the publisher's paper: `achievement.criteria` was a URL pointing at nothing until this existed, and what may and may not appear in it
- [[S9 - Result document]] — where a public `value: "92"` gets its provenance, and why the answer key and the essay text are refused
- [[S10 - Edge surface]] — the durable read layer that closes **B51**: never signs, refuses stale lists against the chain, and what that trade costs us

## Reproduce

```powershell
cd app/signer
npm install
node scripts/check.js            # 53 checks / 0 failed (25 Sep) — needs ../.env values in the environment
node scripts/serve-probe.js      # 20 checks / 0 failed (25 Sep) — ~~in-process HTTP, no port exposure~~ (lihat koreksi di bawah)
npm run validator -- --record    # 10 checks / 0 failed (28 Sep) — needs a reachable host, see T15
npm run verify:deploy            # 15/15 (28 Sep) — reads expectations from the deploy script, not from notes
```

*(Koreksi 3 Okt: komentar `serve-probe.js` di atas salah — probe memanggil `BASE_URL` lewat HTTP dan **butuh server yang sudah jalan** (`npm run serve` dulu, lalu `npm run probe:serve`); ia tidak menyalakan server di dalam prosesnya sendiri (`signer/scripts/serve-probe.js:10`). Koreksi yang sama untuk T8 tercatat 28 Sep di [[00-Overview/04 - Corrections]] (B48); halaman ini tertinggal. Angka-angka di blok ini bertanggal — angka kini ada di `09-Testing/numbers.json`.)*
*(5 Okt, B154 + B156: signer yang dipakai produk berjalan di Railway — `https://signer-production-e4f2.up.railway.app`, ~~terdeploy otomatis dari `main` GitHub~~ *(koreksi hari yang sama: sumbernya repo GitHub, tapi belum ada pemicu deploy — akun Railway belum punya akses GitHub ke repo, dan dorongan `d0ee46c` tidak mendeploy; lihat T80 langkah 7)*; tidak ada lagi signer lokal yang wajib menyala. Baterai menyalakan signer sementaranya sendiri untuk `serve-probe`. Lihat [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]] dan [[09-Testing/T80 - Uji alur kerja tanpa server lokal (B156)]].)*

⚠️ The chain-reading harnesses read `process.env` directly. Without `RPC_URL`, `RESOLVER_ADDRESS`,
`BAS_ADDRESS` and the watched hashes they **fall back to defaults and skip whole groups of checks**
while still printing a green line — the summary reports the skipped group, and reading only the count
is how a false green gets believed. See [[09-Testing/00 - Hub Testing]].

**Related:** [[02-Contracts/01 - Contracts]] · [[05-Course-Content/01 - Course Content]] · [[00-Overview/03 - Decisions]]
