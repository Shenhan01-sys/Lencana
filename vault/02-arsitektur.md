# 02 — Arsitektur dan keputusannya

## Empat lapis, dan siapa pemiliknya

| lapis | pemilik | isi |
|---|---|---|
| **Kredensial** | kita (off-chain) | `OpenBadgeCredential` JSON-LD, ditandatangani kunci penerbit. **Ini kredensialnya** |
| **Anchor · revocation · kedaluwarsa · bukti waktu** | **BAS** (pihak ketiga, sudah ter-deploy) | `attest()` / `revoke()` / `timestamp()` / `revokeOffchain()` — **nol Solidity dari kita** |
| **Otorisasi penerbit + rantai prasyarat** | `contracts/CredentialResolver.sol` (kita) | whitelist penerbit; penolakan prasyarat dicabut/kedaluwarsa/milik orang lain/bukan milik kita; `statusOf()` & `holderOf()` untuk verifier |
| **Artefak peserta** | `contracts/SoulboundCert.sol` (kita) | ERC-721 + ERC-5192; `mint()` menolak kredensial yang tidak hidup; transfer/approve/burn mati |

```
OpenBadgeCredential JSON  --keccak256-->  credentialHash
                                                 |
                                                 v   attest(schemaUID, abi.encode(hash, courseId))
                              BAS di BSC (fork EAS 1.3.0, punya pihak lain)
                                    ^
                                    | EAS memanggil onAttest() SEBELUM attestation diterima
                          CredentialResolver (kontrak kita)  <-- whitelist + aturan rantai
                                    |
                    statusOf(hash) / holderOf(hash)  <-- SATU eth_call untuk verifier
                                    |
                          SoulboundCert.mint(peserta, hash)   <-- menolak kalau kredensial mati
```

**Satu hal yang tidak boleh terbalik di kepala:** kredensialnya adalah **dokumen JSON**, bukan
NFT-nya. Yang dilakukan chain hanyalah tiga hal yang tidak bisa dilakukan JSON — registry penerbit
yang tidak bisa disensor, bit status yang tidak bisa disembunyikan penerbitnya sendiri, dan bukti
waktu. NFT adalah artefak yang dilihat peserta.

## Kenapa BAS dan bukan kontrak karangan sendiri

Rencana awal kami (13 Sep) menulis `IssuerRegistry.sol` + `CredentialAnchor.sol` dari nol.
Setelah membaca `EAS.sol` milik fork BAS dan mengujinya lewat `eth_call` ke deployment nyata,
ternyata **kedua kontrak itu menduplikasi properti yang sudah dijamin primitif ini**:

| yang tadinya mau ditulis sendiri | sudah ada di BAS/EAS | sifatnya |
|---|---|---|
| `anchor(hash) -> {blok, waktu}` | `timestamp(bytes32)` / `getTimestamp(bytes32)` | **write-once** — `_timestamp` revert `AlreadyTimestamped()` bila sudah ada |
| `revoke(hash)` tanpa `unrevoke` | `revoke(bytes32 uid)` pada attestation, dan `revokeOffchain(bytes32)` | **write-once**; `revokeOffchain` juga **terikat ke alamat pencabut**, jadi status tiap penerbit independen |
| status keberlakuan | `Attestation.revocationTime`, `.expirationTime` | native |
| registry schema | `SchemaRegistry.getSchema(uid)` | permissionless, **tanpa fee** |

Keputusan: **pakai BAS sebagai anchor.** Yang kita tulis hanya lapis yang tidak disediakan
primitif mana pun — dan itu justru inti produknya.

### 🔴 Celah nyata di EAS yang kita tutup — ini pembeda teknisnya

EAS menguji prasyarat **hanya ada atau tidak**:

```solidity
// EAS.sol, _attest()
if (request.refUID != EMPTY_UID) {
    if (!isAttestationValid(request.refUID)) { revert NotFound(); }
}
// dan
function isAttestationValid(bytes32 uid) public view returns (bool) { return _db[uid].uid != EMPTY_UID; }
```

Jadi **tanpa lapisan tambahan**, EAS membiarkan sertifikat lanjutan diterbitkan di atas prasyarat
yang **sudah dicabut**, **sudah kedaluwarsa**, **milik orang lain**, atau **attestation pihak lain
yang tidak ada hubungannya dengan kursus kita**. Keempatnya ditolak oleh
`CredentialResolver._validatePrerequisite()`, dan penolakannya **dibuktikan lewat fork test di
dua chain**.

Konsekuensi untuk klaim: *"pencabutan yang tak bisa disangkal"* adalah **perilaku bawaan EAS**,
bukan temuan kami. Yang milik kami adalah whitelist penerbit + rantai prasyarat yang peka
pencabutan + verifikasi satu panggilan.

## `schemaUID` bukan data, ia turunan

UID schema = `keccak256(abi.encodePacked(string schema, alamat resolver, revocable))`. Artinya:

- bisa dihitung **sebelum** mendaftar (dipakai di `schemaUID()`);
- **alamat resolver ikut menentukan** → salah deploy = UID berbeda = verifier lama tidak
  mengenali kredensial yang sudah terbit. Resolver **tidak bisa** diperbaiki diam-diam dengan
  deploy ulang. Catat alamat dan UID-nya setelah deploy.

## Rantai kepercayaan penerbit

Satu kunci yang sama muncul di tiga tempat, dan itu memang tujuannya:

| tempat | field |
|---|---|
| dokumen kredensial | `issuer` (props **wajib** di skema OB3.0) |
| attestation di chain | `attester` — kolom yang dibaca halaman verifikasi lewat `statusOf()` |
| whitelist | `CredentialResolver.isIssuer(alamat)` |

Kata kuncinya **`Issuer`**, bukan `Attester` dan bukan `Validator`:

- ~~`Attester`~~ — memang nama kolomnya di EAS, **tapi** "Attester" adalah peran baku di
  **remote attestation TEE** (IETF: Attester / Verifier / Relying Party) dan di **Proof-of-Stake**.
  Menamai agen kita begitu mengundang pertanyaan "jadi kalian pakai TEE?" — yang tidak bisa dan
  tidak akan kita klaim.
- ~~`Validator`~~ — tabrakan ganda: node PoS, dan `ValidationRegistry` ERC-8004 yang memang tidak
  kita isi dengan validasi nyata.
- ✅ `Issuer` — karena **itu memang nama field-nya di dokumen kredensial**. Label UI, field
  dokumen, dan properti kontrak jadi kata yang sama, tanpa terjemahan.

## Peran agen AI: penerbit, **bukan** verifier

| | siapa | kenapa |
|---|---|---|
| menilai & menandatangani | **agen AI** | sisi yang boleh subjektif, dan sisi yang membuatnya sah jadi proyek agen |
| memeriksa | **halaman statis, deterministik** | yang dijual ke verifier bukan "pendapat", tapi *"hasil ini bisa kamu ulang dan pasti sama"* |

Kalau verifier memakai AI, nilai produknya hilang: satu langkah probabilistik di jalur
verifikasi mengubah klaim dari *terverifikasi kriptografis* menjadi *kira-kira benar*. Yang
sah dibangun: agen sebagai **asisten** (menjelaskan, mem-batch), tidak pernah sebagai sumber
kebenaran.

**Batas klaim agen** (sudah ditetapkan, jangan dinaikkan): yang boleh ditulis adalah
*"penerbit mesin dengan kunci publik yang dapat diaudit, dengan log penerbitan yang tidak bisa
diubah retroaktif"*. Yang **tidak** boleh: *"trustless"*, *"reputasinya terbukti on-chain"*,
*"agen memvalidasi dirinya sendiri"*, *"TEE/zkML-verified"*.

## Siapa menanggung biaya

> Peserta membayar **belajarnya**. Peserta tidak membayar **bukti keberhasilannya**.

| siapa | membeli apa | penerima |
|---|---|---|
| peserta | akses modul kursus | platform / pengajar |
| **institusi sponsor** (agennya yang menandatangani) | penerbitan kredensial ke chain | gas: fasilitator · harga: anggaran penerbit |
| rekruter / B2B | verifikasi massal lewat API | platform |
| **siapa pun** | **kebenaran status** | — **gratis, tanpa wallet, selamanya** |

Biaya di sisi **penerbit** adalah rem penipuan: menerbitkan palsu membakar uang penerbit. Kalau
peserta yang membayar, justru korban yang membiayai penipuan atas dirinya. Dan uang besarnya
memang bukan di sini — gas BSC recehan; yang bernilai bisnis adalah verifikasi berulang oleh
pihak yang punya anggaran.

**Bedakan dua hal ini** (saya pernah tertukar): *"agen membayar"* = agen **menandatangani**;
yang **menanggung** adalah institusi yang mengisi saldo dompetnya. Yang membuat ini agen adalah
**otoritas bertindak**, bukan kepemilikan harta.

## Keputusan-keputusan yang sudah terkunci

| tanggal | keputusan |
|---|---|
| 13 Sep | Chain = **BSC testnet, chain ID 97**. Bukan opBNB: syarat keras lomba adalah address yang **resolve di BscScan**, dan `opbnb.bscscan.com` instance terpisah. Mainnet 56 tetap dipakai sebagai **kontrol silang** di fork test |
| 13 Sep | Primitif kredensial = **BAS**, karena EAS resmi tidak ter-deploy di BSC |
| 13 Sep | 🔴 **Pivot: kredensialnya = VC/Open Badges 3.0, NFT hanya artefak.** Setiap standar token on-chain secara eksplisit **menyangkal** semantik kredensial (ERC-721: *"does not define issuer, holder, subject, claim, proof, revocation, expiry, or privacy semantics; minting and burning are outside the specification"*) |
| 13 Sep | Greenfield **keluar dari jalur kritis** — testnet-nya direset ±7 hari, padahal penjurian akhir setelah itu |
| 16 Sep | **BAS jadi anchor**; `IssuerRegistry` + `CredentialAnchor` dicoret (3 kontrak → 2) |
| 16 Sep | **Agen = penerbit, verifier = deterministik. Biaya penerbitan ditanggung institusi sponsor** |
| 16 Sep | Spesifikasi OB3.0 dibaca dari berkas mentah dan diverifikasi ulang (lihat [04-referensi-teknis.md](04-referensi-teknis.md)) |
| 17 Sep | Nama proyek: **Lencana**. Nama agen: **Issuer** |

## 🔴 Satu keputusan yang MASIH TERBUKA: status list standar vs pencabutan on-chain

Verifier Open Badges **tidak membaca chain**. Pemeriksaan status didefinisikan hanya untuk satu
tipe:

> *"A Credential is revoked if the credentialStatus property is present, and the type of the
> CredentialStatus object is `BitstringStatusListEntry`, and if the Credential has been revoked
> as shown in Bitstring Status List v1.0."* — OB3.0 §9.1

Kalau kita tidak menjahit status list itu ke state chain, akibatnya jelek secara spesifik:
**kredensial kita bisa lolos validator pihak ketiga sambil menampilkan "AKTIF" untuk sertifikat
yang sudah kita cabut di chain** — persis kegagalan yang produk ini klaim hapus, dan kali ini
dibuktikan alat orang lain.

| opsi | isi | konsekuensi |
|---|---|---|
| **A** ⭐ | Bitstring status list **diturunkan dari state chain** (baca `revocationTime != 0` → susun bitstring → tanda tangani sebagai status list credential → sajikan di URL), dan **hash bitstring-nya direkam lewat `timestamp()` di BAS** | Interoperabel **dan** non-repudiable. Klaim yang jujur: *"list-nya kami sajikan, hash-nya tidak bisa kami ubah diam-diam."* ±1–2 hari kerja |
| B | `credentialStatus` dilepas (boleh — di skema dia opsional `[0..1]`) | Nol kerja, tapi verifier standar buta terhadap pencabutan → halaman kitalah satu-satunya yang benar. Itu platform tertutup, bukan verifikasi publik |
| C | Tipe custom menunjuk API kami | ⚠️ **Jebakan.** `additionalProperties: true` memang mengizinkan, tapi §9.1 tidak mendefinisikan perilaku untuk tipe asing → validator **melewati** pemeriksaan status tanpa memberi tahu siapa pun. Ini B yang menyamar jadi A |

## Alamat primitif pihak ketiga (diverifikasi, bukan disalin dari dokumen)

| | chain 97 (testnet) | chain 56 (mainnet) |
|---|---|---|
| BAS core | `0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD` | `0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC` |
| SchemaRegistry | `0x08C8b8417313fF130526862f90cd822B55002D72` | `0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa` |
| ukuran bytecode BAS core | 18.881 B | 18.881 B — **identik** |

Keduanya dikonfirmasi `eth_getCode` **dan** `eth_call getSchemaRegistry()` yang mengembalikan
address persis seperti tabel deployment di repo-nya. **Jangan tulis "program resmi BNB Chain"** —
klaim itu tidak ada di repo-nya; repo itu juga hanya 3 bintang dan commit fungsional terakhirnya
Mei 2024. Kita memakainya bukan karena populer, tapi karena **address-nya kita uji sendiri**.
