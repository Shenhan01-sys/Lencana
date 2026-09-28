/**
 * Skema kunci Workers KV — SATU-satunya tempat prefiksnya ditulis.
 *
 * Kenapa di sini dan bukan di masing-masing berkas: `publish.js` menulis, `worker.mjs` membaca.
 * Dua salinan konstanta adalah bug yang menunggu: publisher bisa menulis `credential/...` sementara
 * tepi membaca `credentials/...`, dan gejalanya adalah 404 atas dokumen yang jelas-jelas ada —
 * kelas kegagalan yang paling mahal di sistem yang klaimnya "bisa diperiksa orang lain".
 */
import { REVOCATION, SUSPENSION } from './statusList.js'

export const PURPOSES = [REVOCATION, SUSPENSION]

/** Umur cache yang boleh dipercaya pembaca, dalam detik. 0 = jangan pernah men-cache. */
export const CACHE_TTL_SECONDS = 30

export const KV_KEYS = {
  state: () => 'state.json',
  issuer: (slug) => `issuer/${slug}`,
  credential: (hash) => `credential/${hash}`,
  record: (hash) => `record/${hash}`,
  criteria: (courseId) => `criteria/${courseId}`,
  result: (courseId, hash) => `result/${courseId}/${hash}`,
  list: (purpose) => `list/${purpose}`,
}

/** Route yang dikenali tepi sajian, dipakai test pascaterbit untuk menuntut bentuk respons. */
export const EDGE_ROUTES = {
  healthz: '/healthz',
  issuer: (slug) => `/issuers/${slug}`,
  criteria: (courseId) => `/criteria/${courseId}`,
  credential: (hash) => `/credentials/${hash}`,
  record: (hash) => `/credentials/${hash}?format=record`,
  list: (purpose) => `/credentials/status/${purpose}`,
  result: (courseId, hash) => `/results/${courseId}/${hash}`,
}
