---
tags: [testing, "T38"]
status: active
updated: 2026-10-01
command: npm run verify:praktik · npm run verify:praktik:live
measured: 2026-10-01
result: PRAKTIK HIJAU — 32 pemeriksaan / 0 gagal (tanpa gas, transaksi tetap KNOWN_TX) · PRAKTIK LIVE HIJAU — 32 / 0 (satu transfer 0,001 tBNB baru)
---

# T38 - signer praktik-check.js — B121: slot praktik dinilai dari chain, bukan dari laporan peserta

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B121 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]
(🟡 core selesai, baris tetap TERBUKA sampai halaman belajar memanggil rutenya) ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B121 - Praktik dinilai chain]] · **Summary:** [[08-Results/B121 - Executive Summary]] ·
**Keputusan:** D55 di [[00-Overview/03 - Decisions]] · **Harness tetangga:** [[09-Testing/T22 - signer attempts-check.js]] (lapis `--live`-nya kini mengisi slot praktik lewat rute yang sama)

## Yang diuji

Sampai 1 Okt satu-satunya jalan masuk usaha praktik adalah `POST /attempts`, yang menerima **angka
kiriman peserta** — dan rute itu menerima angka kuis dan esai juga, lalu `fromAttempts` memakainya asal
ada komponen. Sekarang:

- `POST /attempts` menolak skor `kuis`/`esai`/`praktik` dan menunjuk jalurnya masing-masing (`/grade`,
  `/essay`, `/praktik`); hanya `ujian` — yang tidak punya slot rubrik — yang tetap tercatat.
- `POST /praktik` (`signer/src/praktik.js`): peserta mengirim **apa yang ia kerjakan atau baca di chain**,
  server membaca ulang chain 97, dan usaha disimpan hanya kalau semuanya cocok. Jawaban salah dilaporkan
  **nama pemeriksaannya saja**, tanpa nilai yang benar.
- `fromAttempts` hanya mengisi slot praktik dari komponen `graded_by='chain'`.

| lesson (manifest penerbit) | jenis bukti | yang dikirim peserta | yang dibaca server | kunci bukti (sekali pakai) |
|---|---|---|---|---|
| web3-dasar · Praktik 1 `dompet-burner-dan-faucet` | `balance` | dompet, saldo dalam wei **dan** dalam BNB (koma atau titik) | `eth_getBalance` | `balance:97:<dompet>` |
| web3-dasar · Praktik 2 `praktik-kirim-dan-baca` | `tx-receipt` | hash, nomor blok, waktu blok, gas terpakai, selisih saldo **termasuk biaya** | transaksi + receipt + blok; transfer ≥ 0,001 tBNB ke alamat lain, dari dompet itu, status sukses | `tx:97:<hash>` |
| web3-dasar · Praktik 3 `praktik-eth-call` | `eth-call` | keluaran mentah tiga `cast call` (schemaUID, isIssuer, statusOf) | `eth_call` yang sama | — (jawabannya sama untuk semua orang) |
| web3-lanjut · Praktik 1 `praktik-rantai-izin` | `allowance` | token, `balanceOf`, ≥ 2 pasangan `allowance` | `balanceOf`/`allowance` di blok terbaru | `allowance:97:<dompet>:<token>` |

Dompet latihan harus menandatangani `lencana-praktik course=… lesson=… learner=<alamat peserta>
wallet=<dompet> [tx=<hash>]` — tanpa itu transaksi orang lain bisa diakui siapa saja.

## Lapis integrasi + chain (`--live`, 1 Okt)

```
  ok    server membaca chain 97 (lesson praktik menuntut chain 97)
— A. POST /attempts tidak lagi menerima skor slot rubrik dari peserta
  ok    /attempts kind=praktik skor 100 kiriman peserta -> 400 dan menunjuk POST /praktik
  ok    /attempts kind=kuis skor 100 kiriman peserta -> 400 dan menunjuk POST /grade
  ok    /attempts kind=esai skor 100 kiriman peserta -> 400 dan menunjuk POST /essay
  ok    /attempts kind=ujian (tidak punya slot rubrik) tetap tercatat -> 201
  ok    tidak satu pun baris kuis/esai/praktik lahir dari empat kiriman itu
— B. pagar POST /praktik
  ok    /praktik yang membawa score -> 400 (angka milik server)
  ok    lesson yang bukan praktik -> 400
  ok    pesan peserta yang tidak menyebut lesson= -> 401
  ok    peserta yang belum terdaftar -> 422 sebelum chain dibaca
— C. bukti eth-call (Praktik 3, web3-dasar)
  ok    satu keluaran salah -> 422 dan hanya NAMA pemeriksaannya yang disebut
  ok    jawaban 422 tidak membocorkan keluaran yang benar (server bukan kunci jawaban)
  ok    tiga keluaran mentah yang sama dengan bacaan chain -> 201, dinilai chain (3 pemeriksaan)
  ok    baris usaha: kind praktik, skor 100, tiap komponen graded_by chain
  ok    bukti tersimpan terikat ke usaha itu, berisi nilai yang DIBACA SERVER
— D. bukti saldo (Praktik 1, web3-dasar) — dompet latihan menandatangani pengikatnya
  ok    kunci bukti saldo tidak dipegang peserta sungguhan (run uji sebelumnya dilepas dulu)
  ok    pengikat dompet ditandatangani kunci lain -> 401
  ok    saldo wei meleset 1 wei -> 422 [balance-wei]
  ok    saldo wei + BNB (ditulis dengan koma) sama dengan chain -> 201, kunci bukti = dompet
  ok    dompet yang sama dipakai peserta kedua -> 409, dan peserta kedua tidak mendapat usaha praktik
— E. bukti transaksi (Praktik 2, web3-dasar)
  info  transfer 0,001 tBNB baru dari dompet latihan: 0xea4617d3c258cf5b13063fba1e878daab3b25c505625cc794006f38f19414845
  ok    kunci bukti transaksi tidak dipegang peserta sungguhan
  ok    gas terpakai meleset satu (21001 vs 21000) -> 422 [gas-used]
  ok    selisih saldo = jumlah kiriman tanpa biaya gas (salah kaprah yang diperingatkan lesson) -> 422 [balance-delta]
  ok    mengakui transaksi orang lain (dompet sah, tapi bukan pengirimnya) -> 422 [tx-sender]
  ok    hash, blok, waktu blok, gas, selisih saldo (termasuk biaya) cocok -> 201
  ok    transaksi yang sama untuk peserta kedua -> 409
— F. bukti izin token (Praktik 1, web3-lanjut) — dompet kosong baru
  ok    satu spender saja (lesson meminta beberapa) -> 400
  ok    izin tak terbatas dilaporkan padahal chain bilang 0 -> 422 [allowance:0xcB00E6…]
  ok    balanceOf + dua allowance cocok (nol tetap bukti sah) -> 201
— G. bukti chain mengisi slot praktik; laporan peserta tidak
  ok    fromAttempts atas baris nyata peserta: praktik terisi, provenannya graded_by chain
  ok    peserta kedua (bukti ditolak 409) -> slot praktik kosong
  ok    gerbang kursus menghitung 3 usaha praktik yang dinilai chain (+1 ujian)
PRAKTIK LIVE HIJAU — 32 pemeriksaan, 0 gagal
```

Mode tanpa gas (`npm run verify:praktik`) menjalankan 32 pemeriksaan yang sama; bagian E memakai
transaksi tetap `KNOWN_TX` = transfer di atas (`0xea4617d3…4845`, masih di chain), dan kunci bukti yang
dipegang peserta **uji** dari run sebelumnya dilepas lebih dulu (`freeTestProofKey` — kunci milik peserta
`demo`/`unknown` tidak disentuh dan membuat harness merah). Hasil 1 Okt: **PRAKTIK HIJAU — 32
pemeriksaan, 0 gagal**.

| peran dalam harness | alamat / nilai | catatan |
|---|---|---|
| dompet latihan (bukti saldo + transaksi) | `0xAEc63F6cEbBfacdC3516992b6ec396147c9c8361` | kunci platform/deployer — satu-satunya kunci kita yang pasti ber-tBNB; di sini berperan sebagai dompet sekali-pakai peserta |
| transfer uji | `0xea4617d3c258cf5b13063fba1e878daab3b25c505625cc794006f38f19414845` | 0,001 tBNB ke alamat acak, gas 21000 |
| token untuk bukti izin | `0x0B2fA5050912F4CdB5f7C47A5FAd6A8F9398CBaf` | token demo; spender: Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3` dan `SettlementSplit` `0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE` |
| kontrak yang dibaca bukti eth-call | `0x7CA624caFDe5cA3A27b33d26be56F73a90792065` | CredentialResolver, tiga panggilan yang sama persis dengan blok kode lesson |

## Satu kertas publik yang slot praktiknya dinilai chain

`npm run verify:attempts:live` (1 Okt, [[09-Testing/T22 - signer attempts-check.js]]) kini mengisi slot
praktik lewat `POST /praktik` (eth-call) dan menerbitkan kertas
`0x372c2518a3bd7aa19ffe45b1e3f6c23b9abe06d172c7574547057159112efd38` untuk peserta uji
`0xAbCA6C091e0797DB920dC744F904d260C3dEED2d`. Dokumen hasilnya di tepi
(`…/results/web3-dasar-2026/0x372c2518…`) memuat tiga komponen praktik `eth-call:schemaUID`,
`eth-call:isIssuer`, `eth-call:statusOf`, semuanya `gradedBy: "chain"`, hasil **100** = nilai di kertas
**"100"**. Enrollment peserta itu kutandai `origin=demo` — aturan B104/backfill 0007: pemegang kertas yang
kita pantau = demo — supaya `cleanup --apply` tidak menghapus rekaman di balik kertas yang terbit.

## Empat kesalahan yang tertangkap sebelum angka dicatat

1. **Constraint lama menolak `graded_by='chain'`.** Run pertama: `23514` dari `attempt_components`
   (constraint 0001 hanya `mechanical|model|human`). Diperluas di migrasi 0011 yang sama — di repo satu
   berkas `supabase/migrations/0011_praktik_proofs.sql`; di database tercatat sebagai dua migrasi yang
   diterapkan berurutan (`praktik_proofs`, lalu `attempt_components_graded_by_chain`). Run itu
   meninggalkan satu baris bukti tanpa usaha (`praktik_proofs.id=1`, peserta uji) — dihapus, dan rute
   sekarang melepas klaim bukti juga kalau penyimpanan usaha **melempar**, bukan hanya kalau menolak.
2. **Harness bicara dengan server yatim.** Run `verify:attempts:live` pertama: `/praktik` dijawab 404 dan
   `/attempts` praktik masih 201 — tujuh merah yang menyalahkan kode yang benar. Sebabnya `freePort`
   menganggap port kosong kalau `/healthz` tidak menjawab dalam 700 ms, padahal `/healthz` membaca chain;
   server yatim 30 Sep di 8795 (dan satu lagi di 8794 dari 28 Sep, keduanya `app/signer/src/server.js`)
   terbaca kosong, server baru gagal bind tanpa suara. Run itu **tidak** menerbitkan apa pun (`issue`
   berhenti di "bukti belum lengkap"). Perbaikan: `signer/src/ports.js` menguji **bind**, dipakai
   delapan harness (`attempts-check`, `agents-check`, `cold-store-probe`, `deposit-check`, `relay-check`,
   `praktik-check`, `db-probe`, `e2e` — dua terakhir tadinya port tetap). Kontrol negatifnya: listener
   yang tidak pernah menjawab di 8895 dilewati (dapat 8896), dan rentang yang penuh melempar.
3. **`publish:edge` crash (exit 134, "Native stack trace") di run live kedua — sesudah kertas terbit.**
   Hasil run itu **73 / 4 gagal**: keempatnya hilir dari crash itu (rute tepi belum menghidangkan kertas
   baru). `publish:edge` diulang langsung: **PUBLISH HIJAU 74/75** (satu-satunya yang tidak: deviasi lama
   `pengantar-defi-2026` tanpa manifest), kertas `0x372c2518…` 200 dari tepi. Lalu bagian h harness yang
   tidak sempat jalan diulang dengan predikat yang sama terhadap kertas itu: **16/16** (termasuk satu
   pemeriksaan B121: komponen praktik di dokumen hasil yang terhidang semuanya `graded_by chain`). Crash-nya
   tidak terulang dan `publish.js` tidak tersentuh B121; sebabnya **belum diketahui** — dicatat, bukan ditebak.
4. **Uji "gas salah" yang tidak bisa salah.** Versi pertama memakai batas gas sebagai jawaban keliru —
   pada transfer biasa batas gas = gas terpakai = 21000, jadi "salah" itu benar. Diganti meleset satu.

## Kebersihan artefak uji (1 Okt)

`npm run cleanup -- --apply` dua kali hari ini: **9 enrollment `origin=test`** sesudah run harness, lalu **5**
sesudah `npm run sync:numbers` penuh — usahanya ikut terhapus, dan `praktik_proofs` ikut lewat
`on delete cascade`. Keadaan akhir, dikueri ulang: `origin=test → 0`; `praktik_proofs` → **1** baris, tanpa
yang yatim (bukti eth-call milik pemegang kertas `0x372c2518…`, terikat ke usahanya); usaha praktik
`origin=demo` → 7 (6 laporan peserta jalur lama 28–30 Sep + 1 dinilai chain, 3 komponen `graded_by chain`).

## E2E — panduan untuk builder (centang sendiri)

- [ ] `cd app/signer && npm run verify:praktik` → baris terakhir `PRAKTIK HIJAU — 32 pemeriksaan, 0 gagal`
- [ ] buka `https://lencana-edge.hansgunawan775.workers.dev/results/web3-dasar-2026/0x372c2518a3bd7aa19ffe45b1e3f6c23b9abe06d172c7574547057159112efd38`
      → `attempts.components` dengan `slot: "praktik"` ber-`gradedBy: "chain"`
- [ ] coba sendiri dengan dompetmu: kirim 0,001 tBNB, lalu `POST /praktik` lesson `praktik-kirim-dan-baca`
      dengan selisih saldo **tanpa** biaya → 422 `["balance-delta"]`; dengan biaya → 201
- [ ] buka transfer `0xea4617d3…4845` di BscScan testnet: gas terpakai 21000, nilai 0,001 tBNB

| KPI (dari AC) | target | hasil 1 Okt |
|---|---|---|
| angka praktik kiriman peserta ditolak | `/attempts` praktik → 400 | 400, dan kuis/esai juga |
| praktik dinilai dari bacaan chain | 201 hanya kalau semua cocok | 4 jenis bukti, masing-masing jalur 422 dan 201 |
| server bukan kunci jawaban | 422 tanpa nilai benar | hanya nama pemeriksaan |
| satu bukti satu peserta | dompet/transaksi kedua kali → 409 | 409 |
| slot praktik hanya dari chain | laporan peserta tidak mengisi slot | `verify:attempts` 39/0 (fixture laporan peserta → slot kosong) |
| kertas yang terbit memuatnya | dokumen hasil di tepi `gradedBy chain` | kertas `0x372c2518…` |

## Batas

- **Halaman belajar belum memanggil `POST /praktik`** — itu yang membuat B121 tetap TERBUKA (fase FE,
  [[10-Contributors/Open-Items-for-Dave]] OI-20).
- **Bukti eth-call bisa disalin**: jawabannya sama untuk semua peserta; jenis itu membuktikan "bisa membaca
  kontrak", bukan "mengerjakan sendiri". Jenis lain diikat ke dompet yang menandatangani.
- Pemilik satu dompet bisa menandatangani untuk dua alamat peserta miliknya; kunci bukti mencegah satu
  dompet/transaksi dipakai dua kali, bukan mencegah orang berbagi kunci.
- Aturan bukti (`lesson.proof`) **tidak ikut `rubricHash`/`manifestHash`** — memasukkannya menggeser hash
  kertas yang sudah terbit. Terukur: kedua hash kedua kursus sama dengan HEAD sesudah `proof` ditambahkan.
  Keputusan D55; kalau kelak dimasukkan, itu versi rubrik baru.
- Bukti saldo membandingkan dengan saldo **terbaru**; kalau dompet bergerak di antara membaca dan
  mengirim, peserta harus membaca ulang.
- 6 baris praktik `origin=demo` dari jalur lama (laporan peserta, 28–30 Sep) tetap di Postgres dan **tidak
  lagi mengisi slot praktik** kalau kertas diterbitkan ulang dari rekaman itu. Kertas yang sudah terbit
  tidak berubah.
- **Server harness masih tertinggal sesudah harness selesai** (diamati 1 Okt malam, sesudah commit `af7ad3e`):
  lima proses `app/signer/src/server.js` masih mendengar di 8795, 8837, 8857, 8867, 8887 — milik
  `attempts-check`, `relay-check`, `deposit-check`, `agents-check`, `praktik-check` — dan dimatikan tangan.
  Artinya `taskkill /T` di harness tidak selalu menumbangkan cucu proses `npm run serve` di Windows; itulah
  asal yatim 28/30 Sep. `src/ports.js` membuat run berikutnya **tidak** lagi berbicara dengan kode lama,
  tapi yatimnya tetap menumpuk (14 port per harness; sesudah itu `freePort` melempar dengan pesan yang
  menyuruh mematikannya). Sebabnya belum diselidiki — dicatat, tidak ditebak.
  **Koreksi 1 Okt malam — sebabnya ketemu dan ditutup.** Sesudah tiga baterai B80, yatim yang tertinggal (11) hanya
  milik `relay-check`, `deposit-check`, `agents-check`, `praktik-check`: keempatnya menjalankan `taskkill /T` secara
  **asinkron** lalu `process.exit` 300 ms kemudian, sehingga taskkill tidak sempat selesai. `quiz-keys-check` (B80),
  yang memakai `spawnSync`, tidak meninggalkan satu pun. Keempatnya — plus `attempts-check`, yang keluar seketika
  sesudah taskkill dan menjadi asal yatim 8795 tanggal 30 Sep — kini memakai `spawnSync`. Bukti: keempat harness
  dijalankan sesudah perbaikan, hijau semua (31/0, 27/0, 34/0, 32/0), dan pendengar yang tersisa di 8837–8899 hanya
  `8884` milik System (pid 4) — nol yatim. Jalur `--live` `attempts-check` (yang menyalakan server) tidak diulang
  karena menerbitkan kertas; perubahannya sama persis.
