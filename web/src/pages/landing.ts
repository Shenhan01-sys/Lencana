/**
 * `pages/landing.ts` — beranda + katalog. Tata letak dari cabang FE `dex/lencana-ui`; 1 Okt malam
 * di-port ke model konten core (FE7): kartu membaca `blurb`, `level`, `prereqCourseId`, dan menit dari
 * lesson kursus core — bukan dari model `ClassData` cabang itu. Tautan "kode sumber" menunjuk repo
 * proyek, bukan halaman depan GitHub.
 */
import { h } from '../lib/ui'
import { COURSES, findCourse } from '../courses/index'
import type { Course } from '../content'
import { getSavedLanguage, DICTIONARIES } from '../i18n'
import { classLink } from '../lesson-views'

const REPO_URL = 'https://github.com/Shenhan01-sys/Lencana'

function getCourseImage (id: string): string {
  if (id.includes('security') || id.includes('lanjut')) return '/course-security.jpg'
  if (id.includes('dasar')) return '/course-web3.jpg'
  return '/hero.jpg'
}

function renderCourseCard (c: Course, index: number): HTMLElement {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2
  const lessons = c.modules.flatMap((m) => m.lessons)
  const minutes = lessons.reduce((a, l) => a + l.minutes, 0)
  const prereq = c.prereqCourseId ? findCourse(c.prereqCourseId) : undefined

  return h('a', {
    href: classLink(c.id),
    class: `course-card-editorial ${index === 0 ? 'course-card-large' : ''}`,
  },
    h('div', { class: 'course-card-image-wrap' },
      h('img', { src: getCourseImage(c.id), alt: c.title, class: 'course-card-image' }),
    ),
    h('div', { class: 'course-card-content' },
      h('div', { class: 'course-card-meta' },
        h('span', { class: 'course-card-tag' }, c.level),
        prereq ? h('span', { class: 'text-xs text-gray-500 font-mono flex items-center gap-1', title: `Prasyarat: ${prereq.title}` }, `🔒 ${t.tagPrereq}`) : null,
      ),
      h('h3', { class: 'course-card-title' }, c.title),
      h('p', { class: 'course-card-desc' }, c.blurb),
      h('div', { class: 'course-card-footer' },
        h('span', null, `${minutes} ${t.tagMinutes}`),
        h('span', null, `${c.modules.length} ${t.tagModules} · ${lessons.length} ${t.tagLessons}`),
      ),
    ),
  )
}

export function renderLanding (): HTMLElement {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2

  return h('div', { class: 'landing-shell' },
    h('section', { class: 'hero-editorial-section' },
      h('div', { class: 'hero-editorial-grid' },
        h('div', { class: 'hero-editorial-content' },
          h('span', { class: 'hero-editorial-eyebrow' }, t.heroEyebrow),
          h('h1', { class: 'hero-editorial-title' }, t.heroTitle),
          h('p', { class: 'hero-editorial-desc' }, t.heroDesc),
          h('div', { class: 'hero-editorial-actions' },
            h('a', { href: '#catalog', class: 'btn-editorial btn-editorial-primary' }, t.btnCurriculum),
            h('a', { href: '#/verify', class: 'btn-editorial btn-editorial-secondary' }, t.btnVerify),
          ),
        ),
        h('div', { class: 'hero-editorial-visual' },
          h('div', { class: 'hero-image-wrapper' },
            h('img', { src: '/hero.jpg', alt: 'Abstract Soulbound Token', class: 'hero-image' }),
            h('div', { class: 'hero-image-overlay' }),
          ),
        ),
      ),
    ),

    h('section', { id: 'catalog', class: 'catalog-editorial' },
      h('div', { class: 'catalog-header' },
        h('h2', { class: 'catalog-header-title' }, t.catalogTitle),
        h('p', { class: 'catalog-header-desc' }, t.catalogDesc),
      ),
      h('div', { class: 'catalog-bento-grid' }, ...COURSES.map((c, i) => renderCourseCard(c, i))),
    ),

    h('section', { class: 'how-it-works-section' },
      h('div', { class: 'how-it-works-grid' },
        h('div', { class: 'how-it-works-sticky' },
          h('h2', { class: 'how-it-works-title' }, t.stepsTitle),
          h('p', { class: 'how-it-works-subtitle' }, t.stepsDesc),
        ),
        h('div', { class: 'how-it-works-steps' },
          ...[[t.step1Title, t.step1Desc], [t.step2Title, t.step2Desc], [t.step3Title, t.step3Desc]].map(([title, desc], i) =>
            h('div', { class: 'how-it-works-step' },
              h('span', { class: 'step-number' }, `0${i + 1}`),
              h('div', { class: 'step-content' }, h('h3', null, title), h('p', null, desc)),
            )),
        ),
      ),
    ),

    h('section', { class: 'trust-section' },
      h('div', { class: 'trust-box' },
        h('h3', { class: 'trust-title' }, t.trustTitle),
        h('p', { class: 'trust-desc' }, t.trustDesc),
        h('div', { class: 'trust-links' },
          h('a', { href: '#/agent-hub' }, `→ ${t.linkTrust}`),
          h('a', { href: REPO_URL, target: '_blank', rel: 'noopener noreferrer' }, `→ ${t.linkSource}`),
        ),
      ),
    ),
  )
}
