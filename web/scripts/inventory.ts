/**
 * Mencetak inventaris katalog dari datanya sendiri.
 *
 * Dipakai untuk menulis angka di README/vault. Alasannya sepele tapi ini aturan di repo ini:
 * angka yang diketik tangan akan basi dan tidak ada yang tahu. Yang ini tidak bisa basi karena
 * ia dibaca dari `src/courses/index.ts` pada saat dicetak.
 *
 *   node web/scripts/inventory.mjs   (lewat tsx, karena sumbernya TypeScript)
 */
import { catalogStats, COURSES } from '../src/courses/index.ts'
import { courseStats } from '../src/content.ts'

const s = catalogStats()
console.log(`kursus        : ${s.courses}`)
console.log(`modul         : ${s.modules}`)
console.log(`lesson        : ${s.lessons}`)
console.log(`halaman       : ${s.pages}  (1 katalog + ${s.courses} silabus + ${s.modules} modul + ${s.lessons} lesson)`)
console.log(`menit         : ${s.minutes}  (~${(s.minutes / 60).toFixed(1)} jam)`)
console.log(`soal kuis     : ${s.quizQuestions}`)
console.log(`esai rubrik  : ${s.essays}`)
console.log(`per jenis     : ${JSON.stringify(s.kinds)}`)
console.log()
for (const c of COURSES) {
  const st = courseStats(c)
  console.log(`${c.id}  -> courseId ${c.id.length} chars, ${st.modules} modul / ${st.lessons} lesson / ${st.pages} halaman / ${st.minutes} menit${
    c.prereqCourseId ? ` · prasyarat ${c.prereqCourseId}` : ''
  }`)
  for (const m of c.modules) console.log(`   ${m.id}  ${m.title}  (${m.lessons.length} lesson)`)
}
