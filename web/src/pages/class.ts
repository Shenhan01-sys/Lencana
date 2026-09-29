import { h } from '../lib/ui';
import { COURSES } from '../courses/index';
import type { ClassData, LessonData } from '../content';

function renderSidebar(c: ClassData, activeLessonSlug?: string) {
  return h('aside', { class: 'class-sidebar w-64 flex-shrink-0 border-r border-gray-800 h-full overflow-y-auto p-4' },
    h('div', { class: 'mb-6' },
      h('a', { href: '#/', class: 'text-sm text-gray-400 hover:text-white' }, '← Kembali ke Katalog'),
      h('h2', { class: 'text-xl font-bold mt-2' }, c.title),
    ),
    h('nav', { class: 'module-tree space-y-4' },
      ...c.modules.map((m, mIdx) => 
        h('div', { class: 'module-group' },
          h('h3', { class: 'text-sm font-bold text-gray-300 uppercase tracking-wider mb-2' }, `Modul ${mIdx + 1}: ${m.title}`),
          h('ul', { class: 'space-y-1' },
            ...m.lessons.map(l => {
              const isActive = l.slug === activeLessonSlug;
              return h('li', null,
                h('a', {
                  href: `#/class/${c.id}/${m.id}/${l.slug}`,
                  class: `block py-2 px-3 rounded text-sm ${isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-gray-900'}`,
                  'aria-current': isActive ? 'page' : false
                },
                  h('span', { class: 'mr-2 opacity-50' }, '📄'), // TODO: map icon by l.type
                  l.title
                )
              );
            })
          )
        )
      )
    )
  );
}

function renderLessonContent(l: LessonData) {
  return h('div', { class: 'lesson-content prose prose-invert max-w-none' },
    h('div', { dangerouslySetInnerHTML: { __html: l.body } }) // In reality, we'd parse markdown here
  );
}

function renderClassOverview(c: ClassData) {
  return h('div', { class: 'class-overview' },
    h('h1', { class: 'text-4xl font-bold mb-4' }, c.title),
    h('p', { class: 'text-xl text-gray-400 mb-8' }, c.subtitle),
    h('div', { class: 'grid md:grid-cols-2 gap-8' },
      h('div', null,
        h('h3', { class: 'text-xl font-bold mb-4' }, 'Yang Akan Dipelajari'),
        h('ul', { class: 'space-y-2' }, ...c.outcomes.map(o => h('li', { class: 'flex items-start' }, h('span', { class: 'mr-2 text-green-500' }, '✓'), o)))
      ),
      h('div', null,
        h('h3', { class: 'text-xl font-bold mb-4' }, 'Prasyarat'),
        h('ul', { class: 'space-y-2' }, ...c.prerequisites.map(p => h('li', { class: 'flex items-start' }, h('span', { class: 'mr-2 text-yellow-500' }, '🔒'), p)))
      )
    ),
    h('div', { class: 'mt-8' },
      h('a', { href: `#/class/${c.id}/${c.modules[0].id}/${c.modules[0].lessons[0].slug}`, class: 'btn btn-primary' }, 'Mulai Pelajaran Pertama')
    )
  );
}

import { learnerAddress } from '../learning';

function isAuthed(): boolean {
  if (learnerAddress()) return true;
  try {
    const s = sessionStorage.getItem('lencana_wallet');
    if (s && JSON.parse(s)?.isConnected) return true;
  } catch {}
  return false;
}

export function renderClass(routeHash: string) {
  // routeHash is like #/class/web3-dasar-2026/m1/l1
  const parts = routeHash.split('/').slice(2);
  const [classId, moduleId, lessonId] = parts;

  const c = COURSES.find(x => x.id === classId);
  if (!c) {
    return h('div', { class: 'p-8 text-center' }, 'Kelas tidak ditemukan.');
  }

  if (!isAuthed()) {
    return h('div', { class: 'class-shell flex flex-col items-center justify-center min-h-screen bg-obsidian text-gray-100 p-6' },
      h('div', { class: 'max-w-md w-full card-surface p-8 text-center border border-gray-800 rounded-xl' },
        h('div', { class: 'text-5xl mb-4' }, '🔒'),
        h('h2', { class: 'text-2xl font-bold mb-2 text-white' }, 'Akses Kelas Terkunci'),
        h('p', { class: 'text-muted text-sm mb-6' }, `Anda harus masuk (login) terlebih dahulu untuk mengakses materi dan kurikulum "${c.title}".`),
        h('a', { 
          href: '#/login', 
          class: 'btn btn-primary w-full py-3 block text-center font-bold mb-3' 
        }, 'Masuk Sekarang (Sign In) ➔'),
        h('a', { href: '#/', class: 'text-sm text-muted hover:text-white block text-center' }, '← Kembali ke Katalog')
      )
    );
  }

  let mainContent;
  let activeLessonSlug;

  if (moduleId && lessonId) {
    const mod = c.modules.find(x => x.id === moduleId);
    const lesson = mod?.lessons.find(x => x.slug === lessonId);
    if (mod && lesson) {
      activeLessonSlug = lesson.slug;
      mainContent = h('div', { class: 'max-w-3xl mx-auto' },
        h('div', { class: 'breadcrumb text-sm text-gray-400 mb-6' }, `${c.title} > ${mod.title}`),
        h('h1', { class: 'text-3xl font-bold mb-4' }, lesson.title),
        h('div', { class: 'flex items-center text-sm text-gray-500 mb-8' },
          h('span', null, `⏳ ${lesson.duration} menit`),
          h('span', { class: 'mx-2' }, '•'),
          h('span', { class: 'uppercase tracking-wider' }, lesson.type)
        ),
        renderLessonContent(lesson),
        h('div', { class: 'lesson-footer mt-12 pt-8 border-t border-gray-800 flex justify-between' },
          h('button', { class: 'btn btn-secondary' }, '← Sebelumnya'),
          h('button', { class: 'btn btn-primary' }, 'Tandai Selesai & Lanjut →')
        )
      );
    } else {
      mainContent = h('div', null, 'Materi tidak ditemukan.');
    }
  } else {
    mainContent = renderClassOverview(c);
  }

  return h('div', { class: 'class-shell flex h-screen bg-obsidian text-gray-100 overflow-hidden' },
    renderSidebar(c, activeLessonSlug),
    h('main', { class: 'flex-1 overflow-y-auto p-8' },
      mainContent
    )
  );
}
