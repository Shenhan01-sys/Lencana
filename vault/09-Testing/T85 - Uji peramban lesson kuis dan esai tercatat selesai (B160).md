---
tags: [testing, "T85"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174; Chromium headless 1280 px; kelas `#/class/uji-bayar-2026` dibuka dengan identitas perangkat acak sekali pakai dan penerbit TIRUAN di dalam halaman (fetch ke URL signer dicegat; mesin state `locked → unlocked → started → completed` ditegakkan seperti `signer/src/db.js`, tanda tangan tidak diverifikasi); data uji dihapus sesudahnya
measured: 2026-10-05
result: LESSON KUIS DAN ESAI TERCATAT SELESAI DI PENERBIT — 7 skenario sesuai: kuis lulus dan esai diterima menempuh unlocked → started → completed; kuis gagal dan esai `insufficient` tidak menulis apa pun; keadaan akun builder (praktik selesai, kuis lulus, esai dinilai) → kelas dibuka → 3/4; catatan "selesai di perangkat" milik akun lain TIDAK ditulis ke penerbit; kegagalan mencatat terlihat dan pulih lewat "muat ulang" dari lesson yang macet di `started`; bukti tak terbaca → nol tulisan
---

# T85 - Uji peramban lesson kuis dan esai tercatat selesai (B160)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B160 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B160 - Lesson kuis dan esai tercatat selesai]] · **Summary:** [[08-Results/B160 - Executive Summary]] ·
**Terkait:** B153 (kredensial uji akun builder)

Pertanyaan yang diuji: apakah halaman kelas sekarang mencatat lesson kuis dan esai sebagai selesai di penerbit (dulu hanya di
perangkat), tanpa menandai selesai pekerjaan yang tidak diterima, tanpa menulis atas nama akun lain, dan dengan kegagalan yang terlihat.

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji).
2. Peramban headless dengan dua skrip yang berjalan sebelum halaman (`Page.addScriptToEvaluateOnNewDocument`): (a) penerbit tiruan yang
   mencegat `fetch` ke `https://signer-production-e4f2.up.railway.app` — `GET /progress`, `POST /progress` (mesin state asli, 422 untuk
   lompatan), `POST /grade`, `POST /essay`, `POST /me/records`, `POST /enroll` — dan membuat identitas perangkat acak di `sessionStorage`
   (alamat karangan, kunci acak sekali pakai; tanda tangan tidak diverifikasi tiruan); (b) menerapkan skenario dari `sessionStorage`
   sebelum halaman memuat, supaya pembacaan pertama saat kelas dibuka sudah melihat keadaannya.
3. Buka `#/class/uji-bayar-2026/m1/<lesson>`; jawab kuis / isi esai lewat DOM; baca log permintaan tiruan, status lesson di penerbit
   tiruan, sidebar (✓ / ◦), bilah atas, dan teks status.

## Hasil 5 Okt

| # | skenario | hasil |
|---|---|---|
| 1 | kuis dijawab, penerbit menilai **lulus** (75, ambang 75) | `POST /grade`, lalu `POST /progress` `kuis-pembayaran` **unlocked → started → completed**; penerbit tiruan: `completed`; sidebar ✓ "tercatat selesai di penerbit"; bilah atas 25 %; teks status tanpa peringatan |
| 2 | kuis dijawab, penerbit menilai **gagal** (25) | hanya `POST /grade` + `GET /progress`; **nol** tulisan progres; sidebar tetap `5m`; teks "belum cukup, baca lagi alasannya lalu ulangi". Sekaligus: catatan perangkat "kuis selesai" dari skenario 1 **tidak** ditulis ke penerbit saat "muat ulang" ditekan |
| 3 | esai 70 kata, penerbit menerima (`awaiting_judge`) | `POST /essay`, lalu `POST /progress` `esai-pembayaranmu` unlocked → started → completed; sidebar ✓; teks "Menunggu penilaian penerbit — belum ada angka, dan itu bukan nol." tanpa peringatan |
| 4 | esai 70 kata, penerbit menolak bukti kurang (`insufficient`, 2/5 tanda) | hanya `POST /essay` + `GET /progress`; nol tulisan progres; sidebar `◦ selesai di perangkat ini saja` (catatan lokal, apa adanya) |
| 5 | **keadaan akun builder**: penerbit tiruan berisi praktik `completed`, kuis #963 lulus (75), esai #964 dinilai (98); catatan perangkat meniru akun lain: bacaan "selesai"; kelas dibuka lewat muat ulang halaman | log: `GET /progress` → **satu** `POST /me/records` → walk `kuis-pembayaran` (3 langkah) → walk `esai-pembayaranmu` (3 langkah); penerbit tiruan 3 lesson `completed`; sidebar: bacaan `◦ selesai di perangkat ini saja`, kuis / praktik / esai ✓; bilah atas **75 %**, kotak rekaman "3/4 lesson selesai". **Bacaan tidak ditulis** (tidak ada `POST /progress` untuk `izin-bukan-transfer`) |
| 6a | kuis lulus, tetapi penerbit tiruan menolak langkah `completed` (500) | nilai tetap tampil; peringatan "Hasilnya tercatat, tetapi lesson ini belum ditandai selesai di penerbit: penerbit sedang tidak terjangkau (uji). Tekan "muat ulang" di kotak rekaman untuk mencoba lagi."; lesson macet di `started` |
| 6b | penerbit pulih (usaha lulus ada di rekaman), "muat ulang" ditekan | `GET /progress` → `POST /me/records` → `POST /progress` `kuis-pembayaran:completed` **saja** (tanpa `unlocked` lagi — itulah yang dulu 422); sidebar ✓; bilah atas 25 %; teks "…· 1 lesson dicatat selesai karena hasilnya sudah ada di penerbit" |
| 7 | `/me/records` gagal (500) saat kelas dibuka, lalu "muat ulang" | saat dibuka: `GET /progress` + `POST /me/records` saja, halaman utuh; "muat ulang": teks "…· hasil di penerbit belum bisa diperiksa: database sedang tidak terjangkau (uji)"; nol tulisan progres |

Sesudah uji: identitas acak, penanda masuk, catatan perangkat, dan skenario dihapus (`sessionStorage` 0 kunci, `localStorage` `lencana*` 0 kunci); peramban
ditutup; server dev :5174 dimatikan (port bebas).

**Gerbang 5 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **134 / 0** (118 sebelum B160 + 16 grup B160); `npm run build` exit 0.

**Uji negatif (`probe`):** logika `completeLesson` lama dikembalikan sementara → tepat dua pemeriksaan merah — "lesson yang macet di `started`
hanya dikirimi `completed`" dan "completeLesson langsung: lesson `started` …" — dengan alasan server tiruan `status transition started -> unlocked
not allowed`; dikembalikan → 134 / 0, tidak ada sisa penanda uji di berkas.

## Batas

- Penerbit tiruan menegakkan mesin state dan bentuk balasan yang dibaca halaman, tetapi bukan server sungguhan: tanda tangan tidak diverifikasi,
  `gradedAttempts` di tiruan hanya jumlah usaha. Bukti ke server sungguhan baru ada sesudah dorongan dan pemakaian akun builder
  (AC-B160#10 PARTIAL).
- Identitas yang diuji hanya jenis `perangkat`. Jalur Privy (akun builder) memakai `signMessage` yang sama; jalur otomatis dilewati untuk
  `dompet` (jendela konfirmasi per tanda tangan) dan itu diperiksa dari kode, bukan diamati.
- Jalur praktik (`kind=praktik`, `chainChecked`) diuji di `probe` (fungsi murni dan rekonsiliasi), tidak di peramban — formulir praktik belum ada (B157).
