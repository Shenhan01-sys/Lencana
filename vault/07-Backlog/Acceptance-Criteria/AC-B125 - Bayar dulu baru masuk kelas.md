---
tags: [acceptance-criteria, B125]
status: active
updated: 2026-10-02
---

# AC-B125 - Bayar dulu baru masuk kelas (RF7 langkah B)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B125 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T46 - signer paywall-check.js (B125 bayar dulu)]] ·
[[09-Testing/T47 - Uji peramban bayar dan daftar (B125)]] · **Summary:** [[08-Results/B125 - Executive Summary]] · **Keputusan:** D60

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B125#1 | harga satu sumber untuk halaman dan server, di luar hash manifest; harga = keputusan builder | **PASS** 2 Okt | `web/src/pricing.ts` diimpor `signer/src/server.js`; T46 A |
| AC-B125#2 | kursus berbayar: enrollment baru hanya sesudah lunas — 402 + syarat x402 sebelum itu, dan 402 tidak membuat baris | **PASS** 2 Okt | T46 B |
| AC-B125#3 | tidak ada gas yang keluar untuk permintaan yang tidak sah: pemeriksaan pembayaran dan tanda tangan peserta mendahului settlement | **PASS** 2 Okt | T46 C (termasuk 401 untuk pesan enroll bertanda tangan kunci lain) |
| AC-B125#4 | peserta membayar hanya dengan tanda tangan (EIP-2612 + Permit2), penerbit menyiarkan settlement + pembagian `SettlementSplit`, `orders` = paid dengan tx-nya | **PASS** 2 Okt | T46 F (`--live` 31/0), T47 langkah 4–6 (tx `0x675472b0…` status 1) |
| AC-B125#5 | sesudah lunas kelas terbuka; enroll kedua tidak menagih lagi | **PASS** 2 Okt | T46 F |
| AC-B125#6 | enrollment yang ada sebelum harga berlaku tetap jalan tanpa bayar | **PASS** 2 Okt | T46 D |
| AC-B125#7 | koin uji testnet: server mencetak ke dompet peserta, sekali per alamat per 24 jam, gagal mencetak tidak mengunci peserta | **PASS** 2 Okt | T46 E + F (429 untuk permintaan kedua); nonce dilepas saat cetak gagal (`forgetNonce`) |
| AC-B125#8 | halaman: harga di katalog dan detail kursus, panel bayar (saldo dari chain, Ambil koin uji, Bayar & daftar), kelas berbayar menunjuk halaman bayar, dashboard Pembayaran | **PASS** 2 Okt | T47 langkah 1–7 |
| AC-B125#9 | harness lain tidak berubah makna: server mereka mematikan paywall secara eksplisit, `/healthz` melaporkan keadaannya | **PASS** 2 Okt | tujuh berkas `scripts/*-check.js`/`db-probe.js` mengirim `ENROLL_PAYWALL: 'off'`; baterai hijau |
| AC-B125#10 | gerbang hijau | **PASS** 2 Okt | `tsc` + build, `probe` 88/0, `check:spec` 14/0, `verify:privy` 41/0, `verify:quizkeys` 30/0, `verify:records` 16/0, `verify:paywall` 23/0 (+ `--live` 31/0), `check:samples` 11/0, `check:labels` 8/0 |
| AC-B125#11 | login sungguhan → bayar dengan dompet tertanam (`eth_signTypedData_v4`) | **TERBUKA** | uji builder (sama dengan AC-B123#9, AC-B124#9) |

**Batas klaim (C4):** LDC-demo adalah koin uji bermint-terbuka di chain 97 — yang dibuktikan adalah pembayaran berpindah, terbagi di
chain, dan kelas terbuka sesudahnya. Bukan pendapatan, bukan harga pasar; di mainnet harga yang sama dibayar dengan stablecoin.
