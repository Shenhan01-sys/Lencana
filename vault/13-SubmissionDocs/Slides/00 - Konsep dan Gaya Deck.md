---
tags: [slides, deck, B175, design]
status: draft — menunggu builder
updated: 2026-10-07
---

# 00 - Konsep dan Gaya Deck (pitch Lencana, maks 11 slide)

**Backlog:** B175 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Video pasangannya:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] · **Teks formulir:** [[00-Overview/08 - Submission Copy]] · **Modul:** [[Module-Guides/13 - SubmissionDocs]]

Permintaan builder 7 Okt: *"kita disuruh buat ppt … 1 slide = 1 md file … maksimal 11 slides + 1 md file yang mengatur
context dan konsep design style-nya (samakan dengan FE Lencana, cuma lebih immersive + motionful)"*. Berkas ini = hub
deck: konteks, sistem visual, sistem gerak, aturan klaim, dan peta dokumen 11 slide.

## 1. Konteks

| hal | isi |
|---|---|
| acara | **Indonesia Web3 Hackathon 2026** — track *Consumer Apps* (· *AI Agents*), on BNB Chain (`README.md:24`) |
| penonton | juri: membaca cepat, menguji klaim, sebagian membuka repo. Bahasa slide **Inggris** (sama dengan video dan README) |
| durasi bicara | ±4 menit (±20–25 dtk per slide). Catatan pembicara di tiap berkas ditulis untuk tempo itu |
| satu kalimat | *Lencana turns a finished micro-course into a credential anyone can check for themselves — without taking our word for it.* |
| benang merah | **satu lencana, satu perjalanan** — sama dengan video: sertifikat palsu → pecah → menjadi tanda Lencana → sabuk benda (buku → tiket → kertas → stempel → medali → koin) → diverifikasi siapa pun |
| yang kita jual | bukan "sertifikat NFT", tapi **jalur penerbitan kredensial yang bisa diaudit publik + verifikasi pihak ketiga** (`00-Overview/01 - Briefing.md`) |

## 2. Sistem visual — FE Lencana, dinaikkan satu tingkat

Sumber token: `web/src/style.css` (`:root`) dan `vault/Video-Workspace/remotion/src/theme.ts`. **Tidak ada warna di luar
daftar ini** (Law 7 FE Doctrine: satu sistem, ditahan).

| peran | token | hex |
|---|---|---|
| latar | `--bg-app` | `#0b0e11` |
| kartu / lapis | `--bg-card` · `--bg-input` · `--bg-card-elevated` | `#181a20` · `#1e2329` · `#2b313a` |
| aksen utama (BNB) | `--bnb-gold` · hover | `#f0b90b` · `#fcd535` |
| sah / lulus | `--status-ok` | `#0ecb81` |
| dicabut / tolak | `--status-bad` | `#f6465d` |
| usulan / peringatan | amber (video) · `--status-delisted` | `#ff9f1a` · `#ff8e1d` |
| teks | `--text-main` · `--text-sub` · `--text-muted` | `#eaecef` · `#b7bdc6` · `#848e9c` |
| kertas "PDF palsu" | krem (video S1) | `#f3eee2` |

- **Huruf:** **Outfit** 800–900 untuk judul (tracking −0,03 em), 400–600 untuk isi; **JetBrains Mono** untuk angka,
  hash, alamat, label teknis, dan *kicker* (HURUF BESAR, tracking 0,14 em, emas). Angka = konten: selalu mono.
- **Pola judul:** dua baris, satu kata berwarna emas dengan bilah garis bawah emas (sama dengan judul kinetik video):
  `Signed. *Anchored*.`
- **Kanvas:** 16:9, 1920×1080, margin aman 96 px, grid 12 kolom. Judul selalu di kiri atas (x 110), benda utama di
  kanan/tengah — pola yang sama dengan video supaya deck dan video terasa satu keluarga.
- **Kedalaman:** latar gelap berlapis + *bokeh* emas samar; bingkai browser gelap sudut 16 px dengan tepi atas tersorot
  emas tipis, bayangan panjang, **pantulan** di bawahnya, dimiringkan 3D (rotateY ±8–18°); **cincin fokus neon**
  (emas = perhatikan, hijau = sah, merah = dicabut, amber = usulan). Radius FE: 4 / 8 / 16 px.
- **Motif berulang:** **sabuk benda** dari dasbor Admin (FE11/B172) dan Essays (B174) + **medali/koin emas**. Setiap
  slide punya paling tidak satu benda dari keluarga ini.
- **Anti-kartu (Law 2):** tidak ada dinding kartu berisi paragraf. Isi = benda yang melakukan sesuatu + label pendek.

## 3. Sistem gerak — "motionful" tapi punya maksud

Tiga lapis gerak di setiap slide (FE Doctrine §5):

1. **Masuk** — bertahap (stagger 60–80 ms), pegas dengan *overshoot*: benda datang dengan bobot.
2. **Terus-menerus** — sabuk berjalan, koin berputar pelan, cincin bernapas, aliran hash, bokeh melayang. Slide tidak
   pernah benar-benar diam.
3. **Pindah slide** — **Morph** (PowerPoint) pada benda yang sama antar slide (medali 06 → koin 07, sabuk 04 → 05,
   kata emas judul). Pergantian babak: **wipe lingkaran emas** (01→02, 03→04, 08→09). Kata kunci: **blok warna penuh**
   (slam) maksimal 2 per detik — aturan fotosensitif yang sama dengan video (AC-B173#8).

Micro-beat per slide (satu saja, Law 5): stempel *thud*, koin memantul lalu terhisap, angka menghitung naik, kartu
verdict membalik.

**Versi tanpa gerak:** setiap slide harus tetap terbaca sebagai gambar diam (untuk PDF / juri yang mematikan animasi).
Status selalu **kata + ikon + warna**, bukan warna saja. Kontras teks ≥ 4,5:1.

## 4. Peta metafora (Law 3 — tiap slide metafora berbeda)

| # | slide | benda inti (kata benda · kata kerja · hubungan) |
|---|---|---|
| 01 | Cover | pecahan kertas · berkumpul · menjadi tanda Lencana + medali |
| 02 | Problem | berkas PDF · diedit · lalu tiga sertifikat dikocok ("mana yang palsu?") |
| 03 | The proof layer | segel lilin · rubrik disegel bersama nilai; papan umum · status menyala; pintu · terbuka tanpa akun |
| 04 | Learner journey | sabuk · buku → tiket → kertas berjalan dari login sampai kuis |
| 05 | Grading you can audit | robot pengusul · mengusulkan 98 · meja stempel menyetujui |
| 06 | Signed & anchored | lembar sertifikat asli · memutar motion-nya · hash mengalir ke bola rantai |
| 07 | Not just any NFT | koin soulbound 3D · berputar · tarikan transfer memantul |
| 08 | Verify from one link | satu tautan · dibuka · kartu verdict membalik sah ↔ dicabut |
| 09 | Money on chain | koin · berjalan di kabel · terbelah 90/10 di `SettlementSplit` |
| 10 | Proof it runs | panel instrumen · jarum uji · lampu hijau + kotak batas jujur |
| 11 | Live now | kartu penutup · QR · sabuk benda berbaris di bawah logo |

## 5. Aturan klaim (wajib, sama dengan video)

- Setiap kalimat slide tunduk pada [[10-Contributors/Claims-Cheat-Sheet]]; sumber per slide ada di bagian "Sumber" tiap berkas.
- **Label wajib terlihat:** "BNB Chain testnet (chain 97)", "demo publisher (fictional)", "test token (LDC-demo)".
- **Jangan pernah:** *certified / compatible / conformant (1EdTech)*, *tamper-proof / unforgeable*, *trustless*,
  *on-chain diploma / stored on-chain*, *human-checked / mentor*, *reputation*, *production-ready*, *mainnet*,
  *marketplace*, *legally valid*, *cannot be changed* (yang benar: *not quietly*).
- Angka hanya yang **dicetak perintah dengan tanggalnya** (aturan vault #1); semua angka di deck ini bertanggal 6–7 Okt.

## 6. Cara membangun (saran)

- **PowerPoint** (paling kaya gerak): pasang font Outfit + JetBrains Mono (Google Fonts) lalu *embed fonts*. Transisi
  **Morph**: beri nama objek yang sama di dua slide dengan awalan `!!` (mis. `!!coin`) supaya PowerPoint memasangkannya.
  Klip video: *Insert → Video*, *Play automatically*, *Loop until stopped*, tanpa suara.
- **Google Slides** tidak punya Morph: pakai klip video untuk gerak dan transisi *Dissolve*.
- **Klip siap pakai** (semua dari proyek video, lokal, diabaikan git — dibuat ulang skripnya):

| aset | path | dipakai di |
|---|---|---|
| video final (cuplikan per bagian) | `vault/Video-Workspace/remotion/out/lencana-pitch-draft-7.mp4` | 01–11 |
| motion sertifikat asli, frame-exact | `…/remotion/public/captures/cert-motion.mp4` | 06 |
| sabuk Essays bergerak (B174) | `…/remotion/public/captures/essays-belt.mp4` | 05 |
| sabuk Admin bergerak (B172) | `…/remotion/public/captures/admin-belt.mp4` | 09 |
| tangkapan halaman asli 2× | `…/remotion/public/captures/*.png` (login, catalog, course-learner, class, owner2534-brain, pub-essays, cert, verify-valid, verify-revoked, pub-revenue, admin) | 04–10 |
| still koin 3D | `…/remotion/out/stills-coin/*.png` | 07 |

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
