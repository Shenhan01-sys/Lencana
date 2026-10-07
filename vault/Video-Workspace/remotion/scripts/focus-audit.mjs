// B173 — audit every highlight ring against the real page: draw each box of src/data/focus.json (with the 8 px pad the
// <Focus> ring adds) on its capture, crop around it with a 20 px grid, label it, and tile the crops into sheets.
//   node scripts/focus-audit.mjs [name,name] → out/focus-audit/<name>.png + sheet-N.png
// Coordinates are capture CSS px; the PNGs are deviceScaleFactor 2, so everything is drawn ×2.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out/focus-audit')
fs.mkdirSync(OUT, { recursive: true })
const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/focus.json'), 'utf8'))
const pick = process.argv[2] ? new Set(process.argv[2].split(',')) : null
const names = Object.keys(all).filter((k) => k !== '_' && (!pick || pick.has(k)))
const FONT = 'C\\:/Windows/Fonts/arial.ttf'
const PAD = 8 // <Focus> draws at x-8, y-8, w+16, h+16
const MARGIN = 80 // CSS px of page around the ring
const ff = (args) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr.slice(0, 400)) }

const done = []
for (const n of names) {
  const f = all[n]
  const src = path.join(ROOT, 'public/captures', f.capture)
  if (!fs.existsSync(src)) { console.log('MISSING', n, f.capture); continue }
  const rx = f.x - PAD, ry = f.y - PAD, rw = f.w + 2 * PAD, rh = f.h + 2 * PAD
  // crop origin on the 20 px grid so grid lines fall on round CSS coordinates
  const cx = Math.max(0, Math.floor((rx - MARGIN) / 20) * 20), cy = Math.max(0, Math.floor((ry - MARGIN) / 20) * 20)
  const cw = Math.min(1600 - cx, Math.ceil((rw + 2 * MARGIN) / 20) * 20 + 20), ch = Math.min(1000 - cy, Math.ceil((rh + 2 * MARGIN) / 20) * 20 + 20)
  const label = `${n}  (${f.x},${f.y} ${f.w}x${f.h})  →  ${f.target}`.replace(/[:']/g, ' ')
  const vf = [
    `crop=${cw * 2}:${ch * 2}:${cx * 2}:${cy * 2}`,
    'drawgrid=w=40:h=40:t=1:c=white@0.18',
    `drawbox=x=${(rx - cx) * 2}:y=${(ry - cy) * 2}:w=${rw * 2}:h=${rh * 2}:color=0x00ff66@0.95:t=5`,
    `drawtext=fontfile='${FONT}':text='x=${cx} y=${cy} (grid 20 px)':x=8:y=8:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.75`,
    `drawtext=fontfile='${FONT}':text='${label}':x=8:y=h-40:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.8`,
  ].join(',')
  const out = path.join(OUT, `${n}.png`)
  ff(['-i', src, '-vf', vf, out])
  done.push(out)
  console.log('audit', n, `crop ${cx},${cy} ${cw}x${ch}`)
}
// sheets: 4 per sheet, each scaled to 960 wide, stacked 2×2 (padded to the tallest)
for (let s = 0; s * 4 < done.length; s++) {
  const g = done.slice(s * 4, s * 4 + 4)
  const args = []
  g.forEach((f) => args.push('-i', f))
  const parts = g.map((_, i) => `[${i}:v]scale=960:600:force_original_aspect_ratio=decrease,pad=960:600:(ow-iw)/2:(oh-ih)/2:black[v${i}]`)
  const layout = g.map((_, i) => `${(i % 2) * 960}_${Math.floor(i / 2) * 600}`).join('|')
  const filter = g.length === 1 ? `${parts[0].replace(/\[v0\]$/, '[o]')}` : `${parts.join(';')};${g.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${g.length}:layout=${layout}:fill=black[o]`
  ff([...args, '-filter_complex', filter, '-map', '[o]', path.join(OUT, `sheet-${s + 1}.png`)])
}
console.log(`${done.length} rings drawn → ${path.relative(ROOT, OUT)}`)
