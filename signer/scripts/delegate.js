/**
 * `npm run delegate` — agen menandatangani, platform menyiarkan. Semua di dalam repo ini.
 *
 * Kenapa berkas ini ada di `app/signer/` dan bukan cuma di workspace agen: `src/delegation.js`
 * tanpa satu pun pemanggil di dalam repo berarti klaim D31 tidak bisa dibuktikan dari Lencana
 * sendiri — orang yang meng-clone repo ini tidak akan punya cara untuk mengulanginya, dan
 * commit history kita kehilangan bukti yang paling mahal. Fungsi yang tidak dipanggil dari mana
 * mana di dalam repo bukan fitur, itu kode yang menunggu busuk.
 *
 * Yang dilakukan, berurutan, dan tiap langkah dibaca ulang dari chain:
 *   1. turunkan (courseId, lessonId, credentialHash) dari MATERI kursus - bukan konstanta tempelan
 *   2. kunci permintaan attestation dengan EOA agen (tidak ada transaksi dikirim di sini)
 *   3. platform menyiarkan dengan kuncinya sendiri
 *   4. baca kembali: `attestationOf`, `statusOf` (attester = agen), `lessonOf`
 *   5. tunjukkan bahwa **saldo agen tidak berubah** - itu seluruh isi D31
 *
 * `--dry-run` berhenti setelah penandatanganan: cukup untuk melihat nonce, digest, dan bentuk
 * permintaannya tanpa membakar gas — dan ia menyebut sendiri bahwa sisanya TIDAK dibuktikan.
 *
 *   node scripts/delegate.js --course web3-dasar-2026 --lesson kuis-keselamatan \
 *        --learner 0x2eF9aF5e0601b93a0347166FBd7EC3F677b9A988 [--deadline 900] [--dry-run]
 *
 *   node scripts/delegate.js --lesson esai-batas-bukti --essay fixtures/essai-230-kata.md --dry-run
 *        ^ gerbang penilaian dijalankan lebih dulu; ia boleh MENOLAK menerbitkan
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { findCourse, lessonsOf } from '../../web/src/courses/index.ts'
import { courseIdOf, credentialHashOf, lessonIdOf } from '../../web/src/content.ts'
import { credentialResolverAbi, EMPTY_UID } from '../../web/src/abi.ts'
import {
  encodeCredentialData, readDelegationContext, relayDelegated, signDelegatedAttestation,
} from '../src/delegation.js'

async function readEnv () {
  const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const env = { ...await readEnv(), ...process.env }
const RPC = env.RPC_URL
const RESOLVER = env.RESOLVER_ADDRESS
const BAS = env.BAS_ADDRESS
const DRY = process.argv.includes('--dry-run')

if (!RPC || !RESOLVER || !BAS) {
  console.error('butuh RPC_URL + RESOLVER_ADDRESS + BAS_ADDRESS (app/.env sudah cukup)')
  process.exit(2)
}

const course = findCourse(arg('course', 'web3-dasar-2026'))
if (!course) {
  console.error(`kursus "${arg('course')}" tidak ada. Yang tersedia: web3-dasar-2026, web3-lanjut-2026`)
  process.exit(2)
}
const lesson = lessonsOf(course).find((l) => l.slug === arg('lesson', 'kuis-keselamatan'))
if (!lesson) {
  console.error(`lesson "${arg('lesson')}" bukan bagian dari ${course.id}`)
  process.exit(2)
}
const learner = arg('learner', '0x2eF9aF5e0601b93a0347166FBd7EC3F677b9A988')

const agent = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const platform = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
const client = createPublicClient({ transport: http(RPC) })
const read = (fn, args) => client.readContract({ address: RESOLVER, abi: credentialResolverAbi, functionName: fn, args })

const cid = courseIdOf(course)
const lid = lessonIdOf(course, lesson)
const hash = credentialHashOf(learner, cid, lid)

console.log(`chain     : ${RPC}`)
console.log(`agen      : ${agent.address}   <- attester yang akan tercatat`)
console.log(`platform  : ${platform.address}   <- yang bayar gas`)
console.log(`peserta   : ${learner}`)
console.log(`materi    : ${course.id} / ${lesson.slug}`)
console.log(`          courseId ${cid.slice(0, 18)}…  lessonId ${lid.slice(0, 18)}…`)
console.log(`          credentialHash ${hash}`)

/**
 * Gerbang penilaian. Ditaruh SEBELUM apa pun ditandatangani, karena menerbitkan kredensial
 * "lulus" tanpa satu pun pemeriksaan yang dijalankan adalah persis hal yang verifier kita
 * dirancang untuk tangkap.
 *
 * `--essay <berkas>` menilai teks peserta terhadap rubrik lesson ini. Lesson tanpa rubrik esai
 * ditolak dengan alasan, BUKAN diloloskan diam-diam — opsi yang diberikan tapi tidak berlaku
 * adalah cara paling nyaman untuk salah percaya pada alat sendiri.
 */
const essayPath = arg('essay')
if (essayPath) {
  if (!lesson.essay) {
    console.error(`\n--essay tidak berlaku: lesson "${lesson.slug}" jenisnya ${lesson.kind} dan tidak punya rubrik esai.`)
    console.error('Pilih lesson ber-jenis esai, misalnya esai-batas-bukti (web3-dasar-2026) atau esai-audit-sendiri (web3-lanjut-2026).')
    process.exit(2)
  }
  const { gradeAgainstRubric, formatVerdict } = await import('../src/grade.js')
  const text = await readFile(resolve(essayPath), 'utf8')
  const grade = await gradeAgainstRubric({ text, essay: lesson.essay })
  console.log(`\ngerbang penilaian: ${formatVerdict(grade)}`)
  if (grade.note) console.log(`  ${grade.note}`)
  if (grade.mechanical) {
    for (const m of grade.mechanical) console.log(`    ${m.ok ? '+' : '-'} ${m.label}${m.detail ? ` (${m.detail})` : ''}`)
  }

  if (grade.verdict === 'AWAITING_JUDGE' && process.argv.includes('--allow-unjudged')) {
    console.log('  ⚠️ GERBANG DILEWATI MANUAL (--allow-unjudged). Angka yang dipakai nanti adalah')
    console.log('     hasil pemeriksaan mekanis, BUKAN penilaian. Jangan tulis itu sebagai "AI menilai".')
  } else if (grade.verdict === 'INSUFFICIENT_EVIDENCE') {
    console.log('\nBerhenti: tidak ada cukup bukti untuk menilai, dan tidak ada angka yang dikarang.')
    process.exit(3)
  } else if (grade.verdict === 'AWAITING_JUDGE') {
    console.log('\nBerhenti: kriteria penilaian belum ada yang menilainya (seam `judge` kosong).')
    console.log('Suntik penilai, atau terbitkan dengan --allow-unjudged dan sebut apa adanya.')
    process.exit(3)
  } else if (grade.verdict !== 'GRADED') {
    console.log(`\nBerhenti: gerbang mengembalikan ${grade.verdict}.`)
    process.exit(3)
  }
}

const existing = await read('attestationOf', [hash])
if (existing !== EMPTY_UID) {
  console.log(`\nsudah terbit (uid ${existing.slice(0, 18)}…) - berhenti, tidak ada yang dibakar.`)
  process.exit(0)
}

const schema = await read('schemaUID')
const { domain, nonce } = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
const now = await client.getBlock('latest').then((b) => b.timestamp)
const deadline = now + BigInt(Number(arg('deadline', '900')))
if (deadline === 0n) console.warn('⚠️ deadline 0 = tidak akan pernah kedaluwarsa')

const balanceBefore = await client.getBalance({ address: agent.address })
const countBefore = await read('credentialCount', [learner])

const entry = {
  recipient: learner,
  expirationTime: now + BigInt(course.validDays * 86400),
  revocable: true,
  refUID: EMPTY_UID,
  data: encodeCredentialData({ credentialHash: hash, courseId: cid, lessonId: lid }),
  value: 0n,
}
const signed = await signDelegatedAttestation({
  agentPrivateKey: env.ISSUER_PRIVATE_KEY, domain, schema, entry,
  nonce: BigInt(nonce), deadline,
})

console.log(`\nnonce agen   : ${nonce}  (satu per permintaan, naik di dalam verifikasi)`)
console.log(`digest agen  : ${signed.digest}`)
console.log(`signature    : v=${signed.signature.v} r=${signed.signature.r.slice(0, 14)}…`)

if (DRY) {
  console.log('\nDRY RUN - tidak ada transaksi. Yang terbukti baru langkah tanda tangan (dan itu')
  console.log('sudah melewati penjaga "harus recover ke alamat agen"). Sisanya TIDAK dibuktikan.')
  process.exit(0)
}

const relay = await relayDelegated({
  rpcUrl: RPC, basAddress: BAS, platformPrivateKey: env.DEPLOYER_PRIVATE_KEY,
  schema, attester: agent.address, deadline, entries: [signed], batch: false,
})
console.log(`\ntx platform  : ${relay.txHash}   gas ${relay.gasUsed}`)

const balanceAfter = await client.getBalance({ address: agent.address })
const uid = await read('attestationOf', [hash])
const s = await read('statusOf', [hash])
const lessonOnChain = await read('lessonOf', [uid])
const countAfter = await read('credentialCount', [learner])

let fails = 0
const check = (name, cond, detail = '') => {
  if (cond) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}
console.log('\n--dibaca ulang dari chain, bukan dari nilai return--')
check('resolver kita mengindeks uid-nya', uid !== EMPTY_UID, uid)
check('attester = AGEN, bukan penyiar', s[4].toLowerCase() === agent.address.toLowerCase(), s[4])
check('statusOf exists && tidak dicabut && penerbit tidak ditarik', s[0] === true && s[1] === false && s[3] === false)
check('lessonOf(uid) = lessonId yang diturunkan dari materi',
  lessonOnChain.toLowerCase() === lid.toLowerCase(), lessonOnChain)
check('saldo agen TIDAK berubah (nol gas di sisi agen)', balanceAfter === balanceBefore,
  `${balanceBefore} -> ${balanceAfter}`)
check('credentialCount peserta naik satu', countAfter === countBefore + 1n, `${countBefore} -> ${countAfter}`)

const after = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
check(`nonce agen naik ${nonce} -> ${after.nonce}`, after.nonce === BigInt(nonce) + 1n, String(after.nonce))

/**
 * Diadopsi ke store di sini, BUKAN dibiarkan untuk `adopt.js` terpisah.
 *
 * Alasannya bukan kerapian: kredensial yang terbit tapi tidak masuk himpunan pantau tidak akan
 * pernah muncul di daftar status yang kita sajikan, dan daftarnya tetap tampak sah — hanya kurang.
 * Itu kelas bug yang sudah pernah kita temukan sekali (lihat catatan "watched-set gap" di
 * scripts/adopt.js). Karena dialah penerbit yang mengalokasikan nomor bit, momen penerbitan inilah
 * tempatnya; menunggu perintah lain berarti meninggalkan jendela lupa.
 */
const { loadAllocator, watchCredential } = await import('../src/store.js')
const { REVOCATION, SUSPENSION } = await import('../src/statusList.js')
await watchCredential(uid, hash)
const { alloc, commit } = await loadAllocator()
let allocated = 0
for (const purpose of [REVOCATION, SUSPENSION]) {
  if (alloc.peek(purpose, uid) === undefined) {
    alloc.slot(purpose, uid)
    allocated += 1
  }
}
await commit()
check('masuk ke himpunan pantau penerbit (slot dialokasi, bukan menunggu adopt.js)',
  allocated === 2 || alloc.peek(REVOCATION, uid) !== undefined, `${allocated} slot baru`)

console.log(`\n${fails ? `${fails} GAGAL` : 'TERBIT'} — ${course.id}/${lesson.slug} untuk ${learner.slice(0, 10)}…`)
console.log(`verifikasi sendiri: cast call ${RESOLVER} "statusOf(bytes32)" ${hash} --rpc-url ${RPC}`)
if (!fails) console.log('daftar sajian kini punya anggota baru: jalankan `npm run anchor` untuk menguncinya.')
process.exitCode = fails ? 1 : 0
