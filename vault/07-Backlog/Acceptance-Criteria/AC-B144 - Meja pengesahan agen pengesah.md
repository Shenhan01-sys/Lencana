---
tags: [acceptance-criteria, B144]
status: active
updated: 2026-10-05
---

# AC-B144 - Meja pengesahan agen pengesah

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B144 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T74 - signer review-check.js (B144 meja pengesahan)]] ·
[[09-Testing/T75 - Uji peramban meja pengesahan (B144)]] · **Summary:** [[08-Results/B144 - Executive Summary]] · **Keputusan:** D73

Temuan 4 Okt (saat merancang B143): agen pengesah hanya bisa mengesahkan lewat `POST /essay/review` dari skrip, sedangkan agen
penilai sejak B135 punya antrean di peramban. Pemilik agen pengesah tidak bisa bekerja dari HP. Pilihan builder 5 Okt (D73):
**layar pengesahan di dasbor Agent Owner + pendapat kedua dari otak agen pengesah**; keputusan dan tanda tangan tetap milik pemilik.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B144#1 | antrean pengesahan hanya dibaca dompet agen pengesah (= penanda tangan keputusannya); dompet lain → 403, agen tak dikenal → 404, bentuk pesan salah → 400 sebelum nonce | **PASS** 5 Okt | T74 A |
| AC-B144#2 | isi meja: teks esai, soal + rubrik + nilai lulus dari manifest, usulan per kriteria dalam poin + total + model + agen pengusul + label; **tanpa alamat peserta** | **PASS** 5 Okt | T74 B; T75 langkah 2–3 |
| AC-B144#3 | esai peserta harness (`origin=test`) tersembunyi kecuali diminta; batas per kursus dipatuhi | **PASS** 5 Okt | T74 B |
| AC-B144#4 | esai yang akan ditolak rute pengesahan tidak masuk meja: usulan agen ini sendiri, usulan agen milik Agent Owner yang sama, tulisan dompet / pemilik pengesah sendiri | **PASS** 5 Okt untuk usulan agen sendiri — dua aturan lainnya dijaga kode (`signer/src/review.js` `reviewItems`) tanpa pasangan uji | T74 A |
| AC-B144#5 | rubrik + nilai lulus pengesahan **milik esainya sendiri**: kursus / lesson lain di `/essay/review` → ditolak tanpa baris; lesson lain di penilaian agen → ditolak; celahnya terbukti nyata dengan uji negatif | **PASS** 5 Okt | T74 C + uji negatif (31 / 3 saat dimatikan) |
| AC-B144#6 | layar meja di kartu agen yang ditunjuk: buka, periksa (teks, tugas, tanda mekanis, penggaris usulan), Setujui / Sesuaikan per kriteria / Tolak, tangga label dengan bayaran agen, tanda tangan, hasil + tagihan; butir keluar dari meja sesudah disahkan | **PASS** 5 Okt untuk Setujui + Sesuaikan — cap Tolak tidak diklik di peramban (jalur `rejected` dibuktikan `verify:db`) | T75 langkah 1–3, 6–8 |
| AC-B144#7 | pendapat kedua: otak agen pengesah (kalibrasi lulus, dicatat pemilik sekarang) menilai esai yang sama dengan prompt + rubrik yang sama; kunci API hanya di peramban; selisih per kriteria tampil; "isi dari pendapat kedua" + angka bisa diubah pemilik; keputusan tetap milik pemilik | **PASS** 5 Okt | T75 langkah 4–6 (Groq sungguhan: kalibrasi 100 / 3, pendapat 99, keputusan 98) |
| AC-B144#8 | ponsel 375 px tanpa geser horizontal | **PASS** 5 Okt | T75 langkah 8 |
| AC-B144#9 | gerbang | **PASS** 5 Okt | `tsc` 0, build (entry 847.35 kB), `probe` 118/0; baterai 5 Okt 02.03 WIB **36 harness · 36 hijau** (`verify:review` 31/0); `--verify` **68 klaim hijau** (dua klaim `verify:review` baru: T74 + Quick-Reference); `audit` 12 · 0 temuan (A9 277 marker, A10 27 klaim); `check:labels` 8/0 — rincian [[08-Results/B144 - Executive Summary]] §2 |
| AC-B144#10 | uji builder dari HP dengan akun Privy: agen pengesah yang dompetnya = akun builder (mis. #2547 milik akun 2 builder) ditunjuk di kursus yang punya usulan, lalu mengesahkan dari meja | **TERBUKA** | uji builder |

**Batas klaim:** meja hanya untuk agen yang dompetnya = akun pemiliknya (sama dengan antrean penilai B135). Agen tim #2542
tetap mengesahkan lewat skrip. Tidak ada halaman untuk pengesah manusia, karena akun hanya punya peran peserta / penerbit /
Agent Owner. Testnet.
