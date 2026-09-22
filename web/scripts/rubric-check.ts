/**
 * Uji cepat untuk manifest + score.
 *
 * Bukan pengganti `probe.ts` — ini langkah kerja setelah menulis dua fungsi yang angkanya saya
 * klaim benar. Kebiasaan di repo ini: baca dari kode, bukan dari narasi saya sendiri. Versi
 * pertama berkas ini menaruh dua asumsi salah di dalamnya (jumlah kuis = 5, dan letak lesson esai
 * di indeks tetap) dan keduanya ketahuan oleh run pertama — itu justru alasan ia ditulis.
 */
import { manifestOf, rubricHashOf, canonicalPolicy, manifestHashOf } from '../src/manifest.ts'
import { computeScore, formatScore, quizCount, essayCount } from '../src/score.ts'
import type { CourseManifest } from '../src/manifest.ts'

let ran = 0
let bad = 0
const check = (name: string, cond: boolean, detail = '') => {
  ran += 1
  console.log(`  ${cond ? 'ok  ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
  if (!cond) bad += 1
}

const m = manifestOf('web3-dasar-2026')!
const c = m.course
const QUIZZES = quizCount(m)
const ESSAYS = essayCount(m)
console.log(`bobot ${JSON.stringify(c.weights)}  passMark ${c.passMark}  kuis ${QUIZZES}  esai ${ESSAYS}\n`)

// Diukur dari materi, bukan dari angka yang saya ingat: 28 itu JUMLAH SOAL lintas dua kursus.
check('kuis/essai dihitung dari lesson, dan bukan nol', QUIZZES === 4 && ESSAYS === 1, `${QUIZZES}/${ESSAYS}`)

const allQuizzes = (score: number) => Array.from({ length: QUIZZES }, () => score)

// 1. tanpa bukti -> BELUM_LENGKAP, BUKAN nol
const s0 = computeScore(m, { quizScores: [], praktikCompleted: false, essayScore: null })
check('tanpa bukti = BELUM_LENGKAP, total null', s0.verdict === 'BELUM_LENGKAP' && s0.total === null, formatScore(s0))
check('ia menyebut semua yang kurang', s0.missing.length === 3, s0.missing.join(' | '))

// 2. aritmetika: 40%*80 + 40%*90 + 20%*100 = 88
const s1 = computeScore(m, { quizScores: allQuizzes(80), praktikCompleted: true, essayScore: 90 })
check('total 88 dan LULUS', s1.total === 88 && s1.verdict === 'LULUS', formatScore(s1))

// 3. gagal itu nyata dan dihitung
const s2 = computeScore(m, { quizScores: allQuizzes(20), praktikCompleted: true, essayScore: 20 })
check('total 36 dan TIDAK_LULUS', s2.total === 36 && s2.verdict === 'TIDAK_LULUS', formatScore(s2))

// 4. dua sisi ambang, dihitung sampai pembulatannya.
//      0.4*62 + 0.4*62 + 0.2*100 = 69.6 -> 70 = tepat ambang  -> LULUS
//      0.4*61 + 0.4*61 + 0.2*100 = 68.8 -> 69                 -> TIDAK_LULUS
// Angka ini bukan hiasan: tanpa tes di sisi ambang, "lulus 70" bisa berarti apa pun termasuk
// membulatkan ke atas tanpa pernah kita sadari.
const edgeUp = computeScore(m, { quizScores: allQuizzes(62), praktikCompleted: true, essayScore: 62 })
const edgeDown = computeScore(m, { quizScores: allQuizzes(61), praktikCompleted: true, essayScore: 61 })
check(`69.6 dibulatkan ke ${edgeUp.total} -> LULUS pada ambang ${c.passMark}`, edgeUp.total === 70 && edgeUp.verdict === 'LULUS', formatScore(edgeUp))
check(`68.8 menjadi ${edgeDown.total} -> TIDAK_LULUS`, edgeDown.total === 69 && edgeDown.verdict === 'TIDAK_LULUS', formatScore(edgeDown))

// 5. sebagian kuis -> belum lengkap (kriteria penerbit menuntut semuanya)
const s3 = computeScore(m, { quizScores: [90, 90], praktikCompleted: true, essayScore: 90 })
check(`${QUIZZES} kuis, baru 2 dikerjakan -> BELUM_LENGKAP, bukan nilai sebagian`,
  s3.total === null && (s3.missing[0] ?? '').includes(`2/${QUIZZES}`), formatScore(s3))

// 6. esai belum dinilai memblokir nilai walau yang lain sempurna
const s4 = computeScore(m, { quizScores: allQuizzes(100), praktikCompleted: true, essayScore: null })
check('esai kosong memblokir walau yang lain 100', s4.verdict === 'BELUM_LENGKAP' && s4.missing.some((x) => x.startsWith('esai')), formatScore(s4))

// 7. bobot manifest rusak tidak boleh menghasilkan angka
const badWeights = JSON.parse(JSON.stringify(m)) as CourseManifest
badWeights.course.weights.esai = 30
check('bobot != 100 -> BELUM_LENGKAP dengan sebab yang menyebut manifest',
  computeScore(badWeights, { quizScores: allQuizzes(100), praktikCompleted: true, essayScore: 100 }).missing.some((x) => x.includes('manifest rusak')),
  formatScore(computeScore(badWeights, { quizScores: allQuizzes(100), praktikCompleted: true, essayScore: 100 })))

// 8. komitmen rubrik: cari lesson esainya, JANGAN tebak indeks
const h1 = rubricHashOf(m)
check('canonical policy stabil', canonicalPolicy(m) === canonicalPolicy(m))
check('rubricHash 32 byte', /^0x[0-9a-f]{64}$/.test(h1), h1.slice(0, 18))

function findEssayManifest (x: CourseManifest) {
  for (const mod of x.course.modules) for (const l of mod.lessons) if (l.essay) return { mod, l }
  throw new Error('manifest tidak punya esai')
}
const tampered = JSON.parse(JSON.stringify(m)) as CourseManifest
{
  const { mod, l } = findEssayManifest(tampered)
  const target = mod.lessons.find((x) => x.slug === l.slug)!
  target.essay!.rubric[0].max += 5
  target.essay!.rubric[1].max -= 5
}
check('rubrik dijumlah-ubah (total sama, komposisi beda) = hash BERUBAH',
  rubricHashOf(tampered) !== h1, `${rubricHashOf(tampered).slice(0, 18)} vs ${h1.slice(0, 18)}`)

const typo = JSON.parse(JSON.stringify(m)) as CourseManifest
findEssayManifest(typo).mod.lessons[0].blocks[0] = { t: 'p', text: (findEssayManifest(typo).mod.lessons[0].blocks[0] as any).text + ' (typo)' }
check('perbaiki typo materi TIDAK mengubah rubricHash', rubricHashOf(typo) === h1)
check('tapi mengubah manifestHash — materi ikut berkomitmen, terpisah dari kebijakan',
  manifestHashOf(typo) !== manifestHashOf(m))

// 9. urutan kunci tulis tidak mengubah hash
const reordered = { ...m, course: { ...c, weights: { praktik: c.weights.praktik, esai: c.weights.esai, kuis: c.weights.kuis } } } as CourseManifest
check('susunan kunci berbeda = hash SAMA', rubricHashOf(reordered) === h1)

// 10. satu kunci jawaban berubah HARUS menggeser hash. Kalau tidak, "kunci" tidak berkomitmen
//     pada apa pun dan rubricHash cuma hiasan. Versi pertama pemeriksaan ini salah cari: ia
//     mencari lesson kuis di dalam modul yang sama dengan esai, dan modul itu tidak punya kuis.
const flipped = JSON.parse(JSON.stringify(m)) as CourseManifest
{
  const quiz = flipped.course.modules.flatMap((x) => x.lessons).find((l) => l.quiz)
  if (!quiz?.quiz) throw new Error('kursus tidak punya kuis')
  const q = quiz.quiz
  q.questions[0].answer = (q.questions[0].answer + 1) % q.questions[0].options.length
}
check('kunci jawaban diubah = rubricHash BERUBAH', rubricHashOf(flipped) !== h1)

console.log(`\n${bad === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${bad} gagal`)
process.exitCode = bad ? 1 : 0
