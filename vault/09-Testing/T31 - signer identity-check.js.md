---
tags: [testing, "T31"]
status: active
updated: 2026-09-30
command: npm run check:identity
measured: 2026-09-30
result: IDENTITAS HIJAU — 9 pemeriksaan / 0 gagal
---

# T31 - signer identity-check.js (satu sumber identitas penerbit, tiga pembacaan)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B84, B41, B105 · **AC:** —

## Yang diadili

Dokumen issuer hidup di tiga tempat: **dibangun** `issuer.js`, **disajikan signer lokal**, dan
**tersimpan di KV tepi** — alamat terakhir inilah yang dibakar ke `proof.verificationMethod` setiap
kertas kita, jadi kalau ketiganya menyimpang, verifier asing mengambil kunci yang bukan pembubuh
tanda tangan di kertas itu.

| pemeriksaan | apa yang gagal kalau menyimpang |
|---|---|
| hash dokumen builder = signer lokal = tepi | kode berubah tapi KV belum di-`publish:edge` (atau sebaliknya) |
| `baseUrl` host tetap, bukan tunnel/loopback | kelas kecelakaan B41: kertas terbit di bawah `trycloudflare` yang kemudian mati |
| kunci di catatan `.keys/` termuat EKSAK di dokumen tepi | salah satu dari id/controller/publicKeyMultibase bergeser |
| dokumen builder memakai kunci berkas yang sama | builder dan kunci berjalan sendiri-sendiri |

## Terukur 30 Sep

· builder / signer lokal / tepi: hash **identik** `25495c4988aaf722`
· `baseUrl` = `https://lencana-edge.hansgunawan775.workers.dev` (host tetap)
· `IDENTITAS HIJAU — 9 pemeriksaan, 0 gagal` (30 Sep malam; **8** siang hari yang sama — bertambah satu
  karena B102 menambah agen keempat, `agent-spesimen`, dan tiap agen yang dirujuk kertas terbit diadili sendiri)
· dokumen penerbit SEMUA agen yang dirujuk kertas terbit (agent-b41, agent-demo, agent-edge, agent-spesimen) bersih dari host mati
· catatan kunci lokal (4 agen) bersih dari host mati — ini yang dulu bikin B41 bisa terjadi

## Cara menjalankan

`cd app/signer && npm run check:identity` (baca-saja: HTTP ke signer lokal + tepi; tanpa transaksi)

## Teraungi satu kebohongan alat

Tiga versinya merah palsu sebelum benar: (1) menganggap catatan `.keys/` adalah dokumen issuer
(hashnya memang tidak akan pernah sama — yang benar: ia harus TERMUAT di dokumen), (2) memakai
`loadKey()` padahal field `id`/`publicKeyMultibase` ada di catatan `listAgents()`, (3) membandingkan
`publicKeyMultibase` lewat potongan 24 karakter, yang bisa hijau walau sisanya berbeda.
Semuanya dibandingkan **eksak** sekarang.

Terkait: [[09-Testing/T26 - signer sample-check.js]], [[09-Testing/T18 - signer verify-edge.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B84.
