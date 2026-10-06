/**
 * `dashboard.ts` — area internal peserta `#/app` (RF7 langkah A2, B124): cangkang ber-sidebar, lima bagian, dan
 * onboarding login pertama. Hanya untuk akun — penjaga rute di `main.ts` mengembalikan tamu ke beranda.
 *
 * Datanya dibaca dari penerbit lewat `POST /me/records` yang ditandatangani pemilik akun: nilai adalah data pribadi,
 * jadi tidak ada satu pun angka di sini yang dibaca dari rute publik atau ditulis tangan.
 *
 * Onboarding menampilkan ketiga kursi (keputusan builder 2 Okt). Sejak B128 (RF7 C1) kursi Penerbit dan Agent Owner
 * dibaca dari fakta lewat `POST /me/roles` — kunci penerbit, keanggotaan yang ia tandatangani, `ownerOf` di registry
 * ERC-8004 — dan tampil sebagai "kursimu" atau "belum" beserta syaratnya; tetap tanpa tombol yang pura-pura mendaftarkan.
 */
import './dashboard.css'
import './dash-viz.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { COURSES, LISTED_COURSES, findCourse } from '../courses/index'
import { chooseMyRole, forgetLearner, learnerAddress, readMyRecords, snapshot, type MyCourseRecord, type MyRoles, type OwnedAgent } from '../learning'
import { seats, mountSeatSwitch, applyBox, navIcon, guardSeat, homeOf } from './seats'
import { renderPublisherApp } from './publisher'
import { renderOwnerApp } from './owner'
import { renderAdminApp } from './admin'
import { formatLdc, PAY_TOKEN_ADDRESS, PAY_TOKEN_SYMBOL } from '../pricing'
import { classLink, levelLabel } from '../lesson-views'
import { ROLES } from './flow3d-data'
import { renderGrades } from './grades'
import { renderWallet } from './wallet'
import { readBalance } from '../balance'
import { skeleton, steps } from '../lib/loading'
import { renderOverview } from './overview'
import { renderCatalog } from './catalog'
import { renderCredentials as renderCredentialsPage } from './credentials'
import { closeCertificate } from './certificate-view'

// Lencana-B124 status=SELESAI 2026-10-02 — area internal peserta: sidebar (Ringkasan · Kelas saya · Nilai & tugas · Kredensial saya · Akun), onboarding login pertama (tiga peran, dua berlabel segera), data dari POST /me/records bertanda tangan. Buktikan ulang: cd web && npm run probe, lalu uji peramban T44. JANGAN dibalik/diulang tanpa membuka kembali baris B124 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B126 status=SELESAI 2026-10-02 — Dompet menggantikan Pembayaran (saldo dari chain + koin uji + riwayat), Nilai & tugas bergrafik (grades.ts), kerangka isi + tahap muat sungguhan menggantikan teks memuat, kelas uji bertanda di Kursus lain. Buktikan ulang: cd web && npm run build, lalu uji peramban T48. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B127 status=SELESAI 2026-10-02 — sidebar Kursus (#/app/courses, pratinjau #/app/courses/<id>) dan Ringkasan baru (overview.ts); label pendek di tab ponsel karena menunya kini tujuh. Buktikan ulang: cd web && npm run build, lalu uji peramban T49. JANGAN dibalik/diulang tanpa membuka kembali baris B127 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B128 status=SELESAI 2026-10-02 — kursi akun dibaca dari fakta lewat POST /me/roles (kunci penerbit, keanggotaan bertanda tangan penerbit, ownerOf ERC-8004): kartu "Kursi di akun ini" di Akun dan kursi onboarding "Kursimu"/"Belum"/"Tak terbaca". Buktikan ulang: cd signer && npm run verify:roles, lalu uji peramban T51. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

type Lang = 'en' | 'id'
type Section = 'overview' | 'courses' | 'classes' | 'grades' | 'credentials' | 'wallet' | 'account' | 'welcome'

const COPY = {
  overview: { en: 'Overview', id: 'Ringkasan' },
  courses: { en: 'Courses', id: 'Kursus' },
  classes: { en: 'My classes', id: 'Kelas saya' },
  grades: { en: 'Grades & work', id: 'Nilai & tugas' },
  credentials: { en: 'My credentials', id: 'Kredensial saya' },
  account: { en: 'Account', id: 'Akun' },
  wallet: { en: 'Wallet', id: 'Dompet' },
  stepSign: { en: 'Signing the request', id: 'Menandatangani permintaan' },
  stepRead: { en: 'Reading your records from the publisher', id: 'Membaca rekaman dari penerbit' },
  testTag: { en: 'test class', id: 'kelas uji' },
  helloSub: { en: 'Everything here is yours alone — no one else can open this page.', id: 'Semua di sini milikmu sendiri — orang lain tidak bisa membuka halaman ini.' },
  loading: { en: 'Reading your records from the publisher…', id: 'Membaca rekamanmu dari penerbit…' },
  failed: { en: 'Your records could not be read:', id: 'Rekamanmu tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  next: { en: 'Next', id: 'Berikutnya' },
  noCourse: { en: 'You have not taken a course yet.', id: 'Kamu belum mengikuti kursus.' },
  moreCourses: { en: 'more courses you have not taken yet — search them, preview what they prove, and enroll on the Courses page.', id: 'kursus lain belum kamu ikuti — cari, lihat apa yang dibuktikannya, lalu daftar di halaman Kursus.' },
  toCatalog: { en: 'Open the Courses page', id: 'Buka halaman Kursus' },
  open: { en: 'Open class', id: 'Buka kelas' },
  details: { en: 'Course page', id: 'Halaman kursus' },
  others: { en: 'Other courses', id: 'Kursus lain' },
  privacy: {
    en: 'This page is only for you. To share a credential, send its verifier link — the recipient sees that credential, not your dashboard.',
    id: 'Halaman ini hanya untukmu. Untuk membagikan kredensial, kirim tautan verifier-nya — penerima melihat kredensial itu saja, bukan dashboard-mu.',
  },
  email: { en: 'Account email', id: 'Email akun' },
  learnWallet: { en: 'Learning wallet', id: 'Dompet belajar' },
  walletNote: { en: 'Created when you first signed in; every record you send to a publisher is signed by it.', id: 'Dibuat saat pertama kamu masuk; setiap rekaman yang kamu kirim ke penerbit ditandatangani olehnya.' },
  network: { en: 'Network', id: 'Jaringan' },
  copy: { en: 'Copy', id: 'Salin' },
  copied: { en: 'Copied', id: 'Tersalin' },
  signOut: { en: 'Sign out', id: 'Keluar' },
  welcomeKicker: { en: 'WELCOME TO LENCANA', id: 'SELAMAT DATANG DI LENCANA' },
  welcomeTitle: { en: 'Which seat are you taking?', id: 'Kamu datang sebagai apa?' },
  welcomeSub: { en: 'Lencana has three seats. Each has its own flow — the same one shown on the home page.', id: 'Lencana punya tiga kursi. Masing-masing punya alurnya sendiri — sama dengan yang ditunjukkan di beranda.' },
  learnerRole: { en: 'Learn, do the work, and receive a credential anyone can check.', id: 'Belajar, kerjakan tugas, dan terima kredensial yang bisa diperiksa siapa pun.' },
  publisherRole: { en: 'Monitor your institution’s courses, learners and revenue; hire grading agents and appoint reviewer agents in its name. Requirement: apply here — the institution’s publisher key approves it with a signed message.', id: 'Pantau kursus, peserta, dan pendapatan lembagamu; sewa agen penilai dan tunjuk agen pengesah atas namanya. Syarat: ajukan dari sini — kunci penerbit lembaga yang menyetujuinya lewat pesan bertanda tangan.' },
  ownerRole: { en: 'Rent out your ERC-8004 grading agent to publishers. Requirement: the agent’s identity NFT is owned by this account’s wallet (ownerOf in the registry).', id: 'Sewakan agen penilai ERC-8004 milikmu ke penerbit. Syarat: NFT identitas agen itu dimiliki dompet akun ini (ownerOf di registry).' },
  seatsTitle: { en: 'Seats on this account', id: 'Kursi di akun ini' },
  adminName: { en: 'Lencana admin', id: 'Admin Lencana' },
  adminHeld: { en: 'This account is a Lencana admin: it decides publisher membership requests.', id: 'Akun ini admin Lencana: ia memutuskan pengajuan anggota penerbit.' },
  openAdmin: { en: 'Open admin page', id: 'Buka halaman Admin' },
  unread: { en: 'Unread', id: 'Tak terbaca' },
  seatsSource: {
    en: 'The role is chosen once and signed by your account; the seat still needs its facts: the publisher key and the memberships it signed, and ownerOf in the ERC-8004 registry on chain 97.',
    id: 'Peran dipilih sekali dan ditandatangani akunmu; kursinya tetap butuh fakta: kunci penerbit dan keanggotaan yang ia tandatangani, serta ownerOf di registry ERC-8004 chain 97.',
  },
  recheck: { en: 'Check again', id: 'Periksa ulang' },
  checking: { en: 'Checking your seats…', id: 'Memeriksa kursimu…' },
  checkingShort: { en: 'Checking…', id: 'Memeriksa…' },
  seatsFailed: { en: 'Your seats could not be read:', id: 'Kursimu tidak terbaca:' },
  held: { en: 'Yours', id: 'Kursimu' },
  notHeld: { en: 'Not yet', id: 'Belum' },
  learnerHeld: { en: 'Active — every account is a learner.', id: 'Aktif — setiap akun adalah peserta.' },
  learnerOnly: { en: 'Active — take courses, do the work, receive credentials.', id: 'Aktif — ikuti kursus, kerjakan tugas, terima kredensial.' },
  ownerChosenNone: {
    en: 'You chose Agent Owner. The seat opens when this account’s wallet owns an ERC-8004 agent identity — in this demo the platform mints one for you.',
    id: 'Kamu memilih Agent Owner. Kursinya terbuka saat dompet akun ini memiliki identitas agen ERC-8004 — di demo ini platform mencetaknya untukmu.',
  },
  devNote: {
    en: 'Developer account: it holds every seat its facts give it and can switch between them. Real accounts hold one role.',
    id: 'Akun pengembang: memegang semua kursi yang diberikan faktanya dan bisa berpindah kursi. Akun nyata memegang satu peran.',
  },
  yourRole: { en: 'Your role:', id: 'Peranmu:' },
  toDashboard: { en: 'Go to my dashboard', id: 'Ke dasborku' },
  chooseSub: {
    en: 'One account holds one role. Your choice is signed by your account and cannot be changed — for another role, use another account.',
    id: 'Satu akun memegang satu peran. Pilihanmu ditandatangani akunmu dan tidak bisa diganti — untuk peran lain, pakai akun lain.',
  },
  notePh: { en: 'Optional note for the publisher (who you are, why) — max 280 characters', id: 'Catatan untuk penerbit (opsional: siapa kamu, untuk apa) — maks. 280 karakter' },
  pickLearner: { en: 'Choose Learner', id: 'Pilih Peserta' },
  pickPublisher: { en: 'Choose Publisher and apply', id: 'Pilih Penerbit & ajukan' },
  pickOwner: { en: 'Choose Agent Owner', id: 'Pilih Agent Owner' },
  confirm: { en: 'Sure? Sign this choice', id: 'Yakin? Tandatangani pilihan ini' },
  final: { en: 'This cannot be changed later.', id: 'Pilihan ini tidak bisa diganti nanti.' },
  signing: { en: 'Signing and sending…', id: 'Menandatangani dan mengirim…' },
  ownerChooseLine: {
    en: 'Rent out an ERC-8004 grading agent to publishers. The seat opens when this account’s wallet owns an agent identity — in this demo the platform mints one for you.',
    id: 'Sewakan agen penilai ERC-8004 ke penerbit. Kursinya terbuka saat dompet akun ini memiliki identitas agen — di demo ini platform mencetaknya untukmu.',
  },
  devKicker: { en: 'DEVELOPER ACCOUNT', id: 'AKUN PENGEMBANG' },
  noRoleTitle: { en: 'No role yet', id: 'Belum berperan' },
  noRole: { en: 'This account has not chosen its role. Taking a course makes it a learner.', id: 'Akun ini belum memilih peran. Mengikuti kursus langsung menjadikannya Peserta.' },
  chooseRole: { en: 'Choose your role', id: 'Pilih peranmu' },
  oneRole: { en: 'One account holds one role — this one:', id: 'Satu akun memegang satu peran — peran akun ini:' },
  viaChosen: { en: 'chosen and signed by this account', id: 'dipilih dan ditandatangani akun ini' },
  viaRecords: { en: 'because this account already takes courses', id: 'karena akun ini sudah mengikuti kursus' },
  viaIssuerRole: { en: 'because this account is the publisher key', id: 'karena akun ini kunci penerbit' },
  viaMembership: { en: 'because this account is a publisher member', id: 'karena akun ini anggota penerbit' },
  viaAgents: { en: 'because this wallet owns an ERC-8004 agent', id: 'karena dompet ini memiliki agen ERC-8004' },
  viaIssuer: { en: 'You hold the publisher key of', id: 'Kamu memegang kunci penerbit' },
  viaMember: { en: 'Member of', id: 'Anggota' },
  grantedBy: { en: 'granted by publisher key', id: 'diberikan oleh kunci penerbit' },
  since: { en: 'since', id: 'sejak' },
  permWatch: { en: 'Monitor courses, learners, revenue', id: 'Pantau kursus, peserta, pendapatan' },
  permHire: { en: 'Hire grading agents', id: 'Sewa agen penilai' },
  permAppoint: { en: 'Appoint reviewer agents', id: 'Tunjuk agen pengesah' },
  permIssueKey: { en: 'Issue / revoke credentials (CLI, with this key)', id: 'Terbitkan / cabut kredensial (CLI, dengan kunci ini)' },
  permIssue: { en: 'Issue / revoke credentials — stays with the publisher key', id: 'Terbitkan / cabut kredensial — tetap kunci penerbit' },
  publisherNone: { en: 'Requirement: membership approved by the institution’s publisher key. Apply below.', id: 'Syarat: keanggotaan yang disetujui kunci penerbit lembaga. Ajukan di bawah.' },
  ownerHeld: { en: 'Agents whose ERC-8004 identity this wallet owns:', id: 'Agen yang identitas ERC-8004-nya dimiliki dompet ini:' },
  ownerNone: { en: 'Requirement: the ERC-8004 identity NFT of an agent is owned by this account’s wallet.', id: 'Syarat: NFT identitas ERC-8004 sebuah agen dimiliki dompet akun ini.' },
  agentWallet: { en: 'agent wallet', id: 'dompet agen' },
  tariff: { en: 'base tariff', id: 'tarif dasar' },
  seeSeat: { en: 'See it in Account', id: 'Lihat di Akun' },
  openPub: { en: 'Open the publisher dashboard', id: 'Buka dasbor penerbit' },
  openOwner: { en: 'Open the Agent Owner dashboard', id: 'Buka dasbor Agent Owner' },
  start: { en: 'Start as a learner', id: 'Mulai sebagai peserta' },
  skip: { en: 'Skip', id: 'Lewati' },
  tourTitle: { en: 'How a course becomes proof', id: 'Bagaimana kursus menjadi bukti' },
  back: { en: 'Back', id: 'Kembali' },
  done: { en: 'Choose a course', id: 'Pilih kursus' },
  pickTitle: { en: 'Pick your first course', id: 'Pilih kursus pertamamu' },
  later: { en: 'Later — go to my dashboard', id: 'Nanti saja — ke dashboard' },
} satisfies Record<string, Record<Lang, string>>

const NAV: { id: Exclude<Section, 'welcome'>, href: string, icon: string }[] = [
  { id: 'overview', href: '#/app', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { id: 'courses', href: '#/app/courses', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.6 5.4-2.1 5.1-5.1 2.1 2.1-5.1z' },
  { id: 'classes', href: '#/app/classes', icon: 'M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zm16 0h-4a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h5z' },
  { id: 'grades', href: '#/app/grades', icon: 'M4 20V10m6 10V4m6 16v-7m6 7H2' },
  { id: 'credentials', href: '#/app/credentials', icon: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-3.5 3.5L7 22l5-2 5 2-1.5-3.5' },
  { id: 'wallet', href: '#/app/wallet', icon: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3M3 7.5V18a2 2 0 0 0 2 2h15V9H5.5A2.5 2.5 0 0 1 3 7.5zM16.5 14.5h.01' },
  { id: 'account', href: '#/app/account', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0' },
]

/** Label pendek untuk tab bawah di ponsel — tujuh menu tidak muat dengan label penuh. */
const SHORT: Record<Exclude<Section, 'welcome'>, Record<Lang, string>> = {
  overview: { en: 'Overview', id: 'Ringkasan' },
  courses: { en: 'Courses', id: 'Kursus' },
  classes: { en: 'Classes', id: 'Kelas' },
  grades: { en: 'Grades', id: 'Nilai' },
  credentials: { en: 'Credentials', id: 'Kredensial' },
  wallet: { en: 'Wallet', id: 'Dompet' },
  account: { en: 'Account', id: 'Akun' },
}

const ONBOARD_KEY = (addr: string) => `lencana-onboarded-v1:${addr.toLowerCase()}`
/** Login pertama di peramban ini untuk akun ini? (keadaan tampilan, bukan klaim apa pun ke penerbit) */
export function needsOnboarding (addr: string): boolean {
  try { return localStorage.getItem(ONBOARD_KEY(addr)) !== '1' } catch { return false }
}
function markOnboarded (addr: string | null): void {
  if (!addr) return
  try { localStorage.setItem(ONBOARD_KEY(addr), '1') } catch { /* tanpa storage: onboarding muncul lagi, tidak berbahaya */ }
}

/**
 * Rekaman dibaca segar setiap kali satu bagian dibuka — sesudah peserta enroll atau menyerahkan tugas di kelas,
 * dashboard tidak boleh menampilkan angka basi. Permintaan yang sedang jalan dipakai bersama (satu tanda tangan).
 */
let inflight: Promise<{ ok: boolean, why?: string, courses?: MyCourseRecord[] }> | null = null
const stepListeners = new Set<(step: 0 | 1) => void>()
async function records (onStep?: (step: 0 | 1) => void): Promise<{ ok: boolean, why?: string, courses?: MyCourseRecord[] }> {
  if (onStep) stepListeners.add(onStep)
  inflight ??= readMyRecords((st) => stepListeners.forEach((fn) => fn(st))).finally(() => { inflight = null; stepListeners.clear() })
  return inflight
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
/** NFT identitas agen di BscScan testnet: registry `eip155:97:0x…` → halaman token dengan id-nya. */
const agentScan = (a: OwnedAgent) => `https://testnet.bscscan.com/token/${a.registry.split(':').pop()}?a=${encodeURIComponent(a.agentId)}`

function sectionOf (routeHash: string): Section {
  const seg = routeHash.replace(/^#\/?/, '').split('/')[1] ?? ''
  if (seg === 'payments') return 'wallet' // tautan B125 lama
  if (seg === 'courses' || seg === 'classes' || seg === 'grades' || seg === 'credentials' || seg === 'wallet' || seg === 'account' || seg === 'welcome') return seg
  return 'overview'
}

const icon = navIcon

export function renderApp (routeHash: string): HTMLElement {
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const addr = learnerAddress()
  closeCertificate() // B165: penampil lembar sertifikat hanya hidup di rute #/app/credentials/<hash>
  // B129: kursi Penerbit punya cangkangnya sendiri (`#/app/pub…`, `pages/publisher.ts`).
  if (/^#\/?app\/pub(\/|$)/.test(routeHash)) return renderPublisherApp(lang, routeHash)
  // B130: kursi Agent Owner juga punya cangkangnya sendiri (`#/app/owner`, `pages/owner.ts`).
  if (/^#\/?app\/owner(\/|$)/.test(routeHash)) return renderOwnerApp(lang, routeHash)
  // Admin Lencana (6 Okt malam): persetujuan keanggotaan penerbit oleh admin sementara (`#/app/admin`, `pages/admin.ts`).
  if (/^#\/?app\/admin(\/|$)/.test(routeHash)) return renderAdminApp(lang, routeHash)
  const section = sectionOf(routeHash)

  if (section === 'welcome') return renderWelcome(lang, addr)

  const main = h('main', { class: 'dash-main' })
  // Pemilih kursi muncul hanya bila akun memegang kursi Penerbit (dibaca dari fakta, B128) — di menu samping untuk layar
  // lebar, di atas isi untuk ponsel (menu samping ponsel menjadi tab bawah).
  const sideSlot = h('div', { class: 'seat-slot side' })
  const topSlot = h('div', { class: 'seat-slot top' })
  const mountSwitch = () => mountSeatSwitch(lang, 'learner', [sideSlot, topSlot])
  const shell = h('div', { class: 'app-shell' },
    h('nav', { class: 'app-side', 'aria-label': 'Dashboard' },
      sideSlot,
      ...NAV.map((n) => h('a', { href: n.href, class: n.id === section ? 'active' : '', 'aria-current': n.id === section ? 'page' : 'false' },
        icon(n.icon), h('span', { class: 'nav-full' }, T(n.id)), h('span', { class: 'nav-short', 'aria-hidden': 'true' }, SHORT[n.id][lang]))),
    ),
    main,
  )
  main.appendChild(topSlot)

  if (section === 'account') {
    main.appendChild(renderAccount(lang, addr))
    mountSwitch()
    // D77: akun admin-saja tidak punya kursi peserta — Akunnya ada di cangkang Admin, bukan di navigasi peserta.
    void seats().then((r) => { if (r.ok && r.roles?.account.role === 'admin') window.location.hash = '#/app/admin/account' })
    return shell
  }
  // B165: kartu kredensial + penampil lembar sertifikat (rute `#/app/credentials/<hash>`); bagian lain menutup penampil di atas.
  if (section === 'credentials') { main.appendChild(renderCredentialsPage(lang, addr, routeHash)); guardSeat('learner', mountSwitch); return shell }

  // Ringkasan, kelas, nilai, dan dompet membutuhkan rekaman dari penerbit (dompet juga saldo dari chain). Selama
  // memuat: kerangka berbentuk isinya + tahap yang benar-benar dilalui (tanda tangan → penerbit), bukan teks diam.
  const body = h('div', { class: 'app-body' })
  main.appendChild(h('header', { class: 'app-head' }, h('h1', null, T(section)), section === 'overview' ? h('p', { class: 'app-muted' }, T('helloSub')) : null))
  main.appendChild(body)
  const shape = section === 'grades' ? 'grades' : section === 'wallet' ? 'wallet' : section === 'classes' || section === 'courses' ? 'cards' : 'stats'
  // #/app/courses/<id> membuka pratinjau kursus itu langsung (dari "Kursus untukmu" di Ringkasan).
  const openId = section === 'courses' ? decodeURIComponent(routeHash.replace(/^#\/?/, '').split('/')[2] ?? '') || undefined : undefined
  const load = () => {
    if (!addr) return
    if (section === 'courses') {
      // Katalog tidak butuh rekaman untuk tampil (pratinjau dari tautan langsung terbuka seketika); status "terdaftar"
      // menyusul dari rekaman penerbit tanpa menggambar ulang pencarian yang sedang diketik.
      const view = renderCatalog(lang, undefined, openId)
      body.replaceChildren(view)
      // B131: kursi dibaca dulu (akun Penerbit / Agent Owner dikirim ke dasbornya), lalu rekaman — berurutan, karena dua
      // permintaan tanda tangan serentak ke dompet tertanam tidak perlu diuji nasibnya.
      guardSeat('learner', () => {
        void records().then((r) => { if (view.isConnected) view.setRecords(r.ok && r.courses ? r.courses : null) }).finally(mountSwitch)
      })
      return
    }
    const progress = steps([T('stepSign'), T('stepRead')])
    body.replaceChildren(h('div', { class: 'app-loading' }, progress, skeleton(shape, T('loading'))))
    guardSeat('learner', () => fill(progress))
  }
  const fill = (progress: ReturnType<typeof steps>) => {
    const balance = section === 'wallet' ? readBalance(true) : section === 'overview' ? readBalance() : Promise.resolve(null)
    void Promise.all([records((st) => progress.set(st)), balance]).then(([r, bal]) => {
      if (!body.isConnected) return
      mountSwitch()
      body.innerHTML = ''
      if (!r.ok || !r.courses) {
        body.appendChild(h('div', { class: 'app-card app-error' },
          h('p', null, `${T('failed')} ${r.why ?? ''}`),
          h('button', { type: 'button', class: 'app-btn', onClick: load }, T('retry'))))
        return
      }
      if (section === 'overview') body.appendChild(renderOverview(lang, r.courses, bal))
      if (section === 'classes') body.appendChild(renderClasses(lang, r.courses))
      if (section === 'grades') body.appendChild(renderGrades(lang, r.courses))
      if (section === 'wallet') body.appendChild(renderWallet(lang, r.courses, bal))
    })
  }
  load()
  return shell
}

function progressBar (rec: MyCourseRecord): HTMLElement {
  const total = rec.summary?.lessonsTotal ?? 0
  const done = rec.summary?.lessonsCompleted ?? 0
  const pct = total ? Math.round((done / total) * 100) : 0
  return h('div', { class: 'app-progress' },
    h('div', { class: 'app-bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: { width: `${pct}%` } })),
    h('small', null, `${done}/${total} · ${pct}%`),
  )
}

function renderClasses (lang: Lang, courses: MyCourseRecord[]): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack' })
  const taken = new Set(courses.map((c) => c.courseId))
  if (!courses.length) wrap.appendChild(h('div', { class: 'app-card' }, h('p', null, T('noCourse'))))
  for (const rec of courses) {
    const course = findCourse(rec.courseId)
    if (!course) continue
    wrap.appendChild(h('div', { class: 'app-card app-class' },
      h('div', null, h('h2', null, course.title, course.unlisted ? h('span', { class: 'app-tag' }, T('testTag')) : null), h('p', { class: 'app-muted' }, course.institution)),
      progressBar(rec),
      h('div', { class: 'app-actions' },
        h('a', { class: 'app-btn primary', href: classLink(course.id) }, T('open')),
        h('a', { class: 'app-btn', href: `#/course/${encodeURIComponent(course.id)}` }, T('details')),
      ),
    ))
  }
  // B127: mencari dan mendaftar pindah ke halaman Kursus; di sini cukup satu jalan ke sana.
  const others = COURSES.filter((c) => !taken.has(c.id)).length
  if (others) {
    wrap.appendChild(h('a', { class: 'app-card app-other', href: '#/app/courses' },
      h('strong', null, T('others')), h('span', { class: 'app-muted' }, `${others} ${T('moreCourses')}`), h('span', { class: 'app-btn small' }, T('toCatalog'))))
  }
  return wrap
}

export function renderAccount (lang: Lang, addr: string | null): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const email = snapshot().identity?.email
  const copyBtn = h('button', { type: 'button', class: 'app-btn small' }, T('copy')) as HTMLButtonElement
  copyBtn.addEventListener('click', () => {
    if (!addr) return
    void navigator.clipboard?.writeText(addr).then(() => { copyBtn.textContent = T('copied'); setTimeout(() => { copyBtn.textContent = T('copy') }, 1500) })
  })
  return h('div', { class: 'app-stack' },
    h('header', { class: 'app-head' }, h('h1', null, T('account'))),
    h('div', { class: 'app-card' },
      h('dl', { class: 'app-facts single' },
        h('div', null, h('dt', null, T('email')), h('dd', null, email ?? '—')),
        h('div', null, h('dt', null, T('learnWallet')), h('dd', null, h('code', null, addr ?? '—'), ' ', copyBtn)),
        h('div', null, h('dt', null, T('network')), h('dd', null, 'BNB Smart Chain Testnet (97)')),
      ),
      h('p', { class: 'app-muted' }, T('walletNote')),
      h('button', { type: 'button', class: 'app-btn danger', onClick: () => { forgetLearner(); window.location.hash = '#/' } }, T('signOut')),
    ),
    renderSeats(lang),
  )
}

/** Kartu "Kursimu" (B128): tiga kursi, masing-masing dengan fakta yang membuatnya dipegang atau syarat yang belum. */
function renderSeats (lang: Lang): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const list = h('div', { class: 'app-roles' }, skeleton('list', T('checking')))
  const recheck = h('button', { type: 'button', class: 'app-btn small' }, T('recheck')) as HTMLButtonElement
  const fill = (fresh: boolean) => {
    recheck.disabled = true
    if (fresh) list.replaceChildren(skeleton('list', T('checking')))
    void seats(fresh).then((r) => {
      recheck.disabled = false
      list.replaceChildren(...(r.ok && r.roles ? seatRows(lang, r.roles, () => fill(false)) : [h('p', { class: 'app-muted' }, `${T('seatsFailed')} ${r.why ?? ''}`)]))
    })
  }
  recheck.addEventListener('click', () => fill(true))
  fill(false)
  return h('section', { class: 'app-card app-seats', 'aria-label': T('seatsTitle') },
    h('span', { class: 'app-kicker' }, T('seatsTitle')),
    list,
    h('div', { class: 'role-foot' }, h('p', { class: 'app-muted' }, T('seatsSource')), recheck),
  )
}

/** Baris kursi + (bila akun ini admin Lencana) baris Admin di depan. */
function seatRows (lang: Lang, r: MyRoles, onChange: () => void): HTMLElement[] {
  const base = r.account.role === 'admin' ? [] : seatRowsBase(lang, r, onChange)
  if (!r.admin) return base
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  return [h('div', { class: 'role-row held' },
    h('div', { class: 'role-name' }, h('strong', null, T('adminName')), h('span', { class: 'role-state on' }, T('held'))),
    h('div', { class: 'role-body' }, h('p', null, T('adminHeld')), h('a', { class: 'app-btn small primary', href: '#/app/admin' }, T('openAdmin')))), ...base]
}

function seatRowsBase (lang: Lang, r: MyRoles, onChange: () => void): HTMLElement[] {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const when = (iso: string) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' })
  const row = (name: string, held: boolean, ...body: (HTMLElement | null)[]) => h('div', { class: `role-row${held ? ' held' : ''}` },
    h('div', { class: 'role-name' }, h('strong', null, name), h('span', { class: `role-state${held ? ' on' : ''}` }, held ? T('held') : T('notHeld'))),
    h('div', { class: 'role-body' }, ...body))
  const perm = (on: boolean, label: string) => h('li', { class: on ? 'on' : 'off' }, label)
  const p = r.publisher
  const institution = p ? (p.name ?? p.slug ?? short(p.issuer)) : ''
  const tariff = (a: OwnedAgent) => !a.tariff
    ? null
    : a.tariff.token.toLowerCase() === PAY_TOKEN_ADDRESS.toLowerCase()
      ? `${formatLdc(BigInt(a.tariff.amount))} ${PAY_TOKEN_SYMBOL}`
      : `${a.tariff.amount} @ ${short(a.tariff.token)}`
  const learnerRow = () => row(ROLES[0].name[lang], true, h('p', null, r.account.dev ? T('learnerHeld') : T('learnerOnly')))
  const rows = [
    learnerRow(),
    p
      ? row(ROLES[1].name[lang], true,
        h('p', null, `${p.via === 'issuer' ? T('viaIssuer') : T('viaMember')} `, h('strong', null, institution)),
        p.via === 'member'
          ? h('p', { class: 'app-muted' }, `${T('grantedBy')} `, h('code', null, short(p.issuer)), p.since ? ` · ${T('since')} ${when(p.since)}` : '')
          : null,
        h('ul', { class: 'role-perms' },
          perm(true, T('permWatch')), perm(p.canHire, T('permHire')), perm(p.canAppoint, T('permAppoint')),
          perm(p.via === 'issuer', p.via === 'issuer' ? T('permIssueKey') : T('permIssue'))),
        h('a', { class: 'app-btn small primary', href: '#/app/pub' }, T('openPub')))
      // B129: belum anggota → ajukan (atau lihat status pengajuan); kunci penerbit yang memutuskan.
      : row(ROLES[1].name[lang], false, h('p', { class: 'app-muted' }, T('publisherNone')), applyBox(lang, r, { withNote: true, onChange })),
    r.agents.length
      ? row(ROLES[2].name[lang], true,
        h('p', null, T('ownerHeld')),
        h('ul', { class: 'role-agents' }, ...r.agents.map((a) => h('li', null,
          h('code', { class: 'role-agent-id' }, `#${a.agentId}`),
          a.wallet ? h('span', null, `${T('agentWallet')} `, h('code', null, short(a.wallet))) : null,
          tariff(a) ? h('span', null, `${T('tariff')} ${tariff(a)}`) : null,
          h('a', { href: agentScan(a), target: '_blank', rel: 'noopener noreferrer' }, 'BscScan ↗')))),
        h('a', { class: 'app-btn small primary', href: '#/app/owner' }, T('openOwner')))
      : row(ROLES[2].name[lang], false, h('p', { class: 'app-muted' }, r.account.dev ? T('ownerNone') : T('ownerChosenNone'))),
  ]
  // B131 (D66): akun dev memegang semua kursi menurut fakta; akun nyata memegang satu peran — hanya kursi itu yang tampil.
  if (r.account.dev) return [h('p', { class: 'role-dev' }, T('devNote')), ...rows]
  const a = r.account
  if (!a.role) {
    return [h('div', { class: 'role-row' },
      h('div', { class: 'role-name' }, h('strong', null, T('noRoleTitle')), h('span', { class: 'role-state' }, T('notHeld'))),
      h('div', { class: 'role-body' }, h('p', { class: 'app-muted' }, T('noRole')), h('a', { class: 'app-btn small primary', href: '#/app/welcome' }, T('chooseRole'))))]
  }
  const since = a.chosenAt ? ` · ${when(a.chosenAt)}` : ''
  const viaLine = h('p', { class: 'role-dev' }, `${T('oneRole')} ${T(VIA_COPY[a.via ?? 'chosen'])}${since}`)
  return [viaLine, rows[a.role === 'learner' ? 0 : a.role === 'publisher' ? 1 : 2]]
}

const VIA_COPY = { chosen: 'viaChosen', records: 'viaRecords', issuer: 'viaIssuerRole', membership: 'viaMembership', agents: 'viaAgents', dev: 'viaChosen', admin: 'viaChosen' } as const

function renderWelcome (lang: Lang, addr: string | null): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const stations = ROLES[0].stations
  const root = h('div', { class: 'app-welcome' })
  const finish = (to: string) => {
    markOnboarded(addr)
    // Tamu yang menekan "Daftar" di halaman kursus lalu login pertama kali: sesudah onboarding kembali ke kursus itu.
    let pending: string | null = null
    try { pending = sessionStorage.getItem('lencana_enroll_target'); if (pending) sessionStorage.removeItem('lencana_enroll_target') } catch { /* tanpa storage */ }
    window.location.hash = to === '#/app' && pending ? `#/course/${encodeURIComponent(pending)}` : to
  }

  // B131 (D66): kursi dibaca dulu. Akun dev → tiga kursi menurut fakta (perilaku B128–B130); akun yang sudah berperan →
  // perannya; akun yang belum → memilih sekali, bertanda tangan, dengan konfirmasi karena tidak bisa diganti.
  const stepRoles = () => {
    root.innerHTML = ''
    root.appendChild(h('div', { class: 'wel-head' },
      h('span', { class: 'app-kicker' }, T('welcomeKicker')),
      h('h1', null, T('welcomeTitle')),
      h('p', { class: 'app-muted' }, T('checking')),
    ))
    root.appendChild(skeleton('cards', T('checking')))
    void seats().then((r) => {
      if (!root.isConnected) return
      if (!r.ok || !r.roles) {
        root.replaceChildren(h('div', { class: 'wel-head' }, h('h1', null, T('welcomeTitle')), h('p', { class: 'app-muted' }, `${T('seatsFailed')} ${r.why ?? ''}`)),
          h('div', { class: 'app-actions' }, h('button', { type: 'button', class: 'app-btn primary', onClick: () => { void seats(true).then(stepRoles) } }, T('recheck'))),
          h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('skip')))
        return
      }
      const acct = r.roles.account
      if (acct.role === 'admin') { finish('#/app/admin'); return }
      if (acct.dev) stepDevSeats()
      else if (acct.role) stepYourRole(r.roles)
      else stepChoose(r.roles)
    })
  }

  const stepYourRole = (roles: MyRoles) => {
    const a = roles.account
    const idx = a.role === 'learner' ? 0 : a.role === 'publisher' ? 1 : 2
    root.replaceChildren(
      h('div', { class: 'wel-head' },
        h('span', { class: 'app-kicker' }, T('welcomeKicker')),
        h('h1', null, `${T('yourRole')} ${ROLES[idx].name[lang]}`),
        h('p', { class: 'app-muted' }, `${T('oneRole')} ${T(VIA_COPY[a.via ?? 'chosen'])}.`)),
      h('div', { class: 'app-actions' }, a.role === 'learner'
        ? h('button', { type: 'button', class: 'app-btn primary', onClick: stepTour }, T('start'))
        : h('button', { type: 'button', class: 'app-btn primary', onClick: () => finish(homeOf(roles)) }, T('toDashboard'))),
      h('button', { type: 'button', class: 'wel-skip', onClick: () => finish(homeOf(roles)) }, T('skip')))
  }

  const stepChoose = (roles: MyRoles) => {
    root.replaceChildren(h('div', { class: 'wel-head' },
      h('span', { class: 'app-kicker' }, T('welcomeKicker')),
      h('h1', null, T('welcomeTitle')),
      h('p', { class: 'app-muted' }, T('chooseSub')),
    ))
    const issuer = roles.issuer?.address
    const note = h('textarea', { class: 'seat-apply-note', maxlength: 280, rows: 2, placeholder: T('notePh'), 'aria-label': T('notePh') }) as HTMLTextAreaElement
    const buttons: HTMLButtonElement[] = []
    const card = (idx: 0 | 1 | 2, role: 'learner' | 'publisher' | 'owner', line: string, label: string, extra: HTMLElement | null) => {
      const status = h('p', { class: 'seat-apply-status', role: 'status' })
      const btn = h('button', { type: 'button', class: 'app-btn primary' }, label) as HTMLButtonElement
      buttons.push(btn)
      let armed = false
      btn.addEventListener('click', () => {
        // Klik pertama mempersenjatai (pilihan tidak bisa diganti), klik kedua menandatangani.
        if (!armed) {
          armed = true
          btn.textContent = T('confirm')
          status.className = 'seat-apply-status bad'
          status.textContent = T('final')
          return
        }
        buttons.forEach((b) => { b.disabled = true })
        status.className = 'seat-apply-status'
        status.textContent = T('signing')
        void chooseMyRole(role, { issuer, note: role === 'publisher' ? note.value : undefined }).then(async (out) => {
          if (!out.ok) {
            buttons.forEach((b) => { b.disabled = false })
            status.className = 'seat-apply-status bad'
            status.textContent = out.why ?? ''
            return
          }
          await seats(true)
          if (role === 'learner') stepTour()
          else finish(role === 'publisher' ? '#/app/pub' : '#/app/owner')
        })
      })
      return h('div', { class: 'wel-seat active' },
        h('div', { class: 'wel-seat-top' }, h('strong', null, ROLES[idx].name[lang])),
        h('p', null, line),
        h('div', { class: 'wel-seat-act' }, ...(extra ? [extra] : []), btn, status))
    }
    root.appendChild(h('div', { class: 'wel-seats' },
      card(0, 'learner', T('learnerRole'), T('pickLearner'), null),
      issuer ? card(1, 'publisher', T('publisherRole'), T('pickPublisher'), note) : null,
      card(2, 'owner', T('ownerChooseLine'), T('pickOwner'), null),
    ))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('later')))
  }

  const stepDevSeats = () => {
    root.innerHTML = ''
    root.appendChild(h('div', { class: 'wel-head' },
      h('span', { class: 'app-kicker' }, `${T('welcomeKicker')} · ${T('devKicker')}`),
      h('h1', null, T('welcomeTitle')),
      h('p', { class: 'app-muted' }, T('devNote')),
    ))
    // B128: kursi Penerbit dan Agent Owner menunggu fakta dari penerbit (tanda tangan lencana-roles), lalu menjadi
    // "kursimu" atau "belum". B129: Penerbit yang dipegang membuka dasbor penerbit; yang belum bisa diajukan dari sini.
    const badge = (el: HTMLElement, text: string, on = false) => { el.textContent = text; el.classList.toggle('on', on) }
    const seat = (name: string, line: string) => {
      const tag = h('span', { class: 'wel-badge' }, T('checkingShort'))
      const action = h('div', { class: 'wel-seat-act' })
      const el = h('div', { class: 'wel-seat soon' }, h('div', { class: 'wel-seat-top' }, h('strong', null, name), tag), h('p', null, line), action)
      // null = kursi tidak terbaca (tanda tangan ditolak, penerbit tidak menjawab): jangan tampil "belum" yang belum tentu benar.
      return { el, set: (held: boolean | null, act: HTMLElement[] = []) => {
        el.className = `wel-seat ${held ? 'active held' : 'soon'}`
        badge(tag, held === null ? T('unread') : held ? T('held') : T('notHeld'), held === true)
        action.replaceChildren(...act)
      } }
    }
    const pub = seat(ROLES[1].name[lang], T('publisherRole'))
    const own = seat(ROLES[2].name[lang], T('ownerRole'))
    const fillSeats = (fresh: boolean) => void seats(fresh).then((r) => {
      if (!r.ok || !r.roles) { pub.set(null); own.set(null); return }
      const roles = r.roles
      pub.set(Boolean(roles.publisher), roles.publisher
        ? [h('button', { type: 'button', class: 'app-btn primary', onClick: () => finish('#/app/pub') }, T('openPub'))]
        : [applyBox(lang, roles, { onChange: () => fillSeats(false) })])
      own.set(roles.agents.length > 0, roles.agents.length ? [h('button', { type: 'button', class: 'app-btn primary', onClick: () => finish('#/app/owner') }, T('openOwner'))] : [])
    })
    root.appendChild(h('div', { class: 'wel-seats' },
      h('div', { class: 'wel-seat active' },
        h('div', { class: 'wel-seat-top' }, h('strong', null, ROLES[0].name[lang]), h('span', { class: 'wel-badge on' }, T('held'))),
        h('p', null, T('learnerRole')),
        h('button', { type: 'button', class: 'app-btn primary', onClick: stepTour }, T('start'))),
      pub.el,
      own.el,
    ))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('skip')))
    fillSeats(false)
  }

  let i = 0
  const stepTour = () => {
    root.innerHTML = ''
    const st = stations[i]
    root.appendChild(h('div', { class: 'wel-head' },
      h('span', { class: 'app-kicker' }, `${T('tourTitle')} · ${String(i + 1).padStart(2, '0')} / ${String(stations.length).padStart(2, '0')}`),
      h('h1', null, st.title[lang]),
      h('p', { class: 'wel-line' }, st.line[lang]),
    ))
    root.appendChild(h('div', { class: 'wel-dots', 'aria-hidden': 'true' }, ...stations.map((_, k) => h('span', { class: k === i ? 'on' : '' }))))
    root.appendChild(h('div', { class: 'app-actions' },
      h('button', { type: 'button', class: 'app-btn', onClick: () => { if (i > 0) { i--; stepTour() } else stepRoles() } }, T('back')),
      i < stations.length - 1
        ? h('button', { type: 'button', class: 'app-btn primary', onClick: () => { i++; stepTour() } }, T('next'))
        : h('button', { type: 'button', class: 'app-btn primary', onClick: stepPick }, T('done')),
    ))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('skip')))
  }

  const stepPick = () => {
    root.innerHTML = ''
    root.appendChild(h('div', { class: 'wel-head' }, h('h1', null, T('pickTitle'))))
    root.appendChild(h('div', { class: 'wel-courses' }, ...LISTED_COURSES.map((c) => h('button', { type: 'button', class: 'wel-course', onClick: () => finish(`#/course/${encodeURIComponent(c.id)}`) },
      h('span', { class: 'app-kicker' }, levelLabel(c.level, lang)),
      h('strong', null, c.title),
      h('span', { class: 'app-muted' }, c.blurb),
    ))))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('later')))
  }

  stepRoles()
  return root
}
