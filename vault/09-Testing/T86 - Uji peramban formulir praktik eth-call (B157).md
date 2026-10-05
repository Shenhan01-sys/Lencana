---
tags: [testing, "T86"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174; Chromium headless 1280 px dan iframe 375 px; kelas `uji-bayar-2026` / `web3-dasar-2026` dengan penerbit TIRUAN di dalam halaman (route `/praktik` membandingkan jawaban dengan keluaran mentah ASLI dari chain 97, mesin state progres ditegakkan); lalu pemeriksa SERVER `checkPraktik` dijalankan baca-chain saja (tanpa database) dengan keluaran mentah yang sama
measured: 2026-10-05
result: PESERTA BISA MENYERAHKAN BUKTI PRAKTIK DARI HALAMAN — formulir `eth-call` (3 kolom) divalidasi bentuknya, bertanda tangan peserta, tanpa angka dari klien; jawaban salah hanya dilaporkan jumlah + NAMA pemeriksaan; lulus → "Bukti diterima — dinilai chain 97" dan lesson ditandai selesai (B160); nilai asli dari chain 97 diterima pemeriksa server (3 pemeriksaan benar), nilai yang diubah ditolak tanpa membocorkan nilai benar; 375 px tanpa luapan
---

# T86 - Uji peramban formulir praktik eth-call (B157)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B157 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B157 - Formulir praktik eth-call]] · **Summary:** [[08-Results/B157 - Executive Summary]] ·
**Terkait:** B121 (sisi server), B160 ([[09-Testing/T85 - Uji peramban lesson kuis dan esai tercatat selesai (B160)]]), B153

Pertanyaan yang diuji: apakah peserta bisa menyerahkan bukti praktik `eth-call` dari halaman kelas ke `POST /praktik` (dulu tidak ada jalannya,
OI-20), tanpa halaman mengirim angka sendiri, dengan penolakan yang tidak membocorkan jawaban, dan dengan keluaran mentah yang benar-benar diterima
pemeriksa server.

## Cara mengulang

1. Keluaran mentah dan pemeriksa server (baca-chain saja, **tanpa database**): skrip sementara memanggil `eth_call` `name()` / `symbol()` /
   `decimals()` pada kontrak LDC-demo di chain 97 lalu `checkPraktik` dari `signer/src/praktik.js` — fungsi yang sama dengan rute `/praktik`.
2. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji).
3. Peramban headless dengan penerbit tiruan yang mencegat `fetch` ke `https://signer-production-e4f2.up.railway.app` (`/progress`, `/praktik`,
   `/me/records`, `/enroll`) dan identitas perangkat acak sekali pakai; route `/praktik` tiruan menolak `score` / `verdict` / `components` /
   `rubricHash`, memeriksa `lesson=<slug>` di pesan, dan membandingkan `answers.results` dengan keluaran asli dari langkah 1.
4. Buka `#/class/uji-bayar-2026/m1/praktik-baca-koin`; isi kolom lewat DOM; baca log permintaan, status lesson di penerbit tiruan, sidebar, dan teks status.

## Hasil 5 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | `checkPraktik` dengan keluaran mentah ASLI dari chain 97 (`name` = "Lencana Demo Coin", `symbol` = "LDC-demo", `decimals` = 6) | **OK**: `eth-call:name`, `eth-call:symbol`, `eth-call:decimals` semuanya benar. `decimals` diubah → ditolak 422 `failed=["eth-call:decimals"]`, nilai benar tidak ikut dikembalikan. Huruf besar + spasi di ujung → diterima (server membandingkan tanpa peduli keduanya). Rantai ID 97 = `spec.chainId` 97 |
| 2 | lesson `praktik-baca-koin` dibuka | bagian "Kirim bukti praktik": tiga kolom `name · name()`, `symbol · symbol()`, `decimals · decimals()` (placeholder `0x…`), tombol "Kirim bukti", catatan "Batas yang jujur" (jawaban jenis ini bisa disalin); "Tandai selesai" tetap ada; catatan lama "Formulir penyerahan… belum ada" **tidak** tampil |
| 3 | "Kirim bukti" dengan kolom kosong | "Isi keluaran name dulu."; **nol** permintaan `/praktik` |
| 4 | teks biasa ("Lencana Demo Coin") dan heksadesimal tanpa `0x` | "Keluaran name harus heksadesimal yang diawali 0x, persis seperti yang dicetak cast call."; nol permintaan |
| 5 | `name` = `0x00` dan `decimals` = …05 (dua salah) | satu `POST /praktik`; 422; "Bukti belum diterima: 2 dari 3 pemeriksaan tidak cocok dengan bacaan chain 97. Baca ulang keluarannya lalu kirim lagi — nilai yang benar tidak ditampilkan." + chip `name` `decimals`; **nol** tulisan progres; isian tetap terisi; tidak ada heksadesimal di teks. Isi permintaan: `answers`, `course`, `learner`, `lesson`, `message`, `signature` saja; pesan `lencana-praktik-submit course=uji-bayar-2026 lesson=praktik-baca-koin nonce=…` |
| 6 | keluaran asli dari langkah 1 (kolom `name` dengan spasi di ujung) | `POST /praktik` 201; lalu `POST /progress` `praktik-baca-koin` **unlocked → started → completed**; sidebar ✓ "tercatat selesai di penerbit"; teks "Bukti diterima — dinilai chain 97 3 pemeriksaan cocok · blok 134950900 · 0x1212…" + "Angkanya dari penerbit yang membaca ulang chain, bukan dari halaman ini." Nilai `name` yang terkirim 194 karakter (isian 197 karakter dengan tiga spasi, terpangkas) |
| 7 | bukti diterima, tetapi penerbit tiruan menolak langkah `completed` (500) | bukti tersimpan; peringatan "Hasilnya tercatat, tetapi lesson ini belum ditandai selesai di penerbit: penerbit sedang tidak terjangkau (uji). Tekan "muat ulang"…"; lesson macet di `started` |
| 8 | penerbit pulih, "muat ulang" ditekan | `GET /progress` → `POST /me/records` → `POST /progress` `praktik-baca-koin:completed` **saja**; teks "…· 1 lesson dicatat selesai karena hasilnya sudah ada di penerbit" — bukti praktik bernilai chain dibaca dari rekaman (B160) |
| 9 | server tak bisa memeriksa chain (503) | "Bukti belum diterima: practice checking is not configured on this server (no RPC_URL)" — alasan server apa adanya, **tanpa** chip nama pemeriksaan (bukan salah jawaban) |
| 10 | lesson praktik jenis `balance` (`web3-dasar-2026` `dompet-burner-dan-faucet`) | **tanpa** formulir; catatan "Nilai praktik datang dari chain … jenis bukti: balance. Formulir penyerahan untuk jenis bukti ini belum ada di halaman" |
| 11 | tampilan 375 px (iframe): bukti salah dengan nilai heksadesimal sangat panjang di tiap kolom | lebar dokumen 360 = lebar tampilan 360 (tanpa luapan horizontal); kolom 294 px; nilai panjang tidak melebarkan halaman. *(Run pertama: chip "decimals" terpotong menjadi "decimal / s" — `overflow-wrap: anywhere` diwariskan; ditambah `white-space: nowrap` untuk `code` di pesan; diukur ulang: ketiga chip 24 px = satu baris.)* |

Sesudah uji: identitas acak, penanda masuk, dan catatan perangkat dihapus (`sessionStorage` 0 kunci, `localStorage` `lencana*` 0 kunci); peramban ditutup; server dev :5174 dimatikan (port bebas).
Langkah 5, 6, dan 9 diulang sesudah kalimat penolakan Indonesia diganti dari kalimat server berbahasa Inggris (saran OI-20) — hasil di atas adalah run terakhir.

**Gerbang 5 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **147 / 0** (118 sebelum B160 + 16 grup B160 + 13 grup B157); `npm run build` exit 0.

## Batas

- Penerbit tiruan di halaman, bukan server sungguhan: tanda tangan tidak diverifikasi dan tulisan ke database tidak terjadi. Yang diuji terhadap
  server sungguhan hanya **keluaran mentah** (langkah 1: pemeriksa server yang sama, chain 97 sungguhan, tanpa database). Bukti end-to-end dari akun
  builder menunggu dorongan FE dan pemakaian dari HP (AC-B157#13 PARTIAL).
- Jawaban `eth-call` sama untuk semua peserta, jadi bisa disalin (batas yang ditulis server, `signer/src/praktik.js:18-21`, dan di catatan formulir):
  lulus berarti "bisa membaca kontrak lewat RPC", bukan "mengerjakan sendiri". Jangan ditulis "praktik terverifikasi" (OI-20).
- Hanya jenis bukti `eth-call` (empat lesson di katalog). `balance`, `tx-receipt`, `allowance` butuh dompet latihan kedua yang menandatangani
  pengikatan dan belum punya formulir (langkah 10).
- Identitas yang diuji hanya jenis `perangkat`; Privy memakai `signMessage` yang sama tetapi tidak diamati.
