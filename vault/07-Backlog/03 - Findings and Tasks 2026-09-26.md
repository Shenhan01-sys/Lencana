---
tags: [backlog, tasks]
status: active
updated: 2026-09-26
---

# 03 - Findings and Tasks, 26 Sep

Born from reading the contract and the server this session. Each task states who owns it and what
counts as proof — no task here is "polish X".

## Core system (ours)

| # | task | why now | proof it is done |
|---|---|---|---|
| **B38** | `tokenURI` is **frozen at mint** — `_uris[tokenId] = uri` (`contracts/SoulboundCert.sol:132`) and there is no burn path. A revoked credential therefore keeps an artefact whose metadata still looks valid forever | contradicts the thing we sell ("revocation is visible"). The wallet/marketplace view becomes the one place our story is false | `tokenURI()` resolves to a **live** view (status included), or points at `…/credentials/<hash>`; a fork test asserts a revoked credential's artefact reports revoked through `tokenURI` |
| **B39** | **Decide artefact granularity.** Lesson-level credentials exist; if each gets an artefact, one learner carries ~24 tokens per course | portfolio becomes noise, and "soulbound achievement" loses meaning | a written decision in [[00-Overview/03 - Decisions]] + mint restricted to that level + a test that refuses the other level |
| **B40** | Batch minting. The platform broadcasts, so artefact gas scales per credential | we already proved batch settlement (≤25 per x402 payment); issuance/mint has no equivalent | one call minting N artefacts, gas per artefact printed by a fork test |
| **B41** | The last validator step: `verificationMethod` came from the agent record created with `http://127.0.0.1:8787/…`, and `npm run agent` refuses to overwrite ("sudah ada … tidak ditimpa") — so `BASE_URL` never reaches issuer identity | until this runs, "1EdTech compatible" stays banned; it is our only remaining strong claim | `POST /upload` with part `file` to `vc.1ed.tech`, verdict pasted verbatim into `09-Testing/T15` — pass **or** fail |
| **B42** | Harness blind spot: `serve-probe` never starts the server with a **cold store**. Today the credential route and list rendering depend on store warmth | this is exactly how a "green 20/20" hid a real path failure | a probe run against a fresh store dir, or an explicit cold-store test |
| **B43** | Documentation debt: `09-Testing/T6`, `T9`–`T14` unwritten; `08-Results/00 - Hub Results`, `10-Contributors/00 - Hub Contributors`, `07-Backlog/02 - Plan`, `Glossary`, `Quick-Reference` missing; 69 unresolved vault links; 13 Module-Guides still `_TODO` | every number quoted in submission material should have a home page with its date | `scripts\sync-vault.ps1` then `check-links.ps1` → `Broken: 0` |
| **B44** | The grading **method never reaches the credential**. `issue.js:249-256` builds `method` / `comment` (rubric ref, judge model, temperature) and `credential.js` does not emit them: OB 3.0's `Result` admits only `{achievedLevel, resultDescription, status, value}`, and an out-of-context term is dropped in canonicalisation. Verified 26 Sep against `signer/.store/state.json` — `result[0]` has four keys | the artefact answers *"which rubric"* but not *"who ran it"*, so "an agent graded this" is checkable only against our own logs | a standards-compliant home for the method (served `/criteria/<slug>` document — see B45 — or `Result.achievedLevel`), plus a `check.js` assertion that a model-graded document reports the model |
| **B45** | Nothing under `/criteria/`, `/achievements/`, `/learners/` is **served**, although every issued document points at those URLs (`resultDescription`, `achievement.id`, `credentialSubject.id`) | a strict validator or a recruiter following `resultDescription` lands on our 404-with-hint. Same root cause as B44: the credential references documents that exist only as strings | `GET /criteria/<slug>` serves the issuer's rubric document (criteria text, weights, rubric items, full `rubricHash`) and `serve-probe.js` asserts it resolves |
| **B46** | `credentialStatus` kita adalah **array berisi dua entri**; skema JSON OB 3.0 yang dipakai validator (`ob_v3p0_achievementcredential_schema.json`) mengharapkan **satu object**. Validator menolak dokumen kita persis di sini | ini bukan cacat sintaks — ini tabrakan antara fitur yang kita jual (revocation permanen + suspension pulih) dengan bentuk yang diizinkan standar. Memutuskan salah satu berarti menulis ulang klaim, bukan memperbaiki typo | keputusan tertulis di [[00-Overview/03 - Decisions]], dokumen diterbitkan ulang di bawah identitas publik, lalu upload ulang: error #1 hilang tanpa memalsukan status |
| **B47** | Bitstring kita **tidak menyatakan kapasitasnya**. Pesan validator: "revocation bitstring length is less than minimumNumberOfEntries" — padahal yang kita hidangkan terkurus 2048 byte = 16.384 bit, 2 bit terpasang, indeks tertinggi 25 | jadi keluhan itu bukan "daftarnya pendek", tapi "daftarnya tidak bilang sepanjang apa". Field `credentialSubject.size` kita tidak tulis, dan pembaca yang tidak tahu harus menebak | kapasitas dinyatakan di dalam list credential, dan `serve-probe` membacanya balik; error #2 hilang |
| **B48** | **Satu `AGENT_SLUG` per proses, dan itu menjanda identitas sebelumnya.** `issuerDoc` dibangun sekali saat start (`server.js:50`), jadi `…/issuers/agent-demo` menjawab **404** begitu slug diganti ke `agent-b41` — padahal `.keys/agent-demo.json` ada | empat kredensial demo yang sudah terbit tidak bisa diverifikasi orang asing di instance itu: `verificationMethod` mereka menunjuk dokumen yang tidak kita sajikan. Untuk video, ini jebakan yang kelihatan seperti chain rusak | setiap key di `.keys/` disajikan di URL-nya masing-masing (rute membaca slug), atau satu slug tetap untuk seluruh demo dan itu ditulis di `05 - Demo Scenes` |
| **B49** | **Aturanku sendiri, dilanggar olehku:** alamat peserta kuketik ulang (`0x518bD439…`) alih-alih memakai yang kuturunkan (`0xc7B8D9C3…`). Kredensial pertama jadi milik alamat yang tidak bisa dijelaskan asal-usulnya | artefak publik tanpa provenance adalah persis hal yang kita kritik dari orang lain. Beres dengan `bas.revoke()` (75.532 gas) + re-anchor (45.869 gas), dan `EXPECT_REVOKED` disinkronkan supaya harness menghitung bit yang benar-benar ada | tidak ada address yang diketik tangan di perintah apa pun: parse dari `.env`/`broadcast`, atau turunkan di kode dan cetak alamatnya |

## Status 27 Sep — B41 dijalankan, dan hasilnya dua error

Rantai lima langkah [[Notes/Session-2026-09-27-B41-validator]] sudah jalan sampai ujung: identitas agen
publik, satu kredensial terbit dengan esai yang **benar-benar dinilai model** (92/70), dan
`POST /upload` ke `vc.1ed.tech` dengan part `file`. Verdict lengkap ada di
[[09-Testing/T15 - 1EdTech validator]] — `outcome: ERROR`, 14 pemeriksaan, **2 error**, 0 warning.

| # | status | catatan |
|---|---|---|
| **B41** | **run DONE, claim still banned** | blocker "URL loopback tidak pernah sampai ke identitas penerbit" hilang (dokumen baru: `127.0.0.1` **0** kali, host publik 12 kali). Yang menahan kata "compatible" sekarang bukan akses, tapi dua error bentuk dokumen → **B46** dan **B47** |
| **B44** | still open, **and now published where it can be checked** | `GET /criteria/<slug>` menjawab pertanyaan "aturan yang mana"; "penilai yang mana" masih belum ada di dokumen |
| **B45** | **DONE** (criteria half) | rute + 5 pemeriksaan di `serve-probe`, termasuk penjaga supaya kunci jawaban kuis tidak ikut tersaji → [[04-Signer-Service/S8 - Criteria document]]. `/learners/<addr>` dan `/achievements/<slug>` tetap identifier — disengaja, dan alasannya tercatat di S8 |
| harness | `check.js` **61/0** (naik dari 53 seiring himpunan pantau), `probe:serve` **35/0** (dari 20) | keduanya lewat tunnel publik, 27 Sep |

## Frontend owner (Dave) — see [[10-Contributors/Open-Items-for-Dave]]

- **OI-11** stays the most serious: `main.ts` contains **no `fetch(`** at all and `simulateX402Batch()`
  (`main.ts:1003`) prints `402 CHALLENGE → SIGNED (0.0005 tBNB) → SETTLED → 200 OK (118ms)` from three
  `setTimeout`s. We settle real payments on chain 97 in the same repo — the UI should show that, not a
  timer. Smallest step: `POST {BASE_URL}/verify`, render `accepts[]`, `X-PAYMENT-RESPONSE`, tx hash;
  print "server tidak terhubung" when unreachable.
- **B38 pairs with a UI rule**: wherever an artefact is displayed, status is fetched, never assumed
  (no burn exists by design).
- **B39 is a product decision they must be told about**, not a code task.

## Facts locked this session (so nobody re-derives them)

- **Course prose is chain material.** `manifest.course.blurb` becomes `achievement.description` and
  `title` becomes `achievement.name` in every signed document (`issue.js:239-240`), and there is no
  re-issue path for a document already out — so a wrong sentence in a course description is a wrong
  sentence under a signature. `auditCourse` now refuses `/\bmenit\b/i` in a blurb; durations come from
  `courseStats` (measured: `web3-dasar-2026` = **307** min, catalog = **412** min, per kind
  bacaan 133 · esai 95 · praktik 85 · kuis 47 · kasus 34 · referensi 18).
- **Per-lesson-kind minutes are derivable, and now measured** — the numbers above are from a one-off
  `tsx` script over `COURSES`; `npm run inventory` prints the totals. Any future duration table in this
  vault should be regenerated, not extended by hand.
- **`issue.js` has `--score` removed for real** (K4): the flags are `--quiz`, `--essay-score`,
  `--no-praktik`, and the composite is computed against the issuer's manifest before anything is signed.
- `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` (CredentialResolver, chain 97) appears in
  `broadcast/DeployCredentials.s.sol/97/run-latest.json`, in `web/src/verify.ts` as the page's default
  endpoint, and in `vault/02-Contracts` → safe to type into the submission form. Network = BSC Testnet.
- The other three addresses are listed in `vault/02-Contracts/01 - Contracts.md:15-18` and belong in the
  description box, cross-checked individually before use.
- Submission copy (tagline + problem statement at 1655/2000 chars) lives in
  [[00-Overview/08 - Submission Copy]]; banned sentences in [[10-Contributors/Claims-Cheat-Sheet]].

**Related:** [[07-Backlog/01 - Backlog]] · [[02-Contracts/C2 - SoulboundCert]] ·
[[11-Refactoring/RF6 - Core System, Backend and Contracts]]
