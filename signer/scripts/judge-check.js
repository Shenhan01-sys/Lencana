/**
 * `npm run judge` — membuktikan penilai benar-benar BISA menjatuhkan, bukan cuma bisa bicara.
 *
 * Kenapa ini ada: satu panggilan yang mengembalikan angka bukan bukti bahwa angkanya berarti apa
 * pun. Saat aku menguji model hari ini, `qwen3.8-27b` memberi **25/25 di semua kriteria** untuk
 * dua tulisan yang sama sekali berbeda mutunya. Kalau aku memilih model tercepat itu tanpa tes ini,
 * rubrik kita berubah jadi mesin lulus otomatis — dan kredensial yang keluar darinya lebih buruk
 * daripada tidak ada kredensial, karena ia terlihat sah.
 *
 * Jadi berkas ini memaksa dua hal:
 *   1. jawaban **fasih tapi kosong** harus jatuh di bawah ambang lulus kursus
 *   2. dua jawaban yang berbeda harus menghasilkan **angka yang berbeda**
 *
 * Keduanya kegagalan yang keras, bukan peringatan: ia keluar dengan kode lỗi kalau tidak terpenuhi.
 */
import { readFile } from 'node:fs/promises'
import { findCourse, findLesson } from '../../web/src/courses/index.ts'
import { gradeAgainstRubric, formatVerdict } from '../src/grade.js'
import { groqJudge, DEFAULT_JUDGE_MODEL } from '../src/judge.js'

const course = findCourse('web3-dasar-2026')
const lesson = findLesson(course, 'esai-batas-bukti').lesson

async function load (name) {
  return readFile(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

let bad = 0
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? 'ok  ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
  if (!cond) bad += 1
}

console.log(`model penilai : ${process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL}`)
console.log(`rubrik        : ${lesson.essay.rubric.length} kriteria, ambang lulus kursus ${course.passMark}\n`)

if (!process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY tidak ada di lingkungan. Jalankan lewat _research/run_with_env.ps1.')
  process.exit(2)
}

const judge = groqJudge()

const good = await gradeAgainstRubric({ text: await load('essai-230-kata.md'), essay: lesson.essay, judge })
const hollow = await gradeAgainstRubric({ text: await load('essai-fasih-tapi-kosong.md'), essay: lesson.essay, judge })
const short = await gradeAgainstRubric({ text: await load('essai-pendek.md'), essay: lesson.essay, judge })

console.log(`jawaban bagus   : ${formatVerdict(good)}`)
console.log(`jawaban kosong  : ${formatVerdict(hollow)}`)
console.log(`jawaban kependekan: ${formatVerdict(short)}`)
for (const c of hollow.perCriterion ?? []) console.log(`   - ${c.label}: ${c.score}/${c.max}`)

console.log('')
check('penolakan mekanis tetap jalan sebelum model dipanggil', short.verdict === 'INSUFFICIENT_EVIDENCE', short.verdict)
check('kedua jawaban panjang menghasilkan nilai', good.verdict === 'GRADED' && hollow.verdict === 'GRADED',
  `${good.verdict}/${hollow.verdict}`)
// Inti pemeriksaan: model yang tidak bisa memberi nilai jelek tidak sedang menilai apa pun.
check(`KONTROL NEGATIF: jawaban fasih-tapi-kosong < ${course.passMark}`,
  hollow.finalScore < course.passMark, `dapat ${hollow.finalScore}`)
check('jawaban yang menyebut alat & batas mengungguli yang kosong',
  (good.finalScore ?? 0) > (hollow.finalScore ?? 0), `${good.finalScore} vs ${hollow.finalScore}`)
check('penilaian tidak seragam antar kriteria (tanda ia benar-benar membaca)',
  new Set((hollow.perCriterion ?? []).map((c) => c.score)).size > 1,
  JSON.stringify((hollow.perCriterion ?? []).map((c) => c.score)))

console.log(`\n${bad === 0 ? 'PENILAI SAH' : 'PENILAI TIDAK SAH'} — ${bad} pemeriksaan gagal`)
process.exitCode = bad ? 1 : 0
