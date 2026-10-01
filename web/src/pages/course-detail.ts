/**
 * `course-detail.ts` — halaman detail kursus PUBLIK `#/course/<id>` (RF7 langkah A2, B124).
 *
 * Orang yang belum masuk boleh melihat apa yang akan ia pelajari dan apa yang dibuktikan kredensialnya — silabus,
 * penerbit, aturan penilaian — tetapi isi kelasnya tetap di balik akun. Harga dan pembayaran menyusul di langkah B
 * (RF5): halaman ini sengaja tidak menyebut harga apa pun sampai jalur bayarnya ada.
 */
import './dashboard.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { findCourse } from '../courses/index'
import { manifestOf, rubricHashOf, shortHash } from '../manifest'
import { hasExplicitLearnerSession } from '../learning'
import { KIND_LABEL, classLink } from '../lesson-views'
import { openLogin } from './login'

type Lang = 'en' | 'id'
const COPY = {
  notFound: { en: 'This course is not in the catalogue.', id: 'Kursus ini tidak ada di katalog.' },
  back: { en: 'Back to the catalogue', id: 'Kembali ke katalog' },
  by: { en: 'Published by', id: 'Diterbitkan oleh' },
  modules: { en: 'modules', id: 'modul' },
  lessons: { en: 'lessons', id: 'lesson' },
  minutes: { en: 'minutes', id: 'menit' },
  start: { en: 'Start learning', id: 'Mulai belajar' },
  enroll: { en: 'Enroll', id: 'Daftar' },
  enrollNote: { en: 'Sign in with your account to open the class.', id: 'Masuk dengan akunmu untuk membuka kelasnya.' },
  outcome: { en: 'What you will be able to do', id: 'Yang akan kamu kuasai' },
  audience: { en: 'Who it is for', id: 'Untuk siapa' },
  syllabus: { en: 'Syllabus', id: 'Silabus' },
  proof: { en: 'What the credential proves', id: 'Apa yang dibuktikan kredensialnya' },
  weights: { en: 'Final score weights', id: 'Bobot nilai akhir' },
  pass: { en: 'Pass mark', id: 'Ambang lulus' },
  valid: { en: 'Valid for', id: 'Berlaku' },
  days: { en: 'days', id: 'hari' },
  rubric: { en: 'Grading rules locked in rubricHash', id: 'Aturan penilaian dikunci di rubricHash' },
  rubricNote: {
    en: 'Quizzes and their keys, the essay rubric, the weights and the pass mark are hashed together; the publisher cannot change them quietly, and every credential prints this hash.',
    id: 'Kuis beserta kuncinya, rubrik esai, bobot, dan ambang lulus di-hash bersama; penerbit tidak bisa menggantinya diam-diam, dan setiap kredensial mencetak hash ini.',
  },
  prereq: { en: 'Prerequisite', id: 'Prasyarat' },
  quiz: { en: 'quiz', id: 'kuis' },
  essay: { en: 'essay', id: 'esai' },
  practice: { en: 'practice', id: 'praktik' },
} satisfies Record<string, Record<Lang, string>>

export function renderCourseDetail (courseId: string): HTMLElement {
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const course = findCourse(courseId)
  if (!course) {
    return h('div', { class: 'course-detail' },
      h('p', { class: 'cd-empty' }, T('notFound')),
      h('a', { class: 'cd-link', href: '#catalog' }, `← ${T('back')}`))
  }
  const manifest = manifestOf(course.id)
  const lessons = course.modules.flatMap((m) => m.lessons)
  const minutes = lessons.reduce((n, l) => n + (l.minutes || 0), 0)
  const signedIn = hasExplicitLearnerSession()
  const prereq = course.prereqCourseId ? findCourse(course.prereqCourseId) : undefined

  const cta = signedIn
    ? h('a', { class: 'cd-cta', href: classLink(course.id) }, T('start'))
    : h('button', {
      type: 'button',
      class: 'cd-cta',
      onClick: () => {
        try { sessionStorage.setItem('lencana_enroll_target', course.id) } catch { /* tanpa storage: kembali ke dashboard */ }
        openLogin()
      },
    }, T('enroll'))

  return h('div', { class: 'course-detail' },
    h('a', { class: 'cd-link', href: '#catalog' }, `← ${T('back')}`),
    h('header', { class: 'cd-hero' },
      h('div', { class: 'cd-hero-text' },
        h('span', { class: 'cd-level' }, course.level),
        h('h1', { class: 'cd-title' }, course.title),
        h('p', { class: 'cd-blurb' }, course.blurb),
        h('p', { class: 'cd-by' }, `${T('by')} `, h('strong', null, manifest?.issuer.name ?? course.institution)),
        h('div', { class: 'cd-stats' },
          h('span', null, h('b', null, String(course.modules.length)), ` ${T('modules')}`),
          h('span', null, h('b', null, String(lessons.length)), ` ${T('lessons')}`),
          h('span', null, h('b', null, String(minutes)), ` ${T('minutes')}`),
        ),
      ),
      h('div', { class: 'cd-cta-box' },
        cta,
        signedIn ? null : h('p', { class: 'cd-cta-note' }, T('enrollNote')),
        prereq ? h('p', { class: 'cd-cta-note' }, `${T('prereq')}: `, h('a', { href: `#/course/${encodeURIComponent(prereq.id)}` }, prereq.title)) : null,
      ),
    ),
    h('div', { class: 'cd-grid' },
      h('section', { class: 'cd-card' },
        h('h2', null, T('outcome')),
        h('ul', { class: 'cd-list' }, ...course.outcome.map((o) => h('li', null, o))),
      ),
      h('section', { class: 'cd-card' },
        h('h2', null, T('audience')),
        h('ul', { class: 'cd-list' }, ...course.audience.map((a) => h('li', null, a))),
      ),
    ),
    h('section', { class: 'cd-card cd-syllabus' },
      h('h2', null, T('syllabus')),
      ...course.modules.map((m, mi) => h('div', { class: 'cd-module' },
        h('div', { class: 'cd-module-head' },
          h('span', { class: 'cd-module-no' }, String(mi + 1).padStart(2, '0')),
          h('div', null, h('h3', null, m.title), h('p', null, m.blurb)),
        ),
        h('ol', { class: 'cd-lessons' }, ...m.lessons.map((l) => h('li', null,
          h('span', { class: 'cd-lesson-title' }, l.title),
          h('span', { class: `cd-kind cd-kind-${l.kind}` }, KIND_LABEL[l.kind] ?? l.kind),
          h('span', { class: 'cd-min' }, `${l.minutes} ${T('minutes')}`),
        ))),
      )),
    ),
    h('section', { class: 'cd-card cd-proof' },
      h('h2', null, T('proof')),
      h('p', null, course.criteria),
      h('dl', { class: 'cd-facts' },
        h('div', null, h('dt', null, T('weights')),
          h('dd', null, `${T('quiz')} ${course.weights.kuis}% · ${T('essay')} ${course.weights.esai}% · ${T('practice')} ${course.weights.praktik}%`)),
        h('div', null, h('dt', null, T('pass')), h('dd', null, String(course.passMark))),
        h('div', null, h('dt', null, T('valid')), h('dd', null, `${course.validDays} ${T('days')}`)),
        manifest ? h('div', null, h('dt', null, T('rubric')), h('dd', null, h('code', null, shortHash(rubricHashOf(manifest))))) : null,
      ),
      h('p', { class: 'cd-muted' }, T('rubricNote')),
    ),
  )
}
