/**
 * `api-entry.ts` — pintu masuk satu-satunya yang dipaketkan ke fungsi Vercel (`api/`), B168.
 *
 * `scripts/build-api.mjs` mem-bundle berkas ini (dan murni-murni yang diimpornya) menjadi `api/_lib/lencana-share.mjs`, supaya fungsi server
 * memakai KODE YANG SAMA dengan app untuk memetakan dokumen, menyusun tag Open Graph, dan menggambar kartu — tanpa impor lintas paket,
 * tanpa kompilasi TypeScript di Vercel, dan dengan artefak yang bisa diuji persis seperti yang akan dideploy.
 */
export { buildCertificate, isCourseSlug, isCredentialHash, parseCredentialDoc, parseCriteria } from './certificate'
export { cardUrl, ogMeta, shareHtml, shareUrl, socialCardSvg } from './share'
export { APP_HOST, CREDENTIAL_HOST } from './hosts'
