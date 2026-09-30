---
tags: [testing, "T35"]
status: active
updated: 2026-10-01
command: npm run verify:agent
measured: 2026-10-01
result: AGEN HIJAU — 23 pemeriksaan / 0 gagal (baca-saja, chain 97)
---

# T35 - signer agent-identity-check.js (agen penerbit punya identitas ERC-8004 yang bisa diperiksa orang lain)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B118 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Keputusan:** D53 di [[00-Overview/03 - Decisions]] · **Arsitektur:** [[01-Architecture/01 - Architecture]] ·
**Proses bisnis:** [[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]] · **AC:** —

## Kenapa harness ini ada

Narasi Lencana menjanjikan penerbit yang berupa agen dengan identitas ERC-8004. Sampai 1 Okt kode tidak
memanggil registry ERC-8004 mana pun dan agen kita memegang nol identitas (baris B118). Builder
memutuskan (D53): pakai registry yang **sudah disediakan BNB**, dan pisahkan peran **Agent Owner**
(pemilik identitas) dari attester. Harness ini membuktikan hasil F1 dari chain dan dari URL publik —
tidak dari catatan kita.

## Yang dibangun (1 Okt)

| bagian | berkas | isi |
|---|---|---|
| modul | `signer/src/erc8004.js` | alamat registry BNB (97 dan 56), ABI yang **ada di versi terdeploy**, tipe EIP-712 `AgentWalletSet`, berkas registrasi, `readAgent()` |
| pendaftaran | `signer/scripts/agent-identity.js` (`npm run agent:identity`, `-- --apply`) | isi gas Agent Owner → `register()` → `setAgentWallet(attester)` dengan tanda tangan EIP-712 attester → `setAgentURI(data: URI)`; tiap transaksi disimulasikan dulu, tiap langkah membaca chain dulu (idempoten) |
| gerbang penerimaan | `signer/scripts/admit.js` (`npm run admit -- --agent-id N [--address 0x…] [--apply]`) | `addIssuer` hanya untuk `agentWallet` sebuah identitas ERC-8004 yang registrasinya menunjuk balik; alamat lain, identitas yang tidak ada, atau alamat polos ditolak |
| klaim penerbit | `web/src/manifest.ts` | `issuer.agent = { registry: "eip155:97:0x8004A818…", agentId: "2534" }` — **di luar** `manifestHashOf`/`rubricHashOf` |
| verifikasi | `web/src/verify.ts` bagian 8b | membaca `ownerOf`, `getMetadata(agentId,"agentWallet")`, `tokenURI` dan membandingkan dompet agen dengan attester kertas; hasilnya di `report.issuerAgent` + satu kalimat alasan. **Verdict tidak berubah** |
| harness | `signer/scripts/agent-identity-check.js` (`npm run verify:agent`) | 23 pemeriksaan di bawah; masuk `sync:numbers` sebagai harness ke-18 |

## Transaksi di chain 97 (1 Okt, atas acc builder)

| langkah | tx | gas |
|---|---|---|
| platform mengisi gas Agent Owner 0,005 tBNB | `0x286c64de41155508d375ef43df74d75d8435552761484db5a23cf9612e7bcde9` | 21.000 |
| Agent Owner `register()` → **agentId 2534** | `0x5b31a458feeaf734bd6fe8c19644f56b1ed79e23a9eb623633cd5652267554e6` | 106.883 |
| Agent Owner `setAgentWallet(2534, attester, …)` dengan tanda tangan EIP-712 attester | `0x88f1b74ad3c831f32ff85d972e1e4072e8add02442eb531c474be2cbf6229048` | 50.428 |
| Agent Owner `setAgentURI(2534, data:…)` (1.101 karakter) | `0xd881fdb2f6614118eea78ee7448cb21f98b9e7c0c035d53540d2db9c14f5bca0` | 859.004 |

- IdentityRegistry BNB: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (implementasi di balik proxy saat diukur:
  `0x7274e874CA62410a93Bd8bf61c69d8045E399c02`; `eip712Domain` = `ERC8004IdentityRegistry` v1 chain 97).
- **Agent Owner** `0x067cb80aA2b82E6a31De974E0f67D044F3ca0c4f` — kunci acak baru (bukan turunan label),
  disimpan di `app/.env` sebagai `AGENT_OWNER_PRIVATE_KEY` / `AGENT_OWNER_ADDRESS`; nilainya tidak pernah dicetak.
- **agentWallet** = attester `0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE` (penerbit semua kertas korpus kecuali spesimen delisted B102).
- **Berkas registrasi** (`type: https://eips.ethereum.org/EIPS/eip-8004#registration-v1`) hidup sepenuhnya di
  chain sebagai `data:` URI. Isinya: nama, deskripsi yang menyebut bahwa peran Agent Owner di demo dipegang
  tim Lencana, layanan `issuer-document` (`https://lencana-edge…/issuers/agent-edge`) dan
  `credential-resolver` (`eip155:97:0x7CA6…2065`), `x402Support: false`, `active: true`,
  `registrations: [{agentId: 2534, agentRegistry: "eip155:97:0x8004A818…"}]`, `supportedTrust: []`.

## Dua jebakan yang terukur, bukan dugaan

1. **Versi registry yang dideploy BUKAN versi kode sumber terbaru.** `getAgentWallet(uint256)` ada di repo
   `erc-8004/erc-8004-contracts` tapi **tidak ada** di bytecode implementasi di 97 (selektornya dicari di
   bytecode). Dompet agen dibaca lewat `getMetadata(agentId, "agentWallet")`. Kalau modul ini ditulis dari
   README, pembacaan dompetnya akan revert.
2. **`setAgentWallet` menolak `deadline` lebih dari 5 menit ke depan** (`MAX_DEADLINE_DELAY`). Skrip memakai
   jam blok + 240 detik, dan mensimulasikan transaksi sebelum mengirimnya.

## Terukur — `npm run verify:agent` → **AGEN HIJAU — 23 pemeriksaan, 0 gagal**

```
  ok    IdentityRegistry ERC-8004 BNB ada di chain 97
  ok    eip712Domain registry = ERC8004IdentityRegistry v1 di chain ini
  ok    setiap manifest penerbit menyebut agen ERC-8004 di registry chain ini
  ok    agentId yang disebut manifest sama untuk semua kursus penerbit ini
  ok    identitas #2534 ada di registry
  ok    pemilik NFT = Agent Owner (bukan attester, bukan platform) — D53
  ok    agentWallet (metadata reserved) = attester kertas kita (ISSUER_ADDRESS)
  ok    agentWallet adalah penerbit yang diterima resolver, dan tidak didelisting
  ok    agentURI = data: URI di chain, tipe registration-v1
  ok    berkas registrasi menunjuk balik ke agentId ini di registry ini
  ok    layanan issuer-document di berkas registrasi terbuka publik dan dokumennya ber-id sama
  ok    layanan credential-resolver menunjuk resolver kita di chain ini
  ok    tidak ada layanan http yang tidak bisa dibuka publik (mis. signer lokal)
  ok    berkas registrasi tidak mengklaim jenis kepercayaan yang belum dibangun (supportedTrust kosong)
  ok    verify(): kertas sah milik agen #2534 -> identitas terbukti (agentWallet = attester)
  ok    verify(): verdict kertas itu tetap VALID (identitas informasi, bukan putusan)
  ok    verify(): alasannya menyebut identitas ERC-8004 dan menolak mengklaim reputasi
  ok    kontrol negatif: kertas yang attester-nya BUKAN dompet agen itu -> klaim manifest tidak terbukti
  ok    kontrol negatif: verdict kertas itu tetap ISSUER_DELISTED
  ok    admit: agen #N yang sudah diterima -> SUDAH DITERIMA, tanpa transaksi
  ok    admit: alamat yang bukan agentWallet identitas itu -> DITOLAK
  ok    admit: identitas yang tidak ada -> DITOLAK
  ok    admit: tanpa --agent-id (alamat polos) -> DITOLAK
```

Kontrol negatif memakai kertas spesimen delisted B102 (`0xaa379627…9c0f`), yang attester-nya agen korban
`0x6f1d…8239`, bukan dompet agen #2534 — jadi klaim manifest untuk kursus itu harus terbaca "tidak terbukti".

## Yang tidak disentuh, dan buktinya

- `manifestHashOf` / `rubricHashOf` kedua kursus **sama persis** sebelum dan sesudah field `agent` ditambah
  (dicetak sebelum dan sesudah suntingan: `web3-dasar-2026` rubric `0x2a45d0d0…7fc8`, manifest `0xadbb8f85…71a1`;
  `web3-lanjut-2026` rubric `0xc608de2a…f76d`, manifest `0x8d059344…41ee`). Kertas yang sudah terbit tidak bergeser.
- Dokumen kredensial, dokumen hasil, dokumen kriteria, dan dokumen penerbit tidak berubah bentuk;
  run penuh `sync:numbers` sesudahnya: 18 harness hijau, angka lain tidak bergerak.
- Resolver tidak di-redeploy dan tidak ada `addIssuer` baru.

## Batas — yang BELUM dan tidak boleh diklaim

- **Gerbang `admit` adalah prosedur platform, bukan aturan kontrak.** Kunci owner resolver masih bisa
  memanggil `addIssuer` langsung tanpa ERC-8004; `npm run specimen` (B102) memang melakukannya untuk agen
  korbannya, dan itu disengaja (agen yang dibuat untuk didelisting tidak perlu identitas publik).
- **Hanya identitas.** Reputasi (F2) dan validasi (F3) tidak dibangun; berkas registrasi sengaja
  `supportedTrust: []`. Klaim "reputation proven on-chain" tetap dilarang.
- **Ketiga peran masih satu orang di satu mesin**: Agent Owner, attester, dan platform dipegang tim Lencana.
  Pemisahannya nyata di chain (tiga alamat, dua tanda tangan), tapi bukan pemisahan organisasi.
- `agentId` untuk halaman verifikasi datang dari **klaim manifest** penerbit, lalu dibuktikan ke chain.
  Registry tidak punya pencarian dari alamat ke `agentId`, jadi kertas dari penerbit yang manifest-nya
  tidak menyebut agen tidak menampilkan identitas apa pun.
- Halaman verifikasi baru menambahkan satu kalimat alasan; panel khusus untuk `report.issuerAgent` adalah
  pekerjaan FE ([[10-Contributors/Open-Items-for-Dave]] OI-18).
- ERC-8004 masih **Draft**, dan registrinya proxy yang bisa di-upgrade pemiliknya.

## Cara menjalankan ulang

```
cd app/signer
npm run verify:agent                       # baca-saja
npm run agent:identity                     # baca-saja: keadaan identitas agen
npm run admit -- --agent-id 2534           # baca-saja kecuali ditambah --apply
```
