/**
 * `coin.ts` — koin LDC-demo (B126): benda yang diwakili saldo, bukan ikon dompet generik. Koin emas bertepi gerigi
 * dengan monogram "L" Lencana. `drop` memainkan koin jatuh-memantul — dipakai sekali saat koin uji benar-benar masuk.
 */
import './loading.css'

let seq = 0

export function coin (size = 40, opts?: { drop?: boolean, title?: string }): HTMLElement {
  const id = `lcc${++seq}`
  const el = document.createElement('span')
  el.className = `lc-coin${opts?.drop ? ' drop' : ''}`
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  if (opts?.title) {
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', opts.title)
  } else {
    el.setAttribute('aria-hidden', 'true')
  }
  const ticks = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2
    const r1 = 26.6
    const r2 = 29.2
    const f = (n: number) => n.toFixed(2)
    return `<line x1="${f(32 + r1 * Math.cos(a))}" y1="${f(32 + r1 * Math.sin(a))}" x2="${f(32 + r2 * Math.cos(a))}" y2="${f(32 + r2 * Math.sin(a))}"/>`
  }).join('')
  el.innerHTML = `<svg viewBox="0 0 64 64" focusable="false">
  <defs>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#a87400"/></linearGradient>
    <radialGradient id="${id}f" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#fff4b8"/><stop offset="0.42" stop-color="#f0b90b"/><stop offset="1" stop-color="#a06e00"/></radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30.5" fill="url(#${id}r)"/>
  <g stroke="#7a5200" stroke-opacity="0.45" stroke-width="1.1">${ticks}</g>
  <circle cx="32" cy="32" r="25.4" fill="url(#${id}f)" stroke="#8a5f00" stroke-opacity="0.5"/>
  <circle cx="32" cy="32" r="21" fill="none" stroke="#fff6c8" stroke-opacity="0.35" stroke-width="0.9"/>
  <text x="32" y="41.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="25" fill="#6b4600" fill-opacity="0.82">L</text>
  <path d="M15.5 25a18 18 0 0 1 19-12.4" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2.2" stroke-linecap="round"/>
</svg>`
  return el
}
