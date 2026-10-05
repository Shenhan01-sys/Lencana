---
tags: [results, executive-summary, B155]
status: active
updated: 2026-10-05
---

# B155 - Executive Summary — batas faucet dan gas di signer publik

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B155 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B155 - Batas faucet dan gas]] ·
**Testing:** [[09-Testing/T82 - signer limits-check.js (B155 batas pemberian)]] · **Asal:** [[08-Results/B154 - Executive Summary]] (D74)

## 1. Apa yang diubah

- **`signer/src/limits.js` (baru):** pembatas jendela 24 jam bergulir per IP + kuota global harian per jalur; slot dipesan saat
  dicek lewat `take()` dan dilepas bila pemberian gagal, supaya dua permintaan serentak dari IP yang sama tidak sama-sama lolos;
  `clientIp` (entri pertama `X-Forwarded-For` hanya di belakang proxy tepercaya); `limitsFromEnv`. Bawaan faucet 3/IP + 200/hari,
  gas 2/IP + 30/hari.
- **`signer/src/server.js`:** `/faucet` memesan slot sesudah cek jeda alamat dan **sebelum** tanda tangan dipakai
  (`signer/src/server.js:682`); `/owner/gas` sebelum kiriman (`signer/src/server.js:952`); `/healthz` melaporkan `deployer`
  (alamat + saldo wei) dan `limits` (angka saja) (`signer/src/server.js:1553`).
- **Harness baru** `verify:limits` (`signer/scripts/limits-check.js`), tanpa gas, ikut baterai murah; baris bukti README + peta
  audit.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| faucet per pengunjung | sekali per **alamat** per jendela; alamat baru gratis | 3/IP per 24 jam + 200/hari global |
| gas pemilik agen | tanpa batas per IP | 2/IP + 30/hari (0,03 tBNB/hari paling banyak dengan `GAS_DRIP` 0,001) |
| `/faucet` lewat batas | — | 429 sebelum tanda tangan dipakai, tanpa mint (T82 bagian 4) |
| saldo deployer terlihat | tidak | `/healthz` cloud: 0,3755 tBNB (proses mulai 03:34:06Z) |
| `verify:limits` | — | **23/0** (uji negatif 23/1) |
| baterai `sync:numbers` | 36 · 36 hijau (02:20:29Z, B156) | **37 · 37 hijau**, 1.420 pemeriksaan (`numbers.json` 2026-10-05T03:29:06Z) |
| `sync:numbers --verify` | 68 klaim hijau | 70 klaim hijau |
| `audit` | — | bersih, 289 marker, 28 klaim README |

## 3. Status

**SELESAI · LIVE** di signer cloud sejak deployment `3778fdeb` (5 Okt 03.32Z): dorongan `f28ac21..729dad4`, workflow
`deploy-signer` run `37259823357`. Jalur `/owner/gas` diadili lewat modul + angka kuota, bukan kiriman sungguhan (AC-B155#5
**PARTIAL**).

## 4. Risiko tersisa

- Penghitung hidup di memori satu proses; deploy ulang mengosongkannya (pengunjung tidak bisa memicu deploy).
- Kepercayaan pada `X-Forwarded-For` bergantung pada tepi Railway yang membuang nilai dari klien; jangan pasang
  `TRUST_FORWARDED=1` di belakang proxy yang hanya menambahkan entri.
- Penurunan saldo deployer hanya terlihat bila `/healthz` dibaca; saldo yang habis menghentikan bayar kelas, anchor, dan
  penerbitan (testnet).

## 5. Bukti

Commit `729dad4` (kode + T82), `e36765f` (penutupan: marker `signer/src/limits.js` → SELESAI, T82 §Di signer cloud). T82 bagian
1–4 + uji negatif. Workflow run `37259823357`, deployment `3778fdeb`.
