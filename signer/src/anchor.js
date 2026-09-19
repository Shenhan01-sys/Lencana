/**
 * Mengunci daftar status ke chain lewat BAS `timestamp()`.
 *
 * Ini paragraf yang membuat klaim D24.1=A berdiri dengan dua kaki, bukan satu:
 *
 *   tanpa anchor -> "kami yang menyajikan daftar status ini"                 (percaya ke server)
 *   dengan anchor -> "isi daftar pada jam X tidak bisa diubah tanpa terlihat"
 *
 * BAS menyimpan `uint64` waktu per `bytes32` dan TIDAK menyimpan isinya, jadi yang kita kunci
 * adalah **hash bitstring yang kami sajikan apa adanya**. Siapa pun bisa membaca
 * `getTimestamp(hash)` dari chain tanpa mempercayai kami, dan membandingkannya dengan daftar yang
 * sedang kami hidangkan: kalau kami menyunting diam-diam, hash baru tidak punya entri sementara
 * entri lama tetap menunjuk isi yang lama.
 *
 * ⚠️ Yang TIDAK diberikan `timestamp()`: bukan jaminan kami selalu menyajikan daftar yang sama ke
 * semua orang, dan bukan pemeriksaan panjang bitstring. Yang ia kunci hanya "hash ini sudah ada di
 * chain pada jam ini".
 */
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sha256Hex } from './credential.js'

const BasAbi = [
  {
    type: 'function',
    name: 'timestamp',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'bytes32' }],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'getTimestamp',
    stateMutability: 'view',
    inputs: [{ name: 'data', type: 'bytes32' }],
    outputs: [{ type: 'uint64' }],
  },
]

/**
 * bytes32 yang dikunci: hash SHA-256 dari string `encodedList` PERSIS seperti yang disajikan.
 * Hash disimpan sebagai hex, jadi bentuk on-chain-nya `0x` + 64 karakter hex.
 */
export function listHashBytes (encodedList) {
  return `0x${sha256Hex(encodedList)}`
}

function chainFor (id, rpcUrl) {
  // Rantai disusun dari node itu sendiri, bukan dari tabel nama: salah salin chain id = transaksi
  // ditolak dengan pesan yang terlihat seperti masalah kunci.
  return {
    id,
    name: `chain-${id}`,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  }
}

/**
 * @param privateKey kunci yang membayar (lapis platform — bukan kunci agen: agen menandatangani
 *        klaim, platform yang merawat daftar status. Sama seperti pembedaan di D30/D31.)
 */
export async function anchorListHash ({ rpcUrl, basAddress, privateKey, encodedList }) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const account = privateKeyToAccount(privateKey)
  const chain = chainFor(await client.getChainId(), rpcUrl)
  // viem 2.x tidak menempelkan `writeContract` ke public client: penulisan lewat wallet client,
  // pembacaan dan receipt tetap lewat public client.
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const data = listHashBytes(encodedList)

  const txHash = await wallet.writeContract({
    address: basAddress, abi: BasAbi, functionName: 'timestamp', args: [data],
  })
  const receipt = await client.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') throw new Error(`timestamp() revert: ${txHash}`)
  return { data, txHash, gasUsed: receipt.gasUsed }
}

/** Dibaca terpisah dari penulisan: nilai yang diklaim harus benar-benar terbaca dari chain. */
export async function readAnchor ({ rpcUrl, basAddress, data }) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  return client.readContract({
    address: basAddress, abi: BasAbi, functionName: 'getTimestamp', args: [data],
  })
}

export { BasAbi }
