/**
 * `overview.ts` — Ringkasan dashboard peserta (B127): halaman pertama sesudah masuk, jadi ia harus menjawab tiga
 * pertanyaan tanpa diklik — di mana aku berhenti, apa yang menungguku, dan seberapa dekat aku dengan kredensial.
 *
 * Pola dari referensi LMS (vault `12-LMS-References`, dipakai sebagai proses, bukan tampilan): lanjutkan belajar
 * (resume), daftar yang perlu dikerjakan (to-do), dan linimasa kegiatan. Ditambah dua hal khas Lencana: jarak ke ambang
 * kredensial (perkiraan `computeScore` penerbit) dan saldo koin dari chain. Semua angka dari rekaman penerbit dan chain.
 */
// Lencana-B127 status=TERBUKA 2026-10-02 — Ringkasan: ubin + saldo, lanjutkan belajar (cincin + lesson berikutnya), perlu perhatianmu (kuis di bawah ambang, esai, kelas belum dimulai), menuju kredensial (perkiraan vs ambang), aktivitas terbaru, kursus untukmu. Buktikan ulang: uji peramban T49. JANGAN dibalik/diulang tanpa membuka kembali baris B127 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './dash-catalog.css'
import { h } from '../lib/ui'
import { COURSES, LISTED_COURSES, findCourse } from '../courses/index'
import type { Course } from '../content'
import { snapshot, type MyCourseRecord } from '../learning'
import { classLink } from '../lesson-views'
import { PAY_TOKEN_SYMBOL, formatLdc, priceOf } from '../pricing'
import { ring } from '../lib/charts'
import { coin } from '../lib/coin'
import { emblem, topicColor } from '../lib/emblem'
import { odometer, setOdometer } from '../lib/odometer'
import { onBalance } from '../balance'
import { evaluate } from './grades'

type Lang = 'en' | 'id'

const COPY = {
  hello: { en: 'Hi', id: 'Halo' },
  enrolled: { en: 'Courses taken', id: 'Kursus diikuti' },
  lessonsDone: { en: 'Lessons completed', id: 'Lesson selesai' },
  graded: { en: 'Graded attempts', id: 'Usaha dinilai' },
  balance: { en: 'Test-coin balance', id: 'Saldo koin uji' },
  continue: { en: 'Continue learning', id: 'Lanjutkan belajar' },
  next: { en: 'Next', id: 'Berikutnya' },
  allDone: { en: 'All lessons completed', id: 'Semua lesson selesai' },
  lessonsWord: { en: 'lessons', id: 'lesson' },
  resume: { en: 'Continue', id: 'Lanjutkan' },
  openClass: { en: 'Open class', id: 'Buka kelas' },
  allClasses: { en: 'See all classes', id: 'Lihat semua kelas' },
  startHere: { en: 'You have not taken a course yet. Find one on the Courses page — preview what it proves before you pay.', id: 'Kamu belum mengikuti kursus. Cari di halaman Kursus — lihat apa yang dibuktikannya sebelum membayar.' },
  browse: { en: 'Browse courses', id: 'Jelajahi kursus' },
  todo: { en: 'Needs your attention', id: 'Perlu perhatianmu' },
  todoNone: { en: 'Nothing is waiting on you. Keep going with your next lesson.', id: 'Tidak ada yang menunggumu. Lanjutkan lesson berikutnya.' },
  retry: { en: 'Retake quiz', id: 'Ulangi kuis' },
  scored: { en: 'scored', id: 'skor' },
  passAt: { en: 'pass mark', id: 'ambang' },
  doQuiz: { en: 'Take quiz', id: 'Kerjakan kuis' },
  sendEssay: { en: 'Submit essay', id: 'Kirim esai' },
  waitEssay: { en: 'Essay waiting for approval', id: 'Esai menunggu pengesahan' },
  startClass: { en: 'Start class', id: 'Mulai kelas' },
  path: { en: 'Toward your credential', id: 'Menuju kredensial' },
  pathNote: { en: 'Points collected against the publisher’s pass mark — an estimate with the publisher’s own scoring function.', id: 'Poin terkumpul terhadap ambang penerbit — perkiraan dengan fungsi nilai penerbit sendiri.' },
  ready: { en: 'Above the pass mark', id: 'Di atas ambang' },
  below: { en: 'Below the pass mark', id: 'Di bawah ambang' },
  incomplete: { en: 'Incomplete', id: 'Belum lengkap' },
  activity: { en: 'Recent activity', id: 'Aktivitas terbaru' },
  activityNone: { en: 'No activity yet.', id: 'Belum ada aktivitas.' },
  evEnroll: { en: 'Enrolled in', id: 'Terdaftar di' },
  evPay: { en: 'Paid', id: 'Membayar' },
  evQuiz: { en: 'Quiz graded', id: 'Kuis dinilai' },
  evEssaySent: { en: 'Essay submitted', id: 'Esai dikirim' },
  evEssayGraded: { en: 'Essay graded', id: 'Esai dinilai' },
  evPraktik: { en: 'Practice checked on chain', id: 'Praktik dinilai chain' },
  tx: { en: 'transaction', id: 'transaksi' },
  recs: { en: 'Courses for you', id: 'Kursus untukmu' },
  recsAll: { en: 'See all courses', id: 'Lihat semua kursus' },
  preview: { en: 'Preview', id: 'Pratinjau' },
} satisfies Record<string, Record<Lang, string>>

const ago = (lang: Lang, iso: string): string => {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'id', { numeric: 'auto' })
  const s = Math.round((ms - Date.now()) / 1000)
  const a = Math.abs(s)
  if (a < 60) return rtf.format(s, 'second')
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  return rtf.format(Math.round(s / 86400), 'day')
}

function lessonTitle (course: Course | undefined, slug: string): string {
  for (const m of course?.modules ?? []) for (const l of m.lessons) if (l.slug === slug) return l.title
  return slug
}

function nextLesson (course: Course, rec: MyCourseRecord): { href: string, title: string } | null {
  const done = new Set(rec.summary?.completed ?? [])
  for (const m of course.modules) for (const l of m.lessons) if (!done.has(l.slug)) return { href: classLink(course.id, m.id, l.slug), title: l.title }
  return null
}

function tile (value: string, label: string, i: number, extra?: { coinEl?: HTMLElement, href?: string }): HTMLElement {
  const body = [h('b', null, extra?.coinEl ?? null, odometer(value, { from: value.replace(/\d/g, '0') })), h('span', null, label)]
  return extra?.href
    ? h('a', { class: 'app-stat ov-tile lc-enter link', href: extra.href, style: { '--i': String(i) } as Partial<CSSStyleDeclaration> }, ...body)
    : h('div', { class: 'app-stat ov-tile lc-enter', style: { '--i': String(i) } as Partial<CSSStyleDeclaration> }, ...body)
}

export function renderOverview (lang: Lang, records: MyCourseRecord[], balance: bigint | null): HTMLElement {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const email = snapshot().identity?.email
  const taken = records.map((rec) => ({ rec, course: findCourse(rec.courseId) })).filter((x): x is { rec: MyCourseRecord, course: Course } => Boolean(x.course))
  const lessonsDone = records.reduce((n, c) => n + (c.summary?.lessonsCompleted ?? 0), 0)
  const graded = records.reduce((n, c) => n + (c.summary?.gradedAttempts ?? 0), 0)
  const wrap = h('div', { class: 'app-stack ov' })

  wrap.appendChild(h('p', { class: 'app-hello' }, `${T('hello')}${email ? `, ${email}` : ''}.`))

  // ---- ubin: tiga angka belajar + saldo (bergulir saat saldo berubah)
  const balTile = tile(balance === null ? '0' : formatLdc(balance), `${T('balance')} · ${PAY_TOKEN_SYMBOL}`, 3, { coinEl: coin(22), href: '#/app/wallet' })
  const balOdo = balTile.querySelector<HTMLElement>('.lc-odo')
  const stop = onBalance((v) => { if (!balTile.isConnected) { stop(); return } if (v !== null && balOdo) setOdometer(balOdo, formatLdc(v)) })
  wrap.appendChild(h('div', { class: 'app-stats ov-tiles' },
    tile(String(records.length), T('enrolled'), 0),
    tile(String(lessonsDone), T('lessonsDone'), 1),
    tile(String(graded), T('graded'), 2),
    balTile))

  // ---- evaluasi per kursus sekali, dipakai "perlu perhatianmu" dan "menuju kredensial"
  const evals = taken.map(({ rec, course }) => ({ rec, course, ...evaluate(lang, course, rec.attempts) }))

  // ---- lanjutkan belajar
  const cont = h('section', { class: 'app-card ov-card lc-enter', style: { '--i': '1' } as Partial<CSSStyleDeclaration> }, h('h2', null, T('continue')))
  if (!taken.length) {
    cont.appendChild(h('p', { class: 'app-muted' }, T('startHere')))
    cont.appendChild(h('a', { class: 'app-btn primary', href: '#/app/courses' }, T('browse')))
  }
  // Tiga kelas yang terakhir disentuh (daftar, bayar, atau usaha terbaru) — sisanya di Kelas saya.
  const lastTouch = (rec: MyCourseRecord): string => [rec.enrolledAt, ...rec.attempts.map((a) => a.at), ...rec.orders.map((o) => o.at)].filter(Boolean).sort().pop() ?? ''
  const recent = [...taken].sort((a, b) => (lastTouch(a.rec) < lastTouch(b.rec) ? 1 : -1))
  for (const { rec, course } of recent.slice(0, 3)) {
    const done = rec.summary?.lessonsCompleted ?? 0
    const total = rec.summary?.lessonsTotal ?? course.modules.reduce((n, m) => n + m.lessons.length, 0)
    const nxt = nextLesson(course, rec)
    const r = ring(done, total, T('lessonsWord'))
    r.classList.add('sm')
    cont.appendChild(h('div', { class: 'ov-resume', style: { '--tc': topicColor(course.topic) } as Partial<CSSStyleDeclaration> },
      r,
      h('div', { class: 'ov-resume-text' },
        h('strong', null, course.title),
        h('span', null, nxt ? `${T('next')}: ${nxt.title}` : T('allDone'))),
      h('a', { class: 'app-btn small primary', href: nxt?.href ?? classLink(course.id) }, nxt ? T('resume') : T('openClass'))))
  }
  if (recent.length > 3) cont.appendChild(h('a', { class: 'ov-more', href: '#/app/classes' }, `${T('allClasses')} (${recent.length}) →`))

  // ---- perlu perhatianmu: urut dari yang paling bisa ditindaklanjuti
  type Todo = { rank: number, icon: string, text: string, sub: string, href: string | null }
  const todos: Todo[] = []
  for (const e of evals) {
    const startedAny = e.rec.attempts.length > 0 || (e.rec.summary?.lessonsCompleted ?? 0) > 0
    if (!startedAny) todos.push({ rank: 3, icon: '▶', text: `${T('startClass')}: ${e.course.title}`, sub: '', href: classLink(e.course.id) })
    let quizAsked = false
    for (const row of e.rows) {
      const href = classLink(e.course.id, row.moduleId, row.lesson.slug)
      if (row.kind === 'kuis' && row.cls === 'bad') todos.push({ rank: 0, icon: '↻', text: `${T('retry')}: ${row.lesson.title}`, sub: `${T('scored')} ${row.best} · ${T('passAt')} ${row.pass}`, href })
      if (row.kind === 'kuis' && row.cls === 'none' && startedAny && !quizAsked) { quizAsked = true; todos.push({ rank: 2, icon: '?', text: `${T('doQuiz')}: ${row.lesson.title}`, sub: e.course.title, href }) }
      if (row.kind === 'esai' && row.cls === 'none' && startedAny) todos.push({ rank: 1, icon: '✎', text: `${T('sendEssay')}: ${row.lesson.title}`, sub: e.course.title, href })
      if (row.kind === 'esai' && row.cls === 'wait') todos.push({ rank: 4, icon: '⌛', text: T('waitEssay'), sub: row.lesson.title, href: null })
    }
  }
  todos.sort((a, b) => a.rank - b.rank)
  const todo = h('section', { class: 'app-card ov-card lc-enter', style: { '--i': '2' } as Partial<CSSStyleDeclaration> }, h('h2', null, T('todo')))
  if (!todos.length) todo.appendChild(h('p', { class: 'app-muted' }, taken.length ? T('todoNone') : T('startHere')))
  else {
    todo.appendChild(h('ul', { class: 'ov-todo' }, ...todos.slice(0, 6).map((t) => {
      const inner = [h('span', { class: `ov-todo-ic r${t.rank}`, 'aria-hidden': 'true' }, t.icon), h('span', { class: 'ov-todo-text' }, h('strong', null, t.text), t.sub ? h('small', null, t.sub) : null)]
      return h('li', null, t.href ? h('a', { href: t.href }, ...inner) : h('div', null, ...inner))
    })))
  }
  wrap.appendChild(h('div', { class: 'ov-grid' }, cont, todo))

  // ---- menuju kredensial
  const path = h('section', { class: 'app-card ov-card lc-enter', style: { '--i': '3' } as Partial<CSSStyleDeclaration> }, h('h2', null, T('path')))
  if (!evals.length) path.appendChild(h('p', { class: 'app-muted' }, T('startHere')))
  for (const e of evals) {
    const s = e.score
    if (!s) continue
    const collected = s.components.reduce((n, c) => n + c.earned, 0)
    const complete = s.total !== null
    const value = complete ? (s.total as number) : collected
    const state = !complete ? 'wait' : s.verdict === 'LULUS' ? 'ok' : 'bad'
    path.appendChild(h('a', { class: 'ov-path', href: '#/app/grades', style: { '--tc': topicColor(e.course.topic) } as Partial<CSSStyleDeclaration> },
      h('span', { class: 'ov-path-em' }, emblem(e.course, 34)),
      h('div', { class: 'ov-path-main' },
        h('div', { class: 'ov-path-top' },
          h('strong', null, e.course.title),
          h('span', { class: `gr-chip ${state}` }, !complete ? T('incomplete') : s.verdict === 'LULUS' ? T('ready') : T('below'))),
        h('div', { class: 'ov-pbar', role: 'img', 'aria-label': `${value.toFixed(0)} / ${s.passMark}` },
          h('span', { class: 'ov-pfill', style: { width: `${Math.min(100, value)}%` } }),
          h('span', { class: 'ov-ppass', style: { left: `${s.passMark}%` } })),
        h('small', null, `${value.toFixed(complete ? 0 : 1).replace(/\.0$/, '')} / ${T('passAt')} ${s.passMark}`))))
  }
  if (evals.length) path.appendChild(h('p', { class: 'app-muted ov-small' }, T('pathNote')))

  // ---- aktivitas terbaru: pendaftaran, pembayaran, dan usaha yang dinilai, urut waktu
  type Ev = { at: string, text: string, tx?: string | null }
  const events: Ev[] = []
  for (const { rec, course } of taken) {
    if (rec.enrolledAt) events.push({ at: rec.enrolledAt, text: `${T('evEnroll')} ${course.title}` })
    for (const o of rec.orders) if (o.state === 'paid') events.push({ at: o.at, text: `${T('evPay')} ${formatLdc(BigInt(o.amount))} ${PAY_TOKEN_SYMBOL} — ${course.title}`, tx: o.tx })
    for (const a of rec.attempts) {
      const lt = lessonTitle(course, a.lesson)
      if (a.kind === 'kuis' && a.score !== null) events.push({ at: a.at, text: `${T('evQuiz')} ${a.score} — ${lt}` })
      else if (a.kind === 'esai') events.push({ at: a.at, text: a.score === null ? `${T('evEssaySent')} — ${lt}` : `${T('evEssayGraded')} ${a.score} — ${lt}` })
      else if (a.kind === 'praktik' && a.chainChecked) events.push({ at: a.at, text: `${T('evPraktik')} — ${lt}` })
    }
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1))
  const act = h('section', { class: 'app-card ov-card lc-enter', style: { '--i': '4' } as Partial<CSSStyleDeclaration> }, h('h2', null, T('activity')))
  if (!events.length) act.appendChild(h('p', { class: 'app-muted' }, T('activityNone')))
  else {
    act.appendChild(h('ol', { class: 'ov-feed' }, ...events.slice(0, 7).map((ev) => h('li', null,
      h('span', { class: 'ov-dot', 'aria-hidden': 'true' }),
      h('span', { class: 'ov-feed-text' }, ev.text,
        ev.tx ? h('a', { href: `https://testnet.bscscan.com/tx/${ev.tx}`, target: '_blank', rel: 'noopener noreferrer' }, ` · ${T('tx')} ${ev.tx.slice(0, 8)}…`) : null),
      h('time', { datetime: ev.at, title: new Date(ev.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID') }, ago(lang, ev.at))))))
  }
  wrap.appendChild(h('div', { class: 'ov-grid' }, path, act))

  // ---- kursus untukmu: katalog publik yang belum diikuti, termurah dulu
  const takenIds = new Set(records.map((r) => r.courseId))
  const recs = LISTED_COURSES.filter((c) => !takenIds.has(c.id))
    .sort((a, b) => Number(priceOf(a.id) ?? 0n) - Number(priceOf(b.id) ?? 0n))
    .slice(0, 3)
  if (recs.length) {
    wrap.appendChild(h('section', { class: 'ov-recs lc-enter', style: { '--i': '5' } as Partial<CSSStyleDeclaration> },
      h('div', { class: 'ov-recs-head' }, h('h2', null, T('recs')), h('a', { class: 'app-btn small', href: '#/app/courses' }, `${T('recsAll')} (${COURSES.length})`)),
      h('div', { class: 'ov-recs-grid' }, ...recs.map((c) => {
        const p = priceOf(c.id)
        return h('a', { class: 'ov-rec', href: `#/app/courses/${encodeURIComponent(c.id)}`, style: { '--tc': topicColor(c.topic) } as Partial<CSSStyleDeclaration> },
          emblem(c, 48),
          h('span', { class: 'ov-rec-text' },
            h('small', null, `${c.level}${c.topic ? ` · ${c.topic}` : ''}`),
            h('strong', null, c.title),
            h('span', { class: 'ov-rec-foot' }, p !== null ? h('span', { class: 'ov-rec-price' }, coin(14), `${formatLdc(p)} ${PAY_TOKEN_SYMBOL}`) : null, h('em', null, `${T('preview')} →`))))
      }))))
  }
  return wrap
}
