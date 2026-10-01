---
tags: [testing, B124, browser]
status: active
updated: 2026-10-02
---

# T44 - Uji peramban area internal, onboarding, dan detail kursus (B124)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B124 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B124 - Area internal peserta, onboarding, dan detail kursus publik]] ·
**Summary:** [[08-Results/B124 - Executive Summary]] · **Harness rute:** [[09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta)]]

**Alat:** vite `:5173` + signer lokal `:8787` (dijalankan dengan `LANCENA_ORIGIN=test` selama uji, lalu dikembalikan ke `demo`)
+ Chromium headless (MCP), 1440×900 dan 500×900. Tanggal: 2 Okt.

**Identitas uji (bukan kode produk):** login sungguhan mengirim kode ke email, jadi untuk halaman internal dipakai kunci
sekali-pakai yang dibuat untuk uji ini: penanda akun dipasang di `localStorage` dan identitas kunci di `sessionStorage` tab
uji. Rekamannya diisi lewat signer lokal (enroll 200, satu kuis dinilai 201), dan berkas kuncinya dihapus sesudah uji.

| # | langkah | hasil |
|---|---|---|
| 1 | tamu: kartu katalog di beranda | menunjuk `#/course/web3-dasar-2026`; nav tamu tetap 4 item |
| 2 | tamu: detail kursus | tampil tanpa login: "Web3 Dasar untuk Praktisi", penerbit "Yayasan Literasi Digital Nusantara (institusi demo, fiktif)", 5 modul · 19 lesson · 307 menit, silabus 5 modul / 19 lesson, rubricHash `2a45d0d00bc4`; tidak ada harga kursus (satu-satunya kata "harga" adalah judul lesson tentang gas) |
| 3 | tamu: tombol "Enroll" | dialog masuk terbuka, `lencana_enroll_target = web3-dasar-2026` |
| 4 | tamu: `#/app` | kembali ke `#/` + dialog "Sign in first to open that page." |
| 5 | identitas uji: `#/app/welcome` | tiga kursi: Learner aktif; Publisher dan Agent Owner "Coming soon" dengan tombol nonaktif; nav berisi Dashboard |
| 6 | "Start as a learner" → 7 langkah tur → pilih kursus | berakhir di `#/course/web3-dasar-2026`, penanda onboarding akun tercatat, tombol kursus kini "Start learning" → `#/class/web3-dasar-2026` |
| 7 | `#/app` (Ringkasan) | rekaman dibaca lewat `POST /me/records` bertanda tangan: 1 kursus · 0 lesson selesai · 1 usaha dinilai; kartu "Lanjutkan belajar" dengan lesson berikutnya |
| 8 | `#/app/grades` | progres 0/19 · usaha dinilai 1 · skor terbaik 80 · gerbang "not yet"; baris "Kuis 1 — Keselamatan dasar · kuis · 80 · pass · 02/10/2026" |
| 9 | `#/app/credentials` | catatan privasi + bacaan chain untuk alamat akun: "Tidak ada kredensial pada chain untuk alamat ini" |
| 10 | `#/app/account` → Keluar | email (kosong untuk identitas uji), dompet + Salin, jaringan 97; Keluar → `#/`, nav tamu, penanda dan identitas terhapus |
| 11 | 500×900, `#/app/classes` | sidebar menjadi tab bawah 5 item (fixed), kartu kelas + "Other courses", tanpa overflow horizontal (485 ≤ 500) |

Konsol: 0 pesan di seluruh langkah.

**Yang tidak diuji:** login sungguhan → pengalihan otomatis ke onboarding pada login pertama (`onSignedIn`), dan tanda tangan
dompet tertanam untuk `/me/records` — keduanya menunggu uji login builder (AC-B123#9, AC-B124#9).
