// B173 — the business-process objects of the Admin belt, ported from web/src/pages/admin-objects.ts (B172, FE11)
// so the video shows the SAME objects a viewer finds on the Admin page, drawn from the SAME numbers
// (src/data/admin-summary.json = POST /admin/overview, read 7 Oct). CSS animation classes are removed: in a
// video every motion is a function of the frame, so the stamp and the coins are returned as separate layers.
import data from '../data/admin-summary.json'

export type Summary = typeof data.summary
export const SUMMARY: Summary = data.summary

const C = { inset: '#1e2329', card: '#181a20', line: '#2b313a', line2: '#3a414c', mute: '#848e9c', steel: '#5d6672', sub: '#b7bdc6', paper: '#cfd4dc', gold: '#f0b90b', green: '#0ecb81', amber: '#ff9f1a', red: '#f6465d', bg: '#0f1216' } as const
const R = (x: number, y: number, w: number, hgt: number, fill: string, extra = ''): string => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${fill}" ${extra}/>`
const MONO = 'JetBrains Mono, ui-monospace, monospace'

const pipe = (s: Summary) => s.essays.pipeline as Record<string, number>
const ess = (s: Summary, k: string) => pipe(s)[k] ?? 0
const totalEssays = (s: Summary) => Object.values(pipe(s)).reduce((a, b) => a + b, 0)
const proposalsOf = (s: Summary) => ess(s, 'awaitingReview') + ess(s, 'approved') + ess(s, 'adjusted') + ess(s, 'rejected')
const acceptedOf = (s: Summary) => ess(s, 'approved') + ess(s, 'adjusted') + ess(s, 'graded')

function shelf (s: Summary): string {
  const n = Math.min(s.courses.total, 11)
  let out = R(14, 40, 152, 112, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`) + R(14, 96, 152, 6, C.line2)
  for (let i = 0; i < n; i += 1) {
    const top = i < 6
    const idx = top ? i : i - 6
    const x = top ? 24 + idx * 22 : 24 + idx * 21
    const hh = 34 + ((i * 7) % 4) * 4 + (top ? 0 : 2)
    const base = top ? 94 : 148
    out += R(x, base - hh, 17, hh, i < s.courses.listed ? C.gold : C.steel, 'rx="2"') + R(x + 3, base - hh + 9, 11, 3, C.card) + R(x + 3, base - hh + 15, 11, 2, C.card)
  }
  return out
}

function gate (s: Summary): string {
  const free = Math.min(s.learners.free, 12), paid = Math.min(s.learners.paid, 8)
  let out = ''
  for (let i = 0; i < free; i += 1) out += R(6 + (i % 2) * 2, 146 - (i + 1) * 5, 40, 4, C.steel, `stroke="${C.line2}" stroke-width="1"`)
  out += R(58, 62, 64, 88, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`) + R(70, 78, 40, 9, C.bg, 'rx="2"') + R(66, 56, 48, 8, C.line2, 'rx="2"')
  out += `<g stroke="${C.gold}" stroke-width="5" stroke-linecap="round"><line x1="90" y1="116" x2="90" y2="98"/><line x1="90" y1="116" x2="106" y2="125"/><line x1="90" y1="116" x2="74" y2="125"/></g><circle cx="90" cy="116" r="6" fill="${C.gold}"/>`
  for (let i = 0; i < paid; i += 1) {
    const y = 146 - (i + 1) * 13
    out += R(132, y, 44, 11, C.green, 'rx="2"') + `<circle cx="144" cy="${y + 5.5}" r="3.6" fill="${C.gold}"/>` + R(152, y + 3, 16, 2.5, '#0b3d2b') + R(152, y + 7, 11, 2.5, '#0b3d2b')
  }
  return out
}

function desk (s: Summary): string {
  const n = Math.min(Math.max(totalEssays(s), 1), 14)
  let out = R(10, 132, 160, 14, C.line, `stroke="${C.line2}" stroke-width="2" rx="3"`) + R(22, 146, 8, 6, C.line2) + R(150, 146, 8, 6, C.line2)
  for (let i = 0; i < n; i += 1) out += R(44 + (i % 3) * 2, 130 - (i + 1) * 6, 74, 5, C.paper, `stroke="${C.mute}" stroke-width="1"`)
  const topY = 130 - n * 6
  out += R(44, topY - 46, 74, 46, C.paper, `stroke="${C.mute}" stroke-width="1.5"`) + R(52, topY - 38, 58, 3, C.steel) + R(52, topY - 30, 50, 3, C.steel) + R(52, topY - 22, 56, 3, C.steel) + R(52, topY - 14, 36, 3, C.steel)
  out += `<g transform="rotate(-24 150 112)">${R(138, 80, 8, 56, C.gold, 'rx="2"')}<polygon points="138,136 146,136 142,146" fill="${C.paper}"/>${R(138, 76, 8, 6, C.steel, 'rx="2"')}</g>`
  return out
}

function robot (s: Summary): string {
  let out = R(60, 40, 64, 44, C.sub, 'rx="10"') + `<line x1="92" y1="40" x2="92" y2="26" stroke="${C.sub}" stroke-width="4"/><circle cx="92" cy="22" r="6" fill="${C.gold}"/>`
  out += `<circle cx="78" cy="60" r="9" fill="${C.card}"/><circle cx="106" cy="60" r="9" fill="${C.card}"/><circle cx="78" cy="60" r="4" fill="${C.gold}"/><circle cx="106" cy="60" r="4" fill="${C.gold}"/>` + R(80, 74, 24, 4, C.card, 'rx="2"')
  out += R(66, 88, 52, 46, C.sub, 'rx="6"') + R(76, 100, 32, 6, C.card, 'rx="2"') + R(76, 112, 20, 6, C.gold, 'rx="2"') + R(54, 92, 12, 34, C.steel, 'rx="5"') + R(118, 92, 12, 26, C.steel, 'rx="5"')
  out += R(122, 70, 52, 66, C.paper, `stroke="${C.mute}" stroke-width="1.5" rx="3"`) + R(138, 64, 20, 9, C.gold, 'rx="2"')
  const bars: Array<[number, string]> = [[proposalsOf(s), C.gold], [ess(s, 'approved'), C.green], [ess(s, 'adjusted'), C.amber], [ess(s, 'graded'), C.steel]]
  const max = Math.max(totalEssays(s), 1)
  bars.forEach(([v, col], i) => { out += R(128, 82 + i * 12, 40, 7, '#a9b0ba', 'rx="1.5"') + R(128, 82 + i * 12, Math.max(v ? 3 : 0, (v / max) * 40), 7, col, 'rx="1.5"') })
  out += R(76, 134, 10, 16, C.steel, 'rx="2"') + R(98, 134, 10, 16, C.steel, 'rx="2"')
  const n = Math.min(s.agents.known, 9)
  for (let i = 0; i < n; i += 1) { const x = 90 - (n * 19) / 2 + i * 19; out += R(x, 168, 15, 12, i < s.agents.hires ? C.gold : C.steel, 'rx="3"') + R(x + 3, 171, 3, 3, C.card) + R(x + 9, 171, 3, 3, C.card) }
  return out
}

function stampBase (s: Summary): string {
  const list = [...Array<string>(ess(s, 'approved')).fill('g'), ...Array<string>(ess(s, 'adjusted')).fill('a'), ...Array<string>(ess(s, 'rejected')).fill('r'), ...Array<string>(ess(s, 'awaitingReview')).fill('w')].slice(0, 12)
  let out = ''
  list.forEach((k, i) => {
    const row = i < 6 ? 0 : 1, idx = row ? i - 6 : i
    const w = 20, gap = 4, count = row ? list.length - 6 : Math.min(list.length, 6)
    const x = 90 - (count * (w + gap) - gap) / 2 + idx * (w + gap), y = row ? 148 - 30 - 34 : 148 - 30
    out += R(x, y, w, 30, k === 'w' ? 'none' : C.paper, k === 'w' ? `stroke="${C.mute}" stroke-width="1.5" stroke-dasharray="3 3" rx="2"` : `stroke="${C.mute}" stroke-width="1" rx="2"`)
    const col = k === 'g' ? C.green : k === 'a' ? C.amber : k === 'r' ? C.red : null
    out += col ? `<circle cx="${x + w / 2}" cy="${y + 11}" r="6" fill="${col}"/>` + R(x + 4, y + 21, w - 8, 3, C.steel) : R(x + 4, y + 8, w - 8, 3, C.steel) + R(x + 4, y + 15, w - 10, 3, C.steel)
  })
  out += R(30, 140, 120, 10, C.inset, `stroke="${C.line2}" stroke-width="1.5" rx="2"`)
  return out
}
/** The stamp itself, drawn separately so the video can press it on a beat. */
export const STAMP = `<circle cx="90" cy="26" r="13" fill="${C.gold}"/>${R(84, 38, 12, 28, C.sub)}${R(62, 66, 56, 14, C.sub, 'rx="3"')}${R(66, 78, 48, 6, C.green, 'rx="2"')}`

function badge (s: Summary): string {
  let out = `<polygon points="70,112 56,150 76,142 86,152 92,114" fill="${C.green}"/><polygon points="110,112 124,150 104,142 94,152 88,114" fill="${C.green}"/>`
  out += `<path d="M90 30 L136 46 V84 C136 110 116 126 90 136 C64 126 44 110 44 84 V46 Z" fill="${C.gold}"/><path d="M90 42 L126 54 V84 C126 104 110 117 90 125 C70 117 54 104 54 84 V54 Z" fill="${C.card}"/>`
  out += `<path d="M72 84 L86 98 L110 68" fill="none" stroke="${C.gold}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
  const n = Math.min(acceptedOf(s), 10)
  for (let i = 0; i < n; i += 1) { const cx = 90 - (n * 17) / 2 + 8.5 + i * 17; out += `<circle cx="${cx}" cy="172" r="6.5" fill="${C.green}"/><path d="M${cx - 3} 172 l2 2 l4 -4.5" fill="none" stroke="#0b3d2b" stroke-width="1.8" stroke-linecap="round"/>` }
  return out
}

function jars (s: Summary): string {
  const bps = s.money.platformBps
  const fr = bps === null ? null : bps / 10000
  const HH = 56
  let out = `<polygon points="66,22 114,22 104,50 76,50" fill="${C.sub}"/>` + R(84, 50, 12, 18, C.line2)
  out += `<path d="M90 68 V82 H44 V96 M90 82 H136 V96" fill="none" stroke="${C.line2}" stroke-width="10" stroke-linejoin="round"/>`
  out += R(18, 96, 52, 54, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`) + R(110, 96, 52, 54, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`)
  if (fr !== null) {
    out += R(20, 148 - Math.max(3, fr * HH), 48, Math.max(3, fr * HH), C.gold) + R(112, 148 - (1 - fr) * HH, 48, (1 - fr) * HH, C.green)
    out += `<text x="44" y="90" text-anchor="middle" font-size="10" font-weight="800" fill="${C.gold}" font-family="${MONO}">${+(fr * 100).toFixed(1)}%</text><text x="136" y="90" text-anchor="middle" font-size="10" font-weight="800" fill="${C.green}" font-family="${MONO}">${+(100 - fr * 100).toFixed(1)}%</text>`
  }
  if (s.money.chargesDue.count > 0) out += R(74, 124, 32, 26, C.amber, 'rx="3"') + `<text x="90" y="141" text-anchor="middle" font-size="16" font-weight="800" fill="#14110a" font-family="${MONO}">${s.money.chargesDue.count}</text><text x="90" y="161" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.amber}">FEES</text>`
  return out
}

export type ObjectId = 'course' | 'enroll' | 'essay' | 'agent' | 'review' | 'result' | 'settle'
export const ORDER: ObjectId[] = ['course', 'enroll', 'essay', 'agent', 'review', 'result', 'settle']
export function drawObject (id: ObjectId, s: Summary = SUMMARY): string {
  switch (id) {
    case 'course': return shelf(s)
    case 'enroll': return gate(s)
    case 'essay': return desk(s)
    case 'agent': return robot(s)
    case 'review': return stampBase(s)
    case 'result': return badge(s)
    case 'settle': return jars(s)
  }
}

/** Small things that travel between steps (same shapes as the Admin belt tokens), viewBox 0 0 28 28. */
export const TOKEN: Record<string, string> = {
  book: `${R(6, 3, 16, 22, C.gold, 'rx="2"')}${R(9, 8, 10, 3, C.card)}${R(9, 14, 10, 2, C.card)}`,
  ticket: `${R(2, 8, 24, 13, C.green, 'rx="2"')}<circle cx="14" cy="14.5" r="3.4" fill="${C.gold}"/>`,
  sheet: `${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 2, C.steel)}${R(9, 13, 11, 2, C.steel)}${R(9, 18, 7, 2, C.steel)}`,
  scored: `${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 3, C.gold)}${R(9, 14, 8, 3, C.gold)}${R(9, 20, 4, 2, C.steel)}`,
  stamped: `${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}<circle cx="14.5" cy="13" r="5.5" fill="${C.green}"/>${R(9, 21, 11, 2, C.steel)}`,
  coin: `<circle cx="14" cy="14" r="10" fill="${C.gold}"/><circle cx="14" cy="14" r="6" fill="none" stroke="#b78900" stroke-width="2"/>`,
}

/** Labels of the belt in English (the app's `admin-stations.ts` EN titles), with the real big number. */
export const STATION_LABEL: Record<ObjectId, { title: string, big: (s: Summary) => string }> = {
  course: { title: 'Courses', big: (s) => String(s.courses.total) },
  enroll: { title: 'Enrollment', big: (s) => String(s.learners.enrollments) },
  essay: { title: 'Class & essays', big: (s) => String(totalEssays(s)) },
  agent: { title: 'Agent grading', big: (s) => String(s.agents.hires) },
  review: { title: 'Review', big: (s) => String(proposalsOf(s) - ess(s, 'awaitingReview')) },
  result: { title: 'Result', big: (s) => String(acceptedOf(s)) },
  settle: { title: 'Settlement', big: (s) => String(Number(s.money.gross) / 10 ** s.money.token.decimals) },
}
