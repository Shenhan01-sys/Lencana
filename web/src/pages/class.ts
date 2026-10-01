/**
 * `pages/class.ts` — ruang kelas.
 *
 * Cangkangnya (topbar, pohon modul, rail kanan, pager) datang dari cabang FE `dex/lencana-ui`
 * (29 Sep–1 Okt). Pada 1 Okt malam ia di-port ke model konten core (FE7, pilihan builder "Port ke
 * core"). Yang TIDAK ikut di-port dari versi FE, dan kenapa:
 *  - kuis dinilai di browser dengan kunci di bundel → kuis tetap lewat `POST /grade`, dan pembahasan
 *    datang dari balasan server (B72, B80/D56);
 *  - model `ClassData` (isi markdown, jenis `quiz`/`lab`) → model core, yang juga dibaca server lewat
 *    `manifest-keys.ts` dan menjaga `rubricHash` kertas yang sudah terbit;
 *  - "tandai selesai" yang hanya lokal lalu memuat ulang halaman → `POST /progress` bila ada
 *    identitas, dan halaman menyebut mana yang hanya di perangkat (B58/B72);
 *  - rail kanan dengan tautan EIP-55/712 yang sama di setiap lesson → referensi milik lesson itu.
 * Isi lesson dirender templat `lesson-views.ts` (salinan persis dari `lms.ts`) di dalam
 * `.lesson-engine`; yang baru di berkas ini hanya tata letak dan perutean `#/class/…`.
 */

import '../lms.css'
import { h } from '../lib/ui'
import { findCourse, findLesson } from '../courses/index'
import type { Course, Lesson, Module } from '../content'
import { manifestOf, rubricHashOf, shortHash } from '../manifest'
import { courseProgress, recordLesson, summarize, wipeCourse } from '../progress'
import {
  completeLesson, connectWalletLearner, createDeviceLearner, forgetLearner, hasExplicitLearnerSession,
  hasPrivyMark, learnerAddress, resumePrivyLearner, setEndpoint, snapshot, submitEssay, submitQuiz,
  syncCourse,
} from '../learning'
import { DICTIONARIES, getSavedLanguage } from '../i18n'
import { esc } from '../render'
import {
  KIND_LABEL, classLink, completenessLine, essayHtml, idsHtml, learnStatus, lessonLink, meHtml, quizHtml,
  readMyCredentials, renderBlock, serverLine, type QuizReview,
} from '../lesson-views'

type Rerender = () => void

/** Kuis yang baru dinilai server: dipasang di render berikutnya, lalu dilepas. */
let pendingReview: { courseId: string, slug: string, review: QuizReview, resultHtml: string } | null = null
let resumeTried = false

const tr = () => DICTIONARIES[getSavedLanguage()].lmsV2

/** Masuk = sesi peserta yang disengaja (termasuk mode demo FE) atau identitas yang bisa menandatangani. */
function isAuthed (): boolean {
  return hasExplicitLearnerSession() || Boolean(learnerAddress())
}

/** `#/class/<kursus>[/<modul>/<lesson>]` */
export function parseClassRoute (hash: string): { courseId?: string, moduleId?: string, lessonSlug?: string } {
  const seg = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  return { courseId: seg[1], moduleId: seg[2], lessonSlug: seg[3] }
}

function currentLesson (): { course: Course, mod: Module, lesson: Lesson } | undefined {
  const r = parseClassRoute(location.hash)
  const course = findCourse(r.courseId)
  if (!course || !r.lessonSlug) return undefined
  const found = findLesson(course, r.lessonSlug)
  return found ? { course, mod: found.module, lesson: found.lesson } : undefined
}

const minutesOf = (c: Course): number => c.modules.flatMap((m) => m.lessons).reduce((a, l) => a + l.minutes, 0)

/** Rekaman penerbit untuk kursus ini kalau sudah dibaca; null kalau belum — halaman tidak mengarang angka server. */
function serverSummaryFor (courseId: string) {
  const s = snapshot()
  return s.summary && s.courseId === courseId ? s.summary : null
}

/**
 * Baca rekaman penerbit begitu kelas dibuka, sekali per kursus; hasilnya masuk lewat render ulang —
 * berhasil ATAU gagal. (`lms.ts` hanya me-render ulang saat berhasil, jadi kegagalan membekukan kotak
 * di "Menghubungi penerbit…"; ditemukan uji peramban 1 Okt.) Sesudah gagal tidak dicoba ulang sendiri:
 * tombol "Baca/mulai rekaman di penerbit" yang mencoba lagi, supaya halaman tidak berputar.
 */
function kickSync (courseId: string, rerender: Rerender): void {
  if (!learnerAddress()) return
  const s = snapshot()
  if (s.pending || (s.courseId === courseId && (s.summary || s.error))) return
  void syncCourse(courseId).then(() => rerender())
}

/** Gerbang masuk milik FE: materi kelas hanya untuk sesi peserta (keputusan tata letak FE). */
function renderAuthGate (c: Course): HTMLElement {
  const t = tr()
  return h('div', { class: 'class-shell lms-auth-gate' },
    h('div', { class: 'lms-auth-box' },
      h('div', { class: 'lms-auth-icon' }, '🔒'),
      h('h2', { class: 'lms-auth-title' }, t.authGateTitle),
      h('p', { class: 'lms-auth-desc' }, t.authGateDesc.replace('kursus ini', `"${c.title}"`)),
      h('a', { href: '#/login', class: 'btn-editorial btn-editorial-primary lms-auth-btn' }, t.authGateBtnLogin),
      h('a', { href: '#catalog', class: 'btn-editorial btn-editorial-ghost lms-auth-btn mt-2' }, t.authGateBtnBack),
    ),
  )
}

function renderTopBar (c: Course): HTMLElement {
  const t = tr()
  const addr = learnerAddress()
  const short = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : t.topbarGuest
  const remote = serverSummaryFor(c.id)
  const local = summarize(c.id, c.modules.flatMap((m) => m.lessons), c.weights)
  // Dua angka, dua tempat (B58): kalau rekaman penerbit sudah terbaca, itu yang ditampilkan dan disebut.
  const pct = remote ? (remote.lessonsTotal ? Math.round((remote.lessonsCompleted / remote.lessonsTotal) * 100) : 0) : local.pct
  const where = remote ? 'di penerbit' : 'di perangkat ini'
  return h('header', { class: 'class-topbar' },
    h('div', { class: 'lms-topbar-left' },
      h('a', { href: '#catalog', class: 'class-topbar-nav' }, `← ${t.catalogTitle}`),
      h('span', { class: 'lms-topbar-sep' }, '/'),
      h('a', { href: classLink(c.id), class: 'class-topbar-title' }, c.title),
    ),
    h('div', { class: 'lms-topbar-right' },
      h('div', { class: 'lms-topbar-group', title: `Progres ${where}` },
        h('span', { class: 'lms-progress-text' }, `${pct}% ${where}`),
        h('div', { class: 'progress-track' }, h('div', { class: 'progress-fill', style: { width: `${pct}%` } })),
      ),
      h('div', { class: 'lms-topbar-group lms-topbar-user' },
        h('span', { class: 'lms-user-addr' }, short),
        h('a', { href: '#/me', class: 'class-topbar-nav lms-nav-gold' }, t.topbarPortfolio),
      ),
    ),
  )
}

const KIND_ICON: Record<string, string> = { kuis: '○', esai: '✍', praktik: '⚗', kasus: '⚐' }

function renderSidebar (c: Course, activeSlug?: string): HTMLElement {
  const t = tr()
  const cp = courseProgress(c.id)
  const onServer = new Set(serverSummaryFor(c.id)?.completed ?? [])
  return h('aside', { class: 'class-sidebar' },
    h('div', { class: 'class-sidebar-header' },
      h('h3', { class: 'class-sidebar-eyebrow' }, t.sidebarCurriculum),
      h('p', { class: 'class-sidebar-title' }, `${c.modules.length} ${t.sidebarModules}`),
    ),
    h('nav', { class: 'module-tree' },
      ...c.modules.map((m, mi) => {
        const done = m.lessons.filter((l) => onServer.has(l.slug) || cp[l.slug]?.done).length
        return h('div', { class: 'module-group' },
          h('div', { class: 'module-header' },
            h('span', { class: 'module-header-title' }, `${mi + 1}: ${m.title}`),
            h('span', { class: 'module-header-count' }, `${done}/${m.lessons.length}`),
          ),
          h('div', null,
            ...m.lessons.map((l) => {
              const server = onServer.has(l.slug)
              const local = !server && Boolean(cp[l.slug]?.done)
              return h('a', {
                href: classLink(c.id, m.id, l.slug),
                class: `lesson-item ${l.slug === activeSlug ? 'active' : ''} ${server || local ? 'done' : ''}`,
                'aria-current': l.slug === activeSlug ? 'page' : false,
                title: server ? 'tercatat selesai di penerbit' : local ? 'selesai di perangkat ini saja' : KIND_LABEL[l.kind] ?? l.kind,
              },
                h('div', { class: 'lesson-item-left' },
                  h('span', { class: 'lesson-item-icon' }, KIND_ICON[l.kind] ?? '—'),
                  h('span', { class: 'lesson-item-title' }, l.title),
                ),
                h('div', { class: 'lesson-item-right' },
                  server ? h('span', { class: 'lesson-done-mark' }, '✓')
                    : local ? h('span', { class: 'lesson-done-mark' }, '◦')
                      : h('span', { class: 'lesson-item-meta' }, `${l.minutes}m`),
                ),
              )
            }),
          ),
        )
      }),
    ),
  )
}

/** Praktik dinilai chain lewat `POST /praktik` (B121); formulirnya belum ada di halaman (OI-20). */
function praktikNote (lesson: Lesson): string {
  if (!lesson.proof) return ''
  return `<aside class="note"><strong>Nilai praktik datang dari chain</strong>
    <p>Penerbit menilai praktik ini dengan membaca ulang chain ${lesson.proof.chainId} lewat
    <code>POST /praktik</code> (jenis bukti: <code>${esc(lesson.proof.type)}</code>). Formulir penyerahannya
    belum ada di halaman ini — "Tandai selesai" hanya mencatat progres bacaan, bukan nilai praktik.</p></aside>`
}

function renderLesson (c: Course, mod: Module, lesson: Lesson): HTMLElement {
  const t = tr()
  const flat = c.modules.flatMap((m) => m.lessons.map((l) => ({ m, l })))
  const pos = flat.findIndex((x) => x.l.slug === lesson.slug)
  const prev = pos > 0 ? flat[pos - 1] : undefined
  const next = pos >= 0 && pos < flat.length - 1 ? flat[pos + 1] : undefined
  const idx = mod.lessons.findIndex((l) => l.slug === lesson.slug)
  const rec = courseProgress(c.id)[lesson.slug]
  const review = pendingReview && pendingReview.courseId === c.id && pendingReview.slug === lesson.slug ? pendingReview : null

  const engine = `<header class="lesson-head">
      <p class="muted">${esc(mod.title)} · lesson ${idx + 1}/${mod.lessons.length} ·
        ${esc(KIND_LABEL[lesson.kind] ?? lesson.kind)} · ±${lesson.minutes} menit · lesson ${pos + 1} dari ${flat.length}</p>
      <p class="lede">${esc(lesson.summary)}</p>
      ${rec?.done ? '<p class="tag ok">Diselesaikan di perangkat ini</p>' : ''}
      ${typeof rec?.score === 'number' ? `<p class="tag">kuis terakhir: ${rec.score} · percobaan ${rec.attempts}</p>` : ''}
    </header>
    ${lesson.blocks.map(renderBlock).join('')}
    ${lesson.quiz ? quizHtml(lesson, review?.review) : ''}
    ${lesson.essay ? essayHtml(c, lesson) : ''}
    ${praktikNote(lesson)}
    ${lesson.kind === 'kuis' || lesson.kind === 'esai' ? '' : `<div class="actions">
      <button class="primary" data-action="mark-done" data-course="${esc(c.id)}" data-lesson="${esc(lesson.slug)}">Tandai selesai</button>
    </div>`}
    ${serverLine(c.id)}
    <p data-role="learn-status"></p>
    ${idsHtml(c, lesson)}`

  const body = h('div', { class: 'lesson-container' },
    h('div', { class: 'lesson-breadcrumb' },
      h('a', { href: classLink(c.id) }, c.title),
      h('span', null, '/'),
      h('span', null, mod.title),
      h('span', null, '/'),
      h('span', { class: 'current' }, lesson.title),
    ),
    h('h1', { class: 'lesson-title' }, lesson.title),
    h('div', { class: 'lesson-engine prose', dangerouslySetInnerHTML: { __html: engine } }),
    h('footer', { class: 'lesson-footer' },
      prev ? h('a', { href: lessonLink(c, prev.l.slug), class: 'btn-editorial btn-editorial-ghost' }, t.btnPrev) : h('span', null),
      h('div', { class: 'lms-footer-actions' },
        h('a', { href: next ? lessonLink(c, next.l.slug) : '#/me', class: 'btn-editorial btn-editorial-primary' }, next ? t.btnNext : t.btnPortfolio),
      ),
    ),
  )
  // Status penilaian server dipasang lagi karena render ulang mengganti elemennya.
  if (review) {
    const st = body.querySelector('[data-role="quiz-status"]') as HTMLElement | null
    if (st) st.innerHTML = review.resultHtml
    pendingReview = null
  }
  const ta = body.querySelector('#essay-draft') as HTMLTextAreaElement | null
  const wc = body.querySelector('#word-count')
  if (ta && wc) {
    const count = () => { wc.textContent = String(ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0) }
    ta.addEventListener('input', count)
    count()
  }
  return body
}

function renderOverview (c: Course): HTMLElement {
  const t = tr()
  const lessons = c.modules.flatMap((m) => m.lessons)
  const st = summarize(c.id, lessons, c.weights)
  const onServer = new Set(serverSummaryFor(c.id)?.completed ?? [])
  const next = lessons.find((l) => !onServer.has(l.slug) && !courseProgress(c.id)[l.slug]?.done) ?? lessons[0]
  const manifest = manifestOf(c.id)
  const rubricRef = manifest ? shortHash(rubricHashOf(manifest)) : 'tanpa manifest'
  const prereq = c.prereqCourseId ? findCourse(c.prereqCourseId) : undefined
  const engine = `${serverLine(c.id)}
    <p data-role="learn-status" class="muted"></p>
    <details class="learn-disclosure"><summary>Detail penilaian dan kebijakan penerbit</summary>
    ${completenessLine(st, rubricRef)}
    <p class="muted">Bobot: kuis ${c.weights.kuis}% · praktik ${c.weights.praktik}% ·
      esai ${c.weights.esai}%. Ambang lulus ${c.passMark}/100.
      Kredensial berlaku ${c.validDays} hari sejak diterbitkan.</p>
    ${c.prereqCourseId ? `<aside class="note"><strong>Prasyarat</strong>
      <p>Kredensial "${esc(c.prereqCourseId)}" harus sudah kamu punya. Di chain ini prasyarat
      ditegakkan kontrak: kredensial yang prasyaratnya sudah dicabut, kedaluwarsa, atau bukan
      milikmu akan DITOLAK saat penerbitan — bukan diam-diam diterima lalu diam-diam mati.</p></aside>` : ''}
    </details>`
  return h('div', { class: 'lesson-container' },
    h('div', { class: 'lms-overview-header' },
      h('div', { class: 'lms-overview-eyebrow' }, `${c.level} · ~${minutesOf(c)} ${t.tagMinutes}`),
      h('h1', { class: 'lesson-title' }, c.title),
      h('p', { class: 'lms-overview-desc' }, c.blurb),
      h('p', { class: 'lms-text-muted' }, `Oleh ${c.institution} · ${c.modules.length} modul · ${lessons.length} lesson`),
    ),
    h('div', { class: 'lms-overview-grid' },
      h('div', null,
        h('h3', { class: 'lms-overview-section-title' }, t.overviewOutcomes),
        h('ul', { class: 'lms-list' },
          ...c.outcome.map((o) => h('li', { class: 'lms-list-item' },
            h('span', { class: 'lms-list-bullet' }, '—'),
            h('span', { class: 'lms-list-text' }, o),
          )),
        ),
      ),
      h('div', null,
        h('h3', { class: 'lms-overview-section-title' }, t.overviewPrereq),
        prereq
          ? h('ul', { class: 'lms-list' }, h('li', { class: 'lms-list-item' },
              h('span', { class: 'lms-list-bullet' }, '—'),
              h('a', { href: classLink(prereq.id) }, prereq.title),
            ))
          : h('p', { class: 'lms-text-muted' }, t.overviewNone),
        h('h3', { class: 'lms-overview-section-title mt-top' }, t.overviewCriteria),
        h('p', { class: 'lms-text-muted' }, c.criteria),
      ),
    ),
    h('div', { class: 'lesson-engine', dangerouslySetInnerHTML: { __html: engine } }),
    next ? h('div', { class: 'lms-overview-action' },
      h('a', { href: lessonLink(c, next.slug), class: 'btn-editorial btn-editorial-primary btn-large' }, st.doneLessons ? 'Lanjutkan belajar ➔' : t.btnStartModule),
    ) : null,
  )
}

/** Rail kanan: judul bagian dan referensi milik lesson ini (bukan daftar tetap yang sama di semua lesson). */
function renderRail (lesson: Lesson): HTMLElement {
  const t = tr()
  const heads = lesson.blocks.flatMap((b) => (b.t === 'h' ? [b.text] : []))
  const links = lesson.blocks.flatMap((b) => (b.t === 'links' ? b.items : []))
  return h('aside', { class: 'class-rail' },
    heads.length ? h('div', { class: 'lms-rail-block' },
      h('h4', { class: 'rail-heading' }, t.railTitle),
      h('nav', null, ...heads.map((x) => h('span', { class: 'rail-link' }, x))),
    ) : null,
    h('div', { class: 'lms-rail-block' },
      h('h4', { class: 'rail-heading' }, t.railRefs),
      links.length
        ? h('nav', null, ...links.map((i) => h('a', { href: i.url, target: '_blank', rel: 'noopener noreferrer', class: 'rail-link lms-ext-link' }, `↗ ${i.label}`)))
        : h('p', { class: 'lms-text-muted' }, 'Lesson ini tidak menautkan referensi luar.'),
    ),
  )
}

export function renderClass (routeHash: string, rerender: Rerender): HTMLElement {
  const t = tr()
  const r = parseClassRoute(routeHash)
  const c = findCourse(r.courseId)
  if (!c) {
    return h('div', { class: 'lms-not-found' },
      h('h2', { class: 'lms-not-found-title' }, t.notFound),
      h('a', { href: '#catalog', class: 'lms-not-found-link' }, t.notFoundLink),
    )
  }
  // Tab baru di peramban yang sudah login email: pulihkan sekali per muat halaman (B82).
  if (!resumeTried && !learnerAddress() && hasPrivyMark()) {
    resumeTried = true
    void resumePrivyLearner().then(() => rerender())
  }
  if (!isAuthed()) return renderAuthGate(c)
  kickSync(c.id, rerender)

  let main: HTMLElement
  let lesson: Lesson | undefined
  const found = r.lessonSlug ? findLesson(c, r.lessonSlug) : undefined
  if (r.lessonSlug && found) {
    lesson = found.lesson
    main = renderLesson(c, found.module, found.lesson)
  } else if (r.lessonSlug) {
    main = h('div', { class: 'lms-not-found' }, t.notFound)
  } else {
    main = renderOverview(c)
  }
  return h('div', { class: 'class-shell' },
    renderTopBar(c),
    h('div', { class: 'lms-layout-core' },
      renderSidebar(c, lesson?.slug),
      h('main', { class: 'class-main' }, main),
      lesson ? renderRail(lesson) : null,
    ),
  )
}

/** `#/me`: catatan belajar + rekaman penerbit + kredensial dibaca dari chain (dulu `pageMe` di `lms.ts`). */
export function renderMe (): HTMLElement {
  return h('div', { class: 'lesson-container lesson-engine', dangerouslySetInnerHTML: { __html: meHtml() } })
}

/**
 * Aksi halaman belajar — dipindah dari `bindLms` (`lms.ts`) dengan perilaku yang sama: identitas,
 * baca rekaman penerbit, tandai selesai lewat `POST /progress`, kuis lewat `POST /grade`, esai lewat
 * `POST /essay`, hapus catatan lokal, baca kredensial dari chain. Dipasang sekali di wadah `new-app`.
 */
export function bindLearningActions (root: HTMLElement, rerender: Rerender): void {
  root.addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest?.('[data-action]') as HTMLElement | null
    if (!btn) return
    const action = btn.dataset.action
    // Kursus dibaca dari rute yang sedang terbuka kalau ada: tombol kuis di templat tidak membawa
    // `data-course`, dan sejak `lms.ts` kuis jadi terkirim dengan kursus kosong — server menolak
    // (`course "" is not in the publisher catalogue`). Tidak pernah kelihatan karena preflight CORS
    // sudah menggagalkan semua tulisan lebih dulu (B122); ditemukan uji peramban 1 Okt.
    const courseId = currentLesson()?.course.id ?? btn.dataset.course ?? ''
    const slug = btn.dataset.lesson ?? ''
    const status = (role: string) => root.querySelector(`[data-role="${role}"]`) as HTMLElement | null
    const endpointInput = () => root.querySelector('[data-role="signer-endpoint"]') as HTMLInputElement | null

    if (action === 'learner-device') {
      const id = createDeviceLearner()
      if (!id) {
        learnStatus(root, 'Peramban ini menolak penyimpanan sesi (mode privat?), jadi kunci perangkat tidak bisa dibuat. Pakai dompet Web3.', true)
        return
      }
      learnStatus(root, `Identitas perangkat dibuat: ${id.address.slice(0, 10)}… — kunci ini hangus bersama tab, bukan identitas tahan lama.`)
      if (courseId) await syncCourse(courseId)
      rerender()
      return
    }

    if (action === 'learner-privy') {
      window.dispatchEvent(new CustomEvent('lencana:open-privy', { detail: { courseId } }))
      return
    }

    if (action === 'learner-wallet') {
      const r = await connectWalletLearner()
      if (!r.ok) { learnStatus(root, r.why ?? 'dompet menolak', true); return }
      if (courseId) await syncCourse(courseId)
      rerender()
      return
    }

    if (action === 'learner-forget') {
      const ep = endpointInput()
      forgetLearner()
      if (ep?.value) setEndpoint(ep.value)
      rerender()
      return
    }

    if (action === 'learn-sync') {
      const ep = endpointInput()
      if (ep?.value) setEndpoint(ep.value)
      if (!courseId) return
      learnStatus(root, 'Menghubungi penerbit…')
      const sum = await syncCourse(courseId)
      rerender()
      learnStatus(root, sum ? `Rekaman terbaca: ${sum.lessonsCompleted}/${sum.lessonsTotal} lesson, ${sum.gradedAttempts} usaha dinilai.`
        : snapshot().error ?? 'Penerbit tidak menjawab.', !sum)
      return
    }

    if (action === 'mark-done') {
      const cur = currentLesson()
      if (!cur) return
      const flat = cur.course.modules.flatMap((m) => m.lessons)
      recordLesson(courseId, slug, cur.lesson.kind, { done: true })
      // Cache lokal dulu (halaman tidak boleh buta saat jaringan mati), lalu state yang sebenarnya
      // dibaca penerbit. Kalau yang kedua gagal, pesertanya harus tahu.
      let message = 'Selesai di perangkat ini saja. Hubungkan identitas agar rekaman tersimpan di penerbit.'
      let failed = false
      if (learnerAddress()) {
        learnStatus(root, 'Mencatat ke penerbit…')
        const r = await completeLesson(courseId, slug, flat.findIndex((l) => l.slug === slug))
        message = r.ok ? 'Lesson tercatat di penerbit.' : `Di perangkat tercatat, tetapi di penerbit belum: ${r.why ?? 'tidak diketahui'}`
        failed = !r.ok
      }
      rerender()
      learnStatus(root, message, failed)
      return
    }

    if (action === 'grade') {
      const cur = currentLesson()
      if (!cur || !cur.lesson.quiz) return
      const q = cur.lesson.quiz
      const picks: { itemId: string, choice: number }[] = []
      for (const item of q.questions) {
        const picked = root.querySelector(`input[name="${item.id}"]:checked`) as HTMLInputElement | null
        if (picked) picks.push({ itemId: item.id, choice: Number(picked.value) })
      }
      const s = status('quiz-status')
      if (picks.length < q.questions.length) {
        if (s) s.innerHTML = `<span class="bad">${picks.length}/${q.questions.length} soal dijawab — server menolak sebagian, jadi jawab dulu semuanya.</span>`
        return
      }
      if (!learnerAddress()) {
        if (s) s.innerHTML = '<span class="bad">Belum ada identitas peserta: tanpa tanda tangan, tidak ada nilai yang bisa dicatat di penerbit. Buat identitas di kotak "Rekaman belajar" lebih dulu.</span>'
        return
      }
      const ep = endpointInput()
      if (ep?.value) setEndpoint(ep.value)
      const graded = await submitQuiz(courseId, slug, picks)
      if (!graded) {
        // Angka browser TIDAK dipakai sebagai pengganti — itu persis yang dihapus (peserta menilai dirinya sendiri).
        if (s) s.innerHTML = `<span class="bad">Penerbit tidak menilai: ${esc(snapshot().error ?? 'tidak menjawab')} — tidak ada angka yang kami karang sendiri.</span>`
        return
      }
      // Cache lokal hanya salinan dari angka SERVER (graded.score), bukan hitungan browser.
      const prev = courseProgress(courseId)[slug]
      const best = Math.max(graded.score, prev?.score ?? 0)
      recordLesson(courseId, slug, 'kuis', { done: graded.verdict === 'pass', score: best, attempts: (prev?.attempts ?? 0) + 1 })
      const resultHtml = `<span class="${graded.verdict === 'pass' ? 'ok' : 'bad'}">Dinilai penerbit: ${graded.correct}/${graded.total} benar = ${graded.score} · terbaik ${best} · ambang ${graded.passPct} · ${
          graded.verdict === 'pass' ? 'cukup' : 'belum cukup, baca lagi alasannya lalu ulangi'
        }<br><span class="muted">Usaha ini tercatat di penerbit · referensi <code>${esc(graded.attemptHash.slice(0, 18))}…</code></span></span>`
      // Pembahasan dipasang lewat render: pilihan peserta tetap terpilih, benar/salah + alasan dari balasan server (B80).
      pendingReview = { courseId, slug, review: { picks: new Map(picks.map((p) => [p.itemId, p.choice])), items: graded.review }, resultHtml }
      rerender()
      return
    }

    if (action === 'save-draft') {
      const ta = root.querySelector('#essay-draft') as HTMLTextAreaElement | null
      if (!ta || !currentLesson()) return
      recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
      const s = status('essay-status')
      if (s) s.textContent = 'Draf disimpan di perangkat ini.'
      return
    }

    if (action === 'finish-essay') {
      const ta = root.querySelector('#essay-draft') as HTMLTextAreaElement | null
      if (!ta || !currentLesson()) return
      const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0
      const min = Number(btn.dataset.min ?? 0)
      const s = status('essay-status')
      if (words < min) {
        if (s) s.innerHTML = `<span class="bad">Baru ${words} kata, syarat ${min}. Batas ini ada supaya jawabannya tidak selesai dalam tiga kalimat.</span>`
        return
      }
      // B81: karangan DISERAHKAN ke penerbit; balasannya tanpa angka (`awaiting_judge`) — antrean, bukan kelulusan.
      if (learnerAddress()) {
        const ep = endpointInput()
        if (ep?.value) setEndpoint(ep.value)
        if (s) s.innerHTML = '<span class="muted">Mengirim karangan ke penerbit…</span>'
        const rec = await submitEssay(courseId, slug, ta.value)
        if (rec) {
          recordLesson(courseId, slug, 'esai', { done: true, draft: ta.value })
          rerender()
          const visible = status('essay-status')
          if (visible) visible.innerHTML = `<span class="ok">Terkirim ke penerbit</span> ${rec.mechanicalPassed}/${rec.mechanicalTotal} tanda mekanis terpenuhi · ${rec.words} kata · <code>${esc(rec.attemptHash.slice(0, 14))}…</code><br><span class="muted">${esc(rec.note || 'Menunggu penilaian penerbit — belum ada angka, dan itu bukan nol.')}</span>`
          return
        }
        const why = snapshot().error ?? 'penerbit tidak menjawab'
        if (s) s.innerHTML = `<span class="bad">Karangan TIDAK sampai ke penerbit: ${esc(why)}</span><br><span class="muted">Drafmu tetap disimpan di perangkat ini; tanpa baris penyerahan, tidak ada yang bisa dinilai — dan tidak ada angka yang kami karang sendiri.</span>`
        recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
        return
      }
      recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
      if (s) s.textContent = 'Dicatat di perangkat ini saja: belum ada identitas peserta, jadi karangan tidak diserahkan ke penerbit dan tidak akan ikut dinilai.'
      return
    }

    if (action === 'wipe') {
      const course = findCourse(courseId)
      if (!window.confirm(`Hapus catatan belajar lokal untuk ${course?.title ?? 'kursus ini'}? Rekaman di penerbit dan kredensial di chain tidak ikut terhapus.`)) return
      wipeCourse(courseId)
      rerender()
      return
    }

    if (action === 'read-me') {
      const input = root.querySelector('#me-address') as HTMLInputElement | null
      const out = status('me-out')
      const s = status('me-status')
      if (!input || !out) return
      out.innerHTML = ''
      if (s) s.textContent = 'Membaca chain…'
      out.innerHTML = await readMyCredentials(input.value.trim())
      if (s) s.textContent = ''
    }
  })
}
