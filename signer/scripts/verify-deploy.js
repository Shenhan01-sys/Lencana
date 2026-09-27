/**
 * `npm run verify:deploy` — membuktikan alamat yang kita kutip di formulir adalah alamat sungguhan,
 * dengan membacanya dari RPC publik, bukan dari log build kami atau tangkapan layar.
 *
 * Kenapa ada: submission text kita menulis "check us by running the commands above". Kalimat itu
 * hanya berisi kalau ada SATU perintah yang membandingkan angka yang kita klaim dengan apa yang
 * dikatakan chain. Sebelum 28 Sep perintah itu tidak ada — hub pengujian kita mencantumkan
 * "T14 verify the public deployment" dan berkasnya tidak pernah ditulis, jadi baris itu sendiri
 * adalah klaim yang salah.
 *
 * Setiap baris di bawah adalah (klaim yang tertulis di dokumentasi kami) vs (nilai yang dibaca
 * dari chain 97). Keluar merah kalau salah satu tidak cocok.
 */
import { readFile } from 'node:fs/promises'
import { createPublicClient, http, maxUint16 } from 'viem'

/** .env dibaca manual seperti di issue.js: tidak perlu dotenv untuk 10 baris. */
async function readEnv () {
  const out = {}
  try {
    const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = /^([A-Z][A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (m) out[m[1]] = m[2]
    }
  } catch { /* env proses saja */ }
  return out
}

const env = { ...await readEnv(), ...process.env }
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'
const client = createPublicClient({ transport: http(RPC) })

const ERC5192 = '0xb45a3c0e' // konstanta di contracts/SoulboundCert.sol:59

let fails = 0
async function claim (label, expected, fn) {
  let got
  try {
    got = await fn()
  } catch (e) {
    console.log(`  GAGAL  ${label}: tidak terbaca (${e.message.split('\n')[0].slice(0, 70)})`)
    fails++
    return
  }
  const shown = typeof got === 'bigint' ? got.toString() : String(got)
  const ok = String(expected).toLowerCase() === shown.toLowerCase()
  if (!ok) fails++
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${label.padEnd(46)} kami="${expected}"  chain="${shown}"`)
}

const addr = (k) => env[k]
const missing = ['RESOLVER_ADDRESS', 'CERT_ADDRESS', 'SPLIT_ADDRESS', 'DEMO_TOKEN_ADDRESS', 'BAS_ADDRESS']
  .filter((k) => !addr(k))
if (missing.length) {
  console.error(`.env tidak memuat: ${missing.join(', ')} — perbandingan tidak bisa dilakukan`)
  process.exit(2)
}

console.log(`chain dibaca dari ${RPC}`)
await claim('chainId = 97 (BNB Smart Chain testnet)', 97, () => client.getChainId())

for (const k of ['RESOLVER_ADDRESS', 'CERT_ADDRESS', 'SPLIT_ADDRESS', 'DEMO_TOKEN_ADDRESS', 'BAS_ADDRESS']) {
  const code = await client.getBytecode({ address: addr(k) })
  await claim(`${k} adalah kontrak ber-code`, true, () => (code && code.length > 2))
}

// --- CredentialResolver: alamat yang ditulis di field "smart contract" formulir ---
await claim('resolver.schemaUID() terisi', true, async () => {
  const v = await client.readContract({
    address: addr('RESOLVER_ADDRESS'),
    abi: [{ type: 'function', name: 'schemaUID', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] }],
    functionName: 'schemaUID',
  })
  return v && v !== '0x' + '00'.repeat(32)
})
await claim('resolver.isIssuer(ISSUER_ADDRESS)', true, () => client.readContract({
  address: addr('RESOLVER_ADDRESS'),
  abi: [{ type: 'function', name: 'isIssuer', stateMutability: 'view', inputs: [{ name: 'w', type: 'address' }], outputs: [{ type: 'bool' }] }],
  functionName: 'isIssuer', args: [addr('ISSUER_ADDRESS')],
}))

// --- SoulboundCert: klaim "soulbound" harus terbaca dari kontraknya, bukan dari narasi ---
await claim('cert.supportsInterface(ERC-5192)', true, () => client.readContract({
  address: addr('CERT_ADDRESS'),
  abi: [{ type: 'function', name: 'supportsInterface', stateMutability: 'view', inputs: [{ name: 'i', type: 'bytes4' }], outputs: [{ type: 'bool' }] }],
  functionName: 'supportsInterface', args: [ERC5192],
}))
// --- SoulboundCert: klaim "soulbound" dan nama yang tercetak di koleksi harus sama dengan
//     yang ditulis di skrip deploy — BUKAN nilai yang kita salin dari chain. Mengambil
//     harapan dari chain yang sama artinya membandingkan chain dengan dirinya sendiri.
const deploySrc = await readFile(new URL('../../script/DeployCredentials.s.sol', import.meta.url), 'utf8')
const certArgs = /new SoulboundCert\([^,]+,\s*"([^"]+)",\s*"([^"]+)"/.exec(deploySrc)
if (!certArgs) {
  console.error('tidak bisa membaca argumen nama/simbol dari script/DeployCredentials.s.sol — harapan tidak boleh dikira-kira')
  process.exit(2)
}
await claim('cert.name() = yang diminta skrip deploy', certArgs[1], () => client.readContract({
  address: addr('CERT_ADDRESS'),
  abi: [{ type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }],
  functionName: 'name',
}))
await claim('cert.symbol() = yang diminta skrip deploy', certArgs[2], () => client.readContract({
  address: addr('CERT_ADDRESS'),
  abi: [{ type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }],
  functionName: 'symbol',
}))

// --- SettlementSplit: ini baris yang paling mungkin dibaca juri sebagai angka marketing ---
const bps = () => client.readContract({
  address: addr('SPLIT_ADDRESS'),
  abi: [
    { type: 'function', name: 'platformBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
    { type: 'function', name: 'MAX_BPS', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
    {
      type: 'function', name: 'sharesOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'uint256' }],
      outputs: [{ type: 'uint256' }, { type: 'uint256' }],
    },
  ],
  functionName: 'platformBps',
})
await claim('split.platformBps() = 1000 (10 %)', 1000, bps)
await claim('split.MAX_BPS = 2500 (platform tak pernah mayoritas)', 2500, () => client.readContract({
  address: addr('SPLIT_ADDRESS'),
  abi: [{ type: 'function', name: 'MAX_BPS', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] }],
  functionName: 'MAX_BPS',
}))
await claim('split.sharesOf(1000) platform share = 100', 100, async () => {
  const [platform] = await client.readContract({
    address: addr('SPLIT_ADDRESS'),
    abi: [{
      type: 'function', name: 'sharesOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'uint256' }],
      outputs: [{ type: 'uint256' }, { type: 'uint256' }],
    }],
    functionName: 'sharesOf', args: [1000n],
  })
  return platform
})

// --- Token demo: 6 desimal adalah angka yang dipakai perhitungan harga x402 kita ---
await claim('token.decimals() = 6', 6, () => client.readContract({
  address: addr('DEMO_TOKEN_ADDRESS'),
  abi: [{ type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }],
  functionName: 'decimals',
}))

console.log(`\n${fails === 0 ? 'VERIFIKASI DEPLOY HIJAU' : 'VERIFIKASI DEPLOY MERAH'} — ${fails} ketidakcocokan`)
console.log('Yang dibandingkan: klaim di dokumentasi kami vs nilai yang dibaca dari chain 97 saat ini.')
process.exitCode = fails === 0 ? 0 : 1
