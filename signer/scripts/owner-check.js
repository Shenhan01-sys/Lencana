// Lencana-B130 status=TERBUKA 2026-10-02 — harness kursi Agent Owner: POST /owner/overview hanya untuk alamat yang ownerOf-nya memegang agen yang dikenal platform (dibaca dari registry ERC-8004), angkanya dari registry + baris sewa/penunjukan/aktivitas/tagihan; POST /owner/gas hanya untuk pemilik agen yang dicetak platform; dompet agen kosong sesudah pemindahan dilaporkan sebagai belum layak sewa. Buktikan ulang: npm run verify:owner. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:owner` — kursi Agent Owner (B130, RF7 langkah C3, D65), tanpa gas, terhadap server sendiri
 * (origin=test). Agen demo dipakai apa adanya: #2534 milik `AGENT_OWNER_*` (dompet operasional = kunci lain) dan
 * #2542 milik `REVIEWER_OWNER_*`. Jalur "dompet dikosongkan sesudah pemindahan" diuji pada fungsi agregasinya
 * (`ownerOverview` + `hireProblem`) dengan identitas buatan, karena di chain ia butuh pencetakan + pemindahan
 * sungguhan — itu dibuktikan sekali oleh uji peramban T55, bukan di setiap baterai.
 *
 *   A  /owner/overview: bentuk pesan, kunci lain, akun tanpa agen, replay
 *   B  pemilik #2534: hanya agennya sendiri; dompet, tarif, tangga 7 label, sewa, aktivitas, tagihan = hitungan database
 *   C  pemilik #2542: hanya #2542, penunjukannya terbaca
 *   D  /owner/gas: bukan untuk akun tanpa agen, bukan untuk agen yang tidak dicetak platform
 *   E  agregasi: dompet kosong → `unset` + alasan "has no agentWallet"; dompet = pemilik → `owner`; sewa dengan dompet lama → `stale`
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { ownerOverview } from '../src/owner.js'
import { hireProblem } from '../src/agents.js'
import { REGISTRATION_TYPE } from '../src/erc8004.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:owner')
const env = process.env
for (const k of ['SUPABASE_URL', 'RPC_URL', 'DEMO_TOKEN_ADDRESS', 'ISSUER_ADDRESS', 'AGENT_OWNER_PRIVATE_KEY', 'AGENT_GRADER_ADDRESS', 'REVIEWER_OWNER_PRIVATE_KEY', 'AGENT_REVIEWER_ADDRESS']) {
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

const graderOwner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const reviewerOwner = privateKeyToAccount(env.REVIEWER_OWNER_PRIVATE_KEY)
const stranger = privateKeyToAccount(generatePrivateKey())

const PORT = Number(env.OWNER_PROBE_PORT ?? await freePort(8965))
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
const overview = async (account, signer = account) => call('/owner/overview', await signed(signer, `lencana-owner nonce=${nonce()}`, account.address))
const gas = async (account) => call('/owner/gas', await signed(account, `lencana-owner-gas nonce=${nonce()}`))

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const count = async (path) => {
  const r = await fetch(`${API}${path}&limit=0`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}`, prefer: 'count=exact' }, signal: AbortSignal.timeout(30000) })
  return Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN')
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— A. POST /owner/overview: hanya pemilik agen, bertanda tangan')
  const noMsg = await call('/owner/overview', { learner: graderOwner.address })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const other = await call('/owner/overview', await signed(graderOwner, `lencana-roles nonce=${nonce()}`))
  check('tanda tangan untuk keperluan lain (roles) → 400', other.status === 400, other.text.slice(0, 160))
  const forged = await overview(graderOwner, stranger)
  check('kunci lain atas nama pemilik → 401', forged.status === 401, forged.text.slice(0, 160))
  const none = await overview(stranger)
  check('akun tanpa agen → 403', none.status === 403, none.text.slice(0, 160))
  const req = await signed(graderOwner, `lencana-owner nonce=${nonce()}`)
  const g = await call('/owner/overview', req)
  const replay = await call('/owner/overview', req)
  check('replay pesan + tanda tangan yang sama → 401', replay.status === 401, replay.text.slice(0, 160))

  console.log('\n— B. pemilik #2534 (Agent Owner agen penilai demo)')
  check('pemilik → 200', g.status === 200, g.text.slice(0, 160))
  const ids = (g.body?.agents ?? []).map((a) => a.agentId)
  check('hanya agen miliknya: #2534, bukan #2542', ids.includes('2534') && !ids.includes('2542'), json(ids))
  const a = (g.body?.agents ?? []).find((x) => x.agentId === '2534') ?? {}
  check('dompet agen dibaca dari registry = kunci operasional agen', same(a.wallet, env.AGENT_GRADER_ADDRESS), a.wallet)
  check('dompet ≠ pemilik → walletState "other"', a.walletState === 'other', a.walletState)
  check('layak disewa, tanpa alasan penolakan', a.hireable === true && a.problem === null, json({ h: a.hireable, p: a.problem }))
  check('tarif dasar 2000 dalam token platform', a.tariff?.amount === '2000' && a.tariff?.inPlatformToken === true, json(a.tariff))
  const rc = a.rateCard ?? []
  check('tangga tujuh label, naik, label pertama = tarif dasar', rc.length === 7 && rc[0]?.amount === '2000' && rc.every((x, i) => i === 0 || BigInt(x.amount) >= BigInt(rc[i - 1].amount)), json(rc))
  check('berkas registrasi menunjuk balik + bernama', a.pointsBack === true && typeof a.name === 'string' && a.name.length > 0, json({ n: a.name, p: a.pointsBack }))
  check('sewa tercatat: web3-dasar-2026', (a.hires ?? []).some((h) => h.courseId === 'web3-dasar-2026'), json(a.hires))
  const dueDb = await count('/agent_charges?agent_id=eq.2534&status=eq.due&select=id')
  const paidDb = await count('/agent_charges?agent_id=eq.2534&status=eq.paid&select=id')
  check(`tagihan = hitungan database (jatuh tempo ${dueDb}, lunas ${paidDb})`, a.charges?.due?.count === dueDb && a.charges?.paid?.count === paidDb, json({ due: a.charges?.due, paid: a.charges?.paid }))
  const gradedDb = await count('/attempts?graded_by_agent=eq.2534&select=id')
  check(`aktivitas penilaian = hitungan database (${gradedDb})`, a.activity?.graded === gradedDb, a.activity?.graded)
  check('sebaran label memuat ketujuh anak tangga', Object.keys(a.activity?.labels ?? {}).length === 7, json(a.activity?.labels))
  check('#2534 bukan cetakan platform (minted null)', a.minted === null, json(a.minted))
  check('saldo gas pemilik terbaca (wei)', /^\d+$/.test(String(g.body?.gas?.balance ?? '')), json(g.body?.gas))
  check('tidak ada teks esai, pesan, atau tanda tangan di jawaban', !/"body"|"answer"|"signature"|"message"/.test(g.text), g.text.slice(0, 120))

  console.log('\n— C. pemilik #2542 (Agent Owner agen pengesah demo)')
  const r = await overview(reviewerOwner)
  const rIds = (r.body?.agents ?? []).map((x) => x.agentId)
  check('pemilik #2542 → hanya #2542', r.status === 200 && rIds.length === 1 && rIds[0] === '2542', json(rIds))
  const ra = (r.body?.agents ?? [])[0] ?? {}
  check('penunjukan sebagai pengesah terbaca: web3-dasar-2026', (ra.appointments ?? []).some((x) => x.courseId === 'web3-dasar-2026'), json(ra.appointments))
  check('dompet #2542 = kunci operasional pengesah', same(ra.wallet, env.AGENT_REVIEWER_ADDRESS), ra.wallet)

  console.log('\n— D. POST /owner/gas: hanya pemilik agen yang dicetak platform')
  const gNoMsg = await call('/owner/gas', { learner: stranger.address })
  check('tanpa pesan → 400', gNoMsg.status === 400, gNoMsg.text.slice(0, 160))
  const gNone = await gas(stranger)
  check('akun tanpa agen → 403', gNone.status === 403, gNone.text.slice(0, 160))
  const gDemo = await gas(graderOwner)
  check('pemilik agen yang TIDAK dicetak platform (#2534) → 403', gDemo.status === 403, gDemo.text.slice(0, 160))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log('\n— E. agregasi dasbor: dompet kosong sesudah pemindahan, dompet = pemilik, sewa dengan dompet lama')
try {
  const cfg = { token: env.DEMO_TOKEN_ADDRESS, publisher: env.ISSUER_ADDRESS }
  const owner = privateKeyToAccount(generatePrivateKey()).address
  const base = {
    agentId: '999999', registry: 'eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e', owner, registrationType: REGISTRATION_TYPE, pointsBack: true,
    registration: { name: 'uji', description: 'uji' }, tariff: { token: env.DEMO_TOKEN_ADDRESS, amount: 2000n },
  }
  const cleared = { ...base, wallet: null }
  const self = { ...base, wallet: owner }
  check('dompet kosong → hireProblem "has no agentWallet"', /has no agentWallet/.test(hireProblem(cfg, cleared) ?? ''), hireProblem(cfg, cleared))
  check('dompet = pemilik → layak disewa', hireProblem(cfg, self) === null, hireProblem(cfg, self))
  const empty = { hires: [{ agent_id: '999999', course_id: 'x', agent_wallet: '0x000000000000000000000000000000000000dEaD', hired_by: owner, hired_at: '2026-10-02T00:00:00Z' }], reviewers: [], charges: [], graded: [], reviews: [] }
  const o1 = ownerOverview({ address: owner, owned: [{ agent: cleared, problem: hireProblem(cfg, cleared) }], records: empty, minted: [], balance: 0n, gasLow: true, token: { address: env.DEMO_TOKEN_ADDRESS }, chainId: 97 })
  check('agregasi: walletState "unset", tidak layak, alasannya ikut', o1.agents[0].walletState === 'unset' && o1.agents[0].hireable === false && /agentWallet/.test(o1.agents[0].problem ?? ''), json(o1.agents[0]))
  check('agregasi: sewa dengan dompet lama ditandai stale', o1.agents[0].hires[0].stale === true, json(o1.agents[0].hires))
  check('agregasi: gas menipis dilaporkan', o1.gas.low === true, json(o1.gas))
  const o2 = ownerOverview({ address: owner, owned: [{ agent: self, problem: null }], records: { ...empty, hires: [] }, minted: [], balance: 10n ** 16n, gasLow: false, token: { address: env.DEMO_TOKEN_ADDRESS }, chainId: 97 })
  check('agregasi: dompet = pemilik → walletState "owner", layak', o2.agents[0].walletState === 'owner' && o2.agents[0].hireable === true, json(o2.agents[0]))
} catch (e) {
  check('agregasi selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
}

console.log(`\nAGENT OWNER ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
