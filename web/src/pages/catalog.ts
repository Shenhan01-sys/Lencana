/**
 * `catalog.ts` — halaman Kursus di dashboard peserta (B127): mencari kursus baru, melihat metadatanya, lalu membayar
 * untuk mendaftar tanpa meninggalkan dashboard.
 *
 * Tiap kartu adalah lencana yang akan didapat (emblem topik + cincin tingkat) beserta angka yang menentukan keputusan
 * membayar: isi, durasi, cara dinilai (bobot + ambang), harga. Pratinjau = lembar spesifikasi kredensialnya: hasil
 * belajar, untuk siapa, silabus, bobot, ambang, rubricHash — lalu panel bayar yang sama dengan halaman kursus (B125).
 * Semua angka dihitung dari data kursus dan manifest penerbit; status "terdaftar" dari rekaman penerbit.
 */
// Lencana-B127 status=TERBUKA 2026-10-02 — halaman Kursus: cari (judul, ringkasan, topik, isi lesson), saring tingkat/topik/status, urutkan, kartu lencana, pratinjau metadata + bayar & daftar di panel samping. Buktikan ulang: cd web && npm run build, lalu uji peramban T49. JANGAN dibalik/diulang tanpa membuka kembali baris B127 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './dash-catalog.css'
import { h } from '../lib/ui'
import { COURSES } from '../courses/index'
import { courseStats, type Course, type LessonKind } from '../content'
import { manifestOf, rubricHashOf, shortHash } from '../manifest'
import { PAY_TOKEN_SYMBOL, formatLdc, priceOf } from '../pricing'
import type { MyCourseRecord } from '../learning'
import { classLink, levelLabel } from '../lesson-views'
import { coin } from '../lib/coin'
import { emblem, topicColor } from '../lib/emblem'
import { embeddedPayPanel } from './course-detail'

type Lang = 'en' | 'id'
type Status = 'all' | 'open' | 'mine'
type Sort = 'rec' | 'cheap' | 'pricey' | 'short'

const COPY = {
  lead: { en: 'Find a course, read what it proves and how it is graded, then pay to enroll — all before you commit a single coin.', id: 'Cari kursus, baca apa yang dibuktikannya dan bagaimana ia dinilai, lalu bayar untuk mendaftar — semuanya sebelum satu koin pun keluar.' },
  search: { en: 'Search courses, topics, or lesson content…', id: 'Cari kursus, topik, atau isi lesson…' },
  clear: { en: 'Clear', id: 'Hapus' },
  level: { en: 'Level', id: 'Tingkat' },
  topic: { en: 'Topic', id: 'Topik' },
  status: { en: 'Status', id: 'Status' },
  sort: { en: 'Sort', id: 'Urutkan' },
  all: { en: 'All', id: 'Semua' },
  open: { en: 'Not taken', id: 'Belum diikuti' },
  mine: { en: 'Enrolled', id: 'Terdaftar' },
  rec: { en: 'Recommended', id: 'Rekomendasi' },
  cheap: { en: 'Lowest price', id: 'Harga terendah' },
  pricey: { en: 'Highest price', id: 'Harga tertinggi' },
  short: { en: 'Shortest', id: 'Terpendek' },
  courses: { en: 'courses', id: 'kursus' },
  enrolled: { en: 'enrolled', id: 'terdaftar' },
  resultsFor: { en: 'results for', id: 'hasil untuk' },
  none: { en: 'No course matches. Try another word or clear the filters.', id: 'Tidak ada kursus yang cocok. Coba kata lain atau hapus saringan.' },
  reset: { en: 'Reset filters', id: 'Atur ulang saringan' },
  modules: { en: 'modules', id: 'modul' },
  lessons: { en: 'lessons', id: 'lesson' },
  minutes: { en: 'min', id: 'menit' },
  pass: { en: 'pass', id: 'ambang' },
  preview: { en: 'Preview', id: 'Pratinjau' },
  enrolledChip: { en: 'Enrolled', id: 'Terdaftar' },
  test: { en: 'test class', id: 'kelas uji' },
  free: { en: 'Free', id: 'Gratis' },
  statusUnread: { en: 'Your enrollments could not be read, so every course shows as not taken.', id: 'Pendaftaranmu tidak terbaca, jadi semua kursus tampil sebagai belum diikuti.' },
  checkingStatus: { en: 'checking your enrollments…', id: 'memeriksa pendaftaranmu…' },
  close: { en: 'Close', id: 'Tutup' },
  by: { en: 'Published by', id: 'Diterbitkan oleh' },
  quizQ: { en: 'quiz questions', id: 'soal kuis' },
  essays: { en: 'essays', id: 'esai' },
  validFor: { en: 'valid', id: 'berlaku' },
  days: { en: 'days', id: 'hari' },
  outcome: { en: 'What you will be able to do', id: 'Yang akan kamu kuasai' },
  audience: { en: 'Who it is for', id: 'Untuk siapa' },
  graded: { en: 'How it is graded', id: 'Cara dinilai' },
  syllabus: { en: 'Syllabus', id: 'Silabus' },
  kuis: { en: 'Quiz', id: 'Kuis' },
  esai: { en: 'Essay', id: 'Esai' },
  praktik: { en: 'Practice', id: 'Praktik' },
  passMark: { en: 'Pass mark', id: 'Ambang lulus' },
  rubric: { en: 'Grading rules locked in rubricHash', id: 'Aturan nilai dikunci di rubricHash' },
  notGraded: { en: 'not graded (weight 0)', id: 'tidak dinilai (bobot 0)' },
  prereq: { en: 'Prerequisite', id: 'Prasyarat' },
  price: { en: 'Price', id: 'Harga' },
  coinNote: { en: 'test coin on BNB testnet', id: 'koin uji di BNB testnet' },
  openClass: { en: 'Open class', id: 'Buka kelas' },
  youAreIn: { en: 'You are enrolled in this course.', id: 'Kamu sudah terdaftar di kursus ini.' },
  fullPage: { en: 'Full course page', id: 'Halaman kursus lengkap' },
} satisfies Record<string, Record<Lang, string>>

const KIND: Record<LessonKind, Record<Lang, string>> = {
  bacaan: { en: 'reading', id: 'bacaan' },
  kuis: { en: 'quiz', id: 'kuis' },
  esai: { en: 'essay', id: 'esai' },
  praktik: { en: 'practice', id: 'praktik' },
  kasus: { en: 'case', id: 'kasus' },
  referensi: { en: 'reference', id: 'referensi' },
}
const LEVELS: Course['level'][] = ['dasar', 'menengah', 'lanjutan']

/** Huruf kecil tanpa diakritik — "Keuangan" cocok dengan "keuangan", "café" dengan "cafe". */
const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Teks yang dicari: judul, ringkasan, penerbit, topik, tingkat, hasil belajar, sasaran, judul + ringkasan lesson. */
function haystack (c: Course): string {
  return norm([
    c.title, c.blurb, c.institution, c.topic ?? '', c.level, ...c.outcome, ...c.audience,
    ...c.modules.flatMap((m) => [m.title, m.blurb, ...m.lessons.flatMap((l) => [l.title, l.summary])]),
  ].join(' \u0001 '))
}

const fmtPrice = (lang: Lang, p: bigint | null): string => (p === null ? COPY.free[lang] : `${formatLdc(p)} ${PAY_TOKEN_SYMBOL}`)

/** Batang bobot kecil: lebar segmen = bobot komponen; komponen berbobot 0 tidak digambar. */
function weightBar (c: Course): HTMLElement {
  const bar = h('span', { class: 'cg-wbar', 'aria-hidden': 'true' })
  for (const k of ['kuis', 'esai', 'praktik'] as const) {
    if (c.weights[k] > 0) bar.appendChild(h('span', { class: `cg-w ${k}`, style: { width: `${c.weights[k]}%` } }))
  }
  return bar
}

/**
 * `records`: rekaman penerbit; `null` = gagal dibaca; `undefined` = belum datang. Katalog tampil seketika (ia tidak
 * butuh rekaman), lalu `setRecords` mengisi status "terdaftar" tanpa menggambar ulang pencarian yang sedang diketik.
 */
export function renderCatalog (lang: Lang, records: MyCourseRecord[] | null | undefined, openId?: string): HTMLElement & { setRecords: (r: MyCourseRecord[] | null) => void } {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  let mine = new Set((records ?? []).map((r) => r.courseId))
  let pending = records === undefined
  const index = new Map(COURSES.map((c) => [c.id, haystack(c)]))
  const topics = [...new Set(COURSES.map((c) => c.topic).filter((t): t is string => Boolean(t)))]
  const state: { q: string, level: string, topic: string, status: Status, sort: Sort } = { q: '', level: 'all', topic: 'all', status: 'all', sort: 'rec' }

  const grid = h('div', { class: 'cg-grid', role: 'list' })
  const count = h('p', { class: 'cg-count', role: 'status', 'aria-live': 'polite' })
  const input = h('input', { type: 'search', class: 'cg-search-input', placeholder: T('search'), 'aria-label': T('search'), autocomplete: 'off' }) as HTMLInputElement
  const clearBtn = h('button', { type: 'button', class: 'cg-clear', hidden: true }, T('clear')) as HTMLButtonElement

  const resets: (() => void)[] = []
  const chipGroup = (label: string, key: 'level' | 'topic' | 'status', options: [string, string][]): HTMLElement => {
    const group = h('div', { class: 'cg-chips', role: 'group', 'aria-label': label }, h('span', { class: 'cg-chips-label' }, label))
    const mark = (value: string): void => buttons.forEach((x, i) => x.setAttribute('aria-pressed', String(options[i][0] === value)))
    const buttons = options.map(([value, text]) => {
      const b = h('button', { type: 'button', class: 'cg-chip', 'aria-pressed': String(state[key] === value) }, text) as HTMLButtonElement
      b.addEventListener('click', () => {
        ;(state as Record<string, string>)[key] = value
        mark(value)
        draw()
      })
      return b
    })
    buttons.forEach((b) => group.appendChild(b))
    resets.push(() => mark('all'))
    return group
  }
  const resetAll = (): void => {
    Object.assign(state, { q: '', level: 'all', topic: 'all', status: 'all', sort: 'rec' })
    input.value = ''
    clearBtn.hidden = true
    sortSel.value = 'rec'
    resets.forEach((r) => r())
    draw()
  }
  const sortSel = h('select', { class: 'cg-sort', 'aria-label': T('sort') },
    ...(['rec', 'cheap', 'pricey', 'short'] as Sort[]).map((s) => h('option', { value: s }, T(s)))) as HTMLSelectElement
  sortSel.addEventListener('change', () => { state.sort = sortSel.value as Sort; draw() })

  let timer: ReturnType<typeof setTimeout> | null = null
  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { state.q = input.value; draw() }, 120)
  })
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; state.q = ''; draw(); input.focus() })

  const card = (c: Course, i: number): HTMLElement => {
    const s = courseStats(c)
    const enrolled = mine.has(c.id)
    const price = priceOf(c.id)
    const el = h('article', { class: `cg-card${enrolled ? ' is-mine' : ''}`, role: 'listitem', style: { '--tc': topicColor(c.topic), '--i': String(i) } as Partial<CSSStyleDeclaration> },
      h('div', { class: 'cg-card-top' },
        h('span', { class: 'cg-emblem' }, emblem(c, 64)),
        h('div', { class: 'cg-tags' },
          h('span', { class: 'cg-tag lvl' }, levelLabel(c.level, lang)),
          c.topic ? h('span', { class: 'cg-tag topic' }, c.topic) : null,
          c.unlisted ? h('span', { class: 'cg-tag test' }, T('test')) : null)),
      h('h3', { class: 'cg-title' }, c.title),
      h('p', { class: 'cg-blurb' }, c.blurb),
      h('p', { class: 'cg-meta' }, `${s.modules} ${T('modules')} · ${s.lessons} ${T('lessons')} · ${s.minutes} ${T('minutes')}`),
      h('div', { class: 'cg-assess' }, weightBar(c), h('span', null, `${T('pass')} ${c.passMark}`)),
      h('div', { class: 'cg-foot' },
        enrolled
          ? h('span', { class: 'cg-mine' }, `✓ ${T('enrolledChip')}`)
          : h('span', { class: 'cg-price' }, coin(16), fmtPrice(lang, price)),
        h('button', { type: 'button', class: 'cg-preview', onClick: () => openPreview(c, el) }, `${T('preview')} →`)),
    )
    el.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('button, a')) return
      openPreview(c, el)
    })
    return el
  }

  const draw = (): void => {
    const q = norm(state.q.trim())
    const words = q.split(/\s+/).filter(Boolean)
    let list = COURSES.filter((c) =>
      (state.level === 'all' || c.level === state.level)
      && (state.topic === 'all' || c.topic === state.topic)
      && (state.status === 'all' || (state.status === 'mine') === mine.has(c.id))
      && words.every((w) => index.get(c.id)?.includes(w)))
    const p = (c: Course): number => Number(priceOf(c.id) ?? 0n)
    if (state.sort === 'cheap') list = [...list].sort((a, b) => p(a) - p(b))
    else if (state.sort === 'pricey') list = [...list].sort((a, b) => p(b) - p(a))
    else if (state.sort === 'short') list = [...list].sort((a, b) => courseStats(a).minutes - courseStats(b).minutes)
    else list = [...list].sort((a, b) => Number(mine.has(a.id)) - Number(mine.has(b.id)) || Number(Boolean(a.unlisted)) - Number(Boolean(b.unlisted)) || p(a) - p(b))
    grid.replaceChildren(...list.map(card))
    const enrolledCount = COURSES.filter((c) => mine.has(c.id)).length
    count.textContent = q
      ? `${list.length} ${T('resultsFor')} "${state.q.trim()}"`
      : `${list.length} ${T('courses')} · ${pending ? T('checkingStatus') : `${enrolledCount} ${T('enrolled')}`}`
    if (!list.length) {
      grid.appendChild(h('div', { class: 'cg-empty' }, h('p', null, T('none')),
        h('button', { type: 'button', class: 'app-btn', onClick: resetAll }, T('reset'))))
    }
  }

  // ---- pratinjau: lembar spesifikasi kredensial di panel samping
  let lastCard: HTMLElement | null = null
  const openPreview = (c: Course, from?: HTMLElement): void => {
    lastCard = from ?? null
    document.querySelector('.cg-drawer-root')?.remove()
    const s = courseStats(c)
    const mf = manifestOf(c.id)
    const price = priceOf(c.id)
    const enrolled = mine.has(c.id)
    const prereq = c.prereqCourseId ? COURSES.find((x) => x.id === c.prereqCourseId) : undefined
    const close = (): void => {
      root.classList.remove('in')
      document.documentElement.classList.remove('cg-lock')
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
      setTimeout(() => root.remove(), 260)
      lastCard?.querySelector<HTMLElement>('.cg-preview')?.focus()
    }
    const onKey = (ev: KeyboardEvent): void => { if (ev.key === 'Escape') close() }
    const onHash = (): void => close()
    const closeBtn = h('button', { type: 'button', class: 'cg-x', 'aria-label': T('close') }, '×') as HTMLButtonElement
    closeBtn.addEventListener('click', close)
    const gradeRow = (k: 'kuis' | 'esai' | 'praktik'): HTMLElement => h('li', { class: c.weights[k] ? '' : 'off' },
      h('i', { class: `cg-sw ${k}`, 'aria-hidden': 'true' }),
      h('strong', null, `${T(k)} ${c.weights[k]}%`),
      c.weights[k] ? null : h('span', null, T('notGraded')))
    const action = enrolled
      ? h('div', { class: 'cg-action' }, h('p', { class: 'cg-ok' }, T('youAreIn')), h('a', { class: 'cg-cta', href: classLink(c.id) }, T('openClass')))
      : embeddedPayPanel(c.id)
    const root = h('div', { class: 'cg-drawer-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cg-drawer-title', style: { '--tc': topicColor(c.topic) } as Partial<CSSStyleDeclaration> },
      h('div', { class: 'cg-backdrop', onClick: close }),
      h('aside', { class: 'cg-drawer' },
        h('header', { class: 'cg-drawer-head' },
          h('span', { class: 'cg-emblem big' }, emblem(c, 88)),
          h('div', null,
            h('div', { class: 'cg-tags' },
              h('span', { class: 'cg-tag lvl' }, levelLabel(c.level, lang)),
              c.topic ? h('span', { class: 'cg-tag topic' }, c.topic) : null,
              c.unlisted ? h('span', { class: 'cg-tag test' }, T('test')) : null),
            h('h2', { id: 'cg-drawer-title' }, c.title),
            h('p', { class: 'cg-by' }, `${T('by')} `, h('strong', null, mf?.issuer.name ?? c.institution))),
          closeBtn),
        h('div', { class: 'cg-drawer-body' },
          h('p', { class: 'cg-lead' }, c.blurb),
          h('dl', { class: 'cg-facts' },
            h('div', null, h('dt', null, T('modules')), h('dd', null, String(s.modules))),
            h('div', null, h('dt', null, T('lessons')), h('dd', null, String(s.lessons))),
            h('div', null, h('dt', null, T('minutes')), h('dd', null, String(s.minutes))),
            h('div', null, h('dt', null, T('quizQ')), h('dd', null, String(s.quizQuestions))),
            h('div', null, h('dt', null, T('essays')), h('dd', null, String(s.essays))),
            h('div', null, h('dt', null, T('validFor')), h('dd', null, `${c.validDays} ${T('days')}`))),
          h('section', { class: 'cg-sec' }, h('h3', null, T('outcome')), h('ul', { class: 'cg-list' }, ...c.outcome.map((o) => h('li', null, o)))),
          h('section', { class: 'cg-sec' }, h('h3', null, T('audience')), h('ul', { class: 'cg-list' }, ...c.audience.map((a) => h('li', null, a)))),
          h('section', { class: 'cg-sec' },
            h('h3', null, T('graded')),
            h('div', { class: 'cg-gwrap', role: 'img', 'aria-label': `${T('kuis')} ${c.weights.kuis}%, ${T('esai')} ${c.weights.esai}%, ${T('praktik')} ${c.weights.praktik}%; ${T('passMark')} ${c.passMark}` },
              h('div', { class: 'cg-gbar' },
                ...(['kuis', 'esai', 'praktik'] as const).filter((k) => c.weights[k] > 0).map((k) => h('span', { class: `cg-g ${k}`, style: { width: `${c.weights[k]}%` } }, `${c.weights[k]}`))),
              h('span', { class: `cg-gpass${c.passMark > 72 ? ' flip' : ''}`, style: { left: `${c.passMark}%` } }, h('em', null, `${T('passMark')} ${c.passMark}`))),
            h('ul', { class: 'cg-glegend' }, gradeRow('kuis'), gradeRow('esai'), gradeRow('praktik')),
            h('p', { class: 'cg-criteria' }, c.criteria),
            mf ? h('p', { class: 'cg-hash' }, `${T('rubric')}: `, h('code', null, shortHash(rubricHashOf(mf)))) : null,
            prereq ? h('p', { class: 'cg-hash' }, `${T('prereq')}: `, h('a', { href: `#/app/courses/${encodeURIComponent(prereq.id)}` }, prereq.title)) : null),
          h('section', { class: 'cg-sec' },
            h('h3', null, T('syllabus')),
            ...c.modules.map((m, mi) => h('div', { class: 'cg-mod' },
              h('p', { class: 'cg-mod-title' }, h('b', null, String(mi + 1).padStart(2, '0')), m.title),
              h('ol', { class: 'cg-lessons' }, ...m.lessons.map((l) => h('li', null,
                h('span', null, l.title),
                h('span', { class: `cg-kind k-${l.kind}` }, KIND[l.kind]?.[lang] ?? l.kind),
                h('span', { class: 'cg-min' }, `${l.minutes} ${T('minutes')}`)))))))),
        h('footer', { class: 'cg-drawer-foot' },
          h('div', { class: 'cg-price-big' },
            h('span', null, T('price')),
            h('strong', null, coin(22), fmtPrice(lang, price)),
            h('small', null, T('coinNote'))),
          action,
          h('a', { class: 'cg-full', href: `#/course/${encodeURIComponent(c.id)}` }, `${T('fullPage')} →`))))
    document.body.appendChild(root)
    document.documentElement.classList.add('cg-lock')
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onHash)
    requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.add('in'); closeBtn.focus() }))
  }

  const unread = h('p', { class: 'app-note', hidden: records !== null }, T('statusUnread'))
  const wrap = h('div', { class: 'app-stack cg' },
    h('p', { class: 'app-muted cg-lead-top' }, T('lead')),
    unread,
    h('div', { class: 'cg-toolbar' },
      h('label', { class: 'cg-search' },
        h('span', { class: 'cg-search-ic', 'aria-hidden': 'true' }),
        input, clearBtn),
      h('div', { class: 'cg-filters' },
        chipGroup(T('level'), 'level', [['all', T('all')], ...LEVELS.filter((l) => COURSES.some((c) => c.level === l)).map((l) => [l, levelLabel(l, lang)] as [string, string])]),
        chipGroup(T('topic'), 'topic', [['all', T('all')], ...topics.map((t) => [t, t] as [string, string])]),
        chipGroup(T('status'), 'status', [['all', T('all')], ['open', T('open')], ['mine', T('mine')]]),
        h('label', { class: 'cg-sort-wrap' }, h('span', { class: 'cg-chips-label' }, T('sort')), sortSel))),
    count,
    grid,
  )
  draw()
  const target = openId ? COURSES.find((c) => c.id === openId) : undefined
  if (target) setTimeout(() => openPreview(target), 60)
  return Object.assign(wrap, {
    setRecords: (r: MyCourseRecord[] | null): void => {
      mine = new Set((r ?? []).map((x) => x.courseId))
      pending = false
      unread.hidden = r !== null
      draw()
    },
  })
}
