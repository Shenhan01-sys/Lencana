/**
 * `npm run verify:db` — membuktikan state belajar benar-benar hidup di Postgres, lewat HTTP.
 *
 * Kenapa bukan tes unit: yang diuji adalah permukaan yang akan dipanggil front-end — metode, status
 * kode, dan apa yang terjadi saat seseorang mencoba hal nakal. Yang terakhir itu bagian penting:
 * secret key DB melewati RLS, jadi kalau signer tidak memeriksa sendiri siapa yang menulis,
 * "peserta lulus" bisa diisi oleh siapa pun yang bisa mencapai endpoint.
 *
 * Yang diuji, dan kenapa masing-masing ada di daftar ini:
 *   - enroll idempoten            → L8 §C.6 tidak ada guard dobel; dua klik tidak boleh jadi dua baris
 *   - nonce satu kali pakai        → tanda tangan sah bisa dipakai ulang kalau tidak dikunci sekali pakai
 *   - tanda tangan orang lain tolak → identitas penulis harus alamat peserta, bukan alamat yang cantik
 *   - tanpa tanda tangan tolak      → 401, bukan 200 diam-diam
 *   - attempt_hash cocok dengan hitung ulang → hash yang masuk dokumen harus bisa direproduksi barisnya
 *   - usaha tanpa enrollment ditolak → usaha tidak boleh menggantung ke baris yang tidak ada
 *
 * Kebutuhan: SUPABASE_URL + SUPABASE_SECRET_KEY di lingkungan (app/.env).
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { computeAttemptHash, courseGates, dbConfigured, dbMissingReason } from '../src/db.js'

const HERE = dirname(fileURLToPath(import.meta.url))
await loadFileEnvReport('verify:db')
if (!dbConfigured()) {
  console.error(`verify:db berhenti: ${dbMissingReason()}`)
  process.exit(2)
}

const PORT = Number(process.env.DB_PROBE_PORT ?? 8792)
const BASE = `http://127.0.0.1:${PORT}`
const COURSE = 'web3-dasar-2026'

let ran = 0
let fails = 0
function check (name, ok, detail = '') {
  ran += 1
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${!ok ? ` -> ${String(detail).slice(0, 160)}` : ''}`)
  if (!ok) fails += 1
}
function nonce () {
  return Math.random().toString(16).slice(2).padEnd(18, '0').slice(0, 18)
}
function enrollMessage (course = COURSE, n = nonce()) {
  return { message: `lencana-enroll ${course} nonce=${n}`, nonce: n }
}
async function post (path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  let j = null
  try { j = await r.json() } catch { /* bukan JSON */ }
  return { status: r.status, body: j }
}

const child = spawn('npm', ['run', 'serve'], {
  cwd: resolve(HERE, '..'),
  env: { ...process.env, PORT: String(PORT), BASE_URL: BASE },
  // stdout ikut di-pipe, bukan diabaikan. Versi pertama mengabaikan stdout dan meninggalkan
  // errBuf kosong saat server anak gagal — akibatnya "server tidak naik" tidak bisa diagnosis,
  // padahal npm/tsx kerap menulis masalahnya ke stdout lewat cangkang shell.
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
})
let errBuf = ''
child.stdout?.on('data', (d) => { errBuf += d.toString() })
child.stderr?.on('data', (d) => { errBuf += d.toString() })
child.on('error', (e) => { errBuf += `spawn error: ${String(e.message ?? e)}` })

async function waitUp (tries = 24) {
  for (let i = 0; i < tries; i++) {
    try {
      // /healthz BUKAN endpoint cepat: ia membaca chain untuk setiap hash yang dipantau supaya bisa
      // melaporkan `matchesChainNow`. Versi pertama probe ini memberi 2 detik lalu menyerah 60 kali,
      // sehingga "server tidak naik" sebenarnya artinya "aku tidak sabar" — dan errBuf-nya bahkan
      // menampilkan banner server yang sudah hidup di port yang sama.
      const r = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(30_000) })
      if (r.ok) return true
    } catch { /* belum naik, atau masih membaca chain */ }
    await new Promise((res) => setTimeout(res, 1500))
  }
  return false
}

const learner = privateKeyToAccount(generatePrivateKey())
const attacker = privateKeyToAccount(generatePrivateKey())
console.log(`\n  peserta uji: ${learner.address}`)

if (await waitUp()) {
  // 1. enroll pertama
  const m1 = enrollMessage()
  const sig1 = await learner.signMessage({ message: m1.message })
  const first = await post('/enroll', { learner: learner.address, course: COURSE, message: m1.message, signature: sig1 })
  check('POST /enroll dengan tanda tangan peserta -> 200 dan baris dibuat',
    first.status === 200 && first.body?.created === true && Number.isFinite(first.body?.enrollmentId),
    `${first.status} ${JSON.stringify(first.body)}`)

  // 2. replay nonce yang sama
  const replay = await post('/enroll', { learner: learner.address, course: COURSE, message: m1.message, signature: sig1 })
  check('nonce yang sama dipakai ulang -> DITOLAK', replay.status === 401 && /nonce/.test(replay.body?.error ?? ''),
    `${replay.status} ${JSON.stringify(replay.body)}`)

  // 3. idempoten dengan nonce baru
  const m2 = enrollMessage()
  const sig2 = await learner.signMessage({ message: m2.message })
  const again = await post('/enroll', { learner: learner.address, course: COURSE, message: m2.message, signature: sig2 })
  check('enroll ulang (nonce baru) -> baris yang sama, created=false',
    again.status === 200 && again.body?.created === false && again.body?.enrollmentId === first.body?.enrollmentId,
    JSON.stringify(again.body))

  // 4. orang lain menandatangani atas nama peserta
  const m3 = enrollMessage()
  const forged = await attacker.signMessage({ message: m3.message })
  const wrong = await post('/enroll', { learner: learner.address, course: COURSE, message: m3.message, signature: forged })
  check('tanda tangan bukan dari alamat peserta -> DITOLAK', wrong.status === 401 && /bukan dari alamat/.test(wrong.body?.error ?? ''),
    `${wrong.status} ${JSON.stringify(wrong.body)}`)

  // 5. tanpa tanda tangan sama sekali
  const anon = await post('/enroll', { learner: learner.address, course: COURSE })
  check('menulis tanpa tanda tangan -> DITOLAK, bukan 200 diam-diam', anon.status === 401, `${anon.status} ${JSON.stringify(anon.body)}`)

  // 6. usaha sebelum enrollment (peserta kedua, belum enroll).
  // Draf pertama tes ini salah SENDIRI: ia menandatangani pesan "lencana-enroll" lalu mengirim pesan
  // "lencana-attempt", jadi dapat 401 "bukan dari alamat peserta" - ditolak, tapi karena alasan yang
  // salah. Penolakan yang kebetulan benar tidak membuktikan apa pun, jadi pesannya kini ditandatangani
  // sebagaimana dikirim.
  const stranger = privateKeyToAccount(generatePrivateKey())
  const strangerAttemptMsg = `lencana-attempt ${COURSE} nonce=${nonce()}`
  const ss = await stranger.signMessage({ message: strangerAttemptMsg })
  const noEnroll = await post('/attempts', {
    learner: stranger.address, course: COURSE, kind: 'ujian', score: 90,
    message: strangerAttemptMsg, signature: ss,
  })
  check('mencatat usaha tanpa enrollment -> DITOLAK dengan alasan enrollment',
    noEnroll.status === 401 && /enroll/i.test(noEnroll.body?.error ?? ''),
    `${noEnroll.status} ${JSON.stringify(noEnroll.body)}`)

  // 7. usaha sah, dan hash-nya bisa dihitung ulang dari barisnya
  const an = nonce()
  const attemptMessage = `lencana-attempt ${COURSE} nonce=${an}`
  const asig = await learner.signMessage({ message: attemptMessage })
  const att = await post('/attempts', {
    learner: learner.address, course: COURSE, kind: 'ujian', attempt: 1, score: 92, verdict: 'pass',
    rubricHash: '0xdeadbeef', judgeModel: 'probe', judgeTemp: 0,
    deductions: ['tidak ada'], components: [{ itemId: 'q1', score: 100, weight: 40, gradedBy: 'mechanical' }],
    message: attemptMessage, signature: asig,
  })
  check('POST /attempts dengan tanda tangan peserta -> 201 + attemptHash',
    att.status === 201 && /^0x[0-9a-f]{64}$/.test(att.body?.attemptHash ?? ''),
    `${att.status} ${JSON.stringify(att.body)}`)
  const expected = computeAttemptHash({
    learner: learner.address, courseId: COURSE, lessonKey: '-', kind: 'ujian', attemptNo: 1,
    score: 92, rubricHash: '0xdeadbeef',
  })
  check('attempt_hash dari server == hasil hitung ulang dari rekaman (dokumen bisa diaudit)',
    att.body?.attemptHash === expected, `${att.body?.attemptHash} vs ${expected}`)

  // 8. gerbang terbaca terpisah
  const gates = await courseGates(learner.address, COURSE)
  check('course_gates: graded_attempts >= 1 dan best_score terbaca', (gates?.graded_attempts ?? 0) >= 1 && gates?.best_score !== null,
    JSON.stringify(gates))
  // `bool_and` atas NOL baris adalah NULL, bukan false - jadi peserta yang belum punya satu pun
  // lesson_progress menghasilkan `all_lessons_done: null`. Keduanya berarti "belum selesai", tapi
  // siapa pun yang menggabungkannya dengan `=== false` akan meleset. Dites untuk kedua bentuk.
  check('course_gates TIDAK menyamar sebagai selesai: all_lessons_done null/false, bukan true',
    gates?.all_lessons_done === null || gates?.all_lessons_done === false, `all_lessons_done=${gates?.all_lessons_done}`)
  check('dan gerbang keduanya tetap terpisah: graded_attempts >= 1 tapi all_lessons_done bukan true',
    (gates?.graded_attempts ?? 0) >= 1 && gates?.all_lessons_done !== true, JSON.stringify(gates))

  // 9. GET ke DB dengan publishable key tidak boleh bisa membaca (RLS menolak)
  const publicRead = await fetch(`${process.env.SUPABASE_URL}/rest/v1/enrollments?select=*`, {
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY || '', authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY || ''}` },
    signal: AbortSignal.timeout(15_000),
  }).then(async (r) => ({ status: r.status, text: (await r.text()).slice(0, 60) })).catch((e) => ({ status: 0, text: String(e.message) }))
  const publishable = Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)
  if (publishable) {
    check('publishable key TIDAK bisa membaca enrollment (RLS bekerja untuk klien publik)',
      publicRead.status === 200 && publicRead.text.trim() === '[]', `${publicRead.status} ${publicRead.text}`)
  } else {
    // Dilewati dan dihitung sebagai pemeriksaan yang gagal: kalau tidak, pemeriksaan yang tak pernah
    // berjalan akan menyumbang hijau dan jumlah itu akan dikutip sebagai bukti.
    console.log('  info  SUPABASE_PUBLISHABLE_KEY tidak diisi — sisi RLS publik TIDAK diuji di run ini')
    check('pemeriksaan RLS sisi publik dapat dilakukan (isi SUPABASE_PUBLISHABLE_KEY)', false, 'var belum diisi')
  }
} else {
  check('server signer naik', false, errBuf.slice(0, 200))
}

try {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGKILL')
} catch { /* biar OS yang membereskan */ }

console.log(`\n${fails === 0 ? 'DB HIJAU' : 'DB MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
console.log('Yang dijaga: identitas penulis = alamat peserta (bukan siapa pun yang pegang secret key),')
console.log('usaha menempel ke enrollment, dan attempt_hash bisa dihitung ulang dari rekamannya.')
process.exitCode = fails === 0 ? 0 : 1
