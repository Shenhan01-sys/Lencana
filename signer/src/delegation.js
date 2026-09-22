/**
 * Jalur delegasi (D31): agen menandatangani, platform menyiarkan.
 *
 * Kenapa berkas ini ada: tanpa ini "agen penerbit" cuma klaim di slide. Dengan ini, attestation
 * tercatat dengan `attester` = alamat agen (jadi pencabutan, reputasi, dan delisting D30 melekat
 * padanya) sementara **agen tidak pernah menyentuh gas** — yang bayar adalah kunci platform.
 * Itu onboarding nol-BNB untuk agen pihak ketiga, dan `CredentialResolver.onAttest` menggerbangi
 * `_issuer[attestation.attester]`, bukan `msg.sender`, jadi platform yang menyiarkan tidak ditolak.
 *
 * ⚠️ Digest di bawah ini bukan sesuatu yang boleh "kira-kira benar". Aturan EIP-712 untuk struct
 * hash adalah `abi.encode` per field (SETIAP field ditumpuk ke 32 byte), jadi memakai
 * `encodePacked` pada `uint64` akan menghasilkan 8 byte dan tanda tangannya gagal di chain publik
 * dengan `InvalidSignature()` — sementara seluruh unit test lokal tetap hijau. Karena itu field
 * kecil di sini sengaja dinaikkan ke tipe 256-bit yang setara, dan domain separator DIBACA dari
 * kontrak, tidak dihitung ulang: kalau BAS mengganti domain, fungsi ini ikut benar tanpa diubah.
 *
 * Sumber urutan field: `EIP1271Verifier._verifyAttest` (cermin di
 * `app/test/CredentialResolver.fork.t.sol:511`, 68 test lulus di fork chain 97 & 56) dan struct
 * di `lib/bas/src/IEAS.sol`.
 */
import {
  createPublicClient, createWalletClient, http,
  encodeAbiParameters, keccak256, concat, recoverAddress,
} from 'viem'
import { privateKeyToAccount, sign } from 'viem/accounts'
import { basAbi, EMPTY_UID } from '../../web/src/abi.ts'

/**
 * Nilai typehash, bukan string-nya.
 *
 * Sengaja TIDAK menulis `keccak256("Attest(...)")` di sini sebagai komentar "sumber": kami belum
 * mengukur teks signature-nya dari `EIP1271Verifier.sol` BAS. Yang terverifikasi adalah ANGKA ini —
 * ia dipakai `CredentialResolver.fork.t.sol:110` dan 68 test lulus di fork chain 97 & 56, dan
 * jalur delegasinya baru saja terbukti di chain publik. Kalau BAS suatu saat mengganti strukturnya,
 * yang jatuh lebih dulu adalah tes fork itu, bukan asumsi di komentar.
 */
export const ATTEST_TYPEHASH = '0xfeb2925a02bae3dae48d424a0437a2b6ac939aa9230ddc55a1a76f065d988076'

function chainFor (id, rpcUrl) {
  return {
    id,
    name: `chain-${id}`,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  }
}

/**
 * `data` attestation kita = persis tiga bytes32 yang dibaca `CredentialResolver._validatePrerequisite`:
 * (credentialHash, courseId, lessonId). Untuk kredensial tingkat kursus, `lessonId` = EMPTY_UID.
 */
export function encodeCredentialData ({ credentialHash, courseId, lessonId = EMPTY_UID }) {
  return encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }],
    [credentialHash, courseId, lessonId],
  )
}

/** Context yang wajib dibaca dari chain — bukan diasumsikan: nonce dan domain bisa berubah. */
export async function readDelegationContext ({ rpcUrl, basAddress, attester }) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const [domain, nonce, chainId] = await Promise.all([
    client.readContract({ address: basAddress, abi: basAbi, functionName: 'getDomainSeparator' }),
    client.readContract({ address: basAddress, abi: basAbi, functionName: 'getNonce', args: [attester] }),
    client.getChainId(),
  ])
  return { domain, nonce, chainId, client }
}

/**
 * Digest yang ditandatangani agen.
 *
 * Urutan: typehash, attester, schema, recipient, expirationTime, revocable, refUID,
 * keccak256(data), value, NONCE, deadline. Nonce masuk hash dan BAS melakukan
 * `_nonces[attester]++` di dalam verifikasi — tanda tangan untuk nonce N hanya sah satu kali,
 * dan itu yang membuat permintaan yang tertahan di tangan relayer tidak bisa dipakai ulang.
 */
export function attestDigest ({
  domain, attester, schema, recipient, expirationTime, revocable = true,
  refUID = EMPTY_UID, data, value = 0n, nonce, deadline,
}) {
  const structHash = keccak256(encodeAbiParameters(
    [
      // Semua field dinaikkan ke word 256-bit: itu yang `abi.encode` lakukan, dan EIP-712
      // mengikutinya. (uint64/bool yang "seharusnya" 8 byte justru masalahnya.)
      { type: 'bytes32' }, { type: 'address' }, { type: 'bytes32' }, { type: 'address' },
      { type: 'uint256' }, { type: 'bool' }, { type: 'bytes32' }, { type: 'bytes32' },
      { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' },
    ],
    [
      ATTEST_TYPEHASH, attester, schema, recipient,
      BigInt(expirationTime), revocable, refUID, keccak256(data),
      BigInt(value), BigInt(nonce), BigInt(deadline),
    ],
  ))
  return keccak256(concat(['0x1901', domain, structHash]))
}

/**
 * Satu permintaan, satu tanda tangan, dan yang dikembalikan adalah ENTRY LENGKAP
 * (field yang ditandatangani + signature-nya).
 *
 * Bentuk ini bukan kenyamanan: sebelumnya `sign` dan `relay` menerima argumen sendiri-sendiri,
 * dan itu membolehkan yang disiarkan BERBEDA dari yang ditandatangani — kegagalan yang hasilnya
 * `InvalidSignature()` di chain publik. Sekarang keduanya tidak punya kesempatan untuk menyimpang,
 * karena hanya ada satu objek di antara keduanya.
 */
export async function signDelegatedAttestation ({ agentPrivateKey, domain, schema, entry, nonce, deadline }) {
  const account = privateKeyToAccount(agentPrivateKey)
  // `attester` yang dihash HARUS alamat kunci yang sama yang menandatangani — itu inti D31.
  const digest = attestDigest({ domain, schema, attester: account.address, ...entry, nonce, deadline })
  // ⚠️ `sign({ hash })`, BUKAN `signMessage({ message: { raw: digest } })`.
  //   `signMessage` adalah JSON-RPC `personal_sign`: ia SELALU menempelkan prefiks
  //   "\x19Ethereum Signed Message:\n32" sebelum dihash, jadi yang ditandatangani bukan digest
  //   EIP-712-nya dan kontrak membalas `InvalidSignature()`. Kegagalannya sunyi di sisi kita:
  //   bentuk tanda tangan tetap 65 byte, valid secara ECDSA, dan tetap ditolak chain.
  const signature = normalizeSignature(await sign({ hash: digest, privateKey: agentPrivateKey }))

  // Penjaga, bukan seremonial: kalau `v` salah normalisasi atau digest-nya terselubung prefiks
  // personal_sign, yang pulih adalah alamat lain — dan chain akan membalas `InvalidSignature()`
  // tanpa menyebut salah satunya. Lebih murah berhenti di sini.
  const recovered = await recoverAddress({ hash: digest, signature: `${signature.r}${signature.s.slice(2)}${Number(signature.v - 27).toString(16).padStart(2, '0')}` })
  if (recovered.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`tanda tangan tidak recover ke alamat agen: ${recovered} != ${account.address}`)
  }

  return {
    ...entry,
    schema,
    attester: account.address,
    deadline,
    digest,
    signature,
  }
}

/**
 * viem mengembalikan objek `{ r, s, v }` dari `sign()` (hex 65 byte dari tempat lain), dan
 * sebagian implementasi memberi `v` sebagai 0/1, bukan 27/28. EIP-1271Verifier meneruskan apa pun
 * yang kita kasih ke `ecrecover`, jadi `v` yang salah bentuk = `InvalidSignature()` tanpa pesan
 * yang menyebut `v`. Dinormalisasi di satu tempat, di sini.
 */
function normalizeSignature (sig) {
  if (typeof sig === 'string') {
    return {
      v: Number(`0x${sig.slice(130, 132)}`),
      r: `0x${sig.slice(2, 66)}`,
      s: `0x${sig.slice(66, 130)}`,
    }
  }
  const raw = Number(sig.v)
  return {
    v: raw < 27 ? raw + 27 : raw,
    r: sig.r,
    s: sig.s,
  }
}

/** Satu `AttestationRequestData`. Nama field, bukan posisi: viem menyusun tuple per komponen. */
function toDataStruct (e) {
  if (!e.signature) throw new Error('entri tanpa tanda tangan: tanda tangani dulu dengan signDelegatedAttestation')
  return {
    recipient: e.recipient,
    expirationTime: BigInt(e.expirationTime),
    revocable: e.revocable ?? true,
    refUID: e.refUID ?? EMPTY_UID,
    data: e.data,
    value: e.value ?? 0n,
  }
}

/**
 * `MultiDelegatedAttestationRequest` — `data` dan `signatures` adalah ARRAY yang sejajar.
 */
export function toMultiRequest ({ schema, attester, deadline, entries }) {
  return {
    schema,
    data: entries.map(toDataStruct),
    signatures: entries.map((e) => e.signature),
    attester,
    deadline: BigInt(deadline),
  }
}

/**
 * `DelegatedAttestationRequest` — SATU struct `data` dan SATU `signature`.
 *
 * Ini bukan versi jamak yang dikurangi: bentuknya beda, dan dulu keduanya dilayani satu builder.
 * Akibatnya jalur tunggal mengirim ARRAY ke posisi yang harusnya struct, lalu viem menyerahkannya
 * sebagai object ke parameter `address` -> `InvalidAddressError: Address "[object Object]"`.
 * Kegagalannya di sisi klien dan sebelum gas apa pun bergerak, yang justru membuatnya mudah
 * dianggap sepele. Sekarang tiap jalur punya pembentuknya sendiri, supaya tidak ada yang bisa
 * "kira-kira sama".
 */
export function toSingleRequest ({ schema, attester, deadline, entry }) {
  return {
    schema,
    data: toDataStruct(entry),
    signature: entry.signature,
    attester,
    deadline: BigInt(deadline),
  }
}

/**
 * Platform menyiarkan apa yang agen tanda tangani.
 *
 * @param batch  true -> `multiAttestByDelegation` (beberapa lesson SATU transaksi, nonce menaik)
 * @returns hash transaksi, gas yang dibayar platform, dan nomor blok. UID-nya SENGAJA tidak
 *          dibongkar dari log di sini: pembacaan kembalinya dilakukan lewat
 *          `CredentialResolver.attestationOf(credentialHash)`, yang membuktikan dua hal sekaligus
 *          — BAS mencatatnya DAN resolver kita mengindeksnya. Menguraikan topic event sendiri
 *          cuma membuktikan satu hal dan bisa salah tanpa suara.
 */
export async function relayDelegated ({
  rpcUrl, basAddress, platformPrivateKey, schema, attester, deadline, entries, batch = entries.length > 1,
}) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const account = privateKeyToAccount(platformPrivateKey)
  const chain = chainFor(await client.getChainId(), rpcUrl)
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) })

  let txHash
  if (batch) {
    txHash = await wallet.writeContract({
      address: basAddress, abi: basAbi, functionName: 'multiAttestByDelegation',
      args: [[toMultiRequest({ schema, attester, deadline, entries })]],
    })
  } else {
    if (entries.length !== 1) throw new Error(`jalur tunggal butuh tepat 1 entri, dapat ${entries.length}`)
    txHash = await wallet.writeContract({
      address: basAddress, abi: basAbi, functionName: 'attestByDelegation',
      args: [toSingleRequest({ schema, attester, deadline, entry: entries[0] })],
    })
  }

  const receipt = await client.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') throw new Error(`delegasi revert: ${txHash}`)
  return { txHash, gasUsed: receipt.gasUsed, batch, from: account.address, blockNumber: receipt.blockNumber }
}
