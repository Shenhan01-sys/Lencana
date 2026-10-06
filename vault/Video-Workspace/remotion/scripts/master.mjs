// B173 — master the rendered pitch: two-pass EBU R128 loudness normalisation to −14 LUFS integrated,
// true peak ≤ −1.5 dBTP (YouTube), video stream copied untouched.
//   node scripts/master.mjs out/draft.mp4 out/lencana-pitch.mp4
import { spawnSync } from 'node:child_process'

const [src, dst] = process.argv.slice(2)
if (!src || !dst) { console.log('usage: node scripts/master.mjs <in.mp4> <out.mp4>'); process.exit(2) }
const ff = (args) => {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1 << 26 })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-400)}`)
  return r.stderr
}
const target = 'I=-14:TP=-1.5:LRA=11'
const e1 = ff(['-hide_banner', '-nostats', '-i', src, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'])
const m = JSON.parse(e1.slice(e1.lastIndexOf('{'), e1.lastIndexOf('}') + 1))
console.log(`measured: I=${m.input_i} LUFS · TP=${m.input_tp} dBTP · LRA=${m.input_lra} LU`)
const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
ff(['-v', 'error', '-y', '-i', src, '-c:v', 'copy', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', dst])
const e2 = ff(['-hide_banner', '-nostats', '-i', dst, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
const I = (e2.match(/I:\s+(-?[0-9.]+) LUFS/g) || []).pop()
const P = (e2.match(/Peak:\s+(-?[0-9.]+) dBFS/g) || []).pop()
console.log(`mastered → ${dst}: ${I} · true ${P}`)
