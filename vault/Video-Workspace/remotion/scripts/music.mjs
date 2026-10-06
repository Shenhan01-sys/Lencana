// B173 — compose an instrumental score that follows the scene boundaries (ElevenLabs Music, composition plan).
//   node scripts/music.mjs [--model music_v1] [--out music/score-a.mp3]
// Section lengths come from src/data/timeline.json so musical changes land on scene changes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = path.resolve(ROOT, '../../../.env')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1] }
const line = fs.readFileSync(ENV, 'utf8').split(/\r?\n/).find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l))
const key = line.replace(/^\s*ELEVENLABS_API_KEY\s*=\s*/, '').trim().replace(/^['"]|['"]$/g, '')
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/timeline.json'), 'utf8'))

const ids = Object.keys(tl.sceneStart)
const bounds = ids.map((id) => tl.sceneStart[id]).concat(tl.end)
const ms = (i) => Math.round((bounds[i + 1] - bounds[i]) * 1000)

const SECTIONS = [
  ['Problem', ['sparse ticking pulse', 'muted glitchy texture', 'dark filtered synth', 'suspense, a question hanging'], ['drums', 'melody']],
  ['Reveal', ['soft riser into a warm, confident major chord hit', 'then a light groove begins', 'sense of relief and wonder'], ['heavy drums']],
  ['Learn', ['upbeat driving groove', 'tight kick and claps', 'bright plucked synth motif', 'friendly and optimistic'], ['busy lead melody']],
  ['Agents', ['same groove with a curious arpeggiated synth', 'subtle tension', 'clever, precise feel'], ['dark', 'aggressive']],
  ['Credential', ['lift: brighter chords', 'added shimmer and handclaps', 'proud, rewarding feeling'], ['busy lead melody']],
  ['Verify', ['energetic peak of the track', 'full drums, wide synths', 'confident and trustworthy'], ['distortion']],
  ['Pipeline', ['smooth rolling bassline', 'fewer elements, flowing motion', 'steady and calm'], ['big drops']],
  ['Outro', ['final short build', 'one clean, satisfying ending hit', 'then a brief natural decay to silence'], ['fade-out loop', 'abrupt cut']],
]
if (SECTIONS.length !== ids.length) throw new Error('sections and scenes differ')

const plan = {
  positive_global_styles: ['modern tech product launch music', 'electronic pop', 'uplifting', 'confident', 'clean polished mix',
    'punchy drums', 'warm analog synth bass', 'bright plucks', '120 bpm', 'instrumental', 'leaves room for a voiceover'],
  negative_global_styles: ['vocals', 'singing', 'choir', 'spoken words', 'lyrics', 'lo-fi', 'dubstep', 'horror', 'meme', 'comedy'],
  sections: SECTIONS.map(([name, pos, neg], i) => ({ section_name: name, positive_local_styles: pos, negative_local_styles: neg, duration_ms: ms(i), lines: [] })),
}
const model = arg('model', 'music_v1')
const out = path.join(ROOT, 'public', arg('out', 'music/score-a.mp3'))
fs.mkdirSync(path.dirname(out), { recursive: true })
console.log('sections (ms):', plan.sections.map((s) => `${s.section_name} ${s.duration_ms}`).join(' · '), '| total', plan.sections.reduce((a, s) => a + s.duration_ms, 0))

const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model_id: model, composition_plan: plan, respect_sections_durations: true }),
})
if (!r.ok) { console.log('music error', r.status, (await r.text()).slice(0, 400)); process.exit(1) }
fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()))
fs.writeFileSync(out.replace(/\.mp3$/, '.plan.json'), JSON.stringify({ model, plan }, null, 2))
console.log('ok', out)
