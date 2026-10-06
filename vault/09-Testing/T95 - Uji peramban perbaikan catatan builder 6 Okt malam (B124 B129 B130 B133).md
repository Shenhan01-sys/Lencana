---
tags: [testing, "T95"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core`; identitas uji lewat server kunci sekali-pakai 127.0.0.1:8999 (kunci tidak pernah dicetak): R_owner (pemilik agen #2548) untuk dasbor Agent Owner, kunci penerbit untuk editor kursus; signer produksi di Railway (data nyata, hanya dibaca kecuali yang disebut)
measured: 2026-10-06
result: CATATAN BUILDER 6 OKT MALAM TERUJI — tombol back detail kursus dan kelas → #/app bagi yang masuk (tamu tetap #catalog); dasbor Agent Owner: 4 tab (satu panel tampil, panah kiri/kanan bekerja), halaman Akun (#/app/owner/account), kartu solid tanpa gradient (rgb 24,26,32), tombol nonaktif solid; editor kursus: "⚠ 8 masalah" tombol solid → dialog modal (tinggi bilah 65 → 65, tutup lewat Esc dan tombol); nol galat konsol
---

# T95 - Uji peramban perbaikan catatan builder 6 Okt malam (B124, B129, B130, B133)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B124, B129, B130, B131, B133 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Terkait:** [[08-Results/B124 - Executive Summary]], [[08-Results/B129 - Executive Summary]], [[08-Results/B130 - Executive Summary]], [[08-Results/B133 - Executive Summary]]

Catatan builder setelah uji manual (6 Okt malam): tombol back di `/course/` dan `/class/` mendarat di landing; "Alur esai" di `/app/pub` jelek dan pengajuan anggota tidak ditemukan; `/app/owner` acak-acakan, warna pudar, tidak ada halaman Akun; label "11 masalah" di editor kursus melebar di kontainernya; B131 benar (dua peran = akun dev).

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara). Server kunci sekali-pakai `127.0.0.1:8999` menyerahkan identitas uji ke halaman lalu mati (skrip alat sesi, tidak dikomit).
2. Skrip puppeteer (alat sesi) `b172-browser.mjs guest|owner|issuer`: memasang identitas di `sessionStorage` + tanda Privy, membuka rute, membaca DOM dan gaya terhitung.

## Hasil 6 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | tamu: `#/course/web3-dasar-2026` | tautan kembali `#catalog` "← Kembali ke katalog" (perilaku tamu tidak berubah) |
| 2 | **masuk**: detail kursus | tautan kembali `#/app` "← Dasbor" |
| 3 | **masuk**: ruang kelas `#/class/web3-dasar-2026` | `.class-topbar-back` → `href="#/app"`, label "Dasbor" (tamu di rute kelas dialihkan ke beranda, jadi tidak ada tombol) |
| 4 | dasbor Agent Owner `#/app/owner` | **4 tab** (Ringkasan, Rupa agen, Otak & antrean, Tarif & pekerjaan); awal: Ringkasan terpilih, tepat satu panel tampil; klik tiap tab → hanya panelnya tampil dan `aria-selected` benar; panah kanan dari Ringkasan → fokus dan pilihan pindah ke Rupa agen |
| 5 | sidebar owner | dua butir: **Agen saya** dan **Akun** (`#/app/owner/account`); aktif sesuai rute |
| 6 | halaman Akun owner | judul "Akun", alamat dompet + Salin, jaringan, tombol Keluar, kartu "Kursi di akun ini" (Agent Owner: #2548) — komponen `renderAccount` yang sama dengan dasbor peserta |
| 7 | gaya terhitung (bukti "solid") | `.ab` dan `.ws`: `background-color: rgb(24, 26, 32)`, `background-image: none`, `box-shadow: none`; label `.ab-label` `rgb(207, 212, 220)`; tombol nonaktif `rgb(43, 49, 58)` dengan `opacity: 1` (bukan emas pudar) |
| 8 | label dulu "Soket otak" | kini "Otak terpasang" (en "Installed brain") |
| 9 | editor kursus (kunci penerbit): "Kursus baru" → draf kosong | tombol **"⚠ 8 masalah"** solid (`rgb(255, 159, 26)`); `<details>` lama tidak ada; **klik → dialog modal** (`:modal` benar) berisi 8 butir (lokasi + masalah); **tinggi bilah 65 px sebelum dan sesudah** (tidak melebar); Esc menutup; tombol Tutup menutup |
| 10 | ponsel 390 px dasbor owner | tab membungkus ke dua baris, kartu satu kolom, tanpa teks terpotong |
| 11 | galat | `pageerror`: **0** |

Tangkapan layar: `b172-owner-*`, `owner-new-*`, `owner-m-*`, `b172-warn-*` (alat sesi). Bagian B129 (dasbor Penerbit) di bawah.

## Batas

- Tombol back diuji sebagai tautan (`href`), bukan klik berlanjut ke dasbor; tamu tidak bisa membuka `#/class/…` sama sekali (dialihkan ke beranda).
- Dasbor owner diuji dengan data nyata dari signer produksi untuk satu agen (#2548); akun dengan beberapa agen dan agen yang ditunjuk sebagai pengesah (meja pengesahan di tab "Otak & antrean") tidak diuji di sini.
- Chrome 154 saja.

## Bagian B129 — dasbor Penerbit `/app/pub` (dikerjakan dan diuji oleh agen paralel, dibaca ulang induk)

Identitas: kunci penerbit lewat server kunci sekali-pakai (port 8998); overview **disuntik** `team.requests` karena signer produksi belum membawa kode baru, dan `POST /publisher/members` **dicegat** (tidak menulis apa pun).

| # | langkah | hasil |
|---|---|---|
| 12 | **Alur esai** (kartu penuh lebar) | stepper 4 tahap sama lebar: 1 Diserahkan (0) → 2 Diusulkan (3, bertepi emas solid karena menunggu) → 3 Final (6) · atau · 4 Ditolak (0); bar porsi di bawahnya; chip "Termasuk: 2 dinilai langsung kunci penerbit"; keterangan; 390 px satu kolom, 860 px 2×2, tanpa teks terpotong |
| 13 | kartu Tim, kunci penerbit, ada pengajuan | daftar pengajuan (alamat pendek + catatan + tanggal) dengan **Setujui** dan **Tolak**; Setujui membuka dialog izin (hire / appoint / author / publish) |
| 14 | pesan yang ditandatangani | setuju → `lencana-member grant member=… hire=1 appoint=0 author=1 nonce=<hex>`; tolak → `lencana-member reject member=… nonce=<hex>`; tanda tangan 65 byte; keduanya ke `POST /publisher/members` |
| 15 | mode anggota (bukan kunci penerbit) | hanya jumlah pengajuan + "kunci penerbit yang memutuskan" + perintah `npm run grant:member -- <alamat>`; tanpa tombol |
| 16 | sidebar Penerbit | butir **Akun** → `#/app/pub/account` merender `renderAccount`; galat konsol 0 |
| 17 | harness `verify:publisher` | **67 / 0** (57 + 10 grup B2); uji negatif (daftar diberikan ke anggota) → 1 merah, dikembalikan → hijau |

Tangkapan layar (alat sesi): `pub-new`, `pub-req-duo`, `pub-req-dialog`, `pub-flow-hp`, `pub-team-hp`, `pub-akun`.

**Batas:** daftar pengajuan dan tombol Setujui/Tolak baru berfungsi di produksi sesudah signer baru dideploy (dorongan); persetujuan dengan kunci penerbit sungguhan belum diuji di produksi; pengajuan uji dibuat dengan kunci acak dan baris `origin=test` dibersihkan (`cleanup` sisa 0 sesudahnya).
