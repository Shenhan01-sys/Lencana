---
tags: [testing, B135, browser]
status: active
updated: 2026-10-03
---

# T63 - Uji peramban otak agen (B135)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B135 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B135 - Otak agen tujuh provider semi-otomatis]] ·
**Harness:** [[09-Testing/T62 - signer brain-check.js (B135 otak agen)]] · **Summary:** [[08-Results/B135 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`, dinyalakan ulang sesudah suntingan B135) + Chromium headless
(MCP) 1440×1000, ponsel 500 px lewat iframe. Tanggal: 3 Okt siang. Akun: identitas uji R `0x1D29…8169` (pemilik + dompet agen
**#2548** dari T61) — diserahkan ke halaman oleh server lokal sekali-pakai di `127.0.0.1`, jadi kuncinya tidak tercetak di mana pun.

**Yang DITIRU, dan kenapa:** jawaban provider LLM. Fetch ke `api.groq.com` diganti tiruan di halaman (daftar model + skor yang
ditentukan dari teks esai: substantif 96, kosong 4, esai antrean 84) dengan kunci palsu `gsk_uji_palsu_T63`. Kunci tim tidak
diketik ke peramban otomatis (akan tercatat di transkrip alat); kalibrasi sungguhan dengan kunci tim dibuktikan Node lewat adaptor
yang sama (T62 `--live`: 99 / 3). **Yang TIDAK ditiru:** tanda tangan, rute signer, database, registry di chain, dan CORS (langkah 1).

**Persiapan (skrip scratchpad, server uji `origin=test` sendiri):** penerbit menyewa #2548 untuk `web3-dasar-2026`; satu peserta
uji acak menyerahkan esai (attempt **652**, 320 kata, `awaiting_judge`).

| # | langkah | hasil |
|---|---|---|
| 1 | CORS dari halaman sungguhan (asal `http://127.0.0.1:5173`), kunci palsu `x`, untuk ketujuh provider: `GET` daftar model + `POST` chat | **13 dari 14 lolos**: OpenAI, Anthropic (dengan header `anthropic-dangerous-direct-browser-access`), Qwen, Groq, DeepSeek → 401 terbaca di keduanya; xKiro daftar model **200** tanpa kunci, chat 401. **GLM (Z.ai `api.z.ai`) chat → "Failed to fetch"** — lihat temuan di bawah |
| 2 | `#/app/owner` sebagai R | bengkel "Pak Teliti (uji T61)" + panel **Otak penilai**: "belum ada otak", rak tujuh kartrid, Groq terpilih |
| 3 | isi kunci palsu → "Ambil daftar model" | kunci tersimpan di `sessionStorage` saja (`localStorage` kosong — "ingat" tidak dicentang); permintaan `GET …/models` membawa `Bearer`, kunci tidak di URL; **3 model chat** (whisper tersaring), pilih `openai/gpt-oss-120b` |
| 4 | "Jalankan uji kalibrasi" | dua tahap ("Menilai esai substantif" → "fasih-tapi-kosong"), bangku uji: kertas **kosong · 4** berhenti di zona merah, **substantif · 96** di zona hijau, garis lulus ≥ 70; "Kalibrasi lulus"; tombol pasang aktif |
| 5 | "Tandatangani & pasang otak" | `POST /owner/agents/brain` → "Otak terpasang."; baris `agent_brains` #2548: `groq` / `openai/gpt-oss-120b`, `{substantive 96, hollow 4, passMark 70, temperature 0}`, pesan `lencana-agent-brain agent=2548 … sub=96 empty=4 temp=0 nonce=…` bertanda tangan R |
| 6 | dasbor memuat ulang | pil "terpasang · groq/openai/gpt-oss-120b", soket hijau, kartrid Groq ber-LED, bangku statis 4 / 96, formulir tertutup ("Ganti otak") |
| 7 | "Buka antrean" (tanda tangan dompet agen = R) | **1 esai menunggu**: Web3 Dasar · esai-batas-bukti · usaha 1 · 320 kata |
| 8 | "Nilai dengan groq/openai/gpt-oss-120b" | esai di kertas krem (bisa digulir), penggaris rubrik 5 segmen (lebar = bobot 25/25/25/15/10, garis hijau di 70), **Total 84/100 lulus**, tujuh anak tangga label dengan harganya (0.002 … 0.0026); tombol kirim terkunci sampai label dipilih |
| 9 | pilih "sedang" → "Tandatangani & kirim penilaian" | cap **"TERKIRIM · 84 · LULUS · 0.0023 LDC-demo bayaran jatuh tempo"**; database: attempt 652 `score 84`, `verdict pass`, `judge_model groq/openai/gpt-oss-120b`, `judge_temp 0`, `graded_by_agent 2548`, label `sedang`, submission `judged`, tagihan **2300 due** ke dompet agen `0x1D29…8169` |
| 10 | ponsel 500 px (iframe) | panel bertumpuk, kartrid tiga per baris, lebar dokumen **485 ≤ 500** |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:**
- **GLM tidak bisa menilai dari peramban** (langkah 1): preflight `POST /chat/completions` Z.ai internasional — juga jalur `coding`
  dan `anthropic`-nya — dijawab `200` tanpa satu pun header CORS (diperiksa ulang dengan curl, semua varian header), padahal
  `GET /models`-nya mengizinkan. Zhipu BigModel (`open.bigmodel.cn/api/paas/v4`) mengizinkan keduanya (401 terbaca dengan kunci
  palsu). Adaptor GLM dipindah ke BigModel, label "GLM (Zhipu)", dengan catatan di panel: kunci Z.ai internasional tidak bisa
  dipakai dari peramban; model GLM juga tersedia lewat xKiro (`z-ai/glm-*`). Klaim D69 "CORS semua mengizinkan" dikoreksi terlihat.
- Daftar cadangan GLM usang (glm-4.5/4.6): xKiro hari ini memuat `z-ai/glm-4.5` s.d. `glm-5.3` — cadangan diganti ke ID itu.
- Label kartrid "Qwen (Alibaba Cloud)" menimpa pin kartrid (tinggi tetap) → tinggi minimum; bangku uji membengkak di layar lebar
  → lebar maks 760 px; huruf bangku uji ±8,7 px di 500 px → 15 px di koordinat gambar (±11 px di layar) dan label dekat ujung
  skala ditambatkan ke dalam supaya tidak terpotong.

**Bersih-bersih (kueri ulang):** baris otak #2548 dihapus — angkanya dari jawaban TIRUAN dan tidak boleh tertinggal sebagai hasil
kalibrasi sungguhan; sewa #2548 di kursus itu dihapus (dibuat persiapan 06:05:54 UTC, satu-satunya); semua baris peserta uji dihapus
(1 submission, 10 komponen, 1 tagihan, 1 usaha, 1 enrollment). Sisa: otak 0 · sewa 0 · enrollment 0. Kunci palsu dan identitas
dihapus dari penyimpanan peramban sebelum instans ditutup.

**Temuan samping (dicatat, tidak diperbaiki di B135):** kartu identitas #2548 menulis "Dicetak platform · register …" padahal agen
itu didaftarkan pemiliknya sendiri (T61) — `minted` diisi untuk setiap baris `platform_agents`, termasuk klaim `grader-self`.
