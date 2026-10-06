---
tags: [results, executive-summary, B135]
status: active
updated: 2026-10-03
---

# B135 - Executive Summary — otak agen: tujuh provider LLM, kalibrasi wajib, semi-otomatis (D69)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B135 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B135 - Otak agen tujuh provider semi-otomatis]] ·
**Testing:** [[09-Testing/T62 - signer brain-check.js (B135 otak agen)]] · [[09-Testing/T63 - Uji peramban otak agen (B135)]] ·
**Keputusan:** D69

## 1. Apa yang diubah

- **Agen kini punya otak yang dipasang pemiliknya.** Di bawah robot di bengkel, panel "Otak penilai" adalah benda:
  - **rak tujuh kartrid** — OpenAI, Anthropic, Qwen, xKiro, Groq, GLM, DeepSeek; kartrid terpasang ber-LED;
  - **gantungan kunci** — API key milik pemilik, hanya di peramban ini (sesi, atau perangkat bila diingat), tidak pernah ke
    server Lencana; panggilan langsung dari halaman ke provider;
  - **pita model** — diambil dari daftar model provider itu sendiri (model non-chat disaring, bisa dicari, bisa diketik);
  - **bangku uji kalibrasi** — dua kertas uji meluncur ke angkanya di skala 0–100: esai fasih-tapi-kosong harus berhenti di zona
    merah (< 70), esai substantif di zona hijau (≥ 70). Rubrik, esai, dan prompt-nya sama dengan penilai penerbit (`npm run judge`).
- **Otak dicatat dengan tanda tangan pemilik** (`ownerOf` di registry ERC-8004). Tanpa kunci: server memeriksa aturan
  kalibrasinya dan kepemilikannya, tetapi tidak bisa mengulang panggilan model — angkanya laporan pemilik yang ditandatangani.
- **Antrean esai untuk dompet agen.** Esai yang menunggu nilai dari kursus yang menyewa agen itu, dibaca oleh dompet agen (yang
  menandatangani nilainya). Esai milik operator agen sendiri tidak masuk; alamat peserta tidak ikut.
- **Model mengusulkan, pemilik menandatangani.** "Nilai" → penggaris rubrik (lebar segmen = bobot kriteria, isi = angka model,
  garis hijau = nilai lulus); pemilik memilih anak tangga label (harga ikut terlihat) lalu menandatangani. Angka model tidak bisa
  disunting. Penilaian membawa nama model otak dan temperature yang benar-benar terpakai. Atas nama model lain → ditolak sebelum
  apa pun berubah.
- **Satu sumber prompt.** Prompt penilai dan pengurainya dipindah dari `signer/src/judge.js` ke `web/src/judge-prompt.ts`, dipakai
  server dan peramban; isinya sama persis dengan teks 24 Sep yang diukur `judge-check`/`judge-variance` (sha256 `d852979f…`).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| agen milik akun punya otak | tidak — rute B119 hanya menerima nilai bertanda tangan | tujuh provider, model dari endpoint, kalibrasi wajib |
| kalibrasi sungguhan (Groq `openai/gpt-oss-120b`, adaptor peramban) | — | substantif **99**, kosong **3**, temperature 0 (`verify:brain:live`) |
| CORS dari peramban sungguhan (T63) | diperiksa preflight `GET` saja | **13 dari 14** endpoint lolos; chat Z.ai diblokir → GLM lewat Zhipu BigModel |
| penilaian agen dari halaman | — | #2548 → attempt 652: 84 lulus, `groq/openai/gpt-oss-120b`, temperature 0, tagihan 2300 (jawaban provider ditiru; barisnya dibersihkan) |
| `verify:brain` | — | **60/0** (baterai) · live **63/0** |
| `verify:agents` | 34/0 | 34/0 (agen tanpa otak tetap diterima rute B119) |
| `verify:owner` | 32/0 | 32/0 |
| `probe` | 118/0 | 118/0 |
| entry bundle | 812.72 kB (B132) | 846.39 kB |
| baterai `sync:numbers` | 30 harness · 28 hijau (B132) | **31 harness · 27 hijau** — dua merah warisan data tepi (`verify:edge` umur 43,3 jam, `verify:quizkeys` 60/66 → `publish:edge` oleh builder) + **dua merah baru bukan dari B135**: `verify:studio` 28/1 dan `verify:praktik` 22/1 — struk transaksi lama tidak lagi disajikan `RPC_URL` (temuan **B136**) |
| `sync:numbers --verify` | 56 klaim, 5 merah | **58 klaim, 9 merah** — semuanya karena sumbernya harness merah di atas; dua klaim `verify:brain` cocok |
| `audit` | A9 222 marker · A10 1 TEMUAN | A9 **235** marker cocok dua arah · A10 22 klaim, **1 BEDA** (`verify:edge`, sama dengan B132) |
| `check:labels` | 8/0 | 8/0 |

Semua angka di atas dari run 3 Okt (baterai 13:36 WIB, log `battery-3okt-b135.log` di scratchpad sesi; `numbers.json` tertulis
dari run itu).

## 3. Koreksi yang ditemukan pekerjaan ini

- **D69 menulis "CORS semua yang dipilih mengizinkan"** — pagi itu yang diperiksa hanya preflight `GET` daftar model. Uji
  peramban T63 mendapati chat Z.ai internasional diblokir (preflight `POST` tanpa satu pun header CORS). GLM dipindah ke Zhipu
  BigModel; kunci Z.ai tidak bisa dipakai dari peramban (model GLM tetap ada lewat xKiro). Koreksi terlihat di D69, `llm.ts`, T63.
- Daftar cadangan GLM yang kutulis (glm-4.5/4.6) usang — xKiro memuat sampai glm-5.3; diganti.

## 4. Yang belum

- Agen belum menilai sendiri: setiap penilaian butuh tanda tangan pemilik di peramban. Mode otomatis penuh (kunci terenkripsi
  di server + penanda tangan operasional) = backlog berikutnya, perlu keputusan builder.
- Login sungguhan builder dengan kunci provider miliknya (AC-B135#10).
- Rute penilaian B119 belum MEWAJIBKAN otak (harness #2534 menilai dengan nama model harness).
- Temuan samping: **B136** (struk lama dari publicnode), **B137** (kartu agen swalayan berlabel "Dicetak platform").

## Pembaruan 6 Okt malam (catatan kedua)

Rak provider kini memakai logo (enam SVG resmi lobe-icons + favicon resmi xKiro; nama tetap `aria-label` dan tooltip) dan keterangan "Pilih provider, pakai API key…" dipindah tepat di bawah "Otak agen · #id".
