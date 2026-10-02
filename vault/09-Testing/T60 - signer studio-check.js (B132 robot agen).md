---
tags: [testing, "T60"]
status: active
updated: 2026-10-03
command: npm run verify:studio
measured: 2026-10-03
result: BENGKEL AGEN HIJAU — 28 pemeriksaan / 0 gagal (3 Okt, B132; run pertama 28 / 0 hijau)
---

# T60 - signer studio-check.js — B132: robot agen

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B132 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B132 - Robot agen rakitan, rupa di chain, agen didaftarkan sendiri]] ·
**Uji on-chain + peramban:** [[09-Testing/T61 - Uji on-chain dan peramban bengkel agen (B132)]] ·
**Summary:** [[08-Results/B132 - Executive Summary]] · **Keputusan:** D68

`signer/scripts/studio-check.js`, dijalankan `npm run verify:studio` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key,
`RPC_URL`, `ISSUER_ADDRESS`. Server sendiri di port bebas (`LANCENA_ORIGIN=test`). **Tanpa gas:** pendaftaran agen sungguhan di
chain dibuktikan sekali di T61, bukan di setiap baterai. Tiga alamat sekali-pakai; baris perannya dihapus di F.

| bagian | yang dibuktikan |
|---|---|
| A — `web/src/robot.ts` | 864 kombinasi suku cadang (4 kepala × 4 mata × 3 badan × 3 alat × 6 warna) tergambar tanpa `undefined`/`NaN`; gambar statis terbesar **1.698 karakter** (< 4 KB, murah disimpan di chain); deterministik; data hidup (mata, lampu) mengubah gambar; teks pelat dada di-escape; `parseAvatar` menolak bidang asing, suku cadang tak dikenal, versi lain; `cleanName` 1–40 karakter tanpa karakter kendali; `withAvatar` tidak menyentuh `registrations` (menunjuk balik), `description`, `type` |
| E — `ownerOverview` | rupa sah dari berkas registrasi terbaca di dasbor; rupa bercacat → null; gambar hanya bila SVG data URI |
| B — templat registrasi | `GET /agents/2547/registration-template?role=grader-self` menunjuk balik ke #2547 di registry chain 97; kalimat peran "registered by its owner" dan "never signs or revokes credentials"; peran tak dikenal → 400 |
| C — klaim swalayan | agentId bukan angka → 400 (sebelum masuk pola pesan); kunci lain → 401; transaksi yang tidak ada → 400; struk `register()` #2546 (didaftarkan kunci platform) diklaim akun lain → 403; akun Peserta → 403 karena perannya |
| D — gas uji | akun tanpa peran dan tanpa agen → 403; akun Peserta → 403 |
| F — bersih-bersih | `account_roles` alamat uji: dihapus, sisa 0 (kueri ulang) |

## Hasil (3 Okt)

```
BENGKEL AGEN HIJAU — 28 pemeriksaan, 0 gagal
```

Regresi pada hari yang sama sesudah `signer/src/owner.js` berubah: `verify:owner` 32/0.

**Batas klaim:** jalur positif klaim dan tetes gas untuk akun Agent Owner baru membutuhkan transaksi sungguhan — dibuktikan T61
(agen #2548), tidak diulang di baterai.
