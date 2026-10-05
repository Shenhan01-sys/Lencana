---
tags: [hub, frontend, open-items]
status: active
updated: 2026-10-05
---

# 00 - Hub Open Items

The items live in one document so Dave can read them in a single pass:
**[[10-Contributors/Open-Items-for-Dave]]**. This hub is only the index.

| item | one line |
|---|---|
| OI-1 | the page builds a credential that was never signed, for courses we do not have |
| OI-2 | the payment console targets a route that does not exist; the real one is `POST /verify` |
| OI-3 | the bitstring visualizer shows a simulation and is labelled as our list |
| OI-4 | fake EVM revert strings typed by hand |
| OI-5 | invented metrics and an invented person |
| OI-6 | 20 URLs on `lencana.io`, a domain the project does not hold (`main.ts` 17, `render.ts` 1, `index.html` 2) |
| OI-7 | the money the product does not actually move (tBNB pricing) |
| OI-8 | hero claims that outrun the four scenes |
| OI-9 | `file:///C:/Project_Dave/…` links that resolve on exactly one machine |
| OI-10 | a preset labelled "BSC Testnet (97) — target submission" that carries addresses that are not ours |
| OI-11 | `main.ts` contains no `fetch(`: the paid panel is timers, while the same repo settles real payments |
| OI-12 | the shown document still uses the two-entry `credentialStatus` the OB 3.0 schema rejects |
| OI-13 | a button that prints "14/14 Tests Passed (12ms)" from a `setTimeout` — an invented pass result, not just an invented flow |
| OI-14 | `package.json` calls a tool that lives outside the repo, so `npm run probe:rpc` is dead in anyone else's clone (in-repo copy already added; one-line patch offered) |
| OI-15 | a banner a visitor can still open says "lapis on-chain kami belum disiarkan" with a stale test count — the same false sentence I just removed from `verify.ts` |
| OI-16 | `#/learn` sekarang menulis ke penerbit (B72, berkas `web/` disunting atas izin builder): berkas yang disentuh, mount point yang ditahan, dan satu keputusan yang tetap milik pemilik front-end — kunci kuis di bundel (B80) |
| OI-17 | tombol "Penerbit Didelisting" dan contoh "kadaluarsa" ~~boleh dipasang lagi~~: spesimennya sekarang ada dan diukur (B102, 30 Sep) — dua hash siap tempel, dan `check:samples` mengadili begitu dipasang *(Koreksi 3 Okt: tombol delisting sudah dipasang lewat B123 (D59, 2 Okt) — `SAMPLE_HASHES.delisted` di `web/src/main.ts:73` menunjuk spesimen `0xaa379627…`, diadili `check:samples` (AC-B123#6); contoh `expired` belum dipasang)* |
| OI-18 | laporan verifikasi sekarang membawa identitas ERC-8004 agen penerbit (`report.issuerAgent`, B118, 1 Okt); panel di halaman belum ada, dan kartu agen di `index.html` masih mencetak angka tanpa sumber. *Koreksi 1 Okt sore (D54): agen bukan penanda tangan — `walletIsAttester` diharapkan `false`* |
| OI-19 | sewa agen per aktivitas (B119) dan reviewer agen (B120) hidup di penerbit lewat empat rute baru; ~~belum ada layar kartu tarif, sewa, dan bayar tagihan~~ *(Koreksi 3 Okt: sebagian sudah ada, dibangun core — sejak B129 anggota penerbit menyewa agen penilai dan menunjuk agen pengesah dari dasbor `#/app/pub` dengan tanda tangannya sendiri sesuai hibah; sejak B130 pemilik agen melihat tangga tarif dan mengubah tarif dasar dari `#/app/owner`. Membayar tagihan agen tetap tanpa layar — kunci penerbit lewat CLI/rute. Lihat [[08-Results/B129 - Executive Summary]] · [[08-Results/B130 - Executive Summary]].)* |
| OI-21 | kunci kuis keluar dari bundel (B80): berkas `web/` yang disentuh (`courses`, `content.ts`, `manifest.ts`, `manifest-keys.ts`, `learning.ts`, `lms.ts`, `probe.ts`) dan yang tidak (`main.ts`, `render.ts`, `index.html`, `style.css`, `i18n.ts`); jangan tandai opsi benar, jangan tulis "anti-curang" |
| OI-20 | lesson praktik harus memanggil `POST /praktik` (B121): slot praktik kini hanya terisi dari bacaan chain, dan halaman ~~belum punya formulir penyerahan praktik — peserta halaman tidak bisa lulus tanpanya~~ *(5 Okt, B157 tahap 1: formulir bukti `eth-call` ada untuk empat lesson; `balance`, `tx-receipt`, `allowance` belum)* |
| OI-22 | kotak identitas belajar punya login email lewat Privy (B82, D57, 1 Okt malam): `privy.ts` baru, `learning.ts`/`lms.ts`/`lms.css` disentuh secukupnya, tombol kunci perangkat tidak lagi primary, teks belum lewat `i18n.ts`; berkas milikmu tidak disentuh. Jangan tulis "login teruji lintas perangkat" sebelum builder menguji dua peramban |
| OI-23 | bagian "Certification Flow" diganti alur bisnis 3D (FE8, 2 Okt): `main.ts` kini menggambar ulang landing saat bahasa diganti, `new-app.ts` menggambar landing untuk `#how-it-works`, salinan tiga langkah dibuang dari `i18n.ts` dan CSS-nya dari `style.css`; ruang kelas sengaja tidak digambar ulang (draf esai), `#pipeline`/`#architecture` masih kosong |
| OI-24 | pintu masuk berakun + permukaan publik tanpa simulasi (B123, D59, 2 Okt): modal lama dan tiga pintu tanpa akun dibuang, dialog masuk baru di `pages/login.ts`, nav "Dashboard" untuk akun, Tamper Playground/konsol x402/bitstring dibuang; `#page-home`, `#page-submit`, `#page-portfolio` tak terjangkau tapi markupnya masih ada |
| OI-25 | area internal peserta `#/app` + onboarding + detail kursus publik (B124, 2 Okt): nav Dashboard → `#/app`, `#/me` dialihkan, `#/course/<id>` publik, kartu katalog menunjuk detail kursus; berkas baru `pages/dashboard.ts`, `course-detail.ts`, `dashboard.css` |
| OI-26 | kursus berbayar (B125, D60, 2 Okt): harga di kartu katalog (`.course-card-price`), `onSignedIn` membuka halaman kursus untuk membayar, kotak identitas kelas berbayar menunjuk halaman bayar; logika bayar di `learning.ts`, harga di `pricing.ts` |
| OI-27 | kelas uji, saldo, rapor bergrafik, pita pemuatan (B126, D61, 2 Okt): chip saldo di navbar (`#nav-balance`), `installFetchTracking` di `main.ts`, katalog beranda memakai `LISTED_COURSES`; tampilan baru di berkas baru (`balance.ts`, `lib/loading.ts`, `lib/charts.ts`, `lib/odometer.ts`, `lib/coin.ts`, `pages/grades.ts`, `pages/wallet.ts`, `pages/dash-viz.css`) |
| OI-28 | halaman Kursus + Ringkasan (B127, D62, 2 Okt): `h()` di `lib/ui.ts` memasang custom property lewat `setProperty`; kartu katalog beranda tanpa gambar khusus memakai emblemnya (`landing.ts`); `.course-card-image-wrap.is-emblem` di `style.css`; tampilan baru di berkas baru (`pages/catalog.ts`, `pages/overview.ts`, `pages/dash-catalog.css`, `lib/emblem.ts`) |
| OI-29 | UI lama yang mati dibuang (B139, D71, 3 Okt; daftar disetujui builder lebih dulu): dok demo, landing lama `#page-home`, `#page-courses`/`#page-submit`/`#page-portfolio` + tiga modalnya dari `index.html`, kodenya dari `main.ts`, aturan CSS yang hanya menunjuk bagian itu dari `style.css`; video latar hero pindah ke `pages/landing.ts`; halaman publik (Verifier, Trust Center, Publishers) tidak berubah — diukur lewat perbandingan computed style |
| OI-30 | menu hamburger navbar di layar HP (B149, 5 Okt): berkas baru `nav-mobile.ts` + `.css`; `main.ts` hanya mendapat satu impor + satu panggilan; panel dibangun ulang dari `.nav-links` yang hidup, pemilih EN/ID navbar pindah ke panel di ≤ 860 px |
| OI-31 | ruang kelas di layar HP (B151, 5 Okt): berkas baru `pages/class.css` (≤ 900 px satu kolom + kurikulum jadi laci, ≤ 1100 px rail disembunyikan, tautan breadcrumb abu); `class.ts` mendapat tombol Kurikulum + laci + latar; `style.css` tidak disunting — catatan: `transition: all` di `.lesson-item` |
| OI-32 | halaman publik di layar HP (B150, 5 Okt): berkas baru `mobile.css` (kolom kartu Pusat Kepercayaan/Penerbit mengikuti layar, URL kartu memecah, bayangan tepi area geser matriks Verifier) + satu impor di `main.ts`; diserahkan: baris matriks Verifier sangat tinggi di HP |
| OI-33 | situs bisa dipasang sebagai aplikasi (B152, 5 Okt): manifest, ikon, `public/sw.js`, `src/pwa.ts`; `index.html` empat tag `<head>`, `main.ts` satu impor + satu panggilan; service worker tidak pernah menyimpan yang beda asal |

**Status per butir diukur ulang 30 Sep (B117)** dan ditulis di
[[10-Contributors/Open-Items-for-Dave]] bagian "Status terukur 30 Sep": OI-6, OI-12, OI-13, OI-14, OI-15
tertutup; OI-1 sebagian; OI-8 literalnya tidak ditemukan lagi; ~~sisanya masih terbuka~~. Tabel di atas adalah
daftar temuan, bukan daftar yang masih hidup.
*(Koreksi 3 Okt: "sisanya masih terbuka" basi sejak B123 (D59, 2 Okt — OI-24), yang membuang Tamper Playground, konsol x402,
dan matriks bitstring dari halaman. Dihitung ulang 3 Okt dengan grep atas `web/index.html` + `web/src`: nol kemunculan
`/api/v1/verify/batch` (OI-2), `toggleBitstringState` (OI-3), `AttestationNotFound` / `ErrLocked` / `checkPrerequisites`
(OI-4), dan `simulateX402Batch` (OI-11), serta nol `tBNB` di `index.html`/`main.ts`/`i18n.ts` (OI-7 — `tBNB` yang tersisa
hanya teks lesson praktik dan saldo gas di `pages/owner.ts`, keduanya memang tBNB). OI-17 sebagian (tombol delisting
terpasang, `expired` belum); OI-19 sebagian (B129, B130 — membayar tagihan agen tetap tanpa layar). Masih terbuka menurut
hitungan yang sama: OI-1 sebagian, OI-5 (nama, rubrik, dan skor karangan masih di sumber), OI-10 (dua alamat preset di
`config.ts`). Butir lain tidak diukur ulang hari ini. Rincian: bagian "Status terukur" di [[10-Contributors/Open-Items-for-Dave]].)*

**Tiga dari daftar ini membuat yang lain terlihat lebih buruk, dan itu alasannya ditutup lebih dulu:**
OI-15 (halaman berkata produknya belum disiarkan), OI-13 (hasil uji yang direkayasa) dan OI-12
(dokumen yang ditolak validator). Ketiganya menyentuh kalimat penjualan kita sendiri — "klaim yang
tidak bisa diperiksa adalah kenapa platform lama gagal" — dan ketiganya ada di halaman yang akan
dibuka juri.

One item per file is deliberately **not** done: each item is a section with a patch, and splitting them
would leave seven files that a reader has to reassemble. If an item needs quoting in a pull request, the
section heading is the anchor.

**Related:** [[03-Frontend/FE6 - Quirks and open defects]] · [[10-Contributors/00 - Hub Contributors]]
