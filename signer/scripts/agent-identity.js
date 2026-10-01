/**
 * `npm run agent:identity` — rawat identitas agen penilai Lencana di registry ERC-8004 BNB.
 * (B118 F1 → disesuaikan D54 untuk B119/B120, 1 Okt.)
 *
 *   npm run agent:identity                              # baca-saja, peran penilai (agen #2534)
 *   npm run agent:identity -- --role reviewer           # baca-saja, agen reviewer
 *   npm run agent:identity -- [--role …] --apply        # menulis: isi gas, register, ikat dompet, URI, tarif
 *   npm run agent:identity -- --agent-id 42             # pakai identitas yang sudah ada, jangan cari
 *
 * Kunci per peran — Agent Owner memegang identitas, dompet operasional agen bekerja dan dibayar:
 *   penilai   AGENT_OWNER_PRIVATE_KEY     + AGENT_GRADER_PRIVATE_KEY     tarif dasar bawaan 2000
 *   reviewer  REVIEWER_OWNER_PRIVATE_KEY  + AGENT_REVIEWER_PRIVATE_KEY   tarif dasar bawaan 1500
 * (satuan terkecil token demo 6 desimal; `--tariff N` untuk angka lain). Platform (`DEPLOYER_PRIVATE_KEY`)
 * hanya mengisi gas Agent Owner. Penerbit (`ISSUER_PRIVATE_KEY`) TIDAK terlibat: sejak D54 ia tetap
 * attester dan agen tidak pernah menandatangani kredensial — skrip menolak kalau dompet agen = penerbit.
 *
 * Idempoten: tiap langkah membaca chain dulu; tiap transaksi disimulasikan sebelum dikirim.
 */

// Lencana-B118 status=SELESAI 2026-10-01 — pendaftaran agen penilai di IdentityRegistry ERC-8004 BNB; pemilik NFT = Agent Owner, URI = data: registrasi; sejak D54 dompet agen = kunci operasional agen, bukan attester. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B120 status=SELESAI 2026-10-01 — agen reviewer = identitas ERC-8004 kedua dengan Agent Owner dan dompet yang berbeda dari agen penilai. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B120 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import {
  ERC8004, identityAbi, agentWalletTypedData, registrationFile, toDataUri, readAgent, TARIFF_KEY, encodeTariff,
} from '../src/erc8004.js'

await loadFileEnvReport('agent:identity')
const env = process.env
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const APPLY = process.argv.includes('--apply')
const ROLE = arg('role') ?? 'grader'
const ROLES = {
  grader: { owner: 'AGENT_OWNER_PRIVATE_KEY', wallet: 'AGENT_GRADER_PRIVATE_KEY', tariff: 2000n },
  reviewer: { owner: 'REVIEWER_OWNER_PRIVATE_KEY', wallet: 'AGENT_REVIEWER_PRIVATE_KEY', tariff: 1500n },
}
const R = ROLES[ROLE]
if (!R) { console.error(`--role harus grader atau reviewer, bukan ${ROLE}`); process.exit(2) }
const TARIFF = arg('tariff') ? BigInt(arg('tariff')) : R.tariff

for (const k of ['RPC_URL', 'DEMO_TOKEN_ADDRESS', 'ISSUER_ADDRESS', R.owner, R.wallet]) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan`); process.exit(2) }
}
const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const REG = ERC8004[chainId]?.identity
if (!REG) { console.error(`tidak ada registry ERC-8004 yang dikenal untuk chain ${chainId}`); process.exit(2) }
const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
const owner = privateKeyToAccount(env[R.owner])
const agentWallet = privateKeyToAccount(env[R.wallet])
const publisher = getAddress(env.ISSUER_ADDRESS)
const ownerWallet = createWalletClient({ account: owner, chain, transport: http(env.RPC_URL) })

for (const [why, bad] of [
  ['Agent Owner sama dengan dompet operasional agen', owner.address === agentWallet.address],
  ['dompet agen = penerbit (attester) — D54: agen tidak pernah menandatangani kredensial', agentWallet.address === publisher],
  ['Agent Owner = penerbit — agen disewa penerbit, bukan miliknya', owner.address === publisher],
]) if (bad) { console.error(`berhenti: ${why}`); process.exit(2) }

console.log(`registry ${REG} (chain ${chainId}) · peran ${ROLE} · ${APPLY ? 'MENULIS (--apply)' : 'hanya membaca'}`)
console.log(`  Agent Owner : ${owner.address} · saldo ${formatEther(await client.getBalance({ address: owner.address }))} tBNB`)
console.log(`  dompet agen : ${agentWallet.address}`)

const mined = async (what, hash) => {
  const r = await client.waitForTransactionReceipt({ hash })
  if (r.status !== 'success') throw new Error(`${what} revert di ${hash}`)
  console.log(`  tx ${what}: ${hash} (gas ${r.gasUsed}, blok ${r.blockNumber})`)
  return r
}

async function findExisting () {
  if (arg('agent-id')) return arg('agent-id')
  const bal = await client.readContract({ address: REG, abi: identityAbi, functionName: 'balanceOf', args: [owner.address] })
  if (bal === 0n) return null
  const latest = await client.getBlockNumber()
  for (let to = latest; to > latest - 400000n && to > 0n; to -= 5000n) {
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
  const wantUri = toDataUri(registrationFile({ chainId, registry: REG, agentId, role: ROLE }))
  const wantTariff = encodeTariff({ token: env.DEMO_TOKEN_ADDRESS, amount: TARIFF })

  if (APPLY && a.wallet !== agentWallet.address) {
    const deadline = (await client.getBlock()).timestamp + 240n // kontrak menolak > 5 menit
    const sig = await agentWallet.signTypedData(agentWalletTypedData({ chainId, registry: REG, agentId, newWallet: agentWallet.address, owner: owner.address, deadline }))
    const { request } = await client.simulateContract({
      account: owner, address: REG, abi: identityAbi, functionName: 'setAgentWallet', args: [BigInt(agentId), agentWallet.address, deadline, sig],
    })
    await mined(`setAgentWallet(${a.wallet ?? 'kosong'} -> ${agentWallet.address})`, await ownerWallet.writeContract(request))
  }
  if (APPLY && a.uri !== wantUri) {
    const { request } = await client.simulateContract({ account: owner, address: REG, abi: identityAbi, functionName: 'setAgentURI', args: [BigInt(agentId), wantUri] })
    await mined(`setAgentURI (peran ${ROLE}, ${wantUri.length} karakter)`, await ownerWallet.writeContract(request))
  }
  const currentTariff = await client.readContract({ address: REG, abi: identityAbi, functionName: 'getMetadata', args: [BigInt(agentId), TARIFF_KEY] })
  if (APPLY && currentTariff !== wantTariff) {
    const { request } = await client.simulateContract({ account: owner, address: REG, abi: identityAbi, functionName: 'setMetadata', args: [BigInt(agentId), TARIFF_KEY, wantTariff] })
    await mined(`setMetadata(${TARIFF_KEY} = ${TARIFF})`, await ownerWallet.writeContract(request))
  }

  a = await readAgent(client, { chainId, agentId })
  console.log('\nterbaca dari chain:')
  console.log(`  agentId     : ${a.agentId} · ${a.registry}`)
  console.log(`  owner       : ${a.owner}${a.owner === owner.address ? ' (Agent Owner)' : ''}`)
  console.log(`  agentWallet : ${a.wallet}${a.wallet === agentWallet.address ? ' (= dompet operasional agen)' : ' (BELUM dompet agen)'}`)
  console.log(`  registrasi  : ${a.registration?.name ?? 'tidak terbaca'} · menunjuk balik: ${a.pointsBack} · URI sesuai peran: ${a.uri === wantUri}`)
  console.log(`  tarif dasar : ${a.tariff ? `${a.tariff.amount} @ ${a.tariff.token}` : 'belum ada'}`)
  if (!APPLY) console.log('\n(tanpa --apply: tidak ada yang ditulis)')
}
