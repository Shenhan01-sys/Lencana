---
tags: [testing, "T18"]
command: npm run verify:edge
measured: 2026-10-03 (run terpisah; di baterai sync:numbers tercatat tak terbaca); isi halaman di bawah adalah run 2026-09-28
result: TEPI MERAH — 10 checks / 1 failed (3 Okt) karena umur state tepi 30,3 jam melewati ambang 26 jam, perbaikannya npm run publish:edge oleh builder; 26 dari 26 kertas tetap terbaca · koreksi 3 Okt, nilai lama yang tadinya tertulis di sini — 5 checks / 0 failed + satu angka yang tidak enak dibaca (28 Sep)
updated: 2026-10-03
---

# T18 - signer verify-edge.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/03 - Findings and Tasks 2026-09-26]] B51, B52

## Beda harness ini dengan `publish:edge`

`publish:edge` membuktikan "yang baruku terbitkan sampai ke pembaca". Ia TIDAK bisa menjawab
**"ada yang belum kuterbitkan sama sekali"**, dan justru itu cara kegagalan yang paling diam:
`npm run issue` mencetak kertas dengan URL tepi di dalamnya, kita lupa `publish`, dan kertas itu keluar
dengan alamat yang menjawab 404. Tidak ada tanda tangan yang rusak, tidak ada bit yang meleset.

Harness ini juga tidak berhenti di "dokumennya 200". Yang diperiksa adalah **URL yang dicetak di
dalam kertas**: `proof.verificationMethod`, `credentialStatus.statusListCredential`,
`achievement.criteria.id`, `result[0].id`, `issuer.id`. Sebuah kredensial yang tersaji tapi menunjuk
daftar yang belum tersaji adalah klaim yang bisa dibantah satu klik oleh juri yang sedang iseng.

## Run 28 Sep — 5 / 0, dan satu baris terukur

```
  store   : 7 rekaman, 7 dengan dokumen bertanda tangan
  tepi    : publish 2026-09-28T03:25:00Z · 7 dokumen, 7 hasil, 1 kursus
  chain   : 15 hash dipantau · revocation cocok=true · suspension cocok=true
  ok    tepi mengklaim jumlah dokumen sama dengan store
  ok    kedua daftar status masih cocok dengan chain saat ini

  kertas per host yang dicetak di dalamnya:
     3 kertas -> 127.0.0.1:8787
     3 kertas -> genres-wines-insulation-useful.trycloudflare.com
     1 kertas -> lencana-edge.hansgunawan775.workers.dev

  terukur : 1 dari 7 kertas dapat diperiksa orang sampai tuntas tanpa laptop kami
            3 kertas menunjuk 127.0.0.1:8787 — hanya hidup di mesin yang menjalankannya — bagi pembaca lain ini mati
            3 kertas menunjuk genres-wines-insulation-useful.trycloudflare.com — host itu MATI
  ok    tepi menyajikan semua kertas yang menunjuk dirinya, dan tidak ada yang setengah terkirim
  ok    daftar revocation: tersaji dan segelnya masih tercatat di BAS (0x6c2270…)
  ok    daftar suspension: tersaji dan segelnya masih tercatat di BAS (0x6c2270…)

TEPI HIJAU — 5 pemeriksaan, 0 gagal
```

## Angka yang harus dibaca sebagai jawaban, bukan sebagai hiasan

**Mekanismenya selesai; korpusnya kertas lama.** Enam dari tujuh ijazah yang ada di store menunjuk host
yang tidak bisa dibuka orang lain — tiga loopback, tiga tunnel yang sudah ditarik. Yang satu (
`0xd0bce6f4…`, terbit 28 Sep di bawah tepi) bisa diikuti seluruh URL-nya sampai BAS. Ini persis B51,
diukur dan bukan dikisahkan, dan ini juga yang membuat **B52** bukan lagi "perindahan alamat"
melainkan **menerbitkan ulang korpus di bawah identitas tepi** — lihat **D46** dan
[[09-Testing/T17 - signer verify-live-cert.js]] untuk berapa harga itu.

## Kenapa `127.0.0.1` tidak kunyatakan "MASIH MENJAWAB"

Probe pertama melabeli loopback sebagai host yang hidup — benar secara teknis, karena serverku sendiri
sedang jalan di port itu, dan menyesatkan secara total: pembaca lain melihat koneksi gagal. Jadi
loopback diberi labelnya sendiri. harness yang berbohong dengan kalimat yang benar adalah harness yang
akan kupercayai pada saat yang salah.

## Kenapa baris "1 dari 7" TIDAK membuat harness ini merah

Kertas yang menunjuk host lain tidak bisa disembuhkan oleh `publish` — URL-nya tertulis di dalam
dokumen yang sudah bertanda tangan; obatnya hanya kertas baru. Pemeriksaan yang permanen merah adalah
pemeriksaan yang pada akhirnya akan kuabaikan, dan itu persis yang kita kritik di LMS orang lain. Yang
bisa kita sembuhkan (rute hilang, daftar basi, jumlah dokumen tidak sama dengan store) tetap merah.

**Related:** [[09-Testing/T16 - npm run publish edge]] · [[04-Signer-Service/S10 - Edge surface]] ·
[[09-Testing/T15 - 1EdTech validator]] · [[09-Testing/T17 - signer verify-live-cert.js]]
