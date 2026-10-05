---
tags: [frontend, "FE9", credentials, certificate]
status: live
updated: 2026-10-05
---

# FE9 - Halaman "Kredensial saya" dan lembar sertifikat

**Part of:** [[03-Frontend/01 - Frontend]] · **Backlog:** B165 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B165 - Halaman sertifikat dari dokumen kredensial]] · **Testing:** [[09-Testing/T88 - Uji peramban kartu kredensial dan lembar sertifikat (B165)]] ·
**Summary:** [[08-Results/B165 - Executive Summary]] · **Desain asal:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] (S3 "Kaca Segitiga") ·
**Verifier (sisi lain dari kredensial yang sama):** [[03-Frontend/FE1 - Verifier page and verify.ts]]

Bagian `#/app/credentials` di dasbor peserta. Sebelum B165 ia tabel hash; sesudahnya kartu per kredensial, dan `#/app/credentials/<hash>` membuka lembar sertifikat siap cetak.

## Peta berkas

| berkas | isi | catatan |
|---|---|---|
| `web/src/certificate.ts` | MURNI (tanpa DOM, tanpa jaringan): `parseCredentialDoc`, `parseCriteria`, `buildCertificate`, `statusVerdict`/`statusNoteFor`, tanggal WIB, `cleanName`/`effectiveMode`/`loadRecipient`/`saveRecipient`, `qrPath`, `facets` (kristal dari byte hash), `dialSvg` (cincin) | diuji `probe` grup B165 |
| `web/src/certificate-logo.ts` | data vektor lambang (disalin skrip dari desain S3) | hanya data |
| `web/src/credentials.ts` | lapisan data: `listMyCredentials(alamat)`, `loadCertificate(hash, alamat)`, `loadCredentialDoc` | chain (resolver + artefak) + host tepi; tanpa DOM; diuji `probe` terhadap B153 |
| `web/src/pages/credentials.ts` | halaman kartu `renderCredentials(lang, alamat, routeHash)` | dipanggil `dashboard.ts` |
| `web/src/pages/certificate-view.ts` | penampil lembar: `openCertificate`, `closeCertificate`, `certificateHashOf` | lapisan anak langsung `<body>` |
| `web/src/pages/certificate.css` | CSS lembar (disalin skrip dari S3, `.sheet` → `.cert-sheet`) + lapisan, bilah, dialog, cetak | selalu gelap |
| `web/src/pages/credentials.css` | kartu daftar | |
| `web/src/config.ts` | `CREDENTIAL_HOST`, `APP_HOST` (dipindah dari `main.ts`) | `main.ts` mengekspor ulang |

## Alur

```mermaid
flowchart LR
  A["#/app/credentials"] --> B["listMyCredentials: credentialsOf + statusOf + dokumen tepi + lapis artefak"]
  B --> C["kartu per kredensial"]
  C -->|"Lihat sertifikat"| D["#/app/credentials/hash"]
  D --> E["loadCertificate: milik akun? (chain + alamat di dokumen)"]
  E -->|"ya"| F["lembar S3 di lapisan body"]
  E -->|"tidak"| G["Bukan kredensialmu"]
  F --> H["dialog alamat atau nama"]
  H --> I["window.print: A4 landscape satu halaman"]
```

## Aturan yang dijaga (dan di mana)

- **Kepemilikan dua arah** (`credentials.ts` `loadCertificate`): hash harus ada di `credentialsOf(akun)` DAN `credentialSubject.id` di dokumen harus alamat akun yang sama. Tanpa ini siapa pun bisa mencetak lembar atas nama peserta lain.
- **Tidak dikarang:** isian yang tidak ada di dokumen tidak ditampilkan; nilai per komponen tidak ada di dokumen yang tertanda tangan sehingga cincin dalam hanya bobot; batas lulus dan penerbit datang dari kriteria (boleh tidak ada).
- **Status bukan klaim:** lembar hanya menulis "Status dibaca dari chain pada <tanggal>; pindai QR untuk status terkini."; yang tidak BERLAKU diberi penanda di lembar dan kartu bertepi merah.
- **"Kosong" ≠ "gagal" ≠ "tidak tersaji":** daftar kosong yang sah, RPC gagal, dokumen 404, dan dokumen gagal diambil masing-masing punya tampilan sendiri.
- **Nama:** `cleanName` (tab/baris baru → spasi, kontrol dibuang, ≤ 60), selalu `textContent`, tersimpan di `localStorage` per alamat (`lencana.sertifikat.penerima:<alamat>`), tidak dikirim; mode "nama" dengan nama kosong jatuh ke alamat.
- **Label SVG dari dokumen:** kunci bobot disaring `[A-Za-z0-9_-]{1,24}` dan di-escape sebelum masuk ke SVG.
- **Selalu gelap:** tanpa tema terang dan tanpa tombol tema; cetak/PDF memakai tampilan gelap yang sama (kaca diganti isi padat karena `backdrop-filter` tidak ikut tercetak).

## Hal yang mudah salah

- **Aturan global `p`/`h1` dari `style.css`** (`line-height: 1.6; max-width: 65ch`; `letter-spacing` pada `h1`) ikut mengenai teks lembar. Dinetralkan di `certificate.css` dengan `html :where(.cert-sheet) p` (spesifisitas (0,0,2)): menang atas aturan elemen global, kalah dari semua aturan kelas S3. Jangan diganti `.cert-sheet p` — itu menimpa `line-height` kelas S3.
- **Penampil adalah anak langsung `<body>`**, bukan di dalam kerangka dasbor: cetak menyembunyikan `body > *:not(.cert-layer)`. Kalau lapisan dipindah ke dalam dasbor, cetak menghasilkan halaman kosong tambahan.
- **Penutupan lapisan** ditangani tiga jalur: `renderApp` (`closeCertificate()` di awal), `hashchange` (ke halaman non-`#/app/credentials/`), dan Esc/"Kembali". Jalur baru ke rute lain tidak butuh kode tambahan.
- Kaki lembar bisa tiga baris (batas klaim + catatan status yang membungkus); isian penerbit/penandatangan dinaikkan 16 px dan `fitFoot` mengukur jarak, mengecilkan font sampai 9 px bila perlu.
- Tautan di kartu memakai `verifyLink(hash)` (relatif); QR dan "Salin tautan" memakai `APP_HOST` (produksi) supaya lembar yang dicetak dari mana pun menunjuk verifier yang sama.

## Batas

Cetak kertas sungguhan, peramban selain Chrome 154, dan pemindai QR telepon belum diuji (lihat T88 §Batas dan Summary §4).
