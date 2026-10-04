---
tags: [acceptance-criteria, B135]
status: active
updated: 2026-10-03
---

# AC-B135 - Otak agen tujuh provider semi-otomatis

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B135 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T62 - signer brain-check.js (B135 otak agen)]] ·
[[09-Testing/T63 - Uji peramban otak agen (B135)]] · **Summary:** [[08-Results/B135 - Executive Summary]] · **Keputusan:** D69

Pertanyaan builder 3 Okt: "agentnya pakai LLM apa ya? … kok ga disuruh masukin api key atau config provider" lalu "kita bisa kasih
varian LLM provider, ada openai, ada anthropic, ada qwen, ada xkiro, ada groq, ada glm, dan deepseek lalu modelnya nanti dinamis
aja hasil fetch endpoint + api key". Pilihan cara kerja: **"Bertahap: semi-otomatis dulu"**.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B135#1 | tujuh provider (OpenAI, Anthropic, Qwen, xKiro, Groq, GLM, DeepSeek); model dibaca dari daftar model provider (model non-chat disaring, cari, ID manual; daftar cadangan bila endpoint tidak ada); adaptornya bisa diuji tanpa jaringan | **PASS** 3 Okt | T62 B; T63 langkah 3 |
| AC-B135#2 | API key hanya di peramban pemilik — `sessionStorage`, `localStorage` hanya bila "ingat" dicentang — dan tidak pernah dikirim ke atau disimpan server Lencana: tidak ada rute yang menerimanya, tabel `agent_brains` tidak punya kolomnya | **PASS** 3 Okt | T62 C1 (kolom baris otak); T63 langkah 3 |
| AC-B135#3 | uji kalibrasi wajib dengan rubrik, esai, dan prompt yang sama dengan `npm run judge`: kosong < nilai lulus (70) ≤ substantif, dan substantif > kosong; kalibrasi gagal tidak dicatat | **PASS** 3 Okt | T62 A (prompt sha256, fixture, aturan), C1 (422 tanpa baris); live Groq `openai/gpt-oss-120b` 99 / 3; T63 langkah 4 |
| AC-B135#4 | otak dicatat dengan tanda tangan pemilik menurut `ownerOf` (bukan peran pilihan saja); akun berperan lain ditolak; dasbor pemilik memuat otaknya; catatan pemilik lama tidak berlaku sesudah NFT pindah | **PASS** 3 Okt | T62 C1; T63 langkah 5–6 |
| AC-B135#5 | antrean esai dibaca dompet agen (yang menandatangani nilainya), hanya dari kursus yang menyewa agen dengan dompet yang sama, tanpa esai operator agen sendiri, tanpa alamat peserta | **PASS** 3 Okt | T62 A (antrean murni), C2; T63 langkah 7 |
| AC-B135#6 | LLM mengusulkan nilai per kriteria (tidak bisa disunting pemilik); pemilik memilih label tingkat berat dan menandatangani; penilaian membawa nama model otak + temperature yang benar-benar terpakai; atas nama model lain ditolak sebelum apa pun berubah | **PASS** 3 Okt | T62 B (temperature null bila ditolak), C3; T63 langkah 8–9 |
| AC-B135#7 | panggilan provider langsung dari peramban (CORS) untuk ketujuh provider | **PASS** 3 Okt **dengan koreksi** — GLM lewat Zhipu BigModel; chat Z.ai internasional diblokir CORS | T63 langkah 1 + temuan |
| AC-B135#8 | wujud benda (rak kartrid, gantungan kunci, bangku uji, baki antrean, penggaris rubrik, tangga label, cap); ponsel 500 px tanpa geser horizontal | **PASS** 3 Okt | T63 langkah 2–10 |
| AC-B135#9 | gerbang | **PASS** 3 Okt untuk B135 — merah yang tersisa bukan dari B135 (data tepi basi; struk lama dari RPC, B136) | `tsc`, build (entry 846.39 kB), `probe` 118/0; baterai `sync:numbers` **31 harness · 27 hijau** (`verify:brain` 60/0, `verify:agents` 34/0, `verify:owner` 32/0); merah: `verify:edge` + `verify:quizkeys` (data tepi → `publish:edge` builder), `verify:studio` 28/1 + `verify:praktik` 22/1 (B136); `--verify` 58 klaim, 9 merah = semuanya sumber merah tadi; `audit` A9 235 marker cocok, A10 1 BEDA (`verify:edge`); `check:labels` 8/0; vault: 0 tautan rusak, Mermaid 0, CJK 0, PASTE 5587/5600 — rincian [[08-Results/B135 - Executive Summary]] §2 |
| AC-B135#10 | login sungguhan builder: akun Agent Owner memasang otak dengan kunci provider miliknya dan menilai satu esai dari antrean | **SEBAGIAN** 3 Okt — pasang otak **PASS**: akun Privy `0x5d93…80C2` mendaftarkan **#2549** sendiri (klaim 05:04 UTC) lalu memasang `groq/openai/gpt-oss-120b` dari perambannya, kalibrasi **substantif 99 / kosong 4**, temperature 0 (baris `agent_brains` 07:06 UTC, dibaca SQL 3 Okt); menilai dari antrean **belum** — ~~#2549 belum disewa kursus mana pun~~ *(koreksi 4 Okt: #2549 disewa `web3-dasar-2026` sejak 3 Okt 13:18 UTC menurut `GET /agents/market`; esai uji 719/720 menunggu di antreannya, `awaiting_judge`)*. **4 Okt, jalur yang sama dengan akun fixture (T68 B):** pemilik #2548 memasang otak dari peramban dengan kunci Groq sungguhan (kalibrasi 93 / 4), membuka antrean, dan menilai dua esai (usulan 98 pass / 5 fail), lalu agen reviewer #2542 mengesahkan — jalurnya terbukti; yang tersisa hanya menjalankannya dengan akun Privy builder | baris `agent_brains` #2549; [[09-Testing/T68 - E2E penuh esai sampai kredensial (4 Okt)]]; uji builder |

**Batas klaim:** agen belum menilai sendiri — setiap penilaian masih butuh tanda tangan pemilik di peramban (mode otomatis penuh =
backlog berikutnya). Angka kalibrasi adalah laporan pemilik yang ditandatanganinya: server memeriksa aturannya, tidak mengulang
panggilan modelnya. Agen tanpa otak tercatat masih diterima rute B119 (harness #2534). Mutu model sungguhan hanya terukur untuk Groq
`openai/gpt-oss-120b`; enam provider lain terbukti bentuk permintaan + CORS-nya, bukan mutunya. Testnet.
