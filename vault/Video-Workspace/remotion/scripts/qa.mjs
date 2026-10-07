// B173 — automatic gate for a rendered pitch (AC-B173 #1 #3 #4 #7 #8). Prints a report for T97; exit 1 = red.
//   node scripts/qa.mjs out/lencana-pitch.mp4
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = process.argv[2]
let fails = 0
const ok = (name, pass, detail) => { console.log(`  ${pass ? 'ok   ' : 'GAGAL'} ${name}${detail ? ' -> ' + detail : ''}`); if (!pass) fails++ }
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 })

// #1 file shape
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate', '-of', 'json', file]).stdout)
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio')
const dur = Number(probe.format.duration)
console.log('#1 berkas')
ok('1920×1080', v.width === 1920 && v.height === 1080, `${v.width}×${v.height}`)
ok('30 fps', v.r_frame_rate === '30/1', v.r_frame_rate)
ok('H.264 + AAC', v.codec_name === 'h264' && a?.codec_name === 'aac', `${v.codec_name} + ${a?.codec_name} ${a?.sample_rate} Hz`)
// AC-B173#1: 85–95 s until draft 4; builder 7 Oct: "tambahin 10 detik lagi untuk bagian problemnya" → 95–110 s
ok('durasi 95–110 detik', dur >= 95 && dur <= 110, `${dur.toFixed(2)} s`)

// #7 loudness
console.log('#7 audio')
const lr = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
const I = Number((lr.match(/I:\s+(-?[0-9.]+) LUFS/g) || ['I: 99']).pop().match(/-?[0-9.]+/)[0])
const TP = Number((lr.match(/Peak:\s+(-?[0-9.]+) dBFS/g) || ['Peak: 99']).pop().match(/-?[0-9.]+/)[0])
ok('loudness −14 ± 1 LUFS', Math.abs(I + 14) <= 1, `${I} LUFS`)
ok('true peak ≤ −1 dBTP', TP <= -1, `${TP} dBTP`)

// #8 photosensitive: frame-average luma swings ≥ 20/255, counted per 1-second window
console.log('#8 kedipan (WCAG 2.3.1, rata-rata luma per frame)')
const ss = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', 'scale=320:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-']).stderr
const ys = [...ss.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map((m) => Number(m[1]))
let worst = 0, worstAt = 0
for (let i = 0; i + 30 <= ys.length; i++) {
  let jumps = 0
  for (let k = i + 1; k < i + 30; k++) if (Math.abs(ys[k] - ys[k - 1]) >= 20) jumps++
  if (jumps > worst) { worst = jumps; worstAt = i }
}
ok('tidak ada > 3 kedipan per detik (lonjakan luma ≥ 20 per jendela 1 dtk < 6)', worst < 6, `terbanyak ${worst} lonjakan di sekitar ${(worstAt / 30).toFixed(1)} s · ${ys.length} frame dibaca`)

// #3 captions: coverage and contrast
console.log('#3 caption')
const vo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/vo.json'), 'utf8'))
const words = vo.lines.reduce((n, l) => n + l.words.length, 0)
const captionsSrc = fs.readFileSync(path.join(ROOT, 'src/components/Captions.tsx'), 'utf8')
ok('caption dibangun dari semua kata VO (tanpa transkripsi)', /wordsOf\(id\)/.test(captionsSrc) && words > 150, `${words} kata dalam ${vo.lines.length} baris`)
const fontSize = Number((captionsSrc.match(/fontSize:\s*(\d+)/) || [0, 0])[1])
ok('huruf caption ≥ 44 px', fontSize >= 44, `${fontSize} px`)
const lum = (hex) => { const c = hex.match(/[0-9a-f]{2}/gi).map((x) => { const s = parseInt(x, 16) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a1, b1) => { const [x, y] = [lum(a1), lum(b1)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const plate = '#0e1115'
for (const [n, col] of [['kata diucapkan (emas)', '#f0b90b'], ['kata sudah lewat', '#eaecef'], ['kata berikutnya', '#9aa3ae']]) ok(`kontras ${n} ≥ 4.5:1`, ratio(col, plate) >= 4.5, ratio(col, plate).toFixed(1) + ':1')

// #4 forbidden phrases in the script and in every string the scenes draw
console.log('#4 frasa terlarang (Claims-Cheat-Sheet)')
const BAN = [/\bcertified\b/i, /\bcompatible\b/i, /\bconformant\b/i, /\bhumans?\b/i, /\bmentors?\b/i, /on-chain diploma/i, /stored on-chain/i, /anti-cheat/i, /cheat-proof/i, /tamper-proof/i, /\btrustless\b/i, /production-ready/i, /\bmainnet\b/i, /\bmarketplace\b/i, /anyone can create a course/i, /never hold your keys/i, /legally valid/i, /\breputation\b/i, /single signature/i]
const texts = []
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'))
script.lines.forEach((l) => texts.push([`script ${l.id}`, l.text]))
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.tsx') ? [path.join(d, e.name)] : []))
for (const f of walk(path.join(ROOT, 'src'))) {
  const code = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const strings = [...code.matchAll(/>([^<>{}]+)</g), ...code.matchAll(/'([^'\n]{3,})'/g), ...code.matchAll(/"([^"\n]{3,})"/g), ...code.matchAll(/`([^`\n]{3,})`/g)].map((m) => m[1])
  strings.forEach((s) => texts.push([path.relative(ROOT, f), s]))
}
const hits = []
for (const [where, s] of texts) for (const re of BAN) if (re.test(s)) hits.push(`${where}: "${s.trim().slice(0, 70)}" (${re})`)
ok('nol frasa terlarang', hits.length === 0, hits.length ? hits.join(' | ') : `${texts.length} potong teks diperiksa`)

console.log(fails ? `QA MERAH — ${fails} gagal` : 'QA HIJAU — semua pemeriksaan lulus')
process.exit(fails ? 1 : 0)
