import { h } from '../lib/ui';
import { COURSES } from '../courses/index';
import type { ClassData } from '../content';
import { getSavedLanguage, DICTIONARIES } from '../i18n';

function getCourseImage(id: string) {
  if (id.includes('security') || id.includes('lanjut')) return '/course-security.jpg';
  if (id.includes('dasar')) return '/course-web3.jpg';
  return '/hero.jpg'; // fallback
}

function renderCourseCard(c: ClassData, index: number) {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2;
  const lessonCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const isLarge = index === 0;
  
  return h('a', { 
    href: `#/class/${c.id}`, 
    class: `course-card-editorial ${isLarge ? 'course-card-large' : ''}`
  },
    h('div', { class: 'course-card-image-wrap' },
      h('img', { src: getCourseImage(c.id), alt: c.title, class: 'course-card-image' })
    ),
    h('div', { class: 'course-card-content' },
      h('div', { class: 'course-card-meta' },
        h('span', { class: 'course-card-tag' }, c.level),
        c.prerequisites.length > 0 ? h('span', { class: 'text-xs text-gray-500 font-mono flex items-center gap-1' }, `🔒 ${t.tagPrereq}`) : null
      ),
      h('h3', { class: 'course-card-title' }, c.title),
      h('p', { class: 'course-card-desc' }, c.subtitle),
      h('div', { class: 'course-card-footer' },
        h('span', null, `${c.duration} ${t.tagMinutes}`),
        h('span', null, `${c.modules.length} ${t.tagModules} · ${lessonCount} ${t.tagLessons}`)
      )
    )
  );
}

export function renderLanding() {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2;

  return h('div', { class: 'landing-shell' },
    // 1. Ultra-Premium Asymmetric Hero
    h('section', { class: 'hero-editorial-section' },
      h('div', { class: 'hero-editorial-grid' },
        h('div', { class: 'hero-editorial-content' },
          h('span', { class: 'hero-editorial-eyebrow' }, t.heroEyebrow),
          h('h1', { class: 'hero-editorial-title' }, t.heroTitle),
          h('p', { class: 'hero-editorial-desc' }, t.heroDesc),
          h('div', { class: 'hero-editorial-actions' },
            h('a', { href: '#catalog', class: 'btn-editorial btn-editorial-primary' }, t.btnCurriculum),
            h('a', { href: '#/verify', class: 'btn-editorial btn-editorial-secondary' }, t.btnVerify)
          )
        ),
        h('div', { class: 'hero-editorial-visual' },
          h('div', { class: 'hero-image-wrapper' },
            h('img', { src: '/hero.jpg', alt: 'Abstract Soulbound Token', class: 'hero-image' }),
            h('div', { class: 'hero-image-overlay' })
          )
        )
      )
    ),
    
    // 2. Asymmetric Course Catalog Grid
    h('section', { id: 'catalog', class: 'catalog-editorial' },
      h('div', { class: 'catalog-header' },
        h('h2', { class: 'catalog-header-title' }, t.catalogTitle),
        h('p', { class: 'catalog-header-desc' }, t.catalogDesc)
      ),
      h('div', { class: 'catalog-bento-grid' },
        ...COURSES.map((c, i) => renderCourseCard(c, i))
      )
    ),

    // 3. How it works (Minimalist split text)
    h('section', { class: 'how-it-works-section' },
      h('div', { class: 'how-it-works-grid' },
        h('div', { class: 'how-it-works-sticky' },
          h('h2', { class: 'how-it-works-title' }, t.stepsTitle),
          h('p', { class: 'how-it-works-subtitle' }, t.stepsDesc)
        ),
        h('div', { class: 'how-it-works-steps' },
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '01'),
            h('div', { class: 'step-content' },
              h('h3', null, t.step1Title),
              h('p', null, t.step1Desc)
            )
          ),
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '02'),
            h('div', { class: 'step-content' },
              h('h3', null, t.step2Title),
              h('p', null, t.step2Desc)
            )
          ),
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '03'),
            h('div', { class: 'step-content' },
              h('h3', null, t.step3Title),
              h('p', null, t.step3Desc)
            )
          )
        )
      )
    ),

    // 4. Real sample credential & Trust Limits
    h('section', { class: 'trust-section' },
      h('div', { class: 'trust-box' },
        h('h3', { class: 'trust-title' }, t.trustTitle),
        h('p', { class: 'trust-desc' }, t.trustDesc),
        h('div', { class: 'trust-links' },
          h('a', { href: '#/agent-hub' }, `→ ${t.linkTrust}`),
          h('a', { href: 'https://github.com', target: '_blank' }, `→ ${t.linkSource}`)
        )
      )
    )
  );
}
