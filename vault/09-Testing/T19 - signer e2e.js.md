---
tags: [testing, "T19"]
command: npm run e2e
measured: 2026-09-28
result: 42 checks / 0 failed
---

# T19 - signer e2e.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1, P6

## Kenapa harness ini ada padahal sudah ada enam

`check.js`, `serve-probe.js`, `publish:edge`, `verify:edge`, `verify:live-cert`, `validator` —
masing-masing membuktikan **satu lapis**. Tidak ada satu pun yang membuktikan bahwa kelimanya
menunjuk **benda yang sama pada saat yang sama**, dan justru itu klaim produk kami: statusnya terbaca
dari chain, dokumennya terbuka untuk siapa pun, dan yang ada di wallet adalah ijazah yang sama.

Retakan yang hanya bisa kelihatan di antara lapisan:

| retakan | siapa yang menemukannya |
|---|---|
| `external_url` NFT menunjuk URL kertas yang *berbeda* dari yang diikuti validator | [4] vs [2] |
| daftar yang disajikan bit-nya benar tapi hash-nya tidak tersegel di BAS | [1] `getTimestamp` |
| kertas menunjuk issuer document yang 404 di tepi (dokumen terbit, bagasinya tidak) | [2] "URL yang dicetak di kertas menjawab" |
| peserta di chain != peserta yang dicetak kertas | [2] `holderOf` vs `credentialSubject.id` |
| artefak tercabut masih bilang VALID di metadata karena beku saat mint | [4] status dari chain |

## Command

```powershell
cd app/signer
npm run e2e                    # penuh, termasuk vc.1ed.tech (~2-3 menit, jaringan pihak ketiga)
npm run e2e -- --skip-validator
$env:E2E_PORT=8801; npm run e2e   # kalau port 8799 dipakai server lain
```

Ia menaikkan server signer sendiri di port terpisah (loopback) dan mematikannya lagi — `serve-probe`
sengaja tidak melakukan itu karena ia menguji server yang kamu jalankan; e2e harus bisa jalan di mesin
yang servernya mati.

## Run 28 Sep — 42 / 0

```
[1] chain 97 — apa yang benar menurut state, bukan menurut catatan kami
  ok    kredensial showcase dikenal resolver
  ok    penerbit yang tercatat di chain (0x82113098…) ada di whitelist resolver
  ok    daftar revocation: hash yang kita sajikan tersegel di BAS (getTimestamp > 0)
  ok    daftar suspension: hash yang kita sajikan tersegel di BAS (getTimestamp > 0)
[2] tepi sajian — dibaca lewat internet, dengan kunci yang diambil dari tepi itu juga
  ok    holderOf di chain == peserta yang dicetak kertas (chain dan kertas menyebut orang yang sama)
  ok    tanda tangan SAH terhadap kunci yang diambil lewat HTTP, bukan kunci yang kita simpan
  ok    satu kata yang diubah di isi kertas membatalkan tanda tangan
  ok    URL yang dicetak di kertas menjawab dari host yang sama: /credentials/status/revocation
  ok    URL yang dicetak di kertas menjawab dari host yang sama: /issuers/agent-edge
[3] bit status — daftar yang disajikan harus sama dengan chain, sekarang juga
  ok    revocation: bit showcase pada indeks 28 == keadaan chain sekarang (0)
  ok    tepi sendiri mengklaim kedua daftar cocok dengan chain saat ini
[4] lapis artefak — yang dibuka orang di wallet dan explorer
  ok    artefak dimiliki peserta yang sama dengan holderOf di chain
  ok    artefak menunjuk PERSIS URL kertas yang diikuti validator saat ia berkata VALID
  ok    metadata menyebut status yang chain katakan sekarang (VALID) — dirakit per panggilan, bukan beku
  info  prerequisiteOf(uid showcase) = kosong (kertas ini tidak merantai prasyarat di chain — B55)
[5] server signer — rute gratis, penolakan berbayar, dan penolakan hash asing
  ok    POST /verify tanpa pembayaran -> 402 dengan accepts[] (bukan 200 diam-diam)
  ok    di tepi pun hash asing -> 404 dengan petunjuk rute, bukan 500
  ok    purpose yang tidak ada -> 404, bukan daftar kosong yang terlihat sah
  ok    kredensial tercabut 0xf34bdc45…: bit tersaji = 1 pada indeks 0
  ok    kredensial tercabut 0x81fc74b6…: bit tersaji = 1 pada indeks 22
[6] validator pihak ketiga — vc.1ed.tech
  ok    validator asing berkata VALID untuk kertas yang sama, dibaca dari tepi

E2E HIJAU — 42 pemeriksaan, 0 gagal
```

Run pertama (juga 28 Sep): **40 pemeriksaan, 2 gagal**, dan keduanya merah karena asumsiku sendiri —
`statusOf(bytes32)` mengembalikan `issuer` di field kelima, bukan peserta
(`ICredentialRegistry.sol:17-29`; `holderOf` ada justru supaya artefak tidak di-mint untuk orang
yang salah). Aku menulis "holderOf harus sama dengan field itu", chain menjawab benar, dan harness-nya
yang salah. Setelah kubicin, pemeriksaan yang tersisa justru lebih kuat: `holderOf` di chain dibandingkan
dengan alamat peserta **yang dicetak di dalam kertas**, dan field issuer dibandingkan dengan whitelist
resolver. Tidak ada satu pun angka yang diubah untuk membuat run jadi hijau.

## Yang TIDAK dibuktikan lintasan ini

- Bukan uji beban, bukan uji keamanan transport, bukan uji kegagalan Cloudflare (tepi mati = kita
  dapat `status: 0`, dan itu dilaporkan merah, bukan dilewati).
- Tidak menerbitkan kredensial baru, jadi ia **bukan** pengganti `issue.js` + `validator`: ia membaca
  apa yang sudah terbit. Kalau korpus berubah, jalankan dulu `publish:edge` lalu `e2e`.
- `prerequisiteOf` showcase kosong (B55) — rantai prasyarat tetap hanya terbukti di `SeedDemo` +
  fork test, dan harness ini mencetaknya sebagai `info`, tidak sebagai lulus.

**Related:** [[09-Testing/T15 - 1EdTech validator]] · [[09-Testing/T16 - npm run publish edge]] ·
[[09-Testing/T17 - signer verify-live-cert.js]] · [[09-Testing/T18 - signer verify-edge.js]] ·
[[04-Signer-Service/S10 - Edge surface]]
