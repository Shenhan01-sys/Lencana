---
tags: [acceptance-criteria, B155]
status: active
updated: 2026-10-05
---

# AC-B155 - Batas faucet dan gas

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B155 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T82 - signer limits-check.js (B155 batas pemberian)]] ·
**Summary:** [[08-Results/B155 - Executive Summary]] · **Asal temuan:** [[09-Testing/T78 - Uji signer cloud Railway dan build produksi (B154)]]
(D74 mencatat risiko pengurasan testnet sebagai B155)

Terlihat saat menyiapkan B154: `POST /faucet` membatasi sekali per **alamat** per jendela, dan alamat baru gratis dibuat;
`POST /owner/gas` mengirim tBNB ke akun yang memilih peran Agent Owner dan belum punya agen. Setiap kiriman dibayar dompet
deployer; di Railway paparan itu permanen. Pilihan builder 5 Okt: **"Batas IP + kuota harian"**.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B155#1 | pembatas jendela 24 jam bergulir per IP + kuota global harian per jalur, dihitung dari pemberian yang berhasil (slot dipesan saat dicek, dilepas bila pemberian gagal) | **PASS** 5 Okt | T82 bagian 1 (jam tiruan) |
| AC-B155#2 | IP klien dari entri pertama `X-Forwarded-For` hanya di belakang proxy tepercaya (Railway atau `TRUST_FORWARDED=1`); selain itu alamat soket | **PASS** 5 Okt | T82 bagian 2 |
| AC-B155#3 | bawaan faucet 3/IP + 200/hari dan gas 2/IP + 30/hari, bisa diubah lewat `FAUCET_PER_IP_DAY` / `FAUCET_GLOBAL_DAY` / `GAS_PER_IP_DAY` / `GAS_GLOBAL_DAY`; nilai tidak sah → bawaan | **PASS** 5 Okt | T82 bagian 3 |
| AC-B155#4 | `/faucet` ditolak batasnya **sebelum** tanda tangan dipakai — 429, tanpa mint | **PASS** 5 Okt | T82 bagian 4 + uji negatif (pengecekan dimatikan → 401 alih-alih 429, 23 / 1); `signer/src/server.js:682` |
| AC-B155#5 | `/owner/gas` dibatasi sebelum kiriman | **PARTIAL** | diadili lewat modul yang sama (`LIMITS.gas` = `createLimiter`) dan angka kuotanya di `/healthz`, bukan lewat kiriman sungguhan — jalur itu butuh akun Agent Owner sah dengan saldo rendah (T82, paragraf sesudah tabel); `signer/src/server.js:952` |
| AC-B155#6 | `/healthz` melaporkan alamat + saldo deployer dan pemakaian kuota, tanpa IP pengunjung | **PASS** 5 Okt | T82 bagian 4 dan §Di signer cloud; `signer/src/server.js:1553` |
| AC-B155#7 | `verify:limits` ikut baterai murah; baterai penuh hijau | **PASS** 5 Okt | `verify:limits` 23/0; baterai **37 / 37** (1.420 pemeriksaan, `numbers.json` 2026-10-05T03:29:06Z), `--verify` hijau (70 klaim), `audit` bersih (289 marker, 28 klaim README) — baris B155 |
| AC-B155#8 | berjalan di signer cloud: didorong atas kata builder, dideploy, `/healthz` cloud memuat `limits` + `deployer` | **PASS** 5 Okt | T82 §Di signer cloud (dorongan `f28ac21..729dad4`, workflow run `37259823357`, deployment `3778fdeb`; saldo 0,3755 tBNB, 0 diberikan, tanpa IP) |

**Batas klaim:** penghitung hidup di memori satu proses — deploy ulang mengosongkannya (pengunjung tidak bisa memicu deploy).
Kepercayaan pada `X-Forwarded-For` bergantung pada tepi Railway yang membuang nilai dari klien; di belakang proxy yang hanya
menambahkan entri, `TRUST_FORWARDED=1` tidak boleh dipasang. Yang dipertaruhkan hanya testnet.
