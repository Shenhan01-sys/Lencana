# 01 — Briefing produk

## Satu paragraf

**Lencana** adalah platform micro-course yang **penerbit sertifikatnya adalah agen AI**.
Kredensial yang dihasilkan mengikuti standar **Open Badges 3.0 / W3C Verifiable Credentials 2.0**
(bukan format kami sendiri), sementara **siapa yang berhak menerbitkan** dan **apakah sebuah
sertifikat sudah dicabut** tercatat di BNB Chain. Hasilnya: seorang rekruter bisa memastikan
satu sertifikat **cukup dengan browser** — tanpa wallet, tanpa akun, tanpa mempercayai server
kami — dan penerbit **tidak bisa berpura-pura tidak pernah mencabut**.

Yang kita jual bukan "NFT sertifikat". Yang kita jual adalah **jalur penerbitan kredensial yang
bisa diaudit publik**, dan **verifikasi oleh pihak ketiga** yang selama ini tidak punya jawaban
bagaimana caranya.

## Kenapa bentuknya begini

Kegagalan yang mau kita hapus konkret:

> Sertifikat PDF bisa dipalsukan dengan Photoshop. Sertifikat di basis data penerbit bisa
> dipalsukan oleh penerbitnya sendiri, atau oleh admin yang kompromi. **NFT tidak menyelesaikan
> keduanya** — ia hanya memindahkan pertanyaan menjadi: *siapa yang boleh mencetak, dan dari
> mana pemeriksa tahu itu asli?*

Jawaban lama ("karena blockchain, karena NFT") tidak bertahan diuji. Karena itu produk ini
dirancang menjawab **empat pertanyaan mekanis**, bukan satu slogan:

| # | pertanyaan | jawaban di produk |
|---|---|---|
| a | Siapa yang berhak menerbitkan, dan bagaimana itu terikat on-chain? | Whitelist alamat di `CredentialResolver`. Alamat asing → transaksi **revert**, bukan pesan halus |
| b | Apa yang mencegah sertifikat dijual atau dipindahtangankan? | NFT **soulbound** (ERC-5192): `transferFrom`, `safeTransferFrom`, `approve`, `setApprovalForAll`, dan **burn** semuanya ditolak |
| c | Bagaimana orang memeriksa tanpa wallet dan tanpa crypto? | Halaman verifikasi statis, **satu `eth_call`** langsung ke chain. Tidak ada backend kami di jalur ini |
| d | Apa yang terjadi kalau sertifikat dicabut — dan bisa tidak pencabutan itu disangkal? | `revoke()` di BAS. **Tidak ada fungsi `unrevoke`**; sekali tercabut, terbaca tercabut selamanya |

## Tiga orang yang memakainya

| | siapa | hubungannya dengan crypto |
|---|---|---|
| **Rina, 24 th** — peserta | ikut kursus, mengerjakan tugas, dapat sertifikat | **nol.** Tidak pernah melihat seed phrase, tidak pernah menandatangani transaksi, tidak membayar untuk sertifikatnya |
| **Lembaga pelatihan** — penerbit & sponsor | membuat kursus, menetapkan standar lulus, **menanggung biaya** penerbitan on-chain | punya satu kunci, yang dipegang oleh agennya |
| **Bagas, HRD** — verifier | menerima ratusan pelamar, ingin tahu mana yang benar | **nol.** Buka URL, tempel kode |

Track lomba ini resminya berbunyi *"social, gaming and loyalty with **seamless UX**"*. Karena itu
onboarding tanpa seed phrase bukan fitur tambahan — itu syarat produk. Kuncinya sederhana:
**yang mengirim transaksi adalah penerbit, bukan peserta.** Kita sengaja tidak menyentuh
ERC-4337/paymaster, karena ketersediaannya di BSC belum pernah kita verifikasi.

## Alur sebenarnya, langkah per langkah

**1. Masuk.** Login email. Backend membuatkan alamat untuk peserta; dia tidak pernah memegang
kuncinya. Yang dia lihat: katalog berisi **satu kursus nyata yang kami buat sendiri** — bukan
marketplace kosong, karena platform tanpa konten tidak bisa didemokan.

**2. Belajar.** Modul + kuis. Materi disimpan biasa (objek statis di penyimpanan IPFS/Greenfield
adalah opsi fase berikutnya, bukan jalur kritis).

**3. Dinilai agen.** Tugas akhirnya **esai terbuka**, bukan pilihan ganda — dan itu pilihan
sadar: pilihan ganda tidak membutuhkan AI, dan kalau agennya cuma menilai ABCD, tidak ada alasan
kredibel mengapa ini juga proyek agen AI. Yang agen kerjakan dan **tinggalkan jejaknya**:

```
masukan   : jawaban peserta + rubrik kursus (kriteria, bobot, ambang lulus)
keluaran  : skor per kriteria + catatan tertulis + keputusan LULUS / BELUM
tercatat  : hash(bukti penilaian) di-chain + tanda tangan agen atas kredensialnya
```

**4. Terbit.** Tiga benda terjadi dari satu alur:

| benda | apa |
|---|---|
| **kredensialnya** | dokumen `OpenBadgeCredential` (JSON-LD), ditandatangani kunci agen. **Off-chain**, dan portabel ke verifier mana pun yang memahami standarnya |
| **yang naik ke chain** | `keccak256(dokumen)` → attestation di **BAS** lewat `CredentialResolver` kita |
| **artefaknya** | NFT soulbound muncul di koleksi peserta. `mint()`-nya **menolak kalau kredensialnya tidak hidup** — ini yang membuat artefak kami bukan NFT tempelan |

**5. Dibagikan.** Peserta menyalin *kode pemeriksaan* (hash / UID / URL). Yang dia bagikan bukan
filenya, tapi cara memeriksanya.

**6. Diperiksa.** Inilah puncak ceritanya. Rekruter membuka halaman, menempel kode, dan mendapat
keputusan + seluruh bukti mentah + **perintah untuk mengulang pemeriksaan itu tanpa halaman kami**
(`cast call …` / `curl` JSON-RPC). Menampilkan cara membantah kami sendiri itu disengaja: klaim
"terverifikasi publik" tidak berarti apa-apa kalau satu-satunya cara memeriksanya adalah alat kami.

## Empat hal yang membuatnya bukan "NFT diploma 2021"

1. **Kredensialnya tidak bisa abadi.** EAS punya `expirationTime` native. Keputusan produk:
   **mencabut izin menerbitkan seorang penerbit TIDAK membatalkan kredensial yang sudah
   terbit** — keduanya sengaja dipisah, supaya mencabut satu penerbit nakal tidak ikut
   memusnahkan hak peserta yang tidak bersalah.
2. **Sertifikat lanjutan mati kalau dasarnya dicabut.** Ini **temuan**, bukan rencana awal:
   EAS hanya mengecek prasyarat **ada**, bukan **masih hidup**. Lihat
   [02-arsitektur.md](02-arsitektur.md) bagian "celah".
3. **Verifikasi massal adalah mesin ekonomi, bukan tombol.** Rekruter (atau agen rekruter) bisa
   membayar per-pengecekan lewat **x402** — dan jalur pembayaran agen di BNB Chain sudah kita
   buktikan berjalan, termasuk penyelesaian tanpa gas untuk pembayar. Garisnya:
   **kami menagih kenyamanan, tidak pernah kebenaran.** Halaman publik tetap gratis selamanya.
4. **Dokumennya standar, bukan format kami.** Konsekuensinya besar dan bisa diuji: kredensial
   kami harusnya terbuka di validator pihak ketiga. (Status pembuktiannya:
   [03-bukti-dan-batas.md](03-bukti-dan-batas.md) — **belum** dijalankan.)

## Adegan demo yang dirancang sejak awal

Lima menit, empat adegan. Setiap adegan ada karena menjawab salah satu dari empat pertanyaan.

| # | adegan | yang dilihat penonton |
|---|---|---|
| 1 | **Verifikasi tanpa wallet** | tempel kode → `DICABUT`; satu lagi → `KEDALUWARSA`. Tidak ada wallet dibuka sepanjang adegan |
| 2 | **Penerbitan oleh agen** | esai → agen menilai → menandatangani → sertifikat terbit → muncul di perangkat peserta. **Lalu: cabut dasarnya, coba terbitkan yang lanjutan → REVERT, live** |
| 3 | **Pemalsuan gagal** | transfer artefak → revert · ubah satu byte di dokumen → tanda tangan gagal · mint dari alamat tak berizin → revert |
| 4 | **Ekonominya** | agen membayar penerbitan; rekruter membayar verifikasi; **kembali tunjukkan halaman publik tetap terbuka tanpa membayar** |

## Batas yang ditulis di UI, bukan di footnote

Ini bukan formalitas hukum dan tidak bisa ditutup dengan tab. Produk ini **tidak** membuktikan:

- bahwa **isi** klaimnya benar — verifikasi kredensial bukan berarti penilaianya benar;
- bahwa **manusia** di balik alamat adalah orang yang belajar — yang terikat adalah alamat;
- bahwa sertifikat tidak bisa di-screenshot — soulbound mengikat kepemilikan, bukan tampilan;
- pengakuan hukum atau institusional apa pun.

Kenapa ini justru menguntungkan: juri yang mencoba mematahkan poin-poin itu akan menemukan
kalau **kita sudah menulisnya sendiri** sebelum mereka bertanya.
