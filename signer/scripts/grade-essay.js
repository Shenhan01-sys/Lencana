/**
 * `npm run grade:essay` — antrean penilaian esai, dijalankan dan ditandatangani PEMERBIT (B81).
 *
 * Kenapa bentuknya CLI dan bukan tombol di halaman: yang berwenang memberi nilai esai adalah
 * institusi penerbit, bukan platform. Otoritas itu di sini diwujudkan dengan cara yang sama seperti
 * di tempat lain di proyek ini — **sebuah kunci**: setiap penilaian yang ditulis ke Postgres membawa
 * tanda tangan EIP-191 atas `attempt_hash` usaha itu, oleh EOA yang sama dengan `ISSUER_ADDRESS`.
 * Kalau suatu saat platform ikut-ik menulis angka, barisnya ditolak `judgeEssay()`.
 *
 * Mode:
 *   (kosong)          daftar antrean saja — tidak membaca model, tidak menulis apa pun
 *   --judge [model]    nilai dengan model (butuh GROQ_API_KEY), lalu TULIS
 *   --scores-file f    nilai dari JSON `{ "<attemptHash>": { "<label kriteria>": angka } }`, lalu TULIS
 *   --dry              dengan --judge/--scores: hitung dan cetak, tapi jangan menulis
 *
 * Yang dicetak setiap baris adalah hash SEBELUM dan SESUDAH. `attempt_hash` adalah sidik jari isi
 * baris, jadi menilai artinya mengubah isi — dan perubahan itu harus terlihat, bukan diam-diam.
 * Karena itu kertas yang terbit sesudahnya menunjuk hash yang baru, dan hash lama tetap tercatat di
 * kolom `replaced` pada keluaran ini.
 */
import { readFile } from 'node:fs/promises'
import { getAddress, keccak256, stringToBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { dbConfigured, dbMissingReason, queuePendingEssays, judgeEssay } from '../src/db.js'
import { essayLesson } from '../src/quiz.js'
import { gradeAgainstRubric } from '../src/grade.js'
import { judgeWithModel, DEFAULT_JUDGE_MODEL } from '../src/judge.js'

await loadFileEnvReport('grade:essay')
const env = process.env
const argv = process.argv.slice(2)
const flag = (name) => argv.indexOf(name)
const COURSE = flag('--course') >= 0 ? argv[flag('--course') + 1] : null
const LIMIT = flag('--limit') >= 0 ? Number(argv[flag('--limit') + 1]) : 20
const DRY = flag('--dry') >= 0
const J = flag('--judge')
const JUDGE_MODEL = J >= 0 ? (argv[J + 1] && !argv[J + 1].startsWith('--') ? argv[J + 1] : DEFAULT_JUDGE_MODEL) : null
const SF = flag('--scores-file')
const SCORES_FILE = SF >= 0 ? argv[SF + 1] : null

if (!dbConfigured()) {
  console.error(`grade:essay berhenti: ${dbMissingReason()}`)
  process.exit(2)
}
if (!JUDGE_MODEL && !SCORES_FILE && !DRY) {
  // tanpa salah satunya, perintah ini cuma menampilkan daftar — dan itu memang mode defaultnya
}
if ((JUDGE_MODEL || SCORES_FILE) && !env.ISSUER_PRIVATE_KEY) {
  console.error('ISSUER_PRIVATE_KEY belum diisi — penilaian harus ditandatangani penerbit, bukan ditulis begitu saja')
  process.exit(2)
}

let manual = {}
if (SCORES_FILE) {
  try {
    manual = JSON.parse(await readFile(SCORES_FILE, 'utf8'))
  } catch (e) {
    console.error(`--scores-file tidak terbaca sebagai JSON: ${String(e.message ?? e).slice(0, 90)}`)
    process.exit(2)
  }
}

const issuer = env.ISSUER_ADDRESS ? getAddress(env.ISSUER_ADDRESS) : null
const account = env.ISSUER_PRIVATE_KEY ? privateKeyToAccount(env.ISSUER_PRIVATE_KEY) : null
if (account && issuer && account.address.toLowerCase() !== issuer.toLowerCase()) {
  console.error(`ISSUER_PRIVATE_KEY (${account.address}) bukan kunci dari ISSUER_ADDRESS (${issuer}) — menolak menulis atas nama penerbit lain`)
  process.exit(2)
}

const queue = await queuePendingEssays(COURSE, LIMIT)
console.log(`\nantrean   : ${queue.length} penyerahan menunggu penilaian${COURSE ? ` (kursus ${COURSE})` : ''}`)
if (!queue.length) { console.log('kosong — tidak ada yang dinilai.\n'); process.exit(0) }

let wrote = 0
let skipped = 0
for (const s of queue) {
  const attemptHash = s.attempts?.attempt_hash ?? '—'
  const head = `\n  attempt ${s.attempt_id} · ${s.course_id}/${s.lesson_key} · ${s.words} kata · ${s.learner.slice(0, 10)}…`
  const mech = (s.mechanical ?? []).filter((m) => m.ok).length
  const mechTot = (s.mechanical ?? []).length
  console.log(`${head}\n    mekanis : ${mech}/${mechTot} tanda terpenuhi · hash sekarang ${attemptHash.slice(0, 18)}…`)

  const found = essayLesson(s.course_id, s.lesson_key)
  if (found.error) {
    console.log(`    LEWAT   : ${found.error}`)
    skipped += 1
    continue
  }
  const essay = found.lesson.essay
  const rubricTotal = essay.rubric.reduce((n, r) => n + Number(r.max), 0)

  // Teks tidak pernah dihitung ulang oleh kami: kalau gerbang mekanis saja tidak lolos, tidak ada
  // angka yang boleh masuk — `grade.js` sudah menolak menilai di bawah itu, dan ini jalur yang sama.
  const recheck = await gradeAgainstRubric({ text: s.body, essay })
  if (recheck.verdict === 'INSUFFICIENT_EVIDENCE') {
    console.log(`    LEWAT   : ${recheck.note} — penyerahan tetap di antrean dengan state yang bisa dibaca`)
    skipped += 1
    continue
  }

  let scores = null
  let judgeModel = null
  if (manual[attemptHash]) {
    scores = manual[attemptHash]
  } else if (Object.keys(manual).length && !JUDGE_MODEL) {
    console.log(`    LEWAT   : ${attemptHash.slice(0, 14)}… tidak ada entri di berkas penilaian — tidak menebak`)
    skipped += 1
    continue
  }
  if (!scores && JUDGE_MODEL) {
    try {
      const judged = await judgeWithModel(s.body, essay, { model: JUDGE_MODEL })
      scores = judged.scores
      judgeModel = judged.model
    } catch (e) {
      console.log(`    LEWAT   : model tidak menghasilkan penilaian: ${String(e.message ?? e).slice(0, 90)}`)
      skipped += 1
      continue
    }
  }
  if (!scores) {
    console.log(`    (hanya dilihat) rubrik ${essay.rubric.length} kriteria, total max ${rubricTotal} — tambah --judge atau --scores-file untuk menulis`)
    skipped += 1
    continue
  }

  const listed = essay.rubric.map((r) => `    · ${r.label} → ${scores[r.label] ?? '—'}/${r.max}`).join('\n')
  console.log(listed)
  if (DRY) {
    console.log(`    DRY     : tidak menulis. Model: ${judgeModel ?? 'berkas penilaian'}`)
    continue
  }
  if (!account) {
    console.log('    LEWAT   : tidak ada kunci penerbit di lingkungan — tidak ada angka yang ditulis tanpa tanda tangan')
    skipped += 1
    continue
  }

  const nonce = keccak256(stringToBytes(`${attemptHash}:${Date.now()}`)).slice(2, 20)
  const message = `lencana-essay-judge ${attemptHash} nonce=${nonce}`
  const signature = await account.signMessage({ message })
  const out = await judgeEssay({
    attemptId: s.attempt_id, issuer: account.address, message, signature,
    scores: Object.entries(scores).map(([label, score]) => ({ label, score })),
    essay, passMark: found.manifest.course.passMark,
    judgeModel, judgeTemp: judgeModel ? 0 : null,
  })
  if (!out.ok) {
    console.log(`    GAGAL   : ${out.why}`)
    skipped += 1
    continue
  }
  wrote += 1
  console.log(`    TERTULIS: skor ${out.score}/100 · verdict ${out.verdict} · ${out.components} komponen per kriteria · graded_by=${judgeModel ? 'model' : 'human'}`)
  console.log(`              hash ${attemptHash.slice(0, 18)}… → ${out.attemptHash.slice(0, 18)}…  (lama disimpan sebagai replaced)`)
  // B104: angka model adalah USULAN. Gerbang dan `issue --from-attempts` tidak menghitungnya sampai
  // reviewer yang ditunjuk penerbit menandatangani approved/adjusted lewat POST /essay/review.
  if (out.needsReview) console.log('              MENUNGGU PENGESAHAN MANUSIA — belum dihitung gerbang, belum bisa menerbitkan')
}

console.log(`\nselesai   : ${wrote} ditulis, ${skipped} tidak.`)
if (wrote) {
  console.log('          usaha esai sekarang punya `verdict` sah — `issue --from-attempts` akan membacanya,')
  console.log('          dan `POST /attempts` tidak lagi jadi satu-satunya jalan masuk angka esai.')
}
process.exitCode = 0
