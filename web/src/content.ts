/**
 * Model Konten LMS (Struktur Refactor 2026).
 *
 * Ini adalah single source of truth untuk silabus. Tidak ada komponen DOM di sini.
 */
import { encodePacked, keccak256, toBytes, type Address, type Hex } from 'viem'

export { EMPTY_UID } from './abi'

export type LessonKind = 'reading' | 'quiz' | 'essay' | 'lab' | 'checkpoint'

export const LESSON_KINDS: LessonKind[] = ['reading', 'quiz', 'essay', 'lab', 'checkpoint']

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  answer: number
  why: string
}

export type Quiz = { questions: QuizQuestion[]; passPct: number }

export type RubricItem = { label: string; max: number }

export type Essay = {
  prompt: string
  minWords: number
  rubric: RubricItem[]
  guidance: string[]
}

export type LessonData = {
  id: string
  slug: string
  title: string
  type: LessonKind
  duration: number
  body: string
  sourceLinks?: string[]
  quiz?: Quiz
  essay?: Essay
}

export type ModuleData = {
  id: string
  slug: string
  title: string
  summary: string
  lessons: LessonData[]
}

export type ClassData = {
  id: string
  slug: string
  title: string
  subtitle: string
  level: 'dasar' | 'menengah' | 'lanjutan'
  duration: number
  outcomes: string[]
  prerequisites: string[]
  tags: string[]
  modules: ModuleData[]
  // Legacy fields preserved for score.ts, manifest.ts and learning.ts compatibility
  institution: string
  criteria: string
  weights: { kuis: number; esai: number; praktik: number }
  passMark: number
  validDays: number
}

export type Course = ClassData;
export type Module = ModuleData;
export type Lesson = LessonData;
export type Block = any;



// ---------------------------------------------------------------- derivasi id

export function courseIdOf(course: ClassData): Hex {
  return keccak256(toBytes(course.id))
}

export function lessonIdOf(course: ClassData, lesson: LessonData): Hex {
  return keccak256(toBytes(`${course.id}/${lesson.slug}`))
}

export function credentialHashOf(holder: Address, courseId: Hex, lessonId?: Hex): Hex {
  return lessonId
    ? keccak256(encodePacked(['string', 'address', 'bytes32', 'bytes32'], ['vc:', holder, courseId, lessonId]), 'hex')
    : keccak256(encodePacked(['string', 'address', 'bytes32'], ['vc:', holder, courseId]), 'hex')
}

// ---------------------------------------------------------------- inventaris

export type CourseStats = {
  modules: number
  lessons: number
  pages: number
  minutes: number
  quizQuestions: number
  essays: number
  kinds: Record<LessonKind, number>
}

export function lessonsOf(course: ClassData): LessonData[] {
  return course.modules.flatMap((m) => m.lessons)
}

export function courseStats(course: ClassData): CourseStats {
  const lessons = lessonsOf(course)
  const kinds = Object.fromEntries(LESSON_KINDS.map((k) => [k, 0])) as Record<LessonKind, number>
  let quizQuestions = 0
  let essays = 0
  for (const l of lessons) {
    if (kinds[l.type] !== undefined) {
      kinds[l.type] += 1
    } else {
      // mapping legacy kinds if accidentally left behind
      kinds['reading'] += 1
    }
    quizQuestions += l.quiz?.questions.length ?? 0
    if (l.essay) essays += 1
  }
  return {
    modules: course.modules.length,
    lessons: lessons.length,
    pages: 1 + course.modules.length + lessons.length,
    minutes: lessons.reduce((a, l) => a + l.duration, 0),
    quizQuestions,
    essays,
    kinds,
  }
}

// ---------------------------------------------------------------- audit isi

export type Problem = { where: string; what: string }

export function auditCourse(course: ClassData): Problem[] {
  const out: Problem[] = []
  const bad = (where: string, what: string) => out.push({ where, what })

  if (!course.id.trim()) bad(course.id || '(kosong)', 'id kursus kosong')
  if (!course.modules.length) bad(course.id, 'tidak punya modul')

  const moduleIds = new Set<string>()
  const slugs = new Set<string>()

  for (const m of course.modules) {
    if (moduleIds.has(m.id)) bad(course.id, `id modul duplikat: ${m.id}`)
    moduleIds.add(m.id)
    if (!/^[a-z0-9-]+$/.test(m.id)) bad(`${course.id}/${m.id}`, 'id modul bukan ramah-URL (a-z0-9-)')
    if (!m.title.trim()) bad(`${course.id}/${m.id}`, 'judul modul kosong')
    if (!m.lessons.length) bad(`${course.id}/${m.id}`, 'modul tanpa lesson')

    for (const l of m.lessons) {
      const where = `${course.id}/${m.id}/${l.slug}`
      if (slugs.has(l.slug)) bad(where, 'slug lesson duplikat dalam kursus')
      slugs.add(l.slug)
      if (!/^[a-z0-9-]+$/.test(l.slug)) bad(where, 'slug bukan ramah-URL')
      if (!l.title.trim()) bad(where, 'judul kosong')
      if (l.duration < 0) bad(where, `durasi ${l.duration} menit tidak masuk akal`)
      if (!LESSON_KINDS.includes(l.type)) bad(where, `jenis "${l.type}" tidak dikenal`)
      
      if (l.type === 'quiz' && !l.quiz) bad(where, 'jenis quiz tanpa kuis')
      if (l.type === 'essay' && !l.essay) bad(where, 'jenis essay tanpa esai')

      if (l.quiz) {
        const q = l.quiz
        if (q.passPct <= 0 || q.passPct > 100) bad(where, `passPct ${q.passPct} di luar 1..100`)
        if (!q.questions.length) bad(where, 'kuis tanpa soal')
        const qids = new Set<string>()
        for (const [i, item] of q.questions.entries()) {
          const wq = `${where}/${item.id || `soal-${i}`}`
          if (qids.has(item.id)) bad(wq, 'id soal duplikat')
          qids.add(item.id)
          if (item.options.length < 2) bad(wq, `hanya ${item.options.length} pilihan`)
          if (item.answer < 0 || item.answer >= item.options.length) bad(wq, `kunci jawaban salah`)
          if (!item.why.trim()) bad(wq, 'tanpa penjelasan kenapa')
        }
      }

      if (l.essay) {
        const e = l.essay
        const total = e.rubric.reduce((a, r) => a + r.max, 0)
        if (total !== 100) bad(where, `rubrik berjumlah ${total}, bukan 100`)
      }
    }
  }

  return out
}

export function auditCatalog(courses: ClassData[], knownIds: Set<string> = new Set(courses.map((c) => c.id))): Problem[] {
  const out: Problem[] = []
  const ids = new Set<string>()
  for (const c of courses) {
    if (ids.has(c.id)) out.push({ where: c.id, what: 'id kursus duplikat di katalog' })
    ids.add(c.id)
    for (const prereq of c.prerequisites) {
      if (!knownIds.has(prereq)) {
        out.push({ where: c.id, what: `prasyarat menunjuk "${prereq}" yang tidak ada di katalog` })
      }
    }
    out.push(...auditCourse(c))
  }
  return out
}
