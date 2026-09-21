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

const ESSAY_PRESETS = {
  web3: `Comparing Centralized Web2 Certificates vs Open Badges 3.0 on EVM:
Traditional certificates rely on siloed databases vulnerable to silent mutation, SQL injection, and administrative deletion. In contrast, Open Badges 3.0 anchored via EAS (Ethereum Attestation Service) on BNB Smart Chain leverage cryptographic immutability, deterministic hash commitments (keccak256), and verifiable resolver contracts. The revocation status is transparent and non-repudiable on-chain.`,
  security: `Mitigating Cross-Function Reentrancy and Prerequisite Integrity on BNB Chain:
In smart contract certification, prerequisite chains must strictly prevent replay attacks. We utilize OpenZeppelin ReentrancyGuard and enforce the Checks-Effects-Interactions pattern. Furthermore, Lencana's CredentialResolver ensures prerequisite attestations are live, unexpired, and share the exact recipient address before authorizing downstream course completion.`,
  custom: `Enter your custom Web3 architecture or smart contract essay here for autonomous AI grading...`,
}

function updateStaticText() {
  const dict = DICTIONARIES[currentLang]

  // Navbar
  setText('nav-how', dict.nav.howItWorks)
  setText('nav-evaluator', dict.nav.evaluator)
  setText('nav-agents', dict.nav.agents)
  setText('nav-courses', dict.nav.courses)
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

  // Cryptographic Pipeline
  setText('pipeline-kicker', currentLang === 'en' ? 'CRYPTOGRAPHIC DATAFLOW' : 'ALUR DATA KRIPTOGRAFIS')
  setText('pipeline-title', dict.visualPipeline.sectionTitle)
  setText('pipeline-sub', dict.visualPipeline.sectionSub)
  setText('pnode-1-title', dict.visualPipeline.node1)
  setText('pnode-2-title', dict.visualPipeline.node2)
  setText('pnode-3-title', dict.visualPipeline.node3)
  setText('pnode-4-title', dict.visualPipeline.node4)
  setText('pnode-5-title', dict.visualPipeline.node5)

  // Interactive AI Evaluator Sandbox
  setText('ai-eval-kicker', currentLang === 'en' ? 'LIVE NEURAL EVALUATION ENGINE' : 'ENGINE EVALUASI NEURAL REAL-TIME')
  setText('ai-eval-title', dict.aiEvaluator.sectionTitle)
  setText('ai-eval-sub', dict.aiEvaluator.sectionSub)
  setText('ai-input-tag', currentLang === 'en' ? 'STUDENT SUBMISSION STAGE' : 'TAHAP PENGIRIMAN ESAY PESERTA')
  setText('tab-essay-web3', dict.aiEvaluator.tabWeb3)
  setText('tab-essay-security', dict.aiEvaluator.tabSecurity)
  setText('tab-essay-custom', dict.aiEvaluator.tabCustom)
  setText('ai-rubric-strip-title', dict.aiEvaluator.rubricPreviewLabel)
  setText('chip-crit-1', dict.aiEvaluator.rubricWeight1)
  setText('chip-crit-2', dict.aiEvaluator.rubricWeight2)
  setText('chip-crit-3', dict.aiEvaluator.rubricWeight3)
  setText('btn-run-eval-text', dict.aiEvaluator.btnRunEval)
  setText('ai-agent-console-name', dict.aiEvaluator.agentHeaderTitle)
  setText('ai-agent-console-status', dict.aiEvaluator.agentStatusOnline)
  setText('lbl-meter-1', `${dict.aiEvaluator.crit1Name} (40%)`)
  setText('lbl-meter-2', `${dict.aiEvaluator.crit2Name} (30%)`)
  setText('lbl-meter-3', `${dict.aiEvaluator.crit3Name} (30%)`)
  setText('lbl-composite', dict.aiEvaluator.totalScoreLabel)
  setText('eip712-tag', dict.aiEvaluator.eip712Title)
  setText('btn-verify-eval-text', `${dict.aiEvaluator.btnVerifyLive} ➔`)

  // Autonomous Evaluator Agent Roster
  setText('roster-kicker', currentLang === 'en' ? 'ON-CHAIN WHITELISTED AGENTS' : 'AGEN TERDAFTAR DI WHITELIST')
  setText('roster-title', dict.agentRoster.sectionTitle)
  setText('roster-sub', dict.agentRoster.sectionSub)
  setText('roster-pill-1', `● ${dict.agentRoster.whitelistedPill}`)
  setText('roster-pill-2', `● ${dict.agentRoster.whitelistedPill}`)
  setText('roster-pill-3', `● ${dict.agentRoster.whitelistedPill}`)
  setText('agent-1-name', dict.agentRoster.agent1Name)
  setText('agent-1-role', dict.agentRoster.agent1Role)
  setText('agent-1-desc', dict.agentRoster.agent1Desc)
  setText('agent-1-stat', dict.agentRoster.agent1Stat)
  setText('agent-2-name', dict.agentRoster.agent2Name)
  setText('agent-2-role', dict.agentRoster.agent2Role)
  setText('agent-2-desc', dict.agentRoster.agent2Desc)
  setText('agent-2-stat', dict.agentRoster.agent2Stat)
  setText('agent-3-name', dict.agentRoster.agent3Name)
  setText('agent-3-role', dict.agentRoster.agent3Role)
  setText('agent-3-desc', dict.agentRoster.agent3Desc)
  setText('agent-3-stat', dict.agentRoster.agent3Stat)

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

  // AI Evaluation Preset Tabs
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  const tabWeb3 = $('tab-essay-web3')
  const tabSec = $('tab-essay-security')
  const tabCust = $('tab-essay-custom')

  function selectEssayTab(tab: HTMLElement | null, text: string) {
    ;[tabWeb3, tabSec, tabCust].forEach((t) => t?.classList.remove('active'))
    tab?.classList.add('active')
    if (essayInput) essayInput.value = text
  }

  tabWeb3?.addEventListener('click', () => selectEssayTab(tabWeb3, ESSAY_PRESETS.web3))
  tabSec?.addEventListener('click', () => selectEssayTab(tabSec, ESSAY_PRESETS.security))
  tabCust?.addEventListener('click', () => selectEssayTab(tabCust, ESSAY_PRESETS.custom))

  // AI Evaluation Trigger Button
  $('btn-run-ai-eval')?.addEventListener('click', () => {
    simulateAiEvaluation()
  })

  // Verify Generated Eval Button
  $('btn-verify-generated-eval')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.valid
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

let isEvaluating = false
function simulateAiEvaluation() {
  if (isEvaluating) return
  isEvaluating = true

  const btn = $('btn-run-ai-eval') as HTMLButtonElement | null
  const flagText = $('flag-text')
  const terminalBox = $('eval-terminal-box')
  if (btn) btn.disabled = true
  if (flagText) {
    flagText.textContent =
      currentLang === 'en' ? 'Evaluating essay against on-chain rubrics...' : 'Mengevaluasi esai dengan rubrik on-chain...'
  }

  // Reset Token Scanner Chips
  const tokChips = document.querySelectorAll<HTMLElement>('.tok-chip')
  tokChips.forEach((chip) => chip.classList.remove('active'))

  // Reset Radar Chart & Legend
  const radarPoly = $('radar-data-poly') as SVGPolygonElement | null
  const dot0 = $('radar-dot-0') as SVGCircleElement | null
  const dot1 = $('radar-dot-1') as SVGCircleElement | null
  const dot2 = $('radar-dot-2') as SVGCircleElement | null
  const dot3 = $('radar-dot-3') as SVGCircleElement | null
  const dot4 = $('radar-dot-4') as SVGCircleElement | null
  const radarStatus = $('radar-legend-status')

  if (radarPoly) radarPoly.setAttribute('points', '110,88 128,102 121,126 99,126 92,102')
  if (dot0) { dot0.setAttribute('cx', '110'); dot0.setAttribute('cy', '88') }
  if (dot1) { dot1.setAttribute('cx', '128'); dot1.setAttribute('cy', '102') }
  if (dot2) { dot2.setAttribute('cx', '121'); dot2.setAttribute('cy', '126') }
  if (dot3) { dot3.setAttribute('cx', '99'); dot3.setAttribute('cy', '126') }
  if (dot4) { dot4.setAttribute('cx', '92'); dot4.setAttribute('cy', '102') }
  if (radarStatus) radarStatus.textContent = currentLang === 'en' ? 'Status: Evaluating...' : 'Status: Mengevaluasi...'

  // Sequentially illuminate token chips
  tokChips.forEach((chip, idx) => {
    setTimeout(() => {
      chip.classList.add('active')
    }, 120 * (idx + 1))
  })

  // Reset meters
  const fill1 = $('fill-meter-1') as HTMLElement | null
  const fill2 = $('fill-meter-2') as HTMLElement | null
  const fill3 = $('fill-meter-3') as HTMLElement | null
  const val1 = $('val-meter-1')
  const val2 = $('val-meter-2')
  const val3 = $('val-meter-3')
  const valComp = $('val-composite')
  const badgeComp = $('badge-composite')

  if (fill1) fill1.style.width = '0%'
  if (fill2) fill2.style.width = '0%'
  if (fill3) fill3.style.width = '0%'
  if (val1) val1.textContent = '-- / 40'
  if (val2) val2.textContent = '-- / 30'
  if (val3) val3.textContent = '-- / 30'
  if (valComp) valComp.textContent = '-- / 100'
  if (badgeComp) {
    badgeComp.textContent = currentLang === 'en' ? 'EVALUATING...' : 'MENGEVALUASI...'
    badgeComp.className = 'composite-status'
  }

  if (terminalBox) {
    terminalBox.innerHTML = `
      <div class="terminal-line system">[00.08s] Connecting to whitelisted Agent-Demo-EVM (0x8211...7DE)...</div>
      <div class="terminal-line info">[00.25s] Loading on-chain Rubric #0x91a7...</div>
      <div class="terminal-line">[00.42s] Tokenizing essay payload & extracting AST concepts...</div>
    `
  }

  // Phase 1: Analytical Depth
  setTimeout(() => {
    if (fill1) fill1.style.width = '95%'
    if (val1) val1.textContent = '38 / 40'
    if (dot0) { dot0.setAttribute('cx', '110'); dot0.setAttribute('cy', '43') }
    if (radarPoly) radarPoly.setAttribute('points', '110,43 128,102 121,126 99,126 92,102')

    if (terminalBox) {
      terminalBox.innerHTML += `<div class="terminal-line">[00.85s] Criterion 1 (Analytical Depth): 38/40 · PASS (40% weight)</div>`
      terminalBox.scrollTop = terminalBox.scrollHeight
    }
  }, 500)

  // Phase 2: EVM Precision
  setTimeout(() => {
    if (fill2) fill2.style.width = '93.3%'
    if (val2) val2.textContent = '28 / 30'
    if (dot1) { dot1.setAttribute('cx', '171'); dot1.setAttribute('cy', '89') }
    if (radarPoly) radarPoly.setAttribute('points', '110,43 171,89 121,126 99,126 92,102')

    if (terminalBox) {
      terminalBox.innerHTML += `<div class="terminal-line">[01.35s] Criterion 2 (EVM Precision): 28/30 · PASS (30% weight)</div>`
      terminalBox.scrollTop = terminalBox.scrollHeight
    }
  }, 1000)

  // Phase 3: Architecture Defense & Composite Honors Pass
  setTimeout(() => {
    if (fill3) fill3.style.width = '90%'
    if (val3) val3.textContent = '27 / 30'
    if (valComp) valComp.textContent = '93 / 100'
    if (badgeComp) {
      badgeComp.textContent = currentLang === 'en' ? 'HONORS PASS (93/100)' : 'LULUS DENGAN PUJIAN (93/100)'
      badgeComp.className = 'composite-status'
    }

    // Expand all 5 vertices to full honors coordinates
    if (dot0) { dot0.setAttribute('cx', '110'); dot0.setAttribute('cy', '43') }
    if (dot1) { dot1.setAttribute('cx', '171'); dot1.setAttribute('cy', '89') }
    if (dot2) { dot2.setAttribute('cx', '147'); dot2.setAttribute('cy', '160') }
    if (dot3) { dot3.setAttribute('cx', '71'); dot3.setAttribute('cy', '163') }
    if (dot4) { dot4.setAttribute('cx', '47'); dot4.setAttribute('cy', '90') }
    if (radarPoly) radarPoly.setAttribute('points', '110,43 171,89 147,160 71,163 47,90')
    if (radarStatus) radarStatus.textContent = currentLang === 'en' ? 'Status: Honors Pass (93/100)' : 'Status: Lulus Pujian (93/100)'

    if (terminalBox) {
      terminalBox.innerHTML += `
        <div class="terminal-line">[01.85s] Criterion 3 (Architecture Defense): 27/30 · PASS (30% weight)</div>
        <div class="terminal-line info">[02.10s] Composite Score: 93/100 · Result: HONORS PASS</div>
        <div class="terminal-line system">[02.35s] Generating EIP-712 Typed Data Signature from Agent-Demo...</div>
        <div class="terminal-line info">[02.60s] Digest: 0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa</div>
        <div class="terminal-line">[02.80s] Signature verified on-chain. Ready for BNB Attestation Service anchor!</div>
      `
      terminalBox.scrollTop = terminalBox.scrollHeight
    }
    if (flagText) {
      flagText.textContent =
        currentLang === 'en' ? 'Evaluation Complete · EIP-712 Signed' : 'Evaluasi Selesai · Bertanda Tangan EIP-712'
    }
    if (btn) btn.disabled = false
    isEvaluating = false
  }, 1600)
}

function boot() {
  wire()
  updateStaticText()
  paintConfig()
  paintBanner()

  // Initialize default essay text
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  if (essayInput && !essayInput.value) {
    essayInput.value = ESSAY_PRESETS.web3
  }

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

