/**
 * `loading.ts` — pita pemuatan di tepi atas layar dan kerangka isi (B126).
 *
 * Pita itu mengikuti PERMINTAAN SUNGGUHAN, bukan timer: `installFetchTracking` membungkus `window.fetch` sekali, jadi
 * setiap panggilan ke penerbit, RPC chain (viem memakai fetch global), dan login ikut terhitung. Selama ada yang belum
 * selesai pita merayap mendekati 90%; begitu semuanya selesai ia penuh lalu memudar. Permintaan yang selesai di bawah
 * 140 ms tidak memunculkan pita sama sekali — supaya halaman yang cepat tidak berkedip.
 *
 * Kerangka (`skeleton`) menggantikan teks "memuat…": bentuknya meniru isi yang akan datang, dengan kilau emas yang
 * menyapu (teknik `ShinyText` React Bits: gradien 200% + `background-position` bergerak). `steps` menampilkan tahap
 * yang benar-benar terjadi (mis. tanda tangan → membaca penerbit), bukan persentase karangan.
 */
// Lencana-B126 status=TERBUKA 2026-10-02 — pita pemuatan global (membungkus window.fetch: penerbit, RPC chain, login) + kerangka isi berkilau + tahap muat yang sungguhan; dipakai dashboard, detail kursus, dan saldo navbar. Buktikan ulang: cd web && npm run build, lalu uji peramban T48. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './loading.css'
import { h } from './ui'

const SHOW_AFTER_MS = 140

let inflight = 0
let progress = 0
let bar: HTMLElement | null = null
let fill: HTMLElement | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null
let trickleTimer: ReturnType<typeof setInterval> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let visible = false

function ensureBar (): void {
  if (bar || typeof document === 'undefined') return
  fill = h('span', { class: 'lc-loadbar-fill' })
  bar = h('div', { class: 'lc-loadbar', 'aria-hidden': 'true' }, fill)
  document.body.appendChild(bar)
}

function paint (): void {
  if (fill) fill.style.transform = `scaleX(${progress.toFixed(4)})`
}

function show (): void {
  ensureBar()
  if (!bar) return
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  visible = true
  bar.classList.add('on')
  progress = Math.max(progress, 0.08)
  paint()
  trickleTimer ??= setInterval(() => {
    // Mendekati 90% makin pelan: pita yang berhenti di 100% sebelum datanya datang adalah kebohongan kecil.
    progress += (0.9 - progress) * 0.09
    paint()
  }, 260)
}

function finish (): void {
  if (showTimer) { clearTimeout(showTimer); showTimer = null }
  if (trickleTimer) { clearInterval(trickleTimer); trickleTimer = null }
  if (!visible || !bar) { progress = 0; return }
  progress = 1
  paint()
  hideTimer = setTimeout(() => {
    bar?.classList.remove('on')
    hideTimer = setTimeout(() => { progress = 0; paint(); visible = false }, 320)
  }, 220)
}

/** Satu pekerjaan mulai; panggil fungsi yang dikembalikan saat selesai (sekali saja). */
export function startLoad (): () => void {
  inflight++
  if (inflight === 1 && !visible) {
    showTimer ??= setTimeout(() => { showTimer = null; if (inflight > 0) show() }, SHOW_AFTER_MS)
  }
  let done = false
  return () => {
    if (done) return
    done = true
    inflight = Math.max(0, inflight - 1)
    if (inflight === 0) finish()
  }
}

/** Ikutkan sebuah janji di pita pemuatan. */
export function track<T> (p: Promise<T>): Promise<T> {
  const done = startLoad()
  return p.finally(done)
}

/** Bungkus `window.fetch` sekali — semua permintaan jaringan halaman ikut menggerakkan pita. */
export function installFetchTracking (): void {
  const w = window as Window & { __lcFetchTracked?: boolean }
  if (w.__lcFetchTracked || typeof w.fetch !== 'function') return
  w.__lcFetchTracked = true
  const original = w.fetch.bind(w)
  w.fetch = (input: RequestInfo | URL, init?: RequestInit) => track(original(input, init))
}

// ---------------------------------------------------------------- kerangka isi

type SkeletonShape = 'stats' | 'cards' | 'grades' | 'wallet' | 'table' | 'panel' | 'list'

const block = (cls: string, style?: Partial<CSSStyleDeclaration>) => h('span', { class: `lc-skel ${cls}`, style: style ?? {} })

/**
 * Kerangka berbentuk isi yang akan datang. `label` dibacakan pembaca layar (kerangka sendiri tersembunyi dari mereka).
 */
export function skeleton (shape: SkeletonShape, label: string): HTMLElement {
  const parts: HTMLElement[] = []
  if (shape === 'stats' || shape === 'grades') {
    parts.push(h('div', { class: 'lc-skel-row stats' }, ...[0, 1, 2, 3].slice(0, shape === 'stats' ? 3 : 4).map(() =>
      h('div', { class: 'lc-skel-tile' }, block('w40 h28'), block('w70 h12')))))
  }
  if (shape === 'stats' || shape === 'cards') {
    for (let i = 0; i < 2; i++) {
      parts.push(h('div', { class: 'lc-skel-card' }, block('w20 h10'), block('w60 h20'), block('w100 h8 pill'), block('w30 h36 pill')))
    }
  }
  if (shape === 'grades') {
    parts.push(h('div', { class: 'lc-skel-card' },
      block('w40 h20'),
      h('div', { class: 'lc-skel-row split' }, block('ring'), h('div', { class: 'lc-skel-col' }, block('w100 h28 pill'), block('w60 h12'), block('w80 h12'))),
      h('div', { class: 'lc-skel-bars' }, ...[62, 88, 45, 76, 92].map((pct) => block('bar', { height: `${pct}%` }))),
    ))
  }
  if (shape === 'wallet') {
    parts.push(h('div', { class: 'lc-skel-card hero' }, h('div', { class: 'lc-skel-row split' }, block('coin'), h('div', { class: 'lc-skel-col' }, block('w50 h40'), block('w70 h12'))), block('w40 h36 pill')))
    parts.push(h('div', { class: 'lc-skel-card' }, block('w30 h16'), block('w100 h24 pill')))
  }
  if (shape === 'table' || shape === 'wallet' || shape === 'grades') {
    parts.push(h('div', { class: 'lc-skel-card' }, ...[0, 1, 2, 3].map(() => h('div', { class: 'lc-skel-row line' }, block('w30 h12'), block('w15 h12'), block('w20 h12'), block('w15 h12')))))
  }
  if (shape === 'list') {
    parts.push(...[0, 1, 2].map(() => h('div', { class: 'lc-skel-row line' }, block('w50 h14'), block('w20 h14'))))
  }
  if (shape === 'panel') {
    parts.push(block('w60 h14'), block('w100 h48 pill'), block('w80 h12'))
  }
  return h('div', { class: `lc-skeleton ${shape}`, 'aria-busy': 'true', role: 'status' },
    h('span', { class: 'lc-sr' }, label),
    h('div', { class: 'lc-skel-body', 'aria-hidden': 'true' }, ...parts))
}

/**
 * Tahap-tahap yang benar-benar dilalui sebuah pemuatan (mis. "tanda tangan" → "membaca penerbit").
 * `set(i)` menandai tahap i aktif dan yang sebelumnya selesai.
 */
export function steps (labels: string[]): HTMLElement & { set: (i: number) => void } {
  const items = labels.map((t) => h('li', null, h('span', { class: 'lc-step-dot', 'aria-hidden': 'true' }), h('span', null, t)))
  const el = h('ol', { class: 'lc-steps', 'aria-live': 'polite' }, ...items) as HTMLElement & { set: (i: number) => void }
  el.set = (i: number) => items.forEach((li, k) => {
    li.classList.toggle('done', k < i)
    li.classList.toggle('active', k === i)
  })
  el.set(0)
  return el
}
