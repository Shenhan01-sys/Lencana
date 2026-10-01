---
tags: [acceptance-criteria, B123]
status: active
updated: 2026-10-02
---

# AC-B123 - Pintu masuk satu akun dan permukaan publik tanpa simulasi (RF7 langkah A)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B123 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T43 - Uji peramban pintu masuk dan halaman publik (B123)]] ·
**Summary:** [[08-Results/B123 - Executive Summary]] · **Rencana:** [[11-Refactoring/RF7 - Halaman publik vs internal, dashboard per peran, onboarding]] · **Keputusan:** D59

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B123#1 | tidak ada pintu masuk tanpa akun: Demo Learner (rina.bnb), kunci perangkat, dompet ekstensi keluar dari UI; sesi peserta = penanda akun (`hasExplicitLearnerSession` = `hasPrivyMark`) | **PASS** 2 Okt | `index.html`: modal lama + tiga opsinya dibuang; `main.ts`: `connectDemoWallet`, `connectDeviceWallet`, `connectBrowserWallet` dibuang; `class.ts`: aksi `learner-device`/`learner-wallet` dibuang; `learning.ts`: `startDemoLearnerSession` dibuang; T43 |
| AC-B123#2 | halaman masuk tidak menyebut "Privy"; tombol Google hanya tampil kalau Google aktif di app login | **PASS** 2 Okt (keadaan Google mati) | teks dialog: 0 kemunculan "privy"; pengaturan publik app dibaca 2 Okt: `google_oauth: false` → tombol tersembunyi; jalur Google (`privyGoogleStart`/`privyGoogleFinish`) **belum teruji** sampai builder menyalakannya |
| AC-B123#3 | halaman internal hanya untuk akun: tamu yang membuka kelas/`#/me` kembali ke beranda dan dialog masuk terbuka; kursus tujuannya diingat | **PASS** 2 Okt | T43 langkah 4: `#/class/web3-dasar-2026` → `#/` + "Sign in first to open that page", `lencana_enroll_target = web3-dasar-2026` |
| AC-B123#4 | halaman simulasi tidak bisa dibuka: `#/submit`, `#ai-evaluator`, `#/portfolio` dialihkan ke `#/me` | **PASS** 2 Okt | T43 langkah 4 (tamu berakhir di beranda + dialog, bukan di studio/portofolio) |
| AC-B123#5 | tidak ada simulasi di Verifier dan Trust Center | **PASS** 2 Okt | T43 langkah 5–6: Tamper Playground, konsol x402, matriks bitstring tidak ada di DOM; 0 kemunculan "simulat" di kedua halaman |
| AC-B123#6 | tombol Trust Center memeriksa spesimen sungguhan, dan spesimennya diadili harness | **PASS** 2 Okt | tombol delisting → verifier `0xaa379627…` → "No longer valid — issuer not trusted"; `check:samples` 11/0 (sebelumnya 9 — `delisted` kini ikut diadili) |
| AC-B123#7 | dialog masuk mengikuti referensi builder dengan palet Lencana, desktop dan ponsel | **PASS** 2 Okt | T43 langkah 2–3 (tangkapan layar 1440×900 dan 500×900) |
| AC-B123#8 | gerbang hijau | **PASS** 2 Okt | `tsc` + build, `probe` 88/0, `check:spec` 14/0, `verify:privy` 41/0, `verify:quizkeys` 30/0, `check:samples` 11/0, `npm run audit` bersih, `check:labels` 8/0; baterai `npm run sync:numbers` 22 harness · 0 gagal; `sync:numbers --verify` 40 klaim sepakat |
| AC-B123#9 | login sungguhan lewat dialog baru: kode email → masuk → nav "Dashboard" → `#/me` (dan Google setelah dinyalakan) | **TERBUKA** | tidak dijalankan di sesi ini: mengirim kode ke alamat yang bukan milik kami adalah tindakan keluar; fungsi yang dipanggil sama dengan B82 (`sendPrivyCode`, `connectPrivyLearner`) — uji milik builder, bersama uji dua peramban B82 |
