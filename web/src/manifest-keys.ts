/**
 * `manifest-keys.ts` — manifest penerbit **berkunci**, untuk server dan skrip Node saja (B80).
 *
 * Sampai 1 Okt kunci jawaban kuis (`answer` + `why`) hidup di berkas kursus yang diimpor halaman
 * belajar, jadi Vite membundelnya — diukur sebelum pemindahan: bundel publik di Vercel memuat 28 dari 28
 * teks `why` dan 28 literal `answer:<angka>`. Sekarang:
 *
 *   - `courses/<kursus>.ts`       soal tanpa kunci — boleh diimpor siapa pun, termasuk browser;
 *   - `courses/<kursus>.keys.ts`  kuncinya — HANYA diimpor berkas ini;
 *   - `manifest.ts`               manifest publik + fungsi hash; `rubricHashOf` membaca nilai terbit
 *                                 kalau kuncinya tidak ada;
 *   - berkas ini                  manifest berkunci, dengan API yang sama dengan `manifest.ts`, supaya
 *                                 sisi server cukup mengganti jalur impornya.
 *
 * Dua penjaga yang berjalan SAAT MODUL INI DIMUAT — server dan setiap skrip yang mengimpornya berhenti
 * sebelum menilai atau menerbitkan apa pun kalau salah satunya gagal:
 *   1. `auditAnswerKeys`: setiap soal punya kunci, kunci dalam rentang pilihan, alasan tidak kosong,
 *      dan tidak ada kunci untuk soal yang tidak ada.
 *   2. `rubricHash` yang dihitung dari kunci = `rubricHash` yang diterbitkan di manifest publik. Tanpa ini
 *      browser bisa menampilkan hash yang berbeda dari yang tercetak di kertas, tanpa ada yang tahu.
 *
 * ⚠️ Jangan impor berkas ini dari kode yang sampai ke browser (`main.ts`, `lms.ts`, `learning.ts`,
 * `render.ts`, `verify.ts`, `score.ts`, …). Pemindaian bundel di `npm run verify:quizkeys` merah kalau itu
 * terjadi.
 */

// Lencana-B80 status=SELESAI 2026-10-01 — manifest berkunci khusus server: kunci digabung dari courses/*.keys.ts, diaudit lengkap, dan rubricHash hitungan dipaksa sama dengan rubricHash terbit saat modul dimuat. Buktikan ulang: npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Course, QuizKeys } from './content'
import {
  MANIFESTS as PUBLIC_MANIFESTS, MANIFEST_SCHEMA, canonicalPolicy, rubricHashOf, manifestHashOf, shortHash, hasAnswerKeys,
  type CourseManifest, type Issuer,
} from './manifest'
import { web3DasarKeys } from './courses/web3-dasar.keys'
import { web3LanjutKeys } from './courses/web3-lanjut.keys'
import { ujiBayarKeys } from './courses/uji-bayar.keys'

/** Kunci per kursus. Kursus tanpa kuis cukup `{}`; kursus berkuis tanpa entri di sini gagal diaudit. */
export const ANSWER_KEYS: Record<string, QuizKeys> = {
  'web3-dasar-2026': web3DasarKeys,
  'web3-lanjut-2026': web3LanjutKeys,
  'uji-bayar-2026': ujiBayarKeys,
}

/** Manifest publik + kunci → manifest berkunci (salinan; manifest publik tidak disentuh). */
export function withAnswerKeys (m: CourseManifest, keys: QuizKeys): CourseManifest {
  const course: Course = {
    ...m.course,
    modules: m.course.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((l) => (l.quiz
        ? {
            ...l,
            quiz: {
              ...l.quiz,
              questions: l.quiz.questions.map((q) => {
                const k = keys[l.slug]?.[q.id]
                return k ? { ...q, answer: k.answer, why: k.why } : { ...q }
              }),
            },
          }
        : l)),
    })),
  }
  return { ...m, course }
}

/** Kelengkapan kunci satu manifest: [] berarti lengkap. */
export function auditAnswerKeys (m: CourseManifest, keys: QuizKeys): string[] {
  const out: string[] = []
  const quizzes = new Map(m.course.modules.flatMap((mod) => mod.lessons).filter((l) => l.quiz).map((l) => [l.slug, l.quiz!]))
  for (const [slug, quiz] of quizzes) {
    for (const q of quiz.questions) {
      const k = keys[slug]?.[q.id]
      if (!k) { out.push(`${m.course.id}/${slug}/${q.id}: soal tanpa kunci`); continue }
      if (!Number.isInteger(k.answer) || k.answer < 0 || k.answer >= q.options.length) out.push(`${m.course.id}/${slug}/${q.id}: kunci ${k.answer} di luar 0..${q.options.length - 1}`)
      if (!k.why?.trim()) out.push(`${m.course.id}/${slug}/${q.id}: kunci tanpa alasan`)
    }
  }
  for (const [slug, items] of Object.entries(keys)) {
    const quiz = quizzes.get(slug)
    for (const id of Object.keys(items)) {
      if (!quiz?.questions.some((q) => q.id === id)) out.push(`${m.course.id}/${slug}/${id}: kunci untuk soal yang tidak ada`)
    }
  }
  return out
}

export const MANIFESTS: CourseManifest[] = PUBLIC_MANIFESTS.map((m) => withAnswerKeys(m, ANSWER_KEYS[m.course.id] ?? {}))

// Penjaga saat dimuat — lihat kepala berkas. Pesannya Inggris: ia bisa sampai ke log server.
for (const [i, m] of MANIFESTS.entries()) {
  const problems = auditAnswerKeys(PUBLIC_MANIFESTS[i], ANSWER_KEYS[m.course.id] ?? {})
  if (problems.length) throw new Error(`quiz answer keys incomplete for ${m.course.id}: ${problems.join('; ')}`)
  if (!hasAnswerKeys(m)) throw new Error(`keyed manifest ${m.course.id} still has questions without keys`)
  const computed = rubricHashOf(m)
  if (m.rubricHash && computed !== m.rubricHash) {
    throw new Error(`rubricHash drift for ${m.course.id}: computed ${computed} from the answer keys, published ${m.rubricHash} — fix the published value in manifest.ts or the keys, never one silently`)
  }
}

export function manifestOf (courseId: string): CourseManifest | undefined {
  return MANIFESTS.find((m) => m.course.id === courseId)
}

export { MANIFEST_SCHEMA, canonicalPolicy, rubricHashOf, manifestHashOf, shortHash, hasAnswerKeys, PUBLIC_MANIFESTS }
export type { CourseManifest, Issuer }
