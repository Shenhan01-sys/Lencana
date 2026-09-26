/**
 * Kontrak isi kursus.
 *
 * Kenapa berkas ini ada dan bukan halaman per halaman: satu kursus yang sungguh-sungguh
 * seperti LMS punya puluhan halaman (modul, submateri, kuis, tugas, referensi). Kalau
 * setiap halaman itu ditulis sebagai komponen, biayanya linear terhadap jumlah halaman dan
 * kita tidak akan sempat. Kalau halaman adalah **render atas data**, komponen yang ditulis
 * tangan cuma beberapa dan sisanya tinggal menulis isinya.
 *
 * Berkas ini sengaja:
 *  - **bebas-DOM** — supaya `scripts/probe.ts` bisa mengaudit isi kursus di Node, sama seperti
 *    ia mengaudit pembacaan chain. Isi yang tidak bisa diaudit akan diam-diam rusak
 *    (kunci jawaban di luar rentang pilihan, slug duplikat, bobot tidak berjumlah 100).
 *  - **bertipe ketat** — salah tulis tertangkap `tsc --noEmit` di build, bukan saat juri klik.
 *
 * Dan satu hal yang TIDAK boleh dibalik: `id` kursus di sini bukan label tampilan. Ia adalah
 * bahan baku `courseId` di chain. `SeedDemo.s.sol` memakai `keccak256("web3-dasar-2026")`,
 * jadi kursus dengan id yang sama di sini menunjuk **kredensial yang sudah tertambang**, bukan
 * ke data tandingan yang kebetulan mirip.
 */
import { encodePacked, keccak256, toBytes, type Address, type Hex } from 'viem'

export { EMPTY_UID } from './abi'

/** Enam jenis lesson. Angka ini bukan hiasan: tiap jenis punya bentuk render + cara dinilai sendiri. */
export type LessonKind = 'bacaan' | 'kuis' | 'esai' | 'praktik' | 'kasus' | 'referensi'

export const LESSON_KINDS: LessonKind[] = ['bacaan', 'kuis', 'esai', 'praktik', 'kasus', 'referensi']

/**
 * Balok isi. Dibatasi sedikit jenis, bukan bebas, supaya `render.ts` tetap bisa menjaga
 * bentuk halaman dan supaya `auditCourse` punya sesuatu yang bisa diperiksa.
 */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'code'; lang: string; code: string }
  /** Catatan kejujuran: hal yang sering disalahpahami peserta, atau batas klaim kita. */
  | { t: 'note'; text: string }
  | { t: 'quote'; text: string; source: string }
  | { t: 'terms'; items: { term: string; def: string }[] }
  | { t: 'links'; items: { label: string; url: string; kind: 'resmi' | 'komunitas' | 'kode' }[] }
  /** "perintilan" yang bikin LMS terasa nyata: instruksi dikerjakan, bukan dibaca. */
  | { t: 'try'; prompt: string; hint?: string }

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** Indeks jawaban benar. Divalidasi `auditCourse` — jawaban di luar rentang adalah bug sunyi. */
  answer: number
  /** Kenapa. Kuis yang tidak menjelaskan alasan hanya melatih menebak. */
  why: string
}

export type Quiz = { questions: QuizQuestion[]; passPct: number }

export type RubricItem = { label: string; max: number }

export type Essay = {
  prompt: string
  minWords: number
  rubric: RubricItem[]
  /** Contoh jawaban yang TIDAK diterima + alasannya, supaya rubrik tidak jadi teka-teki. */
  guidance: string[]
}

export type Lesson = {
  slug: string
  title: string
  minutes: number
  kind: LessonKind
  summary: string
  blocks: Block[]
  quiz?: Quiz
  essay?: Essay
}

export type Module = {
  /** id string, mis. "m1" — dipakai di URL, jadi harus stabil dan ramah-URL. */
  id: string
  title: string
  blurb: string
  lessons: Lesson[]
}

export type Course = {
  /** Bahan baku `courseId` on-chain. Mengubahnya mengubah kredensial yang menunjuk kursus ini. */
  id: string
  title: string
  institution: string
  level: 'dasar' | 'menengah' | 'lanjutan'
  blurb: string
  audience: string[]
  /** Yang bisa dilakukan peserta sesudah lulus — ditulis sebagai kerjaan, bukan sebagai topik. */
  outcome: string[]
  /** Kredensial kursus yang harus sudah dimiliki; dipetakan ke `refUID` di chain. */
  prereqCourseId?: string
  /** Teks `achievement.criteria` pada dokumen OB3.0. WAJIB di spesifikasi, bukan opsional. */
  criteria: string
  /** Bobot penilaian, harus berjumlah 100. */
  weights: { kuis: number; esai: number; praktik: number }
  passMark: number
  validDays: number
  modules: Module[]
}

// ---------------------------------------------------------------- derivasi id

export function courseIdOf(course: Course): Hex {
  return keccak256(toBytes(course.id))
}

export function lessonIdOf(course: Course, lesson: Lesson): Hex {
  return keccak256(toBytes(`${course.id}/${lesson.slug}`))
}

/**
 * Padanan dari `_vcHash()` di `SeedDemo.s.sol`.
 *
 * ⚠️ DUA bentuk, dan bedanya tidak bisa diakali:
 *   tingkat kursus  -> keccak256(abi.encodePacked("vc:", peserta, courseId))
 *   tingkat lesson  -> keccak256(abi.encodePacked("vc:", peserta, courseId, lessonId))
 * Yang kedua dipakai `CredentialResolver.fork.t.sol` (`_lessonHash`). Mengirim `lessonId`
 * kosong ke fungsi ini TIDAK menghasilkan hash kursus — jadi pemanggilnya harus memilih
 * dengan sadar, dan jangan pernah memberi `EMPTY_UID` sebagai `lessonId` lalu berharap
 * cocok dengan kredensial kursus.
 */
export function credentialHashOf(holder: Address, courseId: Hex, lessonId?: Hex): Hex {
  // `keccak256` di LUAR, bukan di dalam: `encodePacked` hanya menyusun byte, bukan menghash.
  // Versi pertama fungsi ini lupa membungkusnya dan menghasilkan 54 byte yang tampak meyakinkan
  // — tertangkap probe sebagai "hash yang panjangnya salah", dan memang itu cara ia harus ketahuan.
  return lessonId
    ? keccak256(encodePacked(['string', 'address', 'bytes32', 'bytes32'], ['vc:', holder, courseId, lessonId]), 'hex')
    : keccak256(encodePacked(['string', 'address', 'bytes32'], ['vc:', holder, courseId]), 'hex')
}

// ---------------------------------------------------------------- inventaris

export type CourseStats = {
  modules: number
  lessons: number
  /** Halaman yang benar-benar bisa dibuka orang: 1 silabus + N modul + M lesson. */
  pages: number
  minutes: number
  quizQuestions: number
  essays: number
  kinds: Record<LessonKind, number>
}

export function lessonsOf(course: Course): Lesson[] {
  return course.modules.flatMap((m) => m.lessons)
}

export function courseStats(course: Course): CourseStats {
  const lessons = lessonsOf(course)
  const kinds = Object.fromEntries(LESSON_KINDS.map((k) => [k, 0])) as Record<LessonKind, number>
  let quizQuestions = 0
  let essays = 0
  for (const l of lessons) {
    kinds[l.kind] += 1
    quizQuestions += l.quiz?.questions.length ?? 0
    if (l.essay) essays += 1
  }
  return {
    modules: course.modules.length,
    lessons: lessons.length,
    pages: 1 + course.modules.length + lessons.length,
    minutes: lessons.reduce((a, l) => a + l.minutes, 0),
    quizQuestions,
    essays,
    kinds,
  }
}

// ---------------------------------------------------------------- audit isi

export type Problem = { where: string; what: string }

/**
 * Pemeriksaan konsistensi isi. Dipanggil `scripts/probe.ts` lewat `COURSES`, jadi rusak
 * sedikit -> probe merah. Ini satu-satunya alasan angka "N halaman" di README boleh ditulis:
 * ia dihitung dari data, bukan dari perasaan.
 */
export function auditCourse(course: Course): Problem[] {
  const out: Problem[] = []
  const bad = (where: string, what: string) => out.push({ where, what })

  if (!course.id.trim()) bad(course.id || '(kosong)', 'id kursus kosong')
  if (!course.criteria.trim()) bad(course.id, 'achievement.criteria kosong — wajib di OB3.0')
  if (course.passMark <= 0 || course.passMark > 100) bad(course.id, `passMark ${course.passMark} di luar 1..100`)
  if (course.validDays <= 0) bad(course.id, `validDays ${course.validDays} harus positif`)

  const w = course.weights
  const sum = w.kuis + w.esai + w.praktik
  if (sum !== 100) bad(course.id, `bobot penilaian berjumlah ${sum}, bukan 100`)

  if (course.prereqCourseId && course.prereqCourseId === course.id) {
    bad(course.id, 'kursus menjadikan dirinya sendiri prasyarat')
  }

  if (!course.modules.length) bad(course.id, 'tidak punya modul')

  // Durasi itu hasil hitung (courseStats), bukan kalimat yang ditulis tangan. Alasannya bukan
  // estetika: `blurb` tercetak menjadi `achievement.description` pada dokumen yang sudah bertanda
  // tangan dan tidak bisa dikoreksi setelah terbit — jadi angka durasi di teks adalah bug yang
  // bisa ditandatangani.
  if (/\bmenit\b/i.test(course.blurb)) {
    bad(course.id, 'blurb menyebut durasi dalam menit — durasi dihitung dari lesson, jangan ditulis di teks')
  }

  const moduleIds = new Set<string>()
  const slugs = new Set<string>()

  for (const m of course.modules) {
    if (moduleIds.has(m.id)) bad(course.id, `id modul duplikat: ${m.id}`)
    moduleIds.add(m.id)
    if (!/^[a-z0-9-]+$/.test(m.id)) bad(`${course.id}/${m.id}`, 'id modul bukan ramah-URL (a-z0-9-)')
    if (!m.title.trim()) bad(`${course.id}/${m.id}`, 'judul modul kosong')
    if (!m.lessons.length) bad(`${course.id}/${m.id}`, 'modul tanpa lesson — halaman silabus akan menampilkannya kosong')

    for (const l of m.lessons) {
      const where = `${course.id}/${m.id}/${l.slug}`
      if (slugs.has(l.slug)) bad(where, 'slug lesson duplikat dalam kursus (lessonId akan tabrakan)')
      slugs.add(l.slug)
      if (!/^[a-z0-9-]+$/.test(l.slug)) bad(where, 'slug bukan ramah-URL (a-z0-9-)')
      if (!l.title.trim()) bad(where, 'judul kosong')
      if (!l.summary.trim()) bad(where, 'ringkasan kosong — kartu lesson di silabus jadi hampa')
      if (l.minutes <= 0) bad(where, `perkiraan durasi ${l.minutes} menit tidak masuk akal`)
      if (!LESSON_KINDS.includes(l.kind)) bad(where, `jenis "${l.kind}" tidak dikenal`)
      if (!l.blocks.length) bad(where, 'tidak ada balok isi')

      // Jenis menentukan beban penilaiannya, dan itu harus konsisten.
      if (l.kind === 'kuis' && !l.quiz) bad(where, 'jenis kuis tanpa kuis')
      if (l.kind === 'esai' && !l.essay) bad(where, 'jenis esai tanpa esai')
      if (l.kind !== 'kuis' && l.quiz) bad(where, 'punya kuis tapi bukan jenis kuis')
      if (l.kind !== 'esai' && l.essay) bad(where, 'punya esai tapi bukan jenis esai')

      for (const [i, b] of l.blocks.entries()) {
        if (b.t === 'ul' || b.t === 'ol') if (!b.items.length) bad(`${where}#${i}`, 'daftar kosong')
        if (b.t === 'p' || b.t === 'h' || b.t === 'note') if (!b.text.trim()) bad(`${where}#${i}`, 'teks kosong')
        if (b.t === 'quote') if (!b.source.trim()) bad(`${where}#${i}`, 'kutipan tanpa sumber')
        if (b.t === 'links') for (const it of b.items) {
          if (!/^https?:\/\//.test(it.url)) bad(`${where}#${i}`, `tautan bukan URL absolut: ${it.url}`)
        }
      }

      if (l.quiz) {
        const q = l.quiz
        if (q.passPct <= 0 || q.passPct > 100) bad(where, `passPct ${q.passPct} di luar 1..100`)
        if (!q.questions.length) bad(where, 'kuis tanpa soal')
        const qids = new Set<string>()
        for (const [i, item] of q.questions.entries()) {
          const wq = `${where}/${item.id || `soal-${i}`}`
          if (qids.has(item.id)) bad(wq, 'id soal duplikat')
          qids.add(item.id)
          if (item.options.length < 2) bad(wq, `hanya ${item.options.length} pilihan — bukan pilihan ganda`)
          if (item.answer < 0 || item.answer >= item.options.length) {
            bad(wq, `kunci jawaban ${item.answer} di luar rentang 0..${item.options.length - 1}`)
          }
          if (item.options.some((o) => !o.trim())) bad(wq, 'ada pilihan kosong')
          if (!item.why.trim()) bad(wq, 'tanpa penjelasan kenapa — kuis hanya melatih menebak')
        }
      }

      if (l.essay) {
        const e = l.essay
        const total = e.rubric.reduce((a, r) => a + r.max, 0)
        if (total !== 100) bad(where, `rubrik berjumlah ${total}, bukan 100`)
        if (!e.rubric.length) bad(where, 'rubrik kosong')
        if (e.minWords < 30) bad(where, `minWords ${e.minWords} terlalu rendah untuk dinilai`)
        if (!e.guidance.length) bad(where, 'tanpa contoh yang tidak diterima')
      }
    }
  }

  // Prasyarat menunjuk kursus yang terdaftar -> diperiksa pemanggil lewat `auditCatalog`.
  return out
}

/**
 * Audit silang katalog: id harus unik, dan setiap `prereqCourseId` harus menunjuk kursus yang
 * ada. Rantai prasyarat adalah hal yang ditegakkan `CredentialResolver` di chain — kalau datanya
 * sendiri menunjuk hantu, yang bocor adalah cerita, bukan hanya tampilan.
 */
export function auditCatalog(courses: Course[], knownIds: Set<string> = new Set(courses.map((c) => c.id))): Problem[] {
  const out: Problem[] = []
  const ids = new Set<string>()
  for (const c of courses) {
    if (ids.has(c.id)) out.push({ where: c.id, what: 'id kursus duplikat di katalog' })
    ids.add(c.id)
    if (c.prereqCourseId && !knownIds.has(c.prereqCourseId)) {
      out.push({ where: c.id, what: `prasyarat menunjuk "${c.prereqCourseId}" yang tidak ada di katalog` })
    }
    out.push(...auditCourse(c))
  }
  return out
}
