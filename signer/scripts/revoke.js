/**
 * `npm run revoke -- --hash 0x…` — cabut satu attestation di chain 97 lewat kunci AGEN (attester),
 * lalu sajikan daftar yang baru dan segelkan.
 *
 * Kenapa berkas ini ada di repo dan bukan di folder riset: **pencabutan adalah adegan utama produk
 * kami** ("platform lama membuat pencabutan tidak kelihatan"). Sampai 28 Sep satu-satunya jalur cabut
 * yang benar-benar dipakai di chain publik adalah skrip privat di luar repo plus `SeedDemo` di atas
 * anvil fork — jadi kalimat "coba sendiri cabutnya" tidak bisa diulang siapa pun dari clone, dan
 * aturan pertama vault ("klaim harus reproducible dari dalam app/") dilanggar oleh perkakas kami
 * sendiri. Ini bukan kekurangan fitur; ini kekurangan jalur.
 *
 * Yang TIDAK dilakukan diam-diam:
 *  - menolak kalau hash tidak dikenal chain (bukan "sukses" palsu);
 *  - menolak kalau sudah tercabut — EAS tidak punya jalur unrevoke, dan tes fork kami
 *    (`test_fork_TidakAdaJalurUnrevoke`) menjaga itu;
 *  - mencetak keadaan SEBELUM dan SESUDAH dari chain, bukan dari niat kode.
 *
 * Butuh: RPC_URL, RESOLVER_ADDRESS, BAS_ADDRESS, ISSUER_PRIVATE_KEY (EOA agen = attester), dan
 * DEPLOYER_PRIVATE_KEY untuk `npm run anchor` + `publish:edge` kalau --publish dipakai.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { getCredentialByHash } from '../src/store.js'

const HERE = dirname(fileURLToPath(import.meta.url))

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1]
}

await loadFileEnvReport('revoke')
const env = process.env
const want = arg('hash')
if (!want) {
  console.error('pakai: npm run revoke -- --hash <credentialHash> [--publish]')
  process.exit(2)
}
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'BAS_ADDRESS', 'ISSUER_PRIVATE_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi`); process.exit(2) }
}

const hash = String(want).toLowerCase()
const client = createPublicClient({ transport: http(env.RPC_URL, { timeout: 30_000 }) })
const abi = (name, inputs, outputs, mutability = 'view') => [{ type: 'function', name, stateMutability: mutability, inputs, outputs }]
const B32 = { type: 'bytes32' }
const ADDR = { type: 'address' }
const BOOL = { type: 'bool' }
const U64 = { type: 'uint64' }
const STATUS_OF = abi('statusOf', [B32], [BOOL, BOOL, BOOL, BOOL, ADDR, U64, U64])
const ATTEST_OF = abi('attestationOf', [B32], [B32])
const SCHEMA_UID = abi('schemaUID', [], [B32])

const before = await client.readContract({ address: env.RESOLVER_ADDRESS, abi: STATUS_OF, functionName: 'statusOf', args: [hash] })
const [exists, revokedNow, expiredNow, delistedNow, issuer] = before
if (!exists) {
  console.error(`chain tidak mengenal ${hash} — tidak ada yang bisa dicabut, dan kita tidak melaporkan sukses kosong`)
  process.exit(1)
}
console.log(`\n  hash    : ${hash}`)
console.log(`  sebelum : exists=benar revoked=${revokedNow} expired=${expiredNow} issuerDelisted=${delistedNow} issuer=${issuer}`)
if (revokedNow) {
  console.log('  sudah tercabut sebelumnya. EAS/BAS tidak punya jalur unrevoke (dijaga test_fork_TidakAdaJalurUnrevoke),')
  console.log('  jadi tidak ada transaksi yang dikirim dan tidak ada yang perlu diulang.')
  process.exit(0)
}

const rec = await getCredentialByHash(hash)
const uid = await client.readContract({ address: env.RESOLVER_ADDRESS, abi: ATTEST_OF, functionName: 'attestationOf', args: [hash] })
const schema = await client.readContract({ address: env.RESOLVER_ADDRESS, abi: SCHEMA_UID, functionName: 'schemaUID' })
if (rec?.uid && String(rec.uid).toLowerCase() !== uid.toLowerCase()) {
  console.error(`uid di store (${rec.uid}) != uid di chain (${uid}) — berhenti, jangan cabut benda yang salah`)
  process.exit(1)
}

const account = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
if (account.address.toLowerCase() !== issuer.toLowerCase()) {
  console.error(`kunci ini (${account.address}) bukan attester tercatat (${issuer}) — yang boleh mencabut adalah agen yang menerbitkan`)
  process.exit(1)
}

const BasAbi = parseAbi([
  'function revoke((bytes32 schema, (bytes32 uid, uint256 value) data) request) payable',
])
// Rantai didefinisikan dari chain yang benar-benar answered, sama seperti `issue.js:153` - viem
// menolak mengirim transaksi tanpa objek chain, dan menemukannya saat transaksi akan dikirim
// adalah cara paling buruk untuk mengetahui bahwa jalur cabut kita belum pernah jalan.
const chain = {
  id: await client.getChainId(),
  name: `chain-${await client.getChainId()}`,
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [env.RPC_URL] }, public: { http: [env.RPC_URL] } },
}
const wallet = createWalletClient({ account, chain, transport: http(env.RPC_URL) })
console.log(`  uid     : ${uid}`)
console.log(`  attester: ${account.address} (kunci agen = yang tercatat di chain, cek lolos)`)

const tx = await wallet.writeContract({
  address: env.BAS_ADDRESS, abi: BasAbi, functionName: 'revoke',
  args: [{ schema, data: { uid, value: 0n } }], account, chain,
})
const rc = await client.waitForTransactionReceipt({ hash: tx })
if (rc.status !== 'success') { console.error(`revoke() gagal di chain: ${tx}`); process.exit(1) }
console.log(`  tx      : ${tx}  (gas ${rc.gasUsed})`)

const after = await client.readContract({ address: env.RESOLVER_ADDRESS, abi: STATUS_OF, functionName: 'statusOf', args: [hash] })
console.log(`  sesudah : revoked=${after[1]} expired=${after[2]} issuerDelisted=${after[3]}`)
if (after[1] !== true) { console.error('transaksi sukses tapi state chain tidak bilang revoked — ini merah, bukan kuning'); process.exit(1) }

if (process.argv.includes('--publish')) {
  // Mencabut tanpa menerbitkan ulang daftar = pencabutan yang cuma ada di chain. Jadi publish
  // ulang adalah bagian dari jalur ini, dan kegagalannya harus menghentikan perintah, bukan
  // jadi catatan kaki.
  for (const args of [['run', 'anchor'], ['run', 'publish:edge']]) {
    const r = spawnSync('npm', args, { stdio: 'inherit', shell: true, cwd: HERE })
    if (r.status !== 0) {
      console.error(`npm ${args.join(' ')} gagal — daftar/tepi BELUM menampilkan pencabutan ini`)
      process.exit(1)
    }
  }
} else {
  console.log('  info    daftar status dan tepi BELUM diperbarui. Jalankan: npm run anchor && npm run publish:edge')
  console.log('          (atau ulangi dengan --publish).')
}
console.log('\nREVOKE SELESAI — dibaca ulang dari chain, bukan dari log build.')
