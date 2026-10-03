---
tags: [testing, "T62"]
status: active
updated: 2026-10-03
command: npm run verify:brain
measured: 2026-10-03
result: OTAK AGEN HIJAU — 60 pemeriksaan / 0 gagal (3 Okt, B135; run pertama 60 / 0 hijau; live 63 / 0)
---

# T62 - signer brain-check.js — B135: otak agen

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B135 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B135 - Otak agen tujuh provider semi-otomatis]] ·
**Uji peramban:** [[09-Testing/T63 - Uji peramban otak agen (B135)]] ·
**Summary:** [[08-Results/B135 - Executive Summary]] · **Keputusan:** D69

`signer/scripts/brain-check.js`, dijalankan `npm run verify:brain` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key, `RPC_URL`,
`ISSUER_PRIVATE_KEY`, `AGENT_OWNER_PRIVATE_KEY`, `AGENT_GRADER_PRIVATE_KEY`, `AGENT_REVIEWER_PRIVATE_KEY` (semua dari `app/.env`, tidak
ada yang dicetak). Server sendiri di port bebas (`LANCENA_ORIGIN=test`). **Tanpa kunci LLM dan tanpa gas.** Agen: penilai #2534
(pemilik `AGENT_OWNER`, dompet `AGENT_GRADER`), reviewer #2542 (dompet `AGENT_REVIEWER`).

| bagian | yang dibuktikan |
|---|---|
| A — satu sumber, fixture, aturan | `judge.js` memakai `web/src/judge-prompt.ts` dan tidak menyimpan salinan prompt/pengurai; isi prompt = teks 24 Sep yang diukur `judge-check`/`judge-variance` (sha256 `d852979f…`, dibandingkan dengan `judge.js` komit 7edaf07 saat dipindah); salinan dua esai di `calibration.ts` = `signer/fixtures/essai-230-kata.md` dan `essai-fasih-tapi-kosong.md`; rubrik + nilai lulus kalibrasi = yang dipakai `npm run judge` (`web3-dasar-2026` / `esai-batas-bukti`, lulus 70); aturan (kontrol negatif, kontrol positif, pembeda) pada lima pasangan angka; penilai murah hati dan penilai pelit sama-sama gagal; pengurai menolak kriteria yang hilang; pesan otak hanya tujuh provider dan ID model tanpa spasi/markup; antrean murni membuang esai operator agen dan tidak membawa alamat peserta |
| B — adaptor tujuh provider | dengan `fetch` tiruan per provider: URL daftar model + header kunci yang benar (Bearer, atau `x-api-key` + `anthropic-version` + `anthropic-dangerous-direct-browser-access` untuk Anthropic), model non-chat disaring, GLM ke daftar cadangan bila endpoint 404; chat JSON ke `/chat/completions` atau `/messages` dengan prompt satu sumber, `temperature 0`, `json_object` hanya untuk provider yang mendukungnya; xKiro daftar model tanpa kunci; coba ulang tanpa `temperature` (dan hasilnya MELAPORKAN null), dengan `max_completion_tokens`, tanpa `response_format`; 401 → "API key ditolak provider"; 429 → saran tunggu dari `retry-after`; kunci tidak pernah di URL |
| C1 — rute otak | provider di luar tujuh → 400; kunci lain atas nama pemilik → 401; bukan pemilik → 403; akun Peserta → 403 (B131); kalibrasi gagal kontrol negatif / positif → 422 tanpa baris; angka di atas total rubrik → 400; pemilik #2534 → 201; baris hanya berisi kolom yang dijanjikan (tanpa kunci), `origin=test`; dasbor pemilik memuat otaknya |
| C2 — rute antrean | bentuk pesan salah → 400; pemilik yang bukan dompet agen → 403; agen tanpa otak (#2542) → 409; dompet agen #2534 → 200 dengan esai uji (teks utuh + rubrik penerbit), tanpa alamat peserta |
| C3 — penilaian | atas nama model lain dari otak → 409 dan usahanya tidak berubah; atas nama `groq/openai/gpt-oss-120b` → 200, usulan, `needsReview`, tagihan jatuh tempo; baris usaha mencatat nama model, temperature 0, agen, label; esai keluar dari antrean |
| C4 — bersih-bersih | otak #2534 dihapus, sisa 0 (kueri ulang) — supaya `verify:agents` tetap menilai #2534 dengan nama model harness; `account_roles` uji sisa 0. Peserta uji ber-`origin=test` dibersihkan `npm run cleanup` (tagihan ikut kaskade), sama dengan `verify:agents` |
| D — `--live` | Groq lewat `web/src/llm.ts` dengan `GROQ_API_KEY` tim (tidak dicetak): daftar model memuat `openai/gpt-oss-120b`; kalibrasi sungguhan; daftar model xKiro publik |

## Hasil (3 Okt)

```
OTAK AGEN HIJAU — 60 pemeriksaan, 0 gagal
OTAK AGEN LIVE HIJAU — 63 pemeriksaan, 0 gagal
        substantif=99 kosong=3 lulus≥70 temperature=0      (Groq openai/gpt-oss-120b, 6 model chat; xKiro 129 model chat)
```

Run kedua sesudah GLM dipindah ke BigModel (temuan T63): 60 / 0. Regresi pada hari yang sama sesudah `signer/src/agents.js` berubah:
`verify:agents` 34/0 (agen tanpa otak tetap diterima rute B119).

**Batas klaim:** angka kalibrasi sungguhan hanya untuk Groq `openai/gpt-oss-120b` (live). Enam provider lain dibuktikan BENTUK
permintaannya (fetch tiruan) dan CORS-nya dari peramban sungguhan (T63, kunci palsu → 401 terbaca) — bukan mutu modelnya.
