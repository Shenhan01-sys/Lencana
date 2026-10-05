# `signer/` — the credential is a document

Everything else in this repository proves a fact about a credential on BNB Chain. This package
produces the other half: the **OpenBadgeCredential 3.0 document** an agent signs, plus the
**BitstringStatusList** that lets a standard Open Badges verifier see revocation — because a
standard verifier does not read the chain.

This closes decision **D24.1 = A** (see `../vault/02-architecture.md`).

## What is here

| file | job |
|---|---|
| `src/context.js` | the JSON-LD context URIs in one place, because the `@context` order is itself signed |
| `src/credential.js` | builds an `OpenBadgeCredential`; also `credentialHashOf()`, the JS twin of `_vcHash()` in `CredentialResolver.sol` |
| `src/statusList.js` | Bitstring Status List: index allocation, bitstring encoding, the status list credential itself |
| `src/chainStatus.js` | reads `statusOf()` from the deployed resolver and decides which bits are set |
| `src/store.js` | the append-only allocation record + issued-credential registry on the issuer side |
| `src/lists.js` | renders a status list — **shared by the server and the issuer**, and it also owns `servedHashes()`, the single answer to "which credentials are in the list" (see below: sharing the renderer was not enough) |
| `src/anchor.js` | `timestamp()` of the bitstring hash on BAS, then reads it back |
| `src/grade.js` | the rubric gate, including the **right to refuse**: `INSUFFICIENT_EVIDENCE`, `AWAITING_JUDGE`, `PARTIAL_JUDGEMENT`, `GRADED`. Reports a mechanical score and a final score separately and never merges them silently — `finalScore` stays `null` until a `judge` (model or human) is injected |
| `src/judge.js` | the model that grades an essay: `openai/gpt-oss-120b`, `temperature: 0`, JSON-only, **fail-closed** — a criterion the model skipped raises instead of being silently filled with 0. Handles `429` by honouring `retry-after` (measured quota: 8.000 tokens/min ⇒ ~5 calls/min) |
| `src/delegation.js` | the **EIP-712 delegation path**: the agent signs an attestation, the platform broadcasts it. Refuses to return a signature that does not recover to the agent's own address, and builds the single and batch request shapes separately (they are different structs, not one struct minus an array) |
| `src/x402.js` | the HTTP side of payment: the `402` requirements body, `X-PAYMENT` (base64 JSON), the two client signatures (EIP-2612 on the token, Permit2-with-witness on the proxy — **two domains that differ: one carries `version`, one does not**), and settlement as facilitator. It refuses to broadcast a payment that does not name our split, our token and our price — otherwise the server would pay gas to move someone else's money to an arbitrary address |
| `src/issuer.js` | the agent's Ed25519 document key and its issuer document |
| `src/sign.js` | `DataIntegrityProof` + `eddsa-rdfc-2022` sign/verify, and the JSON-LD document loader |
| `src/server.js` | serves `/issuers/:slug`, `/credentials/0x…`, `/credentials/status/{revocation,suspension}`, `/healthz`, and **`POST /verify` (paid)**. Runs under `tsx` because the verifier it calls lives in `../web/src` with extensionless imports |
| `scripts/issue.js` | **one command**: evidence (`--quiz`, `--essay <file> --judge`) → composite against the issuer's manifest → on-chain attestation (agent's own key) → signed document → status lists → bitstring hash anchored to BAS. `--score` no longer exists: the number must come from evidence, and the model's name plus the rubric version are printed into the document |
| `scripts/delegate.js` | **`npm run delegate`** — the same issuance over `attestByDelegation`: ids derived from the course material, agent signs, **platform pays the gas**, then everything is read back from the chain including the agent's unchanged balance. Adopts the credential into the watched set at the moment it is issued, so the served list can never quietly omit it. `--dry-run` stops before broadcasting and says which claims it therefore has not made |
| `scripts/anchor.js` | **`npm run anchor`** — witnesses the list currently being served. Idempotent: an already-timestamped hash costs no gas. See the measured limit below: it witnesses **bits**, not membership |
| `scripts/x402-check.js` | **`npm run x402`** — a real client against the real server: `402` without payment, then payment, settlement, split, and the report; the money numbers are re-read from the chain rather than trusted from the response. Needs the server up and `DEMO_TOKEN_ADDRESS` + `SPLIT_ADDRESS` in `app/.env` |
| `scripts/judge-check.js` | **`npm run judge`** — proves the judge can **fail** a submission: a fluent, long, empty answer must score under the issuer's pass mark, the substantive one must beat it, and a rival model is held to the same test. A judge that cannot flunk a student is not judging |
| `scripts/judge-variance.js` | **`npm run judge-variance`** — same essay, N runs at `temperature: 0`: reports the spread (measured 91–100, mean 96,4) and confirms the pass/fail decision does not move. Exists so we never quote one number as if it were precise |
| `scripts/check.js` | **74 checks** (28 Sep, 15 credentials watched; the run prints the count — it grows with the watched set, +2 per credential in the store): document shape, signature, status lists, chain-derived bits, the index invariant, bitstring determinism, one-object `credentialStatus`, and the 131.072-entry minimum. Loads `../.env` itself (`src/env.js`) and prints how many variables came from the file, because a missing `RPC_URL` used to *skip* the chain group and still print a smaller green number |
| `scripts/validator-check.js` | **`npm run validator`** — reads our document back over HTTP, follows the URLs inside it (issuer document + both status lists), uploads it to `vc.1ed.tech` and waits for the verdict from `/api/validate`. Red if the outcome is not VALID, so "we pass" cannot survive a dead host. `--record` appends to `vault/09-Testing/validator-runs.jsonl`
| `scripts/publish.js` | **`npm run publish:edge`** — signs everything here in Node, writes the signed documents to Workers KV, then **reads every route back through the worker** and refuses if a served status list no longer matches the chain. Verification is over the URLs a stranger would click, not over the bucket |
| `scripts/verify-deploy.js` | **`npm run verify:deploy`** — every address and contract constant we quote, compared against chain 97 as it is now, with expectations parsed from our own source (`script/DeployCredentials.s.sol`, `out/SoulboundCert.sol`) rather than copied from notes. Includes the enforcement-parity block: the build contains `mintBatch`/`lessonOf`, `CERT_ADDRESS` provably does not — the limit we state, and it goes red if the limit changes without the documents changing |
| `scripts/verify-live-cert.js` | **`npm run verify:live-cert`** — reads `LIVE_CERT_ADDRESS` from the chain and proves that artefact layer really enforces D42/D43: code length equal to our build artifact, `ownerOf == holderOf`, `tokenId == uint256(credentialHash)`, `external_url` identical to the exact URL `vc.1ed.tech` followed, and a non-owner `mint` rejected with `NotIssuer`. Rejections are read as **raw JSON-RPC `error.data`**, because a library can drop revert data and a claim must not depend on it. It checks **every** paper the ledger calls VALID on a durable host, not the last row only |
| `scripts/verify-edge.js` | **`npm run verify:edge`** — answers what `publish:edge` cannot: is something we hold **not published at all**? For each signed paper it fetches the paper from the edge, then follows the URLs **printed inside it** (`proof.verificationMethod`, both `statusListCredential`s, `achievement.criteria.id`, `result[0].id`, `issuer.id`), and prints the uncomfortable number: how many papers a stranger can verify end to end without our laptop. Loopback gets labelled as loopback — a host that answers only on the machine running the test is not "still alive" |
| `scripts/showcase-list.js` + `../scripts/mint-showcase.ps1` | Derives the showcase set from the validator ledger (rows `VALID` under the durable host), reads each learner out of the paper's own `credentialSubject.id`, then binds those artefacts with one `mintBatch` through `script/MintShowcase.s.sol`. Idempotent: already-bound credentials are filtered out rather than reverting the whole batch |
| `scripts/e2e.js` | **`npm run e2e`** — the one harness that crosses layers: chain state, the served status lists, every URL printed inside the credential, the artefact in the wallet and the third-party validator must name the **same object** (`holderOf` == the learner printed in the paper, `external_url` == the URL the validator followed, served bit == the current chain bit, both list hashes sealed in BAS). It starts its own loopback server, puts a timeout on every network call so a hang can never masquerade as "still running", and prints `info` rather than `ok` where a path genuinely cannot be exercised |
Sebelum `npm run serve` untuk **demo**, setel `LANCENA_ORIGIN=demo`. Kolom
`enrollments.origin` (migrasi `0007_enrollments_origin.sql`) membedakan baris peserta nyata dari sisa
harness; default-nya `unknown` dengan sengaja — proses yang tidak memperkenalkan dirinya tidak boleh
menyamar jadi demo, dan `sisa = 0` (B78) hanya bisa dibuktikan kalau penandanya jujur. Harness yang menyalakan
servernya sendiri (`verify:attempts`, `verify:db`) sudah menyetel `LANCENA_ORIGIN=test` dan membacanya balik sebagai pemeriksaan.

| `scripts/db-probe.js` | **`npm run verify:db`** — the learning state is really in Postgres, proven over HTTP: enrolment is idempotent and needs a learner signature over a one-time nonce (replay → 401, another key signing for you → 401, no signature → 401, never a silent 200); an attempt cannot exist without an enrolment; `attempt_hash` is computed from the stored row and matches a recompute; the progress state machine rejects illegal jumps with **422** (right person, wrong order — not an auth event); and the publishable key reads `enrollments` as `[]`, because RLS applies to it while our secret key bypasses RLS entirely. Nonces live in `used_nonces`, not in process memory, so a restart does not reopen the replay window |
| `scripts/journey.js` | **`npm run journey`** — the whole participant journey on the core side only: two throwaway learner keys, the catalogue read from the manifest, a prerequisite refusal **before** gas moves, the final exam (kuis + model-judged essay + praktik) issued to BAS, the chained `prerequisiteOf` read back from chain, both papers published and validated by `vc.1ed.tech`, minted as artefacts, then the **prerequisite revoked** — proving the revoked paper's metadata flips to `REVOKED` while the advanced credential stays valid and its metadata stays `VALID`. It refuses to start if the public stage cannot be finished (D47). 34 checks / 0 failed, 28 Sep |
| `scripts/revoke.js` | **`npm run revoke -- --hash 0x… [--publish]`** — the in-repo revocation path (B57): refuses unknown hashes and already-revoked ones (EAS has no unrevoke), refuses unless the key it holds **is** the attester recorded on chain, re-reads `revoked` from chain after the transaction, and says out loud that the lists are stale unless `--publish` re-anchors and re-publishes |
| `scripts/specimen.js` | **`npm run specimen`** (read-only) / **`-- --apply`** — B102: makes the two states the verifier sells but we never had a paper for. A **sacrificial agent** (EOA derived from a label in the file) is admitted, issues one credential, and is delisted; a second credential is issued by the normal issuer with a 675-second validity and reads `expired` once chain time passes it. Refuses to delist `ISSUER_ADDRESS`. Every step reads chain first; run once on chain 97 on 30 Sep → `SPESIMEN HIJAU — 7 pemeriksaan, 0 gagal`. `npm run check:samples` (9/0) is what judges the result, and it now goes red if any of the four states loses its specimen → `vault/09-Testing/T26 - signer sample-check.js.md` |
| `scripts/serve-probe.js` | **48 checks** (28 Sep): the same over HTTP against the running server — including the two things it used not to test at all: the document route returning a real credential, and the served bitstring's actual inflated length. Since **B48** it also requires every agent in `.keys/` to answer at its own URL, and verifies a credential against the issuer document *that credential points at*. The bit-level ones need `EXPECT_*`; without them it prints the group it skipped |
| `scripts/label-coverage.js` | **`npm run check:labels`** — kelengkapan marker aturan #18: tiap ID tertutup punya marker atau alasan `TANPA TAG KODE` di barisnya; tiap marker cocok dengan status barisnya; tidak ada sisa bentuk lama; marker wajib di baris komentar dan wajib berstatus; satu ID tidak boleh dua kali di berkas yang sama. A9 di `npm run audit` menjaga konsistensi, berkas ini menjaga lubang. `--self-test` mengadili penjaga ini dengan 12 fixture. Terukur 30 Sep: LABEL HIJAU 8/0 — **83 marker di 49 ID · 72 baris · 51 tertutup · 5 beralasan tanpa marker (B43 B71 B74 B76 B115) · lubang 0 · bandel 0** (malam 30 Sep, sesudah B116 terdaftar dan B117 ditutup; sore hari yang sama tercetak 82 · 48 · 70 · 50) dan SELF-TEST HIJAU 12 fixture / 0 luput; inventaris penuh: `npm run check:labels -- --list`. (Angka yang tertulis di baris ini sebelumnya — "73 tag di 42 ID; 43 tertutup", lalu "78 tag di 45 ID" — benar pada waktunya dan kini basi: marker B112 masuk dan pemeriksaannya bertambah dari 4 jadi 8. Tidak kutimpa; kucetak ulang dari run hari ini.) |
| `scripts/agent-identity.js` · `scripts/admit.js` · `scripts/agent-identity-check.js` | B118, reshaped by decision D54 (1 Oct) — grading/reviewing agents' ERC-8004 identities in BNB's registry (`src/erc8004.js`). **`npm run agent:identity -- --role grader|reviewer`** (read-only; `--apply` funds the Agent Owner, `register()`s, binds `agentWallet` to the agent's **own operational key** with that key's EIP-712 signature, sets a `data:` registration file and the owner's base tariff `lencana.baseTariff`; refuses a wallet or owner equal to the publisher; every step reads chain first and every transaction is simulated first). **`npm run admit -- --address 0x… [--apply]`** — the platform's admission gate for **publishers**: refuses an address that is an agent's wallet or owner (agents grade, they never sign credentials). **`npm run verify:agent`** — 24 read-only checks → `vault/09-Testing/T35 - signer agent-identity-check.js.md` |
| `src/pricing.js` · `src/agents.js` · `scripts/agents-check.js` | B119 + B120 — renting agents per activity. `pricing.js` is the seven-label ladder (×1.00 … ×1.30, 5% per level, `LADDER_HASH` stored with each charge); `agents.js` reads an agent's facts from chain, records a hire, turns each agent judgement/review into a charge, appoints reviewer agents, and settles a charge over x402 to the agent's wallet. **`npm run verify:agents`** — 34 checks without gas; **`npm run verify:agents:live`** — 40, paying both charges for real → `vault/09-Testing/T36 - signer agents-check.js (B119 sewa agen).md`, `T37 - signer agents-check.js (B120 reviewer agen).md` |
| `src/praktik.js` · `scripts/praktik-check.js` | B121 core (decision D55) — practice graded by chain. `praktik.js` checks a submission against the proof type the publisher wrote in `lesson.proof` (`balance`, `tx-receipt`, `eth-call`, `allowance`) by re-reading chain 97, requires the practice wallet to sign a binding that names the learner, and answers a mismatch with the failing check names only. Route `POST /praktik` in `server.js`; one-time proof keys in `praktik_proofs` (migration 0011). **`npm run verify:praktik`** — 32 checks without gas (the transfer is a fixed `KNOWN_TX`); **`npm run verify:praktik:live`** — the same 32 with one fresh 0.001 tBNB transfer from the deployer key acting as practice wallet → `vault/09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain).md` |
| `scripts/quiz-keys-check.js` | B80 (decision D56) — **`npm run verify:quizkeys`**: the quiz answer keys stay on the server. Loads the keyed manifests (`web/src/manifest-keys.ts`), audits the keys, checks `rubricHash` computed = published = edge criteria, builds the web bundle and scans JS + source maps for the answer explanations and `answer:<n>` literals (with the question prompts as positive control), refuses any `web/src` file other than `manifest-keys.ts` importing a key file, and checks `/grade` over HTTP returns `review` without the right option's index. `-- --deployed=<url>` also scans the bundle currently served at that page → `vault/09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis).md` |
| `src/privy.js` · `scripts/privy-check.js` | B82 (decision D57) — learner sign-in through Privy. `privy.js` verifies a Privy access token with the app secret (`PRIVY_APP_ID`/`PRIVY_APP_SECRET` in `app/.env`, server only — never under a `VITE_*` name), re-reads the user from Privy's API, and binds the learner address to the account only if it is one of that user's **embedded** Ethereum wallets; `db.js:bindLearnerAccount` makes the binding atomic and refuses to rebind an address to another account (migration 0012, no email stored). Route `POST /auth/privy` in `server.js` (400/401/403/409/502, and 503 when the secret is absent). It changes nothing about write authorisation — every write still needs the learner's signature over a one-time nonce. **`npm run verify:privy`** — 41 checks (incl. three CORS-preflight checks, B122); `-- --deployed=<url>` also scans the bundle being served → `vault/09-Testing/T41 - signer privy-check.js (B82 login Privy).md` |
| `src/ports.js` | `freePort(from)` for every harness that starts its own server: tests whether the port can be **bound**, instead of asking `/healthz` with a 600–700 ms timeout — a live-but-slow orphan server used to read as "free", the new server failed to bind silently, and the harness talked to old code (found 1 Oct while doing B121; eight harnesses use it) |
| `scripts/deposit-check.js` | **`npm run verify:deposit`** (no gas, 27/0) / **`npm run verify:deposit:live`** (38/0, once per label) — B90: the deadline-premium deposit. Reads the deployed `CourseDeposit` back from chain (`token`, `issuer`, `owner`), recomputes `policyHash` from the publisher manifest two ways, checks every refusal by code and reason, and in `--live` runs one deposit from `deposit()` to `finalize()` with `issuedAt` taken from BAS. Logic in `src/deposit.js`; routes `GET /deposit/policy/<course>`, `GET /deposit/<course>/<learner>`, `POST /deposit/finalize`; broadcasting off unless `DEPOSIT_BROADCAST=1` → `vault/09-Testing/T34 - signer deposit-check.js.md` |
| `scripts/relay-check.js` | **`npm run verify:relay`** — B97: rute relayer `POST /relay` diadili lewat HTTP tanpa gas. Yang sah diantrekan secara idempoten; yang pasti revert ditolak sebelum gas dengan kode dan sebabnya (skema lain 422, agen tak terdaftar 403, tanda tangan tak pulih 401, nonce terpakai antrean 401, kredensial sudah terbit 409, `deadline` 0/lewat/terlalu jauh 422). Ditutup dengan membaca ulang chain: nonce agen dan `attestationOf` tidak berubah. 31 checks / 0 failed, 30 Sep. **`npm run verify:relay:live`** menyalakan `RELAY_BROADCAST=1` dan menulis **satu** attestation testnet dari antrean, lalu membacanya balik: attester = agen, saldo agen tetap, kiriman ulang tidak menjadi siaran kedua — 17 checks / 0 failed, 30 Sep |
| `scripts/tag-migrate.js` | **`npm run migrate:tags`** — B112 opsi A: memindahkan penanda aturan #18 dari bentuk kurung-siku (yang bertabrakan dengan notasi tipe `[B32]` di kode kami sendiri) ke token yang tidak mungkin berupa kode, `Lencana-Bnn status=SELESAI\|TERBUKA`. Default **DRY-RUN**, menulis hanya dengan `--apply`; mengganti **satu token**, bukan menulis ulang kalimat. Ekspektasi jumlah terkunci, jadi korpus yang berubah membuat alat ini MENOLAK alih-alih menulis sebagian. Terukur 30 Sep: `MIGRASI HIJAU — 78 tag di 45 berkas (dry-run, 0 ditulis)` |
| `scripts/cold-store-probe.js` | **`npm run probe:cold`** — menyalakan signer dengan `.store/` KOSONG di `os.tmpdir()` — keadaan setiap orang dari `git clone` (B42/B106); membuktikan `/healthz` tidak 500 di sana, dan menjangkar hash uji ke tepi agar 404 berarti |
| `scripts/monitor-edge.js` | **`npm run monitor:edge`** — alarm EKSTERNAL untuk B67: umur `publishedAt` vs ambang, `matchesChainNow` kedua daftar, `unchecked`, satu dokumen nyata 200. Jalan di cron `.github/workflows/edge-monitor.yml`, BUKAN di `sync:numbers` — ia melaporkan AMAN/ALARM, bukan jumlah pemeriksaan |

## Who owns the bit number

**The issuer allocates the status-list index; the server only reads it.** That rule is the whole
reason `store.js` exists. The index is written *into* the credential at the moment it is issued, and
later read back out of it to find the bit. If the server allocated on its own, the number would
follow whatever order that request happened to iterate in, and an older credential's
`statusListIndex` could point at someone else's bit — a failure that is completely invisible to
signature verification, because the document would still be perfectly valid.

`check.js` proves the invariant instead of trusting it: for every credential in the store, the bit
**at the index the document itself claims**, read from the rendered list, must equal what the chain
says.

## Who decides which credentials are in the list

A second rule sits next to the first, and breaking it is quieter. `lists.js` exports
**`servedHashes()`**, and it is the only place that answer may come from — the server builds its
lists with it, and `issue.js` anchors with it.

Until 21 Sep the issuer anchored `sha256` of a list rendered over **one** credential (the one being
issued) while the server served a list over **all** of them. Both went through the same `renderList`,
so the *rules* were identical and the code looked shared — but the *inputs* differed, so the anchored
hash could never equal the bitstring anyone actually read. Every form was valid, the signature
checked, and the anchor proved nothing. Sharing a function is not sharing a decision.

`check.js` §5c now pins the property that made the bug possible: rendering the same input twice must
give the same hash, and reversing the input order must **not** change it. A served list that depends
on iteration order would silently orphan the index written into every older document.

## Two empty lists share a hash

`sha256("")` of an all-zero bitstring is the same for `revocation` and `suspension`, so anchoring an
empty list records one hash for both purposes — measured, not theorised. Consequence to keep honest:
an anchor is only meaningful **once a bit is set**, and `getTimestamp()` cannot tell you *which*
list a hash belonged to. If that ever matters, the fix is to include the purpose in the anchored
digest, not to hope readers infer it.

This is also why `issue.js` says `sudah ada … — tidak diulang` for the second purpose when both lists
happen to be empty: it is the collision above being detected, not a skipped step.

Two keys per agent, deliberately: the **EOA** is the on-chain `attester` (D30/D31), the **Ed25519
Multikey** signs the document. Standard verifiers only ever see the second one; the two are linked
by the issuer document URL, which is legal because §8.5 of OB3.0 "only requires HTTP URL support".

## The agent signs; the platform pays

`npm run delegate` is the only command in this package that proves the design decision the whole
agent story rests on, and it is worth reading its output line by line:

```
tx platform  : 0xbe44e128…54d5   gas 370131
  ok    attester = AGEN, bukan penyiar
  ok    saldo agen TIDAK berubah (nol gas di sisi agen)
  ok    nonce agen naik 3 -> 4
```

An attestation whose recorded author is an address that never sent a transaction is only possible
because our `onAttest` gates `_issuer[attestation.attester]` rather than `msg.sender`. That single
choice is what makes third-party issuers onboardable without handing them BNB — and it is also why
the platform holds no signing power over the credential: it can delay a broadcast, it cannot
author one.

Two measurements of the gate on the fixtures, both refusing, neither signing anything:

```
essai-pendek.md     -> INSUFFICIENT_EVIDENCE  mekanis=20   (33/400 kata, 1/5 tanda)
essai-230-kata.md   -> AWAITING_JUDGE         mekanis=80   (4/5 tanda, 228/400 kata)
```

The second one is the interesting case. The answer is substantively good — it names the resolver,
cites `statusOf`, opens an RPC, and states its own limits — and the gate still refuses to turn that
into a grade, because the five rubric criteria that need judgement have nobody judging them yet.
A tool that returned `85` there would be indistinguishable from a tool that made it up.

Two shapes of the same idea are implemented, and they are **not** interchangeable:
`attestByDelegation` takes one `AttestationRequestData` plus one signature;
`multiAttestByDelegation` takes parallel arrays. Serving both from one builder produced
`InvalidAddressError: Address "[object Object]"` — an array where a struct belonged. The failure
landed client-side, before any gas moved, which is exactly the kind of bug that survives review
because the batch path already worked. Each path now builds its own request.

## Run it

```bash
npm install
node scripts/agent.js                 # creates .keys/agent-demo.json (testnet-only)
node scripts/check.js                 # 65 checks with a chain to read (fewer offline — the run names what it skipped)
node src/server.js                    # http://127.0.0.1:8787
node scripts/serve-probe.js           # 20 checks against the running server
node scripts/issue.js --course web3-dasar-2026 --learner 0x… --score 87
npm run delegate   # agent signs, platform broadcasts: needs tsx (devDependency) for the .ts imports
npm run anchor     # witness the list currently served; costs no gas if nothing changed
```

~~`check.js` section 5 and the server read `process.env` and **nothing else** — no dotenv, unlike
`issue.js` and `adopt.js`, which read `app/.env` themselves. Run them through an env loader or they
will silently fall back to `http://127.0.0.1:8545` and report failures that mean "not configured".~~
*(Corrected 5 Oct: stale. Both now load `app/.env` themselves through `src/env.js` — `src/server.js:125` and
`scripts/check.js:32` — and process variables win over the file. A missing `app/.env` is not an error: the
hosted copy below runs on process variables only and says so in its first log line.)*

Against the public BSC testnet (chain 97), the values that produce full coverage:

```bash
set RPC_URL=https://bsc-testnet.publicnode.com
set RESOLVER_ADDRESS=0x7CA624caFDe5cA3A27b33d26be56F73a90792065
set STATUS_HASHES=<comma-separated credential hashes>   # optional: default is everything in the store
set EXPECT_REVOKED=<uid>
set EXPECT_SUSPENDED=<uid>
set EXPECT_CLEAN=<uid>,<uid>
```

`EXPECT_*` drive `serve-probe`'s bit-level checks and take **UIDs, not hashes** — take them from
`/healthz` or `adopt.js`, both of which read them back off the chain. A run without them prints 11
checks and names the skipped group: the number it prints is never a coverage claim. The UIDs that a
`SeedDemo` run *prints* for credentials it minted itself are estimates by design (see the UID rule
in the repo docs); only the values read from the chain afterwards are usable here.

An anvil fork of chain 97 is addressed the same way with `RPC_URL=http://127.0.0.1:8545`.

Without a chain `check.js` still runs and says **which group it skipped** — a green number that hides
an untested path is the failure mode this repo complains about in other people's research.

Requires **Node ≥ 22.18**. This package is plain ESM JavaScript — but `chainStatus.js` imports
`web/src/abi.ts` directly rather than copying the ABI a second time, and that only works because
Node 22 strips TypeScript types on import by default. If `npm run check` dies with
`Unknown file extension ".ts"`, the Node version is the first thing to look at, not the code.

### Hosted copy (Railway — B154, D74)

The signer the Vercel front-end talks to runs on Railway (project `lencana`, service `signer`):
`https://signer-production-e4f2.up.railway.app`. The image is `signer/Dockerfile`; its build context is the repo root
`app/`, because the server imports `web/src/*.ts` and resolves `viem` for them from `web/node_modules`. The start script
`signer/scripts/cloud-start.sh` writes the status-list key from `AGENT_KEY_JSON_B64` to `.keys/<AGENT_SLUG>.json` and
drops the variable before the server starts. That key is `agent-cloud` — a key that only signs this server's own status
lists, **not** the key that signs credentials. Secrets live only in the service variables, set one by one with
`railway variable set <NAME> --stdin` so no value ever reaches a command line.

Since B156 (5 Oct) the service is connected to the GitHub repo (`main`), so a push redeploys it the way it redeploys the
Vercel front-end — and GitHub only ever holds committed files. Nothing has to run on a laptop: the battery starts its own
short-lived signer for `serve-probe`, and local front-end development talks to this hosted signer unless
`VITE_SIGNER_URL=http://127.0.0.1:8787` is set while testing signer changes before they are deployed. A manual deploy, if
ever needed, still goes from committed files only, so `.env`, `.keys`, `.store` and anything untracked never leave the
machine:

```bash
git archive HEAD signer web/package.json web/package-lock.json web/.npmrc web/tsconfig.json web/src | tar -x -C <staging>
railway up <staging> --path-as-root -s signer -e production
```

The service needs `RAILWAY_DOCKERFILE_PATH=signer/Dockerfile`: a `railway.json` is ignored for CLI uploads (measured
5 Oct — the first upload fell back to Railpack and failed). Measurements: `vault/09-Testing/T78 - Uji signer cloud
Railway dan build produksi (B154).md`.

## Two status lists, not one

| list | OB/BSL meaning | our chain fact | reversible? |
|---|---|---|---|
| `revocation` | "cancel the validity … not reversible" | `revoke()` by the issuing agent (EAS) | no |
| `suspension` | "temporarily prevent acceptance … reversible" | `delistIssuer()` by the platform (D30) | yes — `relistIssuer()` |

Collapsing both into one list would erase the distinction D30 exists to create, and every third-party
verifier would read a recoverable delisting as a permanent revocation.

⚠️ **Corrected 27 Sep — the sentence that used to sit here was wrong.** It claimed "BSL allows multiple
`credentialStatus` entries per credential, so there is no reason to compress them." The OB 3.0
AchievementCredential schema declares `credentialStatus` as `type: object` with cardinality `[0..1]` —
one entry, one purpose — and `vc.1ed.tech` said so in its own words: `$.credentialStatus: array found,
object expected`. So a credential points at **exactly one** list (`revocation`), and `suspension`
remains built, anchored and served without being referenced by any credential that declares this profile. The sentence
we are allowed is *"two status lists, and a credential points at revocation"* — not "every credential
carries both". Details: `../vault/00-Overview/04 - Corrections.md` and
`../vault/09-Testing/T15 - 1EdTech validator.md`.

`expired` is deliberately **not** in any list: the document already states `validUntil` and verifiers
read that themselves. Encoding it twice would create two sources of truth that are allowed to
disagree.

## What this does *not* claim yet

- **Tested on 27 Sep: `outcome: VALID`.** The first document failed with 2 errors — `credentialStatus`
  must be one object, and the bitstring was below BSL's 131.072-entry minimum — both were fixed and the
  credential issued afterwards passed: 14 checks, 0 errors, 0 warnings, 0 exceptions. Both verdicts are
  kept verbatim in `vault/09-Testing/T15`.
  What the validator followed was not a paste: it resolved our `verificationMethod`, fetched both status
  lists over HTTPS and checked the signature — which is the whole design, judged by a stranger.
- **Everything in this package has now run against the public BSC testnet (chain 97)**, not a fork:
  `issue.js` attested and anchored, `check.js` and `serve-probe.js` read live chain state, and
  `delegate.js` published lesson-level attestations through both delegation entry points
  (21–22 Sep). The addresses are in `../vault/04-technical-reference.md` §D. The server has since been
  reached from the public internet through a quick tunnel (27 Sep), which is what made the bullet above
  possible — but a tunnel domain dies with the process, so an identity minted under one is not
  something to show a recruiter. Durable hosting is `vault/11-Refactoring/RF6`.
- **The anchor's precision is stated, not oversold.** `timestamp()` stores `uint64` per `bytes32`
  and keeps no content, so it proves *"this bitstring hash existed at this time"*, not *"we always
  serve this list"*. And two empty lists hash identically (see above), so a hash for an
  all-zero list proves less than one that has a bit set.
- **`IndexAllocator` state lives on the issuer side, deliberately.** The *slot* is ours; the *status*
  is read from chain on every render. Losing the store means old lists cannot be re-derived, not
  that a credential's status becomes wrong.
- **Testnet-only keys.** `.keys/` is gitignored; a production key belongs in a KMS/HSM, not here.
- **JSON-LD contexts are fetched over the network** by the default loader. Vendoring them into
  `makeDocumentLoader` is the known fix if offline determinism ever matters (it also removes a
  runtime dependency on w3.org being up during a demo).

## Three things measured while building this, so they are not rediscovered painfully

1. **`Result` in OB 3.0 is `{ achievedLevel?, resultDescription?, status?, value }`** — read from
   `context-3.0.3.json` itself. `achievementId`, `identity`, `resultScore` and `statement` are
   **Open Badges 2.0** shapes; jsonld 9 in safe mode drops unknown properties and then fails with
   "did not expand into an absolute IRI", which points at the wrong file entirely.
2. **`https://w3id.org/vc/status-list/2021/v1` is the wrong context for Bitstring lists.** It defines
   the `StatusList2021*` family. `BitstringStatusListCredential`, `BitstringStatusList`
   (`encodedList`, `statusPurpose`, `ttl`) and `BitstringStatusListEntry` (`statusListIndex`,
   `statusListCredential`, `statusSize`, `statusMessage`) all live inside
   `https://www.w3.org/ns/credentials/v2`.
3. **`Profile` is an Open Badges term, not a W3C one.** A status list credential signed with only
   the W3C context must use a bare issuer URL; `issuer.type = "Profile"` fails expansion there.

## Related

`../vault/02-architecture.md` · `../vault/03-evidence-and-limits.md` · `../web/scripts/probe.ts` ·
`../test/CredentialResolver.fork.t.sol`
