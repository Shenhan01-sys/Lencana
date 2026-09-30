# 05 — Status and order of work

**Last updated: 29 September 2026. Submission deadline: 30 September 2026, 23:59 WIB (1 day).**
**Newest work queue: [[07-Backlog/03 - Findings and Tasks 2026-09-26]] (26-28 Sep) — B38 artefact metadata
frozen at mint, B39 artefact granularity, B40 batch mint, B41 the validator run, B42 cold-store blind
spot in the harness, B43 documentation debt, and since this morning B48 (one slug per process),
B51 (durable host), B53-B56 (what our own guards failed to see). The table below keeps the shape it had
on 21 Sep and is not corrected row by row; treat that page as current where they disagree.**

**Tiga kalimat di tabel bawah ini sudah tidak benar dan tidak boleh dikutip dari sini:** (1) "the HTTP
`402` side has never run" — ia berjalan 23-24 Sep dan `npm run x402` **20/0**; (2) "the validator does
**not** pass yet — 2 shape errors" — bentuknya dibetulkan dan validator mengembalikan `outcome: VALID`
untuk dua kredensial (28 Sep, 14 checks, 0 error/0 warning); (3) "97 tests pass on fork chain 97 and 56" —
hari ini **104/0** di kedua chain, dan jumlah harness signer bukan 65/37 lagi (76/0 dan 48/0). Yang tetap
benar dan masih terbuka: pendaftaran event, video, dan cold-store probe (B42).

## Where things stand

| | |
|---|---|
| On-chain layer (3 contracts) | ✅ written · **97 tests pass on fork chain 97 and 56** (23 Sep) · **deployed to public chain 97 (21 Sep)** — addresses and measured cost in [[06-Spec-Research/01 - Spec Research|01 - Spec Research]] §D, re-read from the chain by an independent script (13/13), not trusted from a build log. Third contract (`SettlementSplit`, revenue split) is deployed on 97 and received a **real x402 settlement** on 23 Sep; it has no mainnet deployment and no hosted caller, and the HTTP `402` side has never run — see the limits row below |
| Verification page | ✅ built · typecheck + build pass · **probe 59 checks / 0 failed against the PUBLIC testnet (23 Sep)**, covering four verdicts: `VALID`, `REVOKED`, `ISSUER_DELISTED`, and "valid while its prerequisite is revoked" |
| Reproducible demo data | ✅ `SeedDemo` seeds four distinct verdicts and converges in **two documented runs** — now run against public chain 97, and the four credential hashes came out **identical to the fork**, which is the point of hashing (holder, courseId) instead of pointing at a UID |
| Credential-signing backend | ✅ **exists, one command deep, and green against the public chain**: `app/signer/` issues `OpenBadgeCredential` 3.0 with `DataIntegrityProof` + `eddsa-rdfc-2022`, serves two BitstringStatusLists derived from chain state, anchors both list hashes with BAS `timestamp()`, and since 27 Sep also serves the criteria document its own credentials point at. `check.js` **65/65**, HTTP `serve-probe` **37/37** (27 Sep, through a public tunnel — jumlah check tumbuh bersama himpunan pantau; angkanya dicetak oleh run). What is left: the validator does **not** pass yet — 2 shape errors, tracked as **B46**/**B47** → [[09-Testing/T15 - 1EdTech validator]] |
| Real course content | ✅ **21–22 Sep.** A learning surface exists: **2 courses · 7 modules · 24 lessons · 34 pages · 412 minutes · 28 quiz questions · 2 rubric-scored essays**, all six lesson kinds used. Counts come from `npm run inventory`, which reads the course data — not from a number typed into a document. The flagship course id is deliberately `web3-dasar-2026`, the same constant `SeedDemo.s.sol` hashes into `courseId`, and `npm run probe` recomputes the demo learner's `credentialHash` from the course content and asserts it equals the attestation on public chain 97 |
| Learning surface (`web/#/learn`, `#/course/*`, `#/me`) | ✅ built 22 Sep · hash router over typed content, no UI framework (the reason `verify.ts` stays DOM-free and probeable) · progress in localStorage and labelled as **not evidence** · typecheck + build green · probe **59/59** |
| Who decides a grade | ✅ **the issuer, structurally** (22 Sep). `CourseManifest` carries the policy (criteria, weights, `passMark`, every quiz/essay rubric) and `rubricHash` — a keccak over the policy alone — is printed into the credential's `achievement.criteria`, so the platform cannot change the rules after a diploma exists. `web/src/score.ts` computes the composite and knows no institutional numbers; `BELUM_LENGKAP` is a real verdict, deliberately distinct from `0`. `issue.js` **no longer accepts `--score`**: it takes evidence and refuses before spending gas. Harnesses: `npm run rubric` **17/17**, probe **59/59**, signer `npm run check` **53/53**, `npm run judge` 7/7 (negative control), `npm run judge-variance` (spread 91–100, decision stable across 5 runs) |
| Deploy to public testnet | ✅ **done 21 Sep.** Funding was the only blocker and it turned out to be trivial: the whole sequence costs under 0.002 BNB of testnet gas. One rule learned doing it — the faucet claim has to land on the address whose **key** is in `.env`, because `forge` signs with that key and not with a wallet |
| Repository | ✅ `github.com/Shenhan01-sys/Lencana` (public). ⚠️ History starts **17 Sep**, not day one |
| Event registration | ⬜ not done. Required before submitting; the detailed rubric is only opened to registered participants |

## Language policy (why this folder is in English)

All documentation, captions and descriptions in this repository are **English**. One agreed exception:
the verification frontend, which is user-facing, will carry a language switch.

- [x] 🔤 **Indonesian / English switch in `web/` — built, 28 Sep.** Not a cosmetic feature: the audience for
      the verification page is Indonesian HR staff and learners, while the code, docs and judges' reading
      material are English. What shipped: every UI string lives in **one** dictionary module
      (`web/src/i18n.ts`, `DICTIONARIES` + `Lang`), the toggle is wired at `web/src/main.ts:1512-1522` and
      `:1848-1849`, the choice persists (`getSavedLanguage` / `saveLanguage`) and `?lang=` sets it
      (`main.ts:2607`). What is *not* claimed: coverage is uneven — simulation copy inside `main.ts` is
      still written inline in one language in places, and that is tracked in the frontend open items
      rather than described as finished. (This row sat unchecked, and the README said "not built yet",
      long after the switch existed — an under-claim is still a wrong claim in a document a judge reads.)
      Two rules from the original notes remain load-bearing and are honored: on-chain **data** is never
      translated (addresses, hashes, contract names — only labels, verdict titles, reasons and the
      limits panel, so a verdict cannot read differently in two languages), and **verbatim specification
      quotations** stay English with only the UI label translated, because translating a spec quote turns
      a citation into a paraphrase
- [ ] Solidity test names and revert messages are currently Indonesian. Converting them is cheap but
      touches every test file — decide once, before the demo video, and don't do it halfway
- [x] ~~Redeploy the anvil fork, then re-run `npm run probe`~~ — **done 19 Sep**: fresh fork, contracts
      redeployed from current source, `SeedDemo` run twice, probe **41 checks / 0 failed**. Two
      findings came out of it: `--slow` was never the fix for the failing seed transactions, and
      `SoulboundCert.mint()` accepting only its owner makes the **platform** the artifact minter once
      its issuers are third parties (D30). Both recorded where they belong.
- [x] 🔴 ~~**Issuance relayer** (`attestByDelegation`)~~ → **primitive and execution both proven; the
      hosted service is what remains.** The platform fronts issuance gas while the third-party agent
      stays the `attester` — off-chain only, no contract or `schemaUID` impact. Proven by 8 fork
      tests on 97 and 56 (19 Sep), then **run against the public chain**: `npm run delegate`
      (caller inside this repo, `signer/scripts/delegate.js`) issued 3 lesson credentials in one
      batch (`tx 0xe31a917e…`, 1,024,813 gas) and one singly (`tx 0xbe44e128…`, 370,131 gas), and
      reading the chain back showed `attester` = the agent, **the agent's balance unchanged to the
      wei**, `lessonOf(uid)` equal to the lesson id derived from the course material, and the
      attester nonce advancing once per request. EIP-712 domain `("EAS","1.3.0")`,
      `ATTEST_TYPEHASH 0xfeb2925a…`, field order and both request shapes (single ≠ batch — sharing
      one builder produced `InvalidAddressError`) live in `signer/src/delegation.js` with a guard
      that refuses a signature not recovering to the agent's own address.
      See [[01-Architecture/01 - Architecture|01 - Architecture]], section "Who owns the agent, and who pays for issuance", and D31/D36.
      ⬜ **Remaining:** a *service* (endpoint + queue + its own key handling) rather than a script a
      person runs, and a **third-party facilitator** for the paid path.
- [x] ~~`PaymentSplitter` — the platform's fixed share is what recovers the fronted gas~~ →
      **`contracts/SettlementSplit.sol`**, deployed on public chain 97
      (`0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE`): fixed platform share in bps with a 25% cap,
      **no debt ledger** (every call pushes all of the money out and keeps nothing), a per-payment
      replay guard, and `platformBps` that can only ever be **lowered**. 22 offline tests + 7 fork
      tests against canonical Permit2 and the canonical x402 proxy, then a real settlement paid into
      it and divided (D38, D39, D40). ⬜ Remaining: a **three-way** split if the agent's own fee
      should be paid separately from the issuer's share — today it is one payee plus the platform.

## What is blocking, and who can unblock it

1. **~~Needs a human, not tooling~~ → done 21 Sep.** One wallet had to hold testnet BNB, and the
   usual diagnosis was **wrong**: the obstacle is not a CAPTCHA but a **mainnet-holding eligibility**.
   The official BNB faucet requires *"0.002 BNB on BSC Mainnet"* and Chainstack's requires 0.08 ETH on
   Ethereum mainnet plus an API key, so a fresh burner wallet fails both. **QuickNode's**
   `faucet.quicknode.com/binance-smart-chain/bnb-testnet` states plainly that *"a brand new wallet can
   claim"* (no account, no minimum, 12 h cooldown) — the only human step is its bot check.
   Two things that runbook settled the argument: the fork estimate (0.0003828 BNB) was slightly under
   and irrelevant — **the full sequence costs under 0.002 BNB**, so 0.01 covers it several times over;
   and the claim must land on **the address whose key is in `.env`**, because `forge` signs with that
   key, not with a wallet. Money that arrives in a wallet can only be a hop, and a wallet cannot send
   anything until it already holds gas — which is the circular trap that made this look hard.
2. **🧠 ~~A decision to take before the backend is written~~ → taken 19 Sep (option A)** — the
   status list is built and served from chain state. What replaced the decision as the blocker is
   the **interoperability run**: until a credential passes `https://vc.1ed.tech`, the phrase to use
   is "built to the specification", never "1EdTech compatible". Three options are still analysed in
   [[01-Architecture/01 - Architecture|01 - Architecture]]
   for the record, with the refinement building it forced: **two** lists (`revocation` +
   `suspension`), because one bit cannot hold both a permanent revocation and a recoverable
   delisting.
3. **✍️ The course itself** — topic, rubric, essay question, and who the demo "institution" is. This
   is a product decision, and nothing demos without it.

## Order of work

| | task | why this position |
|---|---|---|
| 1 | **Public URL for `app/signer/`** — the issuer document and both status lists must be reachable from outside, because a standard verifier *opens those URLs* | the issued credential currently says `http://127.0.0.1:8787/…`; that is a document nobody else can verify, and it is the only thing standing between us and the next row |
| 2 | **Interoperability check**: send a credential to `https://vc.1ed.tech` and record the result. **Before it passes, do not write "1EdTech compatible"** | our strongest missing proof, and it needs almost no new code — only row 1 |
| 3 | **One real course + rubric + essay task**, plus the demo institution's name | a product with no content cannot be demonstrated, and the video has nothing to show |
| 4 | **Agent go/no-go: 23 Sep** — can it sign and anchor one credential end to end without a human? | if not, drop the agent layer and submit Consumer Apps only; the core product stands without it |
| 5 | **Paid verification over x402** (server answers `402`, client sends a `PAYMENT` header) | **never executed at all** — so far only on-chain settlement is proven. Keep it a flat percentage; **no debt ledger** |
| 6 | **Registration + submission wallet + team name** (`luma.com/pcc699dv` and the portal) | without registration the submission is not counted, however good it is |
| 7 | Video ≤5 min (4 scenes) + public repo check | 28–30 Sep |

<details><summary>Closed on the way here (16–21 Sep)</summary>

| was | now |
|---|---|
| `SeedDemo` completing the demo state (advanced credential + revocation) | ✅ four verdicts on public chain 97, in two documented runs |
| the status-list decision (D24.1) | ✅ taken 19 Sep, option A: bitstring derived from chain state — and it came out as **two** lists |
| signing backend: `eddsa-rdfc-2022`, ordered `@context`s, `validUntil`, mandatory `achievement.criteria`, `verificationMethod` as an HTTP URL | ✅ `app/signer/`, 45 + 20 checks green against the public chain |
| deploy to chain 97 | ✅ 21 Sep; addresses and measured cost in [[06-Spec-Research/01 - Spec Research|01 - Spec Research]] §D |

</details>

## Calendar

| dates | target |
|---|---|
| 17–18 Sep | ~~`SeedDemo` clean + REVOKED-path probe green~~ → **done 19 Sep**, one day late: the seed converges in two runs and the probe now covers `REVOKED`, `ISSUER_DELISTED` and the chained path. ⚠️ **status-list decision still not taken** — it has slipped every day since 17 Sep and it blocks the signing backend |
| 19–21 Sep | signing backend working · one real course with content |
| 22–23 Sep | `vc.1ed.tech` check · **agent go/no-go** |
| 24–26 Sep | deploy to 97 · x402 layer (Uji A) · tighten the scenes |
| 27 Sep | **re-check the other participants' submissions** — our "no competitors" number is from 13 Sep, and a last-minute surge is normal |
| 28–29 Sep | video + submission form + verify the repo is public and complete |
| 30 Sep | **submit in the morning**, not at 23:00 |

## Deliberately not built

This list is long, and that is part of the plan — each line is something tempting that does not fit
in 13 days:

- **TEE / zkML / "verifiable inference"** — no runnable equivalent on BSC in this window, and the
  claim itself is banned here
- **ERC-6551** "skill wallet" per learner — status is Review, and it needs a third-party registry
  deploy
- **Multi-issuer marketplace** — content chicken-and-egg, undemonstrable
- **Greenfield on the critical path** — its testnet resets after ~7 days, and judging comes later
- **ERC-4337 / paymasters for onboarding** — zero evidence of availability on BSC. We reach
  "no seed phrase" in a duller way that definitely works: **the issuer pays the gas**
- **Issuer reputation that can go down** — stays a **slide**, not a scene: with one course and one
  agent there is no series of data to show, and presenting it as a scene only invites the answer
  "that is one example"
- **Mainnet.** Testnet satisfies the rules; the requirement is an address that resolves on BscScan

---

## Urja prioritas 29 Sep malam (13 siap kerja; B67+B107+B42 selesai malam ini; 7 bergembok)

**Status loop label (aturan #18) — 30 Sep, terukur ulang oleh `check:labels` SESUDAH bentuk marker dipindah (B112 opsi A) dan sesudah B112 + B114 + B84 ditutup:** **82 marker di 48 ID · 70 baris backlog · 49 tertutup · 4 ID tertutup beralasan `TANPA TAG KODE` (B43 B71 B74 B76) · lubang 0 · bandel 0 · sisa bentuk lama 0 → LABEL HIJAU 8/0**, self-test **12 fixture / 0 luput**, dan A9 di `npm run audit` melaporkan **82 marker cocok dua arah**. Bentuk marker hari ini diganti dari kurung-siku ke `Lencana-Bnn status=SELESAI|TERBUKA`, karena pola lama bertabrakan dengan notasi tipe bytes32 di kode kami sendiri (21 lokasi) sehingga kelengkapan label mustahil dituntut alat — rinciannya di [[09-Testing/T29 - signer label-coverage.js]] dan baris B112. **Dua koreksi yang sengaja kubiarkan terbaca, tidak kutimpa:** (1) angka yang tertulis di halaman ini sebelumnya — "47 tertutup / 41 bertanda + 6 beralasan", lalu "38+2", lalu "43 tertutup · 37 bertanda · 6 beralasan" dengan "39 ID tertutup bertanda" dan "6 ID TANPA TAG KODE (B43 B71 B74 B76 B77 B99)" — **gelembung dan saling bertentangan dalam satu paragraf yang sama**; sebabnya penjaga membaca status dari seluruh baris, sehingga kata `SELESAI` di dalam kalimat ikut terhitung sebagai baris tertutup. Dengan pembacaan sel-pertama, yang terhitung penutupan hari ini **49** (46 sebelum B112 ditutup di Tahap 4, 47 sesudahnya, 48 sesudah B114, 49 sesudah B84), dan yang beralasan tanpa marker hanya **4** — B77 dan B99 mengumumkan `TANPA TAG KODE` tetapi barisnya tidak tertutup (B77 malah bergembok 🔒), jadi keduanya tidak pernah boleh ikut dihitung sebagai penutupan. (2) "A9 melaporkan 72 tag cocok dua arah" juga basi; angka hari ini tercetak di kalimat pertama paragraf ini. Satu marker yang dulu bohong sudah diluruskan: penanda B52 pernah kutulis `SELESAI` padahal barisnya terbuka → `TERBUKA`. B78 tetap di luar daftar tertutup: bagian (a) dan (b) selesai, bagian (c) view `course_gates` belum (lihat barisnya).

Diurutkan **paling murah → paling mahal**. Sumber keadaan: `03 - Findings and Tasks 2026-09-26.md`
— **terukur ulang 30 Sep sesudah B112, B114, dan B84 ditutup**, dengan logika penjaga (status hanya dari sel
pertama, ID rangkap dimenangkan yang TERBUKA): 76 baris tabel / **70 ID berbeda** = **49 SELESAI ·
12 TERBUKA · 9 bergembok** (B49 B63 B64 B65 B66 B73 B75 B77 B95); yang TERBUKA: B59 B78 B80 B82 B87
B90 B97 B99 B102 B104 B105 **B115**. Angka 49 ini **sepakat dengan yang dicetak `check:labels`** ("49
tertutup"), jadi dua alat berbeda memberi angka yang sama. *(Baris ini tadinya menulis "TERBUKA total
21, bergembok 7" — basi: B112, B114, dan B84 tertutup hari ini sementara B115 lahir, dan angka lama
itu tidak menyebut sumber penghitungannya.)* Angka apa pun di bawah harus dicetak ulang oleh
perintahnya pada hari ia dikutip (AGENTS #1).

| # | ID | apa | selesai kalau | ± |
|---|---|---|---|---|
| 1 | **B107** ✅ SELESAI 29 Sep — `DIAGONOSA` (12 baris terakhir anak + prasyarat + penyelamat), `--only=<id>`, dan menolak menulis `numbers.json` dari run sebagian | ~~`sync:numbers` melapor merah tanpa sebab anak~~ | — | — |
| 2 | **B67** ✅ SELESAI 29 Sep, kriteria 30 Sep dipenuhi ([[09-Testing/T28 - signer monitor-edge.js]]) | ~~tepi tidak tahu `publish` berhenti~~ | — | — |
| 3 | **B66** 🔒 DITAHAN 30 Sep — memberi TTL pada `used_nonces` **membuka kembali** jendela replay, karena `authorizeLearner` hanya menerima `nonce=([0-9a-f]{12,})` tanpa `ts=`; yang harus berubah lebih dulu adalah **bentuk pesan yang ditandatangani**, bukan skemanya | `used_nonces` tanpa TTL, `progress_events` tanpa retensi | pesan bertanda tangan memuat `ts=` dulu, baru migrasi + 2 pemeriksaan `verify:db` | — |
| 4 | **B78** 🟡 30 Sep: jalur B **sudah dipasang, (a)+(b) selesai** — kolom `origin` + `LANCENA_ORIGIN` + `npm run cleanup` (sisa `origin=test` = **0**), dan `verify:db` **48/0** membaca balik penandanya. Yang tersisa hanya **(c)** view `course_gates` yang masih membaca baris tes — butuh `drop` + `create view`, konsumennya embedding PostgREST + halaman hasil | artefak tes | (c) saja |
| 5 | **B84** ✅ SELESAI 30 Sep — `check:identity` 8/0 (hash dokumen builder = signer lokal = tepi) **dan** invarian "kunci tiap kertas terdaftar di dokumen penerbitnya" di `check.js` bagian 5d atas korpus store (91/0; 19 kertas / 3 dokumen penerbit, semuanya terdaftar) | ~~identitas penerbit punya 3 sumber berbeda~~ | — | — |
| 6 | **B102** | spesimen `delisted`/`expired` belum ada | `check:samples` melaporkan keduanya non-nol; tombol yang dicabut boleh dipasang lagi. Butuh 1 transaksi testnet → **izin builder** | 1 j |
| 7 | **B105** 🟡 30 Sep: **(b) SELESAI** dan **(a) sebagian** — `#/publishers` baca-saja sudah ada (nav + rute + halaman, 9 asersi baru di probe → **82/0**) dan kalimat onboarding-nya mengakui custody di kedua bahasa; yang belum: data dari `GET /issuers` yang hidup, jumlah kredensial, status allowlist dari chain | halaman penerbit + kalimat onboarding jujur | tiga hal yang disebut di kiri | — |
| 8 | **B104** | rantai D42: AI menilai → **manusia mengesahkan** → terbit | migrasi review + rute bertanda tangan + gerbang ketiga + 2 pemeriksaan `verify:attempts` | 2 j |
| 9 | **B90** | paruh dua kontrak durasi-cahaya | deploy 97 + rute HTTP + uji yang sama tetap hijau | ½ h |
| 10 | **B97** | relayer masih skrip | endpoint menerima permintaan agen + mengantrekan siaran (token testnet dicatat) | ½ h |
| 11 | **B82** | identitas lintas perangkat hilang | ekspor/import terkunci frase lewat tes dua browser | ½ h |
| 12 | **B80** | 🔴 kunci kuis terbundel ke browser | `publicManifest` tanpa `answer` + `probe.ts) tetap hijau + rute kuis teruji server | ½ h |
| 13 | **B59** | perkakas menyimpan kebenaran sebagai salinan basi | tiap harness punya gerbang sendiri, bukan angka di berkas catatan | sisa |
| 14 | **B87** | peran | **sudah diputuskan (D42)** → kerjanya #7 + #8; baris ini tidak punya pekerjaan sendiri | — |

**Gembok builder — jangan dikerjakan tanpa permintaan.** Terukur 30 Sep: **9 ID bergembok dari 69**.
Dua sebab, dan keduanya punya alasannya sendiri di baris masing-masing: **aksi manusia** (AGENTS #16)
= B63, B64, B65; **ditahan atas keputusan builder** = B49, B66 (TTL pada `used_nonces` akan membuka
ulang jendela replay selama pesan yang ditandatangani belum memuat `ts=`), B73, B75, B77, B95.
*(Baris ini tadinya menyebut tujuh ID — B66 dan B77 ketinggalan, padahal keduanya bergembok.)*

**Gerbang wajib sebelum menyebut apa pun "selesai":** `npm run sync:numbers` (**15 harness**) lalu
`-- --verify` (**25 klaim halaman**) → `npm run audit` (**12 pemeriksaan**, termasuk A9 marker↔baris
dan A10 angka README) → `npm run check:labels` (**8 pemeriksaan** + `--self-test` 12 fixture) →
`check-links` 0 rusak + `check-lang` 0 CJK + `check-mermaid` 0 hazard → komit (tanpa atribusi AI)
→ dorong **hanya** atas kata builder. *(Baris ini tadinya menulis "13 harness" dan "audit (10)" —
basi, dan tidak menyebut `check:labels` sama sekali; angka di atas dicetak ulang oleh perintahnya
sendiri pada 30 Sep.)*
