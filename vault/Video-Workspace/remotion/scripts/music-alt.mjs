// B173 v3 — alternative scores composed to the v3 cut (ElevenLabs Music, composition plan), for the builder to pick by ear.
//   node scripts/music-alt.mjs --style hype|nusantara [--model music_v1]
// Unlike music.mjs (one section per scene), the plan also starts sections ON the slam words, read from vo.json the
// same way the scenes find them: SOULBOUND, NO WALLET, the final build, "Lencana." and the end card. ElevenLabs
// requires every section to last 3–120 s, so each boundary is checked before anything is sent.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = path.resolve(ROOT, '../../../.env')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1] }
const line = fs.readFileSync(ENV, 'utf8').split(/\r?\n/).find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l))
const key = line.replace(/^\s*ELEVENLABS_API_KEY\s*=\s*/, '').trim().replace(/^['"]|['"]$/g, '')
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/timeline.json'), 'utf8'))
const vo = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/vo.json'), 'utf8'))

const bare = (s) => s.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/\.$/, '')
const word = (id, w, nth = 0) => {
  const l = vo.lines.find((x) => x.id === id)
  const hits = l.words.filter((x) => bare(x.text) === bare(w))
  if (!hits[nth]) throw new Error(`no "${w}" in ${id}`)
  return tl.voStart[id] + hits[nth].startMs / 1000
}
const S = tl.sceneStart
const F = 1 / 30
// [name, start in seconds] — the picture events each section must start on (scene files: S5/S6/S8)
const MARKS = [
  ['Problem', 0],
  ['Reveal', S.s2],
  ['Learn', S.s3],
  ['Agents', S.s4],
  ['Credential build', S.s5],
  ['Soulbound drop', word('s5', 'soulbound')],
  ['Verify', S.s6],
  ['No wallet stabs', word('s6', 'no') - 2 * F],
  ['Pipeline', S.s7],
  ['Final build', word('s8', 'Lencana.') - 6 * F - 3.05],
  ['Name drop', word('s8', 'Lencana.') - 6 * F],
  ['Outro', word('s8', 'Live') - 4 * F],
]
const ends = MARKS.map((_, i) => (i + 1 < MARKS.length ? MARKS[i + 1][1] : tl.end))
const durMs = MARKS.map(([, s], i) => Math.round(ends[i] * 1000) - Math.round(s * 1000))
durMs.forEach((d, i) => { if (d < 3000 || d > 120000) throw new Error(`section ${MARKS[i][0]} lasts ${d} ms (ElevenLabs needs 3000–120000)`) })

const STYLES = {
  hype: {
    global: ['high-energy tech product launch trailer music', 'future bass and electro-pop', 'punchy side-chained synths', 'huge clean drops',
      'tight modern drums', 'deep sub bass', '120 bpm', 'instrumental', 'polished, loud, exciting mix', 'leaves room for a voiceover'],
    sections: {
      'Problem': [['tense ticking hi-hat pulse', 'filtered glitchy synth stabs', 'dark suspense, a question hanging'], ['full drums', 'melody']],
      'Reveal': [['reverse swell into a bright, wide major chord hit right at the start', 'shimmering pads', 'a light kick fades in', 'wonder and relief'], ['heavy drop']],
      'Learn': [['driving four-on-the-floor groove', 'bouncy side-chained chord plucks', 'claps on 2 and 4', 'optimistic and fast-moving'], ['busy lead melody']],
      'Agents': [['same tempo with a half-time feel', 'curious arpeggiated synth', 'clicky precise percussion', 'focused tension that builds at the end'], ['dark', 'aggressive']],
      'Credential build': [['rising energy', 'snare roll and white-noise riser building to a drop', 'brighter chords'], ['drop']],
      'Soulbound drop': [['big future-bass drop at the very first beat', 'heavy sub-bass hit', 'wide supersaw chords', 'triumphant, precious, special feeling'], ['dubstep wobble', 'distortion']],
      'Verify': [['short breath: filtered drums and a low pulse', 'tension'], ['melody']],
      'No wallet stabs': [['two hard synth-brass stab hits at the start, then full energy', 'confident peak of the track', 'full drums, wide synths'], ['distortion']],
      'Pipeline': [['smooth rolling bassline', 'fewer elements, flowing motion', 'steady'], ['big drops']],
      'Final build': [['fast riser and snare build', 'tension rising into the final drop'], ['melody']],
      'Name drop': [['final drop with three huge punchy hits', 'maximum energy', 'triumphant'], ['vocal chops']],
      'Outro': [['warm resolving chords', 'one clean final hit', 'then a natural decay to silence'], ['fade-out loop', 'abrupt cut']],
    },
  },
  nusantara: {
    global: ['modern Indonesian electronic pop', 'gamelan-inspired saron and bonang metallophone motifs blended with clean electronic production',
      'gong swells', 'kendang-style hand drum fills', 'punchy modern drums', 'warm deep bass', 'uplifting and proud', '120 bpm', 'instrumental',
      'polished mix', 'leaves room for a voiceover'],
    sections: {
      'Problem': [['sparse ticking pulse', 'a single muted metallophone note repeating', 'suspense, a question hanging'], ['full drums', 'melody']],
      'Reveal': [['gong swell into a bright, warm chord hit right at the start', 'shimmering metallophone arpeggio', 'wonder and pride'], ['heavy drums']],
      'Learn': [['upbeat driving groove', 'bright interlocking metallophone pattern over a tight kick and claps', 'friendly and optimistic'], ['busy lead melody']],
      'Agents': [['same groove with a curious bonang arpeggio', 'clicky precise percussion', 'clever, precise feel'], ['dark', 'aggressive']],
      'Credential build': [['rising energy', 'kendang fill and riser building to a drop', 'brighter chords'], ['drop']],
      'Soulbound drop': [['big drop at the very first beat with a deep gong hit', 'full groove with metallophone hook', 'proud, precious, special feeling'], ['distortion']],
      'Verify': [['short breath: filtered drums and a low gong pulse'], ['melody']],
      'No wallet stabs': [['two hard percussive hits at the start, then full energy', 'confident peak of the track', 'full drums and metallophone hook'], ['distortion']],
      'Pipeline': [['smooth rolling bassline', 'fewer elements, flowing', 'steady and calm'], ['big drops']],
      'Final build': [['kendang roll and riser', 'tension rising into the final drop'], ['melody']],
      'Name drop': [['final drop with three big gong-and-drum hits', 'maximum energy', 'triumphant'], ['vocal chops']],
      'Outro': [['warm resolving chord with a gong', 'one clean final hit', 'then a natural decay to silence'], ['fade-out loop', 'abrupt cut']],
    },
  },
}
const style = arg('style', 'hype')
const st = STYLES[style]
if (!st) throw new Error(`unknown style ${style}`)

const plan = {
  positive_global_styles: st.global,
  negative_global_styles: ['vocals', 'singing', 'choir', 'spoken words', 'lyrics', 'lo-fi', 'horror', 'meme', 'comedy'],
  sections: MARKS.map(([name], i) => ({ section_name: name, positive_local_styles: st.sections[name][0], negative_local_styles: st.sections[name][1], duration_ms: durMs[i], lines: [] })),
}
const model = arg('model', 'music_v1')
const out = path.join(ROOT, 'public/music', `alt-${style}.mp3`)
fs.mkdirSync(path.dirname(out), { recursive: true })
console.log('sections:', MARKS.map(([n, s], i) => `${n} @${s.toFixed(2)} ${durMs[i]}ms`).join(' · '), '| total', durMs.reduce((a, b) => a + b, 0))
if (process.argv.includes('--dry')) process.exit(0)

const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model_id: model, composition_plan: plan, respect_sections_durations: true }),
})
if (!r.ok) { console.log('music error', r.status, (await r.text()).slice(0, 400)); process.exit(1) }
fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()))
fs.writeFileSync(out.replace(/\.mp3$/, '.plan.json'), JSON.stringify({ model, style, plan }, null, 2))
console.log('ok', out)
