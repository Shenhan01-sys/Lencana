// Lencana-B131 status=SELESAI 2026-10-03 — harness satu akun satu peran: POST /me/role memilih sekali (bertanda tangan, tidak bisa diganti), rute peserta / penerbit / Agent Owner menolak akun berperan lain, peran lama diturunkan dari rekaman dan fakta, akun dev memegang semua kursi menurut fakta. Buktikan ulang: npm run verify:account. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:account` — satu akun nyata = satu peran (B131, D66; pilihan builder 3 Okt "pilih sekali saat onboarding").
 *
 * Yang dibuktikan, terhadap server sendiri (origin=test; semua baris alamat sekali-pakai dihapus di akhir dan sisanya
 * dihitung ulang dari database):
 *   A. POST /me/role menolak pesan yang salah bentuk, peran tak dikenal, pesan untuk peran lain, penerbit lain, dan kunci lain;
 *   B. Peserta: pilih → tidak bisa diganti; bisa mendaftar kelas; ditolak mengajukan anggota, dasbor penerbit, dasbor Agent
 *      Owner, dan hibah keanggotaan;
 *   C. Penerbit: memilih = mengajukan (dengan catatan); ditolak belajar dan koin uji; kursinya tetap lahir hanya dari hibah
 *      kunci penerbit;
 *   D. Agent Owner: ditolak belajar, mengajukan, dan hibah; memilih tidak memberi agen (fakta ownerOf tetap syarat);
 *   E. akun tanpa pilihan: belajar = Peserta (rekaman), kunci penerbit = Penerbit, pemilik agen = Agent Owner (chain),
 *      pengajuan lewat rute lama = memilih Penerbit;
 *   F. akun dev: tidak memilih, memegang kursi Peserta + Penerbit sekaligus; dua akun dummy builder bertanda dev.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:account')
const env = process.env
for (const k of ['SUPABASE_URL', 'ISSUER_PRIVATE_KEY', 'ISSUER_ADDRESS', 'RPC_URL', 'AGENT_OWNER_PRIVATE_KEY']) {
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
const COURSE = 'web3-dasar-2026'
// Akun dummy builder (D66) — alamat dibaca dari publisher_members dan platform_agents 2 Okt.
const BUILDER_DUMMIES = ['0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF', '0x632Da38506f32884A111b5BB7Ba85C1ad83B38AF']

const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const graderOwner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const fresh = () => privateKeyToAccount(generatePrivateKey())
const X = fresh() // masukan salah bentuk
const L = fresh() // memilih Peserta
const P = fresh() // memilih Penerbit
const O = fresh() // memilih Agent Owner
const E = fresh() // tidak memilih, langsung belajar
const Q = fresh() // tidak memilih, mengajukan lewat rute lama
const D = fresh() // akun dev
const throwaway = [X, L, P, O, E, Q, D].map((a) => a.address)

const PORT = Number(env.ACCOUNT_PROBE_PORT ?? await freePort(8967))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(90000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const signed = async (account, message, learner = account.address) => ({ learner, message, signature: await account.signMessage({ message }) })
const roleMsg = (role, issuer = publisher.address) => (role === 'publisher'
  ? `lencana-role role=publisher issuer=${issuer.toLowerCase()} nonce=${nonce()}`
  : `lencana-role role=${role} nonce=${nonce()}`)
const choose = async (account, role, { msg = roleMsg(role), signer = account, note = null } = {}) =>
  call('/me/role', { ...await signed(signer, msg, account.address), role, note })
const rolesOf = async (account) => call('/me/roles', await signed(account, `lencana-roles nonce=${nonce()}`))
const enroll = async (account) => call('/enroll', { course: COURSE, ...await signed(account, `lencana-enroll course=${COURSE} nonce=${nonce()}`) })
const faucet = async (account) => call('/faucet', await signed(account, `lencana-faucet nonce=${nonce()}`))
const apply = async (account, note = null) => call('/me/member-request', { note, ...await signed(account, `lencana-member-request issuer=${publisher.address.toLowerCase()} nonce=${nonce()}`) })
const pubOverview = async (account) => call('/publisher/overview', await signed(account, `lencana-publisher nonce=${nonce()}`))
const ownerOverview = async (account) => call('/owner/overview', await signed(account, `lencana-owner nonce=${nonce()}`))
const grant = async (who, { hire = false, appoint = false } = {}) => {
  const message = `lencana-member grant member=${who.toLowerCase()} hire=${hire ? 1 : 0} appoint=${appoint ? 1 : 0} nonce=${nonce()}`
  return call('/publisher/members', { issuer: publisher.address, member: who, canHire: hire, canAppoint: appoint, message, signature: await publisher.signMessage({ message }) })
}

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=minimal', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* bukan JSON */ }
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body }
}
const inList = (xs) => `(${xs.join(',')})`

try {
  check('ISSUER_PRIVATE_KEY milik ISSUER_ADDRESS', same(publisher.address, env.ISSUER_ADDRESS), publisher.address)
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— A. POST /me/role: bentuk pesan dan pemilik alamat')
  const noMsg = await call('/me/role', { learner: X.address, role: 'learner' })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const unknown = await choose(X, 'admin', { msg: `lencana-role role=admin nonce=${nonce()}` })
  check('peran tak dikenal → 400', unknown.status === 400, unknown.text.slice(0, 160))
  const mismatch = await call('/me/role', { ...await signed(X, roleMsg('learner')), role: 'owner' })
  check('pesan untuk Peserta dikirim sebagai Agent Owner → 400', mismatch.status === 400, mismatch.text.slice(0, 160))
  const otherIssuer = await choose(X, 'publisher', { msg: roleMsg('publisher', X.address) })
  check('memilih Penerbit dengan penerbit lain di pesan → 400', otherIssuer.status === 400, otherIssuer.text.slice(0, 160))
  const forged = await choose(X, 'learner', { signer: L })
  check('ditandatangani kunci lain atas nama akun → 401', forged.status === 401, forged.text.slice(0, 160))
  const xRoles = (await rolesOf(X)).body?.account
  check('sesudah semua penolakan: akun X tetap belum berperan dan boleh memilih', xRoles?.role === null && xRoles?.canChoose === true, json(xRoles))

  console.log('\n— B. memilih Peserta: sekali, lalu hanya aksi peserta')
  const cL = await choose(L, 'learner')
  check('pilih Peserta → 201', cL.status === 201 && cL.body?.role === 'learner', cL.text.slice(0, 200))
  const rL = (await rolesOf(L)).body?.account
  check('/me/roles: peran learner lewat pilihan, bukan dev, tidak bisa memilih lagi', rL?.role === 'learner' && rL.via === 'chosen' && rL.dev === false && rL.canChoose === false, json(rL))
  const again = await choose(L, 'owner')
  check('memilih lagi (Agent Owner) → 409', again.status === 409, again.text.slice(0, 160))
  const eL = await enroll(L)
  check('Peserta mendaftar kelas → 200', eL.status === 200 && eL.body?.enrolled === true, eL.text.slice(0, 160))
  const apL = await apply(L)
  check('Peserta mengajukan keanggotaan penerbit → 403', apL.status === 403, apL.text.slice(0, 160))
  const pvL = await pubOverview(L)
  check('Peserta membuka dasbor penerbit → 403 karena perannya', pvL.status === 403 && /role/.test(pvL.body?.error ?? ''), pvL.text.slice(0, 160))
  const ovL = await ownerOverview(L)
  check('Peserta membuka dasbor Agent Owner → 403 karena perannya', ovL.status === 403 && /role/.test(ovL.body?.error ?? ''), ovL.text.slice(0, 160))
  const gL = await grant(L.address, { hire: true })
  check('kunci penerbit memberi keanggotaan ke akun Peserta → 409', gL.status === 409, gL.text.slice(0, 160))

  console.log('\n— C. memilih Penerbit = mengajukan; kursinya dari hibah kunci penerbit')
  const cP = await choose(P, 'publisher', { note: 'staf kurikulum (harness)' })
  check('pilih Penerbit → 201 dengan pengajuan pending + catatan', cP.status === 201 && cP.body?.role === 'publisher' && cP.body?.request?.status === 'pending' && cP.body.request.note === 'staf kurikulum (harness)', cP.text.slice(0, 220))
  const rP = (await rolesOf(P)).body
  check('/me/roles: peran publisher, kursi fakta belum ada, pengajuan pending', rP?.account?.role === 'publisher' && rP.roles?.publisher === null && rP.publisherRequest?.status === 'pending', json({ a: rP?.account, p: rP?.roles?.publisher, q: rP?.publisherRequest }))
  check('Penerbit mendaftar kelas → 403', (await enroll(P)).status === 403)
  check('Penerbit meminta koin uji → 403', (await faucet(P)).status === 403)
  check('Penerbit membuka dasbor Agent Owner → 403', (await ownerOverview(P)).status === 403)
  const early = await pubOverview(P)
  check('sebelum disetujui: dasbor penerbit → 403 (memilih tidak memberi kursi)', early.status === 403, early.text.slice(0, 160))
  const gP = await grant(P.address, { hire: true, appoint: true })
  check('hibah kunci penerbit → 200 dan menutup pengajuan pilihan itu', gP.status === 200 && gP.body?.approvedRequest === cP.body?.request?.id, gP.text.slice(0, 200))
  const pvP = await pubOverview(P)
  check('sesudah disetujui: dasbor penerbit → 200', pvP.status === 200 && pvP.body?.seat?.via === 'member', pvP.text.slice(0, 160))

  console.log('\n— D. memilih Agent Owner: memilih tidak memberi agen')
  const cO = await choose(O, 'owner')
  check('pilih Agent Owner → 201', cO.status === 201 && cO.body?.role === 'owner', cO.text.slice(0, 200))
  check('Agent Owner mendaftar kelas → 403', (await enroll(O)).status === 403)
  check('Agent Owner mengajukan keanggotaan → 403', (await apply(O)).status === 403)
  check('kunci penerbit memberi keanggotaan ke akun Agent Owner → 409', (await grant(O.address)).status === 409)
  const ovO = await ownerOverview(O)
  check('tanpa agen: dasbor Agent Owner → 403 karena fakta ownerOf, bukan karena peran', ovO.status === 403 && /owns no/.test(ovO.body?.error ?? ''), ovO.text.slice(0, 160))

  console.log('\n— E. akun tanpa pilihan: peran diturunkan dari rekaman dan fakta')
  const eE = await enroll(E)
  check('akun baru tanpa pilihan mendaftar kelas → 200 (belajar = Peserta)', eE.status === 200, eE.text.slice(0, 160))
  const rE = (await rolesOf(E)).body?.account
  check('/me/roles: learner lewat rekaman', rE?.role === 'learner' && rE.via === 'records', json(rE))
  check('akun yang sudah belajar memilih Penerbit → 409', (await choose(E, 'publisher')).status === 409)
  check('akun yang sudah belajar mengajukan keanggotaan → 403', (await apply(E)).status === 403)
  const rI = (await rolesOf(publisher)).body?.account
  check('kunci penerbit: publisher lewat issuer', rI?.role === 'publisher' && rI.via === 'issuer', json(rI))
  check('kunci penerbit mendaftar kelas → 403', (await enroll(publisher)).status === 403)
  const rG = (await rolesOf(graderOwner)).body?.account
  check('pemilik agen #2534 tanpa pilihan: owner lewat agents (ownerOf di chain)', rG?.role === 'owner' && rG.via === 'agents', json(rG))
  const eG = await enroll(graderOwner)
  check('pemilik agen mendaftar kelas → 403 (bacaan chain di penjaga peserta)', eG.status === 403, eG.text.slice(0, 160))
  check('pemilik agen memilih peran → 409', (await choose(graderOwner, 'learner')).status === 409)
  const aQ = await apply(Q, 'lewat rute lama (harness)')
  check('akun tanpa peran mengajukan lewat POST /me/member-request → 201 + peran publisher tercatat', aQ.status === 201 && aQ.body?.role === 'publisher' && aQ.body?.request?.status === 'pending', aQ.text.slice(0, 200))
  check('sesudah itu akun tersebut mendaftar kelas → 403', (await enroll(Q)).status === 403)

  console.log('\n— F. akun dev: semua kursi menurut fakta, tidak memilih')
  const mk = await pg('/account_roles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: json([{ address: D.address, dev: true, dev_note: 'account-check', origin: 'test' }]) })
  check('akun D ditandai dev (langsung di database — tidak ada rute HTTP untuk itu)', mk.status === 201, `HTTP ${mk.status}`)
  const rD = (await rolesOf(D)).body?.account
  check('/me/roles: dev = true, peran null', rD?.dev === true && rD.role === null && rD.via === 'dev', json(rD))
  check('akun dev memilih peran → 409', (await choose(D, 'learner')).status === 409)
  check('akun dev mendaftar kelas → 200', (await enroll(D)).status === 200)
  check('akun dev diberi keanggotaan → 200', (await grant(D.address, { hire: true })).status === 200)
  const pvD = await pubOverview(D)
  check('akun dev yang sudah belajar membuka dasbor penerbit → 200 (dua kursi sekaligus)', pvD.status === 200, pvD.text.slice(0, 160))
  const dummies = await pg(`/account_roles?address=in.${inList(BUILDER_DUMMIES)}&dev=is.true&select=address`, { headers: { prefer: 'count=exact' } })
  check('dua akun dummy builder bertanda dev di database', dummies.total === 2, json(dummies.body))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

// Semua baris milik alamat sekali-pakai dihapus; sisanya dihitung ulang dari database, bukan diyakini.
console.log('\n— G. bersih-bersih baris uji')
try {
  const who = inList(throwaway)
  for (const [table, filter] of [
    ['publisher_members', `member=in.${who}&origin=eq.test`],
    ['member_requests', `applicant=in.${who}&origin=eq.test`],
    ['account_roles', `address=in.${who}&origin=eq.test`],
    ['enrollments', `learner=in.${who}&origin=eq.test`],
  ]) {
    const del = await pg(`/${table}?${filter}`, { method: 'DELETE' })
    const left = await pg(`/${table}?${filter}&limit=0`)
    check(`${table}: baris uji dihapus, sisa 0 (kueri ulang)`, (del.status === 204 || del.status === 200) && left.total === 0, `HTTP ${del.status}, sisa ${left.total}`)
  }
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nSATU PERAN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
