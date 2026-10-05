---
tags: [testing, "T83"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174; Chromium headless 1280 px; `agentBrain()` dari `web/src/pages/agent-brain.ts` dipasang langsung dengan data agen tiruan (#2549, otak groq terpasang, satu sewa) di dalam `.app-shell`; kunci tiruan `gsk_UJI_PALSU_B158_…`; isi `localStorage`/`sessionStorage` dibaca sesudah tiap langkah
measured: 2026-10-05
result: KUNCI TERSIMPAN BAWAAN DAN TIDAK PERLU DITEMPEL ULANG — 12 langkah sesuai harapan: tempel → tersimpan di perangkat; tab baru → tanda tersimpan tanpa kolom; Ganti → Batal mengembalikan kunci lama; mematikan "ingat" membuang salinan perangkat; Lupakan mengosongkan keduanya; kunci versi lama (hanya sesi) terbaca; cacat baca B135 tidak muncul lagi; 375 px tanpa luapan
---

# T83 - Uji peramban API key tersimpan (B158)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B158 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B158 - API key tersimpan]] · **Summary:** [[08-Results/B158 - Executive Summary]]

Pertanyaan yang diuji: sesudah kunci provider ditempel sekali, apakah panel otak dan antrean esai berikutnya memakainya tanpa
ditempel ulang; apakah pemilik tetap bisa mematikan penyimpanan, mengganti, dan melupakan kunci; dan apakah cacat baca lama
(`readKey` mendahulukan salinan sesi, lalu ketikan menghapus salinan perangkat) sudah hilang.

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji).
2. Buka `http://127.0.0.1:5174/`. Di konsol: impor `/src/style.css`, `/src/pages/dashboard.css`, `/src/pages/owner.css`, lalu
   `/src/pages/agent-brain.ts`; pasang `agentBrain('id', o, a, () => {})` di dalam `<div class="app-shell">` dengan agen tiruan
   (`walletState: 'owner'`, satu sewa, otak groq `passed: true`). Kunci yang dipakai tiruan (`gsk_UJI_PALSU_B158_…`), bukan
   kunci sungguhan.
3. "Tab baru" disimulasikan dengan mengosongkan `sessionStorage` lalu memasang ulang komponennya.
4. Sesudah tiap langkah baca `localStorage` / `sessionStorage` kunci `lencana.llm-key.groq` dan keadaan gantungan (kolom
   atau tanda tersimpan, kotak "ingat", teks tanda).

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | belum ada kunci | dua gantungan (konfigurasi + antrean); antrean: kolom tampil, **"Ingat di perangkat ini" menyala bawaan**, ajakan "Isi API key…" tampil; kedua penyimpanan kosong |
| 2 | tempel kunci, lalu kolom dilepas | selama mengetik belum tertulis (keduanya `null`); saat dilepas: perangkat + sesi berisi kunci; kolom tetap terbuka dengan status "tersimpan di perangkat ini"; gantungan konfigurasi ikut menjadi tanda "Kunci Groq · `gsk_…0001` · tersimpan di perangkat ini" |
| 3 | sesudah menempel, kotak "ingat" dimatikan | salinan perangkat `null`, sesi tetap; status "hanya untuk tab ini" — kotaknya masih terlihat dan bisa diklik (versi pertama perubahan ini menutup kolom saat dilepas, sehingga klik ke kotak ini hilang; diganti sebelum commit) |
| 4 | Simpan | tanda "Kunci Groq · `gsk_…0001` · hanya untuk tab ini" + tombol "Simpan di perangkat ini"; ajakan isi kunci tersembunyi |
| 5 | "Simpan di perangkat ini" | perangkat + sesi berisi kunci; tanda "tersimpan di perangkat ini"; tombolnya hilang |
| 6 | tab baru (sesi dikosongkan, dipasang ulang) | langsung tanda "Kunci Groq · `gsk_…0001` · tersimpan di perangkat ini", tanpa kolom; ajakan isi kunci tersembunyi — **tidak perlu menempel ulang** |
| 7 | Ganti → ketik kunci baru → kolom dilepas → Batal | saat Ganti: kolom + Batal tampil, fokus di kolom; kunci baru sempat tertulis (`…0002`); **Batal mengembalikan `…0001`** di kedua penyimpanan |
| 8 | Ganti → ketik → Enter | tanda `gsk_…0002`; perangkat + sesi `…0002` |
| 9 | Lupakan kunci | kedua penyimpanan `null`; kedua gantungan kembali ke kolom dengan "ingat" menyala; ajakan isi kunci tampil |
| 10 | kunci versi lama (B135: hanya sesi, `…0003`) | tanda "hanya untuk tab ini" + "Simpan di perangkat ini" |
| 11 | sesi + perangkat sama-sama berisi kunci (keadaan yang dulu membuat kotak tampil kosong) | `readKey('groq')` → `remembered: true`; tanda "tersimpan di perangkat ini" |
| 12 | ganti provider di panel konfigurasi (Ganti otak → OpenAI → Groq) | OpenAI: kolom kosong "Kunci OpenAI"; kembali ke Groq: tanda `gsk_…0003` tersimpan |
| 13 | tampilan | desktop 760 px dan lebar HP 375 px: tanda tersimpan + tombol Ganti/Lupakan terbungkus rapi, **0 elemen melewati tepi kanan kotak 375 px**; tangkapan di scratchpad sesi, tidak di repo |

Sesudah uji: kunci tiruan dihapus dari kedua penyimpanan (`lencana.llm-key.*` = 0 di keduanya).

**Gerbang 5 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **118 / 0**.

## Batas

- Komponen dipasang langsung dengan data tiruan, bukan lewat login pemilik agen sungguhan dan `/owner/overview`; jalur tanda
  tangan dan panggilan provider tidak tersentuh (kunci tiruan tidak pernah dikirim ke mana pun).
- Meja pengesahan (`web/src/pages/review-desk.ts:180-185`) memakai `keyField` yang sama dan tetap menyembunyikan gantungannya
  bila kunci sudah ada; jalurnya tidak dipasang di uji ini.
- Kejadian fokus diuji di Chromium. Safari tidak memberi fokus ke kotak centang saat diklik; karena tampilan sekarang hanya
  menutup lewat Simpan/Enter, urutan itu tidak lagi menentukan, tapi belum diamati di Safari.
