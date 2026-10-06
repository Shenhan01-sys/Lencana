// Lencana-B169 status=SELESAI 2026-10-06 — peserta bisa meminta artefak NFT soulbound dari app: platform mencetak ke dompet pemegang kredensial, kontrak yang memutuskan boleh/tidaknya. Buktikan ulang: cd signer && npm run verify:mint
/**
 * `mint-artifact.js` — cetak artefak soulbound untuk SATU kredensial atas permintaan pemegangnya (B169).
 *
 * Kenapa server yang mencetak: `SoulboundCert.mint` hanya bisa dipanggil `owner()` = kunci platform, dan dompet tertanam
 * peserta tidak punya BNB. Yang diminta dari pesertanya hanya tanda tangan (rute `POST /me/mint`), yang membuktikan siapa
 * yang meminta; yang memutuskan BOLEH atau tidaknya bukan kode ini melainkan kontrak: `mint` menolak kredensial yang tidak
 * ada, dicabut, kedaluwarsa, penerbitnya didelisting, bertingkat lesson, sudah punya artefak, atau pemegangnya bukan
 * `learner`. Karena itu modul ini tidak menyalin satu pun aturan — ia mensimulasikan panggilan yang sama (`eth_call` sebagai
 * platform) sebelum membayar gas, lalu menerjemahkan nama galatnya.
 *
 * Hanya satu instance yang dicetak: lapis yang menegakkan D42/D43 (`ARTIFACT_LAYER_97`). Lapis lain tetap terbaca, tidak
 * ditambah (D46).
 */
import { createPublicClient, createWalletClient, getAddress, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

/** Lapis artefak yang dicetak (chain 97): yang menegakkan D42/D43. Sama dengan `CERT_LAYERS_97[0]` di `web/src/verify.ts`. */
export const ARTIFACT_LAYER_97 = '0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa'

/** Host dokumen kredensial yang tertulis di artefak (`external_url` pada metadata), sama dengan yang dipakai B153. */
export const CREDENTIAL_HOST_DEFAULT = 'https://lencana-edge.hansgunawan775.workers.dev'

const errors = [
  { type: 'error', name: 'NotIssuer', inputs: [{ name: 'sender', type: 'address' }] },
  { type: 'error', name: 'CredentialNotFound', inputs: [{ name: 'credentialHash', type: 'bytes32' }] },
  { type: 'error', name: 'CredentialRevoked', inputs: [{ name: 'credentialHash', type: 'bytes32' }] },
  { type: 'error', name: 'CredentialExpired', inputs: [{ name: 'credentialHash', type: 'bytes32' }] },
  { type: 'error', name: 'IssuerDelisted', inputs: [{ name: 'credentialHash', type: 'bytes32' }] },
  { type: 'error', name: 'WrongHolder', inputs: [{ name: 'credentialHash', type: 'bytes32' }, { name: 'expected', type: 'address' }, { name: 'asked', type: 'address' }] },
  { type: 'error', name: 'AlreadyBound', inputs: [{ name: 'credentialHash', type: 'bytes32' }] },
  { type: 'error', name: 'LessonLevelNotMintable', inputs: [{ name: 'credentialHash', type: 'bytes32' }, { name: 'lessonId', type: 'bytes32' }] },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
  { type: 'error', name: 'ZeroCredential', inputs: [] },
  { type: 'error', name: 'EmptyURI', inputs: [] },
  { type: 'error', name: 'UnsafeUri', inputs: [{ name: 'byteAt', type: 'uint256' }] },
]

export const certAbi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'learner', type: 'address' }, { name: 'credentialHash', type: 'bytes32' }, { name: 'uri', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'tokenOfCredential', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'locked', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  ...errors,
]

/**
 * Nama galat kontrak → jawaban untuk peserta. `status` = kode HTTP rute; `kind` stabil untuk klien dan harness. Yang tidak ada di
 * sini (galat tak dikenal, RPC mati) jatuh ke `failed`/502 dan tidak membakar apa pun.
 */
export const REFUSALS = {
  CredentialNotFound: { status: 404, kind: 'not-found', why: 'this credential does not exist on chain' },
  WrongHolder: { status: 403, kind: 'not-yours', why: 'this credential does not belong to the requesting account' },
  AlreadyBound: { status: 409, kind: 'already', why: 'an artefact has already been minted for this credential' },
  CredentialRevoked: { status: 409, kind: 'revoked', why: 'this credential is revoked, so no new artefact is minted' },
  CredentialExpired: { status: 409, kind: 'expired', why: 'this credential has expired, so no new artefact is minted' },
  IssuerDelisted: { status: 409, kind: 'delisted', why: 'the issuer of this credential is delisted, so the artefact is withheld' },
  LessonLevelNotMintable: { status: 422, kind: 'lesson-level', why: 'artefacts exist only for course-level certificates, not per-lesson credentials' },
}

/** Nama galat kontrak dari galat viem (dari data revert yang didekode), atau null. */
export function revertNameOf (err) {
  for (let e = err; e; e = e.cause) {
    if (typeof e.data?.errorName === 'string') return e.data.errorName
    if (typeof e.errorName === 'string') return e.errorName
  }
  return null
}

const HASH = /^0x[0-9a-fA-F]{64}$/

/** URI yang ditulis ke artefak: dokumen kredensial di host tepi. */
export const documentUri = (hash, host = CREDENTIAL_HOST_DEFAULT) => `${host}/credentials/${String(hash).toLowerCase()}`

/**
 * Cetak artefak untuk `learner` atas `hash`. Tidak pernah melempar untuk keadaan yang dinamai kontrak: yang dikembalikan
 * `{ ok:false, status, kind, why }`; hanya galat tak terduga (RPC mati, saldo gas habis) yang menjadi `kind: 'failed'`.
 *
 * `deps` untuk harness: `{ publicClient, walletClient, account }` menggantikan klien nyata (tanpa jaringan, tanpa gas).
 */
export async function mintArtifact ({ rpcUrl, minterPk, cert = ARTIFACT_LAYER_97, learner, hash, host = CREDENTIAL_HOST_DEFAULT, deps }) {
  if (!HASH.test(String(hash ?? ''))) return { ok: false, status: 400, kind: 'bad-hash', why: 'credential hash must be 0x + 64 hex characters' }
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(learner ?? ''))) return { ok: false, status: 400, kind: 'bad-learner', why: 'learner address is not valid' }
  const to = getAddress(String(learner).toLowerCase())
  const address = getAddress(cert)
  const account = deps?.account ?? privateKeyToAccount(minterPk)
  const publicClient = deps?.publicClient ?? createPublicClient({ transport: http(rpcUrl) })
  const walletClient = deps?.walletClient ?? createWalletClient({ account, transport: http(rpcUrl) })
  const uri = documentUri(hash, host)
  try {
    // Sudah punya artefak? Dijawab dari chain sebelum simulasi, supaya jawabannya membawa token yang sudah ada.
    const existing = await publicClient.readContract({ address, abi: certAbi, functionName: 'tokenOfCredential', args: [hash] })
    if (existing !== 0n) return { ok: false, status: 409, kind: 'already', why: REFUSALS.AlreadyBound.why, tokenId: String(existing) }
    // Simulasi = aturan kontrak yang sama, tanpa gas. Satu-satunya tempat aturannya hidup.
    const sim = await publicClient.simulateContract({ account, address, abi: certAbi, functionName: 'mint', args: [to, hash, uri] })
    const tx = await walletClient.writeContract(sim.request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
    if (receipt.status !== 'success') return { ok: false, status: 502, kind: 'failed', why: `mint transaction failed: ${tx}` }
    // Hasilnya dibaca dari chain, bukan disimpulkan dari tx: token, pemilik, dan kuncinya.
    const tokenId = await publicClient.readContract({ address, abi: certAbi, functionName: 'tokenOfCredential', args: [hash] })
    const owner = await publicClient.readContract({ address, abi: certAbi, functionName: 'ownerOf', args: [tokenId] })
    const locked = await publicClient.readContract({ address, abi: certAbi, functionName: 'locked', args: [tokenId] })
    return { ok: true, tx, cert: address, tokenId: String(tokenId), owner, locked }
  } catch (err) {
    const name = revertNameOf(err)
    const refusal = name ? REFUSALS[name] : null
    if (refusal) return { ok: false, status: refusal.status, kind: refusal.kind, why: refusal.why }
    return { ok: false, status: 502, kind: 'failed', why: `mint failed: ${String(err?.shortMessage ?? err?.message ?? err).split('\n')[0].slice(0, 160)}` }
  }
}
