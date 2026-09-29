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
import { attemptsFor, computeAttemptHash, courseGates, dbConfigured, dbMissingReason, usedNonceExists } from '../src/db.js'

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
  // B78: server yang DINYALAKAN probe ini memperkenalkan dirinya sebagai test. Tanpa ini, baris yang
  // ia tulis jatuh ke default 'unknown' dan 'sisa = 0' tetap tidak bisa dibuktikan — klaimku
  // sebelumnya bahwa probe "menumpang server 8787" salah: ia spawn server sendiri di 8792.
  env: { ...process.env, PORT: String(PORT), BASE_URL: BASE, LANCENA_ORIGIN: 'test' },
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
  check('tanda tangan bukan dari alamat peserta -> DITOLAK', wrong.status === 401 && /does not belong/.test(wrong.body?.error ?? ''),
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

  // 9. progres per lesson: state machine ditegakkan, dan gerbang benar-benar bergerak
  const prog = async (lesson, status) => {
    const m = `lencana-progress ${lesson} -> ${status} nonce=${nonce()}`
    const s = await learner.signMessage({ message: m })
    return post('/progress', { learner: learner.address, course: COURSE, lesson, status, position: 1, message: m, signature: s })
  }
  const L1 = 'web3-dasar-2026/m1/l1'
  const jump = await prog(L1, 'completed')
  check('lompat locked -> completed DITOLAK dengan 422 (bukan 401: orangnya benar, urutannya salah)',
    jump.status === 422 && /not allowed/.test(jump.body?.error ?? ''), `${jump.status} ${JSON.stringify(jump.body)}`)
  const step1 = await prog(L1, 'unlocked')
  check('locked -> unlocked diterima', step1.status === 200 && step1.body?.to === 'unlocked', `${step1.status} ${JSON.stringify(step1.body)}`)
  const step2 = await prog(L1, 'completed')
  check('unlocked -> completed diterima', step2.status === 200 && step2.body?.to === 'completed', `${step2.status} ${JSON.stringify(step2.body)}`)
  const noop = await prog(L1, 'completed')
  check('status yang sama dikirim ulang -> noop, bukan baris progres baru',
    noop.status === 200 && noop.body?.noop === true, JSON.stringify(noop.body))
  const summary = await fetch(`${BASE}/progress?learner=${learner.address}&course=${COURSE}`, { signal: AbortSignal.timeout(20_000) })
  const sum = await summary.json().catch(() => null)
  check('GET /progress membaca dari DB: lesson itu completed',
    (sum?.completed ?? []).includes(L1), JSON.stringify(sum).slice(0, 160))
  // this is the bug the view had: 1 completed row out of 19 used to read as "all lessons done".
  check('1 dari 19 lesson TIDAK dibaca sebagai selesai: lessons_total terisi dari katalog, allLessonsDone false',
    sum?.lessonsTotal === 19 && sum?.allLessonsDone === false, JSON.stringify(sum).slice(0, 160))

  // 9b. POST /grade — ANGKA KUIS DIHITUNG SERVER (B72). Yang dikirim klien cuma pilihan; skor yang
  // balik harus bisa direproduksi dari yang dibalikkan server sendiri.
  const crit = await fetch(`${BASE}/criteria/${COURSE}`, { signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null)
  const quiz = crit?.quizzes?.[0]
  if (!quiz?.lesson || !quiz?.questionCount) {
    check('/criteria menyebutkan kuis yang bisa dinilai (butuh lesson + questionCount)', false, JSON.stringify(crit).slice(0, 140))
  } else {
    const picks = Array.from({ length: quiz.questionCount }, (_, i) => ({ itemId: `q${i + 1}`, choice: 0 }))
    const gradePost = async (body) => {
      const m = `lencana-grade ${COURSE} ${quiz.lesson} nonce=${nonce()}`
      const s = await learner.signMessage({ message: m })
      return post('/grade', { learner: learner.address, course: COURSE, lesson: quiz.lesson, picks, message: m, signature: s, ...body })
    }
    const noSig = await post('/grade', { learner: learner.address, course: COURSE, lesson: quiz.lesson, picks })
    check('POST /grade tanpa tanda tangan -> DITOLAK', noSig.status === 401, `${noSig.status} ${JSON.stringify(noSig.body)}`)
    const withScore = await gradePost({ score: 100 })
    check('/grade MENOLAK skor kiriman klien (peserta tidak menilai dirinya sendiri)',
      withScore.status === 400 && /server computes/.test(withScore.body?.error ?? ''), `${withScore.status} ${JSON.stringify(withScore.body)}`)
    const partial = await gradePost({ picks: picks.slice(1) })
    check('picks sebagian -> 422 dan sebabnya menyebut soal yang belum dijawab',
      partial.status === 422 && /unanswered items/.test(partial.body?.error ?? ''), `${partial.status} ${JSON.stringify(partial.body)}`)
    const bogus = await gradePost({ lesson: 'bukan-lesson', picks })
    check('lesson yang bukan kuis -> 422', bogus.status === 400 || bogus.status === 422, `${bogus.status} ${JSON.stringify(bogus.body)}`)
    const g1 = await gradePost({})
    const expectedScore = Math.round((Number(g1.body?.correct ?? 0) / Number(g1.body?.total ?? 1)) * 10000) / 100
    check(`/grade menilai sendiri: ${g1.body?.correct}/${g1.body?.total} benar = ${g1.body?.score} (verdict ${g1.body?.verdict}, ambang ${g1.body?.passPct})`,
      g1.status === 201 && g1.body?.gradedBy === 'server' && Number(g1.body?.score) === expectedScore
      && (g1.body?.verdict === 'pass') === (Number(g1.body?.score) >= Number(g1.body?.passPct)),
      `${g1.status} ${JSON.stringify(g1.body)}`)
    check('jawaban server menyebut jumlah komponen per soal (rincian tersimpan, bukan cuma angka akhir)',
      Number(g1.body?.components) === quiz.questionCount, `${g1.body?.components} vs ${quiz.questionCount}`)
    const repro = computeAttemptHash({
      learner: learner.address, courseId: COURSE, lessonKey: g1.body?.lesson, kind: 'kuis',
      attemptNo: Number(g1.body?.attemptNo), score: Number(g1.body?.score), rubricHash: g1.body?.rubricHash,
    })
    check('attempt_hash dari /grade bisa dihitung ulang KLIEN (audit tidak butuh secret key)',
      repro === g1.body?.attemptHash, `${repro} vs ${g1.body?.attemptHash}`)
    const g2 = await gradePost({})
    check('usaha kedua lesson yang sama -> attempt_no dihitung server (bukan ditimpa)',
      g2.status === 201 && Number(g2.body?.attemptNo) === Number(g1.body?.attemptNo) + 1,
      `${g1.body?.attemptNo} -> ${g2.body?.attemptNo}`)
    const sum2 = await (await fetch(`${BASE}/progress?learner=${learner.address}&course=${COURSE}`, { signal: AbortSignal.timeout(20_000) })).json().catch(() => null)
    check('usaha dinilai lewat /grade ikut terbaca di gerbang (graded_attempts naik)',
      Number(sum2?.gradedAttempts) >= 3, JSON.stringify(sum2).slice(0, 160))
  }

  // 9c. POST /essay + /essay/judgement — penyerahan esai dan penilaiannya oleh PEMERBIT (B81).
  // Yang diuji di mari bukan "rutenya menjawab 200", tapi tiga batas yang bikin klaim bar 7 masih
  // berdiri: teks masuk TANPA angka, angka hanya bisa ditulis oleh kunci penerbit, dan rubrik yang
  // dipakai menilai diambil dari manifest server — bukan dari yang dikirim pemanggil.
  const crit2 = await fetch(`${BASE}/criteria/${COURSE}`, { signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null)
  const es = crit2?.essays?.[0]
  if (!es?.lesson || !es?.rubric?.length) {
    check('/criteria memuat esai + rubrik (sumber label penilaian)', false, JSON.stringify(crit2).slice(0, 120))
  } else {
    const rubricTotal = es.rubric.reduce((n, r) => n + Number(r.maximumScore), 0)
    check(`/criteria: ${es.rubric.length} kriteria, total max ${rubricTotal}, label terbaca publik`,
      rubricTotal === 100 && es.rubric.every((r) => r.label && Number(r.maximumScore) > 0),
      JSON.stringify(es.rubric).slice(0, 140))
    // Teks ini sengaja memenuhi tanda mekanis (>= minWords, 0x…, URL, fungsi, pernyataan batas) —
    // kalau salah satunya tidak terpenuhi, jalur yang diuji jadi "insufficient", bukan antrean.
    const filler = Array.from({ length: 430 }, (_, i) => `kata${i}`).join(' ')
    const essayText = `Verifikasi on-chain terbatas pada klaim yang bisa saya periksa sendiri. Alamat 0x1234abcd5678ef90 dan fungsi attestationOf dipakai lewat https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/ ; sisanya belum bisa saya simpulkan dari data publik.` + ' ' + filler
    const essayPost = async (extra) => {
      const m = `lencana-essay ${es.lesson} nonce=${nonce()}`
      const s = await learner.signMessage({ message: m })
      return post('/essay', { learner: learner.address, course: COURSE, lesson: es.lesson, text: essayText, message: m, signature: s, ...extra })
    }
    const noSig = await post('/essay', { learner: learner.address, course: COURSE, lesson: es.lesson, text: essayText })
    check('POST /essay tanpa tanda tangan -> DITOLAK', noSig.status === 401, `${noSig.status} ${JSON.stringify(noSig.body)}`)
    const withScore = await essayPost({ score: 100 })
    check('/essay MENOLAK angka kiriman klien (yang masuk hanya teks)',
      withScore.status === 400 && /does not accept score/.test(withScore.body?.error ?? ''), `${withScore.status} ${JSON.stringify(withScore.body)}`)
    const withRubric = await essayPost({ rubric: [{ label: 'kemudahan', max: 100 }] })
    check('/essay MENOLAK rubrik kiriman klien (kriteria milik penerbit)',
      withRubric.status === 400 && /does not accept rubric/.test(withRubric.body?.error ?? ''), `${withRubric.status} ${JSON.stringify(withRubric.body)}`)
    const notEssay = await post('/essay', { learner: learner.address, course: COURSE, lesson: 'bukan-esai', text: essayText })
    check('lesson tanpa rubrik esai -> 400, bukan 201 kosong', notEssay.status === 400, `${notEssay.status} ${JSON.stringify(notEssay.body)}`)

    // Keadaan SEBELUM menyerahkan, supaya "tidak menambah usaha dinilai" bisa dibandingkan dengan
    // baris yang sama — bukan dengan angka yang saya ingat dari bagian probe di atas.
    const gatesPre = await courseGates(learner.address, COURSE)
    const submitted = await essayPost({})
    check(`POST /essay -> 201 state ${submitted.body?.state}, skor NULL, verdict incomplete`,
      submitted.status === 201 && submitted.body?.state === 'awaiting_judge' && submitted.body?.score === null
      && submitted.body?.verdict === 'incomplete' && Number(submitted.body?.mechanicalPassed) >= 1,
      `${submitted.status} ${JSON.stringify(submitted.body).slice(0, 170)}`)
    const attemptId = Number(submitted.body?.attemptId)
    const preHash = String(submitted.body?.attemptHash ?? '')
    const gatesMid = await courseGates(learner.address, COURSE)
    check('esai yang belum dinilai TIDAK menambah usaha dinilai (ungraded ≠ 0, bar 6)',
      Number(gatesMid?.graded_attempts) === Number(gatesPre?.graded_attempts)
      && String(gatesMid?.best_score) === String(gatesPre?.best_score),
      JSON.stringify({ sebelum: gatesPre?.graded_attempts, sesudah: gatesMid?.graded_attempts, best: gatesMid?.best_score }))

    const issuerKey = process.env.ISSUER_PRIVATE_KEY
    const issuerAddr = process.env.ISSUER_ADDRESS
    if (!issuerKey || !issuerAddr) {
      check('ISSUER_PRIVATE_KEY + ISSUER_ADDRESS tersedia (jalur penilaian penerbit tidak bisa diuji tanpa itu)', false,
        `ISSUER_ADDRESS=${issuerAddr ?? '(kosong)'}`)
    } else {
      const issuer = privateKeyToAccount(issuerKey)
      check('kunci penerbit di .env cocok dengan ISSUER_ADDRESS', issuer.address.toLowerCase() === String(issuerAddr).toLowerCase(),
        `${issuer.address} vs ${issuerAddr}`)
      const judgePost = async (acct, body) => {
        const m = `lencana-essay-judge ${preHash} nonce=${nonce()}`
        const s = await acct.signMessage({ message: m })
        return post('/essay/judgement', {
          issuer: acct.address, course: COURSE, lesson: es.lesson, attemptId,
          scores: es.rubric.map((r) => ({ label: r.label, score: r.maximumScore })), message: m, signature: s, ...body,
        })
      }
      const stranger = privateKeyToAccount(generatePrivateKey())
      const byStranger = await judgePost(stranger, {})
      check('penilaian dengan kunci selisih -> DITOLAK 401', byStranger.status === 401, `${byStranger.status} ${JSON.stringify(byStranger.body)}`)
      const byWrongIssuer = await judgePost(issuer, { issuer: stranger.address })
      check('penilaian atas nama alamat selain penerbit yang dikonfigurasi -> DITOLAK', byWrongIssuer.status === 401,
        `${byWrongIssuer.status} ${JSON.stringify(byWrongIssuer.body)}`)
      const wrongLabels = await post('/essay/judgement', {
        issuer: issuer.address, course: COURSE, lesson: es.lesson, attemptId,
        scores: [{ label: 'kemudahan memberi nilai', score: 100 }],
        message: `lencana-essay-judge ${preHash} nonce=${nonce()}`,
        signature: await issuer.signMessage({ message: 'x' }),
      })
      // (pesan di atas sengaja tidak cocok dengan nonce-nya -> 401 lebih dulu; kriteria asing diuji
      // terpisah lewat jalur yang sah di bawah ini supaya sebabnya tidak tertukar.)
      check('penilaian dengan pesan tidak sah -> DITOLAK (sebab otentikasi, bukan kriteria)', wrongLabels.status === 401,
        `${wrongLabels.status} ${JSON.stringify(wrongLabels.body)}`)
      const asingMsg = `lencana-essay-judge ${preHash} nonce=${nonce()}`
      const asing = await post('/essay/judgement', {
        issuer: issuer.address, course: COURSE, lesson: es.lesson, attemptId,
        scores: [{ label: 'kemudahan memberi nilai', score: 100 }],
        message: asingMsg, signature: await issuer.signMessage({ message: asingMsg }),
      })
      check('kriteria yang bukan milik rubrik penerbit -> 422 dan disebut namanya',
        asing.status === 422 && /foreign criteria/.test(asing.body?.error ?? ''), `${asing.status} ${JSON.stringify(asing.body)}`)
      const partialMsg = `lencana-essay-judge ${preHash} nonce=${nonce()}`
      const partial = await post('/essay/judgement', {
        issuer: issuer.address, course: COURSE, lesson: es.lesson, attemptId,
        scores: es.rubric.slice(1).map((r) => ({ label: r.label, score: r.maximumScore })),
        message: partialMsg, signature: await issuer.signMessage({ message: partialMsg }),
      })
      check('rubrik yang hanya sebagian dinilai -> DITOLAK (sebagian ≠ angka akhir)', partial.status === 422,
        `${partial.status} ${JSON.stringify(partial.body)}`)

      const fullMsg = `lencana-essay-judge ${preHash} nonce=${nonce()}`
      const judged = await post('/essay/judgement', {
        issuer: issuer.address, course: COURSE, lesson: es.lesson, attemptId,
        scores: es.rubric.map((r) => ({ label: r.label, score: r.maximumScore })),
        message: fullMsg, signature: await issuer.signMessage({ message: fullMsg }),
      })
      check('penilaian sah oleh kunci penerbit -> 200, skor 100, verdict pass',
        judged.status === 200 && Number(judged.body?.score) === 100 && judged.body?.verdict === 'pass'
        && Number(judged.body?.components) === es.rubric.length, `${judged.status} ${JSON.stringify(judged.body)}`)
      const newHash = String(judged.body?.attemptHash ?? '')
      check('hash baru = hasil hitung ulang baris yang sudah dinilai, dan hash lama dilaporkan tergantikan',
        newHash !== preHash && computeAttemptHash({
          learner: learner.address, courseId: COURSE, lessonKey: es.lesson, kind: 'esai',
          attemptNo: Number(submitted.body?.attemptNo), score: 100, rubricHash: crit2.rubricHash,
        }) === newHash && judged.body?.replacedHash === preHash, `${preHash.slice(0, 12)}… -> ${newHash.slice(0, 12)}…`)
      const gatesAfter = await courseGates(learner.address, COURSE)
      check('setelah dinilai, usaha esai ikut terbaca gerbang (best_score naik ke 100)',
        Number(gatesAfter?.best_score) === 100 && Number(gatesAfter?.graded_attempts) >= 2,
        JSON.stringify({ graded: gatesAfter?.graded_attempts, best: gatesAfter?.best_score }))
      const replay = await post('/essay/judgement', {
        issuer: issuer.address, course: COURSE, lesson: es.lesson, attemptId,
        scores: es.rubric.map((r) => ({ label: r.label, score: 1 })),
        message: fullMsg, signature: await issuer.signMessage({ message: fullMsg }),
      })
      check('pesan penilaian yang sama tidak bisa dipakai ulang (nonce satu-kali juga mengunci jalur penerbit)',
        replay.status === 401, `${replay.status} ${JSON.stringify(replay.body)}`)
    }
  }

  // 9d. Penjaga bentuk view: `course_gates` pernah menghitung Cartesian product dan tetap hijau
  // karena kolom yang MEMUTUSKAN (max/bool_and) tidak berubah oleh duplikasi baris — yang salah
  // angka yang dibaca peserta (19 × 6 = "114 dari 19 lesson selesai"). Diperbaiki di migrasi 0006;
  // dua pemeriksaan di bawah ini yang membuatnya tidak bisa kembali diam-diam.
  {
    const g = await courseGates(learner.address, COURSE)
    const rows = await attemptsFor(learner.address, COURSE)
    const gradedReal = rows.filter((r) => String(r.verdict ?? 'incomplete') !== 'incomplete').length
    check('lessons_completed TIDAK pernah melampaui lessons_total (penjaga fan-out view)',
      Number(g?.lessons_completed) <= Number(g?.lessons_total),
      JSON.stringify({ completed: g?.lessons_completed, total: g?.lessons_total }))
    check('graded_attempts == jumlah baris attempts yang benar-benar dinilai',
      Number(g?.graded_attempts) === gradedReal, `${g?.graded_attempts} vs ${gradedReal} baris`)
  }

  // 10. nonce memang hidup di database, bukan di Set dalam proses
  const seen = await usedNonceExists(m1.nonce)
  check('nonce enroll pertama tercatat di used_nonces (bertahan melewati restart proses)', seen === true, `nonce=${m1.nonce}`)

  // 10b. B78 — baris yang DITULIS probe ini harus membawa penandanya sendiri.
  // Bukan hiasan: klaim "artefak tes bisa dibersihkan dengan bukti sisa = 0" hanya benar kalau
  // baris tes memang terbedakan. Kita baca balik lewat REST (secret key), jadi yang diuji adalah
  // apa yang ada di DB, bukan apa yang dikira kode kita.
  const originRead = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/enrollments?select=origin,learner,course_id&learner=eq.${learner.address}&course_id=eq.${COURSE}`,
    { headers: { apikey: process.env.SUPABASE_SECRET_KEY || '', authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY || ''}` }, signal: AbortSignal.timeout(15_000) },
  ).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })).catch((e) => ({ status: 0, body: null, err: String(e.message) }))
  if (process.env.SUPABASE_SECRET_KEY) {
    check('enrollment buatan probe tercatat origin=test (penanda B78 ditulis sampai ke DB)',
      originRead.status === 200 && Array.isArray(originRead.body) && originRead.body.length === 1 && originRead.body[0].origin === 'test',
      `${originRead.status} ${JSON.stringify(originRead.body ?? originRead.err ?? '').slice(0, 120)}`)
  } else {
    console.log('  info  SUPABASE_SECRET_KEY tidak diisi — penanda origin TIDAK bisa dibaca balik di run ini')
  }

  // 11. GET ke DB dengan publishable key tidak boleh bisa membaca (RLS menolak)
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
