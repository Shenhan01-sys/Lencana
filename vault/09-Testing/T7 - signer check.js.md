---
tags: [testing, "T7"]
command: node scripts/check.js
measured: 2026-09-28
result: 74 checks / 0 failed
---

# T7 - signer check.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app/signer
node scripts/check.js        # memuat ../.env sendiri (src/env.js); lingkungan proses menang
```

## Result — 2026-09-25

```
  ok    credentialHash TypeScript == hash yang terbaca di chain
  ok    @context dua URI dan urutannya benar
  ok    type memuat VerifiableCredential + OpenBadgeCredential
  ok    validFrom ada, issuanceDate TIDAK (VC 1.1 bukan VC 2.0)
  ok    validUntil ada, expirationDate TIDAK
  ok    achievement.criteria wajib dan terisi
  ok    subject: id XOR identifier, tepat salah satu
  ok    result[] membawa nilai lewat `value` (bukan resultScore ala OB 2.0)
  ok    kadaluarsa dokumen berasal dari SATU angka dengan attestation
  ok    statusListIndex string basis 10 (bukan angka)
  ok    dua entri status, dua purpose berbeda (revocation + suspension)
  ok    id entri status BUKAN URL list-nya sendiri
  ok    proof.type = DataIntegrityProof
  ok    proof.cryptosuite = eddsa-rdfc-2022 (yang ada di daftar sertifikasi)
  ok    proofPurpose = assertionMethod (wajib §B.1.24)
  ok    verificationMethod = URL HTTP, bukan DID
  ok    proofValue multibase base58btc (awalan z)
  ok    verifikasi round-trip LULUS
  ok    nilai diubah -> tanda tangan MATI
  …
  ok    chain mengenali seluruh kredensial yang diawasi sebagai attestation kita (11/11)
CHECK HIJAU — 53 pemeriksaan, 0 gagal
```

The count **grows with the watched set**: 45 on 21 Sep, 53 when the lesson-level credentials joined,
**74 on 28 Sep** (korpus 15 hash, dokumen yang tersimpan bertambah). A count is not a score — read the
group list, and note that the count collapsed to **28** whenever the chain variables were missing,
because the chain-dependent group was skipped silently apart from its warning line. Sejak 28 Sep
`check.js` memuat `../.env` sendiri lewat `src/env.js` dan mencetak berapa variabel yang masuk, jadi
"28 hijau" tidak bisa lagi terjadi tanpa sengaja.

## What this does NOT prove

- It signs and verifies against **our own** Ed25519 key. It does not prove another organisation's
    validator accepts the document — that is P7: run on 27 Sep, 2 errors, both about document shape → [[09-Testing/T15 - 1EdTech validator]].
- `verificationMethod` being an HTTP URL is checked for *shape*. Whether that URL resolves outside
  this machine adalah pemeriksaan yang **berbeda**, dan dulu jawabannya "tidak": yang tersaji hanyalah
  loopback. Sekarang ada dua lapis: [[09-Testing/T16 - npm run publish edge]] membuktikan URL-nya
  menjawab dari host tetap, dan **B48** menutup lubang yang tersisa — server lokal pun wajib
  menyajikan setiap agen di `.keys/`, karena dokumen lama menunjuk slug tempat ia terbit, bukan slug
  yang kebetulan di-start hari ini.

**Related:** [[S1 - The credential document]] · [[S2 - Status lists from chain state]] · [[00-Overview/04 - Corrections]]
