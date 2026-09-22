/**
 * ABI yang dibacakan halaman ini.
 *
 * Sumber kebenaran = `../contracts/*.sol` dan `../lib/bas/src/*.sol`. Kalau kontrak berubah,
 * berkas ini berubah bersamanya — kalau tidak, decode diam-diam menghasilkan nilai yang
 * salah dan halaman tetap terlihat "jalan".
 *
 * Urutan field struct TIDAK boleh ditebak. Dua struct di bawah disalin persis dari:
 *   Common.sol      : struct Attestation { uid, schema, time, expirationTime,
 *                         revocationTime, refUID, recipient, attester, revocable, data }
 *   ISchemaRegistry : struct SchemaRecord { uid, resolver, revocable, schema }
 * (BAS = fork EAS 1.3.0, jadi TIDAK ada `schemaVersion` di Attestation — field itu ada di
 *  rilis EAS lain dan menambahkannya ke sini akan menggeser SEMUA field sesudahnya.)
 *
 * 🔴 `parseAbi` itu wajib, bukan gaya. Viem mengharapkan ABI yang sudah di-parse; melewati
 * string human-readable apa adanya membuatnya melempar
 *   `Cannot use 'in' operator to search for 'name' in function statusOf(bytes32 ...)`
 * dan `tsc` maupun `vite build` TIDAK menangkapnya — baru kelihatan pada panggilan pertama
 * ke chain. Karena data layer kita sengaja tidak melempar exception, kegagalan ini akan
 * tampil sebagai "kredensial tidak dikenali" untuk sertifikat yang sebenarnya sah: jenis
 * kegagalan terburuk untuk produk verifikasi. Ketahuan oleh `npm run probe`.
 */
import { parseAbi } from 'viem'

export const credentialResolverAbi = parseAbi([
  // 🔴 TUJUH nilai, dan `issuerDelisted` ada di posisi ke-4 — bukan di akhir. Menyalin urutan
  // dari memori akan menggeser `issuer`/`issuedAt`/`expiresAt` tanpa error apa pun: decode
  // tetap "berhasil", dan halaman menampilkan alamat yang salah sebagai penerbit.
  // Sumber: contracts/CredentialResolver.sol -> statusOf()
  'function statusOf(bytes32 credentialHash) view returns (bool exists, bool revoked, bool expired, bool issuerDelisted, address issuer, uint64 issuedAt, uint64 expiresAt)',
  'function holderOf(bytes32 credentialHash) view returns (address)',
  'function attestationOf(bytes32 credentialHash) view returns (bytes32)',
  'function prerequisiteOf(bytes32 uid) view returns (bytes32)',
  'function lessonOf(bytes32 uid) view returns (bytes32)',
  'function credentialsOf(address holder) view returns (bytes32[])',
  'function credentialCount(address holder) view returns (uint256)',
  'function issuedHere(bytes32 uid) view returns (bool)',
  'function schemaUID() view returns (bytes32)',
  'function isIssuer(address who) view returns (bool)',
  'function isDelisted(address who) view returns (bool)',
  'function CREDENTIAL_SCHEMA() view returns (string)',
  'function SCHEMA_REVOCABLE() view returns (bool)',
  'function owner() view returns (address)',
])

export const basAbi = parseAbi([
  'function getAttestation(bytes32 uid) view returns ((bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))',
  'function isAttestationValid(bytes32 uid) view returns (bool)',
  'function getSchemaRegistry() view returns (address)',
  'function getTimestamp(bytes32 data) view returns (uint64)',
  'function getRevokeOffchain(address revoker, bytes32 data) view returns (uint64)',
  // Jalur delegasi (D31): agen MENANDATANGANI, platform yang MENYIARKAN. `attester` yang tercatat
  // tetap alamat agen — itu satu-satunya alasan D31 bisa ada, dan `onAttest` kita menggerbangi
  // `_issuer[attestation.attester]`, bukan `msg.sender`.
  //
  // ⚠️ Urutan field di dalam tuple bukan gaya, ia ABI: `data` memakai urutan struct IEAS
  // (recipient, expirationTime, revocable, refUID, data, value) dan `signature` adalah (v, r, s).
  // Salah satu posisi = tanda tangan tidak cocok = `InvalidSignature()` di chain publik, dan itu
  // tidak bisa ditemukan dengan membaca kode sendirian. Sumber: lib/bas/src/IEAS.sol
  // + `getDomainSeparator`/`getNonce` dibaca dari kontrak, TIDAK dihitung sendiri.
  'function getDomainSeparator() view returns (bytes32)',
  'function getNonce(address account) view returns (uint256)',
  'function increaseNonce(uint256 newNonce) external',
  'function attestByDelegation((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data, (uint8 v, bytes32 r, bytes32 s) signature, address attester, uint64 deadline) delegatedRequest) payable returns (bytes32 uid)',
  'function multiAttestByDelegation((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value)[] data, (uint8 v, bytes32 r, bytes32 s)[] signatures, address attester, uint64 deadline)[] requests) payable returns (bytes32[] uids)',
])

export const schemaRegistryAbi = parseAbi([
  'function getSchema(bytes32 uid) view returns ((bytes32 uid, address resolver, bool revocable, string schema))',
])

export const soulboundCertAbi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function locked(uint256 tokenId) view returns (bool)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function credentialOf(uint256 tokenId) view returns (bytes32)',
  'function tokenOfCredential(bytes32 credentialHash) view returns (uint256)',
  'function registry() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  // ⚠️ SENGAJA tidak ada `totalSupply()`. OpenZeppelin 5.x menghapusnya dari ERC721
  // (tersedia lewat `ERC721Enumerable`, yang tidak kita pakai karena tokenId-nya adalah
  // hash kredensial, bukan indeks berurutan). Menuliskannya di sini membuat panggilan
  // revert `execution reverted` — ketahuan oleh `npm run probe`, bukan oleh `tsc`.
])

/** Selector ERC-5192 `locked(uint256)`; dihitung ulang di test, bukan dipercaya dari catatan. */
export const ERC5192_INTERFACE_ID = '0xb45a3c0e' as const

export const EMPTY_UID = '0x0000000000000000000000000000000000000000000000000000000000000000' as const
