import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import script from '../data/script.json'
import { C, SANS } from '../theme'
import { f, LINES, wordsOf } from '../lib/time'

/**
 * Always-on English captions built from the SCRIPT text and the voiceover's word timings (not from a
 * transcription, so nothing is misheard). Pages break where the script has a dash or punctuation, at most
 * 8 words; a tiny tail is merged back. The spoken word is gold, words already said are white, words still to
 * come are grey (contrast ≥ 4.5:1 on the caption plate).
 */
type W = { text: string, start: number, end: number, dashBefore: boolean }
type Page = { words: W[], from: number, to: number }

const PAGES: Page[] = (() => {
  const pages: Page[] = []
  for (const id of LINES) {
    const raw = (script.lines.find((l) => l.id === id)?.text ?? '').split(/\s+/)
    const dashIdx = new Set<number>()
    let n = 0
    raw.forEach((tok) => { if (tok === '—') dashIdx.add(n); else n++ })
    const ws: W[] = wordsOf(id).map((w, i) => ({ ...w, dashBefore: dashIdx.has(i) }))
    const chunks: W[][] = []
    let cur: W[] = []
    ws.forEach((w) => {
      if (w.dashBefore && cur.length >= 2) { chunks.push(cur); cur = [] }
      cur.push(w)
      const punct = /[.,!?;:]$/.test(w.text)
      if ((punct && cur.length >= 2) || cur.length >= 8) { chunks.push(cur); cur = [] }
    })
    if (cur.length) chunks.push(cur)
    // merge a 1–2 word tail into the previous page when it stays short enough
    for (let i = chunks.length - 1; i > 0; i--) {
      if (chunks[i].length <= 2 && chunks[i - 1].length + chunks[i].length <= 9) { chunks[i - 1] = chunks[i - 1].concat(chunks[i]); chunks.splice(i, 1) }
    }
    for (const c of chunks) pages.push({ words: c, from: f(c[0].start) - 4, to: f(c[c.length - 1].end) + 10 })
  }
  for (let i = 0; i < pages.length - 1; i++) pages[i].to = Math.min(pages[i].to, pages[i + 1].from)
  return pages
})()

export const CAPTION_PAGES = PAGES

export const Captions: React.FC = () => {
  const frame = useCurrentFrame()
  const page = PAGES.find((p) => frame >= p.from && frame < p.to)
  if (!page) return null
  const tIn = interpolate(frame, [page.from, page.from + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const tOut = interpolate(frame, [page.to - 4, page.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const op = Math.min(tIn, tOut)
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 46, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{
        maxWidth: 1480, padding: '14px 30px 16px', borderRadius: 18, background: 'rgba(11,14,17,0.86)',
        border: '1px solid rgba(234,236,239,0.08)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
        opacity: op, transform: `translateY(${(1 - tIn) * 12}px)`,
        fontFamily: SANS, fontWeight: 700, fontSize: 46, lineHeight: 1.22, letterSpacing: '-0.01em', textAlign: 'center',
      }}>
        {page.words.map((w, i) => {
          const s = f(w.start), e = f(w.end)
          const color = frame >= s && frame < e + 2 ? C.gold : frame >= e ? C.text : '#9aa3ae'
          return <span key={i} style={{ color }}>{w.text}{i < page.words.length - 1 ? ' ' : ''}</span>
        })}
      </div>
    </div>
  )
}
