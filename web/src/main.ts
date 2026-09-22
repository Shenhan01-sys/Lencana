import { verify, type Endpoint, type Report } from './verify'
import { renderEmpty, renderReport } from './render'
import { loadEndpoint, saveEndpoint, PRESETS, isConfigured } from './config'
import { bindLms, renderLms } from './lms'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const inputEl = $<HTMLTextAreaElement>('input')
const goBtn = $<HTMLButtonElement>('go')
const outEl = $<HTMLDivElement>('out')
const statusEl = $<HTMLDivElement>('status')
const bannerEl = $<HTMLDivElement>('banner')

const fields: Record<keyof Endpoint, string> = {
  rpcUrl: 'cfg-rpc',
  resolver: 'cfg-resolver',
  cert: 'cfg-cert',
  bas: 'cfg-bas',
  chainId: 'cfg-chain',
  label: 'cfg-label',
}

let ep: Endpoint = loadEndpoint()

function paintConfig() {
  ;($('cfg-rpc') as HTMLInputElement).value = ep.rpcUrl
  ;($('cfg-resolver') as HTMLInputElement).value = ep.resolver
  ;($('cfg-cert') as HTMLInputElement).value = ep.cert
  ;($('cfg-bas') as HTMLInputElement).value = ep.bas
  ;($('cfg-chain') as HTMLInputElement).value = String(ep.chainId)
  ;($('cfg-label') as HTMLInputElement).value = ep.label
  const sel = $<HTMLSelectElement>('preset')
  const match = PRESETS.find((p) => p.endpoint.chainId === ep.chainId && p.endpoint.rpcUrl === ep.rpcUrl)
  sel.value = match?.id ?? ''
}

function paintBanner() {
  if (isConfigured(ep)) {
    bannerEl.innerHTML = ''
    bannerEl.classList.add('hidden')
    return
  }
  const preset = PRESETS.find((p) => p.endpoint.chainId === ep.chainId)
  bannerEl.classList.remove('hidden')
  bannerEl.innerHTML = `<strong>Lapis on-chain kami belum disiarkan ke chain.</strong>
  47 test lulus di <em>fork</em> chain 97 dan 56 terhadap BAS yang benar-benar ter-deploy,
  tapi address <code>CredentialResolver</code> / <code>SoulboundCert</code> masih kosong, jadi
  halaman ini belum bisa menampilkan hasil nyata.
  ${preset ? `Isi address-nya di panel <em>Konfigurasi pembacaan</em> begitu kontrak selesai di-deploy. Target: <strong>${preset.label}</strong>.` : ''}
  Halaman ini sengaja tidak memakai data contoh: angka palsu yang terlihat bagus lebih buruk daripada halaman yang kosong dan jujur.`
}

function collectFromForm() {
  ep = {
    rpcUrl: ($('cfg-rpc') as HTMLInputElement).value.trim(),
    resolver: ($('cfg-resolver') as HTMLInputElement).value.trim() as Endpoint['resolver'],
    cert: ($('cfg-cert') as HTMLInputElement).value.trim() as Endpoint['cert'],
    bas: ($('cfg-bas') as HTMLInputElement).value.trim() as Endpoint['bas'],
    chainId: Number(($('cfg-chain') as HTMLInputElement).value) || 0,
    label: ($('cfg-label') as HTMLInputElement).value.trim(),
  }
  saveEndpoint(ep)
  paintBanner()
}

async function run() {
  const raw = inputEl.value.trim()
  if (!raw) {
    outEl.innerHTML = renderEmpty()
    return
  }
  goBtn.disabled = true
  statusEl.textContent = 'Membaca chain…'
  const started = performance.now()
  let report: Report
  try {
    report = await verify(raw, ep)
  } catch (e) {
    statusEl.textContent = `Gagal total: ${(e as Error).message}`
    outEl.innerHTML = renderEmpty()
    goBtn.disabled = false
    return
  }
  const ms = Math.round(performance.now() - started)
  const failed = report.readLog.filter((l) => !l.ok).length
  statusEl.textContent = `${report.verdict} · ${report.readLog.length} panggilan chain${failed ? `, ${failed} gagal` : ''} · ${ms} ms · blok ${report.chain?.blockNumber ?? '?'}`
  outEl.innerHTML = renderReport(report)
  goBtn.disabled = false
}

function wire() {
  const sel = $<HTMLSelectElement>('preset')
  for (const p of PRESETS) {
    const o = document.createElement('option')
    o.value = p.id
    o.textContent = p.label
    sel.appendChild(o)
  }
  sel.addEventListener('change', () => {
    const p = PRESETS.find((x) => x.id === sel.value)
    if (!p) return
    ep = { ...ep, ...p.endpoint }
    saveEndpoint(ep)
    paintConfig()
    paintBanner()
    statusEl.textContent = p.note
  })

  for (const id of Object.values(fields)) {
    $(id)?.addEventListener('change', collectFromForm)
  }
  ;($('apply') as HTMLButtonElement).addEventListener('click', () => {
    collectFromForm()
    run()
  })
  goBtn.addEventListener('click', () => run())
  inputEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run()
  })
  ;($('clear') as HTMLButtonElement).addEventListener('click', () => {
    inputEl.value = ''
    outEl.innerHTML = renderEmpty()
    statusEl.textContent = ''
  })
  ;($('share') as HTMLButtonElement).addEventListener('click', () => {
    const u = new URL(location.href)
    u.searchParams.set('q', inputEl.value.trim())
    history.replaceState(null, '', u.toString())
    navigator.clipboard?.writeText(u.toString()).then(
      () => (statusEl.textContent = 'Tautan disalin ke clipboard.'),
      () => (statusEl.textContent = 'Tautan terpasang di address bar — salin manual.'),
    )
  })
  ;($('fill-sample') as HTMLButtonElement).addEventListener('click', () => {
    inputEl.value = '0x' + '11'.repeat(32)
    statusEl.textContent = 'Contoh bentuk masukan. Nilai ini tidak akan dikenali — memang itu jawabannya.'
  })
}

/**
 * Satu `<main id="out">` dipakai dua hal. Keputusan siapa yang memegangnya diambil di sini,
 * bukan di dalam templat: rute hash -> halaman belajar, sisanya -> verifier.
 *
 * Kenapa tidak dua berkas HTML terpisah: halaman verifikasi harus tetap bisa dibuka dengan satu
 * tautan `?q=0x…` tanpa rute apa pun, dan itu alamat yang tercetak di dokumen kredensial serta di
 * README. Memindahkan verifier ke rute baru akan memutus tautan yang sudah kami sebarkan.
 */
function applyView(): boolean {
  const lms = renderLms(outEl)
  document.body.dataset.view = lms ? 'lms' : 'verify'
  document.title = lms ? 'Lencana — belajar' : 'Lencana — verifikasi kredensial'
  return lms
}

function showVerifier(): void {
  const q = new URLSearchParams(location.search).get('q')
  if (q) inputEl.value = q
  outEl.innerHTML = renderEmpty()
  if (q || inputEl.value.trim()) run()
}

function boot(): void {
  wire()
  paintConfig()
  paintBanner()
  bindLms(outEl)
  if (!applyView()) showVerifier()

  addEventListener('hashchange', () => {
    if (!applyView()) showVerifier()
  })
}

boot()
