---
tags: [testing, "T34"]
status: active
updated: 2026-09-30
command: npm run verify:deposit
measured: 2026-09-30
result: DEPOSIT HIJAU — 27 pemeriksaan / 0 gagal (tanpa gas) · DEPOSIT LIVE HIJAU — 38 / 0 (satu setoran nyata sampai selesai di chain 97)
---

# T34 - signer deposit-check.js (setoran tenggat: ter-deploy, ada rutenya, dan yang menentukan dibaca dari chain)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B90 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Keputusan:** D52 di [[00-Overview/03 - Decisions]] · **Riset:** [[06-Spec-Research/R9 - x402 v2 and the deadline-escrow idea]] · **Rute:** [[04-Signer-Service/S7 - Server routes and lifecycle]] · **AC:** —

## Kenapa harness ini ada

`CourseDeposit.sol` sudah diuji `forge test` sejak 29 Sep (16/16: aritmetika, tanda tangan, hangus).
Baris B90 menyebut empat hal yang **belum** dan tidak boleh diklaim: belum dideploy, belum ada rute
HTTP, `policyHash` masih argumen bebas, dan `issuedAt` belum dicocokkan dengan waktu attestation BAS
yang nyata (uji kontrak pakai `vm.warp`). Harness ini mengadili keempatnya.

## Yang dibangun (30 Sep)

| bagian | berkas | isi |
|---|---|---|
| deploy | `script/DeployCourseDeposit.s.sol` | token dan penerbit dibaca dari `.env`, lalu dibaca balik dari kontrak |
| logika | `signer/src/deposit.js` | `deadlinePolicyOf` (dokumen aturan + `policyHash`), `readDeposit`, `finalizeDeposit` |
| rute | `signer/src/server.js` | `GET /deposit/policy/<course>` · `GET /deposit/<course>/<learner>` · `POST /deposit/finalize` · blok `deposit` di `/healthz` |
| harness | `signer/scripts/deposit-check.js` | `npm run verify:deposit` (tanpa gas) · `npm run verify:deposit:live` |

**Kontrak:** `CourseDeposit` di chain 97 = `0xbeB57bC1a3Ad050b66Ad6ce1E2e42a6cd040E6c3`, tx deploy
`0xc0e7186c160f560ecb9f34049f5e3606da54a220cfedc0c20dc9c5f3184b18db`, **1.101.613 gas**, blok 134063306
(dibaca dari `broadcast/DeployCourseDeposit.s.sol/97/run-latest.json`). Dibaca balik dari chain oleh
harness: `token()` = `DEMO_TOKEN_ADDRESS` `0x0B2fA5050912F4CdB5f7C47A5FAd6A8F9398CBaf`, `issuer()` =
`0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE`, `owner()` = `0xAEc63F6cEbBfacdC3516992b6ec396147c9c8361`.
Alamatnya hidup di `DEPOSIT_ADDRESS` (`app/.env`, ditambahkan 30 Sep) dan dilaporkan `/healthz`.

## Empat hal yang tadinya bebas, dan sekarang tidak

1. **`policyHash` dari manifest.** `GET /deposit/policy/<course>` menyajikan dokumen aturan
   (`lencana-deadline-policy/1`): tier D52 (5/7/9 hari, premi 2500/1200/0 bps), `manifestHash` dan
   `rubricHash` penerbit, kontrak, token, payee, dan kalimat "telat = hangus" — yang harus terbaca
   **sebelum** peserta memilih tenggat (keputusan builder #1). `policyHash = keccak256(JSON.stringify(policy))`,
   jadi orang lain bisa menghitungnya dari dokumen yang disajikan tanpa kode kami. Setoran yang
   `policyHash`-nya bukan hash itu **ditolak** saat penyelesaian.
2. **`uid` dari resolver** (`attestationOf(credentialHash)`), bukan dari badan permintaan.
3. **`issuedAt` dari BAS** (`getAttestation(uid).time`), bukan dari jam kami dan bukan dari badan
   permintaan. Tanda tangan penerbit atas `issuedAt` lain tidak pulih ke penerbit → 401.
4. **`refundBps` punya satu nilai yang benar** (tepat waktu 10000, telat 0). Tanda tangan penerbit
   yang **sah** atas angka lain tetap ditolak 422 — aturan menang atas tanda tangan.

Yang tetap milik penerbit: tanda tangannya (EIP-191 atas digest yang sama dengan `finalize()` di
kontrak). Server menyiarkan dengan kunci platform; ia tidak bisa menyelesaikan setoran sendirian.
**Siaran mati secara bawaan** — hanya jalan kalau `DEPOSIT_BROADCAST=1`; tanpa itu permintaan yang
sah dijawab `202 validated` dan tidak ada gas yang keluar.

## Terukur 30 Sep

### Tanpa gas — `npm run verify:deposit` → **DEPOSIT HIJAU — 27 pemeriksaan, 0 gagal**

Server sendiri, store dingin di `os.tmpdir()`, siaran mati. 6 pemeriksaan deploy (bytecode ada,
`token`/`issuer`/`owner` dari chain, `/healthz`), 8 tentang dokumen aturan (hash dihitung ulang dua
cara, terikat manifest, tier, kalimat hangus, kursus lain → hash lain, kursus tanpa manifest → 404),
7 penolakan tanpa setoran (404/422/405, tiap penolakan diperiksa kode **dan** sebabnya), 5 atas
spesimen setoran yang sudah selesai (dibaca dari chain), dan penutup: nonce kunci platform tidak
bergerak selama run. Sebelum run `--live` kelompok spesimen **dilewati dengan namanya disebut** dan
angkanya 22/0 — bukan hijau yang lebih kecil tanpa penjelasan.

### Satu setoran nyata — `npm run verify:deposit:live` → **DEPOSIT LIVE HIJAU — 38 pemeriksaan, 0 gagal**

Atas izin builder ("B97, B102, B90 kan bisa km gas itu"). Semua alamat uji diturunkan dari label di
berkas harness (B49):

| peran | label | alamat |
|---|---|---|
| peserta uji | `lencana-b90-learner-ontime` | `0x9eA761A399d173CfF3977c16c285a0B13245860E` |
| peserta aturan-asing | `lencana-b90-learner-foreign-policy` | `0xADa76F0D8Ec80b02596C17a6DB8FC0D06F1aA64D` |

| langkah | tx | gas |
|---|---|---|
| `deposit(web3-dasar-2026, 25000, 5 hari, policyHash penerbit, payee)` oleh peserta uji | `0x692195cbc6833fdc9b11691ff4e2bddac058de86d353074973fc22bb697a0ce8` | 144.489 |
| `BAS.timestamp(recordHash)` — syaratnya distempel **sebelum** ada hasil | `0xaecfb2969b4434c20d835619782ac3e3b46dc67f146c8aa5b86a7dff244e747b` | 45.869 |
| `attest` kredensial kursus oleh penerbit (uid `0xf6704754…5de0`, jam BAS 1790775679; `deadlineAt` 1791207672) | `0x88e04f3cda9e651f2c6abe7ed151c75962c806788c21c8236a657f7fb468e132` | 333.496 |
| `finalize` — disiarkan kunci platform lewat `POST /deposit/finalize` | `0xfeb7df4b9de15fbd16367b9382961a198f1e10c1e4d0d40efcd8aa8d76c81540` | 72.604 |
| `deposit` di bawah `policyHash` asing, tanpa tenggat | `0xaea6824dd86c02bc77b1af660d59bc5725bddd85aa90f86422a4bdbbd6205f5d` | 144.119 |
| `refundAll` oleh owner — setoran aturan-asing kembali utuh | `0xbeff869e9ba0d8d6a76177d32f15f8fe71e0a94c05868bef0b98b6e78f92eb47` | 62.090 |

(Di luar tabel: dua isi gas 0,001 tBNB, dua `mint` token demo 25.000 satuan terkecil, dua `approve`
— hash-nya dicetak run yang sama.)

Yang dibaca balik dari chain, bukan dari jawaban server:

- `deadlineAt` = jam blok setoran + 5 hari; `policyHash` tersimpan = hash aturan penerbit;
- sebelum kredensial ada, penyelesaian ditolak **409** (tidak ada `issuedAt` untuk diadili);
- tiga penolakan sesudah kredensial ada — `refundBps` 0 bertanda tangan penerbit sah → **422**; tanda
  tangan kunci lain → **401**; tanda tangan penerbit atas `issuedAt` yang bukan jam BAS → **401** —
  dan sesudah ketiganya `finalized` masih `false`;
- penyelesaian sah → event `Finalized` dengan `withinDeadline=true`, `issuedAt` = jam BAS, `refundBps`
  10000; pengirim transaksi = kunci platform; **premi kembali utuh ke peserta**, payee tidak menerima
  apa pun, kontrak tidak menahan sisa;
- permintaan yang sama dikirim ulang → **409** dan nonce platform tidak naik;
- setoran ber-`policyHash` asing → **409** sebelum tanda tangan diperiksa, lalu kembali utuh lewat `refundAll`.

## Batas — yang BELUM dan tidak boleh diklaim

- **Jalur telat/hangus tidak diuji di chain publik.** Tenggat terpendek satu hari; yang membuktikannya
  tetap `forge test` dengan `vm.warp` (16/16). Di chain 97 hanya jalur tepat waktu dan `refundAll`.
- **Tidak ada di halaman.** Tidak ada UI untuk memilih tenggat atau menyetor; rute `policy` ada supaya
  halaman kelak punya sumber, bukan karena halaman sudah memakainya.
- **Tidak tersambung ke pembayaran kursus.** `orders` belum menempel ke enrollment (bar 10 / OI-11),
  harga dasar kursus belum ada di manifest, jadi **`amount` tidak diadili terhadap premi tier**.
  x402 tidak membawa uang ke kontrak ini.
- **Aturannya hidup di `signer/src/deposit.js`, bukan di dalam manifest.** Ia terikat lewat
  `manifestHash`/`rubricHash`, tapi memindahkannya ke `web/src/manifest.ts` belum dilakukan.
- **`forfeit` tanpa batas klaim dan tanpa jendela banding**, `refundAll` sepenuhnya di tangan owner,
  dan kontraknya belum diaudit. Token-nya koin demo dengan `mint` terbuka. Bukan untuk uang sungguhan.
- **Jejak di chain 97:** kredensial `0x75d868865469346d9f4dcc6c7ff1d0d13e2413f1fb944ce177804f885e21fc4e`
  (kursus `web3-dasar-2026`) untuk peserta uji yang kuncinya diturunkan dari label — **tanpa
  penilaian, tanpa dokumen, tidak masuk store kita dan tidak masuk korpus 21 kertas.** Jangan dikutip
  sebagai peserta atau kelulusan. Kunci kedua peserta uji bisa dihitung siapa pun dari labelnya.
- `--live` hanya bisa sekali per label (kontrak menolak setoran kedua untuk pasangan yang sama).
- Salah satu penolakan diuji hanya di mode `--live`: jalur `policyHash` asing butuh setoran nyata.

## Cara menjalankan ulang

```
cd app/signer
npm run verify:deposit          # tanpa gas; membaca spesimen yang sudah selesai dari chain
npm run sync:numbers -- --only=deposit
cd .. && forge test --match-contract CourseDeposit   # 16 lulus: jalur telat/hangus ada di sini
```
