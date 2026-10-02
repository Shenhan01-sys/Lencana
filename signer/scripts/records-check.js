// Lencana-B124 status=TERBUKA 2026-10-02 — harness rekaman milik peserta: POST /me/records hanya menjawab pemilik alamat (tanda tangan + nonce sekali-pakai, pesan khusus "lencana-records"), proyeksi tanpa teks esai, peserta lain tidak melihat baris peserta ini. Buktikan ulang: npm run verify:records. JANGAN dibalik/diulang tanpa membuka kembali baris B124 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:records` — rekaman belajar (nilai, usaha, progres) adalah data pribadi: dashboard peserta
 * membacanya lewat `POST /me/records`, dan rute itu hanya menjawab pemilik alamat (B124, RF7 langkah A2).
 *
 * Yang dibuktikan, terhadap server sendiri (origin=test, baris uji dibersihkan `npm run cleanup`):
 *   - jawaban berisi enrollment, ringkasan, dan usaha yang dinilai milik peserta itu — dan tidak lebih;
 *   - tanpa tanda tangan, pesan untuk keperluan lain, tanda tangan kunci lain, dan replay nonce: semuanya ditolak;
 *   - peserta lain yang sah hanya melihat rekamannya sendiri (kosong), bukan rekaman peserta pertama.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { MANIFESTS } from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:records')
const env = process.env
if (!env.SUPABASE_URL || !(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('SUPABASE_URL + secret key belum diisi — prasyarat, bukan kegagalan uji')
  process.exit(2)
}

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const ALLOWED = ['lesson', 'kind', 'attemptNo', 'score', 'verdict', 'gradedByAgent', 'judgeModel', 'at', 'review', 'chainChecked']

const PORT = Number(env.RECORDS_PROBE_PORT ?? await freePort(8957))
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
const records = async (account, learner = account.address) => {
  const message = `lencana-records nonce=${nonce()}`
  return { message, signature: await account.signMessage({ message }), learner }
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  const m = MANIFESTS[0]
  const lesson = m.course.modules.flatMap((x) => x.lessons).find((l) => l.quiz)
  const learner = privateKeyToAccount(generatePrivateKey())
  const stranger = privateKeyToAccount(generatePrivateKey())

  console.log('\n— A. peserta uji: enroll lalu satu kuis dinilai server')
  const em = `lencana-enroll ${m.course.id} nonce=${nonce()}`
  const en = await call('/enroll', { learner: learner.address, course: m.course.id, message: em, signature: await learner.signMessage({ message: em }) })
  check(`enroll ${m.course.id} → 200`, en.status === 200, en.text.slice(0, 160))
  const picks = lesson.quiz.questions.map((q) => ({ itemId: q.id, choice: q.answer }))
  const gm = `lencana-grade ${m.course.id} ${lesson.slug} nonce=${nonce()}`
  const g = await call('/grade', { learner: learner.address, course: m.course.id, lesson: lesson.slug, picks, message: gm, signature: await learner.signMessage({ message: gm }) })
  check(`kuis ${lesson.slug} dinilai server → 201`, g.status === 201, g.text.slice(0, 160))

  console.log('\n— B. POST /me/records: hanya pemilik alamat')
  const noMsg = await call('/me/records', { learner: learner.address })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const unsigned = await call('/me/records', { learner: learner.address, message: `lencana-records nonce=${nonce()}` })
  check('pesan tanpa tanda tangan → 401', unsigned.status === 401, unsigned.text.slice(0, 160))
  const otherPurpose = `lencana-enroll ${m.course.id} nonce=${nonce()}`
  const wrong = await call('/me/records', { learner: learner.address, message: otherPurpose, signature: await learner.signMessage({ message: otherPurpose }) })
  check('tanda tangan sah untuk keperluan lain (enroll) → 400, tidak bisa dipakai membaca rekaman', wrong.status === 400, wrong.text.slice(0, 160))
  const forged = await call('/me/records', await records(stranger, learner.address))
  check('tanda tangan kunci lain atas alamat peserta → 401', forged.status === 401, forged.text.slice(0, 160))

  const req = await records(learner)
  const mine = await call('/me/records', req)
  check('pemilik alamat → 200', mine.status === 200, mine.text.slice(0, 160))
  const courses = mine.body?.courses ?? []
  check('jawaban milik alamat yang menandatangani', mine.body?.learner?.toLowerCase() === learner.address.toLowerCase(), mine.body?.learner)
  check(`tepat satu kursus: ${m.course.id}`, courses.length === 1 && courses[0]?.courseId === m.course.id, json(courses.map((c) => c.courseId)))
  const c0 = courses[0] ?? {}
  check('ringkasan progres ikut (penyebut dari katalog, bukan dari klien)', c0.summary?.lessonsTotal > 0, json(c0.summary))
  const quiz = (c0.attempts ?? []).find((a) => a.kind === 'kuis' && a.lesson === lesson.slug)
  check('usaha kuis tercatat dengan angka dari server', typeof quiz?.score === 'number', json(c0.attempts))
  // B126: tanda praktik-dinilai-chain dipakai perkiraan nilai di dashboard; kuis dinilai mesin penerbit, bukan chain.
  check('usaha kuis bertanda chainChecked=false (dinilai penerbit, bukan chain)', quiz?.chainChecked === false, json(quiz))
  const keys = [...new Set((c0.attempts ?? []).flatMap((a) => Object.keys(a)))]
  check('proyeksi usaha hanya kolom yang diizinkan', keys.every((k) => ALLOWED.includes(k)), json(keys))
  check('tidak ada teks esai atau kunci jawaban di jawaban', !/"body"|"answer"/.test(mine.text), mine.text.slice(0, 160))
  const replay = await call('/me/records', req)
  check('replay pesan + tanda tangan yang sama → 401 (nonce sekali-pakai)', replay.status === 401, replay.text.slice(0, 160))

  console.log('\n— C. peserta lain yang sah tidak melihat rekaman peserta pertama')
  const theirs = await call('/me/records', await records(stranger))
  check('peserta lain → 200 dengan nol kursus', theirs.status === 200 && (theirs.body?.courses ?? []).length === 0, theirs.text.slice(0, 160))
  check('alamat peserta pertama tidak muncul di jawaban peserta lain', !theirs.text.toLowerCase().includes(learner.address.toLowerCase().slice(2)), theirs.text.slice(0, 120))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log(`\nREKAMAN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
