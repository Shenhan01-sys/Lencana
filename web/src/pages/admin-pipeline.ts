/**
 * `admin-pipeline.ts` — pipeline gaya n8n untuk tab Ringkasan halaman Admin (B172, 6 Okt malam; builder: "bikin kayak FE pipeline n8n, tiap station bisa
 * diklik detailnya, munculin popup"). Acuan bentuk: `References/Flow1WithN8N.md` — kanvas titik-titik, node persegi bulat dengan ikon dan handle, konektor
 * bezier berpanah, "payload" kecil yang berjalan di jalur, loop ulang putus-putus berwarna jingga, dan strip statistik di bawah. Warna: palet LENCANA
 * (kartu #181a20, tepi #2b313a, emas, hijau, jingga, merah, abu), bukan palet acuan.
 *
 * Modul ini hanya UI: stasiun, lompatan, dan isi popup diberikan pemanggil (`admin-stations.ts`) dari angka nyata. Dua tata letak:
 *   lebar   kanvas 1040×470 yang diskalakan mengikuti lebar kartu (zig-zag, konektor + payload SVG)
 *   sempit  (≤ 820 px) kolom vertikal: node di kiri, konektor vertikal bertitik yang bergerak
 * Setiap stasiun adalah <button> (fokus papan ketik, Enter/Spasi) yang membuka dialog detail dengan navigasi ke stasiun sebelum/sesudahnya.
 */
import { h } from '../lib/ui'

export type Tone = 'gold' | 'green' | 'amber' | 'rose' | 'steel'
export const TONE_HEX: Record<Tone, string> = { gold: '#f0b90b', green: '#0ecb81', amber: '#ff9f1a', rose: '#f6465d', steel: '#b7bdc6' }

export type Station = {
  id: string, title: string, sub: string, icon: string, tone: Tone, cx: number, cy: number
  kind?: 'trigger' | 'terminal'
  chip?: string
  bar?: { value: number, max: number, label: string }
}
export type Hop = { from: string, to: string, label: string, tone: Tone }
export type Loop = { from: string, to: string, pill: string, label: string }
export type Detail = {
  id: string, title: string, tone: Tone, icon: string, what: string
  rows: Array<{ label: string, value: string, tone?: Tone }>
  actors: string[], actorsLabel: string, sourceLabel: string, source: string
  action?: { label: string, run: () => void }
}

export const W = 1040
export const H = 470
const NODE = 76
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

const iconEl = (d: string, size = 30): HTMLElement => {
  const el = h('span', { class: 'pl-ic', 'aria-hidden': 'true' })
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
  return el
}
const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c)

function stationButton (st: Station, index: number, open: (id: string) => void, hint: string): HTMLButtonElement {
  const node = h('span', { class: `pl-node tone-${st.tone}${st.kind ? ` kind-${st.kind}` : ''}` },
    iconEl(st.icon),
    st.kind === 'trigger' ? h('i', { class: 'pl-pulse', 'aria-hidden': 'true' }) : null,
    st.kind === 'trigger' ? null : h('i', { class: 'pl-handle left', 'aria-hidden': 'true' }),
    st.kind === 'terminal' ? null : h('i', { class: 'pl-handle right', 'aria-hidden': 'true' }))
  const details = h('span', { class: 'pl-details' },
    h('span', { class: 'pl-title' }, st.title),
    h('span', { class: 'pl-sub' }, st.sub),
    st.chip ? h('span', { class: 'pl-chip' }, st.chip) : null,
    st.bar ? h('span', { class: 'pl-bar', title: st.bar.label },
      h('span', { class: 'pl-bar-fill', style: `width:${st.bar.max > 0 ? Math.min(100, (st.bar.value / st.bar.max) * 100) : 0}%` }),
      h('small', null, st.bar.label)) : null)
  const b = h('button', { type: 'button', class: 'pl-st', 'data-station': st.id, 'data-index': String(index), 'aria-label': `${st.title}. ${st.sub}. ${hint}` }, node, details) as HTMLButtonElement
  b.addEventListener('click', () => open(st.id))
  return b
}

/** Garis konektor bezier dari handle kanan satu stasiun ke handle kiri stasiun berikutnya (koordinat kanvas). */
function hopPath (a: Station, b: Station): string {
  const x0 = a.cx + NODE / 2 + 2, y0 = a.cy, x1 = b.cx - NODE / 2 - 4, y1 = b.cy
  const dx = Math.max(40, (x1 - x0) * 0.55)
  return `M ${x0} ${y0} C ${x0 + dx} ${y0}, ${x1 - dx} ${y1}, ${x1} ${y1}`
}

function wideLayout (stations: Station[], hops: Hop[], loop: Loop | null, open: (id: string) => void, hint: string): HTMLElement {
  const byId = new Map(stations.map((s) => [s.id, s]))
  const motion = !prefersReducedMotion()
  const paths: string[] = []
  const payloads: string[] = []
  hops.forEach((hp, i) => {
    const a = byId.get(hp.from), b = byId.get(hp.to)
    if (!a || !b) return
    const d = hopPath(a, b)
    paths.push(`<path d="${d}" stroke="#5d6672" stroke-width="2" fill="none" marker-end="url(#pl-arrow)"/>`)
    if (motion) {
      const w = Math.max(64, hp.label.length * 6.4 + 22)
      const dur = 3 + (i % 3) * 0.4
      const begin = (i * 0.45).toFixed(2)
      payloads.push(`<g opacity="0"><rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12" fill="#181a20" stroke="${TONE_HEX[hp.tone]}" stroke-width="1"/>`
        + `<text x="0" y="3.5" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="10" fill="${TONE_HEX[hp.tone]}" font-weight="500" text-anchor="middle">${esc(hp.label)}</text>`
        + `<animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${d}"/>`
        + `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></g>`)
    }
  })
  let loopLabel: HTMLElement | null = null
  if (loop) {
    const a = byId.get(loop.from), b = byId.get(loop.to)
    if (a && b) {
      const y0 = a.cy + NODE / 2 + 4
      const dip = Math.max(a.cy, b.cy) + NODE / 2 + 96
      paths.push(`<path d="M ${a.cx} ${y0} C ${a.cx} ${dip}, ${b.cx} ${dip}, ${b.cx} ${b.cy + NODE / 2 + 6}" stroke="#ff9f1a" stroke-width="1.5" stroke-dasharray="6 6" fill="none" opacity="0.85" marker-end="url(#pl-arrow-amber)"/>`)
      const mx = (a.cx + b.cx) / 2, my = dip * 0.75 + y0 * 0.25 + 18
      loopLabel = h('div', { class: 'pl-loop', style: `left:${mx}px;top:${my}px`, title: loop.label }, loop.pill)
    }
  }
  const svg = h('span', { class: 'pl-svg' })
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs>`
    + `<marker id="pl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#5d6672"/></marker>`
    + `<marker id="pl-arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ff9f1a"/></marker></defs>${paths.join('')}${payloads.join('')}</svg>`
  const canvas = h('div', { class: 'pl-canvas', style: `width:${W}px;height:${H}px` }, svg,
    ...stations.map((st, i) => h('div', { class: 'pl-pos', style: `left:${st.cx - 80}px;top:${st.cy - NODE / 2}px` }, stationButton(st, i, open, hint))),
    loopLabel)
  const wrap = h('div', { class: 'pl-wrap', style: `height:${H}px` }, canvas)
  const fit = () => {
    const w = wrap.clientWidth
    if (!w) return
    const k = Math.min(1, w / W)
    canvas.style.transform = `scale(${k})`
    wrap.style.height = `${Math.round(H * k)}px`
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(wrap)
  requestAnimationFrame(fit)
  return wrap
}

function tallLayout (stations: Station[], hops: Hop[], loop: Loop | null, open: (id: string) => void, hint: string): HTMLElement {
  const list = h('ol', { class: 'pl-col' })
  stations.forEach((st, i) => {
    const hop = hops.find((x) => x.to === st.id)
    list.appendChild(h('li', { class: 'pl-row' },
      i > 0 ? h('div', { class: `pl-link tone-${hop?.tone ?? 'cyan'}` }, h('i', { class: 'pl-dot', 'aria-hidden': 'true' }), hop ? h('span', null, hop.label) : null) : null,
      stationButton(st, i, open, hint)))
    if (loop && loop.from === st.id) list.appendChild(h('li', { class: 'pl-row' }, h('div', { class: 'pl-loop flat', title: loop.label }, `↺ ${loop.pill}`)))
  })
  return h('div', { class: 'pl-wrap tall' }, list)
}

/** Pipeline: pilih tata letak menurut lebar layar dan gambar ulang bila lebar berganti (satu kali per pindah, tanpa memutar ulang animasi masuk). */
export function pipeline (opts: { stations: Station[], hops: Hop[], loop: Loop | null, open: (id: string) => void, hint: string }): HTMLElement {
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 820px)') : null
  const host = h('div', { class: 'pl-host' })
  const draw = () => host.replaceChildren(mq?.matches ? tallLayout(opts.stations, opts.hops, opts.loop, opts.open, opts.hint) : wideLayout(opts.stations, opts.hops, opts.loop, opts.open, opts.hint))
  draw()
  mq?.addEventListener?.('change', () => { if (host.isConnected) draw() })
  return host
}

/* ------------------------------------------------------------------ popup detail stasiun */

/**
 * Dialog detail satu stasiun, dengan tombol sebelum/sesudah ke stasiun tetangga. `order` = urutan id stasiun; `detailOf` membangun isi dari angka terkini.
 * Esc, tombol Tutup, dan klik di luar kotak menutup; fokus kembali ke stasiun yang membukanya.
 */
export function openStationDialog (opts: { id: string, order: string[], detailOf: (id: string) => Detail | null, labels: { close: string, prev: string, next: string } }): void {
  const opener = document.activeElement as HTMLElement | null
  const dlg = h('dialog', { class: 'adm-dlg pl-dlg', 'aria-labelledby': 'pl-dlg-t' }) as HTMLDialogElement
  let current = opts.id
  const render = () => {
    const d = opts.detailOf(current)
    if (!d) return
    const i = opts.order.indexOf(current)
    const prev = i > 0 ? opts.order[i - 1]! : null
    const next = i >= 0 && i < opts.order.length - 1 ? opts.order[i + 1]! : null
    const go = (id: string | null) => { if (id) { current = id; render(); dlg.querySelector<HTMLElement>('[data-dlg-focus]')?.focus() } }
    const prevB = h('button', { type: 'button', class: 'adm-btn', disabled: !prev, 'data-prev': '' }, `← ${opts.labels.prev}`) as HTMLButtonElement
    const nextB = h('button', { type: 'button', class: 'adm-btn', disabled: !next, 'data-next': '' }, `${opts.labels.next} →`) as HTMLButtonElement
    prevB.addEventListener('click', () => go(prev)); nextB.addEventListener('click', () => go(next))
    const closeB = h('button', { type: 'button', class: 'adm-btn pri', 'data-dlg-focus': '', 'data-close': '' }, opts.labels.close) as HTMLButtonElement
    closeB.addEventListener('click', () => dlg.close())
    dlg.replaceChildren(h('div', { class: 'pl-dlg-f' },
      h('div', { class: 'pl-dlg-head' },
        h('span', { class: `pl-node small tone-${d.tone}` }, iconEl(d.icon, 24)),
        h('div', null, h('span', { class: 'pl-dlg-step' }, `${i + 1} / ${opts.order.length}`), h('h2', { id: 'pl-dlg-t' }, d.title))),
      h('p', { class: 'pl-dlg-what' }, d.what),
      h('dl', { class: 'pl-dlg-rows' }, ...d.rows.flatMap((r) => [h('dt', null, r.label), h('dd', { class: r.tone ? `tone-${r.tone}` : '' }, r.value)])),
      h('div', { class: 'pl-dlg-actors' }, h('span', null, d.actorsLabel), ...d.actors.map((a) => h('b', { class: 'pl-actor' }, a))),
      h('p', { class: 'pl-dlg-src' }, h('b', null, `${d.sourceLabel}: `), d.source),
      d.action ? h('button', { type: 'button', class: 'adm-btn pri pl-dlg-act', onClick: () => { dlg.close(); d.action!.run() } }, d.action.label) : null,
      h('div', { class: 'pl-dlg-nav' }, prevB, nextB, closeB)))
  }
  render()
  dlg.addEventListener('close', () => { dlg.remove(); opener?.focus?.() })
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close() })
  document.body.appendChild(dlg)
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
  dlg.querySelector<HTMLElement>('[data-dlg-focus]')?.focus()
}
