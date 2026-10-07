/**
 * `essay-belt.ts` — alur esai di dasbor Penerbit sebagai BENDA di satu sabuk (B174; bahasa visual yang sama dengan sabuk Admin B172/FE11).
 * Permintaan builder 7 Okt: "di bagian /app/pub/essays di section Essay pipeline tolong diperbagus UI-nya" — sesudah stepper empat kartu (B129).
 *
 * Doktrin FE builder: wakili prosesnya. Tiap tahap adalah benda nyatanya: baki kertas masuk (diserahkan), robot pengusul dengan tag nilai jingga
 * (diusulkan), meja stempel (final: hijau disahkan, jingga disesuaikan, abu dinilai kunci penerbit), tong (ditolak). Jumlah benda = jumlah data,
 * benda kecil yang ikut berjalan di sabuk adalah kertas yang berpindah tahap. Gaya SOLID: warna datar palet Lencana, tanpa gradient, tanpa glow.
 */
// Lencana-B174 status=SELESAI 2026-10-07 — sabuk alur esai di dasbor Penerbit (Ringkasan + Esai): empat benda digerakkan pipeline nyata, angka dan teks untuk pembaca layar. Buktikan ulang: cd web && npx tsc --noEmit && npm run build, lalu uji peramban T98. JANGAN dibalik/diulang tanpa membuka kembali baris B174 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { h } from '../lib/ui'
import { odometer } from '../lib/odometer'

type Pipe = Record<'awaitingJudge' | 'insufficient' | 'awaitingReview' | 'approved' | 'adjusted' | 'rejected' | 'graded', number>

const C = { inset: '#1e2329', card: '#181a20', line: '#2b313a', line2: '#3a414c', mute: '#848e9c', steel: '#5d6672', sub: '#b7bdc6', paper: '#cfd4dc', gold: '#f0b90b', green: '#0ecb81', amber: '#ff9f1a', red: '#f6465d', bg: '#0f1216' } as const
const R = (x: number, y: number, w: number, hgt: number, fill: string, extra = ''): string => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="${fill}" ${extra}/>`

/* ------------------------------------------------------------------ benda (SVG datar 180×190, lantai sabuk di y=150) */

/** Baki masuk: satu kertas per esai yang menunggu dinilai; kertas di bawah syarat mekanis bertanda sudut merah. */
function tray (n: number, insufficient: number): string {
  const k = Math.min(n, 12)
  let out = ''
  for (let i = 0; i < k; i += 1) {
    const y = 122 - i * 7, x = 42 + (i % 2) * 3
    out += R(x, y, 96, 30, C.paper, `stroke="${C.mute}" stroke-width="1" rx="2"`) + R(x + 10, y + 7, 60, 3, C.steel) + R(x + 10, y + 14, 44, 3, C.steel)
    if (i >= k - Math.min(insufficient, k)) out += `<polygon points="${x + 96},${y} ${x + 80},${y} ${x + 96},${y + 16}" fill="${C.red}"/>`
  }
  if (k === 0) out += R(46, 118, 88, 30, 'none', `stroke="${C.mute}" stroke-width="1.5" stroke-dasharray="4 4" rx="2"`)
  // the tray itself, drawn last so the sheets sit inside it
  out += `<polygon points="22,132 158,132 150,150 30,150" fill="${C.inset}" stroke="${C.line2}" stroke-width="2"/>` + R(22, 128, 136, 6, C.line2, 'rx="2"')
  out += `<path d="M90 46 V88 M76 74 L90 88 L104 74" fill="none" stroke="${C.gold}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
  return out
}

/** Robot pengusul: menyodorkan kertas dengan tag nilai jingga; deretan kertas bertag = esai yang menunggu pengesahan. */
function proposer (n: number): string {
  const eye = n > 0 ? C.gold : C.steel
  let out = R(32, 40, 60, 42, C.sub, 'rx="10"') + `<line x1="62" y1="40" x2="62" y2="26" stroke="${C.sub}" stroke-width="4"/><circle cx="62" cy="22" r="6" fill="${eye}"/>`
  out += `<circle cx="48" cy="60" r="8" fill="${C.card}"/><circle cx="76" cy="60" r="8" fill="${C.card}"/><circle cx="48" cy="60" r="3.6" fill="${eye}"/><circle cx="76" cy="60" r="3.6" fill="${eye}"/>` + R(52, 72, 20, 4, C.card, 'rx="2"')
  out += R(38, 86, 48, 44, C.sub, 'rx="6"') + R(46, 98, 32, 6, C.card, 'rx="2"') + R(46, 110, 18, 6, C.amber, 'rx="2"') + R(48, 130, 10, 20, C.steel, 'rx="2"') + R(68, 130, 10, 20, C.steel, 'rx="2"')
  // arm holding out a scored sheet
  out += R(86, 92, 22, 8, C.steel, 'rx="4"') + R(104, 70, 40, 52, C.paper, `stroke="${C.mute}" stroke-width="1.5" rx="3"`) + R(110, 80, 26, 3, C.steel) + R(110, 87, 20, 3, C.steel)
  out += R(110, 98, 28, 16, C.amber, 'rx="3"') + `<text x="124" y="110" text-anchor="middle" font-size="11" font-weight="800" fill="#14110a" font-family="ui-monospace,monospace">${n > 0 ? '?' : '–'}</text>`
  const k = Math.min(n, 8)
  for (let i = 0; i < k; i += 1) { const x = 90 - (k * 20) / 2 + i * 20; out += R(x, 160, 16, 20, C.paper, `stroke="${C.mute}" stroke-width="1" rx="2"`) + R(x + 3, 164, 10, 5, C.amber, 'rx="1.5"') }
  return out
}

/** Meja stempel: satu kertas per esai final — hijau disahkan, jingga disesuaikan, abu dinilai langsung kunci penerbit. */
function stampDesk (p: Pipe): string {
  const list = [...Array<string>(p.approved).fill('g'), ...Array<string>(p.adjusted).fill('a'), ...Array<string>(p.graded).fill('s')].slice(0, 12)
  let out = ''
  list.forEach((kind, i) => {
    const row = i < 6 ? 0 : 1, idx = row ? i - 6 : i
    const w = 20, gap = 4, count = row ? list.length - 6 : Math.min(list.length, 6)
    const x = 90 - (count * (w + gap) - gap) / 2 + idx * (w + gap), y = row ? 148 - 30 - 34 : 148 - 30
    const col = kind === 'g' ? C.green : kind === 'a' ? C.amber : C.steel
    out += R(x, y, w, 30, C.paper, `stroke="${C.mute}" stroke-width="1" rx="2"`) + `<circle cx="${x + w / 2}" cy="${y + 11}" r="6" fill="${col}"/>` + R(x + 4, y + 21, w - 8, 3, C.steel)
  })
  if (!list.length) out += R(70, 118, 40, 30, 'none', `stroke="${C.mute}" stroke-width="1.5" stroke-dasharray="4 4" rx="2"`)
  out += R(30, 140, 120, 10, C.inset, `stroke="${C.line2}" stroke-width="1.5" rx="2"`)
  out += `<g class="eb-stamp"><circle cx="90" cy="26" r="13" fill="${C.gold}"/>${R(84, 38, 12, 24, C.sub)}${R(62, 62, 56, 14, C.sub, 'rx="3"')}${R(66, 74, 48, 6, C.green, 'rx="2"')}</g>`
  return out
}

/** Tong: satu gumpalan kertas per esai tanpa nilai sah. */
function bin (n: number): string {
  const k = Math.min(n, 9)
  const stroke = n > 0 ? C.red : C.line2
  let out = ''
  for (let i = 0; i < k; i += 1) {
    const cx = 66 + (i % 3) * 24 + (Math.floor(i / 3) % 2) * 10, cy = 74 - Math.floor(i / 3) * 16
    out += `<circle cx="${cx}" cy="${cy}" r="11" fill="${C.paper}" stroke="${C.mute}" stroke-width="1"/><path d="M${cx - 6} ${cy - 2} l5 3 l4 -5 M${cx - 2} ${cy + 5} l6 -2" fill="none" stroke="${C.steel}" stroke-width="1.6"/>`
  }
  out += `<polygon points="44,84 136,84 126,150 54,150" fill="${C.inset}" stroke="${stroke}" stroke-width="2.5"/>` + R(38, 78, 104, 10, stroke === C.red ? C.red : C.line2, 'rx="3"')
  out += `<g stroke="${C.line2}" stroke-width="3"><line x1="72" y1="98" x2="76" y2="138"/><line x1="90" y1="98" x2="90" y2="138"/><line x1="108" y1="98" x2="104" y2="138"/></g>`
  return out
}

const TOKEN = {
  sheet: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 2, C.steel)}${R(9, 13, 11, 2, C.steel)}${R(9, 18, 7, 2, C.steel)}</svg>`,
  scored: `<svg viewBox="0 0 28 28" aria-hidden="true">${R(6, 3, 17, 22, C.paper, `stroke="${C.mute}" rx="2"`)}${R(9, 8, 11, 2, C.steel)}${R(9, 14, 11, 6, C.amber, 'rx="1.5"')}</svg>`,
}

export type BeltCopy = { judge: string, judgeSub: string, review: string, reviewSub: string, done: string, doneSub: string, rejected: string, rejectedSub: string, or: string }

/** Sabuk alur esai: baki → robot pengusul → meja stempel, dengan cabang "atau" ke tong. */
export function essayBelt (p: Pipe, copy: BeltCopy, reviewHref?: string): HTMLElement {
  const judge = p.awaitingJudge + p.insufficient
  const done = p.approved + p.adjusted + p.graded
  const stations: { id: string, n: number, label: string, sub: string, svg: string, cls: string, href?: string }[] = [
    { id: 'judge', n: judge, label: copy.judge, sub: copy.judgeSub, svg: tray(judge, p.insufficient), cls: 'judge' },
    { id: 'review', n: p.awaitingReview, label: copy.review, sub: copy.reviewSub, svg: proposer(p.awaitingReview), cls: p.awaitingReview ? 'review hot' : 'review', href: reviewHref },
    { id: 'done', n: done, label: copy.done, sub: copy.doneSub, svg: stampDesk(p), cls: 'done' },
    { id: 'rejected', n: p.rejected, label: copy.rejected, sub: copy.rejectedSub, svg: bin(p.rejected), cls: p.rejected ? 'rejected bad' : 'rejected' },
  ]
  const line = h('ol', { class: 'eb-line' }, h('li', { class: 'eb-rail', 'aria-hidden': 'true' }))
  stations.forEach((s, i) => {
    const inner = h('span', { class: 'eb-in' })
    inner.innerHTML = `<svg class="eb-obj" viewBox="0 0 180 190" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${s.svg}</svg>`
    const lab = h('span', { class: 'eb-lab' }, h('span', { class: 'eb-n' }, odometer(String(s.n), { from: '0' })), h('strong', null, s.label), h('small', null, s.sub))
    inner.appendChild(lab)
    const body = s.href && s.n > 0 ? h('a', { class: 'eb-link', href: s.href }, inner) : inner
    line.appendChild(h('li', { class: `eb-st ${s.cls}`, 'data-stage': s.id }, s.id === 'rejected' ? h('span', { class: 'eb-or', 'aria-hidden': 'true' }, copy.or) : null, body))
    if (i < 2) {
      const hop = h('li', { class: 'eb-hop', 'aria-hidden': 'true', style: `left:${((i + 1) / 4) * 100}%` })
      hop.innerHTML = i === 0 ? TOKEN.sheet : TOKEN.scored
      ;(hop.firstElementChild as SVGElement | null)?.setAttribute('style', `animation-delay:${i * 0.6}s`)
      line.appendChild(hop)
    }
  })
  return h('div', { class: 'eb-wrap' }, line)
}
