#!/usr/bin/env node
/**
 * `npm run verify:limits` — batas pemberian dari dompet deployer (B155), tanpa gas.
 *
 * Yang diadili:
 *  1. `createLimiter` dengan jam tiruan: batas per IP, kuota global, jendela 24 jam bergulir, slot yang dilepas kembali,
 *     `retryAt`, `snapshot` tanpa IP.
 *  2. `clientIp`: entri pertama `X-Forwarded-For` hanya dipercaya di belakang proxy tepercaya (Railway / TRUST_FORWARDED=1);
 *     di tempat lain header karangan klien diabaikan.
 *  3. `limitsFromEnv`: bawaan 3/IP + 200/hari (faucet) dan 2/IP + 30/hari (gas), nilai lingkungan yang sah dipakai, yang
 *     tidak sah diabaikan.
 *  4. Server sungguhan (port sendiri, LANCENA_ORIGIN=test): `POST /faucet` ditolak 429 oleh batas SEBELUM tanda tangan
 *     diperiksa (tanda tangan palsu, jadi 401 berarti batasnya tidak bekerja) — tidak ada koin yang dicetak; `/healthz`
 *     melaporkan alamat + saldo deployer dan pemakaian kuota tanpa IP.
 * Jalur kiriman gas memerlukan akun Agent Owner dan saldo rendah sebelum batasnya tercapai — di sini diadili lewat modul
 * yang sama (`LIMITS.gas` = `createLimiter`) dan angka kuotanya di `/healthz`.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { createLimiter, clientIp, limitsFromEnv, DAY_MS } from '../src/limits.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:limits')
const env = process.env

let ran = 0
let failed = 0
function check (name, ok, detail) {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'}  ${name}${!ok && detail ? `\n          ${String(detail).slice(0, 300)}` : ''}`)
}
const head = (t) => console.log(`\n${t}`)

head('1. pembatas dengan jam tiruan')
{
  let t = 1_000_000
  const lim = createLimiter({ perIp: 2, perDay: 3, now: () => t })
  const a1 = lim.take('A'); t += 1
  const a2 = lim.take('A'); t += 1
  const a3 = lim.take('A')
  check('IP A: dua pemberian pertama lolos', a1.ok && a2.ok)
  check('IP A: pemberian ketiga ditolak "per-IP limit reached"', !a3.ok && a3.reason === 'per-IP limit reached', JSON.stringify(a3))
  check('retryAt = pemberian tertua IP itu + 24 jam', a3.retryAt === new Date(1_000_000 + DAY_MS).toISOString(), a3.retryAt)
  const b1 = lim.take('B'); t += 1
  check('IP B tidak terkena batas IP A', b1.ok)
  const c1 = lim.take('C')
  check('kuota global (3) habis → IP baru pun ditolak "daily quota reached"', !c1.ok && c1.reason === 'daily quota reached', JSON.stringify(c1))
  b1.release()
  check('slot yang dilepas (pemberian gagal) kembali: IP C lolos sesudah B dilepas', lim.take('C').ok)
  check('snapshot hanya angka: givenInWindow 3, tanpa IP', JSON.stringify(lim.snapshot()) === JSON.stringify({ perIp: 2, perDay: 3, givenInWindow: 3, windowHours: 24 }), JSON.stringify(lim.snapshot()))
  t += DAY_MS
  check('sesudah 24 jam jendelanya kosong: IP A lolos lagi', lim.take('A').ok)
  check('snapshot sesudah 24 jam menghitung yang segar saja (1)', lim.snapshot().givenInWindow === 1, JSON.stringify(lim.snapshot()))
  const zero = createLimiter({ perIp: 0, perDay: 10, now: () => t })
  check('batas 0 menolak sejak permintaan pertama', !zero.take('A').ok)
}

head('2. IP klien')
{
  const req = (xff, sock = '10.0.0.9') => ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: sock } })
  check('TRUST_FORWARDED=1: entri pertama X-Forwarded-For dipakai', clientIp(req(' 203.0.113.7 , 10.1.2.3'), { TRUST_FORWARDED: '1' }) === '203.0.113.7')
  check('di Railway (RAILWAY_ENVIRONMENT ada): entri pertama dipakai', clientIp(req('198.51.100.4, 10.0.0.1'), { RAILWAY_ENVIRONMENT: 'production' }) === '198.51.100.4')
  check('tanpa proxy tepercaya: header karangan klien diabaikan, alamat soket dipakai', clientIp(req('203.0.113.7'), {}) === '10.0.0.9')
  check('header kosong di belakang proxy tepercaya → alamat soket', clientIp(req(undefined), { TRUST_FORWARDED: '1' }) === '10.0.0.9')
}

head('3. batas dari lingkungan')
{
  const keep = { ...process.env }
  for (const k of ['FAUCET_PER_IP_DAY', 'FAUCET_GLOBAL_DAY', 'GAS_PER_IP_DAY', 'GAS_GLOBAL_DAY']) delete process.env[k]
  const d = limitsFromEnv()
  check('bawaan faucet 3/IP + 200/hari, gas 2/IP + 30/hari', d.faucet.perIp === 3 && d.faucet.perDay === 200 && d.gas.perIp === 2 && d.gas.perDay === 30, JSON.stringify({ f: d.faucet.snapshot(), g: d.gas.snapshot() }))
  Object.assign(process.env, { FAUCET_PER_IP_DAY: '5', FAUCET_GLOBAL_DAY: '0', GAS_PER_IP_DAY: '-1', GAS_GLOBAL_DAY: 'banyak' })
  const e = limitsFromEnv()
  check('nilai lingkungan yang sah dipakai (5 dan 0)', e.faucet.perIp === 5 && e.faucet.perDay === 0)
  check('nilai yang tidak sah (-1, "banyak") diabaikan → bawaan', e.gas.perIp === 2 && e.gas.perDay === 30)
  for (const k of Object.keys(process.env)) if (!(k in keep)) delete process.env[k]
  Object.assign(process.env, keep)
}

head('4. server sungguhan: /faucet ditolak batas sebelum tanda tangan, /healthz melaporkan deployer + kuota')
const PORT = Number(env.LIMITS_PROBE_PORT ?? await freePort(8889))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', TRUST_FORWARDED: '1', FAUCET_PER_IP_DAY: '0', GAS_GLOBAL_DAY: '7' },
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/catalog/published') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)
  const learner = privateKeyToAccount(generatePrivateKey())
  const message = `lencana-faucet nonce=${randomBytes(10).toString('hex')}`
  const r = await call('POST', '/faucet', { learner: learner.address, message, signature: '0x' + '11'.repeat(65) }, { 'x-forwarded-for': '203.0.113.7' })
  check('POST /faucet dengan FAUCET_PER_IP_DAY=0 → 429 "per-IP limit reached" (bukan 401: batas dicek sebelum tanda tangan, tidak ada mint)',
    r.status === 429 && /per-IP limit reached/.test(r.body?.error ?? '') && typeof r.body?.retryAt === 'string', `HTTP ${r.status} ${r.text.slice(0, 160)}`)
  const h = await call('GET', '/healthz')
  const want = env.DEPLOYER_PRIVATE_KEY ? privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY).address : null
  check('/healthz: alamat deployer = alamat kunci deployer di lingkungan', h.status === 200 && want && h.body?.deployer?.address === want, `HTTP ${h.status} ${JSON.stringify(h.body?.deployer ?? null).slice(0, 120)}`)
  check('/healthz: saldo deployer terbaca dari chain (wei, angka)', /^\d+$/.test(String(h.body?.deployer?.balanceWei ?? '')), JSON.stringify(h.body?.deployer ?? null).slice(0, 120))
  const lf = h.body?.limits?.faucet
  const lg = h.body?.limits?.gas
  check('/healthz: kuota faucet sesuai lingkungan server (perIp 0, perDay 200, 0 diberikan)', lf?.perIp === 0 && lf?.perDay === 200 && lf?.givenInWindow === 0, JSON.stringify(lf))
  check('/healthz: kuota gas sesuai lingkungan server (perIp 2, perDay 7)', lg?.perIp === 2 && lg?.perDay === 7, JSON.stringify(lg))
  check('/healthz tidak memuat IP pengunjung', !h.text.includes('203.0.113.7'), 'IP uji muncul di /healthz')
} catch (e) {
  check('lapis HTTP berjalan tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
console.log(`\nBATAS PEMBERIAN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
