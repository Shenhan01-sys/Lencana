/**
 * `odometer.ts` — angka bergulir (B126), diilhami komponen `Counter` React Bits: tiap digit adalah pita 0–9 yang
 * digeser `translateY`, dengan tepi atas/bawah memudar selama berguling. Ditulis ulang tanpa React/Framer Motion:
 * transisi CSS di `loading.css`, satu pemilik `transform` per elemen.
 *
 * Dipakai untuk angka yang BERUBAH karena kejadian sungguhan — saldo yang bertambah sesudah koin uji masuk, berkurang
 * sesudah membayar, atau terisi saat data datang (`from: '0'`). Pembaca layar membaca angka akhirnya saja.
 */
import './loading.css'

const DIGITS = '0123456789'
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

function column (digit: number): { col: HTMLElement, strip: HTMLElement } {
  const strip = document.createElement('span')
  strip.className = 'lc-odo-strip'
  for (const c of DIGITS) {
    const s = document.createElement('span')
    s.textContent = c
    strip.appendChild(s)
  }
  strip.style.setProperty('--d', String(digit))
  const col = document.createElement('span')
  col.className = 'lc-odo-col'
  col.appendChild(strip)
  return { col, strip }
}

function render (el: HTMLElement, text: string, animate: boolean): void {
  const prev = [...(el.dataset.v ?? '')]
  const next = [...text]
  el.dataset.v = text
  const offset = next.length - prev.length
  const sr = document.createElement('span')
  sr.className = 'lc-sr'
  sr.textContent = text
  const box = document.createElement('span')
  box.className = 'lc-odo-box'
  box.setAttribute('aria-hidden', 'true')
  box.style.display = 'inline-flex'
  const rolls: [HTMLElement, number][] = []
  next.forEach((c, i) => {
    if (!/\d/.test(c)) {
      const sep = document.createElement('span')
      sep.className = 'lc-odo-sep'
      sep.textContent = c
      box.appendChild(sep)
      return
    }
    const target = Number(c)
    const before = prev[i - offset]
    const start = animate && before !== undefined && /\d/.test(before) ? Number(before) : animate ? 0 : target
    const { col, strip } = column(start)
    box.appendChild(col)
    if (start !== target) rolls.push([strip, target])
  })
  el.replaceChildren(sr, box)
  if (!rolls.length) return
  el.classList.add('rolling')
  void el.offsetWidth // posisi awal harus tergambar dulu supaya transisinya berjalan
  for (const [strip, d] of rolls) strip.style.setProperty('--d', String(d))
  const old = timers.get(el)
  if (old) clearTimeout(old)
  timers.set(el, setTimeout(() => el.classList.remove('rolling'), 1000))
}

/** Angka bergulir. `from` = teks awal yang langsung digulir ke `text` (mis. `'0'` saat data baru datang). */
export function odometer (text: string, opts?: { from?: string, className?: string }): HTMLElement {
  const el = document.createElement('span')
  el.className = `lc-odo${opts?.className ? ` ${opts.className}` : ''}`
  render(el, opts?.from ?? text, false)
  if (opts?.from !== undefined && opts.from !== text) {
    requestAnimationFrame(() => requestAnimationFrame(() => setOdometer(el, text)))
  }
  return el
}

/** Ganti angkanya; digit yang berubah berguling dari nilai lamanya. */
export function setOdometer (el: HTMLElement, text: string): void {
  if (el.dataset.v === text) return
  render(el, text, !reducedMotion())
}
