---
tags: [results, executive-summary, B158]
status: active
updated: 2026-10-05
---

# B158 - Executive Summary — API key provider LLM tersimpan, tidak ditempel ulang

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B158 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B158 - API key tersimpan]] ·
**Testing:** [[09-Testing/T83 - Uji peramban API key tersimpan (B158)]]

## 1. Apa yang diubah

- `web/src/pages/agent-brain.ts` `readKey`: salinan perangkat menang atas salinan sesi. Dulu sesi dibaca lebih dulu dan
  melaporkan "tidak diingat" walau salinan perangkat ada — kotak "ingat" tampil kosong, dan ketikan berikutnya menghapus
  salinan perangkat.
- `keyField` (dipakai panel otak, antrean esai, dan meja pengesahan):
  - "Ingat di perangkat ini" menyala bawaan (pilihan builder);
  - kunci ditulis saat kolom dilepas, bukan per ketikan; tampilan menutup lewat **Simpan** / Enter;
  - kunci yang ada tampil sebagai tanda "Kunci <provider> · awal…akhir4 · tersimpan di perangkat ini | hanya untuk tab ini"
    dengan **Ganti**, **Simpan di perangkat ini** (bila hanya tab), **Lupakan kunci**; Batal sesudah Ganti mengembalikan
    kunci lama;
  - gantungan lain di halaman yang sama (dan tab lain lewat `storage`) ikut membaca ulang.
- Antrean esai selalu menampilkan gantungannya; ajakan "Isi API key…" hanya bila belum ada kunci.
- `web/src/pages/agent-brain.css`: tanda tersimpan, tautan senyap, peringatan perangkat bersama tampil di kolom (dulu hanya
  `title`).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| tab baru sesudah menempel sekali | kolom kosong — tempel lagi (kotak "ingat" mati bawaan) | tanda "tersimpan di perangkat ini", langsung bisa menilai (T83 langkah 6) |
| sesi + perangkat sama-sama berisi kunci | kotak tampil kosong; ketikan menghapus salinan perangkat | `remembered: true`; tidak tertulis per ketikan (T83 langkah 2, 11) |
| mematikan penyimpanan sesudah menempel | — | salinan perangkat dibuang, tab tetap (T83 langkah 3) |
| Ganti → Batal | — | kunci lama kembali (T83 langkah 7) |
| 375 px | — | 0 elemen melewati tepi (T83 langkah 13) |
| `tsc` · `probe` | 0 · 118/0 | 0 · 118/0 |

## 3. Status

**SELESAI di kode, belum LIVE** — commit lokal; FE ke Vercel menunggu kata dorong builder. Pemakaian oleh pemilik agen
sungguhan sesudah dorongan belum tercatat (AC-B158#10 **PARTIAL**).

## 4. Risiko tersisa

- Bawaan "ingat" berarti kunci ada di `localStorage` profil peramban itu: pemakai lain profil yang sama, atau skrip yang lolos
  di halaman, bisa membacanya. Risiko ini dipilih builder; peringatannya kini tampil di kolom.
- T83 memakai data tiruan dan Chromium; meja pengesahan dan Safari tidak diamati (T83 §Batas).

## 5. Bukti

T83 langkah 1–13; `web/src/pages/agent-brain.ts:115-131` (baca/tulis/samarkan kunci), `keyField` di bawahnya.
