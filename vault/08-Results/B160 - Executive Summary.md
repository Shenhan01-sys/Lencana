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
- `web/src/pages/class.ts`: `completeLesson` sesudah kuis lulus dan sesudah esai diterima; `catchUpLessons` saat kelas dibuka;
  tombol "muat ulang" menyusulkan dan melaporkan hasilnya; peringatan jelas bila lesson gagal dicatat (nilainya tetap tersimpan).
- `web/scripts/probe.ts`: grup B160, 16 pemeriksaan, dengan penerbit tiruan yang menegakkan mesin state asli.
- **Tidak** disentuh: server (`signer/`), database (`supabase/`), aturan kelulusan, rubrik, penerbitan.

**Dua koreksi rancangan sebelum kode** (dicatat di baris B160): rekonsiliasi dari catatan perangkat dibatalkan karena catatan itu tidak dikunci
per akun (akun kedua di peramban yang sama mewarisi lesson akun pertama; keluar akun tidak menghapusnya) — diganti bukti yang dikonfirmasi
penerbit; dan cacat lama `completeLesson` pada lesson `started` ditemukan dan diperbaiki.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| lesson kuis/esai tercatat selesai di penerbit setelah dikerjakan dari halaman | tidak pernah (`course_gates` akun builder: 1/4) | kuis lulus dan esai diterima: unlocked → started → completed (T85 skenario 1, 3) |
| kuis gagal / esai `insufficient` | — | nol tulisan progres (T85 skenario 2, 4) |
| akun yang sudah mengerjakan sebelum perbaikan | tertinggal | kelas dibuka → tersusul dari bukti penerbit; keadaan akun builder tiruan: 1/4 → 3/4 (T85 skenario 5) |
| catatan "selesai di perangkat" akun lain | — | tidak ditulis ke penerbit (T85 skenario 2, 5; `probe`) |
| lesson macet di `started` | "Tandai selesai" 422 selamanya | satu langkah `completed` (uji negatif: logika lama → 2 merah) |
| `tsc` · `probe` · `build` | 0 · 118/0 · 0 | 0 · 134/0 · 0 |

## 3. Status

~~**SELESAI di kode, belum LIVE** — commit lokal; dorongan FE menunggu kata builder.~~ **SELESAI · LIVE** — didorong `1a2df2e..6a865cc` atas kata builder (5 Okt 15.14 WIB); bundel Vercel `assets/index-CIcJcqoE.js` memuat "dicatat selesai karena hasilnya sudah ada di penerbit" dan "belum ditandai selesai di penerbit" (dibaca sesudah dorongan). Bukti dari akun builder sungguhan belum ada
(AC-B160#11 **PARTIAL**): sesudah kelas dibuka dari HP, kuis dan esai harus tersusul (3/4) dan bacaan tinggal "Tandai selesai".

## 4. Risiko tersisa

- Uji memakai penerbit tiruan dan identitas jenis `perangkat`; tanda tangan Privy memakai `signMessage` yang sama tetapi tidak diamati (T85 §Batas).
- Status enrollment `completed` (berubah begitu satu lesson selesai) tetap menyesatkan; tidak diubah — butuh keputusan builder (menyentuh data).
- Rekonsiliasi esai hanya untuk esai yang SUDAH dinilai: rekaman peserta tidak membedakan `awaiting_judge` dari `insufficient`. Esai yang
  dikirim sesudah perbaikan ini ditandai langsung saat diterima.

## 5. Bukti

T85 skenario 1–7; `probe` grup B160 (16 pemeriksaan) + uji negatif; `web/src/learning.ts` (`completeLesson`, `lessonsWithEvidence`,
`reconcileLessons`), `web/src/pages/class.ts` (`catchUpLessons`, aksi `grade`, `finish-essay`, `learn-sync`).
