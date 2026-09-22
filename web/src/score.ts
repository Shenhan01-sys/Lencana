/**
 * Penghitung nilai akhir — dan kenapa ia TIDAK punya angka institusional di dalamnya.
 *
 * Fungsi ini buta terhadap kebijakan: bobot, ambang lulus, dan berapa banyak kuis yang harus
 * dikerjakan semuanya diambil dari manifest penerbit. Kalau kami menaruh `70` atau `40/20/40`
 * di sini, platform kembali menjadi institusi yang menyamar jadi rel — hanya kali ini tersembunyi
 * di dalam fungsi.
 *
 * Yang paling penting justru yang TIDAK ia kembalikan: `INCOMPLETE`.
 * Peserta yang tidak mengerjakan apa pun tidak diberi angka 0, melainkan "belum ada bukti".
 * Itu pilihan sadar. 0 dan "belum dinilai" sama-sama jujur terlihatnya, tapi bedanya besar:
 * yang pertama adalah pernyataan kelulusan yang salah, dan pernyataan itu keluar dari kunci
 * seorang agen. Seorang peserta boleh gagal; ia tidak boleh gagal karena alat kami kehabisan data.
 */
import type { CourseManifest } from './manifest'
import { rubricHashOf, shortHash } from './manifest'
import type { Hex } from 'viem'

export type Evidence = {
  /** nilai kuis 0..100, SATU per kuis yang dikerjakan */
  quizScores: number[]
  praktikCompleted: boolean
  /** hasil penilaian esai oleh judge (model atau manusia). null = belum ada yang menilai */
  essayScore: number | null
}

export type ComponentName = 'kuis' | 'esai' | 'praktik'

export type Component = {
  name: ComponentName
  weight: number
  /** 0..100 sebelum bobot; null = tidak ada bukti untuk mata ini */
  raw: number | null
  /** kontribusi ke total, 0 bila tidak ada bukti */
  earned: number
  note?: string
}

export type Score = {
  verdict: 'LULUS' | 'TIDAK_LULUS' | 'BELUM_LENGKAP'
  /** null selama verdict masih BELUM_LENGKAP */
  total: number | null
  passMark: number
  components: Component[]
  missing: string[]
  /** kebijakan yang dipakai — supaya angka bisa ditelusuri ke rubriknya */
  rubricHash: Hex
  rubricRef: string
}

export function quizCount (m: CourseManifest): number {
  return m.course.modules.reduce((n, mod) => n + mod.lessons.filter((l) => l.kind === 'kuis' || l.quiz).length, 0)
}

export function essayCount (m: CourseManifest): number {
  return m.course.modules.reduce((n, mod) => n + mod.lessons.filter((l) => l.kind === 'esai' || l.essay).length, 0)
}

function mean (xs: number[]): number | null {
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/**
 * Hitung nilai akhir terhadap manifest.
 *
 * Aturan yang diambil dari data, bukan dari kode: jumlah kuis yang WAJIB dikerjakan = jumlah
 * lesson ber-kuis di kursus itu (kriteria penerbit bilang begitu), dan esai butuh SATU angka hasil
 * penilaian — bukan rata-rata kata, bukan skor mekanis.
 */
export function computeScore (m: CourseManifest, ev: Evidence): Score {
  const c = m.course
  const w = c.weights
  const missing: string[] = []
  const rubricHash = rubricHashOf(m)

  const need = quizCount(m)
  const given = ev.quizScores.filter((s) => Number.isFinite(s))
  const quizRaw = given.length ? mean(given) : null
  if (!given.length) missing.push(`kuis: 0/${need} dikerjakan`)
  else if (given.length < need) missing.push(`kuis: ${given.length}/${need} dikerjakan — kriteria penerbit menuntut semuanya`)
  given.forEach((s) => {
    if (s < 0 || s > 100) missing.push(`kuis: nilai ${s} di luar 0..100`)
  })

  const essayRaw = typeof ev.essayScore === 'number' && Number.isFinite(ev.essayScore) ? ev.essayScore : null
  if (essayRaw === null) {
    const n = essayCount(m)
    missing.push(n > 1 ? `esai: ${n} tugas esai belum ada yang menilai` : 'esai: belum ada yang menilai (seam judge kosong)')
  } else if (essayRaw < 0 || essayRaw > 100) {
    missing.push(`esai: nilai ${essayRaw} di luar 0..100`)
  }

  const praktikRaw = ev.praktikCompleted ? 100 : null
  if (praktikRaw === null) missing.push('praktik: belum dikerjakan')

  const clamp = (x: number | null): number | null =>
    x === null ? null : Math.max(0, Math.min(100, x))

  const comps: Component[] = [
    { name: 'kuis', weight: w.kuis, raw: clamp(quizRaw), earned: 0 },
    { name: 'esai', weight: w.esai, raw: clamp(essayRaw), earned: 0 },
    { name: 'praktik', weight: w.praktik, raw: praktikRaw, earned: 0 },
  ]
  for (const comp of comps) {
    if (comp.raw === null) continue
    comp.earned = (comp.raw * comp.weight) / 100
  }

  // Bobot yang tidak berjumlah 100 adalah manifest rusak, bukan keadaan peserta: diperiksa lebih
  // dulu supaya "total" tidak pernah diam-diam keluar dari skala 0..100.
  const weightSum = w.kuis + w.esai + w.praktik
  const weightsOk = weightSum === 100 && missing.length === 0

  if (weightSum !== 100) {
    return {
      verdict: 'BELUM_LENGKAP', total: null, passMark: c.passMark, components: comps,
      missing: [`bobot penerbit berjumlah ${weightSum}, bukan 100 — manifest rusak, tidak ada nilai yang boleh diterbitkan`],
      rubricHash, rubricRef: shortHash(rubricHash),
    }
  }

  if (!weightsOk) {
    return { verdict: 'BELUM_LENGKAP', total: null, passMark: c.passMark, components: comps, missing, rubricHash, rubricRef: shortHash(rubricHash) }
  }

  const total = Math.round(comps.reduce((a, x) => a + x.earned, 0))
  return {
    verdict: total >= c.passMark ? 'LULUS' : 'TIDAK_LULUS',
    total, passMark: c.passMark, components: comps, missing: [],
    rubricHash, rubricRef: shortHash(rubricHash),
  }
}

/** Untuk CLI dan halaman: satu baris yang tidak menyembunyikan apa pun. */
export function formatScore (s: Score): string {
  const parts = s.components.map((c) => `${c.name}=${c.raw === null ? '—' : Math.round(c.raw)}×${c.weight}%`)
  const head = s.total === null
    ? `${s.verdict} (${parts.join(' ')})`
    : `${s.verdict} ${s.total}/${s.passMark} (${parts.join(' ')})`
  return `${head} · rubrik ${s.rubricRef}${s.missing.length ? `\n  belum: ${s.missing.join('; ')}` : ''}`
}
