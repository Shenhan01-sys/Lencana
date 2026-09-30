---
tags: [testing, "T29"]
status: active
updated: 2026-09-30
command: npm run check:labels
measured: 2026-09-30
result: LABEL HIJAU — 8 pemeriksaan / 0 gagal (terukur ulang 30 Sep sesudah migrasi B112 dan penutupan B112 + B114: 82 marker di 48 ID · 69 baris backlog · 49 tertutup · 4 ID tertutup beralasan TANPA TAG KODE (B43 B71 B74 B76) · lubang 0 · bandel 0 · sisa bentuk lama 0; plus SELF-TEST HIJAU 12 fixture / 0 luput. Angka sebelumnya di halaman ini — 4 pemeriksaan, 73 tag / 42 ID, lalu 78 tag / 45 ID, lalu 80 marker / 47 tertutup — benar pada waktunya dan tidak kuhapus; yang di bawah ini dicetak ulang dari run hari ini.)
---

# T29 - signer label-coverage.js (aturan #18 ditegakkan dua arah)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** aturan #18, B78 · **AC:** —

A9 di `npm run audit` mengadili **konsistensi** tag. Berkas ini mengadili **kelengkapan**:
ID yang ditutup tanpa satu pun tag dan tanpa alasan akan lolos dari A9 selamanya, dan itu membuat
klaim "source code sudah berlabel" jadi angka di chat, bukan keadaan di repo.

| pemeriksaan | maksud |
|---|---|
| ID tertutup punya marker **atau** barisnya menulis `TANPA TAG KODE` | baseline 0 lubang; naik = merah |
| tiap marker cocok dengan status barisnya | baseline 0 bandel |
| `TANPA TAG KODE` yang diumumkan memang benar tidak bertanda | tadinya pemeriksaan ini tautologi (senantiasa benar) — hijau pinjaman, sudah kuganti |
| tidak ada baris TERBUKA yang ditandai `SELESAI` | arah kedua, sama dengan A9 |
| **baru (B112):** tidak ada sisa bentuk lama di berkas kode | migrasi tidak boleh setengah jalan; 21 lokasi notasi tipe bytes32 tidak terlapor karena bahasanya memang bukan marker, bukan karena dikecualikan |
| **baru (B112):** tiap marker duduk di baris komentar | marker di dalam string kode bukan penanda, dan tidak boleh dihitung sebagai penutup |
| **baru (B112):** tidak ada marker tanpa `status=` yang sah | inilah lubang yang dulu **lolos selamanya**: bentuk lama hanya terbaca kalau kebetulan diikuti kata status |
| **baru (B112):** satu ID tidak muncul dua kali di berkas yang sama | dua penanda untuk satu ID di satu berkas adalah undangan untuk memperbarui salah satunya saja |

Terukur 30 Sep pada keadaan akhir hari itu (dicetak `npm run check:labels -- --list`): **82 marker di 48 ID · 69 baris backlog · 49 tertutup · lubang 0 · bandel 0 · sisa bentuk lama 0 → LABEL HIJAU 8/0**, dan `npm run check:labels -- --self-test` → **SELF-TEST HIJAU — 12 fixture, 0 luput**. Empat ID tertutup tanpa marker, semuanya mengumumkan `TANPA TAG KODE` di barisnya: **B43 B71 B74 B76**. Selisihnya dijelaskan, bukan dibiarkan jadi teka-teki: **82 = 78 hasil migrasi + 2 marker B112** (di `label-coverage.js` dan di blok A9 `audit-consistency.js`) **+ 1 marker B114** (di `sync-numbers.js`) **+ 1 marker B105** (di `web/src/main.ts`, sengaja `status=TERBUKA` karena halaman `#/publishers` baru sebagian dari yang dituntut barisnya); **48 ID** = 45 ID lama + B112 + B114 + B105; **49 tertutup** = 46 sebelum ketiganya ditutup, lalu +B112 (Tahap 4), +B114, dan +B84 sesudah invarian kunci-penerbitnya masuk `check.js`. Terukur pagi hari yang sama, sebelum migrasi: 78 tag di 45 ID · 46 tertutup → LABEL HIJAU 4/0.

Angka yang tertulis di halaman ini sebelumnya — `73 tag di 42 ID · 65 baris · 43 tertutup = 39 bertanda + 4 beralasan` — benar pada waktunya, bukan salah hitung; ia jadi basi karena tag baru masuk sesudahnya. Kutulis sebagai koreksi terlihat, bukan kutimpa.

**Koreksi 30 Sep:** angka yang kutulis di halaman ini sebelumnya (47 tertutup / 41 bertanda + 6 beralasan, lalu "37+6", dan "38+2") **semuanya gelembung** — penjaga membaca status dari seluruh baris, sehingga kata `SELESAI` di dalam kalimat counted sebagai baris tertutup. Setelah pembacaan diperbaiki (sel pertama saja) dan `check:labels` dipasang, yang terukur: **43 tertutup · 37 bertanda · 6 beralasan · 0 lubang**, 73 tag di 42 ID. Satu tag juga ternyata bohong dan diluruskan: `penanda B52 = TERBUKA` → `TERBUKA`.
Tergabung ke `npm run sync:numbers` sebagai harness ke-13.

## B112 opsi A — bentuk marker diganti (30 Sep: marker sudah dipindah, penjaga sudah membaca bentuk baru)

Penjaga ini dan A9 selama ini **selamat karena kebetulan**: keduanya mensyaratkan kata `SELESAI|TERBUKA`
sesudah kurung siku, sedangkan pola kurung-siku-B-angka juga dipakai kode kami sendiri sebagai notasi
tipe — terukur **21 lokasi** `[B32]` yang bukan tag (`abi('statusOf', [B32], [BOOL, …])` di `e2e.js`,
`journey.js`, `revoke.js`, `verify-live-cert.js`). Akibatnya "temukan semua tag" tidak bisa dibedakan
dari "temukan array bytes32", dan **kelengkapan tag tidak bisa dituntut alat**. Builder memilih
**opsi A** (ganti marker, bukan hanya pertebal penjaga) pada 30 Sep.

Bentuk barunya: `Lencana-Bnn status=SELESAI|TERBUKA` — token yang tidak mungkin merupakan kode.
Alatnya **`npm run migrate:tags`** (`signer/scripts/tag-migrate.js`), default DRY-RUN, menulis hanya
dengan `--apply`, dan mengganti **satu token** — bukan menulis ulang kalimat: tanggal, isi, ekor
"Buktikan ulang / JANGAN dibalik", prefiks komentar, indentasi, dan CRLF tidak disentuh, supaya
`git diff`-nya terbaca sebagai bukti (aturan #13).

Terukur dari dry-run 30 Sep: `MIGRASI HIJAU — 78 tag di 45 berkas (dry-run, 0 ditulis)`, disapu dari
122 berkas kode terlacak — **identik** dengan pembacaan independen `.qwen/tmp/ukur-tag.mjs`, jadi dua
alat berbeda memberi angka sama. Kontrol negatifnya terbaca dari rencananya sendiri: `e2e.js` dan
`verify-live-cert.js` tidak masuk daftar; `journey.js` 1 tag (bukan 8) dan `revoke.js` 1 (bukan 5)
padahal keduanya penuh `[B32]`.

**Keadaan sekarang (30 Sep, sesudah migrasi dijalankan):** 78 marker di 45 berkas kode **sudah
berbentuk baru**, sisa bentuk lama **0** — tercetak `SUDAH TERMIGRASI` oleh `npm run migrate:tags`,
dan diperiksa ulang setiap run oleh baris "tidak ada sisa bentuk lama" di atas. Pemeriksaan halaman
ini **naik dari 4 jadi 8**, jadi angka di README akar, `signer/README.md`, hub, dan
`Quick-Reference.md` disegarkan dari run hari yang sama, bukan dari ingatan.

**`--self-test` — 12 fixture, 0 luput.** Penjaga yang tidak pernah terbukti bisa merah bukan penjaga,
jadi fixture-nya mengadili fungsi yang sama dengan yang dipakai repo: marker tanpa status **tertangkap**,
bentuk lama **tertangkap**, marker di dalam string kode **ditolak**, marker `SELESAI` pada baris
TERBUKA **jadi bandel**, ID tertutup tanpa marker **jadi lubang**, `TANPA TAG KODE` yang ternyata
bertanda **jadi bohong**, marker ke ID yang tidak punya baris **jadi bandel**, satu ID dua kali di
berkas yang sama **jadi duplikat** — dan dua yang **wajib tidak terlapor**: notasi tipe
`abi('statusOf', [B32], …)` serta preimage `keccak256("lencana-b41-probe-learner")`. Fixture-nya
**dirakit dari potongan string**, tidak pernah ditulis harfiah: bentuk lama yang ditulis lengkap di
berkas ini akan tertangkap pemeriksaannya sendiri, dan penjaga yang merah karena membaca dirinya
sendiri adalah penjaga yang tidak bisa dipakai (persis kejadian A3 dengan frasa terlarang).

**Dua bug milikku sendiri yang tertangkap penjaga ini sebelum dikomit**, keduanya kelas yang sama —
grup tangkapan regex: `ID_TOKEN` menangkap `67` bukan `B67`, sehingga 46 marker tampak menunjuk ID
yang tidak ada (lubang 42, bandel 46); dan bug yang sama persis ada di pola A9 yang baru kutulis.
Yang menangkap bukan mataku, melainkan pemeriksaan ini sendiri. Karena itu juga penjaga wajib
mencocokkan **token utuh case-sensitive**: korpus sudah punya `lencana-b41` sungguhan di
[[Notes/Session-2026-09-27-B41-validator]], dan mencocokkan prefiksnya saja akan melahirkan
positif-palsu berikutnya dari string keccak.

## Kalau kamu mengukur ulang sendiri, dua angka akan terlihat "lebih" — dan itu benar

Sebuah penyapu baca-saja yang **berbeda** dari penjaga ini (dipakai untuk validasi silang, bukan
untuk dipercaya) melaporkan **86** kemunculan token `Lencana-B<angka>` dan **23** kemunculan pola
kurung-siku di berkas kode, padahal marker sungguhan **80** dan notasi tipe yang dikenal **21**.
Selisihnya punya nama, jadi tidak ada yang perlu diduga:

- **86 = 80 marker + 6 contoh di dokumen** (`.md`): aturan #18 di `AGENTS.md`, contoh di
  `WORKFLOW.md`, prosa `Lencana-B110 status=SELESAI` di baris B110 dan di T12, serta **dua** di baris
  B112 (kutipan contoh opsi A dan catatan Tahap 2). Penjaga ini hanya menyapu ekstensi kode
  (`.ts .js .mjs .sol .sql .yml .ps1`), jadi keenamnya tidak pernah dihitung sebagai marker — dan
  memang tidak boleh: contoh di dokumen bukan penanda pekerjaan.
- **23 = 21 notasi tipe bytes32 + 2 sebutan prosa** di komentar `tag-migrate.js` dan berkas penjaga
  ini, yang menjelaskan tabrakan itu. Tidak satu pun diikuti kata status, jadi pemeriksaan "sisa
  bentuk lama" tetap melaporkan **0**. Yang dijaga adalah bentuknya, bukan munculnya kurung siku:
  kalau seseorang suatu hari menulis marker bentuk lama yang sebenarnya di komentar, ia tertangkap.

Inilah alasan validasi silang dipakai dua alat: kalau hanya penjaga ini yang menghitung, angka 80
tidak bisa dibedakan dari angka yang dibuat agar cocok dengan dirinya sendiri.

Terkait: [[09-Testing/T27 - signer cold-store-probe.js]], [[09-Testing/T18 - signer verify-edge.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B78 dan **B112**.
