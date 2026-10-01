---
tags: [testing, "T22"]
status: active
updated: 2026-10-01
command: npm run verify:attempts (hitung-saja) + npm run verify:attempts:live (Postgres + chain 97)
measured: 2026-10-01 (offline dan live)
result: 39/0 offline (1 Okt; 38/0 sebelum B121, 31/0 sebelum B104) · live 1 Okt 73 / 4 gagal — keempatnya hilir dari crash publish:edge sesudah kertas terbit, bagian h diulang 16/16 · 82/0 live (30 Sep malam, lewat rantai pengesahan B104; 67/0 pada 29 Sep) · verify:edge 10/0 (30 Sep)
---

# T22 - signer attempts-check.js (satu alur: peserta → rekaman → kertas → dokumen hasil)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B62, B62-b, B72, **B104**, **B121** di
[[07-Backlog/03 - Findings and Tasks 2026-09-26|status dan tugas terbaru]] · **Bar:**
[[00-Overview/11 - Product Bar]] 3, 4, 6, 7, 8 · **Pasangan:** [[09-Testing/T21 - signer db-probe.js]] ·
[[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]] · **Ringkas:** belum ada berkasnya (B77 ditahan builder)

> **1 Okt — B121 (praktik dinilai chain).** Lapis hitung-saja **38 → 39**: satu fixture baru — baris
> praktik laporan peserta (komponen mekanis, bentuk yang dulu ditulis `POST /attempts`) **tidak** mengisi
> slot praktik dan catatannya menyebut B121; dua fixture lama yang mengisi slot kini membawa komponen
> `graded_by: 'chain'`. Lapis `--live` mengubah satu langkah: praktik tidak lagi dikirim lewat
> `/attempts` (yang kini 400) tapi lewat `POST /praktik` lesson `praktik-eth-call` — tiga `eth_call`
> dibaca harness dengan ABI-nya sendiri, server membaca ulang. Dua run live hari itu:
> 1. **Merah palsu, tanpa kertas:** server yatim 30 Sep di port 8795 dijawab sebagai server baru
>    (`freePort` menganggap `/healthz` yang lambat = port kosong) → `/praktik` 404, `/attempts` praktik
>    201, `issue` berhenti "bukti belum lengkap". Diperbaiki dengan `signer/src/ports.js` (uji bind).
> 2. **73 / 4 gagal, kertas terbit:** `0x372c2518a3bd7aa19ffe45b1e3f6c23b9abe06d172c7574547057159112efd38`
>    (peserta uji `0xAbCA6C091e0797DB920dC744F904d260C3dEED2d`). Hijau semua sampai `issue`, termasuk
>    `jalur lama POST /attempts untuk praktik -> 400` dan `usaha praktik tercatat lewat HTTP, dinilai chain
>    (POST /praktik praktik-eth-call -> 201, 3 pemeriksaan cocok)`. Empat merah: `publish:edge` keluar
>    **134** ("Native stack trace") dan tiga pemeriksaan tepi yang bergantung padanya. `publish:edge` diulang
>    langsung → **PUBLISH HIJAU 74/75**; bagian h diulang dengan predikat yang sama terhadap kertas itu →
>    **16/16** (+1 pemeriksaan B121: komponen praktik di dokumen hasil yang terhidang `gradedBy chain`).
>    Run ketiga sengaja **tidak** dijalankan: ia menerbitkan kertas uji lagi hanya untuk mengganti angka
>    yang sudah dibuktikan dari kertas yang sama. Enrollment peserta itu ditandai `origin=demo` (aturan B104).

> **30 Sep malam, sesudah catatan di bawah ini ditulis — lapis `--live` DIJALANKAN (builder minta diuji
> langsung): 82 / 0.** Esai di lapis live sekarang lewat rantai tiga lapis, bukan lagi dinilai penerbit
> tanpa model. Selisih 15 dari 67 = tujuh pemeriksaan hitung-saja B104 + delapan bersih di lapis live
> (dua pemeriksaan lama "dinilai penerbit" diganti tujuh, ditambah tiga di ujung). Yang menyangkut rantainya:
>
> ```
>   ok    usulan MODEL ditandatangani penerbit -> 200, skor 80, needsReview=true
>   ok    angka model tanpa pengesahan TIDAK menggerakkan gerbang
>   ok    issue --from-attempts DITOLAK karena esai bernilai model belum disahkan manusia (bukan karena pemanggilan salah)
>   ok    dan penolakan itu terjadi SEBELUM gas: tidak ada attestation untuk peserta ini
>   ok    penerbit menunjuk reviewer 0xa1C4F96d… -> 200
>   ok    reviewer mengesahkan dengan penyesuaian -> 200: usulan 80 -> akhir 100
>   ok    dokumen hasil di tepi: esai = angka reviewer (100), bukan usulan model (80)
>   ok    dokumen hasil di tepi menyebut pengesahnya: reviewer, keputusan adjusted, usulan, angka akhir
>   ok    komponen esai di dokumen hasil graded_by human, dan model pengusulnya tetap tercatat
> ```
>
> Kertasnya:
> `0x1045d03c5404f5627e70ac3d3e8a84570854a847a9d839ff9d4ffb71b5280655`, peserta uji
> `0x864F2eCA53DC6489487f3628FBe687Cd73a832C9`, reviewer `0xa1C4F96df0DbfD225c4004B31481e21e410aa5e9`
> (= `keccak256("lencana-b104-live-reviewer")`). Dibaca sekali lagi di luar harness, langsung dari
> `…/results/web3-dasar-2026/0x1045d03c…`: `result 100 LULUS`, `essayScore 100`,
> `reviews[0].decision = adjusted`, `proposed 80`, `finalScore 100`. **Yang tetap harus dibaca
> bersama angka ini:** "model" di sini usulan harness (`harness:proposal-80pct`) dan reviewernya kunci
> turunan label — yang terbukti mekanismenya, bukan keberadaan mentor. *(1 Okt, D53: reviewer memang
> tidak harus manusia — boleh agen AI; B120.)* Kalimat "lapis `--live` tidak
> kujalankan ulang" di catatan berikut adalah keadaan satu jam sebelumnya, dibiarkan terbaca.

> **30 Sep malam — B104.** Lapis hitung-saja naik **31 → 38**: tujuh pemeriksaan baru di blok "AI
> menilai → manusia mengesahkan → penerbit menerbitkan". Usulan model tanpa pengesahan → penurunan
> bukti **ditolak**; `rejected` → ditolak; usaha terbaik yang belum disahkan **tidak** diganti usaha
> lama yang lebih jelek; `adjusted` → angka yang diturunkan adalah angka reviewer; provenan dan dokumen
> hasil menyebut reviewernya; esai yang dinilai penerbit tanpa model tetap jalan tanpa pengesahan
> kedua. Dua fixture lama ("peserta lengkap" dan "esai dinilai penuh") memakai `judge_model`, jadi
> keduanya sekarang membawa pengesahan `approved` — tanpa itu mereka ditolak, dan memang begitu
> aturannya. Sisi HTTP + Postgres nyata rantai ini ada di [[09-Testing/T21 - signer db-probe.js]]
> (70/0). **Lapis `--live` tidak kujalankan ulang**: ia menerbitkan satu kertas dan menambah korpus;
> jalur esainya di sana dinilai penerbit tanpa model, jadi tidak melewati pengesahan. Angka 67/0 di
> bawah adalah pembacaan 29 Sep, bukan bukti bahwa rantai tiga lapis pernah menerbitkan kertas.

## Kenapa harness ini ada

Dua klaim yang selama ini berdiri terpisah:

1. *"Setiap angka di kertas punya alamat aslinya"* — tapi `issue.js` masih menerima angkanya dari
   perintah, jadi alamat itu menunjuk ke tangan operator, bukan ke baris usaha.
2. *"State belajar hidup di Postgres"* — tapi halaman belajarnya masih menyimpan sendiri, dan yang
   menulis ke DB adalah skrip tes yang memanggil fungsi internal, bukan HTTP.

Yang membuktikan keduanya **bersama** adalah satu alur nyata: peserta enroll → progres per lesson →
kuis dinilai server → penerbit terbitkan dari rekaman → dokumen hasil menghidangkan `attempt_hash`
yang cocok dengan baris di Postgres. Itu harness ini. Tidak ada yang mengira klaim (1) benar hanya
karena `POST /attempts` sudah ada — hash yang tersimpan tapi tidak dibaca penerbit tidak mengubah
apa pun di kertas.

## Command

```powershell
cd app/signer
npm run verify:attempts          # HITUNG-SAJA: tanpa DB, tanpa chain, tanpa gas
npm run verify:attempts:live     # MENULIS: Postgres + 1 attestation + publish:edge di 97
```

`--live` berhenti dengan `exit 2` kalau `EDGE_BASE_URL` (https) atau kredensial Cloudflare tidak
ada — itu D47/B51 yang ditegakkan di dalam tooling, bukan cuma ditulis di vault. Alasannya nyata dan
terjadi di run pertama harness ini sendiri (lihat bagian terakhir).

## Lapis hitung-saja — 25 / 0

Menguji `src/fromAttempts.js` sebagai fungsi murni terhadap manifest palsu + manifest asli, dan
`src/results.js` untuk bentuk dokumennya:

```
  ok    tidak ada usaha -> ditolak, bukan angka 0
  ok    kuis tanpa attempt_components DITOLAK (kolom score tidak boleh jadi masukan rubrik)
  ok    kuis = rata-rata berbobot per lesson (100/50+60/50 -> 80; 80)
  ok    esai = rata-rata berbobot komponennya (75)
  ok    esai memakai komponen graded_by=model, bukan tanda mekanisnya
  ok    usaha kind=ujian TIDAK masuk rubrik dan dilaporkan sebagai tak terslot (bukan dibuang diam-diam)
  ok    peserta yang cuma punya usaha tak terslot ditolak dengan sebab yang menyebut kind-nya
  ok    usaha terbaik yang dipakai, dan itu tercatat di provenan (attempt_no 2)
  ok    usaha verdict=incomplete tidak dihitung (belum dinilai != nol)
  ok    total dari rekaman == total dari angka yang sama di jalur CLI
  ok    peserta lengkap pada manifest asli -> bukti lengkap, verdict LULUS
  ok    baris satu kuis saja belum cukup: computeScore masih menuntut semuanya
  ok    blok attempts menyebut attempt_hash yang sama dengan yang di kertas
  ok    paper jalur CLI lama tetap terbaca dan mengaku cli-flags
  ok    rekaman lama TANPA blok attempts sama sekali tidak menghasilkan JSON rusak
```

Yang dijaga di sini bukan aritmetika, tapi **satu angka satu jalan masuk**: kalau `--from-attempts`
diisi dari kolom `score`, satu nilai punya dua asal dan kertasnya tetap terlihat sah. Karena itu
"usaha tanpa komponen" ditolak, bukan diambil dari kolom.

## Lapis live — 55 / 0 (run 28 Sep, peserta uji 0xAC4087f7D6936c781f9Ed00fc45B996CAd8E6E28)

```
  ok    server signer naik di http://127.0.0.1:8795 (lapis HTTP)
  ok    POST /enroll (kiriman klien, TANPA lessons_total) -> 200 dan baris dibuat
  ok    sebelum ada progres, all_lessons_done bukan true (false)
  ok    issue --from-attempts DITOLAK sebelum gerbang selesai (exit != 0, dan bukan karena pemanggilannya salah)
  ok    penolakannya menyebut gerbang, bukan hal lain
  ok    tidak ada attestation baru yang tercipta oleh penolakan ini
  ok    --from-attempts + --quiz DITOLAK sebelum apa pun dibaca (exit 2, sebab: dua jalan masuk)
  ok    POST /progress lompat locked -> completed ditolak 422 lewat HTTP
  ok    19 lesson × 3 langkah lewat HTTP diterima semua (57 POST)
  ok    semua lesson selesai: 19/19, all_lessons_done=true
  ok    penyebut "selesai" dihitung server dari katalog (19 = 19 lesson manifest)
  ok    setiap kuis yang dinilai server tersimpan dengan komponen per soal (4 kuis)
  ok    tak ada usaha yang masuk rubrik tanpa rubricHash penerbit
  ok    attempt_hash terbaca == hasil hitung ulang dari barisnya
  ok    issue --from-attempts selesai (exit 0)
  ok    publish:edge jalan (dokumen terbit ikut naik ke KV)
  ok    https://lencana-edge.hansgunawan775.workers.dev/results/... menghidangkan dokumen (bukan 404)
  ok    kertasnya sendiri ikut terhidang dari host yang sama
  ok    id dokumen menunjuk host publik, bukan 127.0.0.1 (B51)
  ok    result[0].id menunjuk dokumen hasil yang barusan dibaca
  ok    dokumen hasil memuat attempt_hash peserta yang sebenarnya
  ok    rekaman yang tercantum cocok jumlah barisnya di Postgres
  ok    gerbang yang tertulis di dokumen cocok dengan view course_gates
  ok    hasil di dokumen hasil == hasil di kertas
  ok    tidak ada teks/kunci jawaban peserta di dokumen hasil
  ok    rubrik di dokumen hasil == rubrik yang ikut dihash di setiap attempt peserta
  ok    angka yang sama keluar dari computeScore terhadap rekaman (tidak ada jalur kedua)

55 pemeriksaan / 0 gagal
  credential   : 0xd1dcb1ff9463cc0a918b3a70813df00fb88996f73d773612e2dacb806fa32d9a
  dokumen      : https://lencana-edge.hansgunawan775.workers.dev/credentials/0xd1dcb1ff…
  rekaman usaha: 6 baris, hash 0x17fd93d3, 0x971bc356, 0xd1f5780b, 0x3d460152, 0xc971fefd, 0x0ee070c7
```

Kertas itu lalu diperiksa pihak ketiga: `npm run validator -- --hash 0xd1dcb1ff… --record` →
**10/10, `outcome VALID`, 14 pemeriksaan, 0 error / 0 warning** (28 Sep, tercatat di
`09-Testing/validator-runs.jsonl`). Regresi yang dijalankan hari yang sama: `check.js` **94/0**,
`verify:db` **70/0** (30 Sep malam: +2 penjaga view B78(c) → 50, lalu +20 pengesahan manusia B104; 48/0 sebelumnya), `probe:serve` **49/0**, `npm run probe` (web) **73/0** — segarkan dari `npm run sync:numbers`.

## Yang dibuktikan, dalam satu kalimat per baris

- **B62** — angka di dokumen hasil bisa diturunkan dari baris usaha, dan alamatnya (`attempt_hash`)
  tercetak di kertas yang dibaca orang lewat URL yang sudah dirujuk `result[0].id`.
- **B62-b** — tidak ada dua jalan masuk: `--from-attempts` menolak `--quiz/--essay-score/--essay/
  --lesson/--no-praktik` dengan `exit 2` SEBELUM apa pun dibaca, dan komponen yang tersimpan yang
  masuk `computeScore`.
- **Bar 6 (dua gerbang)** — `all_lessons_done` dan `best_score >= passMark` dibaca terpisah, `NULL`
  berarti belum selesai, dan keduanya harus lewat sebelum gas bergerak. Yang terukur: penolakan
  pertama tidak meninggalkan attestation (`attestationOf(hash)` tetap nol).
- **B72** — alur peserta terjadi lewat HTTP dengan server yang sama (`/enroll`, `/progress` GET+POST,
  `/grade`, `/attempts`), bukan lewat fungsi internal proses.

## Yang TIDAK dibuktikan

- **Kuis tidak bisa dicurangi.** Kunci jawaban tetap terbundel ke browser (`web/src/manifest.ts`
  memuat `answer`). `/grade` menghapus *peserta melaporkan angkanya*, bukan *peserta membaca
  kuncinya*. (B80)
- **Angka esai/praktik di run ini masih laporan klien** (`POST /attempts`). Run memakai jalur itu
  karena penerbit belum punya antrean penilaian untuk keduanya (B81). Yang berubah hari ini hanya
  kuis.
- Bukan penerbitan peserta sungguhan: pesertanya kunci yang diturunkan di proses tes, dan kertasnya
  berlabel uji. Residunya (baris Postgres + kertas 97) tercatat di B78/B75, tidak dihapus diam-diam.
- Tidak menguji dua usaha bersamaan, multi-instance signer, atau pemulihan identitas lintas perangkat.

## Tiga cacat yang ditemukan harness ini atas dirinya sendiri

1. **`--learner` lupa dikirim** pada pemanggilan pertama → `issue` keluar karena baris *usage*, dan
   dua pemeriksaan "ditolak" malah **hijau karena alasan yang salah**. Perbaikannya bukan menambah
   argumen saja: sekarang setiap pemeriksaan penolakan wajib menegaskan `!/pakai: npm run issue/`.
   Run berikutnya terbukti menangkap pemanggilan yang salah (`--course` hilang saat refactor
   pemanggil), yaitu persis kegunaan guard itu.
2. **Menerbitkan di bawah `http://127.0.0.1:8787`** karena `BASE_URL` bawaan `issue.js`. Kertasnya
   sah di chain dan uid-nya terbaca, tapi `id`-nya menunjuk mesin saya — pelanggaran B51/D47 yang
   dilakukan tooling kita sendiri. Yang terjadi: kertas `0x8276e8a7…` **dicabut** (1 tx, gas 75.532,
   `revoked=true` dibaca ulang dari chain), dan harness sekarang menolak jalan tanpa
   `EDGE_BASE_URL` https + kredensial tepi.
3. **Proses tidak pernah keluar** sesudah ringkasan tercetak: server anak di-spawn lewat `npm`
   (cangkang shell), `child.kill()` hanya merobohkan cangkangnya, dan node grandchild menahan pipe
   stdout terbuka → perintah mati karena timeout 10 menit, bukan karena merah. Sekarang `taskkill /T`
   + `process.exit()`.

Ketiganya adalah kelas kesalahan yang sama: **harness yang hijau belum tentu menguji yang ia kira.**
Maka penolakan diuji sampai sebabnya, dan setiap klaim di halaman ini punya baris keluaran di atas.

**Related:** [[09-Testing/T21 - signer db-probe.js]] · [[09-Testing/T20 - signer journey.js]] ·
[[09-Testing/T19 - signer e2e.js]] · [[09-Testing/T15 - 1EdTech validator]] ·
[[00-Overview/11 - Product Bar]]
