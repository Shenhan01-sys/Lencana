---
tags: [testing, "T9"]
command: npm run anchor
measured: 2026-09-28
result: idempotent: 0 anchor baru, 14 watched
---

# T9 - `npm run anchor` (hash daftar status di-timestamp di chain)

**Hub:** [[09-Testing/00 - Hub Testing]] · **AC:** kriteria P1 di [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Bagian:** [[04-Signer-Service/S2 - Status lists from chain state]]

**Perintah:** `cd signer && npm run anchor` (tanpa `--dry-run` menulis; `--dry-run` hanya membaca).
**Terakhir dijalankan:** 28 Sep 2026 — `14` kredensial dipantau, kedua hash yang SAAT INI tersaji
sudah ter-anchor, dan run melaporkan **"0 anchor baru ditulis"** (idempoten, bukan tidak melakukan apa-apa).

Yang ter-anchor, dibaca dari chain:

| daftar | hash bitstring | jam on-chain |
|---|---|---|
| revocation | `0x168c327e1ef3cf81…` | `1790492833` |
| suspension | `0x6256f66398be99a7…` | `1790492842` |

Dua penulisan terjadi sebelumnya di hari yang sama (27 Sep) setelah dua hal berubah: satu revocation
tambahan (`0x21554204…`, 45.869 gas) dan panjang bitstring yang naik ke 131.072 entri.

## Batas yang harus ikut terbaca setiap kali nomor ini dikutip

Anchor membuktikan **bit mana yang menyala pada suatu jam**, BUKAN **siapa saja yang masuk daftar**.
Anggota baru dengan bit 0 tidak mengubah satu byte pun (terukur 26 Sep: 5 -> 8 anggota, hash tetap),
jadi keanggotaan disaksikan `/healthz` (`watched`, `flagged`, `unallocated`, peta slot) dan oleh
`check.js` yang menuntut chain mengenali setiap kredensial yang dipantau.

**Lihat juga:** [[04-Signer-Service/S2 - Status lists from chain state]] · [[04-Signer-Service/S3 - Two status lists]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
