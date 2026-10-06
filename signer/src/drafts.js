/**
 * `src/drafts.js` — logika draf kursus sisi server (B133, D67), dipakai rute, CLI terbit (`npm run course:publish`), dan
 * harness, supaya ketiganya menghitung hal yang sama dengan kode yang sama.
 *
 *   prepareDraft   normalkan kiriman halaman (skema bersama `web/src/authoring.ts`), hash isi, audit (aturan kursus berkas
 *                  + batas editor + kunci lengkap + id belum dipakai)
 *   publishPlan    dari draf tersimpan: audit ulang, `rubricHash` (aturan penilaian, ikut ditandatangani kunci penerbit)
 *                  dan `manifestHash` (isi + waktu terbit)
 */
// Lencana-B133 status=SELESAI 2026-10-03 — draf disiapkan (normalisasi + hash + audit) dan direncanakan terbit (rubricHash + manifestHash dari isi + kunci tersimpan) dengan satu kode untuk rute, CLI, dan harness. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { normalizeDraft, draftHash, auditDraft, versionProblems, versionedId } from '../../web/src/authoring.ts'
import { rubricHashOf, manifestHashOf } from '../../web/src/manifest-keys.ts'
import { fileCourseIds, draftManifests, isoSeconds } from './catalog.js'
import { liveDraftCourseIds } from './db.js'

// B140 (D72): aturan versi baru tinggal di modul bersama `web/src/authoring.ts` — server dan editor halaman menjalankan kode yang
// sama, jadi masalah yang tampil di editor = masalah yang dilaporkan server. Di sini hanya baris DB diubah ke bentuk `VersionBase`.
export { versionedId }
const asBase = (row) => (row ? { courseId: row.course_id, rubricHash: row.rubric_hash ?? null, version: Number(row.version ?? 1) } : null)

/** Id yang tidak boleh dipakai draf ini; versi baru boleh memakai id versi yang digantikannya. */
async function takenFor (exceptDraftId, base) {
  const taken = new Set([...fileCourseIds(), ...await liveDraftCourseIds(exceptDraftId)])
  if (base) taken.delete(base.course_id)
  return taken
}

/** @returns {Promise<{ ok: true, payload, contentHash, problems } | { ok: false, errors: string[] }>} */
export async function prepareDraft (input, { institution, exceptDraftId = null, base = null }) {
  const { payload, errors } = normalizeDraft(input, institution)
  if (!payload) return { ok: false, errors }
  const problems = [...auditDraft(payload, await takenFor(exceptDraftId, base)), ...versionProblems(payload, asBase(base))]
  return { ok: true, payload, contentHash: draftHash(payload), problems }
}

/** Rencana terbit satu baris draf yang diajukan: masalah yang tersisa (harus kosong), hash kebijakan, hash manifest. */
export async function publishPlan (row, { publishedAt = new Date(), base = null } = {}) {
  const payload = { course: row.content, keys: row.answer_keys ?? {}, price: row.price_units ?? null }
  const problems = [...auditDraft(payload, await takenFor(row.id, base)), ...versionProblems(payload, asBase(base))]
  const at = isoSeconds(publishedAt)
  const { keyed } = draftManifests({ ...row, published_at: at })
  return { problems, rubricHash: rubricHashOf(keyed), manifestHash: manifestHashOf(keyed), publishedAt: at }
}
