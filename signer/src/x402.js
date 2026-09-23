/**
 * Sisi HTTP dari pembayaran x402: persyaratan, header `X-PAYMENT`, dan settlement.
 *
 * Kenapa berkas ini ada: settlement on-chain sudah terbukti (7 fork test + `PaidVerificationDemo`),
 * tapi belum ada satu baris pun yang membuat server MENOLAK melayani sebelum dibayar. Tanpa itu
 * "verifikasi berbayar" tetap kalimat di slide, bukan perilaku yang bisa dicoba orang lain.
 *
 * Dua domain separator ditulis TERPISAH dan itu bukan kecerobohan:
 *   - Permit2 TIDAK punya field `version`
 *   - token EIP-2612 (OpenZeppelin) PUNYA `version: "1"`
 * Ketukar keduanya menghasilkan tanda tangan yang sah bentuknya dan ditolak kontraknya.
 *
 * Batas yang disebut di muka: `settleWithPermit` adalah pekerjaan FASILITATOR — di demo ini server
 * kita yang membayar gas, di produksi itu pihak ketiga. Yang dibuktikan di sini adalah genggaman
 * `402` -> bayar -> settlement -> dibagi -> dilayani -> `X-PAYMENT-RESPONSE`.
 */
import {
  createPublicClient, createWalletClient, http, keccak256, toBytes, toHex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
export const X402_EXACT_PROXY = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001'

const TOKEN_NAME = 'Lencana Demo Coin'

const permit2Domain = (chainId) => ({ name: 'Permit2', chainId, verifyingContract: PERMIT2 })
const tokenDomain = (chainId, token) => ({ name: TOKEN_NAME, version: '1', chainId, verifyingContract: token })

const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
}

const PERMIT_WITNESS_TYPES = {
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  // Nama tipenya harus tepat "Witness": typehash Permit2 menenun string nama tipe ke dalamnya.
  Witness: [
    { name: 'to', type: 'address' },
    { name: 'validAfter', type: 'uint256' },
  ],
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
}

/** `accepts[]` skema `exact`, sesuai bentuk yang dibaca klien/SDK x402 — bukan bentuk karangan kita. */
export function paymentRequirements ({ tokenAddress, payTo, amount, chainId, resource, maxTimeoutSeconds = 600 }) {
  return {
    scheme: 'exact',
    network: `eip155:${chainId}`,
    maxAmountRequired: String(amount),
    resource,
    description: 'Satu pembayaran = satu laporan verifikasi: status dari resolver, artefak, rantai prasyarat, dan penerbit.',
    mimeType: 'application/json',
    payTo,
    paymentTimeout: maxTimeoutSeconds,
    maxTimeoutSeconds,
    asset: tokenAddress,
    extra: { name: TOKEN_NAME, version: '1' },
  }
}

/**
 * Klien: dua tanda tangan, NOL transaksi. `tokenNonce` WAJIB dibaca dari kontrak — memakai 0 untuk
 * pembayaran kedua membuat yang kedua selalu gagal dengan sebab yang jauh dari tempat perbaikannya.
 */
export async function buildClientPayment ({
  account, token, chainId, amount, payTo, nonce, deadline, validAfter, tokenNonce,
}) {
  const eip2612 = await account.signTypedData({
    domain: tokenDomain(chainId, token),
    primaryType: 'Permit',
    types: PERMIT_TYPES,
    message: { owner: account.address, spender: PERMIT2, value: BigInt(amount), nonce: BigInt(tokenNonce), deadline: BigInt(deadline) },
  })
  const witnessSig = await account.signTypedData({
    domain: permit2Domain(chainId),
    primaryType: 'PermitWitnessTransferFrom',
    types: PERMIT_WITNESS_TYPES,
    message: {
      permitted: { token, amount: BigInt(amount) },
      spender: X402_EXACT_PROXY,
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
      witness: { to: payTo, validAfter: BigInt(validAfter) },
    },
  })
  return { eip2612, witnessSig }
}

/** Muatan yang dikirim sebagai `X-PAYMENT`: base64(JSON), seperti SDK x402. */
export function encodePaymentHeader (payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

export function decodePaymentHeader (header) {
  if (!header) return null
  try {
    const parsed = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
    return parsed && parsed.payload ? parsed : null
  } catch {
    return null
  }
}

/** Pecah tanda tangan 65 byte. Kontrak mengharapkan `v` rantai-aman (27/28), bukan yParity. */
function decodeSig (hex) {
  const b = Uint8Array.from((hex ?? '').slice(2).match(/../g) ?? [], (x) => Number.parseInt(x, 16))
  if (b.length !== 65) throw new Error(`panjang tanda tangan bukan 65 byte: ${b.length}`)
  const v = b[64]
  return {
    r: toHex(b.slice(0, 32)),
    s: toHex(b.slice(32, 64)),
    v: v < 27 ? v + 27 : v,
  }
}

function bytesOf (hex) {
  return Uint8Array.from(hex.slice(2).match(/../g) ?? [], (x) => Number.parseInt(x, 16))
}

const proxyAbi = [{
  type: 'function', name: 'settleWithPermit', stateMutability: 'nonpayable',
  inputs: [
    { name: 'tokenPermit', type: 'tuple', components: [
      { name: 'value', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
      { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }, { name: 'v', type: 'uint8' },
    ] },
    { name: 'permit', type: 'tuple', components: [
      { name: 'permitted', type: 'tuple', components: [
        { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' },
      ] },
      { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
    ] },
    { name: 'owner', type: 'address' },
    { name: 'witness', type: 'tuple', components: [
      { name: 'to', type: 'address' }, { name: 'validAfter', type: 'uint256' },
    ] },
    { name: 'signature', type: 'bytes' },
  ],
  outputs: [],
}]

const splitAbi = [{
  type: 'function', name: 'splitErc20', stateMutability: 'nonpayable',
  inputs: [
    { name: 'token', type: 'address' }, { name: 'payee', type: 'address' },
    { name: 'amount', type: 'uint256' }, { name: 'ref', type: 'bytes32' },
  ],
  outputs: [],
}]

const erc20Abi = [{
  type: 'function', name: 'balanceOf', stateMutability: 'view',
  inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }],
}]

/**
 * Fasilitator menyiarkan pembayaran yang sudah ditandatangani klien, lalu membagikan pendapatannya.
 *
 * `payee` = penerbit yang kontennya dibeli. 90% pergi ke dia, 10% tinggal di platform lewat
 * pembagian kontrak — bukan karena fasilitator berhak atas semuanya.
 *
 * `splitRefSalt` wajib unik per pembayaran: penolakan replay di `SettlementSplit` itulah yang
 * membuatnya aman dipanggil ulang, dan memakai konstanta akan membuat pembayaran kedua selalu gagal.
 */
export async function settlePayment ({
  rpcUrl, facilitatorPk, payment, split, payee, splitRefSalt,
}) {
  const p = payment.payload
  const public_ = createPublicClient({ transport: http(rpcUrl) })
  const facilitator = privateKeyToAccount(facilitatorPk)
  const wallet = createWalletClient({ account: facilitator, transport: http(rpcUrl) })

  const w = decodeSig(p.witnessSig)
  const t = decodeSig(p.eip2612)

  const settleTx = await wallet.writeContract({
    address: X402_EXACT_PROXY, abi: proxyAbi, functionName: 'settleWithPermit',
    args: [
      { value: BigInt(p.amount), deadline: BigInt(p.deadline), r: t.r, s: t.s, v: t.v },
      {
        permitted: { token: p.token, amount: BigInt(p.amount) },
        nonce: BigInt(p.nonce),
        deadline: BigInt(p.deadline),
      },
      p.payer,
      { to: p.payTo, validAfter: BigInt(p.validAfter) },
      toHex(Uint8Array.from([...bytesOf(w.r), ...bytesOf(w.s), w.v])),
    ],
  })
  const receipt = await public_.waitForTransactionReceipt({ hash: settleTx })
  if (receipt.status !== 'success') throw new Error(`settlement revert: ${settleTx}`)

  const splitRef = keccak256(toBytes(`x402-http:${splitRefSalt}`))
  const splitTx = await wallet.writeContract({
    address: split, abi: splitAbi, functionName: 'splitErc20',
    args: [p.token, payee, BigInt(p.amount), splitRef],
  })
  const splitReceipt = await public_.waitForTransactionReceipt({ hash: splitTx })
  if (splitReceipt.status !== 'success') throw new Error(`split revert: ${splitTx}`)

  // Dibaca dari chain, bukan disimpulkan dari gas atau nilai return.
  const [issuerShare, platformShare, leftInSplit] = await Promise.all([
    public_.readContract({ address: p.token, abi: erc20Abi, functionName: 'balanceOf', args: [payee] }),
    public_.readContract({ address: p.token, abi: erc20Abi, functionName: 'balanceOf', args: [facilitator.address] }),
    public_.readContract({ address: p.token, abi: erc20Abi, functionName: 'balanceOf', args: [split] }),
  ])

  return { settleTx, splitTx, splitRef, issuerShare, platformShare, leftInSplit }
}
