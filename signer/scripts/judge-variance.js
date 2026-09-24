/**
 * Seberapa jauh nilai model berayar untuk tulisan yang SAMA?
 *
 * Pemicunya konkret: fixture `essai-230-kata.md` dinilai 99 pagi ini, lalu 95 saat menerbitkan
 * kredensial beberapa jam kemudian, pada `temperature: 0`. Kalau ayunannya besar, kalimat
 * "nilainya bisa diminta ulang" harus diturunkan menjadi "nilainya punya rentang", dan itu
 * mengubah apa yang boleh kita tulis di dokumen & slide.
 *
 * Pemanggilan berurutan, tanpa sleep, model sama, prompt sama. Yang dilaporkan: distribusi nilai
 * akhir + spread-nya. NOL klaim sebelum angka ini ada.
 */
import { readFile } from 'node:fs/promises'
import { findCourse, findLesson } from '../../web/src/courses/index.ts'
import { gradeAgainstRubric } from '../src/grade.js'
import { groqJudge, DEFAULT_JUDGE_MODEL } from '../src/judge.js'

const RUNS = Number(process.env.JUDGE_RUNS ?? 5)
const course = findCourse('web3-dasar-2026')
const lesson = findLesson(course, 'esai-batas-bukti').lesson
const text = await readFile(new URL('../fixtures/essai-230-kata.md', import.meta.url), 'utf8')
const model = process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL

const hollow = await readFile(new URL('../fixtures/essai-fasih-tapi-kosong.md', import.meta.url), 'utf8')

console.log(`model=${model} runs=${RUNS} temperature=0`)

const good = []
const bad = []
for (let i = 0; i < RUNS; i++) {
  const g = await gradeAgainstRubric({ text, essay: lesson.essay, judge: groqJudge({ model }) })
  const h = await gradeAgainstRubric({ text: hollow, essay: lesson.essay, judge: groqJudge({ model }) })
  good.push(g.finalScore)
  bad.push(h.finalScore)
  console.log(`  run ${i + 1}: substantif=${g.finalScore}  kosong=${h.finalScore}  ambang=${course.passMark}`)
}

const spread = (xs) => Math.max(...xs) - Math.min(...xs)
console.log('')
console.log(`substantif : min=${Math.min(...good)} max=${Math.max(...good)} spread=${spread(good)} rata²=${(good.reduce((a, b) => a + b, 0) / good.length).toFixed(1)}`)
console.log(`kosong     : min=${Math.min(...bad)} max=${Math.max(...bad)} spread=${spread(bad)} rata²=${(bad.reduce((a, b) => a + b, 0) / bad.length).toFixed(1)}`)
console.log(`jarak dua kelas jawaban (rata²): ${(
  good.reduce((a, b) => a + b, 0) / good.length - bad.reduce((a, b) => a + b, 0) / bad.length
).toFixed(1)} poin; ambang lulus ${course.passMark}`)
console.log(`keputusan tetap benar di SEMUA run: ${good.every((s) => s >= course.passMark) && bad.every((s) => s < course.passMark)}`)
