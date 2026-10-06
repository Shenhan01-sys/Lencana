---
tags: [frontend, "FE11", prototype, admin]
status: prototype
updated: 2026-10-06
---

# FE11 - Prototipe Admin: alur proses bisnis sebagai benda (B172)

**Part of:** [[03-Frontend/01 - Frontend]] · **Backlog:** B172 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B172 - Halaman Admin ringkasan jejak kesehatan]] · **Summary:** [[08-Results/B172 - Executive Summary]] ·
**Berkas prototipe:** `FE11 - Prototipe Admin proses bisnis (B172).html` (di folder yang sama; buka langsung di peramban — tanpa jaringan, tanpa pustaka)

**Status: prototipe disetujui builder ("udh nice") dan TERPASANG di tab Ringkasan halaman Admin (6 Okt malam) — `web/src/pages/admin-objects.ts` (benda + sabuk), `admin-stations.ts`, `admin-detail.ts`, `admin-line.css`; berkas HTML ini tetap sebagai acuan standalone.** Permintaan builder 6 Okt malam, sesudah melihat pipeline gaya n8n di tab Ringkasan:
"tiap station gausa pakai station card, langsung UI perwujudan proses bisnisnya itu aja tapi yang solid; coba design di HTML standalone dulu, taruh di vault".

## Gagasan

Doktrin FE builder: **wakili prosesnya, jangan deskripsikan** — cari BENDA nyata dari tiap langkah, taruh di ruang, jadikan data sebagai geometri. Maka tidak ada kartu station;
tiap langkah adalah bendanya sendiri, berdiri di satu **sabuk** (konveyor), dan benda kecil yang ikut berjalan di sabuk adalah apa yang berpindah antar langkah.

| Station | Benda | Data jadi geometri |
|---|---|---|
| Kursus | rak buku | satu buku per kursus: emas = terdaftar, abu = belum; label jingga "IZIN" = pengajuan anggota menunggu |
| Pendaftaran | gerbang dengan palang putar + dua tumpukan tiket | satu tiket per pendaftaran: abu = gratis, hijau (berkoin) = berbayar |
| Kelas & esai | meja dengan tumpukan kertas ujian + pensil | satu kertas per esai diserahkan |
| Penilaian agen | robot penilai dengan papan rekap + deretan robot kecil | batang papan = proporsi status esai; robot kecil = agen dikenal (emas = disewa) |
| Pengesahan | alat stempel di atas barisan kertas usulan | satu kertas per usulan: hijau disahkan, jingga disesuaikan, merah ditolak, garis putus belum diputuskan; stempel menekan berulang |
| Hasil | perisai lencana emas dengan pita hijau | satu peniti hijau per esai diterima |
| Penyelesaian | corong koin → pembagi → dua toples | tinggi isi toples = bagian uang (kiri emas = Lencana, kanan hijau = bersih penerbit); blok jingga = tagihan agen |

Antar station berjalan benda yang berpindah: buku → tiket → kertas → kertas bernilai → kertas bertanda stempel → koin.

## Gaya

**Solid** (permintaan builder untuk dasbor lain, berlaku juga di sini): warna datar dari palet Lencana (latar `#0b0e11`, kartu `#181a20`, tepi `#2b313a`, emas `#f0b90b`, hijau `#0ecb81`,
jingga `#ff9f1a`, merah `#f6465d`, abu `#b7bdc6`/`#5d6672`), tanpa gradient halus, tanpa glow, tanpa kartu pembungkus. Satu-satunya "gradient" adalah garis belang bergerak pada sabuk (hentian keras).
Gerak punya makna: sabuk berjalan, benda berpindah antar langkah, stempel menekan, koin jatuh; semuanya padam bila `prefers-reduced-motion`.

## Perilaku

- Klik atau Enter pada sebuah benda membuka popup detail: penjelasan proses, baris angka (berwarna menurut makna), siapa yang bertindak, asal angkanya, navigasi Sebelumnya/Berikutnya, Esc menutup.
- Layar ≤ 1080 px: sabuk menjadi vertikal (benda di kiri, angka di kanan, benda yang berpindah turun di antara station).
- Data = objek `D` di skrip: **SAMPEL dari data produksi 6 Okt 2026** (8 kursus, 13 pendaftaran, 10 peserta, 9 esai, 6 agen, kotor 27 LDC-demo, …). Sunting `D` untuk melihat bentuk berubah.
  Saat dipasang ke aplikasi, `D` diganti `AdminSummary` dari `/admin/overview` (bentuknya sudah sama dengan `web/src/learning.ts`).

## Diuji

Chrome 154 headless via `puppeteer-core`: 1360 px dan 390 px tanpa gulir samping, popup terbuka dengan 5 baris angka, nol galat konsol. Tangkapan layar: alat sesi (`proto-desktop`, `proto-popup`, `proto-mobile`).
Catatan alat: animasi `opacity` pada benda yang berpindah tidak tertangkap oleh tangkapan layar headless (benda tampak hilang) — diganti animasi `transform` saja.

## Belum

Versi aplikasi punya bahasa Indonesia + Inggris; berkas HTML standalone hanya Indonesia. Belum diuji di Safari/Firefox. Di aplikasi tata letak mengikuti lebar kartu (container query 920 px), bukan lebar layar.
