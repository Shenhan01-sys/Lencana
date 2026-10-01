/**
 * `lesson-views.ts` — templat HTML lapisan belajar, DIPINDAH dari `lms.ts` (1 Okt malam, FE7).
 *
 * Kenapa berkas ini ada: builder memilih "port ke core" untuk cabang `dex/lencana-ui` — cangkang kelas
 * dan landing milik FE dipakai, tapi isi dan perilakunya tetap milik lapisan belajar (FE4). Templat di
 * bawah adalah potongan `lms.ts` yang disalin baris demi baris oleh skrip, bukan diketik ulang, supaya
 * yang sudah teruji tidak berubah diam-diam:
 *  - kuis: pilihan dikirim ke `POST /grade`; pembahasan (benar/salah + alasan) datang dari balasan
 *    server, opsi yang benar tidak pernah ditandai, dan kunci tidak ada di bundel (B80/D56);
 *  - esai: diserahkan tanpa angka dan masuk antrean penerbit (B81);
 *  - kotak identitas + "Rekaman di penerbit": angka server dan angka perangkat dibedakan (B58/B72),
 *    login email lewat modal masuk (B82).
 * Yang berubah hanya tujuan tautan: `link()` di bawah memetakan rute lama ke `#/class/…`.
 * Berkas ini tidak menyentuh DOM saat dimuat; `location` hanya dibaca ketika fungsi dipanggil.
 */

// Lencana-B58 status=SELESAI 2026-09-29 — Ini yang menentukan urutan kerja front-end. Kalau FE dibangun lebih dulu, FE menyimpan state yang tidak dimiliki core — dan di produk yang menjual "bukti tidak bisa dik Buktikan ulang: npm run verify:attempts:live. JANGAN dibalik/diulang tanpa membuka kembali baris B58 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { isAddress } from 'viem'
import { credentialResolverAbi } from './abi'
import { isConfigured, loadEndpoint } from './config'
import { makeClient } from './verify'
import { esc } from './render'
import { courseIdOf, lessonIdOf, type Block, type Course, type Lesson } from './content'
import { COURSES, findCourse, findLesson } from './courses/index'
import { courseProgress, summarize, type CourseSummary } from './progress'
import { endpoint, learnerAddress, snapshot, type LearnerIdentity, type QuizReviewItem } from './learning'

/** Pembahasan satu penyerahan kuis: pilihan peserta + umpan balik server (B80). */
export type QuizReview = { picks: Map<string, number>, items: QuizReviewItem[] }

// ------------------------------------------------------------------ rute kelas

/** `#/class/<kursus>` atau `#/class/<kursus>/<modul>/<lesson>`. */
export function classLink (courseId?: string, moduleId?: string, lessonSlug?: string): string {
  if (!courseId) return '#catalog'
  const seg = ['class', courseId, ...(moduleId && lessonSlug ? [moduleId, lessonSlug] : [])]
  return `#/${seg.map(encodeURIComponent).join('/')}`
}

/** Tautan ke satu lesson: modulnya dicari dari katalog, bukan ditebak dari URL. */
export function lessonLink (course: Course, slug: string): string {
  const found = findLesson(course, slug)
  return found ? classLink(course.id, found.module.id, slug) : classLink(course.id)
}

/**
 * Rute lama lapisan belajar → rute kelas. `#/course/<id>/l/<slug>` menunjuk lesson yang SAMA (cabang
 * FE memetakannya ke modul bernama "l", jadi tautan lama ke lesson rusak); `#/learn` → kelas pertama,
 * seperti nav FE. null = bukan rute lama.
 */
export function legacyLearnRoute (hash: string): string | null {
  const seg = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (seg[0] === 'learn' && seg.length === 1) return classLink(COURSES[0]?.id)
  if (seg[0] !== 'course') return null
  const course = findCourse(seg[1])
  if (!course) return '#catalog'
  if (seg[2] === 'l' && seg[3]) return lessonLink(course, seg[3])
  return classLink(course.id)
}

/** Pemetaan pemanggil lama `link('course', id, 'l', slug)` dst. ke rute kelas — templat di bawah tetap utuh. */
function link (...parts: string[]): string {
  if (!parts.length) return '#catalog'
  if (parts[0] === 'me') return '#/me'
  const course = findCourse(parts[1])
  if (parts[0] !== 'course' || !course) return '#catalog'
  if (parts[2] === 'l' && parts[3]) return lessonLink(course, parts[3])
  return classLink(course.id)
}

/** Bahan baku on-chain lesson ini (dulu bagian `pageLesson` di `lms.ts`). */
export function idsHtml (course: Course, lesson: Lesson): string {
  return `<details class="ids"><summary>Bahan baku on-chain kursus ini</summary>
    <p><code>courseId</code> = keccak256("${esc(course.id)}") = <code>${esc(courseIdOf(course))}</code></p>
    <p><code>lessonId</code> lesson ini = <code>${esc(lessonIdOf(course, lesson))}</code></p>
    <p class="muted">Yang ditempel ke halaman verifikasi bukan id-id ini, tapi
    <code>credentialHash</code> yang diturunkan dari (address kamu, <code>courseId</code>).
    Karena itu bookmark demo aman lintas chain — dan karena itu alamat harus benar-benar kamu.</p>
  </details>`
}

// ------------------------------------------------------------------ disalin dari lms.ts (verbatim)

/**
 * Baris state yang DIPERCAYAI: milik penerbit di Postgres, bukan milik browser.
 *
 * Dua baris angka bisa hidup berdampingan dengan sengaja — yang satu "di perangkat ini" (cache,
 * bisa hilang, bukan bukti), yang satu "di penerbit" (rekaman yang dibaca `issue --from-attempts`).
 * Menyembunyikan yang pertama akan membuat halaman lebih bersih dan lebih sulit dipahami: peserta
 * perlu tahu angka mana yang tidak punya konsekuensi.
 */
/**
 * Label jenis identitas. Login email menyebut dua hal yang memang beda dari dua jalur lain: alamatnya
 * sama di perangkat mana pun, dan apakah penerbit sudah mencatat ikatan akunnya (`POST /auth/privy`).
 */
export function identityLabel (id: LearnerIdentity | null): string {
  if (id?.kind === 'privy') {
    const acc = snapshot().account
    const link = acc ? (acc.linked ? ' · tertaut di penerbit' : ` · ikatan akun belum tercatat (${acc.note})`) : ''
    return `akun${id.email ? ` ${id.email}` : ''} · dompet belajar yang sama di perangkat mana pun${link}`
  }
  return id?.kind === 'dompet' ? 'dompet' : 'kunci perangkat (hangus bersama tab ini)'
}

export function serverLine (courseId: string): string {
  const s = snapshot()
  const addr = learnerAddress()
  const ep = `<input id="signer-endpoint" class="ep" data-role="signer-endpoint" value="${esc(endpoint())}" aria-label="URL penerbit">`
  if (!addr && s.restoring) {
    return `<aside class="note learn-id"><strong>Memulihkan login email…</strong>
      <p class="muted">Peramban ini pernah masuk dengan email; dompet tertanamnya sedang disambungkan lagi.</p></aside>`
  }
  if (!addr) {
    // Lencana-B82 status=TERBUKA 2026-10-01 — kotak identitas: tombol "Masuk" membuka dialog masuk (pages/login.ts), yang memakai alur sungguhan learning.ts (Google bila aktif, atau kode dari kotak masuk → dompet tertanam yang sama di perangkat mana pun); sejak D59 kunci perangkat dan dompet ekstensi tidak lagi ditawarkan. Yang belum: uji dua peramban oleh builder. Buktikan ulang: npm run verify:privy (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
    return `<aside class="note learn-id">
      <strong>Masuk untuk menyimpan rekaman belajar</strong>
      <p>Jawaban, progres, dan bukti belajarmu tercatat di penerbit atas nama akunmu.</p>
      <div class="actions">
        <button class="primary" data-action="learner-privy" data-course="${esc(courseId)}">Masuk</button>
      </div>
      <details><summary>Pengaturan lanjutan penerbit</summary><p class="muted">${ep} · ubah kalau penerbitmu berjalan di tempat lain, lalu muat ulang.</p></details>
    </aside>`
  }
  const sum = s.summary && s.courseId === courseId ? s.summary : null
  const kind = identityLabel(s.identity)
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
export function learnStatus (root: HTMLElement, text: string, bad = false): void {
  const el = root.querySelector('[data-role="learn-status"]') as HTMLElement | null
  if (el) el.innerHTML = `<span class="${bad ? 'bad' : 'ok'}">${esc(text)}</span>`
}

/**
 * Tautan ke verifier. `?q=` dibaca halaman verifikasi saat boot (main.ts) dan `#/verify`
 * adalah rute Dave, jadi keduanya harus ikut — menaruh `#/verify` saja tidak mengisi inputnya.
 */
export const verifyLink = (credentialHash: string) => `${location.pathname}?q=${encodeURIComponent(credentialHash)}#/verify`

/** Label jenis, dipakai di kartu lesson dan di navigasi antar-modul. */
export const KIND_LABEL: Record<string, string> = {
  bacaan: 'bacaan',
  kuis: 'kuis',
  esai: 'esai dinilai agen',
  praktik: 'praktik',
  kasus: 'studi kasus',
  referensi: 'referensi',
}

function breadcrumb(trail: { label: string; href?: string }[]): string {
  const items = trail.map((t, i) =>
    t.href && i < trail.length - 1 ? `<a href="${t.href}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`,
  )
  return `<nav class="crumbs">${items.join(' <span class="sep">/</span> ')}</nav>`
}

export function renderBlock(b: Block): string {
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

/**
 * Baris kelengkapan. Dulu berbunyi "mata penilai 100/100" dengan kolom "Status: siap diajukan" —
 * keduanya menyesatkan, karena 100 di situ berarti "setiap mata punya bukti", BUKAN "nilainya
 * cukup". Peserta berkuis 20 dan esai asal tulis akan membaca dirinya siap menerima ijazah.
 */
export function completenessLine (st: CourseSummary, rubricRef: string): string {
  return `<p><strong>${st.doneLessons}/${st.totalLessons} lesson</strong> di perangkat ini ·
      rata-rata kuis ${st.quizAvg ?? '—'} · esai ${st.essayDrafted ? 'ada draf' : 'belum ada'} ·
      bukti untuk ${st.gradedWeights}/100 mata penilai</p>
    <p class="muted">${st.readyForCredential
      ? 'Buktinya lengkap — tapi <strong>belum ada nilai</strong>: angka akhir dihitung terhadap rubrik penerbit, bukan oleh halaman ini.'
      : 'Belum semua bukti terkumpul; hasil akhir belum dapat ditentukan di halaman ini.'}
      Rubrik versi <code>${esc(rubricRef)}</code> ikut tercetak ke dokumen kredensial saat terbit,
      jadi kebijakan itu tidak bisa kami ganti setelah ijazahmu ada.</p>`
}

// Lencana-B80 status=SELESAI 2026-10-01 — halaman kuis tidak lagi membaca kunci (item.answer/item.why tidak ada di bundel); pembahasan sesudah penyerahan diambil dari review balasan /grade: pilihan peserta, benar/salah, dan alasan — tanpa menandai opsi yang benar. Buktikan ulang: npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
export function quizHtml(lesson: Lesson, review?: QuizReview): string {
  const q = lesson.quiz
  if (!q) return ''
  const fb = new Map((review?.items ?? []).map((r) => [r.itemId, r]))
  const rows = q.questions
    .map((item, qi) => {
      const mine = review?.picks.get(item.id)
      const opts = item.options
        .map(
          (o, oi) => `<label class="opt"><input type="radio" name="${esc(item.id)}" value="${oi}" ${
            review ? 'disabled' : ''
          } ${mine === oi ? 'checked' : ''}/><span>${esc(o)}</span></label>`,
        )
        .join('')
      // Pembahasan datang dari server SESUDAH penyerahan (B80): benar/salah + alasannya. Kunci
      // jawabannya sendiri tidak pernah ada di halaman ini, jadi opsi yang benar tidak ditandai.
      const r = fb.get(item.id)
      const verdict = r ? `<p class="${r.correct ? 'ok' : 'bad'}"><strong>${r.correct ? '✓ Benar.' : '✗ Belum tepat.'}</strong></p>` : ''
      const why = r ? `<p class="why"><strong>Kenapa.</strong> ${esc(r.why)}</p>` : ''
      return `<div class="question">
        <p class="q"><strong>${qi + 1}.</strong> ${esc(item.prompt)}</p>${opts}${verdict}${why}</div>`
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

export function essayHtml(course: Course, lesson: Lesson): string {
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

export function meHtml(): string {
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

export async function readMyCredentials(addr: string): Promise<string> {
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

export type { CourseSummary, Block }
