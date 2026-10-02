/**
 * `pages/landing.ts` — beranda + katalog. Tata letak dari cabang FE `dex/lencana-ui`; 1 Okt malam
 * di-port ke model konten core (FE7): kartu membaca `blurb`, `level`, `prereqCourseId`, dan menit dari
 * lesson kursus core — bukan dari model `ClassData` cabang itu. Tautan "kode sumber" menunjuk repo
 * proyek, bukan halaman depan GitHub.
 *
 * 2 Okt (permintaan builder): gambar di kanan hero diganti kartu kredensial "LENCANA" dari beranda
 * sebelumnya (`proof-plate`, commit `6f2c4cb`, 26 Sep) — markup dan kelas CSS-nya sama, gerak miringnya
 * dipindah dari `initHeroCardTilt` di `main.ts` (yang terikat ke hero lama). Isinya bukan contoh karangan:
 * kartu menunjuk kredensial `SAMPLE_HASHES.valid` milik verifier (dijaga `npm run check:samples`).
 */
import { h } from '../lib/ui'
import { LISTED_COURSES, findCourse } from '../courses/index'
import type { Course } from '../content'
import { getSavedLanguage, DICTIONARIES } from '../i18n'
import { verifyLink } from '../lesson-views'
import { renderFlow3D } from './flow3d'
import { PAY_TOKEN_SYMBOL, formatLdc, priceOf } from '../pricing'
import { emblem, topicColor } from '../lib/emblem'

const REPO_URL = 'https://github.com/Shenhan01-sys/Lencana'
/** Logo resmi (Logo-Fix1 dari builder, 2 Okt) — JPEG berlatar putih, jadi selalu ditaruh di ubin terang. */
const LOGO_URL = '/lencana-logo.jpg'

/**
 * Kredensial yang dipamerkan kartu hero. Diisi `main.ts` dari `SAMPLE_HASHES.valid` — satu sumber yang
 * diadili `check:samples` (terbit di tepi DAN berlaku di chain), jadi label "VERIFIED" di kartu tidak bisa
 * basi diam-diam. Kursus dan nilai di kartu adalah isi dokumen kredensial itu di tepi, dibaca 2 Okt:
 * "Web3 Dasar untuk Praktisi", nilai 92 — ganti keduanya bersama hash-nya.
 */
let heroCredential = ''
export function setHeroCredential (credentialHash: string): void { heroCredential = credentialHash }

/** Kartu kredensial "LENCANA" (`proof-plate`) — markup yang sama dengan beranda 26 Sep supaya CSS-nya berlaku. */
function renderProofCard (): HTMLElement {
  const hash = heroCredential
  const short = hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : '—'
  return h('figure', { class: 'proof-stage', 'aria-label': 'Interactive Lencana credential' },
    h('div', { class: 'proof-plate-wrap' },
      h('article', { class: 'proof-plate' },
        h('span', { class: 'proof-rim', 'aria-hidden': 'true' }),
        ...['a', 'b', 'c', 'd'].map((x) => h('span', { class: `proof-rivet rivet-${x}`, 'aria-hidden': 'true' })),
        h('div', { class: 'proof-plate-grid' },
          h('div', { class: 'proof-identity' },
            h('span', { class: 'proof-micro' }, 'VERIFIABLE LEARNING CREDENTIAL'),
            h('strong', { class: 'proof-plate-brand' }, 'LENCANA'),
            h('span', { class: 'proof-course' }, 'WEB3 DASAR · 2026'),
            h('span', { class: 'proof-serial' }, `HASH ${short}`),
          ),
          h('div', { class: 'proof-status-list' },
            h('div', { class: 'proof-status-row' }, h('span', null, '01 · COURSE'), h('strong', null, 'COMPLETED')),
            h('div', { class: 'proof-status-row' }, h('span', null, '02 · FINAL SCORE'), h('strong', { class: 'gold' }, '92 / 100')),
            h('a', {
              class: 'proof-status-row proof-status-button',
              href: hash ? verifyLink(hash) : '#/verify',
              title: 'Verify this credential on chain',
            }, h('span', null, '03 · PUBLIC PROOF'), h('strong', { class: 'verified' }, h('i', null), ' VERIFIED · LOCKED')),
          ),
        ),
        // Segel kartu memuat logo resmi Lencana (2 Okt), menggantikan tanda ✕ bawaan.
        h('div', { class: 'proof-seal proof-seal--logo', 'aria-hidden': 'true' },
          h('img', { class: 'proof-seal-logo', src: LOGO_URL, alt: '' }),
        ),
        h('div', { class: 'proof-plate-foot' }, 'SOULBOUND / PUBLIC PROOF / OPEN BADGES 3.0'),
      ),
    ),
    h('figcaption', null, 'MOVE TO INSPECT · SELECT A PROOF TO VERIFY'),
  )
}

/**
 * Kartu miring mengikuti kursor (dipindah dari `initHeroCardTilt`, `main.ts`): easing lewat rAF, kembali
 * ke posisi diam saat kursor keluar; tidak bergerak untuk reduced-motion dan layar sentuh. Dipasang ulang
 * setiap render karena landing dibangun ulang — elemen lama ikut dibuang bersama pendengarnya.
 */
function bindProofTilt (hero: HTMLElement, stage: HTMLElement): void {
  if (typeof window === 'undefined' || !window.matchMedia) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (window.matchMedia('(hover: none)').matches) return
  const maxTilt = 9
  let raf = 0
  let targetRx = 4
  let targetRy = -6
  let currentRx = 4
  let currentRy = -6
  const render = () => {
    currentRx += (targetRx - currentRx) * 0.12
    currentRy += (targetRy - currentRy) * 0.12
    stage.style.setProperty('--proof-rx', `${currentRx.toFixed(2)}deg`)
    stage.style.setProperty('--proof-ry', `${currentRy.toFixed(2)}deg`)
    raf = Math.abs(targetRx - currentRx) > 0.01 || Math.abs(targetRy - currentRy) > 0.01 ? requestAnimationFrame(render) : 0
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(render) }
  hero.addEventListener('mousemove', (e) => {
    const rect = stage.getBoundingClientRect()
    const px = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5
    const py = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5
    targetRy = -6 + px * maxTilt * 2
    targetRx = 4 - py * maxTilt * 2
    stage.style.setProperty('--proof-mx', `${((px + 0.5) * 100).toFixed(1)}%`)
    stage.style.setProperty('--proof-my', `${((py + 0.5) * 100).toFixed(1)}%`)
    kick()
  })
  hero.addEventListener('mouseleave', () => {
    targetRx = 4
    targetRy = -6
    stage.style.setProperty('--proof-mx', '50%')
    stage.style.setProperty('--proof-my', '38%')
    kick()
  })
}

/** Gambar khusus kursus; null = tidak punya, kartu menampilkan lencananya sendiri (B127 — bukan satu gambar cadangan yang diulang). */
function getCourseImage (id: string): string | null {
  if (id.includes('security') || id.includes('lanjut')) return '/course-security.jpg'
  if (id.includes('dasar')) return '/course-web3.jpg'
  return null
}

function renderCourseCard (c: Course, index: number): HTMLElement {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2
  const lessons = c.modules.flatMap((m) => m.lessons)
  const minutes = lessons.reduce((a, l) => a + l.minutes, 0)
  const prereq = c.prereqCourseId ? findCourse(c.prereqCourseId) : undefined
  const img = getCourseImage(c.id)

  return h('a', {
    href: `#/course/${encodeURIComponent(c.id)}`,
    class: `course-card-editorial ${index === 0 ? 'course-card-large' : ''}`,
  },
    img
      ? h('div', { class: 'course-card-image-wrap' }, h('img', { src: img, alt: c.title, class: 'course-card-image' }))
      : h('div', { class: 'course-card-image-wrap is-emblem', style: { '--tc': topicColor(c.topic) } }, emblem(c, 132)),
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
        priceOf(c.id) !== null ? h('span', { class: 'course-card-price' }, `${formatLdc(priceOf(c.id) as bigint)} ${PAY_TOKEN_SYMBOL}`) : null,
      ),
    ),
  )
}

export function renderLanding (): HTMLElement {
  const t = DICTIONARIES[getSavedLanguage()].lmsV2
  const card = renderProofCard()

  const shell = h('div', { class: 'landing-shell' },
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
        h('div', { class: 'hero-editorial-visual hero-editorial-visual--proof' }, card),
      ),
    ),

    h('section', { id: 'catalog', class: 'catalog-editorial' },
      h('div', { class: 'catalog-header' },
        h('h2', { class: 'catalog-header-title' }, t.catalogTitle),
        h('p', { class: 'catalog-header-desc' }, t.catalogDesc),
      ),
      h('div', { class: 'catalog-bento-grid' }, ...LISTED_COURSES.map((c, i) => renderCourseCard(c, i))),
    ),

    renderFlow3D(),

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
  const hero = shell.querySelector('.hero-editorial-section') as HTMLElement | null
  if (hero) bindProofTilt(hero, card)
  return shell
}
