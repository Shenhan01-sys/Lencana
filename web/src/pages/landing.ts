import { h } from '../lib/ui';
import { COURSES } from '../courses/index';
import type { ClassData } from '../content';


function renderCourseCard(c: ClassData) {
  const lessonCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  
  return h('div', { class: 'course-card card-surface' },
    h('div', { class: 'card-header' },
      h('span', { class: `level-badge badge-${c.level}` }, c.level.toUpperCase()),
      c.prerequisites.length > 0 ? h('span', { class: 'prereq-badge' }, `🔒 Requires: ${c.prerequisites[0]}`) : null
    ),
    h('h3', null, c.title),
    h('p', { class: 'text-muted' }, c.subtitle),
    h('div', { class: 'card-stats text-small text-muted' },
      h('span', null, `⏱️ ${c.duration} menit`),
      h('span', null, `📚 ${c.modules.length} modul, ${lessonCount} materi`)
    ),
    h('div', { class: 'card-actions mt-4' },
      h('a', { href: `#/class/${c.id}`, class: 'btn btn-primary w-full text-center' }, 'Mulai Belajar')
    )
  );
}

export function renderLanding() {
  return h('div', { class: 'landing-page' },
    // 0. Sticky Nav
    h('nav', { class: 'new-app-navbar sticky top-0 z-50 flex items-center justify-between p-4 bg-obsidian border-b border-gray-800' },
      h('a', { href: '#/', class: 'brand-link flex items-center gap-2' },
        h('span', { class: 'text-gold font-bold text-xl' }, 'Lencana')
      ),
      h('div', { class: 'flex items-center gap-6' },
        h('a', { href: '#/', class: 'hover:text-white' }, 'Courses'),
        h('a', { href: '#/verify', class: 'hover:text-white' }, 'Verifier'),
        h('a', { href: '#/agent-hub', class: 'hover:text-white' }, 'Trust & Limits'),
        h('div', { class: 'lang-switch' }, 'ID | EN'), // Placeholder for real switcher
        h('div', { class: 'network-pill text-xs bg-gray-800 px-2 py-1 rounded' }, 'BSC Testnet - 97'),
        h('a', { href: '#/login', class: 'btn btn-primary text-sm px-4 py-2' }, 'Masuk (Login)')
      )
    ),

    // 1. Hero
    h('section', { class: 'hero-section py-20 text-center' },
      h('h1', { class: 'text-4xl font-bold mb-4' }, 'Pelajari Web3, Dapatkan Kredensial On-Chain.'),
      h('p', { class: 'text-xl text-muted mb-8 max-w-2xl mx-auto' }, 
        'Kursus mendalam yang diakhiri dengan ijazah Soulbound ERC-5192. Dapat dibuktikan tanpa harus mempercayai kami.'
      ),
      h('div', { class: 'hero-ctas flex gap-4 justify-center' },
        h('a', { href: '#/courses', class: 'btn btn-primary' }, 'Mulai Belajar'),
        h('a', { href: '#/verify', class: 'btn btn-secondary' }, 'Verifikasi Kredensial')
      )
    ),
    
    // 2. Course Catalog
    h('section', { class: 'catalog-section py-12 max-w-5xl mx-auto' },
      h('h2', { class: 'text-2xl font-bold mb-8' }, 'Katalog Kursus'),
      h('div', { class: 'grid md:grid-cols-2 gap-6' },
        ...COURSES.map(renderCourseCard)
      )
    ),

    // 3. How it works
    h('section', { class: 'how-it-works py-12 max-w-5xl mx-auto' },
      h('h2', { class: 'text-2xl font-bold mb-6' }, 'Bagaimana Ini Bekerja?'),
      h('div', { class: 'grid md:grid-cols-3 gap-6' },
        h('div', { class: 'card-surface' }, h('h3', null, '1. Belajar'), h('p', null, 'Materi teks, kuis interaktif, dan simulasi.')),
        h('div', { class: 'card-surface' }, h('h3', null, '2. Ujian Esai Dinilai AI'), h('p', null, 'Ujian akhir berupa esai yang dikoreksi secara konsisten oleh AI berdasarkan rubrik.')),
        h('div', { class: 'card-surface' }, h('h3', null, '3. Kredensial BNB Chain'), h('p', null, 'Lulusan menerima Soulbound ERC-5192 dan attestation EAS.'))
      )
    ),

    // 4. Real sample credential & Trust Limits
    h('section', { class: 'trust-section py-12 max-w-5xl mx-auto text-center' },
      h('div', { class: 'card-surface p-8' },
        h('h3', { class: 'text-xl mb-4' }, 'Dibangun di atas W3C VC 2.0 / Open Badges 3.0'),
        h('p', { class: 'mb-4 text-muted' }, 'Sistem kami transparan, Anda dapat membaca kontraknya, mencabutnya (jika Anda penerbit), atau memverifikasinya tanpa server kami.'),
        h('a', { href: '#/agent-hub', class: 'text-gold underline' }, 'Baca lebih lanjut tentang Trust & Limits kami')
      )
    )
  );
}
