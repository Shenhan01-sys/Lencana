---
tags: [testing, "T95"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core`; identitas uji lewat server kunci sekali-pakai 127.0.0.1:8999 (kunci tidak pernah dicetak): R_owner (pemilik agen #2548) untuk dasbor Agent Owner, kunci penerbit untuk editor kursus; signer produksi di Railway (data nyata, hanya dibaca kecuali yang disebut)
measured: 2026-10-06
result: CATATAN BUILDER 6 OKT MALAM TERUJI — tombol back detail kursus dan kelas → #/app bagi yang masuk (tamu tetap #catalog); dasbor Agent Owner: 4 tab (satu panel tampil, panah kiri/kanan bekerja), halaman Akun (#/app/owner/account), kartu solid tanpa gradient (rgb 24,26,32), tombol nonaktif solid; editor kursus: "⚠ 8 masalah" tombol solid → dialog modal (tinggi bilah 65 → 65, tutup lewat Esc dan tombol); nol galat konsol; admin Lencana (D76) `#/app/admin`: setujui/tolak/cabut bertanda tangan, bukan-admin 403, `verify:publisher` 83/0 + uji negatif
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

## Bagian B129 (pembaruan) — admin Lencana `#/app/admin` (D76)

*Langkah 13–15 dan 17 di atas memotret tombol Setujui/Tolak versi kunci penerbit; tombol itu dicabut dari dasbor Penerbit oleh D76 dan digantikan langkah 18–26.*

Builder: keputusan atas pengajuan dipindah ke admin Lencana, akun sementara shenhan604. Uji lokal: signer lokal `127.0.0.1:8787` dengan `ADMIN_ADDRESSES` = dompet uji, server kunci sekali-pakai untuk identitas admin dan akun bukan-admin, Chrome 154 headless via `puppeteer-core`. Data uji `origin=test`, dibersihkan sesudahnya (`cleanup` sisa 0).

| # | langkah | hasil |
|---|---|---|
| 18 | akun admin membuka `#/app/admin` | bilah admin (alamat), kartu "Pengajuan menunggu" dengan jumlah, dua pemohon uji (alamat, catatan, tanggal), kartu "Anggota penerbit" |
| 19 | Setujui pemohon pertama | dialog izin (hire / appoint / author / publish); hanya `hire` dicentang → pesan `lencana-admin grant member=… hire=1 appoint=0 author=0 publish=0 nonce=…` → 200; pemohon pindah ke daftar anggota dengan wewenang sewa saja |
| 20 | Tolak pemohon kedua | `lencana-admin reject member=… nonce=…` → 200; pengajuan hilang dari antrean |
| 21 | Cabut anggota baru | `lencana-admin revoke member=… nonce=…` → 200; akun itu bukan anggota lagi |
| 22 | akun bukan admin membuka `#/app/admin` | pesan ditolak (kode 403 dari server), tanpa daftar; tidak ada tombol aksi |
| 23 | halaman Akun akun admin | baris "Admin Lencana" + tombol "Buka halaman Admin" di depan kursi lain; akun bukan admin tidak punya baris itu |
| 24 | dasbor Penerbit `#/app/pub`, kartu Tim | jumlah pengajuan + "diputuskan admin Lencana" + daftar anggota; **tidak ada** tombol Setujui/Tolak |
| 25 | galat | `pageerror`: **0**; ponsel 390 px tanpa gulir samping |
| 26 | harness `verify:publisher` | **83 / 0** (67 + grup G admin 16); **uji negatif:** `isAdmin` dipaksa selalu benar → 2 cek merah ("akun bukan admin → 403 sebelum tanda tangan dipakai", "akun bukan admin menolak pengajuan → 403"), dikembalikan → hijau; `cleanup` sisa `origin=test` 0 |

Konfigurasi produksi: variabel Railway `ADMIN_ADDRESSES` diisi dompet tertanam akun builder (alamat bukan rahasia; dibaca lewat Privy API sekali, skrip dihapus). Dipasang dengan `--skip-deploys`: kode admin belum ada di signer yang berjalan, jadi variabel baru dipakai pada deploy dorongan berikutnya.

**Batas:** persetujuan admin sungguhan di produksi belum diuji (menunggu dorongan; AC-B129#14 TERBUKA); uji lokal memakai dompet uji, bukan sesi Privy sungguhan akun builder; satu admin sementara tanpa pemulihan selain mengganti variabel.

## Bagian B135 dan B131 (pembaruan 6 Okt malam, catatan builder kedua) — logo provider, keterangan, akun admin-saja (D77)

Peramban lokal 127.0.0.1:5174 (vite sementara; untuk bagian admin diarahkan ke signer lokal dengan `ADMIN_ADDRESSES` = akun uji acak, kuncinya dihapus sesudah uji), identitas lewat server kunci sekali-pakai. Bagian logo memakai signer produksi dan akun pemilik agen #2548.

| # | langkah | hasil |
|---|---|---|
| 27 | rak provider di tab "Otak & antrean" (`#/app/owner`) | tujuh tombol tanpa teks tampil: logo (enam `<svg>` + satu `<img>` favicon xKiro), masing-masing 30×30 px, `aria-label` dan tooltip = nama provider; satu baris di 1280 px |
| 28 | pilih Anthropic | hanya satu tombol `aria-pressed=true` (Anthropic), bertepi emas; kolom kunci mengikuti provider |
| 29 | urutan kepala panel | kicker "Otak agen · #2548" → keterangan "Pilih provider, pakai API key milikmu…" → baris judul "Otak penilai" + status "belum ada otak" (posisi vertikal naik berurutan); sebelumnya keterangan di bawah judul dan status |
| 30 | ponsel 390 px | rak membungkus ke dua kolom (260 px lebar), tanpa gulir samping; `pageerror` 0 |
| 31 | akun admin-saja (uji): buka `#/app` | berakhir di `#/app/admin` |
| 32 | `#/app/pub`, `#/app/owner`, `#/app/courses`, `#/app/welcome` | semuanya berakhir di `#/app/admin` |
| 33 | `#/app/account` | berakhir di `#/app/admin/account`; kartu "Kursi di akun ini" hanya satu baris: **Admin Lencana** + tombol "Buka halaman Admin" (tanpa baris Peserta / Penerbit / Agent Owner) |
| 34 | halaman Admin dan sidebar | sidebar dua butir (Admin Lencana, Akun); kartu "Pengajuan menunggu" dan "Anggota penerbit"; `pageerror` 0 |
| 35 | harness `verify:publisher` | **89 / 0** (83 + 6 cek D77: peran efektif admin, dasbor penerbit 403, rute peserta 403, dasbor Agent Owner 403, memilih peran 409, hibah keanggotaan ke admin ditolak); **uji negatif:** baris admin di `accountOf` dimatikan → 4 merah, dipulihkan → hijau; `cleanup` sisa 0 |
| 36 | data produksi akun shenhan604 | sebelum: `account_roles` dev (dummy 2 builder), anggota penerbit (hak publish), agen #2547 miliknya di chain; sesudah: `account_roles` kosong, keanggotaan aktif 0 (`grant:member --revoke`), akun dev tinggal 1; NFT #2547 tetap di dompetnya (tidak bisa dicabut dari sini) |

Tangkapan layar (alat sesi): `b173-brain-desktop`, `b173-head-desktop`, `b173-rack-mobile`, `b173-admin-account`.

**Batas:** produksi masih menjalankan signer lama sampai dorongan — sebelum itu akun shenhan604 yang masuk akan terbaca "belum berperan" (pilih peran); setelah dorongan ia langsung ke halaman Admin. Logo diuji di Chrome 154 saja; logo adalah mark pihak ketiga yang dipakai untuk mengenali provider (penyebutan nominatif).
