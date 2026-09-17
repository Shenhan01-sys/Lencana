# 04 — Referensi teknis

## A. Open Badges 3.0 / VC 2.0 — dibaca dari spesifikasi mentah

Berkas sumber diunduh utuh (bukan ringkasan mesin cari) dan klaimnya **dihitung ulang** oleh
skrip: `tera.id`-nya angka, bukan perasaan. Ini penting karena contoh `credentialStatus` yang
sebelumnya kami pakai **ternyata karangan kami sendiri** — nol kemunculannya di seluruh dokumen
spesifikasi.

**Status resmi.** 1EdTech (d/h IMS Global). **Final Release** — versi 1.0 final **27 Mei 2024**;
dokumen terkini **1.4.5, 29 Juni 2026**. Jadi klaim "standar industri" **sah**. Yang **tidak**
boleh diklaim: bahwa kredensial kami **lulus sertifikasi** 1EdTech (suitenya butuh keanggotaan),
dan implementasi referensinya pun tidak publik (*"Source Code is a member-only resource"*).

### Bentuk dokumen yang benar

| properti | aturan | akibatnya bagi kita |
|---|---|---|
| `@context` | `[2..*]`, **terurut**: `https://www.w3.org/ns/credentials/v2` lalu `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`. *"Open Badges verifiable credentials MUST be serialized with both JSON-LD contexts."* | ⚠️ konteks OB 3.0.3 sendiri hanya **29 istilah** dan **tidak memuat** `credentialStatus`, `proof`, `issuer`, `validFrom`, `validUntil`, `statusPurpose`, `statusListIndex`, `statusListCredential` — semua dipasok konteks W3C. Verifier yang hanya memuat konteks OB **buta terhadap status dan proof** |
| wajib ada | `@context`, `id`, `type`, `credentialSubject`, `issuer`, `validFrom` (dihitung langsung dari `ob_v3p0_achievementcredential_schema.json`, di **top-level** schema) | — |
| `achievement` | wajib `id`, `type`, `name`, `description`, **`criteria`** | `criteria` adalah tempat menuliskan **"apa yang harus dilakukan peserta untuk lulus"** — ini yang membuat penilaian agen bisa diperiksa orang lain, bukan cuma keputusannya |
| pemegang | `credentialSubject.id` **XOR** `.identifier` | salah satu wajib |
| kedaluwarsa | ✅ **`validUntil`** · ❌ **`expirationDate` BUKAN properti model VC 2.0** (hanya ada di varian warisan VC 1.1, §B.9.2, yang *"not intended to be used in the creation of new credentials"*) | kadaluarsa harus ditulis di **dua lapis**: `validUntil` di dokumen **dan** `expirationTime` di attestation. Field berbeda, lapis berbeda, **tidak otomatis sinkron** — backend wajib menuliskannya dari satu sumber |
| `verificationMethod` | §8.5: *"allows the use of an HTTP URL … or a DID URL (e.g. `did:key:123`), but only requires HTTP URL support"* | ✅ **kita tidak wajib membangun resolver DID** — hemat beberapa hari |
| proof | §8: *"At least one proof mechanism … MUST be expressed"*. Daftar tertutupnya ada di **Certification Guide**, bukan §8 (Errata §1.2 menjelaskan pemindahannya): **`eddsa-rdfc-2022`** atau **`ecdsa-sd-2023`**; verifier wajib mendukung **keduanya**. `proofPurpose` **wajib** `"assertionMethod"` | VC-JWT juga sah (`alg` minimal RS256) tapi **tidak ada tipe `JwtCredential`** di OB3.0 — formatnya "JSON Web Token Proof Format", dan properti terpisah hanya `endorsementJwt` |

### Revocation — satu-satunya yang punya perilaku terdefinisi

> *"A Credential is revoked if the credentialStatus property is present, and the type of the
> CredentialStatus object is `BitstringStatusListEntry`, and if the Credential has been revoked
> as shown in Bitstring Status List v1.0."* — §9.1

```json
"credentialStatus": {
  "id": "https://1edtech.edu/credentials/revocationList#23",
  "type": "BitstringStatusListEntry",
  "statusPurpose": "revocation",
  "statusListIndex": 23,
  "statusListCredential": "https://1edtech.edu/credentials/revocationList"
}
```

`credentialStatus` sendiri **opsional** (`[0..1]`); di dalam objeknya hanya `type` yang wajib,
dan kelasnya bisa diperluas (`additionalProperties: true`). Riwayat penting: **rev 1.3
(9 Okt 2025)** *"Deprecated [VCRL-10] in favour of [vc-bitstring-status-list]"*, lalu
**rev 1.4.2** memperbarui semua contoh ke `BitstringStatusListEntry`.

Yang **nol kemunculan** di keenam dokumen (dihitung, bukan dirasakan):
`RevocationList2020Status`, `RevocationList2020StatusService`, `StatusList2021`, `revokedIdList`,
`revokedId`.

### Validator & suit pihak ketiga (keberadaannya terverifikasi)

| alat | bahasa | catatan |
|---|---|---|
| `1EdTech/digital-credentials-public-validator` — deploy resmi **`https://vc.1ed.tech`** | Java 17 / Spring Boot | *"primarily a validator for Open Badges 3.0"*. ⚠️ README-nya juga: *"verifybadge.org is not owned or maintained by 1EdTech"* |
| `w3c/vc-data-model-2.0-test-suite` | JavaScript | suit konformansi resmi W3C; butuh endpoint **VC-API** + `eddsa-rdfc-2022` |
| `digitalcredentials/verifier-core` | TypeScript | verifikasi di browser/Node/React Native; contoh `OpenBadgeCredential` |
| `Schroedinger-Hat/certo`, `CoopCodeCommun/pyopenbadges` | TS / Python | platform issue/verify; yang Python mengklaim compliant OB3.0, JWT masih TODO |
| ~~`1EdTech/openbadges-validator-core`~~ | Python | ⚠️ **OB 2.0 ke bawah, BUKAN OB3.0.** Jangan tertipu namanya |

### ⚠️ Spesifikasi ini sendiri tidak konsisten

§B.6.1 (*Multikey*) menulis `"the cryptosuite … MUST be the string eddsa-rdf-2022"` — **tanpa `c`**
— sementara §D.1/§D.2 dan Certification Guide memakai `eddsa-rdfc-2022` (39× vs 7×). **Pakai yang
ber-`c`.** Kalau validasi pernah ditolak tanpa sebab jelas, periksa ejaan ini sebelum
menyalahkan library.

## B. Jebakan toolchain yang sudah memakan waktu di proyek ini

Semuanya terjadi nyata. Gejalanya biasanya **menyesatkan**: terlihat seperti "kontraknya rusak"
atau "fiturnya tidak ada", padahal penyebabnya di tempat lain.

### Foundry

| jebakan | gejala | solusi |
|---|---|---|
| `evm_version` salah saat fork | `EvmError: NotActivated` **hanya** pada panggilan yang memindahkan string/bytes; getter `address`/`bytes32` tetap lulus → **terlihat seperti fungsinya tidak ada di kontrak ter-deploy** | `--evm-version cancun` (sudah jadi `[profile.fork]`). **Ini menyebabkan salah diagnosis yang dikoreksi terbuka di proyek ini** |
| Menyimpulkan "kontraknya ada" dari `eth_getCode != 0x` | "ada kode" tidak membuktikan itu kontrak yang kita kira | bandingkan ukuran bytecode **antar chain**, pakai kontrol negatif, cocokkan **selector di runtime bytecode**, dan baca **getter on-chain** lalu sandingkan dengan dokumennya |
| **`vm.prank` / `vm.expectRevert` dimakan staticcall di argumen** | `NotAnIssuer(0x7Fa9385b…1496)` — alamat itu `address(this)` kontrak test, bukan alamat yang di-prank; atau `next call did not revert as expected` | hoist getter ke variabel (idealnya di `setUp`) lalu pakai variabel itu. ⚠️ **jebakan ini dialami dua kali**, padahal sudah tercatat sebelum kejadian kedua |
| Helper yang meng-assert "berhasil" dipakai test yang mengharapkan revert | `attestation tidak tercatat resolver: 0x000… == 0x000…` | setelah `expectRevert` cocok, **eksekusi lanjut**. Pisahkan `_attemptX()` (tanpa penilaian) dan `_doX()` (assert + return) |
| `vm.expectEmit` | `Approval != expected log` padahal operasinya sukses | hanya membandingkan **log berikutnya**; kontrak kita melepas `Transfer`/`Approval` dulu → pakai `vm.recordLogs()` + cari `topics[0]` sendiri |
| Modifier di fungsi test | test "lulus" padahal tidak jalan | `vm.skip(block.chainid != 97 && block.chainid != 56)` — chain lain **di-skip, bukan dihitung lulus** |
| **`forge script --broadcast` memakai calldata hasil simulasi** | simulasi hijau penuh, siaran gagal sebagian. **UID attestation EAS dihitung dari `block.timestamp`**, jadi argumen yang bergantung UID basi saat disiarkan di blok berbeda | **`--slow`**. Turun 3 gagal → 1. Akan terjadi lagi di testnet nyata, bukan cuma di anvil |
| Transaksi gagal tanpa sebab di log | hanya `Error: Transaction Failure: <hash>` | sebab revert **tidak ada di receipt**. Ulangi panggilan yang sama sebagai `eth_call` pada blok sebelumnya → error aslinya keluar |

### Dependensi

| jebakan | gejala | solusi |
|---|---|---|
| Dependensi pihak ketiga ber-pin pragma lama | `EAS.sol`/`SchemaRegistry.sol` BAS = `pragma solidity 0.8.19` (pinned) vs OZ `^0.8.20` → **tidak bisa serumah** | jangan naikkan pin orang lain; **keluarkan file itu dari jalur build**, pakai interfacenya (`^0.8.0`), dan uji perilakunya lewat **fork**. Konsekuensinya justru lebih kuat: yang diuji = deployment sungguhan |
| `forge-std` dari npm | `ETARGET No matching version found for forge-std@^1.9.4` | paket npm berhenti di **1.1.2**, terlalu tua untuk `makeAddr`/`bound`/`vm.sign`. Pakai `forge install foundry-rs/forge-std --no-git` (flag `--no-git` wajib kalau folder belum jadi repo) |
| OpenZeppelin ≥ ~5.4 | `The "mcopy" instruction is only available for Cancun-compatible VMs` | pin **5.1.0**, biarkan build bertarget `shanghai` |
| `safeTransferFrom(from,to,id)` OZ 5.x | `Trying to override non-virtual function` | varian 3-argumen **tidak** `virtual`; jangan di-override. Semua pemindahan **dan burn** lewat `_update(to, tokenId, auth)` — override tunggal itu menutup keduanya |
| Error pihak ketiga tak bisa diimpor | `AlreadyRevoked` dkk. ada di **badan `contract EAS`**, bukan di `IEAS` | deklarasikan `error AlreadyRevoked();` **dengan nama persis sama** di berkas test — selector dihitung dari tanda tangan, bukan lokasi deklarasi |

### TypeScript / viem — dan kenapa `npm run probe` ada

| jebakan | gejala | solusi |
|---|---|---|
| **ABI human-readable dilewatkan mentah ke viem** | `Cannot use 'in' operator to search for 'name' in function statusOf(bytes32 …)`. **`tsc` dan `vite build` TIDAK menangkapnya** | `parseAbi([...])`. Baru kelihatan pada panggilan pertama ke chain — dan karena data layer kita sengaja tidak melempar exception, akibatnya **halaman bilang "tidak dikenali" untuk kredensial yang sah**. Ketahuan oleh probe, bukan oleh compiler |
| Fungsi yang tidak ada di kontrak ikut dideklarasikan | `The contract function "totalSupply" reverted` — OZ 5.x **menghapus** `totalSupply` dari ERC721 | jangan mendeklarasikan fungsi yang tidak kamu buka di kontrak |
| `readContract` mengembalikan `unknown` di dalam callback generic | puluhan error TS2322 dari satu helper | terima `Promise<unknown>` dan cast di **satu** tempat; yang menjaga kebenarannya adalah probe, bukan 33 cast tersebar |

### Jaringan (dan ini yang paling sering salah dibaca)

| gejala | sebab sebenarnya |
|---|---|
| `os error 10060` / `10061` pada RPC testnet | `data-seed-prebsc-1-s1` / `-2-s1` menjawab satu probe lalu menolak koneksi beberapa menit kemudian. Yang stabil: `bsc-testnet.publicnode.com`, `data-seed-prebsc-1-s2/-s3`, `bsc-testnet.drpc.org` |
| `invalid peer certificate: certificate expired` di Foundry, **tapi Python/PowerShell menerima host yang sama** | `bsc-dataseed.binance.org` DNS round-robin: beda IP, beda sertifikat. Untuk chain 56 lewat Foundry pakai `bsc-dataseed1.bnbchain.org` |
| `error -32001 block not found` saat fork | node itu tidak melayani **state historis** yang dibutuhkan fork. `bsc-rpc.publicnode.com` (mainnet) begitu |
| BscScan tidak bisa dipakai sebagai alat verifikasi | HTML → 403; API V1 deprecated; Etherscan V2 untuk BSC = **Paid Tier Only**. Jalur yang berhasil: **RPC publik + `eth_getCode`/`eth_call`**. Efek sampingnya: `forge verify-contract` kemungkinan gagal — jangan habiskan hari di situ |
| `web_fetch` untuk membaca kode | hasilnya ringkasan model, atau kosong pada dokumen besar. **Unduh mentah** (`raw.githubusercontent.com`) lalu baca. Untuk repo besar: git tree API sekali jalan (`/git/trees/<branch>?recursive=1`) |

**Aturannya: probe dulu endpoint-nya, baru bicara tentang kontraknya.** Bedakan tiga kegagalan
yang berbeda — *koneksi mati* ≠ *TLS ditolak* ≠ *node tidak punya state historis* ≠
*kontraknya berperilaku salah*.

### Solidity & Windows

- **Karakter non-ASCII di string literal ditolak**: `Error (8936): Invalid character in string`.
  Komentar bebas Unicode, **string literal tidak**. Kena dua kali karena pesan test berbahasa
  Indonesia pakai em-dash. Pakai koma/hyphen ASCII di pesan.
- **`console2.log(string, bytes32)` tidak ada overloadnya** → pakai `console2.logBytes32(v)`.
- Cast `address` → kontrak `payable` harus lewat `payable(...)` (SchemaResolver EAS memang payable).
- cmd.exe merusak newline `python -c` multi-baris → selalu tulis file `.py`.
- PowerShell `ConvertFrom-Json` membuat angka besar jadi `[double]` dan merusak aritmetika wei →
  hitung di Python dengan `int(hex, 16)`.

## C. Aturan yang lahir dari daftar di atas

1. **Bukti perilaku mengalahkan bukti struktur.**
2. **Kalau test atau penelusuran gagal dengan sebab aneh, curigai urutan alatnya lebih dulu** —
   prank, expect, nonce, `block.timestamp`, RPC — sebelum menyalahkan produk.
3. **"Ditugaskan ke agen" ≠ "sudah diperiksa."** Setiap klaim di dokumen ini punya perintah yang
   menghasilkannya.
4. **Untuk klaim teknis yang menentukan, verifikasi langsung mengalahkan sintesis literatur.**
