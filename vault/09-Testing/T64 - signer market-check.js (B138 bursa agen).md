---
tags: [testing, "T64"]
status: active
updated: 2026-10-03
command: npm run verify:market
measured: 2026-10-03
result: BURSA AGEN HIJAU — 23 pemeriksaan / 0 gagal (3 Okt, B138; run pertama 22 / 1 — tembakan palsu harness, lihat di bawah)
---

# T64 - signer market-check.js — B138: bursa agen

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B138 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B138 - Bursa agen di dasbor Penerbit]] ·
**Uji peramban:** [[09-Testing/T65 - Uji peramban bursa agen (B138)]] ·
**Summary:** [[08-Results/B138 - Executive Summary]] · **Keputusan:** D70

`signer/scripts/market-check.js`, dijalankan `npm run verify:market` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key, `RPC_URL`,
`ISSUER_PRIVATE_KEY` (dari `app/.env`, tidak dicetak). Server sendiri di port bebas (`LANCENA_ORIGIN=test`). **Tanpa gas.** Tidak
meninggalkan baris baru: satu-satunya tulisan adalah sewa ulang #2534 untuk `web3-dasar-2026` yang sudah ada (idempoten).

| bagian | yang dibuktikan |
|---|---|
| A — `web/src/market.ts` | alasan konflik halaman untuk setiap aturan server: tanpa hak `hire=1`/`appoint=1`; agen tak layak; agen milik atau dioperasikan penyewa (B129 — kunci penerbit sendiri tidak terkena); pengesah kursus itu atau pemiliknya sama dengan agen pengesah (B120, sewa); penilai kursus itu atau pemiliknya sama dengan agen penilai (B120, tunjuk); "sudah bekerja di sini" — kecuali dompet agen berubah sejak disewa (sewa ulang memang perlu); `teamOf` hanya kursus itu; urut pengalaman / harga (tanpa tarif paling akhir) / terbaru, saring layak + otak, cari nama atau `#nomor` |
| B — `signer/src/market.js` `marketEntry` | bidang entri = yang dijanjikan saja; teks registrasi dibersihkan karakter kendali dan dipotong; gambar hanya SVG data URI; tempat kerja dengan tanda `stale`; rapor (penilaian, pengesahan, keputusan pengesah atas usulan agen INI saja, label); otak hanya diiklankan bila dicatat pemilik sekarang; agen yang dikendalikan penerbit tidak layak (D54) |
| C — `GET /agents/market` | 200 dan memuat semua agen yang dikenal platform (dibandingkan dengan `platform_agents` ∪ `agent_hires` ∪ `review_roles`); tidak ada kunci data peserta / tanda tangan / penyewa / tagihan; tidak satu pun alamat peserta (yang bukan pemilik/dompet agen) muncul; layak-sewa = `GET /agents/<id>/rates`; #2534 menilai dan #2542 mengesahkan `web3-dasar-2026`; otak tercatat ikut tampil; panggilan kedua dari cache; sewa (idempoten) membatalkan cache; halaman dan server sepakat menolak #2542 sebagai penilai kursus yang ia sahkan (halaman `reviewer-here`, server 422) |

## Hasil (3 Okt)

```
BURSA AGEN HIJAU — 23 pemeriksaan, 0 gagal
```

Pembacaan bursa: **6 agen** dari registry dalam 1,5–1,7 detik (#2534, #2542, #2546, #2547, #2548, #2549), panggilan kedua dari cache.

**Koreksi terlihat — run pertama 22 / 1 karena harness, bukan kode.** Pemeriksaan "tidak ada jejak data peserta" versi pertama
mencari kata `"body"` di TEKS jawaban dan menembak `avatar.body` — badan robot (suku cadang rakitan B132), bukan teks esai. Kini kunci
ditelusuri dari JSON dengan objek `avatar` dilewati (isinya sudah divalidasi `parseAvatar`: hanya `v/head/eyes/body/tool/color`).

**Batas klaim:** bursa hanya memuat agen yang sudah dikenal platform; penolakan akhir tetap di server (`signer/src/agents.js`).
