// Lencana-B80 status=SELESAI 2026-10-01 — harness kunci jawaban kuis: kunci lengkap dan hanya di sisi server, rubricHash hitungan = terbit = tepi, bundel browser (JS + source map) bersih dari kunci, dan /grade membalas pembahasan tanpa indeks jawaban. Buktikan ulang: npm run verify:quizkeys. JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:quizkeys` — B80: kunci jawaban kuis tidak lagi sampai ke browser.
 *
 *   npm run verify:quizkeys                              bangun bundel web, pindai, server sendiri (origin=test)
 *   npm run verify:quizkeys -- --deployed=<url halaman>  + pindai bundel yang SEDANG TAYANG di url itu
 *
 * Diukur 1 Okt sebelum perubahan: bundel publik di Vercel memuat 28 dari 28 teks `why` dan 28 literal
 * `answer:<angka>`. Harness ini membaca teks `why` dari manifest berkunci (sisi server) lalu menuntut
 * NOL di bundel, dengan kontrol positif: semua teks soal HARUS ada — kalau tidak, pemindainya buta.
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import {
  MANIFESTS, PUBLIC_MANIFESTS, ANSWER_KEYS, auditAnswerKeys, withAnswerKeys, rubricHashOf, canonicalPolicy, manifestHashOf,
} from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WEB = resolve(SIGNER, '..', 'web')
const DEPLOYED = (process.argv.find((a) => a.startsWith('--deployed=')) ?? '').slice('--deployed='.length) || null
await loadFileEnvReport('verify:quizkeys')
const env = process.env

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const questionsOf = (m) => m.course.modules.flatMap((x) => x.lessons).flatMap((l) => (l.quiz?.questions ?? []).map((q) => ({ ...q, slug: l.slug })))

// Teks yang dicari di bundel: alasan (why) = kunci; soal (prompt) = kontrol positif.
const keyed = MANIFESTS.flatMap(questionsOf)
const WHYS = keyed.map((q) => q.why)
const PROMPTS = keyed.map((q) => q.prompt)
const slice = (t) => t.slice(0, 40)
const inText = (text, t) => text.includes(slice(t)) || text.includes(JSON.stringify(slice(t)).slice(1, -1))
function scan (label, js) {
  const whys = WHYS.filter((t) => inText(js, t)).length
  const prompts = PROMPTS.filter((t) => inText(js, t)).length
  const literals = (js.match(/answer: ?[0-9]/g) ?? []).length
  check(`${label}: teks soal ada di bundel (kontrol positif pemindai) — ${prompts} dari ${PROMPTS.length}`, prompts === PROMPTS.length)
  check(`${label}: teks alasan kunci (why) di bundel — ${whys} dari ${WHYS.length}`, whys === 0)
  check(`${label}: literal answer:<angka> di bundel — ${literals}`, literals === 0)
}

// ===================================================================== A. kunci + hash (Node)
console.log('\n— A. kunci lengkap di sisi server, hash tidak bergeser')
check(`kunci dimuat untuk ${MANIFESTS.length} kursus, ${keyed.length} soal, semuanya berkunci`, keyed.length > 0 && keyed.every((q) => Number.isInteger(q.answer) && q.why?.trim()))
for (const [i, m] of MANIFESTS.entries()) {
  const pub = PUBLIC_MANIFESTS[i]
  check(`${m.course.id}: auditAnswerKeys bersih (tiap soal berkunci, dalam rentang, beralasan, tanpa kunci yatim)`, auditAnswerKeys(pub, ANSWER_KEYS[m.course.id] ?? {}).length === 0)
  check(`${m.course.id}: rubricHash dihitung dari kunci = rubricHash terbit di manifest publik`, rubricHashOf(m) === pub.rubricHash, `${rubricHashOf(m)} vs ${pub.rubricHash}`)
  const pq = questionsOf(pub)
  check(`${m.course.id}: manifest publik (yang dibundel) tanpa answer/why — ${pq.length} soal`, pq.length > 0 && pq.every((q) => q.answer === undefined && q.why === undefined))
  check(`${m.course.id}: rubricHashOf(publik) memakai nilai terbit, bukan menghitung tanpa kunci`, rubricHashOf(pub) === pub.rubricHash)
  let threw = 0
  try { canonicalPolicy(pub) } catch { threw++ }
  try { manifestHashOf(pub) } catch { threw++ }
  check(`${m.course.id}: canonicalPolicy dan manifestHashOf atas manifest publik MELEMPAR (hash tidak berubah diam-diam)`, threw === 2)
  const edge = (env.EDGE_BASE_URL ?? '').replace(/\/$/, '')
  if (edge) {
    const crit = await (await fetch(`${edge}/criteria/${m.course.id}`, { signal: AbortSignal.timeout(30000) })).json().catch(() => null)
    check(`${m.course.id}: rubricHash dokumen criteria di tepi (komitmen publik) = hitungan dari kunci`, crit?.rubricHash === rubricHashOf(m), `${crit?.rubricHash} vs ${rubricHashOf(m)}`)
  }
}
// Kontrol negatif penjaga: kunci yang dirusak harus tertangkap audit dan menggeser hash.
{
  const pub = PUBLIC_MANIFESTS[0]
  const keys = JSON.parse(JSON.stringify(ANSWER_KEYS[pub.course.id]))
  const [slug] = Object.keys(keys)
  const [qid] = Object.keys(keys[slug])
  const flipped = JSON.parse(JSON.stringify(keys))
  flipped[slug][qid].answer = (flipped[slug][qid].answer + 1) % 2
  check('kontrol negatif: satu kunci diubah -> rubricHash hitungan ≠ terbit (penjaga saat dimuat akan menolak)', rubricHashOf(withAnswerKeys(pub, flipped)) !== pub.rubricHash)
  const missing = JSON.parse(JSON.stringify(keys)); delete missing[slug][qid]
  const orphan = JSON.parse(JSON.stringify(keys)); orphan[slug].qTidakAda = { answer: 0, why: 'x' }
  const outOfRange = JSON.parse(JSON.stringify(keys)); outOfRange[slug][qid].answer = 99
  const caught = [missing, orphan, outOfRange].map((k) => auditAnswerKeys(pub, k).length > 0)
  check('kontrol negatif: audit menangkap soal tanpa kunci, kunci yatim, dan kunci di luar rentang', caught.every(Boolean), json(caught))
}

// ===================================================================== B. bundel browser
console.log('\n— B. bundel browser yang dibangun dari kode ini')
const built = spawnSync('npm', ['run', 'build'], { cwd: WEB, shell: true, encoding: 'utf8' })
check('npm run build (web) berhasil', built.status === 0, (built.stdout + built.stderr).slice(-300))
const assets = join(WEB, 'dist', 'assets')
let js = ''
let maps = ''
const mapSources = []
for (const f of readdirSync(assets)) {
  if (f.endsWith('.js')) js += readFileSync(join(assets, f), 'utf8')
  if (f.endsWith('.js.map')) {
    const t = readFileSync(join(assets, f), 'utf8')
    maps += t
    mapSources.push(...(JSON.parse(t).sources ?? []))
  }
}
scan('JS', js)
scan('source map', maps)
check('source map tidak memuat manifest-keys.ts atau berkas *.keys.ts', !mapSources.some((s) => /manifest-keys|\.keys\.ts$/.test(s)), json(mapSources.filter((s) => /keys/.test(s))))
// Penjaga impor: hanya manifest-keys.ts yang boleh mengimpor berkas kunci, dan tidak ada berkas web/src
// lain yang mengimpor manifest-keys.ts (bundel bersih hari ini belum tentu bersih besok).
const SRC = join(WEB, 'src')
const offenders = []
const walk = (d) => {
  for (const n of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, n.name)
    if (n.isDirectory()) walk(p)
    else if (n.name.endsWith('.ts') && n.name !== 'manifest-keys.ts') {
      const t = readFileSync(p, 'utf8')
      if (/from\s+['"][^'"]*(\.keys|manifest-keys)(\.ts)?['"]/.test(t)) offenders.push(p.slice(SRC.length + 1))
    }
  }
}
walk(SRC)
check('tidak ada berkas web/src selain manifest-keys.ts yang mengimpor kunci', offenders.length === 0, json(offenders))

if (DEPLOYED) {
  console.log(`\n— B'. bundel yang sedang tayang di ${DEPLOYED}`)
  const html = await (await fetch(DEPLOYED, { signal: AbortSignal.timeout(30000) })).text()
  const srcs = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => new URL(m[1], DEPLOYED).toString())
  let live = ''
  for (const s of srcs) live += await (await fetch(s, { signal: AbortSignal.timeout(30000) })).text()
  console.log(`  info  ${srcs.join(', ')} (${live.length} byte)`)
  scan('tayang', live)
}

// ===================================================================== C. /grade lewat HTTP
console.log('\n— C. POST /grade: pembahasan sesudah penyerahan, tanpa indeks jawaban')
const PORT = Number(env.QUIZKEYS_PROBE_PORT ?? await freePort(8907))
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
  const em = `lencana-enroll ${m.course.id} nonce=${nonce()}`
  await call('/enroll', { learner: learner.address, course: m.course.id, message: em, signature: await learner.signMessage({ message: em }) })
  // Semua benar kecuali soal pertama — harness memegang kunci karena ia sisi server.
  const picks = lesson.quiz.questions.map((q, i) => ({ itemId: q.id, choice: i === 0 ? (q.answer + 1) % q.options.length : q.answer }))
  const gm = `lencana-grade ${m.course.id} ${lesson.slug} nonce=${nonce()}`
  const g = await call('/grade', { learner: learner.address, course: m.course.id, lesson: lesson.slug, picks, message: gm, signature: await learner.signMessage({ message: gm }) })
  const n = lesson.quiz.questions.length
  check(`/grade ${lesson.slug}: ${n - 1}/${n} benar -> 201, angka dari server`, g.status === 201 && g.body?.correct === n - 1 && g.body?.total === n, g.text.slice(0, 160))
  const rv = g.body?.review ?? []
  check(`review: satu butir per soal (${rv.length}/${n}), benar/salah sesuai pilihan — hanya soal pertama yang salah`,
    rv.length === n && rv.every((r, i) => r.itemId === lesson.quiz.questions[i].id && r.correct === (i !== 0)), json(rv.map((r) => r.correct)))
  check('review membawa alasan untuk tiap soal (pembahasan sesudah penyerahan)', rv.every((r, i) => r.why === lesson.quiz.questions[i].why))
  check('review TIDAK membawa indeks jawaban: kuncinya hanya {itemId, correct, why}', rv.every((r) => json(Object.keys(r).sort()) === json(['correct', 'itemId', 'why'])), json(rv[0]))
  check('balasan /grade tidak memuat field "answer" di mana pun', !/"answer"/.test(g.text))
  const crit = await call(`/criteria/${m.course.id}`)
  check('dokumen criteria tetap tanpa kunci jawaban, dan rubricHash-nya = hitungan dari kunci', crit.status === 200 && !/"answer"/.test(crit.text) && crit.body?.rubricHash === rubricHashOf(m), crit.text.slice(0, 120))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log(`\nKUNCI KUIS ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
