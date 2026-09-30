/**
 * `npm run specimen` — dua spesimen yang dijual UI tapi tidak pernah kita punya: satu kredensial
 * yang penerbitnya DIDELISTING dan satu yang KADALUARSA, keduanya dengan dokumen yang bisa terbit
 * di tepi.
 *
 *   npm run specimen               # hanya membaca: keadaan chain + apa yang masih kurang
 *   npm run specimen -- --apply    # menjalankan yang kurang (transaksi testnet, kunci platform)
 *
 * Kenapa skrip dan bukan empat perintah tangan: spesimen yang asal-usulnya hanya ada di riwayat
 * terminal adalah artefak tanpa asal-usul (kelas B49/B75). Di sini setiap alamat DITURUNKAN dari
 * label yang tertulis di berkas ini, jadi siapa pun bisa menghitung ulang alamat mana yang kita
 * korbankan dan kenapa.
 *
 * Tiga hal yang sengaja:
 *   - Agen yang didelisting adalah **agen korban**, EOA baru yang kuncinya `keccak256(label)`.
 *     Kunci yang bisa dihitung siapa pun itu aman HANYA karena urutannya: label ini baru terbaca
 *     publik sesudah `delistIssuer`, dan agen yang didelisting tidak bisa menerbitkan apa pun
 *     (`addIssuer` menolaknya, `relistIssuer` hanya milik owner). Jangan pernah `relistIssuer` alamat ini.
 *   - Skrip MENOLAK mendelisting alamat penerbit yang dipakai kertas sungguhan (`ISSUER_ADDRESS`).
 *   - `expired` tidak bisa dikarang: BAS menolak `expirationTime` di masa lalu saat terbit, jadi
 *     kertasnya diterbitkan dengan masa berlaku 675 detik (`--days 0.0078125`, 1/128 hari — pecahan
 *     biner supaya hasil kalinya bilangan bulat) dan baru terbaca `expired` sesudah jam chain lewat.
 *
 * Idempoten: tiap langkah membaca chain dulu. Menerbitkan ke tepi BUKAN bagian skrip ini
 * (`npm run publish:edge`), dan yang mengadili hasil akhirnya adalah `npm run check:samples`.
 */

// Lencana-B102 status=SELESAI 2026-09-30 — resep spesimen delisted/expired, sudah dijalankan sekali di chain 97; alamat diturunkan dari label di berkas ini dan agen korban TIDAK BOLEH di-relist. Buktikan ulang: npm run specimen (baca-saja) lalu npm run check:samples. JANGAN dibalik/diulang tanpa membuka kembali baris B102 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes, parseAbi, parseEther, formatEther, getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { credentialHashOf } from '../src/credential.js'
import { createIssuerKey, saveKey, loadKey } from '../src/issuer.js'
import { loadFileEnvReport } from '../src/env.js'
import { EMPTY_UID } from '../../web/src/abi.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')

await loadFileEnvReport('specimen')
const env = process.env
const RPC = env.RPC_URL
const RESOLVER = env.RESOLVER_ADDRESS
const EDGE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
for (const [k, v] of Object.entries({ RPC_URL: RPC, RESOLVER_ADDRESS: RESOLVER, EDGE_BASE_URL: EDGE, ISSUER_ADDRESS: env.ISSUER_ADDRESS })) {
  if (!v) { console.error(`${k} belum diisi`); process.exit(2) }
}

const COURSE = 'web3-dasar-2026'
const EVIDENCE = ['--quiz', '80,80,90,70', '--essay-score', '90']
const SPECIMEN_SLUG = 'agent-spesimen'
const EXPIRY_DAYS = '0.0078125'
const FUND = parseEther('0.002')

const derive = (label) => privateKeyToAccount(keccak256(stringToBytes(label)))
const AGENT_LABEL = 'lencana-b102-sacrificial-agent'
const agent = derive(AGENT_LABEL)
const learnerDelisted = derive('lencana-b102-learner-delisted').address
const learnerExpired = derive('lencana-b102-learner-expired').address
const hashDelisted = credentialHashOf(learnerDelisted, COURSE)
const hashExpired = credentialHashOf(learnerExpired, COURSE)

const abi = parseAbi([
  'function owner() view returns (address)',
  'function isIssuer(address) view returns (bool)',
  'function isDelisted(address) view returns (bool)',
  'function attestationOf(bytes32) view returns (bytes32)',
  'function statusOf(bytes32) view returns (bool, bool, bool, bool, address, uint64, uint64)',
  'function addIssuer(address)',
  'function delistIssuer(address)',
])
const client = createPublicClient({ transport: http(RPC) })
const read = (functionName, args = []) => client.readContract({ address: RESOLVER, abi, functionName, args })

const label = (s) => (!s[0] ? 'TIDAK DI CHAIN' : s[3] ? 'delisted' : s[2] ? 'expired' : s[1] ? 'revoked' : 'valid')
async function report () {
  const [issuer, delisted, sD, sE, block] = await Promise.all([
    read('isIssuer', [agent.address]), read('isDelisted', [agent.address]),
    read('statusOf', [hashDelisted]), read('statusOf', [hashExpired]), client.getBlock(),
  ])
  console.log(`  agen korban   : ${agent.address}  isIssuer=${issuer} isDelisted=${delisted}  (kunci = keccak256("${AGENT_LABEL}"))`)
  console.log(`  spesimen delisted: ${hashDelisted} -> ${label(sD)}${sD[0] ? ` · attester ${sD[4]}` : ''}`)
  console.log(`  spesimen expired : ${hashExpired} -> ${label(sE)}${sE[0] ? ` · attester ${sE[4]} · expiresAt ${sE[6]} (jam chain ${block.timestamp})` : ''}`)
  return { issuer, delisted, sD, sE, now: block.timestamp }
}

console.log(`specimen — resolver ${RESOLVER} · ${APPLY ? 'MENULIS (--apply)' : 'hanya membaca'}\n`)
let st = await report()

if (APPLY) {
  if (agent.address.toLowerCase() === env.ISSUER_ADDRESS.toLowerCase()) {
    console.error('berhenti: agen korban sama dengan ISSUER_ADDRESS — penerbit kertas sungguhan tidak pernah didelisting dari sini')
    process.exit(2)
  }
  if (!env.DEPLOYER_PRIVATE_KEY) { console.error('DEPLOYER_PRIVATE_KEY belum diisi'); process.exit(2) }
  const owner = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
  if (getAddress(await read('owner')) !== owner.address) { console.error('kunci platform bukan owner() resolver — berhenti sebelum gas'); process.exit(2) }
  const chainId = await client.getChainId()
  const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } }
  const wallet = createWalletClient({ account: owner, chain, transport: http(RPC) })
  const mined = async (what, hash) => {
    const r = await client.waitForTransactionReceipt({ hash })
    if (r.status !== 'success') throw new Error(`${what} revert di ${hash}`)
    console.log(`  tx ${what}: ${hash} (gas ${r.gasUsed}, blok ${r.blockNumber})`)
  }
  const issue = (extraEnv, args) => {
    const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/issue.js', '--course', COURSE, ...EVIDENCE, ...args], {
      cwd: SIGNER, stdio: 'inherit', env: { ...env, BASE_URL: EDGE, ...extraEnv },
    })
    if (r.status !== 0) throw new Error(`issue.js keluar ${r.status}`)
  }

  if (!st.sD[0]) {
    if (st.delisted) { console.error('berhenti: agen korban sudah didelisting tapi spesimennya belum terbit — tidak bisa diperbaiki tanpa relist'); process.exit(1) }
    try { await loadKey(SPECIMEN_SLUG) } catch {
      await saveKey(await createIssuerKey({ baseUrl: EDGE, agentSlug: SPECIMEN_SLUG, name: 'Lencana Specimen Agent (delisted on purpose)' }))
      console.log(`  kunci dokumen ${SPECIMEN_SLUG} dibuat di .keys/`)
    }
    if (!st.issuer) await mined('addIssuer(agen korban)', await wallet.writeContract({ address: RESOLVER, abi, functionName: 'addIssuer', args: [agent.address] }))
    if (await client.getBalance({ address: agent.address }) < FUND / 2n) {
      await mined(`isi gas agen korban ${formatEther(FUND)} tBNB`, await wallet.sendTransaction({ to: agent.address, value: FUND }))
    }
    console.log('\n— menerbitkan spesimen delisted di bawah agen korban —')
    issue({ ISSUER_PRIVATE_KEY: keccak256(stringToBytes(AGENT_LABEL)), AGENT_SLUG: SPECIMEN_SLUG }, ['--learner', learnerDelisted])
  }
  if (!st.sE[0]) {
    console.log('\n— menerbitkan spesimen expired (masa berlaku 675 detik) di bawah penerbit biasa —')
    issue({}, ['--learner', learnerExpired, '--days', EXPIRY_DAYS])
  }
  if (!(await read('isDelisted', [agent.address]))) {
    if ((await read('attestationOf', [hashDelisted])) === EMPTY_UID) throw new Error('spesimen delisted tidak terbaca di chain — tidak mendelisting agen yang belum menerbitkan apa pun')
    await mined('delistIssuer(agen korban)', await wallet.writeContract({ address: RESOLVER, abi, functionName: 'delistIssuer', args: [agent.address] }))
  }
  console.log('\nsesudah:')
  st = await report()
}

let ran = 0
let fails = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name} -> ${detail}`) }
}
console.log('')
check('spesimen delisted terbaca delisted di chain', label(st.sD) === 'delisted', label(st.sD))
check('attester spesimen delisted = agen korban', st.sD[0] && getAddress(st.sD[4]) === agent.address, String(st.sD[4]))
check('spesimen delisted TIDAK dicabut (delisting bukan revoke)', st.sD[0] && st.sD[1] === false, `revoked=${st.sD[1]}`)
check('agen korban tidak lagi boleh menerbitkan', st.issuer === false && st.delisted === true, `isIssuer=${st.issuer} isDelisted=${st.delisted}`)
check('spesimen expired terbaca expired di chain', label(st.sE) === 'expired',
  st.sE[0] && st.sE[6] >= st.now ? `belum lewat: ${st.sE[6] - st.now} detik lagi — jalankan ulang sesudah itu` : label(st.sE))
check('penerbit spesimen expired masih penerbit sah (kadaluarsa bukan delisting)', st.sE[0] && st.sE[3] === false, `delisted=${st.sE[3]}`)
check('penerbit kertas sungguhan tidak tersentuh', (await read('isIssuer', [env.ISSUER_ADDRESS])) === true && (await read('isDelisted', [env.ISSUER_ADDRESS])) === false, 'ISSUER_ADDRESS berubah status')
console.log(`\nSPESIMEN ${fails === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
process.exitCode = fails > 0 ? 1 : 0
