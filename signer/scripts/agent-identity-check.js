// Lencana-B118 status=SELESAI 2026-10-01 —harness identitas agen ERC-8004: registry BNB, pemilik = Agent Owner, agentWallet = attester, berkas registrasi, gerbang admit, dan halaman verifikasi. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:agent` — B118 F1: agen penerbit punya identitas ERC-8004 yang bisa diperiksa orang lain.
 *
 * Baca-saja: tidak ada transaksi. Semua yang diklaim dibaca dari chain 97 (registry BNB, resolver kita)
 * atau dari URL publik yang tercantum di berkas registrasi agen — bukan dari catatan kita.
 * Kontrol negatifnya ikut di sini: kertas yang attester-nya BUKAN dompet agen itu (spesimen delisted
 * B102) harus terbaca "klaim manifest tidak terbukti", dan gerbang `admit` harus menolak alamat lain.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http, getAddress, parseAbi } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { ERC8004, identityAbi, readAgent, REGISTRATION_TYPE, agentRegistryId } from '../src/erc8004.js'
import { MANIFESTS } from '../../web/src/manifest.ts'
import { verify, defaultEndpoint } from '../../web/src/verify.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:agent')
const env = process.env
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'ISSUER_ADDRESS', 'AGENT_OWNER_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}

let ran = 0
let fails = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 220)}` : ''}`) }
}

const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const REG = ERC8004[chainId]?.identity

// --- registry: milik BNB / tim 8004, dan benar-benar kontrak yang kita kira ---------------------
const code = REG ? await client.getCode({ address: REG }) : null
check(`IdentityRegistry ERC-8004 BNB ada di chain ${chainId}`, Boolean(code) && code.length > 2, REG)
const domain = await client.readContract({ address: REG, abi: identityAbi, functionName: 'eip712Domain' }).catch(() => null)
check('eip712Domain registry = ERC8004IdentityRegistry v1 di chain ini', domain?.[1] === 'ERC8004IdentityRegistry' && domain?.[2] === '1' && Number(domain?.[3]) === chainId,
  `${domain?.[1]} v${domain?.[2]} chain ${domain?.[3]}`)

// --- klaim manifest ----------------------------------------------------------------------------
const claims = MANIFESTS.map((m) => ({ course: m.course.id, agent: m.issuer.agent ?? null }))
check('setiap manifest penerbit menyebut agen ERC-8004 di registry chain ini',
  claims.length > 0 && claims.every((c) => c.agent && c.agent.registry === agentRegistryId(chainId, REG)), JSON.stringify(claims))
const agentId = claims[0]?.agent?.agentId
check('agentId yang disebut manifest sama untuk semua kursus penerbit ini', claims.every((c) => c.agent?.agentId === agentId), JSON.stringify(claims))

// --- identitas di chain --------------------------------------------------------------------------
const a = await readAgent(client, { chainId, agentId })
check(`identitas #${agentId} ada di registry`, a.ok === true, a.why)
check('pemilik NFT = Agent Owner (bukan attester, bukan platform) — D53', a.owner === getAddress(env.AGENT_OWNER_ADDRESS)
  && a.owner !== getAddress(env.ISSUER_ADDRESS) && a.owner !== getAddress(env.DEPLOYER_ADDRESS ?? '0x0000000000000000000000000000000000000001'), a.owner)
check('agentWallet (metadata reserved) = attester kertas kita (ISSUER_ADDRESS)', a.wallet === getAddress(env.ISSUER_ADDRESS), a.wallet)
const resolverAbi = parseAbi(['function isIssuer(address) view returns (bool)', 'function isDelisted(address) view returns (bool)'])
check('agentWallet adalah penerbit yang diterima resolver, dan tidak didelisting',
  await client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'isIssuer', args: [a.wallet] }) === true
  && await client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'isDelisted', args: [a.wallet] }) === false)

// --- berkas registrasi -----------------------------------------------------------------------------
check('agentURI = data: URI di chain, tipe registration-v1', String(a.uri).startsWith('data:application/json;base64,') && a.registrationType === REGISTRATION_TYPE, a.registrationType)
check('berkas registrasi menunjuk balik ke agentId ini di registry ini', a.pointsBack === true, JSON.stringify(a.registration?.registrations))
const services = a.registration?.services ?? []
const doc = services.find((s) => s.name === 'issuer-document')
let docOk = false
if (doc?.endpoint?.startsWith('https://')) {
  const r = await fetch(doc.endpoint, { signal: AbortSignal.timeout(20000) }).catch(() => null)
  const j = r?.ok ? await r.json().catch(() => null) : null
  docOk = Boolean(j) && j.id === doc.endpoint && (j.assertionMethod ?? []).length > 0
}
check('layanan issuer-document di berkas registrasi terbuka publik dan dokumennya ber-id sama', docOk, doc?.endpoint)
check('layanan credential-resolver menunjuk resolver kita di chain ini',
  services.some((s) => s.name === 'credential-resolver' && s.endpoint === `eip155:${chainId}:${getAddress(env.RESOLVER_ADDRESS)}`), JSON.stringify(services))
check('tidak ada layanan http yang tidak bisa dibuka publik (mis. signer lokal)', services.every((s) => !/127\.0\.0\.1|localhost/.test(String(s.endpoint))))
check('berkas registrasi tidak mengklaim jenis kepercayaan yang belum dibangun (supportedTrust kosong)', Array.isArray(a.registration?.supportedTrust) && a.registration.supportedTrust.length === 0,
  JSON.stringify(a.registration?.supportedTrust))

// --- halaman verifikasi: membuktikan klaim manifest dari chain, tanpa mengubah verdict ------------
const ep = { ...defaultEndpoint(), rpcUrl: env.RPC_URL, resolver: env.RESOLVER_ADDRESS }
const VALID_HASH = '0xd0bce6f402e437e4bcc32ddc3d305c5b6b7079b7c4473f6c5625a8183bf7930e' // SAMPLE_HASHES.valid, attester = agent-edge
const good = await verify(VALID_HASH, ep)
check(`verify(): kertas sah milik agen #${agentId} -> identitas terbukti (agentWallet = attester)`,
  good.issuerAgent.agentId === agentId && good.issuerAgent.walletIsAttester === true && good.issuerAgent.registrationPointsBack === true,
  JSON.stringify(good.issuerAgent))
check('verify(): verdict kertas itu tetap VALID (identitas informasi, bukan putusan)', good.verdict === 'VALID', good.verdict)
check('verify(): alasannya menyebut identitas ERC-8004 dan menolak mengklaim reputasi',
  good.reasons.some((r) => r.includes(`ERC-8004 #${agentId}`) && r.includes('bukan reputasi')), good.reasons.join(' | ').slice(0, 200))
const SPECIMEN_DELISTED = '0xaa379627438fb47b6a6c2a5fefc421d26f3168ce941e82c19a591c773d849c0f' // B102, attester = agen korban
const bad = await verify(SPECIMEN_DELISTED, ep)
check('kontrol negatif: kertas yang attester-nya BUKAN dompet agen itu -> klaim manifest tidak terbukti',
  bad.issuerAgent.agentId === agentId && bad.issuerAgent.walletIsAttester === false
  && bad.reasons.some((r) => r.includes('klaim manifest tidak terbukti')), JSON.stringify(bad.issuerAgent))
check('kontrol negatif: verdict kertas itu tetap ISSUER_DELISTED', bad.verdict === 'ISSUER_DELISTED', bad.verdict)

// --- gerbang penerimaan penerbit -----------------------------------------------------------------
const admit = (...args) => {
  const r = spawnSync(process.execPath, ['scripts/admit.js', ...args], { cwd: SIGNER, env, encoding: 'utf8' })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}
const ok = admit('--agent-id', agentId)
check('admit: agen #N yang sudah diterima -> SUDAH DITERIMA, tanpa transaksi', ok.status === 0 && /SUDAH DITERIMA/.test(ok.out), ok.out.slice(-160))
const wrong = admit('--agent-id', agentId, '--address', '0x6f1d3Be372517861fF32c8f9858A3b2B58608239')
check('admit: alamat yang bukan agentWallet identitas itu -> DITOLAK', wrong.status === 2 && /bukan agentWallet/.test(wrong.out), wrong.out.slice(-160))
const none = admit('--agent-id', '99999999')
check('admit: identitas yang tidak ada -> DITOLAK', none.status === 2 && /does not exist/.test(none.out), none.out.slice(-160))
const bare = admit()
check('admit: tanpa --agent-id (alamat polos) -> DITOLAK', bare.status === 2 && /butuh --agent-id/.test(bare.out), bare.out.slice(-160))

console.log(`\nAGEN ${fails === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
process.exitCode = fails > 0 ? 1 : 0
