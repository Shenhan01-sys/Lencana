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
| "kompatibel 1EdTech" / "bersertifikat 1EdTech" | "kredensial dari backend ini **lolos** validator OB 3.0 milik 1EdTech (`vc.1ed.tech`): 14 pemeriksaan, **0 error, 0 warning**, 28 Sep, dan dokumen + `verificationMethod` + kedua daftar status dibaca dari **host tetap** (`lencana-edge…workers.dev`)" — jangan naik jadi "certified"/"conformant" | [[09-Testing/T15 - 1EdTech validator]] — verdict verbatim, buku besar `validator-runs.jsonl`, dan batasnya (validator anggota, bukan sertifikasi; respons tidak merinci pemeriksaan mana yang lulus) |
| "verifikasi berbayar dipakai orang" | "jalur pembayaran agen-ke-agen berjalan on-chain; **kami sendiri yang jadi fasilitatornya**" | `cd signer && npm run x402` → 20 pemeriksaan |
| "penerbit nyata memakai ini" | "satu penerbit demo, **fiktif dan diberi label fiktif**" | `web/src/courses/*` + manifest penerbit demo |
| "AI menilai pekerjaan peserta" (tanpa batas) | "penilai model dengan rubrik penerbit; angkanya **berentang**, keputusan lulus/tidaknya yang stabil" | `npm run judge` (7/7) + `judge-variance` (91-100 pada satu esai yang sama) |
| "kami tidak pernah menyimpan kunci kamu" | "kunci penerbit demo ada di berkas lokal mesin ini; di produksi tempatnya di KMS/HSM" | `signer` README + `agent.js` mencetak peringatan itu sendiri |
| "ijazah on-chain" | "kredensial adalah **dokumen tersignasi di luar chain** yang di-anchor; chain menyimpan bukti, bukan isi" | `01-Architecture` |
| "sistem anti-pemalsuan" | "angka yang **tidak bisa** dipalsukan adalah yang kami uji: byte dibalik → tanda tangan mati" | `node scripts/check.js` → **94/0** (28 Sep, sore) |
| "kuis tidak bisa dicurangi" / "penilaian anti-curang" | "angka kuis **dihitung penerbit** (`POST /grade`: klien mengirim pilihan, server yang menilai terhadap rubriknya) dan tiap usaha punya `attempt_hash` yang tercetak di dokumen hasil. Kunci soalnya memang terbundel ke browser — yang dijaga adalah **keterlacakan**, bukan kerahasiaan soal" | `npm run verify:db` → 28/0 (dua pemeriksaan penolakan `/grade`) · `npm run verify:attempts:live` → 55/0 · batasnya: B80 |
| "peserta lulus dari browser" (tanpa batas) | "satu alur peserta utuh terjadi lewat HTTP dan bisa diulang: enroll → 19 progres → kuis dinilai server → **penerbit menerbitkan dari rekaman itu** → `/results/…` menunjuk `attempt_hash` yang sama" — untuk **esai/praktik angkanya masih laporan klien** (B81), jadi jangan ucapkan "semua nilai" | `npm run verify:attempts:live` (28 Sep) + `npm run validator -- --hash 0xd1dcb1ff… --record` → `outcome: VALID` |
| "siap produksi" | "prototipe yang berjalan di **testnet 97**; tidak ada apa pun di mainnet" | `02-Contracts` (alamat hanya chain 97) |
| "pasar kursus tempat penerbit berlomba" | "platform pihak ketiga secara struktur; **pasar belum ada**" | tidak ada perintah — memang belum ada bukti |
| "kurikulum dipilih lewat voting" | (tidak ada versi jujurnya — hapus kalimatnya) | — |

## Angka yang boleh dipakai, dan tanggalnya

Semua baris bertanggal 28 Sep 2026 diukur ulang hari ini (jalankan `git rev-parse --short HEAD` untuk
commit yang persisnya); baris yang masih membawa tanggal lama berarti memang belum dijalankan ulang
sejak itu. Bukan dikutip dari dokumen lama:

| angka | sumber perintah |
|---|---|
| **104 / 0** fork chain 97 **dan 104 / 0** fork chain 56 · **49 / 0** offline | `npm run test:chains` · `npm test` (tempelan per suite di [[09-Testing/T1 - forge test on chain 97]] dan [[09-Testing/T2 - forge test on chain 56]]) |
| probe web **73/0** (59 + 14 "klien belajar") · signer check **94/0** · serve-probe **48/0** · verify:db **28/0** · **verify:attempts 25/0 offline + 55/0 live** · verify:live-cert **35/0** · verify:edge 5/0 · **e2e 46/0** · **journey 34/0** (pagi) · publish:edge **44/45** rute · x402 20/0 (24 Sep) · judge 7/7 (28 Sep) · rubric 17/17 (28 Sep) | halaman masing-masing di `09-Testing` — angka harness tumbuh bersama korpus, yang otoritatif adalah apa yang dicetak run |
| **`outcome: VALID`, 14 checks, 0 error / 0 warning — 6 kredensial berbeda**, semuanya di host tetap (11 pemanggilan 28 Sep tercatat di buku besar; salah satunya kertas yang **terbit dari rekaman usaha**, `0xd1dcb1ff…`) | `cd signer && npm run validator -- --record` → buku besar `09-Testing/validator-runs.jsonl`; dihitung ulang 28 Sep dengan `node -e` atas berkas itu: 12 baris total, 11 bertanggal 2026-09-28, 6 hash berbeda |
| **10 dari 17** kertas yang kita pegang dapat diperiksa orang sampai tuntas tanpa mesin ini (7 sisanya: 4 menunjuk `127.0.0.1:8787`, 3 menunjuk tunnel `genres-wines-…` yang sudah `ENOTFOUND`) | `cd signer && npm run verify:edge` (28 Sep sore) — angka ini **boleh** dikutip justru karena buruk: dia yang membuat klaim "semua artefak publik" salah (B54). Jalurnya naik 8/14 → 10/17 karena journey dan `verify:attempts:live` menerbitkan di bawah identitas tepi |
| **17** rekaman di store (semua bertanda tangan) · **25** hash dipantau chain · revocation 6 bit · suspension 1 bit · kedua daftar `cocok=true` dengan chain sekarang | `cd signer && npm run verify:edge` (mencetak ketiganya sekaligus) + `npm run check` (25/25 dikenali sebagai attestation kita) + `npm run probe:serve` (`revocation 6 · suspension 1`) — 28 Sep sore |
| materi: 2 kursus · 7 modul · 24 lesson · 34 halaman · 412 menit · 28 soal · 2 esai (26 Sep) | `npx tsx scripts/inventory.ts` |
| `platformBps() = 1000` (10%), plafon `MAX_BPS = 2500` (26 Sep) | `cast call 0xcB00E62B… platformBps()` |
| bitstring 131.072 bit / 16.384 byte | `LIST_BITS` di `signer/src/statusList.js` — angka lama (16.384 *bit*) salah satuan dan ditolak validator |
| ~~dokumen kredensial 200, 3202 byte terbaca dari internet~~ | **tidak berlaku lagi**: itu cloudflared quick tunnel 26 Sep, dan hostnya sudah mati — justru kisah yang membuat B51 ada. Yang sekarang bisa dibuka orang: `https://lencana-edge.hansgunawan775.workers.dev/credentials/<hash>` |

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
