---
tags: [acceptance-criteria, B168]
status: active
updated: 2026-10-06
---

# AC-B168 - Bukti NFT dan kit LinkedIn (tahap 1 + 2)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B168 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T91 - Uji peramban bukti NFT dan bagikan ke LinkedIn (B168)]] ·
**Summary:** [[08-Results/B168 - Executive Summary]] · **Terkait:** [[03-Frontend/FE10 - Halaman bagikan dan kartu OG (fungsi Vercel)]], [[03-Frontend/FE9 - Credentials page and certificate sheet]],
B164 (lapis artefak), B165 (lembar), B169 dan B170 (tahap 3 yang dipecah)

Pertanyaan builder 5 Okt malam: "gimana cara membuktikan kalau itu NFT dan udh terikat dengan akunnya? + gimana cara kita bisa bawa narasi nft sertifikat ini agar bisa di post di linkedIn?" —
dijawab di chat dan dikerjakan atas "gas": gambar pratinjau **per sertifikat**, tahap 3 **ya** (dipecah B169 dan B170). Kontrak, database, dan signer tidak disentuh di B168.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B168#1 | penampil lembar punya panel **Bukti on-chain**: untuk tiap lapis yang memegang artefak — kontrak (tautan penjelajah), token ID (salin), pemilik `ownerOf` (✓ bila = alamat dompet akun), `locked()`, ERC-5192, tautan token di penjelajah, perintah `cast` yang bisa disalin | **PASS** | T91 langkah 1 (B153: dua kartu, tiap kartu "✓ Terikat ke akun ini", pemilik `0x12f6F95E…775a11DF` "✓ sama dengan alamat dompet akunmu", "✓ ya — tidak bisa dipindahkan", ERC-5192 "✓ ya", tautan `https://testnet.bscscan.com/token/<kontrak>?a=<tokenId>`, 4 perintah `cast`); tangkapan `b168-bukti.png` |
| AC-B168#2 | nilai di panel dibaca **dari chain**, bukan dari catatan, dan sama dengan yang saya baca dengan `cast call` | **PASS** | `probe` "bukti NFT B153 …" (kedua instance: pemilik = alamat akun, locked, ERC-5192); pembacaan ulang `cast` 6 Okt: `ownerOf` `0x12f6F95E…11DF`, `locked` true, `supportsInterface(0xb45a3c0e)` true di instance A dan B |
| AC-B168#3 | tanpa artefak → "Artefak NFT belum dicetak … Kredensialnya tetap sah tanpa itu"; pembacaan yang **gagal** → "tidak terbaca" (bukan "belum dicetak", bukan "bukan milikmu") | **PASS** | T91 langkah 3 (`tokenOfCredential` dipalsukan 0 → teks "belum dicetak", nol kartu) dan langkah 4 (`ownerOf` dipalsukan galat → chip "Tidak terbaca", pemilik "tidak terbaca"); `probe` "pembacaan yang gagal tampil sebagai null/readOk=false …" |
| AC-B168#4 | untuk akun LAIN token yang sama tidak dianggap terikat | **PASS** | `probe` "bukti NFT untuk akun LAIN: … ownerIsAccount = false" |
| AC-B168#5 | panel dan dialog bagikan **tidak ikut tercetak**; PDF tetap 1 halaman | **PASS** | T91 langkah 1: media print → `.cert-proof` dan dialog `display:none`, lembar di (0,0) 1122 × 793, 1 halaman |
| AC-B168#6 | tombol **Tambahkan ke profil LinkedIn**: URL `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=…&organizationName=…&issueYear=…&issueMonth=…&expirationYear=…&expirationMonth=…&certUrl=…&certId=…` terisi dari sertifikat; penerbit demo diberi "(demo)"; `organizationId` tidak dipakai bersamaan; dibuka di tab baru (`noopener noreferrer`) | **PASS** | T91 langkah 2 (href terbaca penuh: nama "… (demo)", penerbit "Yayasan Literasi Digital Nusantara (institusi demo, fiktif)", 2026/10 → 2027/10, `certUrl` = tautan pratinjau, `certId` = hash); `probe` 2 pemeriksaan parameter (nama dipotong 100, penerbit tak dikenal → "Lencana", spasi `%20`). Format parameter dari dokumentasi/sumber publik LinkedIn; **tidak diuji ke LinkedIn sungguhan** |
| AC-B168#7 | tombol **Bagikan sebagai post** membuka komposer dengan tautan pratinjau ter-encode | **PASS** | T91 langkah 2; `probe` "bagikan sebagai post …" |
| AC-B168#8 | **draf teks post** Indonesia dan Inggris: judul, nilai, tautan, tagar; kalimat NFT HANYA bila artefaknya ada; catatan demo/jaringan uji/bukan ijazah; tanpa frasa terlarang (ijazah on-chain, anti-pemalsuan, terverifikasi, resmi, diakui, siap produksi, tidak bisa dipalsukan, 1EdTech, official, accredited, tamper-proof); < 3.000 karakter; bisa disunting dan disalin | **PASS** | `probe` "draf post …" (empat kombinasi bahasa × NFT) dan "penerbit nyata di mainnet …"; T91 langkah 2 (teks Indonesia utuh, ganti ke Inggris, salin → papan klip = isi, tautan tersalin) dan langkah 3 (tanpa NFT → tak ada kata NFT) |
| AC-B168#9 | **halaman bagikan per sertifikat** `/s/<hash>`: HTML dengan tag Open Graph (judul, deskripsi, `og:image` 1200 × 630, `twitter:card`) yang dibaca perayap tanpa JavaScript, lalu pengalihan ke verifier; semua nilai di-escape; status keberlakuan TIDAK ditulis | **PASS** (kode, dijalankan lokal) | `probe` "fungsi share (lokal, dokumen tepi sungguhan) …" dan "OG B153 … TANPA kata status", "halaman bagikan: semua nilai di-escape …" |
| AC-B168#10 | **gambar kartu per sertifikat** `/s/<hash>/card.png`: PNG 1200 × 630, > 50 KB, dari dokumen sungguhan (judul, nilai + cincin, penerbit, tanggal, kristal dari hash), cache panjang; gagal render → alihkan ke `hero.jpg` | **PASS** (kode, dijalankan lokal) | `probe` "fungsi card (lokal) …" (tanda tangan PNG, IHDR 1200 × 630, 181 KB); tangkapan `card-b153-normal.png`; kartu judul panjang (dipotong "…"), nilai 100 (tiga angka), tanpa nilai dan tanpa penerbit |
| AC-B168#11 | fungsi menolak dengan benar: hash rusak/kosong/bermarkup → 400, hash yang tidak tersaji di tepi → 404 (tanpa HTML atau gambar karangan), `HEAD` tanpa badan, huruf besar dikenali | **PASS** | `probe` "fungsi bagikan menolak dengan benar …", "HEAD tanpa badan" |
| AC-B168#12 | bundel `api/_lib/lencana-share.mjs` (kode sama dengan app, dibangun `npm run build:api`) **segar** terhadap `web/src` — mengubah `certificate.ts`/`share.ts` tanpa membangun ulang = merah | **PASS** | `probe` "bundel … SEGAR …"; negatif: `escapeHtml` dimatikan + kata status ditambah → 4 merah (OG, halaman bagikan, kartu, kesegaran bundel), dikembalikan → hijau |
| AC-B168#13 | ponsel 390 px dan Inggris | **PASS** | T91 langkah 5 (panel 366 px, dialog 358 px, tanpa luapan) dan 6 ("On-chain proof", "✓ Bound to this account", "Share on LinkedIn") |
| AC-B168#14 | Esc menutup dialog bagikan lebih dulu, bukan penampil | **PASS** | T91 langkah 2 (Esc 1: dialog tertutup, hash tetap, fokus kembali ke tombol; Esc 2: kembali ke daftar) |
| AC-B168#15 | kontrak, database, signer, `CERT_ADDRESS` tidak disentuh | **PASS** | `git status`: `web/`, `api/`, `vercel.json`, vault |
| AC-B168#16 | gerbang | **PASS** (kecuali baterai) | `tsc` 0, `probe` **232 / 0** (212 + 20), `build` 0, `audit` bersih 12/0, `check:labels` 8/0; baterai di Summary |
| AC-B168#17 | **LIVE:** `/s/<hash>` dan `/s/<hash>/card.png` di produksi menjawab 200 dengan tag OG dan PNG; perayap LinkedIn membaca pratinjau; tombol di app jalan | **OPEN** — menunggu dorongan atas kata builder | — |

**Batas klaim:** "pratinjau LinkedIn" belum dilihat di LinkedIn sungguhan (hanya format tag dan gambar yang diperiksa terhadap spesifikasi publik); URL tambah-ke-profil mengikuti parameter yang didokumentasikan publik dan tidak
diuji ke akun LinkedIn. Fungsi Vercel diuji lokal dengan bundel yang sama persis dengan yang dideploy, **bukan** di runtime Vercel — pemasangan dependensi `api/` lewat `installCommand` dan pelacakan berkas font oleh Vercel baru terbukti
saat LIVE. Dokumen di host tepi menentukan apa yang tampil: kredensial yang belum diterbitkan ke tepi tidak punya halaman bagikan (404). Artefak NFT tidak otomatis ada untuk setiap kredensial (B169).
