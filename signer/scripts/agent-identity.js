/**
 * `npm run agent:identity` — daftarkan agen penerbit di registry ERC-8004 BNB (B118 F1, keputusan D53).
 *
 *   npm run agent:identity                    # hanya membaca: identitas yang ada + apa yang masih kurang
 *   npm run agent:identity -- --apply         # menulis: isi gas Agent Owner, register, ikat dompet, pasang URI
 *   npm run agent:identity -- --agent-id 42   # pakai identitas yang sudah ada, jangan cari
 *
 * Tiga kunci, tiga peran — dan itu inti D53, bukan hiasan:
 *   AGENT_OWNER_PRIVATE_KEY  pemilik NFT identitas (peran Agent Owner). Yang memanggil register /
 *                            setAgentWallet / setAgentURI.
 *   ISSUER_PRIVATE_KEY       EOA attester — yang tercatat di BAS. Ia hanya MENANDATANGANI pernyataan
 *                            EIP-712 "dompet agen #N adalah saya"; ia tidak mengirim transaksi.
 *   DEPLOYER_PRIVATE_KEY     platform — hanya mengisi gas Agent Owner kalau saldonya kurang.
 * Di demo ketiganya dipegang tim Lencana di satu mesin, dan berkas registrasinya mengatakan itu.
 *
 * Idempoten: tiap langkah membaca chain dulu. Setiap transaksi disimulasikan (`eth_call`) sebelum
 * dikirim, supaya tanda tangan atau bentuk yang salah gagal tanpa gas.
 */

// Lencana-B118 status=SELESAI 2026-10-01 —pendaftaran agen penerbit di IdentityRegistry ERC-8004 BNB; pemilik NFT = Agent Owner, agentWallet = attester, URI = data: registrasi. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress, parseAbi, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import {
  ERC8004, identityAbi, agentWalletTypedData, registrationFile, toDataUri, readAgent,
} from '../src/erc8004.js'

await loadFileEnvReport('agent:identity')
const env = process.env
const APPLY = process.argv.includes('--apply')
const argAt = process.argv.indexOf('--agent-id')
const ARG_ID = argAt >= 0 ? process.argv[argAt + 1] : null

for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'EDGE_BASE_URL', 'ISSUER_PRIVATE_KEY', 'AGENT_OWNER_PRIVATE_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — ini bukan kegagalan, prasyaratnya belum ada`); process.exit(2) }
}
const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const REG = ERC8004[chainId]?.identity
if (!REG) { console.error(`tidak ada registry ERC-8004 yang dikenal untuk chain ${chainId}`); process.exit(2) }
const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
const owner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const attester = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const SLUG = env.AGENT_SLUG || 'agent-edge'
const ownerWallet = createWalletClient({ account: owner, chain, transport: http(env.RPC_URL) })

if (owner.address === attester.address) {
  console.error('berhenti: Agent Owner sama dengan attester — D53 memisahkan keduanya')
  process.exit(2)
}
const isIssuer = await client.readContract({
  address: env.RESOLVER_ADDRESS, abi: parseAbi(['function isIssuer(address) view returns (bool)']), functionName: 'isIssuer', args: [attester.address],
})
console.log(`registry ${REG} (chain ${chainId}) · ${APPLY ? 'MENULIS (--apply)' : 'hanya membaca'}`)
console.log(`  Agent Owner : ${owner.address} · saldo ${formatEther(await client.getBalance({ address: owner.address }))} tBNB`)
console.log(`  attester    : ${attester.address} · isIssuer di resolver = ${isIssuer}`)

const mined = async (what, hash) => {
  const r = await client.waitForTransactionReceipt({ hash })
  if (r.status !== 'success') throw new Error(`${what} revert di ${hash}`)
  console.log(`  tx ${what}: ${hash} (gas ${r.gasUsed}, blok ${r.blockNumber})`)
  return r
}

/** Cari identitas yang sudah dimiliki Agent Owner lewat event Registered (owner ter-indeks). */
async function findExisting () {
  if (ARG_ID) return ARG_ID
  const bal = await client.readContract({ address: REG, abi: identityAbi, functionName: 'balanceOf', args: [owner.address] })
  if (bal === 0n) return null
  const latest = await client.getBlockNumber()
  for (let to = latest; to > latest - 200000n && to > 0n; to -= 5000n) {
    const from = to - 4999n > 0n ? to - 4999n : 0n
    const logs = await client.getLogs({
      address: REG, event: identityAbi.find((x) => x.type === 'event' && x.name === 'Registered'),
      args: { owner: owner.address }, fromBlock: from, toBlock: to,
    }).catch(() => [])
    if (logs.length) return logs[logs.length - 1].args.agentId.toString()
  }
  throw new Error(`Agent Owner memegang ${bal} identitas tapi event Registered-nya tidak ketemu — jalankan dengan --agent-id`)
}

let agentId = await findExisting()
console.log(`  identitas   : ${agentId ? `#${agentId}` : 'belum ada'}`)

if (APPLY) {
  if (await client.getBalance({ address: owner.address }) < parseEther('0.002')) {
    if (!env.DEPLOYER_PRIVATE_KEY) throw new Error('saldo Agent Owner kurang dan DEPLOYER_PRIVATE_KEY tidak ada')
    const platform = createWalletClient({ account: privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY), chain, transport: http(env.RPC_URL) })
    await mined('isi gas Agent Owner 0,005 tBNB', await platform.sendTransaction({ to: owner.address, value: parseEther('0.005') }))
  }
  if (!agentId) {
    const { request } = await client.simulateContract({ account: owner, address: REG, abi: identityAbi, functionName: 'register', args: [] })
    const r = await mined('register()', await ownerWallet.writeContract(request))
    const ev = r.logs.filter((l) => getAddress(l.address) === getAddress(REG))
      .map((l) => { try { return decodeEventLog({ abi: identityAbi, data: l.data, topics: l.topics }) } catch { return null } })
      .find((e) => e?.eventName === 'Registered')
    if (!ev) throw new Error('register() berhasil tapi event Registered tidak terbaca')
    agentId = ev.args.agentId.toString()
    console.log(`  identitas baru: #${agentId}`)
  }
}

if (agentId) {
  let a = await readAgent(client, { chainId, agentId })
  if (!a.ok) throw new Error(a.why)
  if (a.owner !== owner.address) throw new Error(`identitas #${agentId} dimiliki ${a.owner}, bukan Agent Owner ${owner.address}`)

  if (APPLY && a.wallet !== attester.address) {
    const now = (await client.getBlock()).timestamp
    const deadline = now + 240n // kontrak menolak lebih dari 5 menit ke depan
    const sig = await attester.signTypedData(agentWalletTypedData({ chainId, registry: REG, agentId, newWallet: attester.address, owner: owner.address, deadline }))
    const { request } = await client.simulateContract({
      account: owner, address: REG, abi: identityAbi, functionName: 'setAgentWallet', args: [BigInt(agentId), attester.address, deadline, sig],
    })
    await mined('setAgentWallet(attester)', await ownerWallet.writeContract(request))
  }
  const want = toDataUri(registrationFile({ chainId, registry: REG, agentId, agentSlug: SLUG, edgeBaseUrl: env.EDGE_BASE_URL, resolver: env.RESOLVER_ADDRESS }))
  if (APPLY && a.uri !== want) {
    const { request } = await client.simulateContract({
      account: owner, address: REG, abi: identityAbi, functionName: 'setAgentURI', args: [BigInt(agentId), want],
    })
    await mined(`setAgentURI (data: URI, ${want.length} karakter)`, await ownerWallet.writeContract(request))
  }

  a = await readAgent(client, { chainId, agentId })
  console.log('\nterbaca dari chain:')
  console.log(`  agentId     : ${a.agentId} · ${a.registry}`)
  console.log(`  owner       : ${a.owner}${a.owner === owner.address ? ' (Agent Owner)' : ''}`)
  console.log(`  agentWallet : ${a.wallet}${a.wallet === attester.address ? ' (= attester)' : ' (BELUM attester)'}`)
  console.log(`  registrasi  : ${a.registrationType ?? 'tidak terbaca'} · menunjuk balik ke #${a.agentId}: ${a.pointsBack}`)
  console.log(`  URI sama dengan yang diharapkan: ${a.uri === want}`)
  if (!APPLY) console.log('\n(tanpa --apply: tidak ada yang ditulis)')
}
