---
tags: [testing, B128, browser]
status: active
updated: 2026-10-02
---

# T51 - Uji peramban kursi akun (B128)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B128 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B128 - Peran akun di core]] ·
**Harness:** [[09-Testing/T50 - signer roles-check.js (B128 peran akun)]] · **Summary:** [[08-Results/B128 - Executive Summary]]

**Alat:** vite `:5173` + signer lokal `:8787` (`LANCENA_ORIGIN=demo`) + Chromium headless (MCP), 1440×900 dan 500×900, bahasa ID.
Tanggal: 2 Okt. Dua identitas uji sekali-pakai **dibuat di dalam peramban** oleh `createDeviceLearner()` (kuncinya tidak pernah
keluar dari tab): `0xeB86…09fc` (1440 px) dan `0xE071…2469` (500 px). Keanggotaan diberikan dan dicabut lewat
`npm run grant:member` dengan `LANCENA_ORIGIN=test`; kedua baris uji itu dihapus sesudahnya (sisa tabel: satu baris, akun builder).

| # | langkah | hasil |
|---|---|---|
| 1 | akun baru → `#/app/welcome` | tiga kursi; Peserta "Kursimu" + "Mulai sebagai peserta"; Penerbit dan Agent Owner "Memeriksa…" lalu **"Belum"** dengan syaratnya, tanpa tombol |
| 2 | `#/app/account`, kartu "Kursi di akun ini" | Peserta: aktif; Penerbit: syarat (keanggotaan dari kunci penerbit); Agent Owner: syarat (`ownerOf`); catatan sumber + "Periksa ulang" |
| 3 | `grant:member` hire=1 appoint=0 → "Periksa ulang" | Penerbit **Kursimu**: "Anggota Yayasan Literasi Digital Nusantara (institusi demo, fiktif)", "diberikan oleh kunci penerbit `0x8211…F7DE` · sejak 2 Okt 2026"; chip menyala *Pantau* + *Sewa agen penilai*, padam *Tunjuk agen pengesah* + *Terbitkan / cabut kredensial — tetap kunci penerbit* |
| 4 | tata letak kursi Agent Owner | identitas uji tidak memiliki agen, jadi jawaban `/me/roles` **ditiru di peramban** dengan fakta asli agen #2534 dari `GET /agents/2534/rates` (dompet `0xFd26…0094`, tarif dasar 2000 satuan = 0,002 LDC-demo); baris agen + tautan BscScan ke NFT identitas (`…/token/0x8004A818…?a=2534`). Kepemilikan sungguhan dibuktikan T50 bagian E, bukan langkah ini |
| 5 | muat ulang (tiruan hilang) → `#/app/welcome` | Penerbit **Kursimu** + "Lihat di Akun" (membuka `#/app/account`); Agent Owner "Belum" |
| 6 | ponsel 500 px, identitas kedua, hire=0 appoint=1 | baris kursi bertumpuk, nama + status satu baris; chip *Tunjuk agen pengesah* menyala, *Sewa agen penilai* padam; lebar dokumen 485 ≤ 500 (tanpa gulir samping) |
| 7 | `grant:member --revoke` → "Periksa ulang" (ponsel) | Penerbit kembali **Belum**; Peserta tetap |
| 8 | konsol, tujuh rute (`welcome`, `account`, Ringkasan, Kursus, Nilai, Dompet, `account`) | 0 error, 0 peringatan |
| 9 | waktu `readMyRoles()` di peramban (tanda tangan + penerbit + chain) | sebelum: 4241 / 1646 / 2425 ms; sesudah `agentsOwnedBy` dua tahap + keanggotaan dan chain dibaca bersamaan: 2114 / 985 / 1551 / 1209 / 1113 ms |

**Cacat yang ditemukan uji ini dan ditutup sebelum catatan ditulis:** (a) lencana kursi menulis "Memeriksa kursimu…" — terlalu
panjang untuk lencana; kini "Memeriksa…". (b) Kursi yang belum dipegang menampilkan lencana "Belum" **dan** tombol mati "Belum" —
tombolnya dibuang (syaratnya dipenuhi di luar halaman, bukan lewat formulir). (c) Judul kartu "Kursimu" bentrok dengan lencana
"Kursimu" di tiap baris — judul kini "Kursi di akun ini". (d) `/me/roles` membaca agen secara lengkap (empat panggilan) untuk
setiap agen yang dikenal sebelum tahu pemiliknya — kini `ownerOf` serentak dulu, baca lengkap hanya untuk yang dimiliki (langkah 9).
Ditemukan saat menulis kodenya, sebelum uji: kursi yang tidak terbaca (tanda tangan ditolak, penerbit diam) akan tampil "Belum" —
kini "Tak terbaca".

**Yang tidak diuji:** login sungguhan dengan akun builder (keanggotaan akun itu sudah diberikan, lihat B128); dashboard Penerbit
dan Agent Owner — belum ada (C2, C3).
