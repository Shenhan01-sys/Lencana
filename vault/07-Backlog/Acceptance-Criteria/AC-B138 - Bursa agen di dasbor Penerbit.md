---
tags: [acceptance-criteria, B138]
status: active
updated: 2026-10-03
---

# AC-B138 - Bursa agen di dasbor Penerbit

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B138 (dan B137) di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T64 - signer market-check.js (B138 bursa agen)]] ·
[[09-Testing/T65 - Uji peramban bursa agen (B138)]] · **Summary:** [[08-Results/B138 - Executive Summary]] · **Keputusan:** D70

Keluhan builder 3 Okt: "di page /app/pub/agents itu kenapa ga dibikin agentlist aja? Kayak agent marketplace gitu, soalnya saya cek
ini UInya kayak ga consumer friendly". Pilihan: **bursa di dasbor Penerbit saja**; B138 dulu, lalu B136; B137 ikut.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B138#1 | agen dipilih dari etalase, tidak diketik nomornya: semua agen yang dikenal platform tampil sebagai robotnya dengan harga (tangga tarif), otak + kalibrasi, rekam jejak (penilaian, pengesahan, keputusan pengesah atas usulannya), status layak-sewa, tempat bekerja | **PASS** 3 Okt | T64 C (6 agen = semua yang dikenal); T65 langkah 1, 3 |
| AC-B138#2 | sewa/tunjuk dari lapak; kursus yang terhalang aturan B120/B129 tampil dengan alasannya dan tidak bisa dipilih SEBELUM tanda tangan; aturan halaman = aturan server; server tetap memutuskan | **PASS** 3 Okt | T64 A + C (penolakan #2542 sepakat); T65 langkah 4–5 |
| AC-B138#3 | "Tim agen kursusmu": kursi penilai + pengesah per kursus, kursi kosong putus-putus, kursus tanpa agen dirangkum satu baris | **PASS** 3 Okt (sesudah perbaikan langkah 2) | T65 langkah 2, 5 |
| AC-B138#4 | satu rute baca `GET /agents/market` tanpa teks esai, alamat peserta, alamat penyewa, tanda tangan, atau uang tagihan; cache 60 detik dengan pembatalan saat sewa/tunjuk/otak/klaim | **PASS** 3 Okt | T64 B + C |
| AC-B138#5 | cari nama/#nomor, saring "bisa disewa" / "punya otak", urut pengalaman / harga / terbaru | **PASS** 3 Okt untuk fungsinya — tombolnya di halaman tidak diklik di uji peramban | T64 A |
| AC-B138#6 | ponsel 500 px tanpa geser horizontal | **PASS** 3 Okt | T65 langkah 6 |
| AC-B138#7 | B137: kartu agen yang didaftarkan sendiri tidak lagi berlabel "Dicetak platform" | **PASS** 3 Okt | T65 langkah 7 |
| AC-B138#8 | formulir nomor agen lama tetap tersedia (dilipat) untuk agen yang belum dikenal platform | **PASS** 3 Okt — kodenya tidak berubah, tidak diuji ulang | `web/src/pages/publisher.ts` `renderAgents` |
| AC-B138#9 | gerbang | **PASS** 3 Okt untuk B138 — merah yang tersisa bukan dari B138 (data tepi basi; B136) | `tsc`, build (entry 861.73 kB), `probe` 118/0; baterai 15:22 WIB **32 harness · 28 hijau** (`verify:market` 23/0); `--verify` 60 klaim, 9 merah = sumber merah; `audit` A9 245 marker, A10 1 BEDA (`verify:edge`); `check:labels` 8/0; gerbang vault — rincian [[08-Results/B138 - Executive Summary]] §2 |
| AC-B138#10 | login sungguhan builder: akun penerbit (dummy) menyewa #2549 dari bursa, lalu pemilik #2549 menilai esai dari antreannya (sekaligus menutup AC-B135#10) | **TERBUKA** | uji builder |
| AC-B138#11 | *(ditambah 3 Okt dari uji 1 builder di HP: "pas saya klik button hire ae grader mending munculin popup card aja untuk hiring confirmationnya")* sewa/tunjuk dikonfirmasi lewat kartu kontrak sembulan, bukan panel di dalam lapak: kursus (yang terhalang tampil non-aktif beserta alasannya), bayaran per penilaian/pengesahan, otak, dan siapa yang menandatangani; Batal, Esc, latar, dan pindah rute menutupnya; di ≤640 px jadi lembar bawah | **SEBAGIAN** 3 Okt — kartu tampil dan isinya benar di uji peramban 500 px (akun penerbit dummy, #2549 "Ganteng", otak Groq `openai/gpt-oss-120b`); **tanda tangan dari kartu ini belum dijalankan** — menunggu uji builder (AC-B138#10) | `web/src/pages/agent-market.ts` `openDeal`; `web/src/pages/agent-market.css` `.am-modal*` |

**Batas klaim:** bursa hanya memuat agen yang sudah dikenal platform (dicetak platform, didaftarkan sendiri lewat Lencana, atau pernah
disewa/ditunjuk), dan hanya di dasbor Penerbit — bukan halaman publik. Rekam jejak #2534/#2542 sebagian besar berasal dari harness
B119/B120. Testnet.
