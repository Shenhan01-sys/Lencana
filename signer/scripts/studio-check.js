// Lencana-B132 status=TERBUKA 2026-10-03 — harness bengkel agen: suku cadang robot dan validasi rupa, SVG deterministik dan kecil, templat registrasi yang menunjuk balik, klaim agen swalayan yang hanya percaya struk di chain, gas hanya untuk Agent Owner yang berhak, rupa terbaca di dasbor. Buktikan ulang: npm run verify:studio. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:studio` — robot penilai rakitan (B132, D68). Tanpa gas: pendaftaran sungguhan di chain dibuktikan sekali di
 * uji peramban T61, bukan di setiap baterai.
 *
 *   A. `web/src/robot.ts`: semua kombinasi suku cadang tergambar (tanpa "undefined"), deterministik, gambar statis < 4 KB;
 *      `parseAvatar` menolak bidang asing / suku cadang tak dikenal / versi lain; `cleanName` 1–40 karakter;
 *      `withAvatar` tidak menyentuh `registrations` (menunjuk balik), `description`, `type`;
 *   B. `GET /agents/<id>/registration-template`: menunjuk balik ke agen itu, kalimat peran pendaftar sendiri, peran lain → 400;
 *   C. `POST /owner/agents/claim`: bentuk → 400; kunci lain → 401; transaksi yang tidak ada → 400; struk `register()` agen
 *      #2546 yang didaftarkan kunci platform diklaim akun lain → 403; akun Peserta → 403 (B131);
 *   D. `POST /owner/gas`: akun tanpa peran dan tanpa agen → 403 (gas hanya untuk Agent Owner yang berhak);
 *   E. `ownerOverview`: rupa sah dari berkas registrasi terbaca, rupa bercacat → null, gambar hanya SVG data URI.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { ownerOverview } from '../src/owner.js'
import { ROBOT_PARTS, DEFAULT_AVATAR, parseAvatar, cleanName, robotSvg, withAvatar, AVATAR_KEY } from '../../web/src/robot.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:studio')
const env = process.env
for (const k of ['SUPABASE_URL', 'RPC_URL', 'ISSUER_ADDRESS']) {
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

/* ------------------------------------------------------------------ A. modul robot (tanpa server) */
console.log('\n— A. suku cadang robot, rupa, gambar')
let combos = 0
let broken = 0
let biggest = 0
for (const head of ROBOT_PARTS.head) for (const eyes of ROBOT_PARTS.eyes) for (const body of ROBOT_PARTS.body) for (const tool of ROBOT_PARTS.tool) for (const color of ROBOT_PARTS.color) {
  combos++
  const svg = robotSvg({ v: 1, head, eyes, body, tool, color }, { standalone: true })
  if (!svg.startsWith('<svg') || /undefined|NaN/.test(svg)) broken++
  biggest = Math.max(biggest, svg.length)
}
check(`semua ${combos} kombinasi suku cadang tergambar tanpa "undefined"/NaN`, broken === 0 && combos === 4 * 4 * 3 * 3 * 6, `${broken} rusak dari ${combos}`)
check(`gambar statis terbesar < 4 KB (${biggest} karakter) — murah disimpan di chain`, biggest < 4000, biggest)
check('deterministik: rupa sama → SVG sama persis', robotSvg(DEFAULT_AVATAR, { standalone: true }) === robotSvg({ ...DEFAULT_AVATAR }, { standalone: true }))
check('data hidup mengubah gambar (mata redup bila dompet kosong)', robotSvg(DEFAULT_AVATAR, { live: { eyesOn: false, bulb: 'bad' } }) !== robotSvg(DEFAULT_AVATAR, { live: { eyesOn: true, bulb: 'ok' } }))
check('pelat dada lolos-escape (teks tarif tidak bisa menyuntik markup)', !robotSvg(DEFAULT_AVATAR, { live: { eyesOn: true, bulb: 'ok', chest: '<script>' } }).includes('<script>'))
check('parseAvatar: rupa sah diterima', json(parseAvatar({ v: 1, head: 'kubah', eyes: 'visor', body: 'tong', tool: 'kaca', color: 'ungu' })) === json({ v: 1, head: 'kubah', eyes: 'visor', body: 'tong', tool: 'kaca', color: 'ungu' }))
check('parseAvatar: bidang asing → null', parseAvatar({ ...DEFAULT_AVATAR, extra: 1 }) === null)
check('parseAvatar: suku cadang tak dikenal → null', parseAvatar({ ...DEFAULT_AVATAR, head: 'naga' }) === null)
check('parseAvatar: versi lain → null', parseAvatar({ ...DEFAULT_AVATAR, v: 2 }) === null)
check('cleanName: kosong dan > 40 karakter ditolak, karakter kendali dibuang', cleanName('') === null && cleanName('x'.repeat(41)) === null && cleanName(' Pak\u0007Teliti ') === 'PakTeliti')
const tpl = { type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1', name: 'x', description: 'peran', registrations: [{ agentId: 7, agentRegistry: 'eip155:97:0xabc' }], services: [] }
const merged = withAvatar(tpl, 'Pak Teliti', DEFAULT_AVATAR, 'data:image/svg+xml;base64,AA==')
check('withAvatar: registrations/description/type tetap, nama + gambar + rupa ditambahkan', json(merged.registrations) === json(tpl.registrations) && merged.description === 'peran' && merged.type === tpl.type && merged.name === 'Pak Teliti' && json(merged[AVATAR_KEY]) === json(DEFAULT_AVATAR))

/* ------------------------------------------------------------------ E. ownerOverview (tanpa server) */
console.log('\n— E. rupa terbaca di dasbor (fungsi agregasi)')
const fakeAgent = (registration) => ({
  agent: { agentId: '9', registry: 'eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e', registration, pointsBack: true, wallet: null, owner: '0x0000000000000000000000000000000000000001', tariff: null },
  problem: 'has no agentWallet',
})
const emptyRecords = { charges: [], graded: [], reviews: [], hires: [], reviewers: [] }
const ov = (reg) => ownerOverview({ address: '0x0000000000000000000000000000000000000001', owned: [fakeAgent(reg)], records: emptyRecords, minted: [], balance: 0n, gasLow: true, token: { address: null, symbol: 'X', decimals: 6 }, chainId: 97 }).agents[0]
const good = ov({ name: 'Pak Teliti', [AVATAR_KEY]: { v: 1, head: 'segi', eyes: 'lensa', body: 'trapesium', tool: 'stempel', color: 'hijau' }, image: 'data:image/svg+xml;base64,AA==' })
check('rupa sah di berkas registrasi → avatar terbaca', good.avatar?.head === 'segi' && good.avatar?.color === 'hijau', json(good.avatar))
check('gambar SVG data URI ikut', good.image === 'data:image/svg+xml;base64,AA==')
const bad = ov({ name: 'x', [AVATAR_KEY]: { v: 1, head: 'segi', eyes: 'lensa', body: 'trapesium', tool: 'stempel', color: 'hijau', script: 'x' }, image: 'https://evil.example/x.png' })
check('rupa bercacat → null; gambar bukan SVG data URI → null', bad.avatar === null && bad.image === null, json({ a: bad.avatar, i: bad.image }))

/* ------------------------------------------------------------------ B–D. lewat HTTP */
const fresh = () => privateKeyToAccount(generatePrivateKey())
const O = fresh() // memilih Agent Owner, tanpa agen
const L = fresh() // memilih Peserta
const N = fresh() // tanpa peran
const throwaway = [O, L, N].map((a) => a.address)
const PORT = Number(env.STUDIO_PROBE_PORT ?? await freePort(8971))
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
const claim = async (account, agentId, tx, signer = account) => call('/owner/agents/claim', { agentId, registerTx: tx, ...await signed(signer, `lencana-owner-claim agent=${agentId} tx=${String(tx).toLowerCase()} nonce=${nonce()}`, account.address) })

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=representation', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30000) })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* bukan JSON */ }
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body }
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— B. templat berkas registrasi')
  const t = await call('/agents/2547/registration-template?role=grader-self')
  check('templat → 200 dan menunjuk balik ke agen 2547 di registry chain 97', t.status === 200 && (t.body?.registrations ?? []).some((r) => Number(r.agentId) === 2547 && /^eip155:97:0x8004A818/i.test(r.agentRegistry)), t.text.slice(0, 200))
  check('kalimat peran: didaftarkan pemiliknya sendiri, penerbit tetap yang menandatangani kredensial', /registered by its owner/.test(t.body?.description ?? '') && /never signs or revokes credentials/.test(t.body?.description ?? ''), t.body?.description)
  check('peran tak dikenal → 400', (await call('/agents/2547/registration-template?role=penerbit')).status === 400)

  console.log('\n— C. klaim agen yang didaftarkan sendiri')
  const cO = await call('/me/role', { role: 'owner', ...await signed(O, `lencana-role role=owner nonce=${nonce()}`) })
  check('akun O memilih Agent Owner → 201', cO.status === 201, cO.text.slice(0, 120))
  const cL = await call('/me/role', { role: 'learner', ...await signed(L, `lencana-role role=learner nonce=${nonce()}`) })
  check('akun L memilih Peserta → 201', cL.status === 201, cL.text.slice(0, 120))
  check('agentId bukan angka → 400', (await call('/owner/agents/claim', { agentId: '1)|(.*', registerTx: '0x' + '1'.repeat(64), ...await signed(O, `lencana-owner-claim nonce=${nonce()}`) })).status === 400)
  const rowRes = await pg('/platform_agents?agent_id=eq.2546&select=register_tx')
  const tx2546 = rowRes.body?.[0]?.register_tx
  check('struk register #2546 tersedia dari platform_agents', /^0x[0-9a-f]{64}$/i.test(tx2546 ?? ''), json(rowRes.body))
  check('ditandatangani kunci lain atas nama O → 401', (await claim(O, '2546', tx2546, N)).status === 401)
  const missing = await claim(O, '2546', '0x' + 'ab'.repeat(32))
  check('transaksi yang tidak ada → 400', missing.status === 400, missing.text.slice(0, 160))
  const other = await claim(O, '2546', tx2546)
  check('struk register #2546 (didaftarkan kunci platform) diklaim O → 403', other.status === 403, other.text.slice(0, 160))
  const asLearner = await claim(L, '2546', tx2546)
  check('akun Peserta mengklaim → 403 karena perannya', asLearner.status === 403 && /role/.test(asLearner.body?.error ?? ''), asLearner.text.slice(0, 160))

  console.log('\n— D. gas uji')
  const gN = await call('/owner/gas', await signed(N, `lencana-owner-gas nonce=${nonce()}`))
  check('akun tanpa peran dan tanpa agen → 403 (gas hanya untuk Agent Owner yang berhak)', gN.status === 403, gN.text.slice(0, 160))
  const gL = await call('/owner/gas', await signed(L, `lencana-owner-gas nonce=${nonce()}`))
  check('akun Peserta → 403 karena perannya', gL.status === 403, gL.text.slice(0, 160))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log('\n— F. bersih-bersih baris uji')
try {
  const filter = `address=in.(${throwaway.join(',')})&origin=eq.test`
  const del = await pg(`/account_roles?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const left = await pg(`/account_roles?${filter}&limit=0`, { headers: { prefer: 'count=exact' } })
  check('account_roles: baris uji dihapus, sisa 0 (kueri ulang)', (del.status === 204 || del.status === 200) && left.total === 0, `HTTP ${del.status}, sisa ${left.total}`)
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nBENGKEL AGEN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
