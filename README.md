# Lencana

**Sertifikat belajar yang bisa diperiksa siapa pun — tanpa wallet, tanpa login, dan tanpa
memperhatikan kami.**

Platform micro-course yang **penerbit sertifikatnya adalah agen AI**. Kredensialnya mengikuti
standar **Open Badges 3.0 / W3C Verifiable Credentials 2.0**, sementara **siapa yang berhak
menerbitkan** dan **apakah sebuah sertifikat sudah dicabut** tercatat di **BNB Smart Chain**.
Seorang rekruter memastikan satu sertifikat cukup dengan membuka URL di browser.

Dibangun untuk **Indonesia Web3 Hackathon 2026** — track *Consumer Apps* (· *AI Agents*), di atas
BNB Chain.

> ⚠️ **Status: pra-rilis.** Belum ada kontrak yang disiarkan ke testnet publik, dan backend
> penandatangan kredensial belum ada. Tabel "Sudah dibuktikan" di bawah membedakan dengan tegas
> apa yang lolos uji dan apa yang baru sampai tahap "kompilasi lulus".

---

## Kenapa ini ada

Sertifikat PDF dipalsukan dengan Photoshop. Sertifikat di basis data penerbit dipalsukan **oleh
penerbitnya sendiri** atau oleh admin yang kompromi. NFT tidak menyelesaikan keduanya — ia hanya
memindahkan pertanyaan menjadi: *siapa yang boleh mencetak, dan dari mana pemeriksa tahu itu asli?*

Jawaban "karena blockchain" tidak bertahan diuji. Karena itu proyek ini menjawab **empat
pertanyaan mekanis**, bukan satu slogan:

| # | pertanyaan | jawaban | di mana |
|---|---|---|---|
| a | Siapa yang berhak menerbitkan, dan bagaimana itu terikat on-chain? | Whitelist alamat; penerbit asing membuat transaksi **revert** | `contracts/CredentialResolver.sol` |
| b | Apa yang mencegah sertifikat dijual atau dipindahtangankan? | NFT **soulbound** (ERC-5192): transfer, approval, **dan burn** semuanya ditolak | `contracts/SoulboundCert.sol` |
| c | Bagaimana orang memeriksa tanpa wallet dan tanpa crypto? | Halaman statis, **satu `eth_call`** langsung ke chain — tanpa backend kami | `web/` |
| d | Kalau sertifikat dicabut — dan bisa kah pencabutan itu disangkal? | `revoke()` di BAS; **tidak ada fungsi `unrevoke`** | primitif pihak ketiga + `CredentialResolver` |

## Sudah dibuktikan

Angka di bawah adalah hasil perintah yang dijalankan, bukan rencana.

| perintah | hasil |
|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **19 lulus / 0 gagal** (offline) |
| `forge test --evm-version cancun --fork-url https://bsc-testnet.publicnode.com` | **47 lulus / 0 gagal** di **chain 97** |
| `forge test --evm-version cancun --fork-url https://bsc-dataseed1.bnbchain.org/` | **47 lulus / 0 gagal** di **chain 56**, gas identik |
| `forge script … --broadcast` di anvil fork 97 | deploy sukses · **0,0003828 BNB** (3.827.994 gas) |
| `npm run probe` di `web/` | **19/19** pemeriksaan lulus terhadap chain nyata |

Fork test memanggil **BAS (BNB Attestation Service, fork EAS 1.3.0) yang benar-benar
ter-deploy** di chain — bukan tiruan yang kami deploy sendiri. Itu juga alamat yang bisa dibuka
juri.

**Yang belum dibuktikan, dan tidak boleh diklaim:** tidak ada kontrak yang live di testnet publik
(semua keberhasilan di atas adalah *fork* — state nyata, tanpa transaksi nyata); belum diuji pada
validator 1EdTech; jalur HTTP 402 untuk pembayaran belum pernah dijalankan; dan halaman verifikasi
belum diuji pada jalur "sudah dicabut". Rinciannya:
[`vault/03-bukti-dan-batas.md`](vault/03-bukti-dan-batas.md).

## Cara kerja

```
OpenBadgeCredential JSON (off-chain, ditandatangani kunci penerbit)
        │ keccak256
        ▼
   credentialHash ──► attest() ──►  BAS di BNB Chain  (milik pihak lain)
                                        ▲
             EAS memanggil onAttest()   │  whitelist penerbit
             SEBELUM attestation terima │  + rantai prasyarat peka-pencabutan
                                  CredentialResolver.sol  (milik kita)
                                        │
                        statusOf() / holderOf()  ◄── SATU eth_call, tanpa wallet
                                        │
                          SoulboundCert.sol ── mint() MENOLAK kalau kredensial mati
```

**Yang paling penting untuk dipahami:** kredensialnya adalah **dokumen JSON**, bukan NFT-nya.
Yang dilakukan blockchain hanyalah tiga hal yang tidak bisa dilakukan JSON — registry penerbit
yang tak bisa disensor, bit status yang tak bisa disembunyikan penerbitnya sendiri, dan bukti
waktu. NFT soulbound adalah **artefak** yang dilihat dan dimiliki peserta, dan kontraknya
menolak mencetak artefak untuk kredensial yang tidak hidup.

### 🔴 Celah nyata di EAS yang kami tutup

Ini bukan fitur yang kami tambahkan; ini **temuan** yang kemudian jadi pembeda teknis utama.
EAS menguji prasyarat **hanya ada atau tidak**:

```solidity
// EAS.sol, _attest()
if (request.refUID != EMPTY_UID) {
    if (!isAttestationValid(request.refUID)) { revert NotFound(); }
}
// dan
function isAttestationValid(bytes32 uid) public view returns (bool) { return _db[uid].uid != EMPTY_UID; }
```

Jadi EAS **membiarkan** sertifikat lanjutan diterbitkan di atas prasyarat yang **sudah dicabut**,
**sudah kedaluwarsa**, **milik orang lain**, atau **attestation pihak lain yang tidak ada
hubungannya dengan kursus kami**. Keempatnya ditolak `CredentialResolver`, dan penolakannya
dibuktikan lewat fork test di dua chain.

Konsekuensinya kami terima apa adanya: *"pencabutan yang tak bisa disangkal"* adalah **perilaku
bawaan EAS/BAS, bukan temuan kami**. Yang milik kami: whitelist penerbit, rantai prasyarat yang
peka-pencabutan, dan verifikasi satu-panggilan tanpa wallet.

## Menjalankan

Prasyarat: **Foundry 1.5.1** (`forge`/`cast`/`anvil`), **Node 22**, Python 3.12 untuk skrip bukti.

```bash
npm install                                  # OpenZeppelin 5.1.0
forge install foundry-rs/forge-std --no-git  # flag --no-git wajib jika folder belum jadi repo git

npm test                                     # 19 test, offline, ±25 ms
npm run test:fork:testnet                    # 47 test di chain 97
npm run test:fork:mainnet                    # 47 test di chain 56
```

> ⚠️ **`--evm-version cancun` itu wajib untuk fork test**, bukan hiasan. Tanpanya, pemanggilan
> yang memindahkan data berukuran variabel gagal dengan `EvmError: NotActivated` yang **menyamar
> sebagai "fungsi itu tidak ada"**. Build kontrak kami sendiri tetap bertarget `shanghai`.

Uji tanpa dana dan tanpa deploy — fork chain 97 ke anvil lokal:

```bash
anvil --fork-url https://bsc-testnet.publicnode.com --port 8545 --chain-id 97 --silent

set DEPLOYER_PRIVATE_KEY=<kunci uji anvil #0>
set ISSUER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
forge script script/DeployCredentials.s.sol:DeployCredentials --rpc-url http://127.0.0.1:8545 --broadcast

set ISSUER_PRIVATE_KEY=<kunci uji anvil #1>
set RESOLVER_ADDRESS=<hasil di atas>
set CERT_ADDRESS=<hasil di atas>
forge script script/SeedDemo.s.sol:SeedDemo --rpc-url http://127.0.0.1:8545 --broadcast --slow
```

**`--slow` pada `SeedDemo` itu wajib.** UID attestation EAS dihitung sebagian dari
`block.timestamp`; `forge script` biasa menyiarkan **calldata hasil simulasi**, sehingga argumen
yang bergantung UID jadi basi saat disiarkan di blok berbeda. Tanpa `--slow`: 3 transaksi gagal.

### Halaman verifikasi

```bash
cd web && npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # dist/ = halaman statis, bisa di-host di mana saja
npm run probe     # uji lapisan datanya dari Node, tanpa browser
```

Halaman ini **tidak punya backend, dan memang tidak perlu** — itulah produknya. RPC dan alamat
kontrak disimpan di `localStorage` lewat panel *Konfigurasi pembacaan*, karena kontrak kami belum
di-deploy saat halaman ini ditulis. Halaman **sengaja tidak memakai data contoh**: angka palsu yang
terlihat meyakinkan lebih buruk daripada halaman yang kosong dan jujur.

`npm run probe` menjalankan **berkas yang sama** dengan halaman (`web/src/verify.ts`) terhadap RPC
yang sama. Jadi "halamannya membaca data dengan benar" bisa **diuji**, bukan dipercaya dari
tampilannya — dan memang begitu cara probe ini menemukan dua bug yang tidak terlihat oleh
`typescript` maupun `vite build` (lihat [`vault/04-referensi-teknis.md`](vault/04-referensi-teknis.md)).

## Repo ini isinya apa

```
contracts/
  CredentialResolver.sol     whitelist penerbit + rantai prasyarat + statusOf()/holderOf()
  SoulboundCert.sol          ERC-721 + ERC-5192; mint menolak kredensial mati
  interfaces/ICredentialRegistry.sol
lib/bas/src/                 salinan verbatim antar muka BAS — diaudit, bukan dikarang
test/                        19 offline · 19 fork resolver · 9 fork ujung-ke-ujung
script/                      DeployCredentials.s.sol · SeedDemo.s.sol
web/                         halaman verifikasi (Vite + vanilla TS + viem, statis)
vault/                       konteks proyek: kenapa bentuknya begini
```

Kenapa `lib/bas/src/` ikut disimpan dan bukan dipasang: kami **tidak bisa mengompilasi**
`EAS.sol`/`SchemaRegistry.sol` BAS di rig ini (terpaku `pragma solidity 0.8.19`, bertabrakan
dengan OpenZeppelin `^0.8.20`). Kami tidak menaikkan pin pihak ketiga — kami keluarkan file itu
dari jalur build dan **menguji perilakunya lewat fork**. Hasilnya justru lebih kuat: yang diuji
adalah deployment yang akan dibuka juri.

## Batas yang kami tulis sendiri

Ini bukan formalitas dan tidak disembunyikan di footnote. Sistem ini **tidak** membuktikan:

- bahwa **isi** klaimnya benar — *"verifikasi kredensial tidak berarti evaluasi kebenaran klaim di
  dalamnya"* (VC 2.0);
- bahwa **manusia** di balik alamat adalah orang yang belajar — yang terikat adalah alamat;
- bahwa sertifikat tidak bisa di-screenshot;
- pengakuan **hukum atau institusional** apa pun. Kami tidak menulis "sah".

Kami juga tidak mengklaim: *"trustless"*, *"zkML-verified"*, *"TEE-verified"*, atau bahwa BAS
adalah "program resmi BNB Chain" (klaim itu tidak ada di repo-nya). Kalau halaman ini bisa
dibuka di validator pihak ketiga, itu akan kami tulis **setelah** membuktikannya — sekarang belum.

Justru karena batasnya ditulis, klaim sisanya bisa dipercaya.

## Isi `vault/`

| berkas | tentang |
|---|---|
| [README](vault/README.md) | indeks + cara membaca catatan ini |
| [01-briefing](vault/01-briefing.md) | produknya apa, siapa yang memakai, alur dari nol sampai terbukti, adegan demo |
| [02-arsitektur](vault/02-arsitektur.md) | empat lapis, kenapa BAS dan bukan karangan sendiri, celah EAS, peran agen, siapa menanggung biaya, keputusan + tanggal |
| [03-bukti-dan-batas](vault/03-bukti-dan-batas.md) | apa yang sudah dibuktikan, apa yang belum, daftar klaim yang dilarang |
| [04-referensi-teknis](vault/04-referensi-teknis.md) | fakta Open Badges 3.0 dari spesifikasi mentah + jebakan toolchain |
| [05-status-dan-tugas](vault/05-status-dan-tugas.md) | posisi hari ini, halangan, urutan kerja sampai tenggat |

> Catatan ini **hanya** tentang Lencana. Tidak ada produk, track, atau rencana lain di dalamnya.

## Lisensi

MIT untuk kontrak dan kode (lihat header `SPDX-License-Identifier` di tiap berkas). Kecuali
`lib/bas/src/` — salinan antar muka **BAS/EAS** yang kami simpan apa adanya supaya bisa diaudit;
itu bukan karya kami.
