/**
 * `charts.ts` — grafik kecil dashboard (B126), tanpa pustaka grafik: SVG/HTML yang posisi dan ukurannya MENYANDIKAN
 * angka (panjang batang = skor, garis = ambang, busur = lesson selesai). Semua angka datang dari pemanggil — rekaman
 * penerbit dan chain; modul ini tidak menghitung nilai apa pun sendiri.
 *
 * Gaya ada di `pages/dashboard.css` (awalan `ch-`). Gerak masuk: batang/busur tumbuh dari nol dengan kurva berpegas,
 * berurutan; satu pemilik `transform` per elemen.
 */

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
const pct = (n: number): string => `${Math.max(0, Math.min(100, n)).toFixed(2)}%`

/** Jalankan sesudah elemen tergambar sekali — supaya transisi dari keadaan awal berjalan. */
function afterPaint (fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

// Lencana-B150 status=SELESAI 2026-10-05 — isi tidak keluar kartu di layar HP: label ambang grafik Nilai memilih sisi menurut ruang yang ada (di sini), baris jalur Ringkasan memotong judulnya (pages/dash-catalog.css), chip saring katalog memudar di tepi, kartu Trust Center/Penerbit mengikuti lebar layar dan tanda geser matriks Verifier (src/mobile.css). Buktikan ulang: audit 375 px semua rute tiga kursi (T79). JANGAN dibalik/diulang tanpa membuka kembali baris B150 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * B150: label ambang ("Lulus 60 · tercapai") duduk di kanan garis, dan pindah ke kiri hanya bila di kanan tidak muat
 * sementara di kiri lebih lega. Dulu sisinya ditentukan angka ambang saja (> 72) — di layar HP label untuk ambang 60
 * keluar dari kartu (diukur 225–369 px pada kartu 16–344 px).
 */
function fitPassLabel (gauge: Element): void {
  const track = gauge.querySelector('.ch-gauge-track')
  const pass = gauge.querySelector('.ch-pass')
  const label = gauge.querySelector('.ch-pass-label')
  if (!track || !pass || !label) return
  const t = track.getBoundingClientRect()
  const x = pass.getBoundingClientRect().left
  const w = label.getBoundingClientRect().width
  const right = t.right - x - 14
  const left = x - t.left - 14
  pass.classList.toggle('flip', w > right && left > right)
}

let gaugeResizeBound = false
/** Satu pendengar untuk semua timbangan di halaman (bukan satu per grafik — grafik dibuat ulang setiap render). */
function refitOnResize (): void {
  if (gaugeResizeBound || typeof window === 'undefined') return
  gaugeResizeBound = true
  window.addEventListener('resize', () => document.querySelectorAll('.ch-gauge').forEach(fitPassLabel))
}

/** Cincin progres: busur emas = selesai / total. */
export function ring (done: number, total: number, sub: string): HTMLElement {
  const r = 52
  const C = 2 * Math.PI * r
  const ratio = total > 0 ? Math.min(1, done / total) : 0
  const el = document.createElement('div')
  el.className = 'ch-ring'
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', `${done}/${total} ${sub}`)
  el.innerHTML = `<svg viewBox="0 0 128 128" aria-hidden="true">
  <circle cx="64" cy="64" r="${r}" class="ch-ring-track"/>
  <circle cx="64" cy="64" r="${r}" class="ch-ring-arc${ratio === 0 ? ' empty' : ''}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}" transform="rotate(-90 64 64)"/>
</svg>
<div class="ch-ring-center" aria-hidden="true"><b>${done}<small>/${total}</small></b><span>${esc(sub)}</span></div>`
  const arc = el.querySelector<SVGCircleElement>('.ch-ring-arc')
  afterPaint(() => { if (arc) arc.style.strokeDashoffset = String(C * (1 - ratio)) })
  return el
}

const SEAL = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M7.5 15.5 4.6 25l4.6-2.3L12 25.6l1.1-8.6zM16.5 15.5 19.4 25l-4.6-2.3L12 25.6l-1.1-8.6z" fill="currentColor" opacity=".55"/><circle cx="12" cy="10" r="8.2" fill="currentColor"/><path d="m8.4 10.2 2.4 2.4 4.8-4.9" fill="none" stroke="#0c0f13" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'

export type GaugePart = { key: 'kuis' | 'esai' | 'praktik', label: string, weight: number, raw: number | null, earned: number, note: string }

/**
 * Timbangan kelulusan: batang 0–100 berisi poin yang sudah terkumpul per komponen (urut kuis → esai → praktik),
 * lalu bagian berarsir = bobot komponen yang belum punya bukti (masih bisa didapat). Garis tegak = ambang lulus
 * penerbit; segelnya menyala kalau perkiraan nilai akhir sudah melewatinya.
 */
export function passGauge (parts: GaugePart[], passMark: number, read: { value: string, caption: string, verdict: string, verdictCls: string, passLabel: string, reached: boolean, openLabel: string }): HTMLElement {
  let left = 0
  const segs: string[] = []
  parts.forEach((p, i) => {
    if (p.raw === null || p.earned <= 0) return
    segs.push(`<span class="ch-seg ${p.key}" style="left:${pct(left)};width:${pct(p.earned)};transition-delay:${i * 120}ms" title="${esc(`${p.label}: ${p.earned.toFixed(1)}`)}"></span>`)
    left += p.earned
  })
  const open = parts.filter((p) => p.raw === null).reduce((n, p) => n + p.weight, 0)
  if (open > 0) segs.push(`<span class="ch-seg open" style="left:${pct(left)};width:${pct(open)};transition-delay:${parts.length * 120}ms" title="${esc(read.openLabel)}"></span>`)
  const el = document.createElement('div')
  el.className = 'ch-gauge'
  el.innerHTML = `<div class="ch-gauge-head">
  <div class="ch-gauge-read"><b>${esc(read.value)}</b><span>${esc(read.caption)}</span></div>
  <span class="ch-verdict ${read.verdictCls}">${esc(read.verdict)}</span>
</div>
<div class="ch-gauge-track" role="img" aria-label="${esc(`${read.caption}: ${read.value}; ${read.passLabel}`)}">
  ${segs.join('')}
  <span class="ch-pass${read.reached ? ' reached' : ''}${passMark > 72 ? ' flip' : ''}" style="left:${pct(passMark)}"><span class="ch-pass-seal">${SEAL}</span><span class="ch-pass-label">${esc(read.passLabel)}</span></span>
</div>
<div class="ch-gauge-axis" aria-hidden="true"><span style="left:0">0</span><span style="left:50%">50</span><span style="left:100%">100</span></div>
<ul class="ch-legend">${parts.map((p) => `<li class="${p.key}${p.raw === null ? ' none' : ''}"><i aria-hidden="true"></i><strong>${esc(p.label)} ${p.weight}%</strong><span>${esc(p.note)}</span></li>`).join('')}</ul>`
  // Sisi awal (> 72) dipakai sampai tergambar; sesudah itu sisinya diukur dari ruang yang benar-benar ada.
  afterPaint(() => { el.classList.add('in'); fitPassLabel(el) })
  refitOnResize()
  return el
}

export type QuizBar = { short: string, title: string, score: number | null, pass: number }

/** Skor kuis terbaik per lesson kuis (urutan kursus). Garis putus = ambang lulus kuis itu; batang putus-putus = belum dikerjakan. */
export function quizBars (bars: QuizBar[], text: { caption: string, none: string, passWord: string }): HTMLElement {
  const el = document.createElement('figure')
  el.className = 'ch-qb'
  el.style.setProperty('--n', String(Math.max(bars.length, 1)))
  const cols = bars.map((b, i) => {
    const state = b.score === null ? 'none' : b.score >= b.pass ? 'pass' : 'fail'
    const h = b.score === null ? 100 : Math.max(2, b.score)
    const tip = `${b.short} · ${b.title}: ${b.score === null ? text.none : b.score} (${text.passWord} ${b.pass})`
    return `<div class="ch-qb-col ${state}" title="${esc(tip)}">
  <span class="ch-qb-val" style="bottom:calc(${pct(b.score ?? 0)} + 6px)">${b.score === null ? '—' : b.score}</span>
  <span class="ch-qb-bar" style="height:${pct(h)};transition-delay:${i * 90}ms"></span>
  <span class="ch-qb-pass" style="bottom:${pct(b.pass)}"></span>
</div>`
  }).join('')
  el.innerHTML = `<figcaption>${esc(text.caption)}</figcaption>
<div class="ch-qb-plot">
  <div class="ch-qb-grid" aria-hidden="true"><span style="bottom:100%">100</span><span style="bottom:50%">50</span><span style="bottom:0">0</span></div>
  <div class="ch-qb-cols">${cols}</div>
</div>
<div class="ch-qb-x" aria-hidden="true">${bars.map((b) => `<span>${esc(b.short)}</span>`).join('')}</div>
<ol class="ch-qb-names">${bars.map((b) => `<li><b>${esc(b.short)}</b> ${esc(b.title)}</li>`).join('')}</ol>`
  afterPaint(() => el.classList.add('in'))
  return el
}

/** Batang mini untuk sel tabel: isi = skor, tanda tegak = ambang. */
export function miniBar (score: number | null, pass: number | null): HTMLElement {
  const el = document.createElement('span')
  el.className = `ch-mini${score === null ? ' none' : pass !== null && score < pass ? ' fail' : ''}`
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = `<span class="ch-mini-fill" style="width:${pct(score ?? 0)}"></span>${pass === null ? '' : `<span class="ch-mini-pass" style="left:${pct(pass)}"></span>`}`
  return el
}

export type StackPart = { label: string, value: number, cls: string, display: string }

/** Batang tumpuk: bagian-bagian dari satu jumlah (mis. koin terpakai per kelas + saldo tersisa). */
export function stackBar (parts: StackPart[], caption: string): HTMLElement {
  const total = parts.reduce((n, p) => n + p.value, 0)
  let left = 0
  const segs = parts.filter((p) => p.value > 0).map((p, i) => {
    const w = total > 0 ? (p.value / total) * 100 : 0
    const s = `<span class="ch-stack-seg ${p.cls}" style="left:${pct(left)};width:${pct(w)};transition-delay:${i * 110}ms" title="${esc(`${p.label}: ${p.display}`)}"></span>`
    left += w
    return s
  }).join('')
  const el = document.createElement('figure')
  el.className = 'ch-stack'
  el.innerHTML = `<figcaption>${esc(caption)}</figcaption>
<div class="ch-stack-track" role="img" aria-label="${esc(parts.map((p) => `${p.label} ${p.display}`).join('; '))}">${segs}</div>
<ul class="ch-legend">${parts.map((p) => `<li class="${p.cls}"><i aria-hidden="true"></i><strong>${esc(p.display)}</strong><span>${esc(p.label)}</span></li>`).join('')}</ul>`
  afterPaint(() => el.classList.add('in'))
  return el
}
