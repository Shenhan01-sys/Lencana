---
tags: [reference, commands]
status: active
updated: 2026-10-03
---

# Quick Reference

Every line was run against this working copy. The date is when that number was last printed. **If a
command and a page disagree, the run wins.**

> **Cara membaca dua tabel di halaman ini (B117, 30 Sep).** Tabel pertama di bawah adalah **rekaman
> bertanggal** — kolom `last` menyebut hari angkanya dicetak, dan sebagian besar barisnya 28 Sep (mis. web
> probe 59/0, `verify:edge` 5/0 dengan 8 dari 14). Itu bukan angka hari ini dan tidak dijaga alat. **Klaim
> kini** ada di tabel kedua ("Perintah yang ditambahkan 29 Sep") yang dijaga `npm run sync:numbers -- --verify`,
> dan di `09-Testing/numbers.json`: 1 Okt malam (sesudah E2E penuh) web probe ~~88/0~~ · `check` 106/0 · `serve-probe` 50/0 ·
> `verify:edge` 10/0 (26 dari 26) · `verify:live-cert` 47/0 · `e2e` 47/0 *(sore 1 Okt: probe 86/0, `check` 100/0, 23 dari 23,
> `verify:live-cert` 35/0, `e2e` 46/0)* *(30 Sep malam, sebelum kertas uji B121:
> `check` 98/0 dan 22 dari 22; sebelum kertas uji B104: 96/0 dan 21 dari 21)*. (Siang 30 Sep, sebelum
> dua kertas spesimen B102: `check` 91/0 · `serve-probe` 49/0 · `verify:edge` 9/0 dengan 19 dari 19.)
> *(Koreksi 3 Okt: web probe kini **118/0** — dicetak `sync:numbers` 3 Okt; naik ke 92 dan 118 pada 2 Okt lewat B126/B127.
> Baterai yang sama: `check` 106/0 · `serve-probe` 50/0 · `verify:live-cert` 47/0 · `e2e` 47/0 tidak berubah; `verify:edge`
> tak terbaca di baterai — run terpisah 3 Okt: **TEPI MERAH 10 pemeriksaan, 1 gagal**, karena umur state tepi 30,3 jam melewati
> ambang 26 jam, sedang 26 dari 26 kertas tetap terbaca; perbaikannya `npm run publish:edge` oleh builder. Ringkasan baterai:
> baris "baterai" di [[09-Testing/00 - Hub Testing]].)*

| command (from `app/`) | prints | last |
|---|---|---|
| `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` | 104 passed / 0 failed | 28 Sep |
| `cd web && npx tsc --noEmit && npm run build` | clean | 28 Sep |
| `cd web && npm run probe` | 59 / 0 - the page's own `verify.ts`, four verdicts, public chain 97. Sejak 28 Sep memuat `../.env` sendiri (`scripts/load-env.ts`): sebelumnya `npm run probe` di clone bersih memeriksa `0x0000…` di port lokal dan keluar merah sementara README menjanjikan sebuah angka | 28 Sep |
| `cd web && npx tsx scripts/rubric-check.ts` | 17 / 0 - policy and material hash separately | 28 Sep |
| `cd web && npx tsx scripts/inventory.ts` | 7 courses · 15 modules · 46 lessons · 585 minutes (katalog publik; 26 Sep: 2 · 7 · 24 · 412) | 2 Okt |
| `cd signer && node scripts/check.js` | **98 / 0** (30 Sep malam, sesudah kertas uji B104; 96 / 0 sesudah dua kertas spesimen B102; tumbuh bersama korpus yang diawasi — 91/0 siang hari yang sama, 88/0 pada 29 Sep, 76 lebih pagi lagi, 84/0 saat korpus 17 rekaman) | 30 Sep |
| `cd signer && node scripts/serve-probe.js` | 48 / 0 - document route, served bitstring length, every agent in `.keys/` at its own URL (B48), and since 28 Sep the **bit counts are compared with chain state**, not with a hand-maintained `EXPECT_*` list | 28 Sep |
| `cd signer && npm run x402` | 20 / 0 - one payment, two verdicts, settlement + split on chain | 28 Sep |
| `cd signer && npm run anchor -- --dry-run` | **22** watched · revocation **5** bits · suspension **1** bit · both served hashes already anchored; 0 new anchors. Also loads `../.env` itself since 28 Sep | 28 Sep |
| `cd signer && npm run verify:deploy` | green - claims vs chain 97, plus the enforcement parity block (build has `mintBatch`, `CERT_ADDRESS` provably does not) | 28 Sep |
| `cd signer && npm run publish:edge` | **44 / 45** routes read back through the worker; both lists `matchesChainNow` | 28 Sep |
| `cd signer && npm run verify:edge` | 5 / 0 **+ printed measurement: 8 of 14 papers are externally checkable end-to-end** | 28 Sep |
| `cd signer && npm run verify:live-cert` | **35 / 0** on `LIVE_CERT_ADDRESS` — five artefacts checked one by one (not the last ledger row only) | 28 Sep |
| `cd signer && npm run e2e` | **42 / 0** — chain == served list == URL inside the paper == artefact == third-party verdict | 28 Sep |
| `cd signer && npm run journey` | **34 / 0**, 10 stages — the whole participant journey on the core side; 2 surfaces reported as NOT IN CORE rather than passed | 28 Sep |
| `cd signer && npm run validator` | 10 / 0 and `outcome: VALID` from `vc.1ed.tech` — five distinct credentials, all under the durable host | 28 Sep |
| `cd signer && npm run measure:signing` | crypto 133 ms median; full render ~2.0 s (was ~4.4 s) | 27 Sep |
| `powershell -File vault\scripts\sync-vault.ps1` then `check-links.ps1` | `_Auto-Index` + link report — **two counts**: wikilinks AND relative markdown links across every repo markdown file | 28 Sep |
| `... check-mermaid.ps1` · `... check-lang.ps1` · **`... check-paste.ps1`** | `Hazards: 0` · `CJK tokens: 0` · `PASTE HIJAU — 5,587/5,600` (the submission field's ceiling; the artifact crept four past it on 28 Sep with every other gate green) | 28 Sep |

**Before any chain write:** `--evm-version cancun` is mandatory on `forge test` AND `forge script`; the
`data-seed-prebsc-*` endpoints are proven flaky, use the `bscTestnet` alias; faucet money must land on
the address whose **key** is in `.env`; and addresses are read from `broadcast/` or derived in code -
never retyped.

**Related:** [[Glossary]] · [[09-Testing/00 - Hub Testing]] · [[08-Results/P2 - Executive Summary]]

## Perintah yang ditambahkan 29 Sep (dan apa yang dibuktikannya)

| perintah | apa | angka terakhir yang dicetak |
|---|---|---|
| `npm run verify:attempts` / `:live` | satu rantai peserta → rekaman → `issue --from-attempts` → `/results/…` (`:live` menulis 1 attestation testnet); sejak B104 lapis offline juga mengadili "angka model tanpa pengesahan manusia = jangan terbit" | 39/0 offline (1 Okt) *(38/0 sebelum B121, 31/0 sebelum B104)* · live 82/0 (30 Sep malam: satu kertas lewat rantai model → reviewer → penerbit) · live 1 Okt **73 / 4 gagal**: keempatnya hilir dari crash `publish:edge` (exit 134) sesudah kertas `0x372c2518…` terbit — publish diulang 74/75, bagian h diulang terhadap kertas itu 16/16 (T38) · **live 1 Okt malam (E2E penuh): 84/0**, kertas `0x2d90e940…f89b` (T40); catatan lama: · 67/0 live |
| `npm run rehost [-- --apply --move-identity --fix-status-shape]` | memindah kertas ke host tetap tanpa transaksi: URL ditulis ulang + ditandatangani ulang dengan kunci Multikey yang sama | 7 kertas; `verify:edge` 26 dari 26 (1 Okt malam, sesudah E2E penuh; 23 dari 23 sore harinya; 22 dari 22 pada 30 Sep malam sebelum kertas uji B121; 21 dari 21 sebelum kertas uji B104, 19 dari 19 sebelum dua spesimen B102 — `rehost` sendiri tidak dijalankan lagi, yang bertambah korpusnya) |
| `npm run grade:essay` | antrean esai penerbit; angka masuk hanya lewat tanda tangan EOA penerbit (`POST /essay/judgement`) | `verify:db` 70/0 *(48/0 sebelum dua penjaga view B78(c) dan 20 pemeriksaan pengesahan manusia B104; lebih lama lagi 47/0 — basi; baris ini sekarang dijaga `DOC_CLAIMS`, B114)* |
| `npm run audit` | konsistensi proyek: registry tunggal, kalimat terlarang di README/docs, placeholder, dokumen karangan, blokir basi, item hilang dari backlog, tag↔baris, bahasa identifier, angka README | **12 pemeriksaan · 0 TEMUAN** (30 Sep) *(baris ini tadinya menulis "2 TEMUAN (A3 berkas Dave, A6 Vault akar)" — benar pada 29 Sep, basi sesudah A3/A6 ditutup lewat B98/B99. `audit` bukan harness di `numbers.json`, jadi tidak ada gerbang yang bisa menangkapnya; itu dicatat di B114)* |
| `npm run sync:numbers` / `-- --verify` | `vault/09-Testing/numbers.json` = satu sumber angka; `--verify` memarahi halaman vault yang angkanya tidak cocok | **ANGKA HIJAU — 40 klaim halaman diperiksa, 0 tidak cocok** (1 Okt malam; jumlah klaim itu dicetak alatnya sendiri — 25 lalu 26 sebelum B117, 28 sesudah dua klaim `verify:relay` milik B97 didaftarkan, 30 sesudah dua klaim `verify:deposit` milik B90, 32 sesudah dua klaim `verify:agent` milik B118, 34 sesudah dua klaim `verify:agents` milik B119/B120, 36 sesudah dua klaim `verify:praktik` milik B121, 38 sesudah dua klaim `verify:quizkeys` milik B80, dan 40 sesudah dua klaim `verify:privy` milik B82) *(2 Okt: **48 klaim diperiksa, 2 tidak cocok** — keduanya angka `verify:quizkeys` yang merah sampai criteria kursus B126/B127 terbit di tepi; 41 sesudah klaim T45 `verify:records` B124, 42 sesudah T46 `verify:paywall` B125, 43 sesudah T50 `verify:roles` B128, 44 sesudah T52 `verify:publisher` B129, 48 sesudah empat baris QR untuk keempat harness itu, **50** sesudah T54 + baris QR `verify:owner` B130 — merahnya tetap dua angka quizkeys)* *(tadinya tertulis "9/9 harness terurai" — benar saat harnessnya masih sembilan; jumlah harness sengaja tidak kutulis di sini karena tidak ada perintah yang mencetaknya)* |
| `npm run sync:numbers -- --only=<id>` | ulang SATU harness saja untuk mendiagnosis merah (mis. `--only=serveProbe`); angka sebagian tidak masuk JSON — ia menolak menulis `numbers.json` | 1 harness, tanpa menulis JSON |
| `npm run diag:lists` | mengadili perbedaan hash daftar: render vs sajian tepi vs `getTimestamp` BAS | membuktikan B89 bukan soal data |
| `npm run probe:serve` | mengadili server signer yang SEDANG BERJALAN (50 pemeriksaan; 49 sebelum agen keempat B102) — ia TIDAK menyalakan server: `npm run serve` dulu, kalau tidak ia bilang "nyalakan dulu" + cara melepas port per-PID | PROBE SERVE HIJAU — 50, 0 gagal |
| `npm run check:samples` | mengadili tiap nilai `SAMPLE_HASHES` di FE: 200 di tepi DAN status di chain cocok dengan labelnya; sejak B102 juga menuntut **spesimen untuk keempat keadaan** (valid / revoked / expired / delisted) | CONTOH UI HIJAU — 11 pemeriksaan, 0 gagal *(2 Okt, `delisted` dipasang di UI — B123; 9 pada 30 Sep; 5 sebelum B102; korpus 26: 17 valid · 7 revoked · 1 expired · 1 delisted)* |
| `npm run specimen` / `-- --apply` | B102: spesimen `delisted` (agen korban, alamat diturunkan dari label) dan `expired` (masa berlaku 675 detik); tanpa `--apply` hanya membaca chain | SPESIMEN HIJAU — 7 pemeriksaan, 0 gagal |
| `npm run probe:cold` | server signer dengan `.store/` KOSONG — keadaan setiap orang yang datang dari `git clone` (B42/B106) | PROBE COLD HIJAU — 23, 0 gagal |
| `LANCENA_ORIGIN=demo` | setel sebelum `npm run serve` untuk demo; harness menyetel `=test` sendiri (B78) | dibaca balik oleh `verify:db` sebagai pemeriksaan |
| `npm run check:labels` | kelengkapan marker aturan #18: tiap ID tertutup punya marker atau alasan, tiap marker cocok dengan barisnya, tidak ada sisa bentuk lama, marker wajib di baris komentar dan wajib berstatus | LABEL HIJAU — 8 pemeriksaan, 0 gagal |
| `npm run check:identity` | hash dokumen issuer builder vs signer lokal vs tepi harus sama, plus baseUrl host tetap | IDENTITAS HIJAU — 9 pemeriksaan, 0 gagal *(8 sebelum agen keempat B102; lebih lama lagi tertulis 4 — basi tanpa gerbang yang menangkap; B114)* |
| `npm run cleanup` | bersihkan baris tes Postgres dengan bukti; tanpa `--apply` hanya menghitung | CLEANUP HIJAU — 6, 0 gagal |
| `npm run judge-variance` | ulangi penilaian 5x, dua kelas jawaban — bukti penilai punya gigi | substantif spread 0 · kosong 3 · jarak 97,0 |
| `npm run monitor:edge` | alarm eksternal tepi: umur `publishedAt` vs ambang, `matchesChainNow` kedua daftar, `unchecked`, dokumen nyata 200 | AMAN 0 alarm · `--max-age=0` → ALARM |
| `npm run check:spec` / `-- --self-test` | 14 predikat kepatuhan dijalankan atas dokumen yang disajikan tepi; self-test merusak dokumen yang sama dan menuntut barisnya merah | 14 lulus · 0 gagal · self-test 11 merah |
| `npm run verify:relay` | rute relayer `POST /relay` (B97): yang sah diantrekan, yang pasti revert ditolak sebelum gas; server dan store-nya sendiri, siaran mati | RELAY HIJAU — 31 pemeriksaan, 0 gagal |
| `npm run verify:deposit` / `:live` | setoran premi-tenggat (B90): kontrak ter-deploy dibaca dari chain, `policyHash` dari manifest, `issuedAt` dari BAS, penolakan sebelum gas; `:live` menjalankan satu setoran sampai selesai (sekali per label) | DEPOSIT HIJAU — 27 pemeriksaan, 0 gagal · live 38/0 |
| `npm run verify:agent` | identitas agen penilai ERC-8004 (B118, sesudah D54): registry BNB, pemilik = Agent Owner, dompet agen = kunci operasional agen dan **bukan** penerbit, berkas registrasi, halaman verifikasi, gerbang `admit`; baca-saja | AGEN HIJAU — 24 pemeriksaan, 0 gagal *(23 pagi 1 Okt, model lama: dompet agen = attester)* |
| `npm run verify:agents` / `:live` | B119 sewa agen per aktivitas + B120 reviewer agen: tabel harga dari tarif Agent Owner, sewa, penilaian agen dengan label, tagihan, pengesahan agen; `:live` membayar dua tagihan lewat x402 | AGEN SEWA HIJAU — 34 pemeriksaan, 0 gagal · live 40/0 |
| `npm run verify:praktik` / `:live` | B121 core: `/attempts` menolak skor kuis/esai/praktik peserta; `POST /praktik` membaca ulang chain 97 untuk saldo, transfer, `eth_call`, izin token; jawaban salah hanya dibalas nama pemeriksaannya; satu bukti satu peserta; `:live` mengirim satu transfer 0,001 tBNB baru (tanpa `:live` memakai transfer tetap `KNOWN_TX`) | PRAKTIK HIJAU — 32 pemeriksaan, 0 gagal · live 32/0 |
| `npm run verify:quizkeys` / `-- --deployed=<url>` | B80: kunci kuis lengkap di sisi server, `rubricHash` hitungan = terbit = criteria di tepi, bangun bundel web lalu pindai JS + source map (teks `why`, literal `answer`, dengan kontrol positif teks soal), penjaga impor, dan `/grade` membalas pembahasan tanpa indeks jawaban; `--deployed` memindai bundel yang sedang tayang | ~~KUNCI KUIS HIJAU — 30 pemeriksaan, 0 gagal~~ **KUNCI KUIS MERAH — 66 pemeriksaan, 6 gagal** (60 lulus; dicetak `sync:numbers` 3 Okt) *(Koreksi 3 Okt: 30/0 adalah run 1 Okt dengan dua kursus. Merahnya bukan kunci yang bocor ke bundel: dokumen criteria kelas uji B126 dan lima kursus B127 belum terbit di tepi, jadi `rubricHash` = criteria di tepi belum bisa dibuktikan untuk kursus itu — perbaikannya `npm run publish:edge` oleh builder)* · bundel lama Vercel (sebelum deploy ulang) → MERAH 33/2 |
| `npm run verify:privy` / `-- --deployed=<url>` | B82 (D57): login Privy — app secret diuji ke API users Privy (kontrol: secret palsu → 401), token palsu ditolak (lib + HTTP), saringan dompet tertanam, `POST /auth/privy` gagal tertutup tanpa secret (503), ikatan alamat ↔ akun atomik di Postgres + RLS, bundel web: SDK di chunk lambat dan secret 0 kemunculan; `--deployed` memindai bundel yang tayang. Jalur positif (token sah) hanya berjalan kalau app Privy punya akun uji | LOGIN PRIVY HIJAU — 41 pemeriksaan, 0 gagal (termasuk 3 preflight CORS, B122) · jalur positif TIDAK diuji (app belum punya akun uji) |
| `npm run verify:records` | B124: `POST /me/records` hanya untuk pemilik alamat (pesan `lencana-records`), proyeksi tanpa teks esai, peserta lain tidak melihat baris ini | REKAMAN HIJAU — 17 pemeriksaan, 0 gagal |
| `npm run verify:paywall` / `:live` | B125 (D60): kursus berbayar menjawab 402 + syarat x402; bayar = izin token + pesan enroll, penerbit menyiarkan settlement + pembagian; koin uji sekali per alamat per 24 jam | PAYWALL HIJAU — 24 pemeriksaan, 0 gagal |
| `npm run verify:roles` | B128 (D63): kursi akun dari fakta — kunci penerbit, keanggotaan bertanda tangan kunci penerbit, `ownerOf` ERC-8004 | PERAN HIJAU — 39 pemeriksaan, 0 gagal |
| `npm run verify:publisher` | B129 (D64): pengajuan anggota → disetujui kunci penerbit, dasbor penerbit (potongan dari chain, tanpa teks esai), aksi anggota sewa/tunjuk agen | ~~53 pemeriksaan~~ KURSI PENERBIT HIJAU — 57 pemeriksaan, 0 gagal *(3 Okt, sesudah B131: +2 kunci tim dijadikan akun dev sementara, +1 peran pemohon tercatat, +1 bersih-bersih)* |
| `npm run verify:account` | B131 (D66): satu akun nyata satu peran — dipilih sekali bertanda tangan, aksi peran lain ditolak server, peran lama dari rekaman/fakta, akun dev memegang semua kursi | SATU PERAN HIJAU — 50 pemeriksaan, 0 gagal |
| `npm run account:dev -- --list` · `<alamat> [--note "…"] [--off] --apply` | B131: tandai/lepas akun dev (dummy builder) — hanya lewat CLI platform, tidak ada rute HTTP | 2 akun dev (akun dummy 1 dan 2 builder) |
| `npm run verify:authoring` | B133 (D67): anggota berhak susun menyimpan/mengajukan draf bertanda tangan atas hash isi; audit draf; terbit/tolak hanya kunci penerbit; kursus terbit masuk katalog server tanpa kunci kuis, bisa didaftari dan kuisnya dinilai server | SUSUN KURSUS HIJAU — 48 pemeriksaan, 0 gagal |
| `npm run course:publish -- --list [--all]` · `<draftId> [--apply]` · `<draftId> --reject "catatan" --apply` | B133: kunci penerbit memutuskan draf yang diajukan (audit ulang dari isi tersimpan, `rubricHash` + `manifestHash` dihitung dan ikut ditandatangani); kursus terbit dimuat server ≤ 30 detik | — |
| `npm run verify:studio` | B132 (D68): robot agen — 864 kombinasi suku cadang tergambar, gambar statis < 4 KB dan deterministik, rupa bercacat ditolak, templat registrasi menunjuk balik, klaim agen swalayan hanya dari struk di chain, gas hanya untuk Agent Owner yang berhak | BENGKEL AGEN HIJAU — 28 pemeriksaan, 0 gagal |
| `npm run verify:brain` · `verify:brain:live` | B135 (D69): otak agen — prompt penilai satu sumber (= teks 24 Sep, sha256), salinan fixture kalibrasi, aturan kalibrasi, adaptor tujuh provider dengan fetch tiruan, rute otak/antrean/penilaian lewat HTTP; `:live` = kalibrasi sungguhan Groq lewat adaptor peramban (kuota tim, tidak ikut baterai) | OTAK AGEN HIJAU — 60 pemeriksaan, 0 gagal · live 63/0 (substantif 99, kosong 3) |
| `npm run verify:market` | B138 (D70): bursa agen — aturan konflik sewa/tunjuk halaman = aturan server (B120/B129), entri tanpa data peserta, layak-sewa = rute tarif, cache 60 detik + pembatalan sesudah sewa, halaman dan server sepakat atas penolakan sungguhan | BURSA AGEN HIJAU — 23 pemeriksaan, 0 gagal |
| `npm run grant:member -- <alamat> --author` | B133: hak susun kursus (`author=1`) untuk anggota penerbit; hibah tanpa `--author` = author=0 (bentuk pesan B128 tetap sah) | — |
| `npm run verify:owner` | B130 (D65): dasbor Agent Owner hanya untuk alamat yang `ownerOf`-nya memegang agen yang dikenal platform; identitas/dompet/tarif dari registry, sewa/aktivitas/tagihan = hitungan database; gas hanya untuk pemilik agen cetakan platform; dompet kosong sesudah pemindahan = belum layak sewa | AGENT OWNER HIJAU — 32 pemeriksaan, 0 gagal |
| `npm run agent:mint -- --to <alamat> [--tariff 2000] [--apply]` | B130: platform mencetak agen ERC-8004 untuk sebuah akun (register, berkas registrasi, tarif, `transferFrom`, gas) dan mencatatnya di `platform_agents`; dompet agen diisi pemiliknya sendiri dari `#/app/owner` | #2546 (akun uji, T55) · #2547 (akun 2 builder) |
| `npm run grant:member -- --list` · `<alamat> [--hire] [--appoint]` · `--reject` · `--revoke` | B128/B129: keputusan keanggotaan penerbit dengan kunci penerbit (pesan + tanda tangan disimpan) | — |
| `npm run agent:identity [-- --role reviewer] [--apply]` | daftarkan / rawat identitas agen di IdentityRegistry BNB: penilai **#2534**, reviewer **#2542** (pemilik berbeda); dompet, berkas registrasi per peran, tarif dasar | idempoten — run kedua tidak menulis apa pun |
| `npm run admit -- --address 0x… [--apply]` | gerbang penerimaan **penerbit** (D54): kunci penerbit diterima, dompet/pemilik agen ditolak; `--agent-id` ditolak | `SUDAH DITERIMA` untuk penerbit `0x8211…F7DE`; dompet agen `DITOLAK` |
| `npm run verify:relay:live` | sama, dengan `RELAY_BROADCAST=1`: **menulis 1 attestation testnet** dari antrean dan membacanya balik dari chain (attester = agen, saldo agen tetap, tanpa siaran ganda) | RELAY LIVE HIJAU — 17, 0 gagal (30 Sep, 347.059 gas) |
| `npm run sim:deadline` | simulator B90; mengubah bentuk insentif setelah terbukti ladder refund bukan penalti | RUN 2: 5d murah hanya di dunia cepat |
