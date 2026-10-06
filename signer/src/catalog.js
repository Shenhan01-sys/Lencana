/**
 * `src/catalog.js` — kursus yang disusun di halaman dan diterbitkan kunci penerbit (B133, D67) masuk ke katalog proses ini.
 *
 * Katalog kursus berkas (`web/src/manifest-keys.ts`) adalah array di memori yang dipakai semua jalur server — enroll,
 * harga, kuis, esai, praktik, criteria, dasbor penerbit, terbit kredensial. Draf yang terbit DITAMBAHKAN ke array yang
 * sama (manifest berkunci + manifest publik + harga), sehingga kursus database berjalan di jalur yang sama persis dengan
 * kursus berkas — bukan jalur kedua yang bisa menyimpang.
 *
 * Penjaga: kursus database tidak pernah menimpa kursus berkas dengan id yang sama, dan `rubricHash` dihitung ulang dari isi
 * + kunci yang tersimpan; kalau beda dari yang ditandatangani kunci penerbit saat terbit, kursus itu TIDAK dimuat.
 */
// Lencana-B133 status=SELESAI 2026-10-03 — draf kursus yang terbit digabung ke katalog server (manifest berkunci, manifest publik, harga) dengan rubricHash dihitung ulang dan dicocokkan dengan yang ditandatangani kunci penerbit; kursus berkas tidak pernah ditimpa. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { MANIFESTS, PUBLIC_MANIFESTS, MANIFEST_SCHEMA, rubricHashOf } from '../../web/src/manifest-keys.ts'
import { COURSE_PRICES } from '../../web/src/pricing.ts'
import { keyedCourse } from '../../web/src/authoring.ts'
import { publishedDrafts, dbConfigured } from './db.js'

/** Id kursus berkas, dibaca sebelum penggabungan apa pun. */
const FILE_IDS = new Set(MANIFESTS.map((m) => m.course.id))
export const fileCourseIds = () => FILE_IDS

// 30 detik: kursus yang diterbitkan CLI muncul paling lambat setengah menit kemudian. Harness memakai 0 (muat tiap permintaan).
const TTL_MS = Number(process.env.CATALOG_TTL_MS ?? 30_000)
let loadedAt = 0
let inflight = null
/** courseId → { draftId, price, publishedAt } untuk kursus database yang sudah dimuat. */
const fromDb = new Map()
const skipped = new Map()

/** ISO detik dengan zona — bentuk `publishedAt` manifest. */
export const isoSeconds = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Manifest publik + berkunci dari satu baris draf (issuer = penerbit kursus berkas, satu penerbit di demo ini). */
export function draftManifests (row, issuer = MANIFESTS[0]?.issuer) {
  const pub = { schema: MANIFEST_SCHEMA, issuer, publishedAt: isoSeconds(row.published_at), course: row.content, rubricHash: row.rubric_hash }
  return { pub, keyed: { ...pub, course: keyedCourse(row.content, row.answer_keys ?? {}) } }
}

function upsert (list, manifest) {
  const i = list.findIndex((m) => m.course.id === manifest.course.id)
  if (i >= 0) list[i] = manifest
  else list.push(manifest)
}

/**
 * Muat ulang kursus database bila sudah lewat TTL (atau `force`). Server memanggil ini di awal permintaan — murah bila
 * masih segar; CLI (terbit kredensial, publish:edge) memanggilnya sekali dengan `force`.
 */
export async function refreshCatalog ({ force = false, includeTest = process.env.LANCENA_ORIGIN === 'test' } = {}) {
  if (!dbConfigured()) return { loaded: 0, skipped: 0 }
  if (!force && Date.now() - loadedAt < TTL_MS) return { loaded: fromDb.size, skipped: skipped.size }
  inflight ??= (async () => {
    const rows = await publishedDrafts({ includeTest })
    for (const row of rows) {
      if (FILE_IDS.has(row.course_id)) { skipped.set(row.course_id, 'id sama dengan kursus berkas'); continue }
      const { pub, keyed } = draftManifests(row)
      let computed = null
      try { computed = rubricHashOf(keyed) } catch (e) { skipped.set(row.course_id, String(e.message ?? e)); continue }
      if (computed !== row.rubric_hash) { skipped.set(row.course_id, `rubricHash drift: computed ${computed}, signed ${row.rubric_hash}`); continue }
      upsert(MANIFESTS, keyed)
      upsert(PUBLIC_MANIFESTS, pub)
      if (row.price_units) COURSE_PRICES[row.course_id] = BigInt(row.price_units)
      else delete COURSE_PRICES[row.course_id]
      // B140 (D72): kursus yang diarsipkan TETAP dimuat — peserta lamanya masih masuk kelas, kuis/esai/praktiknya masih dinilai,
      // kertasnya masih bisa terbit, dan criteria-nya tetap tersaji. Yang berubah hanya katalog dan enroll baru.
      fromDb.set(row.course_id, { draftId: Number(row.id), price: row.price_units ?? null, publishedAt: pub.publishedAt, version: Number(row.version ?? 1), archived: Boolean(row.archived_at) })
    }
    loadedAt = Date.now()
    return { loaded: fromDb.size, skipped: skipped.size }
  })().finally(() => { inflight = null })
  return inflight
}

/** Kursus database yang dimuat, dalam bentuk publik (TANPA kunci) — isi `GET /catalog/published`. */
export function publishedCatalog () {
  return [...fromDb.entries()].map(([courseId, meta]) => ({
    manifest: PUBLIC_MANIFESTS.find((m) => m.course.id === courseId),
    price: meta.price, draftId: meta.draftId, version: meta.version ?? 1, archived: meta.archived === true,
  })).filter((x) => x.manifest)
}

/** B140: kursus database yang diarsipkan (tidak menerima peserta baru); kursus berkas tidak pernah diarsipkan lewat sini. */
export const courseArchived = (courseId) => fromDb.get(courseId)?.archived === true
/** B140: meta kursus database (draftId, versi, arsip) — null untuk kursus berkas. */
export const dbCourseMeta = (courseId) => fromDb.get(courseId) ?? null

export const catalogSkipped = () => Object.fromEntries(skipped)
