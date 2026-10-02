---
tags: [testing, "T46"]
status: active
updated: 2026-10-02
command: npm run verify:paywall · npm run verify:paywall:live
measured: 2026-10-02
result: PAYWALL HIJAU — 24 pemeriksaan / 0 gagal (tanpa gas; masuk baterai; 2 Okt sesudah B126 +1 asersi kelas uji, B125 23 / 0) · --live 31 / 0 di chain 97 (faucet, settlement + pembagian, order paid, kelas terbuka, tanpa tagihan kedua)
---

# T46 - signer paywall-check.js — B125: bayar dulu baru masuk kelas

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B125 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B125 - Bayar dulu baru masuk kelas]] · **Summary:** [[08-Results/B125 - Executive Summary]]

`signer/scripts/paywall-check.js`. Server sendiri dengan `ENROLL_PAYWALL=on` dan `LANCENA_ORIGIN=test` (baris uji dibersihkan
`npm run cleanup`). Kebalikan dari tujuh harness lain yang menyalakan servernya dengan `ENROLL_PAYWALL=off` karena mereka menguji
penilaian, bukan pembayaran.

| bagian | yang dibuktikan |
|---|---|
| A | `/healthz` melaporkan paywall `on`; alamat token di `web/src/pricing.ts` = `DEMO_TOKEN_ADDRESS` server; setiap kursus katalog punya harga; harga = keputusan builder (10 / 25 LDC-demo) |
| B | peserta baru: `POST /enroll` → 402 dengan harga dari satu sumber, `accepts` exact di jaringan 97 (asset LDC-demo, payTo kontrak pembagian, jumlah = harga), `www-authenticate`; 402 tidak membuat enrollment (rekaman bertanda tangan: nol kursus) |
| C | penolakan sebelum gas keluar: X-PAYMENT rusak, token lain, bukan ke kontrak pembagian, di bawah harga, pembayar bukan peserta → 402; pembayaran tampak sah tapi pesan enroll ditandatangani kunci lain → **401**, settlement tidak dicoba |
| D | enrollment yang ada sebelum harga berlaku: enroll lagi → 200 tanpa bayar, kuis tetap 201; peserta yang belum membayar tidak bisa mengerjakan kuis |
| E | faucet: tanpa pesan → 400, tanpa tanda tangan → 401, tanda tangan untuk keperluan lain → 400 |
| F (`--live`) | faucet 50 LDC-demo (tx), faucet kedua → 429; bayar + enroll → 200 dengan tx settlement + tx pembagian dan `X-PAYMENT-RESPONSE`; saldo peserta turun tepat sebesar harga (50 → 40); rekaman memuat order `paid` dengan tx yang sama; kuis terbuka (201); enroll kedua → 200 tanpa tagihan kedua |

```
PAYWALL HIJAU — 23 pemeriksaan, 0 gagal          (B125)
PAYWALL HIJAU — 31 pemeriksaan, 0 gagal (live)   (B125)
PAYWALL HIJAU — 24 pemeriksaan, 0 gagal          (2 Okt sesudah B126)
```

**B126 (2 Okt):** bagian A kini juga menegaskan kelas uji `uji-bayar-2026` berharga 5 LDC-demo, punya manifest, dan tidak
tampil di katalog publik (`LISTED_COURSES`).

Batas klaim (C4): LDC-demo adalah koin uji dengan `mint` terbuka — yang dibuktikan adalah pembayaran berpindah, terbagi, dan kelas
terbuka sesudahnya; bukan pendapatan dan bukan harga pasar.
