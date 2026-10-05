---
tags: [acceptance-criteria, B158]
status: active
updated: 2026-10-05
---

# AC-B158 - API key tersimpan

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B158 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T83 - Uji peramban API key tersimpan (B158)]] ·
**Summary:** [[08-Results/B158 - Executive Summary]]

Permintaan builder 5 Okt (sesudah menilai esai B153 dari antrean #2549): "untuk api key kayaknya hrs bisa disimpan deh biar
tiap mau jalan ga perlu paste api key lagi". Pilihan builder: **"Simpan default, bisa dimatikan"**. Batas yang tidak berubah:
kunci hanya di peramban (D69).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B158#1 | kunci yang baru ditempel tersimpan di perangkat secara bawaan ("Ingat di perangkat ini" menyala) | **PASS** 5 Okt | T83 langkah 1, 2 |
| AC-B158#2 | tab/kunjungan berikutnya memakai kunci itu tanpa ditempel ulang; kunci tampil sebagai tanda "Kunci <provider> · awal…akhir4 · tersimpan di perangkat ini", bukan kolom kosong | **PASS** 5 Okt | T83 langkah 6, 12 |
| AC-B158#3 | penyimpanan bisa dimatikan, termasuk sesudah menempel; mematikannya membuang salinan perangkat, kunci tetap untuk tab itu | **PASS** 5 Okt | T83 langkah 3, 4 |
| AC-B158#4 | Ganti / Batal / Lupakan: Batal mengembalikan kunci lama, Lupakan mengosongkan sesi + perangkat | **PASS** 5 Okt | T83 langkah 7, 8, 9 |
| AC-B158#5 | cacat baca B135 hilang: salinan perangkat dilaporkan "diingat" walau salinan sesi juga ada, dan mengetik tidak lagi menghapus salinan perangkat | **PASS** 5 Okt | T83 langkah 2 (tidak tertulis per ketikan), 11; `web/src/pages/agent-brain.ts:115-123` |
| AC-B158#6 | kunci versi lama (hanya sesi) tetap terbaca dan bisa dipindah ke perangkat | **PASS** 5 Okt | T83 langkah 10, 5 |
| AC-B158#7 | kunci tetap hanya di peramban: tidak dikirim ke server Lencana, tidak di URL; peringatan perangkat bersama terlihat di dekat kotaknya (bukan hanya `title`) | **PASS** 5 Okt — dibaca dari kode: `writeKey` hanya menulis `sessionStorage`/`localStorage` dan memancarkan nama provider (bukan kunci) | `web/src/pages/agent-brain.ts:124-129`; teks `rememberNote` di kolom (T83 langkah 13) |
| AC-B158#8 | tampilan rapi di desktop dan 375 px | **PASS** 5 Okt | T83 langkah 13 (0 elemen melewati tepi) |
| AC-B158#9 | gerbang | **PASS** 5 Okt | `tsc` 0, `probe` 118/0 (T83) |
| AC-B158#10 | dipakai pemilik agen sungguhan (login → antrean → Nilai tanpa menempel) | **PARTIAL** | T83 memasang komponen dengan data tiruan; percobaan builder sesudah dorongan belum tercatat |

**Batas klaim:** "tersimpan" berarti `localStorage` profil peramban itu — siapa pun yang memakai profil yang sama, atau skrip yang
lolos di halaman, bisa membacanya. Itu risiko yang dipilih builder (pilihan "Simpan default"), dan teksnya tetap tampil di kolom.
