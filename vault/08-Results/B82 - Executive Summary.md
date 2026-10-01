---
tags: [results, executive-summary, B82]
status: active
updated: 2026-10-01
---

# B82 - Executive Summary — login peserta lewat Privy

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B82 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B82 - Login Privy]] · **Testing:** [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]] ·
**Keputusan:** D57 di [[00-Overview/03 - Decisions]] · **Untuk pemilik FE:** OI-22 di [[10-Contributors/Open-Items-for-Dave]]

## 1. Apa yang diubah

- **Klien** — `web/src/privy.ts` (baru): SDK vanilla `@privy-io/js-sdk-core` 0.77.0, dimuat **lambat**; iframe
  tersembunyi dompet tertanam; OTP email; dompet dibuat saat login pertama (`create({})` — app memakai mode dompet
  server milik user, passcode tidak wajib); `personal_sign` yang menolak menandatangani kalau sesi Privy di peramban
  itu sudah milik dompet lain. `web/src/learning.ts`: identitas jenis ketiga `privy`, pemulihan sesi di tab baru,
  `POST /auth/privy` sesudah login. `web/src/lms.ts` + `lms.css`: kotak identitas email → kode → masuk (OI-22).
- **Server** — migrasi `0012_learner_accounts` (diterapkan ke Supabase **sebelum** kodenya; satu alamat → satu DID
  Privy, tanpa email, RLS tanpa policy); `signer/src/privy.js` + rute `POST /auth/privy`: token diverifikasi dengan
  app secret, user dibaca ulang dari API Privy, alamat diikat hanya kalau ia dompet **tertanam** milik user itu;
  `db.js:bindLearnerAccount` atomik. Otorisasi tulis **tidak berubah**: setiap tulisan tetap butuh tanda tangan
  peserta atas nonce satu-kali.
- **Rahasia** — app ID + app secret di `app/.env` (diabaikan git, nilainya tidak pernah dicetak); `.env.example`
  memuat nama kosongnya dan peringatan `VITE_*`.
- **Harness** — `npm run verify:privy` (38 pemeriksaan), didaftarkan di `sync:numbers` (2 klaim halaman) dan di
  A10 `npm run audit` (baris README).
- **Dependensi** — `web/.npmrc` `legacy-peer-deps=true`: SDK mematok peer *opsional* `viem` 2.56.0 persis
  (halaman ini 2.56.5) dan `ox` lewat `permissionless` yang tidak kita pasang; alasannya tertulis di berkasnya.
- **Koreksi yang dibiarkan terlihat** — teks gap `journey.js` ("core tidak punya akun/login"), kepala `learning.ts`
  (kalimat kunci kuis di bundel, basi sejak B80), T40, START-HERE, halaman proses bisnis 12 + 13, RF3.

## 2. Hasil vs KPI

| KPI | hasil 1 Okt |
|---|---|
| SDK Privy di bundel awal | **tidak ada** — entry `index-D3D4ptpJ.js` (556,09 kB) tanpa `auth.privy.io`; SDK 553,60 kB di chunk lambat |
| app secret di bundel / `web/src` / `VITE_*` | **0 / 0 / 0** |
| token palsu (ES256 kunci acak, `alg=none`) · bukan-JWT | **401 · 401 · 400** (lib dan HTTP) |
| pembuktian secret bisa merah | secret palsu → **401** di API users; run pertama **MERAH 36 / 1** karena kontrol negatif membongkar endpoint publik |
| dua ikatan serentak ke dua akun | **tepat satu menang** |
| server tanpa secret | **503** |
| `npm run verify:privy` | **38 / 0** |
| probe web · `verify:db` | **88 / 0 · 70 / 0** |
| baterai `npm run sync:numbers` | **22 harness · 0 gagal** |
| pemindai bundel tayang bisa merah | `--deployed` atas bundel Vercel lama → **MERAH 42 / 2** (diulang sesudah deploy) |
| login email dari dua peramban → alamat sama | **BELUM** — uji builder (kriteria tutup) |

## 3. Status

**PARSIAL — baris B82 tetap TERBUKA.** Login terpasang dan semua yang bisa diuji tanpa kotak masuk sungguhan
hijau; yang menutup baris ini adalah builder login dari dua peramban dan mendapat alamat yang sama. Commit lokal;
**push menunggu acc builder** (WORKFLOW langkah 5), jadi bundel yang tayang di Vercel belum memuat login ini.

## 4. Risiko tersisa

- **Jalur positif tidak teruji otomatis** — app Privy belum punya akun uji; harness bagian F berjalan sendiri
  begitu akun uji dibuat di dasbor.
- **Pihak ketiga di jalur login** — kalau Privy tidak bisa dihubungi, login email gagal; kunci perangkat dan dompet
  ekstensi tetap jalan. Dompet tertanam dijaga infrastruktur Privy: jangan tulis "tidak ada yang memegang kuncimu".
- **`allowed_domains` kosong** — Privy menerima login dari domain mana pun sampai dasbor diisi.
- **`legacy-peer-deps`** — SDK diuji penulisnya dengan `viem` 2.56.0; kita 2.56.5. Typecheck + build hijau, tapi
  login sungguhan belum dijalankan.
- **App secret pernah ditempel di chat** — sebaiknya dirotasi di dasbor Privy lalu `app/.env` diperbarui.
- **Celah gerbang lama yang ditemukan sambil mengerjakan (tidak dikerjakan):** A10 tidak membandingkan baris README
  `verify:quizkeys`/`praktik`/`relay`/`deposit`/`agent`/`agents` walau metriknya ada di `numbers.json` (T41).

## 5. Bukti

- [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]] — transkrip `verify:privy` dan baterai.
- Pengaturan app dibaca 1 Okt: `email_auth` true, mode `user-controlled-server-wallets-only`, passcode tidak wajib,
  `create_on_login` off, `allowed_domains` [], 0 user terdaftar.
- Commit: lokal, id dicatat sesudah push.
