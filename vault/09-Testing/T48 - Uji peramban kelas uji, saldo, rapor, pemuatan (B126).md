---
tags: [testing, B126, browser]
status: active
updated: 2026-10-02
---

# T48 - Uji peramban kelas uji, saldo, rapor, pemuatan (B126)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B126 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B126 - Kelas uji, saldo, rapor bergrafik, pita pemuatan]] ·
**Summary:** [[08-Results/B126 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (paywall `on`, `LANCENA_ORIGIN=test` selama uji, lalu dikembalikan ke `demo`) + Chromium
headless (MCP), 1440×900 dan 500×900. Tanggal: 2 Okt. **Identitas uji sekali-pakai** `0x9541…9785` (kunci perangkat di `sessionStorage`
tab uji + penanda akun) — login sungguhan mengirim kode ke email. Transaksi di bawah sungguhan di chain 97; gasnya dibayar kunci server.

| # | langkah | hasil |
|---|---|---|
| 1 | tamu: beranda dan `#/course/uji-bayar-2026` | katalog publik 2 kursus (kelas uji tidak tampil); detail kelas uji publik: harga "5 LDC-demo", tombol "Enroll · 5 LDC-demo"; chip saldo navbar tersembunyi; `window.fetch` terbungkus pita pemuatan |
| 2 | identitas uji → `#/app/grades` saat memuat | tahap "Signing the request" ✓ → "Reading your records from the publisher" ● + kerangka berbentuk ubin, cincin, timbangan, batang, dan tabel dengan kilau emas |
| 3 | `#/app/wallet` → "Get test coins · 50" | saldo **0 → 50** bergulir, "Test coins arrived.", chip navbar ikut 50 (±24 detik termasuk cetak di chain) |
| 4 | `#/course/uji-bayar-2026` (masuk) | panel bayar: koin + "YOUR BALANCE 50 LDC-demo", "Pay & enroll · 5 LDC-demo" aktif |
| 5 | "Pay & enroll" | status "Sign the payment…" → "Paid — opening the class…" dalam ±12 detik → `#/class/uji-bayar-2026`; chip navbar 50 → **45** |
| 6 | tx settlement dibaca dari RPC publik | `0xe5172ea5…6870`: status sukses, blok 134364804, `to` = proxy x402 `0x4020…0001`, `from` = kunci server `0xaec6…`, 3 log |
| 7 | kuis `kuis-pembayaran` dua kali | dinilai server: 50 lalu 100 (`/progress`: `gradedAttempts` 2, `bestScore` 100) |
| 8 | bayar Web3 Dasar (10) + satu kuis (0), lalu `#/app/grades` | tx `0x1dbbbc93…8dc6` sukses (blok 134365300), chip **35**. Rapor: ubin 1/5 kuis lulus · rata-rata 50 · esai 0/2 · kursus di atas ambang 0/2; kelas uji: cincin 0/4, timbangan "50 poin terkumpul" + "Belum lengkap", garis ambang 60 bersegel, arsir 50 untuk esai + praktik tanpa bukti, batang K1 = 100 di atas ambang 75; Web3 Dasar: K1 merah 0, K2–K4 putus-putus (belum); tabel per tugas + "All attempts (2)" |
| 9 | `#/app/wallet` sesudah dua pembayaran | saldo 35; batang "Where your coins went" = 5 (Kelas Uji) + 10 (Web3 Dasar) + 35 tersisa = 50 koin uji yang masuk; riwayat 2 baris "paid" bertautan BscScan |
| 10 | "Get test coins" lagi | 429 → "Already sent recently — you can get more after 3 Oct 2026, 10:16.", tombol berhenti |
| 11 | `#/app/classes` | kelas uji bertanda "TEST CLASS"; Web3 Lanjut di "Other courses" |
| 12 | pita pemuatan, sampel tiap 150 ms saat membuka Dompet | menyala pada 154 ms (8%), merayap ke 66% pada 3,7 detik, penuh saat data datang (±4,3 detik), lalu padam |
| 13 | konsol, 9 rute (EN) dan 7 rute (ID) termasuk kelas | 0 error, 0 peringatan |
| 14 | ponsel 500 px: Nilai & tugas dan Dompet | ubin 2×2, cincin di tengah, tabel menjadi kartu baris berlabel, tab bawah memuat "Wallet", chip saldo tanpa simbol |
| 15 | saldo chain dibaca ulang lewat RPC | `balanceOf(0x9541…9785)` = 35000000 (35 LDC-demo) = angka UI |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** (a) batang "ke mana koin pergi" tidak ikut berubah sesudah koin
uji masuk dan tombol koin uji tetap aktif sesudah berhasil; (b) angka saldo di panel bayar dan angka ubin tercetak 11–13 px karena
`.cd-balance-text span` dan `.app-stat span` ikut mengenai span digit bergulir (dipersempit ke anak langsung); (c) tombol "Open class"
terlipat di ponsel; (d) navbar berbahasa ID terlipat dua baris di 1424 px karena chip saldo (70 → 86 px). Perbaikan pertama (lencana jaringan
disembunyikan di ≤1500 px) diganti atas permintaan builder ("dilebarin lagi spacenya"): wadah navbar 1180 → 1480 px, teks menu,
subjudul merek, dan nama jaringan tidak boleh terlipat, lalu bertahap — ≤1320 px menu lebih rapat + chip tanpa "LDC"; ≤1180 px
lencana jaringan memberi tempat; ≤1080 px padding lebih rapat + alamat di pil dipendekkan; ≤1023 px menu 12,5 px + pil hanya
titik (identitas di tooltip). Diukur ulang lewat iframe 880–1920 px: tinggi navbar 70 px, luapan 0, akun masuk dan tamu, EN dan ID.

**Yang tidak diuji:** login sungguhan dengan dompet tertanam (`eth_signTypedData_v4`) — uji builder (AC-B126#11).
