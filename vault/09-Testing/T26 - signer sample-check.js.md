---
tags: [testing, "T26"]
status: active
updated: 2026-09-29
command: npm run check:samples · npm run check:samples -- --json
measured: 2026-09-29
result: check:samples **5/0** · 19 dokumen di store · 19 terbit di tepi · 13 valid · 6 revoked · 0 expired · 0 delisted
---

# T26 - signer sample-check.js (hash contoh di antarmuka diadili, bukan diingat)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B100, B102 · **AC:** —

## Kenapa perintah ini lahir

Halaman verifier punya tombol cepat: *valid*, *revoked*, *delisted*, *format salah*. Nilai-nilainya
tulis tangan di `web/src/main.ts` (`SAMPLE_HASHES`). Diukur 29 Sep, dua dari tiga yang pertama
menunjuk dokumen yang **tidak pernah kita terbitkan ke tepi**:

| sampel | di chain | `GET /credentials/<hash>` di tepi | yang dilihat tamu |
|---|---|---|---|
| `0x0b95c83b…` ("valid") | sah, tidak dicabut | **404** | halaman kosong persis di tombol yang menjual bukti |
| `0x4d0ffdf3…` ("delisted") | ada | **404** | sama |
| `0x1111…11` ("format salah") | — | 404 | bentuknya justru hash 32 byte yang **sah**, jadi jawabannya "tidak ditemukan", bukan "format salah" |

"Sah di chain" tidak sama dengan "bisa dibaca publik". Pembeda kita justru yang kedua.

## Yang dilakukan alat ini

1. baca `listCredentials()` (store signer), bukan daftar yang dihafal;
2. untuk tiap dokumen: `GET <edge>/credentials/<hash>` **dan** `statusOf(hash)` di resolver —
   dua keadaan yang berbeda, dan yang kedua dibaca dari chain, bukan dari catatan;
3. pilih yang boleh dipakai UI per status (`valid` / `revoked` / `expired` / `delisted`);
4. **mengadili `SAMPLE_HASHES` yang tertulis di `web/src/main.ts`**: tiap entri harus 200 di tepi dan
   statusnya di chain harus cocok dengan labelnya; `format` justru wajib BUKAN hash 32 byte yang sah;
5. kalau blok `SAMPLE_HASHES` tidak terbaca → diperiksa sebagai GAGAL, bukan dilewati. Gerbang yang
   tidak menemukan bahan ujinya tidak boleh melapor bersih (pelajaran dari alat yang sama di repo
   lain: nol halaman = nol pekerjaan = "sukses").

Host tepi dibaca dari `/healthz` tepi itu sendiri (`EDGE_BASE_URL` wajib diisi), sama seperti
[[09-Testing/T18 - signer verify-edge.js]]: yang diadili adalah alamat yang tercetak di kertas,
bukan alamat yang ada di kepala kita hari ini.

## Angka yang dicetak hari ini (29 Sep)

```
check:samples — 19 dokumen di store · 19 terbit di tepi
  valid 13 · revoked 6 · expired 0 · delisted 0
  yang boleh dipasang ke SAMPLE_HASHES: valid 0xd0bce6f4… · revoked 0xda10e69e… · expired — · delisted —
  SAMPLE_HASHES di web/src/main.ts: 3 entri
CONTOH UI HIJAU — 5 pemeriksaan, 0 gagal
```

`expired` dan `delisted` **nol**: tidak ada satu pun kredensial kita yang bisa menunjukkan keadaan
itu. Karena tidak ada spesimennya, tombol "Penerbit Didelisting" dicabut dari UI (B102) — bukan
diisi dokumen lain yang tidak cocok dengan labelnya. Resep spesimen yang jujur ada di baris B102.

## Cara menjalankan ulang

```
cd app/signer
EDGE_BASE_URL=https://lencana-edge.hansgunawan775.workers.dev npm run check:samples
EDGE_BASE_URL=… npm run check:samples -- --json     # untuk mesin/`sync:numbers`
```

Terkait: [[09-Testing/T25 - web spec-audit-check.ts]], [[09-Testing/T18 - signer verify-edge.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] (B100, B102).
