/**
 * `npm run admit -- --agent-id <N> [--address 0x…] [--apply]` — platform menerima sebuah agen sebagai
 * penerbit, HANYA kalau agen itu punya identitas ERC-8004 (B118 F1, keputusan D53).
 *
 * Yang diperiksa sebelum `addIssuer` — semuanya dibaca dari chain, bukan dari kiriman orang:
 *   1. identitas #N ada di IdentityRegistry BNB, dan berkas registrasinya (`tokenURI`) bertipe
 *      registration-v1 serta menunjuk balik ke #N di registry yang sama;
 *   2. `agentWallet` identitas itu terisi, dan bukan pemilik NFT-nya sendiri (D53: Agent Owner ≠ attester);
 *   3. kalau `--address` diberikan, ia HARUS sama dengan `agentWallet` — alamat lain ditolak;
 *   4. alamat itu belum pernah didelisting (resolver menolak readmisi; `relistIssuer` jalur lain).
 * Yang diterima adalah `agentWallet`, karena dialah yang akan tercatat sebagai `attester` di BAS.
 *
 * ⚠️ Batas yang harus dibaca: gerbang ini PROSEDUR platform, bukan aturan kontrak. Resolver yang
 * dideploy tetap menerima `addIssuer` dari kunci owner tanpa memeriksa ERC-8004 — mengubahnya berarti
 * redeploy resolver dan korpus baru. `npm run specimen` (B102) sengaja melewati gerbang ini untuk agen
 * korbannya; itu tercatat di baris B118.
 */

// Lencana-B118 status=SELESAI 2026-10-01 —gerbang penerimaan penerbit: addIssuer hanya untuk agentWallet identitas ERC-8004 yang registrasinya menunjuk balik. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseAbi, getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { readAgent, REGISTRATION_TYPE } from '../src/erc8004.js'

await loadFileEnvReport('admit')
const env = process.env
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const APPLY = process.argv.includes('--apply')
const AGENT_ID = arg('agent-id')
const ADDRESS = arg('address')

const refuse = (why, code = 2) => { console.log(`DITOLAK — ${why}`); process.exit(code) }
if (!AGENT_ID || !/^\d+$/.test(AGENT_ID)) refuse('butuh --agent-id <angka>: penerbit diterima lewat identitas ERC-8004-nya, bukan lewat alamat polos')
if (ADDRESS !== undefined && !isAddress(ADDRESS)) refuse(`--address bukan alamat: ${ADDRESS}`)
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS']) if (!env[k]) refuse(`${k} belum diisi`)

const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const a = await readAgent(client, { chainId, agentId: AGENT_ID })
if (!a.ok) refuse(a.why)
console.log(`identitas #${a.agentId} · registry ${a.registry} · owner ${a.owner} · agentWallet ${a.wallet ?? '(kosong)'}`)
if (a.registrationType !== REGISTRATION_TYPE) refuse(`berkas registrasi #${a.agentId} bukan ${REGISTRATION_TYPE} (terbaca: ${a.registrationType ?? 'tidak ada'})`)
if (!a.pointsBack) refuse(`berkas registrasi #${a.agentId} tidak menunjuk balik ke agentId ini di registry ini`)
if (!a.wallet) refuse(`#${a.agentId} belum punya agentWallet`)
if (a.wallet === a.owner) refuse(`agentWallet #${a.agentId} = pemilik NFT-nya — D53 memisahkan Agent Owner dari attester`)
if (ADDRESS !== undefined && getAddress(ADDRESS) !== a.wallet) {
  refuse(`${getAddress(ADDRESS)} bukan agentWallet identitas #${a.agentId} (${a.wallet}) — alamat yang diterima harus attester yang terikat ke identitas itu`)
}

const resolverAbi = parseAbi([
  'function isIssuer(address) view returns (bool)',
  'function isDelisted(address) view returns (bool)',
  'function owner() view returns (address)',
  'function addIssuer(address issuer)',
])
const read = (functionName, args = []) => client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName, args })
if (await read('isDelisted', [a.wallet])) refuse(`${a.wallet} pernah didelisting — resolver menolak readmisi (DelistedCannotBeReadmitted)`)
if (await read('isIssuer', [a.wallet])) {
  console.log(`SUDAH DITERIMA — ${a.wallet} (agen ERC-8004 #${a.agentId}) sudah penerbit di resolver; tidak ada transaksi`)
  process.exit(0)
}
if (!APPLY) {
  console.log(`LOLOS GERBANG — ${a.wallet} boleh diterima; jalankan dengan --apply untuk addIssuer (tanpa --apply tidak ada yang ditulis)`)
  process.exit(0)
}
if (!env.DEPLOYER_PRIVATE_KEY) refuse('DEPLOYER_PRIVATE_KEY belum diisi')
const platform = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
if (getAddress(await read('owner')) !== platform.address) refuse('kunci platform bukan owner() resolver')
const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
const wallet = createWalletClient({ account: platform, chain, transport: http(env.RPC_URL) })
const { request } = await client.simulateContract({ account: platform, address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'addIssuer', args: [a.wallet] })
const hash = await wallet.writeContract(request)
const r = await client.waitForTransactionReceipt({ hash })
if (r.status !== 'success') refuse(`addIssuer revert di ${hash}`, 1)
console.log(`DITERIMA — addIssuer(${a.wallet}) tx ${hash} (gas ${r.gasUsed}); isIssuer = ${await read('isIssuer', [a.wallet])}`)
