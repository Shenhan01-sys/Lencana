---
tags: [module, 09]
---

# 09 - Testing

**Purpose:** One note per harness, each stating the command, the date it last ran, the number it printed and the group it skipped - so a green line is never read as full coverage.

## Files in this module
- [[09-Testing/00 - Hub Testing]]
- [[09-Testing/T1 - forge test on chain 97]]
- [[09-Testing/T2 - forge test on chain 56]]
- [[09-Testing/T3 - web typecheck and build]]
- [[09-Testing/T4 - npm run probe]]
- [[09-Testing/T5 - npm run rubric]]
- [[09-Testing/T6 - npm run x402]]
- [[09-Testing/T7 - signer check.js]]
- [[09-Testing/T8 - signer serve-probe.js]]
- [[09-Testing/T9 - npm run anchor]]
- [[09-Testing/T10 - npm run delegate]]
- [[09-Testing/T11 - npm run judge]]
- [[09-Testing/T12 - npm run judge-variance]]
- [[09-Testing/T13 - npm run inventory]]
- [[09-Testing/T14 - verify the public deployment]]
- [[09-Testing/T15 - 1EdTech validator]]
- [[09-Testing/T16 - npm run publish edge]]
- [[09-Testing/T17 - signer verify-live-cert.js]]
- [[09-Testing/T18 - signer verify-edge.js]]
- [[09-Testing/T19 - signer e2e.js]]
- [[09-Testing/T20 - signer journey.js]]
- [[09-Testing/T21 - signer db-probe.js]]
- [[09-Testing/T22 - signer attempts-check.js]]
- [[09-Testing/T24 - signer rehost.js]]
- [[09-Testing/T25 - web spec-audit-check.ts]]
- [[09-Testing/T26 - signer sample-check.js]]
- [[09-Testing/T27 - signer cold-store-probe.js]]
- [[09-Testing/T28 - signer monitor-edge.js]]
- [[09-Testing/T29 - signer label-coverage.js]]
- [[09-Testing/T31 - signer identity-check.js]]
- [[09-Testing/T32 - signer cleanup.js]]
- [[09-Testing/T33 - signer relay-check.js]]
- [[09-Testing/T34 - signer deposit-check.js]]
- [[09-Testing/T35 - signer agent-identity-check.js]]
- [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]]
- [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]]
- [[09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain)]]
- [[09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis)]]
- [[09-Testing/T40 - E2E penuh sebelum FE (1 Okt)]]
- [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]]
- [[09-Testing/T42 - Uji peramban ruang kelas (FE7)]]
- [[09-Testing/T43 - Uji peramban pintu masuk dan halaman publik (B123)]]
- [[09-Testing/T44 - Uji peramban area internal dan detail kursus (B124)]]
- [[09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta)]]
- [[09-Testing/T46 - signer paywall-check.js (B125 bayar dulu)]]
- [[09-Testing/T47 - Uji peramban bayar dan daftar (B125)]]
- [[09-Testing/T48 - Uji peramban kelas uji, saldo, rapor, pemuatan (B126)]]
- [[09-Testing/T49 - Uji peramban halaman Kursus dan Ringkasan (B127)]]
- [[09-Testing/T50 - signer roles-check.js (B128 peran akun)]]
- [[09-Testing/T51 - Uji peramban kursi akun (B128)]]
- [[09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit)]]
- [[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]]
- [[09-Testing/T54 - signer owner-check.js (B130 kursi Agent Owner)]]
- [[09-Testing/T55 - Uji on-chain dan peramban dasbor Agent Owner (B130)]]

*(3 Okt: daftar ini tadinya berhenti di T8 (tanpa T6) sementara folder sudah sampai T55; dilengkapi dari isi folder. Nomor T23 dan
T30 memang tidak ada berkasnya. Angka harness terkini ada di `09-Testing/numbers.json`, bukan di daftar ini.)*

## Key facts
- The vault has its own guards: `scripts/sync-vault.ps1`, then `check-links.ps1`, `check-mermaid.ps1` and `check-lang.ps1`; ~~all four are required after an edit~~ (see [[Conventions]]). *(Koreksi 3 Okt: lima, bukan empat — `check-paste.ps1` → `PASTE HIJAU` ikut wajib, [[AGENTS]] aturan 7.)*
- Counts grow with the watched set on purpose: the run prints them, the page does not decide them ([[09-Testing/00 - Hub Testing]]).
- Interoperability is a run, not a belief: [[09-Testing/T15 - 1EdTech validator]].
