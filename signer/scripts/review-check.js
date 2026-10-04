// Lencana-B144 status=TERBUKA 2026-10-05 — harness meja pengesahan: antrean dibaca dompet agen pengesah yang ditunjuk (teks + rubrik + usulan per kriteria, tanpa alamat peserta, baris uji tersembunyi kecuali diminta), rubrik pengesahan/penilaian wajib milik esainya sendiri, pengesahan dari meja menutup butirnya. Buktikan ulang: npm run verify:review. JANGAN dibalik/diulang tanpa membuka kembali baris B144 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:review` — meja pengesahan agen pengesah (B144). Tanpa gas: server sendiri (origin=test,
 * `ENROLL_PAYWALL=off`), Postgres nyata, registry ERC-8004 dibaca.
 *
 * Peran dan kunci (semua dari app/.env, tidak ada yang dicetak) — sama dengan `verify:agents`:
 *   penerbit        ISSUER_PRIVATE_KEY          menyewa #2534, menunjuk #2542 (idempoten: keadaan tim yang sama dengan verify:agents)
 *   agen penilai    AGENT_GRADER_PRIVATE_KEY    dompet agen #2534 — mengusulkan nilai
 *   agen pengesah   AGENT_REVIEWER_PRIVATE_KEY  dompet agen #2542 — membaca mejanya dan mengesahkan
 * Peserta uji dibuat acak per run; semua barisnya dihapus di E dan sisanya dihitung ulang.
 *
 *   A. hak baca meja: bentuk pesan salah → 400 sebelum nonce; dompet lain → 403; agen tak dikenal → 404;
 *      usulan agen penilai sendiri tidak masuk mejanya
 *   B. isi meja: teks esai, rubrik + nilai lulus dari manifest, usulan per kriteria (poin) + total + model + agen + label,
 *      TANPA alamat peserta; baris uji tersembunyi tanpa `includeTest`; batas per kursus dipatuhi
 *   C. rubrik milik esainya sendiri: kursus lain di `/essay/review` → 422 tanpa baris; lesson lain (pengesahan dan
 *      penilaian agen) → ditolak sebelum tanda tangan dibaca
 *   D. pengesahan dari meja: approved + label → 200, tagihan `review`; butirnya keluar dari meja
 *   E. bersih-bersih baris peserta uji (kueri ulang)
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { reviewEssay, agentJudgeEssay } from '../src/db.js'
import { manifestOf } from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:review')
const env = process.env
for (const k of ['RPC_URL', 'ISSUER_PRIVATE_KEY', 'AGENT_GRADER_PRIVATE_KEY', 'AGENT_REVIEWER_PRIVATE_KEY', 'SUPABASE_URL']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }
process.env.LANCENA_ORIGIN = 'test'

const GRADER_ID = '2534'
const REVIEWER_ID = '2542'
const COURSE = 'web3-dasar-2026'
const OTHER_COURSE = 'uji-bayar-2026'

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${!ok && detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`)
}
const head = (t) => console.log(`\n${t}`)
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
const nonce = () => randomBytes(10).toString('hex')

const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const grader = privateKeyToAccount(env.AGENT_GRADER_PRIVATE_KEY)
const reviewer = privateKeyToAccount(env.AGENT_REVIEWER_PRIVATE_KEY)
const learner = privateKeyToAccount(generatePrivateKey())
const manifest = manifestOf(COURSE)
const essayLesson = manifest.course.modules.flatMap((m) => m.lessons).find((l) => l.essay?.rubric?.length)
const rubric = essayLesson.essay.rubric
const otherManifest = manifestOf(OTHER_COURSE)
const otherEssay = otherManifest.course.modules.flatMap((m) => m.lessons).find((l) => l.essay?.rubric?.length)

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=representation', ...(init.headers ?? {}) } })
  const t = await r.text()
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body: t ? JSON.parse(t) : null }
}

const PORT = Number(env.REVIEW_PROBE_PORT ?? await freePort(8869))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
async function call (method, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const desk = async (acct, agentId, extra = {}, msg) => {
  const m = msg ?? `lencana-agent-review-queue agent=${agentId} nonce=${nonce()}`
  return call('POST', '/owner/agents/review-queue', { learner: acct.address, message: m, signature: await acct.signMessage({ message: m }), ...extra })
}

let attemptId = null
try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  head('persiapan: sewa #2534, tunjuk #2542 (idempoten), satu esai peserta uji diusulkan #2534')
  const hireMsg = `lencana-agent-hire course=${COURSE} agent=${GRADER_ID} nonce=${nonce()}`
  const hired = await call('POST', '/agents/hire', { course: COURSE, agentId: GRADER_ID, publisher: publisher.address, message: hireMsg, signature: await publisher.signMessage({ message: hireMsg }) })
  check(`penerbit menyewa #${GRADER_ID} untuk ${COURSE} (idempoten) -> 200`, hired.status === 200, hired.text.slice(0, 160))
  const roleMsg = `lencana-review-role course=${COURSE} reviewer=${reviewer.address.toLowerCase()} agent=${REVIEWER_ID} nonce=${nonce()}`
  const appointed = await call('POST', '/essay/reviewers', { issuer: publisher.address, course: COURSE, reviewer: reviewer.address, agentId: REVIEWER_ID, message: roleMsg, signature: await publisher.signMessage({ message: roleMsg }) })
  check(`penerbit menunjuk #${REVIEWER_ID} sebagai pengesah ${COURSE} (idempoten) -> 200`, appointed.status === 200 && appointed.body?.agentId === REVIEWER_ID, appointed.text.slice(0, 160))
  const sign = async (m) => ({ message: m, signature: await learner.signMessage({ message: m }) })
  await call('POST', '/enroll', { learner: learner.address, course: COURSE, ...await sign(`lencana-enroll ${COURSE} nonce=${nonce()}`) })
  const essayText = 'Karangan uji meja pengesahan. Alamat 0x1234abcd5678ef90 dan fungsi attestationOf lewat https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/ ; sisanya tidak bisa saya simpulkan dari data publik. '
    + Array.from({ length: 430 }, (_, i) => `kata${i}`).join(' ')
  const sub = await call('POST', '/essay', { learner: learner.address, course: COURSE, lesson: essayLesson.slug, text: essayText, ...await sign(`lencana-essay ${essayLesson.slug} nonce=${nonce()}`) })
  attemptId = Number(sub.body?.attemptId)
  check('peserta uji menyerahkan esai -> 201', sub.status === 201 && Number.isInteger(attemptId), sub.text.slice(0, 160))
  const points = rubric.map((r) => ({ label: r.label, score: Math.round(Number(r.max) * 0.8) }))
  const proposed = points.reduce((n, x) => n + x.score, 0)
  const jm = `lencana-agent-judge attempt=${attemptId} final=${proposed} label=cukup-berat nonce=${nonce()}`
  const judged = await call('POST', '/essay/judgement', {
    agentId: GRADER_ID, course: COURSE, lesson: essayLesson.slug, attemptId, scores: points, judgeModel: 'harness:agent-80pct', judgeTemp: 0,
    message: jm, signature: await grader.signMessage({ message: jm }),
  })
  check(`#${GRADER_ID} mengusulkan ${proposed} (cukup-berat) -> 200, menunggu pengesahan`, judged.status === 200 && judged.body?.needsReview === true, judged.text.slice(0, 160))

  head('A. hak baca meja')
  const bad = await desk(reviewer, REVIEWER_ID, {}, `lencana-agent-review-queue agent=abc nonce=${nonce()}`)
  check('bentuk pesan salah -> 400 (sebelum nonce dipakai)', bad.status === 400 && /lencana-agent-review-queue/.test(bad.body?.error ?? ''), bad.text.slice(0, 120))
  const wrong = await desk(grader, REVIEWER_ID, { includeTest: true })
  check(`dompet lain (#${GRADER_ID}) membaca meja #${REVIEWER_ID} -> 403 (dibaca agentWallet-nya)`, wrong.status === 403 && /agentWallet/.test(wrong.body?.error ?? ''), wrong.text.slice(0, 160))
  const unknown = await desk(reviewer, '999999999', { includeTest: true })
  check('agen yang tidak ada -> 404', unknown.status === 404, unknown.text.slice(0, 120))
  const own = await desk(grader, GRADER_ID, { includeTest: true, limit: 100 })
  check(`meja #${GRADER_ID} sendiri tidak memuat esai yang ia usulkan`, own.status === 200 && !(own.body?.items ?? []).some((x) => x.attemptId === attemptId), own.text.slice(0, 160))

  head('B. isi meja')
  const q = await desk(reviewer, REVIEWER_ID, { includeTest: true, limit: 100 })
  const item = (q.body?.items ?? []).find((x) => x.attemptId === attemptId)
  check(`meja #${REVIEWER_ID} memuat esai peserta uji (includeTest) -> 200`, q.status === 200 && Boolean(item), json({ status: q.status, n: q.body?.items?.length, err: q.body?.error }))
  check('teks esai = yang diserahkan peserta', item?.text === essayText)
  check('rubrik + nilai lulus dari manifest penerbit, lesson + kursus esai itu sendiri',
    json(item?.essay?.rubric) === json(rubric.map((r) => ({ label: r.label, max: Number(r.max) }))) && item?.passMark === manifest.course.passMark
      && item?.course === COURSE && item?.lesson === essayLesson.slug && item?.essay?.prompt === essayLesson.essay.prompt, json(item?.essay?.rubric))
  check(`usulan per kriteria dalam poin = yang diusulkan #${GRADER_ID}, total ${proposed}`,
    json(item?.proposal?.criteria?.map((c) => [c.label, c.points])) === json(points.map((p) => [p.label, p.score])) && item?.proposal?.total === proposed, json(item?.proposal?.criteria))
  check(`usulan menyebut model, agen pengusul #${GRADER_ID}, label cukup-berat`,
    item?.proposal?.judgeModel === 'harness:agent-80pct' && item?.proposal?.gradedByAgent === GRADER_ID && item?.proposal?.label === 'cukup-berat', json(item?.proposal))
  check('alamat peserta tidak ada di mana pun dalam jawaban meja', q.status === 200 && !q.text.toLowerCase().includes(learner.address.toLowerCase().slice(2)))
  check(`kursus tempat ditunjuk = ${COURSE}, tidak basi`, (q.body?.courses ?? []).some((c) => c.courseId === COURSE) && !(q.body?.staleCourses ?? []).includes(COURSE), json({ courses: q.body?.courses, stale: q.body?.staleCourses }))
  const hidden = await desk(reviewer, REVIEWER_ID, { limit: 100 })
  check('tanpa includeTest esai peserta uji (origin=test) tersembunyi', hidden.status === 200 && !(hidden.body?.items ?? []).some((x) => x.attemptId === attemptId), json({ n: hidden.body?.items?.length }))
  const one = await desk(reviewer, REVIEWER_ID, { includeTest: true, limit: 1 })
  check('batas per kursus dipatuhi (limit 1 -> paling banyak 1 butir)', one.status === 200 && (one.body?.items ?? []).length <= 1, json({ n: one.body?.items?.length }))

  head('C. rubrik milik esainya sendiri')
  const foreign = otherEssay.essay.rubric.map((r) => ({ label: r.label, score: Number(r.max) }))
  const fTotal = foreign.reduce((n, x) => n + x.score, 0)
  const fm = `lencana-essay-review attempt=${attemptId} decision=adjusted final=${fTotal} label=sedang nonce=${nonce()}`
  const forged = await call('POST', '/essay/review', { reviewer: reviewer.address, course: OTHER_COURSE, lesson: otherEssay.slug, attemptId, decision: 'adjusted', scores: foreign, message: fm, signature: await reviewer.signMessage({ message: fm }) })
  const stillOpen = await pg(`/judgement_reviews?attempt_id=eq.${attemptId}&limit=0`, { headers: { prefer: 'count=exact' } })
  check(`pengesahan memakai rubrik ${OTHER_COURSE} untuk esai ${COURSE} -> 422, tidak ada baris pengesahan`, forged.status === 422 && /essay's own/.test(forged.body?.error ?? '') && stillOpen.total === 0, forged.text.slice(0, 200))
  const lessonR = await reviewEssay({ attemptId, courseId: COURSE, lessonKey: 'lesson-lain', reviewer: reviewer.address, decision: 'approved', essay: essayLesson.essay, passMark: manifest.course.passMark, message: 'x', signature: '0x' })
  check('pengesahan dengan lesson lain di kursus yang sama -> ditolak sebelum tanda tangan dibaca', lessonR.ok === false && /essay's own/.test(lessonR.why ?? ''), json(lessonR))
  const lessonJ = await agentJudgeEssay({ attemptId, courseId: COURSE, lessonKey: 'lesson-lain', agent: { agentId: GRADER_ID, wallet: grader.address }, scores: points, essay: essayLesson.essay, passMark: manifest.course.passMark, judgeModel: 'harness:agent-80pct', judgeTemp: 0, message: 'x', signature: '0x' })
  check('penilaian agen dengan lesson lain -> ditolak sebelum tanda tangan dibaca', lessonJ.ok === false && /essay's own/.test(lessonJ.why ?? ''), json(lessonJ))

  head('D. pengesahan dari meja')
  const am = `lencana-essay-review attempt=${attemptId} decision=approved final=${proposed} label=sedang nonce=${nonce()}`
  const approved = await call('POST', '/essay/review', { reviewer: reviewer.address, course: item?.course ?? COURSE, lesson: item?.lesson ?? essayLesson.slug, attemptId, decision: 'approved', message: am, signature: await reviewer.signMessage({ message: am }) })
  check(`#${REVIEWER_ID} menyetujui ${proposed} (label sedang) -> 200, tagihan review`, approved.status === 200 && Number(approved.body?.finalScore) === proposed && approved.body?.reviewerAgentId === REVIEWER_ID && approved.body?.charge?.activity === 'review', approved.text.slice(0, 200))
  const after = await desk(reviewer, REVIEWER_ID, { includeTest: true, limit: 100 })
  check('sesudah disahkan, butirnya keluar dari meja', after.status === 200 && !(after.body?.items ?? []).some((x) => x.attemptId === attemptId), json({ n: after.body?.items?.length }))
} catch (e) {
  check('lintasan selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
}

head('E. bersih-bersih baris peserta uji (kueri ulang)')
try {
  const who = encodeURIComponent(learner.address)
  const enr = (await pg(`/enrollments?learner=eq.${who}&origin=eq.test&select=id`)).body ?? []
  const eids = `(${enr.map((r) => r.id).join(',')})`
  const atts = enr.length ? ((await pg(`/attempts?enrollment_id=in.${eids}&select=id`)).body ?? []) : []
  const aids = `(${atts.map((r) => r.id).join(',')})`
  const steps = [
    ...(atts.length ? [['agent_charges', `attempt_id=in.${aids}`], ['judgement_reviews', `attempt_id=in.${aids}`], ['attempt_components', `attempt_id=in.${aids}`], ['submissions', `attempt_id=in.${aids}`], ['attempts', `id=in.${aids}`]] : []),
    ...(enr.length ? [['lesson_progress', `enrollment_id=in.${eids}`], ['progress_events', `enrollment_id=in.${eids}`], ['orders', `enrollment_id=in.${eids}`]] : []),
    ['enrollments', `learner=eq.${who}&origin=eq.test`],
  ]
  for (const [table, filter] of steps) {
    const r = await pg(`/${table}?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
    const left = await pg(`/${table}?${filter}&limit=0`, { headers: { prefer: 'count=exact' } })
    check(`${table}: baris peserta uji dihapus, sisa 0 (kueri ulang)`, (r.status === 204 || r.status === 200) && left.total === 0, `HTTP ${r.status}, sisa ${left.total}`)
  }
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
console.log(`\nMEJA PENGESAHAN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
