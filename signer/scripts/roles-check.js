// Lencana-B128 status=TERBUKA 2026-10-02 — harness peran akun: POST /me/roles hanya menjawab pemilik alamat dan membaca peran dari fakta (kunci penerbit, keanggotaan bertanda tangan penerbit, ownerOf di registry ERC-8004); POST /publisher/members hanya menerima tanda tangan kunci penerbit atas pesan yang menyebut anggota dan wewenangnya. Buktikan ulang: npm run verify:roles. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:roles` — peran akun (B128, RF7 langkah C1). Satu akun login bisa memegang lebih dari satu kursi;
 * setiap kursi dibaca dari fakta yang bisa diperiksa ulang, bukan dari pilihan di halaman:
 *   peserta      setiap akun;
 *   penerbit     alamat = ISSUER_ADDRESS, atau keanggotaan yang ditandatangani kunci penerbit (opsi 2 builder, D63);
 *   Agent Owner  ownerOf(agentId) di IdentityRegistry ERC-8004 = alamat itu.
 *
 * Yang dibuktikan, terhadap server sendiri (origin=test; baris keanggotaan uji dihapus di akhir dan sisanya dihitung):
 *   - /me/roles menolak tanpa tanda tangan, pesan keperluan lain, kunci lain, dan replay;
 *   - akun baru = peserta saja; kunci penerbit = penerbit via issuer dengan dua wewenang;
 *   - hibah anggota hanya dari kunci penerbit, dengan pesan yang menyebut anggota + wewenang persis; replay ditolak;
 *   - hibah ulang mengganti wewenang; cabut menghapus kursi; cabut kedua ditolak;
 *   - Agent Owner agen #2534 dan #2542 terbaca dari chain lewat HTTP; alamat lain tidak.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:roles')
const env = process.env
for (const k of ['SUPABASE_URL', 'ISSUER_PRIVATE_KEY', 'ISSUER_ADDRESS', 'RPC_URL', 'AGENT_OWNER_PRIVATE_KEY', 'AGENT_OWNER_ADDRESS', 'REVIEWER_OWNER_PRIVATE_KEY', 'REVIEWER_OWNER_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const graderOwner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const reviewerOwner = privateKeyToAccount(env.REVIEWER_OWNER_PRIVATE_KEY)
const member = privateKeyToAccount(generatePrivateKey())
const stranger = privateKeyToAccount(generatePrivateKey())
const throwaway = [member.address, stranger.address]

const PORT = Number(env.ROLES_PROBE_PORT ?? await freePort(8961))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(60000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const rolesReq = async (account, learner = account.address) => {
  const message = `lencana-roles nonce=${nonce()}`
  return { message, signature: await account.signMessage({ message }), learner }
}
const rolesOf = async (account) => call('/me/roles', await rolesReq(account))
const grantReq = async ({ signer = publisher, issuer = publisher.address, who = member.address, hire, appoint, say = null }) => {
  const message = say ?? `lencana-member grant member=${who.toLowerCase()} hire=${hire ? 1 : 0} appoint=${appoint ? 1 : 0} nonce=${nonce()}`
  return { issuer, member: who, canHire: hire, canAppoint: appoint, message, signature: await signer.signMessage({ message }) }
}
const revokeReq = async ({ signer = publisher, issuer = publisher.address, who = member.address } = {}) => {
  const message = `lencana-member revoke member=${who.toLowerCase()} nonce=${nonce()}`
  return { issuer, member: who, revoke: true, message, signature: await signer.signMessage({ message }) }
}

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=minimal', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  })
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN') }
}
const ours = `member=in.(${throwaway.join(',')})&issuer=eq.${publisher.address}`

try {
  check('ISSUER_PRIVATE_KEY milik ISSUER_ADDRESS (kunci yang menandatangani hibah = penerbit yang dikonfigurasi server)', same(publisher.address, env.ISSUER_ADDRESS), publisher.address)
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— A. POST /me/roles: hanya pemilik alamat')
  const noMsg = await call('/me/roles', { learner: member.address })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const unsigned = await call('/me/roles', { learner: member.address, message: `lencana-roles nonce=${nonce()}` })
  check('pesan tanpa tanda tangan → 401', unsigned.status === 401, unsigned.text.slice(0, 160))
  const otherPurpose = `lencana-records nonce=${nonce()}`
  const wrong = await call('/me/roles', { learner: member.address, message: otherPurpose, signature: await member.signMessage({ message: otherPurpose }) })
  check('tanda tangan sah untuk keperluan lain (records) → 400', wrong.status === 400, wrong.text.slice(0, 160))
  const forged = await call('/me/roles', await rolesReq(stranger, member.address))
  check('tanda tangan kunci lain atas alamat orang → 401', forged.status === 401, forged.text.slice(0, 160))
  const req = await rolesReq(member)
  const fresh = await call('/me/roles', req)
  check('akun baru → 200', fresh.status === 200, fresh.text.slice(0, 160))
  check('akun baru = peserta saja (penerbit null, Agent Owner null)', fresh.body?.roles?.learner === true && fresh.body.roles.publisher === null && fresh.body.roles.agentOwner === null, json(fresh.body?.roles))
  check('jawaban untuk alamat yang menandatangani', same(fresh.body?.address, member.address), fresh.body?.address)
  const replay = await call('/me/roles', req)
  check('replay pesan + tanda tangan yang sama → 401 (nonce sekali-pakai)', replay.status === 401, replay.text.slice(0, 160))

  console.log('\n— B. kunci penerbit = kursi penerbit via issuer')
  const pub = await rolesOf(publisher)
  check('kunci penerbit → publisher.via = issuer', pub.status === 200 && pub.body?.roles?.publisher?.via === 'issuer', json(pub.body?.roles?.publisher))
  check('penerbit memegang kedua wewenang (sewa agen, tunjuk agen pengesah)', pub.body?.roles?.publisher?.canHire === true && pub.body.roles.publisher.canAppoint === true, json(pub.body?.roles?.publisher))
  check('kursi penerbit menyebut institusinya (slug dari manifest)', typeof pub.body?.roles?.publisher?.slug === 'string' && pub.body.roles.publisher.slug.length > 0, json(pub.body?.roles?.publisher))
  check('penerbit bukan Agent Owner (D54: penerbit dan agen pihak berbeda)', pub.body?.roles?.agentOwner === null, json(pub.body?.roles?.agentOwner))

  console.log('\n— C. POST /publisher/members: hibah hanya dari kunci penerbit')
  const selfIssuer = await call('/publisher/members', await grantReq({ signer: stranger, issuer: stranger.address, hire: true, appoint: true }))
  check('orang lain mengaku penerbit dengan kuncinya sendiri → 401', selfIssuer.status === 401, selfIssuer.text.slice(0, 160))
  const forgedGrant = await call('/publisher/members', await grantReq({ signer: stranger, hire: true, appoint: true }))
  check('issuer = penerbit tapi tanda tangan kunci lain → 401', forgedGrant.status === 401, forgedGrant.text.slice(0, 160))
  const liar = await grantReq({ hire: false, appoint: false })
  const upgraded = await call('/publisher/members', { ...liar, canHire: true, canAppoint: true })
  check('isi kiriman melebihi pesan bertanda tangan (pesan hire=0, kiriman hire=1) → 400', upgraded.status === 400, upgraded.text.slice(0, 160))
  const forOther = await grantReq({ hire: true, appoint: true })
  const moved = await call('/publisher/members', { ...forOther, member: stranger.address })
  check('tanda tangan untuk anggota A dipakai untuk anggota B → 400', moved.status === 400, moved.text.slice(0, 160))
  const padded = await grantReq({ hire: true, appoint: false, say: `lencana-member grant member=${member.address.toLowerCase()} hire=10 appoint=0 nonce=${nonce()}` })
  const paddedR = await call('/publisher/members', padded)
  check('pesan "hire=10" tidak lolos sebagai hire=1 (bentuk pesan tepat) → 400', paddedR.status === 400, paddedR.text.slice(0, 160))
  const selfMember = await call('/publisher/members', await grantReq({ who: publisher.address, hire: true, appoint: true }))
  check('penerbit menjadikan dirinya anggota → 400', selfMember.status === 400, selfMember.text.slice(0, 160))
  const g1 = await grantReq({ hire: true, appoint: false })
  const granted = await call('/publisher/members', g1)
  check('hibah sah hire=1 appoint=0 → 200', granted.status === 200, granted.text.slice(0, 160))
  check('jawaban hibah menyebut anggota + wewenangnya', same(granted.body?.member, member.address) && granted.body?.canHire === true && granted.body?.canAppoint === false, json(granted.body))
  const grantReplay = await call('/publisher/members', g1)
  check('replay hibah yang sama → 401 (nonce sekali-pakai)', grantReplay.status === 401, grantReplay.text.slice(0, 160))
  const asMember = await rolesOf(member)
  const seat = asMember.body?.roles?.publisher
  check('anggota → publisher.via = member', asMember.status === 200 && seat?.via === 'member', json(seat))
  check('kursi anggota menunjuk penerbit yang memberinya', same(seat?.issuer, env.ISSUER_ADDRESS), seat?.issuer)
  check('wewenang anggota = yang ditandatangani (hire=1, appoint=0)', seat?.canHire === true && seat?.canAppoint === false, json(seat))
  const notMember = await rolesOf(stranger)
  check('akun lain tetap peserta saja (keanggotaan tidak bocor)', notMember.body?.roles?.publisher === null, json(notMember.body?.roles))
  const regrant = await call('/publisher/members', await grantReq({ hire: false, appoint: true }))
  check('hibah ulang hire=0 appoint=1 → 200', regrant.status === 200, regrant.text.slice(0, 160))
  const seat2 = (await rolesOf(member)).body?.roles?.publisher
  check('hibah ulang mengganti wewenang, bukan menambah baris', seat2?.canHire === false && seat2?.canAppoint === true, json(seat2))

  console.log('\n— D. cabut')
  const forgedRevoke = await call('/publisher/members', await revokeReq({ signer: stranger }))
  check('cabut bertanda tangan kunci lain → 401', forgedRevoke.status === 401, forgedRevoke.text.slice(0, 160))
  const revoked = await call('/publisher/members', await revokeReq())
  check('cabut sah → 200 dengan waktu cabut', revoked.status === 200 && typeof revoked.body?.revokedAt === 'string', revoked.text.slice(0, 160))
  const after = (await rolesOf(member)).body?.roles
  check('sesudah dicabut: kursi penerbit hilang, peserta tetap', after?.publisher === null && after?.learner === true, json(after))
  const twice = await call('/publisher/members', await revokeReq())
  check('cabut kedua kali → 400 (tidak ada keanggotaan aktif)', twice.status === 400, twice.text.slice(0, 160))

  console.log('\n— E. Agent Owner dibaca dari registry ERC-8004 (chain 97)')
  const go = await rolesOf(graderOwner)
  const goAgents = go.body?.roles?.agentOwner?.agents ?? []
  check(`pemilik agen penilai (${env.AGENT_OWNER_ADDRESS.slice(0, 6)}…) → Agent Owner #2534`, go.status === 200 && goAgents.some((a) => a.agentId === '2534'), json(go.body?.roles))
  check('agen #2534 membawa dompet dan tarif dari registry', goAgents.find((a) => a.agentId === '2534')?.wallet?.startsWith('0x') && goAgents.find((a) => a.agentId === '2534')?.tariff?.amount !== undefined, json(goAgents))
  check('pemilik agen penilai BUKAN pemilik agen pengesah #2542', !goAgents.some((a) => a.agentId === '2542'), json(goAgents.map((a) => a.agentId)))
  const ro = await rolesOf(reviewerOwner)
  const roAgents = ro.body?.roles?.agentOwner?.agents ?? []
  check(`pemilik agen pengesah (${env.REVIEWER_OWNER_ADDRESS.slice(0, 6)}…) → Agent Owner #2542`, ro.status === 200 && roAgents.some((a) => a.agentId === '2542'), json(ro.body?.roles))
  check('akun baru tidak memiliki agen apa pun', (await rolesOf(stranger)).body?.roles?.agentOwner === null)
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

// Baris keanggotaan uji milik alamat sekali-pakai: dihapus, lalu sisanya dihitung ulang dari database.
console.log('\n— F. bersih-bersih baris uji')
try {
  const del = await pg(`/publisher_members?${ours}&origin=eq.test`, { method: 'DELETE' })
  check('baris keanggotaan uji dihapus', del.status === 204 || del.status === 200, del.status)
  const left = await pg(`/publisher_members?${ours}&select=member&limit=0`)
  check('sisa baris keanggotaan alamat uji = 0 (kueri ulang)', left.total === 0, left.total)
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nPERAN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
