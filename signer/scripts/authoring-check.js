// Lencana-B133 status=SELESAI 2026-10-03 — harness penyusunan kursus: hak susun dari hibah kunci penerbit, simpan/ajukan bertanda tangan atas hash isi, audit draf, terbit/tolak hanya kunci penerbit, kursus terbit masuk katalog server tanpa kunci kuis dan bisa didaftari serta dikerjakan. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:authoring` — Penerbit menyusun kursus baru (B133, D67: "anggota menyusun, kunci penerbit menerbitkan").
 *
 * Yang dibuktikan, terhadap server sendiri (origin=test, `CATALOG_TTL_MS=0`; semua baris alamat sekali-pakai dihapus di akhir
 * dan sisanya dihitung ulang dari database):
 *   A. hak susun: tanpa kursi → 403; anggota tanpa author=1 → 403; pesan hibah tanpa author=1 tidak bisa dipakai untuk
 *      author=1; akun Peserta → 403 (B131);
 *   B. simpan: field asing → 400 dengan daftar masalah; hash di pesan ≠ isi → 400; kunci lain → 401; replay → 401; audit
 *      melaporkan soal tanpa kunci dan id kursus yang sudah dipakai kursus berkas; hash tersimpan = hash yang dihitung
 *      klien dengan modul yang sama; penyusun lain tidak bisa menyunting; kunci kuis hanya untuk penyusunnya;
 *   C. ajukan: masih bermasalah → 422; hash lain → 400; sah → submitted; menyunting sesudah diajukan → 409;
 *   D. terbit: kunci lain → 401; rubricHash lain di pesan → 400; kunci penerbit → published dengan rubricHash = hitungan;
 *      katalog publik memuatnya tanpa kunci; criteria-nya menyebut rubricHash itu;
 *   E. belajar: peserta baru mendaftar kursus itu dan kuisnya dinilai server dengan kunci tersimpan (benar semua = 100);
 *   F. tolak: draf kedua ditolak dengan catatan, penyusun menyuntingnya lagi (kembali draf).
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { draftById, decideDraft } from '../src/db.js'
import { publishPlan } from '../src/drafts.js'
import { normalizeDraft, draftHash } from '../../web/src/authoring.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:authoring')
const env = process.env
for (const k of ['SUPABASE_URL', 'ISSUER_PRIVATE_KEY', 'ISSUER_ADDRESS', 'RPC_URL']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }
process.env.LANCENA_ORIGIN = 'test' // baris yang ditulis langsung lewat db.js (terbit/tolak) juga berasal test

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const tag = randomBytes(3).toString('hex')
const COURSE_A = `uji-susun-${tag}`
const COURSE_B = `uji-susun-b-${tag}`

const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const fresh = () => privateKeyToAccount(generatePrivateKey())
const M = fresh() // anggota berhak susun
const M2 = fresh() // anggota berhak susun lain
const N = fresh() // anggota tanpa hak susun
const X = fresh() // bukan anggota
const L = fresh() // akun Peserta (B131)
const S = fresh() // peserta kursus yang terbit
const throwaway = [M, M2, N, X, L, S].map((a) => a.address)

/** Kursus kecil yang lolos audit: satu modul, bacaan + kuis (2 soal) + esai; bobot kuis 60, esai 40. */
const draftInput = (id, { keys = true, extra = false } = {}) => ({
  course: {
    id, title: `Kelas Susun Uji ${id}`, level: 'dasar', topic: 'Uji',
    blurb: 'Kelas singkat yang disusun dari halaman penerbit untuk menguji alur penyusunan.',
    audience: ['penguji harness'], outcome: ['membuktikan kursus database berjalan di jalur yang sama'],
    criteria: 'Lulus bila nilai akhir mencapai pass mark; kuis dinilai server, esai dinilai penerbit.',
    weights: { kuis: 60, esai: 40, praktik: 0 }, passMark: 70, validDays: 365,
    modules: [{
      id: 'm1', title: 'Modul satu', blurb: 'Satu-satunya modul.',
      lessons: [
        { slug: 'baca', title: 'Bacaan pembuka', minutes: 5, kind: 'bacaan', summary: 'Apa yang dipelajari.', blocks: [{ t: 'h', text: 'Pembuka' }, { t: 'p', text: 'Kursus ini disusun dari halaman.' }, { t: 'ul', items: ['satu', 'dua'] }] },
        {
          slug: 'kuis', title: 'Kuis singkat', minutes: 5, kind: 'kuis', summary: 'Dua soal.', blocks: [{ t: 'p', text: 'Jawab dua soal.' }],
          quiz: { passPct: 50, questions: [{ id: 'q1', prompt: 'Satu tambah satu?', options: ['1', '2', '3'] }, { id: 'q2', prompt: 'Warna langit cerah?', options: ['biru', 'hijau'] }] },
        },
        {
          slug: 'esai', title: 'Esai pendek', minutes: 10, kind: 'esai', summary: 'Tulis alasanmu.', blocks: [{ t: 'p', text: 'Tulis esai.' }],
          essay: { prompt: 'Jelaskan mengapa bukti belajar perlu bisa diperiksa orang lain.', minWords: 40, rubric: [{ label: 'Argumen', max: 60 }, { label: 'Contoh', max: 40 }], guidance: ['Jawaban satu kalimat tidak diterima.'] },
        },
      ],
    }],
    ...(extra ? { secret: 'field asing' } : {}),
  },
  keys: keys ? { kuis: { q1: { answer: 1, why: 'Satu tambah satu sama dengan dua.' }, q2: { answer: 0, why: 'Langit cerah berwarna biru.' } } } : { kuis: { q1: { answer: 1, why: 'Satu tambah satu sama dengan dua.' } } },
  price: null,
})

const PORT = Number(env.AUTHORING_PROBE_PORT ?? await freePort(8969))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off', CATALOG_TTL_MS: '0' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(90000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const signed = async (account, message, learner = account.address) => ({ learner, message, signature: await account.signMessage({ message }) })
const grant = async (who, { author = false, say = null } = {}) => {
  const message = say ?? `lencana-member grant member=${who.toLowerCase()} hire=0 appoint=0${author ? ' author=1' : ''} nonce=${nonce()}`
  return call('/publisher/members', { issuer: publisher.address, member: who, canHire: false, canAppoint: false, canAuthor: author, message, signature: await publisher.signMessage({ message }) })
}
const list = async (account) => call('/publisher/drafts', { includeTest: true, ...await signed(account, `lencana-drafts nonce=${nonce()}`) })
const localHash = (input) => { const n = normalizeDraft(input, 'x'); return n.payload ? n : null }
/** Simpan: hash dihitung klien dengan modul yang sama (lembaga diisi server, jadi diambil dari jawaban daftar). */
let institution = null
const save = async (account, input, { draftId = null, signer = account, hash = null } = {}) => {
  const n = normalizeDraft(input, institution ?? '')
  const h = hash ?? (n.payload ? draftHash(n.payload) : '0x' + '0'.repeat(64))
  return call('/publisher/drafts/save', { draftId, payload: input, ...await signed(signer, `lencana-draft save draft=${draftId ?? 'new'} course=${input.course.id} hash=${h} nonce=${nonce()}`, account.address) })
}
const submit = async (account, draftId, hash) => call('/publisher/drafts/submit', { draftId, ...await signed(account, `lencana-draft submit draft=${draftId} hash=${hash} nonce=${nonce()}`) })

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=representation', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  })
  const text = await r.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { /* bukan JSON */ }
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN'), body }
}
const inList = (xs) => `(${xs.join(',')})`

let draftA = null
try {
  check('ISSUER_PRIVATE_KEY milik ISSUER_ADDRESS', publisher.address.toLowerCase() === env.ISSUER_ADDRESS.toLowerCase(), publisher.address)
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  console.log('\n— A. hak susun')
  check('bukan anggota → daftar draf 403', (await list(X)).status === 403)
  const cL = await call('/me/role', { role: 'learner', ...await signed(L, `lencana-role role=learner nonce=${nonce()}`) })
  check('akun Peserta (pilih peran) → 201', cL.status === 201, cL.text.slice(0, 120))
  check('akun Peserta → daftar draf 403 karena perannya (B131)', (await list(L)).status === 403)
  check('hibah anggota tanpa author → 200', (await grant(N.address)).status === 200)
  const lN = await list(N)
  check('anggota tanpa author=1: daftar draf 200 dengan canAuthor false', lN.status === 200 && lN.body?.canAuthor === false, lN.text.slice(0, 160))
  check('anggota tanpa author=1: simpan draf → 403', (await save(N, draftInput(COURSE_A))).status === 403)
  const oldForm = `lencana-member grant member=${M.address.toLowerCase()} hire=0 appoint=0 nonce=${nonce()}`
  check('pesan hibah tanpa author=1 tidak bisa dipakai untuk author=1 → 400', (await grant(M.address, { author: true, say: oldForm })).status === 400)
  check('hibah author=1 → 200', (await grant(M.address, { author: true })).status === 200)
  check('hibah author=1 untuk anggota kedua → 200', (await grant(M2.address, { author: true })).status === 200)
  const lM = await list(M)
  institution = lM.body?.institution ?? null
  check('anggota author=1: canAuthor true + nama lembaga dari kursi', lM.status === 200 && lM.body?.canAuthor === true && typeof institution === 'string' && institution.length > 0, lM.text.slice(0, 160))

  console.log('\n— B. simpan draf')
  const alien = await save(M, draftInput(COURSE_A, { extra: true }))
  check('field asing di kursus → 400 dengan daftar masalah', alien.status === 400 && (alien.body?.problems ?? []).some((p) => /secret/.test(p)), alien.text.slice(0, 200))
  const wrongHash = await save(M, draftInput(COURSE_A), { hash: '0x' + 'ab'.repeat(32) })
  check('hash di pesan bukan hash isi → 400', wrongHash.status === 400, wrongHash.text.slice(0, 160))
  const forged = await save(M, draftInput(COURSE_A), { signer: X })
  check('ditandatangani kunci lain atas nama penyusun → 401', forged.status === 401, forged.text.slice(0, 160))
  const missingKey = await save(M, draftInput(COURSE_A, { keys: false }))
  draftA = missingKey.body?.draft?.id ?? null
  check('draf dengan soal tanpa kunci → 200, audit melaporkannya', missingKey.status === 200 && (missingKey.body?.draft?.problems ?? []).some((p) => /tanpa kunci/.test(p.what)), missingKey.text.slice(0, 220))
  const early = await submit(M, draftA, missingKey.body?.draft?.contentHash)
  check('mengajukan draf yang masih bermasalah → 422', early.status === 422, early.text.slice(0, 160))
  const fileId = await save(M, draftInput('web3-dasar-2026'))
  check('id kursus berkas → audit "sudah dipakai"', fileId.status === 200 && (fileId.body?.draft?.problems ?? []).some((p) => /sudah dipakai/.test(p.what)), fileId.text.slice(0, 200))
  const fixedIn = draftInput(COURSE_A)
  const fixed = await save(M, fixedIn, { draftId: draftA })
  const local = localHash(fixedIn) && draftHash(normalizeDraft(fixedIn, institution).payload)
  check('suntingan lengkap → 200, tanpa masalah', fixed.status === 200 && (fixed.body?.draft?.problems ?? []).length === 0, json(fixed.body?.draft?.problems ?? fixed.text).slice(0, 220))
  check('hash tersimpan = hash yang dihitung klien dengan modul yang sama', fixed.body?.draft?.contentHash === local, `${fixed.body?.draft?.contentHash} vs ${local}`)
  check('lembaga kursus diisi server dari kursi, bukan dari kiriman', fixed.body?.draft?.course?.institution === institution, fixed.body?.draft?.course?.institution)
  const other = await save(M2, draftInput(COURSE_A), { draftId: draftA })
  check('penyusun lain menyunting draf orang → 403', other.status === 403, other.text.slice(0, 160))
  const lM2 = await list(M2)
  const seenByM2 = (lM2.body?.drafts ?? []).find((d) => d.id === draftA)
  const seenByM = ((await list(M)).body?.drafts ?? []).find((d) => d.id === draftA)
  check('kunci kuis hanya untuk penyusunnya (M melihat, M2 tidak)', seenByM?.keys?.kuis?.q1?.answer === 1 && seenByM2 && seenByM2.keys === undefined, json({ m: seenByM?.keys, m2: seenByM2?.keys }))

  console.log('\n— C. ajukan')
  check('ajukan dengan hash lain → 400', (await submit(M, draftA, '0x' + 'cd'.repeat(32))).status === 400)
  const sub = await submit(M, draftA, fixed.body?.draft?.contentHash)
  check('ajukan sah → 200 submitted', sub.status === 200 && sub.body?.draft?.status === 'submitted', sub.text.slice(0, 160))
  check('menyunting sesudah diajukan → 409', (await save(M, draftInput(COURSE_A), { draftId: draftA })).status === 409)

  console.log('\n— D. terbit oleh kunci penerbit')
  const row = await draftById(draftA)
  const plan = await publishPlan(row)
  check('rencana terbit: audit ulang isi tersimpan bersih', plan.problems.length === 0, json(plan.problems).slice(0, 200))
  const msg = (rubric) => `lencana-course publish draft=${draftA} course=${COURSE_A} rubric=${rubric} nonce=${nonce()}`
  const m1 = msg(plan.rubricHash)
  const byOther = await decideDraft({ draftId: draftA, issuer: publisher.address, decision: 'publish', rubricHash: plan.rubricHash, manifestHash: plan.manifestHash, publishedAt: plan.publishedAt, message: m1, signature: await X.signMessage({ message: m1 }) })
  check('terbit bertanda tangan kunci lain → ditolak (auth)', !byOther.ok && byOther.kind === 'auth', json(byOther))
  const m2 = msg('0x' + 'ee'.repeat(32))
  const wrongRubric = await decideDraft({ draftId: draftA, issuer: publisher.address, decision: 'publish', rubricHash: plan.rubricHash, manifestHash: plan.manifestHash, publishedAt: plan.publishedAt, message: m2, signature: await publisher.signMessage({ message: m2 }) })
  check('pesan menyebut rubricHash lain → ditolak (input)', !wrongRubric.ok && wrongRubric.kind === 'input', json(wrongRubric))
  const m3 = msg(plan.rubricHash)
  const pub = await decideDraft({ draftId: draftA, issuer: publisher.address, decision: 'publish', rubricHash: plan.rubricHash, manifestHash: plan.manifestHash, publishedAt: plan.publishedAt, message: m3, signature: await publisher.signMessage({ message: m3 }) })
  check('kunci penerbit menerbitkan → published, rubricHash = hitungan', pub.ok && pub.draft?.status === 'published' && pub.draft?.rubric_hash === plan.rubricHash, json(pub).slice(0, 200))
  const cat = await call('/catalog/published')
  const inCat = (cat.body?.courses ?? []).find((c) => c.manifest?.course?.id === COURSE_A)
  check('katalog publik memuat kursus itu', cat.status === 200 && Boolean(inCat), cat.text.slice(0, 160))
  check('katalog publik tanpa kunci kuis (tidak ada "answer" / "why")', !/"answer"|"why"/.test(cat.text), cat.text.slice(0, 120))
  check('manifest publik membawa rubricHash yang ditandatangani', inCat?.manifest?.rubricHash === plan.rubricHash, inCat?.manifest?.rubricHash)
  const crit = await call(`/criteria/${COURSE_A}`)
  check('criteria kursus itu tersaji dengan rubricHash yang sama', crit.status === 200 && crit.body?.rubricHash === plan.rubricHash, crit.text.slice(0, 160))

  console.log('\n— E. belajar di kursus database')
  const en = await call('/enroll', { course: COURSE_A, ...await signed(S, `lencana-enroll course=${COURSE_A} nonce=${nonce()}`) })
  check('peserta baru mendaftar → 200', en.status === 200 && en.body?.enrolled === true, en.text.slice(0, 160))
  const gr = await call('/grade', { course: COURSE_A, lesson: 'kuis', picks: [{ itemId: 'q1', choice: 1 }, { itemId: 'q2', choice: 0 }], ...await signed(S, `lencana-grade course=${COURSE_A} nonce=${nonce()}`) })
  check('kuis dinilai server dengan kunci tersimpan: benar semua = 100', gr.status === 201 && gr.body?.score === 100 && gr.body?.rubricHash === plan.rubricHash, gr.text.slice(0, 200))

  console.log('\n— F. tolak lalu sunting lagi')
  const b = await save(M, draftInput(COURSE_B))
  const bSub = await submit(M, b.body?.draft?.id, b.body?.draft?.contentHash)
  check('draf kedua diajukan', bSub.status === 200, bSub.text.slice(0, 120))
  const rm = `lencana-course reject draft=${b.body?.draft?.id} nonce=${nonce()}`
  const rej = await decideDraft({ draftId: b.body?.draft?.id, issuer: publisher.address, decision: 'reject', note: 'Tambahkan satu kuis lagi (harness).', message: rm, signature: await publisher.signMessage({ message: rm }) })
  check('kunci penerbit menolak dengan catatan → rejected', rej.ok && rej.draft?.status === 'rejected' && rej.draft?.decided_note === 'Tambahkan satu kuis lagi (harness).', json(rej).slice(0, 160))
  const again = await save(M, draftInput(COURSE_B), { draftId: b.body?.draft?.id })
  check('penyusun menyunting draf yang ditolak → kembali draft', again.status === 200 && again.body?.draft?.status === 'draft', again.text.slice(0, 160))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

// Semua baris milik alamat sekali-pakai dihapus; sisanya dihitung ulang dari database, bukan diyakini.
console.log('\n— G. bersih-bersih baris uji')
try {
  const who = inList(throwaway)
  const enr = (await pg(`/enrollments?learner=in.${who}&origin=eq.test&select=id`)).body ?? []
  const eids = inList(enr.map((r) => r.id))
  const atts = enr.length ? ((await pg(`/attempts?enrollment_id=in.${eids}&select=id`)).body ?? []) : []
  const aids = inList(atts.map((r) => r.id))
  const steps = [
    ...(atts.length ? [['attempt_components', `attempt_id=in.${aids}`], ['submissions', `attempt_id=in.${aids}`]] : []),
    ...(enr.length ? [['attempts', `enrollment_id=in.${eids}`], ['lesson_progress', `enrollment_id=in.${eids}`], ['progress_events', `enrollment_id=in.${eids}`], ['orders', `enrollment_id=in.${eids}`]] : []),
    ['enrollments', `learner=in.${who}&origin=eq.test`],
    ['course_drafts', `author=in.${who}&origin=eq.test`],
    ['publisher_members', `member=in.${who}&origin=eq.test`],
    ['account_roles', `address=in.${who}&origin=eq.test`],
  ]
  for (const [table, filter] of steps) {
    const del = await pg(`/${table}?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
    const left = await pg(`/${table}?${filter}&limit=0`, { headers: { prefer: 'count=exact' } })
    check(`${table}: baris uji dihapus, sisa 0 (kueri ulang)`, (del.status === 204 || del.status === 200) && left.total === 0, `HTTP ${del.status}, sisa ${left.total}`)
  }
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nSUSUN KURSUS ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
