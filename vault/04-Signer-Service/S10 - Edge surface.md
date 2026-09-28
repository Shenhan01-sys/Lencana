---
tags: [signer, edge, cloudflare, availability]
status: active
updated: 2026-09-28
---

# S10 - Edge surface (`cloudflare/worker.mjs` + Workers KV)

Menutup **B51**. Dibangun 28 Sep. Ini lapis yang membuat klaim di
[[09-Testing/T15 - 1EdTech validator]] tetap benar minggu depan, bukan cuma hari ini.

## Masalahnya bukan "belum ada hosting", tapi "URL dicetak saat terbit"

Setiap kredensial menyimpan URL miliknya sendiri: `verificationMethod`,
`credentialStatus.statusListCredential`, `achievement.criteria.id`, `result[0].id`. Empat-empatnya
ditulis **saat penerbitan** dan tidak pernah berubah. Selama signer hidup di laptop lewat quick
tunnel, setiap kertas yang kita terbitkan mewarisi umur tunnel itu.

Terbukti, bukan dikhawatirkan: kredensial `0xfe4f7161…` yang 27 Sep mengembalikan `outcome: VALID`
sudah tidak bisa dibuka siapa pun sejak ~07:00 28 Sep (`getaddrinfo ENOTFOUND` pada domain
`trycloudflare.com`-nya, sementara origin di 8787 masih hidup). Verdict-nya tetap fakta riwayat —
ada di `validator-runs.jsonl` — tapi artefaknya tidak bisa diperiksa ulang oleh orang lain. Itu
persis kegagalan yang kita jual sebagai "platform lama membuat pencabutan tak kelihatan": kita
membuat validitas tak kelihatan dengan cara yang berbeda.

**Aturan yang lahir dari sini: jangan menerbitkan di bawah host sementara.** Tunnel tetap dipakai
untuk mengukur (`check`, `probe`, `validator` lokal), bukan untuk mencetak artefak.

## Bentuknya: satu pembacaan, nol tanda tangan

| | signer (Node, laptop) | tepi (Worker + KV) |
|---|---|---|
| menandatangani | ya — kanonikalisasi JSON-LD + Ed25519 | **tidak pernah** |
| menyusun daftar status | `renderList()` per penerbitan | menyajikan blob hasil `publish` |
| membaca chain | saat menyusun | **saat permintaan masuk**, untuk kedua daftar |
| kunci | ada di `.store/keys`, tidak keluar repo | tidak ada — yang di-bind hanya alamat kontrak dan RPC publik |

Kenapa tidak "jalankan signer di worker saja": kripto murni **133 ms/daftar** (median 5 run, 121–149;
`npm run measure:signing`), dan Workers Free menagih **10 ms CPU per invokasi**. Menandatangani di
tepi bukan melanggengkan batas itu — jadi `publish` yang menandatangani, dan tepi hanya menjadi
sajian. Batas konsekuensinya ada di bawah, tidak kami sembunyikan.

## Yang membuat ini bukan "tempel file ke bucket"

Tepsi menolak menyajikan daftar yang tidak cocok dengan chain. Untuk kedua daftar, setiap permintaan
mengambil `statusOf(bytes32)` per hash yang dipantau (dirapel, **6 panggilan paralel** — angka yang
datangnya dari jalur x402: 25 panggilan serentak ke RPC publik mengembalikan separo kosong) dan
membandingkan bit yang akan disajikan dengan bit yang seharusnya menurut chain sekarang.

```
satu bit pun berbeda  ->  503 + x-lencana-stale: chain-diverged  (bukan daftar lama yang masih sah)
belum diterbitkan     ->  503 + x-lencana-stale: not-published
cocok                 ->  200 + cache-control: no-store
```

`expired` sengaja **tidak** ikut menentukan bit: itu keputusan kredensial, bukan keadaan daftar
([[04-Signer-Service/S3 - Two status lists]]).

## Konsekuensi yang harus disebut, bukan disembunyikan

Klaim kita bergeser dari "daftar disusun ulang setiap permintaan" menjadi **"daftar disusun ulang
setiap penerbitan, dan setiap permintaan memeriksa kecocokannya dengan chain"**. Yang kedua masih
membuktikan ketiadaan pencabutan sunyi — daftar basi ditolak, bukan disajikan — tapi tidak lagi
menutup celah "kita berhenti menerbitkan". Kalau `publish` tidak dijalankan lagi, tepinya jujur
menolak, bukan jujur menyegarkan.

## Bug yang ditangkap publish, dan kenapa ia kelas yang berbahaya

Versi pertama mengembalikan **objek**, bukan `Response`, di tiga rute (`/issuers/`, `/criteria/`,
`/results/`): `return doc ?? notFound(...)`. Yang bersampul `json(...)` jalan; ketiganya mati dengan
`error-1101` — Cloudflare menutupinya sebagai "Worker threw exception", dan dari luar gejalanya
identik dengan "dokumennya tidak ada di KV". Padahal KV-nya berisi.

Penyebabnya satu karakter bentuk, dan hanya kelihatan kalau penerbit **membaca balik lewat URL yang
akan diklik orang**, bukan lewat KV. `publish` karena itu memverifikasi lewat HTTP terhadap
`EDGE_ROUTES`, bukan `GET` namespace. Rute yang mengembalikan `notFound` masih kucocokkan pesannya
(`/issuers/<slug>` dari state, bukan `<slug>` literal yang tidak bisa disalin pembaca).

## Rute

Deklarasi tunggal di `signer/src/edgeKeys.js` — `KV_KEYS`, `EDGE_ROUTES`, `PURPOSES`,
`CACHE_TTL_SECONDS` — supaya penulis (publish) dan pembaca (worker) tidak bisa punya prefiks berbeda.
Dua prefiks yang berbeda di dua berkas adalah cara paling ramping untuk menghasilkan 404 atas dokumen
yang ada, dan itu sudah kupelajari di tempat lain ([[04-Signer-Service/S8 - Criteria document]]).

```
/healthz                        keadaan + matchesChainNow per daftar
/issuers/<slug>                 dokumen penerbit (sumber kunci verifier)
/credentials/status/<purpose>   daftar, ditolak kalau chain berbeda
/credentials/<hash>             kredensial   (?format=record = baris store)
/criteria/<courseId>            kertas rubrik penerbit
/results/<courseId>/<hash>      angka + asal-usul angka
```

## Batas yang masih ada

- **Satu titik kendali.** Namespace KV, worker, dan agen `agent-edge` bernaung di satu akun Cloudflare
  milik satu orang. Token hanya ada di luar repo (`%LOCALAPPDATA%\Lencana-CF\`, tidak pernah di argv,
  tidak pernah di git — `grep cfat_ app/` kosong).
- **Kuota.** Workers Free 100.000 permintaan/hari dan 10 ms CPU; `no-store` membuat setiap pembukaan
  daftar membaca chain lagi. Untuk demo hackathon cukup; untuk produk ini alasan lapis ini perlu
  cache yang dikey-kan pada state, bukan pada URL.
- **Teopi tidak tahu kalau ia sendirian.** Tidak ada pemantauan eksternal yang menjalankan
  `publish` kalau kita lupa; yang ada baru pemeriksaan dalam (503), bukan alarm.
- **Korpus lama ikut terbit.** 5 dari 7 dokumen yang disajikan masih bermuka `credentialStatus` dua
  entri (terbit sebelum perbaikan satu-objek) — bentuknya salah menurut skema, dan itu sejarah yang
  biarkan, bukan kita poles jadi hijau.

**Related:** [[09-Testing/T16 - npm run publish edge]] · [[09-Testing/T15 - 1EdTech validator]] ·
[[04-Signer-Service/S2 - Status lists from chain state]] · [[04-Signer-Service/S7 - Server routes and lifecycle]] ·
[[11-Refactoring/RF6 - Core System, Backend and Contracts]]
