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
    return `<article class="card course">
      <h3><a href="${link('course', c.id)}">${esc(c.title)}</a></h3>
      <p class="muted">${esc(c.level)} · ${c.modules.length} modul · ${st.totalLessons} lesson · ±${Math.round(
        c.modules.flatMap((m) => m.lessons).reduce((a, l) => a + l.minutes, 0) / 60,
      )} jam</p>
      <p>${esc(c.blurb)}</p>
      <p class="progress-line"><span style="width:${st.pct}%"></span></p>
      <p class="muted">Progres perangkat ini: ${st.doneLessons}/${st.totalLessons} lesson (${st.pct}%)</p>
      ${c.prereqCourseId ? `<p class="tag">prasyarat: ${esc(c.prereqCourseId)}</p>` : ''}
    </article>`
  }).join('')

  return `<section class="hero">
    <h2>Belajar, lalu buktikan</h2>
    <p class="lede">Kamu membaca materinya di sini. Kelulusannya diterbitkan penerbit sebagai dokumen
    yang bisa diperiksa orang lain <em>tanpa perlu mempercayai halaman ini</em>. Itu bedanya, dan itu
    yang modul terakhir kursus ini latih ke kamu.</p>
    <p class="muted">${s.courses} kursus · ${s.modules} modul · ${s.lessons} lesson · ${s.pages} halaman ·
    ${s.quizQuestions} soal kuis · ${s.essays} esai dinilai rubrik · ±${Math.round(s.minutes / 60)} jam.
    Angka ini dihitung dari datanya, dan diaudit <code>npm run probe</code>${
      problems.length ? ` — <strong class="bad">${problems.length} masalah ditemukan</strong>` : ' — 0 masalah'
    }.</p>
  </section>
  <div class="grid">${cards}</div>
  <section class="card"><h3>Sebelum mulai</h3>
    <ul>${[
      'Kamu tidak perlu wallet untuk belajar. Kamu perlu wallet untuk MENERBITkan kredensial atas namamu.',
      'Progres disimpan di perangkat ini saja. Ganti laptop, progres hilang — dan itu memang bukan bukti.',
      'Yang naik ke chain hanya pernyataan kelulusan dari penerbit. Tidak ada nama, tidak ada nilai mentah.',
    ]
      .map((t) => `<li>${esc(t)}</li>`)
      .join('')}</ul>
  </section>`
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
      : 'Belum lengkap — belum ada yang bisa dinilai.'}
      Rubrik versi <code>${esc(rubricRef)}</code> ikut tercetak ke dokumen kredensial saat terbit,
      jadi kebijakan itu tidak bisa kami ganti setelah ijazahmu ada.</p>`
}

function pageSyllabus(course: Course): string {
  const lessons = course.modules.flatMap((m) => m.lessons)
  const st = summarize(course.id, lessons, course.weights)
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
  <section class="card">
    <h2>${esc(course.title)}</h2>
    <p class="muted">${esc(course.institution)}</p>
    <p>${esc(course.blurb)}</p>
    <p class="progress-line"><span style="width:${st.pct}%"></span></p>
    ${completenessLine(st, rubricRef)}
    <h3>Kamu akan bisa</h3>
    <ul>${course.outcome.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    <h3>Kebijakan penilaian penerbit</h3>
    <p>${esc(course.criteria)}</p>
    <p class="muted">Bobot: kuis ${course.weights.kuis}% · praktik ${course.weights.praktik}% ·
      esai ${course.weights.esai}%. Ambang lulus ${course.passMark}/100.
      Kredensial berlaku ${course.validDays} hari sejak diterbitkan.</p>
    ${course.prereqCourseId ? `<aside class="note"><strong>Prasyarat</strong>
      <p>Kredensial "${esc(course.prereqCourseId)}" harus sudah kamu punya. Di chain ini prasyarat
      ditegakkan kontrak: kredensial yang prasyaratnya sudah dicabut, kedaluwarsa, atau bukan
      milikmu akan DITOLAK saat penerbitan — bukan diam-diam diterima lalu diam-diam mati.</p></aside>` : ''}
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
      <button class="primary" data-action="finish-essay" data-course="${esc(course.id)}" data-lesson="${esc(lesson.slug)}" data-min="${e.minWords}">Tandai selesai</button>
    </div>
    <p class="status" data-role="essay-status" aria-live="polite"></p>
    <aside class="note"><strong>Status esai</strong><p>Ini draf lokal. Nilai resminya keluar dari agen
    penerbit setelah kamu mengirimnya — dan pada saat ini sistem belum mengirim ke mana-mana, jadi
    kata "terkirim" di halaman ini belum berlaku.</p></aside>
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
    ${ids}
    <nav class="pager">
      ${prev ? `<a href="${link('course', course.id, 'l', prev.l.slug)}">← ${esc(prev.l.title)}</a>` : '<span></span>'}
      ${next ? `<a href="${link('course', course.id, 'l', next.l.slug)}">${esc(next.l.title)} →</a>` : `<a href="${link('me')}">Ringkasanku →</a>`}
    </nav>
    <p class="muted">Perangkat ini mencatat ${st.pct}% lesson dan bukti untuk ${st.gradedWeights}/100 mata
    penilai. Angkanya milik localStorage kamu dan bukan bukti apa pun — yang bernilai hanya
    pernyataan penerbit di chain.</p>
  </article>`
}

function pageMe(): string {
  const rows = COURSES.map((c) => {
    const st = summarize(c.id, c.modules.flatMap((m) => m.lessons), c.weights)
    return `<tr><td><a href="${link('course', c.id)}">${esc(c.title)}</a></td>
      <td>${st.doneLessons}/${st.totalLessons}</td>
      <td>${st.quizAvg ?? '—'}</td>
      <td>${st.essayDrafted ? 'ada draf' : '—'}</td>
      <td>${st.gradedWeights}/100</td>
      <td>${st.readyForCredential ? 'bukti lengkap, belum dinilai' : 'belum lengkap'}</td>
      <td><button data-action="wipe" data-course="${esc(c.id)}">hapus</button></td></tr>`
  }).join('')

  return `${breadcrumb([{ label: 'Katalog', href: link() }, { label: 'Saya' }])}
  <section class="card">
    <h2>Progres di perangkat ini</h2>
    <table><thead><tr><th>Kursus</th><th>Lesson</th><th>Kuis</th><th>Esai</th><th>Bukti</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
    <aside class="note"><strong>Kenapa belum ada tombol "ajukan"</strong>
      <p>Menyerahkan hasil belajar ke chain adalah tindakan penerbit, bukan tombol di halaman bacaan.
      Yang bisa kami lakukan dari sini: memastikan kolom "Bukti" penuh, lalu memberi alamatmu ke
      jalur penerbitan. Kolom itu juga yang akan ditanya lebih dulu waktu itu.</p></aside>
  </section>
  <section class="card">
    <h3>Kredensial saya di chain</h3>
    <p class="muted">Dibaca langsung dari <code>credentialsOf(address)</code> pada resolver — tanpa backend kami.
    Address kamu tidak dikirim ke mana-mana.</p>
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
      return true
    }
    if (seg[2] === 'm') {
      const mod = moduleOf(course, seg[3])
      mount.innerHTML = mod
        ? pageModule(course, mod)
        : notFound('Modul tidak ditemukan', `Modul "${seg[3]}" bukan bagian dari ${course.id}.`)
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

    if (action === 'mark-done') {
      const lesson = currentLesson()
      if (!lesson) return
      recordLesson(courseId, slug, lesson.lesson.kind, { done: true })
      rerender()
      return
    }

    if (action === 'grade') {
      const lesson = currentLesson()
      if (!lesson || !lesson.lesson.quiz) return
      const q = lesson.lesson.quiz
      let correct = 0
      let answered = 0
      for (const item of q.questions) {
        const picked = root.querySelector(`input[name="${item.id}"]:checked`) as HTMLInputElement | null
        if (!picked) continue
        answered += 1
        if (Number(picked.value) === item.answer) correct += 1
      }
      if (answered < q.questions.length) {
        const s = status('quiz-status')
        if (s) s.innerHTML = `<span class="bad">${answered}/${q.questions.length} soal dijawab — yang kosong dihitung salah, jadi jawab dulu semuanya.</span>`
        return
      }
      const score = Math.round((correct / q.questions.length) * 100)
      const prev = courseProgress(courseId)[slug]
      const best = Math.max(score, prev?.score ?? 0)
      recordLesson(courseId, slug, 'kuis', { done: score >= q.passPct, score: best, attempts: (prev?.attempts ?? 0) + 1 })
      const s = status('quiz-status')
      if (s) {
        s.innerHTML = `<span class="${score >= q.passPct ? 'ok' : 'bad'}">${correct}/${q.questions.length} benar = ${score} · terbaik ${best} · ambang ${q.passPct} · ${
          score >= q.passPct ? 'cukup' : 'belum cukup, baca lagi alasannya lalu ulangi'
        }</span>`
      }
      // Reveal dipasang ulang lewat render supaya alasan tiap soal ikut muncul.
      const host = getMount()
      if (host) {
        host.innerHTML = pageLesson(lesson.course, lesson.mod, lesson.lesson, true)
        startWordCount()
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
      recordLesson(courseId, slug, 'esai', { done: true, draft: ta.value })
      if (s) s.textContent = 'Dicatat di perangkat ini: selesai menulis. Nilai resmi tetap dari penerbit.'
      return
    }

    if (action === 'wipe') {
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
