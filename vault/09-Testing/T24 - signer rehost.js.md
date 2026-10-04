---
tags: [testing, "T24"]
status: active
updated: 2026-09-29
command: npm run rehost (baca-dulu) · npm run rehost -- --apply
measured: 2026-09-29
result: 7 kertas host mati → 7 dipindah, nol transaksi · verify:edge akhirnya 19 dari 19
---

# T24 - signer rehost.js (memindah kertas ke host tetap, tanpa menulis ke chain)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B65-b, B83 · **AC:** — · **Summary:** belum ada (B77 ditahan builder)

## Pertanyaan yang menjawabnya bukan "berapa" tapi "dari mana"

`verify:edge` mencetak **10 dari 17**. Itu angka agregat, dan agregat tidak memberi tahu apa pun yang
bisa dikerjakan: kertas mana, kenapa dia di host itu, dan apakah memperbaikinya butuh transaksi.
`rehost` dipasang di antaranya sebagai **pengukur yang tidak boleh menebak**: mode defaultnya
baca-dulu, dan ia memisahkan tiga keadaan yang kalau digabung akan menghasilkan alat yang melakukan
sesuatu yang tidak seharusnya ia lakukan.

## Yang diukur, dan apa yang keluar (29 Sep)

```
store   : 17 rekaman bertanda tangan · 7 menunjuk host selain lencana-edge.hansgunawan775.workers.dev
agen    : agent-b41@genres-wines-insulation-useful.trycloudflare.com · agent-demo@127.0.0.1:8787 · agent-edge@lencana-edge.hansgunawan775.workers.dev

ringkas : 1 gratis (tanpa gas) · 6 butuh identitas penerbit baru · 0 kunci asing
```

| kelas | jumlah | apa artinya | yang dilakukan alat |
|---|---|---|---|
| `gratis` | 1 — `0x8276e8a7…` | kunci penandatangan sudah `agent-edge` (controller hidup di tepi); yang basi cuma URL di dalam kertas — kertas uji yang kuterbitkan 28 Sep di bawah `127.0.0.1` dan lalu kucabut | pindah: 8 URL ditulis ulang, ditandatangani ulang, **diff daun membuktikan tidak ada isi yang bergeser** |
| `butuh identitas` | 6 — `agent-demo` ×3, `agent-b41` ×3 | `controller` agen mengandung BASE_URL (`src/issuer.js:34`), jadi memindah host = mengubah kalimat "siapa yang menerbitkan ini" pada dokumen yang sudah tercetak | **tidak disentuh.** Tiga jalannya ditulis sebagai B83 dan itu keputusan builder |
| `asing` | 0 | kredensial yang diadopsi dari chain tanpa kunci kita | — |

## Kenapa ini nol gas

`credentialHash = keccak256("vc:", learner, courseId)` (`src/credential.js:31`) — **tidak memuat isi
dokumen**. Jadi kertas yang dipindah hostnya tetap: hash yang sama, uid yang sama, nomor bit yang
sama (44/45), dan hash daftar status yang sudah ter-anchor di BAS tetap hash yang lama. Tidak ada
transaksi, tidak ada kertas baru, tidak ada re-anchor. Diperiksa, bukan diasumsikan:

```
  ok    0x8276e8a7: https://lencana-edge.hansgunawan775.workers.dev/credentials/0x8276e8a7…
        8 URL dipindah · kadaluarsa tidak diubah (2028-09-27T16:42:23Z → 2028-09-27T16:42:23Z) · bit 44/45 tetap · catatan lama dibuang
```

## Tiga penjaga yang membuat alat ini boleh menyentuh dokumen bertanda tangan

1. **`@context` dan `issuer.*` tidak pernah ditulis ulang.** Run pertama menghitung `www.w3.org` dan
   `purl.imsglobal.org` sebagai "host asing" dan menyimpulkan *17 dari 17 kertas basi* — kalimat yang
   benar secara harfiah tapi salah sebagai pengukuran (namespace itu identifier, bukan tempat tinggal
   kita), dan kalau dibiarkan alat itu akan **merusak** `@context` dokumen. `verify:edge` sudah
   memberi angka 10/17 hari sebelumnya; penjaga yang baik seharusnya membuat kedua alat setuju.
2. **Diff daun, bukan kepercayaan.** Setelah tanda tangan baru, tiap path dibandingkan; satu perbedaan
   yang bukan perpindahan origin → kertas tidak disimpan. (Penemuan pertama: `proof.*` ikut
   dibandingkan padahal memang dibuat ulang — itu membandingkan hal yang salah, bukan membuktikan
   hal yang benar. Sekarang kedua sisi tanpa `proof`, dan isi tetap terbukti oleh tanda tangan baru
   yang lolos `verifyDocument`.)
3. **Nomor bit dibaca, tidak dialokasikan.** `alloc.peek()` dipakai, bukan `slot()` — kalau alat ini
   ikut mengalokasikan, ia bisa menulis nomor yang tidak sama dengan yang ter-anchor, dan kegagalan
   itu sunyi plus salah alamat. Ditambah: `statusListIndex` sesudah == sebelum, dan catatan lama di
   store dibuang (`store.forgetCredential`) supaya tidak ada dua record untuk satu hash.

## Regresi yang dijalankan sesudahnya (29 Sep, semua hari yang sama)

| perintah | hasil |
|---|---|
| `npm run verify:edge` | **5 / 0** + terukur **11 dari 17** (sebelumnya 10 dari 17) |
| `npm run publish:edge` | **53 / 54** rute (1 diketahui: `pengantar-defi-2026` tidak ada di `MANIFESTS`) |
| `npm run check` | **94 / 0** |
| `npm run e2e` | **46 / 0** |
| `npm run verify:live-cert` | **35 / 0** |

## Run kedua hari yang sama — `--move-identity --fix-status-shape`, 6 kertas, tetap nol gas

Builder memutuskan B83 ("kalau bisa ya benerin aja"), jadi jalan (b) dipakai: URL identitas
penerbit ikut pindah, kuncinya tidak. Ini yang tercetak:

```
  ok    0x041e5898: …/credentials/0x041e5898…   12 URL dipindah · kadaluarsa tetap · bit 8/9 tetap · catatan lama dibuang
  ok    0xf34bdc45: …/credentials/0xf34bdc45…   12 URL dipindah · kadaluarsa tetap · bit 0/1 tetap · catatan lama dibuang
  ok    0x63b510bd: …/credentials/0x63b510bd…   12 URL dipindah · kadaluarsa tetap · bit 20/21 tetap · catatan lama dibuang
  ok    0x81fc74b6: …/credentials/0x81fc74b6…   12 URL dipindah · kadaluarsa tetap · bit 22/23 tetap · catatan lama dibuang
  ok    0x58537cc3: …/credentials/0x58537cc3…   12 URL dipindah · kadaluarsa tetap · bit 24/25 tetap · catatan lama dibuang
selesai: 5 kertas dipindah, 0 tidak dikerjakan.        (+ 0xfe4f7161 pada run pertama = 6)
```

Lapis yang membedakan ini dari "perbaikan bentuk diam-diam": kelima kertas itu `credentialStatus`-nya
masih **array** (bentuk lama yang ditolak skema OB 3.0 — B68/OI-12). Memindah host tidak boleh
mengubah isi, jadi perubahan bentuk minta bendera sendiri (`--fix-status-shape`), hanya menerima bentuk
yang dikenali (dua entri, revocation + suspension), dan **menolak kalau nomor bitnya tidak sama dengan
alokator**:

```
    bentuk  : credentialStatus array(2) → objek revokasi (index 22); entri suspension dibuang dan disimpan di record sebagai droppedStatusEntries
```

Store setelahnya (diukur, bukan diingat): **17 rekaman · 0 credentialStatus array · 17 satu objek ·
7 di antaranya membawa jejak rehost** (`rehostFrom`, `rehostIdentity`, `droppedStatusEntries`).

## Validator pihak ketiga atas keenamnya — dan harapan yang sekarang datang dari chain

```
  outcome VALID · 14 pemeriksaan · 0 error · 0 warning · 0 fatal        (0x58537cc3, 0x63b510bd, 0x041e5898, 0xfe4f7161)
  outcome FATAL · 1 fatal
    [fatals] Bitstring Status List Validation: Credential has been revoked   (0xf34bdc45, 0x81fc74b6)
```

Dua yang FATAL itu **bukan regresi**: keduanya memang kita cabut sebagai adegan demo, dan
`validator-check.js` sekarang membaca `statusOf` di chain untuk menetapkan harapan — kertas tercabut
dituntut ditolak **dengan sebab yang menyebut status**, bukan diterima. Sebelum perubahan ini skrip
menuntut `VALID` untuk hash apa pun, jadi produk yang bekerja tercetak merah; dan sebab fatalnya tidak
pernah tercetak sama sekali karena hanya keranjang `errors` yang dibaca (`outcome FATAL` dengan
`errors: []`). Sekarang semua kelompok pesan dicetak dan ikut masuk buku besar.

## Gerbang yang kutambahkan karena run ini, bukan karena diminta

| gerbang | sebab ia ada |
|---|---|
| `verify:edge`: `proof.verificationMethod` harus tercantum di `assertionMethod` dokumen penerbit, untuk SETIAP kertas | Setelah `--move-identity`, tidak ada satu pun harness yang menjamin daftar kunci ikut pindah. Kertas tanpa kunci terdaftar = tidak dapat diverifikasi **selamanya** dengan tanda tangan yang tampak utuh. Terukur: agent-edge 11 kertas · agent-b41 3 · agent-demo 3, semuanya ok |
| `publish.js` + `rehost.js` membandingkan **entri** `assertionMethod[].id` (bukan hanya `publicKeyMultibase`) | Versi pertama publish-ku lolos untuk dokumen yang entri kuncinya masih host lama; yang menangkap adalah `serve-probe`, dan itu keberuntungan, bukan gerbang |
| `server.js`: `/issuers/<slug>` disajikan dari `agentIdentity()` | Dua penyaji (tepi & server lokal) untuk satu agen dengan `id` kunci berbeda — verifier yang lewat server kita sendiri akan menolak tanda tangan sah (B84) |
| `serve-probe`: "server berjalan dari kode terbaru" (`startedAt` + `codeStamp` vs mtime `src/`) | Signer yatim dari run kemarin memegang port 8787 dan probe menguji kode lama sambil menyimpulkan perbaikan baru salah (B86). Cap direkam **saat proses mulai**, bukan saat ditanya |

`verify:edge` sesudah semuanya: **8/0** dengan `17 dari 17` pada jam itu; korpus tumbuh lagi dua kertas (`--from-attempts` jalur esai) sehingga ukuran 29 Sep sore adalah **19 dari 19**; `publish:edge` **55/56**;
`serve-probe` **49/0**; `e2e` **46/0**; `verify:live-cert` **35/0**; `verify:db` **70/0** (48/0 sebelum B78(c) dan B104: +2 penjaga view, +20 pengesahan manusia);
`check.js` **112/0** (4 Okt, sesudah E2E penuh T68 menerbitkan tiga kertas lagi — korpus 29; 106/0 pada 1 Okt malam, sesudah E2E penuh T40 — korpus 26; 100/0 sore hari yang sama, sesudah kertas ke-23 terbit lewat `verify:attempts:live` dengan praktik dinilai chain — B121; 98/0 pada 30 Sep malam, sesudah kertas ke-22 terbit lewat rantai pengesahan B104; 96/0 sesudah dua kertas spesimen B102 dan dokumen penerbit keempat; 91/0 siang hari yang sama, sesudah B84(b) menambah 3 pemeriksaan invarian kunci-penerbit; 88/0 pada 29 Sep; 84/0 ketika korpus masih 17 rekaman — lihat **B85** sebelum mengutip angka harness mana pun: jumlahnya mengikuti korpus, dan `npm run check` kini mencetak baris `info` yang merekonstruksinya; turun dari 94
tanpa sebab yang berhasil kutemukan).



**Related:** [[09-Testing/T18 - signer verify-edge.js]] · [[09-Testing/T17 - signer verify-live-cert.js]] ·
[[04-Signer-Service/S10 - Edge surface]]
