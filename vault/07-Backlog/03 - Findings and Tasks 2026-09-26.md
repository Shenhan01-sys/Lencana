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
| **B38** ✅ 27 Sep | ~~`tokenURI` beku saat mint~~ → **metadata sekarang dirakit on-chain**: `tokenURI()` membaca `registry.statusOf()` setiap panggilan, jadi artefak kredensial tercabut melaporkan `REVOKED` juga di wallet. `external_url` memang beku (itu alamat, bukan keadaan), dan itu satu-satunya bagian yang tetap beku. Urutan kata mengikuti verifier: revoked → expired → issuerDelisted → VALID — `_uris[tokenId] = uri` (`contracts/SoulboundCert.sol:132`) and there is no burn path. A revoked credential therefore keeps an artefact whose metadata still looks valid forever | contradicts the thing we sell ("revocation is visible"). The wallet/marketplace view becomes the one place our story is false | `tokenURI()` resolves to a **live** view (status included), or points at `…/credentials/<hash>`; bukti: `test_Adegan2_CabutDiTengah…` di `CredentialEndToEndOnBsc.fork.t.sol` (rantai 97 DAN 56) + `test_MetadataMengikutiStatusSetelahDicabut` lokal;forge **99/0**; dan dibaca dari RPC publik: `cast call 0xC6FD12B06e4dB9B85C8C807826998f98DA51c4cd "tokenURI(uint256)(string)" <hash>` → `{"name":"Lencana — VALID",…,"value":"VALID"}` |
| **B39** ✅ 28 Sep (source) | **Keputusan: artefak = capaian level KURSUS.** Kredensial lesson tetap terbit dan tetap diverifikasi, tapi tidak masing-masing mencetak token — 24 lesson satu kursus akan mengubah portofolio jadi 24 keping yang saling menutupi | ditegakkan di KONTRAK (`_mintOne` membaca `registry.lessonOf(registry.attestationOf(hash))` dan menolak dengan `LessonLevelNotMintable(hash, lessonId)`), bukan di script: satu jalur untuk `mint` dan `mintBatch` | `test_ArtefakHanyaLevelKursus` (lolos untuk kursus, menolak untuk lesson, dan penolakan tidak meninggalkan artefak); fork suite tetap 104/0 di 97 dan 56. **Deployment yang ada di 97 belum memuat aturan ini** — ikut batch redeploy di B52 |
| **B40** ✅ 28 Sep (source) | `mintBatch(learners[], hashes[], uris[])` — satu transaksi untuk N artefak, `MAX_BATCH = 25` (angka yang sama dengan batas batch x402 karena alasan yang sama: di atas itu RPC publik mulai menjawab setengah kosong) | platform menyiarkan, jadi gas per-kredensial adalah biaya kami | Terukur, bukan diasumsikan: 4 artefak satu-per-satu = 474.335 gas vs `mintBatch(4)` = 436.164 gas, selisih **38.171** (~9.543/artefak) — angka test lokal; 21.000 gas dasar transaksi TIDAK kami masukkan ke klaim karena tidak terlihat dari dalam pengukuran ini. Atomisitas diuji (`test_BatchYangGagalTidakMeninggalkanArtefak`) |
| **B41** | The last validator step: `verificationMethod` came from the agent record created with `http://127.0.0.1:8787/…`, and `npm run agent` refuses to overwrite ("sudah ada … tidak ditimpa") — so `BASE_URL` never reaches issuer identity | until this runs, "1EdTech compatible" stays banned; it is our only remaining strong claim | `POST /upload` with part `file` to `vc.1ed.tech`, verdict pasted verbatim into `09-Testing/T15` — pass **or** fail |
| **B42** | Harness blind spot: `serve-probe` never starts the server with a **cold store**. Today the credential route and list rendering depend on store warmth | this is exactly how a "green 20/20" hid a real path failure | a probe run against a fresh store dir, or an explicit cold-store test |
| **B43** ✅ 28 Sep | ~~Utang dokumentasi~~ → ditutup dengan angka: `T6`, `T9`-`T14` ditulis dari run yang benar-benar dijalankan; `08-Results/00`, `10-Contributors/00`, `Open-Items/00`, `Acceptance-Criteria/00`, `Glossary`, `Quick-Reference` ada; 13 Module-Guide terisi (0 `_TODO`) | setiap angka yang dikutip materi submission punya halaman sendiri dengan tanggal dan perintahnya | `sync-vault.ps1` lalu `check-links.ps1` -> **Links checked: 1111, Broken: 0** (28 Sep); `check-mermaid.ps1` 20 blok `Hazards: 0`; `check-lang.ps1` 121 catatan `CJK: 0` |
| **B44** ✅ 28 Sep | The grading **method never reaches the credential**. `issue.js:249-256` builds `method` / `comment` (rubric ref, judge model, temperature) and `credential.js` does not emit them: OB 3.0's `Result` admits only `{achievedLevel, resultDescription, status, value}`, and an out-of-context term is dropped in canonicalisation. Verified 26 Sep against `signer/.store/state.json` — `result[0]` has four keys | the artefact answers *"which rubric"* but not *"who ran it"*, so "an agent graded this" is checkable only against our own logs | a standards-compliant home for the method (served `/criteria/<slug>` document — see B45 — or `Result.achievedLevel`), plus a `check.js` assertion that a model-graded document reports the model |
| **B45** ✅ 28 Sep (criteria + results; `/learners` & `/achievements` sengaja identifier) | Nothing under `/criteria/`, `/achievements/`, `/learners/` is **served**, although every issued document points at those URLs (`resultDescription`, `achievement.id`, `credentialSubject.id`) | a strict validator or a recruiter following `resultDescription` lands on our 404-with-hint. Same root cause as B44: the credential references documents that exist only as strings | `GET /criteria/<slug>` serves the issuer's rubric document (criteria text, weights, rubric items, full `rubricHash`) and `serve-probe.js` asserts it resolves |
| **B46** ✅ 27 Sep | `credentialStatus` kita adalah **array berisi dua entri**; skema JSON OB 3.0 yang dipakai validator (`ob_v3p0_achievementcredential_schema.json`) mengharapkan **satu object**. Validator menolak dokumen kita persis di sini | ini bukan cacat sintaks — ini tabrakan antara fitur yang kita jual (revocation permanen + suspension pulih) dengan bentuk yang diizinkan standar. Memutuskan salah satu berarti menulis ulang klaim, bukan memperbaiki typo | keputusan tertulis di [[00-Overview/03 - Decisions]], dokumen diterbitkan ulang di bawah identitas publik, lalu upload ulang: error #1 hilang tanpa memalsukan status |
| **B47** ✅ 27 Sep | Bitstring kita **tidak menyatakan kapasitasnya**. Pesan validator: "revocation bitstring length is less than minimumNumberOfEntries" — padahal yang kita hidangkan terkurus 2048 byte = 16.384 bit, 2 bit terpasang, indeks tertinggi 25 | jadi keluhan itu bukan "daftarnya pendek", tapi "daftarnya tidak bilang sepanjang apa". Field `credentialSubject.size` kita tidak tulis, dan pembaca yang tidak tahu harus menebak | kapasitas dinyatakan di dalam list credential, dan `serve-probe` membacanya balik; error #2 hilang |
| **B48** ✅ 28 Sep | **Satu `AGENT_SLUG` per proses, dan itu menjanda identitas sebelumnya.** `issuerDoc` dibangun sekali saat start (`server.js:50`), jadi `…/issuers/agent-demo` menjawab **404** begitu slug diganti ke `agent-b41` — padahal `.keys/agent-demo.json` ada | empat kredensial demo yang sudah terbit tidak bisa diverifikasi orang asing di instance itu: `verificationMethod` mereka menunjuk dokumen yang tidak kita sajikan. Untuk video, ini jebakan yang kelihatan seperti chain rusak | **Ditutup 28 Sep, dan ia menabrak harness lebih dulu:** `serve-probe` mati dengan `HTTP 404` saat server sesi sebelumnya kebetulan jalan dengan slug lain. Sekarang setiap agen di `.keys/` disajikan di URL-nya sendiri (`listAgents()` + `issuerDocumentFor()`, hanya field publik), `/healthz` melaporkan `agent` + `agentSlugs`, dan probe membaca identitas dari server, bukan dari konstanta. Run pertama kode baru ini menemukan bug di kodenya sendiri: `listAgents()` tidak ikut mengembalikan `publicKeyMultibase`, jadi dokumen issuer tersaji **tanpa kunci** — bentuknya sah, tanda tangan tidak akan pernah cocok. `serve-probe` 48/0 → [[09-Testing/T8 - signer serve-probe.js]] |
| **B49** | **Aturanku sendiri, dilanggar olehku:** alamat peserta kuketik ulang (`0x518bD439…`) alih-alih memakai yang kuturunkan (`0xc7B8D9C3…`). Kredensial pertama jadi milik alamat yang tidak bisa dijelaskan asal-usulnya | artefak publik tanpa provenance adalah persis hal yang kita kritik dari orang lain. Beres dengan `bas.revoke()` (75.532 gas) + re-anchor (45.869 gas), dan `EXPECT_REVOKED` disinkronkan supaya harness menghitung bit yang benar-benar ada | tidak ada address yang diketik tangan di perintah apa pun: parse dari `.env`/`broadcast`, atau turunkan di kode dan cetak alamatnya |
| **B50** | **Dua tempat masih menerbitkan `credentialStatus` sebagai array dua entri**, yaitu yang dibaca orang: `web/src/render.ts:273` dan dokumen demo di `web/src/main.ts:2085`. Bentuk itu persis yang ditolak `JsonSchemaProbe` kita sampai 27 Sep | kredensial yang TERSAJE di halaman kita sekarang tidak sama bentuknya dengan kredensial yang LOLOS validator. Untuk juri yang membuka "lihat dokumen", yang ia salin/unggah adalah yang gagal skema | kedua tempat itu jadi satu objek `revocation`; dilaporkan ke pemilik front-end sebagai **OI-12** dengan patch salin-tempel (aturan kita: laporkan + tawarkan, jangan sunting berkas dia); `check.js` suatu hari nanti menahan sisanya: tidak boleh ada `credentialStatus: [` yang tersisa di repo |
| **B52** ⏳ kini terbuka (B51 ✅ 28 Sep) | Ada dua `SoulboundCert` di 97: corpus demo di `0xA5eB80…` (metadata beku, `.env CERT_ADDRESS` menunjuk ke sini) dan `0xC6FD12…` memegang satu artefak ber-metadata hidup. **Tapi perbaikannya sudah terbukti**: `CredentialEndToEndOnBsc.fork.t.sol:76` memasang `new SoulboundCert(...)` DARI SOURCE di fork 97 dan 56 — jadi test itu menguji kontrak seperti yang kita tulis, bukan instance lama yang sudah ter-deploy | Kenapa tidak kupindah sebelumnya: `mint()` membekukan `external_url` permanen. Memindahkan artefak demo sebelum host tetap ada = membekukan URL tunnel yang akan mati, persis kesalahan yang kami catat di B51. Halangan itu sekarang tidak ada: `https://lencana-edge.hansgunawan775.workers.dev` hidup dan `npm run publish:edge` hijau atasnya | Urutan yang kuinginkan: satu batch mint di `0xC6FD12…` di bawah URL tepi → `CERT_ADDRESS` pindah → `npm run probe` + `npm run validator` hijau terhadap host itu → baru rekam video. Bukti pemindahan: `ownerOf` untuk keempat hash demo menunjuk ke kontrak baru; `DEMO_REVOKED_HASH` harus DITOLAK saat mint (`CredentialRevoked`) — penolakan itu bagian dari buktinya; `tokenURI` salah satu artefak dibaca dari RPC publik dan menyebut status yang benar |
| **B51** ✅ 28 Sep | **Host tempat kita meraih VALID sudah mati.** 28 Sep pukul ~07:00 `npm run validator` gagal dengan `getaddrinfo ENOTFOUND genres-wines-insulation-useful.trycloudflare.com` padahal origin-nya masih hidup di 8787 — quick tunnel-nya sendiri yang ditarik kembali. | Konsekuensinya permanen dan ini yang penting: URL ditulis **saat penerbitan**, jadi kredensial `0xfe4f7161…` yang kemarin `outcome: VALID` hari ini **tidak bisa diverifikasi siapa pun lagi**. **Aturan yang lahir: jangan menerbitkan di bawah host sementara.** Tunnel tetap untuk mengukur, tidak untuk mencetak artefak. | Ditutup dengan tepi sajian permanen ([[04-Signer-Service/S10 - Edge surface]]) dan harness yang membaca balik lewat HTTP ([[09-Testing/T16 - npm run publish edge]]): 23/24 rute, kedua daftar `matchesChainNow`. Kredensial `0xd0bce6f4…` terbit di `https://lencana-edge.hansgunawan775.workers.dev` dan **`outcome: VALID` dengan `baseUrl` tepi** (uploadId `val18368571955412434375.json`). ⚠️ Alasanku waktu ini masih ⏳ salah: kutulis "Workers Free tidak mungkin, butuh Paid $5/bln" karena 133 ms/daftar > 10 ms CPU. Itu benar hanya kalau tepinya menandatangani. Tepi **tidak menandatangani apa pun** — tanda tangan pindah ke `publish` di Node — jadi host ini hidup di plan Free. Lihat [[00-Overview/04 - Corrections]]. |

## Status 27 Sep — B41 dijalankan, dan hasilnya dua error

Rantai lima langkah [[Notes/Session-2026-09-27-B41-validator]] sudah jalan sampai ujung: identitas agen
publik, satu kredensial terbit dengan esai yang **benar-benar dinilai model** (92/70), dan
`POST /upload` ke `vc.1ed.tech` dengan part `file`. Verdict lengkap ada di
[[09-Testing/T15 - 1EdTech validator]] — `outcome: ERROR`, 14 pemeriksaan, **2 error**, 0 warning.

| # | status | catatan |
|---|---|---|
| **B41** | **DONE — `outcome: VALID`** | Run pertama: 2 error bentuk dokumen. Setelah keduanya dibetulkan (satu entri `credentialStatus`; bitstring 131.072 bit), kredensial yang terbit sesudahnya lolos dengan 0 error / 0 warning. Yang tersisa bukan "belum diuji" lagi, tapi "host tempat ia diuji sementara" → **B51** |
| **B44** ✅ 28 Sep | still open, **and now published where it can be checked** | `GET /criteria/<slug>` menjawab pertanyaan "aturan yang mana"; "penilai yang mana" masih belum ada di dokumen |
| **B45** ✅ 28 Sep (criteria + results; `/learners` & `/achievements` sengaja identifier) | **DONE** (criteria half) | rute + 5 pemeriksaan di `serve-probe`, termasuk penjaga supaya kunci jawaban kuis tidak ikut tersaji → [[04-Signer-Service/S8 - Criteria document]]. `/learners/<addr>` dan `/achievements/<slug>` tetap identifier — disengaja, dan alasannya tercatat di S8 |
| harness | `check.js` **72/0**, `probe:serve` **42/0**, `forge` **104/0** di 97 DAN 56 (naik dari 53/20/97 seiring himpunan pantau + dua blok pemeriksaan baru) | keduanya lewat tunnel publik, 27 Sep |


## Facta terkunci 28 Sep — harga host sementara, terukur

- **URL dalam dokumen dibekukan saat terbit, dan host yang sementara membuat artefaknya ikut mati.** kredensial `0xfe4f71615855ac4f24fdfef921937d64e23dfc048e371a96e04cf4f508173a8a` adalah bukti paling kuat yang pernah kita raih (VALID, 0 error) dan sekaligus artefak yang tidak bisa ditunjukkan ke orang lain hari ini. Tidak ada jalan tambal: yang perlu diperbaiki adalah *sebelum* menerbitkan.
- **Aturan:** `BASE_URL` harus permanen sebelum ada penerbitan yang kita niatkan untuk dipamerkan. Untuk kerja pengukuran (check.js, probe:serve, validator lokal) host lokal lebih dari cukup.
- **Yang berubah di kode semalam:** `readChainStatuses` sekarang paralel dengan batas 6; biaya sebenarnya bukan tanda tangan (133 ms) tapi 28 `eth_call` berurutan (~4,4 s → ~2,0 s). Reproduksi: `cd signer && npm run measure:signing`.

## Facta terkunci 27 Sep (supaya tidak diturunkan ulang oleh agen berikutnya)

- **OB 3.0 mempersempit VC 2.0 pada dua titik yang kita tabrak.** `credentialStatus` di skema
  AchievementCredential adalah `type: object` ([0..1] di tabel data) — branch array sengaja diberikan ke
  `proof`/`credentialSchema`/`termsOfUse`/`evidence` dan TIDAK ke `credentialStatus`. Dan satu entri =
  satu purpose (`statusPurpose` "MUST be a string" di §2.1 Entry, sementara di §2.2 List boleh
  "one or more strings"). Jadi "revocation + suspension di dalam satu kertas" tidak mungkin conform;
  keduanya tetap ada sebagai dua list, hanya satu yang dirujuk dokumen.
- **"16KB" di BSL adalah byte.** §2.2 *"the uncompressed bitstring MUST be at least 16KB in size"*;
  §6.1 *"a minimum revocation bitstring length of 131,072, or 16KB uncompressed"*; §3.2 langkah 9
  membandingkan `panjang(bitstring)/statusSize` dengan `minimumNumberOfEntries = 131.072`. 2.048 byte
  = 16.384 bit kita lolos 25 bit tertinggi tapi GAGAL sebagai list. `size`/`totalPages`/`expires`
  TIDAK ADA di BSL v1.0 — tidak ada field yang bisa menambahi kapasitas selain panjangnya sendiri.
- **Verdict validator dibaca dari `/api/validate`, bukan dari HTML.** Halaman `/validate` memuat
  "This content is eligible…" dan badge "No errors found." sebagai string template; satu-satunya angka
  ada di `GET /api/validate?validatorId=OB30Inspector&uploadId=…` (POST-nya menolak JSON dan
  form-urlencoded). `curl -X POST` + `-L` menghasilkan 411 di /validate — jangan pakai `-X POST`.
- **Run yang sah hari ini:** `outcome: VALID`, 14 checks, 0 errors/0 warnings/0 fatals/0 exceptions,
  dokumen `0xfe4f7161…3a8a`, uploadId `val1362183288355196627.json`. `valids: []` dan `valid: 0` di
  body yang sama berarti ia tidak merinci pemeriksaan mana yang lulus — klaim kita "tidak ada error".
- **Harness sesudah perubahan:** `check.js` **63/0**, `serve-probe.js` **37/0** — keduanya terhadap
  host publik, dan `serve-probe` kini membuktikan dua hal yang dulu tidak diuji sama sekali: bentuk
  `credentialStatus` dan panjang bitstring yang sungguh disajikan.

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

## Yang masih terbuka setelah B43 tertutup (28 Sep, supaya tidak dikira sudah bersih semua)

- **B51** host tetap — butuh akun Cloudflare builder; tanpa itu setiap kredensial baru yang kita pamerkan menunjuk URL yang ikut mati bersama proses.
- **B52** memindah artefak corpus demo ke kontrak ber-metadata-hidup — menunggu B51, dengan alasan yang dicatat di barisnya.
- **B50** front-end masih menampilkan dokumen `credentialStatus` dua entri (patch sudah dikirim sebagai OI-12; pemilik berkas yang menerapkan).
- **RF5** catatan enrolment — lubang produk terbesar, dan masih lubang.
- **Registrasi event** dan **video ≤5 menit** — aksi manusia, bukan kerja kode.
- `09-Testing/T10`-`T13` memakai tanggal aslinya (23-26 Sep) karena belum dijalankan ulang; itu ditulis di masing-masing catatan, bukan dirapikan jadi "terlihat segar".
