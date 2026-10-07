// B173 draft 6 — take the beat-locked "crackle" out of a score without dulling it (builder 7 Oct on the hype version:
// "ada suara kresek-kresek … satu tempo satu tempo"). Measured on alt-hype-long: no digital clicks, but a short noise
// burst on every beat in the Agents section, 18–21 dB louder than between beats in 5–18 kHz, plus mp3-128 sizzle up top.
// The high band (> 5 kHz) is split off and squashed by a fast compressor (bursts come down, steady hats stay),
// then low-passed at 12 kHz; everything below 5 kHz is untouched. Output is lossless (24-bit WAV), no second mp3 pass.
//   node scripts/soften-music.mjs <in.mp3> <out.wav>
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [inF, outF] = process.argv.slice(2)
if (!inF || !outF) { console.log('usage: node scripts/soften-music.mjs <in.mp3> <out.wav>'); process.exit(2) }
const graph = '[0:a]acrossover=split=5000:order=4th[lo][hi];[hi]acompressor=threshold=-40dB:ratio=10:attack=0.1:release=35:knee=2:makeup=1,lowpass=f=12000:p=2[hic];[lo][hic]amix=inputs=2:normalize=0[o]'
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.resolve(ROOT, inF), '-filter_complex', graph, '-map', '[o]', '-ar', '48000', '-c:a', 'pcm_s24le', path.resolve(ROOT, outF)], { encoding: 'utf8' })
if (r.status !== 0) { console.log(r.stderr); process.exit(1) }
console.log(`softened → ${outF}`)
