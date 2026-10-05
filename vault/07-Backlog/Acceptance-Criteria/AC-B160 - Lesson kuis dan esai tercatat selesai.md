---
tags: [acceptance-criteria, B160]
status: active
updated: 2026-10-05
---

# AC-B160 - Lesson kuis dan esai tercatat selesai di penerbit

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B160 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T85 - Uji peramban lesson kuis dan esai tercatat selesai (B160)]] ·
**Summary:** [[08-Results/B160 - Executive Summary]]

Ditemukan 5 Okt saat menjawab builder "kenapa saya masih belum dapat credentialsnya padahal course kelas uji udh selesai" (B153): gerbang
`all_lessons_done` untuk `issue --from-attempts` 1/4 karena lesson kuis dan esai hanya tercatat di perangkat. Builder menyetujui rencananya
("Oke beresin semua"). Server dan database tidak diubah.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B160#1 | kuis yang dinilai server **lulus** menandai lesson-nya `completed` di penerbit lewat jalur biasa (`completeLesson`, bertanda tangan peserta); kuis gagal tidak | **PASS** 5 Okt | T85 skenario 1, 2; `probe` "aturan selesai" |
| AC-B160#2 | esai yang **diterima** penerbit untuk dinilai (`awaiting_judge`) menandai lesson-nya selesai; bukti kurang (`insufficient`) tidak | **PASS** 5 Okt | T85 skenario 3, 4 |
| AC-B160#3 | saat kelas dibuka, lesson yang sudah punya bukti di penerbit (kuis `pass`, esai sudah dinilai, praktik bernilai chain `pass`) disusulkan sekali dari `/me/records` (satu tanda tangan); idempoten; hanya bila masih ada lesson tertinggal | **PASS** 5 Okt — **dikoreksi 5 Okt malam:** terbukti hanya untuk kelas yang dibuka lewat muat penuh; lewat navigasi dalam-aplikasi sesudah halaman lain menyinkronkan kursus, penyusulan tidak jalan (lihat #12) | T85 skenario 5 (diulang sebagai 5′ sesudah koreksi); `probe` "reconcile…", "idempoten" |
| AC-B160#4 | rekonsiliasi **tidak** membaca atau menulis berdasarkan catatan perangkat (`lencana-progress-v1` tidak dikunci per akun; keluar akun tidak menghapusnya) | **PASS** 5 Okt | T85 skenario 2 dan 5 (bacaan "selesai di perangkat" tidak ditulis); `probe` "rekonsiliasi TIDAK membaca progres perangkat" (nol akses ke kunci itu) |
| AC-B160#5 | tombol "muat ulang" menyusulkan secara eksplisit dan melaporkan hasilnya (berhasil / gagal / bukti tak terbaca) | **PASS** 5 Okt | T85 skenario 6b, 7 |
| AC-B160#6 | gagal mencatat tidak membuang nilai dan terlihat jelas dengan alasan penerbit apa adanya | **PASS** 5 Okt | T85 skenario 6a |
| AC-B160#7 | `completeLesson` menyelesaikan lesson yang macet di `started` (dulu 422 `started -> unlocked` selamanya) | **PASS** 5 Okt — dengan uji negatif | `probe` 2 pemeriksaan; logika lama dikembalikan sementara → tepat 2 merah (134 pemeriksaan, 2 gagal) |
| AC-B160#8 | tidak ada angka atau nilai yang dikirim klien; hanya status lesson bertanda tangan peserta | **PASS** 5 Okt | `probe` "tidak ada angka atau nilai yang dikirim klien" |
| AC-B160#9 | server dan database tidak disentuh | **PASS** 5 Okt — dibaca dari `git status`: hanya `web/scripts/probe.ts`, `web/src/learning.ts`, `web/src/pages/class.ts` (kode); koreksi 5 Okt malam: hanya `web/src/pages/class.ts` | — |
| AC-B160#10 | gerbang | **PASS** 5 Okt — diulang sesudah koreksi 5 Okt malam | `tsc` 0, `probe` 134/0, `build` 0, `npm run audit` bersih, `check:labels` hijau; sesudah koreksi: `tsc` 0, `probe` **147/0** (sudah memuat B157 +13), `build` 0, `audit` bersih, `check:labels` hijau 8/0 |
| AC-B160#11 | akun builder sungguhan: `course_gates` `lessons_completed` naik dari 1 sesudah kelas dibuka dari HP (kuis dan esai tersusul), lalu 4/4 sesudah "Tandai selesai" di bacaan | ~~**PARTIAL**~~ **PASS** 5 Okt malam — akun builder sungguhan, perangkat tidak dicatat (kriteria menyebut HP). Sebelumnya 1/4 (dibaca 08:50Z, belum jelas apakah karena #12 atau halaman lama yang masih terbuka, B162); sesudah builder menutup semua tab dan membuka ulang: 4/4. Dibaca 09:38Z: `lesson_progress` #580 empat lesson `completed`; `progress_events` — `kuis-pembayaran` 09:33:36–09:33:39Z dan `esai-pembayaranmu` 09:33:42–09:33:47Z (unlocked → started → completed, selang 2–3 detik, **tanpa usaha baru**: usaha kuis dan esai tetap #963 dan #964 — jejak penyusulan, bukan pengerjaan ulang), lalu `izin-bukan-transfer` 09:37:07–09:37:12Z ("Tandai selesai"); `course_gates` 4/4 `all_lessons_done` true. Dari jejak saja tidak bisa dibedakan apakah penyusulan datang lewat muat penuh atau navigasi dalam-aplikasi | T85 skenario 5 meniru keadaan akunnya dengan penerbit tiruan; bukti dari server sungguhan menunggu pemakaian builder — FE sudah LIVE sejak dorongan `1a2df2e..6a865cc` (5 Okt), perbaikan #12 ~~belum~~ LIVE sejak `1cd68b1..52ed28e` |
| AC-B160#12 | **(ditambah 5 Okt malam)** penyusulan juga jalan bila ringkasan kursus sudah dibaca halaman lain (login, bayar, halaman kursus) dan peserta masuk kelas lewat navigasi dalam-aplikasi; sekali per akun dan kursus per muat halaman — pindah lesson dan render ulang tidak mengulang tanda tangan `/me/records`; gagal membaca bukti tidak menandai "sudah disusul" | **PASS** 5 Okt malam — ~~di kode (commit lokal, belum LIVE)~~ **LIVE** sejak dorongan `1cd68b1..52ed28e` (5 Okt 16.02 WIB; bundel Vercel `index-CSniFuxJ.js`); uji dua arah | T85 skenario 8 (kode lama merah: log hanya `GET /catalog/published`, 1/4; kode baru hijau: `POST /me/records` lalu walk kuis dan esai, 3/4), skenario 9 (nol permintaan sesudahnya), skenario 5′ (muat penuh tetap jalan); bagian "gagal tidak menandai" dibaca dari kode, tidak diamati |

**Koreksi 5 Okt malam (terlihat):** kriteria #3 dinyatakan PASS dari skenario yang hanya membuka kelas lewat muat penuh. Jalur yang dipakai peserta
sungguhan — login atau bayar menyinkronkan kursus lebih dulu (`web/src/main.ts:229`, `web/src/learning.ts:1266`), lalu masuk kelas tanpa muat
penuh — tidak pernah memicu penyusulan, karena `kickSync` keluar bila ringkasan sudah ada. Ditemukan lewat akun builder yang melaporkan "sudah
complete semua tapi credential belum turun"; #12 menutupnya di kode. Pemicu itu (`kickSync` / `catchUpLessons` di `web/src/pages/class.ts`)
**tidak punya uji deterministik** — `probe` tidak punya DOM — jadi hanya skenario peramban T85 8 dan 9 yang menjaganya.

**Batas klaim:** "selesai" berarti pekerjaan sudah diterima penerbit, bukan lulus. Kredensial tetap menunggu penilaian, pengesahan, praktik bernilai
chain, dan perintah penerbit (`issue --from-attempts`). Status enrollment `completed` yang berubah begitu satu lesson selesai (`signer/src/db.js:504-511`)
tidak diubah dan tetap menyesatkan; itu pertanyaan terbuka untuk builder di baris B160.
