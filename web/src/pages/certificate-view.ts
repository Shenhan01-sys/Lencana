/**
 * `pages/certificate-view.ts` — penampil lembar sertifikat (B165), desain S3 "Kaca Segitiga" dengan data nyata.
 *
 * Penampil adalah LAPISAN di atas dasbor (anak langsung `<body>`), bukan bagian dari kerangka dasbor: dengan begitu
 * cetak/simpan-PDF cukup menyembunyikan saudara-saudaranya (`body > *:not(.cert-layer)`) tanpa tebakan tata letak, dan
 * lembar tidak ikut tertimpa gaya dasbor. Rute: `#/app/credentials/<hash>`; `renderCredentials` membuka dan menutupnya.
 *
 * Aturan yang diwarisi dari desain: Lencana selalu gelap (tanpa tombol tema); nama yang diketik pengguna tidak
 * diverifikasi, tidak ikut tanda tangan, hanya disimpan di peramban ini dan selalu ditulis lewat `textContent`; status
 * keberlakuan tidak ditulis sebagai klaim di lembar. Logika datanya ada di `../certificate` (diuji `npm run probe`);
 * berkas ini hanya DOM dan diuji di peramban (vault T88).
 */
// Lencana-B165 status=SELESAI 2026-10-05 — penampil lembar sertifikat: lapisan di atas dasbor, dialog alamat/nama sebelum cetak, nama muat otomatis, cetak A4 satu halaman. Buktikan ulang: uji peramban T88. JANGAN dibalik/diulang tanpa membuka kembali baris B165 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './certificate.css'
import { h } from '../lib/ui'
import { credentialDocUrl, loadCertificate } from '../credentials'
import {
  addressGroups, cleanName, componentSummary, dialSvg, effectiveMode, facets, hashBytes, idDate, idTime, loadRecipient,
  logoSvgInner, LOGO_VIEWBOX, mid, NAME_MAX, qrPath, saveRecipient, type CertificateData, type Recipient,
} from '../certificate'
import { verifyLink } from '../lesson-views'

type Lang = 'en' | 'id'

const COPY = {
  layerLabel: { en: 'Certificate', id: 'Sertifikat' },
  back: { en: 'My credentials', id: 'Kredensial saya' },
  sheetTitle: { en: 'Certificate', id: 'Sertifikat' },
  recipientLabel: { en: 'Recipient line on the sheet', id: 'Baris penerima di lembar' },
  modeAddress: { en: 'Wallet address', id: 'Alamat dompet' },
  modeName: { en: 'Name', id: 'Nama' },
  modeAddressHint: { en: 'What the credential is signed to', id: 'Yang tertanda tangan di kredensial' },
  modeNameHint: { en: 'Your own name — not part of the signature', id: 'Nama kamu sendiri — tidak ikut tanda tangan' },
  namePlaceholder: { en: 'Your name', id: 'Nama kamu' },
  nameAria: { en: 'Name shown on the sheet', id: 'Nama yang tampil di lembar' },
  replay: { en: '▶ Replay motion', id: '▶ Ulangi gerak' },
  print: { en: 'Print / save PDF', id: 'Cetak / simpan PDF' },
  building: { en: 'Building the certificate from the public credential document…', id: 'Menyusun sertifikat dari dokumen kredensial publik…' },
  failedTitle: { en: 'The certificate could not be made', id: 'Sertifikat belum bisa dibuat' },
  notMineTitle: { en: 'Not your credential', id: 'Bukan kredensialmu' },
  toVerifier: { en: 'Check it in the verifier', id: 'Periksa di verifier' },
  footNote: {
    en: 'Built from the public credential document. A name you type is not verified, is not part of the signature, and is kept only in this browser.',
    id: 'Disusun dari dokumen kredensial publik. Nama yang kamu ketik tidak diverifikasi, tidak ikut tanda tangan, dan hanya disimpan di peramban ini.',
  },
  publicDoc: { en: 'Public document', id: 'Dokumen publik' },
  verifier: { en: 'Verifier', id: 'Verifier' },
  dlgTitle: { en: 'Print / save PDF', id: 'Cetak / simpan PDF' },
  dlgLegend: { en: 'Recipient line on the sheet', id: 'Baris penerima di lembar' },
  dlgAddress: { en: 'Wallet address (what is signed)', id: 'Alamat dompet (yang tertanda tangan)' },
  dlgName: { en: 'My name', id: 'Nama saya' },
  dlgNote: { en: 'A name is not part of the signature; the short address stays visible on the sheet.', id: 'Nama tidak ikut tanda tangan; alamat tetap tampil kecil di lembar.' },
  dlgNeedName: { en: 'Write your name first, or choose the wallet address.', id: 'Tulis namamu dulu, atau pilih alamat dompet.' },
  dlgCancel: { en: 'Cancel', id: 'Batal' },
  dlgPrint: { en: 'Print', id: 'Cetak' },
} satisfies Record<string, Record<Lang, string>>

/** Kalimat baku di lembar. Klaim hanya boleh dari sini atau dari dokumen yang tertanda tangan; kalimat baru wajib lolos Claims-Cheat-Sheet. */
const TXT = {
  presentedTo: 'Diberikan kepada',
  forPassing: 'atas kelulusan di kelas',
  result: 'Hasil',
  passed: 'LULUS',
  issued: 'Diterbitkan',
  validUntil: 'Berlaku sampai',
  publisher: 'Penerbit',
  signed: 'Ditandatangani',
  signedBy: 'oleh agen penerbit',
  scanToCheck: 'Pindai untuk memeriksa status dan tanda tangannya',
  nameNote: 'Nama tampilan — tidak ikut tanda tangan. Yang tertanda tangan adalah alamat dompet.',
  wallet: 'Alamat dompet peserta',
  credentialId: 'ID kredensial',
} as const

/** Markup lembar (S3): HTML statis + SVG inline. Nilai nyata masuk hanya lewat `textContent`/atribut dari kode di bawah. */
const SHEET_HTML = `
<div class="s3-atmo" aria-hidden="true"></div>
<svg class="s3-fx s3-fx-bl" data-s3-fx="bl" viewBox="0 0 1122 793" aria-hidden="true" focusable="false"></svg>
<svg class="s3-fx s3-fx-tr" data-s3-fx="tr" viewBox="0 0 1122 793" aria-hidden="true" focusable="false"></svg>
<svg class="s3-fx s3-fx-tr s3-fx-g" data-s3-fx="g0" viewBox="0 0 1122 793" fill="#ffffff" style="--gd:2.6s" aria-hidden="true" focusable="false"></svg>
<svg class="s3-fx s3-fx-tr s3-fx-g" data-s3-fx="g1" viewBox="0 0 1122 793" fill="#ffffff" style="--gd:4.9s" aria-hidden="true" focusable="false"></svg>
<svg class="s3-fx s3-fx-tr s3-fx-g" data-s3-fx="g2" viewBox="0 0 1122 793" fill="#ffffff" style="--gd:7.2s" aria-hidden="true" focusable="false"></svg>
<svg class="s3-fx s3-fx-front" data-s3-fx="front" viewBox="0 0 1122 793" aria-hidden="true" focusable="false"></svg>
<i class="s3-shine" aria-hidden="true"></i>

<header class="s3-brand">
  <span class="s3-tile"><svg data-logo></svg><i class="s3-sweep" aria-hidden="true"></i></span>
  <span class="s3-word">Lencana<small>format <span data-f="format"></span></small></span>
</header>
<span class="s3-flag" data-flag hidden></span>

<h1 class="s3-title" data-s3-title></h1>

<section class="s3-who" aria-label="Penerima">
  <p class="s3-eyebrow" data-txt="presentedTo"></p>
  <div class="s3-hero">
    <p class="s3-addr" data-show="alamat"><span class="ox" data-s3-0x></span><span class="g" data-f="addressGroups"></span></p>
    <p class="s3-name" data-show="nama" data-recipient-name></p>
  </div>
  <div class="s3-subrow">
    <p class="s3-cap" data-show="alamat" data-txt="wallet"></p>
    <p class="s3-namesub" data-show="nama"><span class="s3-chip" data-f="addressShort"></span><span class="s3-note" data-txt="nameNote"></span></p>
  </div>
</section>

<section class="s3-what" aria-label="Kelas">
  <p class="s3-eyebrow" data-txt="forPassing"></p>
  <p class="s3-course" data-f="course"></p>
</section>

<section class="s3-result" aria-label="Hasil">
  <div class="s3-medal">
    <div class="s3-medal-par"><div class="s3-medal-float"><div class="s3-medal-in">
      <svg class="s3-ribbons" viewBox="0 0 360 470" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="s3-rbA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b313a"/><stop offset="1" stop-color="#0b0e11"/></linearGradient>
          <linearGradient id="s3-rbB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcd535"/><stop offset=".55" stop-color="#f0b90b"/><stop offset="1" stop-color="#b38600"/></linearGradient>
        </defs>
        <path d="M146 250 L188 256 L148 452 L126 430 L104 446 Z" fill="url(#s3-rbA)"/>
        <path d="M157 258 L164 258 L121 440 L114 440 Z" fill="#f0b90b" fill-opacity=".9"/>
        <path d="M214 250 L172 256 L212 452 L234 430 L256 446 Z" fill="url(#s3-rbB)"/>
        <path d="M200 258 L206 258 L246 440 L240 440 Z" fill="#ffffff" fill-opacity=".34"/>
      </svg>
      <span class="s3-pulse" aria-hidden="true"></span>
      <div class="s3-disc" aria-hidden="true"><i class="s3-flash"></i><i class="s3-sweep"></i></div>
      <svg class="s3-dial" data-s3-dial viewBox="-180 -180 360 360" aria-hidden="true" focusable="false"></svg>
      <div class="s3-read">
        <span class="s3-res" data-txt="result"></span>
        <span class="s3-num"><span data-s3-score></span><small data-s3-of>/100</small></span>
        <span class="s3-pass" data-txt="passed" data-pass hidden></span>
      </div>
    </div></div></div>
  </div>
  <p class="s3-sr" data-s3-scoreline></p>
  <ul class="s3-sr" data-s3-comp></ul>
</section>

<aside class="s3-qr" aria-label="Periksa kredensial">
  <div class="s3-qrplate">
    <svg data-qr class="s3-qrcode"></svg>
    <p class="s3-scan" data-txt="scanToCheck"></p>
    <p class="s3-id"><span data-txt="credentialId"></span><b data-f="hashShort"></b></p>
  </div>
</aside>

<section class="s3-plate s3-glass" aria-label="Rincian penerbitan">
  <i class="s3-sweep" aria-hidden="true"></i>
  <div class="s3-span" aria-hidden="true"><span class="s3-days" data-s3-days></span><i class="s3-rod"></i></div>
  <dl>
    <div class="s3-f s3-f-iss"><dt data-txt="issued"></dt><dd><span data-f="issuedDate"></span><span class="s3-time" data-f="issuedTime"></span></dd></div>
    <div class="s3-f s3-f-val"><dt data-txt="validUntil"></dt><dd data-f="validUntilDate"></dd></div>
    <div class="s3-f s3-f-pub" data-optional data-pub><dt data-txt="publisher"></dt><dd><span data-f="publisher"></span><span class="s3-pill" data-f="publisherNote"></span></dd></div>
    <div class="s3-f s3-f-sig" data-optional data-sig><dt><span data-txt="signed"></span> <span data-txt="signedBy"></span></dt><dd><span data-f="issuerName"></span><span class="s3-proof" data-f="proof"></span></dd></div>
  </dl>
  <div class="s3-foot">
    <p data-f="limit"></p>
    <p><span data-f="demo"></span><span aria-hidden="true"> · </span><span data-f="statusNote"></span></p>
  </div>
</section>
`

type Layer = { el: HTMLElement, teardown: Array<() => void> }
let current: Layer | null = null

/** Menutup penampil bila terbuka: semua pendengar dilepas, lapisan dibuang, gulir halaman dipulihkan. */
export function closeCertificate (): void {
  if (!current) return
  const layer = current
  current = null
  for (const f of layer.teardown) { try { f() } catch { /* pembersihan tidak boleh menghalangi yang lain */ } }
  layer.el.remove()
  document.body.classList.remove('cert-open')
}

/** `#/app/credentials/<hash>` → hash (atau `null`). */
export function certificateHashOf (routeHash: string): string | null {
  const seg = decodeURIComponent(routeHash.replace(/^#\/?/, '').split('?')[0]!.split('/')[2] ?? '')
  return seg || null
}

const stateView = (lang: Lang, title: string, text: string, opts: { bad?: boolean, verifyHash?: string } = {}): HTMLElement => h('div', { class: 'cert-state', role: opts.bad ? 'alert' : 'status', 'aria-live': 'polite' },
  h('h1', null, title),
  h('p', { class: opts.bad ? 'cert-bad' : '' }, text),
  h('div', { class: 'cert-actions' },
    h('a', { class: 'cert-btn cert-btn-pri', href: '#/app/credentials' }, `← ${COPY.back[lang]}`),
    opts.verifyHash ? h('a', { class: 'cert-btn', href: verifyLink(opts.verifyHash) }, COPY.toVerifier[lang]) : null))

/** Membuka penampil untuk `hash` milik `addr`. Dipanggil `renderCredentials` untuk rute `#/app/credentials/<hash>`. */
export function openCertificate (hash: string, addr: string, lang: Lang): void {
  closeCertificate()
  const el = h('div', { class: 'cert-layer', tabindex: '-1', role: 'region', 'aria-label': COPY.layerLabel[lang] })
  const layer: Layer = { el, teardown: [] }
  current = layer
  const onHash = () => { if (!/^#\/app\/credentials\//i.test(window.location.hash)) closeCertificate() }
  window.addEventListener('hashchange', onHash)
  layer.teardown.push(() => window.removeEventListener('hashchange', onHash))
  document.body.appendChild(el)
  document.body.classList.add('cert-open')
  el.appendChild(stateView(lang, COPY.layerLabel[lang], COPY.building[lang]))
  el.focus()
  void loadCertificate(hash, addr).then((r) => {
    if (current !== layer) return // ditutup atau diganti selagi memuat
    if (!r.ok) {
      el.replaceChildren(stateView(lang, r.kind === 'not-mine' ? COPY.notMineTitle[lang] : COPY.failedTitle[lang], r.why, { bad: true, verifyHash: r.kind === 'invalid' ? undefined : hash }))
      return
    }
    mountSheet(layer, r.cert, addr, lang)
  }).catch((e: unknown) => {
    if (current !== layer) return
    el.replaceChildren(stateView(lang, COPY.failedTitle[lang], e instanceof Error ? e.message : String(e), { bad: true }))
  })
}

const bez = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (t: number) => ((ax * t + bx) * t + cx) * t, Y = (t: number) => ((ay * t + by) * t + cy) * t, dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d }
    return Y(Math.min(1, Math.max(0, t)))
  }
}
const easeOut = bez(0.22, 1, 0.36, 1)

function mountSheet (layer: Layer, cert: CertificateData, addr: string, lang: Lang): void {
  const el = layer.el
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const rec: Recipient = loadRecipient(addr)

  // ---- lembar ----
  const sheet = h('article', { class: 'cert-sheet', 'data-mode': 'alamat', 'aria-label': `${T('sheetTitle')} — ${cert.title}` })
  sheet.innerHTML = SHEET_HTML
  const q = <E extends HTMLElement | SVGElement = HTMLElement>(sel: string) => sheet.querySelector<E>(sel)
  const setText = (sel: string, text: string) => { const e = q(sel); if (e) e.textContent = text }
  sheet.querySelectorAll<HTMLElement>('[data-txt]').forEach((e) => { const v = TXT[e.dataset.txt as keyof typeof TXT]; if (v !== undefined) e.textContent = v })
  const f: Record<string, string> = {
    format: cert.format,
    addressGroups: addressGroups(cert.learner),
    addressShort: mid(cert.learner, 6, 4),
    course: cert.title,
    hashShort: mid(cert.hash, 10, 8),
    issuedDate: idDate(cert.issuedAt),
    issuedTime: idTime(cert.issuedAt),
    validUntilDate: idDate(cert.validUntil),
    publisher: cert.publisher ?? '',
    publisherNote: cert.publisherNote ?? '',
    issuerName: cert.issuerAgent,
    proof: cert.proof ?? '',
    limit: cert.limit,
    demo: cert.demo,
    statusNote: cert.statusNote,
  }
  sheet.querySelectorAll<HTMLElement>('[data-f]').forEach((e) => { e.textContent = f[e.dataset.f ?? ''] ?? '' })
  setText('[data-s3-0x]', cert.learner.slice(0, 2))
  setText('[data-s3-days]', `${cert.validDays} hari`)
  const title = q('[data-s3-title]')
  if (title) {
    const t1 = document.createElement('span'), t2 = document.createElement('span')
    t1.className = 't1'; t1.textContent = 'Sertifikat'
    t2.className = 't2'; t2.textContent = 'Kelulusan'
    title.replaceChildren(t1, document.createTextNode(' '), t2)
  }
  const pub = q('[data-pub]'); if (pub) pub.hidden = !cert.publisher
  const sig = q('[data-sig]'); if (sig) sig.hidden = !cert.issuerAgent
  const pass = q('[data-pass]'); if (pass) pass.hidden = !cert.passed
  const ofEl = q('[data-s3-of]'); if (ofEl) ofEl.hidden = cert.score === null
  setText('[data-s3-scoreline]', cert.score === null ? '' : `Nilai akhir ${cert.score} dari 100${cert.passMark !== null ? ` · batas lulus ${cert.passMark}` : ''}`)
  const comp = q('[data-s3-comp]')
  componentSummary(cert.components).forEach((s) => { const li = document.createElement('li'); li.textContent = s; comp?.appendChild(li) })
  const flag = q('[data-flag]')
  if (flag && cert.status.verdict !== 'BERLAKU') { flag.hidden = false; flag.dataset.status = cert.status.verdict; flag.textContent = cert.status.verdict }
  const qrEl = q<SVGElement>('svg[data-qr]')
  if (qrEl) {
    const qr = qrPath(cert.verifyUrl)
    qrEl.setAttribute('viewBox', `0 0 ${qr.modules} ${qr.modules}`)
    qrEl.setAttribute('shape-rendering', 'crispEdges'); qrEl.setAttribute('role', 'img')
    qrEl.setAttribute('aria-label', 'Kode QR menuju halaman verifikasi kredensial ini')
    qrEl.innerHTML = `<path d="${qr.path}" fill="currentColor"/>`
  }
  const logoEl = q<SVGElement>('svg[data-logo]')
  if (logoEl) { logoEl.setAttribute('viewBox', LOGO_VIEWBOX); logoEl.setAttribute('role', 'img'); logoEl.setAttribute('aria-label', 'Lambang Lencana'); logoEl.innerHTML = logoSvgInner() }
  const fa = facets(hashBytes(cert.hash))
  const fx = (k: string, parts: string[]) => { const e = q<SVGElement>(`[data-s3-fx="${k}"]`); if (e) e.innerHTML = parts.join('') }
  fx('tr', fa.tr); fx('bl', fa.bl); fx('front', fa.front); fa.g.forEach((g, i) => fx(`g${i}`, g))
  const dial = q<SVGElement>('[data-s3-dial]'); if (dial) dial.innerHTML = dialSvg(cert.score, cert.passMark, cert.components)

  // ---- skor, gerak ----
  const scoreEl = q('[data-s3-score]')!
  const writeScore = () => { scoreEl.textContent = cert.score === null ? '—' : String(cert.score) }
  writeScore()
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=off/.test(window.location.search)
  let gen = 0
  let timer = 0
  const play = () => {
    sheet.classList.remove('is-playing'); void sheet.offsetWidth
    const g = ++gen
    window.clearTimeout(timer)
    if (reduced()) { writeScore(); return }
    sheet.classList.add('is-playing')
    const to = cert.score
    if (to === null) { writeScore(); return }
    const span = document.createElement('span'); span.textContent = '0'; scoreEl.replaceChildren(span)
    timer = window.setTimeout(() => {
      if (g !== gen) return
      const t0 = performance.now()
      const tick = (now: number) => {
        if (g !== gen) return
        const k = Math.min(1, (now - t0) / 1300)
        span.textContent = String(Math.round(to * easeOut(k)))
        if (k < 1) requestAnimationFrame(tick); else span.textContent = String(to)
      }
      requestAnimationFrame(tick)
    }, 650)
  }
  layer.teardown.push(() => { gen++; window.clearTimeout(timer) })
  const onBefore = () => { gen++; window.clearTimeout(timer); sheet.classList.remove('is-playing'); writeScore() } // cetak = keadaan akhir, angka utuh
  window.addEventListener('beforeprint', onBefore)
  window.addEventListener('afterprint', play)
  layer.teardown.push(() => { window.removeEventListener('beforeprint', onBefore); window.removeEventListener('afterprint', play) })

  // ---- kaki lembar muat tanpa menimpa isian di atasnya: diukur, bukan ditebak (kasus terburuk = batas klaim dua baris +
  // catatan status yang membungkus); 10,5 px → paling kecil 9 px bila perlu ----
  const sheetFoot = q('.s3-foot')!
  const fieldBoxes = ['.s3-f-iss', '.s3-f-val', '.s3-f-pub', '.s3-f-sig'].map((s) => q(s)!)
  const fitFoot = () => {
    sheetFoot.style.fontSize = ''
    const k = sheet.getBoundingClientRect().width / 1122 || 1
    const gap = () => (sheetFoot.getBoundingClientRect().top - Math.max(...fieldBoxes.filter((e) => !e.hidden).map((e) => e.getBoundingClientRect().bottom))) / k
    let s = 10.5
    while (gap() < 6 && s > 9) { s -= 0.5; sheetFoot.style.fontSize = `${s}px` }
  }

  // ---- bilah, penerima ----
  const modeBtn = (mode: 'alamat' | 'nama', label: string, hint: string) => h('button', { type: 'button', 'data-mode-btn': mode, 'aria-pressed': 'false', title: hint }, label)
  const btnAddr = modeBtn('alamat', T('modeAddress'), T('modeAddressHint'))
  const btnName = modeBtn('nama', T('modeName'), T('modeNameHint'))
  const nameInput = h('input', { class: 'cert-in', type: 'text', 'data-name-input': '', maxlength: String(NAME_MAX), autocomplete: 'off', spellcheck: 'false', placeholder: T('namePlaceholder'), 'aria-label': T('nameAria'), hidden: true }) as HTMLInputElement
  const replayBtn = h('button', { class: 'cert-btn', type: 'button', 'data-act': 'replay' }, T('replay'))
  const printBtn = h('button', { class: 'cert-btn cert-btn-pri', type: 'button', 'data-act': 'print', 'aria-haspopup': 'dialog' }, T('print'))
  const bar = h('header', { class: 'cert-bar' },
    h('a', { class: 'cert-back', href: '#/app/credentials' }, `← ${T('back')}`),
    h('div', { class: 'cert-title' }, h('span', null, T('sheetTitle')), h('small', null, cert.title)),
    h('span', { class: 'cert-sp' }),
    h('div', { class: 'cert-grp' }, h('div', { class: 'cert-seg', role: 'group', 'aria-label': T('recipientLabel') }, btnAddr, btnName), nameInput),
    replayBtn, printBtn)

  // ---- nama muat otomatis: ukur (58 px → lantai 34 px satu baris → dua baris, lalu kecilkan) ----
  const nameEl = q('.s3-name')!
  const heroBox = q('.s3-hero')!
  const fitName = () => {
    if (sheet.dataset.mode !== 'nama') return
    const MAX = 58, MIN1 = 34, MIN2 = 20, BW = heroBox.clientWidth, BH = heroBox.clientHeight
    nameEl.classList.remove('is-2'); nameEl.style.fontSize = MAX + 'px'
    const w0 = nameEl.scrollWidth
    if (w0 <= BW) return
    let s = Math.max(MIN1, Math.floor(MAX * BW / w0))
    nameEl.style.fontSize = s + 'px'
    while (nameEl.scrollWidth > BW && s > MIN1) { s -= 1; nameEl.style.fontSize = s + 'px' }
    if (nameEl.scrollWidth <= BW) return
    nameEl.classList.add('is-2')
    // paling banyak dua baris dan muat di kotak; scrollHeight ikut area isi font, jadi ambangnya 2,5 baris
    for (s = MIN1; s > MIN2; s -= 1) {
      nameEl.style.fontSize = s + 'px'
      if (nameEl.scrollHeight <= Math.min(BH + 1, 2.5 * s * 1.04) && nameEl.scrollWidth <= BW) break
    }
  }
  const applyRecipient = () => {
    const name = cleanName(rec.name)
    sheet.dataset.mode = effectiveMode(rec)
    nameEl.textContent = name
    for (const b of [btnAddr, btnName]) b.setAttribute('aria-pressed', String(b.dataset.modeBtn === rec.mode))
    nameInput.hidden = rec.mode !== 'nama'
    if (nameInput.value !== rec.name) nameInput.value = rec.name
    fitName()
  }
  const save = () => saveRecipient(addr, rec)
  btnAddr.addEventListener('click', () => { rec.mode = 'alamat'; applyRecipient(); save() })
  btnName.addEventListener('click', () => { rec.mode = 'nama'; applyRecipient(); save(); if (!cleanName(rec.name)) nameInput.focus() })
  nameInput.addEventListener('input', () => { rec.name = nameInput.value.slice(0, NAME_MAX); applyRecipient(); save() })
  replayBtn.addEventListener('click', play)

  // ---- dialog cetak: pilih alamat atau nama sebelum mencetak ----
  const radioAddr = h('input', { type: 'radio', name: 'cert-who', value: 'alamat' }) as HTMLInputElement
  const radioName = h('input', { type: 'radio', name: 'cert-who', value: 'nama' }) as HTMLInputElement
  const dlgName = h('input', { class: 'cert-dlg-name', type: 'text', maxlength: String(NAME_MAX), autocomplete: 'off', spellcheck: 'false', placeholder: T('namePlaceholder'), 'aria-label': T('dlgName'), 'aria-describedby': 'cert-dlg-n cert-dlg-e' }) as HTMLInputElement
  const dlgErr = h('p', { class: 'cert-dlg-e', id: 'cert-dlg-e', role: 'alert' })
  const cancelBtn = h('button', { type: 'button', class: 'cert-btn', 'data-dlg': 'batal' }, T('dlgCancel'))
  const form = h('form', { class: 'cert-dlg-f', novalidate: true },
    h('h2', { class: 'cert-dlg-t', id: 'cert-dlg-t' }, T('dlgTitle')),
    h('fieldset', null,
      h('legend', null, T('dlgLegend')),
      h('label', { class: 'cert-opt' }, radioAddr, h('span', null, T('dlgAddress'))),
      h('label', { class: 'cert-opt' }, radioName, h('span', null, T('dlgName'))),
      dlgName, dlgErr),
    h('p', { class: 'cert-dlg-n', id: 'cert-dlg-n' }, T('dlgNote')),
    h('div', { class: 'cert-dlg-act' }, cancelBtn, h('button', { type: 'submit', class: 'cert-btn cert-btn-pri', 'data-dlg': 'cetak' }, T('dlgPrint'))))
  const dlg = h('dialog', { class: 'cert-dlg', 'aria-labelledby': 'cert-dlg-t' }, form) as HTMLDialogElement
  const setErr = (msg: string) => { dlgErr.textContent = msg; dlgName.setAttribute('aria-invalid', String(!!msg)) }
  const choice = (): 'alamat' | 'nama' => (radioName.checked ? 'nama' : 'alamat')
  let opener: HTMLElement | null = null
  const openPrint = () => {
    if (typeof dlg.showModal !== 'function') { window.print(); return }
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    radioAddr.checked = rec.mode === 'alamat'; radioName.checked = rec.mode === 'nama'
    dlgName.value = rec.name; setErr('')
    dlg.showModal()
    ;(rec.mode === 'nama' ? dlgName : radioAddr).focus()
  }
  dlgName.addEventListener('input', () => { radioName.checked = true; if (dlgErr.textContent && cleanName(dlgName.value)) setErr('') })
  radioAddr.addEventListener('change', () => { if (radioAddr.checked) setErr('') })
  cancelBtn.addEventListener('click', () => dlg.close())
  dlg.addEventListener('close', () => { const o = opener; opener = null; if (o && o.isConnected) o.focus() })
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return
    const items = Array.from(dlg.querySelectorAll<HTMLElement>('input:not([type="radio"]):not([disabled]), input[type="radio"]:checked, button:not([disabled])'))
    const first = items[0], last = items[items.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const c = choice(), name = cleanName(dlgName.value)
    if (c === 'nama' && !name) { setErr(T('dlgNeedName')); dlgName.focus(); return }
    rec.mode = c
    if (c === 'nama') rec.name = name // memilih alamat: nama terakhir tetap diingat untuk lain kali
    applyRecipient(); save(); dlg.close()
    window.print()
  })
  printBtn.addEventListener('click', openPrint)

  // ---- skala ke layar, miring (hanya penunjuk mouse) ----
  const stage = h('main', { class: 'cert-stage' })
  const tilt = h('div', { class: 'cert-tilt' }, sheet)
  const fitBox = h('div', { class: 'cert-fit' }, h('div', { class: 'cert-scale' }, tilt))
  stage.appendChild(fitBox)
  const fit = () => {
    const w = el.clientWidth - 24, hh = el.clientHeight - bar.offsetHeight - 56
    el.style.setProperty('--cert-scale', Math.max(0.25, Math.min(w / 1122, hh / 793, 1.6)).toFixed(4))
  }
  fitBox.addEventListener('pointermove', (e) => {
    if (reduced() || e.pointerType === 'touch') return
    const r = fitBox.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    tilt.style.setProperty('--ry', ((x - 0.5) * 5).toFixed(2) + 'deg'); tilt.style.setProperty('--rx', ((0.5 - y) * 3.6).toFixed(2) + 'deg')
    sheet.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); sheet.style.setProperty('--my', (y * 100).toFixed(1) + '%')
  })
  fitBox.addEventListener('pointerleave', () => { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); sheet.style.setProperty('--mx', '50%'); sheet.style.setProperty('--my', '50%') })
  window.addEventListener('resize', fit)
  layer.teardown.push(() => window.removeEventListener('resize', fit))
  if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(fit); ro.observe(el); layer.teardown.push(() => ro.disconnect()) }

  // Esc menutup penampil (dialog yang terbuka menutup dirinya sendiri lebih dulu)
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !dlg.open) window.location.hash = '#/app/credentials' }
  document.addEventListener('keydown', onKey)
  layer.teardown.push(() => document.removeEventListener('keydown', onKey))

  const foot = h('p', { class: 'cert-foot' }, `${T('footNote')} `,
    h('a', { href: credentialDocUrl(cert.hash), target: '_blank', rel: 'noopener noreferrer' }, `${T('publicDoc')} ↗`), ' · ',
    h('a', { href: verifyLink(cert.hash) }, `${T('verifier')} ↗`))

  el.replaceChildren(bar, stage, foot, dlg)
  fit()
  applyRecipient()
  const go = () => { if (current !== layer) return; applyRecipient(); fit(); fitFoot(); play() }
  void (document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve()).then(go)
  el.focus()
}
