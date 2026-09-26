---
tags: [contributor, claims]
status: active
updated: 2026-09-26
---

# Claims Cheat-Sheet

One page for anyone writing a sentence a person will read: README, slide, UI copy, repo description,
the video. Left column may be said **today**. Right column may not, until the command in the middle
says otherwise. This is the short form; the long reasoning lives in [[08-Results/01 - Evidence and Limits]].

## Boleh ditulis vs jangan

| ❌ jangan ditulis | ✅ tulis ini saja | yang membuktikannya |
|---|---|---|
| "kompatibel 1EdTech" / "OB 3.0 tervalidasi eksternal" | "dibangun mengikuti Open Badges 3.0 / W3C VC 2.0; validator milik 1EdTech **belum kami jalankan**" | `09-Testing` — halaman verifier ada dan bisa diakses, tapi verdict belum pernah didapat |
| "verifikasi berbayar dipakai orang" | "jalur pembayaran agen-ke-agen berjalan on-chain; **kami sendiri yang jadi fasilitatornya**" | `cd signer && npm run x402` → 20 pemeriksaan |
| "penerbit nyata memakai ini" | "satu penerbit demo, **fiktif dan diberi label fiktif**" | `web/src/courses/*` + manifest penerbit demo |
| "AI menilai pekerjaan peserta" (tanpa batas) | "penilai model dengan rubrik penerbit; angkanya **berentang**, keputusan lulus/tidaknya yang stabil" | `npm run judge` (7/7) + `judge-variance` (91-100 pada satu esai yang sama) |
| "kami tidak pernah menyimpan kunci kamu" | "kunci penerbit demo ada di berkas lokal mesin ini; di produksi tempatnya di KMS/HSM" | `signer` README + `agent.js` mencetak peringatan itu sendiri |
| "ijazah on-chain" | "kredensial adalah **dokumen tersignasi di luar chain** yang di-anchor; chain menyimpan bukti, bukan isi" | `01-Architecture` |
| "sistem anti-pemalsuan" | "angka yang **tidak bisa** dipalsukan adalah yang kami uji: byte dibalik → tanda tangan mati" | `node scripts/check.js` → 53/53 |
| "siap produksi" | "prototipe yang berjalan di **testnet 97**; tidak ada apa pun di mainnet" | `02-Contracts` (alamat hanya chain 97) |
| "pasar kursus tempat penerbit berlomba" | "platform pihak ketiga secara struktur; **pasar belum ada**" | tidak ada perintah — memang belum ada bukti |
| "kurikulum dipilih lewat voting" | (tidak ada versi jujurnya — hapus kalimatnya) | — |

## Angka yang boleh dipakai, dan tanggalnya

Semua di bawah **diukur ulang pada 26 Sep 2026** di `HEAD = 42f6342`, bukan dikutip dari dokumen lama:

| angka | sumber perintah |
|---|---|
| 97 Foundry tests lulus / 0 gagal (fork chain 97) | `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` |
| probe web 59/59 · rubric 17/17 · signer check 53/53 · serve-probe 20/20 · x402 20/20 · judge 7/7 | lihat baris perintah di halaman masing-masing di `09-Testing` |
| materi: 2 kursus · 7 modul · 24 lesson · 34 halaman · 412 menit · 28 soal · 2 esai | `npx tsx scripts/inventory.ts` |
| 11 kredensial dipantau, 1 revoked, 1 suspended | `cd signer && npm run anchor` (dry-run) |
| `platformBps() = 1000` (10%), plafon `MAX_BPS = 2500` | `cast call 0xcB00E62B… platformBps()` |
| bitstring 16384 bit / 2048 byte | `LIST_BITS` di `signer/src/statusList.js:34` |
| dokumen kredensial **200, 3202 byte** terbaca dari internet | cloudflared quick tunnel, 26 Sep |

Kalau angkamu tidak ada di tabel ini, ia belum diukur — jalankan perintahnya dulu, baru tulis.

## Aturan tiga baris

1. **Setiap angka punya tanggal.** Angka tanpa tanggal akan terbaca sebagai "masih benar sekarang", dan
   sebagian dari kita sudah dua kali tertipu oleh itu.
2. **Setiap klaim bisa dijalankan dari dalam `app/`.** Kalau buktinya ada di luar repo, kalimatnya
   belum boleh masuk materi.
3. **Keraguan ditulis, bukan dihaluskan.** "belum" adalah kalimat yang sah di depan juri; klaim yang tidak
   bisa dipertanggungjawabkan bukan.

**Related:** [[10-Contributors/00 - Hub Contributors]] · [[08-Results/01 - Evidence and Limits]] ·
[[00-Overview/03 - Decisions]] · [[Index]]
