// Lencana-B130 status=TERBUKA 2026-10-02 — platform mencetak identitas agen ERC-8004 untuk sebuah akun: register, berkas registrasi, tarif, catatan platform_agents, transferFrom ke akun itu, dan gas untuk transaksi pemiliknya; dompet agen sengaja diisi pemilik sendiri karena EIP-8004 mengosongkannya saat pemindahan. Buktikan ulang: npm run verify:owner (dan dasbor #/app/owner). JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run agent:mint -- --to <alamat> [--tariff 2000] [--gas 0.001] [--apply]` — platform mencetak satu identitas agen
 * penilai di IdentityRegistry BNB untuk akun Lencana, lalu memindahkannya ke akun itu (D65, pilihan builder 2 Okt).
 * `--agent-id N` melanjutkan agen yang sudah dicetak tapi belum selesai dipindah (barisnya ada di `platform_agents`).
 *
 * Urutan, tiap langkah membaca chain dulu dan disimulasikan sebelum dikirim (kunci platform `DEPLOYER_PRIVATE_KEY`
 * membayar semua gasnya):
 *   1. register()                       → agentId dari event Registered; baris `platform_agents` langsung dicatat
 *   2. setAgentURI(berkas registrasi)   → peran `grader-account`, menunjuk balik ke agentId-nya
 *   3. setMetadata(lencana.baseTariff)  → tarif dasar dalam token demo (bawaan 2000 = 0,002 LDC-demo)
 *   4. transferFrom(platform → akun)    → pemiliknya kini akun itu; EIP-8004: `agentWallet` dikosongkan otomatis
 *   5. gas                              → bila saldo akun < 0,0005 tBNB, kirim `--gas` (bawaan 0,001 tBNB)
 * Yang SENGAJA tidak dilakukan: mengisi dompet agen. Hanya pemilik yang boleh (`setAgentWallet`), jadi pemilik
 * melakukannya sendiri dari dasbor Agent Owner (`#/app/owner`, tombol "Verifikasi dompet agen").
 */
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress, isAddress, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { ERC8004, identityAbi, registrationFile, toDataUri, readAgent, TARIFF_KEY, encodeTariff } from '../src/erc8004.js'
import { recordPlatformAgent, platformAgents, dbConfigured, dbMissingReason } from '../src/db.js'

await loadFileEnvReport('agent:mint')
const env = process.env
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined }
const APPLY = process.argv.includes('--apply')
const ROLE = 'grader-account'
const TO = arg('to')
const TARIFF = BigInt(arg('tariff') ?? '2000')
const GAS = parseEther(arg('gas') ?? '0.001')
const GAS_LOW = parseEther('0.0005')

for (const k of ['RPC_URL', 'DEPLOYER_PRIVATE_KEY', 'DEMO_TOKEN_ADDRESS', 'ISSUER_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan`); process.exit(2) }
}
if (!dbConfigured()) { console.error(`database belum dikonfigurasi: ${dbMissingReason()}`); process.exit(2) }
if (!TO || !isAddress(TO)) { console.error('pakai: npm run agent:mint -- --to <alamat 0x…> [--tariff 2000] [--gas 0.001] [--agent-id N] [--apply]'); process.exit(2) }
if (TARIFF <= 0n) { console.error('--tariff harus > 0 (satuan terkecil token demo, 6 desimal)'); process.exit(2) }

const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const REG = ERC8004[chainId]?.identity
if (!REG) { console.error(`tidak ada registry ERC-8004 yang dikenal untuk chain ${chainId}`); process.exit(2) }
const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
const platform = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
const wallet = createWalletClient({ account: platform, chain, transport: http(env.RPC_URL) })
const to = getAddress(TO)

for (const [why, bad] of [
  ['akun tujuan = penerbit (attester) — D54: penerbit dan Agent Owner pihak berbeda', to.toLowerCase() === env.ISSUER_ADDRESS.toLowerCase()],
  ['akun tujuan = kunci platform sendiri', to.toLowerCase() === platform.address.toLowerCase()],
]) if (bad) { console.error(`berhenti: ${why}`); process.exit(2) }

console.log(`registry ${REG} (chain ${chainId}) · ${APPLY ? 'MENULIS (--apply)' : 'hanya rencana'}`)
console.log(`  platform    : ${platform.address} · saldo ${formatEther(await client.getBalance({ address: platform.address }))} tBNB`)
console.log(`  akun tujuan : ${to} · saldo ${formatEther(await client.getBalance({ address: to }))} tBNB`)
console.log(`  tarif dasar : ${TARIFF} (satuan terkecil ${env.DEMO_TOKEN_ADDRESS})`)

const mined = async (what, hash) => {
  const r = await client.waitForTransactionReceipt({ hash })
  if (r.status !== 'success') throw new Error(`${what} revert di ${hash}`)
  console.log(`  tx ${what}: ${hash} (gas ${r.gasUsed}, blok ${r.blockNumber})`)
  return r
}
const send = async (what, functionName, args) => {
  const { request } = await client.simulateContract({ account: platform, address: REG, abi: identityAbi, functionName, args })
  return mined(what, await wallet.writeContract(request))
}

if (!APPLY) {
  console.log('\nrencana: register → setAgentURI (peran grader-account) → setMetadata tarif → catat platform_agents → transferFrom → gas bila < 0,0005 tBNB')
  console.log('(tanpa --apply: tidak ada yang ditulis)')
  process.exit(0)
}

let agentId = arg('agent-id') ?? null
let registerTx = null
if (agentId) {
  const row = (await platformAgents([agentId]))[0]
  if (!row) throw new Error(`agen #${agentId} tidak ada di platform_agents — agen.mint hanya melanjutkan agen yang ia cetak sendiri`)
  registerTx = row.register_tx
} else {
  const r = await send('register()', 'register', [])
  const ev = r.logs.filter((l) => getAddress(l.address) === getAddress(REG))
    .map((l) => { try { return decodeEventLog({ abi: identityAbi, data: l.data, topics: l.topics }) } catch { return null } })
    .find((e) => e?.eventName === 'Registered')
  if (!ev) throw new Error('register() berhasil tapi event Registered tidak terbaca')
  agentId = ev.args.agentId.toString()
  registerTx = r.transactionHash
  console.log(`  identitas baru: #${agentId}`)
  // Dicatat SEBELUM langkah lain, supaya run yang terputus bisa dilanjutkan dengan --agent-id.
  await recordPlatformAgent({ agentId, registry: `eip155:${chainId}:${REG}`, role: ROLE, mintedBy: platform.address, registerTx })
}

let a = await readAgent(client, { chainId, agentId })
if (!a.ok) throw new Error(a.why)
const wantUri = toDataUri(registrationFile({ chainId, registry: REG, agentId, role: ROLE }))
const wantTariff = encodeTariff({ token: env.DEMO_TOKEN_ADDRESS, amount: TARIFF })
let transferTx = null
let gasTx = null

if (a.owner === platform.address) {
  if (a.uri !== wantUri) await send(`setAgentURI (peran ${ROLE})`, 'setAgentURI', [BigInt(agentId), wantUri])
  const currentTariff = await client.readContract({ address: REG, abi: identityAbi, functionName: 'getMetadata', args: [BigInt(agentId), TARIFF_KEY] })
  if (currentTariff !== wantTariff) await send(`setMetadata(${TARIFF_KEY} = ${TARIFF})`, 'setMetadata', [BigInt(agentId), TARIFF_KEY, wantTariff])
  transferTx = (await send(`transferFrom(platform → ${to})`, 'transferFrom', [platform.address, to, BigInt(agentId)])).transactionHash
} else if (a.owner === to) {
  console.log(`  #${agentId} sudah milik ${to} — langkah pemindahan dilewati`)
} else {
  throw new Error(`#${agentId} dimiliki ${a.owner}, bukan platform maupun akun tujuan — berhenti`)
}

if (await client.getBalance({ address: to }) < GAS_LOW) {
  gasTx = (await mined(`gas ${formatEther(GAS)} tBNB → ${to}`, await wallet.sendTransaction({ to, value: GAS }))).transactionHash
}
await recordPlatformAgent({
  agentId, registry: `eip155:${chainId}:${REG}`, role: ROLE, mintedBy: platform.address, registerTx,
  ownerTo: to, transferTx: transferTx ?? (await platformAgents([agentId]))[0]?.transfer_tx ?? null, gasTx,
})

a = await readAgent(client, { chainId, agentId })
console.log('\nterbaca dari chain:')
console.log(`  agentId     : #${a.agentId} · ${a.registry}`)
console.log(`  owner       : ${a.owner}${a.owner === to ? ' (= akun tujuan)' : ' (BELUM akun tujuan)'}`)
console.log(`  agentWallet : ${a.wallet ?? 'kosong'} — diisi pemilik sendiri dari #/app/owner (EIP-8004: dikosongkan saat pemindahan)`)
console.log(`  registrasi  : ${a.registration?.name ?? 'tidak terbaca'} · menunjuk balik: ${a.pointsBack} · URI sesuai: ${a.uri === wantUri}`)
console.log(`  tarif dasar : ${a.tariff ? `${a.tariff.amount} @ ${a.tariff.token}` : 'belum ada'}`)
console.log(`  saldo akun  : ${formatEther(await client.getBalance({ address: to }))} tBNB`)
