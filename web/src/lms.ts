/**
 * Halaman belajar: router hash + templat.
 *
 * Kenapa router sendiri (beberapa puluh baris) dan bukan library:
 *  - `verify.ts` sengaja bebas-DOM supaya berkas yang sama bisa dijalankan dari Node dan diuji
 *    terhadap fork sungguhan — itu aset yang jarang dimiliki submission lain, dan framework UI
 *    menuntut state-management yang akan menghapusnya;
 *  - yang dibutuhkan di sini cuma memetakan string -> templat. Tidak ada store, tidak ada reaktivitas.
 *
 * Rute memakai `#/...` dan TIDAK menyentuh `?q=`: itu milik verifier (`main.ts` membacanya dari
 * query string). Karena itu tautan "buka di verifier" dan rute LMS bisa hidup berdampingan.
 */
import { isAddress } from 'viem'
import './lms.css'
import { credentialResolverAbi } from './abi'
import { isConfigured, loadEndpoint } from './config'
import { makeClient } from './verify'
import { esc } from './render'
import { courseIdOf, lessonIdOf, LESSON_KINDS, type Block, type Course, type Lesson, type Module } from './content'
import { auditAll, catalogStats, COURSES, findCourse, findLesson, moduleOf } from './courses/index'
import { manifestOf, rubricHashOf, shortHash } from './manifest'
import { courseProgress, recordLesson, summarize, wipeCourse, type CourseSummary } from './progress'
import {
  completeLesson, connectWalletLearner, createDeviceLearner, endpoint, forgetLearner, learnerAddress,
  setEndpoint, snapshot, submitEssay, submitQuiz, syncCourse,
  hasExplicitLearnerSession,
} from './learning'
import { isRealPrivyConfigured } from './privy'

/**
 * Baris state yang DIPERCAYAI: milik penerbit di Postgres, bukan milik browser.
 *
 * Dua baris angka bisa hidup berdampingan dengan sengaja — yang satu "di perangkat ini" (cache,
 * bisa hilang, bukan bukti), yang satu "di penerbit" (rekaman yang dibaca `issue --from-attempts`).
 * Menyembunyikan yang pertama akan membuat halaman lebih bersih dan lebih sulit dipahami: peserta
 * perlu tahu angka mana yang tidak punya konsekuensi.
 */
function serverLine (courseId: string): string {
  const s = snapshot()
  const addr = learnerAddress()
  const ep = `<input id="signer-endpoint" class="ep" data-role="signer-endpoint" value="${esc(endpoint())}" aria-label="URL penerbit">`
  if (!addr) {
    const privyLabel = isRealPrivyConfigured()
      ? 'Masuk dengan Privy (Email/Google)'
      : 'Masuk demo (kunci lokal — bukan Privy sungguhan)'
    return `<aside class="note learn-id">
      <strong>Hubungkan identitas untuk menyimpan rekaman belajar</strong>
      <p>Kamu bisa membaca materi tanpa masuk. Untuk mengirim jawaban dan menyimpan progres pada
      penerbit, pilih identitas peserta terlebih dahulu.</p>
      <div class="actions">
        <button class="primary" data-action="learner-privy" data-course="${esc(courseId)}">${privyLabel}</button>
        <button data-action="learner-device" data-course="${esc(courseId)}">Pakai kunci perangkat (sementara)</button>
        <button data-action="learner-wallet" data-course="${esc(courseId)}">Sambungkan dompet</button>
      </div>
      <details><summary>Pengaturan lanjutan penerbit</summary><p class="muted">${ep} · ubah kalau penerbitmu berjalan di tempat lain, lalu muat ulang.</p></details>
    </aside>`
  }
  const sum = s.summary && s.courseId === courseId ? s.summary : null
  // 'privy' tanpa App ID sungguhan = kunci lokal sesi ini, bukan dompet Privy. Labelnya
  // harus berkata begitu supaya "Rekaman di penerbit" tidak mengklaim kustodi yang tidak ada.
  const kind = s.identity?.kind === 'dompet'
    ? 'dompet'
    : s.identity?.kind === 'privy'
      ? (isRealPrivyConfigured() ? 'embedded wallet (Privy)' : 'kunci demo lokal — BUKAN dompet Privy (hangus bersama tab ini)')
      : 'kunci perangkat (hangus bersama tab ini)'
  if (!sum) {
    return `<aside class="note learn-id"><strong>Peserta:</strong> <code>${esc(addr)}</code> · ${esc(kind)}
      <p class="muted">${s.pending ? 'Menghubungi penerbit…' : esc(s.error ?? 'Rekaman di penerbit belum dibaca untuk kursus ini.')}</p>
      <div class="actions"><button data-action="learn-sync" data-course="${esc(courseId)}">Baca/mulai rekaman di penerbit</button>
      <button data-action="learner-forget">Ganti identitas</button></div>
      <details><summary>Pengaturan lanjutan penerbit</summary><p class="muted">${ep}</p></details></aside>`
  }
  const pct = sum.lessonsTotal ? Math.round((sum.lessonsCompleted / sum.lessonsTotal) * 100) : 0
  return `<aside class="note learn-id"><strong>Rekaman di penerbit</strong>
    <p>${sum.lessonsCompleted}/${sum.lessonsTotal} lesson selesai (${pct}%) ·
      ${sum.gradedAttempts} usaha dinilai · skor terbaik ${sum.bestScore ?? '—'} ·
      ${sum.allLessonsDone ? '<span class="tag ok">semua lesson selesai</span>' : '<span class="tag">belum selesai</span>'}</p>
    <p class="muted">Ini rekaman belajar di penerbit, bukan catatan pada perangkat ini.
      Peserta <code>${esc(addr)}</code> · ${esc(kind)} ·
      <button class="link" data-action="learn-sync" data-course="${esc(courseId)}">muat ulang</button>
      <button class="link" data-action="learner-forget">ganti identitas</button></p>
    <details><summary>Pengaturan lanjutan penerbit</summary><p class="muted">${ep}</p></details></aside>`
}

/** Status satu aksi belajar, dipakai tombol supaya kegagalan tidak hilang diam-diam. */
function learnStatus (root: HTMLElement, text: string, bad = false): void {
  const el = root.querySelector('[data-role="learn-status"]') as HTMLElement | null
  if (el) el.innerHTML = `<span class="${bad ? 'bad' : 'ok'}">${esc(text)}</span>`
}

/**
 * Tautan ke verifier. `?q=` dibaca halaman verifikasi saat boot (main.ts) dan `#/verify`
 * adalah rute Dave, jadi keduanya harus ikut — menaruh `#/verify` saja tidak mengisi inputnya.
 */
const verifyLink = (credentialHash: string) => `${location.pathname}?q=${encodeURIComponent(credentialHash)}#/verify`

/** Label jenis, dipakai di kartu lesson dan di navigasi antar-modul. */
const KIND_LABEL: Record<string, string> = {
  bacaan: 'bacaan',
  kuis: 'kuis',
  esai: 'esai dinilai agen',
  praktik: 'praktik',
  kasus: 'studi kasus',
  referensi: 'referensi',
}

function link(...parts: string[]): string {
  // Katalog = `#/learn`, BUKAN `#/courses`: yang terakhir itu halaman marketplace Dave.
  // Dua pemilik untuk satu rute adalah cara paling pasti untuk saling menimpa.
  const seg = parts.length ? parts : ['learn']
  return `#/${seg.map(encodeURIComponent).join('/')}`
}

function breadcrumb(trail: { label: string; href?: string }[]): string {
  const items = trail.map((t, i) =>
    t.href && i < trail.length - 1 ? `<a href="${t.href}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`,
  )
  return `<nav class="crumbs">${items.join(' <span class="sep">/</span> ')}</nav>`
}

/** Halaman tidak ada = halaman, bukan exception. Router tidak boleh diam-diam kembali ke katalog. */
function notFound(title: string, detail: string): string {
  return `${breadcrumb([{ label: 'Katalog', href: link() }, { label: title }])}
    <section class="card"><h2>${esc(title)}</h2><p class="muted">${esc(detail)}</p>
    <p><a class="btn" href="${link()}">Kembali ke katalog</a></p></section>`
}

// ------------------------------------------------------------------ balok isi

function renderBlock(b: Block): string {
  switch (b.t) {
    case 'p':
      return `<p>${esc(b.text)}</p>`
    case 'h':
      return `<h3>${esc(b.text)}</h3>`
    case 'ul':
      return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
    case 'ol':
      return `<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`
    case 'code':
      return `<pre><code>${esc(b.code)}</code></pre><p class="lang">${esc(b.lang)}</p>`
    case 'note':
      return `<aside class="note"><strong>Batasan yang perlu kamu tahu</strong><p>${esc(b.text)}</p></aside>`
    case 'quote':
      return `<blockquote>${esc(b.text)}<footer>${esc(b.source)}</footer></blockquote>`
    case 'terms':
      return `<dl class="terms">${b.items
        .map((i) => `<dt>${esc(i.term)}</dt><dd>${esc(i.def)}</dd>`)
        .join('')}</dl>`
    case 'links':
      return `<ul class="links">${b.items
        .map(
          (i) =>
            `<li><a href="${esc(i.url)}" rel="noopener noreferrer" target="_blank">${esc(i.label)}</a>` +
            `<span class="tag">${esc(i.kind)}</span></li>`,
        )
        .join('')}</ul>`
    case 'try':
      return `<aside class="try"><strong>Kerjakan</strong><p>${esc(b.prompt)}</p>` +
        (b.hint ? `<p class="muted">Petunjuk: ${esc(b.hint)}</p>` : '') +
        `</aside>`
  }
}

// ---------------------------------------------------------------- templat

function pageCatalog(): string {
  const s = catalogStats()
  const problems = auditAll()
  const cards = COURSES.map((c) => {
    const st = summarize(c.id, c.modules.flatMap((m) => m.lessons), c.weights)
    const next = c.modules.flatMap((m) => m.lessons).find((l) => !courseProgress(c.id)[l.slug]?.done)
    return `<article class="card course">
      <p class="eyebrow">${esc(c.level)} · ${c.modules.length} modul</p>
      <h3><a href="${link('course', c.id)}">${esc(c.title)}</a></h3>
      <p class="course-meta">${st.totalLessons} lesson · ±${Math.round(
        c.modules.flatMap((m) => m.lessons).reduce((a, l) => a + l.minutes, 0) / 60,
      )} jam</p>
      <p class="course-blurb">${esc(c.blurb)}</p>
      <div class="course-bottom">
        <div class="progress-label"><span>Di perangkat ini</span><strong>${st.doneLessons}/${st.totalLessons} lesson</strong></div>
        <div class="progress-line" role="progressbar" aria-label="Progres lokal ${esc(c.title)}" aria-valuenow="${st.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${st.pct}%"></span></div>
        <div class="course-links"><a class="btn primary-link" href="${link('course', c.id)}">Lihat kursus</a>
          ${next && st.doneLessons > 0 ? `<a class="text-link" href="${link('course', c.id, 'l', next.slug)}">Lanjut belajar →</a>` : ''}</div>
      </div>
    </article>`
  }).join('')

  return `<section class="learn-hero">
    <p class="eyebrow">RUANG BELAJAR LENCANA</p>
    <h2>Belajar sungguhan.<br><span>Bukti yang bisa diperiksa.</span></h2>
    <p>Jelajahi materi, kerjakan latihan, lalu lihat progresmu. Kredensial bukan hadiah otomatis:
      hanya penerbit yang dapat menilai dan menerbitkannya.</p>
    <a class="text-link" href="${link('me')}">Lihat My Learning →</a>
  </section>
  <div class="learn-section-head"><div><p class="eyebrow">KATALOG</p><h2>Pilih perjalananmu</h2></div>
    <span>${s.courses} kursus · ${s.lessons} lesson</span></div>
  <div class="grid course-grid">${cards}</div>
  <details class="learn-disclosure"><summary>Bagaimana progres dan kredensial bekerja?</summary>
    <p>Catatan di perangkat ini membantu kamu melanjutkan belajar, tetapi bukan bukti kelulusan.
      Setelah memilih identitas peserta, tindakan belajar juga dikirim ke penerbit; lihat statusnya
      di halaman kursus. Penerbitan kredensial, pembayaran, dan pendaftaran berbayar belum tersedia
      lewat halaman ini.</p>
    <p class="muted">Isi katalog: ${s.modules} modul · ${s.pages} halaman · ${s.quizQuestions} soal kuis ·
      ${s.essays} esai · ±${Math.round(s.minutes / 60)} jam.
      ${problems.length ? `<strong class="bad">Audit konten menemukan ${problems.length} masalah.</strong>` : 'Audit konten: tidak ada masalah terdeteksi.'}</p>
  </details>`
}

/**
 * Baris kelengkapan. Dulu berbunyi "mata penilai 100/100" dengan kolom "Status: siap diajukan" —
 * keduanya menyesatkan, karena 100 di situ berarti "setiap mata punya bukti", BUKAN "nilainya
 * cukup". Peserta berkuis 20 dan esai asal tulis akan membaca dirinya siap menerima ijazah.
 */
function completenessLine (st: CourseSummary, rubricRef: string): string {
  return `<p><strong>${st.doneLessons}/${st.totalLessons} lesson</strong> di perangkat ini ·
      rata-rata kuis ${st.quizAvg ?? '—'} · esai ${st.essayDrafted ? 'ada draf' : 'belum ada'} ·
      bukti untuk ${st.gradedWeights}/100 mata penilai</p>
    <p class="muted">${st.readyForCredential
      ? 'Buktinya lengkap — tapi <strong>belum ada nilai</strong>: angka akhir dihitung terhadap rubrik penerbit, bukan oleh halaman ini.'
      : 'Belum semua bukti terkumpul; hasil akhir belum dapat ditentukan di halaman ini.'}
      Rubrik versi <code>${esc(rubricRef)}</code> ikut tercetak ke dokumen kredensial saat terbit,
      jadi kebijakan itu tidak bisa kami ganti setelah ijazahmu ada.</p>`
}

function pageSyllabus(course: Course): string {
  const lessons = course.modules.flatMap((m) => m.lessons)
  const st = summarize(course.id, lessons, course.weights)
  const next = lessons.find((l) => !courseProgress(course.id)[l.slug]?.done)
  const manifest = manifestOf(course.id)
  const rubricRef = manifest ? shortHash(rubricHashOf(manifest)) : 'tanpa manifest'
  const mods = course.modules
    .map((m) => {
      const rows = m.lessons
        .map((l) => {
          const r = courseProgress(course.id)[l.slug]
          const mark = r?.done ? '✓' : '·'
          const score = typeof r?.score === 'number' ? ` <span class="tag">${r.score}</span>` : ''
          return `<li><a href="${link('course', course.id, 'l', l.slug)}">${esc(l.title)}</a>
            <span class="kind">${esc(KIND_LABEL[l.kind] ?? l.kind)}</span>
            <span class="min">${l.minutes}m</span>${score}
            <span class="done">${mark}</span></li>`
        })
        .join('')
      const done = m.lessons.filter((l) => courseProgress(course.id)[l.slug]?.done).length
      return `<section class="card module">
        <h3><a href="${link('course', course.id, 'm', m.id)}">Modul — ${esc(m.title)}</a>
          <span class="tag">${done}/${m.lessons.length}</span></h3>
        <p class="muted">${esc(m.blurb)}</p>
        <ul class="lessons">${rows}</ul>
      </section>`
    })
    .join('')

  return `${breadcrumb([{ label: 'Katalog', href: link() }, { label: course.title }])}
  <section class="card syllabus-head">
    <p class="eyebrow">KURSUS · ${esc(course.level)}</p>
    <h2>${esc(course.title)}</h2>
    <p class="course-meta">Oleh ${esc(course.institution)} · ${course.modules.length} modul · ${lessons.length} lesson</p>
    <p class="lede">${esc(course.blurb)}</p>
    <div class="actions syllabus-actions">
      <a class="btn primary-link" href="${next ? link('course', course.id, 'l', next.slug) : link('me')}">${next ? st.doneLessons ? 'Lanjutkan belajar' : 'Mulai belajar' : 'Lihat ringkasan belajar'} →</a>
      <a class="btn" href="${link('me')}">My Learning</a>
    </div>
    <div class="progress-label"><span>Progres di perangkat ini</span><strong>${st.doneLessons}/${st.totalLessons} lesson</strong></div>
    <div class="progress-line" role="progressbar" aria-label="Progres lokal kursus" aria-valuenow="${st.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${st.pct}%"></span></div>
    ${serverLine(course.id)}
    <p data-role="learn-status" class="muted"></p>
    <h3>Yang akan kamu kuasai</h3>
    <ul>${course.outcome.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    <details class="learn-disclosure"><summary>Detail penilaian dan kebijakan penerbit</summary>
    ${completenessLine(st, rubricRef)}
    <h3>Kebijakan penilaian penerbit</h3>
    <p>${esc(course.criteria)}</p>
    <p class="muted">Bobot: kuis ${course.weights.kuis}% · praktik ${course.weights.praktik}% ·
      esai ${course.weights.esai}%. Ambang lulus ${course.passMark}/100.
      Kredensial berlaku ${course.validDays} hari sejak diterbitkan.</p>
    ${course.prereqCourseId ? `<aside class="note"><strong>Prasyarat</strong>
      <p>Kredensial "${esc(course.prereqCourseId)}" harus sudah kamu punya. Di chain ini prasyarat
      ditegakkan kontrak: kredensial yang prasyaratnya sudah dicabut, kedaluwarsa, atau bukan
      milikmu akan DITOLAK saat penerbitan — bukan diam-diam diterima lalu diam-diam mati.</p></aside>` : ''}
    </details>
  </section>
  ${mods}`
}

function pageModule(course: Course, mod: Module): string {
  const cp = courseProgress(course.id)
  const done = mod.lessons.filter((l) => cp[l.slug]?.done).length
  return `${breadcrumb([
    { label: 'Katalog', href: link() },
    { label: course.title, href: link('course', course.id) },
    { label: mod.title },
  ])}
  <section class="card">
    <h2>${esc(mod.title)}</h2>
    <p class="muted">${esc(mod.blurb)}</p>
    <p><strong>${done}/${mod.lessons.length}</strong> lesson selesai di perangkat ini.</p>
    <ol class="lessons">${mod.lessons
      .map(
        (l) => `<li><a href="${link('course', course.id, 'l', l.slug)}">${esc(l.title)}</a>
          <span class="kind">${esc(KIND_LABEL[l.kind] ?? l.kind)}</span>
          <p class="muted">${esc(l.summary)}</p></li>`,
      )
      .join('')}</ol>
  </section>`
}

function quizHtml(lesson: Lesson, reveal: boolean): string {
  const q = lesson.quiz
  if (!q) return ''
  const rows = q.questions
    .map((item, qi) => {
      const opts = item.options
        .map(
          (o, oi) => `<label class="opt"><input type="radio" name="${esc(item.id)}" value="${oi}" ${
            reveal ? 'disabled' : ''
          }/><span>${esc(o)}</span></label>`,
        )
        .join('')
      const picked = reveal ? item.answer : -1
      const why = reveal ? `<p class="why"><strong>Kenapa.</strong> ${esc(item.why)}</p>` : ''
      return `<div class="question" data-answer="${picked}">
        <p class="q"><strong>${qi + 1}.</strong> ${esc(item.prompt)}</p>${opts}${why}</div>`
    })
    .join('')
  return `<section class="quiz" data-lesson="${esc(lesson.slug)}">
    <h3>Kuis — ${q.questions.length} soal, ambang ${q.passPct}%</h3>
    ${rows}
    <div class="actions">
      <button class="primary" data-action="grade" data-lesson="${esc(lesson.slug)}">Nilai jawabanku</button>
    </div>
    <p class="status" data-role="quiz-status" aria-live="polite"></p>
  </section>`
}

function essayHtml(course: Course, lesson: Lesson): string {
  const e = lesson.essay
  if (!e) return ''
  const saved = courseProgress(course.id)[lesson.slug]?.draft ?? ''
  return `<section class="essay">
    <h3>Tugas esai</h3>
    <p>${esc(e.prompt)}</p>
    <p class="muted">Minimal ${e.minWords} kata. Rubriknya dibuka di depan — penilaian yang rubriknya
    rahasia bukan penilaian, itu tebakan.</p>
    <textarea id="essay-draft" rows="12" spellcheck="true" placeholder="Tulis di sini. Draf disimpan di perangkat ini.">${esc(
      saved,
    )}</textarea>
    <p><span id="word-count">0</span> kata · target ${e.minWords}</p>
    <table class="rubric"><thead><tr><th>Kriteria</th><th>Bobot maks</th></tr></thead><tbody>
      ${e.rubric.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.max}</td></tr>`).join('')}
      <tr><th>Jumlah</th><th>${e.rubric.reduce((a, r) => a + r.max, 0)}</th></tr>
    </tbody></table>
    <h4>Yang tidak akan diterima</h4>
    <ul>${e.guidance.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
    <div class="actions">
      <button data-action="save-draft" data-course="${esc(course.id)}" data-lesson="${esc(lesson.slug)}">Simpan draf</button>
      <button class="primary" data-action="finish-essay" data-course="${esc(course.id)}" data-lesson="${esc(lesson.slug)}" data-min="${e.minWords}">Kirim esai untuk dinilai</button>
    </div>
    <p class="status" data-role="essay-status" aria-live="polite"></p>
    <aside class="note"><strong>Draf atau kiriman?</strong><p>"Simpan draf" hanya menyimpan di perangkat ini.
      "Kirim esai" memerlukan identitas peserta dan koneksi penerbit; status berhasil atau gagal
      akan tampil di atas. Menulis draf saja tidak berarti sudah dinilai.</p></aside>
  </section>`
}

function pageLesson(course: Course, mod: Module, lesson: Lesson, reveal: boolean): string {
  const idx = mod.lessons.findIndex((l) => l.slug === lesson.slug)
  const cp = courseProgress(course.id)
  const rec = cp[lesson.slug]
  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ m, l })))
  const pos = flat.findIndex((x) => x.l.slug === lesson.slug)
  const prev = pos > 0 ? flat[pos - 1] : undefined
  const next = pos >= 0 && pos < flat.length - 1 ? flat[pos + 1] : undefined
  const st = summarize(course.id, course.modules.flatMap((m) => m.lessons), course.weights)

  const ids = `<details class="ids"><summary>Bahan baku on-chain kursus ini</summary>
    <p><code>courseId</code> = keccak256("${esc(course.id)}") = <code>${esc(courseIdOf(course))}</code></p>
    <p><code>lessonId</code> lesson ini = <code>${esc(lessonIdOf(course, lesson))}</code></p>
    <p class="muted">Yang ditempel ke halaman verifikasi bukan id-id ini, tapi
    <code>credentialHash</code> yang diturunkan dari (address kamu, <code>courseId</code>).
    Karena itu bookmark demo aman lintas chain — dan karena itu alamat harus benar-benar kamu.</p>
  </details>`

  return `${breadcrumb([
    { label: 'Katalog', href: link() },
    { label: course.title, href: link('course', course.id) },
    { label: mod.title, href: link('course', course.id, 'm', mod.id) },
    { label: lesson.title },
  ])}
  <article class="card lesson">
    <header class="lesson-head">
      <p class="muted">${esc(mod.title)} · lesson ${idx + 1}/${mod.lessons.length} ·
        ${esc(KIND_LABEL[lesson.kind] ?? lesson.kind)} · ±${lesson.minutes} menit ·
        lesson ${pos + 1} dari ${flat.length}</p>
      <h2>${esc(lesson.title)}</h2>
      <p class="lede">${esc(lesson.summary)}</p>
      ${rec?.done ? '<p class="tag ok">Diselesaikan di perangkat ini</p>' : ''}
      ${typeof rec?.score === 'number' ? `<p class="tag">kuis terakhir: ${rec.score} · percobaan ${rec.attempts}</p>` : ''}
    </header>
    ${lesson.blocks.map(renderBlock).join('')}
    ${lesson.quiz ? quizHtml(lesson, reveal) : ''}
    ${lesson.essay ? essayHtml(course, lesson) : ''}
    ${lesson.kind === 'kuis' || lesson.kind === 'esai' ? '' : `
    <div class="actions">
      <button class="primary" data-action="mark-done" data-course="${esc(course.id)}" data-lesson="${esc(lesson.slug)}">Tandai selesai</button>
    </div>`}
    ${serverLine(course.id)}
    <p data-role="learn-status"></p>
    ${ids}
    <nav class="pager">
      ${prev ? `<a href="${link('course', course.id, 'l', prev.l.slug)}">← ${esc(prev.l.title)}</a>` : '<span></span>'}
      ${next ? `<a href="${link('course', course.id, 'l', next.l.slug)}">${esc(next.l.title)} →</a>` : `<a href="${link('me')}">Ringkasanku →</a>`}
    </nav>
    <p class="muted">Perangkat ini mencatat ${st.pct}% lesson dan bukti untuk ${st.gradedWeights}/100 mata
    penilai. Catatan lokal membantu melanjutkan belajar, tetapi bukan hasil penilaian penerbit
    atau kredensial yang sudah terbit.</p>
  </article>`
}

function pageMe(): string {
  const rows = COURSES.map((c) => {
    const st = summarize(c.id, c.modules.flatMap((m) => m.lessons), c.weights)
    const next = c.modules.flatMap((m) => m.lessons).find((l) => !courseProgress(c.id)[l.slug]?.done)
    const remote = snapshot().courseId === c.id ? snapshot().summary : null
    return `<article class="card learning-card">
      <div class="learning-card-top"><div><p class="eyebrow">${esc(c.level)}</p>
        <h3><a href="${link('course', c.id)}">${esc(c.title)}</a></h3></div>
        <strong class="learning-count">${st.pct}%</strong></div>
      <div class="progress-line" role="progressbar" aria-label="Progres lokal ${esc(c.title)}" aria-valuenow="${st.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${st.pct}%"></span></div>
      <p class="muted">Di perangkat ini: ${st.doneLessons}/${st.totalLessons} lesson · kuis rata-rata ${st.quizAvg ?? '—'} · ${st.essayDrafted ? 'ada draf esai' : 'belum ada draf esai'}</p>
      <p class="record-state">${remote ? `Di penerbit: ${remote.lessonsCompleted}/${remote.lessonsTotal} lesson selesai · ${remote.gradedAttempts} usaha dinilai.` : 'Rekaman penerbit belum dibaca untuk kursus ini.'}</p>
      <div class="course-links"><a class="btn primary-link" href="${next ? link('course', c.id, 'l', next.slug) : link('course', c.id)}">${next ? st.doneLessons ? 'Lanjutkan' : 'Mulai belajar' : 'Lihat kursus'} →</a>
        <button class="link" data-action="wipe" data-course="${esc(c.id)}">Hapus catatan lokal</button></div>
    </article>`
  }).join('')

  return `${breadcrumb([{ label: 'Katalog', href: link() }, { label: 'Saya' }])}
  <section class="learn-hero compact">
    <p class="eyebrow">MY LEARNING</p><h2>Perjalanan belajarmu.</h2>
    <p>Bedakan catatan di perangkat, rekaman penerbit, dan kredensial yang sudah terbit.
      Ketiganya bukan status yang sama.</p>
  </section>
  <div class="grid learning-grid">${rows}</div>
  <aside class="note"><strong>Belum ada tombol terbitkan otomatis</strong>
    <p>Rekaman belajar di penerbit perlu diperiksa dan dinilai sebelum penerbitan.
    Selesai membaca semua lesson atau mencapai 100% di perangkat ini tidak otomatis
    berarti lulus atau memiliki kredensial.</p></aside>
  <section class="card chain-card">
    <p class="eyebrow">BUKTI TERBIT</p><h3>Kredensial saya di chain</h3>
    <p class="muted">Dibaca dari kontrak resolver melalui RPC, bukan dari rekaman belajar penerbit.
    Alamat yang kamu masukkan dikirim ke penyedia RPC untuk pencarian ini.</p>
    <label>Address peserta
      <input id="me-address" spellcheck="false" placeholder="0x…" size="44" />
    </label>
    <div class="actions"><button class="primary" data-action="read-me">Baca dari chain</button></div>
    <p class="status" data-role="me-status" aria-live="polite"></p>
    <div data-role="me-out"></div>
  </section>`
}

// ------------------------------------------------------------------ pembacaan chain

async function readMyCredentials(addr: string): Promise<string> {
  if (!isAddress(addr)) {
    return '<p class="bad">Bukan address yang sah. Tempel alamat lengkap 42 karakter dengan checksum.</p>'
  }
  const ep = loadEndpoint()
  if (!isConfigured(ep)) {
    return '<p class="bad">Address resolver belum diisi. Isi di panel "Konfigurasi pembacaan" pada ' +
      'halaman verifier, lalu ulangi — daftar kosong yang datang dari konfigurasi kosong bukan hasil.</p>'
  }
  const client = makeClient(ep)
  try {
    const hashes = (await client.readContract({
      address: ep.resolver,
      abi: credentialResolverAbi,
      functionName: 'credentialsOf',
      args: [addr],
    })) as readonly `0x${string}`[]
    if (!hashes.length) {
      return `<p class="muted">Tidak ada kredensial pada chain untuk alamat ini. "Kosong" dan "gagal baca"
      sengaja dibedakan — kalau RPC yang bermasalah, yang muncul adalah pesan merah, bukan daftar kosong.</p>`
    }
    const rows = await Promise.all(
      hashes.slice(0, 24).map(async (h) => {
        const s = (await client.readContract({
          address: ep.resolver,
          abi: credentialResolverAbi,
          functionName: 'statusOf',
          args: [h],
        })) as readonly [boolean, boolean, boolean, boolean, string, bigint, bigint]
        const [exists, revoked, expired, delisted] = s
        const verdict = !exists ? 'tidak dikenal' : revoked ? 'DICABUT' : expired ? 'KEDALUWARSA' : delisted ? 'PENERBIT DITARIK' : 'BERLAKU'
        const q = verifyLink(h)
        return `<tr><td><a href="${q}">${h.slice(0, 12)}…</a></td><td>${esc(verdict)}</td></tr>`
      }),
    )
    return `<table><thead><tr><th>Kredensial</th><th>Status di chain</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      <p class="muted">${hashes.length} kredensial${hashes.length > 24 ? ` · 24 pertama ditampilkan` : ''}. Tiap baris bisa dibuka di verifier.</p>`
  } catch (err) {
    return `<p class="bad">GAGAL membaca chain: ${esc(err instanceof Error ? err.message : String(err))}
    <br />Ini bukan "kamu tidak punya apa-apa": ini pembacaan yang gagal. Bedanya penting.</p>`
  }
}

// ------------------------------------------------------------------------- router

function parse(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
}

function currentLesson(): { course: Course; mod: Module; lesson: Lesson } | undefined {
  const seg = parse(location.hash)
  if (seg[0] !== 'course') return undefined
  const course = findCourse(seg[1])
  if (!course) return undefined
  if (seg[2] === 'l') {
    const found = findLesson(course, seg[3])
    if (found) return { course, mod: found.module, lesson: found.lesson }
  }
  return undefined
}

/** Tempat lapisan materi menggambar: satu div di dalam halaman courses milik Dave. */
function getMount (): HTMLElement | null {
  return document.getElementById('lms-mount')
}

function isLmsRoute (hash: string): boolean {
  return hash === '#/learn' || hash === '#/me' || hash.startsWith('#/course/')
}

/**
 * Baca state penerbit begitu halaman kursus dibuka — tanpa menunggu klik. Render pertama tetap
 * sinkron (halaman tidak pernah menunggu jaringan), hasilnya masuk lewat `rerender()` setelah
 * menjawab. Kalau penerbit mati, yang terjadi cuma baris "Rekaman di penerbit" tetap kosong:
 * halaman tidak pernah menampilkan angka server yang tidak ada.
 */
function kickSync (courseId: string): void {
  if (!learnerAddress()) return
  if (snapshot().courseId === courseId && snapshot().summary) return
  void syncCourse(courseId).then((sum) => { if (sum) rerender() })
}

let delegated = false

/**
 * Dipanggil `handleRoute()` di main.ts pada SETIAP perpindahan rute. Fungsi ini tahu sendiri
 * apakah rute itu miliknya: kalau bukan, mount dibersihkan dan halaman Dave dibiarkan apa adanya.
 * Itu yang membuat dua lapis frontend bisa hidup di satu aplikasi tanpa saling menimpa.
 */
export function renderLmsRoute (): boolean {
  const mount = getMount()
  if (!mount) return false

  const hash = (location.hash || '#/').toLowerCase().split('?')[0]
  if (isLmsRoute(hash) && !hasExplicitLearnerSession()) {
    mount.innerHTML = ''
    delete document.body.dataset.lmsRoute
    window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}#/`)
    return true
  }
  if (!isLmsRoute(hash)) {
    mount.innerHTML = ''
    delete document.body.dataset.lmsRoute
    return false
  }

  if (!delegated) {
    bindLms(mount)
    delegated = true
  }
  document.body.dataset.lmsRoute = 'active'

  const seg = parse(hash)
  if (seg[0] === 'learn') {
    mount.innerHTML = pageCatalog()
    return true
  }
  if (seg[0] === 'me') {
    mount.innerHTML = pageMe()
    return true
  }
  if (seg[0] === 'course') {
    const course = findCourse(seg[1])
    if (!course) {
      mount.innerHTML = notFound('Kursus tidak ditemukan', `Id "${seg[1] ?? '(kosong)'}" tidak ada di katalog. Yang tersedia: ${COURSES.map((c) => c.id).join(', ')}.`)
      return true
    }
    if (seg.length === 2) {
      mount.innerHTML = pageSyllabus(course)
      kickSync(course.id)
      return true
    }
    if (seg[2] === 'm') {
      const mod = moduleOf(course, seg[3])
      mount.innerHTML = mod
        ? pageModule(course, mod)
        : notFound('Modul tidak ditemukan', `Modul "${seg[3]}" bukan bagian dari ${course.id}.`)
      kickSync(course.id)
      return true
    }
    if (seg[2] === 'l') {
      const found = findLesson(course, seg[3])
      if (!found) {
        mount.innerHTML = notFound('Lesson tidak ditemukan', `Lesson "${seg[3]}" bukan bagian dari ${course.id}. Route lengkapnya #/course/${course.id}/l/<slug>.`)
        return true
      }
      mount.innerHTML = pageLesson(course, found.module, found.lesson, false)
      startWordCount()
      kickSync(course.id)
      return true
    }
  }
  mount.innerHTML = notFound('Rute tidak dikenal', `Yang dikenal: #/learn · #/course/<kursus> · #/course/<kursus>/m/<modul> · #/course/<kursus>/l/<lesson> · #/me`)
  return true
}

// ------------------------------------------------------------------------ interaksi

function startWordCount(): void {
  const ta = document.getElementById('essay-draft') as HTMLTextAreaElement | null
  const out = document.getElementById('word-count')
  if (!ta || !out) return
  const count = () => {
    out.textContent = String(ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0)
  }
  ta.addEventListener('input', count)
  count()
}

function rerender(): void {
  renderLmsRoute()
}

export function bindLms(root: HTMLElement): void {
  root.addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement | null)?.closest?.('[data-action]') as HTMLElement | null
    if (!btn) return
    const action = btn.dataset.action
    const courseId = btn.dataset.course ?? ''
    const slug = btn.dataset.lesson ?? ''
    const status = (role: string) => root.querySelector(`[data-role="${role}"]`) as HTMLElement | null

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
      window.dispatchEvent(new CustomEvent('lencana:open-privy', { detail: { courseId: courseId || COURSES[0]?.id || '' } }))
      return
    }

    if (action === 'learner-wallet') {
      const r = await connectWalletLearner()
      if (!r.ok) { learnStatus(root, r.why ?? 'dompet menolak', true); return }
      const cid = courseId || COURSES[0]?.id || ''
      await syncCourse(cid)
      rerender()
      return
    }

    if (action === 'learner-forget') {
      const ep = root.querySelector('[data-role="signer-endpoint"]') as HTMLInputElement | null
      forgetLearner()
      if (ep?.value) setEndpoint(ep.value)
      rerender()
      return
    }

    if (action === 'learn-sync') {
      const ep = root.querySelector('[data-role="signer-endpoint"]') as HTMLInputElement | null
      if (ep?.value) setEndpoint(ep.value)
      const cid = courseId || COURSES[0]?.id || ''
      learnStatus(root, 'Menghubungi penerbit…')
      const sum = await syncCourse(cid)
      learnStatus(root, sum ? `Rekaman terbaca: ${sum.lessonsCompleted}/${sum.lessonsTotal} lesson, ${sum.gradedAttempts} usaha dinilai.`
        : snapshot().error ?? 'Penerbit tidak menjawab.', !sum)
      rerender()
      return
    }

    if (action === 'mark-done') {
      const lesson = currentLesson()
      if (!lesson) return
      const flat = lesson.course.modules.flatMap((m) => m.lessons)
      recordLesson(courseId, slug, lesson.lesson.kind, { done: true })
      // Cache lokal dulu (halaman tidak boleh buta saat jaringan mati), lalu state yang sebenarnya
      // dibaca penerbit. Kalau yang kedua gagal, pesertanya harus tahu — bukan mengira sudah
      // tercatat hanya karena tombolnya sudah diklik.
      let message = 'Selesai di perangkat ini saja. Hubungkan identitas agar rekaman tersimpan di penerbit.'
      let failed = false
      if (learnerAddress()) {
        learnStatus(root, 'Mencatat ke penerbit…')
        const r = await completeLesson(courseId, slug, flat.findIndex((l) => l.slug === slug))
        message = r.ok ? 'Lesson tercatat di penerbit.'
          : `Di perangkat tercatat, tetapi di penerbit belum: ${r.why ?? 'tidak diketahui'}`
        failed = !r.ok
      }
      rerender()
      learnStatus(root, message, failed)
      return
    }

    if (action === 'grade') {
      const lesson = currentLesson()
      if (!lesson || !lesson.lesson.quiz) return
      const q = lesson.lesson.quiz
      const picks: { itemId: string, choice: number }[] = []
      let answered = 0
      for (const item of q.questions) {
        const picked = root.querySelector(`input[name="${item.id}"]:checked`) as HTMLInputElement | null
        if (!picked) continue
        answered += 1
        picks.push({ itemId: item.id, choice: Number(picked.value) })
      }
      const s = status('quiz-status')
      if (answered < q.questions.length) {
        if (s) s.innerHTML = `<span class="bad">${answered}/${q.questions.length} soal dijawab — server menolak sebagian, jadi jawab dulu semuanya.</span>`
        return
      }
      if (!learnerAddress()) {
        if (s) s.innerHTML = '<span class="bad">Belum ada identitas peserta: tanpa tanda tangan, tidak ada nilai yang bisa dicatat di penerbit. Buat identitas di kotak "Rekaman belajar" lebih dulu.</span>'
        return
      }
      const ep = root.querySelector('[data-role="signer-endpoint"]') as HTMLInputElement | null
      if (ep?.value) setEndpoint(ep.value)
      const graded = await submitQuiz(courseId, slug, picks)
      if (!graded) {
        // Jujur soal kegagalan: angka browser TIDAK kita pakai sebagai pengganti, karena itu
        // persis yang dihapus (peserta menilai dirinya sendiri). Yang kita tampilkan adalah sebabnya.
        if (s) s.innerHTML = `<span class="bad">Penerbit tidak menilai: ${esc(snapshot().error ?? 'tidak menjawab')} — tidak ada angka yang kami karang sendiri.</span>`
        return
      }
      // Cache lokal hanya salinan dari angka SERVER (graded.score), bukan hitungan browser lagi.
      const prev = courseProgress(courseId)[slug]
      const best = Math.max(graded.score, prev?.score ?? 0)
      recordLesson(courseId, slug, 'kuis', { done: graded.verdict === 'pass', score: best, attempts: (prev?.attempts ?? 0) + 1 })
      const resultHtml = `<span class="${graded.verdict === 'pass' ? 'ok' : 'bad'}">Dinilai penerbit: ${graded.correct}/${graded.total} benar = ${graded.score} · terbaik ${best} · ambang ${graded.passPct} · ${
          graded.verdict === 'pass' ? 'cukup' : 'belum cukup, baca lagi alasannya lalu ulangi'
        }<br><span class="muted">Usaha ini tercatat di penerbit · referensi <code>${esc(graded.attemptHash.slice(0, 18))}…</code></span></span>`
      // Reveal dipasang ulang lewat render supaya alasan tiap soal ikut muncul.
      const host = getMount()
      if (host) {
        host.innerHTML = pageLesson(lesson.course, lesson.mod, lesson.lesson, true)
        startWordCount()
        const visibleStatus = status('quiz-status')
        if (visibleStatus) visibleStatus.innerHTML = resultHtml
      }
      return
    }

    if (action === 'save-draft') {
      const ta = document.getElementById('essay-draft') as HTMLTextAreaElement | null
      const lesson = currentLesson()
      if (!ta || !lesson) return
      recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
      const s = status('essay-status')
      if (s) s.textContent = 'Draf disimpan di perangkat ini.'
      return
    }

    if (action === 'finish-essay') {
      const ta = document.getElementById('essay-draft') as HTMLTextAreaElement | null
      const lesson = currentLesson()
      if (!ta || !lesson) return
      const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0
      const min = Number(btn.dataset.min ?? 0)
      const s = status('essay-status')
      if (words < min) {
        if (s) s.innerHTML = `<span class="bad">Baru ${words} kata, syarat ${min}. Batas ini ada supaya jawabannya tidak selesai dalam tiga kalimat.</span>`
        return
      }
      // B81: karangan DISERAHKAN ke penerbit, bukan cuma dicentang di perangkat. Yang balik dari
      // server tidak ada angkanya — `state: awaiting_judge`, dan itu harus terbaca sebagai antrean,
      // bukan sebagai kelulusan maupun kegagalan.
      if (learnerAddress()) {
        const ep = root.querySelector('[data-role="signer-endpoint"]') as HTMLInputElement | null
        if (ep?.value) setEndpoint(ep.value)
        if (s) s.innerHTML = '<span class="muted">Mengirim karangan ke penerbit…</span>'
        const rec = await submitEssay(courseId, slug, ta.value)
        if (rec) {
          recordLesson(courseId, slug, 'esai', { done: true, draft: ta.value })
          rerender()
          const visibleStatus = status('essay-status')
          if (visibleStatus) visibleStatus.innerHTML = `<span class="ok">Terkirim ke penerbit</span> ${rec.mechanicalPassed}/${rec.mechanicalTotal} tanda mekanis terpenuhi · ${rec.words} kata · <code>${esc(rec.attemptHash.slice(0, 14))}…</code><br><span class="muted">${esc(rec.note || 'Menunggu penilaian penerbit — belum ada angka, dan itu bukan nol.')}</span>`
          return
        }
        const why = snapshot().error ?? 'penerbit tidak menjawab'
        if (s) s.innerHTML = `<span class="bad">Karangan TIDAK sampai ke penerbit: ${esc(why)}</span><br><span class="muted">Drafmu tetap disimpan di perangkat ini; tanpa baris penyerahan, tidak ada yang bisa dinilai — dan tidak ada angka yang kami karang sendiri.</span>`
        recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
        return
      }
      recordLesson(courseId, slug, 'esai', { done: false, draft: ta.value })
      if (s) s.textContent = 'Dicatat di perangkat ini saja: belum ada identitas peserta, jadi karangan tidak diserahkan ke penerbit dan tidak akan ikut dinilai.'
    }

    if (action === 'wipe') {
      const course = findCourse(courseId)
      if (!window.confirm(`Hapus catatan belajar lokal untuk ${course?.title ?? 'kursus ini'}? Rekaman di penerbit dan kredensial di chain tidak ikut terhapus.`)) return
      wipeCourse(courseId)
      rerender()
      return
    }

    if (action === 'read-me') {
      const input = document.getElementById('me-address') as HTMLInputElement | null
      const outEl = status('me-out')
      const s = status('me-status')
      if (!input || !outEl) return
      outEl.innerHTML = ''
      if (s) s.textContent = 'Membaca chain…'
      outEl.innerHTML = await readMyCredentials(input.value.trim())
      if (s) s.textContent = ''
      return
    }
  })
}

export { KIND_LABEL, LESSON_KINDS }
export type { CourseSummary }
