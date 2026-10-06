/**
 * `admin-detail.ts` — popup detail satu station untuk tab Ringkasan halaman Admin (B172). Dulu bagian dari `admin-pipeline.ts` (pipeline gaya n8n); sejak
 * builder memilih sabuk benda (prototipe FE11) hanya popup-nya yang tersisa. Dialog modal asli (`<dialog>`): Esc menutup, klik di luar menutup, fokus kembali ke
 * benda yang membukanya, tombol Sebelumnya/Berikutnya berpindah antar station tanpa menutup.
 */
import { h } from '../lib/ui'

export type DetailTone = 'gold' | 'green' | 'amber' | 'rose'
export type Detail = {
  id: string, title: string, what: string
  rows: Array<{ label: string, value: string, tone?: DetailTone }>
  actors: string[], actorsLabel: string, sourceLabel: string, source: string
  action?: { label: string, run: () => void }
}

/**
 * @param order    urutan id station
 * @param detailOf isi dialog dari angka terkini
 * @param art      penanda SVG (isi `<svg viewBox="0 0 180 190">`) benda station itu, ditampilkan di kepala dialog
 */
export function openDetailDialog (opts: { id: string, order: string[], detailOf: (id: string) => Detail | null, art: (id: string) => string, labels: { close: string, prev: string, next: string } }): void {
  const opener = document.activeElement as HTMLElement | null
  const dlg = h('dialog', { class: 'adm-dlg ln-dlg', 'aria-labelledby': 'ln-dlg-t' }) as HTMLDialogElement
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
    const art = h('span', { class: 'ln-dlg-art', 'aria-hidden': 'true' })
    art.innerHTML = `<svg viewBox="0 0 180 190" preserveAspectRatio="xMidYMid meet">${opts.art(current)}</svg>`
    dlg.replaceChildren(h('div', { class: 'ln-dlg-f' },
      h('div', { class: 'ln-dlg-head' }, art, h('div', null, h('span', { class: 'ln-dlg-step' }, `${i + 1} / ${opts.order.length}`), h('h2', { id: 'ln-dlg-t' }, d.title))),
      h('p', { class: 'ln-dlg-what' }, d.what),
      h('dl', { class: 'ln-dlg-rows' }, ...d.rows.flatMap((r) => [h('dt', null, r.label), h('dd', { class: r.tone ?? '' }, r.value)])),
      h('div', { class: 'ln-dlg-actors' }, h('span', null, d.actorsLabel), ...d.actors.map((a) => h('b', null, a))),
      h('p', { class: 'ln-dlg-src' }, h('b', null, `${d.sourceLabel}: `), d.source),
      d.action ? h('button', { type: 'button', class: 'adm-btn pri ln-dlg-act', onClick: () => { dlg.close(); d.action!.run() } }, d.action.label) : null,
      h('div', { class: 'ln-dlg-nav' }, prevB, nextB, closeB)))
  }
  render()
  dlg.addEventListener('close', () => { dlg.remove(); opener?.focus?.() })
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close() })
  document.body.appendChild(dlg)
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
  dlg.querySelector<HTMLElement>('[data-dlg-focus]')?.focus()
}
