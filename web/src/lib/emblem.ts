/**
 * `emblem.ts` — lencana sebuah kursus (B127): benda yang akan didapat peserta, bukan ikon katalog generik.
 *
 * Roset bergerigi dengan monogram kursus. Warnanya mengikuti topik dan hanya memakai palet Lencana (emas, hijau,
 * baja, gading); cincin tingkat bertambah satu per tingkat (dasar 1, menengah 2, lanjutan 3) — tingkat terbaca dari
 * bentuknya, bukan hanya dari labelnya.
 */
import type { Course } from '../content'

const TOPIC_COLOR: Record<string, string> = {
  Web3: '#f0b90b',
  Keuangan: '#37d67a',
  Keamanan: '#9aa4b2',
  Menulis: '#f4f1ea',
}
const LEVEL_RINGS: Record<Course['level'], number> = { dasar: 1, menengah: 2, lanjutan: 3 }

let seq = 0

/** Warna topik (palet Lencana); topik tak dikenal = emas. */
export function topicColor (topic: string | undefined): string {
  return TOPIC_COLOR[topic ?? ''] ?? '#f0b90b'
}

/** Dua huruf dari dua kata bermakna pertama judul ("Web3 Dasar untuk Praktisi" → "WD"). */
export function monogram (title: string): string {
  const skip = new Set(['dan', 'untuk', 'yang', 'di', 'ke', 'the', 'of', 'and'])
  const words = title.split(/[\s—–-]+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter((w) => w && !skip.has(w.toLowerCase()))
  return ((words[0]?.[0] ?? 'L') + (words[1]?.[0] ?? '')).toUpperCase()
}

export function emblem (course: Course, size = 72): HTMLElement {
  const id = `lce${++seq}`
  const color = topicColor(course.topic)
  const rings = LEVEL_RINGS[course.level] ?? 1
  const bumps = 24
  // Tepi roset: lingkaran bergerigi dari 24 lengkung kecil.
  const pts: string[] = []
  for (let i = 0; i < bumps * 2; i++) {
    const a = (i / (bumps * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 46 : 42.5
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`)
  }
  const ringEls = Array.from({ length: rings }, (_, k) => `<circle cx="50" cy="50" r="${33 - k * 3.2}" fill="none" stroke="${color}" stroke-opacity="${0.55 - k * 0.12}" stroke-width="1.1"/>`).join('')
  const el = document.createElement('span')
  el.className = 'lc-emblem'
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = `<svg viewBox="0 0 100 100" focusable="false">
  <defs>
    <radialGradient id="${id}g" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${color}" stop-opacity="0.95"/><stop offset="1" stop-color="${color}" stop-opacity="0.45"/></radialGradient>
  </defs>
  <path d="M38 80 30 98l9-4 6 7 5-19z" fill="${color}" fill-opacity="0.55"/>
  <path d="M62 80l8 18-9-4-6 7-5-19z" fill="${color}" fill-opacity="0.55"/>
  <polygon points="${pts.join(' ')}" fill="url(#${id}g)"/>
  <circle cx="50" cy="50" r="37" fill="#0c0f13"/>
  ${ringEls}
  <text x="50" y="58.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="25" fill="${color}">${monogram(course.title)}</text>
</svg>`
  return el
}
