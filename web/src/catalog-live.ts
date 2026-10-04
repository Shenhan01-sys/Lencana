/**
 * `catalog-live.ts` — kursus yang disusun di halaman dan diterbitkan kunci penerbit (B133) masuk ke katalog halaman.
 *
 * Katalog halaman adalah array yang dibaca semua bagian (Kursus, detail kursus, kelas, dasbor). Kursus database ditambahkan
 * ke array yang sama — kursus, manifest publik (dengan `rubricHash` terbit), dan harga — sekali per muat halaman, sebelum
 * rute pertama digambar. Kursus berkas tidak pernah ditimpa. Kalau penerbit tidak menjawab, halaman tetap jalan dengan
 * kursus berkas saja.
 */
// Lencana-B133 status=TERBUKA 2026-10-03 — katalog halaman memuat kursus yang terbit dari halaman (GET /catalog/published, tanpa kunci) ke array katalog, manifest publik, dan harga yang sama dengan kursus berkas. Buktikan ulang: uji peramban T59. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { COURSES, LISTED_COURSES } from './courses/index'
import { MANIFESTS } from './manifest'
import { COURSE_PRICES } from './pricing'
import { readPublishedCourses } from './learning'

const FILE_IDS = new Set(COURSES.map((c) => c.id))
/** B140 (D72): kursus database yang diarsipkan — kelasnya tetap ada untuk peserta lama, tapi tidak tampil di katalog dan tidak menerima peserta baru. */
export const ARCHIVED_COURSES = new Set<string>()
let loading: Promise<number> | null = null

/** Muat sekali; hasilnya jumlah kursus database yang ditambahkan. Tidak pernah melempar. */
export function loadPublishedCourses (timeoutMs = 1500): Promise<number> {
  loading ??= readPublishedCourses(timeoutMs).then((list) => {
    let added = 0
    for (const { manifest, price, archived } of list) {
      const c = manifest?.course
      if (!c?.id || FILE_IDS.has(c.id) || COURSES.some((x) => x.id === c.id)) continue
      COURSES.push(c)
      if (archived) ARCHIVED_COURSES.add(c.id)
      else if (!c.unlisted) LISTED_COURSES.push(c)
      MANIFESTS.push(manifest)
      if (price && /^[0-9]+$/.test(price)) COURSE_PRICES[c.id] = BigInt(price)
      added++
    }
    return added
  }).catch(() => 0)
  return loading
}

/** Id kursus berkas (untuk audit draf di halaman: id ini tidak boleh dipakai kursus baru). */
export const fileCourseIds = (): Set<string> => FILE_IDS
