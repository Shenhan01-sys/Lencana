---
tags: [contributor, open-item, hub]
status: active
updated: 2026-09-26
---

# Open Items for the Frontend

Raised against `web/` while the vault was being restructured, and re-checked line by line on 26 Sep
against the files as they are now. Every row names what the product prints, what is actually true, and
the command that shows it. Nothing here is a style opinion.

**Catatan urutan:** butir ditambahkan saat diketemukan, jadi tiga paling bawah bukan urutan nomor
(OI-11, OI-14, OI-13, OI-12). Nomor adalah anchor, bukan posisi — pakai indeks di
[[10-Contributors/Open-Items/00 - Hub Open Items]] untuk membacanya berurutan.

**Ownership:** `web/index.html`, `web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts` are yours and
your version wins on merge (`-X theirs` for those files), then the harnesses get re-run. What must not
disappear is `#lms-mount` (`web/index.html:518`) and the `renderLmsRoute()` call (`web/src/main.ts:1180`)
— without them the learning surface renders nothing. Never `--force` `main`; prove a push with
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
item stops believing the pages that work. (The vault's own "email login" line is fixed: identity here is
a wallet, `main.ts:184`.)

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
"semua artefak dapat diverifikasi publik" — `verify:edge` mengukur **2 dari 8** kertas kita hari ini
(B54). [[08-Results/01 - Evidence and Limits]]. Depth on the page itself:
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


