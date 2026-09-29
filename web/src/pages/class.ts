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
  return h('div', { class: 'class-shell flex flex-col items-center justify-center min-h-screen bg-obsidian text-gray-100 p-6' },
    h('div', { class: 'max-w-md w-full card-surface p-8 text-center border border-gray-800 rounded-xl shadow-2xl' },
      h('div', { class: 'text-5xl mb-4' }, '🔒'),
      h('h2', { class: 'text-2xl font-bold mb-2 text-white' }, 'Akses Kelas Terkunci'),
      h('p', { class: 'text-muted text-sm mb-6 leading-relaxed' }, 
        `Anda harus masuk (login) terlebih dahulu menggunakan email atau dompet Web3 untuk mengakses materi, kuis interaktif, dan kurikulum "${c.title}".`
      ),
      h('a', { 
        href: '#/login', 
        class: 'btn btn-primary w-full py-3 block text-center font-bold mb-3 shadow-lg' 
      }, 'Masuk Sekarang (Sign In) ➔'),
      h('a', { href: '#/', class: 'text-sm text-muted hover:text-white block text-center mt-2' }, '← Kembali ke Katalog Publik')
    )
  );
}

/** Top bar in class shell */
function renderClassTopBar(c: ClassData, summary: ReturnType<typeof summarize>): HTMLElement {
  const addr = learnerAddress() || 'Tamu';
  const shortAddr = addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return h('header', { class: 'class-topbar flex items-center justify-between px-6 py-3 bg-obsidian border-b border-gray-800 sticky top-0 z-40' },
    h('div', { class: 'flex items-center gap-4' },
      h('a', { href: '#/', class: 'text-xs font-semibold text-gray-400 hover:text-gold flex items-center gap-1 transition-colors' },
        h('span', null, '←'),
        h('span', null, 'Katalog Kursus')
      ),
      h('span', { class: 'text-gray-600' }, '/'),
      h('span', { class: 'text-sm font-bold text-white tracking-tight' }, c.title),
      h('span', { class: 'level-badge badge-dasar ml-2' }, c.level.toUpperCase())
    ),
    h('div', { class: 'flex items-center gap-6' },
      // Progress tracker
      h('div', { class: 'flex items-center gap-3' },
        h('div', { class: 'w-32 bg-gray-800 h-2 rounded-full overflow-hidden' },
          h('div', { 
            class: 'bg-gold h-full rounded-full transition-all duration-300', 
            style: { width: `${summary.pct}%` } 
          })
        ),
        h('span', { class: 'text-xs font-mono text-gray-300 font-semibold' }, `${summary.pct}% Selesai`),
        h('span', { class: 'text-xs text-muted' }, `(${summary.doneLessons}/${summary.totalLessons})`)
      ),
      h('div', { class: 'flex items-center gap-2 pl-4 border-l border-gray-800' },
        h('span', { class: 'badge-dot' }),
        h('span', { class: 'text-xs font-mono text-gray-400' }, shortAddr),
        h('a', { href: '#/portfolio', class: 'text-xs text-gold hover:underline ml-2' }, 'Ijazah Saya')
      )
    )
  );
}

/** Left sidebar: Module tree with completion status */
function renderSidebar(c: ClassData, activeLessonSlug?: string, cp: Record<string, any> = {}): HTMLElement {
  return h('aside', { class: 'class-sidebar w-80 flex-shrink-0 border-r border-gray-800 bg-[#111418] h-full overflow-y-auto flex flex-col' },
    h('div', { class: 'p-4 border-b border-gray-800' },
      h('h3', { class: 'text-xs font-mono uppercase tracking-wider text-muted' }, 'Kurikulum Kursus'),
      h('p', { class: 'text-sm font-bold text-white mt-1' }, `${c.modules.length} Modul Pembelajaran`)
    ),
    h('nav', { class: 'module-tree flex-1 p-3 space-y-4 overflow-y-auto' },
      ...c.modules.map((m, mIdx) => {
        const moduleLessonsDone = m.lessons.filter(l => cp[l.slug]?.done).length;
        const isModuleComplete = moduleLessonsDone === m.lessons.length && m.lessons.length > 0;
        
        return h('div', { class: 'module-group mb-4' },
          h('div', { class: 'module-header flex items-center justify-between px-2 py-1 mb-1.5' },
            h('span', { class: 'text-xs font-bold text-gray-300 uppercase tracking-wider' }, `Modul ${mIdx + 1}: ${m.title}`),
            h('span', { class: `text-[11px] font-mono ${isModuleComplete ? 'text-green-500' : 'text-gray-500'}` }, 
              `${moduleLessonsDone}/${m.lessons.length}`
            )
          ),
          h('ul', { class: 'space-y-1' },
            ...m.lessons.map(l => {
              const isActive = l.slug === activeLessonSlug;
              const isDone = !!cp[l.slug]?.done;
              
              // Icon mapping
              let icon = '📖';
              if (l.type === 'quiz') icon = '❓';
              else if (l.type === 'essay') icon = '✍️';
              else if (l.type === 'lab') icon = '🧪';
              else if (l.type === 'checkpoint') icon = '🏁';

              return h('li', null,
                h('a', {
                  href: `#/class/${c.id}/${m.id}/${l.slug}`,
                  class: `flex items-center justify-between py-2 px-3 rounded-lg text-xs transition-all ${
                    isActive 
                      ? 'bg-gray-800/90 text-gold font-bold shadow-sm border-l-2 border-gold' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
                  }`,
                  'aria-current': isActive ? 'page' : false
                },
                  h('div', { class: 'flex items-center gap-2.5 truncate mr-2' },
                    h('span', { class: 'text-sm opacity-80' }, icon),
                    h('span', { class: 'truncate' }, l.title)
                  ),
                  h('div', { class: 'flex items-center gap-1.5 flex-shrink-0' },
                    isDone 
                      ? h('span', { class: 'text-green-500 font-bold text-xs', title: 'Selesai' }, '✓')
                      : h('span', { class: 'text-[10px] text-gray-500 font-mono' }, `${l.duration}m`)
                  )
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
    return h('div', { class: 'card-surface p-4' }, 'Data kuis tidak ditemukan.');
  }

  const questions: QuizQuestion[] = quizData.questions;
  const userAnswers: Record<string, number> = {};
  const currentRecord = lessonRecord(c.id, l.slug);

  const container = h('div', { class: 'quiz-engine mt-8 p-6 card-surface border border-gray-800 rounded-xl' },
    h('div', { class: 'quiz-header mb-6 pb-4 border-b border-gray-800 flex items-center justify-between' },
      h('div', null,
        h('h3', { class: 'text-xl font-bold text-white' }, 'Kuis Pemahaman Mandiri'),
        h('p', { class: 'text-xs text-muted mt-1' }, `Target kelulusan: ${quizData.passPct}% · Jawab seluruh pertanyaan untuk menyelesaikan pelajaran ini.`)
      ),
      currentRecord?.score !== undefined 
        ? h('span', { class: 'level-badge badge-dasar' }, `Nilai Terakhir: ${currentRecord.score}%`)
        : null
    )
  );

  const questionsContainer = h('div', { class: 'space-y-6' });
  const resultBox = h('div', { class: 'mt-6 p-4 rounded-lg hidden' });

  questions.forEach((q, qIdx) => {
    const qCard = h('div', { class: 'question-card p-4 bg-gray-900/60 rounded-lg border border-gray-800/80' },
      h('h4', { class: 'text-sm font-semibold text-white mb-3' }, `${qIdx + 1}. ${q.prompt}`)
    );

    const optionsList = h('div', { class: 'space-y-2' });
    const feedbackBox = h('div', { class: 'mt-3 p-3 rounded text-xs hidden' });

    q.options.forEach((opt, optIdx) => {
      const optBtn = h('button', {
        type: 'button',
        class: 'w-full text-left p-3 rounded border border-gray-800 hover:border-gray-700 bg-gray-800/30 text-xs text-gray-300 transition-all flex items-start gap-3',
        onClick: () => {
          userAnswers[q.id] = optIdx;
          const isCorrect = optIdx === q.answer;
          
          // Style options
          Array.from(optionsList.children).forEach((child: any, idx) => {
            child.className = 'w-full text-left p-3 rounded border border-gray-800 bg-gray-800/30 text-xs text-gray-300';
            if (idx === q.answer) {
              child.className = 'w-full text-left p-3 rounded border border-green-500/50 bg-green-950/20 text-xs text-green-300 font-semibold';
            } else if (idx === optIdx && !isCorrect) {
              child.className = 'w-full text-left p-3 rounded border border-red-500/50 bg-red-950/20 text-xs text-red-300';
            }
          });

          // Show explanation
          feedbackBox.className = `mt-3 p-3 rounded text-xs leading-relaxed border ${
            isCorrect 
              ? 'bg-green-950/30 border-green-800/60 text-green-300' 
              : 'bg-red-950/30 border-red-800/60 text-red-300'
          }`;
          feedbackBox.innerHTML = `<strong>${isCorrect ? '✓ Benar!' : '✗ Kurang tepat.'}</strong> ${q.why}`;
          feedbackBox.classList.remove('hidden');

          checkCompletion();
        }
      },
        h('span', { class: 'font-mono text-gray-500 font-bold' }, String.fromCharCode(65 + optIdx)),
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

      resultBox.className = `mt-6 p-4 rounded-xl border text-center ${
        passed 
          ? 'bg-green-950/30 border-green-700/60 text-green-200' 
          : 'bg-yellow-950/30 border-yellow-700/60 text-yellow-200'
      }`;
      resultBox.innerHTML = `
        <h4 class="text-lg font-bold mb-1">${passed ? '🎉 Selamat, Kamu Lulus Kuis Ini!' : '⚠️ Nilai Belum Memenuhi Ambang'}</h4>
        <p class="text-xs">Skor Kamu: <strong>${pct}%</strong> (${correct} dari ${questions.length} benar) · Target: ${quizData.passPct}%</p>
      `;
      resultBox.classList.remove('hidden');

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

  const container = h('div', { class: 'essay-studio mt-8 p-6 card-surface border border-gray-800 rounded-xl' },
    h('div', { class: 'essay-header mb-6 pb-4 border-b border-gray-800' },
      h('span', { class: 'level-badge badge-lanjutan mb-2 inline-block' }, 'UJIAN CAPSTONE TERVERIFIKASI'),
      h('h3', { class: 'text-2xl font-bold text-white' }, 'Penyerahan Tugas Esai Evaluasi AI'),
      h('p', { class: 'text-xs text-muted mt-1 leading-relaxed' }, 
        'Tugas ini dievaluasi secara otomatis oleh agen AI otonom berdasarkan rubrik on-chain yang transparan. Nilai kelulusan esai adalah bagian mutlak penerbitan kredensial Soulbound.'
      )
    ),
    h('div', { class: 'prompt-box p-4 bg-gray-900 rounded-lg border border-gray-800 mb-6' },
      h('h4', { class: 'text-xs font-mono uppercase text-gold font-bold mb-2' }, 'Instruksi Soal:'),
      h('p', { class: 'text-sm text-gray-200 leading-relaxed' }, essayData?.prompt || l.body)
    )
  );

  // Rubric details
  if (essayData?.rubric) {
    const rubricAccordion = h('details', { class: 'mb-6 p-3 bg-gray-900/60 rounded-lg border border-gray-800 text-xs' },
      h('summary', { class: 'font-bold text-gray-300 cursor-pointer' }, '📋 Lihat Kriteria Penilaian Rubrik (100 Poin)'),
      h('div', { class: 'mt-3 space-y-2 pt-2 border-t border-gray-800' },
        ...essayData.rubric.map((r: any) => 
          h('div', { class: 'flex justify-between items-start py-1 border-b border-gray-800/40' },
            h('span', { class: 'text-gray-300' }, r.label),
            h('span', { class: 'font-mono text-gold font-bold' }, `Maks ${r.max} pt`)
          )
        )
      )
    );
    container.appendChild(rubricAccordion);
  }

  // Textarea & word count
  const textarea = h('textarea', {
    class: 'w-full h-64 p-4 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-100 font-mono focus:border-gold focus:outline-none leading-relaxed resize-y',
    placeholder: 'Tuliskan argumen dan sintesis jawaban analisismu di sini...',
  }) as HTMLTextAreaElement;

  if (currentRecord?.draft) {
    textarea.value = currentRecord.draft;
  }

  const wordCountEl = h('div', { class: 'text-xs text-muted font-mono mt-2 flex justify-between' },
    h('span', { id: 'word-count-text' }, `0 / ${minWords} kata minimum`),
    h('span', { class: 'text-gray-500' }, 'Draf tersimpan otomatis di browser')
  );

  function updateWords() {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    const counterText = container.querySelector('#word-count-text');
    if (counterText) {
      counterText.textContent = `${words} / ${minWords} kata minimum ${words >= minWords ? '✓' : ''}`;
      counterText.className = words >= minWords ? 'text-green-500 font-bold' : 'text-muted';
    }
    // Auto-save draft
    recordLesson(c.id, l.slug, 'essay', { draft: textarea.value });
  }

  textarea.addEventListener('input', updateWords);

  // Submit button & status
  const statusEl = h('div', { class: 'mt-4 p-4 rounded-lg hidden text-xs' });
  const submitBtn = h('button', {
    type: 'button',
    class: 'btn btn-primary mt-4 py-3 px-6 font-bold shadow-lg',
    onClick: async () => {
      const text = textarea.value.trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      if (words < minWords) {
        alert(`Esai kamu baru memiliki ${words} kata. Diperlukan minimal ${minWords} kata untuk diserahkan.`);
        return;
      }

      (submitBtn as HTMLButtonElement).disabled = true;
      submitBtn.textContent = 'Mengirim ke Agen AI Penerbit...';
      statusEl.className = 'mt-4 p-4 rounded-lg bg-gray-900 border border-gold/40 text-gold text-xs';
      statusEl.innerHTML = '⏳ Menghubungi agen AI otonom untuk mengevaluasi esai terhadap Rubrik #0x91a7...';
      statusEl.classList.remove('hidden');

      try {
        const res = await submitEssay(c.id, l.slug, text);
        if (res && res.attemptHash) {
          recordLesson(c.id, l.slug, 'essay', { done: true, draft: text });
          statusEl.className = 'mt-4 p-4 rounded-lg bg-green-950/40 border border-green-600 text-green-200 text-xs';
          statusEl.innerHTML = `🎉 <strong>Esai Berhasil Dinilai & Lulus!</strong> Catatan: ${res.note || 'Lolos evaluasi mekanikal'}. Hash Bukti: ${res.attemptHash.slice(0, 10)}...`;
          onComplete();
        } else {
          statusEl.className = 'mt-4 p-4 rounded-lg bg-red-950/40 border border-red-600 text-red-200 text-xs';
          statusEl.innerHTML = `⚠️ <strong>Evaluasi:</strong> Gagal menyerahkan esai. Pastikan signer aktif atau gunakan mode offline.`;
        }
      } catch (err: any) {
        statusEl.className = 'mt-4 p-4 rounded-lg bg-red-950/40 border border-red-600 text-red-200 text-xs';
        statusEl.innerHTML = `Gagal mengirim esai: ${err.message || 'Koneksi signer terputus'}`;
      } finally {
        (submitBtn as HTMLButtonElement).disabled = false;
        submitBtn.textContent = 'Serahkan untuk Dinilai AI';
      }
    }
  }, 'Serahkan untuk Dinilai AI ➔');

  container.appendChild(textarea);
  container.appendChild(wordCountEl);
  container.appendChild(submitBtn);
  container.appendChild(statusEl);

  setTimeout(updateWords, 50);
  return container;
}

/** Right rail: Table of Contents & References */
function renderRightRail(l: LessonData): HTMLElement {
  return h('aside', { class: 'class-rail w-64 flex-shrink-0 p-6 hidden xl:block border-l border-gray-800 text-xs space-y-6' },
    h('div', null,
      h('h4', { class: 'font-mono uppercase tracking-wider text-muted font-bold mb-3' }, 'Di Halaman Ini'),
      h('ul', { class: 'space-y-2 text-gray-400' },
        h('li', null, h('a', { href: '#', class: 'hover:text-gold' }, l.title)),
        h('li', null, h('a', { href: '#', class: 'hover:text-gold' }, 'Ringkasan & Inti Konsep')),
        h('li', null, h('a', { href: '#', class: 'hover:text-gold' }, 'Latihan & Penerapan'))
      )
    ),
    h('div', { class: 'pt-6 border-t border-gray-800' },
      h('h4', { class: 'font-mono uppercase tracking-wider text-muted font-bold mb-3' }, 'Spek & Rujukan'),
      h('ul', { class: 'space-y-2 text-gray-400 font-mono' },
        h('li', null, h('a', { href: 'https://eips.ethereum.org/EIPS/eip-55', target: '_blank', class: 'hover:text-gold' }, '↗ EIP-55 Checksum')),
        h('li', null, h('a', { href: 'https://eips.ethereum.org/EIPS/eip-712', target: '_blank', class: 'hover:text-gold' }, '↗ EIP-712 Signatures')),
        h('li', null, h('a', { href: 'https://docs.bnbchain.org', target: '_blank', class: 'hover:text-gold' }, '↗ BNB Chain RPC Docs'))
      )
    )
  );
}

/** Class Overview Page */
function renderClassOverview(c: ClassData): HTMLElement {
  const totalLessons = c.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const firstLesson = c.modules[0]?.lessons[0];

  return h('div', { class: 'class-overview max-w-4xl mx-auto py-10 px-6' },
    h('div', { class: 'mb-8' },
      h('div', { class: 'flex items-center gap-3 mb-3' },
        h('span', { class: 'level-badge badge-dasar' }, c.level.toUpperCase()),
        h('span', { class: 'text-xs text-muted font-mono' }, `⏱️ Estimasi ${c.duration} Menit Belajar`)
      ),
      h('h1', { class: 'text-4xl font-extrabold text-white tracking-tight mb-4' }, c.title),
      h('p', { class: 'text-lg text-muted leading-relaxed' }, c.subtitle)
    ),

    // Outcomes & Prerequisites Grid
    h('div', { class: 'grid md:grid-cols-2 gap-6 mb-10' },
      h('div', { class: 'card-surface p-6' },
        h('h3', { class: 'text-sm font-bold uppercase tracking-wider text-gold mb-4' }, '🎯 Capaian Pembelajaran (Outcomes)'),
        h('ul', { class: 'space-y-2.5 text-sm text-gray-300' },
          ...c.outcomes.map(o => h('li', { class: 'flex items-start gap-2.5' },
            h('span', { class: 'text-green-500 font-bold' }, '✓'),
            h('span', null, o)
          ))
        )
      ),
      h('div', { class: 'card-surface p-6' },
        h('h3', { class: 'text-sm font-bold uppercase tracking-wider text-yellow-500 mb-4' }, '🔒 Prasyarat & Ketentuan'),
        c.prerequisites.length > 0
          ? h('ul', { class: 'space-y-2.5 text-sm text-gray-300' },
              ...c.prerequisites.map(p => h('li', { class: 'flex items-start gap-2.5' },
                h('span', { class: 'text-yellow-500 font-bold' }, '•'),
                h('span', null, `Memerlukan ijazah: ${p}`)
              ))
            )
          : h('p', { class: 'text-sm text-muted' }, 'Tidak ada prasyarat khusus. Cocok untuk semua praktisi pemula.'),
        h('div', { class: 'mt-6 pt-4 border-t border-gray-800' },
          h('h4', { class: 'text-xs font-mono uppercase text-muted mb-1' }, 'Kriteria Kelulusan On-Chain:'),
          h('p', { class: 'text-xs text-gray-400' }, c.criteria)
        )
      )
    ),

    // CTA
    firstLesson ? h('div', { class: 'p-6 card-surface border-gold/30 flex items-center justify-between' },
      h('div', null,
        h('h4', { class: 'font-bold text-white text-lg' }, 'Siap Memulai Belajar?'),
        h('p', { class: 'text-xs text-muted mt-1' }, `${c.modules.length} modul · ${totalLessons} materi pelajaran menunggumu`)
      ),
      h('a', { 
        href: `#/class/${c.id}/${c.modules[0].id}/${firstLesson.slug}`, 
        class: 'btn btn-primary py-3 px-8 text-base font-bold shadow-xl' 
      }, 'Mulai Pelajaran Pertama ➔')
    ) : null
  );
}

/** Master Class Page Renderer */
export function renderClass(routeHash: string): HTMLElement {
  const parts = routeHash.split('/').slice(2);
  const [classId, moduleId, lessonId] = parts;

  const c = COURSES.find(x => x.id === classId);
  if (!c) {
    return h('div', { class: 'p-12 text-center text-gray-400' },
      h('h2', { class: 'text-2xl font-bold text-white mb-2' }, 'Kelas Tidak Ditemukan'),
      h('a', { href: '#/', class: 'text-gold underline text-sm' }, 'Kembali ke Katalog Kursus')
    );
  }

  // Strict LMS Auth Gate
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

      // Find prev and next lesson
      const flatLessons = c.modules.flatMap(m => m.lessons.map(l => ({ module: m, lesson: l })));
      const currIdx = flatLessons.findIndex(x => x.lesson.slug === lesson.slug);
      const prev = currIdx > 0 ? flatLessons[currIdx - 1] : null;
      const next = currIdx < flatLessons.length - 1 ? flatLessons[currIdx + 1] : null;

      const isCurrentDone = !!cp[lesson.slug]?.done;

      const nextBtn = h('a', {
        href: next ? `#/class/${c.id}/${next.module.id}/${next.lesson.slug}` : `#/portfolio`,
        class: 'btn btn-primary py-2.5 px-6 font-bold shadow-md flex items-center gap-2'
      },
        h('span', null, next ? 'Pelajaran Selanjutnya ➔' : 'Selesai & Lihat Ijazah 🎓')
      );

      const markCompleteBtn = h('button', {
        type: 'button',
        class: `btn py-2.5 px-5 font-semibold text-xs border ${
          isCurrentDone 
            ? 'bg-green-950/40 border-green-600 text-green-300' 
            : 'btn-secondary'
        }`,
        onClick: () => {
          recordLesson(c.id, lesson.slug, lesson.type, { done: !isCurrentDone });
          window.location.reload();
        }
      }, isCurrentDone ? '✓ Sudah Ditandai Selesai' : 'Tandai Selesai');

      // Specific lesson interactive elements
      let interactiveElement: HTMLElement | null = null;
      if (lesson.type === 'quiz') {
        interactiveElement = renderQuizComponent(c, lesson, () => {
          markCompleteBtn.className = 'btn py-2.5 px-5 font-semibold text-xs border bg-green-950/40 border-green-600 text-green-300';
          markCompleteBtn.textContent = '✓ Kuis Lulus (Selesai)';
        });
      } else if (lesson.type === 'essay') {
        interactiveElement = renderEssayComponent(c, lesson, () => {
          markCompleteBtn.className = 'btn py-2.5 px-5 font-semibold text-xs border bg-green-950/40 border-green-600 text-green-300';
          markCompleteBtn.textContent = '✓ Esai Dinilai (Selesai)';
        });
      }

      mainBody = h('div', { class: 'max-w-3xl mx-auto py-8 px-6' },
        // Breadcrumb
        h('nav', { class: 'breadcrumb text-xs text-muted mb-4 flex items-center gap-2 font-mono' },
          h('span', null, c.title),
          h('span', null, '>'),
          h('span', null, mod.title),
          h('span', null, '>'),
          h('span', { class: 'text-gray-300 font-bold' }, lesson.title)
        ),

        // Title and meta
        h('div', { class: 'lesson-header mb-8 pb-6 border-b border-gray-800' },
          h('div', { class: 'flex items-center gap-3 mb-3' },
            h('span', { class: 'level-badge badge-dasar' }, lesson.type.toUpperCase()),
            h('span', { class: 'text-xs text-muted font-mono' }, `⏳ ${lesson.duration} Menit`)
          ),
          h('h1', { class: 'text-3xl font-extrabold text-white tracking-tight leading-tight' }, lesson.title)
        ),

        // Rich markdown prose
        renderMarkdown(lesson.body),

        // Interactive quiz or essay block if applicable
        interactiveElement,

        // Bottom Navigation Bar
        h('footer', { class: 'lesson-footer mt-16 pt-8 border-t border-gray-800 flex items-center justify-between' },
          prev 
            ? h('a', { 
                href: `#/class/${c.id}/${prev.module.id}/${prev.lesson.slug}`, 
                class: 'btn btn-secondary py-2.5 px-5 font-semibold text-xs' 
              }, '← Sebelumnya')
            : h('span', null),
          
          h('div', { class: 'flex items-center gap-3' },
            markCompleteBtn,
            nextBtn
          )
        )
      );
    } else {
      mainBody = h('div', { class: 'p-12 text-center text-muted' }, 'Materi pelajaran tidak ditemukan.');
    }
  } else {
    mainBody = renderClassOverview(c);
  }

  // Master shell container
  return h('div', { class: 'class-shell flex flex-col h-screen bg-obsidian text-gray-100 overflow-hidden' },
    renderClassTopBar(c, summary),
    h('div', { class: 'flex-1 flex overflow-hidden' },
      renderSidebar(c, activeLessonSlug, cp),
      h('main', { class: 'flex-1 overflow-y-auto' }, mainBody),
      moduleId && lessonId ? renderRightRail(c.modules.find(m => m.id === moduleId)?.lessons.find(l => l.slug === lessonId)!) : null
    )
  );
}
