---
tags: [contributor, open-item, hub]
status: active
updated: 2026-10-05
---

# Open Items for the Frontend

Raised against `web/` while the vault was being restructured, and re-checked line by line on 26 Sep
against the files as they are now. Every row names what the product prints, what is actually true, and
the command that shows it. Nothing here is a style opinion.

**Catatan urutan:** butir ditambahkan saat diketemukan, jadi tiga paling bawah bukan urutan nomor
(OI-11, OI-14, OI-13, OI-12). Nomor adalah anchor, bukan posisi — pakai indeks di
[[10-Contributors/Open-Items/00 - Hub Open Items]] untuk membacanya berurutan.

**Ownership:** `web/index.html`, `web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts` are yours and
your version wins on merge (`-X theirs` for those files), then the harnesses get re-run. ~~What must not
disappear is `#lms-mount` (`web/index.html:518`) and the `renderLmsRoute()` call (`web/src/main.ts:1180`)
— without them the learning surface renders nothing.~~ *(Koreksi 3 Okt: sejak FE7 (1 Okt malam) `lms.ts` dan
`renderLmsRoute` tidak ada lagi — ruang belajar adalah `web/src/pages/class.ts` + `web/src/lesson-views.ts`, dipasang
`mountNewApp()` (`web/src/new-app.ts:14`, yang membuat `#page-new-app` bila belum ada) dan dipanggil dari `web/src/main.ts:1072`.
Yang tidak boleh hilang sekarang adalah panggilan itu beserta impornya (`web/src/main.ts:1004`); `#lms-mount` masih ada di
`web/index.html:596` tetapi tidak lagi menjadi titik pasang — lihat [[03-Frontend/FE4 - Mount contract with the maintainer]] dan
[[03-Frontend/FE7 - Merge cabang FE 1 Okt]].)* Never `--force` `main`; prove a push with
`git ls-remote origin refs/heads/main` vs `git rev-parse HEAD`, not with silence.

## Peta dokumen

| # | item | evidence | status |
|---|---|---|---|
| **OI-1** | two credential documents typed into the page by hand | `web/src/main.ts:1104-1111`, `:2079-2105` | OPEN |
| **OI-2** | a route the server does not answer | `web/index.html:1347`, `:1358` vs `signer/src/server.js:289` | OPEN |
| **OI-3** | a simulated 256-bit list called on-chain | `web/src/main.ts:816`, `style.css:6134` vs `signer/src/statusList.js:34` | OPEN |
| **OI-4** | EVM reverts that no contract emits | `web/src/main.ts:907-945` vs the error table below | OPEN |
| **OI-5** | a learner, a grade and a rubric id that were never produced | `web/src/main.ts:745`, `:971`, `web/src/i18n.ts:584,947,955,1006` | OPEN |
| **OI-6** | URLs on a domain this repository does not serve | 20 occurrences: `main.ts` 17, `index.html` 2, `render.ts` 1 | OPEN |
| **OI-7** | native coin and prices that are not ours | `web/src/main.ts:2170` + the fee cells in the same panel | OPEN |
| **OI-8** | hero claims the product does not have | `web/index.html:237`, `web/src/i18n.ts:1018` | OPEN |
| **OI-9** | documents describing pages and logins that are not built | `FRONTEND_ITERATION.md:124` + its `file:///C:/…` links | OPEN |
| **OI-10** | a config preset pointing at addresses that are not ours | `web/src/config.ts:23-24`, `:34-35` | OPEN — needs your call |

### Status terukur 30 Sep (B117) — kolom "status" di atas ditulis 26 Sep dan tidak pernah disegarkan

Peta di atas berhenti di OI-10 dan menandai semuanya OPEN, padahal beberapa butir sudah ditutup lewat baris
backlog sejak 28–29 Sep. Yang di bawah ini **dihitung** dari `main` hari ini: jumlah kemunculan literal per
berkas di `web/index.html`, `web/src/main.ts`, `render.ts`, `i18n.ts`, `config.ts` (komentar ikut terhitung,
jadi tiap angka kubaca barisnya sebelum menyimpulkan). Nomor baris di peta lama sudah bergeser — `main.ts`
tumbuh — jadi pakai nama simbolnya, bukan nomornya.

| # | keadaan 30 Sep | yang terukur |
|---|---|---|
| OI-1 | **SEBAGIAN** | `generateCanonicalJsonLd` dan dokumen demo bertanda tangan palsu sudah dibuang (B94, B100); panel itu kini `fetch` dokumen asli dari tepi. Yang tersisa: `RINA_CREDENTIAL_JSONLD` di `main.ts` masih objek ketikan tangan (`urn:uuid:…`, `did:pkh:…`) dan masih dipakai dua kali |
| OI-2 | ~~**OPEN**~~ *(TUTUP 3 Okt — tabel di bawah)* | `/api/v1/verify/batch` masih ada: `index.html` 1, `i18n.ts` 2 |
| OI-3 | ~~**OPEN**~~ *(TUTUP 3 Okt — tabel di bawah)* | `toggleBitstringState` / "Simulate State Flip" masih ada: `index.html` 1, `main.ts` 2, `i18n.ts` 1 |
| OI-4 | ~~**OPEN**~~ *(TUTUP 3 Okt — tabel di bawah)* | `AttestationNotFound` / `ErrLocked` / `checkPrerequisites` masih ada: `index.html` 1, `main.ts` 3, `i18n.ts` 2 |
| OI-5 | **OPEN** | `Rina Oktaviani` masih ada (`index.html` 3, `main.ts` 2, `i18n.ts` 6), begitu juga `#0x91a7` / `93/100`. Yang sudah hilang: angka kartu agen 1,420 / 856 / 640 (B101) |
| OI-6 | **TUTUP** di berkas yang disajikan (B100) | `lencana.io` tinggal di komentar sejarah `main.ts`; nol di `index.html`, `render.ts`, `i18n.ts`. Masih satu di `FRONTEND_ITERATION.md` |
| OI-7 | ~~**OPEN**~~ *(TUTUP di panel bayar 3 Okt — tabel di bawah)* | `tBNB` masih ada: `index.html` 1, `main.ts` 1, `i18n.ts` 2 |
| OI-8 | **literal tidak ditemukan lagi** | nol kemunculan `DAO-GOVERNED`, `FULLY ON-CHAIN DIPLOMAS`, `autonomous domain AI agent`, `on-chain mastery` di `index.html` dan `i18n.ts`. Aku tidak menelusuri komit mana yang menghapusnya |
| OI-9 | **OPEN** | tiga tautan `file:///` masih di `FRONTEND_ITERATION.md` (tercatat di `vault/scripts/link-exceptions.txt`) |
| OI-10 | **OPEN** | kedua alamat preset itu masih ada: `config.ts` 4, `index.html` 1 |
| OI-11 | ~~**OPEN**~~ *(TUTUP 3 Okt — tabel di bawah)* | `simulateX402Batch` masih ada dan masih berjalan di atas timer. Satu-satunya `fetch(` di `main.ts` milik panel dokumen (OI-1), bukan panel pembayaran |
| OI-12 | **TUTUP** (B68) | nol `credentialStatus: [` di berkas FE |
| OI-13 | **TUTUP** (B69, B100) | tombolnya memanggil `runSpecAudit()`; string "14/14 … (12ms)" tinggal di komentar sejarah |
| OI-14 | **TUTUP** (B71) | nol `../_research/` di kedua `package.json` |
| OI-15 | **TUTUP** (B70) | nol "belum disiarkan ke chain" |
| OI-16 | catatan, bukan cacat | keputusan kunci kuis di bundel tetap terbuka sebagai B80 |

*(Koreksi 3 Okt — tabel di atas adalah keadaan 30 Sep dan sebagian sudah dilampaui.* B123 (D59, 2 Okt; lihat OI-24 di bawah)
*membuang Tamper Playground, konsol x402, dan matriks bitstring dari halaman. Dihitung ulang 3 Okt dengan grep atas
`web/index.html` + seluruh `web/src`:*

| # | keadaan 3 Okt | yang terukur |
|---|---|---|
| OI-2 | **TUTUP** (B123) | nol `/api/v1/verify/batch` |
| OI-3 | **TUTUP** (B123) | nol `toggleBitstringState`, nol "Simulate State Flip" |
| OI-4 | **TUTUP** (B123) | nol `AttestationNotFound` / `ErrLocked` / `checkPrerequisites` |
| OI-5 | **OPEN** | `Rina Oktaviani` masih ada (`index.html` 3, `i18n.ts` 6, `main.ts` 1), begitu juga `#0x91a7` dan `93/100`. Di `index.html` dua kemunculan nama ada di halaman yang tidak lagi punya rute (`#page-home` `:654`, `#page-portfolio` `:1325`); yang ketiga di modal ijazah (`:1902`), yang namanya diisi `main.ts:864` — keterjangkauan modal itu tidak kutelusuri |
| OI-7 | **TUTUP** di panel bayar (B123) | nol `tBNB` di `index.html`, `main.ts`, `i18n.ts`; yang tersisa hanya teks lesson praktik (`courses/web3-dasar.ts`) dan saldo gas di `pages/owner.ts`, keduanya memang tBNB |
| OI-10 | **OPEN** | kedua alamat preset tinggal di `config.ts` (2), nol di `index.html` |
| OI-11 | **TUTUP** (B123) | nol `simulateX402Batch`; CSS `.x402-*` masih tersisa di `style.css` (dicatat di OI-24) |

*Butir lain tidak diukur ulang hari ini. OI-17 dan OI-19 punya koreksinya di bagiannya masing-masing.)*

## OI-1 — the hand-typed documents

`web/src/main.ts` renders the credential shape twice: a JSON-LD block at `:1104-1111` whose
`"score": "93/100 (Honors)"` and `"proofValue": "0x4e2...71b...1b"` are literal strings with an elided
hash, and the diploma modal at `:2079-2105` whose `:2085` carries
`statusListCredential: 'https://lencana.io/credentials/status/revocation#slot14'`.

Correcting what my first draft of this row claimed: those objects **do** have a `proof` block — that is
exactly what makes them convincing. The defect is that `proofValue` is a fixed literal and **nothing in
`web/src/` signs anything**; the only signature in the page is a string (`main.ts:1067`). A real proof
exists only for what the server emits at `GET /credentials/0x…` (`signer/src/server.js:276`), whose URLs
are built from `BASE_URL` (`:238`, `:245`) and currently resolve to `127.0.0.1` — which is the honest
state of the product.

**Fix:** fetch and render the real document. `signer/scripts/check.js` proves for the served document
that a flipped byte kills the signature and that the status **entry** id is not the list URL; a
hand-typed object fails none of that because it never reaches a test.

## OI-2 — the batch console advertises a route that is not answered

`web/index.html:1347` and `:1358` present `POST /api/v1/verify/batch`. The server's only verification
route is `POST /verify` (`signer/src/server.js:289`), and batch is accepted *inside* it — up to 25 hashes
per payment (`:33`). A reader who copies the URL from our own UI gets a 404.

## OI-3 — 256 bits labelled "derived directly from on-chain smart contract storage"

`web/src/main.ts:816` builds 256 cells and `style.css:6134` lays them out 16-wide, with a
**Simulate State Flip** button (`main.ts:877`); the caption in `FRONTEND_ITERATION.md:219-232` says the
matrix is derived from chain storage. `signer/src/statusList.js:49` sets `LIST_BITS = 131_072`, so the
served list is 16.384 bytes uncompressed (gzipped, then base64url with a `u` prefix). A teaching animation is fine — say it is one,
or read the real thing with one `fetch` of `/credentials/status/revocation` and decode
`…statusList.encodedList` the way `check.js` does.

## OI-4 — revert strings: two real, two invented

Measured against the declared errors, not against memory:

| the UI prints (`web/src/main.ts`) | truth |
|---|---|
| `AttestationNotFound(0x7e3a1f8d9…)` (`:912`) | no error by that name anywhere in the tree. The dependency's is `NotFound()` — **no argument** (`lib/bas/src/Common.sol:16`). We report absence as `NOT_FOUND` in the verdict, which is a page state, not a revert |
| `ErrLocked(1)` (`:924`) | no such error. The artifact blocks with `NotTransferable()` (`contracts/SoulboundCert.sol:81`, used at `:165`, `:172`, `:189`) |
| `checkPrerequisites(…)` (`:942`) | no such function; the rule is applied inside `onAttest` (`contracts/CredentialResolver.sol:243`) |
| `NotAnIssuer(0xBadBot)` (`:934`), `PrerequisiteRevoked(…)` (`:945`) | **both real** — `error NotAnIssuer(address sender)` (`:142`), `error PrerequisiteRevoked(bytes32 prereqUid)` (`:145`); keep them, but print an address for the first and a 32-byte uid for the second |

The full honest set, all of it declared in `contracts/`: `NotAnIssuer(address)` · `UnknownSchema(bytes32)`
· `NotExpired()` · `BadAttestationData()` · `BadSchemaId(bytes32)` · `BadUID(bytes32)` ·
`BadDataLength()` · `PrerequisiteNotOurs(bytes32)` · `PrerequisiteRevoked(bytes32)` ·
`PrerequisiteIssuerDelisted(bytes32)` · `IssuerDelisted()` · `NotTransferable()` ·
`CredentialAlreadyMinted(bytes32)` · plus `NotFound()` from the dependency. No invented `0x` arguments.

## OI-5 — a learner, a grade and a rubric id that were never produced

`web/src/main.ts:745` sets the profile name to `'Rina Oktaviani'` (same string in
`i18n.ts:636/947/950/1209/1520/1523`), `:748` computes a `did:pkh:eip155:97:…` in the browser, `:971`
lists her with a truncated hash `0x0b95c8...67fa`, and `i18n.ts:955`/`:1528` print
`Rubric #0x91a7 · Score 93/100`. None of it comes from the system: the real `rubricHash` for
`web3-dasar-2026` is `0x2a45d0d00bc46f3d…` (printed by `npm run rubric`), the composite a learner
actually gets is computed by `web/src/score.ts`, and no DID is issued or resolved anywhere — the id our
system really uses is `keccak256` over `(holder, courseId)`, see
[[05-Course-Content/K1 - The content model]]. `:753` already builds its QR from
`window.location.origin`; use that pattern and label the seeded demo learner as one.

## OI-6 — the domain

`findstr /s /c:"lencana.io" web\src\main.ts web\src\render.ts web\index.html` → **20** (17 / 1 / 2), and
they are in user-facing output: the QR that 404s, the share URLs, the spec-compliance table
(`index.html:1550-1591`). This repository does not serve that domain; the page is built for Vercel
(`vercel.json`). Use `window.location.origin`, or label them illustrative.

## OI-7 — the money the product does not move

`web/src/main.ts:2170` prints "Live BNB Network Gas Price … (0.0005 tBNB)" and the batch panel quotes
per-settlement fees in BNB. What our payments move is **one demo ERC-20** (`contracts/DemoCourseToken.sol`,
open `mint`) priced in atomic units by `X402_PRICE` (`signer/src/server.js:39`); the only BNB in this
system is gas. Label the panel as network background and print the asset actually settled.

## OI-8 — claims that outrun the four scenes

`web/index.html:237` reads "AUTONOMOUS AI ACADEMY · FULLY ON-CHAIN DIPLOMAS · DAO-GOVERNED CURRICULUM",
and `i18n.ts:1018`/`:1591` say the work was "Evaluated by autonomous domain AI agent against on-chain
rubric". Three problems, all ours to lose: there is no curriculum vote (our own limits sheet forbids the
sentence — `vault/08-Results/01 - Evidence and Limits.md:170`), the credential is an off-chain signed
document *anchored* on chain (that distinction is the product's thesis, [[00-Overview/01 - Briefing]]
D15), and the judge is a model whose measured spread is 9 points on the same essay
([[09-Testing/00 - Hub Testing]]) — "autonomous" without that sentence is an overstatement.

## OI-9 — documents that describe unbuilt pages

`FRONTEND_ITERATION.md:124` promises "1EdTech conformance for credential issuance, verification, and
portfolio pages — 6 pages" while `web/src/main.ts` has no `#/developer` route, and its links are written
as `file:///C:/Project_Dave/lencana/…`, which resolves on exactly one machine. Make them repo-relative
(`vault/…`), and mark which of the six are intent rather than shipped — a judge who clicks a dead nav
item stops believing the pages that work. (The vault's own "email login" line is fixed: ~~identity here is
a wallet, `main.ts:184`.~~) *(Koreksi 3 Okt: sejak D57 (1 Okt malam) dan B123/D59 (2 Okt) identitas peserta adalah akun
login email lewat Privy, dan alamat belajarnya = dompet tertanam yang dibuatkan Privy; kunci perangkat dan dompet ekstensi
sudah keluar dari UI — lihat [[08-Results/B123 - Executive Summary]] dan [[08-Results/B82 - Executive Summary]].)*

## OI-10 — a preset pointing at addresses that are not ours

`web/src/config.ts:23-24` and `:34-35` set resolver `0xe01a16e50fd9d8c0ff4230874f8d8c086e811627` /
artifact `0x021356a0e3b9ab440a571d4af62b215841a7c891`. What is deployed and used by every harness is
`CredentialResolver 0x7CA624caFDe5cA3A27b33d26be56F73a90792065` / `SoulboundCert
0xC6FD12B06e4dB9B85C8C807826998f98DA51c4cd` (chain 97). If those two entries are meant to be *local
anvil* presets, say so in the label; if either is presented as the public testnet, a reader selecting it
sees "not found" for credentials that are live. Your call — I have not touched the file.

## OI-11 — the payment panel never talks to a server

`web/src/main.ts:1003` `function simulateX402Batch()` drives the whole x402 console from three
`setTimeout` calls (`:1028`, `:1039`, `:1054`) that set status text: `'402 CHALLENGE'` (`:1033`),
`'SIGNED (0.0005 tBNB)'` (`:1048`), `'SETTLED'` (`:1058`), `'200 OK (118ms)'` (`:1063`).
`findstr /n /c:"fetch(" web\src\main.ts` → **zero matches**: that flow makes no network call at all, and
the 118 ms is a literal.

Highest severity in this list, because the money path is the one thing this repository can actually
prove: `cd signer && npm run x402` settles a real payment on public chain 97 through the canonical proxy
and splits it in our contract ([[09-Testing/T6 - npm run x402]]). An animation that looks like a receipt,
next to a real receipt we could show instead, is the worst available trade.

**Smallest fix:** call the real endpoint and print what comes back — `POST {BASE_URL}/verify` with the
batch of hashes, then render the `402` body's `accepts[]`, the `X-PAYMENT-RESPONSE` header and the
settlement transaction hash. When the server is unreachable, print "server tidak terhubung" instead of
`SETTLED`. The asset is the demo ERC-20 priced by `X402_PRICE` (`signer/src/server.js:39`), not `tBNB`
(OI-7); the route is `/verify`, not `/api/v1/verify/batch` (OI-2).

## OI-14 — `package.json` memanggil perkakas di luar repo, jadi perintah itu mati di clone orang lain

`package.json:14` hari ini: `"probe:rpc": "python ../_research/find_bsc_testnet_rpc.py"`.
`_research/` ada di luar repo publik, jadi siapa pun yang mengclone `Lencana` dan menjalankan
`npm run probe:rpc` dapat "file not found" — dan itu bukan perkakas yang boleh dihapus begitu saja,
karena dialah yang mengukur RPC mana yang hidup sebelum fork test dijalankan (lihat
[[06-Spec-Research/R6 - Toolchain traps that cost time]]).

Sudah kupindahkan salinannya ke dalam repo, tanpa satu pun endpoint berkunci:
`scripts/find-bsc-testnet-rpc.py` (dua URL dengan token layanan pihak ketiga kutinggalkan di berkas
lama — repo ini publik dan kredensial itu bukan kita yang punya). Yang tersisa hanya mengubah
rujukannya:

```diff
-    "probe:rpc": "python ../_research/find_bsc_testnet_rpc.py"
+    "probe:rpc": "python scripts/find-bsc-testnet-rpc.py"
```

Satu baris, tanpa perubahan perilaku. Berkas ini bukan tempat kami menyunting diam-diam, jadi
patch-nya ditawarkan di sini.

## OI-13 — sebuah tombol yang mencetak "14/14 Tests Passed" tanpa menjalankan apa pun

Diketemukan 28 Sep oleh audit menyeluruh, dan kukonfirmasi sendiri ke barisnya sebelum menulis ini.
`web/src/main.ts:2144-2167`:

```ts
$('btn-run-spec-matrix')?.addEventListener('click', () => {
  ...
  rows.forEach((row, i) => setTimeout(() => row.classList.add('pulse-green'), i * 35))
  setTimeout(() => { btnText.textContent = '✓ 14/14 Tests Passed (12ms)' }, 14 * 35 + 300)
})
```

Yang terjadi: kelas hijau ditempel baris demi baris lewat `setTimeout`, lalu labelnya diganti
menjadi hasil yang tidak dihitung dari apa pun. Tidak ada assertion, tidak ada pemanggilan
`verify.ts`, tidak ada angka 14 dari tempat mana pun di repo — run offline kita hari ini **49**, dan
matriks spesifikasi di tab itu punya jumlah barisnya sendiri.

Kenapa ini bukan kosmetik: produk kita dijual dengan satu kalimat — "platform lama membuat klaim
yang tidak bisa diperiksa; kami tidak". Tombol yang menghasilkan verdct hijau dari timer adalah
klaim yang tidak bisa diperiksa, dipakai sebagai demo. Satu juri yang membuka DevTools dan melihat
network tab kosong saat tombol itu "menjalankan 14 uji" akan membaca seluruh halaman kita seperti
membaca tombol itu.

**Yang kami punya sebagai gantinya, dan ini bukan permintaan untuk membangun baru:**
1. ganti labelnya menjadi apa yang benar-benar terjadi — `Memeriksa bentuk dokumen terhadap
   aturan OB 3.0` — dan hijau hanya kalau ada hasil; atau
2. sambungkan ke data yang sudah ada: `web/src/verify.ts` diekspor dan `npm run probe` sudah
  menjalankan 59 pemeriksaan itu lewat HTTP. Menjalankan bentuk-bentuk yang sama di sisi klien
   (satu objek `credentialStatus`, `type` memuat `VerifiableCredential` + `OpenBadgeCredential`,
   `@context` dua-entry berurutan, tidak ada `lencana.io` di dokumen) adalah beberapa baris dan
   tidak butuh server; atau
3. kalau keduanya terlalu besar untuk sisa waktu: **hapus tombolnya**. Halaman ini sudah
   menyimpan bukti di tempat lain; hasil uji yang tidak dihitung bukan bukti, itu hiasan.

Butir ini juga berlaku untuk dua tetangga yang lebih dulu masuk daftar (OI-2, OI-11): panel batch
menjanjikan rute yang tidak dijawab server, dan simulasi x402 berjalan di atas `setTimeout`. Yang
baru di sini hanya bahwa **angka lulus** ikut direkayasa, bukan hanya alurnya.

*Aturan repo ini tetap: temuan front-end dilaporkan + patch ditawarkan, tidak disunting oleh kami.*

## OI-12 · Dua dokumen yang ditampilkan halaman ini berbentuk yang **ditolak** validator

**Apa yang terlihat.** Panel "dokumen kredensial" di `web/src/render.ts:273-287` dan modal ijazah di
`web/src/main.ts:2085-2099` sama-sama mencetak `credentialStatus` sebagai **array dua entri**
(revocation + suspension), dan keduanya mengarang `statusListIndex: '14'`.

**Kenapa sekarang jadi bug, bukan sekadar hiasan.** Pada 27 Sep `vc.1ed.tech` menolak dokumen kita
dengan pesan `$.credentialStatus: array found, object expected` — skema AchievementCredential OB 3.0
memberi branch array ke `proof`, `credentialSchema`, `termsOfUse` dan `evidence`, dan dengan tegas tidak
ke `credentialStatus` (`type: object`; tabel data: **[0..1]**). Signer sudah diperbaiki dan kredensial
yang terbit sesudahnya lolos dengan 0 error (`npm run validator`). Artinya: **halaman yang kita kirim ke
juri sekarang menunjukkan bentuk yang berbeda dari bentuk yang kita klaim lolos.** Yang dibaca juri dari
halaman itu tidak akan lolos validator yang sama.

**Perbaikan terkecil — salin-tempel, sudah cocok dengan bentuk yang diverifikasi:**

```diff
-    credentialStatus: [
-      {
-        id: `${baseUrl}/credentials/status/revocation#${uid.slice(2, 10)}`,
-        type: 'BitstringStatusListEntry',
-        statusPurpose: 'revocation',
-        statusListIndex: '14',
-        statusListCredential: `${baseUrl}/credentials/status/revocation`,
-      },
-      {
-        id: `${baseUrl}/credentials/status/suspension#${uid.slice(2, 10)}`,
-        type: 'BitstringStatusListEntry',
-        statusPurpose: 'suspension',
-        statusListIndex: '14',
-        statusListCredential: `${baseUrl}/credentials/status/suspension`,
-      },
-    ],
+    // SATU objek. Skema OB 3.0 menolak array; `npm run validator` adalah buktinya.
+    // Indeks dan URL daftar dibaca dari dokumen yang disajikan signer, bukan ditulis di sini:
+    // kredensial yang benar punya satu `revocation` entry, dan penangguhan penerbit dibaca
+    // dari chain (`statusOf().issuerDelisted`), bukan dari kertas.
+    credentialStatus: c.status ?? {
+      id: `${baseUrl}/credentials/status/revocation`,
+      type: 'BitstringStatusListEntry',
+      statusPurpose: 'revocation',
+      statusListIndex: String(c.statusListIndex ?? 0),
+      statusListCredential: `${baseUrl}/credentials/status/revocation`,
+    },
```

Dan untuk `main.ts` (modal ijazah, OI-1): dokumen yang diketik tangan di sana sebaiknya hilang dan
diganti satu `fetch(`${BASE_URL}/credentials/${hash}`)` — bentuknya otomatis benar karena itu berkas
yang sama yang diunggah ke validator. Kalau modalnya tetap ingin ada, tempelkan respons `/credentials/0x…`
apa adanya; jangan meniru bentuknya.

**Batas yang harus ikut ditulis.** Menyatukan status jadi satu entri tidak menghapus daftar suspension —
daftar itu tetap disajikan (`/credentials/status/suspension`) dan tetap di-anchor; yang berubah adalah
kertasnya tidak lagi menunjuk dua tempat. Jangan tulis "dua status list di dalam kredensial"; tulis
"dua status list, dan kredensial menunjuk pencabutan".

**Cara membuktikannya sendiri (2 menit):** `cd app/signer && npm run validator` — 10 pemeriksaan,
lalu `outcome: VALID`. Kalau seseorang mengembalikan array di `credential.js`, pemeriksaan
`credentialStatus satu objek` di `check.js` dan `serve-probe.js` langsung merah.

## Re-run before you push

> *(Koreksi 3 Okt: angka di komentar blok di bawah adalah cetakan 28 Sep dan sudah basi — korpus dan jumlah pemeriksaan
> tumbuh sesudahnya. Jangan kutip dari blok ini; angka terkini ada di [[Quick-Reference]] dan `vault/09-Testing/numbers.json`
> (ditulis `npm run sync:numbers`). Perintahnya sendiri tetap berlaku.)*

```powershell
cd app/web && npx tsc --noEmit && npm run build && npm run probe   # clean, clean, 59 checks / 0 failed (28 Sep)
cd app/signer && node scripts/check.js                              # 76 checks / 0 failed (28 Sep)
cd app/signer && node scripts/serve-probe.js                        # 48 checks / 0 failed (28 Sep, server harus jalan)
cd app/signer && npm run validator                                  # 10 checks + verdict `vc.1ed.tech`: outcome VALID
cd app/signer && npm run verify:edge                                 # 5 checks + angka "berapa kertas yang bisa diperiksa orang"
cd app/signer && npm run anchor -- --dry-run                          # watched set + kedua hash daftar
cd app && forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com   # 104 passed / 0 failed
```

Numbers and what each one does *not* prove: [[09-Testing/00 - Hub Testing]]. Sentences we have banned
for ourselves, including "1EdTech compatible" — yang boleh ditulis sejak 28 Sep: *"a credential from
this backend passes the 1EdTech OB 3.0 validator — 0 errors, 0 warnings"*, dan tetap bukan
"certified"/"conformant" (validator member, bukan sertifikasi konformansi; responsnya melaporkan jumlah
tanpa merinci pemeriksaan mana yang lulus). Yang TIDAK boleh lagi ditulis tanpa menyebut angkanya:
"semua artefak dapat diverifikasi publik" — ~~`verify:edge` mengukur **2 dari 8** kertas kita hari ini~~
(B54). *(Koreksi 3 Okt: "2 dari 8" adalah pengukuran lama; baris bertanggal 1 Okt malam di
[[10-Contributors/Claims-Cheat-Sheet]] mencatat **26 dari 26** kertas yang kita pegang dapat diperiksa orang sampai
tuntas — jalannya di baris itu. Kalimatnya tetap wajib membawa angka dan tanggal run.)* [[08-Results/01 - Evidence and Limits]]. Depth on the page itself:
[[03-Frontend/FE6 - Quirks and open defects]].

## OI-15 — halaman yang bisa dibuka pengunjung masih berkata "lapis on-chain kami belum disiarkan"

Sisa dari kalimat yang sama: `web/src/i18n.ts:1266-1269` (`bannerNotDeployed`) dan
`web/src/verify.ts` dulu ikut memakainya. `verify.ts` sudah kuperbaiki hari ini (ia berkas core
system, dan `npm run probe` tetap 59/0 setelahnya) — tapi **banner yang benar-benar dirender ke
layar** ada di sebelah sini: `web/src/main.ts:1567-1570` menampilkan `bannerNotDeployed` saat
halaman diarahkan ke preset yang alamatnya kosong, dan isinya berbunyi

> `title: 'Lapis on-chain kami belum disiarkan ke chain.'` / `body: '47 test lulus di fork chain 97
> dan 56 … tapi address CredentialResolver / SoulboundCert masih kosong di preset ini.'`

Dua hal salah di situ: kontrak kami disiarkan di chain 97 sejak 21 Sep, dan 47 bukan jumlah test
hari ini (offline **49**, fork **104** per chain — `npm test`, `npm run test:chains`). Untuk juri,
baris ini mengalahkan seluruh tabel bukti di halaman lain: mereka tidak perlu memeriksa apakah kita
berbohong ke atas, mereka cukup membaca apa yang kita katakan sendiri.

Patch yang bisa langsung ditempel (bahasa tetap dua, ID/EN, mengikuti kamus yang sudah ada):

```diff
-      title: 'Lapis on-chain kami belum disiarkan ke chain.',
-      body: '47 test lulus di fork chain 97 dan 56 … tapi address CredentialResolver / SoulboundCert masih kosong di preset ini.',
+      title: 'Preset ini belum menunjuk deployment kami.',
+      body: 'Kontrak kami sudah disiarkan di BSC testnet (chain 97) dan 104 Foundry test lulus di fork 97 dan 56. Yang kosong di preset ini hanya address-nya — pilih preset chain 97 atau isi address di panel konfigurasi.',
```

dan padanannya di cabang `en`. Kalau kamu lebih suka membiarkan teksnya tapi tidak menampilkannya
kecuali alamatnya benar-benar kosong, itu juga cukup: pemicunya satu `if` di `main.ts:1567`.

**Related:** [[03-Frontend/01 - Frontend]] · [[10-Contributors/00 - Hub Contributors]] · [[Index]]

---

## OI-16 — halaman belajar sekarang menulis ke penerbit: berkas yang kusentuh, mount point yang kutahan, dan satu keputusan yang tetap milikmu

Aturan 10 `AGENTS.md` bilang berkas `web/` milikmu. Aku menyuntingnya atas izin builder (28 Sep) untuk
menutup **B72**, jadi ini bukan kejutan — tapi ini juga bukan sesuatu yang bisa kauanggap selesai
dengan sendirinya, karena satu keputusannya memang belum kuambil.

**Yang berubah.** Berkas baru `web/src/learning.ts` (klien HTTP + identitas penandatangan), lalu
`web/src/lms.ts`: kotak "Rekaman di penerbit" di silabus dan tiap lesson (`serverLine()`),
`mark-done` yang juga mengirim `unlocked → started → completed` ke `POST /progress`, dan aksi `grade`
yang **tidak menghitung angkanya sendiri lagi** — ia mengirim `picks` ke `POST /grade` dan mencetak
angka yang kembali dari server. `web/src/progress.ts` tidak kuhapus: ia tinggal cache, dan tiap angka
dari sana tetap berlabel "di perangkat ini". Headernya yang lama masih berargumen "kenapa tidak
server"; argumen itu sudah digantikan keputusan builder 28 Sep (D48/bar 3-4) — kalau kamu mau kutulis
ulangi kepala berkas itu supaya tidak menyesatkan pembaca berikutnya, tinggal bilang.

**Yang kutahan:** `#lms-mount`, nama rute (`#/learn`, `#/course/<id>`, `#/me`), seluruh `data-action`
yang lama, dan draf esai yang tetap hanya di perangkat (teks karangan tidak dikirim ke mana-mana —
`results.js` menulis `essayTextIncluded: false` dan itu janji yang mau kupegang).

**Verifikasi setelah menyunting:** `npm run typecheck` bersih · `npm run build` 461 modul 2.39s ·
`npm run probe` **73/0** (14 pemeriksaan baru menguji kontrak klien ini dengan `fetch` dipalsukan:
tidak ada identitas → tidak ada permintaan; `/grade` tidak pernah membawa kata `score`; mesin state
dilalui berurutan; penolakan `422` ditampilkan apa adanya).

**Keputusan yang tetap milikmu (B80).** Kunci jawaban kuis ada di `publicManifest`
(`web/src/manifest.ts:67`, `answer: q.answer`) jadi peserta yang membuka bundel bisa menjawab benar
semua. memindahkan *perhitungan* ke server sudah menghapus "peserta melaporkan angkanya" — bukan
"kuis bisa dicurangi". Pilihan yang ada di tangan pemilik front-end: (a) buang `answer` dari payload
browser dan tampilkan alasan per soal hanya **setelah** penyerahan (server sudah mengembalikan
`correct/total`, jadi tinggal menambah flag reveal), atau (b) terima dan tulis di UI bahwa kuis
berbentuk latihan terbuka. Aku memilih tidak memutuskan ini diam-diam; angka submission tetap menyebut
yang (b) sampai kamu pilih. *(1 Okt: builder memilih (a) — "Okedeh opsi 1" — dan sudah dikerjakan; apa yang
berubah di berkas FE dan apa yang tidak disentuh ada di **OI-21** di bawah.)*



## OI-17 — tombol "Penerbit Didelisting" dan contoh "kadaluarsa" boleh kembali (B102, 30 Sep)

Tombol delisted dicabut 29 Sep karena tidak ada satu pun kertas yang cocok dengan labelnya. Sejak 30 Sep
malam spesimennya **ada dan diukur** (`npm run check:samples` → 9/0; asal-usul tiap alamat di
[[09-Testing/T26 - signer sample-check.js]]):

| label | hash | di tepi | di chain |
|---|---|---|---|
| `expired` | `0x202f8edf1a46ee6ed2fb9e99026a2bdcf957e654b786c46213112e5caf0afdcc` | 200 | expired (penerbit masih sah) |
| `delisted` | `0xaa379627438fb47b6a6c2a5fefc421d26f3168ce941e82c19a591c773d849c0f` | 200 | delisted, **tidak** revoked |

~~Yang **tidak** kulakukan: memasang tombolnya.~~ *(Koreksi 3 Okt: tombol delisting sudah dipasang lewat B123 (D59,
2 Okt) — `SAMPLE_HASHES.delisted` di `web/src/main.ts:73` menunjuk spesimen `0xaa379627…`, tombol Trust Center memeriksanya
di verifier, dan `check:samples` mengadilinya (AC-B123#6, [[08-Results/B123 - Executive Summary]]). Contoh `expired` belum
dipasang: `SAMPLE_HASHES` hari ini tidak punya kunci `expired`.)* `web/index.html` dan `SAMPLE_HASHES` di `web/src/main.ts`
milikmu, dan builder menunda FE. Di `main.ts` yang kusentuh hanya baris komentar (marker B102 dan catatan
di atas `SAMPLE_HASHES`). Kalau dipasang: tambahkan kunci `expired` / `delisted` ke `SAMPLE_HASHES` dengan
dua hash di atas — nama kuncinya harus sama dengan label chain, karena `check:samples` membandingkan
keduanya — lalu jalankan `npm run check:samples` di `signer/`. Jangan isi dengan hash lain supaya tombol
hidup: alatnya akan merah, dan itu memang tugasnya.

## OI-18 — identitas ERC-8004 agen penerbit sudah ada di laporan verifikasi; panelnya belum (B118, 1 Okt)

> **Koreksi 1 Okt sore — keputusan D54 (opsi B), dibaca sebelum isi di bawah.** Agen **tidak** lagi
> penanda tangan kertas. Penerbit tetap attester (dan satu-satunya yang bisa mencabut kertasnya); agen
> #2534 hanya menilai dan dibayar per aktivitas. Akibatnya untuk panel: `walletIsAttester` sekarang
> **diharapkan `false`** — kalimat alasannya berbunyi "dompet agen BUKAN penanda tangan kertas ini", dan
> kalau suatu hari `true`, halaman mencetak **AWAS** (agen ikut menandatangani, berlawanan dengan D54).
> Baris tabel `wallet, walletIsAttester` di bawah tetap benar sebagai nama field; artinya yang berubah.
> Sejak B119/B120 ada juga **permukaan sewa agen** yang belum punya UI — lihat OI-19.

Sejak 1 Okt agen penerbit kita adalah agen ERC-8004 **#2534** di IdentityRegistry yang disediakan BNB
(chain 97), dan `web/src/verify.ts` membacanya per kertas. Yang sampai ke halaman hari ini hanya **satu
kalimat alasan** baru ("Agen penerbitnya punya identitas ERC-8004 #2534 … bukan reputasi"). Datanya
lengkap di `report.issuerAgent`:

| field | isi |
|---|---|
| `agentId`, `registry` | identitas yang diklaim manifest penerbit (`web/src/manifest.ts` → `issuer.agent`) |
| `owner` | pemilik NFT identitas — peran *Agent Owner* (D53) |
| `wallet`, `walletIsAttester` | dompet agen di registry, dan apakah sama dengan attester kertas ini |
| `registrationPointsBack` | berkas registrasi agen menunjuk balik ke `agentId` itu |

Yang **tidak** kulakukan: menampilkan panelnya — `render.ts` milikmu. Dua hal untuk panel itu, dari
pengukuran, bukan selera: (1) **ini informasi, bukan putusan** — verdict tidak berubah karenanya, jadi
jangan dijadikan lencana hijau/merah kedua; (2) **jangan tulis "reputasi"** — yang dibaca hanya identitas,
dan klaim reputasi dilarang di [[10-Contributors/Claims-Cheat-Sheet]].

Satu hal lain yang ketemu sambil mencari ERC-8004, untuk fase FE: kartu agen di `web/index.html` mencetak
"99.8% Consensus" dan "1,420 Essays Evaluated" — tidak ada perintah yang menghasilkan angka itu.
Kalau kartunya dipertahankan, `agentId` 2534 dan dompetnya bisa jadi isi yang terukur.

## OI-19 — sewa agen per aktivitas sudah hidup di penerbit; belum ada satu layar pun (B119, B120, 1 Okt)

> *(Koreksi 3 Okt: "belum ada satu layar pun" basi sejak 2 Okt — dibangun core, bukan di berkasmu. Sejak B129 anggota
> penerbit menyewa agen penilai (`hire=1`) dan menunjuk agen pengesah (`appoint=1`) dari dasbor `#/app/pub` dengan tanda
> tangannya sendiri sesuai hibah, jadi tombol "sewa" tidak lagi hanya pesan bertanda tangan penerbit. Sejak B130 pemilik
> agen melihat tangga tarif tujuh tingkat dan mengubah tarif dasar (`setMetadata`) dari dasbor `#/app/owner`. Yang tetap
> tanpa layar: **membayar tagihan agen** (`POST /agent-charges/<id>/pay`) — masih kunci penerbit lewat CLI/rute. Lihat
> [[08-Results/B129 - Executive Summary]] dan [[08-Results/B130 - Executive Summary]].)*

Penerbit sekarang bisa menyewa agen penilai ERC-8004 per mata kuliah, agen menandatangani nilainya sendiri
lengkap dengan **label tingkat berat yang ia pilih**, dan tiap aktivitas jadi tagihan yang dibayar lewat
x402 ke dompet agen. Reviewer juga boleh agen (agen lain, pemilik lain). Semua itu ~~baru bisa disentuh lewat
HTTP dan~~ *(per 1 Okt; sewa/tunjuk dan tarif kini juga dari dasbor — koreksi di atas)* bisa disentuh lewat HTTP dan harness `npm run verify:agents` (34/0 tanpa gas, 40/0 dengan dua pembayaran nyata —
[[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]], [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]]).

| rute | untuk layar apa |
|---|---|
| `GET /agents/<id>/rates` | **kartu tarif**: tarif dasar dari Agent Owner + tujuh harga (×1.00 … ×1.30), token, `ladderHash` |
| `POST /agents/hire` | tombol "sewa agen ini untuk mata kuliah X" — pesan yang ditandatangani **penerbit** |
| `GET /agent-charges/<id>` | baris tagihan: aktivitas (nilai/review), label, jumlah, status `due`/`paid`, tx |
| `POST /agent-charges/<id>/pay` | bayar: tanpa `X-PAYMENT` → 402 + `accepts`; dengan `X-PAYMENT` → lunas, header `x-payment-response` |

Tiga hal yang harus terbaca di layar, dari keputusan, bukan selera: (1) **label dipilih agen**, bukan
penerbit — jangan beri penerbit kontrol mengubahnya; (2) **tarif dasar milik Agent Owner** dan dibaca dari
registry, kenaikan 5%/tingkat milik Lencana — dua sumber itu sebaiknya terlihat terpisah; (3) agen **bukan
penanda tangan kertas** — jangan tulis "kredensial ditandatangani agen". Yang tidak kusentuh: berkas FE
milikmu (`main.ts`, `render.ts`, `index.html`, `style.css`, `i18n.ts`).

## OI-20 — lesson praktik harus memanggil `POST /praktik`; tanpa itu peserta halaman tidak bisa lulus (B121, 1 Okt)

Sejak 1 Okt slot praktik hanya terisi dari **bacaan chain** yang dilakukan server
([[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]]), dan `POST /attempts` menolak skor praktik.
Halaman belajar belum punya tombol penyerahan praktik sama sekali (pemanggil `/attempts` di `web/src` = 0,
diukur 1 Okt), jadi peserta yang hanya memakai halaman tetap berhenti di "praktik: belum dikerjakan".
Yang dibutuhkan layar lesson praktik: satu formulir sesuai `lesson.proof.type` dari manifest, lalu
`POST /praktik` dengan `{ learner, course, lesson, answers, walletSignature?, message, signature }` —
`message` ditandatangani kunci peserta dan wajib memuat `lesson=<slug>` + `nonce=<hex>`.

| `proof.type` | lesson | isi `answers` | dompet menandatangani? |
|---|---|---|---|
| `balance` | web3-dasar Praktik 1 | `{ wallet, balanceWei, balanceBnb }` (koma atau titik) | ya |
| `tx-receipt` | web3-dasar Praktik 2 | `{ wallet, txHash, blockNumber, blockTimestamp, gasUsed, balanceDeltaWei }` | ya, dengan `tx=<hash>` |
| `eth-call` | web3-dasar Praktik 3 | `{ results: { schemaUID, isIssuer, statusOf } }` — keluaran mentah `cast call` | tidak |
| `allowance` | web3-lanjut Praktik 1 | `{ wallet, token, balance, allowances: [{ spender, allowance }, …≥2] }` | ya |

Pesan yang ditandatangani **dompet latihan** (bukan kunci peserta): `lencana-praktik course=<id>
lesson=<slug> learner=<alamat peserta, huruf kecil> wallet=<dompet, huruf kecil>` (+ ` tx=<hash>` untuk
transfer) — fungsi `walletBindingMessage` di `signer/src/praktik.js`, sebaiknya disalin bentuknya, bukan
ditebak. Balasan: 201 `{ attemptHash, gradedBy: 'chain', checks }`; 422 `{ failed: ['gas-used', …] }` —
**hanya nama pemeriksaan**, tanpa nilai yang benar, jadi layar sebaiknya menerjemahkan nama itu ke
petunjuk ("selisih saldo belum menghitung biaya gas"), bukan menampilkan angka; 409 = transaksi/dompet itu
sudah dipakai peserta lain. Dua hal dari keputusan, bukan selera: jangan tulis "praktik terverifikasi"
untuk `eth-call` (jawabannya sama untuk semua orang, bisa disalin), dan jangan minta peserta menempel
kunci privat dompet — tanda tangan pesan dari dompet (mis. lewat ekstensi) sudah cukup.

## OI-21 — kunci kuis keluar dari bundel: yang berubah di berkas `web/` dan yang tidak (B80, 1 Okt)

Builder memilih opsi (a) dari OI-16. Berkas FE yang **kusentuh** (bukan daftar milikmu, tapi tetap FE):

| berkas | perubahan |
|---|---|
| `web/src/courses/web3-dasar.ts`, `web3-lanjut.ts` | `answer` dan `why` keluar (56 baris), pindah ke `courses/*.keys.ts` — **jangan impor berkas `.keys.ts` dari kode halaman** |
| `web/src/content.ts` | `QuizQuestion.answer`/`why` jadi opsional (hanya ada di manifest berkunci sisi server); tipe `QuizKeys` |
| `web/src/manifest.ts` | manifest publik membawa `rubricHash` terbit; `rubricHashOf` membaca nilai itu kalau kuncinya tidak ada |
| `web/src/manifest-keys.ts` (baru) | manifest berkunci untuk server — **jangan impor dari halaman** |
| `web/src/learning.ts` | `GradeResult.review: { itemId, correct, why }[]` dari balasan `/grade` |
| `web/src/lms.ts` | `quizHtml`/`pageLesson` menerima `review`: pilihan peserta tetap terpilih (disabled), ✓/✗ + "Kenapa." per soal; atribut `data-answer` dibuang; pesan status dipasang ulang sesudah render |
| `web/scripts/probe.ts` | +2 asersi B80 (88/0) |

Yang **tidak** kusentuh: `main.ts`, `render.ts`, `index.html`, `style.css`, `i18n.ts`. `main.ts:1336` tetap
memanggil `rubricHashOf(mf)` dan tetap mencetak hash yang sama — sekarang dibaca dari nilai terbit. Kelas
`ok`/`bad` yang dipakai tanda ✓/✗ adalah kelas yang sudah dipakai `lms.ts` untuk status; kalau tampilannya
perlu gaya sendiri, itu keputusanmu di `style.css`.

Dua hal untuk layar, dari keputusan D56, bukan selera: (1) **jangan tandai opsi yang benar** — server sengaja
tidak mengirim indeks jawaban, hanya benar/salah + alasan; (2) jangan tulis "kuis anti-curang": penyerahan boleh
diulang, jadi kunci bisa ditebak lewat beberapa usaha. Kalau kelak ada batas usaha atau pembahasan ditunda, itu
keputusan produk baru, bukan sisa B80. Satu catatan deploy: bundel yang tayang di Vercel baru bersih **sesudah**
dideploy ulang dari commit B80 — `npm run verify:quizkeys -- --deployed=https://lencana-psi.vercel.app/` mengukurnya.

## OI-22 — kotak identitas belajar kini punya login email (Privy) — B82, 1 Okt malam

Builder meminta login Privy dipasang sebelum fase FE (D57). Supaya bisa dipakai, kotak "Rekaman belajar"
di `#/learn`/`#/course/…` **kusentuh secukupnya** — tata letak dan gayanya tetap milikmu, dan builder
menahan pekerjaan FE lain sampai ia meng-acc:

| berkas | perubahan |
|---|---|
| `web/src/privy.ts` (baru) | pembungkus SDK vanilla Privy — dimuat lambat lewat `import()`, membuat iframe tersembunyi dompet tertanam, OTP email, `personal_sign` |
| `web/src/learning.ts` | jenis identitas ketiga `'privy'` (`sendPrivyCode`, `connectPrivyLearner`, `resumePrivyLearner`, `hasPrivyMark`), `snapshot().account` = jawaban `POST /auth/privy`, `snapshot().restoring` |
| `web/src/lms.ts` | `serverLine()`: kolom email + "Kirim kode" (primary), baris kode 6 digit + "Masuk" (tersembunyi sampai kode terkirim), tombol kunci perangkat **tidak lagi primary**; label identitas `login email … · dompet tertanam`; Enter di kolom = klik tombolnya; sesi dipulihkan sekali per muat halaman |
| `web/src/lms.css` | dua aturan di bawah `#lms-mount`: `.privy-login input` dan `button[disabled]` |
| `web/package.json` + `web/.npmrc` (baru) | `@privy-io/js-sdk-core` 0.77.0; `legacy-peer-deps=true` karena SDK mematok peer opsional `viem` 2.56.0 persis (kita 2.56.5) — alasannya ditulis di berkasnya |

**Tidak disentuh:** `index.html`, `main.ts`, `render.ts`, `style.css`, `i18n.ts`. Teks kotak masih bahasa
Indonesia saja (belum lewat `i18n.ts` — itu berkasmu). Hook yang bisa kamu pakai untuk menata ulang:
`data-action="privy-send"`, `"privy-login"`, `data-role="privy-email"`, `"privy-code"`, `"privy-code-row"`.
Yang belum terbukti dan bukan urusan tata letak: login positif belum diuji dua peramban oleh builder
([[09-Testing/T41 - signer privy-check.js (B82 login Privy)]]).

*(Koreksi 1 Okt malam, sesudah merge `dex/lencana-fe-integration` — [[03-Frontend/FE7 - Merge cabang FE 1 Okt]]: formulir email inline di atas **sudah
tidak ada**. Satu permukaan login sekarang modal masukmu (`privy-onboarding-panel`), dan handler-nya memanggil alur
sungguhan `sendPrivyCode` / `connectPrivyLearner` dari `learning.ts`. Kotak identitas hanya punya tombol
`data-action="learner-privy"` yang mengirim event `lencana:open-privy`; hook `privy-send`, `privy-login`,
`privy-email`, `privy-code` di tabel atas tidak berlaku lagi. Simulasi kode 123456, Google tiruan, dan
`createPrivyLearner` dibuang; tombol Google disembunyikan karena Google mati di app Privy; teks "dapat diekspor kapan
saja" dikoreksi karena belum ada fitur ekspor.)*

*(Koreksi kedua, 1 Okt malam — port `dex/lencana-ui` ke core, [[03-Frontend/FE7 - Merge cabang FE 1 Okt]]: kotak identitas sekarang dirender di ruang kelas
barumu (`pages/class.ts`) lewat `lesson-views.ts:serverLine`; tombolnya tetap `data-action="learner-privy"` → event
`lencana:open-privy` → modal masukmu. `lms.ts` tidak ada lagi. Dua hal yang kuubah di halamanmu dan kenapa: kuis tidak
lagi dinilai di browser (kunci tetap di server, pembahasan dari `/grade`), dan isi lesson dirender dari blok core — bukan
markdown `ClassData` — karena server membaca model yang sama.)*


## OI-23 — bagian "Certification Flow" di landing diganti alur bisnis 3D; tiga berkasmu ikut disentuh (FE8, 2 Okt)

Builder meminta UI 3D alur bisnis Lencana per peran di landing dan meng-acc brief-nya
([[03-Frontend/FE8 - Business flow 3D (brief)]]). Bagiannya hidup di berkas baru (`web/src/pages/flow3d*.ts`,
`flow3d.css`) dan menggantikan bagian tiga langkah di `pages/landing.ts`. Berkasmu yang ikut disentuh, dan kenapa:

| berkas | perubahan |
|---|---|
| `web/src/main.ts` | `setLanguage` kini menggambar ulang landing (`mountNewApp('#/')`) kalau landing sedang tampil. Sebelumnya hero, katalog, dan bagian ini tetap di bahasa lama sampai rute berganti. Daftar rute yang memicunya: `#/`, `#`, kosong, `#/courses`, `#courses`, `#catalog`, `#how-it-works` |
| `web/src/new-app.ts` | `#how-it-works` menggambar landing (sebelumnya halaman kosong); `handleRoute` sudah menggulir ke `#how-it-works`, dan bagian 3D memakai id itu |
| `web/src/i18n.ts` | `lmsV2.stepsTitle`, `stepsDesc`, `step1Title` … `step3Desc` dibuang (tipe + EN + ID) — satu-satunya pemakainya bagian yang diganti |
| `web/src/style.css` | blok `/* 3. How It Works */` (`.how-it-works-*`, `.step-number`, `.step-content`) dibuang, diganti satu baris penunjuk ke `pages/flow3d.css`; `.flow-step-content` di `#page-verify` tidak tersentuh |

**Tidak disentuh:** `index.html`, `render.ts`, titik mount (`#page-new-app`, `mountNewApp`, `renderLanding`).

**Masih terbuka — keputusanmu:**

- Ruang kelas (`#/class/…`, `#/me`) **tidak** digambar ulang saat bahasa diganti, jadi teks `lmsV2`-nya tetap di bahasa lama
  sampai rute berganti. Sengaja tidak kusambungkan: menggambar ulang di sana menghapus draf esai yang sedang diketik. Butuh
  penyimpanan draf dulu, atau penggantian teks tanpa menggambar ulang.
- `#pipeline` dan `#architecture` masih lolos penjaga rute sebagai anchor beranda tetapi menggambar halaman kosong
  (`mountNewApp` tidak punya cabang untuknya, dan `id="architecture"` ada di halaman lama yang disembunyikan).

Cara menilai ulang: `cd web && npx tsc --noEmit && npm run build && npm run probe`, lalu buka `#/` → gulir ke "Satu alur,
tiga kursi" → ganti EN/ID di navbar (teks bagian dan hero harus ikut berganti).

## OI-24 — pintu masuk berakun dan permukaan publik tanpa simulasi: berkasmu yang tersentuh (B123, D59, 2 Okt)

Builder: "ini bukan simulasi FE lagi jd ga boleh ditampilin asal begitu". Rencananya di
[[11-Refactoring/RF7 - Halaman publik vs internal, dashboard per peran, onboarding]] (langkah A); keputusan D59.

| berkas | perubahan |
|---|---|
| `web/index.html` | modal `#wallet-modal` (Privy/ekstensi/kunci perangkat/Demo Learner) dibuang — dialog masuk sekarang dibangun `pages/login.ts`; nav: Study Room/AI Studio/My Credentials → satu `#nav-dashboard` (`#/me`, `student-only`); tombol navbar "Sign in"; Verifier: `#tamper-playground` + `#x402-console` dibuang; Trust Center: blok bitstring dibuang, kartu delisting menunjuk spesimen sungguhan `0xaa379627…` |
| `web/src/main.ts` | handler modal lama, `connectDemoWallet`/`connectDeviceWallet`/`connectBrowserWallet`, `applyPrivyModeLabels`, simulasi bitstring/tamper/x402 dibuang; `onSignedIn` + `initLogin`/`completeGoogleReturn`; `#/submit`, `#ai-evaluator`, `#/portfolio` → `#/me`; `SAMPLE_HASHES.delisted` + handler tombol delisting |
| `web/src/i18n.ts` | `wallet` diciutkan ke `connectBtn`; `tamperPlayground` dan `x402Console` dibuang; kunci bitstring dibuang; `nav.dashboard`; label revoke/delisting dan `inspectSub` dibetulkan (tidak lagi "Simulate") |
| `web/src/pages/class.ts`, `web/src/lesson-views.ts` | kotak identitas kelas: satu tombol "Masuk"; aksi kunci perangkat/dompet dibuang |

**Tidak disentuh, tapi mati:** `#page-home` (landing lama + navbarnya sendiri), `#page-submit` (AI Studio, `simulateAiEvaluation`),
`#page-portfolio` (kartu "Rina Oktaviani"), dock demo (`force-hidden`) — tidak ada rute yang membukanya lagi, tapi markup dan
kodenya masih di berkas. Juga CSS untuk bagian yang dibuang (`.wallet-modal*`, `.tamper-*`, `.x402-*`, `.bitstring-*`).
Membuangnya keputusanmu; kalau dibiarkan, ia tetap terbaca di sumber halaman.
*(Koreksi 3 Okt: bagian-bagian mati ini — beserta CSS-nya — dibuang atas permintaan builder di B139 setelah daftarnya
disetujui; lihat OI-29 di bawah.)*

Hook baru: `window.dispatchEvent(new CustomEvent('lencana:open-privy', { detail: { courseId } }))` tetap membuka dialog masuk
(nama event dipertahankan supaya pemanggil lama tidak putus).

## OI-25 — area internal peserta `#/app`, onboarding, dan detail kursus publik: berkasmu yang tersentuh (B124, 2 Okt)

Rencana: RF7 langkah A2 ([[11-Refactoring/RF7 - Halaman publik vs internal, dashboard per peran, onboarding]]). Halaman barunya
hidup di berkas baru (`web/src/pages/dashboard.ts`, `course-detail.ts`, `dashboard.css`); yang ikut tersentuh:

| berkas | perubahan |
|---|---|
| `web/index.html` | `#nav-dashboard` menunjuk `#/app` (sebelumnya `#/me`) |
| `web/src/main.ts` | `#/me` ikut dialihkan ke `#/app`; penjaga rute: `#/course/<id>` publik (`isPublicCourse`, juga di `isProtectedRouteHref`), `#/app…` minta login; `isLms` mencakup `#/app`, nav aktif = `#nav-dashboard`; `onSignedIn` → onboarding pada login pertama, lalu kursus yang dituju atau `#/app` |
| `web/src/new-app.ts` | rute `#/app…` → `renderApp`, `#/course/<id>` → `renderCourseDetail` |
| `web/src/pages/landing.ts` | kartu katalog menunjuk detail kursus `#/course/<id>`, bukan ruang kelas |
| `web/src/lesson-views.ts` | `legacyLearnRoute`: `#/course/<id>` sendiri tidak lagi dialihkan ke kelas (`#/course/<id>/l/<slug>` tetap) |
| `web/src/style.css` | (2 Okt, permintaan builder) `.page-view:not(.hidden) { min-height: 100vh }` — footer baru terlihat sesudah menggulir di semua halaman; dashboard memakai `.dash-main` karena `.app-main` milik wadah global (`body.is-home-page .app-main { padding: 0 !important }`) |

**Untukmu:** tampilan dashboard dan detail kursus memakai palet landing tapi kelasnya sendiri (`.app-*`, `.cd-*`, `.app-welcome`);
silakan ditata ulang — yang harus tetap: rute `#/app…` di balik akun, dan angka nilai hanya dari `POST /me/records`.

## OI-26 — kursus berbayar: harga di katalog, panel bayar, kelas berbayar menunjuk halaman bayar (B125, D60, 2 Okt)

Rencana: RF7 langkah B. Logika bayar ada di `web/src/learning.ts` (`payAndEnroll`, `claimTestCoins`, `tokenBalance`) dan harga di
`web/src/pricing.ts`; tampilan baru di `pages/course-detail.ts` + `pages/dashboard.ts`. Berkasmu yang ikut tersentuh:

| berkas | perubahan |
|---|---|
| `web/src/main.ts` | `onSignedIn`: kursus yang dituju dibuka di halaman kursus (`#/course/<id>`, tempat membayar), bukan langsung ke kelas |
| `web/src/pages/landing.ts` | kartu katalog menampilkan harga (`.course-card-price`, dari `pricing.ts`) |
| `web/src/style.css` | `.course-card-price` (emas, tebal) di bawah `.course-card-footer` |
| `web/src/lesson-views.ts` | `serverLine`: kalau penerbit menjawab 402 untuk kursus itu, kotak identitas menjadi "Kursus ini berbayar" + tautan ke halaman bayar |

**Yang harus tetap:** harga hanya dari `web/src/pricing.ts` (server membacanya juga), dan tidak ada tombol yang membuka kelas berbayar
tanpa jawaban 200 dari `POST /enroll`.

## OI-27 — kelas uji, saldo, rapor bergrafik, pita pemuatan (B126, D61, 2 Okt)

Permintaan builder 2 Okt. Tampilan baru hidup di berkas baru (`web/src/balance.ts`, `web/src/lib/loading.ts` + `loading.css`,
`lib/charts.ts`, `lib/odometer.ts`, `lib/coin.ts`, `pages/grades.ts`, `pages/wallet.ts`, `pages/dash-viz.css`). Berkasmu yang ikut
tersentuh:

| berkas | perubahan |
|---|---|
| `web/index.html` | chip saldo `#nav-balance` (`student-only`) sebelum `#wallet-nav-container` |
| `web/src/main.ts` | `installFetchTracking()` saat modul dimuat (pita pemuatan mengikuti setiap `fetch`); `renderWalletState` memanggil `syncNavBalance` |
| `web/src/pages/landing.ts` | katalog memakai `LISTED_COURSES` — kelas uji (`unlisted`) tidak tampil di beranda |
| `web/src/style.css` | `.nav-balance*`; wadah navbar 1180 → 1480 px (permintaan builder) dan navbar satu baris bertahap: ≤1320 menu rapat + chip tanpa "LDC", ≤1180 lencana jaringan memberi tempat, ≤1080 padding rapat + alamat pil dipendekkan, ≤1023 menu 12,5 px + pil hanya titik |
| `web/src/main.ts` (lagi) | pil akun diberi `title` = email/alamat — teksnya disembunyikan di layar sempit |

**Yang harus tetap:** saldo hanya dari `balanceOf` di chain (`balance.ts`), angka rapor hanya dari `POST /me/records` dan
`computeScore`, dan pita pemuatan mengikuti permintaan sungguhan — bukan timer.

## OI-28 — halaman Kursus, kelas singkat, Ringkasan berisi (B127, D62, 2 Okt)

Permintaan builder 2 Okt. Tampilan baru hidup di berkas baru (`web/src/pages/catalog.ts`, `pages/overview.ts`,
`pages/dash-catalog.css`, `lib/emblem.ts`). Berkasmu yang ikut tersentuh:

| berkas | perubahan |
|---|---|
| `web/src/lib/ui.ts` | `h()`: kunci gaya yang diawali `--` dipasang lewat `style.setProperty` — `Object.assign` mengabaikannya diam-diam, jadi `--tc`/`--i` tidak pernah terpasang sejak B126 |
| `web/src/pages/landing.ts` | `getCourseImage` mengembalikan `null` untuk kursus tanpa gambar khusus; kartunya menampilkan emblem lencana kursus itu (bukan satu `/hero.jpg` yang diulang lima kali) |
| `web/src/style.css` | `.course-card-image-wrap.is-emblem` (kisi tipis + cahaya warna topik, emblem berputar saat disorot) |

**Yang harus tetap:** harga hanya dari `web/src/pricing.ts`; status "terdaftar" hanya dari `POST /me/records`; panel pratinjau memakai
panel bayar yang sama dengan halaman kursus (`embeddedPayPanel`), tidak ada jalur bayar kedua.

## OI-29 — UI lama yang mati dibuang; video latar hero pindah ke landing baru (B139, D71, 3 Okt)

Permintaan builder 3 Okt (uji dari HP): UI lama tampil sekilas tiap refresh. Daftar hapus diserahkan dulu dan
**disetujui builder** sebelum satu baris pun dibuang. Ini menutup paragraf "Tidak disentuh, tapi mati" di OI-24 di atas.

| berkas | perubahan |
|---|---|
| `web/index.html` | dibuang: dok demo `#demo-dock`, landing lama `#page-home` (video, kanvas pohon `#hero-tree-canvas`, navbar landing sendiri), `#page-courses` + `#study-modal`, `#page-submit` + `#mint-modal`, `#page-portfolio` + `#diploma-modal`. Tetap: `app-navbar`, `#page-verify`, `#page-agent-hub`, `#page-publishers` (+ `#publishers-mount`), footer. 1.976 → 617 baris (`wc -l`, HEAD `68b873a` vs kerja, termasuk satu komentar marker B139) |
| `web/src/main.ts` | kode yang hanya melayani bagian di atas dibuang (ruang belajar, toggle privasi, tier portofolio, editor esai + `simulateAiEvaluation`, confetti/mint, QR/diploma/tombol berbagi, drawer nexum, dok demo, tilt hero lama, kanvas pohon) + 42 `setText` ke id yang sudah tidak ada sebelum B139; `handleRoute` tidak lagi menyebut `page-home`/`page-submit`/`page-portfolio`/dok demo. 2.660 → 1.057 baris (termasuk marker B139). Spec matrix, verifier, Trust Center, Publishers tidak berubah |
| `web/src/pages/landing.ts` | video latar dipindah ke `.hero-stage` di belakang `hero-editorial-section`; `muted` diisi sebagai properti; pengguna `prefers-reduced-motion` tidak mendapat videonya |
| `web/src/style.css` | aturan yang **setiap** selektornya menyebut kelas/id yang tidak ada lagi di `index.html` maupun `.ts` mana pun (kelas yang dirakit runtime `prefix-${x}` dikecualikan) dibuang: 16.199 → 9.466 baris (sudah termasuk 35 baris baru `.hero-stage`/`.hero-video`/`.hero-video-wash`) |

**Bukti tidak ada yang ikut rusak:** computed style 794 elemen di `#/verify`, `#/agent-hub`, `#/publishers`, `#/` dibandingkan
antara CSS HEAD dan CSS baru di lebar 1440 dan 500 px — beda hanya di elemen video baru dan fase animasi (`mini-bar`,
`seal-ticks`). `i18n.ts` tidak disentuh: kunci kamus untuk bagian yang dibuang masih ada, tidak dipakai lagi.

**Yang harus tetap:** markup lama jangan dikembalikan ke `index.html` — semua yang tampil sebelum JS jalan ikut berkedip di
setiap refresh. Halaman baru dibangun di `pages/*.ts` dan dipasang lewat `mountNewApp`.

## OI-30 — menu hamburger navbar di layar HP (B149, 5 Okt)

Permintaan builder 5 Okt: "Kalau mobile view mending navbarnya dikasih humburger icon aja, soalnya banyak tuh menunya".
Di ≤ 860 px `style.css` menyembunyikan `.nav-links` tanpa pengganti, dan di halaman selain beranda navbar meluap ke 386 px.
Kodenya hidup di berkas baru (`web/src/nav-mobile.ts`, `web/src/nav-mobile.css`); berkasmu yang tersentuh hanya satu:

| berkas | perubahan |
|---|---|
| `web/src/main.ts` | `import { mountMobileNav } from './nav-mobile'` (`web/src/main.ts:34`) dan satu panggilan `mountMobileNav()` sesudah tombol EN/ID dipasang (~~`web/src/main.ts:809`~~ `web/src/main.ts:814` sejak impor B150/B152 di kepala berkas) |

Tidak disunting: `index.html` (tombol dan panel dibuat dari JS), `style.css` (aturannya di `nav-mobile.css`), `i18n.ts`.
Yang ditambahkan ke DOM: `button.nav-burger` di ujung `.nav-actions`, lalu `nav#nav-drawer.nav-drawer` +
`.nav-drawer-backdrop` di akhir `body`. Di ≤ 860 px pemilih bahasa navbar (`.nav-actions .lang-switch`) disembunyikan —
pemilihnya pindah ke panel.

**Yang harus tetap:** panel tidak punya daftar menu sendiri. Ia dibangun ulang setiap dibuka dari `.nav-links a` yang hidup
(dilewati kalau `.hidden`; `.active` ikut dibaca), dan tombol EN/ID-nya meneruskan klik ke `#lang-en` / `#lang-id`. Jadi
kalau kamu menambah, mengganti nama, atau menyembunyikan menu di `index.html` / `main.ts`, panelnya ikut tanpa disentuh;
yang memutus panel hanya mengganti nama `.nav-links`, `.nav-actions`, `#lang-en`, `#lang-id`, atau `#badge-name`, atau
mengubah titik 860 px di `style.css` tanpa mengubah `MOBILE` di `nav-mobile.ts` dan media query di `nav-mobile.css`.
Bukti: [[09-Testing/T76 - Uji peramban menu hamburger navbar (B149)]].

## OI-31 — ruang kelas di layar HP: kurikulum jadi laci, satu kolom (B151, 5 Okt)

Permintaan builder 5 Okt: "di page /class/[nama course] itu pagenya ga mobile friendly banget". Cangkang kelasmu (dari
`dex/lencana-ui`, FE7) tetap tiga kolom di HP, jadi isi lesson berada di luar layar. `style.css` **tidak disunting**; semua
gaya baru ada di berkas baru `web/src/pages/class.css` (dimuat `class.ts`):

| berkas | perubahan |
|---|---|
| `web/src/pages/class.css` (baru) | ≤ 1100 px: `.class-rail` disembunyikan. ≤ 900 px: `.class-shell` tinggi otomatis + `.lms-layout-core` blok (halaman yang menggulir, bukan `.class-main`); `.class-topbar` `position: sticky` 56 px; `.class-sidebar` `position: fixed` sebagai laci (`transform` + `visibility`); pager `.lesson-footer` grid dua kolom; `.lesson-item` di HP hanya mentransisikan warna/border/bayangan (lihat di bawah). Semua lebar: `.lesson-breadcrumb a` abu, emas saat disorot |
| `web/src/pages/class.ts` | `renderTopBar` (`web/src/pages/class.ts:99`): label "← Katalog Kursus" dan "x% di penerbit" dipecah ke `span` supaya bagian katanya bisa disembunyikan di HP — teks desktop sama; tombol baru `.class-curriculum-btn` (`web/src/pages/class.ts:129`). `renderSidebar` (`web/src/pages/class.ts:140`): `id="class-curriculum"`, judul kurikulum dibungkus `div`, tombol `.class-sidebar-close`, kaki `.class-sidebar-foot` (`web/src/pages/class.ts:187`). Buka/tutup laci: `setCurriculum` + pendengar global sekali pasang (`web/src/pages/class.ts:200`, `:210`); `renderClass` memasang `.class-curriculum-backdrop` (`web/src/pages/class.ts:406`) |

**Satu hal di `style.css` yang perlu kamu tahu:** `.lesson-item { transition: all 0.2s ease }` ikut mentransisikan
`visibility`. Begitu kurikulum menjadi laci yang disembunyikan dengan `visibility`, lesson di dalamnya masih `hidden` saat
laci baru dibuka sehingga tidak bisa difokus. Di `class.css` transisinya dipersempit untuk HP saja; kalau kamu menata ulang
`.lesson-item`, sebut properti transisinya satu per satu dan tidak perlu aturan HP itu lagi.

**Yang harus tetap:** di ≤ 900 px kurikulum tidak boleh kembali berdampingan dengan isi (isi jadi tidak terlihat), dan
laci yang tertutup harus tetap `visibility: hidden` supaya tautannya tidak tercapai lewat Tab. Kalau titik 900/1100 px
diubah, ubah juga `(min-width: 901px)` di `bindCurriculumGlobals`. Bukti: [[09-Testing/T77 - Uji peramban ruang kelas di HP (B151)]].

## OI-32 — halaman publik di layar HP: kartu Pusat Kepercayaan/Penerbit dan matriks Verifier (B150, 5 Okt)

Permintaan builder 5 Okt: "beberapa ada yg keluar card". Di 375 px kolom `.agent-roster-grid` (minimal 360 px) lebih lebar
dari layar, sehingga kartu Pusat Kepercayaan dan Penerbit meluap ke 384 px; URL dokumen penerbit di kartu terpotong
`overflow: hidden`; dan matriks spesifikasi Verifier bisa digeser tanpa tanda. `style.css` **tidak disunting**:

| berkas | perubahan |
|---|---|
| `web/src/mobile.css` (baru) | `.agent-roster-grid` → `minmax(min(360px, 100%), 1fr)` (sama dengan 360 px begitu wadahnya lebih lebar — desktop tetap); `.agent-card a, .agent-card .section-sub` → `overflow-wrap: anywhere`; ≤ 560 px: `gap: 16px`, `.agent-card` padding 22 px; ≤ 760 px: bayangan tepi pada `#page-verify .spec-table-scroll` (lapis `local` sewarna `.spec-matrix-section`, `rgb(16, 19, 24)` — kalau warna panel itu kamu ubah, ubah juga `--mobile-scroll-cover`) |
| `web/src/main.ts` | satu impor `import './mobile.css'` (`web/src/main.ts:36`) |

**Yang kuserahkan kepadamu (tidak dikerjakan):** di HP baris matriks Verifier sangat tinggi — kolom terlihat hanya ±274 px,
dan deskripsi aturan membungkus panjang di kolom sempit. Tata letak bertumpuk per baris (label kolom di depan nilainya)
butuh label kolom di markup (`index.html` + perender matriks), jadi itu keputusan tampilanmu. Bukti dan angka sebelum/sesudah:
[[09-Testing/T79 - Uji peramban isi keluar kartu di HP (B150)]].

## OI-33 — situs bisa dipasang sebagai aplikasi (PWA): manifest, ikon, service worker (B152, 5 Okt)

Permintaan builder 5 Okt: "dibuat jadi pwa jg". Berkas baru: `web/public/manifest.webmanifest`, `web/public/icons/*`
(dari `lencana-logo.jpg`), `web/public/sw.js`, `web/src/pwa.ts`. Berkasmu yang tersentuh:

| berkas | perubahan |
|---|---|
| `web/index.html` | empat tag di `<head>` (`web/index.html:11-15`): `theme-color` `#090a0c`, `manifest`, `icon`, `apple-touch-icon` |
| `web/src/main.ts` | `import { registerServiceWorker } from './pwa'` (`web/src/main.ts:38`) dan satu panggilan sesudah `installFetchTracking()` (`web/src/main.ts:41`) |

**Yang harus tetap:** service worker tidak boleh menyimpan apa pun yang beda asal (signer, RPC chain, dokumen tepi dan daftar
status) — status kredensial harus selalu segar; yang disimpan hanya cangkang halaman (jaringan lebih dulu) dan berkas build
ber-hash. Kalau kamu mengganti warna latar halaman, samakan `theme_color` / `background_color` di manifest dan `theme-color`
di `index.html`. Mengubah strategi cache di `sw.js` = naikkan `VERSION` supaya cache lama dibuang. Bukti:
[[09-Testing/T81 - Uji PWA bisa dipasang dan offline (B152)]].
