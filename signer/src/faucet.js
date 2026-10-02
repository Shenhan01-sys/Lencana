/**
 * Koin uji LDC-demo untuk peserta (B125, RF7 langkah B).
 *
 * Kenapa server yang mencetak: dompet tertanam peserta yang baru lahir tidak punya BNB, jadi ia tidak bisa memanggil
 * `mint` sendiri walau fungsi itu terbuka. Platform membayar gasnya, dan rute `/faucet` membatasinya sekali per alamat
 * per jendela waktu (dicatat lewat nonce bertanda tangan, bukan memori proses).
 *
 * Hanya testnet: LDC-demo adalah koin uji bernilai nol (`DemoCourseToken`, chain 97). Di mainnet tidak ada faucet —
 * peserta membayar dengan stablecoin miliknya sendiri.
 */
import { createPublicClient, createWalletClient, getAddress, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const tokenAbi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

/** Cetak `amount` ke `to`, tunggu receipt, lalu baca saldonya dari chain (bukan disimpulkan dari tx). */
export async function mintTestCoins ({ rpcUrl, minterPk, token, to, amount }) {
  const account = privateKeyToAccount(minterPk)
  const wallet = createWalletClient({ account, transport: http(rpcUrl) })
  const public_ = createPublicClient({ transport: http(rpcUrl) })
  const recipient = getAddress(to)
  const tx = await wallet.writeContract({ address: token, abi: tokenAbi, functionName: 'mint', args: [recipient, BigInt(amount)] })
  const receipt = await public_.waitForTransactionReceipt({ hash: tx })
  if (receipt.status !== 'success') throw new Error(`mint revert: ${tx}`)
  const balance = await public_.readContract({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [recipient] })
  return { tx, balance }
}
