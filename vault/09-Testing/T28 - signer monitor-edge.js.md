---
tags: [testing, "T28"]
status: active
updated: 2026-09-29
command: npm run monitor:edge · npm run monitor:edge -- --json · --max-age=<jam>
measured: 2026-09-29
result: AMAN — 0 alarm · kontrol --max-age=0 dan host mati keduanya ALARM · ulang 4 Okt (T68): AMAN — 37 hash dipantau, 29 berdokumen, kedua daftar cocok chain 37/37
---

# T28 - signer monitor-edge.js (alarm eksternal untuk tepi yang sendirian)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B67 · **AC:** —

## Kenapa ini bukan "cuma ping"

`worker.mjs` sudah jujur: daftar yang belum terbit atau yang bitnya tidak cocok dengan chain DITOLAK (503 +
`x-lencana-stale`). Tapi penolakan yang diam menyisakan dua buta: kertas lama tetap tersaji dan tetap
bertanda tangan sah kalau `publish:edge` berhenti, dan yang pertama tahu adalah orang asing yang
membuka URL kami. Jadi yang dipasang: perkakas yang sama dijalankan **terjadwal di luar laptop kami**
(`.github/workflows/edge-monitor.yml`, cron 01:05Z + 13:05Z), dan saat ALARM ia membuka isu berisi
JSON hasil pengukurannya — status merah pada workflow terjadwal hanya dilihat orang yang membuka tab Actions.

## Yang diadili

| pemeriksaan | kenapa bukan sekadar 200 |
|---|---|
| umur `publishedAt` vs `--max-age` (bawaan 26 jam) | inti B67: state tua = publish berhenti. `publishedAt` di masa depan juga alarm |
| `counts.watchedHashes > 0` | tepi yang tidak memantau apa pun bukan tepi yang sehat |
| `counts.credentialsWithDocument > 0` | hidup tapi tak ada kertas yang bisa dibuka = kegagalan lain |
| `matchesChainNow` kedua daftar | daftar sajian vs chain SEKARANG |
| `unchecked` dilaporkan | `checked 27/27` dan `27/40` bukan lulus yang sama |
| kedua daftar tanpa header stale | header itu artinya "kami menolak karena basi" |
| satu dokumen 200 JSON | hash diambil dari store lokal; di CI tanpa store ditulis TIDAK DIUJI |

## Angka 29 Sep

· hidup → **AMAN 0 alarm**: watchedHashes 27 · denganDokumen 19 · listBits 131072 · revocation matchesChainNow=true checked 27/27 flagged=6 · suspension matchesChainNow=true checked 27/27 flagged=1 · state dipublikasikan 2026-09-29T08:00:00Z (umur 7,6 jam) · dokumen 0xd0bce6f4… 200 JSON
· kontrol negatif 1 → `--max-age=0` ⇒ **ALARM** `state TUA: 7.6 jam > ambang 0 jam`
· kontrol negatif 2 → `EDGE_BASE_URL=https://tidak-ada.invalid.example` ⇒ **ALARM** `healthz: HTTP gagal TypeError`

## Catatan jujur

Bentuk `/healthz` TEPI berbeda dari signer lokal, dan alarm pertama monitor ini adalah tembakan palsu
hasil sangkaan (`watched` top-level tidak ada; yang ada `counts.watchedHashes`). Bentuk asli
ditulis apa adanya di atas supaya tidak ditebak dua kali (aturan #14). Workflow-nya belum pernah jalan di GitHub:
buktinya adalah cron pertama setelah didorong. Keluar: 0 aman, 1 ALARM. Tidak ada transaksi, tidak ada publish.

## Koreksi terlihat (30 Sep): gawang yang kugeser sendiri

Kriteria urja untuk B67 berbunyi `verify:edge punya pemeriksaan umur state + melewati ambang = merah`.
Malam 29 Sep aku menutup B67 dengan `monitor:edge` dan menandai barisnya selesai — kriterianya sendiri belum
terpenuhi di berkas yang namanya disebut. Dipasang 30 Sep: `verify:edge` kini memeriksa umur state
(`MAX_STATE_AGE_HOURS`, bawaan 26 jam; `publishedAt` tak terbaca = merah, bukan aman). Terukur: **9/0** dengan
umur 10,2 jam; kontrol `MAX_STATE_AGE_HOURS=0` → **MERAH 9/1** menyebut `npm run publish:edge`. Pelajaran yang
layak dicatat: "selesai" diukur dari kriteria yang tertulis, bukan dari pekerjaan yang sudah dilakukan.

Terkait: [[09-Testing/T18 - signer verify-edge.js]], [[09-Testing/T26 - signer sample-check.js]],
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] B67.
