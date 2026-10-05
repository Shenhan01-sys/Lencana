/**
 * `fee-ladder.ts` — pemilih label tingkat berat (B159): satu komponen untuk antrean agen penilai (`agent-brain.ts`) dan
 * meja pengesahan (`review-desk.ts`). Sebelumnya tujuh batang berisi teks 10,5 px yang ditulis dua kali.
 *
 * Benda di panggung: tangga tujuh anak tangga. Tinggi batang = bayaran pada label itu, dua lapis —
 *   redup  tarif dasar Agent Owner (sama untuk ketujuh batang), ditandai garis "tarif dasar"
 *   emas   kenaikan di atas dasar (Lencana: 5%/tingkat, paling banyak +30% — `signer/src/pricing.js`)
 * Sumbu tidak dipotong: selisih yang memang kecil tampil kecil, karena kecilnya itulah batas konflik kepentingan
 * (penilai memilih labelnya sendiri dan dibayar menurut label itu).
 * Papan bacaan di bawahnya menulis label, tingkat k dari n, bayaran, dan +% dari dasar; menyorot/memfokus batang
 * memperlihatkan pratinjau, memilih menetapkannya. Panah kiri/kanan (atau atas/bawah), Home, End memilih seperti radio.
 */
// Lencana-B159 status=SELESAI 2026-10-05 —pemilih label tingkat berat bersama: tangga tanpa teks dengan tinggi = bayaran (dasar redup + kenaikan emas, sumbu utuh), papan bacaan label/bayaran/+%/tingkat, pratinjau saat disorot, radio dengan panah. Buktikan ulang: cd web && npx tsc --noEmit && npm run probe, lalu uji peramban T84. JANGAN dibalik/diulang tanpa membuka kembali baris B159 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './fee-ladder.css'
import { h } from '../lib/ui'
import { formatLdc, PAY_TOKEN_SYMBOL } from '../pricing'

type Lang = 'en' | 'id'

const COPY = {
  askGrade: { en: 'How heavy was grading this essay?', id: 'Seberapa berat menilai esai ini?' },
  askReview: { en: 'How heavy was reviewing this judgement?', id: 'Seberapa berat mengesahkan penilaian ini?' },
  note: { en: 'You choose — the label goes into your signature and sets your fee.', id: 'Kamu yang memilih — label masuk ke tanda tanganmu dan menentukan bayaranmu.' },
  aria: { en: 'Difficulty label (sets the fee)', id: 'Label tingkat berat (menentukan bayaran)' },
  light: { en: 'light', id: 'ringan' },
  heavy: { en: 'heavy', id: 'berat' },
  base: { en: 'base tariff', id: 'tarif dasar' },
  empty: { en: 'Pick a level — the fee shows here.', id: 'Pilih tingkat — bayarannya tampil di sini.' },
  level: { en: 'level {k} of {n}', id: 'tingkat {k} dari {n}' },
  atBase: { en: '= base tariff', id: '= tarif dasar' },
  plus: { en: '+{p}% over the base tariff', id: '+{p}% dari tarif dasar' },
  preview: { en: 'preview', id: 'pratinjau' },
} satisfies Record<string, Record<Lang, string>>

const pretty = (l: string) => { const s = l.replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1) }
/** Bagian `a` dari `b` dalam persen, dari bigint tanpa kehilangan presisi untuk angka sebesar tarif token. */
const pctOf = (a: bigint, b: bigint) => (b > 0n ? Number((a * 10000n) / b) / 100 : 0)

export function feeLadder (
  lang: Lang,
  role: 'grade' | 'review',
  labels: readonly string[],
  rateCard: readonly { label: string, amount: string }[],
  onPick: (label: string) => void,
): { el: HTMLElement, disable: () => void } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const num = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'id-ID', { maximumFractionDigits: 1 })
  const n = labels.length
  const amounts = labels.map((l) => { const a = rateCard.find((x) => x.label === l)?.amount; return a ? BigInt(a) : null })
  const known = amounts.filter((x): x is bigint => x !== null)
  const base = known.length ? known.reduce((m, x) => (x < m ? x : m)) : null
  const top = known.length ? known.reduce((m, x) => (x > m ? x : m)) : null
  const basePct = base !== null && top !== null ? pctOf(base, top) : 0
  let chosen = -1

  // --- papan bacaan
  const rName = h('strong', { class: 'fl-name' })
  const rLevel = h('small', { class: 'fl-level' })
  const rFee = h('b', { class: 'fl-fee' })
  const rPlus = h('small', { class: 'fl-plus' })
  const rTag = h('span', { class: 'fl-tag' }, T('preview'))
  const readout = h('div', { class: 'fl-readout empty' },
    h('div', { class: 'fl-readout-l' }, rName, rLevel),
    h('div', { class: 'fl-readout-r' }, rFee, rPlus),
    rTag)
  const show = (k: number, preview: boolean) => {
    if (k < 0) {
      readout.className = 'fl-readout empty'
      rName.textContent = T('empty')
      rLevel.textContent = ''
      rFee.textContent = ''
      rPlus.textContent = ''
      return
    }
    const amt = amounts[k]
    readout.className = `fl-readout${preview ? ' is-preview' : ' is-set'}`
    readout.style.setProperty('--k', String(k))
    rName.textContent = pretty(labels[k])
    rLevel.textContent = T('level').replace('{k}', String(k + 1)).replace('{n}', String(n))
    rFee.textContent = amt !== null ? `${formatLdc(amt)} ${PAY_TOKEN_SYMBOL}` : ''
    rPlus.textContent = amt === null || base === null ? '' : amt === base ? T('atBase') : T('plus').replace('{p}', num.format(pctOf(amt - base, base)))
  }

  // --- tangga
  const rungs = labels.map((l, k) => {
    const amt = amounts[k]
    const height = amt !== null && top !== null ? pctOf(amt, top) : ((k + 1) / n) * 100
    const b = h('button', {
      type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: k === 0 ? '0' : '-1', class: 'fl-rung',
      style: { '--h': `${height}%`, '--b': `${Math.min(basePct, height)}%`, '--k': String(k) },
      'aria-label': `${pretty(l)}${amt !== null ? ` · ${formatLdc(amt)} ${PAY_TOKEN_SYMBOL}` : ''}`,
    }, h('i', { class: 'fl-base' }), h('i', { class: 'fl-extra' })) as HTMLButtonElement
    b.addEventListener('click', () => pick(k))
    b.addEventListener('pointerenter', () => { if (!b.disabled) show(k, k !== chosen) })
    b.addEventListener('pointerleave', () => show(chosen, false))
    b.addEventListener('focus', () => show(k, k !== chosen))
    b.addEventListener('blur', () => show(chosen, false))
    return b
  })
  function pick (k: number): void {
    chosen = k
    rungs.forEach((r, i) => {
      r.classList.toggle('on', i === k)
      r.setAttribute('aria-checked', i === k ? 'true' : 'false')
      r.tabIndex = i === k ? 0 : -1
    })
    show(k, false)
    onPick(labels[k])
  }
  const group = h('div', { class: 'fl-rungs', role: 'radiogroup', 'aria-label': T('aria'), style: { '--b': `${basePct}%`, '--n': String(n) } },
    ...rungs,
    base !== null ? h('span', { class: 'fl-baseline', 'aria-hidden': 'true' }, h('small', null, `${T('base')} ${formatLdc(base)}`)) : null)
  group.addEventListener('keydown', (e) => {
    const at = rungs.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const to = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? Math.min(n - 1, at + 1)
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? Math.max(0, at - 1)
        : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to < 0) return
    e.preventDefault()
    pick(to)
    rungs[to].focus()
  })
  show(-1, false)

  const el = h('div', { class: 'fl' },
    h('div', { class: 'fl-head' },
      h('span', { class: 'fl-ask' }, role === 'grade' ? T('askGrade') : T('askReview')),
      h('small', { class: 'fl-note' }, T('note'))),
    group,
    h('div', { class: 'fl-ends', 'aria-hidden': 'true' }, h('span', null, `← ${T('light')}`), h('span', null, `${T('heavy')} →`)),
    readout)
  return { el, disable: () => { rungs.forEach((r) => { r.disabled = true }) } }
}
