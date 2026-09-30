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
| [[T4 - npm run probe]] | `npx tsx scripts/probe.ts` | **2026-09-28** | **73 / 0 failed** (59 lama + 14 pemeriksaan "klien belajar") | the *real* `verify.ts` reads public chain 97 correctly for four verdicts, the course content + grading authority are internally consistent, **and the learning client (`web/src/learning.ts`) tidak pernah mengirim angka yang dihitungnya sendiri** — `/grade` cuma bawa picks, tanda tangannya sah, mesin state dilalui bukan dilompati — semuanya offline dengan `fetch` dipalsukan | P1, P6, P4 |
| [[T5 - npm run rubric]] | `npx tsx scripts/rubric-check.ts` | **2026-09-25** | **17 / 0 failed** | the pass mark is computed, and policy vs material hash separately | P4 |
| [[T6 - npm run x402]] | `npm run x402` in `signer/` | 2026-09-24 | **20 / 0 failed**, 190,659 gas settled | the paid handshake end-to-end on the public chain, with money read back from chain | P3 |
| [[T7 - signer check.js]] | `node scripts/check.js` | **2026-09-28** | **94 / 0 failed** (25 kredensial diawasi) | document shape, signature round-trip, list bits derived from `statusOf()` — dan dokumen hasil tetap benar untuk rekaman lama yang **tidak** punya blok `attempts` | P1, P6 |
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
| [[T18 - signer verify-edge.js]] | `npm run verify:edge` | **2026-09-29** | **8 / 0 failed** + terukur **19 dari 19** kertas dapat diperiksa orang sepenuhnya (naik dari 10 lewat [[09-Testing/T24 - signer rehost.js]], nol transaksi; pemeriksaan baru: kunci tiap kertas terdaftar di dokumen penerbitnya, 3 agen) | nothing we issued is stranded behind a host that only this laptop can reach — and how much of it is | P1, P6 |
| [[T19 - signer e2e.js]] | `npm run e2e` | **2026-09-28** | **46 / 0 failed** (42 pagi → 46 sore, karena dua kertas `--from-attempts` ikut diawasi; run pertama 40 dengan 2 merah, keduanya asumsi harnessnya sendiri) | chain, daftar tersaji, URL di dalam kertas, artefak di wallet dan verdict pihak ketiga menunjuk **benda yang sama** — bukan lima lapis yang hijau sendirian-sendirian | P1, P6 |
| [[T20 - signer journey.js]] | `npm run journey` | **2026-09-28** | **34 / 0 failed**, 10 tahap; 2 permukaan dilaporkan sebagai TIDAK ADA DI CORE | seluruh perjalanan peserta di sisi core, dari kunci baru sampai prasyarat dicabut — dan inilah permukaan yang akan dipanggil FE | P1, P6 |
| [[T21 - signer db-probe.js]] | `npm run verify:db` | **2026-09-28** | **28 / 0 failed** | state belajar sungguh di Postgres; yang menahan akses adalah tanda tangan peserta (nonce sekali pakai), bukan RLS — karena secret key menembusnya (`BYPASSRLS`) — dan `attempt_hash` dihitung dari rekaman, bukan dikirim klien. Mulai run ini juga: **angka kuis dihitung server (`POST /grade`), dan `/grade` menolak `score` kiriman klien** | P1 |
| [[T22 - signer attempts-check.js]] | `npm run verify:attempts` · `npm run verify:attempts:live` | **2026-09-28** | **25 / 0** offline · **55 / 0** live (satu alur HTTP penuh: enroll → 57 POST progres → 4 kuis dinilai server → terbit → `/results/…` dari tepi publik) | setiap angka di kertas bisa diturunkan dari baris usaha, `attempt_hash`-nya tercetak di dokumen hasil, dan dua gerbang (`all_lessons_done`, `best_score`) harus lewat **sebelum** gas bergerak | P1, P6, P4 |
| [[T24 - signer rehost.js]] | `npm run rehost` · `npm run rehost -- --apply` | **2026-09-29** | 7 kertas host mati terklasifikasi (1 gratis · 6 butuh identitas · 0 asing) · **7 dipindah tanpa satu transaksi pun**, `verify:edge` 10 → 11 → 17 → **19 dari 19** | memindah URL di dalam kertas tidak menyentuh chain karena `credentialHash` tidak memuat isi dokumen; identitas penerbit ikut pindah HANYA setelah builder memutuskan (B83), dan bentuk array lama hanya berubah dengan bendera sendiri (`--fix-status-shape`, B68) | P1, P6 |
| [[T25 - web spec-audit-check.ts]] | `npm run check:spec` · `-- --self-test` | **2026-09-29** | **14 / 0** lulus terhadap dokumen yang terbit · self-test: dokumen yang sama dirusak 6 cara → **11 baris merah** · bahan uji 404 → **0 lulus, 14 tidak terbaca** | tab "kepatuhan 14/14" yang dulu menjual `PASS` sebagai teks (dan menilai dokumen yang dikarang browser, dengan `proofValue` yang tidak pernah ditandatangani) sekarang dihitung dari kertas yang benar-benar disajikan tepi — dan bisa merah | P1, P6 |
| [[T26 - signer sample-check.js]] | `npm run check:samples` | **2026-09-30** | **9 / 0** · 21 dokumen di store · **21 terbit di tepi** · 13 valid · 6 revoked · **1 expired · 1 delisted** (B102: dua spesimen lewat `npm run specimen` 7/0; 29 Sep masih 5 / 0 dengan 19 dokumen dan **0 expired · 0 delisted**) | tombol cepat verifier diadili per nilai: 200 di tepi DAN status di chain harus cocok dengan labelnya; "sah di chain" tidak sama dengan "bisa dibaca orang" | P1, P6 |
| [[T27 - signer cold-store-probe.js]] | `npm run probe:cold` | **2026-09-29** | **23 / 0** · `/healthz` 200 dengan store kosong · kedua daftar status 200 + bertanda tangan · `/credentials/<hash NYATA>` → 404 beralasan (objek yang sama **200 di tepi**) · `state.json` hangat tidak berubah ukuran/mtime | mengadili keadaan yang dilihat orang dari `git clone` (`.store/` KOSONG) — dan menemukan bug-nya: `/healthz` dulu 500 karena cabang "konfigurasi belum diisi" dipakai juga untuk "belum ada kertas" | P1, P6 |
| [[T28 - signer monitor-edge.js]] | `npm run monitor:edge` (+ workflow `edge-monitor`) | **2026-09-29** | **AMAN 0 alarm** · watchedHashes 27 · denganDokumen 19 · kedua daftar `matchesChainNow=true` 27/27 · umur state 7,6 jam · kontrol `--max-age=0` → ALARM umur · host mati → ALARM healthz | alarm **eksternal** B67: menolak sambil diam bukan alarm; isu berisi JSON pengukuran dibuka sendiri oleh cron | P1, P6 |
| [[T29 - signer label-coverage.js]] | `npm run check:labels` | **2026-09-30** | **8 / 0** · 83 marker di 49 ID · 72 baris · **51 tertutup** *(malam 30 Sep, sesudah B116 + B117; sore hari yang sama: 82 · 48 · 70 · 50)*, 5 di antaranya beralasan `TANPA TAG KODE` (B43 B71 B74 B76 B115) · 0 lubang, 0 bandel, 0 sisa bentuk lama · self-test 12 fixture 0 luput | kelengkapan marker aturan #18 — A9 hanya jaga konsistensi; tanpa ini "semua yang selesai sudah berlabel" cuma angka di chat | P6 |
| [[T31 - signer identity-check.js]] | `npm run check:identity` | **2026-09-30** | **9 / 0** (8 / 0 sebelum agen keempat B102) · hash dokumen builder = signer lokal = tepi (`25495c4988aaf722`) · baseUrl host tetap · kunci .keys termuat eksak · agen yang dirujuk kertas terbit ikut diadili *(baris ini tadinya menulis **4 / 0** — basi, dan tidak ada gerbang yang menangkapnya karena A10 hanya menyapu README akar dan `DOC_CLAIMS` tidak mendaftar baris hub; angka 8/0 dicetak `npm run sync:numbers` 30 Sep — lihat **B114**)* | mengadili "satu sumber identitas" (B84) di tiga pembacaan; merah kalau kode berubah tanpa `publish:edge` atau sebaliknya | P1, P6 |
| [[T32 - signer cleanup.js]] | `npm run cleanup` (dry-run) · `-- --apply` | **2026-09-30** | **6 / 0** · sisa `origin=test` = **0**; terhapus 38 enrollment · 129 attempts · 144 components · 81 progress · 209 events | B78(a): pemurnian dengan bukti kueri; default dry-run, jejak disimpan sebelum hapus, `unknown` tidak disentuh | P6 |
| [[T34 - signer deposit-check.js]] | `npm run verify:deposit` · `npm run verify:deposit:live` | **2026-09-30** | **27 / 0** tanpa gas · **38 / 0** live: satu setoran premi-tenggat dari setor sampai selesai di chain 97, premi kembali utuh | B90: `CourseDeposit` ter-deploy (`0xbeB5…E6c3`), ada rutenya, `policyHash` dihitung dari manifest, `issuedAt` dibaca dari BAS; jalur telat tetap hanya terbukti di `forge test` | P1, P4 |
| [[T33 - signer relay-check.js]] | `npm run verify:relay` · `npm run verify:relay:live` | **2026-09-30** | **31 / 0** tanpa gas · **17 / 0** live: satu siaran dari antrean di chain 97 (347.059 gas), kiriman ulang tidak menjadi siaran kedua | B97: rute `POST /relay` menolak sebelum gas segala yang pasti revert (skema lain, agen tak terdaftar, tanda tangan tak pulih, nonce terpakai antrean, kredensial sudah terbit) dan mengantrekan yang sah secara idempoten | P1, P11 |

## Conventions for this folder

- One record per command, never one file for many commands. Template: `Templates/Template - Testing.md`.
- Output is pasted **verbatim**; truncate with `…`, never rewrite.
- Every record carries **"what this does NOT prove"** — that column is the reason a judge should trust
  the others.
- If a re-run changes a count, update the record and the pages that quoted it; the old number stays in
  [[00-Overview/04 - Corrections]] if it was ever wrong.

**Related:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · [[08-Results/00 - Hub Results]] · [[Quick-Reference]]
