---
tags: [video, pitch, B173, plan]
status: draft — menunggu acc builder
updated: 2026-10-07
---

# B173 - Rencana video pitch 90 detik (motion graphics + frame website imersif, Remotion, bahasa Inggris)

**Backlog:** B173 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B173 - Video pitch 90 detik]] ·
**Keputusan:** D79 di [[00-Overview/03 - Decisions]] · **Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] ·
**Terkait:** [[00-Overview/05 - Demo Scenes]] (rencana lama 5 menit) · [[00-Overview/12 - Business Process]] §9 (naskah 90 detik lama) ·
[[03-Frontend/FE11 - Prototipe Admin proses bisnis (B172)]] (sabuk benda) · **Testing / Summary:** menyusul sesudah render pertama (T97, Summary B173)

> **Status 7 Okt 08.28 WIB: DRAF 3 (v3 "lebih gila") SELESAI, menunggu builder.** 93,1 dtk, dimaster −14 LUFS, lulus
> gerbang otomatis sesudah satu perbaikan kedipan ([[09-Testing/T97 - Uji video pitch 90 detik (B173)]] §0, §6); isi v3 di
> §13. Yang belum: mata + telinga builder atas draf 3, render final, unggah + submit (builder).
> *(Status 05.00: draf 2 selesai, menunggu builder mendengar — ditonton 07.10, lihat §13. Status 03.20: rencana saja.)*

## 0. Permintaan builder

- 7 Okt dini hari: video pitch **±90 detik**, jelas end-to-end, **komersial untuk semua orang** (consumer app);
  **motion graphics yang inklusif sekaligus imersif** supaya penonton takjub tetapi tetap menangkap konteks Lencana dengan
  akurat; **banyak interaksi langsung dengan website**: frame website Lencana yang imersif di halaman yang sedang dijelaskan,
  ditambah animasi imersifnya. Tolok ukur "segila apa": lima video di `Reference-VideoPitchs/`.
- `Reference-VideoPitchs/NOTE.txt`: **"Gunakan remotion dengan resource ini, jangan gunakan hyperframes"** — sumbernya
  `Motion-as-Code-Workflow-Guide.pdf` + `Motion_as_kit/` + dokumentasi Remotion (`remotion.dev/docs`).
- Susulan: **voice over, caption, dan label berbahasa Inggris.**
- Dikerjakan di folder ini, dengan workflow vault ([[WORKFLOW]]).

## 1. Bahan yang sudah dibedah (7 Okt)

### 1a. Lima video referensi — diukur, bukan ditebak

Durasi/ukuran dari `ffprobe`; potongan keras dari `ffmpeg select='gt(scene,0.30)'`; isi dari lembar kontak 30 frame per video.

| # | isi | durasi · ukuran | potongan keras | yang kita ambil |
|---|---|---|---|---|
| ref1 | "Fuse AI" — promo dasbor SaaS AI | 39,9 dtk · 720×540 | 3 | UI asli di bingkai melayang yang dimiringkan 3D; kotak prompt bercahaya + ketikan; kartu angka "copot" dari layar dan melayang; latar abstrak 3D di belakang jendela |
| ref2 | "groundswell" (produksi Vidico) — app donasi | 58,8 dtk · 256×144 | 2 | app di mockup + kalimat kinetik 2–4 kata per ketukan; kartu UI ditarik keluar dari ponsel; transisi bentuk berwarna merek; kartu penutup berisi tombol unduh |
| ref3 | "Artisan" — agen AI penjualan | 45,9 dtk · 736×414 | 5 | jendela app beterbangan dalam perspektif; chip data melayang; judul fitur besar; kursor menunjuk |
| ref4 | "Lumitech" — agensi perangkat lunak | 63,1 dtk · 736×414 | **0** | **satu kamera yang tidak pernah berhenti** (tanpa potongan keras); garis sirkuit bercahaya; angka besar; logo dibangun di akhir |
| ref5 | reel "Opus 5.5 Just Made Motion Design Look Insane" (gaya pdoom/Motion-as-Code) | 15,1 dtk · 720×1280 (isi 16:9 di letterbox) | 4 (ketukan ±0,5 dtk) | tipografi kinetik membanting ("EASE / NEVER / LINEAR."), blok warna penuh, morf bentuk |

**Tolok ukur yang dipakai:** tempo peluncuran SaaS (satu ketukan tiap 2–3 detik, kamera tidak pernah diam, UI asli selalu
di layar) ditambah dua sampai tiga momen tipografi kinetik ala ref5. Bukan gaya pdoom (tinta/tulang/oranye) — palet tetap
milik Lencana.

### 1b. Kit Motion-as-Code (`Motion_as_kit/`, PDF panduan)

Isinya mesin **three.js** pdoom-video (MIT, `LICENSE.pdoom-engine`) — **bukan Remotion**. Yang kita pakai adalah **alur
kerjanya**, bukan mesinnya:

1. VO dulu → 2. **timing per kata** (`analysis/align_vo.py`: CTC forced alignment wav2vec2-base-960h, ONNX, **bahasa
   Inggris** — cocok karena VO kita Inggris) → 3. adegan mencari kata **menurut isinya** (`lineOf`/`wordOf`), jadi naskah
   boleh dibaca ulang tanpa menggeser animasi → 4. preview → 5. render dari Chrome headless → 6. SFX dari cue sheet yang
   diturunkan dari timing kata, diturunkan ±7 dB di bawah suara, mix dinormalkan −14 LUFS (`analysis/sfx_mix.py`).
- 28 SFX (`audio/sfx/`: `whoosh_*`, `stamp_1`, `paper_slide_1`, `confirm_chime_1`, `scan_sweep_1`, `impact_slam_1`,
  `riser_1`, `mouse_click_1`, `typewriter_*`, `spark_ignite_1`, …) **cocok sekali dengan benda kita** (stempel, kertas,
  koin, pindai). Dibuat penulis kit dengan ElevenLabs Sound Effects v2; **lisensinya tidak tertulis** → keputusan builder (bagian 12).
- Font kit (Archivo, IBM Plex Mono, Cormorant) OFL — tidak dipakai: kita memakai font Lencana sendiri.
- Ukuran kit 234 MB (model ONNX 95 MB + `node_modules`): **tidak masuk git** (`.gitignore`, dicek `git check-ignore`).

### 1c. Produk yang akan direkam (halaman publik dipotret 7 Okt, mode EN)

Beranda (hero "Learn, test, and prove it." + kartu kredensial LENCANA), katalog (sampul kursus berilustrasi), masuk (modal
email + lencana berkarangan), verifikasi publik ("Is this achievement real? Get a clear answer."), Trust Center (kartu agen),
Publishers. Bagian dalam (perlu identitas): kelas, kuis, esai, bursa agen (robot + harga), meja pengesahan (penggaris rubrik +
cap), otak agen (logo provider), bengkel robot, kredensial saya + lembar sertifikat (cincin dari byte hash, QR), panel bukti
NFT + Bagikan ke LinkedIn, Admin (sabuk proses bisnis FE11).

## 2. Format

| hal | pilihan | alasan |
|---|---|---|
| ukuran | **1920×1080, 16:9** | YouTube/portal hackathon; potongan 9:16 untuk media sosial di luar cakupan hari ini |
| fps | **30** | cukup untuk gerak UI; render cepat; rekaman layar juga 30 |
| durasi | **88–92 detik** (AC: 85–95) | permintaan builder |
| bahasa | **Inggris**: VO, caption, label | permintaan builder; UI direkam `?lang=en`; judul kursus tetap Indonesia (materinya memang Indonesia) |
| audio | VO + musik + SFX, −14 LUFS, true peak ≤ −1 dBTP | standar YouTube |
| caption | selalu tampil (dibakar), ≤ 2 baris, kata aktif disorot emas | inklusif: penonton tuli/HoH dan yang menonton tanpa suara |

## 3. Pesan dan naskah (Inggris, ±196 kata ≈ 75 detik bicara + ±15 detik napas visual)

**Satu kalimat:** *Lencana turns what you learn into a credential anyone can check for themselves — without taking our word for it.*

| # | waktu | VO (Inggris) | sumber klaim |
|---|---|---|---|
| 1 | 0:00–0:05 | "A certificate is just a file. Anyone can edit it." | README §Why this exists ("A PDF certificate is forged with Photoshop") |
| 2 | 0:05–0:13 | "Meet Lencana — learning credentials anyone can check for themselves, without taking our word for it." | README baris 3 ("anyone can verify — no wallet, no login, and without having to trust us") |
| 3 | 0:12–0:27 | "Sign in with just your email — your wallet is created for you. Pick a course, pay by signing — no gas fees — and learn at your own pace. Quizzes are graded by the publisher's server, so scores are never typed in." *(koreksi 7 Okt saat produksi: draf menulis "pay with a **single** signature" — salah; `web/src/learning.ts:1334` menyebut pembayaran = **dua tanda tangan** (izin EIP-2612 + saksi Permit2), **nol transaksi** dari dompet peserta, settlement disiarkan server penerbit. VO baris ini dibaca ulang.)* | Cheat-Sheet baris D57 (email + dompet dibuatkan Privy); B125 (bayar = tanda tangan EIP-2612 + Permit2, tanpa gas dari peserta); salinan hero beranda + baris `POST /grade` |
| 4 | 0:29–0:47 | "Essays go to AI grading agents, each with its own on-chain identity. An agent only proposes a score — it counts once a second reviewer, appointed by the publisher, approves it. Agent owners bring their own AI model and get hired per job." | Cheat-Sheet: ERC-8004 (identitas, bukan reputasi), B104/B120 (dihitung sesudah pengesah yang ditunjuk penerbit — **tanpa** kata "human"/"mentor"), B135 (otak + API key milik pemilik), B119 (disewa per aktivitas) |
| 5 | 0:44–1:01 | **v3:** "Pass, and your credential is signed by the publisher and anchored on BNB Chain. Then mint its soulbound badge — no one can sell, transfer or burn it, and it's only minted for a valid credential. Add it to LinkedIn straight from the app." *(7 Okt 07.10 builder: NFT-nya kurang ditonjolkan sebagai "bukan sembarang NFT" → kalimat diperluas, dibaca ulang dengan kecepatan 1,08. Teks draf 2: "Mint a soulbound badge that can't be sold or transferred, and add it to LinkedIn straight from the app." "in one click" tetap tidak dipakai: tombol "Add to profile" membuka formulir LinkedIn yang masih dikonfirmasi di sana)* | D54 (kunci penerbit menandatangani), README How it works (chain = jangkar, bukan isi), B169 (cetak artefak dari app), B168 (kit LinkedIn). Klaim NFT dibaca dari kontrak 7 Okt: `contracts/SoulboundCert.sol:308`–`326` (`transferFrom`/`safeTransferFrom` → `NotTransferable`; `approve`/`setApprovalForAll` → `NotDelegable` — tanpa pemindahan dan tanpa izin, tidak ada jalan untuk menjualnya), `contracts/SoulboundCert.sol:331` (`_update` menolak transfer **dan** burn), `contracts/SoulboundCert.sol:130` (`mint` menolak kredensial yang tidak ada, dicabut, kedaluwarsa, penerbitnya didelisting, atau level lesson), `contracts/SoulboundCert.sol:65` (antarmuka ERC-5192) |
| 6 | 1:01–1:14 | "Anyone can verify it from a single link — no wallet, no login. If it's ever revoked, everyone sees it. And it passes the 1EdTech Open Badges 3.0 validator with zero errors." | README baris 3; revoke tanpa unrevoke; Cheat-Sheet baris 1 (**lolos** validator — bukan "certified"/"compatible"); validator **dijalankan ulang hari render** |
| 7 | 1:14–1:23 | "Behind it, one transparent pipeline — from enrollment to payout, every payment settled on-chain." | B125 (settlement + `SettlementSplit`), B119 (x402 ke dompet agen), ringkasan Admin B172 |
| 8 | 1:23–1:30 | "Lencana. Learn, test, and prove it. Live now on BNB Chain testnet." | judul hero beranda; Cheat-Sheet "prototipe di BSC testnet" |

Label layar wajib: **"Testnet demo"** pada adegan bayar, **"Demo publisher (fictional)"** pada sertifikat/verifikasi,
**"Live testnet data · 7 Oct 2026"** pada sabuk Admin. Cadangan bila validator 1EdTech tidak menjawab hari render: kalimat
terakhir #6 diganti "Built on the Open Badges 3.0 and W3C Verifiable Credentials standards." (README baris 10).

## 4. Storyboard (konsep: **satu lencana, satu perjalanan**)

Benang merahnya benda — doktrin FE builder: tiap langkah punya benda nyata, dan benda itu yang berpindah. Lencana emas
muncul dari pecahan sertifikat palsu di detik 5, lalu menumpang **sabuk proses** yang sama dengan halaman Admin (FE11:
buku → tiket → kertas → kertas bernilai → kertas berstempel → lencana → koin). Kamera mengikuti sabuk; di tiap stasiun, halaman
asli Lencana **naik dari bendanya** dalam bingkai browser 3D.

| S | waktu | layar | gerak | SFX |
|---|---|---|---|---|
| S1 Hook | 0:00–0:05 | Sertifikat PDF generik ("Certificate of Completion") melayang; kursor mengklik nama dan mengetik nama lain, nilai "C" jadi "A+" | kamera mendekat pelan → sertifikat retak menjadi kotak-kotak abu (tanpa kilat terang) | `key_click`, `typewriter`, `zap_slash` |
| S2 Janji | 0:05–0:13 | pecahan berkumpul jadi **lencana emas** → logo "Lencana" → kata kinetik "CHECK IT YOURSELF." → kamera mundur: **hero beranda asli** dalam bingkai browser miring | pecahan = per-kotak `spring`; kata membanting (skala 1,4 → 1); bingkai berputar dari 18° ke 6° | `reverse_suck`, `impact_slam`, `whoosh_soft` |
| S3 Belajar | 0:13–0:29 | **modal masuk asli**: email diketik → chip "Wallet created for you" · **katalog**: kartu kursus terangkat dari halaman, kursor memilih · **halaman kursus**: "Pay & enroll" ditekan → koin emas jatuh ke sabuk, label "Testnet demo" · **kelas**: lesson tercentang satu per satu, kuis dipilih → "Graded by the server ✓" | kamera menyusuri sabuk ke kanan; tiap halaman naik dari bendanya (buku → tiket); kartu = lapisan terpisah yang maju di sumbu Z | `typewriter`, `mouse_click`, `ui_tick`, `confirm_chime` |
| S4 Agen | 0:29–0:47 | **esai** diketik → kertas terbang ke **robot agen** (bursa agen asli, tag "ERC-8004 #2534") → penggaris rubrik terisi, angka usulan berwarna jingga "proposal" → **robot kedua** mengecap "APPROVED" (hijau) di **meja pengesahan asli** → **otak agen**: logo provider (OpenAI, Anthropic, Qwen, Groq, GLM, DeepSeek, Kiro) berputar masuk ke kepala robot, "Calibration ✓" | stempel = `ln-press` dari sabuk Admin, diperbesar; logo mengorbit lalu terhisap | `paper_slide`, `scan_sweep`, `stamp`, `ui_blip` |
| S5 Kredensial | 0:47–1:01 | **lembar sertifikat asli** (cincin dari byte hash, QR) muncul dan diorbit kamera 3D → **panel bukti NFT**: lencana soulbound masuk dompet, gembok; kursor mencoba menyeretnya keluar → **memantul kembali** (transfer ditolak) → **dialog LinkedIn asli**, "Add to profile" | orbit 3D ±25°; pantulan = `spring` kaku; kartu bukti meluncur dari bawah | `spark_ignite`, `impact_small`, `mouse_click` |
| S6 Verifikasi | 1:01–1:14 | QR dipindai → **halaman verifikasi asli** "Is this achievement real?" → jawaban **VALID ✓** (hijau, kata + ikon) → kartu kedua **REVOKED ✕** (merah, kata + ikon) → lencana kecil "1EdTech OB 3.0 validator · 0 errors · 0 warnings" | garis pindai menyapu; status berganti dengan ikon, bukan hanya warna | `scan_sweep`, `confirm_chime`, `impact_small` |
| S7 Sabuk | 1:14–1:23 | **halaman Admin asli** — sabuk proses bisnis bergerak (rekaman nyata), kamera terbang sepanjang sabuk, angka menghitung naik, dua toples uang terisi "10% platform · 90% publisher" | dolly lateral panjang tanpa potongan (ala ref4) | `projector_run` pelan, `ui_tick` |
| S8 Penutup | 1:23–1:30 | lencana kembali ke tengah → logo + "Learn, test, and prove it." + `lencana-psi.vercel.app` + QR + "Live on BNB Chain testnet" | semua benda sabuk berkumpul jadi baris di bawah logo; tahan 2 detik | `riser` → `impact_slam` lembut |

## 5. Sistem visual

- **Palet Lencana** (sama dengan aplikasi, selalu gelap — B166): latar `#0b0e11`, kartu `#181a20`, tepi `#2b313a`, emas
  `#f0b90b`, hijau `#0ecb81`, jingga `#ff9f1a`, merah `#f6465d`, abu `#b7bdc6` / `#848e9c` / `#5d6672`, teks `#eaecef`.
- **Huruf**: Outfit (judul, kata kinetik, bobot 800–900) + JetBrains Mono (angka, hash, label teknis) — font yang sama dengan
  `web/src/style.css`.
- **Gerak punya maksud** (doktrin FE): yang bergerak adalah benda yang berpindah dari langkah ke langkah; kamera selalu
  bergerak pelan; potongan keras hanya di ketukan tipografi kinetik.
- **Bingkai browser**: jendela gelap bersudut 16 px, tiga titik, kolom alamat `lencana-psi.vercel.app/#/…`, bayangan panjang,
  tepi atas tersorot emas tipis; dimiringkan dalam perspektif 3D, isi = tangkapan asli 2× (tajam saat diperbesar).
- **Lapisan "copot"**: elemen penting (kartu kursus, tombol bayar, penggaris rubrik, lembar sertifikat, panel verdict) dipotret
  terpisah beserta koordinatnya, lalu diangkat dari bidang halaman di sumbu Z dengan bayangan — teknik ref1/ref3.
- **Kursor**: penunjuk putih bertepi gelap, jalur melengkung, klik = denyut + cincin emas.
- **Benda sabuk**: gambar SVG datar yang sama dengan `web/src/pages/admin-objects.ts` (dipindah ke komponen video), jadi
  pemirsa yang membuka halaman Admin melihat benda yang sama.

## 6. Teknik "frame website imersif"

1. **Tangkapan** dengan `puppeteer-core` + Chrome 154 (sudah terpasang, dipakai harness uji): halaman publik dari produksi
   `lencana-psi.vercel.app/?lang=en`; halaman dalam lewat build lokal dari commit yang sama dengan produksi, backend Railway
   produksi, identitas **fixture** (pola [[09-Testing/T96 - Uji peramban halaman Admin ringkasan jejak kesehatan (B172)]]: server kunci
   satu-kali, kunci tidak pernah masuk transkrip). Ukuran 1920×1080 pada `deviceScaleFactor: 2`; potongan elemen pakai `clip`
   (bukan screenshot elemen — itu mengubah viewport dan memicu gambar ulang, pelajaran B172).
2. **Rekaman pendek** hanya untuk gerak yang memang hidup di situs (sabuk Admin, hero beranda): `page.screencast` atau
   rangkaian frame CDP → `ffmpeg` 30 fps.
3. **Interaksi** (ketik, klik, centang) disusun di Remotion di atas status-status halaman yang dipotret, supaya waktunya
   terkunci ke kata VO; yang ditampilkan tetap layar sungguhan dari langkah yang sungguh ada.
4. **Privasi**: hanya akun fixture; tidak ada API key (kolom kunci di otak agen ditampilkan kosong/bertopeng), tidak ada email
   atau alamat orang lain (tab Persetujuan/Jejak Admin tidak direkam).

## 7. Audio

- **VO Inggris** — sumber suara = keputusan builder (bagian 12). Apa pun sumbernya, timing per kata diambil dari
  timestamp TTS bila ada, atau dari `align_vo.py` kit (Inggris) bila tidak.
- **Musik** — trek bebas royalti dengan lisensi tertulis (keputusan builder: pilih sendiri atau saya pilihkan).
- **SFX** — bawaan: `@remotion/sfx` (lisensi tercatat per suara, tanpa atribusi); pelengkap untuk bunyi yang tidak ada di
  sana (stempel, kertas, koin, pindai): SFX kit **bila builder setuju** lisensinya. Cue diturunkan dari timing kata.
- **Mix** di Remotion (VO, musik dengan volume turun saat ada suara, SFX per cue) → normalisasi akhir `ffmpeg loudnorm`
  dua lintasan ke −14 LUFS / −1 dBTP, dicetak ke T97.

## 8. Proyek Remotion (riset dokumentasi `remotion.dev/docs` + registry npm, 7 Okt)

- **Versi:** `remotion` **4.0.533** (registry npm 7 Okt; belum ada 5.x). Semua paket `@remotion/*` di bawah ini ikut versi itu.
- **Lisensi:** Free License Remotion (`LICENSE.md` di repo Remotion) berlaku untuk **individu** dan organisasi **≤ 3 orang**,
  termasuk pemakaian komersial untuk membuat video. Tim 4+ orang yang mengoperasikan proyek ini butuh Company License.
  Yang mengoperasikan proyek video ini: builder (dan agent).
- **Perancah:** `npx create-video --yes --blank --no-tailwind remotion`, lalu `npx remotion skills add` (12 skill resmi:
  best-practices, captions, render, saas, multimedia, …). Skill dibaca sebagai acuan; foldernya diabaikan git dan pemeriksa vault.
- **Aturan main dari skill resmi:** semua gerak dari `useCurrentFrame()` + `interpolate()`/`spring()` (transisi/animasi CSS
  tidak ter-render benar); `random(seed)`, bukan `Math.random()`; satu berkas per adegan di `<TransitionSeries>`;
  `premountFor` pada sequence + media; pratinjau di Studio, render hanya bila perlu.
- **Paket yang dipakai:** `@remotion/transitions` (slide, wipe, iris, zoomBlur, crossZoom, pushCut, …), `@remotion/media`
  (`<Video>`/`<Audio>`; `volume` sebagai fungsi frame untuk menurunkan musik di bawah suara), `@remotion/captions`
  (`createTikTokStyleCaptions` → halaman caption + kata aktif), `@remotion/google-fonts` (Outfit, JetBrains Mono),
  `@remotion/motion-blur` (`CameraMotionBlur` pada gerak cepat), `@remotion/noise` (latar sirkuit), `@remotion/effects`
  (glow, vignette, `cornerPin()` untuk memetakan tangkapan ke bidang miring, `lightLeak()` di transisi), `@remotion/sfx`.
- **VO:** Remotion **tidak punya TTS sendiri**. Resep resmi di skill-nya: ElevenLabs (`eleven_multilingual_v2`, kunci di
  variabel `ELEVENLABS_API_KEY`); endpoint `with-timestamps` memberi perataan per karakter → dikelompokkan jadi kata oleh kode
  kita. `@remotion/elevenlabs` hanya mengubah transkrip speech-to-text ElevenLabs menjadi caption. Timing alternatif yang lokal:
  `align_vo.py` dari kit (Inggris) atau whisper.cpp (`@remotion/install-whisper-cpp`; biner Windows terakhir 1.5.5).
  Karena teks naskah sudah pasti, caption memakai **teks naskah** + timing kata, bukan hasil transkripsi (nol salah dengar).
- **SFX:** `@remotion/sfx` — suara di `remotion.media` (whoosh, whip, page-turn, switch, mouse-click, ding, shutter, …),
  "boleh dipakai tanpa atribusi", lisensi tercatat per suara (contoh: whoosh CC0). **Musik:** Remotion tidak menyediakan.
- **Frame website:** `<IFrame>` situs hidup **tidak dipakai** (docs: situs sebaiknya tanpa animasi; hasilnya tidak deterministik)
  → tangkapan PNG 2× / rekaman H.264 di bingkai CSS 3D, atau dipetakan dengan `cornerPin()`.
- **Render:** Remotion mengunduh Chrome Headless Shell sendiri (Chrome 149, deterministik — Chrome 154 sistem tidak dipakai
  untuk render); ffmpeg sudah dibundel. Still gaya: `npx remotion still`. Final: `npx remotion render LencanaPitch
  out/lencana-pitch.mp4 --crf=18 --gl=angle`, konkurensi dari `npx remotion benchmark`; NVENC (RTX 3050 Ti,
  `--hardware-acceleration=if-possible`) hanya bila waktu mepet.
- **Lokasi:** `vault/Video-Workspace/remotion/` (sesuai permintaan "kerjakan di sini"). `node_modules/` dan `out/` sudah
  diabaikan `.gitignore` di semua kedalaman; tangkapan, audio hasil generate, dan folder skill ikut diabaikan, dibuat ulang skrip.
- **Bentuk:** satu komposisi `LencanaPitch` 1920×1080 @30; durasi dihitung dari panjang VO (`calculateMetadata`); adegan
  `S1…S8` masing-masing satu berkas; `timing.ts` membaca timing kata dan memberi `cue('phrase')` → frame (konsep
  `lineOf`/`wordOf` kit), jadi animasi ikut bergeser bila VO dibaca ulang.

## 9. Penjaga akurasi (gerbang sebelum render final)

1. Tabel bagian 3 = peta klaim; kalimat tanpa sumber dibuang.
2. **Frasa terlarang** (diperiksa skrip atas naskah + caption): `certified`, `compatible`, `conformant`, `human`, `mentor`,
   `on-chain diploma`, `stored on-chain`, `anti-cheat`, `cheat-proof`, `tamper-proof`, `trustless`, `production-ready`,
   `mainnet`, `marketplace`, `anyone can create a course`, `we never hold your keys`, `legally valid`, `reputation`.
3. Dijalankan **pada hari render**, keluarannya ditempel di T97: `cast call <SettlementSplit> "platformBps()"` (harus 1000),
   `npm run validator -- --hash 0xb9fb06e5… --record` (kredensial B153), `npm run e2e`, `npm run journey` bila gas cukup.
4. Kredensial di layar: B153 `0xb9fb06e5…` (VALID, penerbit demo fiktif) dan kertas tercabut T40 `0xdbd7c72f…` (REVOKED) —
   verdict keduanya dibaca ulang di halaman verifikasi saat direkam.

## 10. Inklusif

Caption selalu ada; kontras ≥ 4,5:1; status selalu **kata + ikon + warna** (bukan warna saja — buta warna merah-hijau);
tidak ada kedipan > 3/detik (dicek skrip luminansi); tempo bicara ≤ 160 kata/menit; kata awam ("on-chain identity", bukan
"ERC-8004" di VO; istilah teknis hanya di label kecil); musik turun di bawah suara.

## 11. Jadwal hari ini (perkiraan kerja saya; titik acc builder ditandai ✋)

| fase | isi | perkiraan |
|---|---|---|
| 0 | rencana + naskah ini ✋ | sekarang |
| 1 | perancah Remotion + 4 still gaya (S2 hero, S4 robot + stempel, S6 VALID, S8 penutup) ✋ | ±1 jam |
| 2 | tangkapan situs + VO + timing kata | ±1 jam |
| 3 | delapan adegan + caption + SFX | ±2,5 jam |
| 4 | render draf cepat ✋ → perbaikan → gerbang akurasi + audio + kedipan → render final ✋ | ±1 jam |
| 5 | unggah + submit (builder, B65/B64) | builder |

Total ±5,5 jam kerja saya di luar waktu builder meninjau.

## 12. Keputusan dari builder sebelum produksi

1. **Suara VO (Inggris):** (a) **ElevenLabs** — jalur resmi Remotion, suara paling natural, timing per karakter ikut; butuh
   kunci API ElevenLabs milik builder, ditaruh builder sendiri di berkas `.env` lokal (tidak pernah ditempel di chat); hak
   pakai komersial mengikuti paket ElevenLabs-nya (dicek builder). (b) **OpenAI TTS** — butuh kunci OpenAI; suara AI wajib
   diungkap. (c) **TTS lokal Kokoro-82M** (Apache-2.0) — gratis, tanpa kunci, kualitas sedikit di bawah (a), belum terpasang
   (±20 menit coba-pasang). (d) **Suara builder sendiri** — paling autentik, ±20 menit rekam.
2. **Musik:** builder memilih satu trek bebas royalti berlisensi tertulis (mis. Pixabay Music) dan menaruhnya di
   `Video-Workspace/audio/` — saya tidak bisa mendengar, jadi selera musik bukan keputusan yang layak saya ambil; atau tanpa musik.
3. **SFX kit** (lisensi tidak tertulis, hanya terdengar di video, tidak didistribusikan ulang) boleh jadi pelengkap `@remotion/sfx`, atau tidak.
4. **Jam tenggat submit hari ini** — jamnya belum tercatat di vault (`START-HERE` masih menulis 30 Sep, basi).

**Jawaban builder 7 Okt ±03.35 WIB:**
1. "nih pakai elevenlabs, cek aja di .env var ELEVENLABS_API_KEY" → kunci ada di `app/.env` (dibaca skrip, tidak pernah
   dicetak). Akun: paket **Starter** (lisensi komersial), kredit 40.000 karakter per bulan, terpakai 0 sebelum B173; 21 suara
   premade; model TTS sampai `eleven_v4`.
2. "Yg menurutmu paling sesuai dan meningkatkan engagement" → musik **dibuat khusus** dengan ElevenLabs Music (`POST /v1/music`,
   rencana komposisi per bagian dengan durasi per bagian, instrumental), mengikuti batas adegan sesudah timing VO diketahui —
   bukan trek pustaka yang dipilih tanpa didengar. Diperiksa dengan spektrogram + loudness; builder mendengar di render draf.
3. SFX kit: "Gas" → dipakai sebagai pelengkap `@remotion/sfx`.
4. "Fokus bikin video dulu" → produksi jalan; jam tenggat tidak dibahas.

## 13. Log

| waktu (WIB) | kejadian |
|---|---|
| 7 Okt 02.57 | permintaan builder masuk; riset bahan dimulai |
| 7 Okt 03.10 | rencana ini, AC-B173, D79, baris B173; `.gitignore` referensi; `check-lang.ps1` diperbaiki (lewati `node_modules`, berkas satu baris) |
| 7 Okt 03.20 | riset dokumentasi Remotion selesai → bagian 7, 8, 12 dilengkapi; menunggu empat keputusan builder |
| 7 Okt 03.35 | acc builder (ElevenLabs, musik pilihan agent, SFX kit, fokus video) → produksi mulai |
| 7 Okt 03.45 | validator 1EdTech dijalankan ulang untuk kredensial B153 (`BASE_URL` = host tepi; bawaan `:8787` sudah tidak ada sejak B156): **VALID · 14 pemeriksaan · 0 error · 0 warning**, tercatat di `validator-runs.jsonl` |
| 7 Okt 03.50 | perancah Remotion 4.0.533 di `remotion/`; VO 8 baris ElevenLabs `eleven_v4` suara Sarah (timing per karakter → per kata); QA VO dengan speech-to-text balik: semua baris terdengar sesuai naskah ("Lencana" terdengar "Lenchana") |
| 7 Okt 04.00 | musik dibuat ElevenLabs Music `music_v1`, rencana komposisi 8 bagian mengikuti batas adegan, 89,1 dtk; dianalisis: −12,5 LUFS jangka pendek di groove, intro tenang, riser per frasa 16 dtk, pukulan akhir ±84 dtk; grid ketukan 119,8 BPM (`scripts/beats.mjs`) |
| 7 Okt 04.10–04.35 | tangkapan halaman asli (`scripts/capture.mjs`): publik dari produksi; sertifikat B153 dibaca per alamat; dasbor penerbit, pemilik agen #2534/#2542/#2548 memakai kunci tim di `app/.env` (dibaca skrip, tidak dicetak, tanpa aksi tulis); Admin lewat signer lokal `LANCENA_ORIGIN=test` + admin fixture baru; ringkasan Admin asli disimpan (`src/data/admin-summary.json`: 8 kursus, 13 pendaftaran, `platformBps` 1000 dari chain) |
| 7 Okt 04.45 | **penjaga akurasi bekerja:** VO baris 3 "single signature" ternyata salah (pembayaran = dua tanda tangan, nol transaksi) → dibaca ulang "pay by signing — no gas fees"; VO baris 4/5 digeser 0,4/0,2 dtk |
| 7 Okt 04.47 | **draf 1 penuh** dirender (121 dtk render): 89,0 dtk; QA audio: I −14,9 LUFS, true peak +0,3 → wajib master; musik di bawah suara diturunkan ×0,20 → ×0,15 |
| 7 Okt 04.52 | **draf 2** (dorongan kamera pelan di setiap shot, ghost text S2, tag katalog, zoom bayar) + master −14,0 LUFS / −1,4 dBTP → pratinjau 16 MiB dikirim ke builder; QA HIJAU + jalur merah terbukti (T97); `e2e` 48/0 |
| 7 Okt 05.00 | `journey` berjalan (gerbang B65 kedua); menunggu telinga builder atas suara + musik |
| 7 Okt 07.10 | **tanggapan builder atas draf 2:** "overall bagus dan udah sangat oke, tapi masih bisa di push lebih gila lagi"; (1) UI "Essay pipeline" di `/app/pub/essays` diperbagus lalu video dibuat ulang; (2) bagian sertifikat kurang menonjolkan bahwa NFT-nya "bukan sembarang NFT"; (3) tingkat referensi: ref2 90% → tambah 10%-nya, ref1 60% → 95% ("lebih immersive"), ref5 65% → 95% |
| 7 Okt 07.51 | (1) selesai sebagai **B174** (sabuk benda: baki, robot pengusul, meja stempel, tong — `web/src/pages/essay-belt.ts`), commit `87ba9ab`; halaman Essays ditangkap ulang + direkam 9 dtk untuk S4 |
| 7 Okt 07.51–08.05 | **v3 "lebih gila":** VO baris 5 dibaca ulang (teks NFT baru, §3), musik diperpanjang **dua birama utuh** di garis birama (`scripts/splice-music.mjs`, 93,09 dtk, grid ketukan tetap); perangkat imersi baru — kamera 3D berlapis dengan blur kedalaman + bingkai hantu di belakang (ref1), judul kinetik di samping UI (ref2), **blok warna penuh** "JUST A FILE / SOULBOUND / NO WALLET / NO LOGIN / LEARN / TEST / PROVE IT" di kata VO-nya (ref5), wipe lingkaran emas di tiga pergantian babak (ref2), bola titik "BNB Chain"; **sorotan NFT** = medali soulbound dicetak dari sertifikat, lembar spesifikasi "NOT JUST ANY NFT" (ERC-5192 · tidak bisa dijual · dipindah · dibakar · hanya untuk kredensial sah), kursor mencoba menyeret medali → memantul + cincin merah |
| 7 Okt 08.06–08.16 | 30 still ulasan → lima judul kinetik menimpa tepi bingkai browser + teks muka belakang medali terpotong → diperbaiki, 12 still ulang bersih; render penuh draf 3 |
| 7 Okt 08.17 | **gerbang kedipan merah** di draf 3: wipe emas S4→S5 dan S6→S7 = 7 lonjakan luma per detik (T97 §6) → luas wipe dibuat naik rata, 24 frame; gerbang tidak dilonggarkan; uji segmen 0–1 lonjakan |
| 7 Okt 08.25 | render ulang draf 3: **QA HIJAU** — 93,10 dtk · −14,0 LUFS · −1,3 dBTP · terbanyak 2 lonjakan per detik · caption 206 kata · nol frasa terlarang (1.701 potong teks) |
| 7 Okt 08.28 | pratinjau draf 3 (CRF 25, 17,2 MiB) dikirim ke builder |
