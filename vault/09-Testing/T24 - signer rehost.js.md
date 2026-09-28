---
tags: [testing, "T24"]
status: active
updated: 2026-09-29
command: npm run rehost (baca-dulu) · npm run rehost -- --apply
measured: 2026-09-29
result: 7 kertas host mati terklasifikasi · 1 dipindah tanpa gas · 6 menunggu keputusan (B83)
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

## Yang TIDAK dibuktikan halaman ini

- Tidak ada satu pun dari 6 kertas `butuh identitas` yang jadi terbaca. Angkanya naik 10 → 11, bukan
  → 17, dan itu memang hasil yang benar untuk alat yang tidak boleh memutuskan identitas penerbit.
- Bukan pencabutan: kertas `0x8276e8a7…` yang dipindah **tetap revoked** — rehost tidak mengubah
  status, dan memang tidak boleh.
- Tidak menguji apakah validator pihak ketiga masih berkata `VALID` untuk kertas yang dipindah (ia
  revoked, jadi jawabannya akan "tercabut", bukan "valid" — itu pekerjaan B83 kalau korpusnya dipilih ulang).

**Related:** [[09-Testing/T18 - signer verify-edge.js]] · [[09-Testing/T17 - signer verify-live-cert.js]] ·
[[04-Signer-Service/S10 - Edge surface]]
