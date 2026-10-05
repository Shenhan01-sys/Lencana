/**
 * Membangun `api/_lib/lencana-share.mjs` dari `web/src/api-entry.ts` (B168): bundel ESM mandiri untuk fungsi Vercel (`api/share.mjs`, `api/card.mjs`).
 *
 *   cd web && npm run build:api            tulis ulang bundel
 *   cd web && node scripts/build-api.mjs --check   bandingkan dengan yang ada di repo; keluar 1 bila basi (dijalankan `npm run probe`)
 *
 * Bundelnya DICOMMIT (bukan dibangun di Vercel): artefak yang diuji lokal adalah byte yang sama dengan yang dideploy, dan build Vercel tidak
 * bergantung pada langkah tambahan. Kesegarannya dijaga `probe`, jadi mengubah `certificate.ts`/`share.ts` tanpa membangun ulang bundel = merah.
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const entry = fileURLToPath(new URL('../src/api-entry.ts', import.meta.url))
const outfile = fileURLToPath(new URL('../../api/_lib/lencana-share.mjs', import.meta.url))
const BANNER = '// GENERATED oleh web/scripts/build-api.mjs dari web/src/api-entry.ts (+ certificate.ts, share.ts, hosts.ts, certificate-logo.ts) — JANGAN disunting.\n// Bangun ulang: cd web && npm run build:api. Kesegaran diperiksa oleh npm run probe (B168).\n'

export async function bundle () {
  const r = await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', target: 'node20', write: false, legalComments: 'none',
    banner: { js: BANNER }, logLevel: 'silent', outfile,
  })
  return r.outputFiles[0].text
}

const isMain = !!process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
if (isMain) {
  const text = await bundle()
  if (process.argv.includes('--check')) {
    const have = existsSync(outfile) ? readFileSync(outfile, 'utf8') : null
    if (have === text) { console.log('api/_lib/lencana-share.mjs segar'); process.exit(0) }
    console.error('api/_lib/lencana-share.mjs BASI atau tidak ada — jalankan: cd web && npm run build:api')
    process.exit(1)
  }
  mkdirSync(dirname(outfile), { recursive: true })
  writeFileSync(outfile, text)
  console.log(`ditulis ${outfile} (${Math.round(text.length / 1024)} KB)`)
}
