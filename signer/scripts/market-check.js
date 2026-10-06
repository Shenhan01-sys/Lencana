// Lencana-B138 status=SELESAI 2026-10-03 — harness bursa agen: aturan konflik halaman = aturan server (B120/B129), entri bursa tanpa data peserta, rute GET /agents/market + cache + pembatalan sesudah sewa. Buktikan ulang: npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:market` — bursa agen di dasbor Penerbit (B138, D70). Tanpa gas, tanpa kunci LLM.
 *
 *   A. `web/src/market.ts` (murni): alasan konflik sewa/tunjuk untuk setiap aturan B120/B129, sewa ulang bila dompet berubah,
 *      saring/urut/cari etalase;
 *   B. `signer/src/market.js` `marketEntry` (murni): bidang yang dijanjikan saja, otak hanya bila berlaku (pemilik sekarang),
 *      keputusan pengesah dikelompokkan per agen, teks registrasi dibersihkan;
 *   C. HTTP (server sendiri, origin=test): `GET /agents/market` → semua agen yang dikenal platform, bentuk + nol data peserta;
 *      layak-sewa = `GET /agents/<id>/rates`; tempat kerja #2534/#2542 = rekaman; otak tercatat ikut; cache 60 detik; sewa
 *      (penerbit, idempoten) membatalkan cache; aturan halaman sepakat dengan penolakan server untuk sewa #2542 sebagai penilai
 *      kursus yang ia sahkan.
 * Kunci dari app/.env (tidak ada yang dicetak): penerbit ISSUER (menyewa). Tidak ada baris baru yang tertinggal: sewa #2534
 * untuk web3-dasar-2026 sudah ada (verify:agents) dan diulang secara idempoten.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { marketEntry } from '../src/market.js'
import { hireBlock, appointBlock, teamOf, marketView } from '../../web/src/market.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:market')
const env = process.env

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail !== '' ? ` -> ${String(detail).slice(0, 260)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')

/* ================================================================== A. aturan konflik halaman */
console.log('\n— A. aturan konflik sewa/tunjuk (web/src/market.ts)')
const A = '0x00000000000000000000000000000000000000a1'
const B = '0x00000000000000000000000000000000000000b2'
const ME = '0x00000000000000000000000000000000000000c3'
const agent = (o = {}) => ({
  agentId: '10', registry: '0x8004', name: 'Uji', description: null, avatar: null, image: null, registrationRole: null,
  owner: A, wallet: A, tariff: { token: '0xt', amount: '2000', inPlatformToken: true }, rateCard: [], hireable: true, problem: null,
  brain: null, work: { grading: [], reviewing: [] }, record: { graded: 0, reviews: 0, verdicts: { approved: 0, adjusted: 0, rejected: 0 }, labels: {} }, ...o,
})
const empty = { graders: [], reviewers: [] }
check('sewa: tanpa hak hire=1 → no-permission; agen tak layak → not-hireable', hireBlock(agent(), 'k', empty, ME, false) === 'no-permission' && hireBlock(agent({ hireable: false }), 'k', empty, ME, true) === 'not-hireable')
check('sewa: agen milik penyewa ATAU dioperasikan penyewa → own-agent (B129); kunci penerbit (member null) tidak terkena aturan itu',
  hireBlock(agent({ owner: ME }), 'k', empty, ME, true) === 'own-agent' && hireBlock(agent({ wallet: ME.toUpperCase().replace('0X', '0x') }), 'k', empty, ME, true) === 'own-agent' && hireBlock(agent({ owner: ME }), 'k', empty, null, true) === null)
check('sewa: agen pengesah kursus itu → reviewer-here; pemilik sama dengan agen pengesah → same-owner-reviewer (B120)',
  hireBlock(agent(), 'k', { graders: [], reviewers: [{ agentId: '10', owner: B }] }, ME, true) === 'reviewer-here'
  && hireBlock(agent(), 'k', { graders: [], reviewers: [{ agentId: '11', owner: A }] }, ME, true) === 'same-owner-reviewer'
  && hireBlock(agent(), 'k', { graders: [], reviewers: [{ agentId: null, owner: null }] }, ME, true) === null)
check('sewa: sudah menilai di kursus itu → already; dompet berubah sejak disewa → boleh disewa ulang',
  hireBlock(agent({ work: { grading: [{ courseId: 'k', stale: false, at: '' }], reviewing: [] } }), 'k', empty, ME, true) === 'already'
  && hireBlock(agent({ work: { grading: [{ courseId: 'k', stale: true, at: '' }], reviewing: [] } }), 'k', empty, ME, true) === null)
check('tunjuk: agen penilai kursus itu → grader-here; pemilik sama dengan agen penilai → same-owner-grader (B120); sudah mengesahkan → already',
  appointBlock(agent(), 'k', { graders: [{ agentId: '10', owner: B }], reviewers: [] }, ME, true) === 'grader-here'
  && appointBlock(agent(), 'k', { graders: [{ agentId: '12', owner: A }], reviewers: [] }, ME, true) === 'same-owner-grader'
  && appointBlock(agent({ work: { grading: [], reviewing: [{ courseId: 'k', stale: false, at: '' }] } }), 'k', empty, ME, true) === 'already'
  && appointBlock(agent(), 'k', empty, ME, false) === 'no-permission')
const team = teamOf({ hires: [{ courseId: 'k', agentId: '1', owner: A }, { courseId: 'x', agentId: '2', owner: B }], reviewers: [{ courseId: 'k', agentId: null, owner: null }] }, 'k')
check('teamOf: hanya kursus itu', json(team) === json({ graders: [{ agentId: '1', owner: A }], reviewers: [{ agentId: null, owner: null }] }), json(team))
const shelf = [
  agent({ agentId: '5', name: 'Murah', tariff: { token: 't', amount: '1000', inPlatformToken: true }, record: { graded: 1, reviews: 0, verdicts: { approved: 0, adjusted: 0, rejected: 0 }, labels: {} } }),
  agent({ agentId: '7', name: 'Senior', hireable: false, record: { graded: 9, reviews: 3, verdicts: { approved: 0, adjusted: 0, rejected: 0 }, labels: {} }, brain: { provider: 'groq', model: 'm', modelName: 'groq/m', at: '', calibration: {} } }),
  agent({ agentId: '9', name: 'Baru', tariff: null }),
]
check('etalase: urut pengalaman / harga (tanpa tarif paling akhir) / terbaru; saring layak + otak; cari nama atau #nomor',
  marketView(shelf).map((a) => a.agentId).join() === '7,5,9' && marketView(shelf, { sort: 'price' }).map((a) => a.agentId).join() === '5,7,9'
  && marketView(shelf, { sort: 'newest' }).map((a) => a.agentId).join() === '9,7,5' && marketView(shelf, { hireableOnly: true }).length === 2
  && marketView(shelf, { brainOnly: true }).map((a) => a.agentId).join() === '7' && marketView(shelf, { q: 'sen' }).length === 1 && marketView(shelf, { q: '#9' }).length === 1)

/* ================================================================== B. entri bursa (murni) */
console.log('\n— B. entri bursa (signer/src/market.js)')
const cfg = { publisher: '0x00000000000000000000000000000000000000ff', token: '0x00000000000000000000000000000000000000e0', chainId: 97 }
const fakeA = {
  agentId: '10', registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e', owner: A, wallet: A, pointsBack: true,
  registrationType: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  registration: { name: 'Pak\u0007 Uji', description: 'x'.repeat(900), image: 'https://evil.example/x.png' },
  tariff: { token: cfg.token, amount: 2000n },
}
const rec = {
  hires: [{ course_id: 'k', agent_id: '10', agent_wallet: B, hired_at: 't1' }],
  reviewers: [{ course_id: 'r', agent_id: '10', reviewer: A, added_at: 't2' }],
  graded: [{ graded_by_agent: '10', difficulty_label: 'sedang' }, { graded_by_agent: '11', difficulty_label: 'berat' }],
  reviews: [{ reviewer_agent_id: '10', decision: 'approved', difficulty_label: 'ringan' }],
  verdicts: [{ decision: 'approved', attempts: { graded_by_agent: '10' } }, { decision: 'adjusted', attempts: { graded_by_agent: '10' } }, { decision: 'rejected', attempts: { graded_by_agent: '11' } }],
  minted: [{ agent_id: '10', role: 'grader-self' }],
  brains: [{ agent_id: '10', owner: B, provider: 'groq', model: 'm', passed: true, calibration: {}, updated_at: 't' }],
}
const e = marketEntry(cfg, fakeA, rec)
check('bidang entri = yang dijanjikan saja (tanpa alamat peserta/penyewa, tanpa pesan/tanda tangan, tanpa uang tagihan)',
  json(Object.keys(e)) === json(['agentId', 'registry', 'name', 'description', 'avatar', 'image', 'registrationRole', 'owner', 'wallet', 'tariff', 'rateCard', 'hireable', 'problem', 'brain', 'work', 'record']), json(Object.keys(e)))
check('teks registrasi dibersihkan (karakter kendali) dan dipotong (deskripsi ≤ 400); gambar bukan SVG data URI → null',
  e.name === 'Pak  Uji' && e.description.length === 400 && e.image === null, json({ n: e.name, d: e.description?.length, i: e.image }))
check('tempat kerja: dompet berubah sejak disewa → stale; ditunjuk dengan dompet yang sama → segar; peran templat grader-self',
  e.work.grading[0]?.stale === true && e.work.reviewing[0]?.stale === false && e.registrationRole === 'grader-self', json(e.work))
check('rapor: 1 penilaian + 1 pengesahan milik agen ini; keputusan pengesah atas usulannya 1 disetujui · 1 disesuaikan (milik agen lain tidak terhitung)',
  e.record.graded === 1 && e.record.reviews === 1 && json(e.record.verdicts) === json({ approved: 1, adjusted: 1, rejected: 0 }) && e.record.labels.sedang === 1 && e.record.labels.ringan === 1, json(e.record))
check('otak dicatat pemilik LAMA → tidak diiklankan (null)', e.brain === null)
const e2 = marketEntry(cfg, fakeA, { ...rec, brains: [{ ...rec.brains[0], owner: A }] })
check('otak dicatat pemilik sekarang → diiklankan dengan nama modelnya', e2.brain?.modelName === 'groq/m', json(e2.brain))
const e3 = marketEntry(cfg, { ...fakeA, owner: cfg.publisher }, rec)
check('agen yang dikendalikan penerbit → tidak layak sewa, alasannya ikut (D54)', e3.hireable === false && /publisher/.test(e3.problem ?? ''), e3.problem)

/* ================================================================== C. HTTP */
for (const k of ['SUPABASE_URL', 'RPC_URL', 'ISSUER_PRIVATE_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat lapis HTTP, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const COURSE = 'web3-dasar-2026'
const PORT = Number(env.MARKET_PROBE_PORT ?? await freePort(9011))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path) => {
  const r = await fetch(`${API}${path}`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(30000) })
  return r.json()
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— C. GET /agents/market')
  const known = [...new Set([
    ...(await pg('/platform_agents?select=agent_id')).map((r) => String(r.agent_id)),
    ...(await pg('/agent_hires?select=agent_id')).map((r) => String(r.agent_id)),
    ...(await pg('/review_roles?agent_id=not.is.null&select=agent_id')).map((r) => String(r.agent_id)),
  ])]
  const t0 = Date.now()
  const m1 = await call('/agents/market')
  const ms1 = Date.now() - t0
  const ids = (m1.body?.agents ?? []).map((a) => a.agentId)
  check(`200 dan memuat semua ${known.length} agen yang dikenal platform (dibaca dari registry, ${ms1} ms)`, m1.status === 200 && known.every((id) => ids.includes(id) || (m1.body?.unreadable ?? []).includes(id)), json({ known, ids, unreadable: m1.body?.unreadable }))
  // Kunci ditelusuri dari JSON-nya, bukan dicari di teks: `avatar.body` adalah BADAN ROBOT (suku cadang rakitan B132), bukan
  // teks esai — versi pertama pemeriksaan ini mencari "body" di teks dan menembak rupa robot (tembakan palsu, 3 Okt).
  const keysOf = (v, skip) => (v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => (k === skip ? [k] : [k, ...keysOf(x, skip)])) : [])
  const forbidden = keysOf(m1.body, 'avatar').filter((k) => ['learner', 'body', 'text', 'message', 'signature', 'hiredBy', 'hired_by', 'addedBy', 'added_by', 'charges'].includes(k))
  check('tidak ada kunci data peserta / tanda tangan / penyewa / tagihan di jawaban (rupa robot dilewati)', forbidden.length === 0, json(forbidden))
  const byId = new Map((m1.body?.agents ?? []).map((a) => [a.agentId, a]))
  // Pemilik/dompet agen memang publik (registry); yang tidak boleh muncul adalah alamat peserta sebagai peserta.
  const agentAddrs = new Set((m1.body?.agents ?? []).flatMap((a) => [a.owner, a.wallet]).filter(Boolean).map((x) => x.toLowerCase().slice(2)))
  const posted = (await pg('/enrollments?select=learner&limit=500')).map((r) => String(r.learner).toLowerCase().slice(2)).filter((a) => !agentAddrs.has(a))
  check(`tidak satu pun dari ${posted.length} alamat peserta (yang bukan pemilik/dompet agen) muncul di jawaban`, !posted.some((a) => m1.text.toLowerCase().includes(a)))
  const sample = ids.slice(0, 6)
  const rates = await Promise.all(sample.map((id) => call(`/agents/${id}/rates`)))
  check('layak-sewa di bursa = GET /agents/<id>/rates (200 ↔ hireable, tarif dasar sama)',
    sample.every((id, i) => (rates[i].status === 200) === byId.get(id).hireable && (!byId.get(id).hireable || rates[i].body?.baseTariff === byId.get(id).tariff?.amount)),
    json(sample.map((id, i) => [id, rates[i].status, byId.get(id).hireable])))
  const a2534 = byId.get('2534')
  const a2542 = byId.get('2542')
  check(`#2534 menilai ${COURSE}; #2542 mengesahkan ${COURSE} (sama dengan rekaman sewa/penunjukan)`,
    a2534?.work.grading.some((g) => g.courseId === COURSE) && a2542?.work.reviewing.some((r) => r.courseId === COURSE), json({ g: a2534?.work, r: a2542?.work }))
  const brains = await pg('/agent_brains?select=agent_id,owner,passed')
  const validBrains = brains.filter((b) => b.passed && byId.get(String(b.agent_id)) && String(b.owner).toLowerCase() === String(byId.get(String(b.agent_id)).owner).toLowerCase())
  check(`otak yang berlaku ikut tampil (${validBrains.length} di database untuk agen bursa)`, validBrains.every((b) => byId.get(String(b.agent_id)).brain?.modelName), json(validBrains.map((b) => b.agent_id)))
  const m2 = await call('/agents/market')
  check('panggilan kedua dari cache (cached: true, generatedAt sama)', m2.body?.cached === true && m2.body?.generatedAt === m1.body?.generatedAt, json({ c: m2.body?.cached }))
  const hm = `lencana-agent-hire course=${COURSE} agent=2534 nonce=${nonce()}`
  const hired = await call('/agents/hire', { course: COURSE, agentId: '2534', publisher: publisher.address, message: hm, signature: await publisher.signMessage({ message: hm }) })
  const m3 = await call('/agents/market')
  check('sewa berhasil (penerbit, idempoten) membatalkan cache → bursa dibaca ulang', hired.status === 200 && m3.body?.cached === false && m3.body?.generatedAt !== m1.body?.generatedAt, json({ h: hired.status, c: m3.body?.cached }))
  // Aturan halaman sepakat dengan server: #2542 adalah pengesah kursus itu → sewa sebagai penilai ditolak di keduanya.
  const team2542 = { graders: [], reviewers: [{ agentId: '2542', owner: a2542?.owner ?? null }] }
  const pageSays = a2542 ? hireBlock(a2542, COURSE, team2542, null, true) : 'missing'
  const hm2 = `lencana-agent-hire course=${COURSE} agent=2542 nonce=${nonce()}`
  const refused = await call('/agents/hire', { course: COURSE, agentId: '2542', publisher: publisher.address, message: hm2, signature: await publisher.signMessage({ message: hm2 }) })
  check('halaman dan server sepakat: #2542 (pengesah kursus itu) tidak bisa disewa sebagai penilainya — halaman reviewer-here, server 422',
    pageSays === 'reviewer-here' && refused.status === 422 && /reviewer/.test(refused.body?.error ?? ''), json({ pageSays, s: refused.status, e: refused.body?.error }))
} catch (err) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(err?.stack ?? err).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log(`\nBURSA AGEN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
