---
tags: [testing, edge, publish, cloudflare]
status: active
updated: 2026-09-28
---

# T16 - `npm run publish:edge`

**Hub:** [[09-Testing/00 - Hub Testing]] · **AC:** kriteria P1, P6 di [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B51 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Bagian:** [[04-Signer-Service/S10 - Edge surface]] · **Pasangan:** [[09-Testing/T18 - signer verify-edge.js]]

Harness yang menutup **B51**: menerbitkan hasil signer ke tepi sajian permanen, lalu **membacanya
kembali lewat worker**. Lihat [[04-Signer-Service/S10 - Edge surface]] untuk kenapa lapis itu ada.

## Kenapa verifikasi lewat HTTP, bukan lewat KV

Yang kita janjikan ke dunia adalah URL yang tercetak di dalam ijazah, dan URL itu dilayani worker.
Membaca KV hanya membuktikan "blobnya tersimpan". Worker membuktikan "alamat yang diklik orang
menjawab". Selisih prefiks antara penulis dan pembaca — kelas bug yang menghasilkan 404 atas dokumen
yang ada — cuma kelihatan di jalur kedua, dan justru itu yang menangkap 1101 di bawah.

## Run hijau 28 Sep 2026

```powershell
cd app/signer
$env:EDGE_BASE_URL='https://lencana-edge.hansgunawan775.workers.dev'; $env:AGENT_SLUG='agent-edge'
$env:CLOUDFLARE_API_TOKEN=…; $env:CLOUDFLARE_ACCOUNT_ID=…   # dari luar repo, tidak pernah di argv
npm run publish:edge
```

```
menerbitkan 15 kredensial ke tepi: https://lencana-edge.hansgunawan775.workers.dev
  agen   : agent-edge  controller: https://lencana-edge/…/issuers/agent-edge
  revocation: 15 dipantau, 2 bit menyala, hash 0x168c327e1ef3cf81…
  suspension: 15 dipantau, 1 bit menyala, hash 0x6256f66398be99a7…
  state.json: 7 dokumen, 7 hasil, 1 kursus
  bentuk credentialStatus terlayani: legacy-two-entry=5, single=2
  ok   chain cocok untuk revocation (15 dipantau, 2 bit menyala)
  ok   chain cocok untuk suspension (15 dipantau, 1 bit menyala)

PUBLISH HIJAU — 23/24 rute terbaca benar dari tepi
```

23, bukan 24, dan yang ke-24 bukan rute rusak: `pengantar-defi-2026` adalah kursus demo 21 Sep yang
sudah tidak ada di `MANIFESTS`, jadi dokumen criteria-nya memang tidak bisa diturunkan dari apa pun.
Yang diterbitkan hanya untuk kursus yang masih punya manifest; sisanya dicatat sebagai
`diketahui (bukan rute rusak, keadaan korpus)` — bukan diubah jadi hijau.

## Verdict yang bikin ini bukan sekadar deploy

Setelah tepi hijau, validator pihak ketiga dijalankan terhadap URL tepi, dan kredensialnya dibaca
**dari tepi**, bukan dari laptop:

```json
{"at":"2026-09-28T02:58:42.799Z",
 "credentialHash":"0xd0bce6f402e437e4bcc32ddc3d305c5b6b7079b7c4473f6c5625a8183bf7930e",
 "docUrl":"https://lencana-edge.hansgunawan775.workers.dev/credentials/0xd0bce6f4…",
 "uploadId":"val18368571955412434375.json",
 "issuerDocument":"https://lencana-edge.hansgunawan775.workers.dev/issuers/agent-edge",
 "outcome":"VALID","summary":{"outcome":"VALID","fatals":0,"errors":0,"warnings":0,"exceptions":0,"notRun":0,"totalRun":14,"valid":0},
 "baseUrl":"https://lencana-edge.hansgunawan775.workers.dev"}
```

`outcome: VALID` · 14 pemeriksaan · 0 error · 0 warning · 10/10 pemeriksaan harness. Ini yang
menggantikan klaim 27 Sep yang hostnya sudah mati (`0xfe4f7161…`, `ENOTFOUND` sejak ~07:00 28 Sep).
Klaim yang sama, di host yang tidak ikut mati bersama proses laptop.

## Yang merah duluan, dan itu gunanya

Run pertama: **5/25**. Yang hijau hanya healthz, kedua daftar, dan keduanya cocok dengan chain. Yang
merah `issuer document`, `criteria`, `result` — semuanya `500` dengan body `error-1101` dari Cloudflare.

| dugaan awal (salah) | yang sebenarnya |
|---|---|
| dokumennya tidak ada di KV | ada — terbaca langsung dari KV |
| prefiks KV penulis/pembaca berbeda | tidak — keduanya dari `edgeKeys.js` |
| worker menabrak batas CPU 10 ms | tidak — rute yang jauh lebih berat (daftar + 15 `eth_call`) justru 200 |

Penyebabnya sebaris: tiga cabang itu `return doc ?? notFound(...)` — **objek**, bukan `Response`.
Yang dibungkus `json(...)` selamat. Bentuknya salah, statusnya 500, pesannya disembunyikan CDN, dan
gejalanya mirip data hilang. Perbaikannya `return doc ? json(doc) : notFound(...)`; penjelasannya ada
di [[04-Signer-Service/S10 - Edge surface]].

Satu merah lagi bukan kode kita: asserti pertamaku menuntut `credentialStatus` satu objek untuk
**semua** dokumen, padahal lima dokumen demo terbit sebelum perbaikan itu. Verifikator yang menandai
fakta sejarah sebagai kegagalan akan sonunda kuabaikan, jadi bentuknya sekarang diklasifikasikan
(`single` / `legacy-two-entry`) dan yang lama dilaporkan sebagai ketahuan, bukan sebagai rute rusak.

## Pemeriksaan yang tidak boleh hilang dari harness ini

1. **Tidak ada `unallocated`** — kalau satu hash dipantau tanpa slot, publish berhenti. Menyajikan
   daftar yang kehilangan anggota adalah cara anchor kehilangan artinya.
2. **`matchesChainNow` untuk kedua daftar** — bentuk dokumen yang benar tidak membuktikan isinya masih
   benar.
3. **Dokumen hasil tidak mengandung `"answer"`** — kunci kuis boleh masuk `rubricHash`, tidak boleh
   masuk URL publik.
4. **Baca balik lewat `EDGE_ROUTES`** — rute yang tidak diklik orang tidak terbukti.

**Related:** [[04-Signer-Service/S10 - Edge surface]] · [[09-Testing/T15 - 1EdTech validator]] ·
[[09-Testing/T9 - npm run anchor]] · [[09-Testing/T4 - npm run probe]]
