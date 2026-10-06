// Lencana-B172 status=SELESAI 2026-10-06 — halaman Admin punya empat tab: Ringkasan platform, Persetujuan, Jejak keputusan (penandatangan dipulihkan server), dan Kesehatan sistem; tiga yang baru hanya-baca. Buktikan ulang: cd signer && npm run verify:publisher (grup G) dan uji peramban T96. JANGAN dibalik/diulang tanpa membuka kembali B172.
// Lencana-B129 status=SELESAI 2026-10-06 — halaman Admin Lencana (`#/app/admin`): persetujuan keanggotaan penerbit oleh admin sementara (alamat di ADMIN_ADDRESSES di server): daftar pengajuan menunggu dengan Setujui (pilih wewenang) dan Tolak, daftar anggota dengan Cabut; semuanya pesan `lencana-admin …` bertanda tangan akun admin. Buktikan ulang: cd signer && npm run verify:publisher (grup G) dan uji peramban T95.
/**
 * `admin.ts` — halaman Admin Lencana `#/app/admin` (keputusan builder 6 Okt malam: "yang acc publisher itu admin Lencana, pakai akun saya sebagai
 * admin sementara"). Sebelumnya hanya kunci penerbit (kunci tim di server) yang bisa menyetujui pengajuan anggota penerbit, tanpa tombol di halaman.
 *
 * Siapa admin: alamat di `ADMIN_ADDRESSES` di server (bukan email — email tidak disimpan). Akun lain mendapat "bukan admin" (403 dari server,
 * sebelum tanda tangannya dipakai). Admin tidak menerbitkan atau mencabut kredensial; ia hanya memutuskan keanggotaan.
 *
 * B172 (6 Okt malam, "tambahin ringkasan, jejak, dll" + "pakai MCP FE untuk mempercantik"): empat tab — Ringkasan (angka platform dari data yang sama
 * dengan dasbor Penerbit), Persetujuan (yang di atas), Jejak (keputusan keanggotaan; penandatangannya dipulihkan server dari pesan + tanda tangan
 * tersimpan), Kesehatan (saldo deployer, kuota, RPC, database). Satu permintaan bertanda tangan; tiga tab baru tidak menulis apa pun.
 *
 * Bentuk (doktrin FE builder: data jadi geometri, bukan kalimat): bar bertumpuk untuk pembagian uang, pendaftaran, dan alur esai; gauge melingkar
 * untuk kuota harian dan saldo deployer; garis waktu untuk jejak. Acuan visual dari MCP FE: kartu statistik + garis waktu aktivitas (21st.dev:
 * "App Dashboard Layout", "Chrono Board", "Status Bar") dan gauge melingkar + penghitung angka (Magic UI: animated-circular-progress-bar,
 * number-ticker) — dibangun ulang dalam TypeScript polos + CSS, karena aplikasi ini tidak memakai React.
 */
import './owner-solid.css'
import './admin.css'
import './admin-dash.css'
import { h } from '../lib/ui'
import { adminDecide, learnerAddress, readAdminOverview, type AdminOverview, type AdminSummary, type AdminTrailEvent, type AdminHealth, type MemberPerms } from '../learning'
import { skeleton } from '../lib/loading'
import { formatLdc } from '../pricing'
import { navIcon } from './seats'

type Lang = 'en' | 'id'
type Tab = 'summary' | 'approve' | 'trail' | 'health'

const COPY = {
  nav: { en: 'Lencana admin', id: 'Admin Lencana' },
  kicker: { en: 'LENCANA ADMIN · TEMPORARY', id: 'ADMIN LENCANA · SEMENTARA' },
  title: { en: 'Lencana admin', id: 'Admin Lencana' },
  sub: { en: 'Platform numbers, publisher membership decisions, the trail of those decisions, and system health. Only membership decisions write anything, and you sign each one; issuing and revoking credentials stays with the publisher key.', id: 'Angka platform, keputusan keanggotaan penerbit, jejak keputusan itu, dan kesehatan sistem. Hanya keputusan keanggotaan yang menulis sesuatu, dan kamu menandatangani tiap keputusannya; menerbitkan dan mencabut kredensial tetap pada kunci penerbit.' },
  account: { en: 'Account', id: 'Akun' },
  loading: { en: 'Reading the platform…', id: 'Membaca platform…' },
  failed: { en: 'The admin data could not be read:', id: 'Data admin tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  reload: { en: 'Reload', id: 'Muat ulang' },
  notAdminTitle: { en: 'This account is not a Lencana admin', id: 'Akun ini bukan admin Lencana' },
  notAdminBody: { en: 'Admins are set on the server by wallet address. Ask the team to add this account’s address if it should decide publisher requests.', id: 'Admin ditetapkan di server berdasarkan alamat dompet. Minta tim menambahkan alamat akun ini bila ia perlu memutuskan pengajuan penerbit.' },
  yourAddress: { en: 'This account’s address', id: 'Alamat akun ini' },
  back: { en: 'Back to dashboard', id: 'Kembali ke dasbor' },
  publisher: { en: 'Publisher', id: 'Penerbit' },
  updated: { en: 'Updated', id: 'Diperbarui' },
  tabSummary: { en: 'Summary', id: 'Ringkasan' },
  tabApprove: { en: 'Approvals', id: 'Persetujuan' },
  tabTrail: { en: 'Trail', id: 'Jejak' },
  tabHealth: { en: 'Health', id: 'Kesehatan' },
  waitingBanner: { en: 'requests are waiting for your decision.', id: 'pengajuan menunggu keputusanmu.' },
  review: { en: 'Review', id: 'Tinjau' },
  partial: { en: 'This part could not be read right now — the rest of the page is unaffected.', id: 'Bagian ini tidak terbaca saat ini — bagian lain di halaman tidak terpengaruh.' },
  // ringkasan
  sumPeople: { en: 'People', id: 'Orang' },
  sumMoney: { en: 'Money', id: 'Uang' },
  sumWork: { en: 'Essays and agents', id: 'Esai dan agen' },
  tMembers: { en: 'Publisher members', id: 'Anggota penerbit' },
  tPending: { en: 'Requests waiting', id: 'Pengajuan menunggu' },
  tCourses: { en: 'Courses', id: 'Kursus' },
  tCoursesHint: { en: 'listed of total', id: 'terdaftar dari total' },
  tLearners: { en: 'Learners', id: 'Peserta' },
  tLearnersHint: { en: 'unique accounts', id: 'akun unik' },
  enrollSplit: { en: 'Enrollments', id: 'Pendaftaran' },
  paid: { en: 'paid', id: 'berbayar' },
  free: { en: 'free', id: 'gratis' },
  tGross: { en: 'Gross', id: 'Kotor' },
  tGrossHint: { en: 'paid orders', id: 'order lunas' },
  moneySplit: { en: 'Split of paid orders', id: 'Pembagian order lunas' },
  lencana: { en: 'Lencana share', id: 'Bagian Lencana' },
  net: { en: 'Publisher net', id: 'Bersih penerbit' },
  noSplit: { en: 'The split could not be read from the chain.', id: 'Pembagian tidak terbaca dari chain.' },
  tChargesDue: { en: 'Agent fees due', id: 'Tagihan agen jatuh tempo' },
  tChargesPaid: { en: 'Agent fees paid', id: 'Tagihan agen terbayar' },
  pipelineTitle: { en: 'Essay flow', id: 'Alur esai' },
  pipelineNone: { en: 'No essays yet.', id: 'Belum ada esai.' },
  tAgents: { en: 'Known agents', id: 'Agen dikenal' },
  tHires: { en: 'Agent hires', id: 'Sewa agen' },
  tReviewers: { en: 'Reviewers appointed', id: 'Pengesah ditunjuk' },
  sumFoot: { en: 'Same numbers as the publisher dashboard, without test rows. Money comes from paid orders; the Lencana share is the split read from the chain.', id: 'Angka yang sama dengan dasbor Penerbit, tanpa baris uji. Uang dibaca dari order lunas; bagian Lencana adalah pembagian yang dibaca dari chain.' },
  awaitingJudge: { en: 'Waiting for a grader', id: 'Menunggu penilai' },
  insufficient: { en: 'Not enough to grade', id: 'Kurang bukti' },
  awaitingReview: { en: 'Waiting for a reviewer', id: 'Menunggu pengesah' },
  approved: { en: 'Approved', id: 'Disahkan' },
  adjusted: { en: 'Adjusted', id: 'Disesuaikan' },
  rejected: { en: 'Rejected', id: 'Ditolak' },
  graded: { en: 'Graded directly', id: 'Dinilai langsung' },
  // persetujuan
  reqTitle: { en: 'Requests waiting', id: 'Pengajuan menunggu' },
  reqNone: { en: 'No requests waiting.', id: 'Tidak ada pengajuan yang menunggu.' },
  from: { en: 'requested', id: 'diajukan' },
  approve: { en: 'Approve', id: 'Setujui' },
  reject: { en: 'Reject', id: 'Tolak' },
  revoke: { en: 'Revoke', id: 'Cabut' },
  membersTitle: { en: 'Publisher members', id: 'Anggota penerbit' },
  membersNone: { en: 'No active members.', id: 'Belum ada anggota aktif.' },
  since: { en: 'since', id: 'sejak' },
  canHire: { en: 'hire grading agents', id: 'sewa agen penilai' },
  canAppoint: { en: 'appoint review agents', id: 'tunjuk agen pengesah' },
  canAuthor: { en: 'author courses', id: 'susun kursus' },
  canPublish: { en: 'decide drafts and archive courses', id: 'memutuskan draf dan mengarsipkan kursus' },
  approveTitle: { en: 'Approve membership', id: 'Setujui keanggotaan' },
  approveBody: { en: 'Choose what this member may do. You sign the decision with your account; issuing and revoking credentials is never delegated.', id: 'Pilih apa yang boleh dilakukan anggota ini. Kamu menandatangani keputusannya dengan akunmu; menerbitkan dan mencabut kredensial tidak pernah didelegasikan.' },
  signApprove: { en: 'Sign and approve', id: 'Tandatangani & setujui' },
  cancel: { en: 'Cancel', id: 'Batal' },
  signing: { en: 'Waiting for your signature…', id: 'Menunggu tanda tanganmu…' },
  doneGrant: { en: 'Approved — the account is now a member.', id: 'Disetujui — akun itu kini anggota.' },
  doneReject: { en: 'Rejected — the account may apply again.', id: 'Ditolak — akun itu boleh mengajukan lagi.' },
  doneRevoke: { en: 'Revoked — the account is no longer a member.', id: 'Dicabut — akun itu bukan anggota lagi.' },
  // jejak
  trailTitle: { en: 'Decision trail', id: 'Jejak keputusan' },
  trailNone: { en: 'No decisions recorded yet.', id: 'Belum ada keputusan tercatat.' },
  trailFoot: { en: 'The database keeps one row per member, so a repeated grant overwrites the older one: this is the latest decision per account, not the full history. Each signer is recovered from the stored message and signature, not read from a column.', id: 'Database menyimpan satu baris per anggota, jadi hibah ulang menimpa yang lama: ini keputusan terakhir per akun, bukan sejarah penuh. Penandatangan tiap baris dipulihkan dari pesan dan tanda tangan yang tersimpan, bukan dibaca dari kolom.' },
  evRequested: { en: 'Requested', id: 'Diajukan' },
  evGranted: { en: 'Approved', id: 'Disetujui' },
  evRejected: { en: 'Rejected', id: 'Ditolak' },
  evRevoked: { en: 'Revoked', id: 'Dicabut' },
  byAdmin: { en: 'by a Lencana admin', id: 'oleh admin Lencana' },
  byPublisher: { en: 'by the publisher key', id: 'oleh kunci penerbit' },
  bySelf: { en: 'by the account itself', id: 'oleh akun itu sendiri' },
  byOther: { en: 'by an unrecognised signer', id: 'oleh penandatangan tak dikenal' },
  byUnknown: { en: 'signer not readable', id: 'penandatangan tidak terbaca' },
  proof: { en: 'Proof', id: 'Bukti' },
  proofMsg: { en: 'Signed message', id: 'Pesan yang ditandatangani' },
  proofSig: { en: 'Signature', id: 'Tanda tangan' },
  proofSigner: { en: 'Recovered signer', id: 'Penandatangan terpulihkan' },
  // kesehatan
  hDeployer: { en: 'Deployer wallet', id: 'Dompet deployer' },
  hDeployerNote: { en: 'pays gas for the faucet, owner gas, minting and settlement', id: 'membayar gas faucet, gas pemilik agen, cetak artefak, dan penyelesaian bayar' },
  hLowAt: { en: 'low below', id: 'rendah di bawah' },
  hQuota: { en: 'Wallet and daily quotas', id: 'Dompet dan kuota harian' },
  hSystem: { en: 'Services', id: 'Layanan' },
  hDb: { en: 'Database', id: 'Database' },
  hRpc: { en: 'Chain RPC', id: 'RPC chain' },
  hPaywall: { en: 'Paid courses enforced', id: 'Kursus berbayar ditegakkan' },
  hAdmins: { en: 'Admin accounts', id: 'Akun admin' },
  hStarted: { en: 'Server running since', id: 'Server berjalan sejak' },
  ok: { en: 'OK', id: 'Baik' },
  down: { en: 'Not reachable', id: 'Tidak terjangkau' },
  low: { en: 'Low — top up', id: 'Rendah — isi ulang' },
  fine: { en: 'Enough', id: 'Cukup' },
  unknown: { en: 'Unknown', id: 'Tidak diketahui' },
  on: { en: 'On', id: 'Menyala' },
  off: { en: 'Off', id: 'Mati' },
  faucet: { en: 'Test-coin faucet', id: 'Faucet koin uji' },
  gas: { en: 'Owner gas', id: 'Gas pemilik agen' },
  mint: { en: 'Artifact minting', id: 'Cetak artefak' },
  perIp: { en: 'per IP', id: 'per IP' },
  inWindow: { en: 'in the last', id: 'dalam' },
  hours: { en: 'h', id: 'jam' },
  note: { en: 'You are acting as a temporary admin. The admin address list lives on the server (ADMIN_ADDRESSES), not in this page.', id: 'Kamu bertindak sebagai admin sementara. Daftar alamat admin ada di server (ADMIN_ADDRESSES), bukan di halaman ini.' },
} satisfies Record<string, Record<Lang, string>>

type Key = keyof typeof COPY

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** Ikon garis 24 px (gaya Lucide, satu path per ikon) untuk kartu statistik. */
const IC = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  coins: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  bot: 'M12 8V4H8M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM2 14h2M20 14h2M15 13v2M9 13v2',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  db: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3',
  server: 'M2 5h20v6H2zM2 13h20v6H2zM6 8h.01M6 16h.01',
} as const

let adminTab: Tab = 'summary'

export function renderAdminApp (lang: Lang, routeHash = '#/app/admin'): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const onAccount = /^#\/?app\/admin\/account/.test(routeHash)
  const main = h('main', { class: 'dash-main adm-main' })
  const link = (href: string, label: string, active: boolean, path: string) => h('a', { href, class: active ? 'active' : '', ...(active ? { 'aria-current': 'page' } : {}) },
    navIcon(path), h('span', { class: 'nav-full' }, label), h('span', { class: 'nav-short', 'aria-hidden': 'true' }, label))
  const shell = h('div', { class: 'app-shell ow-shell adm-shell' },
    h('nav', { class: 'app-side', 'aria-label': T('nav') },
      link('#/app/admin', T('nav'), !onAccount, IC.shield),
      link('#/app/admin/account', T('account'), onAccount, IC.user)),
    main)
  if (onAccount) {
    void import('./dashboard').then((m) => { main.appendChild(m.renderAccount(lang, learnerAddress())) })
    return shell
  }
  const head = h('header', { class: 'app-head' }, h('span', { class: 'app-kicker' }, T('kicker')), h('h1', null, T('title')), h('p', { class: 'app-muted' }, T('sub')))
  const body = h('div', { class: 'app-body' })
  main.append(head, body)

  const load = () => {
    body.replaceChildren(h('div', { class: 'app-loading' }, skeleton('cards', T('loading'))))
    void readAdminOverview().then((r) => {
      if (!body.isConnected) return
      if (r.status === 403) {
        body.replaceChildren(h('section', { class: 'app-card adm-card adm-denied' },
          h('h2', null, T('notAdminTitle')), h('p', { class: 'app-muted' }, T('notAdminBody')),
          h('p', null, `${T('yourAddress')}: `, h('code', null, learnerAddress() ?? '—')),
          h('a', { class: 'app-btn small', href: '#/app' }, T('back'))))
        return
      }
      if (!r.ok || !r.data) {
        body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: load }, T('retry'))))
        return
      }
      body.replaceChildren(renderOverview(lang, r.data, load))
    })
  }
  load()
  return shell
}

/* ------------------------------------------------------------------ rangka: bilah + tab */

function renderOverview (lang: Lang, o: AdminOverview, reload: () => void): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack adm' })
  const stamp = o.generatedAt ? new Date(o.generatedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'id-ID', { timeStyle: 'short' }) : ''
  wrap.appendChild(h('div', { class: 'adm-bar' },
    h('span', null, `${T('publisher')}: `, h('b', null, o.publisherName ?? short(o.issuer)), ' ', h('code', { title: o.issuer }, short(o.issuer))),
    h('span', { class: 'adm-bar-r' }, stamp ? h('small', null, `${T('updated')} ${stamp}`) : null, h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('reload')))))

  let select: (t: Tab) => void = () => undefined
  const defs: Array<[Tab, string, number | null, HTMLElement[]]> = [
    ['summary', T('tabSummary'), null, [summaryPanel(lang, o, () => select('approve'))]],
    ['approve', T('tabApprove'), o.requests.length, [approvePanel(lang, o, reload)]],
    ['trail', T('tabTrail'), null, [trailPanel(lang, o)]],
    ['health', T('tabHealth'), null, [healthPanel(lang, o.health ?? null)]],
  ]
  const tabs = adminTabs(lang, defs)
  select = tabs.select
  wrap.appendChild(tabs.el)
  wrap.appendChild(h('p', { class: 'app-muted adm-foot' }, T('note')))
  return wrap
}

function adminTabs (lang: Lang, defs: Array<[Tab, string, number | null, HTMLElement[]]>): { el: HTMLElement, select: (t: Tab) => void } {
  const bar = h('div', { class: 'ow-tabs adm-tabs', role: 'tablist', 'aria-label': COPY.nav[lang] })
  const panels = h('div', { class: 'ow-panels' })
  const ids = defs.map((d) => d[0])
  if (!ids.includes(adminTab)) adminTab = ids[0]!
  const buttons: HTMLButtonElement[] = []
  const panelEls: HTMLElement[] = []
  const select = (id: Tab, focus = false) => {
    adminTab = id
    defs.forEach(([k], j) => {
      const on = k === id
      buttons[j]!.setAttribute('aria-selected', String(on)); buttons[j]!.tabIndex = on ? 0 : -1; buttons[j]!.classList.toggle('on', on)
      panelEls[j]!.hidden = !on
    })
    if (focus) buttons[ids.indexOf(id)]?.focus()
  }
  defs.forEach(([k, label, count, nodes], j) => {
    const btn = h('button', { type: 'button', class: 'ow-tab', role: 'tab', id: `adm-tab-${k}`, 'aria-controls': `adm-panel-${k}`, 'data-tab': k }, label,
      count === null ? null : h('span', { class: `adm-count${count ? ' hot' : ''}`, 'data-count': '' }, String(count))) as HTMLButtonElement
    btn.addEventListener('click', () => select(k))
    btn.addEventListener('keydown', (ev) => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0
      if (d) { ev.preventDefault(); select(ids[(j + d + ids.length) % ids.length]!, true) }
    })
    buttons.push(btn); bar.appendChild(btn)
    const panel = h('div', { class: 'ow-panel app-stack', role: 'tabpanel', id: `adm-panel-${k}`, 'aria-labelledby': `adm-tab-${k}` }, ...nodes)
    panelEls.push(panel); panels.appendChild(panel)
  })
  select(adminTab)
  return { el: h('div', { class: 'ow-tabbed' }, bar, panels), select: (t) => select(t) }
}

/* ------------------------------------------------------------------ bentuk bersama: kartu statistik, bar bertumpuk, gauge */

/** Penghitung angka (gaya number-ticker Magic UI): teks akhir selalu ada di DOM; animasinya hanya tampilan dan dilewati bila gerak dikurangi. */
function ticker (el: HTMLElement, to: number): void {
  el.textContent = String(to)
  if (reduceMotion() || !Number.isFinite(to) || to < 2 || typeof requestAnimationFrame !== 'function') return
  const t0 = performance.now()
  const dur = 700
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur)
    el.textContent = String(Math.round(to * (1 - (1 - p) ** 3)))
    if (p < 1 && el.isConnected) requestAnimationFrame(step)
    else el.textContent = String(to)
  }
  el.textContent = '0'
  requestAnimationFrame(step)
}

function tile (label: string, value: number | string, opts: { hint?: string, icon: string, hot?: boolean, tone?: 'gold' | 'green' | 'red' }): HTMLElement {
  const v = h('strong', { class: 'adm-tile-v' }, String(value))
  if (typeof value === 'number') ticker(v, value)
  return h('div', { class: `adm-tile${opts.hot ? ' hot' : ''}${opts.tone ? ` tone-${opts.tone}` : ''}`, 'data-tile': label },
    h('div', { class: 'adm-tile-top' }, h('span', { class: 'adm-tile-l' }, label), navIcon(opts.icon)),
    v,
    opts.hint ? h('small', { class: 'adm-tile-h' }, opts.hint) : null)
}

type Seg = { label: string, value: number, cls: string, shown?: string }

/** Bar bertumpuk + legenda: lebar segmen = bagian dari total (data jadi geometri). */
function stack (segs: Seg[], empty: string): HTMLElement {
  const total = segs.reduce((s, x) => s + x.value, 0)
  if (!total) return h('p', { class: 'app-muted' }, empty)
  const live = segs.filter((s) => s.value > 0)
  return h('div', { class: 'adm-stack-wrap' },
    h('div', { class: 'adm-stack', role: 'img', 'aria-label': live.map((s) => `${s.label} ${s.shown ?? s.value}`).join(', ') },
      ...live.map((s) => h('span', { class: `adm-seg ${s.cls}`, style: `flex-grow:${s.value}`, title: `${s.label}: ${s.shown ?? s.value}` }))),
    h('ul', { class: 'adm-legend' }, ...live.map((s) => h('li', null, h('i', { class: `adm-dot ${s.cls}`, 'aria-hidden': 'true' }), `${s.label} `, h('b', null, s.shown ?? String(s.value))))))
}

/** Gauge melingkar (gaya animated-circular-progress-bar Magic UI): lingkaran lintasan + busur isi yang tumbuh dari 0. */
function gauge (pct: number | null, tone: 'green' | 'amber' | 'red' | 'idle', center: string, label: string, sub: string): HTMLElement {
  const C = 2 * Math.PI * 45
  const p = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  const full = `${(p * C) / 100} ${C}`
  const svg = h('span', { class: 'adm-g-svg' })
  // SVG dibuat lewat innerHTML supaya elemennya ber-namespace SVG (h() membuat elemen HTML).
  svg.innerHTML = `<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle cx="50" cy="50" r="45" class="adm-g-track"/><circle cx="50" cy="50" r="45" class="adm-g-arc tone-${tone}${p === 0 ? ' zero' : ''}" stroke-dasharray="${reduceMotion() ? full : `0 ${C}`}"/></svg>`
  const arc = svg.querySelector('.adm-g-arc')
  if (arc && !reduceMotion() && typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute('stroke-dasharray', full)))
  return h('div', { class: 'adm-gauge', role: 'img', 'aria-label': `${label}: ${center}` },
    h('div', { class: 'adm-g-box' }, svg, h('span', { class: 'adm-g-c' }, center)),
    h('strong', { class: 'adm-g-l' }, label),
    h('small', { class: 'adm-g-s' }, sub))
}

const dotRow = (label: string, tone: 'ok' | 'bad' | 'idle' | 'warn', value: string, extra?: string): HTMLElement =>
  h('li', { class: 'adm-st' }, h('i', { class: `adm-led ${tone}`, 'aria-hidden': 'true' }), h('span', { class: 'adm-st-l' }, label), h('b', { class: `adm-st-v ${tone}` }, value), extra ? h('small', null, extra) : null)

/* ------------------------------------------------------------------ tab Ringkasan */

function summaryPanel (lang: Lang, o: AdminOverview, goApprove: () => void): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const root = h('div', { class: 'app-stack adm-summary' })
  if (o.requests.length) {
    root.appendChild(h('div', { class: 'adm-banner', role: 'status' },
      h('span', null, h('b', null, String(o.requests.length)), ` ${T('waitingBanner')}`),
      h('button', { type: 'button', class: 'adm-btn pri', 'data-goto-approve': '', onClick: goApprove }, T('review'))))
  }
  const s: AdminSummary | null | undefined = o.summary
  if (!s) { root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('tabSummary')), h('p', { class: 'app-muted' }, T('partial')))); return root }
  const sym = s.money.token.symbol
  const num = (v: string) => formatLdc(BigInt(v))
  const units = (v: string | null) => (v === null ? '—' : `${formatLdc(BigInt(v))} ${sym}`)

  root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('sumPeople')),
    h('div', { class: 'adm-tiles' },
      tile(T('tMembers'), s.members.active, { icon: IC.users, tone: 'green' }),
      tile(T('tPending'), s.members.pending, { icon: IC.clock, hot: s.members.pending > 0 }),
      tile(T('tCourses'), s.courses.total, { icon: IC.book, hint: `${s.courses.listed} ${T('tCoursesHint')} ${s.courses.total}` }),
      tile(T('tLearners'), s.learners.unique, { icon: IC.user, hint: T('tLearnersHint') })),
    h('div', { class: 'adm-block' }, h('h3', null, `${T('enrollSplit')} · ${s.learners.enrollments}`),
      stack([{ label: T('paid'), value: s.learners.paid, cls: 'c-green' }, { label: T('free'), value: s.learners.free, cls: 'c-gray' }], '—'))))

  const bps = s.money.platformBps
  root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('sumMoney')),
    h('div', { class: 'adm-tiles' },
      tile(T('tGross'), num(s.money.gross), { icon: IC.coins, hint: `${sym} · ${T('tGrossHint')}` }),
      tile(T('tChargesDue'), s.money.chargesDue.count, { icon: IC.file, hot: s.money.chargesDue.count > 0, hint: units(s.money.chargesDue.amount) }),
      tile(T('tChargesPaid'), s.money.chargesPaid.count, { icon: IC.file, hint: units(s.money.chargesPaid.amount) })),
    h('div', { class: 'adm-block' }, h('h3', null, T('moneySplit')),
      s.money.platform === null || s.money.net === null
        ? h('p', { class: 'app-muted' }, T('noSplit'))
        : stack([
          { label: `${T('lencana')}${bps === null ? '' : ` (${(bps / 100).toString()}%)`}`, value: Number(s.money.platform), cls: 'c-gold', shown: units(s.money.platform) },
          { label: T('net'), value: Number(s.money.net), cls: 'c-green', shown: units(s.money.net) },
        ], '—'))))

  const labels: Record<string, Key> = { awaitingJudge: 'awaitingJudge', insufficient: 'insufficient', awaitingReview: 'awaitingReview', approved: 'approved', adjusted: 'adjusted', rejected: 'rejected', graded: 'graded' }
  const tone: Record<string, string> = { awaitingJudge: 'c-gray', insufficient: 'c-slate', awaitingReview: 'c-gold', approved: 'c-green', adjusted: 'c-blue', rejected: 'c-red', graded: 'c-teal' }
  const segs: Seg[] = Object.keys(labels).map((k) => ({ label: T(labels[k]!), value: s.essays.pipeline[k] ?? 0, cls: tone[k]! }))
  root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('sumWork')),
    h('div', { class: 'adm-block' }, h('h3', null, T('pipelineTitle')), stack(segs, T('pipelineNone'))),
    h('div', { class: 'adm-tiles' },
      tile(T('tAgents'), s.agents.known, { icon: IC.bot }),
      tile(T('tHires'), s.agents.hires, { icon: IC.bot }),
      tile(T('tReviewers'), s.agents.reviewers, { icon: IC.shield }))))
  root.appendChild(h('p', { class: 'app-muted adm-foot' }, T('sumFoot')))
  return root
}

/* ------------------------------------------------------------------ tab Persetujuan (keputusan keanggotaan; dulu satu-satunya isi halaman) */

function approvePanel (lang: Lang, o: AdminOverview, reload: () => void): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' }) : '—')
  const root = h('div', { class: 'app-stack' })

  const reqs = h('section', { class: 'app-card adm-card' },
    h('h2', null, `${T('reqTitle')} `, h('span', { class: `adm-count${o.requests.length ? ' hot' : ''}` }, String(o.requests.length))))
  if (!o.requests.length) reqs.appendChild(h('p', { class: 'app-muted' }, T('reqNone')))
  else {
    reqs.appendChild(h('ul', { class: 'adm-list' }, ...o.requests.map((r) => {
      const status = h('span', { class: 'seat-apply-status', role: 'status' })
      const approve = h('button', { type: 'button', class: 'app-btn small primary', 'data-approve': '' }, T('approve')) as HTMLButtonElement
      const reject = h('button', { type: 'button', class: 'app-btn small', 'data-reject': '' }, T('reject')) as HTMLButtonElement
      approve.addEventListener('click', () => openApprove(lang, r.address, (msg) => { status.className = 'seat-apply-status ok'; status.textContent = msg; setTimeout(reload, 900) }))
      reject.addEventListener('click', () => {
        approve.disabled = true; reject.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('signing')
        void adminDecide('reject', r.address).then((out) => {
          if (!out.ok) { approve.disabled = false; reject.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = out.why ?? ''; return }
          status.className = 'seat-apply-status ok'; status.textContent = T('doneReject')
          setTimeout(reload, 900)
        })
      })
      return h('li', { class: 'adm-row' },
        h('div', { class: 'adm-who' }, h('code', { title: r.address }, r.address), h('small', null, `${T('from')} ${when(r.at)}`)),
        r.note ? h('p', { class: 'adm-note' }, r.note) : null,
        h('div', { class: 'adm-act' }, approve, reject, status))
    })))
  }
  root.appendChild(reqs)

  const members = h('section', { class: 'app-card adm-card' }, h('h2', null, `${T('membersTitle')} `, h('span', { class: 'adm-count' }, String(o.members.length))))
  if (!o.members.length) members.appendChild(h('p', { class: 'app-muted' }, T('membersNone')))
  else {
    members.appendChild(h('ul', { class: 'adm-list' }, ...o.members.map((m) => {
      const status = h('span', { class: 'seat-apply-status', role: 'status' })
      const revoke = h('button', { type: 'button', class: 'app-btn small', 'data-revoke': '' }, T('revoke')) as HTMLButtonElement
      revoke.addEventListener('click', () => {
        revoke.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('signing')
        void adminDecide('revoke', m.member).then((out) => {
          if (!out.ok) { revoke.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = out.why ?? ''; return }
          status.className = 'seat-apply-status ok'; status.textContent = T('doneRevoke')
          setTimeout(reload, 900)
        })
      })
      const chip = (on: boolean, label: string) => h('span', { class: `adm-perm ${on ? 'on' : 'off'}` }, label)
      return h('li', { class: 'adm-row' },
        h('div', { class: 'adm-who' }, h('code', { title: m.member }, m.member), h('small', null, `${T('since')} ${when(m.since)}`)),
        h('div', { class: 'adm-perms' }, chip(m.canHire, T('canHire')), chip(m.canAppoint, T('canAppoint')), chip(m.canAuthor, T('canAuthor')), chip(m.canPublish, T('canPublish'))),
        h('div', { class: 'adm-act' }, revoke, status))
    })))
  }
  root.appendChild(members)
  return root
}

/* ------------------------------------------------------------------ tab Jejak: garis waktu keputusan */

function trailPanel (lang: Lang, o: AdminOverview): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const section = h('section', { class: 'app-card adm-card' }, h('h2', null, `${T('trailTitle')} `, h('span', { class: 'adm-count' }, String(o.trail?.length ?? 0))))
  if (!o.trail) { section.appendChild(h('p', { class: 'app-muted' }, T('partial'))); return section }
  if (!o.trail.length) section.appendChild(h('p', { class: 'app-muted' }, T('trailNone')))
  else section.appendChild(h('ol', { class: 'adm-tl' }, ...o.trail.map((e) => trailItem(lang, e))))
  section.appendChild(h('p', { class: 'app-muted adm-foot' }, T('trailFoot')))
  return section
}

function trailItem (lang: Lang, e: AdminTrailEvent): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const kind: Record<AdminTrailEvent['kind'], { label: Key, cls: string }> = {
    requested: { label: 'evRequested', cls: 'k-blue' }, granted: { label: 'evGranted', cls: 'k-green' },
    rejected: { label: 'evRejected', cls: 'k-amber' }, revoked: { label: 'evRevoked', cls: 'k-red' },
  }
  const k = kind[e.kind]
  const by = e.byRole === 'admin' ? T('byAdmin') : e.byRole === 'publisher' ? T('byPublisher') : e.byRole === 'self' ? T('bySelf') : e.byRole === 'other' ? T('byOther') : T('byUnknown')
  const at = new Date(e.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  const perms = e.perms
    ? h('div', { class: 'adm-perms' }, ...([['hire', 'canHire'], ['appoint', 'canAppoint'], ['author', 'canAuthor'], ['publish', 'canPublish']] as const)
      .map(([p, key]) => h('span', { class: `adm-perm ${e.perms![p] ? 'on' : 'off'}` }, T(key))))
    : null
  return h('li', { class: `adm-ev ${k.cls}`, 'data-kind': e.kind },
    h('i', { class: 'adm-ev-node', 'aria-hidden': 'true' }),
    h('div', { class: 'adm-ev-card' },
      h('div', { class: 'adm-ev-top' }, h('span', { class: `adm-chip ${k.cls}` }, T(k.label)), h('code', { title: e.who }, short(e.who)), h('time', { dateTime: e.at }, at)),
      h('p', { class: `adm-ev-by${e.byRole === 'other' || e.byRole === null ? ' warn' : ''}` }, by, e.by ? ' ' : '', e.by ? h('code', { title: e.by }, short(e.by)) : null),
      e.note ? h('p', { class: 'adm-note' }, e.note) : null,
      perms,
      h('details', { class: 'adm-proof' },
        h('summary', null, T('proof')),
        h('dl', null,
          h('dt', null, T('proofMsg')), h('dd', null, h('code', null, e.message)),
          h('dt', null, T('proofSigner')), h('dd', null, h('code', null, e.by ?? '—')),
          h('dt', null, T('proofSig')), h('dd', null, h('code', null, e.signature))))))
}

/* ------------------------------------------------------------------ tab Kesehatan: gauge kuota + saldo, status layanan */

/** Wei → tBNB 4 desimal tanpa pembulatan ke atas (BigInt, bukan float). */
const bnb = (wei: string) => { const w = BigInt(wei); return `${w / 10n ** 18n}.${((w % 10n ** 18n) / 10n ** 14n).toString().padStart(4, '0')}` }

function healthPanel (lang: Lang, hl: AdminHealth | null): HTMLElement {
  const T = (k: Key) => COPY[k][lang]
  const root = h('div', { class: 'app-stack' })
  if (!hl) { root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('tabHealth')), h('p', { class: 'app-muted' }, T('partial')))); return root }

  const d = hl.deployer
  const dep = d && d.balanceWei !== null
    ? gauge(Math.min(100, (Number(BigInt(d.balanceWei) * 1000n / BigInt(d.lowWei)) / 1000) * 20), d.low ? 'red' : 'green', bnb(d.balanceWei), T('hDeployer'), `tBNB · ${d.low ? T('low') : T('fine')} · ${T('hLowAt')} ${bnb(d.lowWei)}`)
    : gauge(null, 'idle', '—', T('hDeployer'), T('unknown'))
  const q = (k: 'faucet' | 'gas' | 'mint') => {
    const x = hl.quotas[k]
    const pct = x.perDay > 0 ? (x.givenInWindow / x.perDay) * 100 : null
    return gauge(pct, pct === null ? 'idle' : pct >= 85 ? 'red' : pct >= 60 ? 'amber' : 'green', `${x.givenInWindow}/${x.perDay}`, T(k), `${x.perIp} ${T('perIp')} · ${T('inWindow')} ${x.windowHours} ${T('hours')}`)
  }
  root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('hQuota')), h('p', { class: 'app-muted' }, T('hDeployerNote')),
    h('div', { class: 'adm-gauges' }, dep, q('faucet'), q('gas'), q('mint'))))

  const started = new Date(hl.startedAt).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  root.appendChild(h('section', { class: 'app-card adm-card' }, h('h2', null, T('hSystem')),
    h('ul', { class: 'adm-sts' },
      dotRow(T('hDb'), hl.db ? 'ok' : 'bad', hl.db ? T('ok') : T('down')),
      dotRow(T('hRpc'), hl.rpc.ok ? 'ok' : 'bad', hl.rpc.ok ? T('ok') : T('down'), hl.rpc.ms === null ? `chain ${hl.chainId}` : `chain ${hl.chainId} · ${hl.rpc.ms} ms`),
      dotRow(T('hPaywall'), hl.paywall === 'on' ? 'ok' : 'warn', hl.paywall === 'on' ? T('on') : T('off')),
      dotRow(T('hAdmins'), hl.admins > 0 ? 'ok' : 'warn', String(hl.admins)),
      dotRow(T('hStarted'), 'idle', started))))
  return root
}

/** Dialog "Setujui keanggotaan": memilih wewenang lalu menandatangani keputusan dengan akun admin. */
function openApprove (lang: Lang, applicant: string, done: (msg: string) => void): void {
  const T = (k: Key) => COPY[k][lang]
  const box = (key: keyof MemberPerms, label: string, on: boolean) => {
    const c = h('input', { type: 'checkbox', checked: on, 'data-perm': key }) as HTMLInputElement
    return { c, el: h('label', { class: 'adm-permbox' }, c, h('span', null, label)) }
  }
  const hire = box('hire', T('canHire'), true)
  const appoint = box('appoint', T('canAppoint'), true)
  const author = box('author', T('canAuthor'), false)
  const publish = box('publish', T('canPublish'), false)
  const status = h('p', { class: 'adm-dlg-status', role: 'status' })
  const go = h('button', { type: 'button', class: 'adm-btn pri', 'data-sign': '' }, T('signApprove')) as HTMLButtonElement
  const cancel = h('button', { type: 'button', class: 'adm-btn' }, T('cancel')) as HTMLButtonElement
  const dlg = h('dialog', { class: 'adm-dlg', 'aria-labelledby': 'adm-dlg-t' },
    h('div', { class: 'adm-dlg-f' },
      h('h2', { id: 'adm-dlg-t' }, T('approveTitle')),
      h('p', { class: 'adm-dlg-who' }, h('code', null, applicant)),
      h('p', { class: 'adm-dlg-n' }, T('approveBody')),
      h('div', { class: 'adm-perms-box' }, hire.el, appoint.el, author.el, publish.el),
      status,
      h('div', { class: 'adm-dlg-act' }, cancel, go))) as HTMLDialogElement
  const close = () => { dlg.close(); dlg.remove() }
  cancel.addEventListener('click', close)
  dlg.addEventListener('close', () => dlg.remove())
  go.addEventListener('click', () => {
    go.disabled = true; cancel.disabled = true
    status.className = 'adm-dlg-status'; status.textContent = T('signing')
    void adminDecide('grant', applicant, { hire: hire.c.checked, appoint: appoint.c.checked, author: author.c.checked, publish: publish.c.checked }).then((out) => {
      if (!out.ok) { go.disabled = false; cancel.disabled = false; status.className = 'adm-dlg-status bad'; status.textContent = out.why ?? ''; return }
      close()
      done(T('doneGrant'))
    })
  })
  document.body.appendChild(dlg)
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
}
