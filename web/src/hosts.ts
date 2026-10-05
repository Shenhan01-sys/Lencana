/**
 * `hosts.ts` — dua host publik Lencana, SATU sumber (B168). Dipakai app (lewat `config.ts`, yang mengekspor ulang namanya) dan
 * fungsi Vercel (`api/`, lewat `api-entry.ts`): berkas ini tanpa impor apa pun, jadi fungsi server tidak ikut membawa viem/DOM.
 */

/**
 * Tempat dokumen kredensial kita BENAR-BENAR disajikan: Worker + KV yang diisi
 * `npm run publish:edge`, dan satu-satunya host yang terbukti menjawab hari ini
 * (`npm run verify:edge` → 19 dari 19 kertas terbaca publik).
 */
export const CREDENTIAL_HOST = 'https://lencana-edge.hansgunawan775.workers.dev'

/**
 * Tempat halaman ini benar-benar dibuka orang (Vercel) — diukur 29 Sep: HTTP 200.
 * Bukan "lencana.io": domain itu tidak pernah kita pegang dan dns.resolve-nya ENOTFOUND (A dan AAAA).
 * Tujuan QR di lembar sertifikat (B165) dan tautan bagikan per sertifikat (B168).
 */
export const APP_HOST = 'https://lencana-psi.vercel.app'
