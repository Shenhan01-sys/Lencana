---
tags: [signer, results, provenance, api]
status: active
updated: 2026-09-28
---

# S9 - Result document (`GET /results/<courseId>/<credentialHash>`)

Menutup **B44**, dan bagian kedua dari **B45**. Dibangun 28 Sep.

## Kenapa rute ini ada

`credential.js` mencetak, di SETIAP kredensial:

```json
"result": [{ "id": "<baseUrl>/results/<courseId>/<credentialHash>",
             "resultDescription": "<baseUrl>/criteria/<courseId>#scale",
             "value": "92" }]
```

Sampai kemarin keduanya URL kosong. `/criteria` sudah kucocok pada 27 Sep; `/results` adalah bagian yang
tersisa — dan bagian yang lebih menentukan, karena yang dipertanyakan orang bukan "rubriknya apa"
(milik penerbit, sudah dibuka ke peserta) melainkan **"92 ini dihitung dari apa, oleh perangkat apa"**.

Sebelum ini, kalimat itu **dihitung lalu dibuang**: `issue.js:250-257` membangun `method` dan `comment`,
`credential.js` tidak pernah memakainya karena `Result` OB 3.0 = `{achievedLevel, resultDescription,
status, value}` dan tidak punya field untuk metode. Jadi ijazah kita melaporkan angka tanpa asal-usulnya.

## Yang sekarang terbaca publik, dari dokumen yang terbit sungguhan

Hasil nyata dari kredensial `0xfe4f7161…` (yang lolos `vc.1ed.tech`):

```
result  92 · verdict LULUS
method  dihitung dari bukti terhadap rubrik 2a45d0d00bc4; esai "esai-batas-bukti" dinilai
        openai/gpt-oss-120b; penilai mekanis lulus 3 dari 5 tanda sebelum model menilai
mech    3/5 → panjang tulisan ✓ (696/400 kata) · alamat 0x… ✗ · URL yang bisa dibuka ✗ ·
          fungsi/perintah konkret ✓ · menyatakan batas kesimpulannya sendiri ✓
rubric  5 kriteria dengan skor per kriteria (label / score / max / method)
scale   menunjuk /criteria/web3-dasar-2026#scale
```

Dua hal yang sengaja **tidak** ada di dalamnya:

| tidak disajikan | alasannya |
|---|---|
| `answer` (kunci jawaban kuis) | `canonicalPolicy()` memang menghitungnya ke dalam `rubricHash`, tapi dokumen ini publik dan dirujuk setiap ijazah — menerbitkannya = membagikan ujian demi sebuah hash yang sudah terlanjur berkomitmen |
| teks esai peserta | data pribadi. Yang ditampilkan adalah **jumlah kata** yang dipakai tanda mekanis dan skor per kriteria, bukan tulisannya |

Keduanya dijaga oleh pemeriksaan, bukan sekadar komentar di kepala kita: `check.js` dan `serve-probe.js` merah kalau string `"answer"` atau
penanda `essayTextIncluded` berubah menjadi true.

## Bug yang lahir dari rute ini, dan cara ia ditangkap

Versi pertama menulis `` `penilai mekanis ${eg.mechanical}/100` `` — padahal `essayGrading.mechanical` di
store adalah **array lima tanda**, bukan angka. Hasilnya: `penilai mekanis [object Object],[object Object]…`
di URL publik. Ketahuan karena aku membuka responsnya sendiri, bukan karena ada yang menguji; sekarang
`check.js` punya fixture berbentuk asli + assertion "tidak ada `[object Object]` di dokumen hasil", jadi
kelas bug yang sama merah di test, bukan di browser orang.

## Batas yang harus ikut terbaca

Dokumen hasil ini **bukan** bagian dari yang ditandatangani: ia turunan dari state kita dan boleh
bertambah field. Yang terikat tanda tangan adalah kertas kredensialnya — dan `criteria.narrative` kini
menyebut model penilai, sehingga klaim "dinilai oleh <model>" ikut terkunci bersama hasil, tidak bisa
disunting belakangan tanpa membatalkan tanda tangan.

**Related:** [[04-Signer-Service/S8 - Criteria document]] · [[04-Signer-Service/S1 - The credential document]] ·
[[05-Course-Content/K4 - Scoring without the platform deciding]] · [[05-Course-Content/K2 - The issuer manifest and rubricHash]] ·
[[09-Testing/T8 - signer serve-probe.js]]
