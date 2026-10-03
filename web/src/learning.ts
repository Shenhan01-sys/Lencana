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
import { createPublicClient, http, stringToHex, type Hex } from 'viem'
import { defaultEndpoint } from './verify'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import type { PrivyIdentity } from './privy'
import type { Course, Problem, QuizKeys } from './content'
import type { CourseManifest } from './manifest'
import { normalizeDraft, draftHash } from './authoring'
import { robotSvg, withAvatar, cleanName, parseAvatar, NAME_MAX, type Avatar } from './robot'
import type { AgentMarket } from './market'

const EP_KEY = 'lencana-signer-url'
const ID_KEY = 'lencana-learner-v1'
const AUTH_KEY = 'lencana-explicit-learner-session-v1'
/**
 * Dibuka lewat terowongan (mis. ngrok dari HP): `127.0.0.1` di peramban itu adalah HP-nya sendiri, jadi signer dipakai lewat
 * proxy vite `/signer` di asal yang sama (`web/vite.config.ts`, server dev maupun `vite preview`). Berlaku di server dev, dan di
 * build yang sengaja dibuat untuk terowongan (`VITE_SIGNER_SAME_ORIGIN=1`); build produksi biasa dan peramban lokal tidak berubah.
 */
const DEFAULT_EP = (import.meta.env?.DEV || import.meta.env?.VITE_SIGNER_SAME_ORIGIN === '1') && typeof location !== 'undefined' && !['127.0.0.1', 'localhost'].includes(location.hostname)
  ? `${location.origin}/signer`
  : 'http://127.0.0.1:8787'
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
  /** B125: kursus yang menolak enrollment karena belum dibayar (penerbit menjawab 402) — kelasnya menunjuk ke halaman bayar. */
  needsPayment: string | null
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
  needsPayment: null,
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
 * Sesi peserta = akun yang masuk lewat login (Google/email, B82). Sejak D59 (2 Okt) kunci perangkat dan dompet
 * ekstensi tidak lagi membuka halaman internal: platform e-course harus tahu siapa akunnya. Penandanya di
 * localStorage sengaja bertahan lintas tab; tanpa itu penjaga rute mengusir tab baru sebelum
 * `resumePrivyLearner` sempat memulihkan dompetnya.
 */
export function hasExplicitLearnerSession (): boolean {
  return hasPrivyMark()
}

function setExplicitLearnerSession (active: boolean): void {
  if (active) writeSession(AUTH_KEY, 'active')
  else dropSession(AUTH_KEY)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('lencana:learner-session-change'))
}

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
  setExplicitLearnerSession(true)
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
    setExplicitLearnerSession(true)
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
  // Sesudah penanda Privy dibuang: pendengar "sesi berubah" harus melihat keadaan akhir, bukan setengah.
  setExplicitLearnerSession(false)
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
  setExplicitLearnerSession(true)
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

/** Metode masuk yang aktif di app login (Google hanya kalau dinyalakan di sana). Gagal dibaca → email saja. */
export async function loginMethods (): Promise<{ google: boolean, email: boolean }> {
  try {
    return await (await import('./privy')).privyLoginMethods()
  } catch {
    return { google: false, email: true }
  }
}

/** Mulai login Google: halaman pergi ke Google dan kembali ke `redirectURI`. */
export async function startGoogleLogin (redirectURI: string): Promise<{ ok: boolean, why?: string }> {
  try {
    await (await import('./privy')).privyGoogleStart(redirectURI)
    return { ok: true }
  } catch (e) {
    return { ok: false, why: errText(e) }
  }
}

/** Kembali dari Google membawa kode sekali-pakai: tukar dengan sesi, pasang dompet, catat ikatan akun di penerbit. */
export async function finishGoogleLogin (code: string, oauthState: string): Promise<{ ok: boolean, why?: string, identity?: LearnerIdentity, account?: AccountLink }> {
  try {
    const id = adoptPrivy(await (await import('./privy')).privyGoogleFinish(code, oauthState))
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

async function call (path: string, init?: { method?: string, body?: unknown, headers?: Record<string, string>, timeoutMs?: number }): Promise<{ status: number, json: Record<string, unknown> | null, why?: string }> {
  try {
    const r = await fetch(state.endpoint + path, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'content-type': 'application/json', ...(init.headers ?? {}) } : init?.headers,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init?.timeoutMs ?? 15_000),
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
  // Ringkasan kursus lain tidak boleh tampil sebagai ringkasan kursus ini (terlihat saat B125: kelas berbayar memperlihatkan
  // angka kursus sebelumnya, dan catatan "kursus berbayar" tertutup olehnya).
  if (state.courseId !== courseId) state.summary = null
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
  if (en.status === 402) {
    // B125: kursus berbayar — kelas terbuka sesudah peserta membayar di halaman kursus, bukan didaftarkan otomatis.
    state.needsPayment = courseId
    return fail('Kursus ini berbayar: kelasnya terbuka sesudah kamu membayar di halaman kursus.')
  }
  if (en.status !== 200) return fail(en.json?.error as string ?? en.why ?? `enroll ditolak (${en.status})`)
  if (state.needsPayment === courseId) state.needsPayment = null
  const again = await call(`/progress?learner=${encodeURIComponent(addr)}&course=${encodeURIComponent(courseId)}`)
  if (again.status !== 200 || !again.json) return fail(again.why ?? `server menjawab ${again.status}`)
  state.summary = normalizeSummary(again.json)
  state.pending = false
  state.error = null
  state.lastSync = Date.now()
  return state.summary
}

/** Satu usaha yang sudah tercatat di penerbit, sebagaimana dikembalikan `POST /me/records` (B124). */
export type MyAttempt = {
  lesson: string
  kind: string
  attemptNo: number
  score: number | null
  verdict: string | null
  gradedByAgent: number | null
  judgeModel: string | null
  at: string
  review: { decision: string, finalScore: number | null, at: string | null } | null
  /** B126: praktik yang dinilai chain (B121) — hanya itu yang dihitung rubrik. Tidak ada di jawaban server lama. */
  chainChecked?: boolean
}
export type MyOrder = { asset: string, amount: string, state: string, tx: string | null, at: string }
export type MyCourseRecord = { courseId: string, status: string, enrolledAt: string, summary: ServerSummary | null, attempts: MyAttempt[], orders: MyOrder[] }

/**
 * Rekaman belajar milik akun ini di penerbit (B124): semua kursus yang diikuti, ringkasannya, dan usaha yang dinilai.
 * Nilai adalah data pribadi, jadi permintaannya ditandatangani pemilik akun dengan pesan khusus `lencana-records` —
 * tanda tangan untuk keperluan lain tidak diterima rute ini.
 */
export async function readMyRecords (onStep?: (step: 0 | 1) => void): Promise<{ ok: boolean, why?: string, courses?: MyCourseRecord[] }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-records nonce=${newNonce()}`
  // B126: tahap yang benar-benar dilalui — dashboard menampilkannya selama memuat (tanda tangan, lalu penerbit).
  onStep?.(0)
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  onStep?.(1)
  const r = await call('/me/records', { method: 'POST', body: { learner: addr, message, signature: s.signature } })
  if (r.status !== 200 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  const rows = (r.json.courses as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    courses: rows.map((c) => ({
      courseId: String(c.courseId),
      status: String(c.status ?? ''),
      enrolledAt: String(c.enrolledAt ?? ''),
      summary: c.summary ? normalizeSummary(c.summary as Record<string, unknown>) : null,
      attempts: (c.attempts as MyAttempt[] | undefined) ?? [],
      orders: (c.orders as MyOrder[] | undefined) ?? [],
    })),
  }
}

/** Kursi penerbit akun ini (B128): pemegang kunci penerbit (`issuer`) atau anggota yang diberi kunci itu (`member`). */
export type PublisherSeat = {
  issuer: string
  slug: string | null
  name: string | null
  via: 'issuer' | 'member'
  canHire: boolean
  canAppoint: boolean
  since: string | null
}
export type OwnedAgent = { agentId: string, registry: string, wallet: string | null, tariff: { token: string, amount: string } | null }
/** B129: pengajuan anggota penerbit terakhir akun ini (menunggu / ditolak / disetujui). */
export type MemberRequest = { id: number, status: 'pending' | 'approved' | 'rejected', note: string | null, createdAt: string, decidedAt: string | null }
export type PublisherRef = { address: string, slug: string | null, name: string | null }
/**
 * B131 (D66): peran efektif akun — satu peran untuk akun nyata; akun dev (dummy builder) memegang semua kursi menurut fakta.
 * `via`: 'chosen' (pilihan bertanda tangan), 'records' (sudah belajar), 'issuer' / 'membership' / 'agents' (fakta), 'dev'.
 */
export type AccountRole = {
  role: 'learner' | 'publisher' | 'owner' | null
  via: 'chosen' | 'records' | 'issuer' | 'membership' | 'agents' | 'dev' | null
  dev: boolean
  canChoose: boolean
  chosenAt: string | null
}
export type MyRoles = { address: string, publisher: PublisherSeat | null, agents: OwnedAgent[], request: MemberRequest | null, issuer: PublisherRef | null, account: AccountRole }

/**
 * Kursi akun ini (B128, RF7 langkah C1), dibaca penerbit dari fakta: kunci penerbit, keanggotaan bertanda tangan kunci
 * itu, dan `ownerOf` di registry ERC-8004. Permintaannya bertanda tangan (`lencana-roles`) karena keanggotaan adalah
 * data akun — tanda tangan untuk keperluan lain tidak diterima rute ini.
 */
export async function readMyRoles (): Promise<{ ok: boolean, why?: string, roles?: MyRoles }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-roles nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/me/roles', { method: 'POST', body: { learner: addr, message, signature: s.signature } })
  if (r.status !== 200 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  const roles = (r.json.roles ?? {}) as { publisher?: PublisherSeat | null, agentOwner?: { agents?: OwnedAgent[] } | null }
  return {
    ok: true,
    roles: {
      address: String(r.json.address ?? addr), publisher: roles.publisher ?? null, agents: roles.agentOwner?.agents ?? [],
      request: (r.json.publisherRequest as MemberRequest | null | undefined) ?? null, issuer: (r.json.publisherIssuer as PublisherRef | null | undefined) ?? null,
      account: (r.json.account as AccountRole | undefined) ?? { role: null, via: null, dev: false, canChoose: false, chosenAt: null },
    },
  }
}

// Lencana-B131 status=TERBUKA 2026-10-03 — akun memilih perannya sekali (pesan lencana-role bertanda tangan akun, POST /me/role); memilih Penerbit sekaligus mengajukan keanggotaan. Buktikan ulang: cd signer && npm run verify:account, lalu uji peramban T57. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * B131 (D66): pilih peran akun ini — sekali, tidak bisa diganti. Pesan menyebut perannya; untuk Penerbit juga penerbitnya,
 * karena memilih Penerbit adalah mengajukan keanggotaan ke penerbit itu (kursinya tetap lahir dari persetujuan kunci penerbit).
 */
export async function chooseMyRole (role: 'learner' | 'publisher' | 'owner', opts: { issuer?: string, note?: string } = {}): Promise<{ ok: boolean, why?: string, request?: MemberRequest }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  if (role === 'publisher' && !opts.issuer) return { ok: false, why: 'Server ini tidak punya penerbit untuk dilamar.' }
  const message = role === 'publisher'
    ? `lencana-role role=publisher issuer=${String(opts.issuer).toLowerCase()} nonce=${newNonce()}`
    : `lencana-role role=${role} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/me/role', { method: 'POST', body: { learner: addr, role, note: opts.note?.trim() || null, message, signature: s.signature } })
  if (r.status !== 201) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, request: (r.json?.request as MemberRequest | null | undefined) ?? undefined }
}

// Lencana-B133 status=TERBUKA 2026-10-03 — penyusunan kursus dari halaman: daftar draf, simpan (tanda tangan atas hash isi yang dihitung dengan modul skema yang sama dengan server), ajukan; katalog kursus terbit dibaca tanpa kunci. Buktikan ulang: cd signer && npm run verify:authoring, lalu uji peramban T59. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** Satu draf kursus (B133). `keys` hanya ada untuk draf milik akun ini. */
export type CourseDraft = {
  id: number, issuer: string, author: string, courseId: string, status: 'draft' | 'submitted' | 'published' | 'rejected',
  course: Course, keys?: QuizKeys, price: string | null, contentHash: string, problems: Problem[], submittedAt: string | null,
  rubricHash: string | null, manifestHash: string | null, publishedAt: string | null, decidedNote: string | null, decidedAt: string | null,
  createdAt: string, updatedAt: string, origin: string,
}
/** Isi editor sebelum dinormalkan: bentuk yang sama dengan `DraftPayload`, boleh belum lengkap. */
export type DraftInput = { course: Record<string, unknown>, keys: QuizKeys, price: string | null }

/** Draf penerbit akun ini (bertanda tangan `lencana-drafts`). */
export async function readCourseDrafts (includeTest = false): Promise<{ ok: boolean, why?: string, status?: number, canAuthor?: boolean, institution?: string | null, drafts?: CourseDraft[] }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-drafts nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/publisher/drafts', { method: 'POST', body: { learner: addr, includeTest, message, signature: s.signature } })
  if (r.status !== 200 || !r.json) return { ok: false, status: r.status, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, canAuthor: r.json.canAuthor === true, institution: (r.json.institution as string | null) ?? null, drafts: (r.json.drafts as CourseDraft[]) ?? [] }
}

/**
 * Simpan draf. Isi dinormalkan di sini dengan modul skema yang sama dengan server (`authoring.ts`), lalu akun menandatangani
 * hash-nya — server menyimpan hanya bila hash kiriman = hash yang ia hitung sendiri.
 */
export async function saveCourseDraft (input: DraftInput, draftId: number | null, institution: string): Promise<{ ok: boolean, why?: string, problems?: string[], draft?: CourseDraft }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const n = normalizeDraft(input, institution)
  if (!n.payload) return { ok: false, why: 'Isi draf belum sesuai bentuk editor.', problems: n.errors }
  const message = `lencana-draft save draft=${draftId ?? 'new'} course=${n.payload.course.id} hash=${draftHash(n.payload)} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/publisher/drafts/save', { method: 'POST', body: { learner: addr, draftId, payload: n.payload, message, signature: s.signature }, timeoutMs: 30_000 })
  if (r.status !== 200) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}`, problems: (r.json?.problems as string[] | undefined) }
  return { ok: true, draft: r.json?.draft as CourseDraft }
}

/** Ajukan draf ke kunci penerbit; pesan mengikat hash isi yang tersimpan. */
export async function submitCourseDraft (draftId: number, contentHash: string): Promise<{ ok: boolean, why?: string, draft?: CourseDraft }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-draft submit draft=${draftId} hash=${contentHash} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/publisher/drafts/submit', { method: 'POST', body: { learner: addr, draftId, message, signature: s.signature } })
  if (r.status !== 200) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, draft: r.json?.draft as CourseDraft }
}

/** Kursus yang disusun di halaman dan diterbitkan kunci penerbit — publik, tanpa kunci kuis. */
export async function readPublishedCourses (timeoutMs = 4000): Promise<{ manifest: CourseManifest, price: string | null }[]> {
  const r = await call('/catalog/published', { timeoutMs })
  return r.status === 200 && Array.isArray(r.json?.courses) ? r.json.courses as { manifest: CourseManifest, price: string | null }[] : []
}

/**
 * B129: ajukan diri menjadi anggota penerbit. Ditandatangani akun ini dan menyebut penerbitnya; pengajuan tidak memberi
 * wewenang apa pun — kunci penerbit yang memutuskan.
 */
export async function requestPublisherMembership (issuer: string, note?: string): Promise<{ ok: boolean, why?: string, request?: MemberRequest }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-member-request issuer=${issuer.toLowerCase()} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/me/member-request', { method: 'POST', body: { learner: addr, note: note?.trim() || null, message, signature: s.signature } })
  const request = (r.json?.request as MemberRequest | undefined) ?? undefined
  if (r.status !== 201) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}`, request }
  return { ok: true, request }
}

/** Bentuk jawaban `POST /publisher/overview` (B129). Jumlah uang dalam satuan terkecil token, sebagai string. */
export type PublisherOverview = {
  issuer: PublisherRef
  seat: { via: 'issuer' | 'member', canHire: boolean, canAppoint: boolean, canAuthor?: boolean, since: string | null }
  includeTest: boolean
  generatedAt: string
  token: { address: string | null, symbol: string, decimals: number }
  platformBps: number | null
  /** Kontrak `SettlementSplit` tempat potongan platform dibaca (tautan BscScan). */
  split: string | null
  totals: {
    courses: number, listedCourses: number, learners: number, enrollments: number, paidEnrollments: number,
    gross: string, platform: string | null, net: string | null, essaysAwaitingReview: number, essaysAwaitingJudge: number,
    chargesDue: { count: number, amount: string }, chargesPaid: { count: number, amount: string }
  }
  courses: {
    id: string, title: string, level: string, topic: string | null, unlisted: boolean, price: string | null, passMark: number,
    weights: { kuis: number, esai: number, praktik: number }, rubricHash: string | null, enrollments: number, paid: number, free: number,
    gross: string, platform: string | null, net: string | null, essays: { awaitingJudge: number, awaitingReview: number, reviewed: number },
    graders: string[], reviewers: string[]
  }[]
  learners: { learner: string, courseId: string, status: string, enrolledAt: string, origin: string, paid: { amount: string, tx: string | null, at: string } | null }[]
  essays: {
    /** `graded` = dinilai langsung oleh kunci penerbit — final, tidak butuh pengesahan (aturan gerbang migrasi 0009). */
    pipeline: Record<'awaitingJudge' | 'insufficient' | 'awaitingReview' | 'approved' | 'adjusted' | 'rejected' | 'graded', number>
    recent: {
      attemptId: number, courseId: string | null, learner: string | null, lesson: string, attemptNo: number, status: string, words: number | null,
      proposed: number | null, proposedBy: string | null, label: string | null,
      review: { decision: string, finalScore: number | null, reviewerAgent: string | null, at: string } | null, at: string
    }[]
  }
  agents: {
    hires: { courseId: string, agentId: string, wallet: string, owner: string, hiredBy: string | null, byMember: boolean, at: string }[]
    reviewers: { courseId: string, reviewer: string, agentId: string | null, owner: string | null, addedBy: string, byMember: boolean, at: string }[]
    charges: { id: number, attemptId: number, activity: string, agentId: string, label: string | null, amount: string, status: string, tx: string | null, at: string }[]
  }
  revenue: { orders: { courseId: string | null, learner: string | null, amount: string, platform: string | null, net: string | null, tx: string | null, at: string }[] }
  team: { members: { member: string, canHire: boolean, canAppoint: boolean, since: string }[], pendingRequests: number }
}

/** B129: dasbor penerbit — hanya untuk pemegang kursi Penerbit; ditandatangani dengan pesan khusus `lencana-publisher`. */
export async function readPublisherOverview (includeTest = false, onStep?: (step: 0 | 1) => void): Promise<{ ok: boolean, status?: number, why?: string, data?: PublisherOverview }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-publisher nonce=${newNonce()}`
  // Tahap yang benar-benar dilalui (seperti B126): tanda tangan, lalu penerbit + chain.
  onStep?.(0)
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  onStep?.(1)
  const r = await call('/publisher/overview', { method: 'POST', body: { learner: addr, includeTest, message, signature: s.signature }, timeoutMs: 30_000 })
  if (r.status !== 200 || !r.json) return { ok: false, status: r.status, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, data: r.json as unknown as PublisherOverview }
}

/** Fakta satu agen ERC-8004 dari registry lewat penerbit (`GET /agents/<id>/rates`, publik). */
export type AgentRates = { agentId: string, registry: string, owner: string, wallet: string, token: string, baseTariff: string, rateCard: { label: string, amount: string }[] }
export async function readAgentRates (agentId: string): Promise<{ ok: boolean, why?: string, rates?: AgentRates }> {
  if (!/^\d+$/.test(agentId)) return { ok: false, why: 'agentId harus bilangan bulat' }
  const r = await call(`/agents/${agentId}/rates`, { timeoutMs: 25_000 })
  if (r.status !== 200 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, rates: r.json as unknown as AgentRates }
}

/** B129: anggota (hire=1) menyewa agen penilai untuk satu kursus, dengan tanda tangan akunnya sendiri. */
export async function memberHireAgent (courseId: string, agentId: string): Promise<{ ok: boolean, why?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-pub-hire course=${courseId} agent=${agentId} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/publisher/agents/hire', { method: 'POST', body: { member: addr, course: courseId, agentId, message, signature: s.signature }, timeoutMs: 30_000 })
  return r.status === 200 ? { ok: true } : { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
}

/** B129: anggota (appoint=1) menunjuk agen pengesah; pesannya menyebut dompet agen yang dibaca dari registry. */
export async function memberAppointReviewer (courseId: string, agentId: string, reviewerWallet: string): Promise<{ ok: boolean, why?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-pub-appoint course=${courseId} reviewer=${reviewerWallet.toLowerCase()} agent=${agentId} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/publisher/reviewers', { method: 'POST', body: { member: addr, course: courseId, agentId, reviewer: reviewerWallet, message, signature: s.signature }, timeoutMs: 30_000 })
  return r.status === 200 ? { ok: true } : { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
}

/* ------------------------------------------------------------------ bayar & daftar (B125) */

const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'
const X402_EXACT_PROXY = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001'
/** Nama domain EIP-2612 token (sama dengan `signer/src/x402.js`; salah satu huruf = tanda tangan sah bentuknya, ditolak kontraknya). */
const TOKEN_DOMAIN_NAME = 'Lencana Demo Coin'
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
  ],
}
const PERMIT_WITNESS_TYPES = {
  TokenPermissions: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],
  Witness: [{ name: 'to', type: 'address' }, { name: 'validAfter', type: 'uint256' }],
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' }, { name: 'spender', type: 'address' }, { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }, { name: 'witness', type: 'Witness' },
  ],
}
const ERC20_READ = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

type TypedData = {
  domain: { name?: string, version?: string, chainId?: number, verifyingContract?: Hex }
  types: Record<string, { name: string, type: string }[]>
  primaryType: string
  message: Record<string, unknown>
}
type PayRequirement = { network: string, maxAmountRequired: string, payTo: Hex, asset: Hex, resource: string, maxTimeoutSeconds?: number }

const chainRead = () => createPublicClient({ transport: http(defaultEndpoint().rpcUrl, { timeout: 25_000, retryCount: 1 }) })
const bigJson = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))

/** JSON `eth_signTypedData_v4`: menyertakan `EIP712Domain` sesuai field domain yang benar-benar ada. */
function eip712Json (td: TypedData): string {
  const d = td.domain
  const EIP712Domain = [
    ...(d.name !== undefined ? [{ name: 'name', type: 'string' }] : []),
    ...(d.version !== undefined ? [{ name: 'version', type: 'string' }] : []),
    ...(d.chainId !== undefined ? [{ name: 'chainId', type: 'uint256' }] : []),
    ...(d.verifyingContract !== undefined ? [{ name: 'verifyingContract', type: 'address' }] : []),
  ]
  return bigJson({ ...td, types: { EIP712Domain, ...td.types } })
}

/** Tanda tangan EIP-712 atas nama identitas aktif — bentuknya sama dengan `buildClientPayment` di server. */
async function signTyped (td: TypedData): Promise<{ signature?: Hex, why?: string }> {
  const id = state.identity
  if (!id) return { why: 'Belum ada akun yang masuk.' }
  try {
    if (id.kind === 'perangkat') {
      const raw = (() => { try { return JSON.parse(readSession(ID_KEY) ?? '{}') as StoredIdentity } catch { return null } })()
      if (!raw?.pk) return { why: 'Kunci perangkat tidak ada di sesi ini.' }
      return { signature: await privateKeyToAccount(raw.pk).signTypedData(td as Parameters<ReturnType<typeof privateKeyToAccount>['signTypedData']>[0]) }
    }
    if (id.kind === 'privy') return { signature: await (await import('./privy')).privySignTypedData(eip712Json(td), id.address) as Hex }
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string, params?: unknown[] }) => Promise<string> } }).ethereum
    if (!eth) return { why: 'Dompet tidak lagi tersedia di peramban ini.' }
    return { signature: await eth.request({ method: 'eth_signTypedData_v4', params: [id.address, eip712Json(td)] }) as Hex }
  } catch (e) {
    return { why: errText(e) }
  }
}

/* ------------------------------------------------------------------ Agent Owner (B130, D65) */

/** Bentuk jawaban `POST /owner/overview` (B130). Jumlah uang dalam satuan terkecil token, sebagai string. */
export type OwnerAgent = {
  agentId: string
  registry: string
  name: string | null
  description: string | null
  pointsBack: boolean
  wallet: string | null
  walletState: 'unset' | 'owner' | 'other'
  tariff: { token: string, amount: string, inPlatformToken: boolean } | null
  rateCard: { label: string, amount: string }[]
  hireable: boolean
  problem: string | null
  hires: { courseId: string, hiredBy: string | null, byPublisherKey: boolean, at: string, walletAtHire: string, stale: boolean }[]
  appointments: { courseId: string, reviewer: string, addedBy: string, byPublisherKey: boolean, at: string, stale: boolean }[]
  activity: { graded: number, reviews: number, labels: Record<string, number> }
  charges: {
    due: { count: number, amount: string }, paid: { count: number, amount: string }
    recent: { id: number, activity: string, label: string | null, amount: string, status: string, paidTo: string, tx: string | null, at: string }[]
  }
  minted: { by: string, registerTx: string, transferTx: string | null, gasTx: string | null, ownerTo: string | null, at: string } | null
  /** B132: rupa robot dari berkas registrasi di chain (null = belum dirakit) + gambarnya + peran templat registrasinya. */
  avatar: Avatar | null
  image: string | null
  registrationRole: string | null
  /** B135: otak yang tercatat (provider/model + kalibrasi yang dilaporkan pemilik). null = belum dipasang. */
  brain: AgentBrainInfo | null
}

/** B135 (D69): catatan otak agen di server — tanpa API key (kunci hanya hidup di peramban pemilik). */
export type AgentBrainInfo = {
  provider: string
  model: string
  modelName: string
  calibration: { course: string, lesson: string, passMark: number, substantive: number, hollow: number, temperature: 0 | null }
  passed: boolean
  at: string
  /** false = dicatat pemilik sebelumnya (NFT sudah pindah) → tidak berlaku sampai dicatat ulang. */
  byCurrentOwner: boolean | null
}
/** Satu esai di antrean dompet agen (B135): teks + rubrik dari manifest penerbit; alamat peserta tidak ikut. */
export type QueueItem = {
  attemptId: number
  course: string
  lesson: string
  attemptNo: number | null
  words: number
  awaitingSince: string | null
  text: string
  essay: { prompt: string, guidance: string[], rubric: { label: string, max: number }[] }
  passMark: number
}
export type AgentQueue = {
  agentId: string
  wallet: string
  owner: string
  brain: AgentBrainInfo
  courses: { courseId: string, hiredAt: string }[]
  staleCourses: string[]
  items: QueueItem[]
}
export type OwnerOverview = {
  address: string
  chainId: number
  token: { address: string | null, symbol: string, decimals: number }
  generatedAt: string
  gas: { balance: string, low: boolean }
  ladder: { labels: string[], stepBps: number }
  agents: OwnerAgent[]
}

// Lencana-B138 status=TERBUKA 2026-10-03 — bursa agen untuk dasbor Penerbit: GET /agents/market (baca saja, tanpa tanda tangan). Buktikan ulang: cd signer && npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** B138: etalase agen yang dikenal platform — fakta registry saat itu + otak + angka gabungan (tanpa data peserta). */
export async function readAgentMarket (): Promise<{ ok: boolean, why?: string, data?: AgentMarket }> {
  const r = await call('/agents/market', { timeoutMs: 40_000 })
  if (r.status !== 200 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, data: r.json as unknown as AgentMarket }
}

/** B130: dasbor Agent Owner — hanya untuk alamat yang `ownerOf`-nya memegang agen yang dikenal platform. */
export async function readOwnerOverview (onStep?: (step: 0 | 1) => void): Promise<{ ok: boolean, status?: number, why?: string, data?: OwnerOverview }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-owner nonce=${newNonce()}`
  onStep?.(0)
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  onStep?.(1)
  const r = await call('/owner/overview', { method: 'POST', body: { learner: addr, message, signature: s.signature }, timeoutMs: 40_000 })
  if (r.status !== 200 || !r.json) return { ok: false, status: r.status, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, data: r.json as unknown as OwnerOverview }
}

/** B130: minta platform mengisi gas (testnet) — hanya pemilik agen yang dicetak platform, dan hanya bila saldonya menipis. */
export async function requestOwnerGas (): Promise<{ ok: boolean, why?: string, tx?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-owner-gas nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/owner/gas', { method: 'POST', body: { learner: addr, message, signature: s.signature }, timeoutMs: 90_000 })
  return r.status === 200 ? { ok: true, tx: r.json?.tx as string } : { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
}

// Lencana-B135 status=TERBUKA 2026-10-03 — otak agen dari peramban pemilik: catat provider + model + kalibrasi (pesan bertanda tangan, tanpa API key), baca antrean esai sebagai dompet agen, kirim penilaian bertanda tangan dengan nama model dan temperature yang benar-benar terpakai. Buktikan ulang: cd signer && npm run verify:brain, lalu uji peramban T63. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** B135: pemilik mencatat otak agennya. Server memeriksa ownerOf + aturan kalibrasi; kunci LLM TIDAK ikut dikirim. */
export async function saveAgentBrain (agentId: string, provider: string, model: string, cal: { substantive: number, hollow: number, temperature: 0 | null }): Promise<{ ok: boolean, why?: string, reasons?: string[], brain?: AgentBrainInfo }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-agent-brain agent=${agentId} provider=${provider} model=${model} sub=${cal.substantive} empty=${cal.hollow} temp=${cal.temperature === 0 ? '0' : 'none'} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/owner/agents/brain', { method: 'POST', body: { learner: addr, message, signature: s.signature }, timeoutMs: 40_000 })
  if (r.status !== 201 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}`, reasons: r.json?.reasons as string[] | undefined }
  return { ok: true, brain: r.json as unknown as AgentBrainInfo }
}

/** B135: antrean esai agen — dibaca oleh dompet agen (akun ini harus dompet agennya), bertanda tangan. */
export async function readAgentQueue (agentId: string): Promise<{ ok: boolean, status?: number, why?: string, data?: AgentQueue }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-agent-queue agent=${agentId} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/owner/agents/queue', { method: 'POST', body: { learner: addr, message, signature: s.signature }, timeoutMs: 40_000 })
  if (r.status !== 200 || !r.json) return { ok: false, status: r.status, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  return { ok: true, data: r.json as unknown as AgentQueue }
}

/**
 * B135: kirim nilai usulan model sebagai penilaian agen (rute B119). Angka per kriteria = jawaban model apa adanya; pemilik
 * memilih label tingkat berat dan menandatangani dari dompet agen. `judgeModel` = `<provider>/<model>` otak yang tercatat.
 */
export async function submitAgentJudgement (agentId: string, item: QueueItem, scores: Record<string, number>, label: string, judgeModel: string, judgeTemp: 0 | null): Promise<{ ok: boolean, why?: string, score?: number, verdict?: string, charge?: { amount: string, status: string } | null }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const list = item.essay.rubric.map((r) => ({ label: r.label, score: scores[r.label] }))
  if (list.some((x) => !Number.isFinite(x.score))) return { ok: false, why: 'Ada kriteria yang belum dinilai model.' }
  const total = list.reduce((s, x) => s + x.score, 0)
  const message = `lencana-agent-judge attempt=${item.attemptId} final=${total} label=${label} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/essay/judgement', {
    method: 'POST', timeoutMs: 40_000,
    body: { agentId, course: item.course, lesson: item.lesson, attemptId: item.attemptId, scores: list, judgeModel, judgeTemp, message, signature: s.signature },
  })
  if (r.status !== 200 || !r.json) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  const charge = r.json.charge as { amount?: string, status?: string } | null | undefined
  return { ok: true, score: Number(r.json.score), verdict: String(r.json.verdict ?? ''), charge: charge ? { amount: String(charge.amount ?? '0'), status: String(charge.status ?? '') } : null }
}

/**
 * Kirim satu transaksi kontrak dari dompet akun ini (B130) — pemilik agen yang membayar gasnya sendiri. Perangkat:
 * ditandatangani kunci sesi lalu disiarkan; Privy: `privySendTransaction`; dompet ekstensi: `eth_sendTransaction`.
 */
async function sendContractTx (to: Hex, data: Hex): Promise<{ hash?: Hex, why?: string }> {
  const id = state.identity
  if (!id) return { why: 'Belum ada akun yang masuk.' }
  const client = chainRead()
  try {
    const chainId = await client.getChainId()
    if (id.kind === 'dompet') {
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string, params?: unknown[] }) => Promise<string> } }).ethereum
      if (!eth) return { why: 'Dompet tidak lagi tersedia di peramban ini.' }
      return { hash: await eth.request({ method: 'eth_sendTransaction', params: [{ from: id.address, to, data, chainId: `0x${chainId.toString(16)}` }] }) as Hex }
    }
    const [nonce, gasPrice, gasEst] = await Promise.all([
      client.getTransactionCount({ address: id.address as Hex, blockTag: 'pending' }),
      client.getGasPrice(),
      client.estimateGas({ account: id.address as Hex, to, data }),
    ])
    const gas = (gasEst * 12n) / 10n // ruang 20% — estimasi atas keadaan sekarang, bukan janji
    if (id.kind === 'perangkat') {
      const raw = (() => { try { return JSON.parse(readSession(ID_KEY) ?? '{}') as StoredIdentity } catch { return null } })()
      if (!raw?.pk) return { why: 'Kunci perangkat tidak ada di sesi ini.' }
      const serializedTransaction = await privateKeyToAccount(raw.pk).signTransaction({ to, data, nonce, gas, gasPrice, chainId, type: 'legacy' })
      return { hash: await client.sendRawTransaction({ serializedTransaction }) }
    }
    const hash = await (await import('./privy')).privySendTransaction(
      { to, data, gas, fee: gasPrice, nonce, chainId }, id.address,
      async (raw) => client.sendRawTransaction({ serializedTransaction: raw }),
    )
    return { hash: hash as Hex }
  } catch (e) {
    return { why: chainErrText(e) }
  }
}

/** Galat viem dari RPC panjang (URL, badan permintaan, versi) — yang berguna bagi orang hanya `details`/`shortMessage`. */
function chainErrText (e: unknown): string {
  const x = e as { details?: unknown, shortMessage?: unknown }
  if (typeof x?.details === 'string' && x.details) return `Ditolak jaringan: ${x.details}`
  if (typeof x?.shortMessage === 'string' && x.shortMessage) return x.shortMessage
  return errText(e).split('\n')[0]
}

async function minedOk (hash: Hex): Promise<{ ok: boolean, why?: string, tx: string }> {
  const r = await chainRead().waitForTransactionReceipt({ hash, timeout: 120_000 })
  return r.status === 'success' ? { ok: true, tx: hash } : { ok: false, why: `transaksi revert di chain (${hash.slice(0, 10)}…)`, tx: hash }
}

/**
 * B130 (D65): pemilik mengisi dompet agennya dengan dompet akun ini. EIP-8004 menuntut bukti kendali atas dompet baru
 * (tanda tangan EIP-712 `AgentWalletSet`) dan hanya pemilik yang boleh mengirim `setAgentWallet` — di sini keduanya
 * dompet yang sama, jadi satu tanda tangan + satu transaksi.
 */
export async function verifyAgentWallet (agentId: string, onStep?: (step: 0 | 1 | 2) => void): Promise<{ ok: boolean, why?: string, tx?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const { agentWalletTypedData, setAgentWalletData, IDENTITY_REGISTRY_97 } = await import('./erc8004')
  const client = chainRead()
  const [chainId, block] = await Promise.all([client.getChainId(), client.getBlock()])
  const deadline = block.timestamp + 240n // kontrak menolak tenggat > 5 menit
  // Tahap yang benar-benar dilalui: tanda tangan EIP-712 → kirim transaksi → tunggu struk.
  onStep?.(0)
  const s = await signTyped(agentWalletTypedData({ chainId, agentId, newWallet: addr, owner: addr, deadline }) as unknown as TypedData)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  onStep?.(1)
  const sent = await sendContractTx(IDENTITY_REGISTRY_97, setAgentWalletData(agentId, addr, deadline, s.signature))
  if (!sent.hash) return { ok: false, why: sent.why }
  onStep?.(2)
  return minedOk(sent.hash)
}

/** B130: pemilik mengubah tarif dasar agennya (metadata `lencana.baseTariff` di registry), dibayar gasnya sendiri. */
export async function setAgentTariff (agentId: string, token: string, amount: bigint): Promise<{ ok: boolean, why?: string, tx?: string }> {
  if (amount <= 0n) return { ok: false, why: 'Tarif harus lebih dari nol.' }
  const { setTariffData, IDENTITY_REGISTRY_97 } = await import('./erc8004')
  const sent = await sendContractTx(IDENTITY_REGISTRY_97, setTariffData(agentId, token, amount))
  if (!sent.hash) return { ok: false, why: sent.why }
  return minedOk(sent.hash)
}

// Lencana-B132 status=TERBUKA 2026-10-03 — robot agen: pemilik menyimpan nama + rupa robot ke berkas registrasi ERC-8004 agennya (templat dari penerbit yang menunjuk balik + avatar + gambar SVG, setAgentURI dari dompetnya), dan akun Agent Owner tanpa agen mendaftarkan agennya sendiri (gas → register → klaim → rupa → tarif). Buktikan ulang: cd signer && npm run verify:studio, lalu uji peramban T61. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** UTF-8 → base64 (nama agen boleh berhuruf non-ASCII). */
function base64Utf8 (s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/**
 * Simpan nama + rupa robot ke chain: templat berkas registrasi dari penerbit (menunjuk balik, kalimat peran yang benar) +
 * `name` + `image` (SVG statis) + `lencana:avatar`, lalu `setAgentURI` dari dompet pemilik — gasnya dibayar pemilik.
 */
export async function saveAgentLook (agentId: string, role: 'grader-account' | 'grader-self', name: string, avatar: Avatar, onStep?: (step: 0 | 1 | 2) => void): Promise<{ ok: boolean, why?: string, tx?: string }> {
  const n = cleanName(name)
  if (!n) return { ok: false, why: `Nama agen 1–${NAME_MAX} karakter.` }
  const av = parseAvatar(avatar)
  if (!av) return { ok: false, why: 'Rupa robot tidak sah.' }
  onStep?.(0)
  const tpl = await call(`/agents/${encodeURIComponent(agentId)}/registration-template?role=${role}`)
  if (tpl.status !== 200 || !tpl.json) return { ok: false, why: (tpl.json?.error as string) ?? tpl.why ?? `penerbit menjawab ${tpl.status}` }
  const image = `data:image/svg+xml;base64,${btoa(robotSvg(av, { standalone: true }))}`
  const uri = `data:application/json;base64,${base64Utf8(JSON.stringify(withAvatar(tpl.json, n, av, image)))}`
  const { setAgentUriData, IDENTITY_REGISTRY_97 } = await import('./erc8004')
  onStep?.(1)
  const sent = await sendContractTx(IDENTITY_REGISTRY_97, setAgentUriData(agentId, uri))
  if (!sent.hash) return { ok: false, why: sent.why }
  onStep?.(2)
  return minedOk(sent.hash)
}

/** Saldo native (tBNB) dompet akun ini — untuk memutuskan perlu tidaknya meminta gas uji. */
export async function nativeBalanceOfMe (): Promise<bigint | null> {
  const addr = learnerAddress()
  if (!addr) return null
  try { return await chainRead().getBalance({ address: addr as Hex }) } catch { return null }
}

/**
 * Akun Agent Owner mendaftarkan agen pertamanya sendiri (B132): gas uji bila menipis → `register()` dari dompet akun (dompet
 * agen otomatis = pendaftar) → platform membaca struknya dan mengenal agen itu → nama + rupa (`setAgentURI`) → tarif dasar.
 * Lima tahap, empat transaksi dari dompet akun; setiap tahap dilaporkan lewat `onStep`.
 */
export async function registerOwnAgent (name: string, avatar: Avatar, tariff: { token: string, amount: bigint }, onStep?: (step: 0 | 1 | 2 | 3 | 4) => void): Promise<{ ok: boolean, why?: string, agentId?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  if (!cleanName(name) || !parseAvatar(avatar)) return { ok: false, why: 'Nama atau rupa robot belum sah.' }
  onStep?.(0)
  const bal = await nativeBalanceOfMe()
  if (bal !== null && bal < 500_000_000_000_000n) {
    const g = await requestOwnerGas()
    if (!g.ok) return { ok: false, why: `Gas uji: ${g.why ?? ''}` }
  }
  const { registerData, registeredAgentId, IDENTITY_REGISTRY_97 } = await import('./erc8004')
  onStep?.(1)
  const sent = await sendContractTx(IDENTITY_REGISTRY_97, registerData())
  if (!sent.hash) return { ok: false, why: sent.why }
  const receipt = await chainRead().waitForTransactionReceipt({ hash: sent.hash, timeout: 120_000 })
  if (receipt.status !== 'success') return { ok: false, why: `register() revert (${sent.hash.slice(0, 10)}…)` }
  const agentId = registeredAgentId(receipt.logs as unknown as { address: string, data: Hex, topics: Hex[] }[], addr)
  if (!agentId) return { ok: false, why: 'Event Registered tidak ditemukan di struk.' }
  onStep?.(2)
  const message = `lencana-owner-claim agent=${agentId} tx=${sent.hash.toLowerCase()} nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani', agentId }
  const c = await call('/owner/agents/claim', { method: 'POST', body: { learner: addr, agentId, registerTx: sent.hash, message, signature: s.signature }, timeoutMs: 30_000 })
  if (c.status !== 201) return { ok: false, why: (c.json?.error as string) ?? c.why ?? `penerbit menjawab ${c.status}`, agentId }
  onStep?.(3)
  const look = await saveAgentLook(agentId, 'grader-self', name, avatar)
  if (!look.ok) return { ok: false, why: `Rupa: ${look.why ?? ''}`, agentId }
  onStep?.(4)
  const t = await setAgentTariff(agentId, tariff.token, tariff.amount)
  if (!t.ok) return { ok: false, why: `Tarif: ${t.why ?? ''}`, agentId }
  return { ok: true, agentId }
}

/** Saldo token di dompet akun ini, dibaca dari chain (bukan dari penerbit). null = gagal baca. */
export async function tokenBalance (token: string): Promise<bigint | null> {
  const addr = learnerAddress()
  if (!addr) return null
  try {
    return await chainRead().readContract({ address: token as Hex, abi: ERC20_READ, functionName: 'balanceOf', args: [addr as Hex] })
  } catch {
    return null
  }
}

/** Sudah terdaftar di kursus ini? (rekaman di penerbit ada) — null = penerbit tidak terjangkau. */
export async function isEnrolled (courseId: string): Promise<boolean | null> {
  const addr = learnerAddress()
  if (!addr) return false
  const r = await call(`/progress?learner=${encodeURIComponent(addr)}&course=${encodeURIComponent(courseId)}`)
  if (r.status === 200) return true
  if (r.status === 404) return false
  return null
}

export type PayResult = { ok: boolean, why?: string, needCoins?: boolean, paid?: { amount: string, settleTx: string, splitTx: string } }

/**
 * Bayar lalu daftar (B125): penerbit menjawab 402 dengan syarat x402 → peserta menandatangani izin token (EIP-2612) dan
 * saksi Permit2 — dua tanda tangan, NOL transaksi dari dompet peserta — lalu `POST /enroll` dengan `X-PAYMENT`. Penerbit
 * yang menyiarkan settlement + pembagian dan membayar gasnya. Kursus gratis atau yang sudah diikuti lewat jalur biasa.
 */
export async function payAndEnroll (courseId: string): Promise<PayResult> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const quote = await call('/enroll', { method: 'POST', body: { learner: addr, course: courseId } })
  if (quote.status !== 402) {
    const sum = await syncCourse(courseId)
    return sum ? { ok: true } : { ok: false, why: state.error ?? 'pendaftaran gagal' }
  }
  const req = (quote.json?.accepts as PayRequirement[] | undefined)?.[0]
  if (!req) return { ok: false, why: 'Syarat pembayaran dari penerbit tidak terbaca.' }
  const amount = BigInt(req.maxAmountRequired)
  const chainId = Number(req.network.split(':')[1])
  let balance: bigint
  let tokenNonce: bigint
  try {
    const client = chainRead()
    ;[balance, tokenNonce] = await Promise.all([
      client.readContract({ address: req.asset, abi: ERC20_READ, functionName: 'balanceOf', args: [addr as Hex] }),
      client.readContract({ address: req.asset, abi: ERC20_READ, functionName: 'nonces', args: [addr as Hex] }),
    ])
  } catch (e) {
    return { ok: false, why: `saldo tidak terbaca dari chain: ${errText(e)}` }
  }
  if (balance < amount) return { ok: false, needCoins: true, why: 'Saldo koin belum cukup untuk harga kursus ini.' }
  const now = Math.floor(Date.now() / 1000)
  const deadline = now + Number(req.maxTimeoutSeconds ?? 600)
  const permitNonce = Date.now()
  const permit = await signTyped({
    domain: { name: TOKEN_DOMAIN_NAME, version: '1', chainId, verifyingContract: req.asset },
    primaryType: 'Permit', types: PERMIT_TYPES,
    message: { owner: addr, spender: PERMIT2, value: amount, nonce: tokenNonce, deadline: BigInt(deadline) },
  })
  if (!permit.signature) return { ok: false, why: permit.why ?? 'izin token tidak ditandatangani' }
  const witness = await signTyped({
    domain: { name: 'Permit2', chainId, verifyingContract: PERMIT2 },
    primaryType: 'PermitWitnessTransferFrom', types: PERMIT_WITNESS_TYPES,
    message: {
      permitted: { token: req.asset, amount }, spender: X402_EXACT_PROXY, nonce: BigInt(permitNonce),
      deadline: BigInt(deadline), witness: { to: req.payTo, validAfter: BigInt(now - 5) },
    },
  })
  if (!witness.signature) return { ok: false, why: witness.why ?? 'pembayaran tidak ditandatangani' }
  const message = `lencana-enroll ${courseId} nonce=${newNonce()}`
  const sig = await signMessage(message)
  if (!sig.signature) return { ok: false, why: sig.why ?? 'pendaftaran tidak ditandatangani' }
  const payload = {
    token: req.asset, amount: String(amount), payer: addr, nonce: permitNonce, deadline, validAfter: now - 5,
    payTo: req.payTo, resource: req.resource, eip2612: permit.signature, witnessSig: witness.signature,
  }
  const header = btoa(bigJson({ x402Version: 1, scheme: 'exact', network: req.network, payload }))
  const r = await call('/enroll', {
    method: 'POST', body: { learner: addr, course: courseId, message, signature: sig.signature },
    headers: { 'x-payment': header }, timeoutMs: 180_000,
  })
  if (r.status !== 200) return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}` }
  state.needsPayment = null
  await syncCourse(courseId)
  return { ok: true, paid: r.json?.paid as PayResult['paid'] }
}

/** Koin uji testnet ke dompet akun ini (B125) — penerbit mencetak dan membayar gasnya; sekali per alamat per jendela waktu. */
export async function claimTestCoins (): Promise<{ ok: boolean, why?: string, tx?: string, balance?: bigint, lastAt?: string }> {
  const addr = learnerAddress()
  if (!addr) return { ok: false, why: 'Belum ada akun yang masuk.' }
  const message = `lencana-faucet nonce=${newNonce()}`
  const s = await signMessage(message)
  if (!s.signature) return { ok: false, why: s.why ?? 'tidak bisa menandatangani' }
  const r = await call('/faucet', { method: 'POST', body: { learner: addr, message, signature: s.signature }, timeoutMs: 120_000 })
  if (r.status === 200) return { ok: true, tx: String(r.json?.tx ?? ''), balance: BigInt(String(r.json?.balance ?? '0')) }
  return { ok: false, why: (r.json?.error as string) ?? r.why ?? `penerbit menjawab ${r.status}`, lastAt: r.json?.lastAt as string | undefined }
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
