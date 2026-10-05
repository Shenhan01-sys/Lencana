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
| AC-B160#3 | saat kelas dibuka, lesson yang sudah punya bukti di penerbit (kuis `pass`, esai sudah dinilai, praktik bernilai chain `pass`) disusulkan sekali dari `/me/records` (satu tanda tangan); idempoten; hanya bila masih ada lesson tertinggal | **PASS** 5 Okt | T85 skenario 5; `probe` "reconcile…", "idempoten" |
| AC-B160#4 | rekonsiliasi **tidak** membaca atau menulis berdasarkan catatan perangkat (`lencana-progress-v1` tidak dikunci per akun; keluar akun tidak menghapusnya) | **PASS** 5 Okt | T85 skenario 2 dan 5 (bacaan "selesai di perangkat" tidak ditulis); `probe` "rekonsiliasi TIDAK membaca progres perangkat" (nol akses ke kunci itu) |
| AC-B160#5 | tombol "muat ulang" menyusulkan secara eksplisit dan melaporkan hasilnya (berhasil / gagal / bukti tak terbaca) | **PASS** 5 Okt | T85 skenario 6b, 7 |
| AC-B160#6 | gagal mencatat tidak membuang nilai dan terlihat jelas dengan alasan penerbit apa adanya | **PASS** 5 Okt | T85 skenario 6a |
| AC-B160#7 | `completeLesson` menyelesaikan lesson yang macet di `started` (dulu 422 `started -> unlocked` selamanya) | **PASS** 5 Okt — dengan uji negatif | `probe` 2 pemeriksaan; logika lama dikembalikan sementara → tepat 2 merah (134 pemeriksaan, 2 gagal) |
| AC-B160#8 | tidak ada angka atau nilai yang dikirim klien; hanya status lesson bertanda tangan peserta | **PASS** 5 Okt | `probe` "tidak ada angka atau nilai yang dikirim klien" |
| AC-B160#9 | server dan database tidak disentuh | **PASS** 5 Okt — dibaca dari `git status`: hanya `web/scripts/probe.ts`, `web/src/learning.ts`, `web/src/pages/class.ts` (kode) | — |
| AC-B160#10 | gerbang | **PASS** 5 Okt | `tsc` 0, `probe` 134/0, `build` 0, `npm run audit` bersih, `check:labels` hijau |
| AC-B160#11 | akun builder sungguhan: `course_gates` `lessons_completed` naik dari 1 sesudah kelas dibuka dari HP (kuis dan esai tersusul), lalu 4/4 sesudah "Tandai selesai" di bacaan | **PARTIAL** | T85 skenario 5 meniru keadaan akunnya dengan penerbit tiruan; bukti dari server sungguhan menunggu pemakaian builder — FE sudah LIVE sejak dorongan `1a2df2e..6a865cc` (5 Okt) |

**Batas klaim:** "selesai" berarti pekerjaan sudah diterima penerbit, bukan lulus. Kredensial tetap menunggu penilaian, pengesahan, praktik bernilai
chain, dan perintah penerbit (`issue --from-attempts`). Status enrollment `completed` yang berubah begitu satu lesson selesai (`signer/src/db.js:504-511`)
tidak diubah dan tetap menyesatkan; itu pertanyaan terbuka untuk builder di baris B160.
