---
tags: [testing, "T97", video]
status: active
updated: 2026-10-07
command: cd vault/Video-Workspace/remotion && node scripts/qa.mjs out/lencana-pitch-draft-2.mp4 · node scripts/vo-check.mjs · cd signer && npm run e2e · npm run journey · BASE_URL=<host tepi> node scripts/validator-check.js --hash <B153> --record
measured: 2026-10-07
result: QA HIJAU (draf 2, sesudah master) — 1920×1080 · 30 fps · H.264+AAC · 89,1 dtk · −14,0 LUFS · true peak −1,4 dBTP · nol kedipan · caption 196 kata, kontras ≥ 7,4:1 · nol frasa terlarang (1.411 potong teks); jalur merah terbukti; validator 1EdTech VALID 14/0/0; e2e 48/0; journey 34/0; cleanup sisa 0
---

# T97 - Uji video pitch 90 detik (B173)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B173 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B173 - Video pitch 90 detik]] · **Rencana:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Summary:** menyusul sesudah acc builder atas render final

## Cara mengulang

Semua perintah dari `vault/Video-Workspace/remotion/` (daftar lengkap di `README.md` folder itu): VO `node scripts/vo.mjs`,
cek dengar `node scripts/vo-check.mjs`, musik `node scripts/music.mjs`, ketukan `node scripts/beats.mjs`, tangkapan
`node scripts/capture.mjs`, render `npx remotion render LencanaPitch out/draft.mp4 --crf=20 --gl=angle`, master
`node scripts/master.mjs out/draft.mp4 out/lencana-pitch.mp4`, gerbang `node scripts/qa.mjs out/lencana-pitch.mp4`.

## 1. Gerbang otomatis — `node scripts/qa.mjs out/lencana-pitch-draft-2.mp4` (7 Okt ±04.50 WIB)

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

## 7. Belum

- Telinga builder atas draf 2 (suara, musik) — AC-B173#12.
- Render final + unggah + submit — builder (B65/B64), AC-B173#13.
