// B173 — render chosen frames of the pitch as PNG (style frames / QA) from ONE bundle.
//   node scripts/stills.mjs 36,117,264 [outDir]      frames in absolute frame numbers
//   node scripts/stills.mjs s=4.5,11.3               or seconds with "s=" prefix
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let spec = process.argv[2] || '0'
const out = path.resolve(process.argv[3] || path.join(ROOT, 'out/stills'))
fs.mkdirSync(out, { recursive: true })
const secs = spec.startsWith('s=')
if (secs) spec = spec.slice(2)
const frames = spec.split(',').map((x) => (secs ? Math.round(Number(x) * 30) : Number(x)))

const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), webpackOverride: (c) => c })
const composition = await selectComposition({ serveUrl, id: 'LencanaPitch', inputProps: {} })
for (const frame of frames) {
  const file = path.join(out, `f${String(frame).padStart(4, '0')}.png`)
  try {
    await renderStill({ serveUrl, composition, frame, output: file, imageFormat: 'png', chromiumOptions: { gl: 'angle' } })
    console.log('still', frame, (frame / 30).toFixed(2) + 's', file)
  } catch (e) {
    console.log('FAIL', frame, (frame / 30).toFixed(2) + 's', String(e.message).split('\n').slice(0, 4).join(' | '))
  }
}
