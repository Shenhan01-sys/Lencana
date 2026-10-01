/**
 * `learning.ts` — permukaan belajar yang bicara ke BACKEND, bukan ke `localStorage` (B72).
 *
 * Kenapa berkas ini ada: halaman ini sudah lama menyimpan "progres" di perangkat peserta, dan itu
 * benar untuk draf karangan — tapi salah untuk state yang suatu hari jadi angka di ijazah. Sejak
 * 28 Sep inti punya `POST /enroll`, `POST /progress`, `GET /progress`, `POST /grade` di atas
 * Postgres, dengan otorisasi tanda tangan atas nonce satu-kali (`signer/src/db.js`). Menyimpan
 * bacaan di browser sambil menyebut produk kita "e-course" berarti kerangka umumnya bolong di
 * tempat yang paling mudah diperiksa orang (L8 §C.5/C.6).
 *
 * Tiga keputusan yang sengaja dibuat di sini:
 *
 *  1. **Identitas peserta = alamat EVM yang bisa menandatangani.** Yang pertama: dompet ekstensi
 *     (`window.ethereum`, `personal_sign`). Yang kedua — dan ini harus dibaca dengan jujurnya —
 *     "kunci perangkat": viem membuat kunci sementara di browser dan menyimpannya di
 *     `sessionStorage`, mati bersama tabnya. Itu identitas sungguhan secara kriptografis dan tidak
 *     pernah meninggalkan mesin peserta, tapi BUKAN identitas tahan lama: ganti perangkat = alamat
 *     baru = rekaman baru. UI menyebutnya, tidak menyembunyikannya.
 *     [Tambahan 1 Okt, B82/D57] Yang ketiga: **login email lewat Privy** (`privy.ts`). Peserta
 *     mendapat dompet tertanam yang sama di perangkat mana pun, jadi rekamannya ikut pindah; tulisan
 *     tetap ditandatangani per permintaan seperti dua jalur lain, dan penerbit mencatat ikatan
 *     alamat ↔ akun hanya sesudah memverifikasi token login dengan app secret (`POST /auth/privy`).
 *  2. **Angka kuis TIDAK dihitung di browser lagi.** Yang dikirim adalah PILIHAN (`picks`), dan
 *     server yang menilai terhadap kunci di manifest (`signer/src/quiz.js`). Sebelumnya halaman ini
 *     menghitung sendiri (`lms.ts` action `grade`) lalu mengirim angkanya ke mana pun — itu peserta
 *     menilai dirinya sendiri. ⚠️ Yang TIDAK berubah: kunci jawaban tetap ada di bundel browser,
 *     jadi soal tetap bisa dijawab dengan kunci. Yang hilang adalah pelaporan angka oleh peserta,
 *     bukan keterbukaan soalnya.
 *     [Koreksi 1 Okt, B80/D56: kalimat ⚠️ di atas basi sejak B80 ditutup — kunci jawaban sudah
 *     keluar dari bundel browser (hanya `manifest-keys.ts` di server yang memegangnya), dan
 *     `/grade` membalas pembahasan per soal tanpa indeks jawaban. Bukti: `npm run verify:quizkeys`
 *     di signer/, termasuk `--deployed` untuk bundel yang tayang. Kalimatnya dibiarkan supaya
 *     koreksinya terlihat.]
 *  3. **Draf esai tetap di perangkat.** Teks karangan tidak dikirim lewat jalur ini. Yang ditulis ke
 *     server adalah progres bacaan dan hasil kuis yang dinilai server; penilaian esai tetap milik
 *     penerbit (`issue --essay --judge`), dan antrean penilaiannya belum ada (B81 di backlog).
 *
 * `localStorage` tidak dibuang: ia tetap jadi cache supaya halaman tidak buta saat jaringan mati,
 * dan setiap angkanya diberi label "di perangkat ini". Yang berubah adalah siapa yang jadi acuan
 * ketika keduanya berbeda — dan itu backend, karena itu satu-satunya yang dibaca penerbit.
 */

// Lencana-B58 status=SELESAI 2026-09-29 — Ini yang menentukan urutan kerja front-end. Kalau FE dibangun lebih dulu, FE menyimpan state yang tidak dimiliki core — dan di produk yang menjual "bukti tidak bisa dik Buktikan ulang: npm run verify:attempts:live. JANGAN dibalik/diulang tanpa membuka kembali baris B58 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { stringToHex, type Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { PrivyIdentity } from './privy'

const EP_KEY = 'lencana-signer-url'
const ID_KEY = 'lencana-learner-v1'
const DEFAULT_EP = 'http://127.0.0.1:8787'
/** localStorage: "peramban ini punya sesi login email" — supaya tab baru tahu ada yang bisa dipulihkan. Tanpa data pribadi. */
const PRIVY_MARK = 'lencana-privy-v1'

export type LearnerKind = 'dompet' | 'perangkat' | 'privy'
export type LearnerIdentity = { address: string, kind: LearnerKind, email?: string | null }

type StoredIdentity = {
  address: string
  kind: LearnerKind
  /** Hanya ada untuk kind 'perangkat'; sessionStorage, hilang bersama tab. */
  pk?: Hex
  /** Hanya untuk kind 'privy': email akun, untuk ditampilkan ke pemiliknya sendiri. Tidak dikirim ke penerbit. */
  email?: string
}

/** Ikatan alamat ↔ akun login di penerbit (`POST /auth/privy`), seperti yang dijawab penerbit. */
export type AccountLink = { linked: boolean, note: string }

export type ServerSummary = {
  enrollmentId: number
  lessonsTotal: number
  lessonsCompleted: number
  allLessonsDone: boolean
  completed: string[]
  lessons: { lessonId: string, status: string }[]
  gradedAttempts: number
  bestScore: number | null
}

/** Umpan balik satu soal SESUDAH penyerahan (B80): benar/salah + alasan; indeks jawaban tidak dikirim server. */
export type QuizReviewItem = { itemId: string, correct: boolean, why: string }

export type GradeResult = {
  score: number, correct: number, total: number, passPct: number, verdict: string,
  attemptHash: string, lesson: string, gradedBy: string,
  // Lencana-B80 status=SELESAI 2026-10-01 — pembahasan kuis datang dari balasan /grade (benar/salah + alasan per soal), bukan dari kunci di bundel browser. Buktikan ulang: npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  review: QuizReviewItem[]
}

export type LearningSnapshot = {
  endpoint: string
  identity: LearnerIdentity | null
  /** Sesi login email sedang dipulihkan (tab baru); halaman menampilkan "memulihkan", bukan "belum ada identitas". */
  restoring: boolean
  /** Hasil `POST /auth/privy` terakhir; null untuk identitas yang bukan login email. */
  account: AccountLink | null
  summary: ServerSummary | null
  courseId: string | null
  pending: boolean
  error: string | null
  lastSync: number | null
  /** Hasil kuis terakhir dari SERVER, supaya halaman bisa mencetak angka yang bukan hitungannya sendiri. */
  lastGrade: GradeResult | null
  /** Tanda terima penyerahan esai dari SERVER: tanpa angka, dan halaman tidak boleh membuatnya tampak ada. */
  lastEssay: EssayReceipt | null
}

let state: LearningSnapshot = {
  endpoint: readLocal(EP_KEY) ?? DEFAULT_EP,
  identity: readIdentity(),
  restoring: false,
  account: null,
  summary: null,
  courseId: null,
  pending: false,
  error: null,
  lastSync: null,
  lastGrade: null,
  lastEssay: null,
}

/**
 * Semua akses storage lewat helper di bawah ini.
 *
 * Bukan gaya-gayaan: `src/verify.ts` sengaja bisa di-import dari Node supaya `npm run probe`
 * memeriksa berkas yang sama seperti yang dijalankan browser. Kalau `sessionStorage` disentuh
 * langsung, modul ini melempar `ReferenceError` di Node dan seluruh probe mati — jadi keadaan
 * "tidak ada storage" harus jadi jalur yang bisa ditempuh, bukan kecelakaan. Di peramban nyata
 * fungsinya sama; di mode privat storage memang tidak ada, dan halaman tetap jalan.
 */
function readLocal (k: string): string | null {
  try { return localStorage.getItem(k) } catch { return null }
}
function writeLocal (k: string, v: string): void {
  try { localStorage.setItem(k, v) } catch { /* mode privat: endpoint tetap dari default */ }
}
function dropLocal (k: string): void {
  try { localStorage.removeItem(k) } catch { /* mode privat: memang tidak ada */ }
}
function readSession (k: string): string | null {
  try { return sessionStorage.getItem(k) } catch { return null }
}
function writeSession (k: string, v: string): boolean {
  try { sessionStorage.setItem(k, v); return true } catch { return false }
}
function dropSession (k: string): void {
  try { sessionStorage.removeItem(k) } catch { /* sudah kosong */ }
}

function readIdentity (): LearnerIdentity | null {
  try {
    const raw = readSession(ID_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as StoredIdentity
    if (!p?.address) return null
    if (p.kind === 'privy') return { address: p.address, kind: 'privy', email: p.email ?? null }
    return { address: p.address, kind: p.kind === 'dompet' ? 'dompet' : 'perangkat' }
  } catch { return null }
}

const errText = (e: unknown): string => e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e)

export function endpoint (): string { return state.endpoint }
export function setEndpoint (url: string): void {
  const clean = url.trim().replace(/\/$/, '')
  state.endpoint = clean || DEFAULT_EP
  writeLocal(EP_KEY, state.endpoint)
  state.summary = null
  state.lastSync = null
}

export function snapshot (): LearningSnapshot { return state }
export function learnerAddress (): string | null { return state.identity?.address ?? null }

/**
 * Kunci sementara di perangkat ini — identitas sungguhan secara kriptografis, tapi tidak tahan
 * ganti perangkat. Kalau storage tidak ada (mode privat, atau modul ini di-import dari Node),
 * kunci TIDAK dibuat dan fungsi ini mengembalikan null: lebih baik halaman bilang "tidak bisa"
 * daripada pura-pura punya identitas yang hilang begitu tab ditutup.
 */
export function createDeviceLearner (): { address: string, kind: LearnerKind } | null {
  const pk = generatePrivateKey()
  const account = privateKeyToAccount(pk)
  const saved = writeSession(ID_KEY, JSON.stringify({ address: account.address, kind: 'perangkat', pk } satisfies StoredIdentity))
  if (!saved) return null
  state.identity = { address: account.address, kind: 'perangkat' }
  state.summary = null
  return state.identity
}

export async function connectWalletLearner (): Promise<{ ok: boolean, why?: string, identity?: { address: string, kind: LearnerKind } }> {
  const eth = (window as unknown as { ethereum?: { request: (a: { method: string, params?: unknown[] }) => Promise<unknown> } }).ethereum
  if (!eth) return { ok: false, why: 'Peramban ini tidak punya dompet Web3 (window.ethereum tidak ada).' }
  try {
    const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
    if (!accounts?.length) return { ok: false, why: 'Tidak ada akun yang dibagikan.' }
    writeSession(ID_KEY, JSON.stringify({ address: accounts[0], kind: 'dompet' } satisfies StoredIdentity))
    state.identity = { address: accounts[0], kind: 'dompet' }
    state.summary = null
    return { ok: true, identity: state.identity }
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e) }
  }
}

export function forgetLearner (): void {
  const wasPrivy = state.identity?.kind === 'privy' || hasPrivyMark()
  dropSession(ID_KEY)
  state.identity = null
  state.summary = null
  state.lastGrade = null
  if (wasPrivy) {
    // "Ganti identitas" pada login email = keluar dari Privy juga; kalau tidak, tab berikutnya
    // memulihkan sesi yang sama dan tombol ini tampak tidak bekerja.
    dropLocal(PRIVY_MARK)
    state.account = null
    void import('./privy').then((p) => p.privyLogout()).catch(() => { /* token lokal tetap sudah dibuang SDK */ })
  }
}

// ------------------------------------------------------------------ login email (Privy, B82/D57)

// Lencana-B82 status=TERBUKA 2026-10-01 — identitas ketiga peserta: login email Privy → dompet tertanam yang sama di perangkat mana pun; tanda tangan tetap per permintaan, ikatan alamat ↔ akun dicatat penerbit lewat POST /auth/privy; yang belum: uji dua peramban oleh builder (alamat sama sesudah login ulang). Buktikan ulang: npm run verify:privy (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
export function hasPrivyMark (): boolean { return readLocal(PRIVY_MARK) === '1' }

function adoptPrivy (id: PrivyIdentity): LearnerIdentity {
  writeSession(ID_KEY, JSON.stringify({ address: id.address, kind: 'privy', email: id.email ?? undefined } satisfies StoredIdentity))
  writeLocal(PRIVY_MARK, '1')
  state.identity = { address: id.address, kind: 'privy', email: id.email }
  state.summary = null
  state.lastGrade = null
  return state.identity
}

/**
 * Minta penerbit memverifikasi login ini dan mencatat ikatan alamat ↔ akun. Kegagalannya TIDAK
 * mencabut identitas: dompet tertanam tetap bisa menandatangani, dan setiap tulisan tetap diperiksa
 * tanda tangannya. Yang hilang kalau gagal hanya catatan ikatannya — dan halaman menyebut itu.
 */
async function linkPrivyAccount (): Promise<AccountLink> {
  const addr = learnerAddress()
  let token: string | null = null
  try { token = await (await import('./privy')).privyAccessToken() } catch { token = null }
  if (!addr || !token) {
    state.account = { linked: false, note: 'token login tidak tersedia, ikatan akun tidak dikirim ke penerbit' }
    return state.account
  }
  const r = await call('/auth/privy', { method: 'POST', body: { learner: addr, accessToken: token } })
  state.account = r.status === 200
    ? { linked: true, note: 'akun email tertaut ke alamat ini di penerbit' }
    : { linked: false, note: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return state.account
}

export async function sendPrivyCode (email: string): Promise<{ ok: boolean, why?: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, why: 'Itu bukan alamat email.' }
  try {
    await (await import('./privy')).privySendCode(email)
    return { ok: true }
  } catch (e) {
    return { ok: false, why: errText(e) }
  }
}

export async function connectPrivyLearner (email: string, code: string): Promise<{ ok: boolean, why?: string, identity?: LearnerIdentity, account?: AccountLink }> {
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, why: 'Kodenya 6 digit angka dari email.' }
  try {
    const id = adoptPrivy(await (await import('./privy')).privyLogin(email, code))
    const account = await linkPrivyAccount()
    return { ok: true, identity: id, account }
  } catch (e) {
    return { ok: false, why: errText(e) }
  }
}

/** Tab baru di peramban yang sudah login email: pulihkan identitasnya tanpa meminta kode lagi. */
export async function resumePrivyLearner (): Promise<LearnerIdentity | null> {
  if (state.identity || state.restoring || !hasPrivyMark()) return null
  state.restoring = true
  try {
    const id = await (await import('./privy')).privyRestore()
    if (!id) { dropLocal(PRIVY_MARK); return null }
    adoptPrivy(id)
    await linkPrivyAccount()
    return state.identity
  } catch {
    return null
  } finally {
    state.restoring = false
  }
}

function newNonce (): string {
  const b = new Uint8Array(9)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Menandatangani persis seperti yang diterima `authorizeLearner` (personal_sign / EIP-191). */
async function signMessage (message: string): Promise<{ signature?: string, why?: string }> {
  const id = state.identity
  if (!id) return { why: 'Belum ada identitas peserta — tanpa tanda tangan, tidak ada yang bisa ditulis atas nama alamatmu.' }
  if (id.kind === 'perangkat') {
    const raw = (() => { try { return JSON.parse(readSession(ID_KEY) ?? '{}') as StoredIdentity } catch { return null } })()
    if (!raw?.pk) return { why: 'Kunci perangkat tidak ada di sesi ini (tab baru?). Buat lagi identitasnya.' }
    return { signature: await privateKeyToAccount(raw.pk).signMessage({ message }) }
  }
  if (id.kind === 'privy') {
    try {
      return { signature: await (await import('./privy')).privySign(message, id.address) }
    } catch (e) {
      return { why: errText(e) }
    }
  }
  const eth = (window as unknown as { ethereum?: { request: (a: { method: string, params?: unknown[] }) => Promise<string> } }).ethereum
  if (!eth) return { why: 'Dompet tidak lagi tersedia di peramban ini.' }
  try {
    const signature = await eth.request({ method: 'personal_sign', params: [stringToHex(message), id.address] })
    return { signature }
  } catch (e) {
    return { why: e instanceof Error ? e.message : String(e) }
  }
}

async function call (path: string, init?: { method?: string, body?: unknown }): Promise<{ status: number, json: Record<string, unknown> | null, why?: string }> {
  try {
    const r = await fetch(state.endpoint + path, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    let json: Record<string, unknown> | null = null
    try { json = await r.json() as Record<string, unknown> } catch { /* bukan JSON */ }
    return { status: r.status, json }
  } catch (e) {
    return { status: 0, json: null, why: e instanceof Error ? e.message : String(e) }
  }
}

function fail (why: string): null {
  state.pending = false
  state.error = why
  return null
}

/**
 * Baca state server untuk satu kursus; kalau belum ada enrollment, enroll lebih dulu.
 * Enrollment memakai jumlah lesson yang dihitung SERVER dari katalog (`/enroll` membuang angka
 * kiriman klien), jadi peserta tidak bisa lulus dengan menulis "1".
 */
export async function syncCourse (courseId: string): Promise<ServerSummary | null> {
  const addr = learnerAddress()
  if (!addr) return fail('Belum ada identitas peserta.')
  state.pending = true
  state.courseId = courseId
  const got = await call(`/progress?learner=${encodeURIComponent(addr)}&course=${encodeURIComponent(courseId)}`)
  if (got.status === 200 && got.json) {
    state.summary = normalizeSummary(got.json)
    state.pending = false
    state.error = null
    state.lastSync = Date.now()
    return state.summary
  }
  if (got.status !== 404) return fail(got.why ?? `server menjawab ${got.status}`)
  const n = newNonce()
  const message = `lencana-enroll ${courseId} nonce=${n}`
  const s = await signMessage(message)
  if (!s.signature) return fail(s.why ?? 'tidak bisa menandatangani')
  const en = await call('/enroll', { method: 'POST', body: { learner: addr, course: courseId, message, signature: s.signature } })
  if (en.status !== 200) return fail(en.json?.error as string ?? en.why ?? `enroll ditolak (${en.status})`)
  const again = await call(`/progress?learner=${encodeURIComponent(addr)}&course=${encodeURIComponent(courseId)}`)
  if (again.status !== 200 || !again.json) return fail(again.why ?? `server menjawab ${again.status}`)
  state.summary = normalizeSummary(again.json)
  state.pending = false
  state.error = null
  state.lastSync = Date.now()
  return state.summary
}

function normalizeSummary (j: Record<string, unknown>): ServerSummary {
  return {
    enrollmentId: Number(j.enrollmentId ?? 0),
    lessonsTotal: Number(j.lessonsTotal ?? 0),
    lessonsCompleted: Number(j.lessonsCompleted ?? 0),
    allLessonsDone: j.allLessonsDone === true,
    completed: (j.completed as string[] | undefined) ?? [],
    lessons: (j.lessons as { lessonId: string, status: string }[] | undefined) ?? [],
    gradedAttempts: Number(j.gradedAttempts ?? 0),
    bestScore: j.bestScore === null || j.bestScore === undefined ? null : Number(j.bestScore),
  }
}

/**
 * Tandai satu lesson pada penerbit. Urutannya milik mesin state di server
 * (`locked -> unlocked -> started -> completed`); kalau kita mengirim lompatan, server menjawab
 * 422 dan halaman ini menampilkannya apa adanya — bukan diam-diam mengirim ulang status yang benar.
 */
export async function markLesson (courseId: string, lessonSlug: string, to: 'unlocked' | 'started' | 'completed', position = 0): Promise<{ ok: boolean, why?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada identitas peserta.' }
  state.pending = true
  const n = newNonce()
  const message = `lencana-progress ${lessonSlug} -> ${to} nonce=${n}`
  const s = await signMessage(message)
  if (!s.signature) {
    state.pending = false
    state.error = s.why ?? 'tidak bisa menandatangani'
    return { ok: false, why: state.error }
  }
  const r = await call('/progress', {
    method: 'POST',
    body: { learner: addr, course: courseId, lesson: lessonSlug, status: to, position, message, signature: s.signature },
  })
  state.pending = false
  if (r.status !== 200) {
    state.error = (r.json?.error as string) ?? r.why ?? `server menjawab ${r.status}`
    return { ok: false, why: state.error }
  }
  state.error = null
  await syncCourse(courseId)
  state.pending = false
  return { ok: true }
}

/**
 * Mengantar satu lesson sampai `completed` dengan mengikuti mesin state di server:
 * `locked -> unlocked -> started -> completed`.
 *
 * Kenapa tidak mengirim `completed` langsung: server menolak lompatan itu dengan 422 — dan penolakan
 * itu yang membuat "progres server-side" berarti sesuatu (`verify:db` memeriksa persis kasus ini).
 * Halaman ini jadi harus berjalan sesuai aturan yang sama, bukan minta pengecualian karena dia UI.
 */
export async function completeLesson (courseId: string, lessonSlug: string, position = 0): Promise<{ ok: boolean, why?: string }> {
  const statusOf = (s: string): string | undefined => state.summary?.lessons.find((l) => l.lessonId === s)?.status
  for (const to of ['unlocked', 'started', 'completed'] as const) {
    if (statusOf(lessonSlug) === 'completed') return { ok: true }
    if (statusOf(lessonSlug) === to) continue
    const r = await markLesson(courseId, lessonSlug, to, position)
    if (!r.ok) return r
  }
  return { ok: true }
}

/**
 * Kirim PILIHAN kuis untuk dinilai server. Angka yang kembali dari sini adalah satu-satunya angka
 * kuis yang halaman ini cetak sebagai "nilai"; hasil hitungan browser hanya dipakai kalau
 * penerbit tidak bisa dihubungi, dan itu selalu diberi label di UI.
 */
export async function submitQuiz (courseId: string, lessonSlug: string, picks: { itemId: string, choice: number }[]): Promise<GradeResult | null> {
  const addr = learnerAddress()
  if (!addr) return fail('Belum ada identitas peserta.')
  state.pending = true
  state.lastGrade = null
  const n = newNonce()
  const message = `lencana-grade ${courseId} ${lessonSlug} nonce=${n}`
  const s = await signMessage(message)
  if (!s.signature) return fail(s.why ?? 'tidak bisa menandatangani')
  const r = await call('/grade', {
    method: 'POST',
    body: { learner: addr, course: courseId, lesson: lessonSlug, picks, message, signature: s.signature },
  })
  state.pending = false
  if (r.status !== 201 || !r.json) return fail((r.json?.error as string) ?? r.why ?? `server menjawab ${r.status}`)
  const g = {
    score: Number(r.json.score), correct: Number(r.json.correct), total: Number(r.json.total),
    passPct: Number(r.json.passPct), verdict: String(r.json.verdict ?? ''),
    attemptHash: String(r.json.attemptHash ?? ''), lesson: String(r.json.lesson ?? lessonSlug),
    gradedBy: String(r.json.gradedBy ?? 'server'),
    // Hanya butir yang bentuknya benar yang dipakai: balasan server lama (tanpa `review`) → daftar
    // kosong, dan halaman tetap jalan tanpa pembahasan, bukan jatuh.
    review: (Array.isArray(r.json.review) ? r.json.review : [])
      .filter((x: unknown): x is QuizReviewItem => !!x && typeof (x as QuizReviewItem).itemId === 'string'
        && typeof (x as QuizReviewItem).correct === 'boolean' && typeof (x as QuizReviewItem).why === 'string'),
  }
  state.lastGrade = g
  state.error = null
  state.lastSync = Date.now()
  await syncCourse(courseId)
  state.pending = false
  return g
}

/** Tanda terima penyerahan esai: TIDAK ada angka di dalamnya, dan itu memang isinya. */
export type EssayReceipt = {
  attemptHash: string, attemptId: number, state: string, words: number,
  mechanicalPassed: number, mechanicalTotal: number, note: string, lesson: string
}

/**
 * Kirim TEKS esai ke penerbit (B81). Yang dikirim hanya tulisan — tidak ada skor, tidak ada rubrik;
 * kalau ada `score` di badan permintaan, server menolak dengan 400 dan kita tampilkan alasannya.
 *
 * Baris yang lahir dari sini ber-`score NULL` + `verdict incomplete` dan `submissions.state =
 * awaiting_judge`: ia terlihat di antrean penerbit, TIDAK dihitung sebagai nilai, dan tidak akan
 * membuat siapa pun lulus. Angka masuk nanti lewat `POST /essay/judgement` yang ditandatangani
 * EOA penerbit — bukan oleh halaman ini.
 *
 * Teks karangan mendarat di tabel yang tidak dibaca rute publik mana pun. Yang suatu hari bisa
 * dilihat verifier adalah `attempt_hash`-nya, bukan isinya — itu janji yang ditulis `results.js`
 * (`essayTextIncluded: false`) dan ditegakkan di pilihan skema ini.
 */
export async function submitEssay (courseId: string, lessonSlug: string, text: string): Promise<EssayReceipt | null> {
  const addr = learnerAddress()
  if (!addr) return fail('Belum ada identitas peserta — tanpa tanda tangan, karangan tidak bisa diserahkan atas nama alamatmu.')
  if (!text.trim()) return fail('Karangan kosong tidak diserahkan: tidak ada yang bisa dinilai.')
  state.pending = true
  const n = newNonce()
  const message = `lencana-essay ${lessonSlug} nonce=${n}`
  const s = await signMessage(message)
  if (!s.signature) return fail(s.why ?? 'tidak bisa menandatangani')
  const r = await call('/essay', {
    method: 'POST',
    body: { learner: addr, course: courseId, lesson: lessonSlug, text, message, signature: s.signature },
  })
  state.pending = false
  if (r.status !== 201 || !r.json) return fail((r.json?.error as string) ?? r.why ?? `server menjawab ${r.status}`)
  const rec: EssayReceipt = {
    attemptHash: String(r.json.attemptHash ?? ''), attemptId: Number(r.json.attemptId ?? 0),
    state: String(r.json.state ?? 'awaiting_judge'), words: Number(r.json.words ?? 0),
    mechanicalPassed: Number(r.json.mechanicalPassed ?? 0), mechanicalTotal: Number(r.json.mechanicalTotal ?? 0),
    note: String(r.json.note ?? ''), lesson: lessonSlug,
  }
  state.lastEssay = rec
  state.error = null
  await syncCourse(courseId)
  state.pending = false
  return rec
}

/** Tanda terima esai terakhir, untuk dicetak halaman tanpa menyimpannya di mana pun. */
export function lastEssay (): EssayReceipt | null { return state.lastEssay }
