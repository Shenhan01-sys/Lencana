---
tags: [testing, "T25"]
status: active
updated: 2026-09-29
command: npm run check:spec · npm run check:spec -- --self-test
measured: 2026-09-29
result: **14/0** lulus terhadap dokumen yang terbit · self-test 11 baris merah · dokumen 404 → 0 lulus / 14 tidak terbaca
---

# T25 - web spec-audit-check.ts (matriks kepatuhan yang dihitung, bukan ditulis)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B100, B69/OI-13 · **AC:** — 

## Yang dibuang lebih dulu

Sebelum berkas ini ada, tab "Specification Compliance" di halaman laporan **tidak menguji apa pun**:

- `render.ts` menulis `status: 'PASS'` sebagai teks pada 14 barisnya, dan header menjual
  `14 / 14 ASSERTIONS PASSED`;
- yang dinilai adalah `generateCanonicalJsonLd()` — dokumen yang **dikarang di browser**, dengan
  `proofValue` tetap yang tidak pernah ditandatangani siapa pun, `statusListIndex: "14"` yang bukan
  milik kredensial mana pun, dan `value: "93"` yang ditulis tangan;
- tombol "Re-run Spec Verification" hanya menyalakan kelas CSS baris demi baris lalu menulis
  `✓ 14/14 Uji Lolos (12ms)` — angka 12 ms itu karangan, tidak ada satu pun uji yang berjalan;
- `index.html` menyimpan salinan statis 14 baris hijau yang sama, jadi klaimnya bahkan tidak perlu
  dokumen untuk muncul.

Ini bukan hiasan yang jelek: halaman ini adalah halaman yang menjual "buktinya bisa dibuka siapa
pun". Tabel yang mengaku 14/14 tanpa menghitung adalah satu-satunya baris yang bisa membuat juri
mencabut kepercayaan itu — dan dia tidak perlu alat untuk membuktikannya, cukup `curl` satu dokumen.

## Bentuk sekarang

Satu implementer, dua tempat pakai: `web/src/specAudit.ts`.

| bagian | apa |
|---|---|
| `SPEC_ROWS` | 14 asersi (id, clauses, teks EN/ID) — teks sama seperti dulu, yang berubah hanya statusnya sekarang **dihasilkan** |
| `evaluateSpecAssertions(doc, cred, edge)` | predikat per baris atas dokumen yang diambil; `null` berarti "tidak bisa disimpulkan di sini", bukan lulus |
| `specMatrixHtml(lang)` / `specRowsHtml(lang)` | satu sumber markup untuk tab laporan **dan** tabel statis di `index.html`; tak ada lagi PASS yang ditulis di HTML |
| `runSpecAudit(root, opts)` | ambil dokumen → nilai → isi lencana + pill + kasa dokumen; kalau dokumen tidak teraih, semua baris "tidak terbaca" |
| `scripts/spec-audit-check.ts` | harness Node: menjalankan penghitung yang sama terhadap tepi nyata, plus kontrol negatif |

Dua baris berubah tafsir, dan itu disengaja karena **dokumen kami sendiri tidak memenuhi teks
lamanya** (diukur 29 Sep lewat `npm run check:samples`): `credentialStatus` kita satu entri
(revocation), bukan dua. Baris 10 sekarang menguji yang benar-benar bisa dibaca orang — daftar
yang dirujuk dokumen menjawab 200, dan tepi juga menyajikan daftar suspension (200) — sementara
jumlah entri yang sebenarnya ditulis di kolom "observed", tidak disembunyikan. Baris 14 (penambatan
hash di BAS) tidak pura-pura diverifikasi browser: ia membaca laporan `/healthz` tepi kami dan
menyebutkan cakupannya apa adanya.

## Angka yang dicetak hari ini (29 Sep)

```
npm run check:spec            → hasil: 14 lulus · 0 gagal · 0 tidak terbaca · 4021 ms · 14 asersi
npm run check:spec -- --self-test → dokumen yang sama dirusak 6 cara → 11 baris merah
npm run check:spec -- 0x0b95c83b… → bahan uji : TIDAK ADA (HTTP 404) → 0 lulus · 14 tidak terbaca
```

Tiga hal yang berbeda dan ketiganya dibutuhkan: **hijau terhadap artefak nyata**, **merah ketika
dokumennya dirusak** (kontrol negatif — penilaian yang tidak pernah bisa salah tidak membuktikan
apa pun), dan **kosong ketika tidak ada bahan uji** (gagal tertutup, bukan hijau karena default).

## Cara menjalankan ulang

```
cd app/web
npm run check:spec                # default: 0x06be529b… (valid, 200 di tepi)
npm run check:spec -- 0x<hash>    # hash lain; lihat [[09-Testing/T26 - signer sample-check.js]] untuk yang boleh dipakai
npm run check:spec -- --self-test # kontrol negatif
```

Exit code: `1` kalau ada baris GAGAL atau kalau self-test tidak menangkap kerusakan; `2` hanya untuk
argumen yang tidak bisa dipakai. Halaman ini tidak lagi menyembunyikan keduanya.

Terkait: [[09-Testing/T18 - signer verify-edge.js]], [[09-Testing/T26 - signer sample-check.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] (B94, B100, B101).
