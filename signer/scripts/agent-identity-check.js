// Lencana-B118 status=SELESAI 2026-10-01 — harness identitas agen penilai ERC-8004: registry BNB, pemilik = Agent Owner, dompet agen = kunci operasional agen dan BUKAN penerbit (D54), berkas registrasi, gerbang admit, halaman verifikasi. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:agent` — B118 F1: agen penilai punya identitas ERC-8004 yang bisa diperiksa orang lain.
 *
 * Baca-saja: tidak ada transaksi. Semua yang diklaim dibaca dari chain 97 (registry BNB, resolver kita).
 *
 * KOREKSI 1 Okt (D54, opsi B): versi pagi hari harness ini menuntut `agentWallet` = attester dan
 * `admit` hanya menerima dompet agen. Sesudah builder memilih "penerbit tetap attester, agen hanya
 * penilai", tuntutannya dibalik: dompet agen = kunci operasional agen, BUKAN penerbit, dan bukan
 * penerbit di resolver; `admit` menerima kunci penerbit dan menolak kunci agen. Kalimat lama
 * dibiarkan terbaca di T35, tidak ditimpa.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http, getAddress, parseAbi } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { ERC8004, identityAbi, readAgent, REGISTRATION_TYPE, agentRegistryId } from '../src/erc8004.js'
import { MANIFESTS } from '../../web/src/manifest-keys.ts'
import { verify, defaultEndpoint } from '../../web/src/verify.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:agent')
const env = process.env
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'ISSUER_ADDRESS', 'AGENT_OWNER_ADDRESS', 'AGENT_GRADER_ADDRESS']) {
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
const PUBLISHER = getAddress(env.ISSUER_ADDRESS)

// --- registry milik BNB / tim 8004 -------------------------------------------------------------
const code = REG ? await client.getCode({ address: REG }) : null
check(`IdentityRegistry ERC-8004 BNB ada di chain ${chainId}`, Boolean(code) && code.length > 2, REG)
const domain = await client.readContract({ address: REG, abi: identityAbi, functionName: 'eip712Domain' }).catch(() => null)
check('eip712Domain registry = ERC8004IdentityRegistry v1 di chain ini', domain?.[1] === 'ERC8004IdentityRegistry' && domain?.[2] === '1' && Number(domain?.[3]) === chainId,
  `${domain?.[1]} v${domain?.[2]} chain ${domain?.[3]}`)

// --- klaim manifest ----------------------------------------------------------------------------
const claims = MANIFESTS.map((m) => ({ course: m.course.id, agent: m.issuer.agent ?? null }))
check('setiap manifest penerbit menyebut agen penilai ERC-8004 di registry chain ini',
  claims.length > 0 && claims.every((c) => c.agent && c.agent.registry === agentRegistryId(chainId, REG)), JSON.stringify(claims))
const agentId = claims[0]?.agent?.agentId
check('agentId yang disebut manifest sama untuk semua kursus penerbit ini', claims.every((c) => c.agent?.agentId === agentId), JSON.stringify(claims))

// --- identitas di chain --------------------------------------------------------------------------
const a = await readAgent(client, { chainId, agentId })
check(`identitas #${agentId} ada di registry`, a.ok === true, a.why)
check('pemilik NFT = Agent Owner, bukan penerbit dan bukan platform (D53)', a.owner === getAddress(env.AGENT_OWNER_ADDRESS)
  && a.owner !== PUBLISHER && a.owner !== getAddress(env.DEPLOYER_ADDRESS ?? '0x0000000000000000000000000000000000000001'), a.owner)
check('agentWallet = kunci operasional agen penilai (AGENT_GRADER_ADDRESS)', a.wallet === getAddress(env.AGENT_GRADER_ADDRESS), a.wallet)
check('agentWallet BUKAN penerbit/attester (D54: penerbit tetap attester)', a.wallet !== PUBLISHER, a.wallet)
const resolverAbi = parseAbi(['function isIssuer(address) view returns (bool)'])
check('agentWallet tidak terdaftar sebagai penerbit di resolver — agen tidak bisa menerbitkan',
  await client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'isIssuer', args: [a.wallet] }) === false)
check('penerbit (attester) tetap penerbit di resolver',
  await client.readContract({ address: env.RESOLVER_ADDRESS, abi: resolverAbi, functionName: 'isIssuer', args: [PUBLISHER] }) === true)

// --- berkas registrasi -----------------------------------------------------------------------------
check('agentURI = data: URI di chain, tipe registration-v1', String(a.uri).startsWith('data:application/json;base64,') && a.registrationType === REGISTRATION_TYPE, a.registrationType)
check('berkas registrasi menunjuk balik ke agentId ini di registry ini', a.pointsBack === true, JSON.stringify(a.registration?.registrations))
check('berkas registrasi menyebut perannya: menilai, TIDAK menandatangani atau mencabut kredensial',
  a.registration?.name === 'Lencana essay grading agent' && /never signs or revokes credentials/.test(a.registration?.description ?? ''), a.registration?.name)
check('tidak ada layanan yang diiklankan tanpa endpoint publik (services kosong)', Array.isArray(a.registration?.services) && a.registration.services.length === 0,
  JSON.stringify(a.registration?.services))
check('berkas registrasi tidak mengklaim jenis kepercayaan yang belum dibangun (supportedTrust kosong)', Array.isArray(a.registration?.supportedTrust) && a.registration.supportedTrust.length === 0,
  JSON.stringify(a.registration?.supportedTrust))

// --- halaman verifikasi ------------------------------------------------------------------------------
const ep = { ...defaultEndpoint(), rpcUrl: env.RPC_URL, resolver: env.RESOLVER_ADDRESS }
const VALID_HASH = '0xd0bce6f402e437e4bcc32ddc3d305c5b6b7079b7c4473f6c5625a8183bf7930e' // SAMPLE_HASHES.valid
const good = await verify(VALID_HASH, ep)
check(`verify(): identitas agen penilai #${agentId} terbaca (pemilik, registrasi menunjuk balik)`,
  good.issuerAgent.agentId === agentId && good.issuerAgent.owner === a.owner && good.issuerAgent.registrationPointsBack === true, JSON.stringify(good.issuerAgent))
check('verify(): agen itu BUKAN attester kertas (walletIsAttester = false, sesuai D54)', good.issuerAgent.walletIsAttester === false, JSON.stringify(good.issuerAgent))
check('verify(): verdict tetap VALID (identitas informasi, bukan putusan)', good.verdict === 'VALID', good.verdict)
check('verify(): alasannya menyebut agen penilai, bahwa penerbit yang menandatangani, dan menolak mengklaim reputasi',
  good.reasons.some((r) => r.includes(`ERC-8004 #${agentId}`) && r.includes('BUKAN penanda tangan') && r.includes('bukan reputasi')), good.reasons.join(' | ').slice(0, 220))

// --- gerbang penerimaan penerbit (D54) ------------------------------------------------------------------
const admit = (...args) => {
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/admit.js', ...args], { cwd: SIGNER, env, encoding: 'utf8' })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}
const okPub = admit('--address', PUBLISHER)
check('admit: kunci penerbit yang sudah diterima -> SUDAH DITERIMA, tanpa transaksi', okPub.status === 0 && /SUDAH DITERIMA/.test(okPub.out), okPub.out.slice(-160))
const agentAsIssuer = admit('--address', a.wallet)
check('admit: dompet agen penilai sebagai penerbit -> DITOLAK (agen tidak boleh attester)', agentAsIssuer.status === 2 && /agentWallet agen penilai/.test(agentAsIssuer.out), agentAsIssuer.out.slice(-160))
const ownerAsIssuer = admit('--address', a.owner)
check('admit: Agent Owner sebagai penerbit -> DITOLAK', ownerAsIssuer.status === 2 && /Agent Owner/.test(ownerAsIssuer.out), ownerAsIssuer.out.slice(-160))
const oldStyle = admit('--agent-id', agentId)
check('admit: pemanggilan gaya lama --agent-id -> DITOLAK dengan sebab D54', oldStyle.status === 2 && /D54/.test(oldStyle.out), oldStyle.out.slice(-160))
const bare = admit()
check('admit: tanpa --address -> DITOLAK', bare.status === 2 && /butuh --address/.test(bare.out), bare.out.slice(-160))

console.log(`\nAGEN ${fails === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
process.exitCode = fails > 0 ? 1 : 0
