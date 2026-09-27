---
tags: [testing, validator, open-badges]
status: active
updated: 2026-09-27
---

# T15 - The 1EdTech validator, run for real

The run that [[07-Backlog/03 - Findings and Tasks 2026-09-26|B41]] existed for. Recorded **as returned**,
pass or fail, because the whole point of this project is that a number we do not like is still a number.

## What it is

`https://vc.1ed.tech` — the 1EdTech **member** validator, `OB30Inspector`, validating against
`ob_v3p0_achievementcredential_schema.json`. It is not a certification and we never call it one; it is the
closest thing to a neutral third party reading our document the way someone else's software would.

## How to run it (all of this was executed on 27 Sep)

```bash
# 1. upload — the part MUST be named file; `uri` alone is rejected with
#    "Required part 'file' is not present."
curl -c jar.txt -b jar.txt -L \
  -F "file=@cred.json;type=application/json" \
  -F "validatorId=OB30Inspector" \
  https://vc.1ed.tech/upload
#    -> HTTP 302 to /validate;jsessionid=…   (do NOT use -X POST: it re-POSTs to /validate and dies on 411)

# 2. the verdict is NOT in that redirect page's prose. Read the API the page calls:
curl -b jar.txt "https://vc.1ed.tech/api/validate?validatorId=OB30Inspector&uploadId=<uploadId>"
#    <uploadId> is printed in the page's inline script: params {"uploadId":"val…json"}
#    POST to /api/validate with JSON or form bodies is refused ("Content-Type … not supported") — GET only.
```

⚠️ **The trap that nearly produced a false claim.** The `/validate` page contains the literal sentence
*"This content is eligible to be submitted for conformance certification."* as a **template**, and it also
carries hidden badges reading "No errors found." / "Issues found." / "Warnings found." none of which are
filled in by the server. Reading a verdict out of that HTML would have reported a pass on a run that
returned two errors. The numbers exist only in the JSON above.

## What it returned, verbatim

```json
"summary": {
  "outcome": "ERROR",
  "fatals": 0,
  "errors": 2,
  "warnings": 0,
  "exceptions": 0,
  "notRun": 0,
  "totalRun": 14,
  "valid": 0
}
```

```
1. JSON Schema Validation
   "$.credentialStatus: array found, object expected"
   location $.credentialStatus · generator JsonSchemaProbe
   schema https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json

2. Bitstring Status List Validation
   "revocation bitstring length is less than minimumNumberOfEntries"
   generator BitstringStatusListProbe
```

## Run kedua hari yang sama: `outcome: VALID`

Koreksinya diambil dari kutipan primer, bukan dari menebak apa yang diinginkan probe:

| yang salah | bunyi sumbernya | yang diubah |
|---|---|---|
| `credentialStatus` array | `ob_v3p0_achievementcredential_schema.json` memberi branch array untuk `proof`, `credentialSchema`, `termsOfUse`, `evidence` — dan **tidak** untuk `credentialStatus` (`$defs`: `type: object`; tabel data: **[0..1]**). VC 2.0 boleh himpunan; OB 3.0 mempersempit, dan yang menguji kita adalah OB 3.0 | `credential.js` menempel SATU entri `revocation`. Daftar suspension tetap disajikan, tetap dibangun dari state chain, tetap di-anchor — yang berhenti hanyalah rujukan di dalam kertas |
| panjang bitstring | BSL §3.2 langkah 9 memakai `minimumNumberOfEntries` = **131.072**; §2.2 dan §6.1 menulis *"the uncompressed bitstring MUST be at least 16KB"* — **16.384 byte**, bukan 16.384 bit. §1.1: ukuran itu memberi *"adequate amount of group privacy"* | `LIST_BITS` 16.384 → **131.072**. Yang salah adalah satuan dalam komentar kita sendiri |

```json
"summary": { "outcome": "VALID", "fatals": 0, "errors": 0, "warnings": 0,
             "exceptions": 0, "notRun": 0, "totalRun": 14 }
```

```
dokumen  : 0xfe4f71615855ac4f24fdfef921937d64e23dfc048e371a96e04cf4f508173a8a
uploadId : val1362183288355196627.json · generated 2026-09-27T07:10:34
peserta  : 0xc20e89599C275da327D8c12229f76974EFBcE541  (diturunkan dari konstanta — lihat B49)
nilai    : 92 vs passMark 70 · esai dinilai model (mekanis 60 = 3 dari 5 tanda) · attest 333.496 gas
```

Yang membuat run ini bernilai bukan stempelnya, melainkan **apa yang ia ikuti sendiri**: validator membuka
`verificationMethod` kami, mengambil kedua status list lewat HTTPS, dan memeriksa tanda tangan terhadap
kunci yang ia ambil dari URL kami.

Dua batas yang tetap kita sebut. `valids: []` dan `"valid": 0` pada ringkasan yang sama berarti respons
**tidak merinci pemeriksaan mana yang lulus** — klaim kita adalah "tidak ada error", bukan "empat belas
hal dikonfirmasi". Dan host yang ia ikuti adalah tunnel sementara: run ulang menuntut host yang sama
hidup, yang persis poin [[11-Refactoring/RF6 - Core System, Backend and Contracts]].

## What each one means, with our measurements next to it

| error | what we checked before interpreting it | where that leaves the design |
|---|---|---|
| `credentialStatus` array vs object | the document carries two entries on purpose — revocation (permanent) and suspension (recoverable) — which is the difference we sell against all six platforms ([[04-Signer-Service/S3 - Two status lists]]) | the published OB 3.0 schema admits one object. Either the document expresses one purpose and the other is proven from the chain, or we are not OB 3.0 shaped. **Not a syntax bug — a decision**, tracked as **B46** |
| bitstring length vs `minimumNumberOfEntries` | decoded what the server actually serves: `u` + base64url, 37 bytes gzipped, **inflates to 2048 bytes = 16384 bits**, 2 bits set, highest index referenced by any document = 25 | the array is not short. We never *declare* capacity, and `credentialSubject` carries no `size`/totalPages field of our own. Tracked as **B47** |

Neither error touches the chain layer: the issuer whitelist, `statusOf`, the anchored list hashes and the
signature all validated. What failed is the **shape of the paper**, not the machinery under it.

## Wording rule that follows from this page

| we may say | we may not say |
|---|---|
| "a credential from this backend passes the 1EdTech OB 3.0 validator — 0 errors, 0 warnings" (run 27 Sep) | "certified", "conformant", "1EdTech compatible", or "14 checks were each confirmed" |
| "it resolved our issuer document, both status lists and the signature over HTTPS" | bahwa validator memeriksa lapis chain — ia tidak membaca chain |
| "we publish the failing verdict, with the two defects and the fixes" | dropping the earlier "never been run" sentence and replacing it with silence |

The last line of [[08-Results/01 - Evidence and Limits]] and the limits block of every submission page now
point **here** instead of saying "never run" — that sentence became false the moment this page was written,
and a page that is out of date about its own worst result is worse than no page.

**Related:** [[Notes/Session-2026-09-27-B41-validator]] · [[09-Testing/T4 - npm run probe]] · [[09-Testing/T8 - signer serve-probe.js]] · [[04-Signer-Service/S8 - Criteria document]]
