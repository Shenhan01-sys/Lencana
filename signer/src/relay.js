// Lencana-B97 status=TERBUKA 2026-09-30 — relayer penerbitan sebagai LAYANAN: rute menerima permintaan delegasi bertanda tangan agen, mengadilinya sebelum gas, dan mengantrekannya. Yang belum: siaran dari antrean ini belum pernah dijalankan di chain publik. Buktikan ulang: npm run verify:relay. JANGAN dibalik/diulang tanpa membuka kembali baris B97 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * Antrean relayer (B97): `attestByDelegation` sebagai layanan, bukan sebagai skrip yang dijalankan orang.
 *
 * Primitifnya sudah terbukti di chain publik (`scripts/delegate.js`, D31/D36): agen menandatangani,
 * platform menyiarkan, `attester` tetap agen. Yang belum ada adalah pintunya — agen pihak ketiga tidak
 * punya cara menyerahkan tanda tangannya selain meminta kita mengetik perintah. Berkas ini pintu itu.
 *
 * Tiga hal yang membuatnya bukan sekadar "POST lalu kirim":
 *
 *  1. SEMUA penolakan terjadi sebelum gas. Platform yang membayar, jadi permintaan yang pasti revert
 *     di chain (skema lain, agen tidak terdaftar, tanda tangan tidak pulih ke agen, kredensial sudah
 *     terbit) adalah cara orang lain membakar BNB kita. Tiap sebab punya kode HTTP dan kalimatnya sendiri.
 *  2. Satu permintaan, satu nasib. ID antrean diturunkan dari ISI permintaan, jadi mengirim ulang
 *     permintaan yang sama mengembalikan pekerjaan yang sama — dan pekerjaan yang sudah punya `txHash`
 *     TIDAK PERNAH disiarkan lagi (RF6 butir 1; `SettlementSplit.splitDone[ref]` adalah pola yang sama
 *     di sisi uang).
 *  3. Nonce diperhitungkan terhadap antrean, bukan hanya terhadap chain. BAS menaikkan
 *     `_nonces[attester]` di dalam verifikasi, jadi dua permintaan yang ditandatangani dengan nonce
 *     yang sama tidak bisa dua-duanya mendarat. Nonce yang diharapkan = nonce chain + jumlah entri
 *     milik agen itu yang masih menunggu.
 *
 * Yang SENGAJA tidak dilakukan di sini: menyiarkan secara bawaan. Tanpa `RELAY_BROADCAST=1`
 * pekerjaan berhenti di `queued` — server yang dinyalakan harness atau orang dari `git clone` tidak
 * boleh mengeluarkan gas hanya karena ada yang mengirim POST.
 *
 * Batas yang harus ikut terbaca: antrean ini satu berkas JSON dan satu proses. Dua instance signer
 * atas store yang sama akan saling menimpa; itu batas yang sama dengan `state.json` (B78/RF6).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createPublicClient, createWalletClient, http, keccak256, toBytes, recoverAddress, isAddress, isHex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { basAbi, credentialResolverAbi, EMPTY_UID } from '../../web/src/abi.ts'
import { attestDigest, toMultiRequest, toSingleRequest } from './delegation.js'
import { STORE_DIR, loadAllocator, watchCredential } from './store.js'
import { REVOCATION, SUSPENSION } from './statusList.js'

/** Sama dengan batas batch x402 dan `mintBatch`, karena alasan yang sama: RPC publik. */
export const RELAY_MAX_BATCH = 25
/** `deadline = 0` berarti "tidak pernah kedaluwarsa" di EAS — delegasi seperti itu adalah surat pembawa. */
export const RELAY_MAX_DEADLINE_SECONDS = 3600
/** Berapa pekerjaan satu agen boleh menunggu sekaligus; di atas ini dia harus menunggu siaran. */
export const RELAY_MAX_PENDING_PER_ATTESTER = 5

const QUEUE = join(STORE_DIR, 'relay-queue.json')
const PENDING = new Set(['queued', 'broadcasting'])
const B32 = /^0x[0-9a-fA-F]{64}$/

async function readQueue () {
  try {
    const parsed = JSON.parse(await readFile(QUEUE, 'utf8'))
    return { jobs: {}, ...parsed }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return { jobs: {} }
  }
}

async function writeQueue (q) {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(QUEUE, JSON.stringify(q, null, 2), 'utf8')
}

/** Tambal SATU pekerjaan di atas bacaan terbaru — tidak pernah menulis salinan lama seluruh antrean. */
async function patchJob (id, patch) {
  const q = await readQueue()
  if (!q.jobs[id]) return null
  q.jobs[id] = { ...q.jobs[id], ...patch, updatedAt: new Date().toISOString() }
  await writeQueue(q)
  return q.jobs[id]
}

const refuse = (status, error, extra = {}) => ({ ok: false, status, error, ...extra })

function sigHex (s) {
  const v = Number(s.v)
  const parity = v >= 27 ? v - 27 : v
  return `${s.r}${String(s.s).slice(2)}${parity.toString(16).padStart(2, '0')}`
}

/**
 * Bentuk permintaan, tanpa menyentuh chain. Yang keluar adalah salinan yang sudah dinormalkan:
 * hanya field yang ditandatangani, dalam urutan tetap — itu juga yang dipakai untuk menurunkan ID.
 */
export function normalizeRelayRequest (body) {
  if (!body || typeof body !== 'object') return refuse(400, 'body must be a JSON object')
  if (!isAddress(String(body.attester ?? ''))) return refuse(422, 'attester must be a 20-byte address')
  if (!B32.test(String(body.schema ?? ''))) return refuse(422, 'schema must be a 32-byte uid')
  if (!/^\d+$/.test(String(body.deadline ?? ''))) return refuse(422, 'deadline must be an integer unix time in seconds')
  if (!Array.isArray(body.entries) || body.entries.length === 0) return refuse(422, 'entries must be a non-empty array')
  if (body.entries.length > RELAY_MAX_BATCH) return refuse(422, `batch maximum is ${RELAY_MAX_BATCH} entries per request`)

  const entries = []
  for (const [i, e] of body.entries.entries()) {
    const at = `entries[${i}]`
    if (!e || typeof e !== 'object') return refuse(422, `${at} must be an object`)
    if (!isAddress(String(e.recipient ?? ''))) return refuse(422, `${at}.recipient must be a 20-byte address`)
    if (!/^\d+$/.test(String(e.expirationTime ?? ''))) return refuse(422, `${at}.expirationTime must be an integer`)
    if (!B32.test(String(e.refUID ?? EMPTY_UID))) return refuse(422, `${at}.refUID must be a 32-byte uid`)
    // Tiga bytes32, persis yang dibaca `CredentialResolver._decode`; panjang lain revert `BadDataLength`.
    if (!isHex(e.data) || e.data.length !== 2 + 96 * 2) return refuse(422, `${at}.data must be exactly 96 bytes (credentialHash, courseId, lessonId)`)
    if (String(e.value ?? '0') !== '0') return refuse(422, `${at}.value must be 0: the relayer fronts gas, never value`)
    if (e.revocable === false) return refuse(422, `${at}.revocable must be true: the schema is registered revocable`)
    const s = e.signature
    if (!s || !B32.test(String(s.r ?? '')) || !B32.test(String(s.s ?? '')) || ![0, 1, 27, 28].includes(Number(s.v))) {
      return refuse(422, `${at}.signature must be {v, r, s}`)
    }
    entries.push({
      recipient: String(e.recipient).toLowerCase(),
      expirationTime: String(e.expirationTime),
      revocable: true,
      refUID: String(e.refUID ?? EMPTY_UID).toLowerCase(),
      data: String(e.data).toLowerCase(),
      value: '0',
      signature: { v: Number(s.v) < 27 ? Number(s.v) + 27 : Number(s.v), r: String(s.r).toLowerCase(), s: String(s.s).toLowerCase() },
    })
  }
  const request = {
    schema: String(body.schema).toLowerCase(),
    attester: String(body.attester).toLowerCase(),
    deadline: String(body.deadline),
    entries,
  }
  return { ok: true, request, id: keccak256(toBytes(JSON.stringify(request))) }
}

function publicJob (j) {
  return {
    id: j.id, state: j.state, attester: j.attester, entries: j.credentialHashes.length,
    credentialHashes: j.credentialHashes, deadline: j.request.deadline, firstNonce: j.firstNonce,
    receivedAt: j.receivedAt, updatedAt: j.updatedAt ?? null,
    txHash: j.txHash ?? null, gasUsed: j.gasUsed ?? null, blockNumber: j.blockNumber ?? null,
    paidBy: j.paidBy ?? null, reason: j.reason ?? null,
  }
}

export async function getRelayJob (id) {
  const q = await readQueue()
  const j = q.jobs[String(id ?? '').toLowerCase()]
  return j ? publicJob(j) : null
}

export async function relaySummary () {
  const q = await readQueue()
  const counts = {}
  for (const j of Object.values(q.jobs)) counts[j.state] = (counts[j.state] ?? 0) + 1
  return counts
}

/**
 * Pekerjaan `queued` yang tenggatnya lewat tidak akan pernah bisa mendarat (`DeadlineExpired`), dan
 * selama ia dihitung menunggu ia menahan nonce agennya. Dilepas saat dibaca, dengan sebab tertulis.
 */
async function expireStale (nowSec) {
  const q = await readQueue()
  let changed = false
  for (const j of Object.values(q.jobs)) {
    if (j.state === 'queued' && BigInt(j.request.deadline) <= nowSec) {
      j.state = 'expired'
      j.reason = 'deadline passed while queued; nothing was broadcast'
      j.updatedAt = new Date().toISOString()
      changed = true
    }
  }
  if (changed) await writeQueue(q)
  return q
}

/**
 * Terima satu permintaan. Urutan pemeriksaan disengaja: yang murah dan pasti dulu, chain belakangan,
 * dan tidak ada satu pun cabang yang menulis antrean sebelum semua penolakan lewat.
 *
 * @returns {{ok:true, status:202|200, job, duplicate:boolean} | {ok:false, status:number, error:string}}
 */
export async function submitRelay ({ body, rpcUrl, resolverAddress, basAddress }) {
  const norm = normalizeRelayRequest(body)
  if (!norm.ok) return norm
  const { request, id } = norm

  if (!rpcUrl || !resolverAddress || !basAddress) {
    return refuse(503, 'relay is not configured: RPC_URL, RESOLVER_ADDRESS and BAS_ADDRESS are required')
  }
  const client = createPublicClient({ transport: http(rpcUrl) })
  const readResolver = (functionName, args = []) => client.readContract({ address: resolverAddress, abi: credentialResolverAbi, functionName, args })

  const nowSec = (await client.getBlock({ blockTag: 'latest' })).timestamp
  const q = await expireStale(nowSec)

  // Idempotensi SEBELUM nonce: permintaan yang sudah pernah diterima (bahkan yang sudah mendarat,
  // sehingga nonce chain sudah maju) harus mengembalikan nasibnya, bukan ditolak sebagai tanda
  // tangan basi.
  if (q.jobs[id]) return { ok: true, status: 200, duplicate: true, job: publicJob(q.jobs[id]) }

  const deadline = BigInt(request.deadline)
  if (deadline === 0n) return refuse(422, 'deadline 0 never expires: a delegation without a deadline is a bearer instrument')
  if (deadline <= nowSec) return refuse(422, `deadline has passed (chain time ${nowSec})`)
  if (deadline > nowSec + BigInt(RELAY_MAX_DEADLINE_SECONDS)) {
    return refuse(422, `deadline is more than ${RELAY_MAX_DEADLINE_SECONDS}s ahead of chain time ${nowSec}`)
  }

  const [schemaUID, admitted, delisted, domain, chainNonce] = await Promise.all([
    readResolver('schemaUID'),
    readResolver('isIssuer', [request.attester]),
    readResolver('isDelisted', [request.attester]),
    client.readContract({ address: basAddress, abi: basAbi, functionName: 'getDomainSeparator' }),
    client.readContract({ address: basAddress, abi: basAbi, functionName: 'getNonce', args: [request.attester] }),
  ])
  if (request.schema !== schemaUID.toLowerCase()) return refuse(422, `schema is not ours: this relayer only broadcasts for ${schemaUID}`)
  if (delisted) return refuse(403, 'attester is delisted on the resolver: nothing is relayed for a delisted issuer')
  if (!admitted) return refuse(403, 'attester is not an admitted issuer on the resolver')

  const mine = Object.values(q.jobs).filter((j) => PENDING.has(j.state) && j.attester === request.attester)
  if (mine.length >= RELAY_MAX_PENDING_PER_ATTESTER) {
    return refuse(429, `attester already has ${mine.length} pending relay jobs; wait for them to land`)
  }
  const firstNonce = chainNonce + BigInt(mine.reduce((n, j) => n + j.credentialHashes.length, 0))

  const credentialHashes = []
  for (const [i, e] of request.entries.entries()) {
    const digest = attestDigest({
      domain, attester: request.attester, schema: request.schema, recipient: e.recipient,
      expirationTime: e.expirationTime, revocable: true, refUID: e.refUID, data: e.data,
      value: 0n, nonce: firstNonce + BigInt(i), deadline,
    })
    let recovered
    try {
      recovered = await recoverAddress({ hash: digest, signature: sigHex(e.signature) })
    } catch {
      return refuse(401, `entries[${i}] signature is not a recoverable secp256k1 signature`)
    }
    if (recovered.toLowerCase() !== request.attester) {
      return refuse(401, `entries[${i}] signature does not recover to the attester at nonce ${firstNonce + BigInt(i)}: signed fields, nonce or domain differ`)
    }
    credentialHashes.push(`0x${e.data.slice(2, 66)}`)
  }
  if (new Set(credentialHashes).size !== credentialHashes.length) return refuse(422, 'the same credentialHash appears twice in one request')

  for (const [i, h] of credentialHashes.entries()) {
    const uid = await readResolver('attestationOf', [h])
    if (uid !== EMPTY_UID) return refuse(409, `entries[${i}] credential is already issued (uid ${uid}); the resolver admits one attestation per credentialHash`)
  }
  const queuedElsewhere = Object.values(q.jobs).find((j) => PENDING.has(j.state) && j.credentialHashes.some((h) => credentialHashes.includes(h)))
  if (queuedElsewhere) return refuse(409, `a credential in this request is already waiting in relay job ${queuedElsewhere.id}`)

  const job = {
    id, state: 'queued', attester: request.attester, request, credentialHashes,
    firstNonce: String(firstNonce), receivedAt: new Date().toISOString(),
  }
  // Baca ulang sebelum menulis: antrean bisa berubah selama pembacaan chain di atas.
  const fresh = await readQueue()
  if (fresh.jobs[id]) return { ok: true, status: 200, duplicate: true, job: publicJob(fresh.jobs[id]) }
  fresh.jobs[id] = job
  await writeQueue(fresh)
  return { ok: true, status: 202, duplicate: false, job: publicJob(job) }
}

let draining = Promise.resolve()

/**
 * Siarkan yang menunggu, satu per satu, berurutan menurut nonce. Dipanggil sesudah `submitRelay`
 * dan HANYA kalau operator menyalakannya; tidak ada timer yang menyiarkan di belakang layar.
 */
export function drainRelayQueue (opts) {
  draining = draining.then(() => drainOnce(opts)).catch(() => {})
  return draining
}

async function drainOnce ({ rpcUrl, resolverAddress, basAddress, platformPrivateKey }) {
  if (!platformPrivateKey) return
  const client = createPublicClient({ transport: http(rpcUrl) })
  const account = privateKeyToAccount(platformPrivateKey)
  const chainId = await client.getChainId()
  const chain = {
    id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  }
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) })

  for (;;) {
    const q = await readQueue()
    const next = Object.values(q.jobs)
      .filter((j) => j.state === 'queued')
      .sort((a, b) => {
        const d = BigInt(a.firstNonce) - BigInt(b.firstNonce)
        return d === 0n ? a.receivedAt.localeCompare(b.receivedAt) : (d < 0n ? -1 : 1)
      })[0]
    if (!next) return
    // Pekerjaan yang sudah punya txHash tidak pernah sampai ke sini: statusnya bukan `queued` lagi.
    await patchJob(next.id, { state: 'broadcasting', paidBy: account.address })
    const { request } = next
    const entries = request.entries.map((e) => ({ ...e, expirationTime: BigInt(e.expirationTime), value: 0n }))
    try {
      const args = { schema: request.schema, attester: request.attester, deadline: BigInt(request.deadline) }
      const txHash = entries.length > 1
        ? await wallet.writeContract({ address: basAddress, abi: basAbi, functionName: 'multiAttestByDelegation', args: [[toMultiRequest({ ...args, entries })]] })
        : await wallet.writeContract({ address: basAddress, abi: basAbi, functionName: 'attestByDelegation', args: [toSingleRequest({ ...args, entry: entries[0] })] })
      // txHash ditulis SEBELUM menunggu receipt: "gagal menerima receipt" bukan berarti tidak
      // terkirim (R6 butir 15), dan pekerjaan ber-txHash tidak boleh disiarkan ulang.
      await patchJob(next.id, { txHash })
      const receipt = await client.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status !== 'success') {
        await patchJob(next.id, { state: 'failed', reason: `transaction reverted: ${txHash}`, blockNumber: String(receipt.blockNumber) })
        continue
      }
      // Diadopsi ke himpunan pantau di sini, sama seperti `scripts/delegate.js`: kredensial yang
      // terbit tapi tidak dipantau membuat daftar status tampak sah sambil diam-diam kurang.
      const { alloc, commit } = await loadAllocator()
      for (const h of next.credentialHashes) {
        const uid = await client.readContract({ address: resolverAddress, abi: credentialResolverAbi, functionName: 'attestationOf', args: [h] })
        if (uid === EMPTY_UID) continue
        await watchCredential(uid, h)
        for (const purpose of [REVOCATION, SUSPENSION]) if (alloc.peek(purpose, uid) === undefined) alloc.slot(purpose, uid)
      }
      await commit()
      await patchJob(next.id, { state: 'confirmed', gasUsed: String(receipt.gasUsed), blockNumber: String(receipt.blockNumber) })
    } catch (err) {
      const current = (await readQueue()).jobs[next.id]
      // Dengan txHash: nasibnya ada di chain, bukan di sini — ditandai, tidak diulang.
      await patchJob(next.id, current?.txHash
        ? { state: 'unknown', reason: `broadcast sent but not confirmed: ${String(err.message).split('\n')[0]}` }
        : { state: 'failed', reason: String(err.message).split('\n')[0] })
    }
  }
}
