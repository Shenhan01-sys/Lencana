/**
 * `admin-objects.ts` — sabuk proses bisnis untuk tab Ringkasan halaman Admin (B172; port dari prototipe FE11 `vault/03-Frontend/FE11 - Prototipe Admin proses bisnis (B172).html`).
 * Permintaan builder: "tiap station gausa pakai station card, langsung UI perwujudan proses bisnisnya, yang solid".
 *
 * Doktrin FE builder: wakili prosesnya. Tiap langkah adalah BENDA nyatanya, berdiri di satu sabuk; benda kecil yang ikut berjalan di sabuk adalah apa yang berpindah antar
 * langkah. Data jadi geometri — jumlah buku, tiket, kertas, robot, stempel, peniti digambar sungguhan dari `AdminSummary`; tinggi isi toples = bagian uang.
 * Gaya SOLID: warna datar palet Lencana, tanpa gradient halus, tanpa glow, tanpa kartu pembungkus. Tidak ada angka karangan: bagian yang tidak punya datanya tidak digambar.
 *
 * Tata letak: horizontal bila kartu cukup lebar, vertikal bila sempit — ditentukan oleh lebar KARTU (container query), bukan lebar layar.
 */
import { h } from '../lib/ui'
import type { AdminSummary } from '../learning'
import type { Station } from './admin-stations'

type Lang = 'en' | 'id'

const C = { inset: '#1e2329', card: '#181a20', line: '#2b313a', line2: '#3a414c', mute: '#848e9c', steel: '#5d6672', sub: '#b7bdc6', paper: '#cfd4dc', gold: '#f0b90b', green: '#0ecb81', amber: '#ff9f1a', red: '#f6465d', bg: '#0f1216' } as const
const R = (x: number, y: number, w: number, hgt: number, fill: string, extra = ''): string => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${fill}" ${extra}/>`
const MONO = 'ui-monospace,monospace'
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c)

/* ------------------------------------------------------------------ benda (SVG datar 180×190, lantai sabuk di y=150) */

const ess = (s: AdminSummary, k: string) => s.essays.pipeline[k] ?? 0
const totalEssays = (s: AdminSummary) => Object.values(s.essays.pipeline).reduce((a, b) => a + b, 0)
const proposalsOf = (s: AdminSummary) => ess(s, 'awaitingReview') + ess(s, 'approved') + ess(s, 'adjusted') + ess(s, 'rejected')
const acceptedOf = (s: AdminSummary) => ess(s, 'approved') + ess(s, 'adjusted') + ess(s, 'graded')

function shelf (s: AdminSummary, lang: Lang): string { // rak kursus: satu buku per kursus; emas = terdaftar, abu = belum
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
  if (s.members.pending > 0) out += `<g transform="rotate(-5 134 128)">${R(108, 112, 52, 34, C.amber, 'rx="4"')}<text x="134" y="132" text-anchor="middle" font-family="${MONO}" font-weight="800" font-size="19" fill="#14110a">${s.members.pending}</text><text x="134" y="142" text-anchor="middle" font-size="8" font-weight="800" fill="#14110a">${lang === 'id' ? 'IZIN' : 'REQ'}</text></g>`
  return out
}

function gate (s: AdminSummary): string { // gerbang masuk: tiket gratis (abu) di kiri, tiket berbayar (hijau + koin) di kanan
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

function desk (s: AdminSummary): string { // meja dengan tumpukan kertas ujian: satu kertas per esai diserahkan
  const n = Math.min(Math.max(totalEssays(s), 1), 14)
  let out = R(10, 132, 160, 14, C.line, `stroke="${C.line2}" stroke-width="2" rx="3"`) + R(22, 146, 8, 6, C.line2) + R(150, 146, 8, 6, C.line2)
  for (let i = 0; i < n; i += 1) out += R(44 + (i % 3) * 2, 130 - (i + 1) * 6, 74, 5, C.paper, `stroke="${C.mute}" stroke-width="1"`)
  const topY = 130 - n * 6
  out += R(44, topY - 46, 74, 46, C.paper, `stroke="${C.mute}" stroke-width="1.5"`) + R(52, topY - 38, 58, 3, C.steel) + R(52, topY - 30, 50, 3, C.steel) + R(52, topY - 22, 56, 3, C.steel) + R(52, topY - 14, 36, 3, C.steel)
  out += `<g transform="rotate(-24 150 112)">${R(138, 80, 8, 56, C.gold, 'rx="2"')}<polygon points="138,136 146,136 142,146" fill="${C.paper}"/>${R(138, 76, 8, 6, C.steel, 'rx="2"')}</g>`
  return out
}

function robot (s: AdminSummary): string { // robot penilai + papan rekap (batang = proporsi status esai) + deretan agen (emas = disewa)
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

function stampDesk (s: AdminSummary): string { // meja stempel: satu kertas per usulan; hijau disahkan, jingga disesuaikan, merah ditolak, garis putus = menunggu
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
  out += `<g class="ln-stamp"><circle cx="90" cy="26" r="13" fill="${C.gold}"/>${R(84, 38, 12, 28, C.sub)}${R(62, 66, 56, 14, C.sub, 'rx="3"')}${R(66, 78, 48, 6, C.green, 'rx="2"')}</g>`
  return out
}

function badge (s: AdminSummary): string { // lencana: perisai emas dengan centang; deretan peniti kecil = esai diterima
  let out = `<polygon points="70,112 56,150 76,142 86,152 92,114" fill="${C.green}"/><polygon points="110,112 124,150 104,142 94,152 88,114" fill="${C.green}"/>`
  out += `<path d="M90 30 L136 46 V84 C136 110 116 126 90 136 C64 126 44 110 44 84 V46 Z" fill="${C.gold}"/><path d="M90 42 L126 54 V84 C126 104 110 117 90 125 C70 117 54 104 54 84 V54 Z" fill="${C.card}"/>`
  out += `<path d="M72 84 L86 98 L110 68" fill="none" stroke="${C.gold}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
  const n = Math.min(acceptedOf(s), 10)
  for (let i = 0; i < n; i += 1) { const cx = 90 - (n * 17) / 2 + 8.5 + i * 17; out += `<circle cx="${cx}" cy="172" r="6.5" fill="${C.green}"/><path d="M${cx - 3} 172 l2 2 l4 -4.5" fill="none" stroke="#0b3d2b" stroke-width="1.8" stroke-linecap="round"/>` }
  return out
}

function jars (s: AdminSummary, lang: Lang): string { // pipa koin dengan pembagi + dua toples: tinggi isi = bagian uang (hanya bila pembagian terbaca dari chain)
  const bps = s.money.platformBps
  const f = bps === null ? null : bps / 10000
  const H = 56
  let out = `<polygon points="66,22 114,22 104,50 76,50" fill="${C.sub}"/>` + R(84, 50, 12, 18, C.line2)
  out += `<path d="M90 68 V82 H44 V96 M90 82 H136 V96" fill="none" stroke="${C.line2}" stroke-width="10" stroke-linejoin="round"/>`
  out += [0, 0.7, 1.4].map((d, i) => `<g class="ln-coin" style="animation-delay:${d}s"><circle cx="${90 + (i - 1) * 4}" cy="30" r="6" fill="${C.gold}"/></g>`).join('')
  out += R(18, 96, 52, 54, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`) + R(110, 96, 52, 54, C.inset, `stroke="${C.line2}" stroke-width="2" rx="4"`)
  if (f !== null) {
    out += R(20, 148 - Math.max(3, f * H), 48, Math.max(3, f * H), C.gold) + R(112, 148 - (1 - f) * H, 48, (1 - f) * H, C.green)
    out += `<text x="44" y="90" text-anchor="middle" font-size="10" font-weight="800" fill="${C.gold}" font-family="${MONO}">${+(f * 100).toFixed(1)}%</text><text x="136" y="90" text-anchor="middle" font-size="10" font-weight="800" fill="${C.green}" font-family="${MONO}">${+(100 - f * 100).toFixed(1)}%</text>`
  }
  if (s.money.chargesDue.count > 0) out += R(74, 124, 32, 26, C.amber, 'rx="3"') + `<text x="90" y="141" text-anchor="middle" font-size="16" font-weight="800" fill="#14110a" font-family="${MONO}">${s.money.chargesDue.count}</text><text x="90" y="161" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.amber}">${lang === 'id' ? 'TAGIHAN' : 'FEES'}</text>`
  return out
}

export function drawObject (id: string, s: AdminSummary, lang: Lang): string {
  switch (id) {
    case 'course': return shelf(s, lang)
    case 'enroll': return gate(s)
    case 'essay': return desk(s)
    case 'agent': return robot(s)
    case 'review': return stampDesk(s)
    case 'result': return badge(s)
    case 'settle': return jars(s, lang)
    default: return ''
  }
}

/* ------------------------------------------------------------------ benda yang berpindah antar station */
const TOKENS: Record<string, string> = {
  book: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 16, 22, C.gold, 'rx="2"')}${R(9, 8, 10, 3, C.card)}${R(9, 14, 10, 2, C.card)}</svg>`,
  ticket: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(2, 8, 24, 13, C.green, 'rx="2"')}<circle cx="14" cy="14.5" r="3.4" fill="${C.gold}"/></svg>`,
  sheet: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 2, C.steel)}${R(9, 13, 11, 2, C.steel)}${R(9, 18, 7, 2, C.steel)}</svg>`,
  scored: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 3, C.gold)}${R(9, 14, 8, 3, C.gold)}${R(9, 20, 4, 2, C.steel)}</svg>`,
  stamped: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}<circle cx="14.5" cy="13" r="5.5" fill="${C.green}"/>${R(9, 21, 11, 2, C.steel)}</svg>`,
  coin: `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10" fill="${C.gold}"/><circle cx="14" cy="14" r="6" fill="none" stroke="#b78900" stroke-width="2"/></svg>`,
}
const HOP: Record<string, string> = { course: 'book', enroll: 'ticket', essay: 'sheet', agent: 'scored', review: 'stamped', result: 'coin' }

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** Penghitung angka (hanya tampilan; teks akhir selalu ada di DOM; dilewati bila gerak dikurangi). */
function countUp (el: HTMLElement): void {
  const text = el.textContent ?? ''
  const to = Number(text)
  if (reduceMotion() || !Number.isFinite(to) || to < 2 || typeof requestAnimationFrame !== 'function') return
  const dec = text.includes('.')
  const t0 = performance.now()
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / 800)
    const v = to * (1 - (1 - p) ** 3)
    el.textContent = p < 1 ? (dec ? v.toFixed(1) : String(Math.round(v))) : text
    if (p < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = text
  }
  el.textContent = '0'
  requestAnimationFrame(step)
}

/** Sabuk: tiap station = benda + angka besar + judul + keterangan; klik / Enter membuka detail. */
export function lineEl (opts: { stations: Station[], s: AdminSummary, lang: Lang, open: (id: string) => void, hint: string, moreLabel: string }): HTMLElement {
  const line = h('div', { class: 'ln-line' }, h('div', { class: 'ln-rail', 'aria-hidden': 'true' }))
  opts.stations.forEach((st, i) => {
    const b = h('button', { type: 'button', class: 'ln-st', 'data-station': st.id, 'aria-label': `${st.title}: ${st.big}. ${st.sub}. ${opts.hint}` }) as HTMLButtonElement
    b.innerHTML = `<svg class="ln-obj" viewBox="0 0 180 190" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${drawObject(st.id, opts.s, opts.lang)}</svg>`
      + `<span class="ln-lab"><b class="ln-big">${esc(String(st.big))}</b><strong>${esc(st.title)}</strong><small>${esc(st.sub)}</small>${st.hot ? `<small class="hot">${esc(st.hot)}</small>` : ''}</span><span class="ln-more">${esc(opts.moreLabel)} ›</span>`
    b.addEventListener('click', () => opts.open(st.id))
    line.appendChild(b)
    countUp(b.querySelector<HTMLElement>('.ln-big')!)
    const tok = HOP[st.id]
    if (tok && i < opts.stations.length - 1) {
      const hop = h('div', { class: 'ln-hop', 'aria-hidden': 'true', style: `left:${((i + 1) / opts.stations.length) * 100}%` })
      hop.innerHTML = TOKENS[tok]!
      ;(hop.firstElementChild as SVGElement | null)?.setAttribute('style', `animation-delay:${i * 0.5}s`)
      line.appendChild(hop)
    }
  })
  return h('div', { class: 'ln-wrap' }, line)
}
