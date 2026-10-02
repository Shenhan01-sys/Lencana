---
tags: [testing, B132, browser, onchain]
status: active
updated: 2026-10-03
---

# T61 - Uji on-chain dan peramban bengkel agen (B132)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B132 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B132 - Robot agen rakitan, rupa di chain, agen didaftarkan sendiri]] ·
**Harness:** [[09-Testing/T60 - signer studio-check.js (B132 robot agen)]] · **Summary:** [[08-Results/B132 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`, dinyalakan ulang sesudah suntingan B132) + Chromium headless
(MCP) 1440×900, ponsel 500 px lewat iframe; BSC testnet (chain 97). Tanggal: 3 Okt dini hari. Satu identitas uji sekali-pakai R
`0x1D29…8169` (kunci hanya di scratchpad), saldo awal 0.

| # | langkah | hasil |
|---|---|---|
| 1 | R memilih Agent Owner di onboarding (B131) | `#/app/owner` menampilkan **"Rakit agen penilai pertamamu"**: robot bawaan + panel rakit (nama, kepala, mata, badan, alat, warna) + tarif dasar 0.002 |
| 2 | rakit: nama "Pak Teliti (uji T61)", kepala kubah, mata visor, alat kaca, warna hijau | robot di panggung berubah seketika di setiap ‹ › / warna |
| 3 | "Rakit & daftarkan di BNB Chain" | lima tahap: gas uji (tetes 0,001 tBNB dari platform karena saldo 0) → `register()` dari dompet R → platform membaca struk (`POST /owner/agents/claim`) → `setAgentURI` (nama + rupa) → `setMetadata` tarif; **agen #2548**, `register` `0xb9cc49dc…`; nonce R 3 sesudahnya, saldo turun ±0,0003 tBNB |
| 4 | halaman memuat ulang | bengkel #2548: **mata menyala** (dompet agen = R sejak `register()`, tanpa langkah verifikasi), **lampu antena hijau** (bisa disewa), dada "0.002", "0 dinilai", toples 0 LDC-demo, meja "belum disewa"; rupa dibaca dari chain |
| 5 | ganti alat → stempel, warna → merah; "Simpan rupa ke BNB Chain" | tanda "belum disimpan" muncul, lalu tersimpan; `setAgentURI` kedua dari dompet R (nonce 4) |
| 6 | baca balik `tokenURI(2548)` dari chain | berkas registrasi 3.689 byte: `name` "Pak Teliti (uji T61)", `lencana:avatar` `{kubah, visor, kotak, stempel, merah}`, `image` SVG 1.986 byte, `registrations` tetap menunjuk balik ke #2548, `description` = kalimat peran "registered by its owner" |
| 7 | muat ulang | rupa merah + stempel terbaca dari chain; tanda "belum disimpan" hilang |
| 8 | ponsel 500 px (iframe) | panggung + panel bertumpuk; lebar dokumen 485 ≤ 500; **0 error konsol** |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** tahap proses (komponen `.lc-steps`) tampil sebelum tombol
ditekan karena `display: flex`-nya mengalahkan atribut `hidden` — kini `.lc-steps[hidden] { display: none }` di
`web/src/lib/loading.css` (berlaku juga untuk tahap verifikasi dompet B130).

**Bersih-bersih:** baris peran R dihapus. Baris `platform_agents` #2548 **sengaja dibiarkan** dan ditandai `origin=test`, seperti
#2546: NFT-nya tetap di chain, dimiliki kunci uji yang hanya ada di scratchpad.
