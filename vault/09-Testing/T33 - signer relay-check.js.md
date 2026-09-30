---
tags: [testing, "T33"]
status: active
updated: 2026-09-30
command: npm run verify:relay
measured: 2026-09-30
result: RELAY HIJAU — 31 pemeriksaan / 0 gagal (tanpa gas; siaran dari antrean BELUM diuji di chain)
---

# T33 - signer relay-check.js (relayer penerbitan sebagai layanan, diadili sebelum gas)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B97 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Desain:** [[04-Signer-Service/S4 - Delegated issuance]] · [[11-Refactoring/RF6 - Core System, Backend and Contracts]] butir 1 · **AC:** —

## Kenapa harness ini ada

Primitif delegasi sudah terbukti di chain publik sejak 23 Sep ([[09-Testing/T10 - npm run delegate]]):
agen menandatangani, platform menyiarkan, `attester` tetap agen. Yang tidak ada adalah **pintunya** —
agen pihak ketiga hanya bisa menerbitkan kalau kita mengetik perintah untuknya. B97 memasang pintu itu:
`POST /relay` dan `GET /relay/<id>` di `signer/src/server.js`, logikanya di `signer/src/relay.js`.

Rute yang membuat platform membayar gas atas permintaan orang lain harus menjawab satu pertanyaan
lebih dulu dari "apakah yang benar diterima": **apakah yang salah ditolak sebelum satu wei bergerak.**
Karena itu 16 dari 31 pemeriksaan di bawah adalah penolakan, dan tiap penolakan diperiksa sampai kode
**dan** sebabnya.

## Command

```powershell
cd app/signer
npm run verify:relay     # butuh RPC_URL + RESOLVER_ADDRESS + BAS_ADDRESS + ISSUER_PRIVATE_KEY di ../.env
```

Ia menyalakan server signer sendiri di port bebas mulai 8837, dengan store dingin di `os.tmpdir()` dan
**tanpa** `RELAY_BROADCAST`. Kunci agen dipakai hanya untuk menandatangani di dalam proses harness.
Tidak ada transaksi, tidak ada publish.

## Run 30 Sep — 31 / 0

```
  ok    server naik dengan store dingin dan /healthz 200
  ok    /healthz melaporkan relay terkonfigurasi dan siaran MATI (tidak ada gas yang bisa keluar dari run ini)
  ok    agen uji memang penerbit terdaftar di resolver (prasyarat jalur sah)
  ok    permintaan sah dari agen terdaftar -> 202 dan masuk antrean
  ok    jawaban menyebut siaran mati dan belum ada txHash
  ok    jawaban memuat credentialHash yang diturunkan dari data, bukan dari klaim klien
  ok    permintaan yang SAMA dikirim ulang -> 200, pekerjaan yang sama, bukan antrean kedua
  ok    GET /relay/<id> membaca nasib pekerjaan itu
  ok    permintaan kedua dengan nonce yang sudah dipakai antrean -> 401 menyebut nonce yang diharapkan
  ok    batch dua entri dengan nonce menaik sesudah antrean -> 202
  ok    kredensial yang sudah menunggu di antrean tidak bisa diantrekan lagi lewat permintaan lain -> 409 menyebut pekerjaan yang memegangnya
  ok    tanda tangan SAH dari kunci yang bukan penerbit terdaftar -> 403 menyebut resolver
  ok    kunci asing menandatangani atas nama agen terdaftar -> 401 (tidak pulih ke attester)
  ok    tanda tangan agen sah tapi penerima diganti sesudahnya -> 401
  ok    skema lain -> 422 (relayer tidak membayar gas untuk skema orang)
  ok    deadline 0 -> 422 (delegasi tanpa tenggat = surat pembawa)
  ok    deadline lebih dari 3600 detik ke depan -> 422
  ok    deadline yang sudah lewat -> 422
  ok    value != 0 -> 422 (platform menalangi gas, bukan nilai)
  ok    data bukan 96 byte -> 422 sebelum chain disentuh
  ok    26 entri -> 422 menyebut batasnya
  ok    entries kosong -> 422
  ok    kredensial yang SUDAH terbit di chain -> 409 menyebut uid-nya (AlreadyIssued dicegat sebelum gas)
  ok    GET /relay -> 405
  ok    GET /relay/<id asing> -> 404
  ok    nonce agen di chain TIDAK berubah (tidak ada delegasi yang tersiar)
  ok    attestationOf ketiga kredensial uji tetap kosong di chain
  ok    /healthz menghitung dua pekerjaan menunggu, nol tersiar
  ok    antrean ditulis ke store uji, bukan ke repo
  ok    state.json hangat tidak berubah ukuran/mtime
  ok    server masih hidup sesudah semua penolakan

RELAY HIJAU — 31 pemeriksaan, 0 gagal
```

## Yang dijaga rute itu, dan kenapa masing-masing ada

| penjaga | tanpa itu |
|---|---|
| skema harus `schemaUID()` resolver kita | platform membayar gas untuk attestation skema orang lain |
| `isIssuer(attester)` dan bukan `isDelisted` — dibaca dari chain | permintaan revert `NotAnIssuer` sesudah gas keluar; dan delisting jadi tidak berarti di pintu ini |
| tanda tangan pulih ke `attester` atas digest EIP-712 yang sama dengan `delegation.js` | siapa pun bisa berbicara atas nama agen terdaftar — atau mengganti penerima sesudah ditandatangani |
| nonce = nonce chain **+ entri yang masih menunggu** milik agen itu | dua permintaan bernonce sama diterima, satu pasti revert `InvalidSignature` di chain |
| `deadline` bukan 0, belum lewat, dan ≤ 3600 detik ke depan | delegasi tanpa tenggat adalah surat pembawa ([[01-Architecture/A5 - Gas fronted and recovered]]) |
| `value` harus 0, `data` harus 96 byte, ≤ 25 entri | nilai ikut ditalangi; `BadDataLength`; RPC publik gugur di atas 25 |
| `attestationOf(hash)` masih kosong, dan hash tidak sedang menunggu di pekerjaan lain | `AlreadyIssued` sesudah gas keluar |
| ID pekerjaan = hash isi permintaan; pekerjaan ber-`txHash` tidak pernah disiarkan ulang | permintaan yang dikirim dua kali menjadi dua siaran (RF6 butir 1) |
| siaran hanya kalau `RELAY_BROADCAST=1` | server harness atau clone orang lain mengeluarkan gas karena sebuah POST |

## Satu merah di tengah jalan, dan itu tesku

Run pertama hijau 31/0 dengan satu pemeriksaan yang terlalu longgar ("409 atau 401"). Sesudah
kuperketat jadi "409 dan menyebut pekerjaan yang memegangnya", ia **merah**: yang kembali 401. Sebabnya
bukan rutenya — aku menandatangani dengan satu tenggat lalu mengirim dengan tenggat lain, jadi
permintaan itu ditolak karena tanda tangan, bukan oleh penjaga yang mau kuuji. Versi longgarnya lulus
karena kebetulan. Kelas yang sama dengan dua merah pertama di [[09-Testing/T21 - signer db-probe.js]]:
penolakan yang kebetulan benar tidak membuktikan apa pun.

## Yang TIDAK dibuktikan 31/0 ini

- **Siaran dari antrean belum pernah dijalankan di chain publik.** Kode `drainRelayQueue` ada dan
  memakai pembentuk permintaan yang sama dengan `npm run delegate`, tetapi tidak ada satu transaksi pun
  yang lahir dari `POST /relay`. Itu sebabnya baris B97 tetap terbuka. Menjalankannya berarti transaksi
  testnet dari kunci platform — dan kunci itu sedang terekspos (B116).
- Pemulihan sesudah proses mati di tengah siaran: pekerjaan ber-`txHash` ditandai `unknown` dan tidak
  diulang, tetapi jalur itu belum diuji.
- Antrean adalah satu berkas JSON dan satu proses; dua instance signer atas store yang sama saling
  menimpa. Tidak ada rate limit per IP dan tidak ada autentikasi selain tanda tangan agen itu sendiri.
- Bukan uji beban.

**Related:** [[09-Testing/T10 - npm run delegate]] · [[09-Testing/T27 - signer cold-store-probe.js]] ·
[[04-Signer-Service/S7 - Server routes and lifecycle]] · [[Concepts/Fronted Gas]]
