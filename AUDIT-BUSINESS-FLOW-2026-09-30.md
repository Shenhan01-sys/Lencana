# Audit Business Flow — Lencana (30 Sep 2026, read-only)

**Auditor:** Dex (eksekutor AI) · **Cakupan:** `vault/00-Overview/12 - Business Process.md`
(642 baris) vs kode di `81989c0` · **Metode:** baca saja, tanpa edit, tanpa run harness.
Angka harness di bawah otoritasnya run, bukan audit ini.

Branch ini (`dex/lencana-fe-integration`) adalah salinan seluruh progres integrasi FE
sampai titik ini, diserahkan untuk audit langsung Hans.

## Terverifikasi utuh (dokumen ↔ kode cocok)

- **Jalur peserta:** `POST /enroll` (nonce satu-kali `used_nonces`, `lessons_total` dari
  katalog — `signer/src/server.js:396-403`), state machine + 422 (`:384-394`),
  `POST /grade` menolak `score` (`:410-415`), `POST /essay` menolak field angka
  (`:442-455`), web hanya kirim `picks`/teks (`web/src/learning.ts:379`).
- **Jalur penerbitan:** `courseGates → attemptsFor → evidenceFromAttempts → computeScore`
  (`signer/scripts/issue.js:189-219`), tolak flag angka, exit 2/3,
  `IndexAllocator.slot()` (`credential.js:61-62`), tanda tangan kunci penerbit.
- **x402:** `paymentRequirements/decodePaymentHeader/settlePayment` + `checkPayment`
  (`server.js:300`); split 10% / plafon 25% (`SettlementSplit.sol:76-99`).
- **Edge:** Worker hanya lookup KV (nol `sign/privateKey` di `cloudflare/worker.mjs`).
- **Revoke:** memakai `ISSUER_PRIVATE_KEY` DAN menolak kunci yang bukan attester tercatat
  (`revoke.js:81-85`) — kode lebih kuat dari klaim dokumen.
- **Batas §8 akurat:** B80, B82, CourseDeposit belum dipasang (nol rute memanggilnya; 16 test).
- Hampir semua nama fungsi DFD-2 ada (`authorizeLearner`, `consumeNonce`, `gradeQuiz`,
  `computeAttemptHash`, `queuePendingEssays`, `judgeEssay`, `anchorListHash`,
  `servedHashes`/`watchedHashes`/`renderList`).

## Temuan (belum diperbaiki)

1. **`verify:edge 17/17` di naskah video §9 tidak cocok dengan apa pun saat ini**
   (yang ada: 8/0 checks + 19/19 kertas). Akan diucapkan ke kamera — risiko tertinggi.
2. **§7 baris 11: perintah `verify:x402` tidak ada.** Nama skrip: `npm run x402`.
3. **Claims-Cheat-Sheet baris 27 basi:** "esai/praktik angkanya laporan klien (B81)" —
   B81 ditutup 29 Sep; angka esai kini hanya via tanda tangan EOA penerbit.
4. **CourseDeposit 15/15 vs 16/0** (Claims baris 26 vs 25); kode punya 16 test → 16/0 benar.
5. **`check.js`: 94/0 vs 88/0 vs 84/0** di dua halaman — dijelaskan korpus+tanggal,
   tapi membingungkan pembaca silang. Saran: pointer kanonis ke `numbers.json`.
6. **Drift guard tamu (Sep 30) vs dokumen (29 Sep):** BPMN P1 "buka `#/learn`" tak lagi
   bisa untuk tamu segar (bounce ke `#/`); diamond P2 tetap benar semantik.
7. **Nit `db.js:89-95`:** komentar mengurutkan "cek nonce → verifikasi", kode memverifikasi
   dulu baru mengonsumsi (urutan kode yang lebih aman).
8. **Backlog "Order of work" baris 5 basi** ("x402 never executed") — dieksekusi 24 Sep.

## Tidak divonis
`attestationOf` pasca-penolakan & pascakondisi `prerequisiteOf` (arsitektur ada,
tidak di-run ulang di sini). Angka harness = otoritas run.
