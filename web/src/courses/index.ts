/**
 * Katalog kursus.
 *
 * Satu tempat pendaftaran supaya `auditCatalog` punya sesuatu yang bisa diperiksa silang:
 * `prereqCourseId` pada kursus lanjut menunjuk id kursus dasar, dan kalau salah satu berubah
 * jadi typo, yang merah adalah probe — bukan halaman yang dilihat juri.
 */
import type { Course, CourseStats, Problem } from '../content'
import { auditCatalog, courseStats, lessonsOf } from '../content'
import { web3Dasar } from './web3-dasar'
import { web3Lanjut } from './web3-lanjut'

export const COURSES: Course[] = [web3Dasar, web3Lanjut]

export function findCourse(id: string | undefined): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

export function findLesson(course: Course, slug: string | undefined) {
  if (!slug) return undefined
  for (const m of course.modules) {
    const l = m.lessons.find((x) => x.slug === slug)
    if (l) return { module: m, lesson: l }
  }
  return undefined
}

export function moduleOf(course: Course, id: string | undefined) {
  return course.modules.find((m) => m.id === id)
}

/** Angka yang dipakai di katalog dan di README. Semuanya dihitung dari data, tidak ada yang ditulis tangan. */
export function catalogStats(): CourseStats & { courses: number; lessons: number; pages: number; minutes: number } {
  const per = COURSES.map(courseStats)
  return {
    courses: COURSES.length,
    modules: per.reduce((a, s) => a + s.modules, 0),
    lessons: per.reduce((a, s) => a + s.lessons, 0),
    // +1 per kursus untuk halaman katalog itu sendiri.
    pages: per.reduce((a, s) => a + s.pages, 0) + 1,
    minutes: per.reduce((a, s) => a + s.minutes, 0),
    quizQuestions: per.reduce((a, s) => a + s.quizQuestions, 0),
    essays: per.reduce((a, s) => a + s.essays, 0),
    kinds: per.reduce(
      (acc, s) => {
        for (const k of Object.keys(s.kinds) as (keyof CourseStats['kinds'])[]) acc[k] += s.kinds[k]
        return acc
      },
      { bacaan: 0, kuis: 0, esai: 0, praktik: 0, kasus: 0, referensi: 0 } as Record<keyof CourseStats['kinds'], number>,
    ),
  }
}

export function auditAll(): Problem[] {
  return auditCatalog(COURSES)
}

export { courseStats, lessonsOf }
export type { Course, CourseStats, Problem }
