/**
 * `src/drafts.js` — logika draf kursus sisi server (B133, D67), dipakai rute, CLI terbit (`npm run course:publish`), dan
 * harness, supaya ketiganya menghitung hal yang sama dengan kode yang sama.
 *
 *   prepareDraft   normalkan kiriman halaman (skema bersama `web/src/authoring.ts`), hash isi, audit (aturan kursus berkas
 *                  + batas editor + kunci lengkap + id belum dipakai)
 *   publishPlan    dari draf tersimpan: audit ulang, `rubricHash` (aturan penilaian, ikut ditandatangani kunci penerbit)
 *                  dan `manifestHash` (isi + waktu terbit)
 */
// Lencana-B133 status=TERBUKA 2026-10-03 — draf disiapkan (normalisasi + hash + audit) dan direncanakan terbit (rubricHash + manifestHash dari isi + kunci tersimpan) dengan satu kode untuk rute, CLI, dan harness. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { normalizeDraft, draftHash, auditDraft } from '../../web/src/authoring.ts'
import { rubricHashOf, manifestHashOf } from '../../web/src/manifest-keys.ts'
import { fileCourseIds, draftManifests, isoSeconds } from './catalog.js'
import { liveDraftCourseIds } from './db.js'

/** @returns {Promise<{ ok: true, payload, contentHash, problems } | { ok: false, errors: string[] }>} */
export async function prepareDraft (input, { institution, exceptDraftId = null }) {
  const { payload, errors } = normalizeDraft(input, institution)
  if (!payload) return { ok: false, errors }
  const taken = new Set([...fileCourseIds(), ...await liveDraftCourseIds(exceptDraftId)])
  return { ok: true, payload, contentHash: draftHash(payload), problems: auditDraft(payload, taken) }
}

/** Rencana terbit satu baris draf yang diajukan: masalah yang tersisa (harus kosong), hash kebijakan, hash manifest. */
export async function publishPlan (row, { publishedAt = new Date() } = {}) {
  const taken = new Set([...fileCourseIds(), ...await liveDraftCourseIds(row.id)])
  const problems = auditDraft({ course: row.content, keys: row.answer_keys ?? {}, price: row.price_units ?? null }, taken)
  const at = isoSeconds(publishedAt)
  const { keyed } = draftManifests({ ...row, published_at: at })
  return { problems, rubricHash: rubricHashOf(keyed), manifestHash: manifestHashOf(keyed), publishedAt: at }
}
