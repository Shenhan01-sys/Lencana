import { verify, type Endpoint, type Report } from './verify'
import { renderEmpty, renderReport } from './render'
import { loadEndpoint, saveEndpoint, PRESETS, isConfigured } from './config'
import { getSavedLanguage, saveLanguage, DICTIONARIES, type Lang } from './i18n'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null
const setText = (id: string, text: string) => {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

const inputEl = document.getElementById('input') as HTMLTextAreaElement
const goBtn = document.getElementById('go') as HTMLButtonElement
const outEl = document.getElementById('out') as HTMLDivElement
const statusEl = document.getElementById('status') as HTMLDivElement
const bannerEl = document.getElementById('banner') as HTMLDivElement

let currentLang: Lang = getSavedLanguage()
let lastReport: Report | null = null
let ep: Endpoint = loadEndpoint()

// Constant demo hashes for fast interactive testing in UI
const SAMPLE_HASHES = {
  valid: '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa',
  revoked: '0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2',
  delisted: '0x4d0ffdf32d174796a2c8bbe38e739c26ec6e205e6cdf48409f7240d28552df1c',
  format: '0x' + '11'.repeat(32),
}

function updateStaticText() {
  const dict = DICTIONARIES[currentLang]

  // Navbar
  setText('nav-courses', dict.nav.courses)
  setText('nav-how', dict.nav.howItWorks)
  setText('nav-verifier', dict.nav.verifier)
  setText('nav-tech', dict.nav.techEdge)

  // Hero Section
  setText('hero-eyebrow', dict.hero.eyebrow)
  setText('hero-title-1', dict.hero.titleLine1)
  setText('hero-title-2', dict.hero.titleLine2)
  setText('hero-subtitle', dict.hero.subtitle)
  setText('hero-btn-explore-text', dict.hero.btnExplore)
  setText('hero-btn-verify-text', dict.hero.btnVerify)
  setText('stat-1-val', dict.hero.statCourses)
  setText('stat-1-lbl', dict.hero.statCoursesLabel)
  setText('stat-2-val', dict.hero.statVerification)
  setText('stat-2-lbl', dict.hero.statVerificationLabel)
  setText('stat-3-val', dict.hero.statStandard)
  setText('stat-3-lbl', dict.hero.statStandardLabel)

  // The Learning Loop
  setText('loop-title', dict.learningLoop.sectionTitle)
  setText('loop-sub', dict.learningLoop.sectionSub)
  setText('step-1-title', dict.learningLoop.step1Title)
  setText('step-1-desc', dict.learningLoop.step1Desc)
  setText('step-2-title', dict.learningLoop.step2Title)
  setText('step-2-desc', dict.learningLoop.step2Desc)
  setText('step-3-title', dict.learningLoop.step3Title)
  setText('step-3-desc', dict.learningLoop.step3Desc)

  // Featured Micro-Courses
  setText('courses-title', dict.coursesSection.sectionTitle)
  setText('courses-sub', dict.coursesSection.sectionSub)
  setText('c1-badge-lvl', dict.coursesSection.badgeLevelBeginner)
  setText('c1-badge-sbt', dict.coursesSection.badgeSoulbound)
  setText('c1-title', dict.coursesSection.course1Title)
  setText('c1-desc', dict.coursesSection.course1Desc)
  setText('c1-rubric', dict.coursesSection.course1Rubric)
  setText('c1-agent', `${dict.coursesSection.courseIssuerAgent}: Agent-Demo`)
  setText('btn-enroll-c1', dict.coursesSection.btnEnroll)
  setText('c2-badge-lvl', dict.coursesSection.badgeLevelAdvanced)
  setText('c2-badge-prereq', dict.coursesSection.badgePrereqRequired)
  setText('c2-title', dict.coursesSection.course2Title)
  setText('c2-desc', dict.coursesSection.course2Desc)
  setText('c2-rubric', dict.coursesSection.course2Rubric)
  setText('c2-agent', `${dict.coursesSection.courseIssuerAgent}: Agent-Security`)
  setText('btn-enroll-c2', dict.coursesSection.btnEnroll)

  // Verifier Section & Input Card
  setText('verifier-title', dict.inputSection.sectionTitle)
  setText('verifier-sub', dict.inputSection.sectionSub)
  setText('lbl-input', dict.inputSection.label)
  setText('input-hint', currentLang === 'en' ? 'credentialHash, attestation UID, tokenId, or address' : 'credentialHash, UID atestasi, tokenId, atau address')
  if (inputEl) inputEl.placeholder = dict.inputSection.placeholder
  setText('btn-go-text', dict.inputSection.btnVerify)
  setText('clear', dict.inputSection.btnClear)
  setText('share', dict.inputSection.btnShare)

  // Sample Buttons
  setText('sample-label', currentLang === 'en' ? 'Quick Samples:' : 'Contoh Cepat:')
  setText('sample-valid', dict.inputSection.sampleValid)
  setText('sample-revoked', dict.inputSection.sampleRevoked)
  setText('sample-delisted', dict.inputSection.sampleDelisted)
  setText('fill-sample', dict.inputSection.btnSample)

  // Config Drawer
  setText('cfg-summary', dict.configSection.summary)
  setText('lbl-preset', dict.configSection.presetLabel)
  setText('lbl-rpc', dict.configSection.rpcUrlLabel)
  setText('lbl-resolver', dict.configSection.resolverLabel)
  setText('lbl-cert', dict.configSection.certLabel)
  setText('lbl-bas', dict.configSection.basLabel)
  setText('lbl-chain', dict.configSection.chainIdLabel)
  setText('lbl-label', dict.configSection.displayNameLabel)
  setText('apply', dict.configSection.btnApply)
  setText('cfg-note', dict.configSection.note)

  // Bento Section (Why Lencana)
  setText('bento-title', dict.bentoSection.sectionTitle)
  setText('bento-sub', dict.bentoSection.sectionSub)
  setText('bento-1-title', dict.bentoSection.card1Title)
  setText('bento-1-desc', dict.bentoSection.card1Desc)
  setText('bento-2-title', dict.bentoSection.card2Title)
  setText('bento-2-desc', dict.bentoSection.card2Desc)
  setText('bento-3-title', dict.bentoSection.card3Title)
  setText('bento-3-desc', dict.bentoSection.card3Desc)
  setText('bento-4-title', dict.bentoSection.card4Title)
  setText('bento-4-desc', dict.bentoSection.card4Desc)

  // Footer & Brand Sub
  setText('brand-sub', `— ${dict.tagline}`)
  setText('ui-footer', dict.footer)

  // Language buttons state
  const btnEn = $('lang-en')
  const btnId = $('lang-id')
  if (btnEn) {
    btnEn.classList.toggle('active', currentLang === 'en')
    btnEn.setAttribute('aria-pressed', String(currentLang === 'en'))
  }
  if (btnId) {
    btnId.classList.toggle('active', currentLang === 'id')
    btnId.setAttribute('aria-pressed', String(currentLang === 'id'))
  }
}

function setLanguage(lang: Lang) {
  currentLang = lang
  saveLanguage(lang)
  updateStaticText()
  paintBanner()
  if (lastReport) {
    outEl.innerHTML = renderReport(lastReport, currentLang)
  } else {
    outEl.innerHTML = renderEmpty(currentLang)
  }
}

function paintConfig() {
  const rpcInput = $('cfg-rpc') as HTMLInputElement | null
  const resInput = $('cfg-resolver') as HTMLInputElement | null
  const certInput = $('cfg-cert') as HTMLInputElement | null
  const basInput = $('cfg-bas') as HTMLInputElement | null
  const chainInput = $('cfg-chain') as HTMLInputElement | null
  const labelInput = $('cfg-label') as HTMLInputElement | null

  if (rpcInput) rpcInput.value = ep.rpcUrl
  if (resInput) resInput.value = ep.resolver
  if (certInput) certInput.value = ep.cert
  if (basInput) basInput.value = ep.bas
  if (chainInput) chainInput.value = String(ep.chainId)
  if (labelInput) labelInput.value = ep.label

  const sel = $<HTMLSelectElement>('preset')
  if (sel) {
    const match = PRESETS.find((p) => p.endpoint.chainId === ep.chainId && p.endpoint.rpcUrl === ep.rpcUrl)
    sel.value = match?.id ?? ''
  }

  // Update navbar network badge
  setText('badge-name', ep.label || `Chain ${ep.chainId}`)
}

function paintBanner() {
  const dict = DICTIONARIES[currentLang]
  if (isConfigured(ep)) {
    bannerEl.innerHTML = ''
    bannerEl.classList.add('hidden')
    return
  }
  const preset = PRESETS.find((p) => p.endpoint.chainId === ep.chainId)
  bannerEl.classList.remove('hidden')
  bannerEl.innerHTML = `<strong>${dict.bannerNotDeployed.title}</strong>
  <p>${dict.bannerNotDeployed.body}</p>
  <p>${preset ? `${dict.bannerNotDeployed.hint} (Target: <strong>${preset.label}</strong>)` : ''}</p>
  <p class="config-note">${dict.bannerNotDeployed.honestNote}</p>`
}

function collectFromForm() {
  const rpc = ($('cfg-rpc') as HTMLInputElement)?.value.trim() ?? ep.rpcUrl
  const resolver = (($('cfg-resolver') as HTMLInputElement)?.value.trim() as Endpoint['resolver']) ?? ep.resolver
  const cert = (($('cfg-cert') as HTMLInputElement)?.value.trim() as Endpoint['cert']) ?? ep.cert
  const bas = (($('cfg-bas') as HTMLInputElement)?.value.trim() as Endpoint['bas']) ?? ep.bas
  const chainId = Number(($('cfg-chain') as HTMLInputElement)?.value) || ep.chainId
  const label = ($('cfg-label') as HTMLInputElement)?.value.trim() ?? ep.label

  ep = { rpcUrl: rpc, resolver, cert, bas, chainId, label }
  saveEndpoint(ep)
  paintBanner()
  setText('badge-name', ep.label || `Chain ${ep.chainId}`)
}

async function run() {
  const raw = inputEl.value.trim()
  const dict = DICTIONARIES[currentLang]
  if (!raw) {
    lastReport = null
    outEl.innerHTML = renderEmpty(currentLang)
    return
  }
  goBtn.disabled = true
  statusEl.textContent = dict.inputSection.statusReading
  const started = performance.now()
  let report: Report
  try {
    report = await verify(raw, ep)
  } catch (e) {
    statusEl.textContent = `${dict.inputSection.statusFailed}${(e as Error).message}`
    lastReport = null
    outEl.innerHTML = renderEmpty(currentLang)
    goBtn.disabled = false
    return
  }
  lastReport = report
  const ms = Math.round(performance.now() - started)
  const failed = report.readLog.filter((l) => !l.ok).length
  statusEl.textContent = dict.inputSection.statusSummary(
    report.verdict,
    report.readLog.length,
    failed,
    ms,
    String(report.chain?.blockNumber ?? '?')
  )
  outEl.innerHTML = renderReport(report, currentLang)
  goBtn.disabled = false
}

function wire() {
  // Preset selector
  const sel = $<HTMLSelectElement>('preset')
  if (sel) {
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
  }

  // Inputs
  const fields = ['cfg-rpc', 'cfg-resolver', 'cfg-cert', 'cfg-bas', 'cfg-chain', 'cfg-label']
  for (const id of fields) {
    $(id)?.addEventListener('change', collectFromForm)
  }

  $('apply')?.addEventListener('click', () => {
    collectFromForm()
    run()
  })

  goBtn.addEventListener('click', () => run())
  inputEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run()
  })

  $('clear')?.addEventListener('click', () => {
    inputEl.value = ''
    lastReport = null
    outEl.innerHTML = renderEmpty(currentLang)
    statusEl.textContent = ''
  })

  $('share')?.addEventListener('click', () => {
    const dict = DICTIONARIES[currentLang]
    const u = new URL(location.href)
    u.searchParams.set('q', inputEl.value.trim())
    u.searchParams.set('lang', currentLang)
    history.replaceState(null, '', u.toString())
    navigator.clipboard?.writeText(u.toString()).then(
      () => (statusEl.textContent = dict.inputSection.linkCopied),
      () => (statusEl.textContent = u.toString())
    )
  })

  // Sample buttons
  $('sample-valid')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.valid
    run()
  })

  $('sample-revoked')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.revoked
    run()
  })

  $('sample-delisted')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.delisted
    run()
  })

  $('fill-sample')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.format
    run()
  })

  // Hero & Course Catalog sample buttons
  $('btn-load-demo-hero')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.valid
    run()
    document.getElementById('verifier')?.scrollIntoView({ behavior: 'smooth' })
  })

  $('btn-enroll-c1')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.valid
    run()
    document.getElementById('verifier')?.scrollIntoView({ behavior: 'smooth' })
  })

  $('btn-enroll-c2')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.revoked
    run()
    document.getElementById('verifier')?.scrollIntoView({ behavior: 'smooth' })
  })

  // Tab switching delegation on results container
  outEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const tabBtn = target.closest<HTMLButtonElement>('.tab-btn')
    if (!tabBtn) return
    const tabId = tabBtn.dataset.tab
    if (!tabId) return

    outEl.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.classList.remove('active')
      btn.setAttribute('aria-selected', 'false')
    })
    tabBtn.classList.add('active')
    tabBtn.setAttribute('aria-selected', 'true')

    outEl.querySelectorAll<HTMLDivElement>('.tab-pane').forEach((pane) => {
      pane.classList.remove('active')
    })
    const targetPane = outEl.querySelector<HTMLDivElement>(`#${tabId}`)
    if (targetPane) {
      targetPane.classList.add('active')
    }
  })

  // Language switcher buttons
  $('lang-en')?.addEventListener('click', () => setLanguage('en'))
  $('lang-id')?.addEventListener('click', () => setLanguage('id'))
}

function boot() {
  wire()
  updateStaticText()
  paintConfig()
  paintBanner()

  const params = new URLSearchParams(location.search)
  const langParam = params.get('lang')
  if (langParam === 'en' || langParam === 'id') {
    setLanguage(langParam)
  }

  const q = params.get('q')
  if (q) {
    inputEl.value = q
    run()
  } else {
    outEl.innerHTML = renderEmpty(currentLang)
  }
}

boot()

