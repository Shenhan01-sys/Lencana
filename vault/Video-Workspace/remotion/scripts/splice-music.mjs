// B173 v3 — lengthen the approved score without recomposing it: duplicate whole bars at a bar line, so every beat
// and accent after the splice moves by exactly N bars (the scenes after it move by the same amount in timeline.json).
//   node scripts/splice-music.mjs [in=public/music/score-a.mp3] [out=public/music/score-b.mp3] [at=50.15] [bars=2]
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [inF = 'public/music/score-a.mp3', outF = 'public/music/score-b.mp3', at = '50.15', bars = '2'] = process.argv.slice(2)
const BAR = 4 * 0.501 // 119.8 BPM grid from beats.json (period 0.501 s)
const a = Number(at), len = Number(bars) * BAR
const graph = `[0:a]atrim=0:${(a + len).toFixed(3)},asetpts=PTS-STARTPTS[x];[0:a]atrim=${a.toFixed(3)},asetpts=PTS-STARTPTS[y];[x][y]acrossfade=d=0.02:c1=tri:c2=tri[o]`
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(ROOT, inF), '-filter_complex', graph, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '192k', path.join(ROOT, outF)], { encoding: 'utf8' })
if (r.status !== 0) { console.log(r.stderr); process.exit(1) }
const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(ROOT, outF)], { encoding: 'utf8' }).stdout.trim()
console.log(`spliced ${bars} bars (${len.toFixed(3)} s) at ${a} s → ${outF} (${Number(d).toFixed(2)} s)`)
