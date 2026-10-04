// Lencana-B143 status=SELESAI 2026-10-04 — SATU lintasan esai → otak agen (LLM sungguhan lewat adaptor peramban) → agen pengesah → gerbang → kredensial terbit di chain 97 → tepi menyebut agen penilai, model otaknya, dan agen pengesahnya. Buktikan ulang: npm run verify:brain-e2e:live (CLOUDFLARE_* di lingkungan). JANGAN dibalik/diulang tanpa membuka kembali baris B143 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:brain-e2e:live` — B143: esai peserta dinilai OTAK agen sampai kertas terbit, dalam satu run.
 *
 * Kenapa ada (T68, 4 Okt): potongan-potongannya sudah terbukti terpisah — `verify:attempts:live` menerbitkan dari usaha yang
 * disahkan, tapi usulan esainya buatan harness (`harness:proposal-80pct`); `journey` menilai esai dengan model lewat CLI
 * penerbit; uji peramban T68 menjalankan otak agen dengan Groq sungguhan tapi berhenti di pengesahan + gerbang. Belum ada satu
 * lintasan di mana angka yang tercetak di kertas lahir dari otak agen yang disewa kursus. Berkas ini lintasan itu.
 *
 *   0. prasyarat; otak non-uji #2534 tidak pernah ditimpa
 *   1. penerbit menyewa #2534 untuk Kelas Uji dan menunjuk agen #2542 sebagai pengesahnya (dicatat: sudah ada atau dibuat run ini)
 *   2. kalibrasi SUNGGUHAN lewat adaptor peramban (`web/src/llm.ts` + `calibration.ts`, Groq) → pemilik mencatat otak
 *   3. peserta: enroll → setiap lesson unlocked → started → completed → kuis dinilai server → praktik eth-call dinilai chain → esai
 *   4. dompet agen membaca antreannya, menilai esai itu dengan LLM yang sama, menandatangani atas nama model otaknya
 *   5. penerbitan DITOLAK selama usulan itu belum disahkan (sebelum gas)
 *   6. agen pengesah #2542 mengesahkan (approved, label) → gerbang membaca usaha itu
 *   7. `issue --from-attempts` → attestation di chain 97; `publish:edge`
 *   8. tepi: dokumen hasil menyebut agen #2534 + model otak + label, pengesahan oleh agen #2542 (B145: bukan "disahkan manusia")
 *   9. bersih-bersih: otak #2534 (origin=test) WAJIB dihapus — `verify:agents` menilai #2534 dengan nama model harness dan otak
 *      yang tertinggal menolaknya (409); sewa/penunjukan yang DIBUAT run ini dihapus. Peserta + kertas TETAP ADA (B78), sama
 *      dengan `verify:attempts:live`.
 *
 * Kunci: semua dari app/.env (ISSUER, AGENT_OWNER, AGENT_GRADER, AGENT_REVIEWER, GROQ_API_KEY) + CLOUDFLARE_* di lingkungan
 * (bukan .env). Peserta acak, atau `E2E_LEARNER_PK` dari lingkungan bila uji peramban sisi peserta perlu masuk sebagai dia —
 * kunci itu tidak pernah dicetak.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http, getAddress, parseAbi, encodeFunctionData } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { credentialHashOf } from '../src/credential.js'
import { attemptsFor, courseGates, dbConfigured, dbMissingReason } from '../src/db.js'
import { manifestOf, rubricHashOf } from '../../web/src/manifest-keys.ts'
import { judgeEssayWith } from '../../web/src/llm.ts'
import { runCalibration } from '../../web/src/calibration.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
await loadFileEnvReport('verify:brain-e2e')
const env = process.env

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail !== '' ? ` -> ${String(detail).slice(0, 280)}` : ''}`) }
  return ok
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const head = (s) => console.log(`\n— ${s}`)

/* ------------------------------------------------------------------ 0. prasyarat */
if (!dbConfigured()) { console.error(`verify:brain-e2e berhenti: ${dbMissingReason()}`); process.exit(2) }
for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'ISSUER_PRIVATE_KEY', 'AGENT_OWNER_PRIVATE_KEY', 'AGENT_GRADER_PRIVATE_KEY', 'AGENT_REVIEWER_PRIVATE_KEY', 'GROQ_API_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
const EDGE = (env.EDGE_BASE_URL ?? '').replace(/\/$/, '')
if (!/^https:\/\//.test(EDGE)) { console.error('EDGE_BASE_URL (https) belum diisi — tidak menerbitkan sesuatu yang tidak bisa dibaca siapa pun (D47/B51)'); process.exit(2) }
if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) { console.error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID belum ada di lingkungan — publish:edge tidak bisa jalan'); process.exit(2) }

const COURSE = 'uji-bayar-2026' // Kelas Uji: esai uji di kursus lain (mis. web3-dasar) tidak pernah masuk antrean run ini
const GRADER_ID = '2534'
const REVIEWER_ID = '2542'
const MODEL = 'openai/gpt-oss-120b'
const BRAIN_NAME = `groq/${MODEL}`
const LABEL = 'sedang'
const GROQ = env.GROQ_API_KEY
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const owner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const graderWallet = privateKeyToAccount(env.AGENT_GRADER_PRIVATE_KEY)
const reviewerWallet = privateKeyToAccount(env.AGENT_REVIEWER_PRIVATE_KEY)
const learner = privateKeyToAccount(/^0x[0-9a-fA-F]{64}$/.test(env.E2E_LEARNER_PK ?? '') ? env.E2E_LEARNER_PK : generatePrivateKey())
const manifest = manifestOf(COURSE)
const lessons = manifest.course.modules.flatMap((m) => m.lessons)
const essayLesson = lessons.find((l) => l.essay?.rubric?.length)
const praktikLesson = lessons.find((l) => l.proof?.type === 'eth-call')
const quizLessons = lessons.filter((l) => l.quiz?.questions?.length)
const credentialHash = credentialHashOf(learner.address, COURSE)
const chain = createPublicClient({ transport: http(env.RPC_URL) })
const RESOLVER = getAddress(env.RESOLVER_ADDRESS)
const ATTEST_OF = parseAbi(['function attestationOf(bytes32) view returns (bytes32)'])
const EMPTY = `0x${'00'.repeat(32)}`
const attestationNow = () => chain.readContract({ address: RESOLVER, abi: ATTEST_OF, functionName: 'attestationOf', args: [credentialHash] })

/** Esai peserta: menjawab soal Kelas Uji dengan tanda tangan, pengirim transaksi, bukti di chain, dan batas izin. */
const ESSAY = [
  'Saat membayar Kelas Uji saya tidak mengirim transaksi apa pun; saya menandatangani dua pesan EIP-712.',
  'Pertama, izin token EIP-2612 (Permit): pemiliknya alamat dompet belajar saya, spender-nya kontrak Permit2,',
  'nilainya tepat harga kelas dalam LDC-demo, dengan nonce token dan deadline sekitar sepuluh menit.',
  'Kedua, saksi Permit2 (PermitWitnessTransferFrom) yang mengikat jumlah yang sama, nonce, deadline, dan pembayaran kelas ini.',
  'Yang mengirim transaksi ke chain adalah penerbit: ia menyiarkan settlement lalu transaksi pembagian (split) ke platform',
  'di BSC testnet dan membayar gasnya, jadi saldo BNB saya tidak berkurang.',
  'Orang lain bisa memeriksanya di BscScan testnet: buka hash settlement yang tercatat di riwayat pembayaran saya,',
  'lalu lihat event Transfer token LDC-demo dari alamat saya ke penerbit dan event Transfer kedua untuk bagian platform.',
  'Yang TIDAK bisa dilakukan penerbit dengan tanda tangan saya: menarik lebih dari jumlah yang tertulis, memakainya sesudah',
  'deadline lewat, memakai nonce yang sama dua kali, atau mengalihkannya ke spender lain.',
  'Batas kesimpulan saya: tanda tangan ini hanya membuktikan izin bayar, bukan bahwa saya lulus kelas.',
].join(' ')

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=representation', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30000) })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* bukan JSON */ }
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body }
}

async function runNpm (script, extraArgs = [], extraEnv = {}) {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  try {
    const { stdout, stderr } = await promisify(execFile)('npm', ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : [])], {
      cwd: SIGNER, maxBuffer: 16 * 1024 * 1024, shell: true, env: { ...process.env, ...extraEnv },
    })
    return { status: 0, out: `${stdout}\n${stderr}` }
  } catch (e) {
    return { status: e.code ?? 1, out: `${e.stdout ?? ''}\n${e.stderr ?? ''}${e.message ?? ''}` }
  }
}
const issue = () => runNpm('issue', ['--course', COURSE, '--from-attempts', '--learner', learner.address], { BASE_URL: EDGE, AGENT_SLUG: 'agent-edge' })

console.log(`verify:brain-e2e — ${COURSE} · penilai #${GRADER_ID} (${BRAIN_NAME}) · pengesah #${REVIEWER_ID} · host kertas ${EDGE}`)
console.log(`  peserta uji : ${learner.address}${env.E2E_LEARNER_PK ? ' (dari E2E_LEARNER_PK)' : ' (acak)'}`)

const PORT = Number(env.BRAIN_E2E_PORT ?? await freePort(8997))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let serverLog = ''
child.stdout.on('data', (d) => { serverLog += String(d) })
child.stderr.on('data', (d) => { serverLog += String(d) })
/** POST dengan satu percobaan ulang; kegagalan jaringan jadi status 0 (baris MERAH), bukan pengecualian yang memutus laporan. */
async function post (path, body) {
  for (let tries = 0; tries < 2; tries++) {
    try {
      const r = await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: json(body), signal: AbortSignal.timeout(120_000) })
      const text = await r.text()
      let parsed = null
      try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
      return { status: r.status, body: parsed, text }
    } catch (e) {
      if (tries === 1) return { status: 0, body: { error: String(e?.message ?? e) }, text: String(e?.message ?? e) }
      await new Promise((res) => setTimeout(res, 3000))
    }
  }
  return { status: 0, body: null, text: 'tidak teraih' }
}
const signedBy = async (acct, message, learnerAddr = acct.address) => ({ learner: learnerAddr, message, signature: await acct.signMessage({ message }) })
const asLearner = async (message) => ({ message, signature: await learner.signMessage({ message }) })

let hireCreated = false
let roleCreated = false
let attemptId = null
let proposal = null
try {
  head('0. prasyarat: otak #2534, server uji')
  await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&origin=eq.test`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const preBrain = (await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&select=owner,model,origin`)).body ?? []
  if (!check(`agen #${GRADER_ID} belum punya otak non-uji (otak orang tidak ditimpa harness)`, preBrain.length === 0, json(preBrain))) throw new Error('otak non-uji #2534 ada — berhenti')
  hireCreated = ((await pg(`/agent_hires?course_id=eq.${COURSE}&agent_id=eq.${GRADER_ID}&select=agent_id`)).body ?? []).length === 0
  roleCreated = ((await pg(`/review_roles?course_id=eq.${COURSE}&agent_id=eq.${REVIEWER_ID}&select=agent_id`)).body ?? []).length === 0
  let up = null
  for (let i = 0; i < 60 && !up; i++) {
    try { const r = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(30_000) }); if (r.ok) up = r } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 1500))
  }
  if (!check(`server uji naik di ${BASE} (origin=test, paywall mati)`, Boolean(up), serverLog.split('\n').slice(-3).join(' | '))) throw new Error('server tidak naik')

  head('1. tim kursus: penerbit menyewa penilai, menunjuk pengesah')
  const hm = `lencana-agent-hire course=${COURSE} agent=${GRADER_ID} nonce=${nonce()}`
  const hired = await post('/agents/hire', { course: COURSE, agentId: GRADER_ID, publisher: publisher.address, message: hm, signature: await publisher.signMessage({ message: hm }) })
  check(`penerbit menyewa #${GRADER_ID} untuk ${COURSE} → 200${hireCreated ? '' : ' (sudah ada sebelum run — tidak dihapus nanti)'}`, hired.status === 200, hired.text.slice(0, 160))
  const rm = `lencana-review-role course=${COURSE} reviewer=${reviewerWallet.address.toLowerCase()} agent=${REVIEWER_ID} nonce=${nonce()}`
  const appointed = await post('/essay/reviewers', { issuer: publisher.address, course: COURSE, reviewer: reviewerWallet.address, agentId: REVIEWER_ID, message: rm, signature: await publisher.signMessage({ message: rm }) })
  check(`penerbit menunjuk agen #${REVIEWER_ID} (dompet ${reviewerWallet.address.slice(0, 10)}…) sebagai pengesah → 200${roleCreated ? '' : ' (sudah ada sebelum run)'}`,
    appointed.status === 200 && String(appointed.body?.agentId) === REVIEWER_ID, appointed.text.slice(0, 160))

  head('2. otak: kalibrasi SUNGGUHAN lewat adaptor peramban (Groq), dicatat pemilik')
  let temp = 0
  const cal = await runCalibration(async (e, t) => { const r = await judgeEssayWith('groq', GROQ, MODEL, e, t); if (r.temperature === null) temp = null; return r.total })
  console.log(`        kalibrasi: substantif=${cal.substantive} kosong=${cal.hollow} lulus≥${cal.passMark} temperature=${temp ?? '—'}`)
  if (!check(`kalibrasi ${MODEL} lulus (kosong < ${cal.passMark} ≤ substantif)`, cal.pass, cal.reasons.join('; '))) throw new Error('kalibrasi gagal')
  const bm = `lencana-agent-brain agent=${GRADER_ID} provider=groq model=${MODEL} sub=${cal.substantive} empty=${cal.hollow} temp=${temp === 0 ? '0' : 'none'} nonce=${nonce()}`
  const brain = await post('/owner/agents/brain', await signedBy(owner, bm))
  if (!check(`pemilik #${GRADER_ID} mencatat otak ${BRAIN_NAME} → 201`, brain.status === 201 && brain.body?.modelName === BRAIN_NAME, brain.text.slice(0, 200))) throw new Error('otak tidak tercatat')

  head('3. peserta: enroll → lesson → kuis → praktik → esai (semua lewat HTTP)')
  const en = await post('/enroll', { learner: learner.address, course: COURSE, ...await asLearner(`lencana-enroll ${COURSE} nonce=${nonce()}`) })
  check(`POST /enroll ${COURSE} → 200`, en.status === 200, en.text.slice(0, 140))
  let walkFails = 0
  for (const [i, l] of lessons.entries()) {
    for (const to of ['unlocked', 'started', 'completed']) {
      const r = await post('/progress', { learner: learner.address, course: COURSE, lesson: l.slug, status: to, position: i, ...await asLearner(`lencana-progress ${l.slug} -> ${to} nonce=${nonce()}`) })
      if (r.status !== 200) { walkFails++; console.log(`      ${l.slug} -> ${to}: ${r.status} ${r.text.slice(0, 90)}`) }
    }
  }
  check(`${lessons.length} lesson × 3 langkah diterima (${lessons.length * 3} POST /progress)`, walkFails === 0, `${walkFails} ditolak`)
  for (const l of quizLessons) {
    const picks = l.quiz.questions.map((q) => ({ itemId: q.id, choice: q.answer }))
    const g = await post('/grade', { learner: learner.address, course: COURSE, lesson: l.slug, picks, ...await asLearner(`lencana-grade ${COURSE} ${l.slug} nonce=${nonce()}`) })
    check(`kuis ${l.slug} dinilai server → 201, ${g.body?.score}`, g.status === 201 && g.body?.score === 100, g.text.slice(0, 140))
  }
  const results = {}
  for (const r of praktikLesson?.proof?.reads ?? []) {
    const fn = r.signature.slice(0, r.signature.indexOf('('))
    const { data } = await chain.call({ to: r.to, data: encodeFunctionData({ abi: parseAbi([`function ${r.signature}`]), functionName: fn, args: r.args }) })
    results[r.id] = data
  }
  const pr = await post('/praktik', { learner: learner.address, course: COURSE, lesson: praktikLesson.slug, answers: { results }, ...await asLearner(`lencana-praktik-submit course=${COURSE} lesson=${praktikLesson.slug} nonce=${nonce()}`) })
  check(`praktik ${praktikLesson.slug} dinilai chain → 201 lulus (${Object.keys(results).length} eth_call)`, pr.status === 201 && pr.body?.gradedBy === 'chain' && pr.body?.verdict === 'pass', pr.text.slice(0, 160))
  const sub = await post('/essay', { learner: learner.address, course: COURSE, lesson: essayLesson.slug, text: ESSAY, ...await asLearner(`lencana-essay ${essayLesson.slug} nonce=${nonce()}`) })
  attemptId = Number(sub.body?.attemptId)
  check(`esai ${essayLesson.slug} diserahkan → 201 awaiting_judge, skor NULL`, sub.status === 201 && sub.body?.state === 'awaiting_judge' && sub.body?.score === null && Number.isInteger(attemptId), sub.text.slice(0, 160))

  head('4. otak agen menilai dari antreannya (LLM sungguhan), ditandatangani dompet agen')
  const q = await post('/owner/agents/queue', await signedBy(graderWallet, `lencana-agent-queue agent=${GRADER_ID} nonce=${nonce()}`))
  const item = (q.body?.items ?? []).find((x) => x.attemptId === attemptId)
  check(`dompet agen #${GRADER_ID} membaca antrean → esai ini ada, teks utuh, rubrik penerbit, otak ${BRAIN_NAME}`,
    q.status === 200 && item?.text === ESSAY && json(item.essay.rubric) === json(essayLesson.essay.rubric.map((r) => ({ label: r.label, max: r.max }))) && q.body?.brain?.modelName === BRAIN_NAME,
    q.text.slice(0, 200))
  if (!item) throw new Error('esai tidak ada di antrean')
  const judged = await judgeEssayWith('groq', GROQ, MODEL, item.essay, item.text)
  const scores = essayLesson.essay.rubric.map((r) => ({ label: r.label, score: Number(judged.scores[r.label] ?? 0) }))
  proposal = { total: judged.total, scores, temperature: judged.temperature }
  console.log(`        usulan model: ${scores.map((s) => `${s.score}`).join(' + ')} = ${judged.total} (lulus kursus ≥ ${manifest.course.passMark})`)
  const jm = `lencana-agent-judge attempt=${attemptId} final=${judged.total} label=${LABEL} nonce=${nonce()}`
  const jud = await post('/essay/judgement', { agentId: GRADER_ID, course: COURSE, lesson: essayLesson.slug, attemptId, scores, judgeModel: BRAIN_NAME, judgeTemp: judged.temperature, message: jm, signature: await graderWallet.signMessage({ message: jm }) })
  check(`penilaian atas nama ${BRAIN_NAME} → 200, usulan ${judged.total}, butuh pengesahan, tagihan jatuh tempo`,
    jud.status === 200 && Number(jud.body?.score) === judged.total && jud.body?.needsReview === true && jud.body?.charge?.status === 'due', jud.text.slice(0, 200))

  head('5. penerbitan ditolak selama usulan otak belum disahkan')
  const early = await issue()
  check('issue --from-attempts DITOLAK: usulan model tanpa pengesahan (bukan karena pemanggilan salah)',
    early.status !== 0 && /has no human review/.test(early.out) && !/pakai: npm run issue/.test(early.out), early.out.split('\n').slice(-3).join(' | '))
  check('dan belum ada attestation untuk peserta ini (penolakan terjadi sebelum gas)', (await attestationNow()) === EMPTY)

  head('6. agen pengesah #2542 mengesahkan')
  const vm = `lencana-essay-review attempt=${attemptId} decision=approved final=${judged.total} label=${LABEL} nonce=${nonce()}`
  const rev = await post('/essay/review', { reviewer: reviewerWallet.address, course: COURSE, lesson: essayLesson.slug, attemptId, decision: 'approved', message: vm, signature: await reviewerWallet.signMessage({ message: vm }) })
  check(`pengesahan approved → 200, akhir ${rev.body?.finalScore} = usulan`, rev.status === 200 && Number(rev.body?.finalScore) === judged.total, rev.text.slice(0, 200))
  const rows = await attemptsFor(learner.address, COURSE)
  const essayRow = rows.find((r) => Number(r.id) === attemptId)
  const review = Array.isArray(essayRow?.judgement_reviews) ? essayRow.judgement_reviews[0] : essayRow?.judgement_reviews
  check('baris usaha: model otak, agen pengusul #2534, label; pengesahan oleh agen #2542',
    essayRow?.judge_model === BRAIN_NAME && String(essayRow?.graded_by_agent) === GRADER_ID && essayRow?.difficulty_label === LABEL
    && review?.decision === 'approved' && String(review?.reviewer_agent_id) === REVIEWER_ID, json({ row: essayRow && { m: essayRow.judge_model, a: essayRow.graded_by_agent, l: essayRow.difficulty_label }, review }))
  const gates = await courseGates(learner.address, COURSE)
  check(`gerbang: semua lesson selesai (${gates?.lessons_completed}/${gates?.lessons_total}) dan usaha bernilai terbaca`,
    gates?.all_lessons_done === true && Number(gates?.graded_attempts) >= 1 + quizLessons.length, json(gates))

  head('7. kertas terbit dari rekaman, lalu ke tepi')
  const issued = await issue()
  check('issue --from-attempts selesai (exit 0)', issued.status === 0, issued.out.split('\n').slice(-6).join(' | '))
  const uid = await attestationNow()
  check(`attestation ada di chain 97 untuk kertas ${credentialHash.slice(0, 12)}…`, uid !== EMPTY, uid)
  console.log(`        uid ${uid}`)
  const pub = await runNpm('publish:edge', [], { EDGE_BASE_URL: EDGE, AGENT_SLUG: 'agent-edge' })
  const pubFails = (pub.out.match(/^\s*GAGAL.+$/gm) ?? []).map((s) => s.trim())
  check('publish:edge: tidak ada rute gagal selain deviasi yang sudah tercatat (pengantar-defi tanpa manifest)',
    pubFails.every((l) => /pengantar-defi-2026/.test(l)) && /PUBLISH HIJAU/.test(pub.out), pubFails.slice(0, 3).join(' | ') || pub.out.split('\n').slice(-3).join(' '))

  head('8. dibaca dari host publik: kertas + dokumen hasil')
  let served = null
  let servedCred = null
  for (let i = 0; i < 12 && !(served && servedCred); i++) {
    await new Promise((r) => setTimeout(r, 2000))
    try {
      const r = await fetch(`${EDGE}/results/${COURSE}/${credentialHash}`, { signal: AbortSignal.timeout(30_000) })
      if (r.ok) served = await r.json()
      const c = await fetch(`${EDGE}/credentials/${credentialHash}`, { signal: AbortSignal.timeout(30_000) })
      if (c.ok) servedCred = await c.json()
    } catch { /* tepi belum menyala di hash ini */ }
  }
  check('kertas dan dokumen hasilnya terhidang dari tepi', Boolean(served && servedCred), `${EDGE}/results/${COURSE}/${credentialHash.slice(0, 12)}…`)
  if (served && servedCred) {
    check('id kertas menunjuk host publik (B51)', String(servedCred.id ?? '').startsWith(EDGE), servedCred.id)
    check(`dokumen hasil: esai = ${judged.total} (angka otak yang disahkan), rubrik = rubricHash kursus`,
      Number(served.evidence?.essayScore) === judged.total && served.rubric?.hash === rubricHashOf(manifest), json({ esai: served.evidence?.essayScore, rubrik: served.rubric?.hash }))
    const g = served.grader?.detail?.find((d) => d.kind === 'esai') ?? served.grader?.detail?.[0]
    check(`dokumen hasil menyebut penilainya: agen #${GRADER_ID}, model ${BRAIN_NAME}, label ${LABEL}`,
      served.grader?.type === 'stored-attempt-judge' && served.grader?.model === BRAIN_NAME && g?.agentId === GRADER_ID && g?.difficultyLabel === LABEL, json(served.grader))
    const rv = served.attempts?.reviews?.[0]
    check(`dokumen hasil menyebut pengesahnya: agen #${REVIEWER_ID}, approved, usulan = akhir`,
      rv?.decision === 'approved' && rv?.reviewer === reviewerWallet.address && rv?.reviewerAgentId === REVIEWER_ID && rv?.proposed === judged.total && rv?.finalScore === judged.total, json(rv))
    check('B145: kalimat metode menyebut "disahkan agen pengesah #2542", bukan "disahkan manusia"',
      String(served.method ?? '').includes(`disahkan agen pengesah #${REVIEWER_ID}`) && !String(served.method ?? '').includes('disahkan manusia'), served.method)
    check('tanpa teks esai dan tanpa kunci jawaban di dokumen hasil', served.evidence?.essayTextIncluded === false && !JSON.stringify(served).includes('"answer"') && !JSON.stringify(served).includes(ESSAY.slice(0, 40)))
    check(`keputusan dokumen hasil: ${served.verdict} (${served.result})`, served.verdict !== null && served.result !== null, json({ verdict: served.verdict, result: served.result }))
  }
} catch (e) {
  check('lintasan selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

head('9. bersih-bersih (kueri ulang)')
try {
  await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&origin=eq.test`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const brainLeft = await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&limit=0`, { headers: { prefer: 'count=exact' } })
  check(`otak #${GRADER_ID} (origin=test) dihapus, sisa 0 — verify:agents tetap menilai #${GRADER_ID} dengan nama model harness`, brainLeft.total === 0, `sisa ${brainLeft.total}`)
  if (hireCreated) await pg(`/agent_hires?course_id=eq.${COURSE}&agent_id=eq.${GRADER_ID}&hired_by=eq.${publisher.address}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  if (roleCreated) await pg(`/review_roles?course_id=eq.${COURSE}&agent_id=eq.${REVIEWER_ID}&added_by=eq.${publisher.address}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const hireLeft = await pg(`/agent_hires?course_id=eq.${COURSE}&agent_id=eq.${GRADER_ID}&limit=0`, { headers: { prefer: 'count=exact' } })
  const roleLeft = await pg(`/review_roles?course_id=eq.${COURSE}&agent_id=eq.${REVIEWER_ID}&limit=0`, { headers: { prefer: 'count=exact' } })
  check(`sewa #${GRADER_ID} + penunjukan #${REVIEWER_ID} di ${COURSE} kembali ke keadaan sebelum run`,
    hireLeft.total === (hireCreated ? 0 : 1) && roleLeft.total === (roleCreated ? 0 : 1), `sewa ${hireLeft.total} · penunjukan ${roleLeft.total}`)
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nOTAK SAMPAI KERTAS ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
console.log(`  peserta   : ${learner.address}`)
console.log(`  kertas    : ${credentialHash}`)
console.log(`  dokumen   : ${EDGE}/credentials/${credentialHash}`)
if (attemptId) console.log(`  usaha esai: ${attemptId}${proposal ? ` · usulan ${proposal.total}` : ''}`)
console.log('  ⚠ baris peserta + tagihan agen + kertas ini TETAP ADA setelah run (B78), seperti verify:attempts:live.')
process.exit(failed === 0 ? 0 : 1)
