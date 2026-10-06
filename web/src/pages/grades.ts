/**
 * `grades.ts` — bagian "Nilai & tugas" di dashboard peserta (B126): rapor yang bisa dibaca sekilas.
 *
 * Per kursus: cincin lesson selesai, timbangan kelulusan (poin terkumpul per komponen terhadap ambang penerbit), batang
 * skor kuis terbaik per lesson, dan tabel ringkas satu baris per tugas yang dinilai. Riwayat semua usaha tetap ada,
 * dilipat di bawahnya.
 *
 * Perkiraan nilai akhir dihitung dengan `computeScore` — fungsi yang sama dengan yang dipakai penerbit saat menerbitkan —
 * atas bukti yang dipilih dengan aturan `signer/src/fromAttempts.js`: usaha terbaik per lesson kuis, esai hanya kalau
 * disahkan manusia (atau dinilai tanpa model), praktik hanya kalau dinilai chain (`chainChecked`, B121). Angka resmi
 * tetap angka penerbit saat menerbitkan; halaman ini menyebutnya "perkiraan".
 */
// Lencana-B126 status=SELESAI 2026-10-02 — Nilai & tugas: cincin progres, timbangan kelulusan (computeScore atas bukti dengan aturan fromAttempts), batang skor kuis, tabel ringkas per tugas, riwayat dilipat. Buktikan ulang: cd web && npm run build, lalu uji peramban T48. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { h } from '../lib/ui'
import { findCourse } from '../courses/index'
import type { Course, Lesson } from '../content'
import { manifestOf, rubricHashOf, shortHash } from '../manifest'
import { computeScore, type Score } from '../score'
import type { MyAttempt, MyCourseRecord } from '../learning'
import { classLink, levelLabel } from '../lesson-views'
import { miniBar, passGauge, quizBars, ring, type GaugePart } from '../lib/charts'
import { odometer } from '../lib/odometer'

type Lang = 'en' | 'id'
type Kind = 'kuis' | 'esai' | 'praktik'

const COPY = {
  note: {
    en: 'Estimates use the publisher’s own scoring function and rules (weights, pass mark, rubricHash). The official number is the publisher’s, computed when a credential is issued.',
    id: 'Perkiraan memakai fungsi dan aturan penilaian penerbit sendiri (bobot, ambang, rubricHash). Angka resmi adalah angka penerbit, dihitung saat kredensial diterbitkan.',
  },
  quizPassed: { en: 'Quizzes passed', id: 'Kuis lulus' },
  quizAvg: { en: 'Average best quiz score', id: 'Rata-rata skor kuis terbaik' },
  essays: { en: 'Essays approved', id: 'Esai disahkan' },
  ready: { en: 'Courses at the pass mark', id: 'Kursus di atas ambang' },
  waiting: { en: 'waiting', id: 'menunggu' },
  open: { en: 'Open class', id: 'Buka kelas' },
  rubric: { en: 'rubric', id: 'rubrik' },
  lessonsDone: { en: 'lessons done', id: 'lesson selesai' },
  estimate: { en: 'estimated final score', id: 'perkiraan nilai akhir' },
  collected: { en: 'points collected so far', id: 'poin terkumpul sejauh ini' },
  pass: { en: 'Pass mark', id: 'Ambang' },
  reached: { en: 'reached', id: 'tercapai' },
  ok: { en: 'Above the pass mark', id: 'Di atas ambang' },
  below: { en: 'Below the pass mark', id: 'Di bawah ambang' },
  incomplete: { en: 'Incomplete', id: 'Belum lengkap' },
  openPts: { en: 'still open — components without evidence yet', id: 'masih terbuka — komponen yang belum punya bukti' },
  avgOf: { en: 'average', id: 'rata-rata' },
  quizzesOf: { en: 'quizzes', id: 'kuis' },
  points: { en: 'points', id: 'poin' },
  noQuiz: { en: 'no graded quiz yet', id: 'belum ada kuis dinilai' },
  noEssay: { en: 'no approved essay yet', id: 'belum ada esai disahkan' },
  essayPending: { en: 'waiting for approval', id: 'menunggu pengesahan' },
  noPraktik: { en: 'not yet checked on chain', id: 'belum dinilai chain' },
  chain: { en: 'checked on chain', id: 'dinilai chain' },
  quizChart: { en: 'Best quiz score per lesson — the dashed line is that quiz’s pass mark', id: 'Skor kuis terbaik per lesson — garis putus-putus adalah ambang kuis itu' },
  notDone: { en: 'not done', id: 'belum' },
  passWord: { en: 'pass', id: 'ambang' },
  task: { en: 'Graded work', id: 'Tugas dinilai' },
  colLesson: { en: 'Lesson', id: 'Lesson' },
  colKind: { en: 'Kind', id: 'Jenis' },
  colTries: { en: 'Attempts', id: 'Usaha' },
  colBest: { en: 'Best score', id: 'Skor terbaik' },
  colStatus: { en: 'Status', id: 'Status' },
  colLast: { en: 'Last', id: 'Terakhir' },
  kuis: { en: 'Quiz', id: 'Kuis' },
  esai: { en: 'Essay', id: 'Esai' },
  praktik: { en: 'Practice', id: 'Praktik' },
  sNotDone: { en: 'Not done yet', id: 'Belum dikerjakan' },
  sNotSent: { en: 'Not submitted', id: 'Belum dikirim' },
  sQuizOk: { en: 'Passed', id: 'Lulus' },
  sQuizLow: { en: 'Below the quiz pass mark', id: 'Di bawah ambang kuis' },
  sJudge: { en: 'Waiting for grading', id: 'Menunggu penilaian' },
  sProposed: { en: 'Proposed by the grading agent — waiting for approval', id: 'Diusulkan agen penilai — menunggu pengesahan' },
  sApproved: { en: 'Approved', id: 'Disahkan' },
  sAdjusted: { en: 'Adjusted by the reviewer', id: 'Diubah reviewer' },
  sChain: { en: 'Checked on chain', id: 'Dinilai chain' },
  sSelf: { en: 'Old self-report — not counted', id: 'Laporan lama — tidak dihitung' },
  history: { en: 'All attempts', id: 'Semua usaha' },
  attempt: { en: 'Attempt', id: 'Usaha' },
  result: { en: 'Result', id: 'Hasil' },
  when: { en: 'When', id: 'Waktu' },
  noCourse: { en: 'No grades yet — take a course first.', id: 'Belum ada nilai — ikuti kursus dulu.' },
  browse: { en: 'Browse the catalogue', id: 'Jelajahi katalog' },
} satisfies Record<string, Record<Lang, string>>

export type Row = {
  lesson: Lesson
  moduleId: string
  kind: Kind
  tries: number
  best: number | null
  pass: number | null
  status: string
  cls: 'ok' | 'bad' | 'wait' | 'none'
  last: string | null
}

const ENDORSING = ['approved', 'adjusted']

/** Usaha terbaik untuk satu lesson+jenis — skor tertinggi, seri dimenangkan usaha terbaru (`fromAttempts.bestGraded`). */
function bestGraded (attempts: MyAttempt[], kind: Kind, slug: string): MyAttempt | null {
  const pool = attempts.filter((a) => a.kind === kind && a.lesson === slug && String(a.verdict ?? 'incomplete') !== 'incomplete')
  if (!pool.length) return null
  return pool.reduce((b, a) => {
    const bs = b.score ?? -1
    const as = a.score ?? -1
    if (as !== bs) return as > bs ? a : b
    return a.attemptNo >= b.attemptNo ? a : b
  })
}

function dateOf (lang: Lang, iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short' })
}

/** Baris per tugas yang dinilai + bukti untuk `computeScore`, dengan aturan pemilihan yang sama dengan penerbit. */
export function evaluate (lang: Lang, course: Course, attempts: MyAttempt[]): { rows: Row[], score: Score | null, pendingEssays: number } {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const rows: Row[] = []
  const quizScores: number[] = []
  const essayVals: number[] = []
  let pendingEssays = 0
  let praktikCompleted = false
  for (const m of course.modules) {
    for (const l of m.lessons) {
      if (l.kind !== 'kuis' && l.kind !== 'esai' && l.kind !== 'praktik') continue
      const mine = attempts.filter((a) => a.lesson === l.slug && a.kind === l.kind)
      const last = mine.reduce<string | null>((t, a) => (!t || a.at > t ? a.at : t), null)
      const row: Row = { lesson: l, moduleId: m.id, kind: l.kind, tries: mine.length, best: null, pass: null, status: '', cls: 'none', last }
      if (l.kind === 'kuis') {
        row.pass = l.quiz?.passPct ?? null
        const b = bestGraded(attempts, 'kuis', l.slug)
        if (b?.score !== null && b?.score !== undefined) {
          row.best = Math.round(b.score)
          quizScores.push(b.score)
          const passed = row.pass === null || b.score >= row.pass
          row.status = passed ? T('sQuizOk') : T('sQuizLow')
          row.cls = passed ? 'ok' : 'bad'
        } else {
          row.status = T('sNotDone')
        }
      } else if (l.kind === 'esai') {
        const b = bestGraded(attempts, 'esai', l.slug)
        if (!mine.length) row.status = T('sNotSent')
        else if (!b || b.score === null) { row.status = T('sJudge'); row.cls = 'wait' } else {
          const endorsed = !b.judgeModel || (b.review !== null && ENDORSING.includes(b.review.decision))
          const value = b.review?.finalScore ?? b.score
          row.best = Math.round(value)
          if (endorsed) {
            essayVals.push(value)
            row.status = b.review?.decision === 'adjusted' ? T('sAdjusted') : T('sApproved')
            row.cls = 'ok'
          } else {
            pendingEssays++
            row.status = T('sProposed')
            row.cls = 'wait'
          }
        }
      } else {
        const chain = mine.filter((a) => a.chainChecked)
        if (chain.length) {
          praktikCompleted = true
          row.best = 100
          row.status = T('sChain')
          row.cls = 'ok'
        } else if (mine.length) {
          row.status = T('sSelf')
          row.cls = 'wait'
        } else {
          row.status = T('sNotDone')
        }
      }
      rows.push(row)
    }
  }
  const manifest = manifestOf(course.id)
  const score = manifest
    ? computeScore(manifest, {
      quizScores,
      praktikCompleted,
      essayScore: essayVals.length ? essayVals.reduce((a, b) => a + b, 0) / essayVals.length : null,
    })
    : null
  return { rows, score, pendingEssays }
}

function gaugeOf (lang: Lang, score: Score, rows: Row[], pendingEssays: number): HTMLElement {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const quizRows = rows.filter((r) => r.kind === 'kuis')
  const given = quizRows.filter((r) => r.best !== null).length
  const label = (k: Kind): string => T(k)
  // B127: komponen berbobot 0 tidak dinilai penerbit — tidak tampil di timbangan maupun legendanya.
  const parts: GaugePart[] = score.components.filter((c) => c.weight > 0).map((c) => {
    const pts = `${c.earned.toFixed(1)} ${T('points')}`
    let note: string
    if (c.name === 'kuis') note = c.raw === null ? T('noQuiz') : `${T('avgOf')} ${Math.round(c.raw)} · ${given}/${quizRows.length} ${T('quizzesOf')} → ${pts}`
    else if (c.name === 'esai') note = c.raw === null ? (pendingEssays ? T('essayPending') : T('noEssay')) : `${Math.round(c.raw)} → ${pts}`
    else note = c.raw === null ? T('noPraktik') : `${T('chain')} → ${pts}`
    return { key: c.name, label: label(c.name), weight: c.weight, raw: c.raw, earned: c.earned, note }
  })
  const collected = score.components.reduce((n, c) => n + c.earned, 0)
  const complete = score.total !== null
  return passGauge(parts, score.passMark, {
    value: complete ? String(score.total) : collected.toFixed(1).replace(/\.0$/, ''),
    caption: complete ? T('estimate') : T('collected'),
    verdict: !complete ? T('incomplete') : score.verdict === 'LULUS' ? T('ok') : T('below'),
    verdictCls: !complete ? 'wait' : score.verdict === 'LULUS' ? 'ok' : 'bad',
    passLabel: `${T('pass')} ${score.passMark}${complete && score.verdict === 'LULUS' ? ` · ${T('reached')}` : ''}`,
    reached: complete && score.verdict === 'LULUS',
    openLabel: T('openPts'),
  })
}

function summaryTable (lang: Lang, course: Course, rows: Row[]): HTMLElement {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  return h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table gr-table' },
    h('thead', null, h('tr', null,
      h('th', null, '#'), h('th', null, T('colLesson')), h('th', null, T('colKind')), h('th', { class: 'num' }, T('colTries')),
      h('th', null, T('colBest')), h('th', null, T('colStatus')), h('th', null, T('colLast')))),
    h('tbody', null, ...rows.map((r, i) => h('tr', { class: `lc-enter gr-row ${r.cls}`, style: { '--i': String(i) } as Partial<CSSStyleDeclaration> },
      h('td', { class: 'gr-no', 'data-label': '#' }, String(i + 1).padStart(2, '0')),
      h('td', { 'data-label': T('colLesson') }, h('a', { href: classLink(course.id, r.moduleId, r.lesson.slug) }, r.lesson.title)),
      h('td', { 'data-label': T('colKind') }, h('span', { class: `gr-kind ${r.kind}` }, T(r.kind))),
      h('td', { class: 'num', 'data-label': T('colTries') }, String(r.tries)),
      h('td', { 'data-label': T('colBest') }, h('span', { class: 'gr-best' }, miniBar(r.best, r.pass), h('b', null, r.best === null ? '—' : String(r.best)))),
      h('td', { 'data-label': T('colStatus') }, h('span', { class: `gr-chip ${r.cls}` }, r.status)),
      h('td', { class: 'gr-when', 'data-label': T('colLast') }, dateOf(lang, r.last)),
    ))),
  ))
}

function historyOf (lang: Lang, course: Course, attempts: MyAttempt[]): HTMLElement | null {
  if (!attempts.length) return null
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const title = (slug: string): string => {
    for (const m of course.modules) for (const l of m.lessons) if (l.slug === slug) return l.title
    return slug
  }
  const sorted = [...attempts].sort((a, b) => (a.at < b.at ? 1 : -1))
  return h('details', { class: 'gr-history' },
    h('summary', null, `${T('history')} (${attempts.length})`),
    h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table' },
      h('thead', null, h('tr', null, h('th', null, T('colLesson')), h('th', null, T('colKind')), h('th', { class: 'num' }, T('attempt')), h('th', null, T('result')), h('th', null, T('when')))),
      h('tbody', null, ...sorted.map((a) => h('tr', null,
        h('td', { 'data-label': T('colLesson') }, title(a.lesson)),
        h('td', { 'data-label': T('colKind') }, a.kind === 'kuis' || a.kind === 'esai' || a.kind === 'praktik' ? T(a.kind) : a.kind),
        h('td', { class: 'num', 'data-label': T('attempt') }, `#${a.attemptNo}`),
        h('td', { 'data-label': T('result') }, a.score === null ? (a.verdict ?? '—') : `${a.score}${a.verdict ? ` · ${a.verdict}` : ''}`),
        h('td', { 'data-label': T('when') }, a.at ? new Date(a.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'),
      ))),
    )))
}

function tile (value: string, label: string, sub: string | null, i: number): HTMLElement {
  return h('div', { class: 'app-stat gr-tile lc-enter', style: { '--i': String(i) } as Partial<CSSStyleDeclaration> },
    h('b', null, odometer(value, { from: value.replace(/\d/g, '0') })),
    h('span', null, label),
    sub ? h('small', null, sub) : null)
}

export function renderGrades (lang: Lang, courses: MyCourseRecord[]): HTMLElement {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack gr' })
  if (!courses.length) {
    wrap.appendChild(h('div', { class: 'app-card' }, h('p', null, T('noCourse')), h('a', { class: 'app-btn', href: '#catalog' }, T('browse'))))
    return wrap
  }
  const evaluated = courses.map((rec) => {
    const course = findCourse(rec.courseId)
    return course ? { rec, course, ...evaluate(lang, course, rec.attempts) } : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const quizRows = evaluated.flatMap((e) => e.rows.filter((r) => r.kind === 'kuis'))
  const quizBest = quizRows.filter((r) => r.best !== null).map((r) => r.best as number)
  const essayRows = evaluated.flatMap((e) => e.rows.filter((r) => r.kind === 'esai'))
  const pending = evaluated.reduce((n, e) => n + e.pendingEssays, 0)
  wrap.appendChild(h('p', { class: 'app-note' }, T('note')))
  wrap.appendChild(h('div', { class: 'app-stats gr-tiles' },
    tile(`${quizRows.filter((r) => r.cls === 'ok').length}/${quizRows.length}`, T('quizPassed'), null, 0),
    tile(quizBest.length ? String(Math.round(quizBest.reduce((a, b) => a + b, 0) / quizBest.length)) : '0', T('quizAvg'), null, 1),
    tile(`${essayRows.filter((r) => r.cls === 'ok').length}/${essayRows.length}`, T('essays'), pending ? `${pending} ${T('waiting')}` : null, 2),
    tile(`${evaluated.filter((e) => e.score?.verdict === 'LULUS').length}/${evaluated.length}`, T('ready'), null, 3),
  ))

  evaluated.forEach(({ rec, course, rows, score, pendingEssays }, ci) => {
    const manifest = manifestOf(course.id)
    const done = rec.summary?.lessonsCompleted ?? 0
    const total = rec.summary?.lessonsTotal ?? course.modules.reduce((n, m) => n + m.lessons.length, 0)
    const quizzes = rows.filter((r) => r.kind === 'kuis')
    wrap.appendChild(h('section', { class: 'app-card gr-course lc-enter', style: { '--i': String(ci + 2) } as Partial<CSSStyleDeclaration> },
      h('header', { class: 'gr-head' },
        h('div', null,
          h('span', { class: 'app-kicker' }, `${levelLabel(course.level, lang)}${manifest ? ` · ${T('rubric')} ${shortHash(rubricHashOf(manifest))}` : ''}`),
          h('h2', null, course.title)),
        h('a', { class: 'app-btn small', href: classLink(course.id) }, T('open'))),
      h('div', { class: 'gr-top' },
        ring(done, total, T('lessonsDone')),
        score ? gaugeOf(lang, score, rows, pendingEssays) : null),
      quizzes.length
        ? quizBars(quizzes.map((r, i) => ({ short: `K${i + 1}`, title: r.lesson.title, score: r.best, pass: r.pass ?? 0 })),
          { caption: T('quizChart'), none: T('notDone'), passWord: T('passWord') })
        : null,
      h('h3', { class: 'gr-sub' }, T('task')),
      summaryTable(lang, course, rows),
      historyOf(lang, course, rec.attempts),
    ))
  })
  return wrap
}
