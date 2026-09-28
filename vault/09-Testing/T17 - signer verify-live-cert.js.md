---
tags: [testing, "T17"]
command: node scripts/verify-live-cert.js
measured: 2026-09-28
result: 17 checks / 0 failed (1 group reported as info, not counted)
---

# T17 - signer verify-live-cert.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Kontrak:** [[02-Contracts/C2 - SoulboundCert]] · **Backlog:** **B53**

Harness ini ada karena satu kalimat yang kutulis tanpa memeriksa: pada 28 Sep kubilang instance
`0xC6FD12…` "sudah menegakkan D42/D43". Bytecode mengatakan sebaliknya — dan klaim itu hampir
membuat rencana seharga lima penerbitan terbaca sebagai satu transaksi. Jadi yang diuji di sini
bukan source dan bukan catatan, melainkan **instance yang orang lain buka di explorer**.

## Command

```powershell
cd app/signer
npm run verify:live-cert     # butuh LIVE_CERT_ADDRESS + RESOLVER_ADDRESS + DEPLOYER_ADDRESS di ../.env
```

## Result — 2026-09-28 (verbatim)

```
  env   : 22 dari berkas ../../.env

  0xc338af7f20f12e71ed858f0eed66e2a5632d62aa · 7968 byte bytecode
  ok    bytecode memuat mintBatch (D43 ada di deployment, bukan hanya di source)
  ok    bytecode memanggil registry lewat b174a9c4 (pintu D42 ada di deployment)
  ok    bytecode memanggil registry lewat e303404e (pintu D42 ada di deployment)
  ok    buku besar validator: baris terakhir outcome VALID
  ok    artefak kredensial yang divalidasi ada di lapis yang hidup
  ok    ownerOf == holderOf (bukan alamat yang kita karang, B49)
  ok    tokenId == uint256(credentialHash) (satu artefak per kredensial)
  ok    external_url = persis URL yang diikuti validator
  ok    metadata menyebut status dari chain, bukan beku saat mint
  ok    tidak ada URL loopback atau host tunnel di metadata artefak
  info  tidak ada kredensial level-lesson di store — penolakan D42 hanya terbukti di fork test (T1/T2), bukan di chain ini
  ok    mint oleh bukan-pemilik DITOLAK (NotIssuer)

LAPIS ARTEFAK HIJAU — 11 pemeriksaan, 0 gagal
Yang dibaca: bytecode dan reaksi kontrak di RPC publik chain 97, bukan log build kami.
```

## Run kedua hari yang sama — 17 / 0, dan harness-nya yang berubah

Kertas kedua terbit di bawah identitas tepi (`0x44d4946e…`, Web3 Lanjut, LULUS 90/70, attestation
316.384 gas, `outcome: VALID` dengan dokumen dibaca dari tepi) dan diikat sebagai artefak lewat
`scripts/mint-showcase.ps1` → `script/MintShowcase.s.sol` (satu panggilan `mintBatch`; yang sudah
terikat disaring keluar lebih dulu, jadi skripnya idempoten).

```
  ok    buku besar memuat setidaknya satu kertas VALID di host tetap
  ok    artefak 0xd0bce6f4… ada di lapis yang hidup
  ok    0xd0bce6f4…: ownerOf == holderOf (bukan alamat yang kita karang, B49)
  ok    0xd0bce6f4…: tokenId == uint256(credentialHash) (satu artefak per kredensial)
  ok    0xd0bce6f4…: external_url = persis URL yang diikuti validator
  ok    0xd0bce6f4…: tidak ada URL loopback atau host tunnel di metadata
  ok    artefak 0x44d4946e… ada di lapis yang hidup
  …    (blok yang sama untuk kertas kedua)
  ok    mint oleh bukan-pemilik DITOLAK (NotIssuer)

LAPIS ARTEFAK HIJAU — 17 pemeriksaan, 0 gagal
```

Dua hal yang salah di harness-nya sendiri dan ikut diperbaiki, karena ini berkas yang orang baca
untuk membuktikan sesuatu:

1. **Ia hanya membaca baris terakhir buku besar.** Maknanya berubah setiap kali ada validasi baru:
   kertas yang tadi terbukti bisa berhenti terbukti tanpa ada yang menyadari. Sekarang daftarnya
   diambil dari seluruh baris `VALID` di host publik (baris loopback/tunnel dibuang — host sementara
   bukan bukti) dan **setiap** item diperiksa sendiri-sendiri.
2. **Helper ABI-nya menyatakan semua output `address`.** `tokenOfCredential` itu `uint256`, jadi id
   terpotong ke 20 byte terbawah, `ownerOf` ditanya dengan id yang salah, dan kontrak membalas
   `0x7e273289` — yang hampir saja kutafsirkan sebagai artefak yang hilang, padahal yang salah adalah
   dekode kita. Sekarang setiap panggilan rantai dibungkus: revert adalah **pemeriksaan merah**, bukan
   crash yang mematikan sisa pemeriksaan dan meninggalkan log setengah.

## Kenapa nomornya berarti, satu per satu

| pemeriksaan | apa yang membuatnya bukan hiasan |
|---|---|
| panjang bytecode = 7.968 byte | sama persis dengan `out/SoulboundCert.sol` hasil build — jadi yang ter-deploy adalah source kita, bukan artefak lama yang disalin |
| `mintBatch` + `attestationOf` + `lessonOf` ada | D43 dan gerbang D42 benar-benar terpasang di alamat itu. Yang dibandingkan adalah **selector yang diturunkan dari tanda tangan fungsi**, bukan heksa yang kutulis di berkas |
| `ownerOf == holderOf` | peserta artefak adalah alamat yang dikatakan chain. Aturannya lahir dari B49, dan `cast` sempat menjebakku lagi di percobaan pertama: `statusOf(bytes32)(address)` mengembalikan word pertama (`exists`), yang lolos regex-ku sebagai `0x…01`, dan kontrak yang menangkapnya lewat `WrongHolder` |
| `external_url == docUrl` di buku besar | yang dibekukan ke dalam NFT adalah persis URL yang diikuti `vc.1ed.tech` saat ia berkata VALID — bukan URL yang mirip |
| penolakan `NotIssuer` lewat `eth_call` sebagai bukan-pemilik | penolakan diuji terhadap bytecode yang sama seperti yang akan ditemui orang lain, tanpa gas dan tanpa mengubah state |

## Yang TIDAK dibuktikan di sini

- Bahwa **`CERT_ADDRESS`** (korpus demo di `0xA5eB80…`) menegakkan D42/D43 — tidak, dan itu justru
  yang dijaga `npm run verify:deploy`: ia menuntut deployment itu **tidak** memuat penanda tersebut,
  sesuai batas yang kita tulis, dan akan merah kalau seseorang me-redeploy tanpa menulis ulang dokumen.
- Bahwa `LessonLevelNotMintable` pernah terpicu di chain 97. Store kita tidak memuat kredensial
  level-lesson, jadi itu tetap bukti fork test (`test_ArtefakHanyaLevelKursus`) dan dicetak `info`,
  bukan dihitung sebagai lulus.
- Bahwa korpus demo sudah bermigrasi ke lapis yang patuh. Belum, dan alasannya kode, bukan jadwal:
  artefak yang berstatus cabut/tangguh tidak bisa di-mint ulang di kontrak lain (`mint()` menolak
  state itu), sementara hash kredensial ikut akun yang menandatangani — lihat **D46** dan
  [[02-Contracts/C2 - SoulboundCert]].

**Related:** [[09-Testing/T14 - verify the public deployment]] · [[09-Testing/T15 - 1EdTech validator]] · [[09-Testing/T16 - npm run publish edge]] · [[02-Contracts/C2 - SoulboundCert]]
