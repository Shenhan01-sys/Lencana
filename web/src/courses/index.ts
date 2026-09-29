/**
 * Katalog kursus.
 */
import type { ClassData, CourseStats, Problem } from '../content'
import { auditCatalog, courseStats, lessonsOf } from '../content'
import { web3Dasar } from './web3-dasar'
import { web3Lanjut } from './web3-lanjut'

export const COURSES: ClassData[] = [web3Dasar, web3Lanjut]

export function findCourse(id: string | undefined): ClassData | undefined {
  return COURSES.find((c) => c.id === id)
}

export function findLesson(course: ClassData, slug: string | undefined) {
  if (!slug) return undefined
  for (const m of course.modules) {
    const l = m.lessons.find((x) => x.slug === slug)
    if (l) return { module: m, lesson: l }
  }
  return undefined
}

export function moduleOf(course: ClassData, id: string | undefined) {
  return course.modules.find((m) => m.id === id)
}

export function catalogStats(): CourseStats & { courses: number; lessons: number; pages: number; minutes: number } {
  const per = COURSES.map(courseStats)
  return {
    courses: COURSES.length,
    modules: per.reduce((a, s) => a + s.modules, 0),
    lessons: per.reduce((a, s) => a + s.lessons, 0),
    pages: per.reduce((a, s) => a + s.pages, 0) + 1,
    minutes: per.reduce((a, s) => a + s.minutes, 0),
    quizQuestions: per.reduce((a, s) => a + s.quizQuestions, 0),
    essays: per.reduce((a, s) => a + s.essays, 0),
    kinds: per.reduce(
      (acc, s) => {
        for (const k of Object.keys(s.kinds) as (keyof CourseStats['kinds'])[]) acc[k] += s.kinds[k]
        return acc
      },
      { reading: 0, quiz: 0, essay: 0, lab: 0, checkpoint: 0 } as Record<keyof CourseStats['kinds'], number>,
    ),
  }
}

export function auditAll(): Problem[] {
  return auditCatalog(COURSES)
}

export { courseStats, lessonsOf }
export type { ClassData as Course, CourseStats, Problem }
