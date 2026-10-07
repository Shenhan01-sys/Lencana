// B173 — one clock for the whole video. Everything is placed against the voiceover words (vo.json) and the
// beat grid of the score (beats.json), the Motion-as-Code idea ("plates find their words by content").
import vo from '../data/vo.json'
import tl from '../data/timeline.json'
import beats from '../data/beats.json'

export const FPS = tl.fps
export const f = (sec: number) => Math.round(sec * FPS)
export const TOTAL = f(tl.end)

export type LineId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8'
export const LINES: LineId[] = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']

type Word = { text: string, startMs: number, endMs: number }
const lineOf = (id: LineId) => {
  const l = vo.lines.find((x) => x.id === id)
  if (!l) throw new Error(`no VO line ${id}`)
  return l as { id: string, file: string, durationSec: number, words: Word[] }
}
const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/\.$/, '')

export const voStart = (id: LineId) => (tl.voStart as Record<string, number>)[id]
export const voFile = (id: LineId) => lineOf(id).file
export const voDur = (id: LineId) => lineOf(id).durationSec

/** Absolute words (seconds) of one line. */
export const wordsOf = (id: LineId) => lineOf(id).words.map((w) => ({ text: w.text, start: voStart(id) + w.startMs / 1000, end: voStart(id) + w.endMs / 1000 }))

/** Absolute FRAME where `word` (nth occurrence) starts in line `id`. Throws if the word is not in the script. */
export function cue (id: LineId, word: string, nth = 0): number {
  const hits = wordsOf(id).filter((w) => bare(w.text) === bare(word))
  if (!hits[nth]) throw new Error(`cue: "${word}" #${nth} not in ${id}`)
  return f(hits[nth].start)
}
export function cueEnd (id: LineId, word: string, nth = 0): number {
  const hits = wordsOf(id).filter((w) => bare(w.text) === bare(word))
  if (!hits[nth]) throw new Error(`cueEnd: "${word}" #${nth} not in ${id}`)
  return f(hits[nth].end)
}

/** Scene windows in absolute frames: picture of scene i runs [start_i, start_{i+1}). The cut times in
 *  timeline.json were picked by hand from the beat grid / music accents (beats.json), so they are used as given. */
const ids = Object.keys(tl.sceneStart) as LineId[]
export const SCENE = Object.fromEntries(ids.map((id, i) => {
  const start = f((tl.sceneStart as Record<string, number>)[id])
  const next = i + 1 < ids.length ? f((tl.sceneStart as Record<string, number>)[ids[i + 1]]) : TOTAL
  return [id, { start, end: next, dur: next - start }]
})) as Record<LineId, { start: number, end: number, dur: number }>

/** Absolute frame `sec` seconds after the start of scene `id` — shot cuts inside a scene are written this way, so a
 *  scene that moves (draft 5: everything after the problem moved +10.02 s) carries its shots with it. */
export const rel = (id: LineId, sec: number) => SCENE[id].start + f(sec)

/** Overlap drawn on both sides of a cut (scenes render a little before/after their window). */
export const XF = 8

export const BEATS = beats.beats.map(f)
export const ACCENTS = beats.accents.map(f)
/** Nearest beat frame to `frame` (for accents that should land on the music). */
export const onBeat = (frame: number) => BEATS.reduce((a, b) => (Math.abs(b - frame) < Math.abs(a - frame) ? b : a), BEATS[0])
