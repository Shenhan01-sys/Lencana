// B173 — highlight boxes by name from src/data/focus.json, the same file `node scripts/focus-audit.mjs` draws on the
// captures. Scenes never type ring coordinates themselves (7 Oct: a hand-typed ring sat on the wrong line).
import data from '../data/focus.json'

export type Box = { x: number, y: number, w: number, h: number }
export type FocusName = Exclude<keyof typeof data, '_'>
export const box = (name: FocusName): Box => {
  const b = data[name] as Box
  return { x: b.x, y: b.y, w: b.w, h: b.h }
}
