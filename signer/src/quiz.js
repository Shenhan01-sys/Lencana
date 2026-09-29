/**
 * `src/quiz.js` — penilaian kuis terjadi di SERVER, bukan di browser.
 *
 * Kenapa ini ada sekarang (B72): permukaan tulisnya sudah ada (`POST /attempts` menerima `score`),
 * dan halaman belajar selama ini menghitung angkanya sendiri (`web/src/lms.ts` action `grade`,
 * memakai `item.answer` yang memang ikut terbundel ke browser). Menyambungkan halaman ke server
 * lewat jalur itu berarti angka kelulusan dikirim oleh pihak yang dinilai — dan `attempt_hash` lalu
 * membekukan angka itu supaya terlihat sah. Yang menutup celahnya bukan hash, tapi tempat
 * perhitungannya berada: fungsi ini yang membaca kunci, klien hanya mengirim PILIHAN.
 *
 * ⚠️ Batas yang tidak boleh dibaca lebih dari yang ditegakkan (ditulis di vault, tidak di sini saja):
 * kunci jawaban tetap ada di bundel browser, jadi peserta yang mau membaca berkasnya masih bisa
 * menjawab benar semua. Yang dihapus oleh lapis ini adalah "peserta melaporkan angkanya sendiri",
 * bukan "kuis tidak bisa dijawab dengan kunci". Kursus ini memang publik by design; yang membuat
 * kertasnya bernilai adalah penilaian esai/praktik oleh penerbit dan rekaman yang tidak bisa
 * ditulis ulang — bukan kerahasiaan soal.
 */
import { manifestOf, rubricHashOf } from '../../web/src/manifest.ts'

/** Lesson mana saja yang merupakan kuis, dengan soalnya — dibaca dari katalog penerbit. */
export function quizLesson (courseId, lessonSlug) {
  const m = manifestOf(courseId)
  if (!m) return { error: `course "${courseId}" is not in the publisher catalogue` }
  const lesson = m.course.modules.flatMap((mod) => mod.lessons).find((l) => l.slug === lessonSlug)
  if (!lesson) return { error: `lesson "${lessonSlug}" does not exist in course "${courseId}"` }
  if (!lesson.quiz?.questions?.length) return { error: `lesson "${lessonSlug}" is not a quiz (it has no questions)` }
  return { manifest: m, lesson }
}

/**
 * Lesson esai milik penerbit: rubrik + ambang panjang yang dipakai `grade.js`.
 *
 * Alasannya sama dengan `quizLesson`: kriteria penilaian adalah milik penerbit dan harus dibaca dari
 * manifest di sisi SERVER. Kalau rute penyerahan esai menerima `max` per kriteria dari klien, peserta
 * bisa mengirim rubrik yang lebih mudah dan angka akhirnya tetap tercetak sah — itu persis kegagalan
 * yang sedang kita tutup (B81).
 */
export function essayLesson (courseId, lessonSlug) {
  const m = manifestOf(courseId)
  if (!m) return { error: `course "${courseId}" is not in the publisher catalogue` }
  const lesson = m.course.modules.flatMap((mod) => mod.lessons).find((l) => l.slug === lessonSlug)
  if (!lesson) return { error: `lesson "${lessonSlug}" does not exist in course "${courseId}"` }
  if (!lesson.essay?.rubric?.length) return { error: `lesson "${lessonSlug}" is not an essay (its rubric is empty)` }
  return { manifest: m, lesson }
}

/**
 * @param {{courseId:string, lessonSlug:string, picks?:Array<{itemId:string, choice:number}>}} input
 *        `picks` = pilihan peserta per soal. TIDAK ada `score` di sini, dan tidak akan ada.
 */
export function gradeQuiz ({ courseId, lessonSlug, picks }) {
  const found = quizLesson(courseId, lessonSlug)
  if (found.error) return { ok: false, why: found.error }
  const { manifest, lesson } = found
  const questions = lesson.quiz.questions

  if (!Array.isArray(picks) || picks.length === 0) {
    return { ok: false, why: 'requires picks: a list of { itemId, choice } — empty means nothing was answered' }
  }
  const known = new Map(questions.map((q) => [q.id, q]))
  const chosen = new Map()
  for (const p of picks) {
    const id = String(p?.itemId ?? '')
    if (!known.has(id)) return { ok: false, why: `item "${id}" is not part of quiz "${lessonSlug}"` }
    if (chosen.has(id)) return { ok: false, why: `soal "${id}" dikirim dua kali` }
    const c = Number(p?.choice)
    if (!Number.isInteger(c) || c < 0 || c >= known.get(id).options.length) {
      return { ok: false, why: `choice for item "${id}" is invalid: ${p?.choice}` }
    }
    chosen.set(id, c)
  }
  const unanswered = questions.filter((q) => !chosen.has(q.id)).map((q) => q.id)
  if (unanswered.length) {
    return { ok: false, why: `unanswered items: ${unanswered.join(', ')} — blanks are NOT scored as zero; the submission is rejected` }
  }

  const components = questions.map((q) => ({
    itemId: q.id,
    score: chosen.get(q.id) === q.answer ? 100 : 0,
    weight: 1,
    gradedBy: 'mechanical',
  }))
  const correct = components.filter((c) => c.score === 100).length
  const score = Math.round((correct / questions.length) * 10000) / 100
  const passPct = lesson.quiz.passPct

  return {
    ok: true,
    score,
    correct,
    total: questions.length,
    passPct,
    // Verdict milik AMBANG PENERBIT, bukan milik peserta: `pass`/`fail` dihitung di mari dari
    // `lesson.quiz.passPct` yang ada di manifest.
    verdict: score >= passPct ? 'pass' : 'fail',
    components,
    rubricHash: rubricHashOf(manifest),
    lessonKind: lesson.kind ?? 'kuis',
  }
}
