/**
 * Sisi HTTP dari `CourseDeposit` (B90): aturan tenggat penerbit sebagai dokumen ber-hash, keadaan
 * setoran dibaca dari chain, dan penyelesaian yang diadili SEBELUM gas.
 *
 * Empat hal yang tadinya argumen bebas, dan sekarang tidak:
 *   - `policyHash` dihitung dari manifest penerbit + aturan tenggatnya (`deadlinePolicyOf`), bukan
 *     dikirim siapa pun. Setoran yang `policyHash`-nya bukan hash itu ditolak saat penyelesaian.
 *   - `uid` dibaca dari resolver (`attestationOf(credentialHash)`), bukan dari badan permintaan.
 *   - `issuedAt` dibaca dari BAS (`getAttestation(uid).time`), bukan dari jam kami dan bukan dari
 *     badan permintaan. Ini yang menentukan tepat waktu atau telat.
 *   - `refundBps` punya satu nilai yang benar menurut aturan (D52: premi kembali utuh kalau tepat
 *     waktu, hangus kalau telat); angka lain ditolak walau ditandatangani penerbit.
 * Yang tetap milik penerbit: tanda tangannya. Server ini menyiarkan; ia tidak bisa menyelesaikan
 * setoran tanpa tanda tangan EOA penerbit atas digest yang sama dengan yang dihitung kontrak.
 *
 * Kenapa aturannya hidup di sini dan bukan di `web/src/manifest.ts`: manifest dipakai halaman yang
 * dirawat pemelihara FE, dan menambah field di sana sekarang berarti menyentuh berkas yang sedang
 * diubah di branch lain. Aturannya tetap TERIKAT ke manifest — `manifestHash` dan `rubricHash` ikut
 * masuk dokumen yang di-hash — jadi mengganti manifest menggeser `policyHash`. Memindahkannya ke
 * dalam manifest adalah pekerjaan lanjutan, bukan sesuatu yang diklaim sudah terjadi.
 *
 * Batas yang tidak boleh hilang: harga dasar kursus belum ada di manifest, jadi `amount` yang
 * disetor TIDAK diadili terhadap premi tier (kontrak pun tidak memaknainya). Dan siaran mati secara
 * bawaan — hanya jalan kalau `DEPOSIT_BROADCAST=1`.
 */

// Lencana-B90 status=SELESAI 2026-09-30 — setoran tenggat: policyHash dari manifest, uid dan issuedAt dari chain (bukan dari badan permintaan), refundBps wajib mengikuti aturan, penolakan sebelum gas. Urutan kunci dokumen aturan menentukan policyHash. Buktikan ulang: npm run verify:deposit. JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import {
  createPublicClient, createWalletClient, http, keccak256, stringToBytes, toBytes, encodeAbiParameters,
  parseAbi, getAddress, isAddress, recoverMessageAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { credentialHashOf } from './credential.js'
import { credentialResolverAbi, basAbi, EMPTY_UID } from '../../web/src/abi.ts'
import { manifestOf, manifestHashOf, rubricHashOf } from '../../web/src/manifest.ts'

export const DEPOSIT_MAX_BPS = 10000
export const FINALIZE_PREFIX = keccak256(stringToBytes('LENCANA-DEPOSIT-FINALIZE'))

/**
 * D52 — premi tenggat. Harga dasar sama untuk semua durasi; memilih 5/7 hari membayar premi di muka
 * (25/12 per 100 harga dasar) yang kembali utuh kalau selesai tepat waktu. 9 hari = tanpa premi,
 * dan karena `deposit(0)` ditolak kontrak, tier itu berarti TIDAK ada setoran sama sekali.
 */
export const DEADLINE_TIERS = Object.freeze([
  Object.freeze({ days: 5, premiumBps: 2500 }),
  Object.freeze({ days: 7, premiumBps: 1200 }),
  Object.freeze({ days: 9, premiumBps: 0 }),
])

export const depositAbi = parseAbi([
  'function token() view returns (address)',
  'function issuer() view returns (address)',
  'function owner() view returns (address)',
  'function terms(address learner, bytes32 courseId) view returns (uint128 amount, uint32 deadlineAt, bytes32 policyHash, address learner_, address payee, bool finalized)',
  'function recordHash(address learner, bytes32 courseId) view returns (bytes32)',
  'function deposit(bytes32 courseId, uint256 amount, uint16 chosenDays, bytes32 policyHash, address payee)',
  'function finalize(address learner, bytes32 courseId, bytes32 uid, uint256 issuedAt, uint256 refundBps, bytes sig)',
  'event Finalized(address indexed learner, bytes32 indexed courseId, bytes32 uid, uint256 issuedAt, uint256 refundBps, bool withinDeadline)',
])

export const courseIdOf = (slug) => keccak256(stringToBytes(slug))

/**
 * Dokumen aturan tenggat untuk satu kursus. Urutan kunci TETAP — `policyHash` adalah hash dari
 * `JSON.stringify` objek ini, jadi menyusun ulang kunci di sini menggeser hash semua setoran baru.
 * @returns {{policy: object, policyHash: `0x${string}`} | null} null kalau kursusnya tanpa manifest
 */
export function deadlinePolicyOf (slug, { chainId, depositAddress, tokenAddress, payee }) {
  const manifest = manifestOf(slug)
  if (!manifest) return null
  const policy = {
    schema: 'lencana-deadline-policy/1',
    course: slug,
    courseId: courseIdOf(slug),
    issuer: { slug: manifest.issuer.slug, name: manifest.issuer.name },
    manifestHash: manifestHashOf(manifest),
    rubricHash: rubricHashOf(manifest),
    network: `eip155:${chainId}`,
    contract: getAddress(depositAddress),
    token: getAddress(tokenAddress),
    payee: getAddress(payee),
    model: 'deadline-premium',
    tiers: DEADLINE_TIERS.map((t) => ({ days: t.days, premiumBps: t.premiumBps })),
    onTimeRefundBps: DEPOSIT_MAX_BPS,
    lateRefundBps: 0,
    onTimeMeans: 'the BAS attestation time of the course credential is at or before deadlineAt',
    disclosure: 'Choosing a 5 or 7 day deadline means paying a premium up front. Finish on time and the whole premium comes back. Finish late, or not at all, and the premium is forfeited to the payee. The course price itself is never at risk, and choosing 9 days costs no premium.',
  }
  return { policy, policyHash: keccak256(toBytes(JSON.stringify(policy))) }
}

/** Digest yang sama dengan `CourseDeposit.finalize` — bagian dalamnya; pembungkus EIP-191 ditambah `signMessage`. */
export function finalizeInnerHash ({ learner, courseId, uid, issuedAt, refundBps, policyHash }) {
  return keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' }],
    [FINALIZE_PREFIX, getAddress(learner), courseId, uid, BigInt(issuedAt), BigInt(refundBps), policyHash],
  ))
}

const fail = (status, error, extra = {}) => ({ ok: false, status, error, ...extra })

/**
 * Keadaan satu setoran, SEMUANYA dari chain: syaratnya, apakah aturannya memang aturan penerbit,
 * kapan syarat itu distempel ke BAS, dan — kalau kredensialnya sudah ada — kapan BAS mencatatnya.
 */
export async function readDeposit ({ slug, learner, cfg }) {
  if (!isAddress(String(learner ?? ''))) return fail(422, 'learner must be a 20-byte address')
  const built = deadlinePolicyOf(slug, cfg)
  if (!built) return fail(404, 'no publisher manifest for that course', { course: slug })
  const client = createPublicClient({ transport: http(cfg.rpcUrl) })
  const who = getAddress(learner)
  const courseId = courseIdOf(slug)
  const [amount, deadlineAt, policyHash, , payee, finalized] = await client.readContract({
    address: cfg.depositAddress, abi: depositAbi, functionName: 'terms', args: [who, courseId],
  })
  if (amount === 0n) return fail(404, 'no deposit for that learner and course', { learner: who, course: slug })

  const recordHash = await client.readContract({ address: cfg.depositAddress, abi: depositAbi, functionName: 'recordHash', args: [who, courseId] })
  const recordAnchoredAt = await client.readContract({ address: cfg.basAddress, abi: basAbi, functionName: 'getTimestamp', args: [recordHash] })
  const uid = await client.readContract({
    address: cfg.resolverAddress, abi: credentialResolverAbi, functionName: 'attestationOf', args: [credentialHashOf(who, slug)],
  })
  let credential = null
  if (uid !== EMPTY_UID) {
    const att = await client.readContract({ address: cfg.basAddress, abi: basAbi, functionName: 'getAttestation', args: [uid] })
    const within = deadlineAt === 0 ? true : att.time <= BigInt(deadlineAt)
    credential = {
      uid, issuedAt: att.time, attester: att.attester, revoked: att.revocationTime !== 0n,
      withinDeadline: within, expectedRefundBps: within ? built.policy.onTimeRefundBps : built.policy.lateRefundBps,
    }
  }
  return {
    ok: true,
    status: 200,
    term: {
      learner: who, course: slug, courseId, amount, deadlineAt, payee, finalized,
      policyHash, policyMatchesPublisher: policyHash === built.policyHash,
      recordHash, recordAnchoredAt,
    },
    credential,
    expectedPolicyHash: built.policyHash,
  }
}

/**
 * Mengadili satu penyelesaian dan, kalau siaran dinyalakan, menyiarkannya.
 *
 * Urutan penolakannya disengaja: yang murah dan tidak butuh chain dulu, lalu yang dibaca dari chain,
 * dan tanda tangan paling akhir — karena digest-nya baru bisa dihitung sesudah `uid` dan `issuedAt`
 * dibaca. Tidak ada satu pun field penentu yang diambil dari badan permintaan selain `refundBps`
 * (yang lalu dicocokkan dengan aturan) dan `signature`.
 */
export async function finalizeDeposit ({ body, cfg, broadcast, platformPrivateKey }) {
  const slug = String(body?.course ?? '')
  if (!/^0x[0-9a-fA-F]{130}$/.test(String(body?.signature ?? ''))) return fail(422, 'signature must be a 65-byte hex string')
  if (!Number.isInteger(body?.refundBps) || body.refundBps < 0 || body.refundBps > DEPOSIT_MAX_BPS) {
    return fail(422, `refundBps must be an integer between 0 and ${DEPOSIT_MAX_BPS}`)
  }
  const state = await readDeposit({ slug, learner: body?.learner, cfg })
  if (!state.ok) return state
  const { term, credential } = state
  if (term.finalized) return fail(409, 'this deposit is already settled', { learner: term.learner, course: slug })
  if (!term.policyMatchesPublisher) {
    return fail(409, 'this deposit was made under a policyHash that is not the publisher policy for this course', {
      deposited: term.policyHash, expected: state.expectedPolicyHash,
    })
  }
  if (!credential) return fail(409, 'no course credential on chain for this learner yet, so there is no issuedAt to judge against')
  if (credential.revoked) return fail(409, 'the course credential is revoked')
  if (body.refundBps !== credential.expectedRefundBps) {
    return fail(422, `refundBps does not follow the policy: issuedAt ${credential.issuedAt} against deadlineAt ${term.deadlineAt} means ${credential.expectedRefundBps}`, {
      expectedRefundBps: credential.expectedRefundBps, withinDeadline: credential.withinDeadline,
    })
  }

  const client = createPublicClient({ transport: http(cfg.rpcUrl) })
  const issuer = await client.readContract({ address: cfg.depositAddress, abi: depositAbi, functionName: 'issuer' })
  const inner = finalizeInnerHash({
    learner: term.learner, courseId: term.courseId, uid: credential.uid, issuedAt: credential.issuedAt,
    refundBps: body.refundBps, policyHash: term.policyHash,
  })
  let signer = null
  try { signer = await recoverMessageAddress({ message: { raw: inner }, signature: body.signature }) } catch { /* ditolak di bawah */ }
  if (!signer || getAddress(signer) !== getAddress(issuer)) {
    return fail(401, 'signature does not recover to the issuer of the deposit contract over (learner, course, uid, issuedAt, refundBps, policyHash) as read from chain')
  }

  const call = {
    contract: getAddress(cfg.depositAddress), learner: term.learner, courseId: term.courseId, uid: credential.uid,
    issuedAt: credential.issuedAt, refundBps: body.refundBps, withinDeadline: credential.withinDeadline,
  }
  if (!broadcast) return { ok: true, status: 202, validated: true, broadcast: 'disabled', call }

  const account = privateKeyToAccount(platformPrivateKey)
  const chainId = await client.getChainId()
  const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [cfg.rpcUrl] } } }
  const wallet = createWalletClient({ account, chain, transport: http(cfg.rpcUrl) })
  const txHash = await wallet.writeContract({
    address: cfg.depositAddress, abi: depositAbi, functionName: 'finalize',
    args: [term.learner, term.courseId, credential.uid, credential.issuedAt, BigInt(body.refundBps), body.signature],
  })
  const receipt = await client.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') return fail(502, 'finalize reverted on chain', { txHash })
  return { ok: true, status: 200, validated: true, broadcast: 'enabled', txHash, gasUsed: receipt.gasUsed, blockNumber: receipt.blockNumber, call }
}
