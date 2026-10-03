# 05 — Status and order of work

**Last updated: 30 September 2026 (hari tenggat, 23:59 WIB).** *(Tadinya "29 September … 1 day" — dikoreksi B117.)* *(2 Okt: antrean prioritas di bawah kini sampai B129, dan baris gerbang dicetak ulang — tabel "Where things stand" tetap tidak dikoreksi per baris.)* *(3 Okt: antrean kini sampai B133 — B130 selesai kecuali sewa #2547, B131 dikerjakan, B132/B133 dipilih arahnya oleh builder.)*
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

**Status loop label (aturan #18) — 30 Sep, terukur ulang oleh `check:labels` SESUDAH bentuk marker dipindah (B112 opsi A) dan sesudah B112 + B114 + B84 + B115 ditutup:** **82 marker di 48 ID · 71 baris backlog · 50 tertutup · 5 ID tertutup beralasan `TANPA TAG KODE` (B43 B71 B74 B76 B115) · lubang 0 · bandel 0 · sisa bentuk lama 0 → LABEL HIJAU 8/0**, self-test **12 fixture / 0 luput**, dan A9 di `npm run audit` melaporkan **82 marker cocok dua arah**. **Catatan 30 Sep malam:** baris **B116** (insiden kunci privat terkomit ke branch publik) terdaftar sesudah pembacaan di atas, jadi jumlah baris naik 70→71 dan TERBUKA 11→12 **tanpa** mengubah jumlah tertutup maupun jumlah marker; header angka di T29/hub/`signer`-README/AGENTS/`label-coverage.js` masih memuat pembacaan sebelum B116 dan malam ini sengaja tidak kusebar satu-satu — koreksinya hidup di paragraf ini, dan penyebarannya jadi pekerjaan pertama sesudah tenggat. **Catatan 30 Sep malam, sesudah itu (B117):** penyebaran itu sudah dikerjakan hari yang sama, bersama sapuan kekunoan vault. Pembacaan `check:labels` sesudah B117 ditutup: **83 marker di 49 ID · 72 baris backlog · 51 tertutup · 5 beralasan `TANPA TAG KODE` (B43 B71 B74 B76 B115) → LABEL HIJAU 8/0**, self-test 12 fixture / 0 luput; angka "82 · 48 · 71 · 50" di awal paragraf ini adalah pembacaan sebelum B117 dan kubiarkan terbaca. **Sesudah B97 dikerjakan sebagian (masih 30 Sep malam):** **87 marker di 50 ID · 72 baris · 51 tertutup → LABEL HIJAU 8/0** — empat marker baru semuanya `Lencana-B97 status=TERBUKA` (`relay.js`, `server.js`, `relay-check.js`, `sync-numbers.js`), jadi jumlah tertutup tidak bergerak. Header di T29/hub/`signer`-README/AGENTS memuat pembacaan saat B117 ditutup dan menyebut jamnya; pembacaan terkini selalu yang dicetak `npm run check:labels`. Bentuk marker hari ini diganti dari kurung-siku ke `Lencana-Bnn status=SELESAI|TERBUKA`, karena pola lama bertabrakan dengan notasi tipe bytes32 di kode kami sendiri (21 lokasi) sehingga kelengkapan label mustahil dituntut alat — rinciannya di [[09-Testing/T29 - signer label-coverage.js]] dan baris B112. **Dua koreksi yang sengaja kubiarkan terbaca, tidak kutimpa:** (1) angka yang tertulis di halaman ini sebelumnya — "47 tertutup / 41 bertanda + 6 beralasan", lalu "38+2", lalu "43 tertutup · 37 bertanda · 6 beralasan" dengan "39 ID tertutup bertanda" dan "6 ID TANPA TAG KODE (B43 B71 B74 B76 B77 B99)" — **gelembung dan saling bertentangan dalam satu paragraf yang sama**; sebabnya penjaga membaca status dari seluruh baris, sehingga kata `SELESAI` di dalam kalimat ikut terhitung sebagai baris tertutup. Dengan pembacaan sel-pertama, yang terhitung penutupan hari ini **50** (46 sebelum B112 ditutup di Tahap 4, 47 sesudahnya, 48 sesudah B114, 49 sesudah B84, 50 sesudah B115), dan yang beralasan tanpa marker **5** (B43 B71 B74 B76 B115) — sementara B77 dan B99 mengumumkan `TANPA TAG KODE` tetapi barisnya tidak tertutup (B77 malah bergembok 🔒), jadi keduanya tidak pernah boleh ikut dihitung sebagai penutupan. (2) "A9 melaporkan 72 tag cocok dua arah" juga basi; angka hari ini tercetak di kalimat pertama paragraf ini. Satu marker yang dulu bohong sudah diluruskan: penanda B52 pernah kutulis `SELESAI` padahal barisnya terbuka → `TERBUKA`. B78 tetap di luar daftar tertutup: bagian (a) dan (b) selesai, bagian (c) view `course_gates` belum (lihat barisnya).

Diurutkan **paling murah → paling mahal**. Sumber keadaan: `03 - Findings and Tasks 2026-09-26.md`
— **terukur ulang 30 Sep sesudah B112, B114, B84, dan B115 ditutup**, dengan logika penjaga (status
hanya dari sel pertama, ID rangkap dimenangkan yang TERBUKA): 82 baris tabel / **76 ID berbeda** =
**60 SELESAI · 7 TERBUKA · 9 bergembok** (B49 B63 B64 B65 B66 B73 B75 B77 B95); yang TERBUKA: B59
B82 B87 B99 B105 **B116** **B121**. Angka 60 ini **sepakat dengan yang dicetak
`check:labels`** ("136 marker di 57 ID · 76 baris backlog · 60 tertutup"), jadi dua alat berbeda memberi
angka yang sama. *(1 Okt malam, sesudah B122 ditutup — preflight CORS, ditemukan uji peramban FE7: `check:labels` mencetak **148 marker di 59 ID · 77 baris backlog · 61 tertutup**; TERBUKA tetap 7. Angka B82 di catatan berikut adalah pembacaan sebelum B122.)* *(1 Okt malam sesudah B82 dikerjakan — login Privy, baris tetap TERBUKA: `check:labels` mencetak **146 marker di 58 ID · 76 baris backlog · 60 tertutup**; sepuluh marker baru semuanya `Lencana-B82 status=TERBUKA`, jadi jumlah tertutup tidak bergerak. Angka "136 marker di 57 ID" di kalimat sebelumnya adalah pembacaan sebelum B82.)* *(Sebelum B80 ditutup 1 Okt malam: 59 · 8, dan 125 marker di 56 ID.)* *(Sebelum core B121 dikerjakan 1 Okt malam: 117 marker di 55 ID — delapan marker baru
semuanya `Lencana-B121 status=TERBUKA`, jadi jumlah tertutup tidak bergerak.)* *(Sebelum B119 dan B120 ditutup 1 Okt: 57 · 10, dan 104 marker di 53 ID.)* *(Sebelum B118 ditutup 1 Okt: 56 · 11, dan 97 marker di 52 ID.)* *(1 Okt: empat baris baru — B118–B120 dari keputusan builder D53, B121 dari halaman
proses bisnis 00-Overview/13 — menaikkan TERBUKA 7 → 11 tanpa mengubah jumlah tertutup. Sebelumnya 72 ID.)* *(Sebelum B104 ditutup malam 30 Sep: 55 · 8, dan 94 marker di 51 ID.)* *(Sebelum B78 ditutup malam 30 Sep: 54 · 9, dan 93 marker.)* *(Sebelum B90 ditutup malam 30 Sep: 53 · 10, dan 88 marker di 50 ID.)* *(Sebelum B102
ditutup malam yang sama: 52 · 11, dan 87 marker.)* *(Sebelum itu lagi
51 · 12: B97 masih terbuka; ia ditutup sesudah siaran dari antrean terbukti di chain.)* *(Sebelum B117
ditutup malam 30 Sep: 77 baris / 71 ID = 50 SELESAI · 12 TERBUKA · 9 bergembok.)* *(Baris ini tadinya
menulis "TERBUKA total 21, bergembok 7" — basi: B112, B114, B84, dan B115 tertutup hari ini, dan
angka lama itu tidak menyebut sumber penghitungannya.)* Angka apa pun di bawah harus dicetak ulang oleh
perintahnya pada hari ia dikutip (AGENTS #1).

| # | ID | apa | selesai kalau | ± |
|---|---|---|---|---|
| 1 | **B107** ✅ SELESAI 29 Sep — `DIAGONOSA` (12 baris terakhir anak + prasyarat + penyelamat), `--only=<id>`, dan menolak menulis `numbers.json` dari run sebagian | ~~`sync:numbers` melapor merah tanpa sebab anak~~ | — | — |
| 2 | **B67** ✅ SELESAI 29 Sep, kriteria 30 Sep dipenuhi ([[09-Testing/T28 - signer monitor-edge.js]]) | ~~tepi tidak tahu `publish` berhenti~~ | — | — |
| 3 | **B66** 🔒 DITAHAN 30 Sep — memberi TTL pada `used_nonces` **membuka kembali** jendela replay, karena `authorizeLearner` hanya menerima `nonce=([0-9a-f]{12,})` tanpa `ts=`; yang harus berubah lebih dulu adalah **bentuk pesan yang ditandatangani**, bukan skemanya | `used_nonces` tanpa TTL, `progress_events` tanpa retensi | pesan bertanda tangan memuat `ts=` dulu, baru migrasi + 2 pemeriksaan `verify:db` | — |
| 4 | **B78** ✅ SELESAI 30 Sep malam — (c) ditutup migrasi 0008: view `course_gates` membawa `origin` dan kembali `security_invoker` (regresi 0006: view sempat terbaca publishable key, 20 baris → kini `[]`); `verify:db` **50/0** dengan dua penjaga baru → [[09-Testing/T21 - signer db-probe.js]]. Riwayat baris ini: 🟡 30 Sep: jalur B **sudah dipasang, (a)+(b) selesai** — kolom `origin` + `LANCENA_ORIGIN` + `npm run cleanup` (sisa `origin=test` = **0**), dan `verify:db` **48/0** membaca balik penandanya. Yang tersisa hanya **(c)** view `course_gates` yang masih membaca baris tes — butuh `drop` + `create view`, konsumennya embedding PostgREST + halaman hasil | artefak tes | (c) saja |
| 5 | **B84** ✅ SELESAI 30 Sep — `check:identity` 8/0 (hash dokumen builder = signer lokal = tepi) **dan** invarian "kunci tiap kertas terdaftar di dokumen penerbitnya" di `check.js` bagian 5d atas korpus store (91/0; 19 kertas / 3 dokumen penerbit, semuanya terdaftar) | ~~identitas penerbit punya 3 sumber berbeda~~ | — | — |
| 6 | **B102** ✅ SELESAI 30 Sep malam — `npm run specimen` membuat kedua spesimen di chain 97 (agen korban didelisting; penerbit sungguhan tidak tersentuh), `check:samples` **9/0** dengan 1 expired · 1 delisted dan kini merah kalau sebuah keadaan kehilangan spesimennya → [[09-Testing/T26 - signer sample-check.js]]. Tombol FE belum dipasang lagi (pekerjaan FE, ditunda builder) | ~~spesimen `delisted`/`expired` belum ada~~ | — | — |
| 7 | **B105** 🟡 30 Sep: **(b) SELESAI** dan **(a) sebagian** — `#/publishers` baca-saja sudah ada (nav + rute + halaman, 9 asersi baru di probe → **82/0**) dan kalimat onboarding-nya mengakui custody di kedua bahasa; yang belum: data dari `GET /issuers` yang hidup, jumlah kredensial, status allowlist dari chain | halaman penerbit + kalimat onboarding jujur | tiga hal yang disebut di kiri | — |
| 8 | **B104** ✅ SELESAI 30 Sep malam — migrasi 0009 (`review_roles`, `judgement_reviews`), `POST /essay/reviewers` + `POST /essay/review`, gerbang dan `issue --from-attempts` fail-closed atas angka model tanpa pengesahan; `verify:db` **70/0**, `verify:attempts` **38/0**, dan satu kertas nyata terbit lewat rantai itu (`verify:attempts:live` **82/0**: usulan 80 → reviewer 100, dibaca balik dari tepi). Belum: UI reviewer; "model" dan "reviewer" di run itu milik harness → [[09-Testing/T21 - signer db-probe.js]]. Riwayat: | ~~rantai: AI menilai → **manusia mengesahkan** → terbit~~ | migrasi review + rute bertanda tangan + gerbang ketiga + 2 pemeriksaan `verify:attempts` | 2 j |
| 9 | **B90** ✅ SELESAI 30 Sep malam — `CourseDeposit` ter-deploy di chain 97 (`0xbeB5…E6c3`), tiga rute `/deposit/…`, `policyHash` dari manifest, `issuedAt` dari BAS; `verify:deposit` **27/0**, satu setoran nyata sampai selesai `verify:deposit:live` **38/0**, `forge` 16/16 tetap hijau → [[09-Testing/T34 - signer deposit-check.js]]. Tetap bukan klaim produk: tidak ada di halaman, jalur hangus hanya terbukti di `forge test` | ~~paruh dua kontrak durasi-cahaya~~ | — | — |
| 10 | **B97** ✅ SELESAI 30 Sep malam — `POST /relay` + antrean idempoten + penjaga pra-gas (`verify:relay` **31/0**) dan satu siaran nyata dari antrean di chain 97 (`verify:relay:live` **17/0**, 347.059 gas) → [[09-Testing/T33 - signer relay-check.js]] | ~~relayer masih skrip~~ | — | — |
| 11 | **B82** 🟡 TERBUKA — login email Privy terpasang 1 Okt malam (D57): dompet tertanam = alamat peserta, `POST /auth/privy` mengikat alamat ↔ akun sesudah token diverifikasi, `verify:privy` **38/0** *(koreksi 3 Okt: kini **41/0**, dicetak `sync:numbers` 3 Okt)* → [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]] · [[08-Results/B82 - Executive Summary]]. Yang tersisa: uji dua peramban oleh builder | identitas lintas perangkat hilang | ~~ekspor/import terkunci frase lewat tes dua browser~~ → **login email dari dua peramban → alamat sama** (D57: mekanismenya diganti, tes dua perambannya tetap) | terpasang, menunggu uji builder |
| 12 | **B80** ✅ SELESAI 1 Okt (D56) — kunci kuis di `courses/*.keys.ts` (hanya server lewat `manifest-keys.ts`), bundel 0/28 teks `why` + 0 literal `answer` (sebelumnya 28/28 di Vercel), `rubricHash` kertas terbit tidak bergeser, `/grade` membalas pembahasan per soal tanpa indeks jawaban; `verify:quizkeys` **30/0**, probe web **88/0** → [[09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis)]] · [[08-Results/B80 - Executive Summary]]. Bukan "anti-curang": ulangan tak terbatas tetap membocorkan kunci pelan-pelan. Riwayat: 🔴 | ~~kunci kuis terbundel ke browser~~ | ~~`publicManifest` tanpa `answer` + `probe.ts) tetap hijau + rute kuis teruji server~~ | — |
| 13 | **B59** | perkakas menyimpan kebenaran sebagai salinan basi | tiap harness punya gerbang sendiri, bukan angka di berkas catatan | sisa |
| 14 | **B87** | peran | **sudah diputuskan (D42)** → kerjanya #7 + #8; baris ini tidak punya pekerjaan sendiri. *(1 Okt: D53 menambah peran Agent Owner dan mengubah makna "manusia mengesahkan" — pekerjaannya #15–#17)* | — |
| 15 | **B118** ✅ SELESAI 1 Okt (F1 identitas) — agen penerbit = agen ERC-8004 **#2534** di IdentityRegistry BNB chain 97, pemilik Agent Owner `0x067c…0c4f`, `agentWallet` = attester; `verify:agent` **23/0**; F2 reputasi dan F3 validasi bukan bagian penutupan → [[09-Testing/T35 - signer agent-identity-check.js]]. *(Koreksi 1 Okt sore, keputusan D54 opsi B: kalimat "`agentWallet` = attester" dan "23/0" di sel ini adalah keadaan sebelum D54. Sesudahnya penerbit tetap attester, `agentWallet` #2534 dipindah ke kunci operasional agen sendiri, gerbang `admit` dibalik — menolak kunci agen — dan `verify:agent` **24/0**.)* Riwayat: 🔴 dicatat 1 Okt (D53) | ~~agen belum punya identitas ERC-8004; narasi menjanjikannya, kode nol~~ | F1: agen terdaftar di IdentityRegistry BNB (`0x8004A818…`) dengan `agentWallet` = attester, berkas registrasi terbaca, `addIssuer` hanya untuk identitas ERC-8004, halaman verifikasi menampilkan `agentId`; F2 reputasi; F3 validasi ditunda | belum diukur |
| 16 | **B119** ✅ SELESAI 1 Okt (D54) — penerbit menyewa agen penilai ERC-8004 #2534; label dipilih agen; harga = tarif Agent Owner di registry + 5%/tingkat; dibayar x402 ke dompet agen; penerbit tetap attester; `verify:agents` **34/0**, live **40/0** → [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]] · [[08-Results/B119 - Executive Summary]]. UI penerbit BLOCKED (FE). *(2 Okt, B129: anggota penerbit kini menyewa dan menunjuk agen dari dasbor `#/app/pub`; membayar tagihan agen tetap tanpa UI.)* Riwayat: 🔴 dicatat 1 Okt (D53) | ~~peran Agent Owner + sewa agen per aktivitas penilaian, tujuh label tingkat berat, selisih harga kecil~~ | label melekat pada aktivitas sebelum dinilai, tabel harga satu sumber ber-hash, bayar lewat x402 ke Agent Owner, struk per usaha; dampak ke pencabutan/delisting diputuskan | belum diukur |
| 17 | **B120** ✅ SELESAI 1 Okt (D54) — reviewer agen ERC-8004 #2542 dengan Agent Owner lain; ditolak kalau = agen penilai atau satu pemilik — dijaga dua arah, saat menunjuk reviewer dan saat menyewa penilai; label wajib; pengesahannya ditagih; B104 tetap 70/0 → [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]] · [[08-Results/B120 - Executive Summary]]. Riwayat: 🔴 dicatat 1 Okt (D53) | ~~reviewer diperlakukan sebagai penilai (boleh agen AI)~~ | reviewer agen wajib agen ERC-8004 lain dari pengusul, `agentId` tercatat di pengesahan | belum diukur |
| 18 | **B121** 🟡 TERBUKA — **core selesai 1 Okt (D55)**: `POST /praktik` menilai praktik dari bacaan chain 97 (saldo, transfer, `eth_call`, izin token), `/attempts` menolak skor kuis/esai/praktik peserta, slot praktik hanya dari komponen `graded_by chain`; `verify:praktik` **32/0**, live **32/0**; satu kertas terbit dengan praktik dinilai chain (`0x372c2518…`) → [[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]] · [[08-Results/B121 - Executive Summary]]. Yang tersisa: halaman belajar memanggilnya (FE, OI-20). Riwayat: 🔴 dicatat 1 Okt | slot praktik tidak bisa diisi dari halaman belajar | praktik punya jalur dinilai yang bukan laporan peserta ✅, dan halaman memanggilnya (FE) | core terukur |
| 19 | **B122** ✅ SELESAI 1 Okt malam — preflight CORS dijawab 204 (sebelumnya 405 di 7 rute tulis), jadi halaman belajar akhirnya menulis ke penerbit dari peramban; ikut ditutup: kuis dari halaman mengirim kursus kosong, kotak identitas membeku saat sinkron gagal → [[09-Testing/T42 - Uji peramban ruang kelas (FE7)]] · [[08-Results/B122 - Executive Summary]]. Riwayat: ditemukan uji peramban FE7 | ~~halaman belajar tidak pernah menulis dari peramban~~ | — | — |
| 20 | **B123** 🟡 TERBUKA — langkah A RF7 (D59): halaman internal hanya untuk akun, dialog login baru, simulasi publik dibuang; tersisa uji login sungguhan oleh builder → [[08-Results/B123 - Executive Summary]] | pintu tanpa akun | uji login builder | — |
| 21 | **B124** 🟡 TERBUKA — langkah A2 RF7: area internal `#/app` ber-sidebar, onboarding tiga kursi, detail kursus publik, `POST /me/records`; `verify:records` → [[07-Backlog/Acceptance-Criteria/AC-B124 - Area internal peserta, onboarding, dan detail kursus publik]] · [[08-Results/B124 - Executive Summary]] | dashboard peserta | uji login builder | — |
| 22 | **B125** 🟡 TERBUKA — langkah B RF7 (D60): kursus berbayar, bayar dulu baru masuk kelas (x402 + `SettlementSplit`), koin uji; `verify:paywall` → [[07-Backlog/Acceptance-Criteria/AC-B125 - Bayar dulu baru masuk kelas]] · [[08-Results/B125 - Executive Summary]] | enrollment berbayar | bayar lewat login builder | — |
| 23 | **B126** 🟡 TERBUKA (D61): kelas uji berbayar, saldo dari chain, Nilai & tugas bergrafik, pita pemuatan → [[07-Backlog/Acceptance-Criteria/AC-B126 - Kelas uji, saldo, rapor bergrafik, pita pemuatan]] · [[08-Results/B126 - Executive Summary]] | menguji bayar + rapor | criteria di tepi (publish:edge, kata builder) | — |
| 24 | **B127** 🟡 TERBUKA (D62): halaman Kursus (cari, saring, pratinjau, bayar), lima kelas singkat, Ringkasan berisi → [[07-Backlog/Acceptance-Criteria/AC-B127 - Halaman Kursus, lima kelas singkat, Ringkasan berisi]] · [[08-Results/B127 - Executive Summary]] | katalog + Ringkasan | criteria di tepi (publish:edge, kata builder) | — |
| 25 | **B128** 🟡 TERBUKA — langkah C1 RF7 (D63): peran akun di core dari fakta (kunci penerbit, keanggotaan bertanda tangan, `ownerOf` ERC-8004); `verify:roles` → [[07-Backlog/Acceptance-Criteria/AC-B128 - Peran akun di core]] · [[08-Results/B128 - Executive Summary]] | peran akun | uji login builder | — |
| 26 | **B129** 🟡 TERBUKA — langkah C2 RF7 (D64): pengajuan anggota → disetujui kunci penerbit, dasbor Penerbit `#/app/pub` + pemilih kursi, aksi anggota sewa/tunjuk agen; `verify:publisher` → [[07-Backlog/Acceptance-Criteria/AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit]] · [[08-Results/B129 - Executive Summary]] | kursi Penerbit | uji login builder | — |
| 27 | **B130** 🟡 TERBUKA — langkah C3 RF7 (D65): agen ERC-8004 dicetak platform untuk akun, dasbor Agent Owner `#/app/owner`, pemilik memverifikasi dompet agen + tarif dari halaman; `verify:owner` → [[07-Backlog/Acceptance-Criteria/AC-B130 - Kursi Agent Owner, agen untuk akun, dasbor Agent Owner]] · [[08-Results/B130 - Executive Summary]] | kursi Agent Owner | ~~verifikasi dompet #2547 oleh akun 2 builder~~ *(koreksi 2 Okt malam: berhasil dari dompet Privy, `0xfd0486d2…`, sesudah perbaikan fee EIP-1559)* · sewa #2547 oleh akun 1 | — |
| 28 | **B131** 🟡 TERBUKA — satu akun nyata = satu peran (D66): peran dipilih sekali di onboarding (bertanda tangan, tidak bisa diganti), server menolak aksi peran lain, pemilih kursi hanya untuk akun dev (dua akun dummy builder, `npm run account:dev`); `verify:account` → [[07-Backlog/Acceptance-Criteria/AC-B131 - Satu akun satu peran, akun dev]] · [[08-Results/B131 - Executive Summary]] *(tadinya "DIUSULKAN — menunggu acc"; acc 3 Okt)* | aturan peran produk | uji login builder | — |
| 29 | **B132** 🟡 TERBUKA — robot agen rakitan (D68): agen tampil sebagai robot dengan data di bentuknya, rupa disimpan pemilik ke berkas registrasi ERC-8004, agen pertama didaftarkan sendiri (#2548 di chain 97); `verify:studio` → [[07-Backlog/Acceptance-Criteria/AC-B132 - Robot agen rakitan, rupa di chain, agen didaftarkan sendiri]] · [[08-Results/B132 - Executive Summary]] *(tadinya "DIUSULKAN"; dikerjakan 3 Okt)* | kursi Agent Owner | uji login builder (#2547 dari Privy) | — |
| 31 | **B134** 🟡 TERBUKA — login email kedua ditolak Privy ("User already has one email account linked") karena sesi Privy akun lama tertinggal dan login baru dikirim di atasnya; diperbaiki 3 Okt di `web/src/privy.ts` (sesi akun lain dibuang sebelum login, Keluar selalu membuang sesi Privy); `verify:privy` 41/0 — rincian di baris B134 [[07-Backlog/03 - Findings and Tasks 2026-09-26]] | login akun kedua | builder login ulang dengan email kedua | — |
| 30 | **B133** 🟡 TERBUKA — Penerbit menyusun kursus dari halaman (Product Bar #12, D67): draf → diajukan → terbit oleh kunci penerbit (`npm run course:publish`), kursus terbit di jalur yang sama dengan kursus berkas; `verify:authoring` → [[07-Backlog/Acceptance-Criteria/AC-B133 - Penerbit menyusun kursus, kunci penerbit menerbitkan]] · [[08-Results/B133 - Executive Summary]] *(tadinya "DIUSULKAN"; dikerjakan 3 Okt)* | authoring | uji login builder; criteria di tepi (publish:edge) | — |

**Gembok builder — jangan dikerjakan tanpa permintaan.** Terukur 30 Sep: **9 ID bergembok dari 69**.
Dua sebab, dan keduanya punya alasannya sendiri di baris masing-masing: **aksi manusia** (AGENTS #16)
= B63, B64, B65; **ditahan atas keputusan builder** = B49, B66 (TTL pada `used_nonces` akan membuka
ulang jendela replay selama pesan yang ditandatangani belum memuat `ts=`), B73, B75, B77, B95.
*(Baris ini tadinya menyebut tujuh ID — B66 dan B77 ketinggalan, padahal keduanya bergembok.)*

**Gerbang wajib sebelum menyebut apa pun "selesai":** `npm run sync:numbers` (**21 harness** sejak `verify:quizkeys` masuk, B80; 20 sejak `verify:praktik`, B121; 19 sejak `verify:agents`, B119/B120; 18 sejak `verify:agent`, B118; 17 sejak `verify:deposit`, B90; 16 sejak `verify:relay`, B97) lalu
`-- --verify` (**38 klaim halaman**, dicetak alatnya 1 Okt malam; 25 → 26 → 28 → 30 → 32 → 34 → 36 → 38) *(2 Okt, dicetak ulang: **26 harness** — 22 dengan `verify:privy` B82, 23 `verify:records` B124, 24 `verify:paywall` B125, 25 `verify:roles` B128, 26 `verify:publisher` B129 — dan **48 klaim halaman**, 2 di antaranya merah karena `verify:quizkeys` menunggu criteria B126/B127 di tepi; sesudah B130 sore yang sama: **27 harness** dengan `verify:owner` dan **50 klaim**, merahnya tetap dua itu; 3 Okt, B131: **28 harness** dengan `verify:account` — angka klaim dicetak ulang di baris B131 sesudah `--verify`; 3 Okt, B133: **29 harness** dengan `verify:authoring`, **54 klaim**, merahnya tetap dua sumber tepi yang basi; 3 Okt, B132: **30 harness** dengan `verify:studio`, **56 klaim**, merah yang sama)* → `npm run audit` (**12 pemeriksaan**, termasuk A9 marker↔baris
dan A10 angka README) → `npm run check:labels` (**8 pemeriksaan** + `--self-test` 12 fixture) →
`check-links` 0 rusak + `check-lang` 0 CJK + `check-mermaid` 0 hazard → komit (tanpa atribusi AI)
→ dorong **hanya** atas kata builder. *(Baris ini tadinya menulis "13 harness" dan "audit (10)" —
basi, dan tidak menyebut `check:labels` sama sekali; angka di atas dicetak ulang oleh perintahnya
sendiri pada 30 Sep.)*
