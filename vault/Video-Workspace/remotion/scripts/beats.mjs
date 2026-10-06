// B173 — find the beat grid of the score so cuts and accents land on beats (analysis only, no deps).
//   node scripts/beats.mjs [public/music/score-a.mp3]
// Low-passed energy (kick) -> onset strength -> tempo by autocorrelation (80–160 BPM) -> phase by comb sum.
// Writes src/data/beats.json: { bpm, period, offset, beats[], accents[] } (seconds). accents = strongest
// broadband onsets (risers landing, hits), useful for big visual moments.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(ROOT, process.argv[2] || 'public/music/score-a.mp3')
const SR = 11025
const pcm = (filter) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-af', filter, '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  const a = new Float32Array(buf.length / 2)
  for (let i = 0; i < a.length; i++) a[i] = buf.readInt16LE(i * 2) / 32768
  return a
}
const HOP = Math.round(SR * 0.01) // 10 ms
function envelope (x) {
  const n = Math.floor(x.length / HOP)
  const e = new Float32Array(n)
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < HOP; k++) { const v = x[i * HOP + k]; s += v * v } e[i] = Math.sqrt(s / HOP) }
  return e
}
function onset (e) {
  const o = new Float32Array(e.length)
  for (let i = 1; i < e.length; i++) o[i] = Math.max(0, Math.log1p(1000 * e[i]) - Math.log1p(1000 * e[i - 1]))
  return o
}
const low = onset(envelope(pcm('lowpass=f=150')))
const full = onset(envelope(pcm('highpass=f=40')))

// tempo
let best = { lag: 0, score: -1 }
for (let lag = Math.round(60 / 160 / 0.01); lag <= Math.round(60 / 80 / 0.01); lag++) {
  let s = 0
  for (let i = lag; i < low.length; i++) s += low[i] * low[i - lag]
  if (s > best.score) best = { lag, score: s }
}
// refine period with sub-hop precision: maximize comb energy over many beats
let bestP = { period: best.lag * 0.01, offset: 0, score: -1 }
for (let p = best.lag * 0.01 - 0.01; p <= best.lag * 0.01 + 0.01; p += 0.0005) {
  for (let off = 0; off < p; off += 0.005) {
    let s = 0
    for (let t = off; t < low.length * 0.01; t += p) { const i = Math.round(t / 0.01); s += (low[i] || 0) + 0.5 * ((low[i - 1] || 0) + (low[i + 1] || 0)) }
    if (s > bestP.score) bestP = { period: p, offset: off, score: s }
  }
}
const dur = low.length * 0.01
const beats = []
for (let t = bestP.offset; t < dur; t += bestP.period) beats.push(Math.round(t * 1000) / 1000)

// accents: strongest broadband onset peaks, at least 2 s apart
const peaks = []
for (let i = 2; i < full.length - 2; i++) if (full[i] > full[i - 1] && full[i] >= full[i + 1]) peaks.push({ t: i * 0.01, v: full[i] })
peaks.sort((a, b) => b.v - a.v)
const accents = []
for (const p of peaks) { if (accents.every((a) => Math.abs(a - p.t) >= 2)) accents.push(Math.round(p.t * 100) / 100); if (accents.length >= 14) break }
accents.sort((a, b) => a - b)

const out = { source: path.relative(ROOT, file).replace(/\\/g, '/'), bpm: Math.round(6000 / bestP.period) / 100, period: Math.round(bestP.period * 10000) / 10000, offset: Math.round(bestP.offset * 1000) / 1000, beats, accents }
fs.writeFileSync(path.join(ROOT, 'src/data/beats.json'), JSON.stringify(out) + '\n')
console.log(`bpm ${out.bpm} · period ${out.period}s · first beat ${out.offset}s · ${beats.length} beats`)
console.log('accents (s):', accents.join(', '))
