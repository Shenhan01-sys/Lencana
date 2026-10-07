---
tags: [testing, "T97", video]
status: active
updated: 2026-10-07
command: cd vault/Video-Workspace/remotion && node scripts/qa.mjs out/lencana-pitch-draft-3.mp4 · node scripts/vo-check.mjs · cd signer && npm run e2e · npm run journey · BASE_URL=<host tepi> node scripts/validator-check.js --hash <B153> --record
measured: 2026-10-07
result: QA HIJAU (draf 3 / v3, sesudah master, 08.25) — 1920×1080 · 30 fps · H.264+AAC · 93,1 dtk · −14,0 LUFS · true peak −1,3 dBTP · lonjakan luma terbanyak 2 per detik · caption 206 kata, kontras ≥ 7,4:1 · nol frasa terlarang (1.701 potong teks); render pertama draf 3 MERAH di kedipan (wipe emas) → diperbaiki di transisinya, bukan di gerbangnya. Draf 2: QA HIJAU 89,1 dtk; jalur merah terbukti; validator 1EdTech VALID 14/0/0; e2e 48/0; journey 34/0; cleanup sisa 0
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
  push lebih gila lagi" + tiga permintaan → draf 3. Telinga + mata builder atas **draf 3** — AC-B173#12.
- Render final + unggah + submit — builder (B65/B64), AC-B173#13.
- Catatan halus draf 3 (belum diubah): selama setengah pertama wipe, sisi layar yang belum tertutup sudah menampilkan
  adegan berikutnya yang mulai masuk (tumpang-tindih adegan `XF` = 8 frame vs pertumbuhan wipe 12 frame).
