---
tags: [testing, "T97", video]
status: active
updated: 2026-10-07
command: cd vault/Video-Workspace/remotion && node scripts/qa.mjs out/lencana-pitch-draft-5.mp4 · node scripts/focus-audit.mjs · node scripts/vo-check.mjs · cd signer && npm run e2e · npm run journey · BASE_URL=<host tepi> node scripts/validator-check.js --hash <B153> --record
measured: 2026-10-07
result: QA HIJAU draf 6 (10.34, skor hype pilihan builder) — 103,10 dtk · −13,9 LUFS · TP −1,2 dBTP · flat factor 0 (draf 5 clipping di 6 slam, flat factor 24 → MIX 0,6 + skor dihaluskan) · nol frasa terlarang (2.139 teks). Sebelumnya QA HIJAU draf 5 (09.48–09.53) — problem 14,3 dtk, sertifikat bergerak (240 frame, 316 animasi digeser), 20 ring highlight diaudit (6 diperbaiki); A/B/C 103,10 dtk · −13,9 LUFS · TP −1,2/−1,4/−1,3 dBTP · terbanyak 2 lonjakan luma per detik · caption 227 kata · nol frasa terlarang (2.139 teks); gerbang durasi 95–110 dtk atas keputusan builder. Sebelumnya QA HIJAU draf 4 (08.49–08.55) — koin 3D asli, tiga versi skor A/B/C pada gambar yang sama, ketiganya 93,0–93,1 dtk · −14,0 LUFS · TP −1,3/−1,4/−1,3 dBTP · terbanyak 2 lonjakan luma per detik · nol frasa terlarang (1.741 potong teks); skor B/C dibuat 08.46 (2.324 kredit ElevenLabs), nol kata vokal (STT). Sebelumnya QA HIJAU (draf 3 / v3, sesudah master, 08.25) — 1920×1080 · 30 fps · H.264+AAC · 93,1 dtk · −14,0 LUFS · true peak −1,3 dBTP · lonjakan luma terbanyak 2 per detik · caption 206 kata, kontras ≥ 7,4:1 · nol frasa terlarang (1.701 potong teks); render pertama draf 3 MERAH di kedipan (wipe emas) → diperbaiki di transisinya, bukan di gerbangnya. Draf 2: QA HIJAU 89,1 dtk; jalur merah terbukti; validator 1EdTech VALID 14/0/0; e2e 48/0; journey 34/0; cleanup sisa 0
---

# T97 - Uji video pitch 90 detik (B173)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B173 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B173 - Video pitch 90 detik]] · **Rencana:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Summary:** menyusul sesudah acc builder atas render final

## Cara mengulang

Semua perintah dari `vault/Video-Workspace/remotion/` (daftar lengkap di `README.md` folder itu): VO `node scripts/vo.mjs`,
cek dengar `node scripts/vo-check.mjs`, musik `node scripts/music.mjs`, ketukan `node scripts/beats.mjs`, tangkapan
`node scripts/capture.mjs`, render `npx remotion render LencanaPitch out/draft.mp4 --crf=18 --gl=angle` *(koreksi 7 Okt:
baris ini sempat menulis `--crf=20`; README dan semua render memakai 18)*, master
`node scripts/master.mjs out/draft.mp4 out/lencana-pitch.mp4`, gerbang `node scripts/qa.mjs out/lencana-pitch.mp4`.
Sejak v3 juga `node scripts/splice-music.mjs` (menyisipkan birama utuh ke musik bila VO memanjang).

## 0c. Draf 6 — skor hype dipilih, "kresek" dihilangkan (7 Okt 10.25–10.36 WIB)

**Pemicu (builder 10.25):** atas `lencana-pitch-draft-5-hype.mp4`: "MANTAP BANGET, tapi kok ada suara kresek-kresek
gitu ya satu tempo satu tempo? bisa dihilangkan aja? lalu render ulang dan push commit sisanya". → skor **B hype** dipilih.

**Diukur dulu, baru diubah** (skrip ukur di scratchpad, angka dari run hari ini):

| dugaan | ukuran | hasil |
|---|---|---|
| clipping di mix | `astats` mix render s16 draf 5 hype | **Peak 0,0 dBFS, flat factor 24, 196 puncak**; puncak rata ≥ 32.600 di **6 titik**: 14,88 · 61,23 · 61,30 · 73,85 · 74,74 · 93,95 dtk = tepat di impact slam (S2, SOULBOUND, NO WALLET, NO LOGIN, "Lencana.") → "kresek" sesekali. Versi A juga (7 titik) |
| klik digital di skor | lompatan sampel > 6× RMS lokal | skor hype: **0** |
| desis per ketukan di skor | energi > 6 kHz tepat di ketukan vs di antaranya | skor hype bagian Agents: **+18 s/d +21 dB** di 5–18 kHz (ledakan pendek per ketukan) + pita atas 10–20 dB lebih terang dari skor A; di mix tertutup VO (rasio ±0 dB), terdengar saat musik sendirian |

**Perbaikan:** (1) `Soundtrack.tsx` `MIX = 0,6` untuk VO, skor, dan SFX (imbangan sama, ruang ±4,4 dB; master
mengembalikan −14 LUFS); (2) `scripts/soften-music.mjs`: pita > 5 kHz dipisah, dikompres cepat (ledakan per ketukan
turun 6,5 dB di 5–8 kHz dan 15 dB di 8–12 kHz; pita < 5 kHz tak disentuh), low-pass 12 kHz, keluaran WAV 24-bit →
`music/alt-hype-long-soft.wav` = `timeline.json` `music`. Mix audio-saja sesudahnya: **Peak −2,86 dBFS, flat factor 0,
nol sampel ≥ 32.000**.

`node scripts/qa.mjs out/lencana-pitch-draft-6.mp4` (10.34, render penuh ulang): 103,10 dtk · **−13,9 LUFS** (sebelum
master −19,22) · **TP −1,2 dBTP** · terbanyak 2 lonjakan luma per detik · caption 227 kata · nol frasa terlarang
(2.139 teks) → **QA HIJAU**; `astats` master: Peak −1,25 dBFS, **flat factor 0**. Pratinjau 20,6 MiB dikirim 10.36;
`Pilihan-Musik/2-…` dan `5-B-hype-dengan-VO.mp3` diganti versi tanpa kresek.

**Celah gerbang yang terbuka oleh kejadian ini:** draf 5 lolos semua cek `qa.mjs` padahal mix-nya clipping — loudness
dan true peak diukur **sesudah** master (gain turun, AAC menghaluskan puncak rata: *flat factor* master draf 5 = 0).
Jejak yang tersisa ada di **input** master: puncak render mentah draf 5 **+0,21 dBFS**. Maka `scripts/master.mjs` kini
menolak memaster input berpuncak ≥ −0,5 dBFS. Uji dua jalur (aturan vault #14): `master.mjs out/draft-5.mp4` →
`INPUT CLIPS: peak 0.21217 dBFS …`, **exit 1, tidak ada berkas keluaran**; `master.mjs out/draft-6.mp4` → `input peak
-2.867069 dBFS (headroom ok)`, −13,9 LUFS / −1,2 dBTP, exit 0.

## 0b. Draf 5 — problem +10 dtk, sertifikat bergerak, audit highlight (7 Okt 09.11–09.57 WIB)

**Pemicu (builder 09.11):** (1) "kirim semua mp3 filesnya ke vault, nanti saya coba test dengerin"; (2) bagian sertifikat
"kan certificate kita ada motionnya, tapi di video cuma diem doang … jalanin motionnya + POV-nya benar-benar natural dari
angle yang keren dan immersive"; (3) "audit bagian highlight-nya … di bagian agent owner 'bring your own AI model' itu
highlighter hijaunya kurang turun, ga sesuai dengan posisi field API key"; (4) "tambahin 10 detik lagi untuk bagian
problemnya … gunakan motion full … gunakan referensi yang saya berikan sebagai pedoman".

**(1) mp3 di vault:** `vault/Video-Workspace/Pilihan-Musik/` (diabaikan git: media hasil generate, sama dengan
`remotion/public/`): `1-A-sekarang-musik.mp3`, `2-B-hype-musik.mp3`, `3-C-nusantara-musik.mp3` (skor saja) dan
`4-…`, `5-…`, `6-…-dengan-VO.mp3` (campuran akhir draf 5: VO + SFX + skor, sudah dimaster). Semua 103,04–103,11 dtk.
Salinan pertama (09.15) adalah versi 93 dtk dari draf 4; ditimpa versi draf 5 pukul 09.55.

**(3) audit highlight — `node scripts/focus-audit.mjs`:** ke-20 ring kini satu sumber, `src/data/focus.json`; adegan
membacanya lewat `box('nama')` (`src/lib/focus.ts`), dan alat audit menggambar tiap kotak (+ bantalan 8 px milik
`<Focus>`) di tangkapan aslinya dengan grid 20 px. Hasil audit pertama: **6 dari 20 meleset** — `brainKey` membingkai
baris catatan "Stays in this browser only…" (y 826), bukan field API key (diukur: field x 374–1438, y 708–748, label
y 688–698) → kini label + field; `brainProviders` tepi atasnya memotong label PROVIDER → kini label + baris logo;
`essaysProposal` memotong angka WORDS "174" → x 848; `certQr` bergeser dan memotong baris "ID kredensial" → plat QR utuh;
`validVerdict`/`revokedVerdict` tidak mencakup ikon dan kelebihan 230 px ke kanan → ikon + kata. Audit ulang: 6/6 pas;
14 lainnya sudah pas sejak awal.

**(2) sertifikat bergerak — `node scripts/capture.mjs --only certMotion`:** halaman produksi, sertifikat B153 dibaca per
alamat (pola T93, kunci perangkat acak). Sesudah klik "▶ Replay motion", **316 animasi CSS** lembar dibekukan lalu
digeser ke k/30 dtk lewat Web Animations API; hitung-naik skor (JS) ditulis dengan rumus halaman sendiri
(`web/src/pages/certificate-view.ts`: tunda 650 ms, 1.300 ms, `cubic-bezier(.22,1,.36,1)`) → **240 frame** (8 dtk) di
DPR 2 → `cert-motion.mp4` 2490×1762. Di S5: kamera makro sudut rendah ke medali (blur kedalaman = salinan buram bertopeng
radial), tarik mundur + orbit ke 3/4, melayang saat "signed/anchored" (ring dari `focus.json` dipetakan ke koordinat
lembar), lalu dorong masuk ke medali yang di-*match-cut* ke koin soulbound. Temuan: `Shot` dengan sisi `'none'` tetap
tampil 10 frame di luar jendelanya (koin menimpa sertifikat sebelum cut) → prop `hard` (potong tepat di batas).

**(4) problem 14,3 dtk:** VO baris 1 baru (rencana §3) — `vo.mjs --only s1`: **13,12 dtk, 31 kata, 142 wpm**; cek dengar
STT: 31 kata, semuanya sesuai naskah. Empat shot (referensi sebagai pedoman): file + slam JUST A FILE (ref5) → jendela
"Edit PDF" melayang 3D + kursor mengilap + stiker NEW NAME / HIGHER SCORE (ref3/ref1/ref2) → tiga sertifikat dikocok,
"Which one is edited?" + lensa (ref5) → pesan "Is this certificate real?" berjalan di garis sirkuit ke penerbit, jam
berputar, hari berganti, "no reply yet" (ref4) → dinding 18 orang, 15 memberi centang "looks fine" (ref3) → slam merah
JUST TRUST IT? → cap UNVERIFIED → pecah ke "Meet Lencana". Durasi ditambah **tepat 5 birama = 10,02 dtk**:
`timeline.json` s2–s8 +10,02 dtk; tiap skor diperpanjang dengan **birama 2 miliknya sendiri ×5** (`extend-intro.mjs`,
naik volume 0,6 → 1; terukur +10,020 dtk untuk ketiganya), jadi lagu yang didengar builder tetap lagu yang sama. Potongan
shot di dalam adegan kini relatif ke awal adegannya (`rel()`), sehingga pergeseran ini tidak perlu disunting di 16 tempat.
Gerbang durasi `qa.mjs` 85–95 → **95–110 dtk** (keputusan builder, AC-B173#1).

| `node scripts/qa.mjs …` (09.48–09.53) | durasi | loudness | true peak | kedipan | caption | frasa terlarang |
|---|---|---|---|---|---|---|
| `out/lencana-pitch-draft-5.mp4` (A, `score-b-long`) | 103,10 dtk | −13,9 LUFS | −1,2 dBTP | terbanyak 2 lonjakan | 227 kata · 46 px · 10,5/16,0/7,4 : 1 | 0 dari 2.139 |
| `…-draft-5-hype.mp4` (B) | 103,10 dtk | −13,9 LUFS | −1,4 dBTP | terbanyak 2 lonjakan | sama | 0 dari 2.139 |
| `…-draft-5-nusantara.mp4` (C) | 103,10 dtk | −13,9 LUFS | −1,3 dBTP | terbanyak 2 lonjakan | sama | 0 dari 2.139 |

Semua **QA HIJAU**. Lonjakan luma ≥ 20 draf 5 (13): 2,03/2,67 (JUST A FILE), 12,90/13,57 (JUST TRUST IT?), 21,87 (wipe
S2→S3), 61,20/61,73 (SOULBOUND), 73,73/74,67 (NO WALLET/NO LOGIN), 95,20/95,70/96,27/97,20 (LEARN/TEST/PROVE IT) —
terbanyak 2 per jendela 1 dtk. Pratinjau CRF 25 (20,2 MiB masing-masing) dikirim 09.57.

## 0a. Draf 4 — koin 3D + tiga pilihan skor (7 Okt 08.37–08.57 WIB)

**Pemicu (builder 08.37):** "untuk bagian not just any NFT, itu bentukan coinnya kurang 3D … cuma bagian depan belakang
ada 2D object coin tapi di antara 2 object itu kosong" + "ada usulan backsound ga". Koin lama memang palsu: muka
dipipihkan `scaleX(|cos θ|)` dan "tebal" hanya elips datar yang digeser — saat menyamping terlihat dua irisan dengan celah.
Kini `src/components/Coin.tsx` = benda CSS 3D: dua muka di ±tebal/2 (tebal 8,5% diameter), tepi 72 faset bergerigi,
tiap faset diberi cahaya Lambert + kilap dari normalnya sendiri, kemiringan −12°, bayangan kontak, teks lingkar
(depan "LENCANA · SOULBOUND BADGE · BNB CHAIN TESTNET", belakang "NON-TRANSFERABLE · CANNOT BE SOLD · CANNOT BE
BURNED" — klaim yang sama dengan VO baris 5, sumber di rencana §3). Diperiksa di 10 still pada sudut kritis
(menyamping 52,7 dtk dan 57,4 dtk, miring, depan, belakang) sebelum render penuh.

**Skor.** `node scripts/music-alt.mjs --style hype|nusantara` — rencana 12 bagian yang **mulai tepat di kata slam**
(SOULBOUND 51,19 · NO WALLET 63,71 · bangunan akhir 80,55 · "Lencana." 83,60 · kartu penutup 87,18; semua dibaca dari
`vo.json`, tiap bagian 3–120 dtk sesuai syarat API). Kredit: 1.361 → 3.685 dari 40.000 (dua skor = 2.324). Pengukuran
(tanpa telinga):

| ukuran | A sekarang (`score-b`) | B hype | C nusantara |
|---|---|---|---|
| tempo (`beats.mjs`, lalu `beats.json` dipulihkan ke `score-b`) | 119,76 BPM, ketukan pertama 0,045 dtk | 119,76 · 0,04 | 119,76 · 0,04 |
| energi rata-rata per bagian (RMS dBFS): Problem / Learn / SOULBOUND / NO WALLET / Name drop / Outro | −23,4 / −14,8 / −13,7 / −13,2 / −14,6 / −23,1 | −16,2 / −16,4 / −15,1 / −13,5 / −14,2 / −17,5 | −40,7 / −20,4 / −13,8 / −10,8 / −10,1 / −21,3 |
| loncatan di detik slam (1 dtk sesudah vs sebelum): 51,19 / 63,71 / 83,60 | +0,2 / +0,1 / −2,1 dB | −0,9 / +0,9 / 0,0 dB | +0,2 / **+7,3** / **+3,0** dB |
| ekor (RMS per 0,5 dtk dari 88 dtk) | −23 → −46 → −59 (sudah habis ±89 dtk) | −16 → −14 → −18 → −40 (penuh sampai ±90 dtk) | −18 → −26 → −36 → −49 |
| vokal tersembunyi (STT `scribe_v1`) | 0 kata | 0 kata | 0 kata |

Video: gambar dirender sekali (`out/draft-4.mp4`), skor B/C ditukar lewat prop komposisi baru `music` dan render
audio-saja (`--codec=wav --props`, 133 dtk per versi), ditempel ke gambar yang sama (`-c:v copy`), lalu dimaster.

| `node scripts/qa.mjs …` | durasi | loudness | true peak | kedipan | caption | frasa terlarang |
|---|---|---|---|---|---|---|
| `out/lencana-pitch-draft-4.mp4` (A) | 93,10 dtk | −14 LUFS | −1,3 dBTP | terbanyak 2 lonjakan | 206 kata · 46 px · 10,5/16,0/7,4 : 1 | 0 dari 1.741 |
| `out/lencana-pitch-draft-4-hype.mp4` (B) | 93,00 dtk | −14 LUFS | −1,4 dBTP | terbanyak 2 lonjakan | sama | 0 dari 1.741 |
| `out/lencana-pitch-draft-4-nusantara.mp4` (C) | 93,00 dtk | −14 LUFS | −1,3 dBTP | terbanyak 2 lonjakan | sama | 0 dari 1.741 |

Semua **QA HIJAU**. Temuan kecil: penempelan pertama memakai `-shortest` dan membuang frame terakhir (2.789 frame) →
diulang tanpa itu (2.790). Pratinjau CRF 25 (17,4 MiB masing-masing) dikirim 08.57; **pilihan skor = keputusan builder**.

## 0. Draf 3 (v3) — `node scripts/qa.mjs out/lencana-pitch-draft-3.mp4` (7 Okt 08.25 WIB, render kedua draf 3)

Master: `measured: I=-14.64 LUFS · TP=0.27 dBTP · LRA=3.90 LU` → `I: -14.0 LUFS · true Peak: -1.3 dBFS`.

```text
#1 berkas
  ok    1920×1080 -> 1920×1080
  ok    30 fps -> 30/1
  ok    H.264 + AAC -> h264 + aac 48000 Hz
  ok    durasi 85–95 detik -> 93.10 s
#7 audio
  ok    loudness −14 ± 1 LUFS -> -14 LUFS
  ok    true peak ≤ −1 dBTP -> -1.3 dBTP
#8 kedipan (WCAG 2.3.1, rata-rata luma per frame)
  ok    tidak ada > 3 kedipan per detik (lonjakan luma ≥ 20 per jendela 1 dtk < 6) -> terbanyak 2 lonjakan di sekitar 1.9 s · 2790 frame dibaca
#3 caption
  ok    caption dibangun dari semua kata VO (tanpa transkripsi) -> 206 kata dalam 8 baris
  ok    huruf caption ≥ 44 px -> 46 px
  ok    kontras kata diucapkan (emas) ≥ 4.5:1 -> 10.5:1
  ok    kontras kata sudah lewat ≥ 4.5:1 -> 16.0:1
  ok    kontras kata berikutnya ≥ 4.5:1 -> 7.4:1
#4 frasa terlarang (Claims-Cheat-Sheet)
  ok    nol frasa terlarang -> 1701 potong teks diperiksa
QA HIJAU — semua pemeriksaan lulus
```

Semua lonjakan luma ≥ 20 di draf 3 (skrip ukur yang sama, daftar per frame): 2,03 / 2,90 dtk (JUST A FILE), 11,83 dtk
(+21, wipe S2→S3), 51,20 / 51,73 (SOULBOUND), 63,70 / 64,63 (NO WALLET → NO LOGIN), 85,17 / 85,70 / 86,27 / 87,20
(LEARN → TEST → PROVE IT → kartu penutup) — **11 lonjakan, terbanyak 2 dalam satu jendela 1 dtk**. Render pertama draf 3
(08.17) merah di #8 (7 lonjakan) — rincian dan perbaikannya di §6. Gerbang hari render (§4) tidak diulang untuk draf 3:
angka di layar dan tangkapan selain sabuk Essays tidak berubah sejak draf 2 (pagi yang sama).

## 1. Gerbang otomatis draf 2 — `node scripts/qa.mjs out/lencana-pitch-draft-2.mp4` (7 Okt ±04.50 WIB)

```text
#1 berkas
  ok    1920×1080 -> 1920×1080
  ok    30 fps -> 30/1
  ok    H.264 + AAC -> h264 + aac 48000 Hz
  ok    durasi 85–95 detik -> 89.10 s
#7 audio
  ok    loudness −14 ± 1 LUFS -> -14 LUFS
  ok    true peak ≤ −1 dBTP -> -1.4 dBTP
#8 kedipan (WCAG 2.3.1, rata-rata luma per frame)
  ok    tidak ada > 3 kedipan per detik (lonjakan luma ≥ 20 per jendela 1 dtk < 6) -> terbanyak 0 lonjakan di sekitar 0.0 s · 2670 frame dibaca
#3 caption
  ok    caption dibangun dari semua kata VO (tanpa transkripsi) -> 196 kata dalam 8 baris
  ok    huruf caption ≥ 44 px -> 46 px
  ok    kontras kata diucapkan (emas) ≥ 4.5:1 -> 10.5:1
  ok    kontras kata sudah lewat ≥ 4.5:1 -> 16.0:1
  ok    kontras kata berikutnya ≥ 4.5:1 -> 7.4:1
#4 frasa terlarang (Claims-Cheat-Sheet)
  ok    nol frasa terlarang -> 1411 potong teks diperiksa
QA HIJAU — semua pemeriksaan lulus
```

**Jalur merah (aturan vault #14), dijalankan sebelum angka di atas dipercaya:** video fixture 88 dtk yang berkedip
hitam-putih tiap 3 frame + berkas `.tsx` sementara berisi "certified" dan "tamper-proof" →

```text
  GAGAL loudness −14 ± 1 LUFS -> -70 LUFS
  GAGAL true peak ≤ −1 dBTP -> 99 dBTP
  GAGAL tidak ada > 3 kedipan per detik (...) -> terbanyak 10 lonjakan di sekitar 0.0 s · 2640 frame dibaca
  GAGAL nol frasa terlarang -> src\_qa_redpath.tsx: "This course is certified and tamper-proof" (/\bcertified\b/i) | ... (/tamper-proof/i)
QA MERAH — 4 gagal
```

Fixture dihapus sesudahnya. Batas alat: pemeriksa kedipan memakai rata-rata luma seluruh frame (kedipan kecil di
sebagian layar tidak terukur); pemeriksa frasa membaca string di naskah dan `src/**/*.tsx`, bukan teks di dalam gambar tangkapan.

## 2. Mix sebelum master (draf 1)

`ebur128` draf 1: **I −14,9 LUFS · LRA 3,4 LU · true peak +0,3 dBFS** (melewati 0 → sebab master wajib). VO gabungan
**−18,2 LUFS**; musik ×0,20 di bawah suara **−27,2 LUFS** (selisih 9 dB) → diturunkan ke ×0,15 (≈11,5 dB, demi penonton
yang bahasa Inggrisnya bukan bahasa ibu). Master dua lintasan `loudnorm` → **−14,0 LUFS · true peak −1,4 dBFS**.

## 3. Suara tanpa telinga — `node scripts/vo-check.mjs` (speech-to-text balik, ElevenLabs `scribe_v1`)

Semua baris terdengar sesuai naskah. Selisih yang dilaporkan hanya normalisasi: "B N B" terdengar "BNB", "one Ed Tech …
three point oh" terdengar "One EdTech Open Badges 3.0". Nama: baris 2 terdengar **"Lenchana"** (sesuai bunyi *len-CHA-na*),
baris 8 terdengar "Linchana" (vokal pertama mendekati schwa). **Yang tetap butuh telinga builder:** warna suara, tempo, musik.

## 4. Gerbang hari render (angka dari run hari ini, 7 Okt)

| perintah | hasil |
|---|---|
| `BASE_URL=https://lencana-edge…workers.dev node scripts/validator-check.js --hash 0xb9fb06e5… --record` | **VALIDATOR HIJAU — 10/10**; `outcome VALID · 14 pemeriksaan · 0 error · 0 warning`; tercatat di `validator-runs.jsonl`. Catatan: bawaan `BASE_URL` skrip masih `127.0.0.1:8787` — sejak B156 tidak ada signer lokal, jadi run tanpa `BASE_URL` gagal `ECONNREFUSED` |
| `cd signer && npm run e2e` | **E2E HIJAU — 48 pemeriksaan, 0 gagal**; termasuk kertas tercabut `0xdbd7c72f…` yang dipakai video (bit tersaji = 1) dan verdict validator pihak ketiga VALID |
| `cd signer && npm run journey` | **JOURNEY HIJAU — 34 pemeriksaan, 0 gagal** (10 tahap; dua kertas baru terbit, artefak dicetak `mintBatch`, prasyarat dicabut tanpa merobohkan kertas yang masih berlaku). Temuan: teks naratif "TIDAK ADA DI CORE" di akhir `signer/scripts/journey.js` sudah basi — masih menulis "tabel `orders` tidak pernah ditulis… pembelian kursus belum ada", padahal sejak B125 kursus berbayar menulis `orders` (dicatat, belum diubah) |
| `cd signer && npm run cleanup -- --apply` (sesudah `e2e` + `journey`) | **CLEANUP HIJAU** — sisa `origin=test` → **0**; `origin=unknown` → 0 (tidak disentuh) |
| `POST /admin/overview` (signer lokal, admin fixture) | `platformBps` **1000** (dibaca dari chain), kotor 27 LDC-demo, 8 kursus, 13 pendaftaran — angka benda di S7/S8 |

## 5. Asal tiap layar (produk sungguhan)

| tangkapan | sumber | identitas |
|---|---|---|
| beranda, katalog, kursus, masuk, verifikasi (VALID/REVOKED), Trust Center | produksi `lencana-psi.vercel.app/?lang=en` (commit `46ed3eb`) | tamu |
| panel bayar kursus | produksi | fixture peserta `C_learner` (kunci scratchpad, tidak dicetak) |
| lembar sertifikat, panel bukti NFT, dialog LinkedIn, "My credentials" | produksi | **hanya-baca per alamat** pemegang B153 `0x12f6F95E…11DF` dengan kunci perangkat acak (pola T93) |
| kelas | produksi | fixture peserta B143 (`0xea817a33…`), isi kelas publik |
| dasbor penerbit (Essays, Agents, Revenue, Learners) | produksi | kunci penerbit `ISSUER_PRIVATE_KEY` dari `app/.env` — dibaca skrip, tidak dicetak, tidak ada aksi tulis |
| pemilik agen #2534 (Look, Brain) dan #2542 | produksi | `AGENT_OWNER_PRIVATE_KEY`, `REVIEWER_OWNER_PRIVATE_KEY` (idem) |
| Admin (sabuk + rekaman gerak 9 dtk + popup) | build lokal commit yang sama, signer lokal `LANCENA_ORIGIN=test`, database produksi | admin fixture baru (kunci di scratchpad), `ADMIN_ADDRESSES` = fixture |
| **v3:** dasbor penerbit Essays dengan sabuk esai B174 (tangkapan + rekaman gerak 9,0 dtk, 7 Okt 07.54) | build lokal `web/` pada commit `87ba9ab` (B174 belum didorong, jadi produksi belum punya sabuknya) — vite `127.0.0.1:5174`, backend signer produksi Railway (tidak ada signer lokal yang hidup) | kunci penerbit `ISSUER_PRIVATE_KEY` dari `app/.env` — dibaca skrip, tidak dicetak, tanpa aksi tulis |

Tidak ada API key, private key, atau email orang lain di layar (kolom kunci di tab Otak kosong; alamat di tabel hanya
bentuk pendek). Baris `origin=test` di database: 9 pendaftaran tersisa dari run harness sebelumnya (bukan dari sesi
tangkapan — sesi itu hanya membaca) → dibersihkan `npm run cleanup -- --apply` sesudah `e2e`/`journey`.

## 6. Temuan selama produksi

- **Klaim salah di naskah tertangkap:** "pay with a single signature" — `web/src/learning.ts:1334` menyebut pembayaran
  = **dua tanda tangan** (izin EIP-2612 + saksi Permit2), nol transaksi dari dompet peserta. VO baris 3 dibaca ulang:
  "pay by signing — no gas fees"; halaman kursus sendiri menulis "You only sign — no gas, no wallet top-up".
- Tagihan agen di data hari ini masih **due** (2), belum **paid** → chip S4 ditulis "Hired per job · a fee per grading",
  bukan "paid on-chain".
- Tangkapan internal tidak bisa memakai fixture lama untuk progres kelas (baris `origin=test` sudah dibersihkan
  run-run sebelumnya); centang lesson di S3 adalah lapisan animasi di atas halaman kelas asli, kuis S3 adalah grafis
  penjelas (pertanyaan diterjemahkan dari kuis nyata Kelas Uji), bukan tangkapan layar.
- **v3 — gerbang kedipan menangkap transisi saya sendiri (7 Okt 08.17).** Render pertama draf 3 → `QA MERAH — 1 gagal`:
  `terbanyak 7 lonjakan di sekitar 43.3 s`. Daftar lonjakan per frame (skrip ukur yang sama dengan `qa.mjs`, ambang 20):
  wipe lingkaran emas di 44,03–44,23 dtk (S4→S5) dan 75,10–75,33 dtk (S6→S7) membanjiri layar dari luma ±40 ke ±180 dalam
  4 frame lalu kembali dalam 3 frame (lonjakan +23 +45 +48 +21 −21 −52 −46); wipe S2→S3 di 12,0 dtk 5 lonjakan (lolos tipis).
  Penyebab: jari-jari di-ease kubik, jadi luas yang tertutup melonjak di frame-frame terakhir. **Gerbangnya tidak
  dilonggarkan** — transisinya yang diubah: luas tertutup kini naik/turun rata (bisection jari-jari terhadap luas di grid
  40 px, `src/components/Stage.tsx`), 24 frame. Uji segmen sebelum render ulang: S5 dan S7 **0** lonjakan ≥ 20 (terbesar
  16), S3 **1** (+21). Lima blok warna penuh (JUST A FILE, SOULBOUND, NO WALLET/NO LOGIN, LEARN/TEST/PROVE IT) tetap
  potongan keras: masing-masing satu pasang naik–turun per ≥ 0,5 dtk, terbanyak 2 lonjakan per jendela 1 dtk.
- **v3 — tabrakan tata letak tertangkap di still, bukan di render:** judul kinetik di kiri menimpa tepi bingkai browser di
  lima shot (Pay, Bring your own AI model, Revoked, One transparent pipeline, Every payment) dan teks muka belakang medali
  terpotong (isi muka dibentangkan `scaleX(1/w)` alih-alih ikut dipipihkan). Diperbaiki sebelum render penuh; 30 + 12 still
  ulasan di `out/stills-v3*/` (diabaikan git).

## 7. Belum

- ~~Telinga builder atas draf 2 (suara, musik)~~ → 7 Okt 07.10: "overall bagus dan udah sangat oke, tapi masih bisa di
  push lebih gila lagi" + tiga permintaan → draf 3. ~~Telinga + mata builder atas draf 3~~ → 08.37: "Nice ini dulu" +
  koin kurang 3D + minta usulan backsound → draf 4 (§0a) → 09.11: mp3 ke vault, sertifikat bergerak, audit highlight,
  problem +10 dtk → draf 5 (§0b) → 10.25: skor **hype** dipilih ("MANTAP BANGET") + hilangkan kresek → draf 6 (§0c).
  Acc builder atas draf 6 sebagai render final — AC-B173#12(d).
- Render final + unggah + submit — builder (B65/B64), AC-B173#13.
- Catatan halus draf 3 (belum diubah): selama setengah pertama wipe, sisi layar yang belum tertutup sudah menampilkan
  adegan berikutnya yang mulai masuk (tumpang-tindih adegan `XF` = 8 frame vs pertumbuhan wipe 12 frame).
