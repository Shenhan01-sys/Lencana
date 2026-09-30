import { h } from '../lib/ui';
import { COURSES } from '../courses/index';
import type { ClassData, LessonData, QuizQuestion } from '../content';
import { renderMarkdown } from '../lib/markdown';
import { 
  learnerAddress, 
  submitEssay
} from '../learning';
import { 
  courseProgress, 
  recordLesson, 
  lessonRecord, 
  summarize 
} from '../progress';

function isAuthed(): boolean {
  if (learnerAddress()) return true;
  try {
    const s = sessionStorage.getItem('lencana_wallet');
    if (s && JSON.parse(s)?.isConnected) return true;
  } catch {}
  return false;
}

/** Render Auth Gate when user is not logged in */
function renderAuthGate(c: ClassData): HTMLElement {
  return h('div', { class: 'class-shell lms-auth-gate' },
    h('div', { class: 'lms-auth-box' },
      h('div', { class: 'lms-auth-icon' }, '🔒'),
      h('h2', { class: 'lms-auth-title' }, 'Akses Kelas Terkunci'),
      h('p', { class: 'lms-auth-desc' }, 
        `Anda harus masuk (login) terlebih dahulu menggunakan email atau dompet Web3 untuk mengakses materi, kuis interaktif, dan kurikulum "${c.title}".`
      ),
      h('a', { 
        href: '#/login', 
        class: 'btn-editorial btn-editorial-primary lms-auth-btn' 
      }, 'Masuk Sekarang ➔'),
      h('a', { href: '#/', class: 'btn-editorial btn-editorial-ghost lms-auth-btn mt-2' }, '← Kembali ke Katalog Publik')
    )
  );
}

/** Top bar in class shell */
function renderClassTopBar(c: ClassData, summary: ReturnType<typeof summarize>): HTMLElement {
  const addr = learnerAddress() || 'Tamu';
  const shortAddr = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return h('header', { class: 'class-topbar' },
    h('div', { class: 'lms-topbar-left' },
      h('a', { href: '#/', class: 'class-topbar-nav' }, '← Katalog'),
      h('span', { class: 'lms-topbar-sep' }, '/'),
      h('span', { class: 'class-topbar-title' }, c.title)
    ),
    h('div', { class: 'lms-topbar-right' },
      h('div', { class: 'lms-topbar-group' },
        h('span', { class: 'lms-progress-text' }, `${summary.pct}%`),
        h('div', { class: 'progress-track' },
          h('div', { class: 'progress-fill', style: { width: `${summary.pct}%` } })
        )
      ),
      h('div', { class: 'lms-topbar-group lms-topbar-user' },
        h('span', { class: 'lms-user-addr' }, shortAddr),
        h('a', { href: '#/portfolio', class: 'class-topbar-nav lms-nav-gold' }, 'Ijazah Saya')
      )
    )
  );
}

/** Left sidebar: Module tree with completion status */
function renderSidebar(c: ClassData, activeLessonSlug?: string, cp: Record<string, any> = {}): HTMLElement {
  return h('aside', { class: 'class-sidebar' },
    h('div', { class: 'class-sidebar-header' },
      h('h3', { class: 'class-sidebar-eyebrow' }, 'Kurikulum'),
      h('p', { class: 'class-sidebar-title' }, `${c.modules.length} Modul Pembelajaran`)
    ),
    h('nav', { class: 'module-tree' },
      ...c.modules.map((m, mIdx) => {
        const moduleLessonsDone = m.lessons.filter(l => cp[l.slug]?.done).length;
        
        return h('div', { class: 'module-group' },
          h('div', { class: 'module-header' },
            h('span', { class: 'module-header-title' }, `Modul ${mIdx + 1}: ${m.title}`),
            h('span', { class: 'module-header-count' }, 
              `${moduleLessonsDone}/${m.lessons.length}`
            )
          ),
          h('div', null,
            ...m.lessons.map(l => {
              const isActive = l.slug === activeLessonSlug;
              const isDone = !!cp[l.slug]?.done;
              
              let icon = '—';
              if (l.type === 'quiz') icon = '○';
              else if (l.type === 'essay') icon = '✍';
              else if (l.type === 'lab') icon = '⚗';
              else if (l.type === 'checkpoint') icon = '⚐';

              return h('a', {
                href: `#/class/${c.id}/${m.id}/${l.slug}`,
                class: `lesson-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`,
                'aria-current': isActive ? 'page' : false
              },
                h('div', { class: 'lesson-item-left' },
                  h('span', { class: 'lesson-item-icon' }, icon),
                  h('span', { class: 'lesson-item-title' }, l.title)
                ),
                h('div', { class: 'lesson-item-right' },
                  isDone 
                    ? h('span', { class: 'lesson-done-mark' }, '✓')
                    : h('span', { class: 'lesson-item-meta' }, `${l.duration}m`)
                )
              );
            })
          )
        );
      })
    )
  );
}

/** Interactive Quiz Component */
function renderQuizComponent(c: ClassData, l: LessonData, onComplete: () => void): HTMLElement {
  const quizData = (l as any).quiz;
  if (!quizData || !quizData.questions) {
    return h('div', null, 'Data kuis tidak ditemukan.');
  }

  const questions: QuizQuestion[] = quizData.questions;
  const userAnswers: Record<string, number> = {};

  const container = h('div', { class: 'interactive-panel' },
    h('div', { class: 'interactive-header' },
      h('h3', { class: 'interactive-title' }, 'Kuis Pemahaman Mandiri'),
      h('p', { class: 'interactive-desc' }, `Target kelulusan: ${quizData.passPct}% · Jawab seluruh pertanyaan untuk menyelesaikan.`)
    )
  );

  const questionsContainer = h('div', null);
  const resultBox = h('div', { class: 'lms-quiz-result hide' });

  questions.forEach((q, qIdx) => {
    const qCard = h('div', { class: 'lms-question-card' },
      h('h4', { class: 'lms-question-prompt' }, `${qIdx + 1}. ${q.prompt}`)
    );

    const optionsList = h('div', null);
    const feedbackBox = h('div', { class: 'lms-question-feedback hide' });

    q.options.forEach((opt, optIdx) => {
      const optBtn = h('button', {
        type: 'button',
        class: 'quiz-option',
        onClick: () => {
          userAnswers[q.id] = optIdx;
          const isCorrect = optIdx === q.answer;
          
          Array.from(optionsList.children).forEach((child: any, idx) => {
            child.className = 'quiz-option';
            if (idx === q.answer) {
              child.classList.add('correct');
            } else if (idx === optIdx && !isCorrect) {
              child.classList.add('incorrect');
            }
          });

          feedbackBox.className = `lms-question-feedback ${isCorrect ? 'success' : 'error'}`;
          feedbackBox.innerHTML = `<strong>${isCorrect ? '✓ Benar!' : '✗ Kurang tepat.'}</strong> ${q.why}`;
          
          checkCompletion();
        }
      },
        h('span', { class: 'quiz-letter' }, String.fromCharCode(65 + optIdx)),
        h('span', null, opt)
      );

      optionsList.appendChild(optBtn);
    });

    qCard.appendChild(optionsList);
    qCard.appendChild(feedbackBox);
    questionsContainer.appendChild(qCard);
  });

  function checkCompletion() {
    if (Object.keys(userAnswers).length === questions.length) {
      let correct = 0;
      questions.forEach(q => {
        if (userAnswers[q.id] === q.answer) correct += 1;
      });
      const pct = Math.round((correct / questions.length) * 100);
      const passed = pct >= quizData.passPct;

      recordLesson(c.id, l.slug, 'quiz', { done: passed, score: pct });

      resultBox.className = `lms-quiz-result ${passed ? 'success' : 'error'}`;
      resultBox.innerHTML = `
        <h4 class="result-title">${passed ? 'Evaluasi Berhasil' : 'Evaluasi Belum Memenuhi Ambang'}</h4>
        <p class="result-desc">Skor Kamu: <span>${pct}%</span> (${correct} dari ${questions.length} benar) · Target kelulusan: ${quizData.passPct}%</p>
      `;

      if (passed) onComplete();
    }
  }

  container.appendChild(questionsContainer);
  container.appendChild(resultBox);
  return container;
}

/** Interactive AI Essay Evaluation Studio Component */
function renderEssayComponent(c: ClassData, l: LessonData, onComplete: () => void): HTMLElement {
  const essayData = (l as any).essay;
  const currentRecord = lessonRecord(c.id, l.slug);
  const minWords = essayData?.minWords || 400;

  const container = h('div', { class: 'interactive-panel' },
    h('div', { class: 'interactive-header' },
      h('h3', { class: 'interactive-title' }, 'Evaluasi AI Otonom'),
      h('p', { class: 'interactive-desc' }, 
        'Esai ini dievaluasi oleh agen AI berdasarkan rubrik on-chain. Kelulusan mutlak diperlukan untuk penerbitan kredensial.'
      )
    ),
    h('div', { class: 'lms-essay-instructions' },
      h('h4', { class: 'lms-essay-eyebrow' }, 'Instruksi:'),
      h('p', { class: 'lms-essay-prompt' }, essayData?.prompt || l.body)
    )
  );

  if (essayData?.rubric) {
    const rubricAccordion = h('details', { class: 'lms-rubric-accordion' },
      h('summary', { class: 'lms-rubric-summary' }, 'Lihat Kriteria Penilaian (100 Poin)'),
      h('div', { class: 'lms-rubric-list' },
        ...essayData.rubric.map((r: any) => 
          h('div', { class: 'lms-rubric-item' },
            h('span', null, r.label),
            h('span', { class: 'lms-rubric-pts' }, `Maks ${r.max} pt`)
          )
        )
      )
    );
    container.appendChild(rubricAccordion);
  }

  const textarea = h('textarea', {
    class: 'essay-textarea',
    placeholder: 'Tuliskan argumen dan sintesis jawabanmu...',
  }) as HTMLTextAreaElement;

  if (currentRecord?.draft) {
    textarea.value = currentRecord.draft;
  }

  const wordCountEl = h('div', { class: 'lms-word-count' },
    h('span', { id: 'word-count-text' }, `0 / ${minWords} kata`),
    h('span', null, 'Otomatis tersimpan di browser')
  );

  function updateWords() {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    const counterText = container.querySelector('#word-count-text');
    if (counterText) {
      counterText.textContent = `${words} / ${minWords} kata minimum`;
      counterText.className = words >= minWords ? 'lms-word-ok' : '';
    }
    recordLesson(c.id, l.slug, 'essay', { draft: textarea.value });
  }

  textarea.addEventListener('input', updateWords);

  const statusEl = h('div', { class: 'lms-essay-status hide' });
  const submitBtn = h('button', {
    type: 'button',
    class: 'btn-editorial btn-editorial-primary lms-essay-submit',
    onClick: async () => {
      const text = textarea.value.trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      if (words < minWords) {
        alert(`Esai kamu baru memiliki ${words} kata. Minimal ${minWords} kata.`);
        return;
      }

      (submitBtn as HTMLButtonElement).disabled = true;
      submitBtn.textContent = 'Menghubungi Agen...';
      statusEl.className = 'lms-essay-status pending';
      statusEl.innerHTML = 'Mengevaluasi secara otonom terhadap rubrik...';
      
      try {
        const res = await submitEssay(c.id, l.slug, text);
        if (res && res.attemptHash) {
          recordLesson(c.id, l.slug, 'essay', { done: true, draft: text });
          statusEl.className = 'lms-essay-status success';
          statusEl.innerHTML = `<strong>Lolos Evaluasi.</strong> Catatan: ${res.note || 'Sukses'}.<br/>Hash: <span>${res.attemptHash}</span>`;
          onComplete();
        } else {
          statusEl.className = 'lms-essay-status error';
          statusEl.innerHTML = `Evaluasi gagal: Pastikan signer aktif.`;
        }
      } catch (err: any) {
        statusEl.className = 'lms-essay-status error';
        statusEl.innerHTML = `Error: ${err.message}`;
      } finally {
        (submitBtn as HTMLButtonElement).disabled = false;
        submitBtn.textContent = 'Serahkan Penilaian';
      }
    }
  }, 'Serahkan Penilaian');

  container.appendChild(textarea);
  container.appendChild(wordCountEl);
  container.appendChild(submitBtn);
  container.appendChild(statusEl);

  setTimeout(updateWords, 50);
  return container;
}

/** Right rail: Table of Contents & References */
function renderRightRail(l: LessonData): HTMLElement {
  return h('aside', { class: 'class-rail' },
    h('div', { class: 'lms-rail-block' },
      h('h4', { class: 'rail-heading' }, 'Di Halaman Ini'),
      h('nav', null,
        h('a', { href: '#', class: 'rail-link' }, l.title),
        h('a', { href: '#', class: 'rail-link' }, 'Inti Konsep')
      )
    ),
    h('div', { class: 'lms-rail-block' },
      h('h4', { class: 'rail-heading' }, 'Rujukan Eksternal'),
      h('nav', null,
        h('a', { href: 'https://eips.ethereum.org/EIPS/eip-55', target: '_blank', class: 'rail-link lms-ext-link' }, '↗ EIP-55'),
        h('a', { href: 'https://eips.ethereum.org/EIPS/eip-712', target: '_blank', class: 'rail-link lms-ext-link' }, '↗ EIP-712')
      )
    )
  );
}

/** Class Overview Page */
function renderClassOverview(c: ClassData): HTMLElement {
  const firstLesson = c.modules[0]?.lessons[0];

  return h('div', { class: 'lesson-container' },
    h('div', { class: 'lms-overview-header' },
      h('div', { class: 'lms-overview-eyebrow' }, 
        `${c.level} · Estimasi ${c.duration} Menit`
      ),
      h('h1', { class: 'lesson-title' }, c.title),
      h('p', { class: 'lms-overview-desc' }, c.subtitle)
    ),

    h('div', { class: 'lms-overview-grid' },
      h('div', null,
        h('h3', { class: 'lms-overview-section-title' }, 'Capaian (Outcomes)'),
        h('ul', { class: 'lms-list' },
          ...c.outcomes.map(o => h('li', { class: 'lms-list-item' },
            h('span', { class: 'lms-list-bullet' }, '—'),
            h('span', { class: 'lms-list-text' }, o)
          ))
        )
      ),
      h('div', null,
        h('h3', { class: 'lms-overview-section-title' }, 'Prasyarat'),
        c.prerequisites.length > 0
          ? h('ul', { class: 'lms-list' },
              ...c.prerequisites.map(p => h('li', { class: 'lms-list-item' },
                h('span', { class: 'lms-list-bullet' }, '—'),
                h('span', null, p)
              ))
            )
          : h('p', { class: 'lms-text-muted' }, 'Tidak ada prasyarat khusus.'),
        
        h('h3', { class: 'lms-overview-section-title mt-top' }, 'Kriteria Lulus'),
        h('p', { class: 'lms-text-muted' }, c.criteria)
      )
    ),

    firstLesson ? h('div', { class: 'lms-overview-action' },
      h('a', { 
        href: `#/class/${c.id}/${c.modules[0].id}/${firstLesson.slug}`, 
        class: 'btn-editorial btn-editorial-primary btn-large' 
      }, 'Mulai Modul 1 ➔')
    ) : null
  );
}

/** Master Class Page Renderer */
export function renderClass(routeHash: string): HTMLElement {
  const parts = routeHash.split('/').slice(2);
  const [classId, moduleId, lessonId] = parts;

  const c = COURSES.find(x => x.id === classId);
  if (!c) {
    return h('div', { class: 'lms-not-found' },
      h('h2', { class: 'lms-not-found-title' }, 'Kelas Tidak Ditemukan'),
      h('a', { href: '#/', class: 'lms-not-found-link' }, 'Kembali ke Katalog Kursus')
    );
  }

  if (!isAuthed()) {
    return renderAuthGate(c);
  }

  const allLessons = c.modules.flatMap(m => m.lessons.map(l => ({ slug: l.slug, type: l.type })));
  const summary = summarize(c.id, allLessons, c.weights);
  const cp = courseProgress(c.id);

  let mainBody: HTMLElement;
  let activeLessonSlug: string | undefined;

  if (moduleId && lessonId) {
    const mod = c.modules.find(x => x.id === moduleId);
    const lesson = mod?.lessons.find(x => x.slug === lessonId);

    if (mod && lesson) {
      activeLessonSlug = lesson.slug;

      const flatLessons = c.modules.flatMap(m => m.lessons.map(l => ({ module: m, lesson: l })));
      const currIdx = flatLessons.findIndex(x => x.lesson.slug === lesson.slug);
      const prev = currIdx > 0 ? flatLessons[currIdx - 1] : null;
      const next = currIdx < flatLessons.length - 1 ? flatLessons[currIdx + 1] : null;

      const isCurrentDone = !!cp[lesson.slug]?.done;

      const nextBtn = h('a', {
        href: next ? `#/class/${c.id}/${next.module.id}/${next.lesson.slug}` : `#/portfolio`,
        class: 'btn-editorial btn-editorial-primary'
      }, next ? 'Selanjutnya ➔' : 'Lihat Ijazah 🎓');

      const markCompleteBtn = h('button', {
        type: 'button',
        class: `btn-editorial ${isCurrentDone ? 'success' : 'btn-editorial-secondary'}`,
        onClick: () => {
          recordLesson(c.id, lesson.slug, lesson.type, { done: !isCurrentDone });
          window.location.reload();
        }
      }, isCurrentDone ? 'Terselesaikan' : 'Tandai Selesai');

      let interactiveElement: HTMLElement | null = null;
      if (lesson.type === 'quiz') {
        interactiveElement = renderQuizComponent(c, lesson, () => {
          markCompleteBtn.className = 'btn-editorial success';
          markCompleteBtn.textContent = 'Kuis Lulus';
        });
      } else if (lesson.type === 'essay') {
        interactiveElement = renderEssayComponent(c, lesson, () => {
          markCompleteBtn.className = 'btn-editorial success';
          markCompleteBtn.textContent = 'Esai Dinilai';
        });
      }

      mainBody = h('div', { class: 'lesson-container' },
        h('div', { class: 'lesson-breadcrumb' },
          h('span', null, mod.title),
          h('span', null, '/'),
          h('span', { class: 'current' }, lesson.title)
        ),

        h('h1', { class: 'lesson-title' }, lesson.title),

        h('div', { class: 'prose' }, renderMarkdown(lesson.body)),

        interactiveElement,

        h('footer', { class: 'lesson-footer' },
          prev 
            ? h('a', { 
                href: `#/class/${c.id}/${prev.module.id}/${prev.lesson.slug}`, 
                class: 'btn-editorial btn-editorial-ghost' 
              }, '← Sebelumnya')
            : h('span', null),
          
          h('div', { class: 'lms-footer-actions' },
            markCompleteBtn,
            nextBtn
          )
        )
      );
    } else {
      mainBody = h('div', { class: 'lms-not-found' }, 'Materi pelajaran tidak ditemukan.');
    }
  } else {
    mainBody = renderClassOverview(c);
  }

  return h('div', { class: 'class-shell' },
    renderClassTopBar(c, summary),
    h('div', { class: 'lms-layout-core' },
      renderSidebar(c, activeLessonSlug, cp),
      h('main', { class: 'class-main' }, mainBody),
      moduleId && lessonId ? renderRightRail(c.modules.find(m => m.id === moduleId)?.lessons.find(l => l.slug === lessonId)!) : null
    )
  );
}
