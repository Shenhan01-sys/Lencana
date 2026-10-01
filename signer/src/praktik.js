/**
 * `src/praktik.js` — slot praktik dinilai dari chain, bukan dari laporan peserta (B121).
 *
 * Sampai 1 Okt usaha praktik masuk lewat `POST /attempts` dengan ANGKA kiriman peserta: halaman
 * belajar tidak pernah memanggilnya, dan harness yang memanggilnya menulis `score: 100` sendiri.
 * Sekarang peserta mengirim apa yang ia kerjakan atau baca di chain — hash transaksi, nomor dan
 * waktu blok, gas terpakai, saldo, keluaran `eth_call` — dan modul ini membaca ulang semuanya dari
 * chain 97. Usaha baru tersimpan kalau SEMUA cocok.
 *
 * Tiga aturan yang dipegang di semua jenis bukti:
 *   1. Yang dibandingkan adalah bacaan SERVER dari chain, bukan apa pun yang dikirim klien.
 *   2. Jawaban yang salah hanya dilaporkan NAMA pemeriksaannya, tanpa nilai yang benar — kalau
 *      tidak, rute ini jadi kunci jawaban yang bisa ditanya berulang-ulang (pelajaran B80).
 *   3. Dompet belajar harus dibuktikan milik peserta: dompet itu menandatangani pesan yang menyebut
 *      kursus, lesson, alamat peserta, dan (untuk transaksi) hash-nya. Tanpa itu satu transaksi
 *      orang lain bisa diakui siapa saja.
 *
 * Batas yang ditulis, bukan disembunyikan: jawaban `eth-call` sama untuk semua peserta, jadi bisa
 * disalin — jenis itu membuktikan "bisa membaca kontrak", bukan "mengerjakan sendiri". Pemilik
 * dompet yang sama bisa menandatangani untuk dua alamat peserta; kunci bukti unik mencegah satu
 * transaksi/dompet dipakai dua kali, bukan mencegah orang berbagi kunci.
 */

// Lencana-B121 status=TERBUKA 2026-10-01 — core: pemeriksa bukti praktik (balance, tx-receipt, eth-call, allowance) yang membaca ulang chain 97; yang belum: halaman belajar memanggil POST /praktik (fase FE). Buktikan ulang: npm run verify:praktik. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import {
  createPublicClient, http, getAddress, isAddress, parseEther, parseAbi, parseAbiParameters,
  encodeAbiParameters, toFunctionSelector, concatHex,
} from 'viem'
import { verifyMessage } from 'viem/utils'

import { manifestOf } from '../../web/src/manifest.ts'

export const PROOF_TYPES = ['balance', 'tx-receipt', 'eth-call', 'allowance']
const ERC20 = parseAbi(['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'])

const fail = (status, why, extra = {}) => ({ ok: false, status, why, ...extra })
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

/** Lesson praktik + jenis buktinya, dibaca dari manifest penerbit. */
export function praktikLesson (courseId, lessonSlug) {
  const m = manifestOf(courseId)
  if (!m) return { error: `course "${courseId}" is not in the publisher catalogue` }
  const lesson = m.course.modules.flatMap((mod) => mod.lessons).find((l) => l.slug === lessonSlug)
  if (!lesson) return { error: `lesson "${lessonSlug}" does not exist in course "${courseId}"` }
  if (lesson.kind !== 'praktik') return { error: `lesson "${lessonSlug}" is not a practice lesson (${lesson.kind})` }
  if (!lesson.proof || !PROOF_TYPES.includes(lesson.proof.type)) return { error: `practice lesson "${lessonSlug}" declares no checkable proof` }
  return { manifest: m, lesson }
}

/** Pesan yang ditandatangani DOMPET belajar: mengikat dompet itu ke satu peserta di satu lesson. */
export function walletBindingMessage ({ courseId, lessonSlug, learner, wallet, txHash }) {
  return `lencana-praktik course=${courseId} lesson=${lessonSlug} learner=${String(learner).toLowerCase()} wallet=${String(wallet).toLowerCase()}`
    + (txHash ? ` tx=${String(txHash).toLowerCase()}` : '')
}

/** Bilangan bulat non-negatif dari string desimal; null kalau bentuknya bukan itu. */
function uint (v) {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return BigInt(v)
  if (typeof v !== 'string' || !/^[0-9]+$/.test(v.trim())) return null
  return BigInt(v.trim())
}

/** "0,25" dan "0.25" sama-sama diterima (peserta Indonesia menulis koma), hasilnya wei; null kalau rusak. */
function bnbToWei (v) {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(',', '.')
  if (!/^[0-9]+(\.[0-9]{1,18})?$/.test(s)) return null
  try { return parseEther(s) } catch { return null }
}

const hex = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

async function walletSigned ({ binding, wallet, signature }) {
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature)) return false
  try { return await verifyMessage({ address: getAddress(wallet), message: binding, signature }) } catch { return false }
}

/** Kalldata `eth_call` dari tanda tangan fungsi + argumen — bentuk yang sama dengan `cast call`. */
function calldataOf (signature, args) {
  const types = signature.slice(signature.indexOf('(') + 1, signature.lastIndexOf(')')).trim()
  const selector = toFunctionSelector(`function ${signature}`)
  if (!types) return selector
  return concatHex([selector, encodeAbiParameters(parseAbiParameters(types), args)])
}

/**
 * Periksa satu penyerahan praktik terhadap chain.
 *
 * @returns {Promise<{ok:true, checks:{id:string,ok:boolean}[], proof:object} |
 *                   {ok:false, status:number, why:string, failed?:string[]}>}
 */
export async function checkPraktik ({ rpcUrl, courseId, lessonSlug, learner, answers, walletSignature }) {
  const found = praktikLesson(courseId, lessonSlug)
  if (found.error) return fail(400, found.error)
  const spec = found.lesson.proof
  if (!answers || typeof answers !== 'object') return fail(400, 'requires answers (what you read or did on chain), as an object')
  if (!rpcUrl) return fail(503, 'practice checking is not configured on this server (no RPC_URL)')
  const client = createPublicClient({ transport: http(rpcUrl) })
  const chainId = await client.getChainId()
  if (chainId !== spec.chainId) return fail(503, `this server reads chain ${chainId}, the lesson needs chain ${spec.chainId}`)

  const checks = []
  const add = (id, ok) => checks.push({ id, ok: Boolean(ok) })
  const proof = { type: spec.type, chainId, key: null, wallet: null, blockNumber: null, txHash: null, observed: {} }

  if (spec.type === 'eth-call') {
    const results = answers.results
    if (!results || typeof results !== 'object') return fail(400, `requires answers.results with ${spec.reads.map((r) => r.id).join(', ')}`)
    for (const r of spec.reads) {
      const { data } = await client.call({ to: getAddress(r.to), data: calldataOf(r.signature, r.args) })
      proof.observed[r.id] = data ?? '0x'
      add(`eth-call:${r.id}`, hex(results[r.id]) !== '' && hex(results[r.id]) === hex(data ?? '0x'))
    }
    proof.blockNumber = (await client.getBlockNumber()).toString()
  } else {
    // tiga jenis lain bergantung pada dompet belajar peserta
    if (!isAddress(String(answers.wallet ?? ''))) return fail(400, 'requires answers.wallet (your practice wallet address)')
    const wallet = getAddress(answers.wallet)
    proof.wallet = wallet
    const txHash = spec.type === 'tx-receipt' ? hex(answers.txHash) : undefined
    if (spec.type === 'tx-receipt' && !/^0x[0-9a-f]{64}$/.test(txHash)) return fail(400, 'requires answers.txHash (0x + 64 hex)')
    const binding = walletBindingMessage({ courseId, lessonSlug, learner, wallet, txHash })
    if (!(await walletSigned({ binding, wallet, signature: walletSignature }))) {
      return fail(401, `walletSignature must be the practice wallet signing exactly: "${binding}"`)
    }
    add('wallet-signature', true)

    if (spec.type === 'balance') {
      const wei = uint(answers.balanceWei)
      const fromBnb = bnbToWei(answers.balanceBnb)
      if (wei === null || fromBnb === null) return fail(400, 'requires answers.balanceWei (integer string) and answers.balanceBnb (decimal string)')
      const block = await client.getBlockNumber()
      const bal = await client.getBalance({ address: wallet, blockNumber: block })
      proof.blockNumber = block.toString()
      proof.observed = { balanceWei: bal.toString() }
      proof.key = `balance:${chainId}:${wallet.toLowerCase()}`
      add('balance-positive', bal > 0n)
      add('balance-wei', wei === bal)
      add('balance-bnb', fromBnb === bal)
    }

    if (spec.type === 'tx-receipt') {
      const blockNumber = uint(answers.blockNumber)
      const blockTimestamp = uint(answers.blockTimestamp)
      const gasUsed = uint(answers.gasUsed)
      const delta = uint(answers.balanceDeltaWei)
      if ([blockNumber, blockTimestamp, gasUsed, delta].some((v) => v === null)) {
        return fail(400, 'requires answers.blockNumber, blockTimestamp, gasUsed and balanceDeltaWei as integer strings')
      }
      let tx
      let receipt
      try {
        tx = await client.getTransaction({ hash: txHash })
        receipt = await client.getTransactionReceipt({ hash: txHash })
      } catch {
        return fail(422, `transaction ${txHash} is not on chain ${chainId} (or not mined yet)`, { failed: ['tx-exists'] })
      }
      const block = await client.getBlock({ blockNumber: receipt.blockNumber })
      const cost = tx.value + receipt.gasUsed * receipt.effectiveGasPrice
      proof.key = `tx:${chainId}:${txHash}`
      proof.txHash = txHash
      proof.blockNumber = receipt.blockNumber.toString()
      proof.observed = {
        from: tx.from, to: tx.to, valueWei: tx.value.toString(), status: receipt.status,
        blockTimestamp: block.timestamp.toString(), gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(), balanceDeltaWei: cost.toString(),
      }
      add('tx-sender', same(tx.from, wallet))
      add('tx-success', receipt.status === 'success')
      add('tx-transfer', Boolean(tx.to) && !same(tx.to, tx.from) && tx.value >= BigInt(spec.minValueWei))
      add('block-number', blockNumber === receipt.blockNumber)
      add('block-time', blockTimestamp === block.timestamp)
      add('gas-used', gasUsed === receipt.gasUsed)
      add('balance-delta', delta === cost)
    }

    if (spec.type === 'allowance') {
      if (!isAddress(String(answers.token ?? ''))) return fail(400, 'requires answers.token (a BEP-20 address)')
      const token = getAddress(answers.token)
      const balance = uint(answers.balance)
      const list = Array.isArray(answers.allowances) ? answers.allowances : []
      const spenders = [...new Set(list.map((a) => String(a?.spender ?? '').toLowerCase()))]
      if (balance === null) return fail(400, 'requires answers.balance (integer string, from balanceOf)')
      if (spenders.length < spec.minSpenders || spenders.length !== list.length || !list.every((a) => isAddress(String(a?.spender ?? '')) && uint(a?.allowance) !== null)) {
        return fail(400, `requires answers.allowances: at least ${spec.minSpenders} distinct {spender, allowance} pairs with integer allowances`)
      }
      const code = await client.getCode({ address: token })
      if (!code || code === '0x') return fail(422, `${token} has no contract code on chain ${chainId}`, { failed: ['token-code'] })
      const block = await client.getBlockNumber()
      const onChainBal = await client.readContract({ address: token, abi: ERC20, functionName: 'balanceOf', args: [wallet], blockNumber: block })
      proof.blockNumber = block.toString()
      proof.key = `allowance:${chainId}:${wallet.toLowerCase()}:${token.toLowerCase()}`
      proof.observed = { token, balance: onChainBal.toString(), allowances: {} }
      add('token-code', true)
      add('balance-of', balance === onChainBal)
      for (const a of list) {
        const spender = getAddress(a.spender)
        const v = await client.readContract({ address: token, abi: ERC20, functionName: 'allowance', args: [wallet, spender], blockNumber: block })
        proof.observed.allowances[spender] = v.toString()
        add(`allowance:${spender}`, uint(a.allowance) === v)
      }
    }
  }

  const failed = checks.filter((c) => !c.ok).map((c) => c.id)
  if (failed.length) {
    return fail(422, `${failed.length} of ${checks.length} checks do not match what chain ${chainId} says — re-read and resubmit (the correct values are not returned)`, { failed })
  }
  return { ok: true, checks, proof }
}
