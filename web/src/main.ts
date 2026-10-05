
// Lencana-B94 status=SELESAI 2026-09-29 — tombol berbagi/panel tidak pernah menyerahkan dokumen karangan; bentuk saja diberi label bentuk-saja. Buktikan ulang: npm run probe. JANGAN dibalik/diulang tanpa membuka kembali baris B94 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B102 status=SELESAI 2026-09-30 — spesimen delisted/expired sekarang ADA dan diukur (hash-nya di T26); tombol delisted BELUM dipasang lagi — itu pekerjaan FE. Kalau dipasang, isi hanya dengan hash yang dicetak check:samples untuk label itu, JANGAN dokumen lain supaya tombol hidup. Buktikan ulang: npm run check:samples. JANGAN dibalik/diulang tanpa membuka kembali baris B102 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B50 status=SELESAI 2026-09-29 — kredensial yang TERSAJE di halaman kita sekarang tidak sama bentuknya dengan kredensial yang LOLOS validator. Untuk juri yang membuka "lihat dokumen", yang ia salin/ung Buktikan ulang: lihat baris B50 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B50 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B68 status=SELESAI 2026-09-29 — front-end (builder mengizinkan penyuntingan 28 Sep) Buktikan ulang: lihat baris B68 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B68 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B139 status=SELESAI 2026-10-03 — UI lama yang mati (dok demo, landing lama, #page-courses/#page-submit/#page-portfolio + tiga modalnya) dan kode yang hanya melayaninya dibuang dari berkas ini; Verifier, Trust Center, Publishers, spec matrix tetap. Buktikan ulang: cd web && npx tsc --noEmit -p . && npm run probe, lalu uji T67. JANGAN dibalik/diulang tanpa membuka kembali baris B139 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { verify, type Endpoint, type Report } from './verify'
import { renderEmpty, renderReport } from './render'
import { runSpecAudit, specRowsHtml } from './specAudit'
import { loadEndpoint, saveEndpoint, PRESETS, isConfigured } from './config'
import { getSavedLanguage, saveLanguage, DICTIONARIES, type Lang } from './i18n'
// B105 — halaman `#/publishers` membaca registri penerbit dari manifest, bukan dari angka yang
// diketik ke HTML: kalau kursus atau penerbitnya bertambah, halamannya ikut berubah sendiri.
import { MANIFESTS, rubricHashOf, shortHash } from './manifest'
// FE7: rute lama lapisan belajar dipetakan ke ruang kelas (pages/class.ts) — lihat handleRoute.
import { legacyLearnRoute } from './lesson-views'
import {
  learnerAddress,
  forgetLearner,
  hasExplicitLearnerSession,
  syncCourse,
  snapshot,
} from './learning'
import { initLogin, openLogin, completeGoogleReturn } from './pages/login'
import { needsOnboarding } from './pages/dashboard'
// B126: pita pemuatan mengikuti setiap permintaan jaringan (penerbit, RPC chain, login); chip saldo di navbar.
import { installFetchTracking } from './lib/loading'
import { syncNavBalance } from './balance'
import { loadPublishedCourses } from './catalog-live'
import { mountMobileNav } from './nav-mobile'
// B150: halaman publik di layar HP (kartu Trust Center/Penerbit, tanda geser matriks Verifier) — tanpa menyunting style.css.
import './mobile.css'
// B152: service worker untuk aplikasi yang bisa dipasang (hanya build produksi).
import { registerServiceWorker } from './pwa'

installFetchTracking()
registerServiceWorker()

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
/**
 * Contoh cepat di halaman verifier. Setiap nilai di sini **diukur**, bukan diingat:
 * `npm run check:samples` (29 Sep) menyodok tepi untuk tiap dokumen yang kita terbitkan dan
 * membandingkannya dengan `statusOf` di resolver. Hasilnya: 19 dokumen, semuanya 200 di tepi,
 * 13 valid, 6 revoked — dan NOL yang expired atau delisted.
 *
 * Yang dibuang karena itu:
 *  - `valid` lama (0x0b95c83b…) sah di chain tapi dokumennya 404 di tepi: tombol "contoh sah"
 *    mengirim orang ke NOT_FOUND;
 *  - `delisted` (0x4d0ffdf3…) — tidak ada satu pun kredensial delisted yang bisa ditunjukkan,
 *    jadi tombolnya dicabut, bukan diisi dokumen yang tidak cocok dengan labelnya (B102).
 * Catatan 30 Sep: angka "19 dokumen, NOL expired/delisted" di atas adalah pembacaan 29 Sep. Sejak
 * B102 ditutup `check:samples` mencetak 21 dokumen dengan 1 expired (0x202f8edf…) dan 1 delisted
 * (0xaa379627…); tombolnya belum dipasang lagi di sini.
 * `format` sekarang benar-benar rusak bentuknya; dulu ia hash 32 byte yang sah, jadi demo
 * "format salah" justru menghasilkan "tidak ditemukan".
 */
const SAMPLE_HASHES = {
  valid: '0xd0bce6f402e437e4bcc32ddc3d305c5b6b7079b7c4473f6c5625a8183bf7930e',
  revoked: '0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2',
  // 2 Okt (D59): dipasang lagi untuk tombol Trust Center yang sebelumnya "Simulate Delisting" tanpa handler;
  // spesimen B102, diadili check:samples (delisted di chain, 200 di tepi).
  delisted: '0xaa379627438fb47b6a6c2a5fefc421d26f3168ce941e82c19a591c773d849c0f',
  format: '0x123',
}
// Kartu kredensial di hero landing menunjuk sampel "valid" yang sama — satu sumber, diadili check:samples.
setHeroCredential(SAMPLE_HASHES.valid)

/**
 * Tempat dokumen kredensial kita BENAR-BENAR disajikan: Worker + KV yang diisi
 * `npm run publish:edge`, dan satu-satunya host yang terbukti menjawab hari ini
 * (`npm run verify:edge` → 19 dari 19 kertas terbaca publik).
 */
export const CREDENTIAL_HOST = 'https://lencana-edge.hansgunawan775.workers.dev'

/**
 * Tempat halaman ini benar-benar dibuka orang (Vercel) — diukur 29 Sep: HTTP 200.
 * Bukan "lencana.io": domain itu tidak pernah kita pegang dan dns.resolve-nya ENOTFOUND (A dan AAAA).
 */
export const APP_HOST = 'https://lencana-psi.vercel.app'

/** Kredensial yang dipakai tombol berbagi — hash demo yang sama dengan yang di panel verifier. */
/**
 * Yang dibagikan harus kredensial yang bisa dibuka penerimanya.
 *
 * SAMPLE_HASHES.valid (0x0b95c83b…) sah di chain tapi GET /credentials/-nya di tepi menjawab 404 —
 * dokumennya tidak pernah diterbitkan ke tepi, jadi membagikannya = mengirim orang ke NOT_FOUND.
 * 0x06be529b… terukur: ada di chain, tidak revoked/expired/delisted, dan 200 dari tepi.
 */
const SHARE_CREDENTIAL_HASH = '0x06be529b10cba234c70fb7e522d2f251cc69b7527d8cf33c68f086ad5c9125a7'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface WalletState {
  isConnected: boolean
  address: string | null
}

let walletState: WalletState = {
  isConnected: false,
  address: null,
}

function initWalletState() {
  // D59: hanya akun (login Google/email) yang membuka halaman internal; identitas lain yang tersisa di tab ini dilepas.
  if (!hasExplicitLearnerSession()) {
    if (learnerAddress()) forgetLearner()
    try { sessionStorage.removeItem('lencana_wallet') } catch { /* storage may be unavailable */ }
    walletState = { isConnected: false, address: null }
    renderWalletState()
    return
  }
  const addr = learnerAddress()
  walletState = { isConnected: Boolean(addr), address: addr }
  renderWalletState()
}

function renderWalletState() {
  const connectBtn = $('btn-connect-wallet')
  const connectedPill = $('wallet-connected-pill')
  const addrDisplay = $('wallet-address-display')
  const effectiveAddress = hasExplicitLearnerSession() ? learnerAddress() || walletState.address : null
  const studentLinks = document.querySelectorAll('.student-only')

  if (effectiveAddress) {
    connectBtn?.classList.add('hidden')
    connectedPill?.classList.remove('hidden')
    studentLinks.forEach((el) => el.classList.remove('hidden'))
    // Orang mengenali akunnya dari email, bukan dari alamat dompet.
    const email = snapshot().identity?.email
    if (addrDisplay) addrDisplay.textContent = email || `${effectiveAddress.slice(0, 6)}...${effectiveAddress.slice(-4)}`
    // Layar sempit menyembunyikan teks pil (navbar satu baris); identitasnya tetap terbaca lewat tooltip.
    connectedPill?.setAttribute('title', email || effectiveAddress)
  } else {
    connectBtn?.classList.remove('hidden')
    connectedPill?.classList.add('hidden')
    studentLinks.forEach((el) => el.classList.add('hidden'))
  }
  syncNavBalance(Boolean(effectiveAddress))
  updateLearnerNavigation()
}

const learnerRouteLinkState = new WeakMap<HTMLAnchorElement, {
  hidden: boolean
  ariaHidden: string | null
  tabIndex: string | null
}>()

function isProtectedRouteHref(href: string): boolean {
  const marker = href.indexOf('#')
  if (marker < 0) return false
  const hash = href.slice(marker).toLowerCase().split('?')[0]
  if (hash === '#/' || hash === '#') return false
  if (hash === '#/onboarding' || hash === '#onboarding' || hash === '#/login' || hash === '#login') return false
  // Verifier publik — sama seperti guard rute: tautan "Check Proof" tetap tampil untuk tamu.
  if (hash === '#/verify' || hash === '#verifier' || hash === '#verify') return false
  // FE7: halaman transparansi juga publik — registri penerbit (B105) dan Trust & Limits (landing menautkannya).
  if (hash === '#/publishers' || hash === '#publishers' || hash === '#/agent-hub' || hash === '#agent-hub' || hash === '#ai-agents') return false
  // RF7 A2: halaman detail kursus publik — tautannya tetap tampil untuk tamu.
  if (/^#\/course\/[^/]+$/.test(hash)) return false
  if (hash.startsWith('#/')) return true
  return ['#courses', '#learn', '#course', '#submit', '#ai-evaluator', '#verifier', '#verify',
    '#portfolio', '#ai-agents', '#agent-hub'].includes(hash)
}

/** Navigation follows the same explicit session signal as the route guard. */
function updateLearnerNavigation(): void {
  const authenticated = hasExplicitLearnerSession()
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (!isProtectedRouteHref(anchor.getAttribute('href') ?? '')) return
    if (!learnerRouteLinkState.has(anchor)) {
      learnerRouteLinkState.set(anchor, {
        hidden: anchor.classList.contains('hidden') || anchor.hidden,
        ariaHidden: anchor.getAttribute('aria-hidden'),
        tabIndex: anchor.getAttribute('tabindex'),
      })
    }
    const original = learnerRouteLinkState.get(anchor)!
    if (!authenticated) {
      anchor.classList.add('hidden')
      anchor.hidden = true
      anchor.setAttribute('aria-hidden', 'true')
      anchor.tabIndex = -1
    } else {
      anchor.classList.toggle('hidden', original.hidden)
      anchor.hidden = original.hidden
      if (original.ariaHidden === null) anchor.removeAttribute('aria-hidden')
      else anchor.setAttribute('aria-hidden', original.ariaHidden)
      if (original.tabIndex === null) anchor.removeAttribute('tabindex')
      else anchor.setAttribute('tabindex', original.tabIndex)
    }
  })
}

/** Sesudah login (email atau Google, D59): kembali ke kursus yang dituju, atau ke dashboard. */
async function onSignedIn(address: string) {
  walletState = { isConnected: true, address }
  renderWalletState()
  // Login pertama akun ini di peramban ini: onboarding dulu (RF7 A2). Kursus yang dituju tetap diingat di sessionStorage.
  if (needsOnboarding(address)) {
    window.location.hash = '#/app/welcome'
    return
  }
  const pendingTarget = sessionStorage.getItem('lencana_enroll_target')
  if (pendingTarget) {
    sessionStorage.removeItem('lencana_enroll_target')
    try {
      await syncCourse(pendingTarget)
    } catch (err) {
      console.warn('Sync enrollment error:', err)
    }
    // B125: kursus berbayar dibayar di halaman kursus; yang gratis/sudah diikuti langsung punya tombol "mulai belajar" di sana.
    window.location.hash = `#/course/${encodeURIComponent(pendingTarget)}`
  } else {
    window.location.hash = '#/app'
  }
}

function disconnectWallet() {
  forgetLearner()
  walletState = { isConnected: false, address: null }
  sessionStorage.removeItem('lencana_wallet')
  sessionStorage.removeItem('lencana_enroll_target')
  renderWalletState()
  handleRoute()
}

import { mountNewApp } from './new-app'
import { setHeroCredential } from './pages/landing'

function handleRoute() {
  const rawHash = window.location.hash || '#/'
  let hash = rawHash.toLowerCase().split('?')[0]

  // Rute lama lapisan belajar (`#/learn`, `#/course/…`) → ruang kelas. `#/course/<id>/l/<slug>`
  // menunjuk lesson yang SAMA, bukan modul bernama "l" (FE7).
  const legacy = legacyLearnRoute(hash)
  if (legacy) {
    window.location.hash = legacy
    return
  }
  // D59: studio esai tiruan dan portofolio fiktif bukan halaman lagi; #/me lama menjadi dashboard (RF7 A2).
  if (['#/submit', '#submit', '#ai-evaluator', '#/portfolio', '#portfolio', '#/me'].includes(hash)) {
    window.location.hash = '#/app'
    return
  }

  const isPrivyOnboard = hash === '#/onboarding' || hash === '#onboarding' || hash === '#/login' || hash === '#login'
  const isHomeAnchor = hash === '#how-it-works' || hash === '#pipeline' || hash === '#architecture'
  const isHomeRoute = hash === '#/' || hash === '#' || hash === ''
  const isCatalog = hash === '#/courses' || hash === '#courses' || hash === '#catalog'
  // Verifier adalah utilitas PUBLIK (bukan rute learner): bukti dibagikan lewat tautan,
  // diperiksa orang asing tanpa akun, dan kapsul hero + Scene 1 mengarah ke sini. Bukan
  // pengecualian untuk LMS — semua rute learner di bawah tetap terkunci untuk tamu.
  const isPublicVerify = hash === '#/verify' || hash === '#verifier' || hash === '#verify'
  // B105: registri penerbit juga informasi publik (dibaca dari manifest), bukan rute learner.
  const isPublicPublishers = hash === '#/publishers' || hash === '#publishers'
  // FE7: Trust & Limits juga halaman transparansi — landing menautkannya untuk tamu.
  const isPublicTrust = hash === '#/agent-hub' || hash === '#agent-hub' || hash === '#ai-agents'
  // RF7 A2: detail kursus (silabus, aturan penilaian) publik; isi kelasnya tidak.
  const isPublicCourse = /^#\/course\/[^/]+$/.test(hash)
  if (!hasExplicitLearnerSession() && !isHomeRoute && !isHomeAnchor && !isCatalog && !isPrivyOnboard && !isPublicVerify && !isPublicPublishers && !isPublicTrust && !isPublicCourse) {
    // Rute peserta tanpa sesi: HTML yang dilindungi tidak pernah tampil (fe-integration), kursus
    // tujuannya diingat, dan modal masuk dibuka (ui) supaya tamu tahu kenapa ia kembali ke beranda.
    const attempted = hash
    const target = attempted.startsWith('#/class/') ? decodeURIComponent(attempted.split('/')[2] ?? '') : ''
    if (target) sessionStorage.setItem('lencana_enroll_target', target)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#/`)
    hash = '#/'
    if (/^#\/(class\/|me$|app)/.test(attempted)) openLogin({ guarded: true })
  }
  updateLearnerNavigation()

  const isLms = hash.startsWith('#/class/') || hash === '#/me' || hash === '#/app' || hash.startsWith('#/app/')
  let targetPageId = 'page-new-app'
  if (isHomeRoute || isCatalog || isLms) {
    targetPageId = 'page-new-app'
  } else if (isPrivyOnboard) {
    targetPageId = 'page-new-app'
    openLogin()
  } else if (hash === '#/verify' || hash === '#verifier' || hash === '#verify') {
    targetPageId = 'page-verify'
  } else if (hash === '#/agent-hub' || hash === '#ai-agents' || hash === '#agent-hub') {
    targetPageId = 'page-agent-hub'
  } else if (hash === '#/publishers' || hash === '#publishers') {
    targetPageId = 'page-publishers'
  } else {
    targetPageId = 'page-new-app'
  }

  if (targetPageId === 'page-new-app') {
    mountNewApp(hash)
  }

  document.body.classList.toggle('is-home-page', targetPageId === 'page-new-app')

  const pages = document.querySelectorAll<HTMLElement>('.page-view')
  pages.forEach((p) => {
    if (p.id === targetPageId) {
      p.classList.remove('hidden')
    } else {
      p.classList.add('hidden')
    }
  })

  const isClassRoute = hash.startsWith('#/class/')
  const globalHeader = document.querySelector('header.app-navbar') as HTMLElement;
  if (isClassRoute) {
    if (globalHeader) globalHeader.classList.add('force-hidden');
  } else {
    if (globalHeader) globalHeader.classList.remove('force-hidden');
  }

  const routeNavMap: Record<string, string> = {
    'page-new-app': 'nav-home',
    'page-verify': 'nav-verify',
    'page-agent-hub': 'nav-agent-hub',
    'page-publishers': 'nav-publishers',
  }

  document.querySelectorAll('.nav-links .nav-link').forEach((link) => {
    if (isLms) {
      link.classList.toggle('active', link.id === 'nav-dashboard')
    } else {
      link.classList.toggle('active', link.id === routeNavMap[targetPageId])
    }
  })

  if (hash === '#how-it-works' || hash === '#pipeline' || hash === '#architecture') {
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

// Lencana-B105 status=TERBUKA — halaman #/publishers baca-saja SUDAH ada: registri penerbit diturunkan dari MANIFESTS saat runtime (bukan diketik ke HTML) dan kalimat onboarding-nya mengakui custody hari ini di kedua bahasa. Yang BELUM: barisnya menuntut data dari `GET /issuers` yang hidup, jumlah kredensial, dan status allowlist dibaca dari chain — ketiganya belum ada di sini, jadi marker ini TERBUKA. Buktikan ulang: cd web && npm run probe (9 asersi registri penerbit). JANGAN dibalik/diulang tanpa membuka kembali baris B105 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * B105 — registri penerbit baca-saja. Setiap nilainya diturunkan dari `MANIFESTS` saat digambar:
 * nama penerbit, URL dokumen penerbitnya (registri kunci publik), alamat allowlist di chain, dan
 * `rubricHash` tiap kursus yang dihitung ulang di tempat. Jadi halaman ini tidak bisa basi terhadap
 * datanya sendiri, dan tidak ada satu angka pun yang diketik ke HTML.
 *
 * Yang juga sengaja ditaruh di sini: kalimat onboarding yang mengakui keadaan custody hari ini.
 * Tanpa itu, "penerbit menandatangani sendiri" terbaca sebagai sesuatu yang sudah kami punya,
 * padahal kunci agen demo masih tinggal di mesin platform (B87 jalur 3 belum dibangun).
 */
function renderPublishers() {
  const p = DICTIONARIES[currentLang].publishersSection
  const mount = $('publishers-mount')
  const onboarding = $('publishers-onboarding')
  if (!mount || !onboarding) return

  // Dikelompokkan per penerbit: yang dibaca orang adalah "siapa menerbitkan apa", bukan daftar
  // kursus yang mengulang nama penerbitnya.
  const perSlug = new Map<string, { name: string; controllerUrl: string; eoa?: string; courses: typeof MANIFESTS }>()
  for (const m of MANIFESTS) {
    const grup = perSlug.get(m.issuer.slug) ?? { name: m.issuer.name, controllerUrl: m.issuer.controllerUrl, eoa: m.issuer.eoa, courses: [] }
    grup.courses.push(m)
    perSlug.set(m.issuer.slug, grup)
  }

  const tag = $('publishers-count')
  if (tag) tag.textContent = `${perSlug.size} publisher · ${MANIFESTS.length} manifest`

  mount.innerHTML = [...perSlug.entries()].map(([slug, g]) => {
    // Dokumen penerbit yang bisa dibuka siapa pun adalah yang disajikan TEPI, bukan `controllerUrl`
    // di manifest demo: yang itu host loopback (127.0.0.1:8787) dan hanya menjawab di mesin yang
    // menjalankan signer. Menampilkannya sebagai satu-satunya tautan berarti menyodorkan tautan mati
    // ke orang yang membaca halaman ini dari tempat lain — jadi keduanya ditampilkan, dan yang
    // loopback dinamai apa adanya alih-alih disembunyikan.
    //
    // Yang TIDAK boleh dilakukan: menurunkan URL publik dari slug manifest. Sudah dicoba dan diukur
    // oleh `npm run probe`: `${CREDENTIAL_HOST}/issuers/yayasan-nusantara` menjawab **404**, karena
    // tepi menyajikan dokumen per slug AGEN (agent-edge / agent-b41 / agent-demo), dan pemetaan
    // penerbit -> agen tidak ada di manifest. Menebaknya berarti memasang tautan mati kedua.
    // Yang ditampilkan adalah dokumen agen platform yang hari ini benar-benar menandatangani —
    // dan itu justru bukti visual dari pengakuan custody di bawah, bukan sesuatu yang perlu ditutupi.
    const publik = `${CREDENTIAL_HOST}/issuers/agent-edge`
    const loopback = /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/)/.test(g.controllerUrl)
    return `
    <div class="agent-card">
      <div class="agent-card-top">
        <h4>${escapeHtml(g.name)}</h4>
      </div>
      <p class="section-sub"><strong>slug</strong> ${escapeHtml(slug)}</p>
      <p class="section-sub"><strong>${escapeHtml(p.eoaLabel)}</strong> ${g.eoa ? escapeHtml(g.eoa) : escapeHtml(p.noEoa)}</p>
      <p class="section-sub"><strong>${escapeHtml(p.publicDocLabel)}</strong>
        <a href="${escapeHtml(publik)}" target="_blank" rel="noreferrer noopener">${escapeHtml(publik)}</a></p>
      <p class="section-sub"><strong>${escapeHtml(p.manifestUrlLabel)}</strong> ${escapeHtml(g.controllerUrl)}${loopback ? ` — ${escapeHtml(p.loopbackWarning)}` : ''}</p>
      <p class="section-sub"><strong>${escapeHtml(p.coursesLabel)}</strong> ${g.courses.length}</p>
      ${g.courses.map((mf) => `<p class="section-sub">
          <a href="#/course/${escapeHtml(mf.course.id)}">${escapeHtml(p.openCourse)}: ${escapeHtml(mf.course.title)}</a>${mf.course.unlisted ? ` · <em>${escapeHtml(p.testCourse)}</em>` : ''}<br/>
          <strong>${escapeHtml(p.rubricLabel)}</strong> ${escapeHtml(shortHash(rubricHashOf(mf)))} ·
          <strong>${escapeHtml(p.publishedLabel)}</strong> ${escapeHtml(mf.publishedAt.slice(0, 10))}
        </p>`).join('')}
    </div>`
  }).join('')

  onboarding.innerHTML = [p.onboardingManual, p.onboardingCustody, p.onboardingTrueToday]
    .map((t) => `<p>${escapeHtml(t)}</p>`).join('')
}

function updateStaticText() {
  const dict = DICTIONARIES[currentLang]

  // Navbar
  setText('nav-courses', dict.nav.courses)
  setText('nav-dashboard', dict.nav.dashboard)
  setText('nav-publishers', dict.nav.publishers)

  // B105 — halaman penerbit: teks statis dari kamus, isinya dari manifest
  const pub = dict.publishersSection
  setText('publishers-kicker', pub.kicker)
  setText('publishers-title', pub.title)
  setText('publishers-sub', pub.sub)
  setText('publishers-registry-heading', pub.registryHeading)
  setText('publishers-onboarding-heading', pub.onboardingHeading)
  renderPublishers()
  setText('nav-verify', dict.nav.verifier)
  setText('nav-agent-hub', dict.nav.agentHub)

  // Autonomous Evaluator Agent Roster
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

  // Verifier Section & Input Card
  setText('verify-kicker', dict.inputSection.kicker)
  setText('verifier-title', dict.inputSection.sectionTitle)
  setText('verifier-sub', dict.inputSection.sectionSub)
  setText('verify-step-1', dict.inputSection.journey1)
  setText('verify-step-2', dict.inputSection.journey2)
  setText('verify-step-3', dict.inputSection.journey3)
  setText('verify-meaning-tag', dict.inputSection.meaningTag)
  setText('verify-meaning-title', dict.inputSection.meaningTitle)
  setText('verify-meaning-valid-title', dict.inputSection.meaningValidTitle)
  setText('verify-meaning-valid-desc', dict.inputSection.meaningValidDesc)
  setText('verify-meaning-invalid-title', dict.inputSection.meaningInvalidTitle)
  setText('verify-meaning-invalid-desc', dict.inputSection.meaningInvalidDesc)
  setText('verify-meaning-unknown-title', dict.inputSection.meaningUnknownTitle)
  setText('verify-meaning-unknown-desc', dict.inputSection.meaningUnknownDesc)
  setText('verify-result-hint', dict.inputSection.resultHint)
  setText('verify-sheet-title', dict.inputSection.sheetTitle)
  setText('verify-sheet-sub', dict.inputSection.sheetSub)
  setText('verify-seal-caption', dict.inputSection.sealCaption)
  setText('verify-inspect-kicker', dict.inputSection.inspectKicker)
  setText('verify-inspect-title', dict.inputSection.inspectTitle)
  setText('verify-inspect-sub', dict.inputSection.inspectSub)
  setText('lbl-input', dict.inputSection.label)
  setText('input-hint', currentLang === 'en' ? 'Accepts credentialHash, attestation UID, tokenId, or address' : 'Menerima credentialHash, UID atestasi, tokenId, atau address')
  if (inputEl) inputEl.placeholder = dict.inputSection.placeholder
  setText('btn-go-text', dict.inputSection.btnVerify)
  setText('clear', dict.inputSection.btnClear)
  setText('share', dict.inputSection.btnShare)

  // Sample Buttons
  setText('sample-label', currentLang === 'en' ? 'Try a sample:' : 'Coba contoh:')
  setText('sample-valid', dict.inputSection.sampleValid)
  setText('sample-revoked', dict.inputSection.sampleRevoked)
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

  // Wallet Navbar & Modal
  setText('btn-wallet-text', dict.wallet.connectBtn)
  renderWalletState()

  // Spec Compliance & Interoperability Section (Iteration 14)
  setText('spec-kicker', dict.specCompliance.kicker)
  setText('spec-title', dict.specCompliance.title)
  setText('spec-sub', dict.specCompliance.sub)
  setText('btn-run-spec-matrix-text', dict.specCompliance.btnRunAudit)
  setText('btn-copy-spec-jsonld-text', dict.specCompliance.btnCopyJsonLd)
  setText('btn-download-spec-jsonld-text', dict.specCompliance.btnDownloadJsonLd)
  setText('spec-inspector-title', dict.specCompliance.inspectorTitle)
  setText('spec-honest-title', dict.specCompliance.honestTitle)
  setText('spec-honest-desc', dict.specCompliance.honestDisclaimer)

  // Footer & Brand Sub
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
  mountStaticSpec()
  paintBanner()
  // Landing (lmsV2) mengambil teksnya dari kamus saat digambar: tanpa ini ia tetap di bahasa lama sampai
  // rute berganti. Ruang kelas sengaja tidak digambar ulang di sini — draf esai yang sedang diketik hilang.
  const routeNow = (window.location.hash || '#/').toLowerCase().split('?')[0]
  const landingShown = Boolean(document.querySelector('#page-new-app > .landing-shell'))
  if (landingShown && ['#/', '#', '', '#/courses', '#courses', '#catalog', '#how-it-works'].includes(routeNow)) mountNewApp('#/')
  if (lastReport) {
    outEl.innerHTML = renderReport(lastReport, currentLang)
    void runSpecAudit(outEl, { hash: lastReport.credential.hash, cred: lastReport.credential, edgeBase: CREDENTIAL_HOST, lang: currentLang })
  } else {
    outEl.innerHTML = renderEmpty(currentLang)
  }
}

/**
 * Tabel statis di halaman depan diisi dari kode yang sama dengan tab laporan, lalu dinilai.
 * Dulu 14 barisnya tertulis di HTML dengan `✓ PASS` di tiap sel — klaim yang tidak dihasilkan
 * apa pun, dan tetap hijau meski jaringannya mati.
 */
function mountStaticSpec() {
  const tbody = $('spec-static-tbody')
  if (!tbody) return
  tbody.innerHTML = specRowsHtml(currentLang)
  const scope = $('spec-static-table')
  if (scope) void runSpecAudit(scope, { hash: SHARE_CREDENTIAL_HASH, cred: null, edgeBase: CREDENTIAL_HOST, lang: currentLang })
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
  void runSpecAudit(outEl, { hash: report.credential.hash, cred: report.credential, edgeBase: CREDENTIAL_HOST, lang: currentLang })
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

  $('fill-sample')?.addEventListener('click', () => {
    inputEl.value = SAMPLE_HASHES.format
    run()
  })

  // Hero & Course Catalog sample buttons
  $('btn-load-demo-hero')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.valid
    run()
    setTimeout(() => outEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  })

  $('btn-hero-recruiter-check')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.valid
    run()
    setTimeout(() => outEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
  })

  // Agent Governance Hub interactions (Iteration 11)
  $('btn-hub-test-revoke')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.revoked
    run()
  })
  // Dulu "Simulate Delisting…" tanpa handler sama sekali (D59): sekarang memeriksa spesimen delisted sungguhan.
  $('btn-hub-test-delist')?.addEventListener('click', () => {
    window.location.hash = '#/verify'
    inputEl.value = SAMPLE_HASHES.delisted
    run()
  })

  // Client-side Hash Router Listener
  window.addEventListener('hashchange', handleRoute)
  window.addEventListener('lencana:learner-session-change', () => {
    const identity = snapshot().identity
    if (!hasExplicitLearnerSession()) {
      walletState = { isConnected: false, address: null }
    } else if (identity) {
      walletState = { isConnected: true, address: identity.address }
    }
    renderWalletState()
    if (!hasExplicitLearnerSession()) handleRoute()
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
  // B149: menu hamburger navbar di layar HP (modulnya sendiri; tidak ada markup baru di index.html).
  mountMobileNav()

  // Wallet Navbar & Modal Wiring
  $('btn-connect-wallet')?.addEventListener('click', () => openLogin())
  // Kotak identitas di ruang kelas meminta login lewat event ini (lesson-views.ts serverLine).
  window.addEventListener('lencana:open-privy', (e: any) => {
    const cid = e.detail?.courseId
    if (cid) sessionStorage.setItem('lencana_enroll_target', cid)
    openLogin()
  })
  $('btn-disconnect-wallet')?.addEventListener('click', disconnectWallet)

  // Spec Matrix Wiring (Iteration 14)
  initSpecMatrix()
}

// ========================================================
// ITERATION 14: W3C VC 2.0 & OB 3.0 SPEC MATRIX
// ========================================================
/**
 * CONTOH BENTUK — bukan dokumen terbit.
 *
 * Dinamai ulang dan diisi ulang: dulu konstanta ini bernama `CANONICAL_DEMO_JSONLD` dan
 * isinya **tulisan tangan** — `credentialStatus` masih array dua entri (bentuk yang validator
 * pihak ketiga tolak, lihat OI-12/B68), `proof.verificationMethod` menunjuk `#key-1` yang bukan
 * kunci agen kita, dan belasan URL menunjuk `lencana.io`, domain yang tidak kita pegang. Panel ini
 * juga punya tombol **salin** dan **unduh**, jadi ia menyerahkan dokumen karangan ke orang lain di
 * bawah kata "canonical". Yang benar: tampilkan dokumen ASLI dari tepi (lihat `initSpecMatrix`),
 * dan kalau jaringan mati, tunjukkan contoh ini dengan label yang tidak bisa dilewat.
 */
const SAMPLE_SHAPE_JSONLD = {
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
  ],
  id: `${CREDENTIAL_HOST}/credentials/${SAMPLE_HASHES.valid}`,
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  name: 'Web3 Dasar 2026 — contoh bentuk, bukan kredensial terbit',
  description: 'Ilustrasi bentuk dokumen. Yang sah adalah yang diambil dari GET /credentials/<hash> di bawah tanda tangan agen penerbit.',
  issuer: {
    id: `${CREDENTIAL_HOST}/issuers/agent-edge`,
    type: 'Profile',
    name: 'agent-edge (Lencana issuer)',
    url: `${CREDENTIAL_HOST}/issuers/agent-edge`,
  },
  validFrom: '2026-09-21T12:00:00Z',
  validUntil: '2027-09-21T12:00:00Z',
  credentialSubject: {
    id: `did:pkh:eip155:97:${'0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'}`,
    type: 'AchievementSubject',
    achievement: {
      id: `${CREDENTIAL_HOST}/achievements/web3-dasar-2026`,
      type: ['Achievement'],
      name: 'Web3 Dasar 2026',
      criteria: {
        id: `${CREDENTIAL_HOST}/criteria/web3-dasar-2026`,
        type: 'Criteria',
        narrative: 'Contoh bentuk. Yang asli: bobot + ambang lulus milik penerbit, dipaku sebagai rubricHash di dokumen kriteria.',
      },
    },
    result: [
      {
        id: `${CREDENTIAL_HOST}/results/web3-dasar-2026/${SAMPLE_HASHES.valid}`,
        type: ['Result'],
        resultDescription: `${CREDENTIAL_HOST}/criteria/web3-dasar-2026#scale`,
        value: '93',
        achievedLevel: 'Honors Pass',
      },
    ],
  },
  // SATU objek, bukan array: skema OB 3.0 memakai `[0..1]` dan validator pihak ketiga menolak
  // array — persis cacat yang kami catat sebagai OI-12/B68 dan yang sudah tidak ada di 19/19
  // dokumen kita. Daftar suspension TETAP ada di protocol kami (suspension list sendiri, dibaca
  // lewat statusOf), cuma tidak boleh ditumpuk ke field ini.
  credentialStatus: {
    id: `${CREDENTIAL_HOST}/credentials/status/revocation#${SAMPLE_HASHES.valid}`,
    type: 'BitstringStatusListEntry',
    statusPurpose: 'revocation',
    statusListIndex: '14',
    statusListCredential: `${CREDENTIAL_HOST}/credentials/status/revocation`,
  },
  proof: {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-rdfc-2022',
    created: '2026-09-21T12:00:00Z',
    verificationMethod: `${CREDENTIAL_HOST}/issuers/agent-edge#${'publicKeyMultikey asli: lihat GET /issuers/agent-edge'}`,
    proofPurpose: 'assertionMethod',
    proofValue: 'CONTOH — bukan tanda tangan. Nilai asli ada di field proof dokumen yang diambil dari tepi.',
  },
}

function initSpecMatrix() {
  const displayEl = $('spec-jsonld-display')
  /**
   * Yang ditampilkan / disalin / diunduh adalah DOKUMEN ASLI dari tepi selama ia teraih.
   *
   * Kenapa harus begitu dan bukan sekadar ganti teks label: panel ini punya tombol salin dan unduh.
   * Selama sumbernya konstanta tulisan tangan, setiap orang yang menekan tombol itu membawa pergi
   * dokumen yang tidak pernah ada — dengan `proof` yang tidak pernah ditandatangani — dan menyerahkannya
   * ke verifier lain sebagai "canonical". Sekarang: fail-closed ke contoh, tapi contohnya diberi
   * header yang tidak bisa dilewat dan filenya tidak lagi mengaku kanonik.
   */
  let specDoc: unknown = SAMPLE_SHAPE_JSONLD
  let specIsReal = false
  const specLabel = () => specIsReal
    ? ''
    : '// CONTOH BENTUK — dokumen asli tidak teraih dari tepi. Ini bukan kredensial terbit,\n'
      + '// dan proof di bawah ini tidak ada yang menandatangani. Ambil yang sah dari:\n'
      + `// ${CREDENTIAL_HOST}/credentials/${SHARE_CREDENTIAL_HASH}\n\n`
  const specText = () => specLabel() + JSON.stringify(specDoc, null, 2)

  if (displayEl) {
    displayEl.textContent = specText()
    void (async () => {
      try {
        const r = await fetch(`${CREDENTIAL_HOST}/credentials/${SHARE_CREDENTIAL_HASH}`, { signal: AbortSignal.timeout(8000) })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        specDoc = await r.json()
        specIsReal = true
        displayEl.textContent = specText()
      } catch (e) {
        // Biarkan contoh tampil, tapi jangan pernah biarkan ia diam: status jaringan ditulis di panel.
        displayEl.textContent = specLabel().replace(/^\/\/ /gm, '') + `// (tepi tidak menjawab: ${String((e as Error).message ?? e)})\n` + JSON.stringify(SAMPLE_SHAPE_JSONLD, null, 2)
      }
    })()
  }

  // Copy the displayed JSON-LD (asli kalau teraih, contoh dengan label kalau tidak)
  $('btn-copy-spec-jsonld')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(specText())
      const textEl = $('btn-copy-spec-jsonld-text')
      if (textEl) {
        const orig = textEl.textContent
        textEl.textContent = currentLang === 'en' ? 'Copied! ✓' : 'Tersalin! ✓'
        setTimeout(() => { textEl.textContent = orig }, 2000)
      }
    } catch {}
  })

  // Download the displayed JSON-LD
  $('btn-download-spec-jsonld')?.addEventListener('click', () => {
    const blob = new Blob([specText()], { type: 'application/ld+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = specIsReal ? 'lencana-credential-openbadge.jsonld' : 'lencana-CONTOH-BENTUK-not-issued.jsonld'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })

  /**
   * Tombol audit kepatuhan. Dulu: menyalakan kelas CSS baris demi baris dengan setTimeout lalu
   * menulis "14/14 Uji Lolos (12ms)" — angka 12ms itu karangan, tidak ada satu pun uji yang jalan.
   * Sekarang tombol yang sama memanggil penghitung betulan dan menulis hasil yang sebenarnya,
   * termasuk kalau hasilnya bukan 14.
   */
  $('btn-run-spec-matrix')?.addEventListener('click', async () => {
    const btn = $('btn-run-spec-matrix')
    const btnText = $('btn-run-spec-matrix-text')
    const scope = $('spec-static-table') ?? document
    if (btn) btn.setAttribute('disabled', 'true')
    if (btnText) btnText.textContent = currentLang === 'en' ? 'Fetching document and evaluating…' : 'Mengambil dokumen dan menghitung…'
    const res = await runSpecAudit(scope, { hash: SHARE_CREDENTIAL_HASH, cred: null, edgeBase: CREDENTIAL_HOST, lang: currentLang })
    if (btn) btn.removeAttribute('disabled')
    if (btnText) {
      btnText.textContent = currentLang === 'en'
        ? `${res.passed}/${res.passed + res.failed + res.unknown} satisfied · ${res.failed} failed · ${res.unknown} not readable (${res.ms} ms)`
        : `${res.passed}/${res.passed + res.failed + res.unknown} terpenuhi · ${res.failed} gagal · ${res.unknown} tidak terbaca (${res.ms} ms)`
    }
  })

  // Global event delegation for report tab 6 (W3C Spec Matrix)
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement

    // Copy from report tab
    const copyReportBtn = target.closest<HTMLButtonElement>('.btn-copy-report-jsonld')
    if (copyReportBtn) {
      const json = copyReportBtn.dataset.json
      if (json) {
        try {
          await navigator.clipboard.writeText(json)
          const orig = copyReportBtn.textContent
          copyReportBtn.textContent = currentLang === 'en' ? 'Copied! ✓' : 'Tersalin! ✓'
          setTimeout(() => { copyReportBtn.textContent = orig }, 2000)
        } catch {}
      }
      return
    }

    // Download from report tab
    const downloadReportBtn = target.closest<HTMLButtonElement>('.btn-download-report-jsonld')
    if (downloadReportBtn) {
      const json = downloadReportBtn.dataset.json
      const filename = downloadReportBtn.dataset.filename || 'credential.jsonld'
      if (json) {
        const blob = new Blob([json], { type: 'application/ld+json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      return
    }

    // Pulse test in report tab
    const pulseReportBtn = target.closest<HTMLButtonElement>('.btn-pulse-spec-test')
    if (pulseReportBtn) {
      const scope = pulseReportBtn.closest('.spec-matrix-wrapper') ?? document
      const hash = scope === document ? SHARE_CREDENTIAL_HASH : (lastReport?.credential.hash ?? SHARE_CREDENTIAL_HASH)
      await runSpecAudit(scope, { hash, cred: lastReport?.credential ?? null, edgeBase: CREDENTIAL_HOST, lang: currentLang })
    }
  })
}

function boot() {
  initWalletState()
  initLogin({ onSignedIn })
  void completeGoogleReturn()
  wire()
  updateStaticText()
  paintConfig()
  mountStaticSpec()
  paintBanner()

  const params = new URLSearchParams(location.search)
  const langParam = params.get('lang')
  if (langParam === 'en' || langParam === 'id') {
    setLanguage(langParam)
  }

  // Activate client-side route — B133: sesudah kursus yang terbit dari halaman penerbit ikut katalog (paling lama 1,5 detik;
  // penerbit tidak menjawab = katalog berkas saja), supaya halaman kursus/kelas tidak tergambar tanpa kursus itu lalu berganti.
  void loadPublishedCourses().finally(() => handleRoute())

  const q = params.get('q')
  if (q) {
    inputEl.value = q
    run()
  } else {
    outEl.innerHTML = renderEmpty(currentLang)
  }
}

boot()
