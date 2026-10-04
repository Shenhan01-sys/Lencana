---
tags: [testing, "T68", e2e]
status: active
updated: 2026-10-04
command: npm run judge · judge-variance · verify:brain:live · verify:attempts:live · journey · verify:agents:live · verify:praktik:live · verify:relay:live · x402 · monitor:edge · uji peramban otak agen dengan Groq sungguhan
measured: 2026-10-04
result: sepuluh alur live hijau (7/0 · 5/5 stabil · 63/0 · 84/0 · 34/0 · 40/0 · 32/0 · 17/0 · 20/0 · AMAN); jalur otak agen B135 lewat UI dengan Groq sungguhan — sewa dari kartu kontrak → kalibrasi 93/4 → antrean → usulan 98 / 5 → pengesahan agen reviewer → gerbang kursus; dua cacat kecil ditemukan dan ditutup (B142)
---

# T68 - E2E penuh: esai dinilai agen sampai kredensial (4 Okt)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Diminta:** builder 4 Okt — "Testing essay dan agentnya untuk menilai dll udh
berhasil kah? Integration + E2E test", lalu "gas" atas usulan dua bagian (A otomatis live, B peramban) · **Pendahulu:**
[[09-Testing/T40 - E2E penuh sebelum FE (1 Okt)]] · **Halaman per alur:** [[09-Testing/T11 - npm run judge]] ·
[[09-Testing/T12 - npm run judge-variance]] · [[09-Testing/T62 - signer brain-check.js (B135 otak agen)]] ·
[[09-Testing/T22 - signer attempts-check.js]] · [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]] ·
[[09-Testing/T63 - Uji peramban otak agen (B135)]] · **Temuan:** B142 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

## Kenapa uji ini perlu — celah yang terukur sebelum run

- Baterai `sync:numbers` hanya menjalankan jalur murah: **tanpa gas dan tanpa panggilan LLM**.
- E2E on-chain penuh terakhir: T40, **1 Okt** — sebelum B130–B141 (robot agen, otak agen, bursa agen).
- Di `verify:attempts:live`, langkah esai memakai usulan buatan harness (`harness:proposal-80pct`), **bukan LLM**.
- Uji peramban otak agen T63 memakai **provider tiruan**; kunci tim tidak pernah sampai ke peramban.
- Jadi jalur B135 — LLM di peramban pemilik → antrean dompet agen → penilaian bertanda tangan → pengesahan → gerbang — belum
  pernah dijalankan dengan LLM sungguhan, dan tanda tangan dari kartu kontrak bursa (AC-B138#11) belum pernah dijalankan.

## A — alur live otomatis (berurutan, satu per satu, BSC testnet 97)

| # | alur | perintah | hasil | bukti |
|---|---|---|---|---|
| 1 | LLM benar-benar menjatuhkan esai kosong | `npm run judge` | **PENILAI SAH — 0 gagal** (7 pemeriksaan) | `openai/gpt-oss-120b`: bagus **92**, fasih-tapi-kosong **4**, kependekan ditolak mekanis; pembanding `qwen/qwen3.8-27b` 100 / 5 |
| 2 | stabilitas | `npm run judge-variance` | keputusan benar **5 / 5** | bagus 92–100 (rata-rata 95,8), kosong **4** di semua run, jarak 91,8 poin; beberapa HTTP 429 tertangani dengan coba ulang |
| 3 | otak agen, kalibrasi sungguhan lewat adaptor peramban | `npm run verify:brain:live` | **OTAK AGEN LIVE HIJAU — 63 / 0** | Groq: substantif 99, kosong 4, temperature 0 |
| 4 | peserta lewat HTTP sampai kertas terbit (usulan → pengesahan reviewer → gerbang → `issue --from-attempts` → `publish:edge`) | `npm run verify:attempts:live` (kredensial Cloudflare dari env User lewat pembungkus) | **84 / 0** | kertas `0x621985efee1d02f022984b237b7276fb5c976ad30949b8f907c996d390a7b0c4` · hasil di tepi: esai = angka reviewer 100, bukan usulan 80 |
| 5 | siklus hidup kredensial (esai dinilai **model**, `--judge`) | `npm run journey` | **JOURNEY HIJAU — 34 / 0** | A `0x5e5d4997…54f8e0` uid `0xd825d787…df321e` (333.496 gas) · B `0xa334083f…257049` uid `0x2e53ac01…028b61` (387.290 gas), prasyarat B = uid A · validator 1EdTech **VALID 14 / 0 / 0** keduanya · `mintBatch` · cabut A `0xeac331ce…d2a484` (75.532 gas), re-anchor `0xc1567b1e…78987c` (45.869 gas) · SBT A → REVOKED, B tetap VALID |
| 6 | sewa agen + pengesahan agen + bayar x402 | `npm run verify:agents:live` | **40 / 0** (B119 25/25 · B120 15/15) | tagihan menilai #97 `0x757d8e96…4aef167`, mengesahkan #98 `0x95447444…3399aa0` |
| 7 | praktik dinilai chain | `npm run verify:praktik:live` | **32 / 0** | transfer baru `0xe0bbf7dc…e6d285` |
| 8 | relayer penerbitan (platform membayar gas) | `npm run verify:relay:live` | **17 / 0** | siaran `0x1884344e…b36cf3` (347.047 gas, blok 134791344) |
| 9 | verifikasi berbayar x402 | `npm run x402` (signer demo :8787) | **20 / 0** | settle `0x7b7fc31e…d041517e2`, split `0x085399fd…d4c4d4527`; klien tanpa BNB |
| 10 | permukaan publik vs chain | `npm run monitor:edge` | **AMAN — 0 alarm** | 37 hash dipantau, 29 berdokumen; revocation 37/37 cocok chain (8 bit), suspension 37/37 (2 bit); umur state 0,1 jam |

## B — jalur otak agen B135 lewat peramban, Groq sungguhan

**Alat:** vite `:5173` + signer demo `:8787` + Chromium headless 1440×1000. **Identitas:** anggota penerbit uji M `0x370D…1D4D`
(keanggotaan `origin=test`, `hire=1 appoint=1`, lewat `LANCENA_ORIGIN=test npm run grant:member`) dan pemilik + dompet agen
**#2548** R `0x1D29…8169` (fixture T61) — keduanya diserahkan ke halaman oleh server lokal sekali-pakai, kuncinya tidak
tercetak. **Kunci Groq** (`app/.env`) diserahkan ke halaman dengan cara yang sama dan hanya hidup di `sessionStorage` halaman
itu — panggilan ke Groq langsung dari peramban (D69); `localStorage` kosong (“ingat” tidak dicentang). **Esai:** dua peserta
uji acak (`origin=test`) di Kelas Uji `uji-bayar-2026` / `esai-pembayaranmu` — sengaja kursus lain dari esai uji builder
719/720 (web3-dasar), yang sesudah run tetap `awaiting_judge`.

| # | langkah | hasil |
|---|---|---|
| 1 | M membuka Penerbit → Agents | 6 lapak robot; tim kursus terbaca |
| 2 | "Hire as grader" di lapak #2548 → kartu kontrak, pilih Kelas Uji → **Sign & hire** | kartu tertutup sendiri, bursa dimuat ulang: tim Kelas Uji = penilai Pak Teliti #2548 (**AC-B138#11, tanda tangan dari kartu — pertama kali**) |
| 3 | "Appoint as reviewer" di lapak #2542 → kartu penunjukan | Web3 Dasar **terhalang dengan alasannya** ("already working here") sebelum tanda tangan; pilih Kelas Uji → **Sign & appoint** → "Appointed — recorded under your address"; tim Kelas Uji = #2548 + pengesah #2542 |
| 4 | seed: dua peserta uji menyerahkan esai lewat server uji sendiri | attempt **785** (substantif, 164 kata) dan **786** (fasih-tapi-kosong, 90 kata), `awaiting_judge` |
| 5 | R membuka Agent Owner → panel Grading brain #2548 ("no brain yet") → **Fetch models** | daftar **sungguhan** dari Groq: 6 model — termasuk dua model TTS `canopylabs/orpheus-*` (**cacat, B142**) |
| 6 | pilih `openai/gpt-oss-120b` → **Run calibration** (dua esai uji ke Groq dari peramban) | **Calibration passed — substantive 93, empty 4**, garis lulus ≥ 70 |
| 7 | **Sign & install brain** | "installed · groq/openai/gpt-oss-120b · 4 Oct 2026" |
| 8 | **Open the queue** (tanda tangan dompet agen = R) | tepat **2 esai Kelas Uji**; esai web3-dasar milik builder tidak muncul |
| 9 | nilai 785 → label **sedang** → **Sign & send judgement** | usulan **98/100** (40/40 · 40/40 · 18/20) → cap "Sent · 98 · pass · 0.0023 LDC-demo fee due" |
| 10 | nilai 786 → label **ringan** → kirim | usulan **5/100** (0/40 · 0/40 · 5/20) → "Sent · 5 · fail · 0.0021 LDC-demo fee due" |
| 11 | agen reviewer #2542 mengesahkan keduanya (`approved`, label sedang) — skrip bertanda tangan dompet `AGENT_REVIEWER`, lewat `POST /essay/review` di signer yang sama | 200 / 200: akhir **98 pass** dan **5 fail** |
| 12 | baca balik Postgres | attempts: `judge_model groq/openai/gpt-oss-120b`, `judge_temp 0`, `graded_by_agent 2548`, label sedang/ringan · `judgement_reviews`: approved, `reviewer_agent_id 2542` · `agent_charges`: menilai 2300 + 2100 ke dompet #2548, mengesahkan 1725 + 1725 ke dompet #2542, semua `due` · submissions `judged` · `course_gates`: `graded_attempts 1`, `best_score` 98 / 5 |
| 13 | bursa + bengkel sesudahnya | #2548: otak `groq/openai/gpt-oss-120b` 93/4, "2 graded", verdicts approved 2, papan meja "Kelas Uji"; #2542 ikut bekerja di Kelas Uji |

## Batas — yang TIDAK dibuktikan run ini

- **Satu lintasan dari usulan otak B135 sampai kertas terbit** tidak dijalankan: bagian B berhenti di pengesahan + gerbang
  kursus (kuis, praktik, dan bacaan Kelas Uji tidak dikerjakan peserta uji), dan penerbitan dari usaha yang disahkan dibuktikan
  bagian A (#4) dengan usulan buatan harness, serta #5 dengan esai yang dinilai model lewat CLI penerbit. Ketiga potongan itu
  berbagi rute dan tabel yang sama, tapi bukan satu run.
- **Pengesahan dari layar** tidak diuji: dompet agen reviewer #2542 bukan akun pemiliknya, jadi pengesahannya dijalankan skrip
  bertanda tangan dompet itu (seperti `verify:agents`).
- **Akun sungguhan builder** (dompet Privy) belum menjalankan jalur ini — tetap uji builder (AC-B135#10, AC-B138#10).
- Tagihan dari bagian B tidak dibayar (pembayaran x402 tagihan agen dibuktikan #6).

## Gerbang sesudah run

Baterai `sync:numbers` 4 Okt: **33 harness · 33 hijau** — korpus bertambah, jadi `check` 106 → **112 / 0**, `e2e` 47 → **48 / 0**,
`verify:live-cert` 47 → **59 / 0**, `verify:edge` **29 dari 29**; `--verify` sempat merah 4 klaim (halaman masih menulis korpus 26)
dan dua baris README (A10) — dikoreksi terlihat, lalu **ANGKA HIJAU — 62 klaim** dan **AUDIT BERSIH**; `check:labels` 8 / 0;
`verify:brain` 60 / 0 sesudah B142; `tsc` 0; gerbang vault hijau.

## Kebersihan dan biaya

- Bagian B dihapus dengan saringan persis, lalu dikueri ulang: per peserta 1 pengesahan · 2 tagihan · 1 submission ·
  8 komponen · 1 usaha · 1 enrollment; sewa #2548 Kelas Uji, penunjukan #2542 Kelas Uji, otak #2548 (dipasang sesudah mulai uji),
  keanggotaan M — **sisa 0 semua**. Penyimpanan peramban dikosongkan sebelum instans ditutup.
- Bagian A meninggalkan barisnya sesuai B78 (`verify:attempts:live` menulis "TETAP ADA setelah run"); korpus yang dipantau
  34 → **37** hash, berdokumen 26 → **29**. Penunjukan reviewer manusia uji `0xa1C4…a5e9` di web3-dasar berasal dari 30 Sep
  dan dipakai ulang run ini (tidak menumpuk).
- Gas yang dicetak harness: 333.496 + 387.290 + 75.532 + 45.869 (journey) + 347.047 (relayer); sisanya tidak dicetak harnessnya.
  `cleanup -- --apply` **tidak** dijalankan: ia akan ikut menghapus esai uji builder 719/720 (`origin=test`).
