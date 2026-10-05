// Pemuat bersama untuk fungsi bagikan (B168): dokumen kredensial (wajib) + dokumen kriteria (boleh gagal) dari host tepi, dipetakan dengan kode
// yang SAMA dengan app (bundel `lencana-share.mjs`). Tanpa chain: status keberlakuan tidak ditulis di halaman bagikan maupun gambar kartu —
// perayap menyimpan keduanya lama, dan status basi yang tampak resmi adalah klaim yang tidak boleh kita buat.
import { APP_HOST, CREDENTIAL_HOST, buildCertificate, isCourseSlug, isCredentialHash, parseCredentialDoc, parseCriteria } from './lencana-share.mjs'

async function getJson (url, ms = 8000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { accept: 'application/json' } })
    if (r.status === 404) return { state: 'missing' }
    if (!r.ok) return { state: 'failed', why: `HTTP ${r.status}` }
    return { state: 'ok', json: await r.json() }
  } catch (e) {
    return { state: 'failed', why: e instanceof Error ? e.message : String(e) }
  }
}

/** `{ ok: true, cert }` atau `{ ok: false, status, why }` (400 hash tidak sah · 404 dokumen tidak ada/tidak cukup · 502 dokumen gagal diambil). */
export async function loadShareCertificate (rawHash) {
  const hash = String(rawHash ?? '').toLowerCase()
  if (!isCredentialHash(hash)) return { ok: false, status: 400, why: 'bukan-id-kredensial' }
  const doc = await getJson(`${CREDENTIAL_HOST}/credentials/${hash}`)
  if (doc.state === 'missing') return { ok: false, status: 404, why: 'dokumen-tidak-tersaji' }
  if (doc.state === 'failed') return { ok: false, status: 502, why: 'dokumen-gagal-diambil' }
  const cred = parseCredentialDoc(doc.json)
  if (!cred) return { ok: false, status: 404, why: 'dokumen-tidak-cukup' }
  const crit = cred.courseId && isCourseSlug(cred.courseId)
    ? await getJson(`${CREDENTIAL_HOST}/criteria/${encodeURIComponent(cred.courseId)}`)
    : { state: 'missing' }
  const criteria = crit.state === 'ok' ? parseCriteria(crit.json) : null
  const cert = buildCertificate({
    hash, cred, criteria, status: { verdict: 'BELUM TERBACA', readOn: new Date().toISOString() }, appHost: APP_HOST, testnet: true,
  })
  return { ok: true, cert }
}

export { APP_HOST }
