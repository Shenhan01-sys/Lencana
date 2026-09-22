/**
 * Progres belajar di perangkat peserta.
 *
 * ⚠️ Baca batasnya dulu, karena bagian ini paling mudah disalahpahami:
 * yang tersimpan di sini BUKAN bukti apa pun. Tidak ada yang bisa dipercaya dari klaim
 * "saya sudah menyelesaikan 12 lesson" kecuali yang mengeluarkan attestasinya adalah penerbit.
 * Kami menyimpannya di localStorage justru supaya tidak ada godan membungkusnya sebagai
 * kredensial. Yang naik ke chain hanya hasil akhir, ditandatangani penerbit, dan itu jalur lain.
 *
 * Kenapa tidak server: (a) tidak ada alasan produk untuk mengirim catatan bacaan anak kita
 * ke mesin kami; (b) server berarti data pribadi, login, dan permukaan gagal yang tidak
 * menambah satu pun bukti. Progres yang hilang karena ganti perangkat itu kerugian nyata dan
 * kami tulis di UI, bukan kami sembunyikan.
 */
import { LESSON_KINDS, type LessonKind } from './content'

const KEY = 'lencana-progress-v1'

export type LessonRecord = {
  done: boolean
  kind: LessonKind
  /** Nilai kuis 0..100. Hanya ada untuk lesson ber-kuis. */
  score?: number
  attempts: number
  /** Teks esai disimpan lokal supaya peserta tidak kehilangan karangannya. */
  draft?: string
  at: number
}

export type CourseProgress = { [lessonSlug: string]: LessonRecord }
export type Progress = { [courseId: string]: CourseProgress }

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Progress
    // Bentuk lama tidak boleh bikin halaman mati: field yang tidak dikenal dibuang diam-diam.
    for (const k of Object.keys(parsed)) if (typeof parsed[k] !== 'object' || parsed[k] === null) delete parsed[k]
    return parsed
  } catch {
    return {}
  }
}

function write(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage penuh / mode privat: progres hilang, halaman tetap jalan */
  }
}

export function courseProgress(courseId: string): CourseProgress {
  return read()[courseId] ?? {}
}

export function lessonRecord(courseId: string, slug: string): LessonRecord | undefined {
  return courseProgress(courseId)[slug]
}

export function recordLesson(
  courseId: string,
  slug: string,
  kind: LessonKind,
  patch: Partial<LessonRecord>,
): LessonRecord {
  const all = read()
  const cp = all[courseId] ?? {}
  const prev: LessonRecord = cp[slug] ?? { done: false, kind, attempts: 0, at: 0 }
  const next: LessonRecord = { ...prev, ...patch, kind, at: Date.now() }
  cp[slug] = next
  all[courseId] = cp
  write(all)
  return next
}

/**
 * Ringkasan kelulusan LOKAL.
 *
 * Kata "lulus" di sini berarti "syarat tampilan terpenuhi", bukan "penerbit menerbitkan".
 * Bedanya ditulis di UI. Fungsi ini tetap bernilai karena ia memberi peserta angka sebelum
 * ada yang perlu dipercaya — dan karena `probe` bisa memeriksa perhitungannya.
 */
export type CourseSummary = {
  doneLessons: number
  totalLessons: number
  pct: number
  quizAvg: number | null
  essayDrafted: boolean
  /** Bobot mata penilai yang sudah punya angka; di bawah 1 berarti belum lengkap untuk dinilai. */
  gradedWeights: number
  readyForCredential: boolean
  kindsDone: Record<LessonKind, number>
}

export function summarize(
  courseId: string,
  lessons: { slug: string; kind: LessonKind }[],
  weights: { kuis: number; esai: number; praktik: number },
): CourseSummary {
  const cp = courseProgress(courseId)
  const kindsDone = Object.fromEntries(LESSON_KINDS.map((k) => [k, 0])) as Record<LessonKind, number>
  let done = 0
  const scores: number[] = []
  let essayDrafted = false
  let gradedWeights = 0

  for (const l of lessons) {
    const r = cp[l.slug]
    if (r?.done) {
      done += 1
      kindsDone[l.kind] += 1
    }
    if (typeof r?.score === 'number') scores.push(r.score)
    if (l.kind === 'esai' && r?.draft?.trim()) essayDrafted = true
  }

  const quizAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  if (quizAvg !== null) gradedWeights += weights.kuis
  if (essayDrafted) gradedWeights += weights.esai
  if (kindsDone.praktik > 0) gradedWeights += weights.praktik

  const total = lessons.length || 1
  return {
    doneLessons: done,
    totalLessons: lessons.length,
    pct: Math.round((done / total) * 100),
    quizAvg,
    essayDrafted,
    gradedWeights,
    readyForCredential: gradedWeights === 100,
    kindsDone,
  }
}

export function wipeCourse(courseId: string): void {
  const all = read()
  delete all[courseId]
  write(all)
}
