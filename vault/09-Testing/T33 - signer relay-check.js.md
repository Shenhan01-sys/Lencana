---
tags: [testing, "T33"]
status: active
updated: 2026-09-30
command: npm run verify:relay
measured: 2026-09-30
result: RELAY HIJAU — 31 pemeriksaan / 0 gagal (tanpa gas) · RELAY LIVE HIJAU — 17 / 0 (satu siaran nyata di chain 97) · live ulang 4 Okt (T68) 17 / 0 — siaran 0x1884…6cf3, 347.047 gas
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

## Run `--live` 30 Sep — 17 / 0, satu transaksi testnet

`npm run verify:relay:live` menyalakan server yang sama dengan `RELAY_BROADCAST=1` dan mengirim **satu**
permintaan sah. Dijalankan atas izin builder; yang membayar gas adalah kunci platform.

```
  ok    /healthz melaporkan relay terkonfigurasi dan siaran NYALA (run ini memang --live)
  info  agen 0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE · platform 0xAEc63F6cEbBfacdC3516992b6ec396147c9c8361 · peserta uji 0xC0CC57ce36F787d8902b415e1f6abA4b1F91cC96
  info  credentialHash 0x13a6864522ae367ab78f4b58d6a1e102690352096c67a7135217c378adef7f4e (kursus label uji "lencana-relay-probe", bukan kertas katalog)
  ok    permintaan sah -> 202, siaran enabled
  ok    pekerjaan berakhir confirmed dengan txHash tercatat
  info  tx 0xa28aa457f58cc4f47f86a84e31f476ead7a5f9bb2813255dbccbcc902605ceb1 · gas 347059 · blok 134059032
  ok    yang membayar adalah kunci platform (paidBy), bukan agen
  ok    resolver kita mengindeks kredensialnya (attestationOf != 0)
  info  uid 0xd922d6ee8959532ef578de51020e72641eedc08737fe430f5cc338502880bd5a
  ok    attester yang tercatat di chain = AGEN, bukan penyiar
  ok    statusOf: exists, tidak dicabut, penerbit tidak didelisting
  ok    holderOf = peserta yang ditandatangani agen
  ok    saldo agen TIDAK berubah sampai wei (nol gas di sisi agen)
  ok    saldo platform turun (dialah yang membayar gas)
  ok    nonce agen naik tepat satu (5 -> 6)
  ok    permintaan yang sama dikirim ulang -> 200, pekerjaan dan txHash yang sama
  ok    dan nonce agen tidak naik lagi (tidak ada siaran kedua)
  ok    kredensial diadopsi ke himpunan pantau store proses itu (tidak menunggu adopt.js)
  ok    state.json hangat (19 kertas) tidak disentuh run ini

RELAY LIVE HIJAU — 17 pemeriksaan, 0 gagal
```

Dua baris yang paling berarti: **"permintaan yang sama dikirim ulang → txHash yang sama"** dan **"nonce
tidak naik lagi"**. Itu bedanya layanan dari skrip: skrip yang dijalankan dua kali menyiarkan dua kali.

Jejak di chain 97 yang ditinggalkan run ini adalah kredensial berlabel uji (kursusnya
`keccak256("lencana-relay-probe")`, tidak ada di katalog, tanpa dokumen OB 3.0). Ia tidak masuk korpus 19
kertas dan tidak boleh dikutip sebagai bukti pengguna. Setiap `--live` berikutnya menambah satu lagi.

## Yang TIDAK dibuktikan

- Pemulihan sesudah proses mati di tengah siaran: pekerjaan ber-`txHash` ditandai `unknown` dan tidak
  diulang, tetapi jalur itu belum diuji.
- Antrean adalah satu berkas JSON dan satu proses; dua instance signer atas store yang sama saling
  menimpa. Tidak ada rate limit per IP dan tidak ada autentikasi selain tanda tangan agen itu sendiri.
- Bukan uji beban.

**Related:** [[09-Testing/T10 - npm run delegate]] · [[09-Testing/T27 - signer cold-store-probe.js]] ·
[[04-Signer-Service/S7 - Server routes and lifecycle]] · [[Concepts/Fronted Gas]]
