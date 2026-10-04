// Lencana-B135 status=TERBUKA 2026-10-03 — harness otak agen: prompt satu sumber (isi = versi 24 Sep), salinan fixture kalibrasi, aturan kalibrasi, adaptor tujuh provider dengan fetch tiruan, rute otak + antrean + penilaian atas nama model otak lewat HTTP, dan (--live) kalibrasi sungguhan Groq lewat adaptor peramban. Buktikan ulang: npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:brain` — otak agen semi-otomatis (B135, D69). Tanpa kunci LLM dan tanpa gas.
 *
 *   A. satu sumber: `judge.js` memakai `web/src/judge-prompt.ts` dan isi prompt = versi 24 Sep (sha256 teks yang dipindah
 *      dari `judge.js` komit 7edaf07); salinan fixture di `calibration.ts` = `signer/fixtures`; rubrik kalibrasi = rubrik
 *      `npm run judge`; aturan kalibrasi (kontrol negatif, kontrol positif, pembeda); pengurai nilai model; antrean murni;
 *   B. adaptor tujuh provider (`web/src/llm.ts`) dengan fetch tiruan: URL + header + badan per provider, daftar model
 *      (non-chat disaring, xKiro tanpa kunci, GLM cadangan), chat JSON OpenAI-kompatibel + Anthropic, coba ulang tanpa
 *      parameter yang ditolak (temperature → dilaporkan null), 401/429 → pesan yang benar, kunci tidak pernah di URL;
 *   C. HTTP (server sendiri, origin=test): rute otak, dasbor memuat otak, rute antrean dompet agen, penilaian atas nama
 *      model lain ditolak tanpa efek, atas nama model otak diterima, esai keluar dari antrean;
 *   D. --live: Groq (GROQ_API_KEY dari app/.env, tidak pernah dicetak) — daftar model + kalibrasi sungguhan lewat adaptor
 *      peramban; daftar model xKiro publik.
 *
 * Agen dan kunci (semua dari app/.env): penilai #2534 — pemilik AGENT_OWNER, dompet AGENT_GRADER; reviewer #2542 — dompet
 * AGENT_REVIEWER; penerbit ISSUER (menyewa). Baris otak #2534 dihapus di akhir: `verify:agents` menilai #2534 dengan nama
 * model harness, dan otak yang tertinggal akan menolaknya (409). Peserta uji ber-origin=test dibersihkan `npm run cleanup`
 * (tagihannya ikut terhapus kaskade), sama dengan verify:agents.
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { parseBrainMessage, queueItems, MODEL_ID } from '../src/brain.js'
import { essayLesson } from '../src/quiz.js'
import { manifestOf } from '../../web/src/manifest-keys.ts'
import { findCourse, findLesson } from '../../web/src/courses/index.ts'
import { JUDGE_SYSTEM, judgeUserContent, scoresFromModel } from '../../web/src/judge-prompt.ts'
import { LLM_PROVIDERS, PROVIDER_IDS, listModels, chatJson, judgeEssayWith, judgeModelName } from '../../web/src/llm.ts'
import {
  CALIBRATION_SUBSTANTIVE, CALIBRATION_HOLLOW, CALIBRATION_COURSE, CALIBRATION_LESSON, calibrationSetup, judgeCalibration, runCalibration,
} from '../../web/src/calibration.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')
await loadFileEnvReport('verify:brain')
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
const sha = (s) => createHash('sha256').update(s).digest('hex')
const throwsWith = async (fn, re) => { try { await fn(); return 'tidak melempar' } catch (e) { return re.test(String(e?.message ?? e)) ? true : String(e?.message ?? e) } }

/** sha256 teks prompt penilai 24 Sep — dihitung dari `SYSTEM` di `signer/src/judge.js` komit 7edaf07 saat dipindah (3 Okt). */
const PROMPT_SHA = 'd852979f837f83f607f1acd152a1a00ee7a96d0aacd610254a26c7cf56e022b4'

/* ================================================================== A. satu sumber, fixture, aturan */
console.log('\n— A. prompt satu sumber, fixture kalibrasi, aturan')
const judgeSrc = readFileSync(join(SIGNER, 'src', 'judge.js'), 'utf8')
check('judge.js memakai prompt + pengurai dari web/src/judge-prompt.ts (tidak menyimpan salinannya sendiri)',
  judgeSrc.includes("import { JUDGE_SYSTEM, judgeUserContent, scoresFromModel } from '../../web/src/judge-prompt.ts'")
  && !judgeSrc.includes('Kamu adalah penilai rubrik') && !/function parseJsonLoose/.test(judgeSrc))
check(`isi prompt = versi 24 Sep yang diukur judge-check/judge-variance (sha256 ${PROMPT_SHA.slice(0, 12)}…)`, sha(JUDGE_SYSTEM) === PROMPT_SHA, sha(JUDGE_SYSTEM))
const fx = (f) => readFileSync(join(SIGNER, 'fixtures', f), 'utf8').replace(/\r\n/g, '\n')
check('salinan esai substantif di calibration.ts = signer/fixtures/essai-230-kata.md (persis, setelah CRLF→LF)', CALIBRATION_SUBSTANTIVE === fx('essai-230-kata.md'))
check('salinan esai fasih-tapi-kosong = signer/fixtures/essai-fasih-tapi-kosong.md (persis)', CALIBRATION_HOLLOW === fx('essai-fasih-tapi-kosong.md'))
const calCourse = findCourse('web3-dasar-2026')
const judgeCheckLesson = findLesson(calCourse, 'esai-batas-bukti').lesson
const setup = calibrationSetup()
check(`rubrik + nilai lulus kalibrasi = yang dipakai npm run judge (${CALIBRATION_COURSE}/${CALIBRATION_LESSON}, lulus ${setup.passMark})`,
  json(setup.essay.rubric) === json(judgeCheckLesson.essay.rubric) && setup.passMark === calCourse.passMark && setup.essay.prompt === judgeCheckLesson.essay.prompt)
const rules = [
  [[96, 4], true, ''], [[96, 75], false, 'kontrol negatif'], [[60, 4], false, 'kontrol positif'], [[70, 69], true, ''], [[70, 70], false, 'kontrol negatif'],
]
check('aturan: (96,4) lulus · kosong 75 gagal kontrol negatif · substantif 60 gagal kontrol positif · (70,69) lulus · (70,70) gagal',
  rules.every(([[s, hh], pass, why]) => { const r = judgeCalibration(s, hh, 70); return r.pass === pass && (!why || r.reasons.some((x) => x.includes(why))) }),
  json(rules.map(([[s, hh]]) => judgeCalibration(s, hh, 70))))
const byText = (sub, hol) => async (_e, t) => (t === CALIBRATION_SUBSTANTIVE ? sub : t === CALIBRATION_HOLLOW ? hol : NaN)
const calGood = await runCalibration(byText(91, 3))
const calLenient = await runCalibration(byText(94, 92))
const calHarsh = await runCalibration(byText(30, 2))
check('runCalibration: penilai yang membedakan lulus; penilai murah hati (semua ±90) gagal; penilai pelit (substantif 30) gagal',
  calGood.pass && !calLenient.pass && !calHarsh.pass && calLenient.reasons.some((x) => x.includes('kontrol negatif')) && calHarsh.reasons.some((x) => x.includes('kontrol positif')),
  json({ calGood, calLenient, calHarsh }))
const user = JSON.parse(judgeUserContent(setup.essay, 'teks'))
check('pesan pengguna: rubrik {label,max} + tugas + yang_tidak_diterima + tulisan (bentuk 24 Sep)',
  json(Object.keys(user)) === json(['rubrik', 'tugas', 'yang_tidak_diterima', 'tulisan']) && user.rubrik.length === setup.essay.rubric.length && user.tulisan === 'teks')
const allScores = Object.fromEntries(setup.essay.rubric.map((r) => [r.label, r.max]))
check('pengurai: JSON dibungkus prosa tetap terbaca; angka dijepit ke 0..max dan dibulatkan',
  json(scoresFromModel(`Berikut: {"scores": ${json({ ...allScores, [setup.essay.rubric[0].label]: 999, [setup.essay.rubric[1].label]: 3.6 })}} selesai`, setup.essay))
  === json({ ...allScores, [setup.essay.rubric[0].label]: setup.essay.rubric[0].max, [setup.essay.rubric[1].label]: 4 }))
const missing = { ...allScores }
delete missing[setup.essay.rubric[2].label]
check('pengurai: kriteria yang hilang → berhenti (tidak diisi nol, tidak diisi rata-rata)', await throwsWith(() => scoresFromModel(json({ scores: missing }), setup.essay), /tidak dinilai model/) === true)
const okMsg = parseBrainMessage('lencana-agent-brain agent=2534 provider=anthropic model=claude-sonnet-4-5 sub=88 empty=5 temp=none nonce=0123456789abcdef')
check('pesan otak: tujuh provider saja, ID model tanpa spasi/markup, temp=none → null',
  okMsg?.provider === 'anthropic' && okMsg.temperature === null && okMsg.substantive === 88
  && parseBrainMessage('lencana-agent-brain agent=2534 provider=xai model=grok-4 sub=88 empty=5 temp=0 nonce=0123456789abcdef') === null
  && parseBrainMessage('lencana-agent-brain agent=2534 provider=groq model=a<b sub=88 empty=5 temp=0 nonce=0123456789abcdef') === null
  && MODEL_ID.test('openai/gpt-oss-120b') && !MODEL_ID.test('x y'), json(okMsg))
const OP = '0x00000000000000000000000000000000000000Bb'
const lessonSlug = 'esai-batas-bukti'
const qi = queueItems({
  pending: [
    { attempt_id: 11, course_id: 'web3-dasar-2026', lesson_key: lessonSlug, learner: '0x00000000000000000000000000000000000000aa', body: 'teks peserta', words: 2, attempts: { attempt_no: 3 } },
    { attempt_id: 12, course_id: 'web3-dasar-2026', lesson_key: lessonSlug, learner: OP.toLowerCase(), body: 'tulisan operator sendiri', words: 3 },
    { attempt_id: 13, course_id: 'kursus-yang-tidak-ada', lesson_key: 'x', learner: '0x00000000000000000000000000000000000000cc', body: 'kursus hilang' },
  ],
  exclude: [OP, null], essayOf: essayLesson,
})
check('antrean (murni): esai milik operator agen tidak masuk, kursus yang tidak ada dilewati, alamat peserta tidak ikut',
  qi.length === 1 && qi[0].attemptId === 11 && qi[0].attemptNo === 3 && !('learner' in qi[0]) && qi[0].passMark === 70 && qi[0].essay.rubric.length === setup.essay.rubric.length, json(qi))

/* ================================================================== B. adaptor tujuh provider (fetch tiruan) */
console.log('\n— B. adaptor provider dengan fetch tiruan (tanpa jaringan, tanpa kunci)')
const respond = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : json(body), { status, headers: { 'content-type': 'application/json', ...headers } })
/** fetch tiruan: `handler(i, url, init)` → Response; setiap panggilan dicatat (url, header, badan). */
const mock = (handler) => {
  const calls = []
  const f = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', headers: { ...(init.headers ?? {}) }, body: init.body ? JSON.parse(init.body) : null })
    return handler(calls.length - 1, String(url), init)
  }
  f.calls = calls
  return f
}
const essay = setup.essay
const goodScores = Object.fromEntries(essay.rubric.map((r) => [r.label, Math.round(r.max * 0.8)]))
const goodTotal = Object.values(goodScores).reduce((a, b) => a + b, 0)
const chatReply = (p, text) => (LLM_PROVIDERS[p].style === 'anthropic'
  ? { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text }], usage: {} }
  : { choices: [{ message: { content: text } }] })

for (const id of PROVIDER_IDS) {
  const p = LLM_PROVIDERS[id]
  const KEY = `sk-uji-${id}-RAHASIA`
  const authOk = (h) => (p.style === 'anthropic'
    ? h['x-api-key'] === KEY && h['anthropic-version'] === '2023-06-01' && h['anthropic-dangerous-direct-browser-access'] === 'true' && !h.authorization
    : h.authorization === `Bearer ${KEY}` && !h['x-api-key'])
  // daftar model
  const lm = mock(() => (id === 'glm'
    ? respond(404, { error: 'not found' })
    : respond(200, p.style === 'anthropic'
      ? { data: [{ id: 'claude-uji-1', display_name: 'Claude Uji' }, { id: 'claude-uji-2', display_name: 'Claude Uji 2' }] }
      // `canopylabs/orpheus-*` = model TTS di daftar Groq sungguhan (terlihat di uji peramban T68, 4 Okt) — bukan model chat.
      : { data: [{ id: 'chat-b', context_length: 131072 }, { id: 'text-embedding-3-large' }, { id: 'whisper-large-v3' }, { id: 'chat-a' }, { id: 'llama-guard-4' }, { id: 'canopylabs/orpheus-v1-english' }] })))
  const models = await listModels(id, KEY, lm)
  const want = id === 'glm' ? p.fallback : p.style === 'anthropic' ? ['claude-uji-1', 'claude-uji-2'] : ['chat-a', 'chat-b']
  check(`${p.label}: GET ${p.base}${p.modelsPath} dengan header kunci yang benar → ${id === 'glm' ? 'daftar cadangan (endpoint 404)' : 'model chat saja, urut'}`,
    lm.calls[0]?.url === `${p.base}${p.modelsPath}` && authOk(lm.calls[0].headers) && json(models.models.map((m) => m.id)) === json(want)
    && models.source === (id === 'glm' ? 'fallback' : 'endpoint') && !lm.calls[0].url.includes(KEY),
    json({ url: lm.calls[0]?.url, models: models.models.map((m) => m.id), source: models.source }))
  // chat JSON + penilaian
  const ch = mock(() => respond(200, chatReply(id, `{"scores": ${json(goodScores)}}`)))
  const j = await judgeEssayWith(id, KEY, 'model-uji', essay, 'tulisan uji', ch)
  const c0 = ch.calls[0]
  const body = c0?.body ?? {}
  const shapeOk = p.style === 'anthropic'
    ? c0.url === `${p.base}/messages` && body.system === JUDGE_SYSTEM && body.messages?.[0]?.role === 'user' && body.messages[0].content === judgeUserContent(essay, 'tulisan uji') && body.max_tokens > 0
    : c0.url === `${p.base}/chat/completions` && body.messages?.[0]?.role === 'system' && body.messages[0].content === JUDGE_SYSTEM && body.messages[1]?.content === judgeUserContent(essay, 'tulisan uji')
      && (p.jsonMode ? body.response_format?.type === 'json_object' : body.response_format === undefined)
  check(`${p.label}: POST ${p.style === 'anthropic' ? '/messages' : '/chat/completions'} — prompt satu sumber, model, temperature 0${p.jsonMode ? ', json_object' : ''}; total ${goodTotal}`,
    c0.method === 'POST' && authOk(c0.headers) && shapeOk && body.model === 'model-uji' && body.temperature === 0 && j.total === goodTotal && j.temperature === 0 && !c0.url.includes(KEY),
    json({ url: c0?.url, keys: Object.keys(body), total: j.total }))
}
const xk = mock(() => respond(200, { data: [{ id: 'anthropic/claude-sonnet-4.5' }] }))
const xkm = await listModels('xkiro', null, xk)
check('xKiro: daftar model publik dibaca TANPA kunci (tidak ada header kunci terkirim)', xkm.models.length === 1 && !xk.calls[0].headers.authorization && !xk.calls[0].headers['x-api-key'])
check('provider lain tanpa kunci → "isi API key dulu" (tidak ada permintaan)', await throwsWith(() => listModels('openai', null, mock(() => respond(200, {}))), /isi API key dulu/) === true)
const tempRetry = mock((i) => (i === 0 ? respond(400, { error: { message: "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported." } }) : respond(200, chatReply('openai', json({ scores: goodScores })))))
const tr = await judgeEssayWith('openai', 'k', 'o-uji', essay, 't', tempRetry)
check('model yang menolak temperature 0 → dicoba ulang tanpa temperature, dan hasilnya MELAPORKAN temperature null',
  tempRetry.calls.length === 2 && tempRetry.calls[0].body.temperature === 0 && !('temperature' in tempRetry.calls[1].body) && tr.temperature === null, json(tempRetry.calls.map((c) => Object.keys(c.body))))
const tokRetry = mock((i) => (i === 0 ? respond(400, { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead." } }) : respond(200, chatReply('openai', json({ scores: goodScores })))))
await judgeEssayWith('openai', 'k', 'o-uji', essay, 't', tokRetry)
check('model yang menolak max_tokens → dicoba ulang dengan max_completion_tokens', tokRetry.calls.length === 2 && 'max_completion_tokens' in tokRetry.calls[1].body && !('max_tokens' in tokRetry.calls[1].body))
const fmtRetry = mock((i) => (i === 0 ? respond(400, { error: { message: 'response_format json_object is not supported for this model' } }) : respond(200, chatReply('groq', json({ scores: goodScores })))))
await judgeEssayWith('groq', 'k', 'g-uji', essay, 't', fmtRetry)
check('provider yang menolak response_format → dicoba ulang tanpa itu', fmtRetry.calls.length === 2 && !('response_format' in fmtRetry.calls[1].body))
check('401 → "API key ditolak provider" (bukan isi jawaban provider)', await throwsWith(() => judgeEssayWith('deepseek', 'k', 'd', essay, 't', mock(() => respond(401, { error: 'invalid key sk-xxx' }))), /^API key ditolak provider \(HTTP 401\)$/) === true)
check('429 → batas laju + saran tunggu dari retry-after', await throwsWith(() => judgeEssayWith('groq', 'k', 'g', essay, 't', mock(() => respond(429, {}, { 'retry-after': '7' }))), /HTTP 429.*7 detik/) === true)
check('jawaban model tanpa satu kriteria → penilaian berhenti', await throwsWith(() => judgeEssayWith('qwen', 'k', 'q', essay, 't', mock(() => respond(200, chatReply('qwen', json({ scores: missing }))))), /tidak dinilai model/) === true)
check('nama model di penilaian = <provider>/<model> (mis. groq/openai/gpt-oss-120b)', judgeModelName('groq', 'openai/gpt-oss-120b') === 'groq/openai/gpt-oss-120b')

/* ================================================================== C. HTTP */
for (const k of ['SUPABASE_URL', 'RPC_URL', 'ISSUER_PRIVATE_KEY', 'AGENT_OWNER_PRIVATE_KEY', 'AGENT_GRADER_PRIVATE_KEY', 'AGENT_REVIEWER_PRIVATE_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat lapis HTTP, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }
const GRADER_ID = '2534'
const REVIEWER_ID = '2542'
const COURSE = 'web3-dasar-2026'
const MODEL = 'openai/gpt-oss-120b'
const BRAIN_NAME = `groq/${MODEL}`
const owner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const graderWallet = privateKeyToAccount(env.AGENT_GRADER_PRIVATE_KEY)
const reviewerWallet = privateKeyToAccount(env.AGENT_REVIEWER_PRIVATE_KEY)
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const fresh = () => privateKeyToAccount(generatePrivateKey())
const stranger = fresh()
const P = fresh() // memilih Peserta
const learner = fresh() // peserta uji yang menulis esai
const manifest = manifestOf(COURSE)
const lesson = manifest.course.modules.flatMap((m) => m.lessons).find((l) => l.essay?.rubric?.length)

const PORT = Number(env.BRAIN_PROBE_PORT ?? await freePort(8991))
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
const signed = async (account, message, learnerAddr = account.address) => ({ learner: learnerAddr, message, signature: await account.signMessage({ message }) })
const brainMsg = (o = {}) => `lencana-agent-brain agent=${o.agent ?? GRADER_ID} provider=${o.provider ?? 'groq'} model=${o.model ?? MODEL} sub=${o.sub ?? 96} empty=${o.empty ?? 4} temp=${o.temp ?? '0'} nonce=${nonce()}`
const brain = async (acct, msg, learnerAddr) => call('/owner/agents/brain', await signed(acct, msg, learnerAddr))
const queue = async (acct, agentId) => call('/owner/agents/queue', await signed(acct, `lencana-agent-queue agent=${agentId} nonce=${nonce()}`))

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=representation', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30000) })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* bukan JSON */ }
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body }
}
const brainRows = async () => (await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&select=*`)).body ?? []

try {
  // Sisa run yang terputus (baris uji saja) dibersihkan dulu supaya rute dimulai dari "belum ada otak".
  await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&origin=eq.test`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const pre = await brainRows()
  check(`agen #${GRADER_ID} belum punya otak di awal (baris non-uji tidak disentuh; ada = harness berhenti di sini)`, pre.length === 0, json(pre.map((r) => ({ owner: r.owner, model: r.model, origin: r.origin }))))
  if (pre.length) throw new Error('otak non-uji tercatat untuk #2534 — tidak ditimpa harness')

  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— C1. rute otak: POST /owner/agents/brain (pemilik menurut ownerOf, tanpa API key)')
  const b400 = await brain(owner, brainMsg({ provider: 'xai' }))
  check('provider di luar tujuh → 400 dengan bentuk pesan yang benar', b400.status === 400 && /lencana-agent-brain/.test(b400.body?.error ?? ''), b400.text.slice(0, 160))
  const b401 = await brain(stranger, brainMsg(), owner.address)
  check('pesan atas nama pemilik ditandatangani kunci lain → 401', b401.status === 401, b401.text.slice(0, 160))
  const b403 = await brain(stranger, brainMsg())
  check(`akun yang bukan pemilik #${GRADER_ID} → 403`, b403.status === 403 && /does not own/.test(b403.body?.error ?? ''), b403.text.slice(0, 160))
  const cP = await call('/me/role', { role: 'learner', ...await signed(P, `lencana-role role=learner nonce=${nonce()}`) })
  check('akun P memilih Peserta → 201', cP.status === 201, cP.text.slice(0, 120))
  const bP = await brain(P, brainMsg())
  check('akun Peserta mencatat otak → 403 karena perannya (B131)', bP.status === 403 && /role/.test(bP.body?.error ?? ''), bP.text.slice(0, 160))
  const bNeg = await brain(owner, brainMsg({ empty: 75 }))
  check('kalibrasi yang gagal kontrol negatif (kosong 75) → 422 + alasannya', bNeg.status === 422 && (bNeg.body?.reasons ?? []).some((x) => x.includes('kontrol negatif')), bNeg.text.slice(0, 200))
  const bPos = await brain(owner, brainMsg({ sub: 60 }))
  check('kalibrasi yang gagal kontrol positif (substantif 60) → 422', bPos.status === 422 && (bPos.body?.reasons ?? []).some((x) => x.includes('kontrol positif')), bPos.text.slice(0, 200))
  check('kalibrasi yang gagal TIDAK dicatat (0 baris)', (await brainRows()).length === 0)
  const bBig = await brain(owner, brainMsg({ sub: 101 }))
  check('angka kalibrasi di atas total rubrik (101) → 400', bBig.status === 400, bBig.text.slice(0, 160))
  const bOk = await brain(owner, brainMsg())
  check(`pemilik #${GRADER_ID} mencatat otak ${BRAIN_NAME} (substantif 96, kosong 4, temperature 0) → 201`,
    bOk.status === 201 && bOk.body?.modelName === BRAIN_NAME && bOk.body?.calibration?.passMark === 70 && bOk.body?.calibration?.temperature === 0 && bOk.body?.byCurrentOwner === true, bOk.text.slice(0, 220))
  const rows = await brainRows()
  check('baris otak: kolom yang dijanjikan saja (tanpa kunci), origin=test, pesan bertanda tangan tersimpan',
    rows.length === 1 && json(Object.keys(rows[0]).sort()) === json(['agent_id', 'calibration', 'message', 'model', 'origin', 'owner', 'passed', 'provider', 'signature', 'updated_at'])
    && rows[0].origin === 'test' && rows[0].passed === true && rows[0].message.startsWith('lencana-agent-brain agent=2534 provider=groq'), json(rows[0] && Object.keys(rows[0])))
  const ov = await call('/owner/overview', await signed(owner, `lencana-owner nonce=${nonce()}`))
  const ovAgent = (ov.body?.agents ?? []).find((x) => x.agentId === GRADER_ID)
  check('dasbor pemilik memuat otak agen itu (model + kalibrasi, dicatat pemilik sekarang)', ov.status === 200 && ovAgent?.brain?.modelName === BRAIN_NAME && ovAgent.brain.byCurrentOwner === true && ovAgent.brain.calibration?.substantive === 96, json(ovAgent?.brain ?? ov.text.slice(0, 160)))

  console.log('\n— C2. antrean: POST /owner/agents/queue (dompet agen)')
  const q400 = await call('/owner/agents/queue', await signed(graderWallet, `lencana-agent-queue agent=x nonce=${nonce()}`))
  check('bentuk pesan antrean salah → 400', q400.status === 400, q400.text.slice(0, 120))
  const qOwner = await queue(owner, GRADER_ID)
  check(`pemilik yang BUKAN dompet agen #${GRADER_ID} → 403 (yang membaca esai = yang menandatangani nilainya)`, qOwner.status === 403 && /agentWallet/.test(qOwner.body?.error ?? ''), qOwner.text.slice(0, 160))
  const qNoBrain = await queue(reviewerWallet, REVIEWER_ID)
  check(`agen #${REVIEWER_ID} tanpa otak terkalibrasi → 409`, qNoBrain.status === 409 && /no calibrated brain/.test(qNoBrain.body?.error ?? ''), qNoBrain.text.slice(0, 160))
  const hm = `lencana-agent-hire course=${COURSE} agent=${GRADER_ID} nonce=${nonce()}`
  const hired = await call('/agents/hire', { course: COURSE, agentId: GRADER_ID, publisher: publisher.address, message: hm, signature: await publisher.signMessage({ message: hm }) })
  check(`penerbit menyewa #${GRADER_ID} untuk ${COURSE} (idempoten) → 200`, hired.status === 200, hired.text.slice(0, 160))
  const sign = async (m) => ({ message: m, signature: await learner.signMessage({ message: m }) })
  await call('/enroll', { learner: learner.address, course: COURSE, ...await sign(`lencana-enroll ${COURSE} nonce=${nonce()}`) })
  const essayText = `Karangan uji otak agen ${nonce()}. Alamat 0x1234abcd5678ef90 dan fungsi attestationOf lewat https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/ ; sisanya tidak bisa saya simpulkan dari data publik. `
    + Array.from({ length: 430 }, (_, i) => `kata${i}`).join(' ')
  const sub = await call('/essay', { learner: learner.address, course: COURSE, lesson: lesson.slug, text: essayText, ...await sign(`lencana-essay ${lesson.slug} nonce=${nonce()}`) })
  const attemptId = Number(sub.body?.attemptId)
  check('peserta uji menyerahkan esai → 201, menunggu penilaian', sub.status === 201 && Number.isInteger(attemptId), sub.text.slice(0, 160))
  const q1 = await queue(graderWallet, GRADER_ID)
  const mine = (q1.body?.items ?? []).find((x) => x.attemptId === attemptId)
  check(`dompet agen #${GRADER_ID} membaca antreannya → 200, esai uji ada dengan teks utuh + rubrik penerbit, tanpa alamat peserta`,
    q1.status === 200 && mine?.text === essayText && json(mine.essay.rubric) === json(lesson.essay.rubric.map((r) => ({ label: r.label, max: r.max }))) && mine.passMark === manifest.course.passMark
    && !JSON.stringify(q1.body).toLowerCase().includes(learner.address.toLowerCase().slice(2)) && q1.body?.brain?.modelName === BRAIN_NAME && (q1.body?.courses ?? []).some((c) => c.courseId === COURSE),
    q1.text.slice(0, 220))

  console.log('\n— C3. penilaian atas nama otak (rute B119)')
  const scores = lesson.essay.rubric.map((r) => ({ label: r.label, score: Math.round(Number(r.max) * 0.8) }))
  const total = scores.reduce((n, x) => n + x.score, 0)
  const judge = async (judgeModel) => {
    const m = `lencana-agent-judge attempt=${attemptId} final=${total} label=cukup-berat nonce=${nonce()}`
    return call('/essay/judgement', { agentId: GRADER_ID, course: COURSE, lesson: lesson.slug, attemptId, scores, judgeModel, judgeTemp: 0, message: m, signature: await graderWallet.signMessage({ message: m }) })
  }
  const jOther = await judge('harness:agent-80pct')
  const attemptRow = async () => (await pg(`/attempts?id=eq.${attemptId}&select=judge_model,judge_temp,graded_by_agent,score,difficulty_label`)).body?.[0] ?? null
  const afterOther = await attemptRow()
  check('penilaian atas nama model LAIN dari otak yang tercatat → 409, dan usahanya tidak berubah', jOther.status === 409 && /records its brain/.test(jOther.body?.error ?? '') && afterOther?.judge_model === null && afterOther?.score === null, `${jOther.text.slice(0, 160)} ${json(afterOther)}`)
  const jOk = await judge(BRAIN_NAME)
  check(`penilaian atas nama ${BRAIN_NAME} → 200, usulan ${total}, needsReview, tagihan jatuh tempo`, jOk.status === 200 && Number(jOk.body?.score) === total && jOk.body?.needsReview === true && jOk.body?.charge?.status === 'due', jOk.text.slice(0, 200))
  const row = await attemptRow()
  check('baris usaha mencatat nama model otak, temperature 0, agen pengusul, label', row?.judge_model === BRAIN_NAME && Number(row?.judge_temp) === 0 && String(row?.graded_by_agent) === GRADER_ID && row?.difficulty_label === 'cukup-berat', json(row))
  const q2 = await queue(graderWallet, GRADER_ID)
  check('esai yang sudah dinilai keluar dari antrean', q2.status === 200 && !(q2.body?.items ?? []).some((x) => x.attemptId === attemptId), q2.text.slice(0, 160))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log('\n— C4. bersih-bersih baris uji')
try {
  await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&origin=eq.test`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const left = await pg(`/agent_brains?agent_id=eq.${GRADER_ID}&limit=0`, { headers: { prefer: 'count=exact' } })
  check(`agent_brains #${GRADER_ID}: baris uji dihapus, sisa 0 (kueri ulang) — verify:agents tetap menilai #${GRADER_ID} dengan nama model harness`, left.total === 0, `sisa ${left.total}`)
  const filter = `address=in.(${[P.address, stranger.address].join(',')})&origin=eq.test`
  await pg(`/account_roles?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  const leftRoles = await pg(`/account_roles?${filter}&limit=0`, { headers: { prefer: 'count=exact' } })
  check('account_roles: baris uji dihapus, sisa 0', leftRoles.total === 0, `sisa ${leftRoles.total}`)
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

/* ================================================================== D. --live */
if (LIVE) {
  console.log('\n— D. live: Groq lewat adaptor peramban (kunci dari app/.env, tidak dicetak)')
  const key = env.GROQ_API_KEY
  if (!key) check('GROQ_API_KEY ada di app/.env (prasyarat --live)', false)
  else {
    try {
      const lm = await listModels('groq', key)
      check(`Groq: daftar model dari endpoint memuat ${MODEL} (${lm.models.length} model chat)`, lm.source === 'endpoint' && lm.models.some((m) => m.id === MODEL), lm.models.length)
      let temp = 0
      const res = await runCalibration(async (e, t) => { const r = await judgeEssayWith('groq', key, MODEL, e, t); if (r.temperature === null) temp = null; return r.total })
      console.log(`        substantif=${res.substantive} kosong=${res.hollow} lulus≥${res.passMark} temperature=${temp ?? '—'}`)
      check(`Groq ${MODEL} lulus kalibrasi lewat llm.ts (kosong < ${res.passMark} ≤ substantif)`, res.pass, res.reasons.join('; '))
      const xkLive = await listModels('xkiro', null)
      check(`xKiro: daftar model publik terbaca tanpa kunci (${xkLive.models.length} model chat)`, xkLive.source === 'endpoint' && xkLive.models.length > 0)
    } catch (e) {
      check('lapis live selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
    }
  }
}

console.log(`\nOTAK AGEN ${LIVE ? 'LIVE ' : ''}${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
