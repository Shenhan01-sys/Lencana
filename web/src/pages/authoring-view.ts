/**
 * `authoring-view.ts` — bagian "Susun kursus" di dasbor Penerbit (`#/app/pub/author`, B133, D67).
 *
 * Yang digambarkan, bukan dideskripsikan (doktrin FE builder):
 *   lajur alur     draf → diajukan → terbit: setiap draf adalah kartu yang berpindah lajur sesuai keputusan
 *   tulang silabus kursus yang sedang dirakit — modul sebagai ruas, lesson sebagai keping berwarna menurut jenisnya
 *                  (bacaan / kuis / esai); masalah audit menempel sebagai pin merah di keping tempat ia terjadi
 *   batang bobot   kuis vs esai sebagai satu batang terbelah yang harus penuh 100
 *
 * Isi dinormalkan dan diaudit dengan modul yang SAMA dengan server (`authoring.ts`): masalah yang tampil di sini adalah
 * masalah yang akan dilaporkan server, dan hash yang ditandatangani akun adalah hash yang dihitung server. Kunci kuis diketik
 * di sini, dikirim hanya ke server, dan tidak pernah keluar lewat katalog publik.
 */
// Lencana-B133 status=SELESAI 2026-10-03 — editor kursus di dasbor Penerbit: lajur draf/diajukan/terbit, tulang silabus dengan pin masalah audit, batang bobot, simpan dan ajukan bertanda tangan, pratinjau lesson. Buktikan ulang: cd signer && npm run verify:authoring, lalu uji peramban T59. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './authoring-view.css'
import { h } from '../lib/ui'
import { skeleton, steps } from '../lib/loading'
import type { Block, Course, Lesson, Module, Problem, QuizKeys } from '../content'
import { normalizeDraft, auditDraft, versionProblems, DRAFT_LIMITS, type DraftKind } from '../authoring'
import {
  readCourseDrafts, saveCourseDraft, submitCourseDraft, learnerAddress, forkCourse, deleteCourseDraft, decideCourseDraft, archiveCourse,
  type CourseDraft, type CourseAction, type DraftInput,
} from '../learning'
import { fileCourseIds } from '../catalog-live'
import { formatLdc, PAY_TOKEN_DECIMALS, PAY_TOKEN_SYMBOL } from '../pricing'

type Lang = 'en' | 'id'

const COPY = {
  lead: {
    en: 'Draft a course, submit it; a member with publish rights (or the publisher key) decides. Quiz answer keys stay on the server.',
    id: 'Susun kursus, ajukan; anggota berhak terbit (atau kunci penerbit) yang memutuskan. Kunci jawaban kuis hanya tersimpan di server.',
  },
  // B140 (D72): kelola kursus terbit
  forkBtn: { en: 'Edit as a new version', id: 'Sunting jadi versi baru' },
  forkNote: {
    en: 'Copies this published course into a new draft. Same grading rules → same course id, replaced in place when published. Changed rules → a new id; the old version is archived and earlier credentials keep pointing to their rules.',
    id: 'Menyalin kursus terbit ini jadi draf baru. Aturan nilai sama → id kursus sama, menggantikan di tempat saat terbit. Aturan nilai berubah → id baru; versi lama diarsipkan dan kredensial lama tetap menunjuk aturannya.',
  },
  archiveBtn: { en: 'Archive', id: 'Arsipkan' },
  unarchiveBtn: { en: 'Restore', id: 'Pulihkan' },
  archivedTag: { en: 'archived', id: 'diarsipkan' },
  archiveNote: {
    en: 'An archived course leaves the catalogue and takes no new learners. Enrolled learners keep their class; credentials stay verifiable.',
    id: 'Kursus yang diarsipkan hilang dari katalog dan tidak menerima peserta baru. Peserta yang sudah terdaftar tetap masuk kelas; kredensialnya tetap terverifikasi.',
  },
  deleteBtn: { en: 'Delete draft', id: 'Hapus draf' },
  deleteConfirm: { en: 'Click again to delete', id: 'Klik lagi untuk menghapus' },
  publishBtn: { en: 'Sign & publish', id: 'Tandatangani & terbitkan' },
  rejectBtn: { en: 'Return with a note', id: 'Kembalikan dengan catatan' },
  rejectNote: { en: 'Note for the author (optional, up to 280 characters)', id: 'Catatan untuk penyusun (opsional, maks. 280 karakter)' },
  decideNote: {
    en: 'The server signs this decision with the publisher key and records you as the member who asked.',
    id: 'Server menandatangani keputusan ini dengan kunci penerbit dan mencatatmu sebagai anggota yang meminta.',
  },
  ownDraft: { en: 'Your own draft — another member with publish rights decides it.', id: 'Draf milikmu sendiri — anggota lain yang berhak terbit yang memutuskannya.' },
  versionOf: { en: 'new version of', id: 'versi baru dari' },
  history: { en: 'Course history', id: 'Riwayat kelola kursus' },
  working: { en: 'Signing…', id: 'Menandatangani…' },
  doneFork: { en: 'New version drafted — edit it below.', id: 'Versi baru tersusun — sunting di bawah.' },
  donePublish: { en: 'Published.', id: 'Diterbitkan.' },
  doneReject: { en: 'Returned to the author.', id: 'Dikembalikan ke penyusun.' },
  doneArchive: { en: 'Archived.', id: 'Diarsipkan.' },
  doneUnarchive: { en: 'Restored to the catalogue.', id: 'Kembali ke katalog.' },
  doneDelete: { en: 'Draft deleted.', id: 'Draf dihapus.' },
  replacedIn: { en: 'Published — it replaced the previous version in place.', id: 'Diterbitkan — menggantikan versi sebelumnya di tempat.' },
  replacedArch: { en: 'Published under a new id — the previous version was archived.', id: 'Diterbitkan dengan id baru — versi sebelumnya diarsipkan.' },
  histIn: { en: 'replaced', id: 'menggantikan' },
  histArch: { en: 'archived the previous version', id: 'mengarsipkan versi sebelumnya' },
  actFork: { en: 'new version', id: 'versi baru' },
  actDelete: { en: 'deleted', id: 'dihapus' },
  actPublish: { en: 'published', id: 'diterbitkan' },
  actReject: { en: 'returned', id: 'dikembalikan' },
  actArchive: { en: 'archived', id: 'diarsipkan' },
  actUnarchive: { en: 'restored', id: 'dipulihkan' },
  by: { en: 'by', id: 'oleh' },
  laneDraft: { en: 'Drafts', id: 'Draf' },
  laneSubmitted: { en: 'Submitted', id: 'Diajukan' },
  lanePublished: { en: 'Published', id: 'Terbit' },
  newCourse: { en: 'New course', id: 'Kursus baru' },
  rejected: { en: 'returned', id: 'dikembalikan' },
  noRight: {
    en: 'Your membership does not include authoring (author=1). The publisher key grants it with npm run grant:member -- <address> --author.',
    id: 'Keanggotaanmu belum termasuk hak susun (author=1). Kunci penerbit memberikannya dengan npm run grant:member -- <alamat> --author.',
  },
  emptyLane: { en: 'Nothing here yet.', id: 'Belum ada.' },
  loading: { en: 'Reading the drafts…', id: 'Membaca draf…' },
  stepSign: { en: 'Signing the request', id: 'Menandatangani permintaan' },
  stepRead: { en: 'Reading drafts from the publisher', id: 'Membaca draf dari penerbit' },
  failed: { en: 'The drafts could not be read:', id: 'Draf tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  lessons: { en: 'lessons', id: 'lesson' },
  problems: { en: 'problems', id: 'masalah' },
  problemsNote: { en: 'Fix these before submitting — the same audit the server runs.', id: 'Perbaiki ini sebelum diajukan — audit yang sama dengan server.' },
  clean: { en: 'ready to submit', id: 'siap diajukan' },
  readOnly: { en: 'Read only — only its author can edit a draft, and only while it is a draft.', id: 'Hanya baca — draf hanya bisa disunting penyusunnya, dan hanya selama masih draf.' },
  course: { en: 'Course', id: 'Kursus' },
  addModule: { en: 'Module', id: 'Modul' },
  addLesson: { en: 'Add', id: 'Tambah' },
  bacaan: { en: 'reading', id: 'bacaan' },
  kuis: { en: 'quiz', id: 'kuis' },
  esai: { en: 'essay', id: 'esai' },
  weights: { en: 'Weights (must total 100)', id: 'Bobot (harus berjumlah 100)' },
  title: { en: 'Title', id: 'Judul' },
  courseId: { en: 'Course id (in the credential; lowercase, digits, dashes)', id: 'Id kursus (tercetak di kredensial; huruf kecil, angka, tanda hubung)' },
  level: { en: 'Level', id: 'Tingkat' },
  topic: { en: 'Topic', id: 'Topik' },
  blurb: { en: 'Short description (no duration — it is computed)', id: 'Deskripsi singkat (tanpa durasi — dihitung dari lesson)' },
  audience: { en: 'For whom (one per line)', id: 'Untuk siapa (satu per baris)' },
  outcome: { en: 'After passing, the learner can… (one per line)', id: 'Sesudah lulus, peserta bisa… (satu per baris)' },
  criteria: { en: 'Criteria printed in the credential', id: 'Kriteria yang tercetak di kredensial' },
  passMark: { en: 'Pass mark', id: 'Nilai lulus' },
  validDays: { en: 'Valid for (days)', id: 'Berlaku (hari)' },
  price: { en: `Price (${PAY_TOKEN_SYMBOL}; empty = free)`, id: `Harga (${PAY_TOKEN_SYMBOL}; kosong = gratis)` },
  moduleId: { en: 'Module id', id: 'Id modul' },
  removeModule: { en: 'Remove module', id: 'Hapus modul' },
  slug: { en: 'Lesson slug', id: 'Slug lesson' },
  minutes: { en: 'Minutes', id: 'Menit' },
  summary: { en: 'Summary', id: 'Ringkasan' },
  content: {
    en: 'Content — blank line = new paragraph · "# " heading · "- " list · "1. " numbered · "> " note · "? " try-it',
    id: 'Isi — baris kosong = paragraf baru · "# " judul · "- " daftar · "1. " bernomor · "> " catatan · "? " coba kerjakan',
  },
  removeLesson: { en: 'Remove lesson', id: 'Hapus lesson' },
  passPct: { en: 'Quiz pass %', id: 'Lulus kuis %' },
  question: { en: 'Question', id: 'Soal' },
  options: { en: 'Options — mark the correct one', id: 'Pilihan — tandai yang benar' },
  why: { en: 'Why (shown after submitting)', id: 'Alasan (tampil sesudah menyerahkan)' },
  addQuestion: { en: 'Add question', id: 'Tambah soal' },
  addOption: { en: 'Add option', id: 'Tambah pilihan' },
  remove: { en: 'Remove', id: 'Hapus' },
  essayPrompt: { en: 'Essay prompt', id: 'Soal esai' },
  minWords: { en: 'Minimum words', id: 'Minimal kata' },
  rubric: { en: 'Rubric (points must total 100)', id: 'Rubrik (poin harus berjumlah 100)' },
  addCriterion: { en: 'Add criterion', id: 'Tambah kriteria' },
  guidance: { en: 'Answers that are NOT accepted (one per line)', id: 'Jawaban yang TIDAK diterima (satu per baris)' },
  preview: { en: 'Preview', id: 'Pratinjau' },
  edit: { en: 'Edit', id: 'Sunting' },
  save: { en: 'Sign & save', id: 'Tandatangani & simpan' },
  submit: { en: 'Sign & submit', id: 'Tandatangani & ajukan' },
  saving: { en: 'Signing and saving…', id: 'Menandatangani dan menyimpan…' },
  saved: { en: 'Saved — the publisher computed the same hash.', id: 'Tersimpan — penerbit menghitung hash yang sama.' },
  submitted: {
    en: 'Submitted. A member with publish rights decides it here (or the publisher key with npm run course:publish).',
    id: 'Diajukan. Anggota berhak terbit yang memutuskannya di sini (atau kunci penerbit lewat npm run course:publish).',
  },
  unsaved: { en: 'unsaved changes', id: 'ada perubahan belum disimpan' },
  close: { en: 'Close', id: 'Tutup' },
  allClear: { en: 'No problems — the same audit the server runs.', id: 'Tanpa masalah — audit yang sama dengan server.' },
  decidedNote: { en: 'Publisher note', id: 'Catatan penerbit' },
  rubricHash: { en: 'rubricHash', id: 'rubricHash' },
  openCourse: { en: 'Open course page', id: 'Buka halaman kursus' },
  author: { en: 'author', id: 'penyusun' },
  you: { en: 'you', id: 'kamu' },
  kind: { en: 'Kind', id: 'Jenis' },
  free: { en: 'free', id: 'gratis' },
  badPrice: { en: `price is not a valid ${PAY_TOKEN_SYMBOL} amount`, id: `harga bukan jumlah ${PAY_TOKEN_SYMBOL} yang sah` },
} satisfies Record<string, Record<Lang, string>>

const KIND_LETTER: Record<DraftKind, string> = { bacaan: 'B', kuis: 'K', esai: 'E' }
/** `replaceChildren` tanpa null — bagian opsional cukup ditulis `cond ? el : null`. */
const kids = (...xs: (Node | null | undefined | false)[]): Node[] => xs.filter((x): x is Node => Boolean(x))
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/* ------------------------------------------------------------------ isi ↔ teks */
/** Balok → teks editor (kebalikan `textToBlocks`). */
function blocksToText (blocks: Block[]): string {
  return blocks.map((b) => {
    if (b.t === 'h') return `# ${b.text}`
    if (b.t === 'ul') return b.items.map((i) => `- ${i}`).join('\n')
    if (b.t === 'ol') return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n')
    if (b.t === 'note') return `> ${b.text}`
    if (b.t === 'try') return `? ${b.prompt}${b.hint ? ` | ${b.hint}` : ''}`
    if (b.t === 'p') return b.text
    return ''
  }).filter(Boolean).join('\n\n')
}

/** Teks editor → balok. Satu kelompok baris (dipisah baris kosong) = satu balok; jenisnya dari awalan baris pertama. */
function textToBlocks (text: string): Block[] {
  return text.replace(/\r/g, '').split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean).map((chunk): Block => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.every((l) => l.startsWith('- '))) return { t: 'ul', items: lines.map((l) => l.slice(2).trim()) }
    if (lines.every((l) => /^\d+\.\s/.test(l))) return { t: 'ol', items: lines.map((l) => l.replace(/^\d+\.\s+/, '')) }
    if (chunk.startsWith('# ')) return { t: 'h', text: chunk.slice(2).trim() }
    if (chunk.startsWith('> ')) return { t: 'note', text: lines.map((l) => l.replace(/^>\s?/, '')).join(' ') }
    if (chunk.startsWith('? ')) {
      const [prompt, hint] = chunk.slice(2).split(' | ')
      return hint ? { t: 'try', prompt: prompt.trim(), hint: hint.trim() } : { t: 'try', prompt: prompt.trim() }
    }
    return { t: 'p', text: lines.join(' ') }
  })
}

/** "2.5" → "2500000" (satuan terkecil); kosong → null; tidak sah → undefined. */
function priceUnits (text: string): string | null | undefined {
  const t = text.trim().replace(',', '.')
  if (!t) return null
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined
  const [whole, frac = ''] = t.split('.')
  if (frac.length > PAY_TOKEN_DECIMALS) return undefined
  const units = BigInt(whole) * 10n ** BigInt(PAY_TOKEN_DECIMALS) + BigInt((frac + '0'.repeat(PAY_TOKEN_DECIMALS)).slice(0, PAY_TOKEN_DECIMALS) || '0')
  return units === 0n ? null : units.toString()
}

/* ------------------------------------------------------------------ draf kosong */
function uniqueSlug (c: Course, kind: DraftKind): string {
  const used = new Set(c.modules.flatMap((m) => m.lessons.map((l) => l.slug)))
  let n = 1
  while (used.has(`${kind}-${n}`)) n++
  return `${kind}-${n}`
}
function newLesson (c: Course, kind: DraftKind): Lesson {
  const slug = uniqueSlug(c, kind)
  const base: Lesson = { slug, title: '', minutes: kind === 'esai' ? 15 : 5, kind, summary: '', blocks: [{ t: 'p', text: '' }] }
  if (kind === 'kuis') base.quiz = { passPct: 70, questions: [{ id: 'q1', prompt: '', options: ['', ''] }] }
  if (kind === 'esai') base.essay = { prompt: '', minWords: 80, rubric: [{ label: 'Argumen', max: 60 }, { label: 'Contoh', max: 40 }], guidance: [] }
  return base
}
function blankCourse (): Course {
  const c: Course = {
    id: '', title: '', institution: '', level: 'dasar', topic: '', blurb: '', audience: [], outcome: [], criteria: '',
    weights: { kuis: 60, esai: 40, praktik: 0 }, passMark: 70, validDays: 365,
    modules: [{ id: 'm1', title: '', blurb: '', lessons: [] }],
  }
  c.modules[0].lessons.push(newLesson(c, 'bacaan'))
  return c
}

/**
 * Kursus editor → kiriman (field `institution` diisi server, `topic` kosong dibuang). Kunci yang belum punya jawaban (alasan
 * diketik sebelum pilihan ditandai) tidak dikirim, supaya audit berkata "soal tanpa kunci jawaban", bukan galat bentuk.
 */
function toInput (c: Course, keys: QuizKeys, price: string | null): DraftInput {
  const { institution: _i, unlisted: _u, prereqCourseId: _p, topic, ...rest } = c
  const clean: QuizKeys = {}
  for (const [slug, items] of Object.entries(keys)) {
    for (const [qid, k] of Object.entries(items)) if (k.answer >= 0) (clean[slug] ??= {})[qid] = k
  }
  return { course: { ...rest, ...(topic?.trim() ? { topic } : {}) } as unknown as Record<string, unknown>, keys: clean, price }
}

/* ------------------------------------------------------------------ bagian */
type Focus = { t: 'course' } | { t: 'module', mi: number } | { t: 'lesson', mi: number, li: number }
/** `price`: satuan terkecil, null = gratis, undefined = teks harga tidak sah (menahan simpan). */
type Editor = { draftId: number | null, status: CourseDraft['status'] | 'new', editable: boolean, course: Course, keys: QuizKeys, price: string | null | undefined, priceText: string, contentHash: string | null, focus: Focus, dirty: boolean, preview: boolean, note: string | null, rubricHash: string | null, src: CourseDraft | null }

export function renderAuthoring (lang: Lang): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const root = h('div', { class: 'au' })
  const me = (learnerAddress() ?? '').toLowerCase()
  let drafts: CourseDraft[] = []
  let canAuthor = false
  let canPublish = false
  let actions: CourseAction[] = []
  let institution = ''
  let ed: Editor | null = null
  /** Pesan sesudah aksi kelola (versi baru, terbit, arsip…) — ditampilkan sekali sesudah daftar dimuat ulang. */
  let flash: { cls: 'ok' | 'bad', text: string } | null = null

  const load = (openId: number | null = null) => {
    const progress = steps([T('stepSign'), T('stepRead')])
    root.replaceChildren(h('div', { class: 'app-loading' }, progress, skeleton('cards', T('loading'))))
    progress.set(0)
    void readCourseDrafts().then((r) => {
      if (!root.isConnected) return
      if (!r.ok) {
        root.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: () => load() }, T('retry'))))
        return
      }
      drafts = r.drafts ?? []
      canAuthor = r.canAuthor === true
      canPublish = r.canPublish === true
      actions = r.actions ?? []
      institution = r.institution ?? ''
      const reopen = openId === null ? null : drafts.find((d) => d.id === openId) ?? null
      if (reopen) openDraft(reopen)
      else { ed = null; draw() }
    })
  }

  /** B140: versi terbit yang digantikan draf ini (kalau draf ini versi baru). */
  const baseOf = (e: Editor | null): CourseDraft | null => (e?.src?.supersedes ? drafts.find((d) => d.id === e.src?.supersedes) ?? null : null)

  /** Id yang sudah dipakai; versi baru boleh memakai id versi yang digantikannya (sama dengan server). */
  const takenIds = (): Set<string> => {
    const s = new Set([...fileCourseIds(), ...drafts.filter((d) => d.status !== 'rejected' && d.id !== ed?.draftId).map((d) => d.courseId)])
    const b = baseOf(ed)
    if (b) s.delete(b.courseId)
    return s
  }

  /** Audit kiriman editor dengan modul yang sama dengan server: masalah bentuk dulu, lalu audit kursus + aturan versi baru. */
  const audit = (e: Editor): Problem[] => {
    // B140: draf orang lain dibaca TANPA kunci kuis (kunci hanya untuk penyusunnya), jadi audit halaman akan melaporkan
    // "soal tanpa kunci" yang tidak ada. Untuk draf hanya-baca itu, yang ditampilkan adalah audit server yang tersimpan.
    if (!e.editable && e.src && e.src.keys === undefined) return e.src.problems ?? []
    const n = normalizeDraft(toInput(e.course, e.keys, e.price ?? null), institution)
    const b = baseOf(e)
    const out = n.payload
      ? [...auditDraft(n.payload, takenIds()), ...versionProblems(n.payload, b ? { courseId: b.courseId, rubricHash: b.rubricHash, version: b.version ?? 1 } : null)]
      : n.errors.map((what) => ({ where: 'bentuk', what }))
    if (e.price === undefined) out.unshift({ where: 'harga', what: T('badPrice') })
    return out
  }

  const openDraft = (d: CourseDraft | null) => {
    if (!d) {
      ed = { draftId: null, status: 'new', editable: true, course: blankCourse(), keys: {}, price: null, priceText: '', contentHash: null, focus: { t: 'course' }, dirty: true, preview: false, note: null, rubricHash: null, src: null }
    } else {
      const own = d.author.toLowerCase() === me
      ed = {
        draftId: d.id, status: d.status, editable: own && (d.status === 'draft' || d.status === 'rejected') && canAuthor,
        course: structuredClone(d.course), keys: structuredClone(d.keys ?? {}), price: d.price, priceText: d.price ? formatLdc(BigInt(d.price)) : '',
        contentHash: d.contentHash, focus: { t: 'course' }, dirty: false, preview: false, note: d.decidedNote, rubricHash: d.rubricHash, src: d,
      }
    }
    draw()
  }

  /* ---------------------------------------------- gambar */
  const draw = () => {
    const note = flash
    flash = null
    root.replaceChildren(...kids(
      h('p', { class: 'au-lead app-muted' }, T('lead')),
      canAuthor ? null : h('p', { class: 'au-noright' }, T('noRight')),
      note ? h('p', { class: `seat-apply-status ${note.cls} au-flash`, role: 'status' }, note.text) : null,
      lanes(),
      ed ? editor(ed) : null,
      history(),
    ))
  }

  /** B140: riwayat kelola kursus — siapa meminta apa (versi baru, terbit, tolak, arsip, pulihkan, hapus). */
  const history = (): HTMLElement | null => {
    if (!actions.length) return null
    const label: Record<CourseAction['action'], string> = {
      fork: T('actFork'), delete: T('actDelete'), publish: T('actPublish'), reject: T('actReject'), archive: T('actArchive'), unarchive: T('actUnarchive'),
    }
    // Terbitnya sebuah versi baru: versi yang digantikannya dibaca dari draf (supersedes), bukan dari teks catatan.
    const replaced = (a: CourseAction): string | null => {
      const d = a.action === 'publish' && a.draftId != null ? drafts.find((x) => x.id === a.draftId) : undefined
      const b = d?.supersedes ? drafts.find((x) => x.id === d.supersedes) : undefined
      if (!d || !b) return null
      return b.courseId === d.courseId ? ` · ${T('histIn')} v${b.version ?? 1}` : ` · ${T('histArch')} ${b.courseId}`
    }
    return h('details', { class: 'au-history app-card' },
      h('summary', null, h('strong', null, T('history')), h('span', { class: 'au-lane-n' }, String(actions.length))),
      h('ol', null, ...actions.slice(0, 30).map((a) => {
        const r = replaced(a)
        return h('li', { class: `act-${a.action}` },
          h('span', { class: 'au-act' }, label[a.action] ?? a.action),
          h('code', null, a.courseId),
          a.requestedBy ? h('small', { class: 'app-muted' }, ` ${T('by')} ${a.requestedBy.toLowerCase() === me ? T('you') : short(a.requestedBy)}`) : null,
          r ? h('small', { class: 'app-muted' }, r) : null,
          a.note ? h('small', { class: 'au-act-note' }, ` · ${a.note}`) : null,
          h('time', { class: 'app-muted', datetime: a.at }, ` · ${new Date(a.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`))
      })))
  }

  const lanes = (): HTMLElement => {
    const card = (d: CourseDraft, i: number) => {
      const n = d.course.modules.reduce((a, m) => a + m.lessons.length, 0)
      const own = d.author.toLowerCase() === me
      return h('button', {
        type: 'button', class: `au-card s-${d.status}${ed?.draftId === d.id ? ' on' : ''}`, style: { '--i': String(i) }, onClick: () => openDraft(d),
      },
      h('span', { class: 'au-card-id' }, d.courseId, (d.version ?? 1) > 1 ? h('span', { class: 'au-ver' }, `v${d.version}`) : null),
      h('strong', null, d.course.title || '—'),
      h('span', { class: 'au-card-meta' },
        `${n} ${T('lessons')} · ${d.price ? `${formatLdc(BigInt(d.price))} ${PAY_TOKEN_SYMBOL}` : T('free')} · ${T('author')} ${own ? T('you') : short(d.author)}`),
      d.supersedes && d.status !== 'published'
        ? h('span', { class: 'au-card-meta' }, `${T('versionOf')} ${drafts.find((x) => x.id === d.supersedes)?.courseId ?? `#${d.supersedes}`}`)
        : null,
      d.problems.length
        ? h('span', { class: 'au-pin' }, `${d.problems.length} ${T('problems')}`)
        : d.status === 'draft' ? h('span', { class: 'au-ok' }, T('clean')) : null,
      d.status === 'rejected' ? h('span', { class: 'au-tag bad' }, T('rejected')) : null,
      d.archivedAt ? h('span', { class: 'au-tag arch' }, T('archivedTag')) : null)
    }
    const lane = (title: string, items: CourseDraft[], extra: HTMLElement | null, cls: string) => h('section', { class: `au-lane ${cls}` },
      h('header', null, h('span', { class: 'au-lane-dot' }), h('strong', null, title), h('span', { class: 'au-lane-n' }, String(items.length))),
      extra,
      ...(items.length ? items.map(card) : extra ? [] : [h('p', { class: 'app-muted au-empty' }, T('emptyLane'))]))
    const newBtn = canAuthor ? h('button', { type: 'button', class: 'au-new', onClick: () => openDraft(null) }, h('span', { 'aria-hidden': 'true' }, '+'), T('newCourse')) : null
    return h('div', { class: 'au-lanes' },
      lane(T('laneDraft'), drafts.filter((d) => d.status === 'draft' || d.status === 'rejected'), newBtn, 'l-draft'),
      lane(T('laneSubmitted'), drafts.filter((d) => d.status === 'submitted'), null, 'l-sub'),
      lane(T('lanePublished'), drafts.filter((d) => d.status === 'published'), null, 'l-pub'))
  }

  const editor = (e: Editor): HTMLElement => {
    const problems = audit(e)
    const spine = h('nav', { class: 'au-spine', 'aria-label': T('course') })
    const panel = h('div', { class: 'au-panel' })
    const bar = h('div', { class: 'au-bar' })
    const wrap = h('section', { class: 'au-editor app-card' }, spine, panel, bar)

    const lessonWhere = (m: Module, l: Lesson) => `${e.course.id}/${m.id}/${l.slug}`

    /** Perubahan teks: audit + label tulang + bilah ulang, panel tidak digambar ulang (fokus tetap di kolom). */
    const touched = () => {
      e.dirty = true
      const p = audit(e)
      drawSpine(p)
      drawBar(p)
    }
    /** Perubahan bentuk (tambah/hapus/fokus/jenis): gambar ulang editor. */
    const restructure = () => { e.dirty = true; draw() }

    const drawSpine = (p: Problem[]) => {
      const pin = (n: number) => (n ? h('span', { class: 'au-pin small' }, String(n)) : null)
      const count = (prefix: string) => p.filter((x) => x.where === prefix || x.where.startsWith(`${prefix}/`)).length
      const w = e.course.weights
      const total = w.kuis + w.esai
      spine.replaceChildren(...kids(
        h('button', { type: 'button', class: `au-node course${e.focus.t === 'course' ? ' on' : ''}`, onClick: () => { e.focus = { t: 'course' }; draw() } },
          h('span', { class: 'au-node-k' }, T('course')), h('strong', null, e.course.title || '—'),
          pin(p.filter((x) => !x.where.includes('/')).length)),
        h('div', { class: `au-weight${total === 100 ? '' : ' bad'}`, title: T('weights') },
          h('span', { class: 'w-kuis', style: { width: `${Math.min(100, w.kuis)}%` } }, w.kuis ? `${T('kuis')} ${w.kuis}` : ''),
          h('span', { class: 'w-esai', style: { width: `${Math.min(100, w.esai)}%` } }, w.esai ? `${T('esai')} ${w.esai}` : '')),
        ...e.course.modules.map((m, mi) => h('div', { class: 'au-mod' },
          h('button', { type: 'button', class: `au-node mod${e.focus.t === 'module' && e.focus.mi === mi ? ' on' : ''}`, onClick: () => { e.focus = { t: 'module', mi }; draw() } },
            h('span', { class: 'au-node-k' }, `${mi + 1}`), h('strong', null, m.title || m.id || '—'), pin(p.filter((x) => x.where === `${e.course.id}/${m.id}`).length)),
          h('div', { class: 'au-keps' },
            ...m.lessons.map((l, li) => h('button', {
              type: 'button', class: `au-kep k-${l.kind}${e.focus.t === 'lesson' && e.focus.mi === mi && e.focus.li === li ? ' on' : ''}`,
              title: `${T(l.kind as DraftKind)} · ${l.title || l.slug}`, onClick: () => { e.focus = { t: 'lesson', mi, li }; draw() },
            }, h('span', { class: 'au-kep-k' }, KIND_LETTER[l.kind as DraftKind] ?? '?'), h('span', { class: 'au-kep-t' }, l.title || l.slug), pin(count(lessonWhere(m, l))))),
            e.editable && m.lessons.length < DRAFT_LIMITS.lessonsPerModule
              ? h('span', { class: 'au-add' }, ...(['bacaan', 'kuis', 'esai'] as DraftKind[]).map((k) => h('button', {
                type: 'button', class: `au-add-k k-${k}`, title: `${T('addLesson')} ${T(k)}`,
                onClick: () => { m.lessons.push(newLesson(e.course, k)); e.focus = { t: 'lesson', mi, li: m.lessons.length - 1 }; restructure() },
              }, `+${KIND_LETTER[k]}`)))
              : null))),
        e.editable && e.course.modules.length < DRAFT_LIMITS.modules
          ? h('button', { type: 'button', class: 'au-addmod', onClick: () => {
            const used = new Set(e.course.modules.map((m) => m.id))
            let n = e.course.modules.length + 1
            while (used.has(`m${n}`)) n++
            e.course.modules.push({ id: `m${n}`, title: '', blurb: '', lessons: [] })
            e.focus = { t: 'module', mi: e.course.modules.length - 1 }
            restructure()
          } }, `+ ${T('addModule')}`)
          : null))
    }

    const drawBar = (p: Problem[]) => {
      const status = h('p', { class: 'seat-apply-status', role: 'status' })
      // B133 (builder 6 Okt malam): label "N masalah" berupa tombol peringatan yang membuka dialog — daftarnya tidak lagi melebar di dalam
      // kontainer bilah. Dialog dibangun dari `p` saat diklik (draf tidak bisa disunting selagi dialog modal terbuka).
      const openProblems = () => {
        const dlg = h('dialog', { class: 'au-dlg', 'aria-labelledby': 'au-dlg-t' },
          h('div', { class: 'au-dlg-f' },
            h('h2', { id: 'au-dlg-t' }, `⚠ ${p.length} ${T('problems')}`),
            h('p', { class: 'au-dlg-n' }, T('problemsNote')),
            h('ul', { class: 'au-dlg-list' }, ...p.slice(0, 60).map((x) => h('li', null, h('code', null, x.where), h('span', null, x.what)))),
            p.length > 60 ? h('p', { class: 'au-dlg-n' }, `+${p.length - 60} ${T('problems')}`) : null,
            h('div', { class: 'au-dlg-act' }, h('button', { type: 'button', class: 'app-btn primary', 'data-close': '' }, T('close'))))) as HTMLDialogElement
        const done = () => { dlg.close(); dlg.remove() }
        dlg.querySelector('[data-close]')?.addEventListener('click', done)
        dlg.addEventListener('close', () => dlg.remove())
        dlg.addEventListener('click', (ev) => { if (ev.target === dlg) done() }) // klik di latar menutup
        document.body.appendChild(dlg)
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
      }
      const list = p.length
        ? h('button', { type: 'button', class: 'au-warn', 'data-warn': '', 'aria-haspopup': 'dialog', onClick: openProblems }, h('span', { 'aria-hidden': 'true' }, '⚠'), `${p.length} ${T('problems')}`)
        : h('span', { class: 'au-ok' }, T('allClear'))
      const saveBtn = h('button', { type: 'button', class: 'app-btn primary' }, T('save')) as HTMLButtonElement
      const submitBtn = h('button', { type: 'button', class: 'app-btn' }, T('submit')) as HTMLButtonElement
      submitBtn.disabled = Boolean(p.length || e.dirty || !e.draftId || !e.contentHash)
      saveBtn.disabled = e.price === undefined
      saveBtn.addEventListener('click', () => {
        if (e.price === undefined) return
        saveBtn.disabled = true; submitBtn.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('saving')
        void saveCourseDraft(toInput(e.course, e.keys, e.price ?? null), e.draftId, institution).then((r) => {
          if (!r.ok || !r.draft) {
            saveBtn.disabled = false
            status.className = 'seat-apply-status bad'
            status.textContent = `${r.why ?? ''}${r.problems?.length ? ` — ${r.problems.slice(0, 3).join(' · ')}` : ''}`
            return
          }
          const d = r.draft
          drafts = [d, ...drafts.filter((x) => x.id !== d.id)]
          openDraft(d)
          const s = root.querySelector('.au-bar .seat-apply-status')
          if (s) { s.className = 'seat-apply-status ok'; s.textContent = T('saved') }
        })
      })
      submitBtn.addEventListener('click', () => {
        if (!e.draftId || !e.contentHash) return
        saveBtn.disabled = true; submitBtn.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('saving')
        void submitCourseDraft(e.draftId, e.contentHash).then((r) => {
          if (!r.ok || !r.draft) { saveBtn.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
          const d = r.draft
          drafts = [d, ...drafts.filter((x) => x.id !== d.id)]
          openDraft(d)
          const s = root.querySelector('.au-bar .seat-apply-status')
          if (s) { s.className = 'seat-apply-status ok'; s.textContent = T('submitted') }
        })
      })
      // B140 (D72): aksi kelola menurut keadaan draf dan hak kursi. Setiap aksi ditandatangani akun ini; server yang memutuskan.
      const src = e.src
      const own = src ? src.author.toLowerCase() === me : true
      const act = <R extends { ok: boolean, why?: string }>(label: string, cls: string, job: () => Promise<R>, onOk: (r: R) => { text: string, open: number | null }): HTMLButtonElement => {
        const b = h('button', { type: 'button', class: `app-btn ${cls}`.trim() }, label) as HTMLButtonElement
        b.addEventListener('click', () => {
          b.disabled = true
          status.className = 'seat-apply-status'; status.textContent = T('working')
          void job().then((r) => {
            if (!r.ok) { b.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
            const o = onOk(r)
            flash = { cls: 'ok', text: o.text }
            load(o.open)
          })
        })
        return b
      }
      const manage: HTMLElement[] = []
      const notes: HTMLElement[] = []
      let decideBox: HTMLElement | null = null
      if (src && own && canAuthor && src.status === 'draft' && !src.submittedAt && !src.decidedAt) {
        const del = h('button', { type: 'button', class: 'app-btn small au-danger' }, T('deleteBtn')) as HTMLButtonElement
        let armed = false
        del.addEventListener('click', () => {
          if (!armed) { armed = true; del.textContent = T('deleteConfirm'); return }
          del.disabled = true
          status.className = 'seat-apply-status'; status.textContent = T('working')
          void deleteCourseDraft(src.id).then((r) => {
            if (!r.ok) { del.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
            flash = { cls: 'ok', text: T('doneDelete') }
            load(null)
          })
        })
        manage.push(del)
      }
      if (src && src.status === 'submitted' && canPublish) {
        if (own) {
          decideBox = h('p', { class: 'app-muted au-decide-note' }, T('ownDraft'))
        } else {
          const noteBox = h('textarea', { class: 'au-reject-note', rows: '2', maxlength: '280', placeholder: T('rejectNote'), 'aria-label': T('rejectNote') }) as HTMLTextAreaElement
          const pub = act(T('publishBtn'), 'primary', () => decideCourseDraft(src.id, 'publish'),
            (r) => ({ text: r.replaced ? T(r.replaced.how === 'superseded' ? 'replacedIn' : 'replacedArch') : T('donePublish'), open: src.id }))
          const rej = act(T('rejectBtn'), '', () => decideCourseDraft(src.id, 'reject', noteBox.value), () => ({ text: T('doneReject'), open: src.id }))
          decideBox = h('div', { class: 'au-decide' }, noteBox, h('div', { class: 'au-decide-act' }, pub, rej), h('small', { class: 'app-muted' }, T('decideNote')))
        }
      }
      if (src && src.status === 'published') {
        if (canAuthor) {
          manage.push(act(T('forkBtn'), 'primary', () => forkCourse(src.courseId), (r) => ({ text: T('doneFork'), open: r.draft?.id ?? null })))
          notes.push(h('small', { class: 'app-muted au-manage-note' }, T('forkNote')))
        }
        if (canPublish) {
          manage.push(src.archivedAt
            ? act(T('unarchiveBtn'), '', () => archiveCourse(src.courseId, false), () => ({ text: T('doneUnarchive'), open: src.id }))
            : act(T('archiveBtn'), '', () => archiveCourse(src.courseId, true), () => ({ text: T('doneArchive'), open: src.id })))
          notes.push(h('small', { class: 'app-muted au-manage-note' }, T('archiveNote')))
        }
      }
      bar.replaceChildren(...kids(
        list,
        e.dirty && e.editable ? h('span', { class: 'au-dirty' }, T('unsaved')) : null,
        decideBox,
        h('div', { class: 'au-bar-act' },
          e.editable ? saveBtn : null, e.editable ? submitBtn : null, ...manage,
          h('button', { type: 'button', class: 'app-btn small', onClick: () => { ed = null; draw() } }, T('close'))),
        ...notes,
        status))
    }

    /* ---------------- kolom isian */
    const field = (label: string, input: HTMLElement, hint?: string) => h('label', { class: 'au-field' }, h('span', null, label), input, hint ? h('small', { class: 'app-muted' }, hint) : null)
    const textIn = (value: string, set: (v: string) => void, opts: { area?: boolean, rows?: number, max?: number, ph?: string } = {}) => {
      const el = (opts.area ? h('textarea', { rows: opts.rows ?? 3, maxlength: opts.max ?? DRAFT_LIMITS.long }) : h('input', { type: 'text', maxlength: opts.max ?? DRAFT_LIMITS.short })) as HTMLInputElement | HTMLTextAreaElement
      el.value = value
      if (opts.ph) el.placeholder = opts.ph
      el.disabled = !e.editable
      el.addEventListener('input', () => { set(el.value); touched() })
      return el
    }
    const numIn = (value: number, set: (v: number) => void, min: number, max: number) => {
      const el = h('input', { type: 'number', min, max, step: 1 }) as HTMLInputElement
      el.value = String(value)
      el.disabled = !e.editable
      el.addEventListener('input', () => { set(Math.round(Number(el.value))); touched() })
      return el
    }
    const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)

    const coursePanel = () => {
      const c = e.course
      const level = h('select', null, ...(['dasar', 'menengah', 'lanjutan'] as const).map((lv) => h('option', { value: lv }, lv))) as HTMLSelectElement
      level.value = c.level
      level.disabled = !e.editable
      level.addEventListener('change', () => { c.level = level.value as Course['level']; touched() })
      const price = textIn(e.priceText, (v) => { e.priceText = v; e.price = priceUnits(v) }, { max: 16, ph: '0' })
      const weightKuis = numIn(c.weights.kuis, (v) => { c.weights.kuis = v }, 0, 100)
      const weightEsai = numIn(c.weights.esai, (v) => { c.weights.esai = v }, 0, 100)
      return [
        h('div', { class: 'au-grid' },
          field(T('title'), textIn(c.title, (v) => { c.title = v })),
          field(T('courseId'), textIn(c.id, (v) => { c.id = v.trim() }, { max: 48, ph: 'contoh-kursus-2026' })),
          field(T('level'), level),
          field(T('topic'), textIn(c.topic ?? '', (v) => { c.topic = v }, { max: 40 })),
          field(T('passMark'), numIn(c.passMark, (v) => { c.passMark = v }, 1, 100)),
          field(T('validDays'), numIn(c.validDays, (v) => { c.validDays = v }, 1, 3650)),
          field(`${T('weights')} — ${T('kuis')}`, weightKuis),
          field(`${T('weights')} — ${T('esai')}`, weightEsai),
          field(T('price'), price)),
        field(T('blurb'), textIn(c.blurb, (v) => { c.blurb = v }, { area: true, rows: 2, max: DRAFT_LIMITS.medium })),
        h('div', { class: 'au-grid two' },
          field(T('audience'), textIn(c.audience.join('\n'), (v) => { c.audience = lines(v) }, { area: true, rows: 3 })),
          field(T('outcome'), textIn(c.outcome.join('\n'), (v) => { c.outcome = lines(v) }, { area: true, rows: 3 }))),
        field(T('criteria'), textIn(c.criteria, (v) => { c.criteria = v }, { area: true, rows: 3 })),
        e.note ? h('p', { class: 'au-note' }, h('b', null, `${T('decidedNote')}: `), e.note) : null,
        e.rubricHash ? h('p', { class: 'app-muted' }, `${T('rubricHash')} `, h('code', null, e.rubricHash.slice(0, 18) + '…'), ' · ', h('a', { class: 'au-open-link', href: `#/course/${encodeURIComponent(c.id)}` }, T('openCourse'))) : null,
      ]
    }

    const modulePanel = (mi: number) => {
      const m = e.course.modules[mi]
      return [
        h('div', { class: 'au-grid two' },
          field(T('moduleId'), textIn(m.id, (v) => { m.id = v.trim() }, { max: 32 })),
          field(T('title'), textIn(m.title, (v) => { m.title = v }))),
        field(T('blurb'), textIn(m.blurb, (v) => { m.blurb = v }, { area: true, rows: 2, max: DRAFT_LIMITS.medium })),
        e.editable && e.course.modules.length > 1
          ? h('button', { type: 'button', class: 'app-btn small danger', onClick: () => {
            for (const l of m.lessons) delete e.keys[l.slug]
            e.course.modules.splice(mi, 1); e.focus = { t: 'course' }; restructure()
          } }, T('removeModule'))
          : null,
      ]
    }

    const quizEditor = (l: Lesson) => {
      const q = l.quiz!
      const keyOf = (qid: string) => { e.keys[l.slug] ??= {}; return e.keys[l.slug][qid] }
      return h('div', { class: 'au-quiz' },
        field(T('passPct'), numIn(q.passPct, (v) => { q.passPct = v }, 1, 100)),
        ...q.questions.map((qq, qi) => {
          const k = keyOf(qq.id)
          const name = `au-${l.slug}-${qq.id}`
          return h('fieldset', { class: 'au-q' },
            h('legend', null, `${T('question')} ${qi + 1}`),
            field(T('question'), textIn(qq.prompt, (v) => { qq.prompt = v }, { area: true, rows: 2, max: DRAFT_LIMITS.medium })),
            h('div', { class: 'au-opts', role: 'group', 'aria-label': T('options') },
              h('span', { class: 'au-sub' }, T('options')),
              ...qq.options.map((opt, oi) => {
                const radio = h('input', { type: 'radio', name, value: String(oi) }) as HTMLInputElement
                radio.checked = k?.answer === oi
                radio.disabled = !e.editable
                radio.addEventListener('change', () => { e.keys[l.slug] ??= {}; e.keys[l.slug][qq.id] = { answer: oi, why: e.keys[l.slug][qq.id]?.why ?? '' }; touched() })
                const t = textIn(opt, (v) => { qq.options[oi] = v }, { max: DRAFT_LIMITS.short })
                return h('div', { class: `au-opt${k?.answer === oi ? ' right' : ''}` }, radio, t,
                  e.editable && qq.options.length > 2 ? h('button', { type: 'button', class: 'au-x', 'aria-label': T('remove'), onClick: () => {
                    qq.options.splice(oi, 1)
                    const kk = e.keys[l.slug]?.[qq.id]
                    if (kk && kk.answer >= oi) kk.answer = Math.max(0, kk.answer - (kk.answer === oi ? 0 : 1))
                    restructure()
                  } }, '×') : null)
              }),
              e.editable && qq.options.length < DRAFT_LIMITS.options ? h('button', { type: 'button', class: 'app-btn small', onClick: () => { qq.options.push(''); restructure() } }, T('addOption')) : null),
            field(T('why'), textIn(k?.why ?? '', (v) => { e.keys[l.slug] ??= {}; e.keys[l.slug][qq.id] = { answer: e.keys[l.slug][qq.id]?.answer ?? -1, why: v } }, { area: true, rows: 2, max: DRAFT_LIMITS.medium })),
            e.editable && q.questions.length > 1 ? h('button', { type: 'button', class: 'app-btn small danger', onClick: () => { q.questions.splice(qi, 1); delete e.keys[l.slug]?.[qq.id]; restructure() } }, T('remove')) : null)
        }),
        e.editable && q.questions.length < DRAFT_LIMITS.questions ? h('button', { type: 'button', class: 'app-btn small', onClick: () => {
          const used = new Set(q.questions.map((x) => x.id))
          let n = q.questions.length + 1
          while (used.has(`q${n}`)) n++
          q.questions.push({ id: `q${n}`, prompt: '', options: ['', ''] }); restructure()
        } }, T('addQuestion')) : null)
    }

    const essayEditor = (l: Lesson) => {
      const es = l.essay!
      const total = es.rubric.reduce((a, r) => a + r.max, 0)
      return h('div', { class: 'au-essay' },
        field(T('essayPrompt'), textIn(es.prompt, (v) => { es.prompt = v }, { area: true, rows: 3 })),
        field(T('minWords'), numIn(es.minWords, (v) => { es.minWords = v }, 1, 2000)),
        h('div', { class: 'au-rubric' }, h('span', { class: `au-sub${total === 100 ? '' : ' bad'}` }, `${T('rubric')} · ${total}`),
          ...es.rubric.map((r, ri) => h('div', { class: 'au-rrow' },
            textIn(r.label, (v) => { r.label = v }),
            numIn(r.max, (v) => { r.max = v }, 1, 100),
            e.editable && es.rubric.length > 1 ? h('button', { type: 'button', class: 'au-x', 'aria-label': T('remove'), onClick: () => { es.rubric.splice(ri, 1); restructure() } }, '×') : null)),
          e.editable && es.rubric.length < DRAFT_LIMITS.rubric ? h('button', { type: 'button', class: 'app-btn small', onClick: () => { es.rubric.push({ label: '', max: 10 }); restructure() } }, T('addCriterion')) : null),
        field(T('guidance'), textIn(es.guidance.join('\n'), (v) => { es.guidance = lines(v) }, { area: true, rows: 3 })))
    }

    const previewOf = (l: Lesson) => h('article', { class: 'au-preview lesson-engine' },
      h('h2', null, l.title || '—'), h('p', { class: 'app-muted' }, l.summary),
      ...l.blocks.map((b) => {
        if (b.t === 'h') return h('h3', null, b.text)
        if (b.t === 'ul') return h('ul', null, ...b.items.map((i) => h('li', null, i)))
        if (b.t === 'ol') return h('ol', null, ...b.items.map((i) => h('li', null, i)))
        if (b.t === 'note') return h('p', { class: 'au-pv-note' }, b.text)
        if (b.t === 'try') return h('p', { class: 'au-pv-try' }, b.prompt, b.hint ? h('small', null, ` — ${b.hint}`) : null)
        if (b.t === 'p') return h('p', null, b.text)
        return null
      }),
      l.quiz ? h('ol', { class: 'au-pv-quiz' }, ...l.quiz.questions.map((q) => h('li', null, h('p', null, q.prompt), h('ul', null, ...q.options.map((o) => h('li', null, o)))))) : null,
      l.essay ? h('div', { class: 'au-pv-essay' }, h('p', null, l.essay.prompt), h('small', { class: 'app-muted' }, `≥ ${l.essay.minWords} kata · ${l.essay.rubric.map((r) => `${r.label} ${r.max}`).join(' · ')}`)) : null)

    const lessonPanel = (mi: number, li: number) => {
      const m = e.course.modules[mi]
      const l = m.lessons[li]
      const kind = h('select', null, ...(['bacaan', 'kuis', 'esai'] as DraftKind[]).map((k) => h('option', { value: k }, T(k)))) as HTMLSelectElement
      kind.value = l.kind
      kind.disabled = !e.editable
      kind.addEventListener('change', () => {
        const k = kind.value as DraftKind
        const fresh = newLesson(e.course, k)
        l.kind = k
        delete l.quiz; delete l.essay; delete e.keys[l.slug]
        if (fresh.quiz) l.quiz = fresh.quiz
        if (fresh.essay) l.essay = fresh.essay
        restructure()
      })
      const slugIn = textIn(l.slug, (v) => {
        const next = v.trim()
        if (e.keys[l.slug] && next !== l.slug) { e.keys[next] = e.keys[l.slug]; delete e.keys[l.slug] }
        l.slug = next
      }, { max: 48 })
      const toggle = h('button', { type: 'button', class: 'app-btn small', onClick: () => { e.preview = !e.preview; draw() } }, e.preview ? T('edit') : T('preview'))
      if (e.preview) return [h('div', { class: 'au-panel-head' }, toggle), previewOf(l)]
      return [
        h('div', { class: 'au-panel-head' }, h('span', { class: `au-kep-k k-${l.kind}` }, KIND_LETTER[l.kind as DraftKind]), toggle),
        h('div', { class: 'au-grid' },
          field(T('title'), textIn(l.title, (v) => { l.title = v })),
          field(T('slug'), slugIn),
          field(T('minutes'), numIn(l.minutes, (v) => { l.minutes = v }, 1, 240)),
          field(T('kind'), kind)),
        field(T('summary'), textIn(l.summary, (v) => { l.summary = v }, { area: true, rows: 2, max: DRAFT_LIMITS.medium })),
        field(T('content'), textIn(blocksToText(l.blocks), (v) => { l.blocks = textToBlocks(v) }, { area: true, rows: 8 })),
        l.kind === 'kuis' && l.quiz ? quizEditor(l) : null,
        l.kind === 'esai' && l.essay ? essayEditor(l) : null,
        e.editable ? h('button', { type: 'button', class: 'app-btn small danger', onClick: () => {
          delete e.keys[l.slug]; m.lessons.splice(li, 1); e.focus = { t: 'module', mi }; restructure()
        } }, T('removeLesson')) : null,
      ]
    }

    const f = e.focus
    const content = f.t === 'lesson' && e.course.modules[f.mi]?.lessons[f.li]
      ? lessonPanel(f.mi, f.li)
      : f.t === 'module' && e.course.modules[f.mi] ? modulePanel(f.mi) : coursePanel()
    panel.replaceChildren(...(e.editable ? [] : [h('p', { class: 'au-note' }, T('readOnly'))]), ...content.filter(Boolean) as HTMLElement[])
    drawSpine(problems)
    drawBar(problems)
    return wrap
  }

  load()
  return root
}
