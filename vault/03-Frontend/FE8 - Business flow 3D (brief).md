---
tags: [frontend, "FE8", design-brief]
status: built-local
updated: 2026-10-02
---

# FE8 - Business flow 3D di landing — brief, lalu yang dibangun

**Part of:** [[03-Frontend/01 - Frontend]] · **Sumber alur:** [[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]] ·
**Referensi kualitas:** `References/3D businessFlow.txt` (Agentic Factory 3D, three.js prosedural) — dipakai sebagai
*tingkat polish dan gerak*, bukan tata letak yang disalin (FE Doctrine §10) · **Berkas FE milik maintainer yang ikut
disentuh:** [[10-Contributors/Open-Items-for-Dave]] OI-23

Permintaan builder (2 Okt): "UI 3D berisi business flow Lencana … 1 pov 1 scene … peserta, publisher, agent owner …
toggle untuk switching masing-masing role", dengan konsep seperti referensi. Brief di bawah di-acc builder ("Lanjut sesuai
rancangan"), dan bagian ini **menggantikan** bagian tiga langkah teks "Certification Flow" di landing.

> **Status 2 Okt: dibangun dan diuji lokal; di-commit lokal, belum di-push (menunggu kata builder).** Tabel stasiun di bawah adalah
> brief yang di-acc; yang berbeda sesudah dibangun ada di "Koreksi atas brief" — brief-nya tidak dirapikan diam-diam.

## Bentuk umum (berlaku untuk ketiga scene)

- **Satu pelat mesin per peran** (logam gelap + emas Lencana, seperti kartu hero), 5–6 **stasiun** di atasnya,
  dihubungkan **satu jalur**; satu **benda** berjalan dari stasiun ke stasiun dan berubah bentuk di tiap stasiun —
  itulah alurnya. Toggle di atas: **Peserta · Penerbit · Agent Owner** — ganti peran = pelat lama turun, pelat baru naik.
- Arahkan/ketuk stasiun → sorot + satu kalimat yang benar menurut kode (bukan slogan). Seret = putar; scroll halaman
  tidak dibajak (tanpa zoom di landing).
- Semua geometri prosedural (tanpa model/gambar), tulisan di layar dalam scene dilukis di canvas.

## Scene 1 — Peserta

| # | stasiun | benda | yang terjadi (benar menurut kode) |
|---|---|---|---|
| 1 | Masuk | kartu identitas | login email → dompet tertanam (Privy), atau kunci perangkat; setiap tulisan ditandatangani |
| 2 | Belajar | tumpukan halaman | lesson menyala satu per satu: terkunci → dibuka → mulai → selesai (lompatan ditolak) |
| 3 | Kuis | lembar jawaban → mesin penilai | yang dikirim *pilihan*, bukan angka; server menilai dengan kunci yang tidak pernah ke browser |
| 4 | Esai | amplop → baki antrean | teks masuk tanpa angka; agen AI mengusulkan nilai, kunci kedua mengesahkan |
| 5 | Praktik | probe membaca blok chain | transfer/saldo dibaca ulang dari chain 97 (formulir halaman belum ada — catatan jujur) |
| 6 | Terbit | **kartu LENCANA** dicetak | attestation BAS + token soulbound (ERC-5192) |
| 7 | Diperiksa | lensa pemeriksa | siapa pun membaca status dari chain, tanpa akun |

## Scene 2 — Penerbit

| # | stasiun | benda | yang terjadi |
|---|---|---|---|
| 1 | Susun kursus | cetak biru → segel hash | modul, kuis, rubrik, bobot, ambang → `rubricHash` (aturan tidak bisa diganti diam-diam) — **salah, lihat koreksi 1** |
| 2 | Diakui platform | nama terukir di pilar registri | `addIssuer` di resolver; tanpa ini penerbitan ditolak |
| 3 | Sewa agen | robot berlabuh + koin | agen penilai ERC-8004 disewa per aktivitas, dibayar x402 |
| 4 | Sahkan | stempel | usulan agen baru berlaku sesudah reviewer mengesahkan/mengubah |
| 5 | Terbitkan | gerbang berlapis → kartu | dari rekaman: semua lesson selesai, ambang lulus, bukti lengkap — baru gas bergerak |
| 6 | Cabut | kartu memerah | hanya penerbit yang bisa mencabut; Lencana tidak bisa |
| 7 | Pendapatan | koin terbelah | verifikasi massal berbayar x402 dibagi penerbit + platform |

## Scene 3 — Agent Owner

| # | stasiun | benda | yang terjadi |
|---|---|---|---|
| 1 | Daftarkan agen | lencana identitas (NFT) | identitas ERC-8004 di registry BNB |
| 2 | Tetapkan tarif | tangga 7 label | tarif dasar di metadata; +5% per tingkat berat |
| 3 | Disewa | jabat tangan kontrak | penerbit menyewa per aktivitas penilaian |
| 4 | Menilai | lengan robot + label | agen memilih label tingkat berat di pesan yang ia tandatangani; reviewer agen ≠ pengusul |
| 5 | Dibayar | koin ke dompet agen | tagihan x402; dompet agen menerima sewa dikurangi bagian platform |
| 6 | Batasnya | kunci tetap di penerbit | agen tidak pernah menandatangani kredensial (D54) |

## Teknik dan batas

- `three` (npm) + addons (OrbitControls, RoundedBoxGeometry, RoomEnvironment), **dimuat lambat** saat bagian ini
  masuk layar — beranda tidak bertambah berat; `verify:privy`/`verify:quizkeys` tetap memeriksa entry.
- Tanpa WebGL → diagram statis alur yang sama. `prefers-reduced-motion` → tanpa putaran otomatis, benda tetap bisa
  dilangkahkan per stasiun dengan tombol.
- Bahasa ikut toggle EN/ID halaman. Tidak ada angka atau klaim yang tidak bisa ditunjukkan kodenya.
- Uji: `tsc` + build, bundle (three di chunk lambat), uji peramban tiap peran + toggle + tanpa error konsol, ponsel.

## Yang dibangun (2 Okt)

| berkas | isi |
|---|---|
| `web/src/pages/flow3d-data.ts` | tiga peran, stasiun per peran, satu kalimat EN/ID per stasiun, teks bagian. Bebas DOM dan bebas three |
| `web/src/pages/flow3d-scene.ts` | mesin three.js prosedural: pelat + nameplate, 20 kit stasiun, rel CatmullRom, benda berjalan, label DOM, hover/ketuk, ganti peran, `dispose()` yang juga melepas konteks WebGL |
| `web/src/pages/flow3d.ts` | bagian landing: toggle peran, panggung, panel langkah (‹ ❚❚/▶ ›), pemuat lambat lewat `IntersectionObserver`, daftar cadangan tanpa WebGL |
| `web/src/pages/flow3d.css` | semua aturan dikunci di `.flow3d-section` |
| `web/src/pages/landing.ts` | bagian tiga langkah diganti `renderFlow3D()` |
| `web/package.json` | `three` 0.186.1, `@types/three` 0.186.0 (dev) |

Papan cetak biru di stasiun "Susun kursus" tidak mengetik angkanya: bobot (kuis 40 · esai 40 · praktik 20), ambang 70, dan
`rubricHash` `0x2a45d0d0…b7d164677fc8` dibaca dari `MANIFESTS[0]` milik `web/src/manifest.ts` saat scene digambar — manifest
**publik** yang sama dengan halaman `#/publishers`. Sengaja bukan `manifest-keys.ts`: modul itu membawa kunci jawaban kuis
dan tidak boleh masuk bundel peramban (B80). Nilai di atas dicetak ulang 2 Okt dengan `rubricHashOf(manifestOf('web3-dasar-2026'))`.

## Koreksi atas brief

1. **`rubricHash` tidak memuat modul.** `canonicalPolicy` (`web/src/manifest.ts:86`) meng-hash kriteria, bobot, ambang lulus,
   masa berlaku, prasyarat, kuis beserta kuncinya, dan esai beserta rubriknya — materi modul ada di `manifestHash`, supaya
   memperbaiki typo materi tidak membatalkan ijazah. Kalimat stasiun di halaman sudah memakai yang benar ("Kuis beserta
   kuncinya, rubrik esai, bobot, dan ambang lulus di-hash jadi rubricHash").
2. **Tanpa WebGL tampil daftar, bukan diagram statis:** alur yang sama sebagai daftar bernomor, panggung memanjang mengikuti
   isinya, dan panel langkah (tombol + petunjuk) disembunyikan karena tidak ada yang bisa dilangkahkan.
3. **Jumlah stasiun 7 · 7 · 6**, bukan 5–6.
4. **Kalimat tarif dipertegas:** "tiap naik satu dari tujuh label tingkat berat menambah 5%" — sesuai `tarif x (1 + 5% x tingkat)`
   di [[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]] §11c.

## Uji 2 Okt (lokal, peramban headless + SwiftShader)

Build: `npm run build` di `web/` hijau. Entry `index-*.js` 593.68 kB (gzip 192.62 kB) memuat **0** `WebGLRenderer`;
three hidup di chunk lambat `flow3d-scene-*.js` 590.41 kB (gzip 151.07 kB) yang baru diminta saat bagian ini mendekati layar.

| yang diuji | hasil |
|---|---|
| desktop 1440×900, tiga peran | ketiga pelat tampil; toggle menurunkan pelat lama dan menaikkan yang baru; label 7 · 7 · 6 |
| hover stasiun (pointer) | panel pindah ke stasiun yang disorot, kursor `pointer`; keluar canvas → kembali ke stasiun aktif |
| klik stasiun / label, ‹ › | benda berjalan ke stasiun itu; tiga kali › dari 02 → 05, dua kali ‹ → 03 (ketukan cepat menumpuk) |
| ganti bahasa di depan bagian ini, 4× | tiap kali tepat **1** canvas panggung, teks ikut bahasa, posisi gulir tetap, 0 pesan konsol |
| ponsel 500×900, pointer kasar | panggung 453×362 (rasio 5:4), label hanya nomor, petunjuk "Ketuk stasiun atau nomornya", `touch-action: auto` di canvas (halaman tetap bisa digulir di atas panggung), ketuk label 05 → 05, ketuk stasiun 07 → 07 |
| `prefers-reduced-motion: reduce` | mulai berhenti (▶) dan tetap di 01 sesudah 6 detik; langkah per tombol tetap jalan |
| WebGL dimatikan | daftar ID/EN tampil, 0 canvas, toggle peran mengganti isi daftar |
| konsol sepanjang uji | 0 error dari halaman, kecuali dua yang memang diharapkan saat WebGL dimatikan (three: "Error creating WebGL context", lalu peringatan `flow3d` bahwa daftar dipakai). Satu `setPointerCapture` NotFoundError muncul **hanya** saat event pointer sintetis (pointerId palsu) dikirim ke OrbitControls — artefak alat uji, tidak muncul dengan event sentuh sesudah perbaikan 4 di bawah |

Gerbang lain pada hari yang sama: baterai `npm run sync:numbers` (di `signer/`) **22 harness, 0 gagal** — termasuk `probe` web 88/0,
`verify:quizkeys` 30/0, `verify:privy` 41/0 — lalu atas kode final: `probe` 88/0, `verify:quizkeys` 30/0, `verify:privy` 41/0,
`npm run audit` bersih, `sync:numbers --verify` 40 klaim sepakat; vault: wikilink 1727 / rusak 0, mermaid 48 / hazard 0, CJK 0,
paste 5587/5600.

Yang ditemukan uji itu dan sudah diperbaiki sebelum catatan ini:

1. Papan cetak biru dimiringkan ke arah yang salah — permukaannya sejajar arah pandang kamera, jadi stasiun 01 Penerbit
   tampak kosong.
2. Kamera dipilih dari dua posisi tetap; dihitung ulang, pada rasio panggung 1.2–1.7 (tablet, ponsel lebar) tepi pelat
   **terpotong**. Sekarang jarak kamera dihitung dari rasio supaya tepi depan pelat selalu muat, dan di ponsel kamera lebih curam.
3. ‹ › yang diketuk cepat saling menimpa (dua ‹ hanya mundur satu) — kini diantre.
4. OrbitControls memasang `touch-action: none` di canvas: di ponsel jari di atas panggung tidak bisa menggulir halaman.
   Pada pointer kasar pendengarnya kini dilepas; ketukan memakai pendengar scene sendiri.
5. Jam diam stasiun pertama ikut termakan kompilasi shader di perangkat lemah — kini mulai dihitung di frame pertama.

## Di luar bagian 3D tetapi ikut ditambal (berkas maintainer — OI-23)

- **Ganti bahasa tidak menggambar ulang landing.** Sejak port `dex/lencana-ui` (D58), `setLanguage` di `web/src/main.ts`
  hanya memperbarui teks statis lama: hero, katalog, dan bagian ini tetap di bahasa sebelumnya sampai rute berganti.
  Sekarang landing digambar ulang saat bahasa diganti. Ruang kelas **sengaja tidak** — draf esai yang sedang diketik akan
  hilang; itu masih terbuka di OI-23.
- **`#how-it-works` menggambar halaman kosong.** Hash itu lolos penjaga rute sebagai anchor beranda, tetapi
  `mountNewApp` tidak menggambar apa pun untuknya. Bagian ini kini memakai `id="how-it-works"` dan `mountNewApp` menggambar
  landing untuk hash itu. `#pipeline` dan `#architecture` masih kosong (OI-23).
- Salinan tiga langkah lama (`lmsV2.stepsTitle` … `step3Desc`, tipe + EN + ID) dan CSS `.how-it-works-*` / `.step-number` /
  `.step-content` dibuang dari `i18n.ts` dan `style.css` — tidak ada pemakai lain.
