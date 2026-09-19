/**
 * Mengadopsi kredensial yang SUDAH ada di chain ke dalam alokasi penerbit.
 *
 * Kenapa perlu: aturan di `store.js` adalah **hanya sisi penerbit yang mengalokasikan nomor bit**,
 * dan server hanya membaca. Konsekuensinya nyata — empat kredensial hasil `SeedDemo` sudah hidup di
 * chain (dicabut, di-delisting, dll.) tapi tidak pernah lewat `issue.js`, jadi daftar status yang
 * kami sajikan diam-diam TIDAK mencakup keadaan yang paling ingin kita tunjukkan.
 *
 * Ini bukan celah yang ditutup dengan melonggarkan aturan: alokasi TETAP terjadi di sisi penerbit,
 * hanya saja sekarang ada perintah eksplisit untuknya. Yang berubah hanyalah "kapan", bukan "siapa".
 *
 *   node scripts/adopt.js --hashes 0x…,0x…            # atau
 *   node scripts/adopt.js --demo                       # keempat hash SeedDemo hari ini
 *
 * Idempoten: uid yang sudah punya slot tidak dialokasi ulang (kalau diulang, kredensial lama bisa
 * menunjuk bit yang berbeda — kegagalan sunyi yang persis kita hindari).
 */
import { createPublicClient, http } from 'viem'
import { loadAllocator, watchCredential } from '../src/store.js'
import { REVOCATION, SUSPENSION } from '../src/statusList.js'
import { readChainStatuses } from '../src/chainStatus.js'
import { readFile } from 'node:fs/promises'

async function readEnv () {
  const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out
}

/**
 * Empat hash contoh `SeedDemo`. Konstanta, BUKAN hasil baca dari log: hash diturunkan dari
 * (alamat peserta, courseId) yang konstan di dalam skrip, jadi ia sama di fork mana pun dan di
 * testnet publik. Kalau SeedDemo mengubah peserta/kursusnya, konstanta ini harus ikut berubah —
 * dan `readChainStatuses` akan melaporkan yang tidak dikenal, bukan salah mengadopsi.
 */
const DEMO_HASHES = [
  '0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2', // [1] dasar, DICABUT
  '0x15a85427896a4b1bab9a77f015e39936a9818515810fcdb08706e32d8999b8de', // [2] lanjutan, AKTIF
  '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa', // [3] tak terkait, AKTIF
  '0x4d0ffdf32d174796a2c8bbe38e739c26ec6e205e6cdf48409f7240d28552df1c', // [4] ISSUER_DELISTED
]

const env = { ...await readEnv(), ...process.env }
const RPC_URL = process.env.RPC_URL ?? env.RPC_URL
const RESOLVER = process.env.RESOLVER_ADDRESS ?? env.RESOLVER_ADDRESS
const useDemo = process.argv.includes('--demo')
const at = process.argv.indexOf('--hashes')
const hashes = useDemo ? DEMO_HASHES
  : at !== -1 ? process.argv[at + 1].split(',').map((s) => s.trim()).filter(Boolean) : []

if (!RPC_URL || !RESOLVER || hashes.length === 0) {
  console.error('pakai: node scripts/adopt.js --demo | --hashes 0x…,0x…  (butuh RPC_URL + RESOLVER_ADDRESS)')
  process.exit(2)
}

// readChainStatuses memfilter sendiri: hash yang bukan kredensial kita TIDAK masuk, dan itu
// dilaporkan di bawah sebagai "tidak dikenal" — bukan dianggap berhasil.
const statuses = await readChainStatuses({ rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes })
const known = new Set([...statuses.values()].map((s) => s.hash.toLowerCase()))
const unknown = hashes.filter((h) => !known.has(h.toLowerCase()))

const { alloc, commit } = await loadAllocator()
let added = 0
for (const [uid, s] of statuses) {
  // Dicatat sebagai DIPANTAU lebih dulu: tanpa ini slot-nya ada tapi server tidak pernah bertanya
  // ke chain tentang uid itu, dan daftar yang disajikan tetap tampak sah sambil diam-diam kurang.
  await watchCredential(uid, s.hash)
  for (const purpose of [REVOCATION, SUSPENSION]) {
    if (alloc.peek(purpose, uid) !== undefined) continue
    alloc.slot(purpose, uid)
    added += 1
    console.log(`alokasi ${purpose} -> bit ${alloc.peek(purpose, uid)} untuk uid ${uid.slice(0, 14)}…`)
  }
}
await commit()

console.log(`\ndiadopsi: ${added} slot baru · dikenal di chain: ${statuses.size}/${hashes.length}`)
for (const [uid, s] of statuses) {
  console.log(`  ${s.hash.slice(0, 18)}…  revoked=${s.revoked} expired=${s.expired} delisted=${s.issuerDelisted}`)
}
if (unknown.length) {
  console.log(`TIDAK DIKENALI (bukan kredensial pada resolver ini): ${unknown.join(', ')}`)
}
const client = createPublicClient({ transport: http(RPC_URL) })
console.log(`(blok chain tertinggi: ${await client.getBlockNumber()})`)
