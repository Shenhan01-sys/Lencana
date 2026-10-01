---
tags: [results, executive-summary, B123]
status: active
updated: 2026-10-02
---

# B123 - Executive Summary — satu pintu masuk berakun, dan permukaan publik tanpa simulasi

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B123 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B123 - Pintu masuk satu akun dan permukaan publik tanpa simulasi]] ·
**Testing:** [[09-Testing/T43 - Uji peramban pintu masuk dan halaman publik (B123)]] · **Rencana:** RF7 langkah A · **Keputusan:** D59

## 1. Apa yang diubah

- **Dialog masuk baru** (`web/src/pages/login.ts`, `login.css`): kartu terbelah mengikuti referensi builder, palet Lencana;
  email + kode 6 digit, dan "Lanjutkan dengan Google" yang hanya tampil bila Google aktif di app login. Tidak ada kata "Privy".
- **Pintu tanpa akun ditutup:** Demo Learner (rina.bnb), kunci perangkat, dompet ekstensi keluar dari UI; sesi peserta =
  penanda akun. Nav sesudah login berisi satu item "Dashboard" (`#/me`).
- **Halaman simulasi tidak bisa dibuka:** `#/submit`, `#ai-evaluator`, `#/portfolio` dialihkan ke `#/me`.
- **Simulasi publik dibuang:** Tamper Playground dan konsol x402 dari timer (Verifier), matriks bitstring karangan + "Simulate
  State Flip" (Trust Center). Tombol "Simulate Delisting" yang tidak punya handler sama sekali kini memeriksa spesimen
  delisted sungguhan; label tombol revoke yang berkata "Simulate" padahal memeriksa chain dibetulkan.
- Kalimat stasiun "Masuk" di alur 3D (FE8) tidak lagi menyebut Privy atau kunci perangkat.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| pintu masuk tanpa akun | 3 (Demo Learner, kunci perangkat, dompet ekstensi) | 0 |
| simulasi di Verifier + Trust Center | Tamper Playground (4 tombol "Simulate …" + trace EVM tiruan), konsol x402 "Simulate 10-Candidate Batch Audit", matriks bitstring + "Simulate State Flip", tombol "Simulate Delisting" tanpa handler, label "Simulate Revoke" | 0 kemunculan "simulat" di kedua halaman (T43) |
| spesimen yang diadili `check:samples` | 9 pemeriksaan | 11 (delisted ikut) |
| entry bundle | 593.68 kB (FE8, 2 Okt) | 575.00 kB |
| baterai `npm run sync:numbers` | 22 harness · 0 gagal (FE8) | 22 harness · 0 gagal |

## 3. Yang belum

Login sungguhan lewat dialog baru (AC-B123#9) dan login Google (perlu dinyalakan builder di dashboard app login:
Login methods → Socials → Google). Dashboard per peran dan onboarding adalah langkah A2 ([[11-Refactoring/RF7 - Halaman publik vs internal, dashboard per peran, onboarding]]).
