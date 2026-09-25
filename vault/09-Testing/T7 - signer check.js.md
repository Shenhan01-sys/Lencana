---
tags: [testing, "T7"]
command: node scripts/check.js
measured: 2026-09-25
result: 53 checks / 0 failed
---

# T7 - signer check.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app/signer
node scripts/check.js        # reads RPC_URL / RESOLVER_ADDRESS / BAS_ADDRESS / DEMO_HASH* / EXPECT_* from the environment
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

The count **grows with the watched set**: it was 45 on 21 Sep, 53 since the lesson-level credentials
joined. A count is not a score — read the group list, and note that the count collapses to **28** when
the chain variables are missing, because the chain-dependent group is skipped silently apart from its
warning line.

## What this does NOT prove

- It signs and verifies against **our own** Ed25519 key. It does not prove another organisation's
  validator accepts the document — that is P7 and it has never been run.
- `verificationMethod` being an HTTP URL is checked for *shape*. Whether that URL resolves outside
  this machine is exactly what it cannot check, and today it does not (`BASE_URL` is a localhost).

**Related:** [[S1 - The credential document]] · [[S2 - Status lists from chain state]] · [[00-Overview/04 - Corrections]]
