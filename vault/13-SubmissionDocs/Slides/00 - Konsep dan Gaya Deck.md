---
tags: [slides, deck, B175, design]
status: draft — revisi gaya ilustratif 7 Okt, menunggu builder
updated: 2026-10-07
---

# 00 - Konsep dan Gaya Deck (pitch Lencana, maks 11 slide)

**Backlog:** B175 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Video pasangannya:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] · **Teks formulir:** [[00-Overview/08 - Submission Copy]] · **Modul:** [[Module-Guides/13 - SubmissionDocs]]

Permintaan builder 7 Okt: *"kita disuruh buat ppt … 1 slide = 1 md file … maksimal 11 slides + 1 md file yang mengatur
context dan konsep design style-nya (samakan dengan FE Lencana, cuma lebih immersive + motionful)"*. Berkas ini = hub
deck: konteks, sistem visual, sistem gerak, aturan klaim, dan peta dokumen 11 slide.

**Revisi gaya 7 Okt.** Builder: *"texture-nya terlalu realistis … buat yang lebih ilustratif seperti UI FE pada website;
realistis menuntut bentuk yang begitu-begitu aja, kalau ilustratif bisa bikin apa aja sesuai imajinasi dan visualisasi
informasi yang diinginkan."* Seluruh deck pindah dari benda realistis (lilin, logam, kaca, kamera foto produk, tangkapan
layar miring 3D) ke **ilustrasi datar bergaya FE Lencana**: bahasa gambar yang sama dengan sabuk Admin
(`web/src/pages/admin-objects.ts`) dan sabuk Essays (`web/src/pages/essay-belt.ts`). Daftar ganti per benda ada di §2c.

## 1. Konteks

| hal | isi |
|---|---|
| acara | **Indonesia Web3 Hackathon 2026** — track *Consumer Apps* (· *AI Agents*), on BNB Chain (`README.md:24`) |
| penonton | juri: membaca cepat, menguji klaim, sebagian membuka repo. Bahasa slide **Inggris** (sama dengan video dan README) |
| durasi bicara | ±4 menit (±20–25 dtk per slide). Catatan pembicara di tiap berkas ditulis untuk tempo itu |
| satu kalimat | *Lencana turns a finished micro-course into a credential anyone can check for themselves — without taking our word for it.* |
| benang merah | **satu lencana, satu perjalanan** — sama dengan video: sertifikat palsu → pecah → menjadi tanda Lencana → sabuk benda (buku → tiket → kertas → stempel → medali → koin) → diverifikasi siapa pun |
| yang kita jual | bukan "sertifikat NFT", tapi **jalur penerbitan kredensial yang bisa diaudit publik + verifikasi pihak ketiga** (`00-Overview/01 - Briefing.md`) |

## 2. Sistem visual — ilustrasi datar, satu keluarga dengan FE

### 2a. Gaya: "SOLID" seperti sabuk Admin

Acuannya kepala `web/src/pages/admin-line.css`: *warna datar palet Lencana, tanpa gradient halus, tanpa glow, tanpa kartu
pembungkus; satu-satunya "gradient" adalah garis belang sabuk (hentian keras).*

- **Bentuk:** geometri sederhana — persegi bersudut 2–4 px, lingkaran, poligon, garis tebal berujung bulat. Tulisan di
  dalam benda digambar sebagai **bilah abu** (`#5d6672`), seperti kertas di baki esai; yang dibaca juri hanya label.
- **Volume tanpa tekstur:** tiap benda memakai **tiga nada datar** dari satu warna (gelap · utama · terang), pola
  `web/src/robot.ts`: emas `#a37a00 · #f0b90b · #ffe08a`. Tepi 1–2 px `#3a414c` atau `#848e9c`. Bayangan = elips
  atau blok datar `#0f1216` di bawah benda, tanpa blur. Kilap = satu potongan warna terang bersudut tegas.
- **Lantai:** benda berdiri di satu garis dasar `#2b313a` atau di sabuk belang (`#1e2329`, tepi `#3a414c`, belang
  `#2b313a` 12 px) — persis sabuk FE.
- **Data menjadi bentuk** (aturan sabuk Admin: *"the number of objects is the number in the data"*): 90/10 = tinggi isi
  toples, 14 pemeriksaan = 14 kotak, 48 tes = 48 sel. Karena ilustrasi, apa pun boleh digambar untuk menjelaskan —
  **asal angkanya dari sumber bertanggal** (§5).
- **UI sebagai ilustrasi:** komponen FE digambar ulang sederhana (kolom input, tombol emas, chip, tab, kartu verdict);
  hanya elemen yang sedang dibicarakan yang berteks, sisanya bilah abu (*skeleton*). Bukan tangkapan layar.
- **Cincin fokus:** garis tepi datar 3 px warna status (emas = perhatikan, hijau = sah, merah = dicabut, jingga =
  usulan), sudut membulat, **tanpa glow**.

### 2b. Token (tidak ada warna di luar daftar ini — Law 7 FE Doctrine)

Sumber: `web/src/style.css` (`:root`) dan konstanta `C` di `web/src/pages/admin-objects.ts:17`.

| peran | token | hex |
|---|---|---|
| latar slide | `--bg-app` | `#0b0e11` |
| bidang / kartu / lapis | `--bg-card` · `--bg-input` · `--bg-card-elevated` | `#181a20` · `#1e2329` · `#2b313a` |
| garis benda · bayangan | `line2` · `bg` | `#3a414c` · `#0f1216` |
| isi benda (kertas, logam, bilah teks) | `paper` · `sub` · `steel` · `mute` | `#cfd4dc` · `#b7bdc6` · `#5d6672` · `#848e9c` |
| aksen utama + dua nadanya | `--bnb-gold` · gelap · terang | `#f0b90b` · `#a37a00` · `#ffe08a` |
| sah / lulus | `--status-ok` | `#0ecb81` |
| dicabut / tolak | `--status-bad` | `#f6465d` |
| usulan / menunggu / penerbit didelisting | `amber` | `#ff9f1a` |
| teks | `--text-main` · `--text-sub` · `--text-muted` | `#eaecef` · `#b7bdc6` · `#848e9c` |
| sertifikat generik (bukan milik Lencana, slide 02) | krem (video S1) | `#f3eee2` |

- **Huruf:** **Outfit** 800–900 untuk judul (tracking −0,03 em), 400–600 untuk isi; **JetBrains Mono** untuk angka,
  hash, alamat, label teknis, dan *kicker* (HURUF BESAR, tracking 0,14 em, emas). Angka = konten: selalu mono.
- **Pola judul:** dua baris, satu kata berwarna emas dengan bilah garis bawah emas (sama dengan judul kinetik video):
  `Signed. *Anchored*.`
- **Kanvas:** 16:9, 1920×1080, margin aman 96 px, grid 12 kolom. Judul selalu di kiri atas (x 110), benda utama di
  kanan/tengah — pola yang sama dengan video supaya deck dan video terasa satu keluarga.
- **Latar:** datar `#0b0e11`; kedalaman dari satu–dua bidang geometris besar `#181a20` (lingkaran atau kisi garis 1 px)
  di belakang benda. Tidak ada bokeh, vinyet, atau cahaya.
- **Motif berulang:** **sabuk benda** dari dasbor Admin (FE11/B172) dan Essays (B174) + **koin/medali emas datar**.
  Setiap slide punya paling tidak satu benda dari keluarga ini.
- **Anti-kartu (Law 2):** tidak ada dinding kartu berisi paragraf. Isi = benda yang melakukan sesuatu + label pendek.

### 2c. Ganti realistis → ilustratif

| dulu (realistis) | sekarang (ilustratif) | slide |
|---|---|---|
| pecahan kertas + bokeh emas + pantulan | poligon krem datar, bidang geometris samar, bayangan datar | 01 |
| jendela kaca *Edit PDF*, kursor mengilap | popover gaya FE (kolom input `#1e2329`, caret emas), panah kursor datar | 02 |
| garis sirkuit bercahaya | garis putus-putus datar + ikon amplop | 02 |
| segel lilin emas | stempel rosette emas datar (tiga nada) | 03 |
| bingkai browser 3D miring + tangkapan layar asli | jendela UI datar yang digambar ulang, hanya elemen yang dibicarakan | 04, 08 |
| klip `essays-belt.mp4` + cincin dari `focus.json` | sabuk esai digambar ulang dari SVG FE (`essay-belt.ts`, `robot.ts`) | 05 |
| motion sertifikat asli + kamera foto produk | sertifikat ilustrasi: cincin bobot menggambar dirinya, skor menghitung | 06 |
| bola titik "BNB Chain" | blok datar berantai berlabel `BNB Chain · testnet` | 06, 09, 10 |
| koin 3D bergerigi + kilau menyapu | koin datar tiga nada; putar = memipih (`scaleX`), tepi = pita gelap | 07 |
| kabel bercahaya + tabung kaca | pipa belang datar + dua toples dari benda `jars()` FE | 09 |
| gauge berjarum + printer struk | bilah sel uji: satu sel per tes, terisi hijau | 10 |
| layar bergetar, glow, pantulan | benda *squash* sendiri, tepi datar, bayangan datar | semua |

**Dilarang di slide:** foto, tekstur (kertas, logam, lilin, kaca, kayu), gradient halus, glow/neon, bokeh, pantulan,
blur/kedalaman ruang, kamera 3D/perspektif, bevel/emboss, tangkapan layar sebagai visual utama.

**Tangkapan layar asli** (bukti bahwa produknya hidup) hanya boleh sebagai **sisipan kecil opsional**: ≤ 25% lebar
slide, bingkai datar 8 px `#2b313a`, tegak (tanpa miring atau pantulan), label mono `LIVE SCREEN · testnet`. Ilustrasi
selalu jadi benda utama.

## 3. Sistem gerak — kartun datar, punya maksud

Tiga lapis gerak di setiap slide (FE Doctrine §5), dengan kosakata ilustrasi, bukan kamera:

1. **Masuk** — bertahap (stagger 60–80 ms); benda *pop* dengan overshoot (skala 0 → 1,08 → 1), garis **menggambar
   dirinya** (*path draw*), angka menghitung naik.
2. **Terus-menerus** — belang sabuk berjalan, benda melompat antar stasiun, stempel menekan, koin jatuh: keyframes yang
   sudah ada di `web/src/pages/admin-line.css` (`ln-belt` 1,4 dtk, `ln-hopx` 3,4 dtk, `ln-press` 2,8 dtk, `ln-fall`
   2,2 dtk), jadi deck bergerak persis seperti produknya. Slide tidak pernah benar-benar diam.
3. **Pindah slide** — **Morph** (PowerPoint) pada bentuk yang sama antar slide (medali 06 → koin 07, sabuk 04 → 05,
   kata emas judul); bentuk datar justru paling mulus di Morph. Pergantian babak: **wipe lingkaran emas** datar
   (01→02, 03→04, 08→09). Kata kunci: **blok warna penuh** (slam) maksimal 2 per detik — aturan fotosensitif yang sama
   dengan video (AC-B173#8).

Benturan = **squash & stretch** pada bendanya (memipih ±15% lalu memantul), bukan layar bergetar. Micro-beat per slide
satu saja (Law 5): stempel menekan, koin memantul balik, angka menghitung naik, kartu verdict membalik.

**Versi tanpa gerak:** setiap slide harus tetap terbaca sebagai gambar diam (untuk PDF / juri yang mematikan animasi).
Status selalu **kata + ikon + warna**, bukan warna saja. Kontras teks ≥ 4,5:1.

## 4. Peta metafora (Law 3 — tiap slide metafora berbeda)

| # | slide | benda inti (kata benda · kata kerja · hubungan) |
|---|---|---|
| 01 | Cover | kepingan poligon · berkumpul · menjadi tanda Lencana di atas sabuk Admin |
| 02 | Problem | sertifikat generik · diedit lewat popover · tiga salinan dikocok ("mana yang palsu?") · amplop menunggu |
| 03 | The proof layer | stempel segel · rubrik + nilai jadi satu lembar; blok berantai · chip status menyala; pintu · terbuka tanpa kunci |
| 04 | Learner journey | sabuk · amplop → buku → tiket → kertas; jendela UI datar di tiap stasiun |
| 05 | Grading you can audit | robot pengusul · mengusulkan 98 · robot peninjau memegang kunci kedua · meja stempel |
| 06 | Signed & anchored | sertifikat ilustrasi · cincin menggambar diri · gerbang saring hanya meloloskan hash ke blok |
| 07 | Not just any NFT | koin datar · berputar memipih · tarikan transfer memantul · celah cetak menolak status buruk |
| 08 | Verify from one link | satu bilah URL · diketik · kartu verdict membalik sah ↔ dicabut · 14 kotak terisi |
| 09 | Money on chain | koin · meluncur di pipa · terbelah 90/10 ke dua toples, garis batas 25% |
| 10 | Proof it runs | bilah sel uji · terisi hijau sel demi sel · kotak batas jujur |
| 11 | Live now | kartu penutup · QR bersiku emas · sabuk Admin berbaris di bawah logo |

## 5. Aturan klaim (wajib, sama dengan video)

- Setiap kalimat slide tunduk pada [[10-Contributors/Claims-Cheat-Sheet]]; sumber per slide ada di bagian "Sumber" tiap berkas.
- **Label wajib terlihat:** "BNB Chain testnet (chain 97)", "demo publisher (fictional)", "test token (LDC-demo)".
- **Jangan pernah:** *certified / compatible / conformant (1EdTech)*, *tamper-proof / unforgeable*, *trustless*,
  *on-chain diploma / stored on-chain*, *human-checked / mentor*, *reputation*, *production-ready*, *mainnet*,
  *marketplace*, *legally valid*, *cannot be changed* (yang benar: *not quietly*).
- Angka hanya yang **dicetak perintah dengan tanggalnya** (aturan vault #1); semua angka di deck ini bertanggal 6–7 Okt.
  Ilustrasi yang menghitung bentuk (sel, kotak, toples) ikut aturan ini: jumlah bentuk = angka bersumber, bukan hiasan.

## 6. Cara membangun (saran)

- **PowerPoint** (paling kaya gerak): pasang font Outfit + JetBrains Mono (Google Fonts) lalu *embed fonts*. Gambar dengan
  **Shapes** (persegi, lingkaran, *freeform*) memakai warna §2b, atau impor SVG lalu **Graphics Format → Convert to
  Shape** supaya tiap bagian bisa dianimasikan sendiri. Animasi: *Grow/Shrink* + *Bounce* untuk pop, *Wipe* untuk garis
  menggambar diri, *Motion Path* untuk lompatan di sabuk, *Stretch* untuk koin memipih. Transisi **Morph**: beri nama
  objek yang sama di dua slide dengan awalan `!!` (mis. `!!coin`) supaya PowerPoint memasangkannya.
- **Google Slides** tidak punya Morph: ekspor gerak sebagai GIF/MP4 loop pendek, transisi *Dissolve*.
- **Gambar datar siap pakai — dari kode FE, gayanya sama persis** (diekspor sebagai `.svg`; skrip ekspornya belum ada):

| benda | sumber | dipakai di |
|---|---|---|
| tujuh benda sabuk Admin: rak buku, gerbang tiket, meja kertas, robot + papan, meja stempel, perisai lencana, pipa + toples | `web/src/pages/admin-objects.ts:122` `drawObject()` — SVG 180×190, lantai y = 150 | 01, 04, 09, 11 |
| benda kecil yang melompat: buku, tiket, kertas, kertas bernilai, kertas berstempel, koin | `admin-objects.ts:144` `HOP` · `web/src/pages/essay-belt.ts:82` | 01, 04, 05, 11 |
| sabuk esai: baki, robot pengusul, meja stempel, tong | `web/src/pages/essay-belt.ts:92` | 05 |
| robot agen penilai (rupa dari berkas registrasinya) | `web/src/robot.ts:70` `robotSvg()` | 05, 09 |
| cincin bobot nilai + garis masa berlaku | halaman sertifikat `web/src/pages/certificate-view.ts` (digambar ulang datar) | 06 |
| QR situs | `vault/Video-Workspace/remotion/src/data/qr.json` | 01, 11 |
| tangkapan layar asli (sisipan opsional saja) | `vault/Video-Workspace/remotion/public/captures/*.png` (lokal, diabaikan git) | 04–10 |

Video pitch (`remotion/out/lencana-pitch-draft-7.mp4`) tidak lagi ditempel ke slide: gaya visualnya realistis dan akan
bertabrakan dengan deck. Video diputar sendiri atau ditautkan di slide 11.

## 7. Peta dokumen (11 slide)

| # | berkas | judul di layar | ±detik |
|---|---|---|---|
| 01 | [[13-SubmissionDocs/Slides/01 - Cover]] | Learn, test, and *prove it*. | 15 |
| 02 | [[13-SubmissionDocs/Slides/02 - Problem]] | A certificate is *just a file*. | 25 |
| 03 | [[13-SubmissionDocs/Slides/03 - The Proof Layer]] | We don't fix courses. We fix the *proof*. | 20 |
| 04 | [[13-SubmissionDocs/Slides/04 - Learner Journey]] | Rina never sees a *seed phrase*. | 25 |
| 05 | [[13-SubmissionDocs/Slides/05 - Grading You Can Audit]] | AI proposes. A *second key* approves. | 25 |
| 06 | [[13-SubmissionDocs/Slides/06 - Signed and Anchored]] | Signed. *Anchored*. | 20 |
| 07 | [[13-SubmissionDocs/Slides/07 - Not Just Any NFT]] | Soulbound. *Bound to the credential*. (kicker: NOT JUST ANY NFT) | 20 |
| 08 | [[13-SubmissionDocs/Slides/08 - Verify From One Link]] | Verify from *one link*. | 25 |
| 09 | [[13-SubmissionDocs/Slides/09 - Money On Chain]] | Every payment, *on-chain*. | 25 |
| 10 | [[13-SubmissionDocs/Slides/10 - Proof It Runs]] | Built, deployed, *tested*. | 20 |
| 11 | [[13-SubmissionDocs/Slides/11 - Live Now]] | Learn, test, and *prove it*. (chip: Live now on BNB Chain testnet) | 15 |
