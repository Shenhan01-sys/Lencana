/**
 * `publisher.ts` — dasbor Penerbit `#/app/pub…` (B129, RF7 langkah C2, D64). Untuk akun yang memegang kursi Penerbit:
 * pemegang kunci penerbit, atau anggota yang hibahnya ditandatangani kunci itu (B128). Akun lain melihat syarat + kotak
 * pengajuan, bukan dasbor kosong.
 *
 * Apa yang dibaca di sini, dan dari mana (satu permintaan bertanda tangan `lencana-publisher`, `POST /publisher/overview`):
 *   kursus + aturan        manifest penerbit (ambang, bobot, rubricHash) dan harga `web/src/pricing.ts`
 *   peserta + pendapatan   enrollment dan order lunas (tiap order membawa tx-nya); potongan platform dari `platformBps`
 *                          kontrak pembagian yang dibaca di chain saat itu juga
 *   alur esai              diserahkan → diusulkan (model/agen) → disahkan / disesuaikan / ditolak — tanpa teks karangan
 *   agen                   agen penilai yang disewa, agen pengesah yang ditunjuk, tagihannya
 * Aksi: anggota dengan `hire=1` menyewa agen penilai, dengan `appoint=1` menunjuk agen pengesah — tanda tangan akunnya
 * sendiri, fakta agen dibaca dari registry ERC-8004 lebih dulu. Terbit/cabut kredensial tidak ada di sini (tetap kunci
 * penerbit, CLI).
 */
// Lencana-B129 status=TERBUKA 2026-10-02 — dasbor Penerbit #/app/pub (Ringkasan · Kursus · Peserta · Esai · Agen · Pendapatan) dari POST /publisher/overview, pemilih kursi, dan aksi anggota sewa agen penilai / tunjuk agen pengesah dengan fakta agen dari registry lebih dulu. Buktikan ulang: cd signer && npm run verify:publisher, lalu uji peramban T53. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './dashboard.css'
import './dash-viz.css'
import './dash-catalog.css'
import './publisher.css'
import { h } from '../lib/ui'
import { findCourse } from '../courses/index'
import type { Course } from '../content'
import {
  readPublisherOverview, readAgentRates, memberHireAgent, memberAppointReviewer, learnerAddress,
  type PublisherOverview, type AgentRates,
} from '../learning'
import { formatLdc, PAY_TOKEN_SYMBOL } from '../pricing'
import { renderAuthoring } from './authoring-view'
import { stackBar, type StackPart } from '../lib/charts'
import { coin } from '../lib/coin'
import { emblem, topicColor } from '../lib/emblem'
import { odometer } from '../lib/odometer'
import { skeleton, steps } from '../lib/loading'
import { mountSeatSwitch, applyBox, navIcon, guardSeat } from './seats'
import { agentMarketView } from './agent-market'

type Lang = 'en' | 'id'
type PubSection = 'overview' | 'courses' | 'author' | 'learners' | 'essays' | 'agents' | 'revenue'
type O = PublisherOverview

const COPY = {
  overview: { en: 'Overview', id: 'Ringkasan' },
  author: { en: 'Author a course', id: 'Susun kursus' },
  canAuthor: { en: 'author courses', id: 'susun kursus' },
  courses: { en: 'Courses', id: 'Kursus' },
  learners: { en: 'Learners', id: 'Peserta' },
  essays: { en: 'Essays', id: 'Esai' },
  agents: { en: 'Agents', id: 'Agen' },
  revenue: { en: 'Revenue', id: 'Pendapatan' },
  nav: { en: 'Publisher dashboard', id: 'Dasbor penerbit' },
  kicker: { en: 'PUBLISHER', id: 'PENERBIT' },
  viaIssuer: { en: 'Publisher key', id: 'Kunci penerbit' },
  viaMember: { en: 'Member', id: 'Anggota' },
  since: { en: 'since', id: 'sejak' },
  canHire: { en: 'hire grading agents', id: 'sewa agen penilai' },
  canAppoint: { en: 'appoint reviewer agents', id: 'tunjuk agen pengesah' },
  readAt: { en: 'Read', id: 'Dibaca' },
  reload: { en: 'Reload', id: 'Muat ulang' },
  includeTest: { en: 'Include harness test rows', id: 'Sertakan baris uji harness' },
  stepSign: { en: 'Signing the request', id: 'Menandatangani permintaan' },
  stepRead: { en: 'Reading the publisher’s records and the chain', id: 'Membaca rekaman penerbit dan chain' },
  loading: { en: 'Reading the publisher dashboard…', id: 'Membaca dasbor penerbit…' },
  failed: { en: 'The dashboard could not be read:', id: 'Dasbor tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  noSeatTitle: { en: 'You do not hold the publisher seat yet', id: 'Kamu belum memegang kursi Penerbit' },
  noSeatBody: {
    en: 'This dashboard is for the publisher key and its approved members. Apply below; the publisher key decides.',
    id: 'Dasbor ini untuk kunci penerbit dan anggota yang disetujuinya. Ajukan di bawah; kunci penerbit yang memutuskan.',
  },
  backLearner: { en: 'Back to the learner dashboard', id: 'Kembali ke dasbor peserta' },
  tCourses: { en: 'Courses published', id: 'Kursus terbit' },
  tCoursesOf: { en: 'of', id: 'dari' },
  tLearners: { en: 'Learners', id: 'Peserta' },
  tNet: { en: 'Net revenue', id: 'Pendapatan bersih' },
  tAwaiting: { en: 'Essays awaiting approval', id: 'Esai menunggu pengesahan' },
  money: { en: 'Where the money goes', id: 'Ke mana uangnya' },
  moneyCaption: { en: 'Gross', id: 'Kotor' },
  fromPayments: { en: 'from', id: 'dari' },
  payments: { en: 'paid enrollments', id: 'pendaftaran lunas' },
  netLabel: { en: 'Publisher (net)', id: 'Penerbit (bersih)' },
  feeLabel: { en: 'Platform fee', id: 'Potongan platform' },
  feeNote: { en: 'The fee is read from the SettlementSplit contract on chain 97 at this moment (platformBps), not typed in.', id: 'Potongan dibaca dari kontrak SettlementSplit di chain 97 saat ini juga (platformBps), bukan diketik.' },
  feeUnread: { en: 'The platform fee could not be read from chain — net is not shown rather than guessed.', id: 'Potongan platform tidak terbaca dari chain — angka bersih tidak ditampilkan alih-alih ditebak.' },
  contract: { en: 'contract', id: 'kontrak' },
  dueCharges: { en: 'Agent charges due', id: 'Tagihan agen jatuh tempo' },
  charges: { en: 'charges', id: 'tagihan' },
  pipeline: { en: 'Essay pipeline', id: 'Alur esai' },
  pipeNote: { en: 'A proposed score counts only after a reviewer agent appointed by the publisher approves or adjusts it. Essay texts are not shown here.', id: 'Usulan nilai baru berlaku sesudah agen pengesah yang ditunjuk penerbit mengesahkan atau mengubahnya. Teks karangan tidak ditampilkan di sini.' },
  pJudge: { en: 'Submitted', id: 'Diserahkan' },
  pJudgeSub: { en: 'awaiting a grade', id: 'menunggu dinilai' },
  pReview: { en: 'Proposed', id: 'Diusulkan' },
  pReviewSub: { en: 'awaiting approval', id: 'menunggu pengesahan' },
  pDone: { en: 'Final', id: 'Final' },
  pDoneSub: { en: 'approved or adjusted', id: 'disahkan atau disesuaikan' },
  pGraded: { en: 'graded directly by the publisher key', id: 'dinilai langsung kunci penerbit' },
  pRejected: { en: 'Rejected', id: 'Ditolak' },
  pRejectedSub: { en: 'no valid score', id: 'tanpa nilai sah' },
  pInsufficient: { en: 'below the mechanical minimum', id: 'di bawah syarat mekanis' },
  perCourse: { en: 'Per course', id: 'Per kursus' },
  price: { en: 'Price', id: 'Harga' },
  free: { en: 'free', id: 'gratis' },
  enrolled: { en: 'Enrolled', id: 'Terdaftar' },
  paidWord: { en: 'paid', id: 'lunas' },
  gross: { en: 'Gross', id: 'Kotor' },
  net: { en: 'Net', id: 'Bersih' },
  waiting: { en: 'Awaiting approval', id: 'Menunggu pengesahan' },
  agentsCol: { en: 'Agents', id: 'Agen' },
  testTag: { en: 'test class', id: 'kelas uji' },
  team: { en: 'Team', id: 'Tim' },
  teamNote: { en: 'Members are granted by the publisher key; issuing and revoking credentials stays with that key.', id: 'Anggota diberikan oleh kunci penerbit; menerbitkan dan mencabut kredensial tetap pada kunci itu.' },
  pending: { en: 'requests waiting for the publisher key', id: 'pengajuan menunggu kunci penerbit' },
  noMembers: { en: 'No members yet.', id: 'Belum ada anggota.' },
  you: { en: 'you', id: 'kamu' },
  passMark: { en: 'Pass mark', id: 'Ambang' },
  weights: { en: 'Weights', id: 'Bobot' },
  quiz: { en: 'Quiz', id: 'Kuis' },
  essay: { en: 'Essay', id: 'Esai' },
  practice: { en: 'Practice', id: 'Praktik' },
  graders: { en: 'Grading agents', id: 'Agen penilai' },
  reviewers: { en: 'Reviewers', id: 'Pengesah' },
  none: { en: 'none', id: 'belum ada' },
  publicPage: { en: 'Public course page', id: 'Halaman kursus publik' },
  learner: { en: 'Learner', id: 'Peserta' },
  course: { en: 'Course', id: 'Kursus' },
  status: { en: 'Status', id: 'Status' },
  enrolledAt: { en: 'Enrolled', id: 'Terdaftar' },
  payment: { en: 'Payment', id: 'Pembayaran' },
  noLearners: { en: 'No learners yet.', id: 'Belum ada peserta.' },
  stActive: { en: 'active', id: 'aktif' },
  stCompleted: { en: 'completed', id: 'selesai' },
  learnersNote: { en: 'Learning-wallet addresses. The publisher does not store learners’ emails.', id: 'Alamat dompet belajar. Penerbit tidak menyimpan email peserta.' },
  lesson: { en: 'Lesson', id: 'Lesson' },
  attempt: { en: 'Attempt', id: 'Usaha' },
  words: { en: 'Words', id: 'Kata' },
  proposal: { en: 'Proposal', id: 'Usulan' },
  decision: { en: 'Decision', id: 'Keputusan' },
  when: { en: 'When', id: 'Waktu' },
  byModel: { en: 'model', id: 'model' },
  byAgent: { en: 'agent', id: 'agen' },
  noEssays: { en: 'No essays yet.', id: 'Belum ada esai.' },
  sJudge: { en: 'awaiting grade', id: 'menunggu dinilai' },
  sReview: { en: 'awaiting approval', id: 'menunggu pengesahan' },
  sApproved: { en: 'approved', id: 'disahkan' },
  sAdjusted: { en: 'adjusted', id: 'disesuaikan' },
  sRejected: { en: 'rejected', id: 'ditolak' },
  sInsufficient: { en: 'below minimum', id: 'di bawah syarat' },
  sGraded: { en: 'graded by publisher key', id: 'dinilai kunci penerbit' },
  hired: { en: 'Grading agents hired', id: 'Agen penilai yang disewa' },
  appointed: { en: 'Reviewer agents appointed', id: 'Agen pengesah yang ditunjuk' },
  wallet: { en: 'wallet', id: 'dompet' },
  owner: { en: 'Agent Owner', id: 'Agent Owner' },
  by: { en: 'by', id: 'oleh' },
  byKey: { en: 'publisher key', id: 'kunci penerbit' },
  byMemberWord: { en: 'member', id: 'anggota' },
  notAgent: { en: 'address, not an agent', id: 'alamat, bukan agen' },
  chargesTitle: { en: 'Agent charges', id: 'Tagihan agen' },
  chargesNote: { en: 'Charges are paid from the publisher’s wallet over x402 — that payment stays with the publisher key.', id: 'Tagihan dibayar dari dompet penerbit lewat x402 — pembayaran itu tetap pada kunci penerbit.' },
  activity: { en: 'Activity', id: 'Aktivitas' },
  label: { en: 'Difficulty', id: 'Tingkat berat' },
  amount: { en: 'Amount', id: 'Jumlah' },
  due: { en: 'due', id: 'jatuh tempo' },
  paidState: { en: 'paid', id: 'lunas' },
  noCharges: { en: 'No charges yet.', id: 'Belum ada tagihan.' },
  manualTitle: { en: 'Agent not in the market yet? Look it up by its number', id: 'Agen belum ada di bursa? Cari dengan nomornya' },
  hireTitle: { en: 'Hire a grading agent', id: 'Sewa agen penilai' },
  appointTitle: { en: 'Appoint a reviewer agent', id: 'Tunjuk agen pengesah' },
  agentId: { en: 'ERC-8004 agent id', id: 'agentId ERC-8004' },
  lookUp: { en: 'Read the agent from the registry', id: 'Baca agen dari registry' },
  reading: { en: 'Reading the registry…', id: 'Membaca registry…' },
  tariff: { en: 'base tariff', id: 'tarif dasar' },
  ladder: { en: 'per activity, by difficulty', id: 'per aktivitas, menurut tingkat berat' },
  signHire: { en: 'Sign and hire', id: 'Tandatangani & sewa' },
  signAppoint: { en: 'Sign and appoint', id: 'Tandatangani & tunjuk' },
  signing: { en: 'Signing…', id: 'Menandatangani…' },
  doneHire: { en: 'Hired — recorded under your address.', id: 'Disewa — tercatat atas alamatmu.' },
  doneAppoint: { en: 'Appointed — recorded under your address.', id: 'Ditunjuk — tercatat atas alamatmu.' },
  noHire: { en: 'Your membership does not include hiring (hire=1).', id: 'Keanggotaanmu tidak mencakup sewa agen (hire=1).' },
  noAppoint: { en: 'Your membership does not include appointing (appoint=1).', id: 'Keanggotaanmu tidak mencakup penunjukan (appoint=1).' },
  actNote: { en: 'Rules the server enforces: the agent’s wallet, owner and tariff come from the registry; an agent you own cannot be hired or appointed by you; a course’s grading agent cannot also be its reviewer.', id: 'Aturan yang ditegakkan server: dompet, pemilik, dan tarif agen dibaca dari registry; agen milikmu tidak bisa kamu sewa atau tunjuk; agen penilai sebuah kursus tidak bisa sekaligus pengesahnya.' },
  revTitle: { en: 'Paid enrollments', id: 'Pendaftaran lunas' },
  revNone: { en: 'No paid enrollments yet.', id: 'Belum ada pendaftaran lunas.' },
  platformCol: { en: 'Platform', id: 'Platform' },
  tx: { en: 'Transaction', id: 'Transaksi' },
  byCourse: { en: 'Gross by course', id: 'Kotor per kursus' },
} satisfies Record<string, Record<Lang, string>>

const NAV: { id: PubSection, href: string, icon: string }[] = [
  { id: 'overview', href: '#/app/pub', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { id: 'courses', href: '#/app/pub/courses', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5' },
  // B133: menyusun kursus baru — draf → diajukan → terbit (kunci penerbit).
  { id: 'author', href: '#/app/pub/author', icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4zM4 4h7M4 8h4' },
  { id: 'learners', href: '#/app/pub/learners', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'essays', href: '#/app/pub/essays', icon: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z' },
  { id: 'agents', href: '#/app/pub/agents', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 5h4v4h-4z' },
  { id: 'revenue', href: '#/app/pub/revenue', icon: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
]

const SHORT: Record<PubSection, Record<Lang, string>> = {
  overview: { en: 'Overview', id: 'Ringkasan' },
  courses: { en: 'Courses', id: 'Kursus' },
  author: { en: 'Author', id: 'Susun' },
  learners: { en: 'Learners', id: 'Peserta' },
  essays: { en: 'Essays', id: 'Esai' },
  agents: { en: 'Agents', id: 'Agen' },
  revenue: { en: 'Revenue', id: 'Uang' },
}

const SCAN = 'https://testnet.bscscan.com'
const REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e'
const short = (a: string | null | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')
const ldc = (units: string | null) => (units === null ? '—' : `${formatLdc(BigInt(units))} ${PAY_TOKEN_SYMBOL}`)
const enter = (i: number) => ({ '--i': String(i) }) as Partial<CSSStyleDeclaration>

function sectionOf (routeHash: string): PubSection {
  const seg = routeHash.replace(/^#\/?/, '').split('/')[2] ?? ''
  return (['courses', 'author', 'learners', 'essays', 'agents', 'revenue'] as const).find((s) => s === seg) ?? 'overview'
}

/* ------------------------------------------------------------------ data: satu bacaan per muat halaman */
const TEST_KEY = 'lencana-pub-include-test'
let includeTest = (() => { try { return sessionStorage.getItem(TEST_KEY) === '1' } catch { return false } })()
let memo: { key: string, data: O } | null = null
let inflight: { key: string, p: Promise<{ ok: boolean, status?: number, why?: string, data?: O }> } | null = null
function overview (fresh: boolean, onStep?: (i: 0 | 1) => void): Promise<{ ok: boolean, status?: number, why?: string, data?: O }> {
  const key = `${learnerAddress() ?? ''}|${includeTest ? 1 : 0}`
  if (!fresh && memo?.key === key) return Promise.resolve({ ok: true, data: memo.data })
  if (inflight?.key === key) return inflight.p
  const p = readPublisherOverview(includeTest, onStep).then((r) => { if (r.ok && r.data) memo = { key, data: r.data }; return r }).finally(() => { inflight = null })
  inflight = { key, p }
  return p
}

/* ------------------------------------------------------------------ cangkang */
export function renderPublisherApp (lang: Lang, routeHash: string): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const section = sectionOf(routeHash)
  const main = h('main', { class: 'dash-main pb-main' })
  const sideSlot = h('div', { class: 'seat-slot side' })
  const topSlot = h('div', { class: 'seat-slot top' })
  const shell = h('div', { class: 'app-shell pb-shell' },
    h('nav', { class: 'app-side', 'aria-label': T('nav') },
      sideSlot,
      ...NAV.map((n) => h('a', { href: n.href, class: n.id === section ? 'active' : '', 'aria-current': n.id === section ? 'page' : 'false' },
        navIcon(n.icon), h('span', { class: 'nav-full' }, T(n.id)), h('span', { class: 'nav-short', 'aria-hidden': 'true' }, SHORT[n.id][lang])))),
    main)
  main.appendChild(topSlot)
  mountSeatSwitch(lang, 'publisher', [sideSlot, topSlot])
  const head = h('header', { class: 'app-head pb-head' }, h('span', { class: 'app-kicker' }, T('kicker')), h('h1', null, T(section)))
  const body = h('div', { class: 'app-body' })
  main.append(head, body)

  const load = (fresh: boolean) => {
    const progress = steps([T('stepSign'), T('stepRead')])
    body.replaceChildren(h('div', { class: 'app-loading' }, progress, skeleton(section === 'overview' ? 'stats' : 'list', T('loading'))))
    // B131: akun nyata berperan lain dikirim ke dasbor perannya sendiri (guardSeat); akun dev dan yang belum berperan tidak.
    guardSeat('publisher', (s) => {
      if (!body.isConnected) return
      if (!s.ok || !s.roles) {
        body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${s.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: () => load(true) }, T('retry'))))
        return
      }
      if (!s.roles.publisher) {
        // Bukan pemegang kursi: syarat + kotak pengajuan, bukan dasbor kosong.
        body.replaceChildren(h('section', { class: 'app-card pb-noseat' },
          h('h2', null, T('noSeatTitle')),
          h('p', { class: 'app-muted' }, T('noSeatBody')),
          applyBox(lang, s.roles, { withNote: true, onChange: () => load(false) }),
          // B131: akun berperan Penerbit tidak punya dasbor peserta untuk dituju.
          s.roles.account.role === 'publisher' && !s.roles.account.dev ? null : h('a', { class: 'app-btn small', href: '#/app' }, T('backLearner'))))
        return
      }
      // B133: "Susun kursus" membaca drafnya sendiri (POST /publisher/drafts), bukan ringkasan dasbor.
      if (section === 'author') { body.replaceChildren(renderAuthoring(lang)); return }
      void overview(fresh, (i) => progress.set(i)).then((r) => {
        if (!body.isConnected) return
        if (!r.ok || !r.data) {
          body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: () => load(true) }, T('retry'))))
          return
        }
        const o = r.data
        head.replaceChildren(
          h('span', { class: 'app-kicker' }, `${T('kicker')} · ${o.issuer.name ?? short(o.issuer.address)}`),
          h('h1', null, T(section)),
          seatLine(lang, o, () => load(true)))
        body.replaceChildren(renderSection(lang, section, o, () => load(true)))
      })
    })
  }
  load(false)
  return shell
}

/** Baris kursi pembaca + kapan dibaca + saklar baris uji. */
function seatLine (lang: Lang, o: O, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const s = o.seat
  const since = s.since ? ` ${T('since')} ${new Date(s.since).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' })}` : ''
  const toggle = h('input', { type: 'checkbox', checked: includeTest }) as HTMLInputElement
  toggle.addEventListener('change', () => {
    includeTest = toggle.checked
    try { sessionStorage.setItem(TEST_KEY, includeTest ? '1' : '0') } catch { /* tanpa storage: saklar berlaku untuk tab ini saja */ }
    reload()
  })
  return h('div', { class: 'pb-seatline' },
    h('span', { class: 'pb-seat' }, h('b', null, s.via === 'issuer' ? T('viaIssuer') : T('viaMember')), since),
    h('span', { class: `pb-right ${s.canHire ? 'on' : 'off'}` }, T('canHire')),
    h('span', { class: `pb-right ${s.canAppoint ? 'on' : 'off'}` }, T('canAppoint')),
    h('span', { class: `pb-right ${s.canAuthor ? 'on' : 'off'}` }, T('canAuthor')),
    h('span', { class: 'pb-read' }, `${T('readAt')} ${new Date(o.generatedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'id-ID', { timeStyle: 'short' })}`),
    h('label', { class: 'pb-toggle' }, toggle, h('span', null, T('includeTest'))),
    h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('reload')))
}

function renderSection (lang: Lang, section: PubSection, o: O, reload: () => void): HTMLElement {
  switch (section) {
    case 'courses': return renderCourses(lang, o)
    case 'learners': return renderLearners(lang, o)
    case 'essays': return renderEssays(lang, o)
    case 'agents': return renderAgents(lang, o, reload)
    case 'revenue': return renderRevenue(lang, o)
    default: return renderOverview(lang, o)
  }
}

/* ------------------------------------------------------------------ potongan bersama */
function tile (value: string, label: string, i: number, extra?: { coinEl?: HTMLElement, href?: string, sub?: string }): HTMLElement {
  const body = [h('b', null, extra?.coinEl ?? null, odometer(value, { from: value.replace(/\d/g, '0') }), extra?.sub ? h('small', null, extra.sub) : null), h('span', null, label)]
  return extra?.href
    ? h('a', { class: 'app-stat ov-tile lc-enter link', href: extra.href, style: enter(i) }, ...body)
    : h('div', { class: 'app-stat ov-tile lc-enter', style: enter(i) }, ...body)
}

function moneyCard (lang: Lang, o: O, i: number): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const t = o.totals
  const card = h('section', { class: 'app-card ov-card lc-enter pb-money', style: enter(i) }, h('h2', null, T('money')))
  const caption = `${T('moneyCaption')} ${ldc(t.gross)} — ${T('fromPayments')} ${t.paidEnrollments} ${T('payments')}`
  if (t.net === null || t.platform === null || o.platformBps === null) {
    card.appendChild(h('p', null, caption))
    card.appendChild(h('p', { class: 'app-note' }, T('feeUnread')))
  } else {
    const parts: StackPart[] = [
      { label: T('netLabel'), value: Number(BigInt(t.net)), cls: 'pb-net', display: ldc(t.net) },
      { label: `${T('feeLabel')} ${o.platformBps / 100}%`, value: Number(BigInt(t.platform)), cls: 'pb-fee', display: ldc(t.platform) },
    ]
    card.appendChild(stackBar(parts, caption))
    card.appendChild(h('p', { class: 'app-muted ov-small' }, T('feeNote'), ' ',
      o.split ? h('a', { href: `${SCAN}/address/${o.split}`, target: '_blank', rel: 'noopener noreferrer' }, `${T('contract')} ${short(o.split)} ↗`) : null))
  }
  const due = t.chargesDue
  card.appendChild(h('div', { class: 'pb-due' }, h('span', { class: 'pb-due-dot', 'aria-hidden': 'true' }),
    h('span', null, `${T('dueCharges')}: `, h('b', null, `${due.count} ${T('charges')} · ${ldc(due.amount)}`))))
  return card
}

function pipelineCard (lang: Lang, o: O, i: number): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const p = o.essays.pipeline
  const node = (n: number, label: string, sub: string, cls: string, href?: string) => {
    const inner = [h('span', { class: 'pb-node-n' }, odometer(String(n), { from: '0' })), h('strong', null, label), h('small', null, sub)]
    return href && n > 0 ? h('a', { class: `pb-node ${cls}`, href }, ...inner) : h('div', { class: `pb-node ${cls}` }, ...inner)
  }
  const arrow = () => h('span', { class: 'pb-arrow', 'aria-hidden': 'true' })
  return h('section', { class: 'app-card ov-card lc-enter pb-pipe', style: enter(i) },
    h('h2', null, T('pipeline')),
    h('div', { class: 'pb-nodes' },
      node(p.awaitingJudge + p.insufficient, T('pJudge'), p.insufficient ? `${T('pJudgeSub')} · ${p.insufficient} ${T('pInsufficient')}` : T('pJudgeSub'), 'judge'),
      arrow(),
      node(p.awaitingReview, T('pReview'), T('pReviewSub'), p.awaitingReview ? 'review hot' : 'review', '#/app/pub/essays'),
      arrow(),
      h('div', { class: 'pb-fork' },
        node(p.approved + p.adjusted + p.graded, T('pDone'), p.graded ? `${T('pDoneSub')} · ${p.graded} ${T('pGraded')}` : T('pDoneSub'), 'done'),
        node(p.rejected, T('pRejected'), T('pRejectedSub'), 'rejected'))),
    h('p', { class: 'app-muted ov-small' }, T('pipeNote')))
}

function courseOf (id: string | null): Course | undefined { return id ? findCourse(id) : undefined }

function agentLink (agentId: string): HTMLElement {
  return h('a', { class: 'pb-agent-chip', href: `${SCAN}/token/${REGISTRY}?a=${encodeURIComponent(agentId)}`, target: '_blank', rel: 'noopener noreferrer', title: 'ERC-8004' }, `#${agentId}`)
}

/* ------------------------------------------------------------------ Ringkasan */
function renderOverview (lang: Lang, o: O): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const t = o.totals
  const wrap = h('div', { class: 'app-stack ov pb' })
  wrap.appendChild(h('div', { class: 'app-stats ov-tiles' },
    tile(String(t.listedCourses), T('tCourses'), 0, { sub: t.courses > t.listedCourses ? `${T('tCoursesOf')} ${t.courses}` : undefined, href: '#/app/pub/courses' }),
    tile(String(t.learners), T('tLearners'), 1, { href: '#/app/pub/learners' }),
    tile(t.net === null ? '—' : formatLdc(BigInt(t.net)), `${T('tNet')} · ${PAY_TOKEN_SYMBOL}`, 2, { coinEl: coin(22), href: '#/app/pub/revenue' }),
    tile(String(t.essaysAwaitingReview), T('tAwaiting'), 3, { href: '#/app/pub/essays' })))
  wrap.appendChild(h('div', { class: 'ov-grid' }, moneyCard(lang, o, 1), pipelineCard(lang, o, 2)))

  // Per kursus: satu baris tiap kursus — uang, peserta, esai yang menunggu, dan agennya.
  const rows = o.courses.map((c) => {
    const course = courseOf(c.id)
    return h('tr', { style: { '--tc': topicColor(c.topic ?? undefined) } as Partial<CSSStyleDeclaration> },
      h('td', { 'data-label': T('course') }, h('span', { class: 'pb-course' }, course ? emblem(course, 28) : null,
        h('span', null, c.title, c.unlisted ? h('span', { class: 'app-tag' }, T('testTag')) : null))),
      h('td', { class: 'num', 'data-label': T('price') }, c.price === null ? T('free') : ldc(c.price)),
      h('td', { class: 'num', 'data-label': T('enrolled') }, `${c.enrollments}`, h('small', null, ` · ${c.paid} ${T('paidWord')}`)),
      h('td', { class: 'num', 'data-label': T('gross') }, ldc(c.gross)),
      h('td', { class: 'num', 'data-label': T('net') }, ldc(c.net)),
      h('td', { class: 'num', 'data-label': T('waiting') }, c.essays.awaitingReview ? h('span', { class: 'gr-chip wait' }, String(c.essays.awaitingReview)) : '0'),
      h('td', { 'data-label': T('agentsCol') }, ...(c.graders.length ? c.graders.map(agentLink) : [h('span', { class: 'app-muted' }, '—')])))
  })
  wrap.appendChild(h('section', { class: 'app-card lc-enter', style: enter(3) },
    h('h2', null, T('perCourse')),
    h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
      h('thead', null, h('tr', null, ...[T('course'), T('price'), T('enrolled'), T('gross'), T('net'), T('waiting'), T('agentsCol')].map((x, k) => h('th', { class: k >= 1 && k <= 5 ? 'num' : '' }, x)))),
      h('tbody', null, ...rows)))))

  // Tim: siapa saja anggota + pengajuan yang menunggu kunci penerbit.
  const me = (learnerAddress() ?? '').toLowerCase()
  const team = h('section', { class: 'app-card lc-enter pb-team', style: enter(4) }, h('h2', null, T('team')))
  if (!o.team.members.length) team.appendChild(h('p', { class: 'app-muted' }, T('noMembers')))
  else {
    team.appendChild(h('ul', { class: 'pb-members' }, ...o.team.members.map((m) => h('li', null,
      h('code', null, short(m.member)), m.member.toLowerCase() === me ? h('span', { class: 'app-tag' }, T('you')) : null,
      h('span', { class: `pb-right ${m.canHire ? 'on' : 'off'}` }, T('canHire')),
      h('span', { class: `pb-right ${m.canAppoint ? 'on' : 'off'}` }, T('canAppoint'))))))
  }
  team.appendChild(h('p', { class: 'app-muted ov-small' }, `${o.team.pendingRequests} ${T('pending')}. ${T('teamNote')}`))
  wrap.appendChild(team)
  return wrap
}

/* ------------------------------------------------------------------ Kursus */
function renderCourses (lang: Lang, o: O): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  return h('div', { class: 'pb-courses' }, ...o.courses.map((c, i) => {
    const course = courseOf(c.id)
    const w = c.weights
    return h('article', { class: 'app-card pb-ccard lc-enter', style: { ...enter(i), '--tc': topicColor(c.topic ?? undefined) } as Partial<CSSStyleDeclaration> },
      h('div', { class: 'pb-ccard-head' },
        course ? emblem(course, 56) : null,
        h('div', null,
          h('small', { class: 'pb-meta' }, `${c.level}${c.topic ? ` · ${c.topic}` : ''}`, c.unlisted ? h('span', { class: 'app-tag' }, T('testTag')) : null),
          h('h3', null, c.title),
          h('span', { class: 'pb-price' }, coin(14), c.price === null ? T('free') : ldc(c.price)))),
      h('dl', { class: 'pb-facts' },
        h('div', null, h('dt', null, T('enrolled')), h('dd', null, `${c.enrollments} · ${c.paid} ${T('paidWord')}`)),
        h('div', null, h('dt', null, T('gross')), h('dd', null, ldc(c.gross))),
        h('div', null, h('dt', null, T('net')), h('dd', null, ldc(c.net))),
        h('div', null, h('dt', null, T('waiting')), h('dd', null, String(c.essays.awaitingReview)))),
      h('div', { class: 'pb-rule' },
        h('div', { class: 'pb-weights', role: 'img', 'aria-label': `${T('quiz')} ${w.kuis} · ${T('essay')} ${w.esai} · ${T('practice')} ${w.praktik} · ${T('passMark')} ${c.passMark}` },
          h('span', { class: 'w-kuis', style: { width: `${w.kuis}%` } }), h('span', { class: 'w-esai', style: { width: `${w.esai}%` } }), h('span', { class: 'w-praktik', style: { width: `${w.praktik}%` } }),
          h('i', { class: 'pb-pass', style: { left: `${c.passMark}%` } })),
        h('small', null, `${T('weights')}: ${T('quiz')} ${w.kuis} · ${T('essay')} ${w.esai} · ${T('practice')} ${w.praktik} — ${T('passMark')} ${c.passMark}`),
        c.rubricHash ? h('small', null, 'rubricHash ', h('code', null, `${c.rubricHash.slice(0, 14)}…`)) : null),
      h('div', { class: 'pb-agents-line' },
        h('span', null, `${T('graders')}: `, ...(c.graders.length ? c.graders.map(agentLink) : [h('em', null, T('none'))])),
        h('span', null, `${T('reviewers')}: `, ...(c.reviewers.length ? c.reviewers.map((r) => (r.startsWith('agent:') ? agentLink(r.slice(6)) : h('code', null, short(r)))) : [h('em', null, T('none'))]))),
      h('a', { class: 'app-btn small', href: `#/course/${encodeURIComponent(c.id)}` }, T('publicPage')))
  }))
}

/* ------------------------------------------------------------------ Peserta */
function renderLearners (lang: Lang, o: O): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const card = h('section', { class: 'app-card lc-enter' })
  if (!o.learners.length) { card.appendChild(h('p', { class: 'app-muted' }, T('noLearners'))); return card }
  const fmt = (iso: string) => new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  card.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
    h('thead', null, h('tr', null, h('th', null, T('learner')), h('th', null, T('course')), h('th', null, T('status')), h('th', null, T('enrolledAt')), h('th', null, T('payment')))),
    h('tbody', null, ...o.learners.map((l) => h('tr', null,
      h('td', { 'data-label': T('learner') }, h('code', null, short(l.learner)), l.origin === 'test' ? h('span', { class: 'app-tag' }, 'test') : null),
      h('td', { 'data-label': T('course') }, courseOf(l.courseId)?.title ?? l.courseId),
      h('td', { 'data-label': T('status') }, h('span', { class: `gr-chip ${l.status === 'active' || l.status === 'completed' ? 'ok' : 'none'}` },
        l.status === 'active' ? T('stActive') : l.status === 'completed' ? T('stCompleted') : l.status)),
      h('td', { 'data-label': T('enrolledAt') }, fmt(l.enrolledAt)),
      h('td', { 'data-label': T('payment') }, l.paid
        ? h('span', { class: 'pb-pay' }, coin(14), ldc(l.paid.amount), l.paid.tx ? h('a', { href: `${SCAN}/tx/${l.paid.tx}`, target: '_blank', rel: 'noopener noreferrer' }, ` ${l.paid.tx.slice(0, 8)}… ↗`) : null)
        : h('span', { class: 'app-muted' }, T('free')))))))))
  card.appendChild(h('p', { class: 'app-muted ov-small' }, T('learnersNote')))
  return card
}

/* ------------------------------------------------------------------ Esai */
function renderEssays (lang: Lang, o: O): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack' }, pipelineCard(lang, o, 0))
  const card = h('section', { class: 'app-card lc-enter', style: enter(1) })
  if (!o.essays.recent.length) { card.appendChild(h('p', { class: 'app-muted' }, T('noEssays'))); wrap.appendChild(card); return wrap }
  const statusChip = (s: string) => {
    const map: Record<string, [string, string]> = {
      awaitingJudge: [T('sJudge'), 'none'], insufficient: [T('sInsufficient'), 'bad'], awaitingReview: [T('sReview'), 'wait'],
      approved: [T('sApproved'), 'ok'], adjusted: [T('sAdjusted'), 'ok'], rejected: [T('sRejected'), 'bad'], graded: [T('sGraded'), 'ok'],
    }
    const [text, cls] = map[s] ?? [s, 'none']
    return h('span', { class: `gr-chip ${cls}` }, text)
  }
  const lessonTitle = (courseId: string | null, slug: string) => {
    for (const m of courseOf(courseId)?.modules ?? []) for (const l of m.lessons) if (l.slug === slug) return l.title
    return slug
  }
  card.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
    h('thead', null, h('tr', null, ...[T('lesson'), T('learner'), T('attempt'), T('words'), T('proposal'), T('status'), T('decision'), T('when')].map((x) => h('th', null, x)))),
    h('tbody', null, ...o.essays.recent.map((e) => h('tr', null,
      h('td', { 'data-label': T('lesson') }, h('strong', null, lessonTitle(e.courseId, e.lesson)), h('small', { class: 'pb-sub' }, courseOf(e.courseId)?.title ?? e.courseId ?? '')),
      h('td', { 'data-label': T('learner') }, h('code', null, short(e.learner))),
      h('td', { class: 'num', 'data-label': T('attempt') }, `#${e.attemptNo}`),
      h('td', { class: 'num', 'data-label': T('words') }, e.words === null ? '—' : String(e.words)),
      h('td', { 'data-label': T('proposal') }, e.proposed === null ? '—' : h('span', null, h('b', null, String(e.proposed)), ' ',
        h('small', null, e.proposedBy?.startsWith('agent:') ? `${T('byAgent')} #${e.proposedBy.slice(6)}` : e.proposedBy ? T('byModel') : ''), e.label ? h('small', { class: 'pb-label' }, e.label) : null)),
      h('td', { 'data-label': T('status') }, statusChip(e.status)),
      h('td', { 'data-label': T('decision') }, e.review
        ? h('span', null, e.review.finalScore === null ? '—' : h('b', null, String(e.review.finalScore)), e.review.reviewerAgent ? h('small', null, ` ${T('byAgent')} #${e.review.reviewerAgent}`) : null)
        : '—'),
      h('td', { 'data-label': T('when') }, new Date(e.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }))))))))
  wrap.appendChild(card)
  return wrap
}

/* ------------------------------------------------------------------ Agen */
// B138 (D70): tab Agen = bursa agen (pages/agent-market.ts). Formulir nomor agen lama tetap ada, dilipat, untuk agen yang
// belum dikenal platform; tagihan agen tetap di bawahnya.
function renderAgents (lang: Lang, o: O, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const manual = h('details', { class: 'app-card pb-manual lc-enter', style: enter(4) },
    h('summary', null, T('manualTitle')),
    h('div', { class: 'ov-grid' }, actionForm(lang, o, 'hire', reload), actionForm(lang, o, 'appoint', reload)))

  const charges = h('section', { class: 'app-card lc-enter', style: enter(4) }, h('h2', null, T('chargesTitle')),
    h('div', { class: 'pb-due' }, h('span', { class: 'pb-due-dot', 'aria-hidden': 'true' }),
      h('span', null, `${T('due')}: `, h('b', null, `${o.totals.chargesDue.count} · ${ldc(o.totals.chargesDue.amount)}`), ` · ${T('paidState')}: `, h('b', null, `${o.totals.chargesPaid.count} · ${ldc(o.totals.chargesPaid.amount)}`))))
  if (o.agents.charges.length) {
    charges.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
      h('thead', null, h('tr', null, ...[T('activity'), T('agentsCol'), T('label'), T('amount'), T('status')].map((x, k) => h('th', { class: k === 3 ? 'num' : '' }, x)))),
      h('tbody', null, ...o.agents.charges.map((c) => h('tr', null,
        h('td', { 'data-label': T('activity') }, c.activity === 'review' ? T('reviewers') : T('graders')),
        h('td', { 'data-label': T('agentsCol') }, agentLink(c.agentId)),
        h('td', { 'data-label': T('label') }, c.label ?? '—'),
        h('td', { class: 'num', 'data-label': T('amount') }, ldc(c.amount)),
        h('td', { 'data-label': T('status') }, h('span', { class: `gr-chip ${c.status === 'paid' ? 'ok' : 'wait'}` }, c.status === 'paid' ? T('paidState') : T('due')))))))))
  } else charges.appendChild(h('p', { class: 'app-muted' }, T('noCharges')))
  charges.appendChild(h('p', { class: 'app-muted ov-small' }, T('chargesNote')))
  return agentMarketView(lang, o, reload, [manual, charges])
}

/**
 * Formulir aksi anggota: pilih kursus + agentId → fakta agen dibaca dari registry (dompet, pemilik, tarif) → baru
 * tombol tanda tangan muncul. Tidak ada angka atau dompet yang diketik tangan masuk ke pesan.
 */
function actionForm (lang: Lang, o: O, kind: 'hire' | 'appoint', reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const allowed = kind === 'hire' ? o.seat.canHire : o.seat.canAppoint
  const card = h('section', { class: `app-card lc-enter pb-act${allowed ? '' : ' off'}`, style: enter(kind === 'hire' ? 2 : 3) },
    h('h2', null, kind === 'hire' ? T('hireTitle') : T('appointTitle')))
  if (!allowed) { card.appendChild(h('p', { class: 'app-muted' }, kind === 'hire' ? T('noHire') : T('noAppoint'))); return card }
  const courseSel = h('select', { class: 'pb-input', 'aria-label': T('course') },
    ...o.courses.map((c) => h('option', { value: c.id }, `${c.title}${c.unlisted ? ` (${T('testTag')})` : ''}`))) as HTMLSelectElement
  const idInput = h('input', { class: 'pb-input', inputmode: 'numeric', pattern: '[0-9]*', placeholder: kind === 'hire' ? '2534' : '2542', 'aria-label': T('agentId') }) as HTMLInputElement
  const look = h('button', { type: 'button', class: 'app-btn small' }, T('lookUp')) as HTMLButtonElement
  const facts = h('div', { class: 'pb-facts-box' })
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  let rates: AgentRates | null = null
  const sign = h('button', { type: 'button', class: 'app-btn primary small', hidden: true }, kind === 'hire' ? T('signHire') : T('signAppoint')) as HTMLButtonElement
  const resetFacts = () => { rates = null; sign.hidden = true; facts.replaceChildren(); status.textContent = ''; status.className = 'seat-apply-status' }
  idInput.addEventListener('input', resetFacts)
  courseSel.addEventListener('change', () => { status.textContent = '' })
  look.addEventListener('click', () => {
    const id = idInput.value.trim()
    resetFacts()
    look.disabled = true
    status.textContent = T('reading')
    void readAgentRates(id).then((r) => {
      look.disabled = false
      if (!r.ok || !r.rates) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      rates = r.rates
      status.textContent = ''
      const card8004 = r.rates
      const min = card8004.rateCard[0]?.amount
      const max = card8004.rateCard[card8004.rateCard.length - 1]?.amount
      facts.replaceChildren(h('div', { class: 'pb-idcard solo' },
        h('div', { class: 'pb-idcard-top' }, agentLink(card8004.agentId), h('span', null, 'ERC-8004')),
        h('small', null, `${T('wallet')} `, h('code', null, short(card8004.wallet))),
        h('small', null, `${T('owner')} `, h('code', null, short(card8004.owner))),
        h('small', null, `${T('tariff')} ${ldc(card8004.baseTariff)}${min && max ? ` · ${ldc(min)}–${ldc(max)} ${T('ladder')}` : ''}`)))
      sign.hidden = false
    })
  })
  sign.addEventListener('click', () => {
    if (!rates) return
    sign.disabled = true
    status.className = 'seat-apply-status'
    status.textContent = T('signing')
    const act = kind === 'hire' ? memberHireAgent(courseSel.value, rates.agentId) : memberAppointReviewer(courseSel.value, rates.agentId, rates.wallet)
    void act.then((r) => {
      sign.disabled = false
      if (!r.ok) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      status.className = 'seat-apply-status ok'
      status.textContent = kind === 'hire' ? T('doneHire') : T('doneAppoint')
      setTimeout(reload, 900)
    })
  })
  card.append(
    h('div', { class: 'pb-form' },
      h('label', null, h('span', null, T('course')), courseSel),
      h('label', null, h('span', null, T('agentId')), idInput),
      look),
    facts,
    h('div', { class: 'seat-apply-row' }, sign, status),
    h('p', { class: 'app-muted ov-small' }, T('actNote')))
  return card
}

/* ------------------------------------------------------------------ Pendapatan */
function renderRevenue (lang: Lang, o: O): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack' }, moneyCard(lang, o, 0))
  // Kotor per kursus sebagai batang — satu panjang per kursus, warna topik kursus itu.
  const max = o.courses.reduce((m, c) => (BigInt(c.gross) > m ? BigInt(c.gross) : m), 0n)
  const bars = o.courses.filter((c) => BigInt(c.gross) > 0n).sort((a, b) => (BigInt(b.gross) > BigInt(a.gross) ? 1 : -1))
  if (bars.length) {
    wrap.appendChild(h('section', { class: 'app-card lc-enter', style: enter(1) }, h('h2', null, T('byCourse')),
      h('ul', { class: 'pb-bars' }, ...bars.map((c) => h('li', { style: { '--tc': topicColor(c.topic ?? undefined) } as Partial<CSSStyleDeclaration> },
        h('span', { class: 'pb-bar-label' }, c.title),
        h('span', { class: 'pb-bar-track' }, h('span', { class: 'pb-bar-fill', style: { width: `${max > 0n ? Number((BigInt(c.gross) * 1000n) / max) / 10 : 0}%` } })),
        h('b', null, ldc(c.gross)))))))
  }
  const card = h('section', { class: 'app-card lc-enter', style: enter(2) }, h('h2', null, T('revTitle')))
  if (!o.revenue.orders.length) card.appendChild(h('p', { class: 'app-muted' }, T('revNone')))
  else {
    card.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
      h('thead', null, h('tr', null, ...[T('course'), T('learner'), T('amount'), T('platformCol'), T('net'), T('tx'), T('when')].map((x, k) => h('th', { class: k >= 2 && k <= 4 ? 'num' : '' }, x)))),
      h('tbody', null, ...o.revenue.orders.map((r) => h('tr', null,
        h('td', { 'data-label': T('course') }, courseOf(r.courseId)?.title ?? r.courseId ?? '—'),
        h('td', { 'data-label': T('learner') }, h('code', null, short(r.learner))),
        h('td', { class: 'num', 'data-label': T('amount') }, h('span', { class: 'pb-pay' }, coin(14), ldc(r.amount))),
        h('td', { class: 'num', 'data-label': T('platformCol') }, ldc(r.platform)),
        h('td', { class: 'num', 'data-label': T('net') }, ldc(r.net)),
        h('td', { 'data-label': T('tx') }, r.tx ? h('a', { href: `${SCAN}/tx/${r.tx}`, target: '_blank', rel: 'noopener noreferrer' }, `${r.tx.slice(0, 10)}…${r.tx.slice(-4)}`) : '—'),
        h('td', { 'data-label': T('when') }, new Date(r.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }))))))))
  }
  wrap.appendChild(card)
  return wrap
}
