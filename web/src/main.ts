import { verify, type Endpoint, type Report } from './verify'
import { renderEmpty, renderReport } from './render'
import { loadEndpoint, saveEndpoint, PRESETS, isConfigured } from './config'
import { getSavedLanguage, saveLanguage, DICTIONARIES, type Lang } from './i18n'
import { renderLmsRoute } from './lms'

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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface CourseLesson {
  tabLabel: { en: string; id: string }
  title: { en: string; id: string }
  subtitle: { en: string; id: string }
  summary: { en: string; id: string }
  points: { en: string[]; id: string[] }
  codeSnippet?: string
}

interface CourseData {
  title: { en: string; id: string }
  kicker: { en: string; id: string }
  essayPresetKey: 'web3' | 'security'
  modules: [CourseLesson, CourseLesson, CourseLesson]
}

const COURSE_CATALOG_DATA: Record<'c1' | 'c2', CourseData> = {
  c1: {
    title: {
      en: 'Web3 Dasar 2026: Foundations & Architecture',
      id: 'Web3 Dasar 2026: Fondasi & Arsitektur',
    },
    kicker: {
      en: 'STUDY ROOM · INTERACTIVE LESSON',
      id: 'STUDY ROOM · MATERI INTERAKTIF',
    },
    essayPresetKey: 'web3',
    modules: [
      {
        tabLabel: { en: 'Module 1: Primitives', id: 'Modul 1: Primitif' },
        title: {
          en: '1. Blockchain Primitives & EVM State Machine',
          id: '1. Primitif Blockchain & State Machine EVM',
        },
        subtitle: {
          en: 'Deterministic state transitions, cryptographic hashing, and gas execution.',
          id: 'Transisi state deterministik, hashing kriptografi, dan eksekusi gas.',
        },
        summary: {
          en: 'Ethereum Virtual Machine (EVM) operates as a quasi-Turing complete state machine. Every transaction executes deterministic opcodes with gas metering on BNB Smart Chain.',
          id: 'Ethereum Virtual Machine (EVM) berfungsi sebagai state machine quasi-Turing complete. Setiap transaksi mengeksekusi opcode deterministik dengan kalkulasi gas pada BNB Smart Chain.',
        },
        points: {
          en: [
            'State trie architecture (MPT) ensures tamper-evident account balances and storage slots.',
            'Keccak-256 cryptographic digests guarantee non-repudiation of course submissions.',
            'EIP-155 replay protection binds transactions strictly to BSC Testnet (Chain ID 97) or BSC Mainnet (Chain ID 56).',
          ],
          id: [
            'Arsitektur Merkle Patricia Trie (MPT) memastikan integritas saldo dan penyimpanan akun tanpa celah manipulasi.',
            'Digest kriptografis Keccak-256 menjamin non-repudiation atas penyerahan tugas peserta.',
            'Perlindungan replay EIP-155 mengunci transaksi secara ketat pada BSC Testnet (Chain ID 97) atau BSC Mainnet (Chain ID 56).',
          ],
        },
        codeSnippet: `// Deterministic Credential Hash Commitment
bytes32 credentialHash = keccak256(
    abi.encodePacked(recipientAddress, courseId, gradeScore, block.timestamp)
);`,
      },
      {
        tabLabel: { en: 'Module 2: Attestations', id: 'Modul 2: Atestasi' },
        title: {
          en: '2. W3C Open Badges 3.0 & BAS Schemas',
          id: '2. W3C Open Badges 3.0 & Skema BAS',
        },
        subtitle: {
          en: 'Off-chain verifiable credentials anchored via BNB Attestation Service.',
          id: 'Kredensial terverifikasi off-chain yang di-anchor via BNB Attestation Service.',
        },
        summary: {
          en: 'Rather than issuing static PDF certificates, Lencana formats credentials adhering to the W3C Open Badges 3.0 standard. Attestation digests are signed via EIP-712 typed structured data by autonomous AI Domain Agents.',
          id: 'Alih-alih sertifikat PDF statis, Lencana menerbitkan kredensial berstandar W3C Open Badges 3.0. Digest atestasi ditandatangani via data terstruktur bertipe EIP-712 oleh AI Domain Agent otonom.',
        },
        points: {
          en: [
            'Attestation UID anchored on BNB Attestation Service (BAS) registry with immutable timestamps.',
            'Zero gas required by learners: AI Domain Agents co-sign and submit attestation proofs.',
            'ERC-5192 Soulbound interface enforces non-transferability (locked = true).',
          ],
          id: [
            'UID Atestasi terpasang permanen pada registry BNB Attestation Service (BAS) beserta timestamp tak terhapus.',
            'Tanpa biaya gas bagi peserta: AI Domain Agent melakukan co-sign dan memproses bukti atestasi.',
            'Antarmuka Soulbound ERC-5192 menjamin sertifikat terkunci pada dompet penerima (locked = true).',
          ],
        },
        codeSnippet: `// EIP-712 Schema Struct for BAS Attestation
struct AttestationRequestData {
    address recipient;
    uint64 expirationTime;
    bool revocable;
    bytes32 refUID;
    bytes data; // W3C OpenBadge 3.0 payload hash
}`,
      },
      {
        tabLabel: { en: 'Module 3: Essay Capstone', id: 'Modul 3: Tugas Esai' },
        title: {
          en: '3. Capstone Analytical Essay Task',
          id: '3. Tugas Capstone Esai Analitis',
        },
        subtitle: {
          en: 'Evaluate centralized credentials vs decentralized verifiable attestations.',
          id: 'Evaluasi komparasi sertifikat terpusat vs atestasi terverifikasi terdesentralisasi.',
        },
        summary: {
          en: 'To complete this course and unlock your Soulbound Credential, write a rigorous essay comparing centralized Web2 certificates against on-chain Open Badges 3.0. Your essay will be evaluated live by Agent-Foundations against on-chain Rubric #0x91a7.',
          id: 'Untuk menuntaskan kursus ini dan mencetak Kredensial Soulbound, tulis esai komparasi mendalam antara sertifikat Web2 konvensional dengan Open Badges 3.0 on-chain. Esai Anda akan dinilai langsung oleh Agent-Foundations menggunakan Rubrik On-Chain #0x91a7.',
        },
        points: {
          en: [
            'Criterion 1 (40%): Analytical Depth & security comparison.',
            'Criterion 2 (30%): EVM execution precision and state persistence.',
            'Criterion 3 (30%): Architectural defense & non-repudiation proof.',
          ],
          id: [
            'Kriteria 1 (40%): Kedalaman analitis & komparasi keamanan.',
            'Kriteria 2 (30%): Presisi teknis eksekusi EVM & persistensi state.',
            'Kriteria 3 (30%): Pertahanan arsitektural & pembuktian non-repudiation.',
          ],
        },
      },
    ],
  },
  c2: {
    title: {
      en: 'BNB Chain Security & Prerequisite Integrity',
      id: 'BNB Chain Security & Integritas Prasyarat',
    },
    kicker: {
      en: 'STUDY ROOM · ADVANCED TRACK',
      id: 'STUDY ROOM · KELAS LANJUTAN',
    },
    essayPresetKey: 'security',
    modules: [
      {
        tabLabel: { en: 'Module 1: Defense Patterns', id: 'Modul 1: Pola Pertahanan' },
        title: {
          en: '1. Reentrancy Defense & CEI Principles',
          id: '1. Pertahanan Reentrancy & Prinsip CEI',
        },
        subtitle: {
          en: 'Securing smart contracts against cross-function and cross-contract reentrancy.',
          id: 'Mengamankan smart contract dari reentrancy lintas fungsi dan lintas kontrak.',
        },
        summary: {
          en: 'Learn how malicious re-entrant calls exploit state updates. Master the Checks-Effects-Interactions (CEI) design pattern and integrate OpenZeppelin ReentrancyGuard mutexes.',
          id: 'Pelajari bagaimana pemanggilan re-entrant mengeksploitasi keterlambatan pembaruan state. Kuasai pola desain Checks-Effects-Interactions (CEI) serta integrasi mutex ReentrancyGuard OpenZeppelin.',
        },
        points: {
          en: [
            'Checks: Validate caller, arguments, and whitelist status before execution.',
            'Effects: Mutate contract state before making external transfers or calls.',
            'Interactions: Execute untrusted external calls only after state is safely committed.',
          ],
          id: [
            'Checks: Validasi pemanggil, parameter, dan status whitelist sebelum eksekusi.',
            'Effects: Ubah state kontrak sebelum melakukan pengiriman dana atau panggilan eksternal.',
            'Interactions: Eksekusi panggilan kontrak eksternal hanya setelah state aman tersimpan.',
          ],
        },
        codeSnippet: `// Checks-Effects-Interactions Pattern
function claimBadge(uint256 courseId) external nonReentrant {
    require(hasCompletedPrerequisite(msg.sender, courseId), "Prereq locked"); // Checks
    _claimedBadges[msg.sender][courseId] = true;                               // Effects
    _mintSoulboundBadge(msg.sender, courseId);                                 // Interactions
}`,
      },
      {
        tabLabel: { en: 'Module 2: BAS Resolver Hooks', id: 'Modul 2: Hook Resolver' },
        title: {
          en: '2. BAS Resolver Hooks & Delisting Registers',
          id: '2. Hook Resolver BAS & Daftar Delisting',
        },
        subtitle: {
          en: 'Programmatic on-chain attestation verification and revocation enforcement.',
          id: 'Verifikasi atestasi programatik on-chain dan penegakan pencabutan sertifikat.',
        },
        summary: {
          en: 'Lencana employs CredentialResolver.sol hooked into BNB Attestation Service. When an attestation is presented, the resolver contract programmatically checks revocation status, delisted issuer registries, and prerequisite completion trees.',
          id: 'Lencana mengimplementasikan CredentialResolver.sol yang terhubung ke BNB Attestation Service. Saat atestasi diverifikasi, kontrak resolver memeriksa status pencabutan, daftar delisting penerbit, dan pohon prasyarat secara on-chain.',
        },
        points: {
          en: [
            'Multi-tenant resolver validation: Checks whether issuer address is in good standing.',
            'Real-time revocation check: Revoked credentials fail instant on-chain verification.',
            'Prerequisite gating: Blocks higher-level credential claims if prerequisite UID is missing.',
          ],
          id: [
            'Validasi resolver multi-tenant: Memeriksa apakah alamat penerbit bereputasi aktif.',
            'Pengecekan pembatalan real-time: Kredensial yang dicabut langsung gagal diverifikasi.',
            'Gating prasyarat bertingkat: Memblokir klaim sertifikat lanjutan jika UID prasyarat belum tuntas.',
          ],
        },
        codeSnippet: `// CredentialResolver onAttest Hook
function onAttest(Attestation calldata attestation, uint256 /*value*/) internal view override returns (bool) {
    if (delistedIssuers[attestation.attester]) return false;
    if (attestation.revocationTime > 0) return false;
    return true;
}`,
      },
      {
        tabLabel: { en: 'Module 3: Defense Essay', id: 'Modul 3: Esai Pertahanan' },
        title: {
          en: '3. Security Capstone Defense Essay',
          id: '3. Tugas Capstone Esai Keamanan',
        },
        subtitle: {
          en: 'Mitigating cross-function reentrancy and prerequisite chain integrity.',
          id: 'Mitigasi reentrancy lintas fungsi dan integritas rantai prasyarat sertifikasi.',
        },
        summary: {
          en: 'Demonstrate your comprehension of advanced smart contract security on BNB Chain. Write an analytical essay defending prerequisite graph integrity and anti-replay schemes, graded by Agent-Security against Rubric #0x42f1.',
          id: 'Tunjukkan pemahaman mendalam Anda mengenai keamanan smart contract di BNB Chain. Susun esai pertahanan atas integritas pohon prasyarat dan skema anti-replay, yang dinilai langsung oleh Agent-Security dengan Rubrik #0x42f1.',
        },
        points: {
          en: [
            'Criterion 1 (50%): Reentrancy mitigation & CEI implementation rigor.',
            'Criterion 2 (30%): Resolver hook logic & prerequisite dependency graph.',
            'Criterion 3 (20%): Clarity and formal verification recommendations.',
          ],
          id: [
            'Kriteria 1 (50%): Mitigasi reentrancy & ketegasan implementasi pola CEI.',
            'Kriteria 2 (30%): Logika hook resolver & grafik ketergantungan prasyarat.',
            'Kriteria 3 (20%): Kejelasan penyampaian dan rekomendasi verifikasi formal.',
          ],
        },
      },
    ],
  },
}

let currentCourseId: 'c1' | 'c2' = 'c1'
let currentModuleIdx = 0
let privacyMode: 'pseudo' | 'named' = 'pseudo'

function renderStudyModal() {
  const data = COURSE_CATALOG_DATA[currentCourseId]
  const mod = data.modules[currentModuleIdx]
  const isEn = currentLang === 'en'

  setText('study-modal-kicker', data.kicker[currentLang])
  setText('study-modal-title', data.title[currentLang])

  // Update tabs text & active state
  const tabs = [$('tab-mod-1'), $('tab-mod-2'), $('tab-mod-3')]
  data.modules.forEach((m, idx) => {
    const tabEl = tabs[idx]
    if (tabEl) {
      tabEl.textContent = m.tabLabel[currentLang]
      tabEl.classList.toggle('active', idx === currentModuleIdx)
    }
  })

  // Render Lesson Content
  const contentEl = $('study-lesson-content')
  if (contentEl) {
    const pointsList = mod.points[currentLang].map((pt) => `<li>${pt}</li>`).join('')
    const codeBlock = mod.codeSnippet
      ? `<pre class="lesson-code-snippet"><code>${escapeHtml(mod.codeSnippet)}</code></pre>`
      : ''

    contentEl.innerHTML = `
      <div class="lesson-header">
        <h3 style="margin: 0 0 4px; color: var(--text-main); font-size: 18px;">${mod.title[currentLang]}</h3>
        <span style="font-size: 13px; color: var(--bnb-gold); font-family: var(--font-mono);">${mod.subtitle[currentLang]}</span>
      </div>
      <p style="margin: 12px 0; font-size: 14px; line-height: 1.65; color: var(--text-sub);">${mod.summary[currentLang]}</p>
      <div class="lesson-card-box">
        <h4>${isEn ? 'Core Concepts & Specifications' : 'Konsep Utama & Spesifikasi'}</h4>
        <ul class="lesson-bullet-list">${pointsList}</ul>
        ${codeBlock}
      </div>
    `
  }

  // Update Footer Text
  const footerText = $('study-footer-text')
  if (footerText) {
    footerText.textContent = isEn
      ? `Module ${currentModuleIdx + 1} of 3 · Self-Paced · ${data.title[currentLang]}`
      : `Modul ${currentModuleIdx + 1} dari 3 · Mandiri · ${data.title[currentLang]}`
  }
}

function openStudyModal(courseId: 'c1' | 'c2', moduleIdx: number = 0) {
  currentCourseId = courseId
  currentModuleIdx = moduleIdx
  renderStudyModal()
  const modal = $('study-modal')
  if (modal) modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeStudyModal() {
  const modal = $('study-modal')
  if (modal) modal.classList.add('hidden')
  document.body.style.overflow = ''
}

function setStudyModule(idx: number) {
  currentModuleIdx = idx
  renderStudyModal()
}

function setPrivacyMode(mode: 'pseudo' | 'named') {
  privacyMode = mode
  const btnPseudo = $('btn-privacy-pseudo')
  const btnNamed = $('btn-privacy-named')
  const learnerName = $('learner-profile-name')
  const learnerSub = $('learner-sub-info')

  if (mode === 'pseudo') {
    btnPseudo?.classList.add('active')
    btnNamed?.classList.remove('active')
    if (learnerName) learnerName.textContent = DICTIONARIES[currentLang].coursesSection.learnerProfileName
    if (learnerSub) learnerSub.textContent = DICTIONARIES[currentLang].coursesSection.learnerSubInfo
  } else {
    btnNamed?.classList.add('active')
    btnPseudo?.classList.remove('active')
    if (learnerName) learnerName.textContent = `${DICTIONARIES[currentLang].coursesSection.learnerProfileName} ✓`
    if (learnerSub) {
      learnerSub.textContent = 'did:pkh:eip155:97:0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B (Salted Hash #8F92)'
    }
  }
}

let portfolioPrivacyTier = 1

function setPortfolioPrivacyTier(tier: number) {
  portfolioPrivacyTier = tier
  $('btn-tier-1')?.classList.toggle('active', tier === 1)
  $('btn-tier-2')?.classList.toggle('active', tier === 2)
  $('btn-tier-3')?.classList.toggle('active', tier === 3)

  const nameEl = $('portfolio-learner-name')
  const subEl = $('portfolio-learner-sub')
  const dict = DICTIONARIES[currentLang].portfolioSection

  if (tier === 1) {
    if (nameEl) nameEl.textContent = '0x5cA3...7c3B (Pseudonymous)'
    if (subEl) subEl.textContent = 'BSC Testnet · Address-only identity mode'
  } else if (tier === 2) {
    if (nameEl) nameEl.textContent = `${dict.learnerName} ✓`
    if (subEl) subEl.textContent = dict.learnerRole
  } else {
    if (nameEl) nameEl.textContent = `${dict.learnerName} [Provable DID]`
    if (subEl) subEl.textContent = 'did:pkh:eip155:97:0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B (Salted Hash #8F92)'
  }
}

function updateEditorLineNumbers() {
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  const gutter = $('eval-gutter')
  const charsCounter = $('ide-chars-counter')
  if (!essayInput) return

  const val = essayInput.value || ''
  if (charsCounter) charsCounter.textContent = `Chars: ${val.length}`

  const lines = val.split('\n').length
  const lineCount = Math.max(lines, 8)
  if (gutter) {
    let html = ''
    for (let i = 1; i <= lineCount; i++) {
      html += `<span>${i}</span>`
    }
    gutter.innerHTML = html
  }
}

function updateEssayWordCount() {
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  const text = essayInput?.value || ''
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const astTokens = Math.round(words * 1.35)
  setText('essay-token-count', `Words: ${words} · AST Tokens: ~${astTokens} · Rubric: 100%`)
  updateEditorLineNumbers()
}

interface WalletState {
  isConnected: boolean
  address: string | null
  isDemo: boolean
}

let walletState: WalletState = {
  isConnected: false,
  address: null,
  isDemo: false,
}

function initWalletState() {
  try {
    const saved = sessionStorage.getItem('lencana_wallet')
    if (saved) {
      walletState = JSON.parse(saved)
      renderWalletState()
    }
  } catch {}
}

function renderWalletState() {
  const connectBtn = $('btn-connect-wallet')
  const connectedPill = $('wallet-connected-pill')
  const addrDisplay = $('wallet-address-display')
  const learnerAddrEl = document.querySelector('.learner-addr')
  const portfolioAddrEl = document.querySelector('.portfolio-wallet-addr')
  const mintReceiptAddr = $('mint-receipt-recipient')

  if (walletState.isConnected && walletState.address) {
    connectBtn?.classList.add('hidden')
    connectedPill?.classList.remove('hidden')
    const short = `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`
    if (addrDisplay) {
      addrDisplay.textContent = walletState.isDemo ? `rina.bnb (${short})` : short
    }
    if (learnerAddrEl) learnerAddrEl.textContent = walletState.address
    if (portfolioAddrEl) portfolioAddrEl.textContent = walletState.address
    if (mintReceiptAddr) mintReceiptAddr.textContent = walletState.address
  } else {
    connectBtn?.classList.remove('hidden')
    connectedPill?.classList.add('hidden')
    if (learnerAddrEl) learnerAddrEl.textContent = '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
    if (portfolioAddrEl) portfolioAddrEl.textContent = '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
    if (mintReceiptAddr) mintReceiptAddr.textContent = '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
  }
}

function openWalletModal() {
  const modal = $('wallet-modal')
  const statusEl = $('wallet-modal-status')
  if (statusEl) {
    statusEl.classList.add('hidden')
    statusEl.textContent = ''
  }
  modal?.classList.remove('hidden')
}

function closeWalletModal() {
  const modal = $('wallet-modal')
  modal?.classList.add('hidden')
}

async function connectBrowserWallet() {
  const statusEl = $('wallet-modal-status')
  if (statusEl) {
    statusEl.classList.remove('hidden')
    statusEl.textContent = DICTIONARIES[currentLang].wallet.connecting
    statusEl.className = 'wallet-modal-status'
  }

  const eth = (window as any).ethereum
  if (!eth) {
    if (statusEl) {
      statusEl.textContent = DICTIONARIES[currentLang].wallet.noExtension
      statusEl.className = 'wallet-modal-status warn'
    }
    return
  }

  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' })
    if (accounts && accounts.length > 0) {
      const addr = accounts[0]
      try {
        const chainIdHex = await eth.request({ method: 'eth_chainId' })
        const chainId = parseInt(chainIdHex, 16)
        if (chainId !== 97 && chainId !== 56) {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x61' }],
          })
        }
      } catch {}

      walletState = { isConnected: true, address: addr, isDemo: false }
      sessionStorage.setItem('lencana_wallet', JSON.stringify(walletState))
      renderWalletState()
      closeWalletModal()
    }
  } catch (err: any) {
    if (statusEl) {
      statusEl.textContent = err?.message || 'Connection rejected'
      statusEl.className = 'wallet-modal-status error'
    }
  }
}

function connectDemoWallet() {
  walletState = {
    isConnected: true,
    address: '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B',
    isDemo: true,
  }
  sessionStorage.setItem('lencana_wallet', JSON.stringify(walletState))
  renderWalletState()
  closeWalletModal()
}

function disconnectWallet() {
  walletState = { isConnected: false, address: null, isDemo: false }
  sessionStorage.removeItem('lencana_wallet')
  renderWalletState()
}

let confettiAnimId: number | null = null

function launchConfetti() {
  const canvas = $('mint-confetti-canvas') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const colors = ['#F0B90B', '#0ECB81', '#A855F7', '#FFFFFF', '#FCD535']
  const particles: Array<{
    x: number
    y: number
    r: number
    d: number
    color: string
    tilt: number
    tiltAngle: number
    tiltAngleIncremental: number
  }> = []

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
    })
  }

  let angle = 0
  function draw() {
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    angle += 0.01

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      p.tiltAngle += p.tiltAngleIncremental
      p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) * 0.9
      p.x += Math.sin(angle) * 1.5
      p.tilt = Math.sin(p.tiltAngle) * 12

      ctx.beginPath()
      ctx.lineWidth = p.r
      ctx.strokeStyle = p.color
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
      ctx.stroke()

      if (p.y > canvas.height) {
        particles[i] = {
          x: Math.random() * canvas.width,
          y: -10,
          r: p.r,
          d: p.d,
          color: p.color,
          tilt: p.tilt,
          tiltAngle: p.tiltAngle,
          tiltAngleIncremental: p.tiltAngleIncremental,
        }
      }
    }

    confettiAnimId = requestAnimationFrame(draw)
  }

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId)
  draw()
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId)
    confettiAnimId = null
  }
  const canvas = $('mint-confetti-canvas') as HTMLCanvasElement | null
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function openMintModal() {
  const modal = $('mint-modal')
  modal?.classList.remove('hidden')
  launchConfetti()
}

function closeMintModal() {
  const modal = $('mint-modal')
  modal?.classList.add('hidden')
  stopConfetti()
}

// ========================================================
// ITERATION 12: DETERMINISTIC VECTOR SVG QR CODE GENERATOR
// ========================================================
function generateQrCodeSvg(url: string, size = 25): string {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  function placeFinder(startX: number, startY: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[startY + r][startX + c] = true
        }
      }
    }
  }

  // Place 3 finder patterns in corners
  placeFinder(0, 0)
  placeFinder(size - 7, 0)
  placeFinder(0, size - 7)

  // Timing lines
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      matrix[6][i] = true
      matrix[i][6] = true
    }
  }

  // Alignment pattern for size 25
  const alignX = size - 7
  const alignY = size - 7
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[alignY + r][alignX + c] = true
      }
    }
  }

  // Seed pseudo-random generator deterministically from URL string
  let seed = 0
  for (let i = 0; i < url.length; i++) {
    seed = (seed * 31 + url.charCodeAt(i)) >>> 0
  }

  function pseudoRand() {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return (seed >>> 16) / 65536
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder1 = r < 8 && c < 8
      const inFinder2 = r < 8 && c >= size - 8
      const inFinder3 = r >= size - 8 && c < 8
      const inTiming = r === 6 || c === 6
      const inAlign = r >= alignY - 2 && r <= alignY + 2 && c >= alignX - 2 && c <= alignX + 2
      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming && !inAlign) {
        if (pseudoRand() > 0.48) {
          matrix[r][c] = true
        }
      }
    }
  }

  let rects = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000000" />`
      }
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${rects}</svg>`
}

// ========================================================
// ITERATION 12: EXECUTIVE PRINTABLE DIPLOMA MODAL HANDLERS
// ========================================================
function openDiplomaModal() {
  const modal = $('diploma-modal')
  if (!modal) return

  const nameEl = $('diploma-recipient-name')
  const addrEl = $('diploma-recipient-addr')
  const addr = walletState.address ?? '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'

  if (nameEl) {
    if (portfolioPrivacyTier === 1) {
      nameEl.textContent = `${addr.slice(0, 8)}...${addr.slice(-6)}`
    } else {
      nameEl.textContent = 'Rina Oktaviani'
    }
  }
  if (addrEl) {
    addrEl.textContent = `did:pkh:eip155:97:${addr}`
  }

  const qrBox = $('diploma-qr-svg')
  if (qrBox) {
    const verifyUrl = `${window.location.origin}/#/verify?q=0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa`
    qrBox.innerHTML = generateQrCodeSvg(verifyUrl, 25)
  }

  modal.classList.remove('hidden')
}

function closeDiplomaModal() {
  $('diploma-modal')?.classList.add('hidden')
}

// ========================================================
// ITERATION 12: SOCIAL PROOF SHARING & EMBED BADGE
// ========================================================
function shareOnLinkedIn() {
  const certName = encodeURIComponent('Web3 Dasar 2026: Foundations & Architecture')
  const orgName = encodeURIComponent('Lencana Decentralized Protocol')
  const issueYear = '2026'
  const issueMonth = '9'
  const certUrl = encodeURIComponent('https://lencana.io/#/verify?q=0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa')
  const certId = '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa'

  const url = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${orgName}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${certUrl}&certId=${certId}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareOnX() {
  const text = encodeURIComponent(
    'Just earned my verifiable Soulbound Credential in "Web3 Dasar 2026" evaluated by autonomous AI on @BNBCHAIN! 🎓⛓️\n\nAudit cryptographic proof on-chain:\nhttps://lencana.io/#/verify?q=0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa\n\n#BNBChain #OpenBadges #Web3Education #Lencana'
  )
  const url = `https://twitter.com/intent/tweet?text=${text}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function copyEmbedCode() {
  const snippet = `<a href="https://lencana.io/#/verify?q=0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/BNB%20Chain-Soulbound%20Open%20Badge%203.0-F0B90B?style=for-the-badge&logo=binance&logoColor=white" alt="Lencana Web3 Dasar 2026 Verified Credential" /></a>`
  navigator.clipboard.writeText(snippet).then(() => {
    const btn = $('btn-portfolio-embed')
    if (btn) {
      const orig = btn.textContent
      btn.textContent = DICTIONARIES[currentLang].portfolioSection.embedCopied
      setTimeout(() => {
        btn.textContent = orig
      }, 2500)
    }
  })
}

// ========================================================
// ITERATION 12: W3C BITSTRING STATUS LIST INTERACTIVE MATRIX
// ========================================================
interface BitItem {
  index: number
  status: 'valid' | 'revoked' | 'suspended'
  attestationUid: string
}

let bitstringState: BitItem[] = []
let bitstringFlipped = false

function initBitstringMatrix() {
  bitstringState = []
  for (let i = 0; i < 256; i++) {
    let status: 'valid' | 'revoked' | 'suspended' = 'valid'
    let attestationUid = `0x${(i + 100).toString(16).padStart(64, '0')}`

    if (i === 42) {
      status = 'revoked'
      attestationUid = '0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2'
    } else if (i === 87) {
      status = 'suspended'
      attestationUid = '0x4d0ffdf32d174796a2c8bbe38e739c26ec6e205e6cdf48409f7240d28552df1c'
    }

    bitstringState.push({ index: i, status, attestationUid })
  }
  renderBitstringMatrix()
}

function renderBitstringMatrix() {
  const grid = $('bitstring-grid')
  if (!grid) return

  grid.innerHTML = ''
  let validCount = 0
  let revokedCount = 0
  let suspendedCount = 0

  bitstringState.forEach((bit) => {
    if (bit.status === 'valid') validCount++
    if (bit.status === 'revoked') revokedCount++
    if (bit.status === 'suspended') suspendedCount++

    const cell = document.createElement('div')
    cell.className = `bit-cell ${bit.status}`
    cell.textContent = bit.status === 'valid' ? '0' : '1'
    cell.title = `Bit #${bit.index} · ${bit.status.toUpperCase()} · Attestation UID: ${bit.attestationUid.slice(0, 10)}...`

    cell.addEventListener('click', () => {
      if (bit.status === 'valid') {
        bit.status = 'revoked'
      } else if (bit.status === 'revoked') {
        bit.status = 'suspended'
      } else {
        bit.status = 'valid'
      }
      renderBitstringMatrix()
    })

    grid.appendChild(cell)
  })

  const summary = $('bitstring-status-summary')
  if (summary) {
    summary.innerHTML = `Active: <strong>${validCount} Valid</strong> · <strong class="red">${revokedCount} Revoked</strong> · <strong class="amber">${suspendedCount} Suspended</strong>`
  }

  const multibaseEl = $('bitstring-multibase-val')
  if (multibaseEl) {
    multibaseEl.textContent = `uH4sIC${(revokedCount * 17 + suspendedCount * 31).toString(16).padStart(4, '0')}N2UAA2JpdHN0cmluZwDFkMENgDAMBPt3f1f3...${(validCount % 99).toString(16)}fe7f7`
  }
}

function toggleBitstringState() {
  bitstringFlipped = !bitstringFlipped
  if (bitstringFlipped) {
    bitstringState[10].status = 'revoked'
    bitstringState[64].status = 'suspended'
    bitstringState[128].status = 'revoked'
  } else {
    bitstringState[10].status = 'valid'
    bitstringState[64].status = 'valid'
    bitstringState[128].status = 'valid'
  }
  renderBitstringMatrix()
}

// ========================================================
// ITERATION 13: INTERACTIVE TAMPER & FORGERY PLAYGROUND
// ========================================================
function simulateAttack(attackType: 1 | 2 | 3 | 4) {
  const terminal = $('tamper-terminal-body')
  const pill = $('tamper-revert-pill')
  if (!terminal) return

  terminal.innerHTML = ''
  if (pill) {
    pill.className = 'tamper-revert-pill reverted'
  }

  if (attackType === 1) {
    if (pill) pill.textContent = 'REVERTED: INVALID SIGNATURE'
    terminal.innerHTML = `
      <div class="tamper-line system">[00.04s] Attacker modifies payload: score: "93/100" ➔ "99/100 (Summa Cum Laude)"</div>
      <div class="tamper-line">[00.12s] Recomputing Keccak256(payload)...</div>
      <div class="tamper-line trace">Original Digest: 0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa</div>
      <div class="tamper-line trace">Tampered Digest: 0x7e3a1f8d92410a5b8812c9381ea5b00918c7263bda495821038b584920491823</div>
      <div class="tamper-line">[00.22s] Calling BAS.getAttestation(0x7e3a1f8d9...) on chain 97...</div>
      <div class="tamper-line revert">[EVM REVERT] AttestationNotFound(0x7e3a1f8d9...) · Attestation does not exist on-chain!</div>
      <div class="tamper-line">[00.32s] Calling ecrecover(0x7e3a..., v: 27, r: 0x4e2..., s: 0x71b...)...</div>
      <div class="tamper-line revert">[00.40s] Recovered Signer: 0x937Fa2... != Whitelisted Agent (0x8211...7DE)</div>
      <div class="tamper-line revert">[CRITICAL FAIL] Cryptographic signature check FAILED. Any single byte tampering breaks mathematical verification!</div>
    `
  } else if (attackType === 2) {
    if (pill) pill.textContent = 'REVERTED: ERC-5192 LOCKED'
    terminal.innerHTML = `
      <div class="tamper-line system">[00.05s] Attacker invokes SoulboundCert.safeTransferFrom(from: 0x5cA3..., to: 0xAttacker..., tokenId: 1)</div>
      <div class="tamper-line">[00.14s] SoulboundCert queries internal lock registry: locked(1)...</div>
      <div class="tamper-line trace">locked(1) == true · Token was issued as immutable Soulbound Credential</div>
      <div class="tamper-line">[00.24s] Executing _beforeTokenTransfer(0x5cA3..., 0xAttacker..., 1)...</div>
      <div class="tamper-line revert">[EVM REVERT] ErrLocked(1) - "ERC-5192: Soulbound non-transferable token"</div>
      <div class="tamper-line trace">Transaction reverted by EVM. Gas consumed: 21,418 gas.</div>
      <div class="tamper-line success">[SECURITY PASS] The credential remains locked to learner wallet 0x5cA3...7c3B. Secondary market sale impossible!</div>
    `
  } else if (attackType === 3) {
    if (pill) pill.textContent = 'REVERTED: NOT AN ISSUER'
    terminal.innerHTML = `
      <div class="tamper-line system">[00.06s] Unauthorized caller 0x4d0ffdf32d1... attempts attestByDelegation() on BAS schema #0x2c4e...</div>
      <div class="tamper-line">[00.15s] BAS invokes resolver hook: CredentialResolver.onAttest(attestation, msg.value)</div>
      <div class="tamper-line trace">CredentialResolver checking whitelist: _issuer[0x4d0ffdf32d1...]</div>
      <div class="tamper-line revert">[EVM REVERT] NotAnIssuer(0x4d0ffdf32d174796a2c8bbe38e739c26ec6e205e)</div>
      <div class="tamper-line trace">Attestation refused by CredentialResolver hook. Zero bytes written to chain.</div>
      <div class="tamper-line success">[SECURITY PASS] Malicious agents cannot issue credentials without explicit platform governance whitelisting!</div>
    `
  } else if (attackType === 4) {
    if (pill) pill.textContent = 'REVERTED: PREREQUISITE REVOKED'
    terminal.innerHTML = `
      <div class="tamper-line system">[00.05s] Attacker attempts to claim "BNB Chain Security" requiring "Web3 Dasar 2026"</div>
      <div class="tamper-line">[00.16s] CredentialResolver checking prerequisite tree: checkPrerequisites(refUID)</div>
      <div class="tamper-line trace">Reading BAS storage for refUID: 0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2...</div>
      <div class="tamper-line trace">Found attestation: revocationTime == 1774051200 (REVOKED ON-CHAIN)</div>
      <div class="tamper-line revert">[EVM REVERT] PrerequisiteRevoked(0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2)</div>
      <div class="tamper-line trace">Transaction reverted at depth 1. EAS prerequisite loophole CLOSED.</div>
      <div class="tamper-line success">[SECURITY PASS] Lencana ensures revoked foundational credentials instantly disqualify chained advanced credentials!</div>
    `
  }
}

function resetTamperSimulator() {
  const terminal = $('tamper-terminal-body')
  const pill = $('tamper-revert-pill')
  if (pill) {
    pill.className = 'tamper-revert-pill'
    pill.textContent = 'STATUS: SYSTEM READY'
  }
  if (terminal) {
    terminal.innerHTML = `
      <div class="tamper-line">[EVM Simulator] Initialized with BSC Testnet contracts: CredentialResolver (0xe01a...) and SoulboundCert (0x96f6...).</div>
      <div class="tamper-line">[Ready] Select an attack scenario above to test on-chain cryptographic reverts.</div>
    `
  }
}

// ========================================================
// ITERATION 13: B2B RECRUITER BULK AUDIT & x402 PROTOCOL
// ========================================================
const CANDIDATE_BATCH_DATA = [
  { name: 'Rina Oktaviani', hash: '0x0b95c8...67fa', verdict: 'valid', tag: 'VALID · HONORS (93)' },
  { name: 'Dimas Pratama', hash: '0x1a82d4...41ea', verdict: 'valid', tag: 'VALID · PASS (88)' },
  { name: 'Siti Nurhaliza', hash: '0x992b11...902f', verdict: 'valid', tag: 'VALID · HONORS (95)' },
  { name: 'Budi Santoso', hash: '0xf34bdc...56f2', verdict: 'revoked', tag: 'REVOKED · BIT #42' },
  { name: 'Dewi Lestari', hash: '0x43fa21...12ab', verdict: 'valid', tag: 'VALID · PASS (85)' },
  { name: 'Andi Wijaya', hash: '0x88bb33...77cd', verdict: 'valid', tag: 'VALID · PASS (82)' },
  { name: 'Mega Rahmawati', hash: '0x4d0ffd...df1c', verdict: 'delisted', tag: 'DELISTED · BIT #87' },
  { name: 'Fajar Nugraha', hash: '0x71aa22...33ee', verdict: 'valid', tag: 'VALID · HONORS (91)' },
  { name: 'Gita Savitri', hash: '0x55cc88...99bb', verdict: 'valid', tag: 'VALID · PASS (87)' },
  { name: 'Hendra Gunawan', hash: '0x66dd44...11aa', verdict: 'valid', tag: 'VALID · PASS (84)' },
]

function renderBatchCandidatesList() {
  const container = $('batch-candidates-list')
  if (!container) return

  container.innerHTML = ''
  CANDIDATE_BATCH_DATA.forEach((cand) => {
    const item = document.createElement('div')
    item.className = 'batch-cand-item'
    item.innerHTML = `
      <div class="batch-cand-info">
        <span class="batch-cand-name">${cand.name}</span>
        <code class="batch-cand-hash">${cand.hash}</code>
      </div>
      <span class="batch-cand-verdict ${cand.verdict}">${cand.tag}</span>
    `
    container.appendChild(item)
  })
}

let isSimulatingX402 = false
function simulateX402Batch() {
  if (isSimulatingX402) return
  isSimulatingX402 = true

  const btn = $('btn-simulate-x402') as HTMLButtonElement | null
  if (btn) btn.disabled = true

  const step1 = $('xstep-1')
  const step2 = $('xstep-2')
  const step3 = $('xstep-3')
  const step4 = $('xstep-4')
  const step2Status = $('xstep-2-status')
  const step3Status = $('xstep-3-status')
  const step4Status = $('xstep-4-status')

  // Reset steps
  ;[step1, step2, step3, step4].forEach((s) => s?.classList.remove('active', 'done'))
  if (step2Status) step2Status.textContent = 'WAITING'
  if (step3Status) step3Status.textContent = 'WAITING'
  if (step4Status) step4Status.textContent = 'WAITING'

  // Step 1: Active
  step1?.classList.add('active')

  // Step 2: Gateway returns 402 Payment Required
  setTimeout(() => {
    step1?.classList.remove('active')
    step1?.classList.add('done')
    step2?.classList.add('active')
    if (step2Status) {
      step2Status.textContent = '402 CHALLENGE'
      step2Status.className = 'flow-status-pill active'
    }
  }, 350)

  // Step 3: Recruiter client signs EIP-712 micro-payment authorization
  setTimeout(() => {
    step2?.classList.remove('active')
    step2?.classList.add('done')
    if (step2Status) {
      step2Status.textContent = 'CHALLENGED'
      step2Status.className = 'flow-status-pill done'
    }
    step3?.classList.add('active')
    if (step3Status) {
      step3Status.textContent = 'SIGNED (0.0005 tBNB)'
      step3Status.className = 'flow-status-pill active'
    }
  }, 850)

  // Step 4: Batch audit completed in 118ms
  setTimeout(() => {
    step3?.classList.remove('active')
    step3?.classList.add('done')
    if (step3Status) {
      step3Status.textContent = 'SETTLED'
      step3Status.className = 'flow-status-pill done'
    }
    step4?.classList.add('done')
    if (step4Status) {
      step4Status.textContent = '200 OK (118ms)'
      step4Status.className = 'flow-status-pill done'
    }
    renderBatchCandidatesList()
    if (btn) btn.disabled = false
    isSimulatingX402 = false
  }, 1350)
}

const RINA_CREDENTIAL_JSONLD = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "urn:uuid:0b95c83b-9bd9-4923-ab29-9446e9c9fd72",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "name": "Web3 Dasar 2026: Foundations & Architecture",
  "issuer": {
    "id": "did:pkh:eip155:97:0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE",
    "type": "Profile",
    "name": "Lencana Agent-Foundations",
    "url": "https://lencana.io"
  },
  "validFrom": "2026-09-21T00:00:00Z",
  "credentialSubject": {
    "id": "did:pkh:eip155:97:0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B",
    "type": ["AchievementSubject"],
    "achievement": {
      "id": "urn:lencana:course:web3-dasar-2026",
      "type": ["Achievement"],
      "name": "Web3 Dasar 2026: Foundations & Architecture",
      "description": "Mastery of EVM state machine, Keccak256 digests, and decentralized verifiable credentials.",
      "criteria": {
        "narrative": "Completed capstone synthesis essay evaluated by autonomous AI agent against on-chain rubric #0x91a7."
      }
    }
  },
  "evidence": [{
    "id": "urn:eas:bsc-testnet:0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa",
    "type": ["AttestationEvidence"],
    "schema": "0x2c4e... (BAS Attestation Schema)",
    "score": "93/100 (Honors)"
  }],
  "proof": {
    "type": "EthereumEip712Signature2021",
    "created": "2026-09-21T00:00:00Z",
    "verificationMethod": "did:pkh:eip155:97:0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE#blockchainAccountId",
    "proofPurpose": "assertionMethod",
    "proofValue": "0x4e2...71b...1b"
  }
}

function downloadJsonLd() {
  const jsonStr = JSON.stringify(RINA_CREDENTIAL_JSONLD, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/ld+json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'rina-oktaviani-web3-dasar-credential.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function copyJsonLd() {
  const jsonStr = JSON.stringify(RINA_CREDENTIAL_JSONLD, null, 2)
  navigator.clipboard.writeText(jsonStr).then(() => {
    const btn = $('btn-copy-jsonld')
    if (btn) {
      const orig = btn.textContent
      btn.textContent = DICTIONARIES[currentLang].common.copied
      setTimeout(() => {
        btn.textContent = orig
      }, 2000)
    }
  })
}

function handleRoute() {
  const rawHash = window.location.hash || '#/'
  const hash = rawHash.toLowerCase().split('?')[0]

  let targetPageId = 'page-home'
  if (hash === '#/courses' || hash === '#courses') {
    targetPageId = 'page-courses'
  } else if (hash === '#/submit' || hash === '#ai-evaluator' || hash === '#submit') {
    targetPageId = 'page-submit'
  } else if (hash === '#/verify' || hash === '#verifier' || hash === '#verify') {
    targetPageId = 'page-verify'
  } else if (hash === '#/portfolio' || hash === '#portfolio') {
    targetPageId = 'page-portfolio'
  } else if (hash === '#/agent-hub' || hash === '#ai-agents' || hash === '#agent-hub') {
    targetPageId = 'page-agent-hub'
  } else if (hash === '#/learn' || hash.startsWith('#/course/') || hash === '#/me') {
    // Lapisan materi (src/lms.ts) menggambar di #lms-mount milik halaman courses. Route ini
    // sengaja dipakai awalan berbeda dari #/courses Dave: yang satu tokonya, yang satu isinya.
    targetPageId = 'page-courses'
  } else {
    targetPageId = 'page-home'
  }

  const pages = document.querySelectorAll<HTMLElement>('.page-view')
  pages.forEach((p) => {
    if (p.id === targetPageId) {
      p.classList.remove('hidden')
    } else {
      p.classList.add('hidden')
    }
  })

  // Gambar (atau bersihkan) lapisan materi di halaman courses. Fungsi ini tahu sendiri apakah
  // route-nya miliknya, jadi memanggilnya pada setiap route tidak akan menimpa apa pun.
  renderLmsRoute()

  const routeNavMap: Record<string, string> = {
    'page-home': 'nav-home',
    'page-courses': 'nav-courses',
    'page-submit': 'nav-submit',
    'page-verify': 'nav-verify',
    'page-portfolio': 'nav-portfolio',
    'page-agent-hub': 'nav-agent-hub',
  }

  document.querySelectorAll('.nav-links .nav-link').forEach((link) => {
    link.classList.toggle('active', link.id === routeNavMap[targetPageId])
  })

  if (hash === '#how-it-works' || hash === '#pipeline' || hash === '#architecture') {
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

function updateStaticText() {
  const dict = DICTIONARIES[currentLang]

  // Navbar
  setText('nav-home', dict.nav.home)
  setText('nav-courses', dict.nav.courses)
  setText('nav-submit', dict.nav.submit)
  setText('nav-verify', dict.nav.verifier)
  setText('nav-portfolio', dict.nav.portfolio)
  setText('nav-agent-hub', dict.nav.agentHub)

  // Hero Section
  // Kinetic Brutalist Hero Section (Iteration 9)
  setText('hero-eyebrow', dict.hero.eyebrow)
  setText('kinetic-word-1', dict.hero.kineticWord1)
  setText('kinetic-word-2', dict.hero.kineticWord2)
  setText('kinetic-word-3', dict.hero.kineticWord3)
  setText('badge-rotating-text', dict.hero.badgeText)
  setText('hero-subtitle', dict.hero.subtitle)
  setText('hero-btn-explore-text', dict.hero.btnExplore)
  setText('hero-btn-verify-text', dict.hero.btnVerify)
  setText('stat-1-val', dict.hero.statCourses)
  setText('stat-1-lbl', dict.hero.statCoursesLabel)
  setText('stat-2-val', dict.hero.statVerification)
  setText('stat-2-lbl', dict.hero.statVerificationLabel)
  setText('stat-3-val', dict.hero.statStandard)
  setText('stat-3-lbl', dict.hero.statStandardLabel)
  setText('feat-1-heading', dict.hero.feat1Heading)
  setText('feat-1-sub', dict.hero.feat1Sub)
  setText('feat-2-heading', dict.hero.feat2Heading)
  setText('feat-2-sub', dict.hero.feat2Sub)
  setText('feat-3-heading', dict.hero.feat3Heading)
  setText('feat-3-sub', dict.hero.feat3Sub)

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

  // LMS Learner Dashboard & Micro-Courses Marketplace (Iteration 8)
  setText('courses-kicker', dict.coursesSection.sectionKicker)
  setText('courses-title', dict.coursesSection.sectionTitle)
  setText('courses-sub', dict.coursesSection.sectionSub)
  setText('learner-profile-name', dict.coursesSection.learnerProfileName)
  setText('learner-sub-info', dict.coursesSection.learnerSubInfo)
  setText('privacy-label', dict.coursesSection.privacyLabel)
  setText('btn-privacy-pseudo', dict.coursesSection.privacyPseudo)
  setText('btn-privacy-named', dict.coursesSection.privacyNamed)
  setText('lms-stat-1-title', dict.coursesSection.stat1Title)
  setText('lms-stat-1-desc', dict.coursesSection.stat1Desc)
  setText('lms-stat-2-title', dict.coursesSection.stat2Title)
  setText('lms-stat-2-desc', dict.coursesSection.stat2Desc)
  setText('lms-stat-3-title', dict.coursesSection.stat3Title)
  setText('lms-stat-3-desc', dict.coursesSection.stat3Desc)
  setText('courses-list-heading', dict.coursesSection.availableHeading)
  setText('courses-count-tag', dict.coursesSection.activeCoursesTag)
  setText('c1-badge-lvl', dict.coursesSection.badgeLevelBeginner)
  setText('c1-badge-sbt', dict.coursesSection.badgeSoulbound)
  setText('c1-badge-unlocked', dict.coursesSection.badgeUnlocked)
  setText('c1-title', dict.coursesSection.course1Title)
  setText('c1-desc', dict.coursesSection.course1Desc)
  setText('c1-agent', `${dict.coursesSection.courseIssuerAgent}: Agent-Foundations`)
  setText('btn-open-study-c1', dict.coursesSection.btnOpenStudy)
  setText('c2-badge-lvl', dict.coursesSection.badgeLevelAdvanced)
  setText('c2-badge-prereq', dict.coursesSection.badgePrereqRequired)
  setText('c2-title', dict.coursesSection.course2Title)
  setText('c2-desc', dict.coursesSection.course2Desc)
  setText('c2-agent', `${dict.coursesSection.courseIssuerAgent}: Agent-Security`)
  setText('btn-open-study-c2', dict.coursesSection.btnOpenStudy)
  setText('study-modal-kicker', dict.coursesSection.studyModalKicker)
  setText('btn-study-proceed-eval', dict.coursesSection.studyModalProceed)

  // Re-apply privacy mode labels and re-render study modal if active
  setPrivacyMode(privacyMode)
  renderStudyModal()

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

  // Portfolio Section (Iteration 10)
  setText('portfolio-kicker', dict.portfolioSection.kicker)
  setText('portfolio-title', dict.portfolioSection.title)
  setText('portfolio-sub', dict.portfolioSection.sub)
  setText('btn-tier-1', dict.portfolioSection.privacyTier1Label)
  setText('btn-tier-2', dict.portfolioSection.privacyTier2Label)
  setText('btn-tier-3', dict.portfolioSection.privacyTier3Label)
  setText('portfolio-privacy-warning', dict.portfolioSection.privacyWarning)
  setText('portfolio-badges-heading', dict.portfolioSection.badgesHeading)
  setText('portfolio-b1-title', dict.portfolioSection.badge1Title)
  setText('portfolio-b1-desc', dict.portfolioSection.badge1Desc)
  setText('portfolio-b2-title', dict.portfolioSection.badge2Title)
  setText('portfolio-b2-desc', dict.portfolioSection.badge2Desc)
  setText('btn-copy-jsonld', dict.common.copy)
  setText('btn-verify-rina-badge', `${dict.inputSection.btnVerify} On-Chain ➔`)
  setText('btn-open-diploma-modal', dict.portfolioSection.btnViewDiploma)
  setText('btn-portfolio-linkedin', dict.portfolioSection.btnShareLinkedIn)
  setText('btn-portfolio-x', dict.portfolioSection.btnShareX)
  setText('btn-portfolio-embed', dict.portfolioSection.btnEmbed)
  setPortfolioPrivacyTier(portfolioPrivacyTier)

  // Agent Governance Hub Section (Iteration 11 & 12)
  setText('agent-hub-kicker', dict.agentHubSection.kicker)
  setText('agent-hub-title', dict.agentHubSection.title)
  setText('agent-hub-sub', dict.agentHubSection.sub)
  setText('agent-hub-agents-heading', dict.agentHubSection.agentsHeading)
  setText('agent-hub-revocation-heading', dict.agentHubSection.revocationHeading)
  setText('agent-hub-revocation-sub', dict.agentHubSection.revocationSub)
  setText('btn-hub-test-revoke', dict.agentHubSection.btnTestRevoke)
  setText('agent-hub-delist-heading', dict.agentHubSection.delistHeading)
  setText('agent-hub-delist-sub', dict.agentHubSection.delistSub)
  setText('btn-hub-test-delist', dict.agentHubSection.btnTestDelist)
  setText('bitstring-heading', dict.agentHubSection.bitstringHeading)
  setText('bitstring-sub', dict.agentHubSection.bitstringSub)
  setText('bit-leg-valid', dict.agentHubSection.bitLegendValid)
  setText('bit-leg-revoked', dict.agentHubSection.bitLegendRevoked)
  setText('bit-leg-suspended', dict.agentHubSection.bitLegendSuspended)
  setText('btn-toggle-bitstring-text', dict.agentHubSection.btnToggleBit)
  setText('bitstring-encoded-lbl', dict.agentHubSection.liveMultibaseLabel)

  // Wallet Navbar & Modal
  setText('btn-wallet-text', dict.wallet.connectBtn)
  setText('wallet-modal-title', dict.wallet.modalTitle)
  setText('wallet-modal-sub', dict.wallet.modalSub)
  setText('wallet-opt-browser-title', dict.wallet.browserOption)
  setText('wallet-opt-browser-desc', dict.wallet.browserOptionSub)
  setText('wallet-opt-demo-title', dict.wallet.demoOption)
  setText('wallet-opt-demo-desc', dict.wallet.demoOptionSub)
  renderWalletState()

  // Mint Celebration Modal
  setText('mint-modal-title', dict.mintModal.title)
  setText('mint-modal-sub', dict.mintModal.sub)
  setText('mint-tag-sbt', dict.mintModal.sbtBadge)
  setText('mint-tag-honors', dict.mintModal.honorsTag)
  setText('mint-tag-gasless', dict.mintModal.gaslessTag)
  setText('btn-mint-goto-verify', dict.mintModal.btnVerify)
  setText('btn-mint-goto-portfolio', dict.mintModal.btnPortfolio)
  setText('btn-close-mint-modal', dict.mintModal.btnClose)

  // Executive Printable Diploma Modal (Iteration 12)
  setText('diploma-toolbar-kicker', dict.diplomaModal.kicker)
  setText('btn-print-diploma-text', dict.diplomaModal.btnPrint)
  setText('btn-diploma-linkedin-text', dict.diplomaModal.btnLinkedIn)
  setText('btn-diploma-x-text', dict.diplomaModal.btnX)
  setText('diploma-presented-to', dict.diplomaModal.presentedTo)
  setText('diploma-completion-text', dict.diplomaModal.completionText)
  setText('diploma-course-title', dict.diplomaModal.courseTitle)
  setText('diploma-criteria-text', dict.diplomaModal.criteriaText)
  setText('diploma-issuer-heading', dict.diplomaModal.issuerHeading)
  setText('diploma-issuer-agent', dict.diplomaModal.issuerAgentName)
  setText('diploma-evaluator-meta', dict.diplomaModal.evaluatorMeta)
  setText('diploma-anchor-heading', dict.diplomaModal.anchorHeading)
  setText('diploma-qr-caption', dict.diplomaModal.qrCaption)

  // Tamper & Forgery Defense Playground (Iteration 13)
  setText('tamper-kicker', dict.tamperPlayground.kicker)
  setText('tamper-title', dict.tamperPlayground.title)
  setText('tamper-sub', dict.tamperPlayground.sub)
  setText('btn-reset-tamper-text', dict.tamperPlayground.resetBtn)
  setText('tcard-title-1', dict.tamperPlayground.attack1Title)
  setText('tcard-desc-1', dict.tamperPlayground.attack1Desc)
  setText('btn-attack-1', dict.tamperPlayground.attack1Btn)
  setText('tcard-title-2', dict.tamperPlayground.attack2Title)
  setText('tcard-desc-2', dict.tamperPlayground.attack2Desc)
  setText('btn-attack-2', dict.tamperPlayground.attack2Btn)
  setText('tcard-title-3', dict.tamperPlayground.attack3Title)
  setText('tcard-desc-3', dict.tamperPlayground.attack3Desc)
  setText('btn-attack-3', dict.tamperPlayground.attack3Btn)
  setText('tcard-title-4', dict.tamperPlayground.attack4Title)
  setText('tcard-desc-4', dict.tamperPlayground.attack4Desc)
  setText('btn-attack-4', dict.tamperPlayground.attack4Btn)
  setText('tamper-terminal-title', dict.tamperPlayground.terminalTitle)

  // B2B Recruiter Bulk Audit & x402 Protocol (Iteration 13)
  setText('x402-kicker', dict.x402Console.kicker)
  setText('x402-title', dict.x402Console.title)
  setText('x402-sub', dict.x402Console.sub)
  setText('btn-simulate-x402-text', dict.x402Console.btnSimulateBatch)
  setText('x402-philosophy-kicker', dict.x402Console.philosophyKicker)
  setText('x402-philosophy-text', dict.x402Console.philosophyText)
  setText('xstep-1-name', dict.x402Console.step1Label)
  setText('xstep-2-name', dict.x402Console.step2Label)
  setText('xstep-3-name', dict.x402Console.step3Label)
  setText('xstep-4-name', dict.x402Console.step4Label)
  setText('x402-candidates-audited', dict.x402Console.candidatesAudited)

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

  $('btn-hero-recruiter-check')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.valid
    run()
    document.getElementById('verifier')?.scrollIntoView({ behavior: 'smooth' })
  })

  // LMS Study Room & Course Catalog Interactions (Iteration 8)
  $('btn-open-study-c1')?.addEventListener('click', () => {
    openStudyModal('c1', 0)
  })

  $('btn-open-study-c2')?.addEventListener('click', () => {
    openStudyModal('c2', 0)
  })

  $('btn-close-study-modal')?.addEventListener('click', closeStudyModal)
  $('study-modal-backdrop')?.addEventListener('click', closeStudyModal)

  $('tab-mod-1')?.addEventListener('click', () => setStudyModule(0))
  $('tab-mod-2')?.addEventListener('click', () => setStudyModule(1))
  $('tab-mod-3')?.addEventListener('click', () => setStudyModule(2))

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStudyModal()
      closeWalletModal()
      closeMintModal()
      closeDiplomaModal()
    }
  })

  // Privacy Mode Toggle
  $('btn-privacy-pseudo')?.addEventListener('click', () => setPrivacyMode('pseudo'))
  $('btn-privacy-named')?.addEventListener('click', () => setPrivacyMode('named'))

  // AI Evaluation Preset Tabs
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  const tabWeb3 = $('tab-essay-web3')
  const tabSec = $('tab-essay-security')
  const tabCust = $('tab-essay-custom')

  function selectEssayTab(tab: HTMLElement | null, text: string) {
    ;[tabWeb3, tabSec, tabCust].forEach((t) => t?.classList.remove('active'))
    tab?.classList.add('active')
    if (essayInput) {
      essayInput.value = text
      updateEssayWordCount()
    }
  }

  tabWeb3?.addEventListener('click', () => selectEssayTab(tabWeb3, ESSAY_PRESETS.web3))
  tabSec?.addEventListener('click', () => selectEssayTab(tabSec, ESSAY_PRESETS.security))
  tabCust?.addEventListener('click', () => selectEssayTab(tabCust, ESSAY_PRESETS.custom))
  essayInput?.addEventListener('input', updateEssayWordCount)
  essayInput?.addEventListener('scroll', () => {
    const gutter = $('eval-gutter')
    if (gutter && essayInput) {
      gutter.scrollTop = essayInput.scrollTop
    }
  })

  // Proceed from Study Room to AI Evaluator
  $('btn-study-proceed-eval')?.addEventListener('click', () => {
    closeStudyModal()
    if (currentCourseId === 'c1') {
      selectEssayTab(tabWeb3, ESSAY_PRESETS.web3)
    } else {
      selectEssayTab(tabSec, ESSAY_PRESETS.security)
    }
    window.location.hash = '#/submit'
  })

  // AI Evaluation Trigger Button
  $('btn-run-ai-eval')?.addEventListener('click', () => {
    simulateAiEvaluation()
  })

  // Verify Generated Eval Button
  $('btn-verify-generated-eval')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.valid
    run()
  })

  // Portfolio Page interactions (Iteration 10)
  $('btn-tier-1')?.addEventListener('click', () => setPortfolioPrivacyTier(1))
  $('btn-tier-2')?.addEventListener('click', () => setPortfolioPrivacyTier(2))
  $('btn-tier-3')?.addEventListener('click', () => setPortfolioPrivacyTier(3))

  $('btn-verify-rina-badge')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.valid
    run()
  })

  $('btn-download-jsonld')?.addEventListener('click', downloadJsonLd)
  $('btn-copy-jsonld')?.addEventListener('click', copyJsonLd)

  // Agent Governance Hub interactions (Iteration 11)
  $('btn-hub-test-revoke')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.revoked
    run()
  })

  $('btn-hub-test-delist')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.delisted
    run()
  })

  // Client-side Hash Router Listener
  window.addEventListener('hashchange', handleRoute)

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

  // Wallet Navbar & Modal Wiring
  $('btn-connect-wallet')?.addEventListener('click', openWalletModal)
  $('btn-close-wallet-modal')?.addEventListener('click', closeWalletModal)
  $('wallet-modal-backdrop')?.addEventListener('click', closeWalletModal)
  $('btn-opt-browser-wallet')?.addEventListener('click', connectBrowserWallet)
  $('btn-opt-demo-wallet')?.addEventListener('click', connectDemoWallet)
  $('btn-disconnect-wallet')?.addEventListener('click', disconnectWallet)

  // Celebratory Mint Modal Wiring
  $('btn-close-mint-modal')?.addEventListener('click', closeMintModal)
  $('mint-modal-backdrop')?.addEventListener('click', closeMintModal)
  $('btn-mint-goto-verify')?.addEventListener('click', () => {
    closeMintModal()
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.valid
    run()
  })
  $('btn-mint-goto-portfolio')?.addEventListener('click', () => {
    closeMintModal()
    window.location.hash = '#/portfolio'
  })

  // Executive Diploma Modal Wiring (Iteration 12)
  $('btn-open-diploma-modal')?.addEventListener('click', openDiplomaModal)
  $('btn-close-diploma-modal')?.addEventListener('click', closeDiplomaModal)
  $('diploma-modal-backdrop')?.addEventListener('click', closeDiplomaModal)
  $('btn-print-diploma')?.addEventListener('click', () => window.print())
  $('btn-diploma-linkedin')?.addEventListener('click', shareOnLinkedIn)
  $('btn-portfolio-linkedin')?.addEventListener('click', shareOnLinkedIn)
  $('btn-diploma-x')?.addEventListener('click', shareOnX)
  $('btn-portfolio-x')?.addEventListener('click', shareOnX)
  $('btn-portfolio-embed')?.addEventListener('click', copyEmbedCode)

  // Bitstring Status List Simulation Wiring (Iteration 12)
  $('btn-toggle-bitstring')?.addEventListener('click', toggleBitstringState)

  // Tamper & Forgery Defense Playground Wiring (Iteration 13)
  $('btn-attack-1')?.addEventListener('click', () => simulateAttack(1))
  $('btn-attack-2')?.addEventListener('click', () => simulateAttack(2))
  $('btn-attack-3')?.addEventListener('click', () => simulateAttack(3))
  $('btn-attack-4')?.addEventListener('click', () => simulateAttack(4))
  $('btn-reset-tamper')?.addEventListener('click', resetTamperSimulator)

  // B2B Recruiter Bulk Audit & x402 Protocol Wiring (Iteration 13)
  $('btn-simulate-x402')?.addEventListener('click', simulateX402Batch)
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

    // Iteration 11: Trigger holographic credential mint celebration modal
    setTimeout(() => {
      openMintModal()
    }, 700)
  }, 1600)
}

function boot() {
  initWalletState()
  initBitstringMatrix()
  renderBatchCandidatesList()
  wire()
  updateStaticText()
  paintConfig()
  paintBanner()

  // Initialize default essay text & token counters
  const essayInput = $('essay-input') as HTMLTextAreaElement | null
  if (essayInput && !essayInput.value) {
    essayInput.value = ESSAY_PRESETS.web3
  }
  updateEssayWordCount()

  const params = new URLSearchParams(location.search)
  const langParam = params.get('lang')
  if (langParam === 'en' || langParam === 'id') {
    setLanguage(langParam)
  }

  // Activate client-side route
  handleRoute()

  const q = params.get('q')
  if (q) {
    inputEl.value = q
    run()
  } else {
    outEl.innerHTML = renderEmpty(currentLang)
  }
}

boot()

