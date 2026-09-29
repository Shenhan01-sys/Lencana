---
tags: [testing, "T22"]
status: active
updated: 2026-09-28
command: npm run verify:attempts (hitung-saja) + npm run verify:attempts:live (Postgres + chain 97)
measured: 2026-09-29
result: 31/0 offline · 67/0 live · verify:edge 8/0 (29 Sep)
---

# T22 - signer attempts-check.js (satu alur: peserta → rekaman → kertas → dokumen hasil)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B62, B62-b, B72 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26|status dan tugas terbaru]] · **Bar:**
[[00-Overview/11 - Product Bar]] 3, 4, 6, 7 · **Ringkas:** belum ada berkasnya (B77 ditahan builder)

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
`verify:db` **47/0**, `probe:serve` **49/0**, `npm run probe` (web) **73/0** — segarkan dari `npm run sync:numbers`.

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
