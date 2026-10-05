---
tags: [results, executive-summary, B160]
status: active
updated: 2026-10-05
---

# B160 - Executive Summary — lesson kuis dan esai tercatat selesai di penerbit

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B160 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B160 - Lesson kuis dan esai tercatat selesai]] ·
**Testing:** [[09-Testing/T85 - Uji peramban lesson kuis dan esai tercatat selesai (B160)]]

## 1. Apa yang diubah

- `web/src/learning.ts`: `quizFinishes` / `essayFinishes` (aturan "selesai" di satu tempat: kuis lulus, esai diterima untuk dinilai);
  `lessonsWithEvidence` (fungsi murni: lesson yang punya bukti di penerbit tetapi belum `completed`); `reconcileLessons` (satu tanda
  tangan `/me/records`, lalu `completeLesson` per lesson yang punya bukti); perbaikan `completeLesson` (langkah yang sudah dilewati
  dilompati — lesson `started` tidak lagi dikirimi `unlocked`).
- `web/src/pages/class.ts`: `completeLesson` sesudah kuis lulus dan sesudah esai diterima; `catchUpLessons` saat kelas dibuka
  (~~hanya bila kelas sendiri yang menyinkronkan kursus~~ sejak koreksi 5 Okt malam juga bila halaman lain sudah menyinkronkannya, sekali
  per akun dan kursus per muat halaman); tombol "muat ulang" menyusulkan dan melaporkan hasilnya; peringatan jelas bila lesson gagal dicatat
  (nilainya tetap tersimpan).
- `web/scripts/probe.ts`: grup B160, 16 pemeriksaan, dengan penerbit tiruan yang menegakkan mesin state asli.
- **Tidak** disentuh: server (`signer/`), database (`supabase/`), aturan kelulusan, rubrik, penerbitan.

**Dua koreksi rancangan sebelum kode** (dicatat di baris B160): rekonsiliasi dari catatan perangkat dibatalkan karena catatan itu tidak dikunci
per akun (akun kedua di peramban yang sama mewarisi lesson akun pertama; keluar akun tidak menghapusnya) — diganti bukti yang dikonfirmasi
penerbit; dan cacat lama `completeLesson` pada lesson `started` ditemukan dan diperbaiki.

**Koreksi sesudah dorongan (5 Okt malam, terlihat):** penyusulan saat kelas dibuka ternyata hanya jalan bila kelas sendiri yang melakukan sinkron
pertama kursus itu. Peserta yang baru login atau baru membayar sudah menyinkronkan kursusnya di halaman lain (`web/src/main.ts:229`,
`web/src/learning.ts:1266`), lalu masuk kelas lewat navigasi dalam-aplikasi — dan `kickSync` keluar tanpa menyusulkan apa pun. Skenario uji
dulu hanya membuka kelas lewat muat penuh, jadi tidak melihatnya. Ditemukan saat memeriksa akun builder yang melaporkan "sudah complete semua tapi
credential belum turun"; direproduksi di peramban (T85 skenario 8, kode lama merah) lalu ditutup di `web/src/pages/class.ts` saja.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| lesson kuis/esai tercatat selesai di penerbit setelah dikerjakan dari halaman | tidak pernah (`course_gates` akun builder: 1/4) | kuis lulus dan esai diterima: unlocked → started → completed (T85 skenario 1, 3) |
| kuis gagal / esai `insufficient` | — | nol tulisan progres (T85 skenario 2, 4) |
| akun yang sudah mengerjakan sebelum perbaikan | tertinggal | kelas dibuka → tersusul dari bukti penerbit; keadaan akun builder tiruan: 1/4 → 3/4 (T85 skenario 5) |
| catatan "selesai di perangkat" akun lain | — | tidak ditulis ke penerbit (T85 skenario 2, 5; `probe`) |
| lesson macet di `started` | "Tandai selesai" 422 selamanya | satu langkah `completed` (uji negatif: logika lama → 2 merah) |
| kursus sudah disinkronkan halaman lain (login / bayar → kelas, tanpa muat penuh) *(ditambah 5 Okt malam)* | tidak tersusul: log hanya `GET /catalog/published`, tetap 1/4 (T85 skenario 8, kode lama) | tersusul: `POST /me/records` lalu walk kuis dan esai, 3/4 (T85 skenario 8, kode baru) |
| pindah lesson sesudah tersusul *(ditambah 5 Okt malam)* | — | nol permintaan, tidak ada tanda tangan berulang (T85 skenario 9) |
| `tsc` · `probe` · `build` | 0 · 118/0 · 0 | 0 · 134/0 · 0 *(5 Okt malam, sesudah koreksi dan B157: 0 · **147/0** · 0)* |

## 3. Status

~~**SELESAI di kode, belum LIVE** — commit lokal; dorongan FE menunggu kata builder.~~ **SELESAI · LIVE** — didorong `1a2df2e..6a865cc` atas kata builder (5 Okt 15.14 WIB); bundel Vercel `assets/index-CIcJcqoE.js` memuat "dicatat selesai karena hasilnya sudah ada di penerbit" dan "belum ditandai selesai di penerbit" (dibaca sesudah dorongan). Bukti dari akun builder sungguhan belum ada
(AC-B160#11 **PARTIAL**): sesudah kelas dibuka dari HP, kuis dan esai harus tersusul (3/4) dan bacaan tinggal "Tandai selesai".

**Koreksi 5 Okt malam:** ~~SELESAI di kode, belum LIVE — commit lokal (`web/src/pages/class.ts`); dorongan menunggu kata builder~~ **SELESAI · LIVE** —
didorong `1cd68b1..52ed28e` atas kata builder (5 Okt 16.02 WIB, run `deploy-signer` sukses). Dibaca sesudah dorongan: halaman utama Vercel memuat
`assets/index-CSniFuxJ.js` — nama yang sama dengan hasil `npm run build` lokal sebelum commit (864,50 kB) — dan isinya memuat kunci `alamat|kursus`
serta `Set` penjaganya di `catchUpLessons`; `/healthz` penerbit di Railway `startedAt` 2026-10-05T09:04:30Z. Sebelum itu LIVE, jalan yang bekerja di
versi yang beredar: buka URL lesson langsung (muat penuh — halaman kelas sendiri yang menyinkronkan, jadi penyusulan jalan) atau tekan "muat ulang"
di kotak rekaman. Penyebab 1/4 di akun builder **belum terbukti** lubang ini: halaman lama yang masih terbuka dan tidak tahu ada versi baru
(B162, DIUSULKAN, belum disetujui) sama mungkin; bukti dari akun builder sungguhan tetap menunggu pemakaian (AC-B160#11 **PARTIAL**).

## 4. Risiko tersisa

- **Pemicu penyusulan (`kickSync`, `catchUpLessons`) tidak punya uji deterministik** — `probe` tidak punya DOM; hanya skenario peramban T85 8 dan 9
  yang menjaganya. Regresi di sana tidak ditangkap `npm run probe`.
- Uji memakai penerbit tiruan dan identitas jenis `perangkat`; tanda tangan Privy memakai `signMessage` yang sama tetapi tidak diamati (T85 §Batas).
- Status enrollment `completed` (berubah begitu satu lesson selesai) tetap menyesatkan; tidak diubah — butuh keputusan builder (menyentuh data).
- Rekonsiliasi esai hanya untuk esai yang SUDAH dinilai: rekaman peserta tidak membedakan `awaiting_judge` dari `insufficient`. Esai yang
  dikirim sesudah perbaikan ini ditandai langsung saat diterima.

## 5. Bukti

T85 skenario ~~1–7~~ 1–9 dan 5′; `probe` grup B160 (16 pemeriksaan) + uji negatif; `web/src/learning.ts` (`completeLesson`, `lessonsWithEvidence`,
`reconcileLessons`), `web/src/pages/class.ts` (`kickSync`, `catchUpLessons`, aksi `grade`, `finish-essay`, `learn-sync`).
