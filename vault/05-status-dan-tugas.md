# 05 — Status dan urutan kerja

**Terakhir diperbarui: 17 September 2026. Tenggat submission: 30 September 2026, 23:59 WIB
(±13 hari).**

## Posisi hari ini

| | |
|---|---|
| Lapis on-chain (2 kontrak) | ✅ ditulis · **47 test lulus di fork chain 97 dan 56** · deploy terbukti di fork |
| Halaman verifikasi | ✅ dibangun · typecheck + build lulus · **probe 19/19 terhadap chain nyata** (jalur kredensial aktif) |
| Data demo bisa dibangkitkan ulang | 🟡 skrip ada, **1 transaksi masih gagal** dan membawa akibat: kredensial lanjutan + pencabutan tidak mendarat di fork |
| Backend penanda tangan kredensial | ⬜ **belum ada** — blocker-nya bukan ketidaktahuan lagi, bentuk dokumennya sudah terbaca. Yang menahan: keputusan D-STATUS-LIST |
| Isi kursus nyata | ⬜ belum ada. Tanpa ini tidak ada yang bisa didemokan |
| Deploy ke testnet publik | ⬜ terblokir wallet berisi testnet BNB |
| Repo git | ✅ ada (yang kamu baca ini). ⚠️ **sejarahnya mulai 17 Sep**, bukan dari hari pertama — commit history adalah bukti *"dibangun selama periode hackathon"*, jadi setiap hari tanpa commit adalah hari yang tidak bisa dibeli kembali |
| Registrasi event | ⬜ belum. Wajib sebelum submit, dan rubrik penjurian detail hanya dibuka untuk peserta terdaftar |

## Tiga hal yang menahan, dan siapa yang bisa melepasnya

1. **⏰ Butuh kamu (manusia), bukan kami** — faucet BSC testnet **ber-CAPTCHA**. Isi satu wallet
   dengan testnet BNB, dan deploy jadi satu perintah (`forge script … --broadcast`). Biaya
   terukur di fork: **0,0003828 BNB**. Setelah address ada, isi di panel *Konfigurasi pembacaan*
   halaman verifikasi.
2. **🧠 Keputusan yang harus diambil sebelum backend ditulis** — bagaimana pencabutan on-chain
   kita terlihat oleh verifier Open Badges standar. Tiga opsi dianalisis di
   [02-arsitektur.md](02-arsitektur.md#satu-keputusan-yang-masih-terbuka-status-list-standar-vs-pencabutan-on-chain);
   rekomendasinya **A**: bitstring status list yang **diturunkan dari state chain**, hash-nya
   direkam lewat `timestamp()` di BAS. **Alasan ini penting dan bukan estetika:** tanpa itu,
   kredensial kita bisa lolos validator pihak ketiga sambil menampilkan "AKTIF" untuk sertifikat
   yang sudah kita cabut.
3. **✍️ Kursus dan soalnya** —topik apa, rubriknya bagaimana, siapa "institusi" di demo. Ini
   keputusan produk, dan tanpa ini cerita demo tidak sampai.

## Urutan kerja yang saya sarankan

| | pekerjaan | kenapa urutan ini |
|---|---|---|
| 1 | **Perbaiki `SeedDemo`** sampai state demo lengkap (kredensial lanjutan + pencabutan mendarat), lalu jalankan probe pada jalur **DICABUT** | kecil, dan menutup satu-satunya lubang di lapisan yang paling kita banggakan. Tanpa ini, klaim "halaman verifikasi teruji" masih separuh |
| 2 | **Ambil keputusan status list** | menentukan bentuk dokumen kredensial — menulis backend sebelum ini berarti menulis ulang |
| 3 | **Backend penanda tangan**: `eddsa-rdfc-2022`, dua `@context` terurut, `validUntil`, `achievement.criteria` wajib, `verificationMethod` cukup URL HTTP | jalur kritis sekarang ada di lapis off-chain, bukan on-chain |
| 4 | **Satu kursus nyata + rubrik + tugas esai** | produk tanpa konten tidak bisa didemokan |
| 5 | **Uji interoperabilitas**: kirim kredensial ke `https://vc.1ed.tech`, dokumentasikan hasilnya. **Sebelum lulus, jangan tulis "kompatibel"** | ini bukti terkuat yang belum kita punya, dan hampir tidak butuh kode |
| 6 | **Deploy ke 97** → address resolve → isi di halaman | formalitas setelah wallet terisi |
| 7 | **Verifikasi berbayar lewat x402** (server membalas `402`, klien mengirim header `PAYMENT`) | **belum pernah dijalankan sama sekali** — yang terbukti selama ini hanya settlement on-chain-nya |
| 8 | **Go/no-go lapisan agen: 23 Sep** | kalau agen belum menandatangani + meng-anchor satu kredensial **tanpa campur tangan manusia**, mundurkan lapisan itu dan submit Consumer Apps saja. Inti produk tetap berdiri tanpanya |
| 9 | Video ≤5 menit (4 adegan) + isi form submission + repo publik | 28–30 Sep |

## Jadwal

| tanggal | target |
|---|---|
| 17–18 Sep | `SeedDemo` bersih + probe jalur DICABUT hijau · keputusan status list diambil |
| 19–21 Sep | backend penanda tangan jalan · satu kursus nyata ada isinya |
| 22–23 Sep | uji `vc.1ed.tech` · **go/no-go agen** |
| 24–26 Sep | deploy ke 97 · lapisan x402 (uji A) · rapikan adegan |
| 27 Sep | **pantau ulang daftar submission peserta lain** — angka "nol pesaing" kami dari 13 Sep, dan lonjakan hari terakhir itu pola umum |
| 28–29 Sep | video + isi form + cek ulang repo publik |
| 30 Sep | **submit pagi**, jangan jam 23.00 |

## Yang sengaja TIDAK dikerjakan

Daftar ini panjang dan itu bagian dari rencananya — tiap baris adalah sesuatu yang menggoda tapi
tidak muat dalam 13 hari:

- **TEE / zkML / "verifiable inference"** — tidak ada padanan yang bisa dijalankan di BSC untuk
  tenggat ini, dan klaimnya memang sudah dilarang di proyek ini
- **ERC-6551** "skill wallet" per peserta — statusnya Review, dan menolak ditolak itu perlu
  deploy registry pihak ketiga
- **Marketplace multi-penerbit** — chicken-and-egg konten, mustahil didemokan
- **Greenfield di jalur kritis** — testnet-nya direset ±7 hari, padahal penjurian akhir setelah itu
- **ERC-4337 / paymaster untuk onboarding** — nol bukti ketersediaan di BSC. Kita capai "tanpa
  seed phrase" dengan cara yang lebih membosankan dan pasti jadi: **penerbit yang bayar gas**
- **Reputasi penerbit yang bisa turun** — tetap **slide**, bukan adegan: dengan satu kursus dan
  satu agen tidak ada deretan data yang bisa ditunjukkan, dan menampilkannya sebagai adegan hanya
  mengundang jawaban "ini baru satu kasus"
- **Mainnet.** Testnet sah menurut aturan; alamat yang resolve di BscScan yang wajib
