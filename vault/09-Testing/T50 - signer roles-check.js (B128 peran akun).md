---
tags: [testing, "T50"]
status: active
updated: 2026-10-02
command: npm run verify:roles
measured: 2026-10-02
result: PERAN HIJAU — 39 pemeriksaan / 0 gagal (2 Okt, B128; run pertama 39 / 0 hijau, diulang 39 / 0 sesudah baca chain dipangkas jadi dua tahap)
---

# T50 - signer roles-check.js — B128: kursi akun dibaca dari fakta

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B128 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B128 - Peran akun di core]] ·
**Uji peramban:** [[09-Testing/T51 - Uji peramban kursi akun (B128)]] · **Summary:** [[08-Results/B128 - Executive Summary]] ·
**Keputusan:** D63

`signer/scripts/roles-check.js`, dijalankan `npm run verify:roles` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key,
`ISSUER_PRIVATE_KEY`/`ISSUER_ADDRESS`, `RPC_URL`, dan kunci + alamat kedua Agent Owner demo (`AGENT_OWNER_*`, `REVIEWER_OWNER_*`).
Server sendiri di port bebas dengan `LANCENA_ORIGIN=test`; dua alamat anggota sekali-pakai dibuat di dalam harness, dan baris
keanggotaannya **dihapus harness itu sendiri** di bagian F lalu sisanya dihitung ulang dari database (tabel ini tidak diurus
`npm run cleanup`, yang berpusat pada enrollment).

| bagian | yang dibuktikan |
|---|---|
| 0 | `ISSUER_PRIVATE_KEY` adalah kunci `ISSUER_ADDRESS` — kunci yang menandatangani hibah = penerbit yang dikonfigurasi server |
| A | `POST /me/roles`: tanpa pesan → 400; pesan tanpa tanda tangan → 401; tanda tangan sah untuk **records** → 400; tanda tangan kunci lain atas alamat orang → 401; akun baru → 200, **peserta saja** (penerbit `null`, Agent Owner `null`), jawaban untuk alamat yang menandatangani; replay → 401 |
| B | kunci penerbit sendiri → `publisher.via = issuer`, kedua wewenang, institusi dari manifest; **bukan** Agent Owner (D54: penerbit dan agen pihak berbeda) |
| C | `POST /publisher/members`: orang lain mengaku penerbit dengan kuncinya → 401; `issuer` = penerbit tapi tanda tangan kunci lain → 401; kiriman melebihi pesan bertanda tangan (pesan `hire=0`, kiriman `hire=1`) → 400; tanda tangan untuk anggota A dipakai untuk anggota B → 400; pesan `hire=10` tidak lolos sebagai `hire=1` → 400; penerbit menjadikan dirinya anggota → 400; hibah sah → 200 dan replay → 401; `/me/roles` anggota → `via = member`, menunjuk penerbit pemberi, wewenang = yang ditandatangani; akun lain tetap peserta saja; hibah ulang **mengganti** wewenang |
| D | cabut bertanda tangan kunci lain → 401; cabut sah → 200 dengan waktu cabut; sesudahnya kursi penerbit hilang, peserta tetap; cabut kedua → 400 |
| E | lewat HTTP, dibaca dari IdentityRegistry chain 97: pemilik agen penilai → Agent Owner **#2534** (dompet + tarif dari registry), bukan pemilik #2542; pemilik agen pengesah → **#2542**; akun baru tidak memiliki agen |
| F | baris keanggotaan uji dihapus; sisa untuk alamat uji = 0 (kueri ulang) |

```
PERAN HIJAU — 39 pemeriksaan, 0 gagal          (B128, run pertama, 2 Okt)
PERAN HIJAU — 39 pemeriksaan, 0 gagal          (sesudah agentsOwnedBy dua tahap, 2 Okt)
```

**Bentuk pesan tepat, bukan "mengandung".** Versi pertama `grantMember` (ditulis sesi yang sama, belum pernah dijalankan)
memeriksa pesan dengan `includes`, sehingga `hire=10` atau teks tambahan bisa lolos sebagai `hire=1`. Diganti regex utuh
`^lencana-member grant member=<alamat> hire=<0|1> appoint=<0|1> nonce=<hex>$` sebelum harness pertama berjalan; pemeriksaan
`hire=10` di bagian C menjaganya.

Yang tidak diuji di sini: halaman (kartu kursi di Akun, kursi onboarding) — itu [[09-Testing/T51 - Uji peramban kursi akun (B128)]];
login sungguhan; dan aksi anggota (menyewa agen, menunjuk agen pengesah dengan tanda tangan anggota) — itu langkah C2 (B129).
