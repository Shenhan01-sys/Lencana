---
tags: [reference, commands]
status: active
updated: 2026-09-28
---

# Quick Reference

Every line was run against this working copy. The date is when that number was last printed. **If a
command and a page disagree, the run wins.**

> **Cara membaca dua tabel di halaman ini (B117, 30 Sep).** Tabel pertama di bawah adalah **rekaman
> bertanggal** — kolom `last` menyebut hari angkanya dicetak, dan sebagian besar barisnya 28 Sep (mis. web
> probe 59/0, `verify:edge` 5/0 dengan 8 dari 14). Itu bukan angka hari ini dan tidak dijaga alat. **Klaim
> kini** ada di tabel kedua ("Perintah yang ditambahkan 29 Sep") yang dijaga `npm run sync:numbers -- --verify`,
> dan di `09-Testing/numbers.json`: 30 Sep web probe 86/0 · `check` 91/0 · `serve-probe` 49/0 ·
> `verify:edge` 9/0 (19 dari 19) · `verify:live-cert` 35/0 · `e2e` 46/0.

| command (from `app/`) | prints | last |
|---|---|---|
| `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` | 104 passed / 0 failed | 28 Sep |
| `cd web && npx tsc --noEmit && npm run build` | clean | 28 Sep |
| `cd web && npm run probe` | 59 / 0 - the page's own `verify.ts`, four verdicts, public chain 97. Sejak 28 Sep memuat `../.env` sendiri (`scripts/load-env.ts`): sebelumnya `npm run probe` di clone bersih memeriksa `0x0000…` di port lokal dan keluar merah sementara README menjanjikan sebuah angka | 28 Sep |
| `cd web && npx tsx scripts/rubric-check.ts` | 17 / 0 - policy and material hash separately | 28 Sep |
| `cd web && npx tsx scripts/inventory.ts` | 2 courses · 7 modules · 24 lessons · 412 minutes | 26 Sep |
| `cd signer && node scripts/check.js` | **91 / 0** (30 Sep; tumbuh bersama korpus yang diawasi — 88/0 pada 29 Sep, 76 lebih pagi lagi, 84/0 saat korpus 17 rekaman) | 30 Sep |
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

## Perintah yang ditambahkan 29 Sep (dan apa yang dibuktikannya)

| perintah | apa | angka terakhir yang dicetak |
|---|---|---|
| `npm run verify:attempts` / `:live` | satu rantai peserta → rekaman → `issue --from-attempts` → `/results/…` (`:live` menulis 1 attestation testnet) | 31/0 offline · 67/0 live |
| `npm run rehost [-- --apply --move-identity --fix-status-shape]` | memindah kertas ke host tetap tanpa transaksi: URL ditulis ulang + ditandatangani ulang dengan kunci Multikey yang sama | 7 kertas; `verify:edge` 19 dari 19 |
| `npm run grade:essay` | antrean esai penerbit; angka masuk hanya lewat tanda tangan EOA penerbit (`POST /essay/judgement`) | `verify:db` 48/0 *(tadinya 47/0 — basi; baris ini sekarang dijaga `DOC_CLAIMS`, B114)* |
| `npm run audit` | konsistensi proyek: registry tunggal, kalimat terlarang di README/docs, placeholder, dokumen karangan, blokir basi, item hilang dari backlog, tag↔baris, bahasa identifier, angka README | **12 pemeriksaan · 0 TEMUAN** (30 Sep) *(baris ini tadinya menulis "2 TEMUAN (A3 berkas Dave, A6 Vault akar)" — benar pada 29 Sep, basi sesudah A3/A6 ditutup lewat B98/B99. `audit` bukan harness di `numbers.json`, jadi tidak ada gerbang yang bisa menangkapnya; itu dicatat di B114)* |
| `npm run sync:numbers` / `-- --verify` | `vault/09-Testing/numbers.json` = satu sumber angka; `--verify` memarahi halaman vault yang angkanya tidak cocok | **ANGKA HIJAU — 28 klaim halaman diperiksa, 0 tidak cocok** (30 Sep malam; jumlah klaim itu dicetak alatnya sendiri — 25 lalu 26 sebelum B117, dan 28 sesudah dua klaim `verify:relay` milik B97 didaftarkan) *(tadinya tertulis "9/9 harness terurai" — benar saat harnessnya masih sembilan; jumlah harness sengaja tidak kutulis di sini karena tidak ada perintah yang mencetaknya)* |
| `npm run sync:numbers -- --only=<id>` | ulang SATU harness saja untuk mendiagnosis merah (mis. `--only=serveProbe`); angka sebagian tidak masuk JSON — ia menolak menulis `numbers.json` | 1 harness, tanpa menulis JSON |
| `npm run diag:lists` | mengadili perbedaan hash daftar: render vs sajian tepi vs `getTimestamp` BAS | membuktikan B89 bukan soal data |
| `npm run probe:serve` | mengadili server signer yang SEDANG BERJALAN (49 pemeriksaan) — ia TIDAK menyalakan server: `npm run serve` dulu, kalau tidak ia bilang "nyalakan dulu" + cara melepas port per-PID | PROBE SERVE HIJAU — 49, 0 gagal |
| `npm run check:samples` | mengadili tiap nilai `SAMPLE_HASHES` di FE: 200 di tepi DAN status di chain cocok dengan labelnya | CONTOH UI HIJAU — 5 pemeriksaan, 0 gagal |
| `npm run probe:cold` | server signer dengan `.store/` KOSONG — keadaan setiap orang yang datang dari `git clone` (B42/B106) | PROBE COLD HIJAU — 23, 0 gagal |
| `LANCENA_ORIGIN=demo` | setel sebelum `npm run serve` untuk demo; harness menyetel `=test` sendiri (B78) | dibaca balik oleh `verify:db` sebagai pemeriksaan |
| `npm run check:labels` | kelengkapan marker aturan #18: tiap ID tertutup punya marker atau alasan, tiap marker cocok dengan barisnya, tidak ada sisa bentuk lama, marker wajib di baris komentar dan wajib berstatus | LABEL HIJAU — 8 pemeriksaan, 0 gagal |
| `npm run check:identity` | hash dokumen issuer builder vs signer lokal vs tepi harus sama, plus baseUrl host tetap | IDENTITAS HIJAU — 8 pemeriksaan, 0 gagal *(sebelumnya tertulis 4 — basi tanpa gerbang yang menangkap; B114)* |
| `npm run cleanup` | bersihkan baris tes Postgres dengan bukti; tanpa `--apply` hanya menghitung | CLEANUP HIJAU — 6, 0 gagal |
| `npm run judge-variance` | ulangi penilaian 5x, dua kelas jawaban — bukti penilai punya gigi | substantif spread 0 · kosong 3 · jarak 97,0 |
| `npm run monitor:edge` | alarm eksternal tepi: umur `publishedAt` vs ambang, `matchesChainNow` kedua daftar, `unchecked`, dokumen nyata 200 | AMAN 0 alarm · `--max-age=0` → ALARM |
| `npm run check:spec` / `-- --self-test` | 14 predikat kepatuhan dijalankan atas dokumen yang disajikan tepi; self-test merusak dokumen yang sama dan menuntut barisnya merah | 14 lulus · 0 gagal · self-test 11 merah |
| `npm run verify:relay` | rute relayer `POST /relay` (B97): yang sah diantrekan, yang pasti revert ditolak sebelum gas; server dan store-nya sendiri, siaran mati | RELAY HIJAU — 31 pemeriksaan, 0 gagal |
| `npm run verify:relay:live` | sama, dengan `RELAY_BROADCAST=1`: **menulis 1 attestation testnet** dari antrean dan membacanya balik dari chain (attester = agen, saldo agen tetap, tanpa siaran ganda) | RELAY LIVE HIJAU — 17, 0 gagal (30 Sep, 347.059 gas) |
| `npm run sim:deadline` | simulator B90; mengubah bentuk insentif setelah terbukti ladder refund bukan penalti | RUN 2: 5d murah hanya di dunia cepat |
