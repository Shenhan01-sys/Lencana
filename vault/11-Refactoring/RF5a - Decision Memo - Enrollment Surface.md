---
tags: [decision-memo, enrollment, frontend, "B58"]
status: decided — B, 28 Sep
updated: 2026-09-28
---

# RF5a — Keputusan: enrollment masuk core (B), bukan keluar dari produk

**Putusan builder 28 Sep:** Lencana adalah **e-course platform** — orang ikut kursus, lulus, lalu
menerima NFT + kredensial on-chain. Menyerahkan identitas itu supaya submission-nya mudah jujur adalah
**bukan** kehati-hatian, itu menurunkan produknya. Jadi opsi yang dipakai adalah **B**, dan pertanyaan
yang tersisa bukan "A atau B" melainkan **seberapa banyak B yang masuk sebelum 30 Sep** — dan apa yang
boleh kita klaim pada masing-masing titik itu.

## Yang salah di versi memo ini sebelumnya

Versi pertama memo (commit `73e7e73`) menulis "default: A kalau tidak ada jawaban". Itu keliru dua kali:
(1) A tidak netral — A menghapus niat produk; (2) A bahkan tidak akurat sebagai gambaran keadaan
sekarang, karena permukaan kursusnya **sudah ada**: `web/src/lms.ts` menghidapkan `#/learn`,
`#/course/:id`, `#/me` lewat `renderLmsRoute()`, dan katalog berisi 2 kursus · 7 modul · 24 lesson
· 412 menit · 28 soal kuis · 2 esai (`npm run inventory`). Yang tidak ada bukan kursusnya — **sisi
backend-nya**.

## Yang benar-benar hilang, dan itu yang B kerjakan

Peserta hari ini "mengerjakan" semuanya di browser: progres di `localStorage` (kita sendiri melabelinya
**bukan bukti**, `03-Frontend`), dan nilai masuk ke kredensial lewat argumen CLI (`npm run issue
--quiz … --essay-score …`). Artinya jejak "lulus" tidak punya sumber server-side. Karena itu:

- `btnEnroll` ada labelnya tapi tidak ada handler — bukan karena tombolnya lupa dibuat, karena tidak ada
  yang bisa dia panggil;
- jalur x402 tidak punya objek bayar (RF5: tidak ada enrollment = tidak ada yang dibayar);
- dan `npm run journey` harus menurunkan kunci peserta dari prosesnya sendiri, bukan memakai akun nyata.

## B — permukaan core: enroll + attempts

| bagian | bentuk | biaya |
|---|---|---|
| `POST /enroll` | `{courseId, learner}` → baris store (siapa mengambil kursus apa, kapan) | kecil |
| `POST /attempts` | nilai kuis per soal + esai (berkas/teks) + penyelesaian praktik → **`attemptHash`** yang ikut tercetak sebagai `evidence` di dokumen | sedang |
| `issue --from-attempts <learner> <courseId>` | menerbit dari **rekaman**, bukan dari argumen; menolak kalau usahanya belum lengkap (`BELUM_LENGKAP` sudah jadi verdict nyata di `web/src/score.ts`) | kecil |
| `journey` lewat HTTP | journey memanggil endpoint ini alih-alih CLI — supaya yang kita rekam di video adalah **produk**, bukan skrip uji | kecil |
| FE menyambung ke endpoint | `btnEnroll` → `/enroll`, panel nilai → `/attempts` | milik pemilik front-end |

Estimasi sisi core: **sekitar setengah hari**. Yang tidak boleh dipotong kalau waktunya mepet: `attempts`
+ `--from-attempts`. `POST /enroll` boleh menyusul — enroll tanpa attempt dicatat server tetap menghasilkan
"nilai dari operator"; sebaliknya sudah cukup membuktikan "usaha peserta tercatat di backend".

## Garis klaim yang jujur (ini bagian yang perlu kamu tahu, bukan yang perlu kamu putuskan)

| kondisi saat submission | kalimat yang boleh dipakai |
|---|---|
| B penuh mendarat (enroll + attempts + terbit dari rekaman) | "peserta belajar di kursus kami, pekerjaannya dicatat server, dan ijazahnya ditandatangani terhadap rubrik penerbit — bisa diperiksa siapa pun" |
| attempts mendarat, enroll belum | tetap boleh: "usaha ujian tercatat di backend sebelum kertas diterbitkan"; jangan: "peserta mendaftar kursus" |
| belum sempat | **jangan** tulis "kerjakan soal di sistem"; video cukup menunjukkan lapis bukti yang jalan (hari ini hijau: `journey 34/0`, `e2e 42/0`, `verify:edge 5/0` + `vc.1ed.tech` `outcome: VALID` lima kredensial) dan enrollment ditampilkan sebagai roadmap dengan bentuk endpoint yang jelas — bukan sebagai tombol yang sudah jadi |

Satu aturan yang tidak berubah oleh keputusan ini: **kita tidak menampilkan apa pun di video yang belum
bisa dijalankan dari clone.** Itu bukan rasa takut, itu isi produknya — kalau kita sendiri menempel
klaim yang tidak bisa diulang, tidak ada bedanya dengan enam LMS yang kita audit.

## Konsekuensi ke dokumen lain yang sudah tersentuh hari ini

- [[07-Backlog/03 - Findings and Tasks 2026-09-26]] **B58** — status berubah dari "menunggu keputusan"
  menjadi "diputuskan: B", dengan sisa pekerjaan = endpoint attempts.
- [[11-Refactoring/RF5 - Enrollment and the Paid Path]] — objek bayar sekarang punya bentuk
  (`/enroll`, `/attempts`); klaim "rails built, counter not" tetap benar sampai B mendarat.
- [[10-Contributors/Open-Items-for-Dave]] — OI untuk `btnEnroll` dan tombol uji palsu tidak berubah:
  FE tetap milik pemiliknya, kami laporkan + tawarkan patch.
- [[09-Testing/T20 - signer journey.js]] — kalau B mendarat, journey pindah ke jalur HTTP dan baris
  "TIDAK ADA DI CORE" untuk attempts hilang. Tidak akan kuhapus sebelum hilang.
