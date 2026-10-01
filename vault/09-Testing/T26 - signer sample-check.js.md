---
tags: [testing, "T26"]
status: active
updated: 2026-09-30
command: npm run check:samples · npm run check:samples -- --json · npm run specimen
measured: 2026-09-30
result: check:samples **11/0** (2 Okt, sesudah `delisted` dipasang di UI — B123; 9/0 pada 30 Sep) · 26 dokumen di store · 26 terbit di tepi · 17 valid · 7 revoked · 1 expired · 1 delisted (30 Sep: 22 dokumen · 14 valid · 6 revoked; 21 · 13 sebelum kertas uji B104) · specimen 7/0
---

# T26 - signer sample-check.js (hash contoh di antarmuka diadili, bukan diingat)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B100, B102 (✅ ditutup 30 Sep) · **AC:** —

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
   lain: nol halaman = nol pekerjaan = "sukses");
6. **sejak 30 Sep (B102): keempat keadaan wajib punya spesimen.** Sebelumnya alat ini hanya mengadili
   yang *terpasang*, jadi "tidak ada spesimen `expired`/`delisted`" lolos sebagai diam — 5/0 hijau
   dengan dua keadaan kosong. Sekarang empat pemeriksaan tambahan menuntut satu kertas yang 200 di tepi
   dan terbaca keadaan itu di chain; kalau spesimennya hilang, alatnya merah.

Host tepi dibaca dari `/healthz` tepi itu sendiri (`EDGE_BASE_URL` wajib diisi), sama seperti
[[09-Testing/T18 - signer verify-edge.js]]: yang diadili adalah alamat yang tercetak di kertas,
bukan alamat yang ada di kepala kita hari ini.

## Angka yang dicetak 30 Sep malam (sesudah B102)

```
check:samples — 21 dokumen di store · 21 terbit di tepi
  valid 13 · revoked 6 · expired 1 · delisted 1
  yang boleh dipasang ke SAMPLE_HASHES:
    valid     0xd0bce6f402e437e4bcc32ddc3d305c5b6b7079b7c4473f6c5625a8183bf7930e
    revoked   0xda10e69e17b0cb17e13eb539c7ce0a8b4698ce71573687f34f6e230f76a6e70e
    expired   0x202f8edf1a46ee6ed2fb9e99026a2bdcf957e654b786c46213112e5caf0afdcc
    delisted  0xaa379627438fb47b6a6c2a5fefc421d26f3168ce941e82c19a591c773d849c0f
  SAMPLE_HASHES di web/src/main.ts: 3 entri
CONTOH UI HIJAU — 9 pemeriksaan, 0 gagal
```

**2 Okt (B123, D59):** `delisted` dipasang ke `SAMPLE_HASHES` untuk tombol Trust Center yang sebelumnya "Simulate Delisting"
tanpa handler. Run hari itu: `26 dokumen di store · 26 terbit di tepi`, `valid 17 · revoked 7 · expired 1 · delisted 1`,
`SAMPLE_HASHES di web/src/main.ts: 4 entri`, **CONTOH UI HIJAU — 11 pemeriksaan, 0 gagal**. Blok di atas adalah run 30 Sep.

⚠️ **Yang tertulis di sini sebelumnya (29 Sep), dibiarkan terbaca:** `19 dokumen · 13 valid · 6 revoked ·
0 expired · 0 delisted · CONTOH UI HIJAU — 5 pemeriksaan, 0 gagal`. Angka itu benar pada harinya; yang
salah adalah hijaunya — dua keadaan yang dijual UI tidak punya kertas, dan alat tidak memprotes.

## Dua spesimen itu dari mana (B102) — `npm run specimen`

`signer/scripts/specimen.js`. Tanpa `--apply` ia hanya membaca chain; dengan `--apply` ia menjalankan
yang kurang, tiap langkah didahului pembacaan chain (idempoten). **Setiap alamat diturunkan dari label
yang tertulis di berkas itu** (`keccak256(label)` → kunci → alamat), supaya spesimennya bukan artefak
tanpa asal-usul (kelas B49/B75):

| peran | label | alamat / hash |
|---|---|---|
| agen korban (EOA, attester spesimen delisted) | `lencana-b102-sacrificial-agent` | `0x6f1d3Be372517861fF32c8f9858A3b2B58608239` |
| peserta spesimen delisted | `lencana-b102-learner-delisted` | `0x676772A69D166728bE74c169db17077708e47DAF` → hash `0xaa379627…9c0f` |
| peserta spesimen expired | `lencana-b102-learner-expired` | `0x7DBA9F95e801A0AE6509F7aBB922871C9020f9f8` → hash `0x202f8edf…fdcc` |

Transaksi di chain 97, 30 Sep (dicetak run `--apply`, atas izin builder):

| langkah | tx | gas |
|---|---|---|
| `addIssuer(agen korban)` — owner resolver | `0x976576e2643b082ad065a90020f8d76bfce5209542cda68da9955b2fad7beb6a` | 49.769 |
| isi gas agen korban 0,002 tBNB | `0xb98f7d7c627ad0c85cfd82c98dca8b6fe6c7e1f0e3746c5773243b30033e855c` | 21.000 |
| `attest` spesimen delisted — **oleh agen korban**, uid `0x20ec201f…fe06` | dicetak `issue.js` tanpa hash tx | 333.496 |
| `attest` spesimen expired — oleh penerbit biasa `0x8211…F7DE`, uid `0xce484d4a…9fd7`, `expiresAt` 1790774621 (675 detik) | dicetak `issue.js` tanpa hash tx | 333.496 |
| `delistIssuer(agen korban)` — owner resolver | `0x4f0205e4a98b408faf32878a4a3f82f7e5681243416c37f180b228cba84cd7e4` | 47.833 |
| anchor daftar `suspension` yang baru (2 bit) — `npm run anchor` | `0xa928b4360b4a7d5551c8a8b576013f0653f4631eb63140e0ccbdb593bd314125` | 45.869 |

Lalu `npm run publish:edge` → **PUBLISH HIJAU — 68/69** (yang ke-69 kursus yang tidak ada lagi di
katalog, dilaporkan sebagai keadaan korpus), dan sesudah jam chain melewati `expiresAt`:
`npm run specimen` → **SPESIMEN HIJAU — 7 pemeriksaan, 0 gagal**:

- spesimen delisted terbaca `delisted`, attester = agen korban, **`revoked` tetap false** (delisting
  bukan pencabutan — dua hal yang `statusOf` sengaja pisahkan);
- agen korban `isIssuer=false`, `isDelisted=true`;
- spesimen expired terbaca `expired`, dan penerbitnya **masih penerbit sah** (kadaluarsa bukan delisting);
- penerbit kertas sungguhan (`ISSUER_ADDRESS`) tidak tersentuh: `isIssuer=true`, `isDelisted=false`.
  Skrip menolak jalan kalau agen korban sama dengan alamat itu.

**Batas yang harus ikut terbaca:**

- Kunci agen korban **bisa dihitung siapa pun** dari labelnya. Itu aman hanya karena urutannya: label
  baru terbaca publik sesudah `delistIssuer`, dan agen yang didelisting tidak bisa menerbitkan
  (`addIssuer` menolaknya; `relistIssuer` hanya milik owner). **Jangan pernah `relistIssuer` alamat itu.**
  Sisa saldo gasnya bisa diambil orang — memang dibiarkan.
- Kedua spesimen adalah kertas kursus `web3-dasar-2026` dengan bukti dari flag perintah (`cli-flags`,
  88/70), untuk **peserta yang tidak ada**. Mereka menambah korpus 19 → 21; **jangan dikutip sebagai
  jumlah peserta atau kelulusan.** Spesimen expired dicetak dengan `--days 0.0078125`, jadi `validUntil`-nya
  sengaja tidak mengikuti `validDays` penerbit (730) — `issue.js` mencetak peringatannya.
- Satu-satunya cara membuat `expired` adalah menerbitkan lalu menunggu: BAS menolak `expirationTime`
  di masa lalu. Pembacaan sebelum jam lewat **merah** dan itu terekam: `SPESIMEN MERAH — 7 pemeriksaan,
  1 gagal` (`belum lewat: 663 detik lagi`), dan `check:samples` saat itu mencetak `expired — tidak ada`.
- Kontrol negatif alatnya: sebelum `--apply`, `npm run specimen` mencetak **MERAH 7/6**.
- **Yang BELUM dilakukan, sengaja:** tombol "Penerbit Didelisting" dan contoh "kadaluarsa" **belum
  dipasang lagi** di `web/index.html` / `SAMPLE_HASHES`. Itu berkas pemelihara FE (aturan #10) dan
  builder menunda FE. Bahannya sekarang ada — dua hash di atas — dan begitu dipasang, pemeriksaan
  `SAMPLE_HASHES.<label>` alat ini langsung mengadilinya.

## Cara menjalankan ulang

```
cd app/signer
EDGE_BASE_URL=https://lencana-edge.hansgunawan775.workers.dev npm run check:samples
EDGE_BASE_URL=… npm run check:samples -- --json     # untuk mesin/`sync:numbers`
npm run specimen                                     # baca-saja: keadaan kedua spesimen di chain
```

Terkait: [[09-Testing/T25 - web spec-audit-check.ts]], [[09-Testing/T18 - signer verify-edge.js]],
[[09-Testing/T31 - signer identity-check.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] (B100, B102).
