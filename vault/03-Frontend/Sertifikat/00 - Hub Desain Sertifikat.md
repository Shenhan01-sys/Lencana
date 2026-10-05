---
tags: [frontend, certificate-design, hub]
status: draft
updated: 2026-10-05
---

# Hub — desain sertifikat Lencana (B163)

**Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Frontend:** [[03-Frontend/01 - Frontend]] · **Verifier:** [[03-Frontend/FE1 - Verifier page and verify.ts]] ·
**Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] · **Spesimen berasal dari:** B153 (kredensial uji akun builder)

Permintaan builder 5 Okt malam, sesudah kredensial uji B153 terbit: "buatkan design certificatenya, bikin 5 design, pakai html aja biar bisa saya review,
taruh di vault", dengan referensi folder `app/References/Certificates` (8 gambar).

## Status (diperbarui saat tiap berkas masuk)

~~Lima desainer dijalankan paralel mulai 5 Okt 17.10 WIB. Sampai baris ini ditulis (5 Okt 17.20 WIB) **belum ada satu pun berkas desain di folder ini** — para desainer baru membaca spesifikasi dan referensi, belum ada yang menyimpan, dan belum ada yang membuka browser untuk memeriksa hasilnya.~~
*(Ditulis 17.20 WIB hanya untuk menjelaskan folder yang saat itu masih kosong; sudah usang dan dibiarkan terbaca.)*

**5 Okt malam: kelima desain sudah ada dan sudah saya tinjau satu per satu di Chrome sungguhan.** Pintu masuk: `index.html` (galeri). Lima desainer dijalankan paralel; tiga di antaranya (S1, S2, S4) terputus galat
jaringan atau API (`ECONNRESET`, lalu `ENOTFOUND`) sebelum sempat menyimpan apa pun dan dihidupkan ulang (S1 dan S2 dua kali, S4 sekali) — akibatnya hanya waktu. Tinjauan saya menemukan masalah di empat desain dan masukan gerak di satu desain; semuanya
diperbaiki sebelum dinyatakan selesai (rincian di "Hasil tinjauan"). Menunggu: review dan pilihan builder.

## Keputusan builder (5 Okt malam)

1. **Baris penerima — dinamis:** "sebelum print bisa minta usernya pilih mau alamat wallet atau nama". Dikerjakan di S3 (dialog sebelum cetak, input nama, nama muat otomatis); nama tetap tidak ikut tanda tangan dan alamat pendek tetap tampil.
2. **Desain terpilih: S3 (Kaca Segitiga), dengan palet disesuaikan ke FE Lencana** (gelap bawaan FE dan terang, cetak selalu terang). Versi biru semula disimpan sebagai `s3-kaca-segitiga-biru.html`. S1, S2, S4, S5 tetap di folder sebagai pembanding.
3. **NFT — gabungan A+B** ("penting semua"): dicetak di kedua instance, lihat pertanyaan 5 di bawah.
4. **Dorong commit lokal:** didorong (`52ed28e..ed2dd1e`).

**Pertanyaan baru dari perancang S3 (5 Okt malam, belum dijawab builder):** (a) dua token mode terang FE gagal kontras di atas `#f5f5f5` — teks emas `#d99e00` hanya 2,18:1 dan abu `#707a8a` 3,98:1 (dihitung rumus WCAG oleh perancang, dicatat di S3 §Kontras): perbaiki token FE? di lembar dipakai `#8a6a00`, `#a77d00`, `#474d57`; (b) pilihan tema diingat antar kunjungan (sekarang mengikuti sistem kecuali diganti di sesi itu)? (c) dialog alamat/nama ini jadi pola halaman sertifikat sungguhan di `/app/credentials`?

**Jawaban builder (5 Okt malam):** (a) bertanya balik "Emgnya Lencana ada toggle light mode?" — **tidak ada**: FE hanya punya `@media (prefers-color-scheme: light)` (`web/src/style.css:57`), tanpa tombol; kontras emas 2,18:1 dan abu 3,98:1 di atas `#f5f5f5` dihitung ulang dan benar, tetapi hanya terlihat pengguna dengan sistem terang — keputusan token menunggu builder; (b) bertanya "Maksudnya?" — dijelaskan di chat: "diingat" = pilihan tema disimpan di peramban untuk kunjungan berikutnya; karena FE tidak punya toggle, usulan untuk halaman sertifikat di app: ikut tema sistem, tanpa toggle, cetak selalu terang; (c) **"Betul sekali"** — dialog ini jadi pola halaman sertifikat sungguhan → baris **B165** (DIUSULKAN, menunggu acc dan keputusan dependensi QR) di [[07-Backlog/03 - Findings and Tasks 2026-09-26]].

## Peta dokumen

| id | nama | estetika (Palet doktrin FE §7) | berkas HTML | brief | status |
|---|---|---|---|---|---|
| S1 | Piagam Krem | Skeuomorphic / Tactile — kertas, segel timbul di atas pita | `s1-piagam-krem.html` | [[03-Frontend/Sertifikat/S1 - Piagam Krem]] | **selesai** 5 Okt (lolos tinjauan: layar, nama, cetak A4 satu halaman; kontras teks kecil diperbaiki sesudah tinjauan) — menunggu review builder |
| S2 | Lembar Presisi | Swiss / Minimal — lembar pengukuran, aksen emas merek | `s2-lembar-presisi.html` | [[03-Frontend/Sertifikat/S2 - Lembar Presisi]] | **selesai** 5 Okt (lolos tinjauan: layar, nama, cetak A4 satu halaman; teks patah diperbaiki sesudah tinjauan) — menunggu review builder |
| S3 | Kaca Segitiga | Glass / Soft-depth — faset arang-emas dan medali kaca (palet FE Lencana) | `s3-kaca-segitiga.html` | [[03-Frontend/Sertifikat/S3 - Kaca Segitiga]] | ~~**selesai** 5 Okt (lolos tinjauan: layar, nama, ponsel, cetak A4 satu halaman) — menunggu review builder~~ **dikerjakan ulang 5 Okt malam sesuai keputusan builder:** palet FE Lencana (gelap + terang; cetak selalu terang) dan penerima dinamis (alamat atau nama dipilih sebelum cetak). Tinjauan independen di Chrome sungguhan lolos (tanpa galat konsol, QR terbaca di kedua tema, dialog cetak, nama 2–60 huruf muat, teks HTML di nama tidak dieksekusi, cetak satu halaman terang, ponsel 390 px, `?motion=off`) — rincian di catatan S3. Kontras = angka perancang (tidak diukur ulang); belum dicetak di kertas — menunggu review builder |
| S3-biru | Kaca Segitiga (versi biru semula) | arsip — S3 sebelum palet disesuaikan ke FE | `s3-kaca-segitiga-biru.html` | [[03-Frontend/Sertifikat/S3 - Kaca Segitiga]] | **arsip, tidak diubah** — salinan persis S3 yang didorong di `ed2dd1e` (SHA-256 `83e1965e…78e1`, sama dengan `git show HEAD:…/s3-kaca-segitiga.html`, 5 Okt malam) |
| S4 | Arus Tinta | Organic / Hand-made — pita beranyam menuju segel tinta | `s4-arus-tinta.html` | [[03-Frontend/Sertifikat/S4 - Arus Tinta]] | **selesai** 5 Okt (lolos tinjauan: layar, nama sesudah tulisan tangan selesai, cetak A4 satu halaman; lima perbaikan sesudah tinjauan) — menunggu review builder |
| S5 | Bukti Mentah | Data / Terminal — hasil pemeriksaan yang dicetak jadi sertifikat | `s5-bukti-mentah.html` | [[03-Frontend/Sertifikat/S5 - Bukti Mentah]] | **selesai** 5 Okt (lolos tinjauan: layar, nama, ponsel, cetak varian terang) — menunggu review builder |

Pintu masuk untuk meninjau: `index.html` — galeri berisi pratinjau **statis** (JPEG hanya lembarnya, keadaan akhir tanpa animasi, diambil dari Chrome sungguhan, terbenam sehingga satu berkas mandiri) dan tabel perbandingan; klik pratinjau untuk membuka desain penuh.
Pratinjau tidak ikut berubah bila sebuah desain disunting; alat pembangunnya hidup di folder kerja sesi, bukan di repo. Setiap berkas HTML bisa dibuka langsung di browser (klik dua kali), tanpa server.

## Spesimen: data nyata, bukan karangan

Semua nilai di lembar datang dari kredensial uji yang terbit 5 Okt 2026 (B153), satu objek `CERT` di kerangka bersama:

| nilai | isi | dibaca dari |
|---|---|---|
| ID kredensial (hash) | `0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31` | keluaran `npm run issue -- --from-attempts …` 5 Okt; dokumen publik di host tepi |
| attestation **UID** (BAS) | `0xe4990885327d488ff45757b2cb1cb26b0eabeb3f4880bf2c58c8b6d2a1d77506` | halaman verifier ("Attestation UID (BAS)") |
| **hash transaksi** attestation | `0xfdeb99b2df97c81754cd91230ca845faa04879d24ee02ace5fdfc44abe57d137`, blok 134.991.781, 2026-10-05T09:41:02Z | event `Attested` di BAS, dicocokkan dengan UID |
| penerima | `0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF` (dompet; **tidak ada nama**) | `credentialSubject.id` di dokumen publik |
| kursus | `uji-bayar-2026` — "Kelas Uji — Membayar dengan Tanda Tangan" | dokumen publik + `/criteria/uji-bayar-2026` |
| nilai | 87 dari 100, batas lulus 60; kuis 75 × 50 % + esai 98 × 30 % + praktik 100 × 20 % = 86,9, dibulatkan 87 (`web/src/score.ts:132`) | keluaran `issue` + dokumen kriteria (`policy.weights`, `passMark`) |
| masa berlaku | `validFrom` 2026-10-05T09:41:01Z (16.41 WIB), `validUntil` 2027-10-05T09:41:01Z (365 hari) | dokumen publik |
| penerbit | "Yayasan Literasi Digital Nusantara (institusi demo, fiktif)"; ditandatangani agen "Lencana Demo Agent" (`DataIntegrityProof`, `eddsa-rdfc-2022`) | dokumen kriteria + dokumen publik |
| tiga pemeriksaan chain | attestation tercatat · penerbit terdaftar · pencabutan bersih — dibaca 5 Okt 2026 | halaman verifier untuk hash ini |
| QR | menuju `https://lencana-psi.vercel.app/?q=<hash>#/verify` (bentuk `verifyLink`, `web/src/lesson-views.ts:164`) | lihat di bawah |

**QR:** dibuat dengan paket npm `qrcode` 1.5.4 (koreksi galat M, versi 7, 45 × 45 modul) dari alamat di atas — 108 karakter — lalu **dibaca ulang** dengan `jsqr` 1.4.0
dari PNG yang digambar dari matriks yang sama: hasil decode sama persis dengan alamatnya. Alamat itu juga dibuka di browser pada hari yang sama: verifier menampilkan "Valid".
**Logo:** `web/public/lencana-logo.jpg` dilacak jadi dua lapis vektor (emas di bawah, hitam di atas) dengan `potrace` 2.1.8.
Salah label yang sempat terjadi di percakapan dan sudah dibetulkan: `0xe499…` adalah **UID**, bukan hash transaksi.

## Kerangka bersama (supaya yang dibandingkan desainnya, bukan kerangkanya)

Kelima berkas memakai kerangka identik (bagian bertanda `SHARED SHELL` tidak boleh diubah; hanya `DESIGN:HEAD`, `DESIGN CSS`, `DESIGN:SHEET`, `DESIGN JS` yang milik desain):
lembar 1122 × 793 px (A4 landscape pada 96 dpi), skala otomatis ke layar, miring halus mengikuti penunjuk, tombol **Alamat dompet ⇄ Nama contoh**, **Ulangi gerak**,
**Cetak / simpan PDF** (satu halaman A4, latar dicetak), dan panel "Catatan desain" yang dirender dari objek `window.DESIGN` tiap desain.
Aturan gerak: keadaan akhir adalah gaya bawaan; semua animasi hanya berlaku di bawah `.sheet.is-playing`; dengan reduce-motion, `?motion=off`, atau cetak, lembar tampil utuh dan diam
(bukan beku di tengah jalan). Satu pemilik `transform` per elemen.

**Baris penerima punya dua mode**, karena kredensial tidak membawa nama manusia: `alamat` (isi data sebenarnya, bawaan) dan `nama` (nama contoh fiktif "Nadia Rahmawati", hanya untuk menilai tata letak
seandainya kelak ada nama tampilan). Di mode nama, lembar wajib menampilkan catatan bahwa nama tidak ikut tanda tangan dan tetap memperlihatkan alamat pendek (identitas yang tertanda tangan).

## Aturan klaim di lembar (dari [[10-Contributors/Claims-Cheat-Sheet]])

Tidak boleh tertulis atau tersirat: "ijazah on-chain", "anti-pemalsuan / tidak bisa dipalsukan", "terverifikasi" untuk orangnya, "resmi / terakreditasi / diakui", "siap produksi",
"kompatibel/bersertifikat 1EdTech", "AI menilai / disahkan mentor", "praktik terverifikasi on-chain", "blockchain menyimpan sertifikat". Boleh: "dapat diperiksa", "ditandatangani (DataIntegrityProof)",
"bukti penerbitan tercatat di BNB Smart Chain testnet (97)", "format Open Badges 3.0", "penerbit demo (fiktif)", "bukan ijazah".
Setiap lembar selalu memuat kalimat baku `TXT.demo` ("Penerbit demo (fiktif) · jaringan uji · bukan ijazah"), `TXT.limit` (kalimat dari kriteria yang ikut tertanda tangan:
"Hanya menyatakan peserta menyelesaikan kelas pendek ini — bukan keahlian Web3."), `TXT.statusNote` (status adalah cuplikan bertanggal; QR memberi status terkini), dan penerbit beserta catatan "institusi demo, fiktif".

## Referensi builder (tidak disalin)

Delapan gambar di `app/References/Certificates` adalah templat pihak ketiga (sebagian berwatermark), jadi **tidak disalin ke vault dan bentuknya tidak ditiru**; yang diambil hanya tingkat kehalusan
dan bagian yang berulang: blok judul "Certificate of …", baris "diberikan kepada", nama penerima besar, deskripsi pendek, segel/medali/pita, tanggal dan tanda tangan, geometri sudut, tekstur halus.
Palet yang muncul: biru, teal/hijau-abu, satu oranye, kertas krem. Sesuai doktrin FE, referensi adalah **batas mutu**, bukan tata letak untuk disalin.

## Hasil tinjauan (5 Okt malam, Chrome 154 sungguhan lewat `puppeteer-core`; alatnya di folder kerja sesi, bukan di repo)

Pemeriksaan yang sama untuk kelima berkas: layar 1440 × 960 sesudah gerak masuk selesai, tengah gerak masuk, mode nama sesudah ≥ 4 detik, `?motion=off`, ponsel 390 px, cetak (media `print` + PDF), serta pemeriksa statis.

| desain | ukuran | galat konsol | cetak A4 | mode nama (DOM) | temuan tinjauan → diperbaiki |
|---|---|---|---|---|---|
| S1 Piagam Krem | 80 KB | 0 | lembar (0,0) 1122 × 793, tinggi body 793, PDF 1 halaman | catatan nama dan alamat pendek terlihat | kontras teks kecil ≈ 3,0–3,8 : 1 (diukur dari piksel cetak) → ≈ 4,6–6,4 : 1; catatan nama baru muncul belakangan → muncul bersama nama |
| S2 Lembar Presisi | 60 KB | 0 | sama, 1 halaman | terlihat | tiga teks patah (host QR di tengah kata, angka "60" menggantung, alamat penerbit terputus) dan "(97)" sendirian → rapi; QR 150 px tidak terbaca decoder pada tampilan layar → diperbesar jadi 180 px dan terbaca (lihat bawah) |
| S3 Kaca Segitiga | 64 KB | 0 | sama, 1 halaman | terlihat | tidak ada temuan dari saya; desainer memperbaiki sendiri kristal yang terlalu besar, kontras facet, dan zona teks |
| S4 Arus Tinta | 88 KB | 0 | sama, 1 halaman | terlihat (nama tulisan tangan penuh sesudah animasi) | catatan yang menabrak baris ID; mode nama rusak (kata kedua terpotong, catatan tak tampil); keadaan akhir gerak ≠ keadaan diam ("365 hari" terpotong); coretan yang terbaca sebagai tanda tangan tangan → 32 batang byte hash; intro dipersingkat |
| S5 Bukti Mentah | 74 KB | 0 | sama, 1 halaman (varian terang) | terlihat | intro hampir kosong dan lambat; baris terketik terpotong ("…keahlian Wet") — akarnya pembulatan `steps()` di Chromium → struktur tampak sejak frame 0, intro ±3,2 detik |

Hal yang berlaku untuk kelimanya, diukur hari itu: kerangka bersama **byte-identik** dengan templat (skrip pemeriksa membandingkan semua bagian di luar wilayah desain); tidak ada sumber eksternal selain tautan Google Fonts; nol frasa terlarang di lembar
dan kode desain; tidak ada teks "undefined" atau "NaN"; nilai nyata hanya lewat `data-bind` (tidak ada hash, alamat, atau tanggal yang ditulis keras di lembar). **QR dibaca dari tangkapan layar yang sudah dirender** (bukan dari matriks sumber) dengan `jsqr` untuk tiap desain pada layar, nama, dan cetak:
semuanya terbaca dan sama persis dengan alamat verifier. Satu temuan: kode S2 awalnya terkecil (150 px untuk 45 modul = 3,3 px per modul) dan **tidak terbaca** pada tampilan layar dan nama (skala 1,07) walau terbaca di cetak; S2 memperbesarnya jadi 180 px (4 px per modul) di pelat 212 px dengan zona tenang 4 modul,
dan sesudah itu terbaca di ketiga keadaan (diuji ulang dengan PNG saya, bukan hanya oleh desainer).
Temuan lintas desain: skrip uji cetak di spesifikasi gagal (`SecurityError`) membaca `cssRules` stylesheet Google Fonts lintas-origin; S2 dan S3 memberi `crossorigin="anonymous"` pada tautan fontnya supaya skrip itu jalan, sedangkan S1, S4, dan S5 tidak — itu hanya memengaruhi skrip uji, bukan tampilan atau cetak.

## Pertanyaan untuk builder (terbuka)

1. **Baris penerima:** alamat dompet apa adanya (yang tertanda tangan), atau tambah "nama tampilan" pilihan peserta yang tidak ikut tanda tangan? Menambah nama ke dokumen yang ditandatangani berarti mengubah penerbitan (dan menyimpan data pribadi yang kini sengaja tidak disimpan) — keputusan produk, bukan desain.
2. **Layar atau cetak lebih dulu?** S3 dan S5 paling kuat di layar (S3 kehilangan efek kaca dan memakan tinta di sisi kanan saat dicetak; S5 mencetak varian terang yang hemat tinta), S1, S2, dan S4 paling alami di kertas. Semuanya tercetak satu halaman A4 (diperiksa lewat media `print` dan PDF Chrome); belum ada yang dicetak di kertas.
3. **Selaras merek (emas dan hitam) atau mengikuti referensi (biru/teal)?** Hanya S2 dan S5 memakai warna merek; S1 (krem dan hijau-abu), S3 (biru), dan S4 (teal) mengikuti palet referensi.
4. Sesudah memilih: pekerjaan kode (halaman kertas di `/app/credentials`, tautan dari verifier, PDF) menjadi baris baru — belum ada.
5. **Artefak NFT soulbound** (pertanyaan builder 5 Okt malam: "ini sertifikatnya via NFT atau gimana? lupa kita untuk NFT-nya, baru credentials di BAS"). Keadaan terbaca hari itu:
   kredensial B153 **bukan NFT** — sesuai D15 ("kredensial bukan NFT") ia dokumen OB 3.0 bertanda tangan + attestation BAS + resolver + daftar status; artefak `SoulboundCert` (ERC-721 + ERC-5192) adalah
   lapis **opsional** yang hanya bisa dicetak platform (`mint()` hanya `owner()`, `contracts/SoulboundCert.sol:107`, D30/D32) dan verifier menandai kredensial ini "Optional / Not Minted".
   Pencetakannya tidak ada di `issue`, tidak ada rute, tidak ada tombol — hanya skrip PowerShell + Foundry (`scripts/mint-edge-artefact.ps1`, `scripts/mint-showcase.ps1`). Dua hal yang harus diputuskan sebelum mencetak:
   (a) **instance** — ~~`web/src/config.ts` (preset `bsc97`) membaca `0xC6FD12B0…`, instance sebelum D42/D43~~ *(koreksi 5 Okt malam, salah baca saya: yang dibaca verifier **bawaan** adalah `defaultEndpoint()` di `web/src/verify.ts:188-197` = `0xA5eB807A…`, instance paling tua dan sama dengan `CERT_ADDRESS` di `.env`; `0xC6FD12B0…` hanyalah preset `bsc97` di `web/src/config.ts:35` yang harus dipilih manual)*; lapis yang menegakkan D42/D43 (`0xc338AF7F…`) sengaja tidak dijadikan bawaan (D46), jadi artefak di sana belum tampil di verifier;
   (b) **gambar** — ~~`tokenURI` dibekukan saat mint dan gambar bisa ditambah lewat hosting~~ *(koreksi 5 Okt malam, dari membaca `contracts/SoulboundCert.sol:245-267`: yang beku hanya `external_url` — alamat dokumen; metadata dirakit on-chain tiap dibaca dengan
   status hidup dari resolver; **tidak ada field `image`** di kedua kontrak, jadi desain sertifikat tidak bisa menjadi gambar NFT tanpa versi kontrak baru. Yang beku adalah lokasi, bukan isi: host tepi bisa kelak menyajikan halaman sertifikat untuk
   browser di alamat yang sama, dan JSON untuk mesin.)* Karena itu urutan "pilih desain dulu baru cetak" **tidak** diperlukan untuk alamat; keputusan yang tersisa hanya instance.
   **Simulasi 5 Okt malam (tanpa transaksi, `simulateContract` + `estimateGas` dari dompet platform):** `mint(0x12f6…11DF, 0xb9fb06e5…, <alamat dokumen tepi>)` **lolos di ketiga instance** — `0xA5eB807A…` (5.102 byte, `CERT_ADDRESS` di `.env`;
   ±283.389 gas), `0xC6FD12B0…` (6.729 byte, preset `bsc97`; ±308.899 gas), `0xc338AF7F…` (7.968 byte, lapis D42/D43, `LIVE_CERT_ADDRESS`; ±312.754 gas) — dengan `owner()` = dompet platform, `registry()` = resolver kita, dan kredensial **belum terikat**
   (`tokenOfCredential` = 0). Harga gas 0,1 gwei, saldo dompet platform 0,3855 tBNB: biaya ±0,00003 tBNB. Jadi mencetak itu mudah secara teknis; yang tidak bisa diulang adalah ikatannya (satu kredensial satu token per instance, `external_url` beku, tak ada jalan menghancurkan token).
   **Beda A dan B (dibaca 5 Okt malam dari kontrak, vault C2/T17/D42–D46, dan ukuran bytecode):** A `0xc338AF7F…` (7.968 byte) menegakkan D42 (hanya level kursus) dan punya `mintBatch` (D43), dijaga `verify:live-cert`, tetapi tidak dibaca verifier bawaan;
   B `0xC6FD12B0…` (6.729 byte) tidak menegakkan D42/D43 ~~tetapi dibaca verifier bawaan~~ *(salah: bukan bawaan, lihat koreksi di (a))*, dan bila kredensial ini kelak menjadi baris validator VALID **terakhir** di `validator-runs.jsonl`, `verify:live-cert` menuntut artefaknya ada di A (T17: "artefak kredensial yang divalidasi ada di lapis yang hidup"). Metadata `tokenURI` berstatus hidup di keduanya; keduanya tanpa `image`.
   ~~Catatan pemilihan: D46 menaruh kredensial yang terbit sesudah D42/D43 di `0xc338AF7F…`, tetapi verifier bawaan membaca `0xC6FD12B0…`, jadi artefak di `0xc338…` baru tampil di verifier bila alamatnya diisi di panel konfigurasi atau preset `bsc97` diubah.~~
   *(Koreksi: verifier bawaan membaca `0xA5eB807A…`; artefak di A atau B baru tampil bila alamatnya ditimpa — preset `bsc97` untuk B, isian manual untuk A.)*

   **Keputusan builder 5 Okt malam: cetak di A dan B ("penting semua"), dikerjakan.** Satu kredensial kini punya **dua** artefak (satu per instance; keunikan ditegakkan per kontrak):

   | instance | transaksi | blok | gas | tokenId | baca ulang dari chain |
   |---|---|---|---|---|---|
   | A `0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa` | `0xbb218f9bc108cfc41aa13360a6bb59a7bbdc878e8e63dbd841d21882947b5723` | 135.010.144 | 309.133 | `uint256(credentialHash)` = 84121403186795298920828483866352784394121030368831233674664771831378544364593 | `ownerOf` = penerima, `locked` = true, `tokenURI` = JSON "Lencana — VALID" |
   | B `0xC6FD12B06e4dB9B85C8C807826998f98DA51c4cd` | `0x1ae1585b39d31bcad80fa49e36577afbe30e72aae3ae57c72d6ce33b2f5491a0` | 135.010.151 | 305.309 | sama | sama |

   Dikirim dari dompet platform (`owner()` kedua kontrak), `uri` = alamat dokumen di host tepi; `tokenURI` kini berisi `external_url` itu, status "VALID" hidup dari resolver, dan hash kredensial (tanpa `image`).
   **Yang dilihat verifier produksi untuk hash ini (dibaca sesudah cetak, dengan `cert` ditimpa lewat localStorage `bnb-credential-endpoint-v1`):** bawaan kode (`0xA5eB807A…`) → "Optional / Not Minted"; preset `bsc97` (B) → "Minted & Locked", Token ID #84121403…, "🔒 Soulbound (ERC-5192)"; A diisi manual → "Minted & Locked". Jadi kedua token terbaca benar,
   ~~tetapi **tampilan bawaan masih "Not Minted"** — itu celah di verifier, bukan di token → diusulkan **B164**~~ **B164 ditutup di kode 5 Okt malam** ([[08-Results/B164 - Executive Summary]]; [[07-Backlog/03 - Findings and Tasks 2026-09-26]]): verifier bawaan kini membaca tiga lapis dan menampilkan B153 "Minted & Locked" (T87 langkah 1) — ~~LIVE menunggu dorongan~~ **LIVE** sejak dorongan `7259153..a962ff7` (T87 §LIVE).
6. **Pilihan kecil yang diangkat tiap desainer** (juga tertulis di catatan masing-masing):
   S1 — pusat segel tetap skor atau logo; stub sobek (perforasi) atau garis putus biasa; warna pita berbeda per kelas. ·
   S2 — pertahankan atau buang subjudul Inggris dan tag `uji-bayar-2026`; pantaskah kursor ukur di sertifikat publik; bobot angka (500 sekarang). ·
   S3 — cukupkah varian cetak; biru referensi atau warna merek; tampilkan tiga pemeriksaan chain sebagai baris kecil dekat QR. ·
   S4 — pertahankan saluran pensil kuis (lebar penuh pada skor 100); font tulisan tangan untuk nama contoh (Mrs Saint Delafield, indah tetapi kurang terbaca) atau yang lebih terbaca; legenda rumus di kiri atas atau hanya di panel catatan; sorotan "tembus pandang" saat hover. ·
   S5 — baris `$ periksa …` meniru perintah yang **tidak ada** di produk (bisa terbaca sebagai CLI sungguhan): pertahankan sebagai metafora atau ganti label; warna stempel emas atau hijau; penanda baca di "hari ke-0" tampak lemah.

## Batas

Spesimen desain, bukan fitur: tidak ada perubahan pada `web/`, `signer/`, database, atau chain; tidak ada yang terhubung ke `/app/credentials` atau verifier.
- **Hanya Chrome 154** yang dipakai; Firefox dan Safari belum diuji.
- **Cetak** diperiksa lewat media `print` dan PDF dari Chrome (satu halaman A4 per desain); **belum ada yang dicetak di kertas**.
- **Fokus keyboard** (Tab) pada elemen interaktif diuji desainer dengan peristiwa sintetis karena Chrome tanpa kepala tidak memberi fokus asli — coba sekali di browser biasa.
- **Ponsel:** jendela headless tidak bisa lebih sempit dari 500 px, jadi 390 px diperiksa lewat bingkai 390 × 800; lembar menyesuaikan skala tanpa gulir horizontal. Di ponsel lembar tampil sebagai gambar mini (kerangka bersama), bukan tata letak ponsel sendiri.
- **Pola turunan hash** (kristal S3, pita dan titik S4, pola dan segel S1, peta byte S5) dihitung dan diperiksa hanya untuk kredensial ini; kredensial lain menghasilkan pola lain yang belum dilihat.
- **Pratinjau galeri** statis dan tidak ikut berubah bila desain disunting.
