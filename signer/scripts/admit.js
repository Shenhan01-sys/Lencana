/**
 * `npm run admit -- --address 0x… [--apply]` — platform menerima sebuah PENERBIT (attester) di resolver.
 *
 * KOREKSI 1 Okt (D54, opsi B) atas versi pagi hari yang sama: versi pertama berkas ini (B118) hanya
 * menerima `agentWallet` sebuah identitas ERC-8004 — benar ketika agen = attester. Sesudah builder
 * memilih "penerbit tetap attester, agen hanya penilai yang dibayar", gerbangnya dibalik: yang
 * diterima adalah kunci PENERBIT, dan kunci yang dikenal sebagai agen penilai DITOLAK — agen tidak
 * boleh menandatangani kredensial. Syarat ERC-8004 pindah ke tempat agen benar-benar masuk: sewa agen
 * (`POST /agents/hire`, B119) dan penunjukan reviewer agen (B120).
 *
 * Yang diperiksa sebelum `addIssuer` — semuanya dibaca dari chain:
 *   1. alamat itu bukan `agentWallet` maupun pemilik agen ERC-8004 yang disebut manifest penerbit mana pun;
 *   2. alamat itu belum pernah didelisting (resolver menolak readmisi; `relistIssuer` jalur lain).
 * `--agent-id` sekarang DITOLAK dengan sebabnya, supaya pemanggilan gaya lama tidak lolos diam-diam.
 *
 * ⚠️ Batas: ini PROSEDUR platform, bukan aturan kontrak — kunci owner resolver tetap bisa memanggil
 * `addIssuer` langsung (`npm run specimen` B102 melakukannya untuk agen korbannya, disengaja).
 */

// Lencana-B118 status=SELESAI 2026-10-01 — gerbang penerimaan penerbit; sejak D54 yang diterima kunci penerbit, dan kunci agen penilai ERC-8004 yang disebut manifest DITOLAK sebagai attester. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseAbi, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { readAgent } from '../src/erc8004.js'
import { MANIFESTS } from '../../web/src/manifest.ts'

await loadFileEnvReport('admit')
const env = process.env
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const APPLY = process.argv.includes('--apply')
const ADDRESS = arg('address')

const refuse = (why, code = 2) => { console.log(`DITOLAK — ${why}`); process.exit(code) }
if (arg('agent-id') !== undefined) refuse('sejak D54 agen penilai tidak menandatangani kredensial — yang diterima sebagai penerbit adalah kunci penerbit (--address), dan agen disewa lewat POST /agents/hire')
if (!ADDRESS || !isAddress(ADDRESS)) refuse('butuh --address <alamat penerbit>')
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS']) if (!env[k]) refuse(`${k} belum diisi`)

const who = getAddress(ADDRESS)
const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()

// Agen yang disebut manifest penerbit: dompet dan pemiliknya tidak boleh jadi attester.
const claimed = [...new Set(MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean))]
for (const id of claimed) {
  const a = await readAgent(client, { chainId, agentId: id })
  if (!a.ok) continue
  if (a.wallet === who) refuse(`${who} adalah agentWallet agen penilai ERC-8004 #${id} — D54: agen tidak boleh menjadi attester`)
  if (a.owner === who) refuse(`${who} adalah pemilik (Agent Owner) agen penilai ERC-8004 #${id} — D54: Agent Owner bukan penerbit`)
}

const resolverAbi = parseAbi([
  'function isIssuer(address) view returns (bool)',
  'function isDelisted(address) view returns (bool)',
  'function owner() view returns (address)',
  'function addIssuer(address issuer)',
])
const read = (functionName, args = []) => client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName, args })
if (await read('isDelisted', [who])) refuse(`${who} pernah didelisting — resolver menolak readmisi (DelistedCannotBeReadmitted)`)
if (await read('isIssuer', [who])) {
  console.log(`SUDAH DITERIMA — ${who} sudah penerbit di resolver; tidak ada transaksi`)
  process.exit(0)
}
if (!APPLY) {
  console.log(`LOLOS GERBANG — ${who} boleh diterima sebagai penerbit; jalankan dengan --apply untuk addIssuer (tanpa --apply tidak ada yang ditulis)`)
  process.exit(0)
}
if (!env.DEPLOYER_PRIVATE_KEY) refuse('DEPLOYER_PRIVATE_KEY belum diisi')
const platform = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
if (getAddress(await read('owner')) !== platform.address) refuse('kunci platform bukan owner() resolver')
const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
const wallet = createWalletClient({ account: platform, chain, transport: http(env.RPC_URL) })
const { request } = await client.simulateContract({ account: platform, address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'addIssuer', args: [who] })
const hash = await wallet.writeContract(request)
const r = await client.waitForTransactionReceipt({ hash })
if (r.status !== 'success') refuse(`addIssuer revert di ${hash}`, 1)
console.log(`DITERIMA — addIssuer(${who}) tx ${hash} (gas ${r.gasUsed}); isIssuer = ${await read('isIssuer', [who])}`)
