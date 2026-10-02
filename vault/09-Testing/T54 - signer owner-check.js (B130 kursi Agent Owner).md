---
tags: [testing, "T54"]
status: active
updated: 2026-10-02
command: npm run verify:owner
measured: 2026-10-02
result: AGENT OWNER HIJAU — 32 pemeriksaan / 0 gagal (2 Okt, B130; run pertama 32 / 0 hijau, diulang 32 / 0 sesudah agen #2546 dan #2547 dicetak)
---

# T54 - signer owner-check.js — B130: kursi Agent Owner

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B130 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B130 - Kursi Agent Owner, agen untuk akun, dasbor Agent Owner]] ·
**Uji on-chain + peramban:** [[09-Testing/T55 - Uji on-chain dan peramban dasbor Agent Owner (B130)]] ·
**Summary:** [[08-Results/B130 - Executive Summary]] · **Keputusan:** D65

`signer/scripts/owner-check.js`, dijalankan `npm run verify:owner` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key, `RPC_URL`,
`DEMO_TOKEN_ADDRESS`, `ISSUER_ADDRESS`, kunci kedua Agent Owner demo dan alamat dompet operasional kedua agen demo. **Tanpa gas:**
agen demo dipakai apa adanya (#2534 milik `AGENT_OWNER_*`, dompet = kunci operasional lain; #2542 milik `REVIEWER_OWNER_*`). Jalur
"dompet dikosongkan sesudah pemindahan" diuji pada fungsi agregasinya dengan identitas buatan — di chain ia butuh pencetakan +
pemindahan sungguhan, dan itu dibuktikan sekali oleh T55, bukan di setiap baterai.

| bagian | yang dibuktikan |
|---|---|
| A — `/owner/overview` | tanpa pesan → 400; tanda tangan keperluan lain (`lencana-roles`) → 400; kunci lain atas nama pemilik → 401; akun tanpa agen → 403; replay → 401 |
| B — pemilik #2534 | → 200; hanya agennya sendiri (#2534, bukan #2542); dompet dari registry = kunci operasional agen → `walletState: other`; layak disewa tanpa alasan; tarif dasar 2000 dalam token platform; tangga tujuh label naik dengan label pertama = tarif dasar; berkas registrasi menunjuk balik + bernama; sewa `web3-dasar-2026` terbaca; tagihan jatuh tempo/lunas dan jumlah penilaian = **hitungan ulang database**; sebaran label tujuh anak tangga; bukan cetakan platform; saldo gas terbaca; tanpa teks esai, pesan, atau tanda tangan |
| C — pemilik #2542 | → hanya #2542; penunjukannya sebagai pengesah `web3-dasar-2026` terbaca; dompetnya = kunci operasional pengesah |
| D — `/owner/gas` | tanpa pesan → 400; akun tanpa agen → 403; pemilik agen yang tidak dicetak platform (#2534) → 403 |
| E — agregasi | dompet kosong → `hireProblem` "has no agentWallet"; dompet = pemilik → layak; `ownerOverview`: `walletState unset` + tidak layak + alasan ikut, sewa dengan dompet lama ditandai `stale`, gas menipis dilaporkan; dompet = pemilik → `walletState owner` |

```
AGENT OWNER HIJAU — 32 pemeriksaan, 0 gagal          (B130, run pertama, 2 Okt)
AGENT OWNER HIJAU — 32 pemeriksaan, 0 gagal          (sesudah #2546 dan #2547 dicetak, 2 Okt)
```

`agentFacts` kini memakai `hireProblem` (aturan sewa yang sama, sebagai fungsi murni) — regresi `verify:agents` 34/0 sesudahnya.
Yang tidak diuji di sini: halaman dan transaksi pemilik (T55); transaksi dari dompet Privy (menunggu login builder).
