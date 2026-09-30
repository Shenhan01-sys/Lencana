---
tags: [testing, "T29"]
status: active
updated: 2026-09-30
command: npm run check:labels
measured: 2026-09-30
result: LABEL HIJAU — 4 pemeriksaan / 0 gagal (terukur ulang 30 Sep: 78 tag di 45 ID · 68 baris backlog · 46 tertutup · 4 ID tertutup beralasan TANPA TAG KODE (B43 B71 B74 B76) · lubang 0 · bandel 0. Angka sebelumnya di halaman ini — 73 tag / 42 ID / 43 tertutup — benar pada waktunya dan tidak kuhapus; yang di bawah ini dicetak ulang dari run hari ini.)
---

# T29 - signer label-coverage.js (aturan #18 ditegakkan dua arah)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** aturan #18, B78 · **AC:** —

A9 di `npm run audit` mengadili **konsistensi** tag. Berkas ini mengadili **kelengkapan**:
ID yang ditutup tanpa satu pun tag dan tanpa alasan akan lolos dari A9 selamanya, dan itu membuat
klaim "source code sudah berlabel" jadi angka di chat, bukan keadaan di repo.

| pemeriksaan | maksud |
|---|---|
| ID tertutup punya tag **atau** barisnya menulis `TANPA TAG KODE` | baseline 0 lubang; naik = merah |
| tiap tag cocok dengan status barisnya | baseline 0 bandel |
| `TANPA TAG KODE` yang diumumkan memang benar tidak bertanda | tadinya pemeriksaan ini tautologi (senantiasa benar) — hijau pinjaman, sudah kuganti |
| tidak ada baris TERBUKA yang ditandai `SELESAI` | arah kedua, sama dengan A9 |

Terukur 30 Sep (dicetak `npm run check:labels` hari itu, sesudah tag B42/B54/B67/B78/B84/B105/B110/B111 masuk): **78 tag di 45 ID · 68 baris backlog · 46 tertutup · lubang 0 · bandel 0 → LABEL HIJAU 4/0**. Empat ID tertutup tanpa tag, semuanya mengumumkan `TANPA TAG KODE` di barisnya: **B43 B71 B74 B76**.

Angka yang tertulis di halaman ini sebelumnya — `73 tag di 42 ID · 65 baris · 43 tertutup = 39 bertanda + 4 beralasan` — benar pada waktunya, bukan salah hitung; ia jadi basi karena tag baru masuk sesudahnya. Kutulis sebagai koreksi terlihat, bukan kutimpa.

**Koreksi 30 Sep:** angka yang kutulis di halaman ini sebelumnya (47 tertutup / 41 bertanda + 6 beralasan, lalu "37+6", dan "38+2") **semuanya gelembung** — penjaga membaca status dari seluruh baris, sehingga kata `SELESAI` di dalam kalimat counted sebagai baris tertutup. Setelah pembacaan diperbaiki (sel pertama saja) dan `check:labels` dipasang, yang terukur: **43 tertutup · 37 bertanda · 6 beralasan · 0 lubang**, 73 tag di 42 ID. Satu tag juga ternyata bohong dan diluruskan: `penanda B52 = TERBUKA` → `TERBUKA`.
Tergabung ke `npm run sync:numbers` sebagai harness ke-13.

## B112 opsi A — bentuk marker diganti (Tahap 1/4 selesai 30 Sep, Tahap 2–4 belum)

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

**Keadaan sekarang, supaya halaman ini tidak dibaca lebih maju dari kodenya:** tag di 45 berkas kode
**masih berbentuk lama** `<Bnn> SELESAI|TERBUKA`. Yang sudah ada baru alatnya. Bentuk baru dipakai di
kode pada Tahap 2, dan pada saat itu halaman ini bertambah pemeriksaan (sisa bentuk lama = TEMUAN,
marker wajib di baris komentar, `--self-test` dengan fixture merah) sehingga **angka 4 pemeriksaan di
atas akan naik** — README akar, `signer/README.md`, hub ini, dan `Quick-Reference.md` ikut diperbarui
dari run hari itu, bukan dari ingatan. Satu catatan desain yang ketahuan saat mengukur: korpus sudah
punya `lencana-b41` sungguhan di dalam preimage `keccak256("lencana-b41-probe-learner")`
([[Notes/Session-2026-09-27-B41-validator]]), jadi penjaga wajib mencocokkan **token utuh
case-sensitive**, bukan prefiksnya — kalau tidak, positif-palsu berikutnya lahir dari string keccak.

Terkait: [[09-Testing/T27 - signer cold-store-probe.js]], [[09-Testing/T18 - signer verify-edge.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B78 dan **B112**.
