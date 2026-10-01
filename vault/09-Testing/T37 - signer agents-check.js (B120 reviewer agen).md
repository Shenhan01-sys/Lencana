---
tags: [testing, "T37"]
status: active
updated: 2026-10-01
command: npm run verify:agents · npm run verify:agents:live
measured: 2026-10-01
result: bagian B120 — 12/12 tanpa gas · 15/15 live (satu pembayaran x402 nyata ke dompet agen reviewer); tadinya 10/10 · 13/13 sebelum penjaga arah-sebaliknya ditambahkan
---

# T37 - signer agents-check.js — B120: reviewer diperlakukan sebagai penilai (agen AI)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B120 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B120 - Reviewer sebagai penilai]] · **Summary:** [[08-Results/B120 - Executive Summary]] ·
**Keputusan:** D53, D54 di [[00-Overview/03 - Decisions]] · **Pasangan:** [[09-Testing/T36 - signer agents-check.js (B119 sewa agen)]] ·
**Sebelumnya:** B104 di [[09-Testing/T21 - signer db-probe.js]]

## Yang diuji

B104 membangun "angka model baru dihitung sesudah pengesah kedua yang bukan penerbit menandatangani".
Builder (D53/D54): pengesah itu **boleh agen AI**, dengan syarat yang kuusulkan dan disetujui: **agen
ERC-8004 lain, dengan Agent Owner lain**, dari agen yang mengusulkan angka. Pengesahan agen juga satu
aktivitas penilaian — ditagih dengan cara yang sama (B119).

## Identitas di chain 97

| peran | agentId | Agent Owner | dompet agen | tarif dasar |
|---|---|---|---|---|
| agen penilai | 2534 | `0x067cb80aA2b82E6a31De974E0f67D044F3ca0c4f` | `0xFd26Fb1fDdaEB8e9A08ba317586Ca0b3Cc480094` | 2000 |
| agen reviewer | **2542** | `0x99b18cd1849F05420C7f3021129064d74a260C72` | `0x687ae07f8b325F84F420253252Df5031dC326eA2` | 1500 |

Pendaftaran #2542 (1 Okt, `npm run agent:identity -- --role reviewer --apply`): isi gas `0x833461c4…ca22` →
`register()` `0x4ff1681431a52486f8936ae77605980281f0ad4def455f041b22c0542dbfd091` (106.883 gas) →
`setAgentWallet` `0xc457e8e7d46e3c668fe31660462e9609da8bf6a04f1169163fe63444f1a73e3e` →
`setAgentURI` `0x0ec801ecc7b8691d0e4f56ebd798502047c09fcfde903af554720d6df17f5096` →
`setMetadata(lencana.baseTariff=1500)` `0x9c5d28d5d2b01df49cb6da00083ccf552ffb50e1926506ecaa13bc4704c62fb9`.

## Lapis integrasi (HTTP + Postgres nyata + registry)

```
  ok    [B120] agen reviewer #2542 = identitas lain, Agent Owner lain dari agen penilai #2534
  ok    [B120] menunjuk agen PENILAI kursus ini sebagai reviewernya -> 422
  ok    [B120] reviewer agen dengan alamat yang bukan agentWallet-nya -> 422
  ok    [B120] pesan penunjukan yang tidak menyebut agent= -> 401/422
  ok    [B120] penerbit menunjuk agen reviewer #2542 -> 200, pemiliknya tercatat
  ok    [B120] menyewa agen REVIEWER kursus ini (#2542) sebagai penilainya -> 422
  ok    [B120] keadaan tersimpan: tidak ada agen (atau Agent Owner) yang sekaligus penilai sewaan dan reviewer di web3-dasar-2026
  ok    [B120] pengesahan oleh reviewer agen tanpa label -> 401
  ok    [B120] reviewer agen #2542 menyesuaikan 80 -> 92, label sedang -> 200
  ok    [B120] tagihan aktivitas mengesahkan: 1725 = tarif 1500 x 1,15 (sedang), ke dompet agen reviewer
  ok    [B120] sesudah disahkan reviewer agen, usaha itu dihitung gerbang
  ok    [B120] baris nyata: angka yang diturunkan = angka reviewer agen, dan provenannya menyebut pengesahan adjusted
```

## Lapis dengan uang sungguhan (`--live`)

```
  info  bayar tagihan mengesahkan #18: 0x1132023e15783fd980090963357a1f718959ebbcdf0a04b06dc4545754ef566f · split 0x5baeb248dc4454b61a0cd513f34f448591413035e0b6e0047511501ccd4b9f93
  ok    [B120] penerbit membayar tagihan mengesahkan lewat x402 -> 200, status paid dengan struk settlement
  ok    [B120] dompet agen mengesahkan bertambah tepat bagiannya (1553 = tagihan - bagian platform 1000 bps), dibaca dari chain
  ok    [B120] tagihan mengesahkan yang sudah lunas tidak bisa dibayar dua kali -> 409
  B119 25/25 · B120 15/15
AGEN SEWA LIVE HIJAU — 40 pemeriksaan, 0 gagal
```

Run pertama hari yang sama (sebelum penjaga arah-sebaliknya, 13/13): tagihan #10, settle
`0x5b9ceb56c801f36ad09c6a24da8619d54261ec351c066598bb86fb7f1a3d99f8`, split
`0xbd5249b4b57bcce37ba7e23012f2b20d7ab5da8d9bc77d788f29098baf8a3b3e`. Kedua pembayaran ada di chain; baris
tagihannya sendiri ber-`origin=test` dan sudah dibersihkan (lihat di bawah).

## Satu cacat yang ditemukan saat memeriksa pemetaan (1 Okt sore)

Sesudah harness hijau, kubaca isi `review_roles` langsung: **agen #2534 tercatat sebagai reviewer di
`web3-dasar-2026` — kursus yang sama tempat ia disewa sebagai penilai.** Itu persis yang dilarang B120.

- **Asalnya:** run harness pertama (yang 16 merah karena pesan sewa dibuat dua kali — T36). Sewa gagal,
  jadi `agent_hires` kosong, jadi pemeriksaan "menunjuk agen penilai sebagai reviewer → 422" justru
  **lolos 200** dan barisnya tersimpan. Run sesudahnya hijau karena sewa berhasil — tapi tidak ada yang
  membaca keadaan yang sudah tersimpan.
- **Lubang di kode, bukan hanya di data:** aturannya hanya dijaga saat **menunjuk reviewer**. Menunjuk dulu
  lalu menyewa agen yang sama sebagai penilai tetap lolos.
- **Perbaikan:** `hire` di `signer/src/agents.js` kini menolak agen (atau Agent Owner) yang sudah jadi
  reviewer agen kursus itu (`reviewerAgentsFor` di `signer/src/db.js`), dan harness mendapat dua pemeriksaan:
  menyewa #2542 sebagai penilai → 422, dan **keadaan tersimpan** dibaca dari kedua tabel.
- **Kontrol negatif:** sebelum baris residu dihapus, harness yang baru **merah 34 / 3 gagal** — sewa #2534
  ditolak 422 (penjaga bekerja) dan pemeriksaan keadaan menunjuk baris `0xFd26…0094 / 2534`. Lalu baris itu
  dihapus (`delete from review_roles where course_id='web3-dasar-2026' and agent_id='2534'` → 1 baris), dan
  harness **34/0**, live **40/0**.
- Pengaman ketiga yang tetap ada sejak awal: `reviewEssay` menolak reviewer agen yang sama atau satu pemilik
  dengan agen yang mengusulkan angka usaha itu — jadi baris residu tidak pernah bisa dipakai #2534 untuk
  mengesahkan nilainya sendiri.

## Kebersihan artefak uji (1 Okt)

`npm run cleanup -- --apply` dua kali hari ini: pertama **34 enrollment `origin=test`** beserta usaha, progres,
dan barisnya — `agent_charges` (12 baris, semuanya milik usaha uji, 2 di antaranya lunas) dan
`judgement_reviews` uji ikut terhapus lewat `on delete cascade`; lalu **5** lagi sesudah run harness
berikutnya dan `npm run sync:numbers` penuh. Keadaan akhir, dikueri ulang: **`origin=test` → 0**,
`agent_charges` → 0, `judgement_reviews` → 1 (pengesahan kertas B104 yang memang terbit, bukan artefak uji),
`agent_hires` → 1 (#2534), reviewer agen → hanya #2542.
Yang sengaja tetap: sewa #2534 dan penunjukan reviewer #2542 untuk `web3-dasar-2026` — konfigurasi penerbit
demo, bukan artefak uji.

## Regresi B104 — tidak tergeser

`reviewEssay` (`signer/src/db.js`) diubah urutannya: penunjukan sekarang dibaca **sebelum** tanda tangan
diperiksa, karena ia menentukan apakah label wajib. `npm run verify:db` sesudahnya: **DB HIJAU 70/0** —
sama dengan sebelum B120, termasuk pengesah manusia (tanpa `agentId`) yang tetap boleh.

## E2E — panduan untuk builder

- [ ] `cd app/signer && npm run agent:identity -- --role reviewer` — #2542, pemilik `0x99b1…0C72`, dompet `0x687a…6eA2`, tarif 1500
- [ ] pastikan pemilik #2542 **berbeda** dari pemilik #2534 (`npm run agent:identity`)
- [ ] `npm run verify:agents` → baris `B120 12/12`

| KPI (dari AC) | target | hasil 1 Okt |
|---|---|---|
| reviewer agen = agen lain, pemilik lain | ditolak kalau sama — dua arah | agen penilai sebagai reviewer → 422; reviewer disewa sebagai penilai → 422; keadaan tersimpan bersih |
| dompet reviewer harus `agentWallet` identitasnya | ditolak kalau beda | 422 |
| label wajib dipilih dan ditandatangani reviewer agen | 401 tanpa label | 401 |
| angka akhir = angka reviewer | 92, bukan 80 | 92 |
| aktivitas pengesahan ditagih | 1500 × 1,15 = 1725 | 1725, dibayar +1553 ke dompet reviewer |

## Batas

- Pemeriksaan "Agent Owner berbeda" dibandingkan dengan **agen penilai yang disewa untuk kursus itu**
  (`agent_hires`) saat menunjuk reviewer, dan dengan **reviewer agen kursus itu** (`review_roles`) saat
  menyewa penilai — bukan dengan seluruh registry: dua identitas milik satu orang dengan alamat berbeda tidak
  bisa dideteksi alat ini.
- Pengesah **manusia** (tanpa `agentId`) tetap boleh — D53 membolehkan agen, tidak mewajibkannya.
- ValidationRegistry ERC-8004 belum ada di chain 97, jadi pengesahan tidak dicerminkan ke sana (B118 F3).
