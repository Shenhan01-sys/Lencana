/**
 * `dashboard.ts` — area internal peserta `#/app` (RF7 langkah A2, B124): cangkang ber-sidebar, lima bagian, dan
 * onboarding login pertama. Hanya untuk akun — penjaga rute di `main.ts` mengembalikan tamu ke beranda.
 *
 * Datanya dibaca dari penerbit lewat `POST /me/records` yang ditandatangani pemilik akun: nilai adalah data pribadi,
 * jadi tidak ada satu pun angka di sini yang dibaca dari rute publik atau ditulis tangan.
 *
 * Onboarding menampilkan ketiga kursi (keputusan builder 2 Okt): Peserta aktif; Penerbit dan Agent Owner berlabel
 * "segera" dengan syarat yang sebenarnya, tanpa tombol yang pura-pura mendaftarkan — model peran di core baru datang di
 * langkah C.
 */
import './dashboard.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { COURSES, findCourse } from '../courses/index'
import type { Course } from '../content'
import { forgetLearner, learnerAddress, readMyRecords, snapshot, type MyAttempt, type MyCourseRecord } from '../learning'
import { classLink, readMyCredentials } from '../lesson-views'
import { ROLES } from './flow3d-data'

// Lencana-B124 status=TERBUKA 2026-10-02 — area internal peserta: sidebar (Ringkasan · Kelas saya · Nilai & tugas · Kredensial saya · Akun), onboarding login pertama (tiga peran, dua berlabel segera), data dari POST /me/records bertanda tangan. Buktikan ulang: cd web && npm run probe, lalu uji peramban T44. JANGAN dibalik/diulang tanpa membuka kembali baris B124 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

type Lang = 'en' | 'id'
type Section = 'overview' | 'classes' | 'grades' | 'credentials' | 'account' | 'welcome'

const COPY = {
  overview: { en: 'Overview', id: 'Ringkasan' },
  classes: { en: 'My classes', id: 'Kelas saya' },
  grades: { en: 'Grades & work', id: 'Nilai & tugas' },
  credentials: { en: 'My credentials', id: 'Kredensial saya' },
  account: { en: 'Account', id: 'Akun' },
  hello: { en: 'Hi', id: 'Halo' },
  helloSub: { en: 'Everything here is yours alone — no one else can open this page.', id: 'Semua di sini milikmu sendiri — orang lain tidak bisa membuka halaman ini.' },
  loading: { en: 'Reading your records from the publisher…', id: 'Membaca rekamanmu dari penerbit…' },
  failed: { en: 'Your records could not be read:', id: 'Rekamanmu tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  enrolled: { en: 'Courses taken', id: 'Kursus diikuti' },
  lessonsDone: { en: 'Lessons completed', id: 'Lesson selesai' },
  graded: { en: 'Graded attempts', id: 'Usaha dinilai' },
  continue: { en: 'Continue learning', id: 'Lanjutkan belajar' },
  next: { en: 'Next', id: 'Berikutnya' },
  allDone: { en: 'All lessons completed — the publisher can now issue from your records.', id: 'Semua lesson selesai — penerbit kini bisa menerbitkan dari rekamanmu.' },
  noCourse: { en: 'You have not taken a course yet.', id: 'Kamu belum mengikuti kursus.' },
  browse: { en: 'Browse the catalogue', id: 'Jelajahi katalog' },
  open: { en: 'Open class', id: 'Buka kelas' },
  details: { en: 'Course page', id: 'Halaman kursus' },
  others: { en: 'Other courses', id: 'Kursus lain' },
  progress: { en: 'progress', id: 'progres' },
  best: { en: 'Best score', id: 'Skor terbaik' },
  gate: { en: 'All lessons done', id: 'Semua lesson selesai' },
  yes: { en: 'yes', id: 'ya' },
  no: { en: 'not yet', id: 'belum' },
  lesson: { en: 'Lesson', id: 'Lesson' },
  kind: { en: 'Kind', id: 'Jenis' },
  result: { en: 'Result', id: 'Hasil' },
  when: { en: 'When', id: 'Waktu' },
  noAttempts: { en: 'No graded work yet in this course.', id: 'Belum ada tugas yang dinilai di kursus ini.' },
  waitJudge: { en: 'waiting for grading', id: 'menunggu penilaian' },
  waitReview: { en: 'proposed by the grading agent — waiting for approval', id: 'diusulkan agen penilai — menunggu pengesahan' },
  approved: { en: 'approved', id: 'disahkan' },
  adjusted: { en: 'adjusted by the reviewer', id: 'diubah reviewer' },
  privacy: {
    en: 'This page is only for you. To share a credential, send its verifier link — the recipient sees that credential, not your dashboard.',
    id: 'Halaman ini hanya untukmu. Untuk membagikan kredensial, kirim tautan verifier-nya — penerima melihat kredensial itu saja, bukan dashboard-mu.',
  },
  email: { en: 'Account email', id: 'Email akun' },
  wallet: { en: 'Learning wallet', id: 'Dompet belajar' },
  walletNote: { en: 'Created when you first signed in; every record you send to a publisher is signed by it.', id: 'Dibuat saat pertama kamu masuk; setiap rekaman yang kamu kirim ke penerbit ditandatangani olehnya.' },
  network: { en: 'Network', id: 'Jaringan' },
  copy: { en: 'Copy', id: 'Salin' },
  copied: { en: 'Copied', id: 'Tersalin' },
  signOut: { en: 'Sign out', id: 'Keluar' },
  welcomeKicker: { en: 'WELCOME TO LENCANA', id: 'SELAMAT DATANG DI LENCANA' },
  welcomeTitle: { en: 'Which seat are you taking?', id: 'Kamu datang sebagai apa?' },
  welcomeSub: { en: 'Lencana has three seats. Each has its own flow — the same one shown on the home page.', id: 'Lencana punya tiga kursi. Masing-masing punya alurnya sendiri — sama dengan yang ditunjukkan di beranda.' },
  learnerRole: { en: 'Learn, do the work, and receive a credential anyone can check.', id: 'Belajar, kerjakan tugas, dan terima kredensial yang bisa diperiksa siapa pun.' },
  publisherRole: { en: 'Publish courses and issue credentials in your institution’s name. Requirement: you apply, and the platform adds your institution to the on-chain issuer list.', id: 'Terbitkan kursus dan kredensial atas nama lembagamu. Syarat: kamu mengajukan, lalu platform memasukkan lembagamu ke daftar penerbit di chain.' },
  ownerRole: { en: 'Rent out your ERC-8004 grading agent to publishers. Requirement: prove you own the agent (its identity owner is your wallet).', id: 'Sewakan agen penilai ERC-8004 milikmu ke penerbit. Syarat: buktikan kamu pemilik agen itu (pemilik identitasnya adalah dompetmu).' },
  soon: { en: 'Coming soon', id: 'Segera' },
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
  { id: 'classes', href: '#/app/classes', icon: 'M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zm16 0h-4a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h5z' },
  { id: 'grades', href: '#/app/grades', icon: 'M4 20V10m6 10V4m6 16v-7m6 7H2' },
  { id: 'credentials', href: '#/app/credentials', icon: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-3.5 3.5L7 22l5-2 5 2-1.5-3.5' },
  { id: 'account', href: '#/app/account', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0' },
]

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
async function records (): Promise<{ ok: boolean, why?: string, courses?: MyCourseRecord[] }> {
  inflight ??= readMyRecords().finally(() => { inflight = null })
  return inflight
}

function sectionOf (routeHash: string): Section {
  const seg = routeHash.replace(/^#\/?/, '').split('/')[1] ?? ''
  if (seg === 'classes' || seg === 'grades' || seg === 'credentials' || seg === 'account' || seg === 'welcome') return seg
  return 'overview'
}

function icon (d: string): HTMLElement {
  const el = h('span', { class: 'app-ic', 'aria-hidden': 'true' })
  el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
  return el
}

/** Lesson berikutnya yang belum selesai, dalam urutan kursus. */
function nextLesson (course: Course, rec: MyCourseRecord): { href: string, title: string } | null {
  const done = new Set(rec.summary?.completed ?? [])
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (!done.has(l.slug)) return { href: classLink(course.id, m.id, l.slug), title: l.title }
    }
  }
  return null
}

function lessonTitle (course: Course | undefined, slug: string): string {
  for (const m of course?.modules ?? []) for (const l of m.lessons) if (l.slug === slug) return l.title
  return slug
}

export function renderApp (routeHash: string): HTMLElement {
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const addr = learnerAddress()
  const section = sectionOf(routeHash)

  if (section === 'welcome') return renderWelcome(lang, addr)

  const main = h('main', { class: 'dash-main' })
  const shell = h('div', { class: 'app-shell' },
    h('nav', { class: 'app-side', 'aria-label': 'Dashboard' },
      ...NAV.map((n) => h('a', { href: n.href, class: n.id === section ? 'active' : '', 'aria-current': n.id === section ? 'page' : 'false' }, icon(n.icon), h('span', null, T(n.id)))),
    ),
    main,
  )

  if (section === 'account') { main.appendChild(renderAccount(lang, addr)); return shell }
  if (section === 'credentials') { main.appendChild(renderCredentials(lang, addr)); return shell }

  // Ringkasan, kelas, dan nilai membutuhkan rekaman dari penerbit.
  const body = h('div', { class: 'app-body' }, h('p', { class: 'app-muted' }, T('loading')))
  main.appendChild(h('header', { class: 'app-head' }, h('h1', null, T(section)), section === 'overview' ? h('p', { class: 'app-muted' }, T('helloSub')) : null))
  main.appendChild(body)
  const load = () => {
    if (!addr) return
    void records().then((r) => {
      if (!body.isConnected) return
      body.innerHTML = ''
      if (!r.ok || !r.courses) {
        body.appendChild(h('div', { class: 'app-card app-error' },
          h('p', null, `${T('failed')} ${r.why ?? ''}`),
          h('button', { type: 'button', class: 'app-btn', onClick: () => { body.innerHTML = ''; body.appendChild(h('p', { class: 'app-muted' }, T('loading'))); load() } }, T('retry'))))
        return
      }
      if (section === 'overview') body.appendChild(renderOverview(lang, r.courses))
      if (section === 'classes') body.appendChild(renderClasses(lang, r.courses))
      if (section === 'grades') body.appendChild(renderGrades(lang, r.courses))
    })
  }
  load()
  return shell
}

function renderOverview (lang: Lang, courses: MyCourseRecord[]): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const email = snapshot().identity?.email
  const lessonsDone = courses.reduce((n, c) => n + (c.summary?.lessonsCompleted ?? 0), 0)
  const graded = courses.reduce((n, c) => n + (c.summary?.gradedAttempts ?? 0), 0)
  const wrap = h('div', { class: 'app-stack' })
  wrap.appendChild(h('p', { class: 'app-hello' }, `${T('hello')}${email ? `, ${email}` : ''}.`))
  wrap.appendChild(h('div', { class: 'app-stats' },
    h('div', { class: 'app-stat' }, h('b', null, String(courses.length)), h('span', null, T('enrolled'))),
    h('div', { class: 'app-stat' }, h('b', null, String(lessonsDone)), h('span', null, T('lessonsDone'))),
    h('div', { class: 'app-stat' }, h('b', null, String(graded)), h('span', null, T('graded'))),
  ))
  if (!courses.length) {
    wrap.appendChild(h('div', { class: 'app-card' }, h('p', null, T('noCourse')), h('a', { class: 'app-btn', href: '#catalog' }, T('browse'))))
    return wrap
  }
  for (const rec of courses) {
    const course = findCourse(rec.courseId)
    if (!course) continue
    const nxt = nextLesson(course, rec)
    wrap.appendChild(h('div', { class: 'app-card app-continue' },
      h('span', { class: 'app-kicker' }, T('continue')),
      h('h2', null, course.title),
      progressBar(rec),
      nxt
        ? h('a', { class: 'app-btn primary', href: nxt.href }, `${T('next')}: ${nxt.title}`)
        : h('p', { class: 'app-ok' }, T('allDone')),
    ))
  }
  return wrap
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
      h('div', null, h('h2', null, course.title), h('p', { class: 'app-muted' }, course.institution)),
      progressBar(rec),
      h('div', { class: 'app-actions' },
        h('a', { class: 'app-btn primary', href: classLink(course.id) }, T('open')),
        h('a', { class: 'app-btn', href: `#/course/${encodeURIComponent(course.id)}` }, T('details')),
      ),
    ))
  }
  const others = COURSES.filter((c) => !taken.has(c.id))
  if (others.length) {
    wrap.appendChild(h('h2', { class: 'app-sub' }, T('others')))
    for (const c of others) {
      wrap.appendChild(h('a', { class: 'app-card app-other', href: `#/course/${encodeURIComponent(c.id)}` },
        h('strong', null, c.title), h('span', { class: 'app-muted' }, c.blurb)))
    }
  }
  return wrap
}

function resultOf (lang: Lang, a: MyAttempt): { text: string, cls: string } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  if (a.kind === 'esai') {
    if (a.review) return { text: `${a.review.finalScore ?? a.score ?? '—'} · ${a.review.decision === 'adjusted' ? T('adjusted') : T('approved')}`, cls: 'ok' }
    if (a.score !== null && a.judgeModel) return { text: `${a.score} · ${T('waitReview')}`, cls: 'wait' }
    return { text: T('waitJudge'), cls: 'wait' }
  }
  if (a.score === null) return { text: a.verdict ?? T('waitJudge'), cls: 'wait' }
  return { text: `${a.score}${a.verdict ? ` · ${a.verdict}` : ''}`, cls: 'ok' }
}

function renderGrades (lang: Lang, courses: MyCourseRecord[]): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack' })
  if (!courses.length) wrap.appendChild(h('div', { class: 'app-card' }, h('p', null, T('noCourse'))))
  for (const rec of courses) {
    const course = findCourse(rec.courseId)
    const sum = rec.summary
    wrap.appendChild(h('section', { class: 'app-card' },
      h('h2', null, course?.title ?? rec.courseId),
      h('dl', { class: 'app-facts' },
        h('div', null, h('dt', null, T('progress')), h('dd', null, `${sum?.lessonsCompleted ?? 0}/${sum?.lessonsTotal ?? 0}`)),
        h('div', null, h('dt', null, T('graded')), h('dd', null, String(sum?.gradedAttempts ?? 0))),
        h('div', null, h('dt', null, T('best')), h('dd', null, sum?.bestScore === null || sum?.bestScore === undefined ? '—' : String(sum.bestScore))),
        h('div', null, h('dt', null, T('gate')), h('dd', null, sum?.allLessonsDone ? T('yes') : T('no'))),
      ),
      rec.attempts.length
        ? h('div', { class: 'app-table-wrap' }, h('table', { class: 'app-table' },
          h('thead', null, h('tr', null, h('th', null, T('lesson')), h('th', null, T('kind')), h('th', null, T('result')), h('th', null, T('when')))),
          h('tbody', null, ...rec.attempts.map((a) => {
            const r = resultOf(lang, a)
            return h('tr', null,
              h('td', null, lessonTitle(course, a.lesson)),
              h('td', null, a.kind),
              h('td', { class: `app-res ${r.cls}` }, r.text),
              h('td', null, a.at ? new Date(a.at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID') : '—'))
          })),
        ))
        : h('p', { class: 'app-muted' }, T('noAttempts')),
    ))
  }
  return wrap
}

function renderCredentials (lang: Lang, addr: string | null): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const list = h('div', { class: 'app-creds lesson-engine' }, h('p', { class: 'app-muted' }, T('loading')))
  if (addr) {
    void readMyCredentials(addr).then((html) => { if (list.isConnected) list.innerHTML = html }).catch((e) => { if (list.isConnected) list.textContent = String(e) })
  }
  return h('div', { class: 'app-stack' },
    h('header', { class: 'app-head' }, h('h1', null, T('credentials'))),
    h('p', { class: 'app-note' }, T('privacy')),
    h('div', { class: 'app-card' }, list),
  )
}

function renderAccount (lang: Lang, addr: string | null): HTMLElement {
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
        h('div', null, h('dt', null, T('wallet')), h('dd', null, h('code', null, addr ?? '—'), ' ', copyBtn)),
        h('div', null, h('dt', null, T('network')), h('dd', null, 'BNB Smart Chain Testnet (97)')),
      ),
      h('p', { class: 'app-muted' }, T('walletNote')),
      h('button', { type: 'button', class: 'app-btn danger', onClick: () => { forgetLearner(); window.location.hash = '#/' } }, T('signOut')),
    ),
  )
}

function renderWelcome (lang: Lang, addr: string | null): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const stations = ROLES[0].stations
  const root = h('div', { class: 'app-welcome' })
  const finish = (to: string) => {
    markOnboarded(addr)
    // Tamu yang menekan "Daftar" di halaman kursus lalu login pertama kali: sesudah onboarding kembali ke kursus itu.
    let pending: string | null = null
    try { pending = sessionStorage.getItem('lencana_enroll_target'); if (pending) sessionStorage.removeItem('lencana_enroll_target') } catch { /* tanpa storage */ }
    window.location.hash = to === '#/app' && pending ? classLink(pending) : to
  }

  const stepRoles = () => {
    root.innerHTML = ''
    root.appendChild(h('div', { class: 'wel-head' },
      h('span', { class: 'app-kicker' }, T('welcomeKicker')),
      h('h1', null, T('welcomeTitle')),
      h('p', { class: 'app-muted' }, T('welcomeSub')),
    ))
    const seat = (name: string, line: string, active: boolean) => h('div', { class: `wel-seat ${active ? 'active' : 'soon'}` },
      h('div', { class: 'wel-seat-top' }, h('strong', null, name), active ? null : h('span', { class: 'wel-badge' }, T('soon'))),
      h('p', null, line),
      active
        ? h('button', { type: 'button', class: 'app-btn primary', onClick: stepTour }, T('start'))
        : h('button', { type: 'button', class: 'app-btn', disabled: true }, T('soon')),
    )
    root.appendChild(h('div', { class: 'wel-seats' },
      seat(ROLES[0].name[lang], T('learnerRole'), true),
      seat(ROLES[1].name[lang], T('publisherRole'), false),
      seat(ROLES[2].name[lang], T('ownerRole'), false),
    ))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('skip')))
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
    root.appendChild(h('div', { class: 'wel-courses' }, ...COURSES.map((c) => h('button', { type: 'button', class: 'wel-course', onClick: () => finish(`#/course/${encodeURIComponent(c.id)}`) },
      h('span', { class: 'app-kicker' }, c.level),
      h('strong', null, c.title),
      h('span', { class: 'app-muted' }, c.blurb),
    ))))
    root.appendChild(h('button', { type: 'button', class: 'wel-skip', onClick: () => finish('#/app') }, T('later')))
  }

  stepRoles()
  return root
}
