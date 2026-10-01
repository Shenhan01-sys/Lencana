---
tags: [acceptance-criteria, B119]
status: active
updated: 2026-10-01
---

# AC-B119 - Penerbit menyewa agen penilai per aktivitas penilaian

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B119 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]] ·
**Summary:** [[08-Results/B119 - Executive Summary]] · **Keputusan:** D53, D54 di [[00-Overview/03 - Decisions]]

Kriteria ditulis dari keputusan builder (D53 + D54), lalu dibandingkan dengan hasil **aktual** run 1 Okt.

| # | kriteria | asal | status | bukti |
|---|---|---|---|---|
| AC-B119#1 | ada peran **Agent Owner** terpisah: pemilik identitas agen ≠ penerbit ≠ platform, dan dompet operasional agen ≠ ketiganya | D53 | **PASS** 1 Okt | #2534 pemilik `0x067c…0c4f`, dompet `0xFd26…0094`; penerbit `0x8211…F7DE`; `verify:agent` 24/0 |
| AC-B119#2 | **penerbit tetap attester**; agen tidak pernah menandatangani kredensial dan tidak bisa diterima sebagai penerbit | D54 (opsi B) | **PASS** 1 Okt | dompet agen `isIssuer` = false; `npm run admit -- --address <dompet agen>` → DITOLAK |
| AC-B119#3 | penerbit **menyewa** agen untuk satu kursus dengan tanda tangannya; fakta agen dibaca dari registry | D53 | **PASS** 1 Okt | `POST /agents/hire` 200; kunci lain 401; pesan tanpa `agent=` 401 |
| AC-B119#4 | **label tingkat berat dipilih agen** dan ditandatangani bersama usaha + angka akhir | D54 | **PASS** 1 Okt | tanpa label 401; label asing 401; angka akhir beda 401 |
| AC-B119#5 | **harga dasar = tarif Agent Owner** di registry, tidak dikarang Lencana | D54 | **PASS** 1 Okt | `GET /agents/2534/rates` = metadata `lencana.baseTariff` = 2000 |
| AC-B119#6 | **kenaikan per tingkat milik Lencana dan kecil**; tujuh label sangat ringan … sangat berat | D53/D54 | **PASS** 1 Okt | +5%/tingkat, maks ×1,30; `LADDER_HASH` tercatat di tiap tagihan |
| AC-B119#7 | **satu tagihan per aktivitas penilaian**, jumlahnya = tarif × tangga | D53 | **PASS** 1 Okt | tagihan menilai 2400 (`cukup-berat`) |
| AC-B119#8 | tagihan **dibayar** lewat rel x402 yang sudah ada, ke **dompet agen** | D53 | **PASS** 1 Okt | `--live`: tx `0xa50cec96…c3a4`, dompet agen +2160 (90%), dibaca dari chain |
| AC-B119#9 | tagihan lunas tidak bisa dibayar dua kali | — | **PASS** 1 Okt | 409 |
| AC-B119#10 | angka agen tetap usulan model — tidak menerbitkan sebelum disahkan (B104 tetap berlaku) | B104 | **PASS** 1 Okt | gerbang tidak naik sesudah penilaian agen; `verify:db` 70/0 |
| AC-B119#11 | ada UI bagi penerbit untuk memilih agen dan membayar | D53 ("tinggal tap-tap di Lencana") | **BLOCKED** — pekerjaan FE, ditunda builder | hanya rute HTTP |

**Penyimpangan dari rencana yang dicatat di B119:** baris B119 mengusulkan label dipasang penerbit di
manifest; builder memutuskan label dipilih agen (D54). Yang dibangun mengikuti keputusan builder.
