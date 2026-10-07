// B173 draft 5 — lengthen a score's intro by repeating ONE of its own bars, so the piece the builder auditioned stays
// the same piece (the problem section grew by 5 bars = 10.02 s at 119.76 BPM; everything after it moves by whole bars,
// so cuts that sat on beats still sit on beats).
//   node scripts/extend-intro.mjs <in.mp3> <out.mp3> <barStart s> <times> [period=0.501] [rampFrom=0.6]
// The bar [barStart, barStart + 4·period) is inserted <times> times right after itself, with a gentle volume ramp
// (rampFrom → 1) so the repeat builds into the reveal; joins get 5 ms fades instead of crossfades, so the added length
// is exact (a crossfade would eat its own length at every join).
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [inF, outF, startS, timesS, periodS = '0.501', rampS = '0.6'] = process.argv.slice(2)
if (!inF || !outF || !startS || !timesS) { console.log('usage: node scripts/extend-intro.mjs <in> <out> <barStart> <times> [period] [rampFrom]'); process.exit(2) }
const bar = 4 * Number(periodS), s = Number(startS), n = Number(timesS), insertAt = s + bar, add = n * bar
const ramp = Number(rampS)
const sr = 44100
const graph = [
  `[0:a]atrim=0:${insertAt.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=out:st=${(insertAt - 0.005).toFixed(4)}:d=0.005[a0]`,
  `[0:a]atrim=${s.toFixed(4)}:${insertAt.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=${(bar - 0.005).toFixed(4)}:d=0.005,aloop=loop=${n - 1}:size=${Math.round(bar * sr)},asetpts=N/SR/TB,volume='${ramp}+${(1 - ramp).toFixed(3)}*t/${add.toFixed(3)}':eval=frame[l]`,
  `[0:a]atrim=${insertAt.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.005[a2]`,
  '[a0][l][a2]concat=n=3:v=0:a=1[o]',
].join(';')
const src = path.resolve(ROOT, inF), dst = path.resolve(ROOT, outF)
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', graph, '-map', '[o]', '-ar', String(sr), '-c:a', 'libmp3lame', '-b:a', '192k', dst], { encoding: 'utf8' })
if (r.status !== 0) { console.log(r.stderr); process.exit(1) }
const d = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout.trim())
console.log(`${path.basename(dst)}: ${d(src).toFixed(3)} s → ${d(dst).toFixed(3)} s (+${(d(dst) - d(src)).toFixed(3)}, expected +${add.toFixed(3)}); bar ${s}–${insertAt.toFixed(3)} ×${n} inserted at ${insertAt.toFixed(3)} s`)
