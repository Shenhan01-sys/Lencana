import { h } from '../lib/ui';
import { COURSES } from '../courses/index';
import type { ClassData } from '../content';

function getCourseImage(id: string) {
  if (id.includes('security') || id.includes('lanjut')) return '/course-security.jpg';
  if (id.includes('dasar')) return '/course-web3.jpg';
  return '/hero.jpg'; // fallback
}

function renderCourseCard(c: ClassData, index: number) {
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
        c.prerequisites.length > 0 ? h('span', { class: 'text-xs text-gray-500 font-mono flex items-center gap-1' }, '🔒 BERSYARAT') : null
      ),
      h('h3', { class: 'course-card-title' }, c.title),
      h('p', { class: 'course-card-desc' }, c.subtitle),
      h('div', { class: 'course-card-footer' },
        h('span', null, `${c.duration} MENIT`),
        h('span', null, `${c.modules.length} MODUL · ${lessonCount} MATERI`)
      )
    )
  );
}

export function renderLanding() {
  return h('div', { class: 'landing-shell' },
    // 1. Ultra-Premium Asymmetric Hero
    h('section', { class: 'hero-editorial-section' },
      h('div', { class: 'hero-editorial-grid' },
        h('div', { class: 'hero-editorial-content' },
          h('span', { class: 'hero-editorial-eyebrow' }, 'Akademi Web3 Terdesentralisasi'),
          h('h1', { class: 'hero-editorial-title' }, 'Pelajari, uji, dan buktikan.'),
          h('p', { class: 'hero-editorial-desc' }, 
            'Kursus mendalam yang dievaluasi secara otonom oleh agen AI, diakhiri dengan ijazah on-chain Soulbound ERC-5192. Transparan dan tidak dapat dipalsukan.'
          ),
          h('div', { class: 'hero-editorial-actions' },
            h('a', { href: '#catalog', class: 'btn-editorial btn-editorial-primary' }, 'Lihat Kurikulum'),
            h('a', { href: '#/verify', class: 'btn-editorial btn-editorial-secondary' }, 'Verifikasi Kredensial')
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
        h('h2', { class: 'catalog-header-title' }, 'Katalog Kursus'),
        h('p', { class: 'catalog-header-desc' }, 'Kurikulum terstruktur untuk engineer Web3.')
      ),
      h('div', { class: 'catalog-bento-grid' },
        ...COURSES.map((c, i) => renderCourseCard(c, i))
      )
    ),

    // 3. How it works (Minimalist split text)
    h('section', { class: 'how-it-works-section' },
      h('div', { class: 'how-it-works-grid' },
        h('div', { class: 'how-it-works-sticky' },
          h('h2', { class: 'how-it-works-title' }, 'Alur Sertifikasi'),
          h('p', { class: 'how-it-works-subtitle' }, 'Proses deterministik dari pembelajaran hingga penerbitan kredensial on-chain.')
        ),
        h('div', { class: 'how-it-works-steps' },
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '01'),
            h('div', { class: 'step-content' },
              h('h3', null, 'Pahami Materi Secara Mandiri'),
              h('p', null, 'Setiap kursus disusun secara terstruktur dari dasar hingga studi kasus teknikal. Tanpa biaya pendaftaran, sepenuhnya akses terbuka.')
            )
          ),
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '02'),
            h('div', { class: 'step-content' },
              h('h3', null, 'Ujian Tesis Otonom'),
              h('p', null, 'Kelulusan ditentukan oleh agen AI yang menilai esai Anda melawan rubrik on-chain secara mekanikal dan transparan tanpa bias.')
            )
          ),
          h('div', { class: 'how-it-works-step' },
            h('span', { class: 'step-number' }, '03'),
            h('div', { class: 'step-content' },
              h('h3', null, 'Kredensial Kriptografis'),
              h('p', null, 'Lulusan menerima token Soulbound dan EAS Attestation. Kredensial tidak dapat dipindahtangankan, dan pembuktian skill Anda dicatat selamanya.')
            )
          )
        )
      )
    ),

    // 4. Real sample credential & Trust Limits
    h('section', { class: 'trust-section' },
      h('div', { class: 'trust-box' },
        h('h3', { class: 'trust-title' }, 'Infrastruktur Standar Terbuka'),
        h('p', { class: 'trust-desc' }, 
          'Sistem ini dibangun mengikuti standar W3C Verifiable Credentials v2.0 dan Open Badges 3.0. Kontrak kami terbuka, kami tidak menyembunyikan kunci Anda, dan Anda dapat memverifikasi ijazah mana pun langsung melalui node tanpa harus mempercayai server kami.'
        ),
        h('div', { class: 'trust-links' },
          h('a', { href: '#/agent-hub' }, '→ Trust & Limits'),
          h('a', { href: 'https://github.com', target: '_blank' }, '→ Source Code')
        )
      )
    )
  );
}
