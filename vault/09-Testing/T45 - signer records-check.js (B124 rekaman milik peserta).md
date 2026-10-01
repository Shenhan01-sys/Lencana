---
tags: [testing, "T45"]
status: active
updated: 2026-10-02
command: npm run verify:records
measured: 2026-10-02
result: REKAMAN HIJAU — 16 pemeriksaan / 0 gagal (run pertama hijau; penolakan diuji di harness yang sama: tanpa tanda tangan, tanda tangan untuk keperluan lain, kunci lain, replay nonce)
---

# T45 - signer records-check.js — B124: rekaman belajar hanya untuk pemiliknya

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B124 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B124 - Area internal peserta, onboarding, dan detail kursus publik]] ·
**Summary:** [[08-Results/B124 - Executive Summary]]

`signer/scripts/records-check.js`, dijalankan `npm run verify:records` (di `signer/`, butuh `SUPABASE_URL` + secret key).
Server sendiri di port bebas dengan `LANCENA_ORIGIN=test`; baris ujinya dibersihkan `npm run cleanup`.

| bagian | yang dibuktikan |
|---|---|
| A | peserta uji acak: `POST /enroll` → 200, satu kuis lewat `POST /grade` → 201 (angka dari server) |
| B | `POST /me/records`: tanpa pesan → 400; pesan tanpa tanda tangan → 401; tanda tangan sah untuk **enroll** dipakai membaca nilai → 400; tanda tangan kunci lain atas alamat peserta → 401; pemilik → 200 dengan tepat satu kursus, ringkasan (penyebut dari katalog), usaha kuis bernilai server, proyeksi hanya kolom yang diizinkan, tanpa `"body"`/`"answer"`; replay pesan + tanda tangan yang sama → 401 |
| C | peserta lain yang sah → 200 dengan nol kursus, dan alamat peserta pertama tidak muncul di jawabannya |

```
REKAMAN HIJAU — 16 pemeriksaan, 0 gagal
```

Yang tidak diuji di sini: tanda tangan dompet tertanam dari halaman (jalur login sungguhan) — `readMyRecords` memakai
`signMessage` yang sama dengan rute tulis; T44 menguji halamannya dengan identitas uji sekali-pakai.
