---
tags: [testing, B125, browser]
status: active
updated: 2026-10-02
---

# T47 - Uji peramban bayar dan daftar (B125)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B125 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B125 - Bayar dulu baru masuk kelas]] ·
**Summary:** [[08-Results/B125 - Executive Summary]] · **Harness rute:** [[09-Testing/T46 - signer paywall-check.js (B125 bayar dulu)]]

**Alat:** vite `:5173` + signer lokal `:8787` (paywall `on`, `LANCENA_ORIGIN=test` selama uji, lalu dikembalikan ke `demo`) + Chromium
headless (MCP), 1440×900. Tanggal: 2 Okt. **Identitas uji sekali-pakai** (kunci perangkat di `sessionStorage` tab uji + penanda akun):
login sungguhan mengirim kode ke email. Transaksi di bawah sungguhan di chain 97 — gasnya dibayar kunci platform.

| # | langkah | hasil |
|---|---|---|
| 1 | tamu: detail Web3 Lanjut | harga "25 LDC-demo" + "koin uji di BNB testnet — di mainnet harga yang sama dibayar dengan stablecoin"; tombol "Enroll · 25 LDC-demo" |
| 2 | identitas uji: detail Web3 Dasar | panel bayar: saldo **0 LDC-demo** (dibaca dari chain), "Pay & enroll · 10 LDC-demo" nonaktif, "Get test coins" tampil, "Your balance is below the price" |
| 3 | "Get test coins" | "Test coins arrived.", saldo **50 LDC-demo**, tombol bayar aktif, tombol koin uji tersembunyi |
| 4 | "Pay & enroll" | tanda tangan izin token + saksi Permit2 + pesan enroll (tanpa transaksi dari dompet peserta) → penerbit menyelesaikan pembayaran → halaman pindah ke `#/class/web3-dasar-2026`, kotak rekaman "0/19 lesson selesai" (terdaftar) |
| 5 | tx settlement `0x675472b0…cde5` dibaca dari RPC publik | `status 0x1`, blok 134357856, `to` = proxy x402 `0x4020…0001`, 3 log |
| 6 | `#/app/payments` | baris "Web3 Dasar untuk Praktisi · 10 LDC-demo · paid · 02/10/2026" dengan tautan BscScan testnet ke tx yang sama |
| 7 | `#/class/web3-lanjut-2026` (belum dibayar) | kotak "Kursus ini berbayar … Bayar & daftar di halaman kursus" → `#/course/web3-lanjut-2026` |

Konsol: 0 pesan di seluruh langkah.

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** (a) `syncCourse` mengganti kursus tanpa membuang ringkasan kursus
sebelumnya — kelas berbayar memperlihatkan angka Web3 Dasar dan catatan "kursus berbayar" tertutup; (b) daftar di kartu "Who it is for"
merenggang; (c) judul kolom Pembayaran "MY CLASSES" dan tautan tx biru bawaan.

**Yang tidak diuji:** jalur tanda tangan `eth_signTypedData_v4` dompet tertanam (login sungguhan) — bentuk typed data-nya sama dengan
jalur kunci perangkat yang diuji di sini dan dengan `buildClientPayment` di server; uji builder.
