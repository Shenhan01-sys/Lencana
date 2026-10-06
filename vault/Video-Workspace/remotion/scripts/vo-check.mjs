// B173 — QA the generated voiceover without ears: transcribe each clip back with ElevenLabs Speech-to-Text
// and compare with the script. Catches swallowed words, glitches and how a listener hears the brand name.
//   node scripts/vo-check.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = path.resolve(ROOT, '../../../.env')
const line = fs.readFileSync(ENV, 'utf8').split(/\r?\n/).find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l))
const key = line.replace(/^\s*ELEVENLABS_API_KEY\s*=\s*/, '').trim().replace(/^['"]|['"]$/g, '')
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'))
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

let bad = 0
for (const l of script.lines) {
  const fd = new FormData()
  fd.append('model_id', 'scribe_v1')
  fd.append('language_code', 'eng')
  fd.append('file', new Blob([fs.readFileSync(path.join(ROOT, 'public/vo', `${l.id}.mp3`))], { type: 'audio/mpeg' }), `${l.id}.mp3`)
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: fd })
  const j = await r.json()
  if (!r.ok) { console.log(l.id, 'STT error', r.status, JSON.stringify(j).slice(0, 200)); bad++; continue }
  const heard = norm(j.text)
  const want = norm(l.spoken)
  const hw = new Set(heard.split(' '))
  const missing = want.split(' ').filter((w) => !hw.has(w))
  console.log(`${l.id} heard: ${j.text}`)
  if (missing.length) console.log(`   words not heard as written: ${missing.join(', ')}`)
  if (missing.length > 2) bad++
}
console.log(bad ? `VO CHECK: ${bad} line(s) need a listen` : 'VO CHECK: all lines heard as written (<=2 word differences each)')
