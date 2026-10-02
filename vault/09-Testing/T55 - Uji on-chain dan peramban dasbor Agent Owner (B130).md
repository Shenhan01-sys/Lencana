---
tags: [testing, B130, browser, onchain]
status: active
updated: 2026-10-02
---

# T55 - Uji on-chain dan peramban dasbor Agent Owner (B130)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B130 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B130 - Kursi Agent Owner, agen untuk akun, dasbor Agent Owner]] ·
**Harness:** [[09-Testing/T54 - signer owner-check.js (B130 kursi Agent Owner)]] · **Summary:** [[08-Results/B130 - Executive Summary]]

**Alat:** `npm run agent:mint` di chain 97 (kunci platform membayar gas) + vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`) +
Chromium headless (MCP) 1440×900; tampilan ponsel 500 px lewat iframe di tab yang sama (supaya kunci uji tidak keluar dari tab).
Tanggal: 2 Okt. Identitas uji sekali-pakai **dibuat di dalam peramban**: pemilik `0x54b6…DAdAd`, anggota penerbit `0x1D75…6518`.

| # | langkah | hasil |
|---|---|---|
| 1 | `LANCENA_ORIGIN=test npm run agent:mint -- --to 0x54b6… --apply` | agen **#2546**: `register` `0x373515c0…`, berkas registrasi `0xa0f10ada…`, tarif 2000 `0x39c1ee4e…`, `transferFrom` `0x3a47b516…`, gas 0,001 tBNB `0xfe4e80ea…`; dibaca balik: pemilik = akun uji, berkas menunjuk balik, **`agentWallet` kosong** sesudah pemindahan — sesuai EIP-8004 |
| 2 | `#/app/owner` | pemilih kursi Peserta / Agent Owner; kartu identitas #2546 (ERC-8004, NFT di BscScan, nama dan deskripsi dari berkas registrasi, jejak cetak platform), status **"Belum bisa disewa — agent 2546 has no agentWallet"** (alasan dari aturan sewa yang sama); slot dompet "Belum diverifikasi"; tangga tarif 0.002 → 0.0026; gas 0.00100 tBNB |
| 3 | "Verifikasi dompet agen" | kunci akun menandatangani EIP-712 `AgentWalletSet` lalu mengirim `setAgentWallet` dari dompetnya sendiri: tx **`0x3331a22f…8937`** (blok 134430355, 67.528 gas); slot berubah "Dompet akunmu 0x54b6…", status **"Bisa disewa"** |
| 4 | ubah tarif dasar 0,002 → 0,0025 dari tangga tarif | `setMetadata` dari dompet akun: tx **`0x727722f2…cc0a`** (blok 134430450, 45.945 gas); tangga kini 0.0025 → 0.00325 |
| 5 | identitas kedua jadi anggota penerbit (`grant:member --hire`), Agen → Sewa `uji-bayar-2026` + `2546` | fakta dari registry: dompet = pemilik = `0x54b6…`, tarif 0.0025–0.00325; disewa **oleh anggota 0x1D75…6518** — lintas akun |
| 6 | dasbor pemilik dimuat ulang | "Tempatnya bekerja": Kelas Uji, agen penilai, oleh anggota 0x1D75…; gas 0.00099 tBNB (dua transaksi pemilik ±0,00001 tBNB) |
| 7 | ponsel 500 px (iframe) | pemilih kursi satu baris, kartu bertumpuk, tangga tujuh anak tangga terbaca; lebar dokumen 485 ≤ 500 |
| 8 | konsol, enam rute (Ringkasan, Akun, onboarding, Agent Owner, Penerbit tanpa kursi, Agent Owner) | 0 error, 0 peringatan |
| 9 | `LANCENA_ORIGIN=demo npm run agent:mint -- --to 0x632D…38AF --apply` (akun 2 builder) | agen **#2547**: `register` `0xb09e38a0…`, berkas `0x4166c658…`, tarif `0x0a5def38…`, `transferFrom` `0x0fddd6fb…`, gas `0xef1c9b75…`; pemilik = akun 2, `agentWallet` kosong — **diisi builder sendiri** |

**Bersih-bersih:** baris sewa uji (#2546 di `uji-bayar-2026`) dan keanggotaan uji `0x1D75…` dihapus. Baris `platform_agents` #2546
(`origin=test`) **sengaja dibiarkan** sebagai jejak: NFT-nya tetap di chain, dimiliki kunci uji yang hilang bersama tabnya.

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** (a) label "AGENT OWNER" di pemilih kursi terlipat dua baris —
kini kolom mengikuti isinya, tanpa lipatan. (b) Slot dompet melayang di tengah kartu yang ditarik setinggi kartu identitas — kini di
atas. (c) Tahap verifikasi sudah menyala sebelum tombol ditekan — kini muncul sesudah ditekan. (d) Angka aktivitas tampil kecil: selector
`.ow-counts span` ikut mengenai digit odometer di dalam `<b>` — kelas cacat yang sama dengan B126; kini anak langsung. Ditemukan saat
menulis, sebelum uji: tahap verifikasi versi pertama digerakkan timer, bukan langkah sungguhan (kini `onStep` dari fungsinya); sewa oleh
kunci penerbit tertulis "oleh anggota" (kini `byPublisherKey`).

**Yang tidak diuji:** transaksi dari dompet tertanam **Privy** (`eth_signTransaction`, jatuh ke `eth_sendTransaction` bila ditolak) —
hanya bisa diuji builder dengan login akun 2 untuk agen #2547. Agen milik akun belum menilai apa pun: penilaian agen ditandatangani
dompet agen dan belum ada layar untuk itu.
