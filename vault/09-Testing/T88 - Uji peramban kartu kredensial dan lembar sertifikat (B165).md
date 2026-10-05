---
tags: [testing, "T88"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174 (kode baru, dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core`, konteks bersih tiap skenario; identitas uji = alamat peserta B153 `0x12f6…11DF` (publik) dengan kunci acak yang tidak pernah dipakai menandatangani apa pun di jalur ini; chain 97 publik dan host tepi publik sungguhan, kecuali yang disebut "dipalsukan" (lapisan jaringan peramban)
measured: 2026-10-05
result: KARTU DAN LEMBAR BEKERJA END-TO-END — "Kredensial saya" menampilkan satu kartu B153 (BERLAKU · 87/100 · 5 Oktober 2026 → 5 Oktober 2027 · NFT soulbound 2 lapis) tanpa tabel; "Lihat sertifikat" membuka lembar S3 dengan semua bidang dari dokumen nyata; QR terbaca sama dengan tautan verifier; dialog alamat/nama, nama muat 2–60 huruf, HTML di nama tidak dieksekusi; cetak = 1 halaman gelap; status dicabut dan penerbit ditarik tampil dengan penanda; RPC gagal tampil sebagai galat (bukan kosong); dokumen 404 dan 500 dibedakan; kredensial orang lain tidak membuat lembar; ponsel 390 px tanpa luapan; nol galat konsol. Putaran pertama merah di satu hal nyata (kaki lembar menimpa isian) dan diperbaiki. `probe` 210 / 0. LIVE sudah: skrip utama diulang terhadap produksi (`assets/index-DjuuhFae.js`) dengan hasil sama, nol galat konsol
---

# T88 - Uji peramban kartu kredensial dan lembar sertifikat (B165)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B165 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B165 - Halaman sertifikat dari dokumen kredensial]] · **Summary:** [[08-Results/B165 - Executive Summary]] ·
**Terkait:** [[03-Frontend/FE9 - Credentials page and certificate sheet]], hub desain [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]], T87 (verifier, B164)

Pertanyaan yang diuji: apakah peserta bisa melihat kredensialnya sebagai kartu yang bisa dipahami, membuka lembar sertifikat yang datanya benar-benar dari dokumen
kredensial, memilih alamat atau nama sebelum mencetak, dan mencetaknya satu halaman — tanpa lembar untuk kredensial orang lain, tanpa menulis status
keberlakuan sebagai klaim, dan tanpa menyamakan "gagal" dengan "kosong".

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji — port 5173 milik builder tidak disentuh).
2. Skrip puppeteer (alat sesi, tidak di repo) membuka konteks Chrome bersih per skenario dan memasang identitas uji lewat `evaluateOnNewDocument`:
   `sessionStorage['lencana-learner-v1'] = {address: <alamat B153>, kind: 'perangkat', pk: <kunci acak>}` dan `localStorage['lencana-privy-v1'] = '1'` (penanda yang
   membuka `#/app/*`), `lencana_lang` = `id` (atau `en` untuk langkah 14). `window.print` diganti penghitung supaya tidak ada cetak sungguhan.
3. Langkah 11–13 dan 15 memakai pencegatan permintaan di peramban: RPC dibatalkan (11), `GET /credentials/<hash>` dijawab 404/500 (12), jawaban `eth_call` ke
   `statusOf(bytes32)` di resolver diganti (13, 15) dan `GET /criteria/uji-bayar-2026` diganti narasi panjang (15). Permintaan lain jalan sungguhan.

## Hasil 5 Okt malam (putaran akhir)

| # | langkah | hasil |
|---|---|---|
| 1 | `#/app/credentials` (1280 px) | satu kartu: "Kelas Uji — Membayar dengan Tanda Tangan", chip **BERLAKU**, **87**/100, Diterbitkan **5 Oktober 2026**, Berlaku sampai **5 Oktober 2027**, "Ditandatangani agen penerbit: Lencana Demo Agent", "🔒 NFT soulbound · 2 lapis", ID `0xb9fb06e5…96430c31`, tombol Lihat sertifikat (`#/app/credentials/0xb9fb…`), Periksa di verifier, Salin tautan verifier; tanpa `<table>`; catatan kaki "1 dari 1 ditampilkan"; tanpa luapan mendatar |
| 2 | klik "Lihat sertifikat" | lapisan `body > .cert-layer` (kelas `cert-open`); lembar: kelas, skor **87** (sesudah hitung-naik), `LULUS`, alamat `12f6 F95E 5b04 1ea9 Af2f 1e0F ed55 066a 775a 11DF`, penerbit "Yayasan Literasi Digital Nusantara" + catatan "institusi demo, fiktif", agen "Lencana Demo Agent", bukti "DataIntegrityProof · eddsa-rdfc-2022", terbit 5 Oktober 2026 16.41 WIB, sampai 5 Oktober 2027, 365 hari, format Open Badges 3.0, cincin "batas 60" + "Kuis 50% / Esai 30% / Praktik 20%", batas klaim "Kelas uji alur pembayaran: kredensialnya hanya menyatakan … bukan keahlian Web3.", kaki "Penerbit demo (fiktif) · jaringan uji · bukan ijazah · Status dibaca dari chain pada 5 Okt 2026; pindai QR untuk status terkini."; **tanpa** penanda status; tanpa tombol tema. **QR didekode jsQR = `https://lencana-psi.vercel.app/?q=0xb9fb06e5…6430c31#/verify`** |
| 3 | dialog cetak | terbuka dengan fokus di dalamnya; **Esc** menutup, `print` 0×, fokus kembali ke tombol, hash tidak berubah; "Nama" kosong → "Tulis namamu dulu, atau pilih alamat dompet." + `aria-invalid="true"`, dialog tetap terbuka, `print` 0×; nama "Nadia Rahmawati" → dialog tertutup, `print` 1×, lembar menampilkan nama, `localStorage['lencana.sertifikat.penerima:0x12f6…']` = `{"mode":"nama","name":"Nadia Rahmawati"}` |
| 4 | panjang nama + keamanan | "Al" dan "Nadia Rahmawati": 58 px satu baris; 60 huruf berhuruf lebar: 34 px dua baris; `W` × 60: 21 px dua baris; blok kelas tetap di tempatnya, tanpa luapan dan tanpa tumpang tindih; `<img src=x onerror="window.__x=1">` tampil sebagai teks, `window.__x` tidak terset, elemen nama tanpa anak |
| 5 | cetak (media `print`) | lembar di (0, 0) 1122 × 793, latar `rgb(11,14,17)` (gelap), keenam saudara `<body>` `display:none`, bilah dan dialog `display:none`, skor 87, `page.pdf` **1 halaman** |
| 6 | "← Kredensial saya" dan Esc | hash `#/app/credentials`, `.cert-layer` hilang, kelas `cert-open` hilang, daftar kembali termuat; Esc di lembar → hash `#/app/credentials`, lapisan hilang |
| 7 | pindah dari lembar | ke `#/app/wallet` → lapisan hilang, `cert-open` hilang; ke `#/verify` → lapisan hilang |
| 8 | muat penuh `#/app/credentials/<hash>`; hash orang lain | lembar langsung terbuka; `#/app/credentials/0x1111…1111` → "Bukan kredensialmu" + "Kredensial ini bukan milik akun yang sedang masuk, jadi lembarnya tidak dibuat." (tanpa `.cert-sheet`; tautan "← Kredensial saya" dan "Periksa di verifier") |
| 9 | ponsel 390 px | daftar: dokumen 390, kartu 358 px, tanpa luapan; lembar: tanpa luapan lapisan, lembar 366 px |
| 10 | akun tanpa kredensial (`0x7777…`) | "Belum ada kredensial" + tombol "Lihat kursus" (`#/app/courses`); bukan galat |
| 11 | RPC dibatalkan | "Kredensialmu tidak terbaca" + tombol "Coba lagi"; **tidak** ada keadaan kosong dan tidak ada kartu |
| 12 | dokumen 404 / 500 | kartu tetap tampil dengan judul `Kredensial 0xb9fb06e5…96430c31` dan chip BERLAKU dari chain; 404: "belum tersaji di host publik … tetap bisa diperiksa di verifier", tanpa tombol sertifikat; 500: "Dokumen kredensial gagal diambil: HTTP 500" + "Coba lagi" |
| 13 | `statusOf` dipalsukan = dicabut | kartu: chip **DICABUT**, kartu bertepi merah; lembar: penanda "DICABUT" di atas lembar dan catatan "Status dibaca dari chain pada 5 Okt 2026 (DICABUT); pindai QR untuk status terkini."; kaki tidak menimpa isian (jarak 28 px) |
| 14 | bahasa Inggris | kartu: "My credentials", "VALID", "View certificate / Check in verifier / Copy verifier link", "🔒 Soulbound NFT · 2 layer(s)", tanggal "5 October 2026"; bilah lembar: "← My credentials / Wallet address / Name / ▶ Replay motion / Print / save PDF"; isi lembar tetap Indonesia ("Sertifikat Kelulusan") |
| 15 | kasus terburuk kaki | narasi kriteria 238 karakter (dua baris) + `statusOf` = penerbit ditarik: penanda "PENERBIT DITARIK", kaki 2 + 1 baris, font tetap 10,5 px, **jarak ke isian 13 px** (≥ 6 px syarat) |
| 17 | kriteria dijawab 404 *(ditambah sesudah baterai)* | lembar tetap dibuat: blok penerbit disembunyikan, "LULUS" tidak tampil, tanpa label "batas" dan label komponen; skor 87 tetap; batas klaim dari narasi di dokumen kredensial; kaki "jaringan uji · bukan ijazah · Status dibaca dari chain pada 5 Okt 2026; …" (tanpa "Penerbit demo") |
| 18 | `statusOf` dijawab galat JSON-RPC *(ditambah sesudah baterai)* | kartu: chip "STATUS BELUM TERBACA" (tidak bertepi merah); lembar: penanda "BELUM TERBACA", kaki "… Status belum terbaca dari chain; pindai QR untuk status terkini." |
| 19 | sistem disetel terang (`prefers-color-scheme: light`) *(ditambah sesudah baterai)* | lapisan `rgb(11,14,17)`, bilah `rgb(21,23,28)`, lembar `rgb(11,14,17)`, teks judul `rgb(234,236,239)` — tetap gelap. Temuan di luar B165: dasbor di bawahnya memakai token varian terang FE (`--bg-app` jadi `#f5f5f5`): latar body tetap gelap tetapi tulisan "Lencana" di navbar tampak gelap di atas gelap dan beberapa kapsul menjadi terang (tangkapan `b165-sistem-terang-daftar.png`) |
| 20 | galat (semua skenario, termasuk 17–19) | `pageerror` dan `console.error`: **0** di semua skenario (permintaan `401` dari `POST /me/roles` dengan kunci acak disaring: itu akibat identitas uji, bukan kode) |

**Putaran pertama (merah, diperbaiki):** (a) kaki lembar menimpa pill penerbit dan baris bukti (`kakiMenimpa: true`) karena aturan global `p { line-height: 1.6; max-width: 65ch }`
dari `web/src/style.css` ikut mengenai teks lembar — dinetralkan dengan `html :where(.cert-sheet) p` (spesifisitas (0,0,2): menang atas `p` global, kalah dari semua aturan kelas S3) dan
isian penerbit/penandatangan dinaikkan 16 px, plus pengepas kaki yang mengukur jaraknya; (b) penanda "DICABUT" berteks putih hanya 3,53:1 → teks gelap 5,49:1; (c) `cleanName`
merapatkan "Budi⏎Santoso" menjadi "BudiSantoso" (ditemukan `probe`, bukan peramban) → tab/baris baru jadi spasi; (d) klik kartu di ponsel kena tab bawah (kesalahan skrip, bukan kode): skrip menggulir kartu ke tengah.

**Gerbang 5 Okt malam:** `npx tsc --noEmit` exit 0; `npm run probe` **210 / 0** (173 + 37 grup B165, termasuk pemeriksaan baru bahwa `main.ts` mengekspor ulang `CREDENTIAL_HOST`/`APP_HOST` dari `config.ts`); `npm run build` exit 0.

## LIVE (5 Okt malam, sesudah dorongan `8b58481..e2fc546`)

Skrip utama yang sama (langkah 1–15 dan 20; langkah 17–19 hanya dijalankan terhadap dev) dijalankan terhadap `https://lencana-psi.vercel.app/` sesudah bundel produksi berganti dari
`assets/index-BxD6KH3I.js` ke `assets/index-DjuuhFae.js` (934.267 byte — nama dan ukuran sama dengan `npm run build` lokal; memuat "Belum ada kredensial", "Lihat sertifikat", "Bukan kredensialmu",
"Disusun dari dokumen kredensial publik", dan kunci `lencana.sertifikat.penerima`). Hasilnya sama dengan di dev: kartu B153 (BERLAKU · 87 · 5 Oktober 2026 → 5 Oktober 2027 · NFT 2 lapis, tanpa tabel); lembar dengan penerbit
"Yayasan Literasi Digital Nusantara" + "institusi demo, fiktif", QR terbaca = tautan verifier; dialog (Esc, nama kosong ditolak, `print` 1×); nama 58/58/34/21/37 px dan HTML tidak dieksekusi; cetak: lembar di (0,0) 1122 × 793,
latar `rgb(11,14,17)`, saudara `<body>` tersembunyi, skor 87, **1 halaman**; Esc, pindah ke bagian lain, dan pindah ke verifier menutup lapisan; tautan langsung membuka lembar; "Bukan kredensialmu" untuk hash orang lain; ponsel 390 px tanpa luapan;
akun kosong "Belum ada kredensial"; RPC dibatalkan "Kredensialmu tidak terbaca" (bukan kosong); dokumen 404/500 dibedakan; DICABUT berpenanda (jarak kaki 28 px); kasus terburuk kaki (PENERBIT DITARIK, 2 + 1 baris, jarak 13 px);
bahasa Inggris; `pageerror`/`console.error` **0**. Deploy `deploy-signer` untuk dorongan ini dipicu karena `web/src/**` ada di filter jalurnya; signer tidak berubah (run B164 sebelumnya selesai sukses dalam 20 menit 59 detik).

## Batas

- **Cetak di kertas sungguhan belum**; PDF diperiksa lewat `page.pdf` (jumlah halaman) dan media `print` (geometri, latar), tidak dirasterisasi.
- Hanya Chrome 154; hanya tema gelap yang dipakai skrip (Lencana selalu gelap — tidak ada tema lain untuk diuji).
- Identitas uji memakai kunci acak: `POST /me/roles` mengembalikan 401 dan penjaga kursi jalan seperti saat penerbit tak terjangkau; akun sungguhan dengan tanda tangan Privy tidak diamati.
- Langkah 1–20 menguji kode DEV lokal terhadap chain dan tepi publik; ~~**Produksi belum** menjalankan kode baru (AC-B165#21 OPEN) sampai dorongan atas kata builder~~ produksi sudah menjalankan kode baru dan skrip utamanya diulang di bagian "LIVE" (AC-B165#21 PASS).
