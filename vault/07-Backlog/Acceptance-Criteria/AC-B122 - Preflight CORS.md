---
tags: [acceptance-criteria, B122]
status: active
updated: 2026-10-01
---

# AC-B122 - Preflight CORS: halaman belajar bisa menulis ke penerbit dari peramban

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B122 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T42 - Uji peramban ruang kelas (FE7)]] ·
[[09-Testing/T41 - signer privy-check.js (B82 login Privy)]] · **Summary:** [[08-Results/B122 - Executive Summary]]

Ditemukan 1 Okt malam oleh uji peramban pertama atas ruang kelas hasil port (FE7). Bukan bagian rencana kerja hari itu —
ia memblokir setiap tulisan halaman, jadi ditutup di tempat.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B122#1 | `OPTIONS` ke rute tulis dari origin lain dijawab 204 dengan izin `POST` + `content-type` | **PASS** 1 Okt | sebelum: 405 di `/enroll`, `/progress`, `/grade`, `/auth/privy`, `/praktik`, `/essay`, `/relay`; sesudah: 204, `access-control-allow-origin *`, `allow-methods GET, POST, OPTIONS`, `allow-headers content-type, x-payment` |
| AC-B122#2 | halaman publik (https) boleh memanggil signer di loopback (Chrome Private Network Access) | **PASS** 1 Okt | `access-control-allow-private-network: true` di jawaban preflight |
| AC-B122#3 | pembuktiannya jadi harness, bukan ingatan | **PASS** 1 Okt | `npm run verify:privy` bagian C: 3 pemeriksaan preflight (`/auth/privy`, `/enroll`, `/grade`) |
| AC-B122#4 | satu alur peramban sungguhan menulis ke penerbit | **PASS** 1 Okt | T42: enroll, tandai selesai, kuis dinilai server, esai diserahkan — semuanya dari Chromium terhadap signer lokal |
| AC-B122#5 | otorisasi tidak melonggar | **PASS** 1 Okt | tidak ada cookie/sesi server; setiap tulisan tetap butuh tanda tangan atau token di badan (`authorizeLearner`, `POST /auth/privy`); `verify:db` menolak tulisan tanpa tanda tangan |
| AC-B122#6 | dua bug halaman yang tertutup CORS ikut ditutup | **PASS** 1 Okt | kuis mengirim kursus dari rute (bukan `data-course` kosong); kotak identitas tidak membeku saat sinkron gagal (T42 langkah 6–7) |
