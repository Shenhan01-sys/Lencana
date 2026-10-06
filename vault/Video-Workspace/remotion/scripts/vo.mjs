// B173 — generate the English voiceover, one clip per scene, with ElevenLabs TTS "with-timestamps".
//
//   node scripts/vo.mjs                    (all lines, model eleven_v4 -> falls back to v3, multilingual_v2)
//   node scripts/vo.mjs --only s2,s6       (regenerate some lines)
//   node scripts/vo.mjs --model eleven_multilingual_v2
//
// Reads ELEVENLABS_API_KEY from app/.env (never printed, never written). Writes public/vo/<id>.mp3 and
// src/data/vo.json: per line the clip duration and WORD timings mapped back to the caption text
// ("Lenchahna" is spoken so the name sounds like Indonesian "lencana"; the caption still says "Lencana").
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = path.resolve(ROOT, '../../../.env')
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1] }

function readKey () {
  const line = fs.readFileSync(ENV, 'utf8').split(/\r?\n/).find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l))
  if (!line) throw new Error(`ELEVENLABS_API_KEY not found in ${ENV}`)
  return line.replace(/^\s*ELEVENLABS_API_KEY\s*=\s*/, '').trim().replace(/^['"]|['"]$/g, '')
}

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'))
const only = arg('only', '') ? new Set(arg('only', '').split(',')) : null
const models = arg('model', '') ? [arg('model', '')] : ['eleven_v4', 'eleven_v3', 'eleven_multilingual_v2']
// spoken -> caption replacements (token sequences, compared without punctuation)
const MAP = [['Lenchahna', 'Lencana'], ['B N B', 'BNB'], ['one Ed Tech', '1EdTech'], ['three point oh', '3.0']]

const outDir = path.join(ROOT, 'public/vo')
fs.mkdirSync(outDir, { recursive: true })
const dataPath = path.join(ROOT, 'src/data/vo.json')
const prev = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : { lines: [] }
const key = readKey()

const bare = (w) => w.replace(/[^\p{L}\p{N}.]/gu, '').replace(/\.$/, '')

function wordsFromAlignment (text, al) {
  const words = []
  let cur = null
  for (let i = 0; i < al.characters.length; i++) {
    const ch = al.characters[i]
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null } continue }
    const s = al.character_start_times_seconds[i]
    const e = al.character_end_times_seconds[i]
    if (!cur) cur = { text: ch, start: s, end: e }
    else { cur.text += ch; cur.end = Math.max(cur.end, e) }
  }
  if (cur) words.push(cur)
  // a dash standing alone is a pause, not a word
  return words.filter((w) => bare(w.text) !== '' || /\d/.test(w.text))
}

function mapToCaption (spokenWords, captionText) {
  const out = []
  for (let i = 0; i < spokenWords.length;) {
    let hit = null
    for (const [sp, cap] of MAP) {
      const toks = sp.split(' ')
      const seq = spokenWords.slice(i, i + toks.length)
      if (seq.length === toks.length && seq.every((w, k) => bare(w.text).toLowerCase() === toks[k].toLowerCase())) { hit = { toks, cap, seq }; break }
    }
    if (hit) {
      const last = hit.seq[hit.seq.length - 1].text
      const trail = (last.match(/[^\p{L}\p{N}]+$/u) || [''])[0]
      out.push({ text: hit.cap + trail, start: hit.seq[0].start, end: hit.seq[hit.seq.length - 1].end })
      i += hit.toks.length
    } else { out.push(spokenWords[i]); i++ }
  }
  const want = captionText.split(/\s+/).filter((w) => bare(w) !== '' || /\d/.test(w))
  const got = out.map((w) => w.text)
  if (want.length !== got.length || want.some((w, k) => bare(w) !== bare(got[k]))) {
    throw new Error(`caption mapping mismatch\n want: ${want.join(' ')}\n got:  ${got.join(' ')}`)
  }
  // keep the caption's own spelling/punctuation
  return out.map((w, k) => ({ text: want[k], startMs: Math.round(w.start * 1000), endMs: Math.round(w.end * 1000) }))
}

async function tts (line, i, model) {
  const lines = script.lines
  const body = {
    text: line.spoken,
    model_id: model,
    previous_text: i > 0 ? lines[i - 1].spoken : undefined,
    next_text: i < lines.length - 1 ? lines[i + 1].spoken : undefined,
    voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: line.speed ?? 1.0 },
  }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${script.voice.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const t = await r.text()
  if (!r.ok) return { error: `${r.status} ${t.slice(0, 240)}` }
  const j = JSON.parse(t)
  if (!j.alignment?.characters?.length) return { error: 'no alignment in response' }
  return { j }
}

const result = []
for (let i = 0; i < script.lines.length; i++) {
  const line = script.lines[i]
  if (only && !only.has(line.id)) { const old = prev.lines.find((x) => x.id === line.id); if (old) result.push(old); continue }
  let got = null
  let used = null
  for (const m of models) {
    const res = await tts(line, i, m)
    if (res.j) { got = res.j; used = m; break }
    console.log(`  ${line.id}: ${m} -> ${res.error}`)
  }
  if (!got) throw new Error(`${line.id}: every model failed`)
  const file = path.join(outDir, `${line.id}.mp3`)
  fs.writeFileSync(file, Buffer.from(got.audio_base64, 'base64'))
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim())
  const words = mapToCaption(wordsFromAlignment(line.spoken, got.alignment), line.text)
  result.push({ id: line.id, file: `vo/${line.id}.mp3`, model: used, durationSec: Math.round(dur * 1000) / 1000, words })
  const wpm = Math.round(words.length / ((words.at(-1).endMs - words[0].startMs) / 60000))
  console.log(`${line.id}  ${used}  ${dur.toFixed(2)} s  ${words.length} words  ${wpm} wpm  first=${words[0].startMs}ms last=${words.at(-1).endMs}ms`)
}

fs.writeFileSync(dataPath, JSON.stringify({ generatedAt: new Date().toISOString(), voice: script.voice, lines: result }, null, 2) + '\n')
const total = result.reduce((s, l) => s + l.durationSec, 0)
console.log(`total speech clips: ${total.toFixed(2)} s over ${result.length} lines -> ${dataPath}`)
