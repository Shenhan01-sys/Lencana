---
tags: [testing, "T11"]
command: npm run judge
measured: 2026-09-24
result: 7 checks / 0 failed; hollow = 8/100
---

# T11 - `npm run judge` (penilai model + kontrol negatif)

**Perintah:** `cd signer && npm run judge` (kunci lewat env; tanpa kunci dia **melempar**, tidak
mundur diam-diam). **Harness penuh terakhir:** 24 Sep — `7 / 0 gagal`.

Intinya satu baris: esai yang **lancar tapi kosong** harus **GAGAL** di bawah `passMark` penerbit.
Terukur: hollow **8/100** vs substantif **99** — jadi angka tinggi bukan hadiah untuk teks yang
enak dibaca, dan "AI menilai" di sini berarti perangkat yang bisa menolak.

## Jalur yang sama dipakai sungguhan pada 27-28 Sep

Kredensial `0xfe4f7161…` (yang lolos `vc.1ed.tech`) esainya dinilai lewat jalur ini:
mekanis **60/100 = 3 dari 5 tanda** (panjang tulisan ✓, alamat 0x ✗, URL ✗, fungsi konkret ✓,
batas kesimpulan ✓), lalu model `openai/gpt-oss-120b` pada `temperature 0` memberi **99**, komposit
**92** vs `passMark` 70. Ini bukti jalur penilaiannya hidup, bukan bukti kualitas tulisan saya —
peserta demo kita tetap fiktif dan itu tertulis di [[08-Results/01 - Evidence and Limits]].

**Lihat juga:** [[04-Signer-Service/S5 - Grading and the model judge]] · [[05-Course-Content/K4 - Scoring without the platform deciding]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
