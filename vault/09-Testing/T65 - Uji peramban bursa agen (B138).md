---
tags: [testing, B138, B137, browser]
status: active
updated: 2026-10-03
---

# T65 - Uji peramban bursa agen (B138)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B138 (dan B137) di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B138 - Bursa agen di dasbor Penerbit]] ·
**Harness:** [[09-Testing/T64 - signer market-check.js (B138 bursa agen)]] · **Summary:** [[08-Results/B138 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`, dinyalakan ulang sesudah suntingan B138) + Chromium headless
(MCP) 1440×1000, ponsel 500 px lewat iframe. Tanggal: 3 Okt siang. Identitas uji M `0x370D…1D4D` (kunci hanya di scratchpad,
diserahkan ke halaman oleh server lokal sekali-pakai di `127.0.0.1` — tidak tercetak di mana pun), dijadikan anggota penerbit
`hire=1 appoint=1` dengan `LANCENA_ORIGIN=test npm run grant:member`. Tidak ada yang ditiru: tanda tangan, rute, database, registry
semuanya sungguhan.

| # | langkah | hasil |
|---|---|---|
| 1 | M membuka `#/app/pub/agents` | **"Pilih agen untuk kursusmu"**: tim agen kursusmu + 6 lapak, 0 galat JS. Urutan bawaan "paling berpengalaman": #2534 (22 penilaian), #2542 (18 pengesahan), lalu #2549, #2548, #2547, #2546 |
| 2 | bagian tim (versi pertama) | 8 baris kursus, 7 di antaranya kursi kosong — etalase terdorong jauh ke bawah → **cacat, ditutup:** kursus tanpa agen dirangkum satu baris ("7 kursus belum punya penilai maupun pengesah" + nama kursus); sesudahnya etalase terlihat di layar pertama |
| 3 | lapak | robot dari berkas registrasi (agen tim tanpa rupa: abu-abu, "rupa belum dirakit"); harga "mulai 0.002 LDC-demo · s.d. 0.0026" + tangga tujuh batang (versi pertama hampir rata karena selisih 5% per anak tangga → **dinormalkan min–maks**, kini 28%…100%); chip otak #2549 "Ganteng": Groq `openai/gpt-oss-120b`, bangku mini 99 / 4; #2534: batang rapor jingga "18 disesuaikan"; papan "penilai · Web3 Dasar" / "pengesah · Web3 Dasar"; lampu "Bisa disewa" |
| 4 | panel sewa/tunjuk dibuka di empat lapak | **#2542 sewa**: Web3 Dasar terkunci "ia pengesah kursus ini"; **#2534 sewa**: "sudah bekerja di sini"; **#2534 tunjuk**: "ia penilai kursus ini"; **#2542 tunjuk**: "sudah bekerja di sini"; kursus pertama yang boleh terpilih otomatis |
| 5 | #2549 → "Sewa sebagai penilai" → Kelas Uji → "Tandatangani & sewa" | "Disewa — tercatat atas alamatmu."; dasbor memuat ulang, bursa dibaca segar (cache dibatalkan server); baris tim "Kelas Uji" kini berkursi **penilai: Ganteng #2549**, lapak #2549 "penilai · Kelas Uji"; database: `agent_hires` `uji-bayar-2026` / 2549, dompet = pemilik `0x5d93…80C2`, `hired_by` = M |
| 6 | ponsel 500 px (iframe) | satu kolom, lebar dokumen **485 ≤ 500**, lapak 453 px, 0 galat |
| 7 | **B137** — R (pemilik #2548, T61) membuka `#/app/owner` | kartu identitas: "Didaftarkan sendiri oleh 0x1D29…8169 · register 0xb9cc49… ↗" — sebelumnya "Dicetak platform · register … · pindah ke akunmu" |

**Bersih-bersih (kueri ulang):** sewa uji #2549 di `uji-bayar-2026` dihapus (sewa sungguhan untuk #2549 dibiarkan untuk builder dari
bursa dengan akun penerbitnya), keanggotaan M (`origin=test`) dihapus, peran M tidak ada. Sisa: sewa #2549 0 · keanggotaan 0 ·
peran 0. Penyimpanan peramban dibersihkan sebelum instans ditutup.
