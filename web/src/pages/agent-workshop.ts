/**
 * `agent-workshop.ts` — bengkel agen di dasbor Agent Owner (B132, D68): agen sebagai robot penilai yang dirakit pemiliknya.
 *
 * Panggung (doktrin FE builder: wakili, jangan deskripsikan) — data agen dibaca dari bentuknya, bukan dari kartu:
 *   mata menyala      dompet agen terverifikasi (redup = kosong sesudah NFT berpindah, EIP-8004)
 *   lampu antena      hijau = bisa disewa, merah = belum (alasannya di bawah panggung)
 *   pelat dada        tarif dasar dari registry
 *   tumpukan kertas   penilaian + pengesahan yang pernah dikerjakan (tinggi = jumlah)
 *   toples            bayaran lunas (isi naik sebanding dengan bagian lunas dari seluruh tagihan)
 *   papan nama meja   kursus tempat agen disewa / ditunjuk
 * Panel bengkel: ‹ › per suku cadang, warna, nama; "Simpan rupa ke BNB Chain" = `setAgentURI` dari dompet pemilik.
 * Akun Agent Owner tanpa agen merakit robot dulu lalu mendaftarkannya sendiri (`register()` → klaim → rupa → tarif).
 */
// Lencana-B132 status=TERBUKA 2026-10-03 — bengkel agen: panggung robot dengan data agen di bentuknya, panel rakit (kepala/mata/badan/alat/warna/nama) yang disimpan ke berkas registrasi ERC-8004 dari dompet pemilik, dan pendaftaran agen pertama oleh akun Agent Owner sendiri. Buktikan ulang: cd signer && npm run verify:studio, lalu uji peramban T61. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './agent-workshop.css'
import { h } from '../lib/ui'
import { steps } from '../lib/loading'
import { findCourse } from '../courses/index'
import { ROBOT_PARTS, DEFAULT_AVATAR, NAME_MAX, robotSvg, colorHex, type Avatar, type RobotPart } from '../robot'
import { saveAgentLook, registerOwnAgent, type OwnerAgent, type OwnerOverview } from '../learning'
import { formatLdc, PAY_TOKEN_ADDRESS, PAY_TOKEN_SYMBOL } from '../pricing'

type Lang = 'en' | 'id'
const SCAN = 'https://testnet.bscscan.com'

const COPY = {
  workshop: { en: 'Agent workshop', id: 'Bengkel agen' },
  name: { en: 'Name', id: 'Nama' },
  head: { en: 'Head', id: 'Kepala' },
  eyes: { en: 'Eyes', id: 'Mata' },
  body: { en: 'Body', id: 'Badan' },
  tool: { en: 'Tool', id: 'Alat' },
  color: { en: 'Colour', id: 'Warna' },
  save: { en: 'Save look to BNB Chain', id: 'Simpan rupa ke BNB Chain' },
  saveSub: { en: 'Written into the agent’s ERC-8004 registration file from your wallet — anyone reading the registry sees this robot.', id: 'Ditulis ke berkas registrasi ERC-8004 agen dari dompetmu — siapa pun yang membaca registry melihat robot ini.' },
  s1: { en: 'Read the registration template', id: 'Baca templat registrasi' },
  s2: { en: 'Send setAgentURI from your wallet', id: 'Kirim setAgentURI dari dompetmu' },
  s3: { en: 'Wait for the chain', id: 'Menunggu chain' },
  saved: { en: 'Saved on chain.', id: 'Tersimpan di chain.' },
  unsaved: { en: 'not saved yet', id: 'belum disimpan' },
  noTemplate: { en: 'This agent was not minted or registered through Lencana — its registration file is not ours to rewrite.', id: 'Agen ini tidak dicetak atau didaftarkan lewat Lencana — berkas registrasinya bukan milik kami untuk ditulis ulang.' },
  legendEyes: { en: 'eyes lit = agent wallet verified', id: 'mata menyala = dompet agen terverifikasi' },
  legendBulb: { en: 'antenna = can be hired', id: 'lampu antena = bisa disewa' },
  legendChest: { en: 'chest = base tariff', id: 'dada = tarif dasar' },
  legendPapers: { en: 'papers = gradings + reviews', id: 'kertas = penilaian + pengesahan' },
  legendJar: { en: 'jar = fees paid', id: 'toples = bayaran lunas' },
  legendDesk: { en: 'desk plates = where it works', id: 'papan meja = tempatnya bekerja' },
  graded: { en: 'graded', id: 'dinilai' },
  paid: { en: 'paid', id: 'lunas' },
  idle: { en: 'not hired yet', id: 'belum disewa' },
  firstTitle: { en: 'Build your first grading agent', id: 'Rakit agen penilai pertamamu' },
  firstSub: {
    en: 'Assemble it, name it, set its base tariff — then register it on BNB Chain from your own wallet. Its agent wallet is your wallet from the first block; test gas comes from the platform if you run low.',
    id: 'Rakit, beri nama, tetapkan tarif dasarnya — lalu daftarkan di BNB Chain dari dompetmu sendiri. Dompet agennya langsung dompetmu sejak blok pertama; gas uji dari platform bila menipis.',
  },
  tariff: { en: `Base tariff (${PAY_TOKEN_SYMBOL} per grading)`, id: `Tarif dasar (${PAY_TOKEN_SYMBOL} per penilaian)` },
  register: { en: 'Assemble & register on BNB Chain', id: 'Rakit & daftarkan di BNB Chain' },
  r0: { en: 'Check gas (test gas if low)', id: 'Periksa gas (gas uji bila menipis)' },
  r1: { en: 'register() from your wallet', id: 'register() dari dompetmu' },
  r2: { en: 'Platform reads the receipt', id: 'Platform membaca struknya' },
  r3: { en: 'Save the look (setAgentURI)', id: 'Simpan rupa (setAgentURI)' },
  r4: { en: 'Set the base tariff (setMetadata)', id: 'Tetapkan tarif dasar (setMetadata)' },
  working: { en: 'Signing and sending…', id: 'Menandatangani dan mengirim…' },
  registered: { en: 'Registered as agent', id: 'Terdaftar sebagai agen' },
  badTariff: { en: 'Tariff must be a positive amount with at most 6 decimals.', id: 'Tarif harus angka positif, paling banyak 6 desimal.' },
  prev: { en: 'previous', id: 'sebelumnya' },
  next: { en: 'next', id: 'berikutnya' },
} satisfies Record<string, Record<Lang, string>>

const PART_LABEL: Record<RobotPart, keyof typeof COPY> = { head: 'head', eyes: 'eyes', body: 'body', tool: 'tool', color: 'color' }

/** SVG dalam elemen (bukan innerHTML pada elemen HTML biasa) supaya kelas animasi berlaku pada simpul SVG. */
function svgEl (markup: string, cls: string, viewBox: string): SVGSVGElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" role="img">${markup}</svg>`
  return wrap.firstElementChild as SVGSVGElement
}

/** Panel rakit: ‹ › per suku cadang, warna, nama. `onChange` dipanggil dengan rupa + nama terbaru. */
function studioPanel (lang: Lang, start: Avatar, startName: string, onChange: (a: Avatar, name: string) => void, opts: { disabled?: boolean } = {}): { el: HTMLElement, value: () => { avatar: Avatar, name: string } } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  let avatar: Avatar = { ...start }
  let name = startName
  const rows: HTMLElement[] = []
  const emit = () => onChange(avatar, name)
  for (const part of ['head', 'eyes', 'body', 'tool'] as const) {
    const options = ROBOT_PARTS[part] as readonly string[]
    const val = h('span', { class: 'ws-val' }, avatar[part])
    const step = (d: number) => {
      const i = (options.indexOf(avatar[part]) + d + options.length) % options.length
      avatar = { ...avatar, [part]: options[i] } as Avatar
      val.textContent = avatar[part]
      val.classList.remove('pop'); void val.offsetWidth; val.classList.add('pop')
      emit()
    }
    const prev = h('button', { type: 'button', class: 'ws-arrow', 'aria-label': `${T(PART_LABEL[part])} ${T('prev')}`, onClick: () => step(-1) }, '‹') as HTMLButtonElement
    const next = h('button', { type: 'button', class: 'ws-arrow', 'aria-label': `${T(PART_LABEL[part])} ${T('next')}`, onClick: () => step(1) }, '›') as HTMLButtonElement
    prev.disabled = next.disabled = Boolean(opts.disabled)
    rows.push(h('div', { class: 'ws-row' }, h('span', { class: 'ws-label' }, T(PART_LABEL[part])), prev, val, next))
  }
  const swatches = h('div', { class: 'ws-swatches', role: 'radiogroup', 'aria-label': T('color') },
    ...ROBOT_PARTS.color.map((c) => {
      const b = h('button', { type: 'button', class: `ws-swatch${avatar.color === c ? ' on' : ''}`, style: { background: colorHex(c) }, title: c, role: 'radio', 'aria-checked': avatar.color === c ? 'true' : 'false' }) as HTMLButtonElement
      b.disabled = Boolean(opts.disabled)
      b.addEventListener('click', () => {
        avatar = { ...avatar, color: c }
        swatches.querySelectorAll('.ws-swatch').forEach((s) => { s.classList.remove('on'); s.setAttribute('aria-checked', 'false') })
        b.classList.add('on'); b.setAttribute('aria-checked', 'true')
        emit()
      })
      return b
    }))
  const nameIn = h('input', { type: 'text', class: 'ws-name', maxlength: NAME_MAX, 'aria-label': T('name') }) as HTMLInputElement
  nameIn.value = name
  nameIn.disabled = Boolean(opts.disabled)
  nameIn.addEventListener('input', () => { name = nameIn.value; emit() })
  const el = h('div', { class: 'ws-panel' },
    h('label', { class: 'ws-field' }, h('span', { class: 'ws-label' }, T('name')), nameIn),
    ...rows,
    h('div', { class: 'ws-row' }, h('span', { class: 'ws-label' }, T('color')), swatches))
  return { el, value: () => ({ avatar, name }) }
}

/** Panggung satu agen: robot di balik meja, kertas, toples, papan nama — semua dari data agen. */
function stage (lang: Lang, o: OwnerOverview, a: OwnerAgent, avatar: Avatar): { el: HTMLElement, setAvatar: (x: Avatar) => void } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const tariff = a.tariff ? formatLdc(BigInt(a.tariff.amount)) : '—'
  const live = { eyesOn: a.walletState !== 'unset', bulb: (a.hireable ? 'ok' : 'bad') as 'ok' | 'bad', chest: tariff }
  const n = a.activity.graded + a.activity.reviews
  const sheets = Math.min(n, 14)
  const paid = BigInt(a.charges.paid.amount)
  const due = BigInt(a.charges.due.amount)
  const fill = paid + due > 0n ? Number((paid * 100n) / (paid + due)) : 0
  const places = [...new Set([...a.hires.map((x) => x.courseId), ...a.appointments.map((x) => x.courseId)])]
  const plate = (id: string, i: number) => {
    const title = (findCourse(id)?.title ?? id).slice(0, 22)
    const x = 40 + i * 190
    return `<g class="ws-plate" style="--i:${i}"><rect x="${x}" y="246" width="176" height="26" rx="5" fill="#1d2129" stroke="#3a4250"/><text x="${x + 88}" y="263" text-anchor="middle" font-size="11" font-family="inherit" fill="#e9e6df">${escapeXml(title)}</text></g>`
  }
  const papers = Array.from({ length: sheets }, (_, i) => `<rect class="ws-sheet" style="--i:${i}" x="${388 + (i % 2) * 3}" y="${222 - i * 5}" width="66" height="9" rx="1.5" fill="#f4f1ea" stroke="#c9c3b6"/>`).join('')
  const jarH = 70
  const jar = `<g class="ws-jar"><rect x="500" y="${232 - jarH}" width="64" height="${jarH}" rx="10" fill="rgba(255,255,255,0.05)" stroke="#9aa1ad" stroke-width="2"/>`
    + `<rect class="ws-jar-fill" x="503" y="${232 - (jarH - 6) * fill / 100 - 3}" width="58" height="${(jarH - 6) * fill / 100}" rx="7" fill="#f0b90b" style="--f:${fill}"/>`
    + `<rect x="506" y="${226 - jarH}" width="52" height="8" rx="3" fill="#9aa1ad"/></g>`
  const desk = '<rect x="20" y="232" width="600" height="14" rx="4" fill="#2a2f38"/><rect x="20" y="244" width="600" height="34" fill="#20242c"/>'
  const labels = `<text x="421" y="${208 - sheets * 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#f4f1ea">${n} ${T('graded')}</text>`
    + `<text x="532" y="${222 - jarH}" text-anchor="middle" font-size="12" font-weight="700" fill="#f0b90b">${formatLdc(paid)} ${PAY_TOKEN_SYMBOL}</text>`
  // Posisi (atribut) dan gerak napas (CSS transform) di dua elemen berbeda — satu pemilik transform per elemen.
  const robotG = (av: Avatar) => `<g transform="translate(160 0)"><g class="ws-bob">${robotSvg(av, { live })}</g></g>`
  const markup = (av: Avatar) => `${desk}${robotG(av)}${papers}${jar}${labels}${places.length ? places.slice(0, 3).map(plate).join('') : `<text x="320" y="264" text-anchor="middle" font-size="12" fill="#848e9c">${T('idle')}</text>`}`
  const holder = h('div', { class: 'ws-stage' })
  const draw = (av: Avatar) => holder.replaceChildren(svgEl(markup(av), 'ws-svg', '0 0 640 290'))
  draw(avatar)
  const legend = h('ul', { class: 'ws-legend' },
    h('li', { class: live.eyesOn ? 'on' : '' }, T('legendEyes')), h('li', { class: a.hireable ? 'on' : 'bad' }, T('legendBulb')),
    h('li', null, T('legendChest')), h('li', null, T('legendPapers')), h('li', null, T('legendJar')), h('li', null, T('legendDesk')))
  void o
  return { el: h('div', { class: 'ws-stage-wrap' }, holder, legend), setAvatar: draw }
}

/** Bengkel untuk agen yang sudah ada: panggung + panel rakit + simpan ke chain. */
export function agentWorkshop (lang: Lang, o: OwnerOverview, a: OwnerAgent, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const start = a.avatar ?? DEFAULT_AVATAR
  const role = a.registrationRole === 'grader-self' ? 'grader-self' : a.registrationRole === 'grader-account' ? 'grader-account' : null
  const st = stage(lang, o, a, start)
  const progress = steps([T('s1'), T('s2'), T('s3')])
  progress.hidden = true
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const dirty = h('span', { class: 'ws-dirty', hidden: true }, T('unsaved'))
  const save = h('button', { type: 'button', class: 'app-btn primary' }, T('save')) as HTMLButtonElement
  const panel = studioPanel(lang, start, a.name ?? '', (av) => { st.setAvatar(av); dirty.hidden = false }, { disabled: !role })
  save.disabled = !role
  save.addEventListener('click', () => {
    if (!role) return
    const v = panel.value()
    save.disabled = true
    progress.hidden = false
    status.className = 'seat-apply-status'
    status.textContent = T('working')
    void saveAgentLook(a.agentId, role, v.name, v.avatar, (k) => progress.set(k)).then((r) => {
      save.disabled = false
      if (!r.ok) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      progress.set(2)
      dirty.hidden = true
      status.className = 'seat-apply-status ok'
      status.replaceChildren(T('saved'), ' ', r.tx ? h('a', { href: `${SCAN}/tx/${r.tx}`, target: '_blank', rel: 'noopener noreferrer' }, `${r.tx.slice(0, 10)}… ↗`) : '')
      setTimeout(reload, 1800)
    })
  })
  return h('section', { class: 'ws lc-enter' },
    h('header', { class: 'ws-head' }, h('span', { class: 'app-kicker' }, `${T('workshop')} · #${a.agentId}`), h('h2', null, a.name ?? '—'), dirty),
    h('div', { class: 'ws-body' },
      st.el,
      h('div', { class: 'ws-side' },
        panel.el,
        role ? h('p', { class: 'app-muted ws-note' }, T('saveSub')) : h('p', { class: 'app-muted ws-note' }, T('noTemplate')),
        h('div', { class: 'ws-actions' }, save), progress, status)))
}

/** Akun Agent Owner tanpa agen: rakit robot, tetapkan tarif, daftarkan sendiri dari dompetnya. */
export function firstAgentWorkshop (lang: Lang, onDone: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  let avatar: Avatar = { ...DEFAULT_AVATAR }
  const preview = h('div', { class: 'ws-stage ws-first' })
  const paint = (av: Avatar) => preview.replaceChildren(svgEl(`<g transform="translate(20 0)"><g class="ws-bob">${robotSvg(av, { live: { eyesOn: true, bulb: 'idle' } })}</g></g>`, 'ws-svg', '0 0 240 250'))
  paint(avatar)
  const panel = studioPanel(lang, avatar, '', (av) => { avatar = av; paint(av) })
  const tariff = h('input', { type: 'text', class: 'ws-name', inputmode: 'decimal', value: '0.002', 'aria-label': T('tariff') }) as HTMLInputElement
  const progress = steps([T('r0'), T('r1'), T('r2'), T('r3'), T('r4')])
  progress.hidden = true
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const go = h('button', { type: 'button', class: 'app-btn primary' }, T('register')) as HTMLButtonElement
  go.addEventListener('click', () => {
    const v = tariff.value.trim().replace(',', '.')
    if (!/^\d+(\.\d{1,6})?$/.test(v) || Number(v) <= 0) { status.className = 'seat-apply-status bad'; status.textContent = T('badTariff'); return }
    const [w, f = ''] = v.split('.')
    const units = BigInt(w) * 1_000_000n + BigInt((f + '000000').slice(0, 6))
    go.disabled = true
    progress.hidden = false
    status.className = 'seat-apply-status'
    status.textContent = T('working')
    void registerOwnAgent(panel.value().name, panel.value().avatar, { token: PAY_TOKEN_ADDRESS, amount: units }, (k) => progress.set(k)).then((r) => {
      if (!r.ok) { go.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = `${r.agentId ? `#${r.agentId} · ` : ''}${r.why ?? ''}`; return }
      progress.set(4)
      status.className = 'seat-apply-status ok'
      status.textContent = `${T('registered')} #${r.agentId}`
      setTimeout(onDone, 1800)
    })
  })
  return h('section', { class: 'ws ws-new lc-enter' },
    h('header', { class: 'ws-head' }, h('span', { class: 'app-kicker' }, T('workshop')), h('h2', null, T('firstTitle')), h('p', { class: 'app-muted' }, T('firstSub'))),
    h('div', { class: 'ws-body' },
      preview,
      h('div', { class: 'ws-side' },
        panel.el,
        h('label', { class: 'ws-field' }, h('span', { class: 'ws-label' }, T('tariff')), tariff),
        h('div', { class: 'ws-actions' }, go), progress, status)))
}

function escapeXml (s: string): string {
  return s.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch] ?? ch)
}
