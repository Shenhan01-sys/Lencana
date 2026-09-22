/**
 * SATU perintah: nilai → kredensial on-chain → dokumen OB3.0 bertanda tangan → daftar status
 * → hash daftar dikunci ke chain.
 *
 *   node scripts/issue.js --course web3-dasar-2026 --learner 0x… --score 87
 *
 * Kenapa satu perintah: tiap tahapnya sudah terbukti sendiri-sendiri di `check.js`, tapi demo video
 * tidak bisa dijalankan lewat empat perintah manual di depan juri. Rantaian ini juga yang menguji
 * hal paling sering patah di proyek seperti ini: **hash yang dihitung backend harus sama dengan hash
 * yang dihitung contract** — dua implementasi di dua bahasa yang tidak saling memanggil.
 *
 * Idempoten: attestation yang sudah ada tidak diterbitkan ulang; anchor yang sudah ada tidak
 * diulang. Nomor bit ditetapkan di sini, sekali, lalu disimpan — server hanya membacanya.
 *
 * Butuh .env di akar app/: RPC_URL, RESOLVER_ADDRESS, BAS_ADDRESS, ISSUER_PRIVATE_KEY (EOA agen =
 * attester), DEPLOYER_PRIVATE_KEY (kunci platform = yang anchor), AGENT_SLUG, BASE_URL.
 */
import { readFile } from 'node:fs/promises'
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes, encodeAbiParameters, getAddress, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { credentialHashOf, buildOpenBadgeCredential } from '../src/credential.js'
import { REVOCATION, SUSPENSION, renderList, servedHashes } from '../src/lists.js'
import { loadAllocator, rememberCredential } from '../src/store.js'
import { loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader, signDocument, verifyDocument } from '../src/sign.js'
import { readAnchor, anchorListHash } from '../src/anchor.js'
import { EMPTY_UID } from '../../web/src/abi.ts'

/** .env dibaca manual: menambah dotenv hanya untuk 8 baris adalah dependensi yang tidak perlu. */
async function readEnv () {
  const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 || i + 1 >= process.argv.length ? fallback : process.argv[i + 1]
}

const course = arg('course')
const learner = arg('learner')
const score = arg('score', '87')
if (!course || !learner) {
  console.error('pakai: node scripts/issue.js --course <id> --learner <0x…> [--score <n>] [--days 365]')
  process.exit(2)
}

const env = { ...await readEnv(), ...process.env }
const { RPC_URL, RESOLVER_ADDRESS: RESOLVER, BAS_ADDRESS: BAS } = env
const BASE_URL = env.BASE_URL ?? 'http://127.0.0.1:8787'
const AGENT_SLUG = env.AGENT_SLUG ?? 'agent-demo'
const DAYS = Number(arg('days', 365))
for (const [k, v] of Object.entries({ RPC_URL, RESOLVER, BAS })) {
  if (!v) { console.error(`${k} belum diisi`); process.exit(2) }
}

const agentEoa = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const platformPk = env.DEPLOYER_PRIVATE_KEY
const client = createPublicClient({ transport: http(RPC_URL) })
const chain = {
  id: await client.getChainId(),
  name: `chain-${await client.getChainId()}`,
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
}
// Penulisan lewat wallet client (public client viem 2.x tidak punya writeContract); yang memegang
// kunci di lapis ini adalah AGEN, dan itu memang poin D30: attester = dia, bukan kami.
const wallet = createWalletClient({ account: agentEoa, chain, transport: http(RPC_URL) })

const ResolverAbi = parseAbi([
  'function schemaUID() view returns (bytes32)',
  'function attestationOf(bytes32) view returns (bytes32)',
  'function isIssuer(address) view returns (bool)',
])
// Bentuknya dibaca dari IEAS.sol, bukan dikarang: AttestationRequest = { schema, data } dan
// TIDAK punya `value` di level atas (yang punya value hanya AttestationRequestData).
const BasAbi = parseAbi([
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data) request) returns (bytes32)',
])

const courseId = keccak256(stringToBytes(course))
const credentialHash = credentialHashOf(learner, course)
const schemaUID = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'schemaUID' })

console.log(`kursus      : ${course} -> courseId ${courseId}`)
console.log(`peserta     : ${getAddress(learner)}`)
console.log(`agen (EOA)  : ${agentEoa.address}`)
console.log(`hash        : ${credentialHash}`)

if (!(await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'isIssuer', args: [agentEoa.address] }))) {
  throw new Error(`${agentEoa.address} bukan penerbit yang diizinkan — addIssuer lebih dulu`)
}

// Payload harus bytes32×3 persis seperti yang dibaca `onAttest()` kita. encodeAbiParameters,
// bukan konkatenasi string manual — konkatenasi adalah cara salah yang kebetulan terlihat benar.
const attestationData = encodeAbiParameters(
  [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }],
  [credentialHash, courseId, EMPTY_UID],
)

const expiresAt = BigInt(Math.floor(Date.now() / 1000) + DAYS * 86400)
let uid = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'attestationOf', args: [credentialHash] })
if (uid === EMPTY_UID) {
  const tx = await wallet.writeContract({
    address: BAS,
    abi: BasAbi,
    functionName: 'attest',
    args: [{
      schema: schemaUID,
      data: {
        recipient: getAddress(learner),
        expirationTime: expiresAt,
        revocable: true,
        refUID: EMPTY_UID,
        data: attestationData,
        value: 0n,
      },
    }],
  })
  const receipt = await client.waitForTransactionReceipt({ hash: tx })
  if (receipt.status !== 'success') throw new Error(`attest() revert di ${tx}`)
  uid = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'attestationOf', args: [credentialHash] })
  console.log(`attestation : ${uid} (gas ${receipt.gasUsed})`)
} else {
  console.log(`sudah ada   : ${uid} — tidak menerbitkan ulang`)
}

// 2. Nomor bit ditetapkan di sini SEKALI dan disimpan; server hanya membaca.
const { alloc, commit } = await loadAllocator()
const revocationIndex = alloc.slot(REVOCATION, uid)
const suspensionIndex = alloc.slot(SUSPENSION, uid)
await commit()

// 3. Dokumen: SATU angka kadaluarsa untuk kedua lapis.
const agent = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument(agent)
const loader = makeDocumentLoader({ [agent.controller]: issuerDoc })
const { unsigned, indices } = buildOpenBadgeCredential({
  baseUrl: BASE_URL,
  issuer: agent,
  course: {
    slug: course,
    name: arg('name', course),
    description: arg('desc', `Kredensial ${course}`),
    criteria: arg('criteria', 'Nilai akhir dari penilaian agen'),
  },
  learner: { address: learner },
  assessment: { score, method: arg('method', 'penilaian agen') },
  uid,
  issuedAtUnix: Number(expiresAt) - DAYS * 86400,
  expiresAtUnix: Number(expiresAt),
  // `indices` dari proses ini sendiri, bukan hasil alokasi baru: kalau keduanya berbeda, dokumen
  // menunjuk bit yang salah.
  allocator: { slot: (purpose) => (purpose === REVOCATION ? revocationIndex : suspensionIndex) },
})
if (indices.revocation !== revocationIndex || indices.suspension !== suspensionIndex) {
  throw new Error('alokasi indeks dokumen dan store tidak sama — berhenti sebelum menerbitkan salah')
}

const signedDoc = await signDocument(unsigned, { key: agent.key, controllerDocument: issuerDoc, documentLoader: loader })
const verified = await verifyDocument(signedDoc, { controllerDocument: issuerDoc, documentLoader: loader })
if (!verified.verified) throw new Error('dokumen hasil terbitan sendiri tidak lolos verifikasi — berhenti')
await rememberCredential({
  id: signedDoc.id, credentialHash, uid, learner: getAddress(learner), course, score,
  signedAt: new Date().toISOString(), document: signedDoc,
})
console.log(`dokumen     : ${signedDoc.id}`)
console.log(`slot        : revocation ${revocationIndex} · suspension ${suspensionIndex}`)

// 4. Kunci hash tiap daftar status ke chain, lalu BACA ULANG — jangan percaya nilai return.
//
// ⚠️ Yang di-anchor adalah hash daftar atas SEMUA kredensial yang dipantau (`servedHashes()`),
// bukan daftar berisi kredensial yang baru terbit ini saja. Server menghidangkan yang pertama,
// jadi hanya hash itulah yang bisa membuktikan "daftar yang kalian baca bukan hasil suntingan".
// Versi sebelumnya memakai `[credentialHash]` dan menghasilkan anchor yang sah bentuknya tapi
// tidak mengikat apa pun — dua daftar beda input, jadi hash-nya tidak akan pernah sama.
const anchorHashes = await servedHashes()
for (const purpose of [REVOCATION, SUSPENSION]) {
  const list = await renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER,
    hashes: anchorHashes, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  const before = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: list.hash })
  if (before > 0n) {
    console.log(`anchor ${purpose}: sudah ada sejak ${before} — tidak diulang (${list.watched} kredensial, ${list.flagged} bit)`)
    continue
  }
  const a = await anchorListHash({ rpcUrl: RPC_URL, basAddress: BAS, privateKey: platformPk, encodedList: list.encodedList })
  const seen = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: a.data })
  if (seen === 0n) throw new Error(`anchor ${purpose} tertulis tapi tidak terbaca kembali`)
  if (a.data !== list.hash) throw new Error(`hash yang tertambang ${a.data} bukan hash yang dirender ${list.hash}`)
  console.log(`anchor ${purpose}: ${a.data} -> jam ${seen} (gas ${a.gasUsed}, ${list.watched} kredensial, ${list.flagged} bit)`)
}
console.log(`\nsajikan: npm run serve  →  ${BASE_URL}/credentials/${credentialHash}`)
