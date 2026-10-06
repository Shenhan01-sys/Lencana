/**
 * `authoring.ts` — skema draf kursus (B133, D67), DIPAKAI BERSAMA halaman dan server.
 *
 * Kenapa satu modul untuk keduanya: penyusun menandatangani hash isi drafnya (`lencana-draft save … hash=<keccak>`), dan
 * server menyimpan isi itu hanya bila hash-nya sama. Kalau halaman dan server menormalkan isi dengan dua kode berbeda,
 * urutan kunci atau satu spasi saja sudah membuat tanda tangan yang sah ditolak — atau lebih buruk, membuat yang disimpan
 * berbeda dari yang ditandatangani. Jadi: satu `normalizeDraft`, satu `draftHash`.
 *
 * Batas editor (rancangan B133): lesson bacaan / kuis / esai saja; bobot praktik 0 (bukti praktik dibaca server dari chain
 * dan butuh konfigurasi kontrak, jadi tidak disusun dari halaman); balok isi p / h / ul / ol / note / try. Kunci kuis
 * (`answer` + `why`) dikirim terpisah dari isi publik dan hanya disimpan server (B80).
 *
 * Modul ini TIDAK mengimpor kunci kursus berkas mana pun — aman untuk bundel browser.
 */
// Lencana-B133 status=SELESAI 2026-10-03 — skema draf kursus yang sama untuk halaman dan server: normalisasi, hash isi yang ditandatangani penyusun, audit (auditCourse + batas editor + kelengkapan kunci), dan manifest berkunci untuk hash kebijakan. Buktikan ulang: cd signer && npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { keccak256, toBytes, type Hex } from 'viem'
import { auditCourse, type Block, type Course, type Lesson, type Problem, type QuizKeys } from './content'
import { MANIFEST_SCHEMA, rubricHashOf, type CourseManifest } from './manifest'

export const DRAFT_KINDS = ['bacaan', 'kuis', 'esai'] as const
export type DraftKind = typeof DRAFT_KINDS[number]
const BLOCK_TYPES = ['p', 'h', 'ul', 'ol', 'note', 'try'] as const
const LEVELS = ['dasar', 'menengah', 'lanjutan'] as const

export const DRAFT_LIMITS = {
  modules: 12, lessonsPerModule: 15, blocks: 40, questions: 25, options: 6, rubric: 8, items: 20, guidance: 8,
  short: 160, medium: 600, long: 6000,
} as const

/** Isi draf yang ditandatangani: kursus publik (tanpa kunci), kunci kuis, harga (satuan terkecil token) atau null = gratis. */
export type DraftPayload = { course: Course, keys: QuizKeys, price: string | null }

type Bag = Record<string, unknown>
const isObj = (v: unknown): v is Bag => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Normalkan masukan menjadi bentuk kanonik (urutan field tetap, hanya field yang dikenal editor). `errors` berisi apa pun
 * yang tidak bisa dinormalkan tanpa mengubah maknanya — field asing tidak diam-diam dibuang: ia dilaporkan.
 */
export function normalizeDraft (input: unknown, institution: string): { payload: DraftPayload | null, errors: string[] } {
  const errors: string[] = []
  const err = (where: string, what: string) => { if (errors.length < 40) errors.push(`${where}: ${what}`) }
  const text = (v: unknown, where: string, max: number, required = true): string => {
    if (typeof v !== 'string') { if (required || v !== undefined) err(where, 'harus teks'); return '' }
    if (v.length > max) err(where, `lebih dari ${max} karakter`)
    return v.trim()
  }
  const int = (v: unknown, where: string, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) { err(where, `harus bilangan bulat ${min}..${max}`); return min }
    return v
  }
  const list = (v: unknown, where: string, max: number, maxLen: number): string[] => {
    if (!Array.isArray(v)) { err(where, 'harus daftar'); return [] }
    if (v.length > max) err(where, `lebih dari ${max} butir`)
    return v.slice(0, max).map((x, i) => text(x, `${where}[${i}]`, maxLen))
  }
  const only = (o: Bag, where: string, allowed: string[]) => {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) err(where, `field "${k}" tidak dikenal editor`)
  }

  if (!isObj(input)) return { payload: null, errors: ['draf: harus objek {course, keys, price}'] }
  only(input, 'draf', ['course', 'keys', 'price'])
  const c = input.course
  if (!isObj(c)) return { payload: null, errors: ['course: harus objek'] }
  only(c, 'course', ['id', 'title', 'institution', 'level', 'topic', 'blurb', 'audience', 'outcome', 'criteria', 'weights', 'passMark', 'validDays', 'modules'])
  const id = text(c.id, 'course.id', 48)
  if (id && !/^[a-z0-9][a-z0-9-]{2,47}$/.test(id)) err('course.id', 'huruf kecil, angka, dan tanda hubung saja (3–48 karakter)')
  const level = LEVELS.includes(c.level as typeof LEVELS[number]) ? c.level as typeof LEVELS[number] : (err('course.level', `salah satu: ${LEVELS.join(', ')}`), 'dasar')
  const w = isObj(c.weights) ? c.weights : (err('course.weights', 'harus objek'), {} as Bag)
  if (isObj(c.weights)) only(c.weights, 'course.weights', ['kuis', 'esai', 'praktik'])
  const weights = { kuis: int(w.kuis, 'bobot kuis', 0, 100), esai: int(w.esai, 'bobot esai', 0, 100), praktik: int(w.praktik ?? 0, 'bobot praktik', 0, 0) }

  const modulesIn = Array.isArray(c.modules) ? c.modules : (err('course.modules', 'harus daftar'), [])
  if (modulesIn.length > DRAFT_LIMITS.modules) err('course.modules', `lebih dari ${DRAFT_LIMITS.modules} modul`)
  const keys: QuizKeys = {}
  const keysIn = isObj(input.keys) ? input.keys : (input.keys === undefined ? {} : (err('keys', 'harus objek'), {}))

  const modules = modulesIn.slice(0, DRAFT_LIMITS.modules).map((m: unknown, mi: number) => {
    const mw = `modul ${mi + 1}`
    if (!isObj(m)) { err(mw, 'harus objek'); return { id: '', title: '', blurb: '', lessons: [] } }
    only(m, mw, ['id', 'title', 'blurb', 'lessons'])
    const lessonsIn = Array.isArray(m.lessons) ? m.lessons : (err(`${mw}.lessons`, 'harus daftar'), [])
    if (lessonsIn.length > DRAFT_LIMITS.lessonsPerModule) err(`${mw}.lessons`, `lebih dari ${DRAFT_LIMITS.lessonsPerModule} lesson`)
    return {
      id: text(m.id, `${mw}.id`, 32),
      title: text(m.title, `${mw}.title`, DRAFT_LIMITS.short),
      blurb: text(m.blurb, `${mw}.blurb`, DRAFT_LIMITS.medium),
      lessons: lessonsIn.slice(0, DRAFT_LIMITS.lessonsPerModule).map((l: unknown, li: number): Lesson => {
        const lw = `${mw} lesson ${li + 1}`
        if (!isObj(l)) { err(lw, 'harus objek'); return { slug: '', title: '', minutes: 1, kind: 'bacaan', summary: '', blocks: [] } }
        only(l, lw, ['slug', 'title', 'minutes', 'kind', 'summary', 'blocks', 'quiz', 'essay'])
        const kind = DRAFT_KINDS.includes(l.kind as DraftKind) ? l.kind as DraftKind : (err(`${lw}.kind`, `salah satu: ${DRAFT_KINDS.join(', ')}`), 'bacaan')
        const slug = text(l.slug, `${lw}.slug`, 48)
        const blocksIn = Array.isArray(l.blocks) ? l.blocks : (err(`${lw}.blocks`, 'harus daftar'), [])
        if (blocksIn.length > DRAFT_LIMITS.blocks) err(`${lw}.blocks`, `lebih dari ${DRAFT_LIMITS.blocks} balok`)
        const blocks: Block[] = blocksIn.slice(0, DRAFT_LIMITS.blocks).map((b: unknown, bi: number): Block => {
          const bw = `${lw} balok ${bi + 1}`
          if (!isObj(b) || !BLOCK_TYPES.includes(b.t as typeof BLOCK_TYPES[number])) { err(bw, `jenis balok: ${BLOCK_TYPES.join(', ')}`); return { t: 'p', text: '' } }
          if (b.t === 'ul' || b.t === 'ol') { only(b, bw, ['t', 'items']); return { t: b.t, items: list(b.items, `${bw}.items`, DRAFT_LIMITS.items, DRAFT_LIMITS.medium) } }
          if (b.t === 'try') { only(b, bw, ['t', 'prompt', 'hint']); const hint = text(b.hint, `${bw}.hint`, DRAFT_LIMITS.medium, false); return hint ? { t: 'try', prompt: text(b.prompt, `${bw}.prompt`, DRAFT_LIMITS.medium), hint } : { t: 'try', prompt: text(b.prompt, `${bw}.prompt`, DRAFT_LIMITS.medium) } }
          only(b, bw, ['t', 'text'])
          return { t: b.t as 'p' | 'h' | 'note', text: text(b.text, `${bw}.text`, DRAFT_LIMITS.long) }
        })
        const lesson: Lesson = {
          slug, title: text(l.title, `${lw}.title`, DRAFT_LIMITS.short), minutes: int(l.minutes, `${lw}.minutes`, 1, 240), kind,
          summary: text(l.summary, `${lw}.summary`, DRAFT_LIMITS.medium), blocks,
        }
        if (kind === 'kuis') {
          const q = isObj(l.quiz) ? l.quiz : (err(`${lw}.quiz`, 'lesson kuis wajib punya kuis'), { passPct: 70, questions: [] } as Bag)
          if (isObj(l.quiz)) only(l.quiz, `${lw}.quiz`, ['passPct', 'questions'])
          const qsIn = Array.isArray(q.questions) ? q.questions : (err(`${lw}.quiz.questions`, 'harus daftar'), [])
          if (qsIn.length > DRAFT_LIMITS.questions) err(`${lw}.quiz.questions`, `lebih dari ${DRAFT_LIMITS.questions} soal`)
          const lk = isObj(keysIn) && isObj((keysIn as Bag)[slug]) ? (keysIn as Bag)[slug] as Bag : {}
          const questions = qsIn.slice(0, DRAFT_LIMITS.questions).map((x: unknown, qi: number) => {
            const qw = `${lw} soal ${qi + 1}`
            if (!isObj(x)) { err(qw, 'harus objek'); return { id: '', prompt: '', options: [] } }
            only(x, qw, ['id', 'prompt', 'options'])
            const qid = text(x.id, `${qw}.id`, 24)
            const k = isObj(lk[qid]) ? lk[qid] as Bag : null
            if (k) {
              only(k, `${qw} kunci`, ['answer', 'why'])
              keys[slug] ??= {}
              keys[slug][qid] = { answer: int(k.answer, `${qw} kunci`, 0, DRAFT_LIMITS.options - 1), why: text(k.why, `${qw} alasan`, DRAFT_LIMITS.medium) }
            }
            return { id: qid, prompt: text(x.prompt, `${qw}.prompt`, DRAFT_LIMITS.medium), options: list(x.options, `${qw}.options`, DRAFT_LIMITS.options, DRAFT_LIMITS.short) }
          })
          lesson.quiz = { passPct: int(q.passPct, `${lw}.quiz.passPct`, 1, 100), questions }
        } else if (l.quiz !== undefined) err(`${lw}.quiz`, 'hanya lesson kuis yang punya kuis')
        if (kind === 'esai') {
          const e = isObj(l.essay) ? l.essay : (err(`${lw}.essay`, 'lesson esai wajib punya esai'), { prompt: '', minWords: 30, rubric: [], guidance: [] } as Bag)
          if (isObj(l.essay)) only(l.essay, `${lw}.essay`, ['prompt', 'minWords', 'rubric', 'guidance'])
          const rIn = Array.isArray(e.rubric) ? e.rubric : (err(`${lw}.essay.rubric`, 'harus daftar'), [])
          if (rIn.length > DRAFT_LIMITS.rubric) err(`${lw}.essay.rubric`, `lebih dari ${DRAFT_LIMITS.rubric} kriteria`)
          lesson.essay = {
            prompt: text(e.prompt, `${lw}.essay.prompt`, DRAFT_LIMITS.long),
            minWords: int(e.minWords, `${lw}.essay.minWords`, 1, 2000),
            rubric: rIn.slice(0, DRAFT_LIMITS.rubric).map((r: unknown, ri: number) => {
              if (!isObj(r)) { err(`${lw} rubrik ${ri + 1}`, 'harus objek'); return { label: '', max: 0 } }
              only(r, `${lw} rubrik ${ri + 1}`, ['label', 'max'])
              return { label: text(r.label, `${lw} rubrik ${ri + 1}.label`, DRAFT_LIMITS.short), max: int(r.max, `${lw} rubrik ${ri + 1}.max`, 1, 100) }
            }),
            guidance: list(e.guidance, `${lw}.essay.guidance`, DRAFT_LIMITS.guidance, DRAFT_LIMITS.medium),
          }
        } else if (l.essay !== undefined) err(`${lw}.essay`, 'hanya lesson esai yang punya esai')
        return lesson
      }),
    }
  })

  // Kunci untuk soal / lesson yang tidak ada dilaporkan, bukan dibuang diam-diam.
  for (const [slug, items] of Object.entries(isObj(keysIn) ? keysIn : {})) {
    if (!isObj(items)) { err(`kunci ${slug}`, 'harus objek'); continue }
    for (const qid of Object.keys(items)) if (!keys[slug]?.[qid]) err(`kunci ${slug}/${qid}`, 'untuk soal yang tidak ada')
  }

  let price: string | null = null
  if (input.price !== null && input.price !== undefined) {
    if (typeof input.price !== 'string' || !/^[0-9]{1,24}$/.test(input.price)) err('harga', 'harus satuan terkecil token (angka) atau kosong = gratis')
    else price = input.price === '0' ? null : input.price
  }

  const course: Course = {
    id, title: text(c.title, 'course.title', DRAFT_LIMITS.short), institution, level,
    ...(typeof c.topic === 'string' && c.topic.trim() ? { topic: text(c.topic, 'course.topic', 40) } : {}),
    blurb: text(c.blurb, 'course.blurb', DRAFT_LIMITS.medium),
    audience: list(c.audience, 'course.audience', DRAFT_LIMITS.items, DRAFT_LIMITS.short),
    outcome: list(c.outcome, 'course.outcome', DRAFT_LIMITS.items, DRAFT_LIMITS.short),
    criteria: text(c.criteria, 'course.criteria', DRAFT_LIMITS.long),
    weights, passMark: int(c.passMark, 'course.passMark', 1, 100), validDays: int(c.validDays, 'course.validDays', 1, 3650),
    modules,
  }
  return { payload: errors.length ? null : { course, keys, price }, errors }
}

/** Hash isi draf yang ditandatangani penyusun: keccak256 atas JSON kanonik `{course, keys, price}`. */
export function draftHash (p: DraftPayload): Hex {
  return keccak256(toBytes(JSON.stringify({ course: p.course, keys: p.keys, price: p.price })))
}

/** Kursus + kunci → kursus berkunci (salinan) untuk audit dan hash kebijakan. */
export function keyedCourse (course: Course, keys: QuizKeys): Course {
  return {
    ...course,
    modules: course.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => (l.quiz
        ? { ...l, quiz: { ...l.quiz, questions: l.quiz.questions.map((q) => (keys[l.slug]?.[q.id] ? { ...q, answer: keys[l.slug][q.id].answer, why: keys[l.slug][q.id].why } : { ...q })) } }
        : l)),
    })),
  }
}

// Lencana-B140 status=SELESAI 2026-10-04 — aturan versi baru satu sumber untuk server dan editor (D72): aturan nilai tetap → id sama (versi baru menggantikan di tempat), aturan nilai berubah → id wajib baru; aturan dibandingkan dengan id yang disamakan karena canonicalPolicy ikut menghitung id kursus. Buktikan ulang: cd signer && npm run verify:manage. JANGAN dibalik/diulang tanpa membuka kembali baris B140 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** Versi terbit yang digantikan sebuah draf versi baru, dalam bentuk yang sama di server dan halaman. */
export type VersionBase = { courseId: string, rubricHash: string | null, version: number }

/**
 * Hash aturan nilai isi draf SEANDAINYA id kursusnya `asId`. `canonicalPolicy` ikut menghitung id kursus, jadi dua versi hanya
 * bisa dibandingkan aturannya dengan id yang disamakan dulu. Null bila belum bisa dihitung (kunci belum lengkap — audit biasa
 * sudah melaporkannya).
 */
export function policyHashAs (p: DraftPayload, asId: string): Hex | null {
  try {
    const m = { schema: MANIFEST_SCHEMA, publishedAt: '1970-01-01T00:00:00Z', course: keyedCourse({ ...p.course, id: asId }, p.keys ?? {}) } as unknown as CourseManifest
    return rubricHashOf(m)
  } catch { return null }
}

/** Saran id versi baru: `<id dasar>-v<n>` (akhiran `-v<angka>` lama dibuang), dalam batas bentuk id kursus. */
export function versionedId (baseId: string, version: number): string {
  const root = String(baseId).replace(/-v\d+$/, '')
  return `${root.slice(0, 44 - String(version).length)}-v${version}`
}

/** Aturan versi baru terhadap versi terbit yang digantikannya (`base`); kosong bila draf ini bukan versi baru. */
export function versionProblems (p: DraftPayload, base: VersionBase | null): Problem[] {
  if (!base) return []
  const policy = policyHashAs(p, base.courseId)
  if (policy === null) return []
  const sameRules = policy === base.rubricHash
  const sameId = p.course.id === base.courseId
  if (sameRules && !sameId) return [{ where: p.course.id, what: `aturan nilai sama dengan versi terbit — versi baru memakai id yang sama (${base.courseId})` }]
  if (!sameRules && sameId) {
    return [{ where: p.course.id, what: `aturan nilai berubah dari versi terbit — beri id baru (mis. ${versionedId(base.courseId, base.version + 1)}) supaya kredensial lama tetap menunjuk aturan lamanya` }]
  }
  return []
}

/**
 * Audit draf: `auditCourse` (aturan kursus yang sama dengan kursus berkas) + batas editor + kelengkapan kunci.
 * `takenIds` = id kursus yang sudah dipakai (katalog berkas + draf hidup lain).
 */
export function auditDraft (p: DraftPayload, takenIds: Set<string> = new Set()): Problem[] {
  const out: Problem[] = []
  const c = p.course
  if (takenIds.has(c.id)) out.push({ where: c.id, what: 'id kursus sudah dipakai kursus lain' })
  if (c.weights.praktik !== 0) out.push({ where: c.id, what: 'bobot praktik harus 0 — praktik tidak disusun dari halaman' })
  for (const m of c.modules) {
    for (const l of m.lessons) {
      for (const q of l.quiz?.questions ?? []) {
        if (!p.keys[l.slug]?.[q.id]) out.push({ where: `${c.id}/${m.id}/${l.slug}/${q.id}`, what: 'soal tanpa kunci jawaban' })
        else if (p.keys[l.slug][q.id].answer >= q.options.length) out.push({ where: `${c.id}/${m.id}/${l.slug}/${q.id}`, what: 'kunci jawaban menunjuk pilihan yang tidak ada' })
      }
    }
  }
  out.push(...auditCourse(keyedCourse(c, p.keys)))
  return out
}
