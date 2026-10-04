// Lencana-B140 status=TERBUKA 2026-10-04 — harness kelola kursus terbit (D72): hak publish=1 dari hibah kunci penerbit, terbit/tolak dari dasbor ditandatangani server dengan kunci penerbit + jejak peminta, penyusun tidak memutuskan drafnya sendiri, versi baru (aturan sama → id sama digantikan di tempat; aturan berubah → id baru, versi lama diarsipkan), arsip/pulihkan + enroll baru ditolak, hapus hanya draf yang belum pernah diajukan. Buktikan ulang: npm run verify:manage. JANGAN dibalik/diulang tanpa membuka kembali baris B140 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:manage` — kelola kursus terbit dari dasbor Penerbit (B140, D72). Tanpa gas: server sendiri (origin=test,
 * `CATALOG_TTL_MS=0`), Postgres nyata; semua baris alamat sekali-pakai dihapus di akhir dan sisanya dihitung ulang.
 *
 *   A. hak: hibah `publish=1` hanya lewat pesan yang menyatakannya; anggota tanpa publish=1 → 403; bukan anggota → 403
 *   B. terbit dari dasbor: penyusun memutuskan drafnya sendiri → 403; anggota publish=1 → 200, server menandatangani dengan kunci
 *      penerbit (pesan sama dengan CLI), rubricHash = hitungan, jejak `course_actions` menyimpan peminta + kedua pesan
 *   C. sunting = versi baru, aturan nilai sama: salin dari versi terbit (kunci ikut, hanya untuk penyusunnya); satu draf terbuka
 *      per id; terbit menggantikan di tempat (versi lama `superseded`, id sama, katalog memuat isi baru)
 *   D. aturan nilai berubah: id lama ditolak audit (saran `<id>-v<n>`); id baru → terbit sebagai kursus baru, versi lama diarsipkan
 *   E. arsip: peserta lama tetap enroll (idempoten), peserta baru 409; pulihkan → enroll lagi; anggota tanpa publish=1 → 403
 *   F. hapus: hanya draf yang belum pernah diajukan, oleh penyusunnya; draf yang ditolak tidak bisa dihapus (ada keputusan)
 *   G. pesan kunci penerbit untuk versi baru WAJIB menyebut `supersedes=<id>` (CLI dan server memakai bentuk yang sama)
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { draftById, decideDraft } from '../src/db.js'
import { publishPlan, versionedId } from '../src/drafts.js'
import { normalizeDraft, draftHash } from '../../web/src/authoring.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:manage')
const env = process.env
for (const k of ['SUPABASE_URL', 'ISSUER_PRIVATE_KEY', 'ISSUER_ADDRESS', 'RPC_URL']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }
process.env.LANCENA_ORIGIN = 'test'

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 260)}` : ''}`) }
  return ok
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const head = (s) => console.log(`\n— ${s}`)
const tag = randomBytes(3).toString('hex')
const COURSE = `uji-kelola-${tag}`
const NEW_ID = versionedId(COURSE, 3)

const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const fresh = () => privateKeyToAccount(generatePrivateKey())
const A = fresh() // penyusun (author=1) yang juga publish=1 — tidak boleh memutuskan drafnya sendiri
const P = fresh() // anggota publish=1 (pemutus)
const N = fresh() // anggota tanpa publish=1
const X = fresh() // bukan anggota
const S1 = fresh() // peserta lama kursus
const S2 = fresh() // peserta baru
const throwaway = [A, P, N, X, S1, S2].map((a) => a.address)

/** Kursus kecil yang lolos audit (bentuk yang sama dengan verify:authoring). */
const draftInput = (id, { title = `Kelas Kelola Uji ${id}`, passMark = 70 } = {}) => ({
  course: {
    id, title, level: 'dasar', topic: 'Uji',
    blurb: 'Kelas singkat untuk menguji kelola kursus terbit dari dasbor penerbit.',
    audience: ['penguji harness'], outcome: ['membuktikan versi, arsip, dan keputusan dari dasbor'],
    criteria: 'Lulus bila nilai akhir mencapai pass mark; kuis dinilai server, esai dinilai penerbit.',
    weights: { kuis: 60, esai: 40, praktik: 0 }, passMark, validDays: 365,
    modules: [{
      id: 'm1', title: 'Modul satu', blurb: 'Satu-satunya modul.',
      lessons: [
        { slug: 'baca', title: 'Bacaan pembuka', minutes: 5, kind: 'bacaan', summary: 'Apa yang dipelajari.', blocks: [{ t: 'h', text: 'Pembuka' }, { t: 'p', text: 'Kursus ini dikelola dari halaman.' }, { t: 'ul', items: ['satu', 'dua'] }] },
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
  },
  keys: { kuis: { q1: { answer: 1, why: 'Satu tambah satu sama dengan dua.' }, q2: { answer: 0, why: 'Langit cerah berwarna biru.' } } },
  price: null,
})

const PORT = Number(env.MANAGE_PROBE_PORT ?? await freePort(8971))
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
const grant = async (who, { author = false, publish = false, say = null } = {}) => {
  const message = say ?? `lencana-member grant member=${who.toLowerCase()} hire=0 appoint=0${author ? ' author=1' : ''}${publish ? ' publish=1' : ''} nonce=${nonce()}`
  return call('/publisher/members', { issuer: publisher.address, member: who, canHire: false, canAppoint: false, canAuthor: author, canPublish: publish, message, signature: await publisher.signMessage({ message }) })
}
const list = async (account) => call('/publisher/drafts', { includeTest: true, ...await signed(account, `lencana-drafts nonce=${nonce()}`) })
let institution = ''
const save = async (account, input, draftId = null) => {
  const n = normalizeDraft(input, institution)
  const h = n.payload ? draftHash(n.payload) : '0x' + '0'.repeat(64)
  return call('/publisher/drafts/save', { draftId, payload: input, ...await signed(account, `lencana-draft save draft=${draftId ?? 'new'} course=${input.course.id} hash=${h} nonce=${nonce()}`) })
}
const submit = async (account, draftId, hash) => call('/publisher/drafts/submit', { draftId, ...await signed(account, `lencana-draft submit draft=${draftId} hash=${hash} nonce=${nonce()}`) })
const decide = async (account, draftId, decision, note = null) => call('/publisher/drafts/decide', { draftId, decision, note, ...await signed(account, `lencana-course-request decide draft=${draftId} decision=${decision} nonce=${nonce()}`) })
const fork = async (account, courseId) => call('/publisher/drafts/fork', { courseId, ...await signed(account, `lencana-draft fork course=${courseId} nonce=${nonce()}`) })
const del = async (account, draftId) => call('/publisher/drafts/delete', { draftId, ...await signed(account, `lencana-draft delete draft=${draftId} nonce=${nonce()}`) })
const archive = async (account, courseId, on) => call('/publisher/courses/archive', { courseId, archived: on, ...await signed(account, `lencana-course-request archive course=${courseId} on=${on ? 1 : 0} nonce=${nonce()}`) })
const enroll = async (who, courseId) => call('/enroll', { learner: who.address, course: courseId, ...await signed(who, `lencana-enroll ${courseId} nonce=${nonce()}`) })
const catalogEntry = async (courseId) => ((await call('/catalog/published')).body?.courses ?? []).find((x) => x.manifest?.course?.id === courseId) ?? null

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
const inList = (xs) => `(${xs.map((x) => encodeURIComponent(String(x))).join(',')})`
const actionsFor = async (courseId) => (await pg(`/course_actions?course_id=eq.${encodeURIComponent(courseId)}&select=*&order=id.asc`)).body ?? []

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  head('A. hak publish=1')
  const gBad = await grant(A.address, { author: true, publish: true, say: `lencana-member grant member=${A.address.toLowerCase()} hire=0 appoint=0 author=1 nonce=${nonce()}` })
  check('pesan hibah tanpa publish=1 tidak bisa dipakai untuk publish=1 → 400', gBad.status === 400 && /publish=1/.test(gBad.body?.error ?? ''), gBad.text.slice(0, 160))
  const gA = await grant(A.address, { author: true, publish: true })
  const gP = await grant(P.address, { publish: true })
  const gN = await grant(N.address)
  check('hibah: A (author=1 publish=1), P (publish=1), N (tanpa keduanya) → 200', gA.status === 200 && gA.body?.canPublish === true && gP.body?.canPublish === true && gN.body?.canPublish === false, json([gA.status, gP.status, gN.status]))
  const lA = await list(A)
  institution = lA.body?.institution ?? ''
  check('daftar draf menyebut hak kursi (canAuthor + canPublish) untuk A', lA.status === 200 && lA.body?.canAuthor === true && lA.body?.canPublish === true, lA.text.slice(0, 160))

  head('B. terbit dari dasbor (server menandatangani dengan kunci penerbit)')
  const s1 = await save(A, draftInput(COURSE))
  const d1 = s1.body?.draft
  check(`A menyimpan ${COURSE} (versi 1, tanpa masalah)`, s1.status === 200 && d1?.problems?.length === 0 && d1?.version === 1 && d1?.supersedes === null, s1.text.slice(0, 200))
  const sub1 = await submit(A, d1?.id, d1?.contentHash)
  check('A mengajukan → submitted', sub1.status === 200 && sub1.body?.draft?.status === 'submitted', sub1.text.slice(0, 140))
  const selfDecide = await decide(A, d1?.id, 'publish')
  check('penyusun memutuskan drafnya sendiri dari dasbor → 403 (empat mata)', selfDecide.status === 403 && /author of a draft/.test(selfDecide.body?.error ?? ''), selfDecide.text.slice(0, 160))
  const nDecide = await decide(N, d1?.id, 'publish')
  check('anggota tanpa publish=1 → 403', nDecide.status === 403 && /publish=1/.test(nDecide.body?.error ?? ''), nDecide.text.slice(0, 160))
  const xDecide = await decide(X, d1?.id, 'publish')
  check('bukan anggota → 403', xDecide.status === 403, xDecide.text.slice(0, 120))
  const badMsg = await call('/publisher/drafts/decide', { draftId: d1?.id, decision: 'publish', ...await signed(P, `lencana-course-request decide draft=${d1?.id} decision=reject nonce=${nonce()}`) })
  check('pesan peminta yang menyebut keputusan lain → 400', badMsg.status === 400, badMsg.text.slice(0, 140))
  const pub1 = await decide(P, d1?.id, 'publish')
  const row1 = await draftById(d1?.id)
  const plan1 = await publishPlan(row1)
  check('P menerbitkan → 200; baris published; rubricHash = hitungan dari isi + kunci tersimpan',
    pub1.status === 200 && row1?.status === 'published' && row1?.rubric_hash === plan1.rubricHash, pub1.text.slice(0, 200))
  const decided1 = ((await pg(`/course_drafts?id=eq.${d1?.id}&select=decided_message,decided_signature`)).body ?? [])[0]
  check('pesan kunci penerbit berbentuk CLI: lencana-course publish draft=… course=… rubric=… (tanpa supersedes), tersimpan di barisnya',
    new RegExp(`^lencana-course publish draft=${d1?.id} course=${COURSE} rubric=${row1?.rubric_hash} nonce=[0-9a-f]+$`).test(pub1.body?.issuerMessage ?? '')
    && decided1?.decided_message === pub1.body?.issuerMessage && /^0x[0-9a-f]+$/.test(decided1?.decided_signature ?? ''), json({ msg: pub1.body?.issuerMessage, stored: decided1?.decided_message }))
  const act1 = (await actionsFor(COURSE)).find((a) => a.action === 'publish' && Number(a.draft_id) === d1?.id)
  check('jejak course_actions: peminta P + pesan + tanda tangan peminta, pesan kunci penerbit',
    act1?.requested_by === P.address && /^lencana-course-request decide/.test(act1?.request_message ?? '') && /^0x/.test(act1?.request_signature ?? '') && act1?.issuer_message === pub1.body?.issuerMessage, json(act1))
  const cat1 = await catalogEntry(COURSE)
  check('katalog publik memuat kursus itu (versi 1, tidak diarsipkan, tanpa kunci kuis)', cat1?.version === 1 && cat1?.archived === false && !JSON.stringify(cat1).includes('"answer"'), json(cat1)?.slice(0, 200))
  const e1 = await enroll(S1, COURSE)
  check('peserta lama S1 mendaftar → 200', e1.status === 200, e1.text.slice(0, 120))

  head('C. sunting = versi baru, aturan nilai sama → id sama, digantikan di tempat')
  const nFork = await fork(N, COURSE)
  check('anggota tanpa author=1 membuat versi baru → 403', nFork.status === 403, nFork.text.slice(0, 120))
  const fileFork = await fork(A, 'web3-dasar-2026')
  check('kursus berkas tidak bisa disunting dari dasbor → 404', fileFork.status === 404, fileFork.text.slice(0, 140))
  const f2 = await fork(A, COURSE)
  const v2 = f2.body?.draft
  check('A membuat versi 2: supersedes = versi 1, isi + kunci tersalin (kunci hanya untuk penyusunnya), tanpa masalah',
    f2.status === 200 && v2?.version === 2 && v2?.supersedes === d1?.id && v2?.courseId === COURSE && v2?.keys?.kuis?.q1?.answer === 1 && v2?.problems?.length === 0, f2.text.slice(0, 220))
  const f2b = await fork(A, COURSE)
  check('versi baru kedua selagi yang pertama terbuka → 409', f2b.status === 409, f2b.text.slice(0, 140))
  const pList = await list(P)
  const v2ForP = (pList.body?.drafts ?? []).find((x) => x.id === v2?.id)
  check('anggota lain melihat versi 2 tanpa kunci kuis', v2ForP && v2ForP.keys === undefined, json(v2ForP)?.slice(0, 160))
  const s2 = await save(A, draftInput(COURSE, { title: `Kelas Kelola Uji ${COURSE} (diperbarui)` }), v2?.id)
  check('A mengganti judul saja (aturan nilai sama, id sama) → tanpa masalah', s2.status === 200 && s2.body?.draft?.problems?.length === 0, s2.text.slice(0, 200))
  const sub2 = await submit(A, v2?.id, s2.body?.draft?.contentHash)
  check('A mengajukan versi 2', sub2.status === 200, sub2.text.slice(0, 120))
  const pub2 = await decide(P, v2?.id, 'publish')
  const old1 = await draftById(d1?.id)
  const row2 = await draftById(v2?.id)
  check('P menerbitkan versi 2 → digantikan di tempat: versi 1 superseded, versi 2 published dengan id sama',
    pub2.status === 200 && pub2.body?.replaced?.how === 'superseded' && old1?.status === 'superseded' && row2?.status === 'published' && row2?.course_id === COURSE, pub2.text.slice(0, 200))
  check('pesan kunci penerbit versi 2 menyebut supersedes=<versi 1>', new RegExp(` supersedes=${d1?.id} nonce=`).test(pub2.body?.issuerMessage ?? ''), pub2.body?.issuerMessage)
  const cat2 = await catalogEntry(COURSE)
  check('katalog memuat isi baru dengan id yang sama (versi 2)', cat2?.version === 2 && /diperbarui/.test(cat2?.manifest?.course?.title ?? ''), json(cat2?.manifest?.course?.title))
  const e1b = await enroll(S1, COURSE)
  check('peserta lama tetap terdaftar di id yang sama (enroll idempoten → 200)', e1b.status === 200, e1b.text.slice(0, 120))

  head('D. aturan nilai berubah → id wajib baru, versi lama diarsipkan')
  const f3 = await fork(A, COURSE)
  const v3 = f3.body?.draft
  check('A membuat versi 3 dari versi 2', f3.status === 200 && v3?.version === 3 && v3?.supersedes === v2?.id, f3.text.slice(0, 160))
  const s3same = await save(A, draftInput(COURSE, { passMark: 75 }), v3?.id)
  const p3 = s3same.body?.draft?.problems ?? []
  check(`pass mark diubah tapi id tetap → audit menuntut id baru (saran ${NEW_ID})`, s3same.status === 200 && p3.some((x) => /aturan nilai berubah/.test(x.what) && x.what.includes(NEW_ID)), json(p3))
  const sub3bad = await submit(A, v3?.id, s3same.body?.draft?.contentHash)
  check('versi bermasalah tidak bisa diajukan → 422', sub3bad.status === 422, sub3bad.text.slice(0, 140))
  const s3sameRulesNewId = await save(A, draftInput(NEW_ID), v3?.id)
  check('aturan nilai sama tapi id diganti → audit menuntut id lama', (s3sameRulesNewId.body?.draft?.problems ?? []).some((x) => /aturan nilai sama/.test(x.what)), json(s3sameRulesNewId.body?.draft?.problems))
  const s3 = await save(A, draftInput(NEW_ID, { passMark: 75 }), v3?.id)
  check(`aturan berubah + id baru ${NEW_ID} → tanpa masalah`, s3.status === 200 && s3.body?.draft?.problems?.length === 0, json(s3.body?.draft?.problems ?? s3.text.slice(0, 160)))
  const sub3 = await submit(A, v3?.id, s3.body?.draft?.contentHash)
  check('A mengajukan versi 3', sub3.status === 200, sub3.text.slice(0, 120))
  const pub3 = await decide(P, v3?.id, 'publish')
  const old2 = await draftById(v2?.id)
  const row3 = await draftById(v3?.id)
  check('P menerbitkan versi 3 → kursus baru dengan id baru; versi 2 tetap terbit tapi diarsipkan',
    pub3.status === 200 && pub3.body?.replaced?.how === 'archived' && row3?.status === 'published' && row3?.course_id === NEW_ID && old2?.status === 'published' && Boolean(old2?.archived_at), pub3.text.slice(0, 200))
  const catOld = await catalogEntry(COURSE)
  const catNew = await catalogEntry(NEW_ID)
  check('katalog: id lama tetap dimuat (archived=true, kelasnya tetap ada), id baru archived=false', catOld?.archived === true && catNew?.archived === false, json([catOld?.archived, catNew?.archived]))

  head('E. arsip: peserta lama tetap, peserta baru ditolak; pulihkan')
  const e1c = await enroll(S1, COURSE)
  check('peserta lama S1 di kursus yang diarsipkan → 200 (idempoten)', e1c.status === 200, e1c.text.slice(0, 120))
  const e2 = await enroll(S2, COURSE)
  check('peserta baru S2 di kursus yang diarsipkan → 409 archived', e2.status === 409 && e2.body?.archived === true, e2.text.slice(0, 140))
  const nArch = await archive(N, COURSE, false)
  check('anggota tanpa publish=1 memulihkan → 403', nArch.status === 403, nArch.text.slice(0, 120))
  const unarch = await archive(P, COURSE, false)
  check('P memulihkan kursus lama → 200, archivedAt null', unarch.status === 200 && unarch.body?.archivedAt === null && /^lencana-course archive course=.+ on=0 nonce=/.test(unarch.body?.issuerMessage ?? ''), unarch.text.slice(0, 160))
  const e2b = await enroll(S2, COURSE)
  check('sesudah dipulihkan, peserta baru S2 bisa mendaftar → 200', e2b.status === 200, e2b.text.slice(0, 120))
  const rearch = await archive(P, COURSE, true)
  const actArch = (await actionsFor(COURSE)).filter((a) => a.action === 'archive' || a.action === 'unarchive')
  check('P mengarsipkan lagi → 200; jejak arsip/pulihkan tercatat dengan peminta P', rearch.status === 200 && Boolean(rearch.body?.archivedAt) && actArch.some((a) => a.action === 'unarchive' && a.requested_by === P.address) && actArch.some((a) => a.action === 'archive' && a.requested_by === P.address), json(actArch.map((a) => [a.action, a.requested_by])))
  const noCourse = await archive(P, `tidak-ada-${tag}`, true)
  check('kursus yang tidak ada → 404', noCourse.status === 404, noCourse.text.slice(0, 120))

  head('F. hapus: hanya draf yang belum pernah diajukan; tolak dengan catatan')
  const sD = await save(A, draftInput(`uji-kelola-hapus-${tag}`))
  const dD = sD.body?.draft
  const pDel = await del(P, dD?.id)
  check('anggota tanpa author=1 menghapus → 403', pDel.status === 403, pDel.text.slice(0, 120))
  const aDel = await del(A, dD?.id)
  const goneRow = await draftById(dD?.id)
  const actDel = (await actionsFor(`uji-kelola-hapus-${tag}`)).find((a) => a.action === 'delete')
  check('penyusun menghapus draf yang belum diajukan → 200, baris hilang, jejak hapus tersisa (draft_id null)', aDel.status === 200 && goneRow === null && actDel?.requested_by === A.address && actDel?.draft_id === null, json([aDel.status, goneRow?.id, actDel]))
  const sE = await save(A, draftInput(`uji-kelola-tolak-${tag}`))
  const dE = sE.body?.draft
  await submit(A, dE?.id, dE?.contentHash)
  const subDel = await del(A, dE?.id)
  check('draf yang sudah diajukan tidak bisa dihapus → 409', subDel.status === 409, subDel.text.slice(0, 140))
  const rej = await decide(P, dE?.id, 'reject', 'Judul terlalu umum.')
  const rowE = await draftById(dE?.id)
  check('P menolak dengan catatan → rejected, catatan tersimpan', rej.status === 200 && rowE?.status === 'rejected' && rowE?.decided_note === 'Judul terlalu umum.', rej.text.slice(0, 160))
  const rejDel = await del(A, dE?.id)
  check('draf yang ditolak tidak bisa dihapus (ada keputusan tercatat) → 409', rejDel.status === 409, rejDel.text.slice(0, 160))

  head('G. pesan kunci penerbit untuk versi baru wajib menyebut supersedes')
  const f4 = await fork(A, NEW_ID)
  const v4 = f4.body?.draft
  await save(A, draftInput(NEW_ID, { passMark: 75, title: 'Versi empat' }), v4?.id)
  const v4row = await draftById(v4?.id)
  await submit(A, v4?.id, v4row?.content_hash)
  const plan4 = await publishPlan(await draftById(v4?.id), { base: await draftById(v3?.id) })
  const noSup = `lencana-course publish draft=${v4?.id} course=${NEW_ID} rubric=${plan4.rubricHash} nonce=${nonce()}`
  const cliNoSup = await decideDraft({ draftId: v4?.id, issuer: publisher.address, decision: 'publish', rubricHash: plan4.rubricHash, manifestHash: plan4.manifestHash, publishedAt: plan4.publishedAt, message: noSup, signature: await publisher.signMessage({ message: noSup }) })
  check('pesan terbit versi baru TANPA supersedes ditolak (kunci penerbit pun) → input', cliNoSup.ok === false && cliNoSup.kind === 'input' && /supersedes=/.test(cliNoSup.why), json(cliNoSup))
  const withSup = `lencana-course publish draft=${v4?.id} course=${NEW_ID} rubric=${plan4.rubricHash} supersedes=${v3?.id} nonce=${nonce()}`
  const cliOk = await decideDraft({ draftId: v4?.id, issuer: publisher.address, decision: 'publish', rubricHash: plan4.rubricHash, manifestHash: plan4.manifestHash, publishedAt: plan4.publishedAt, message: withSup, signature: await publisher.signMessage({ message: withSup }) })
  check('pesan dengan supersedes (bentuk CLI course:publish) → terbit, versi 3 superseded', cliOk.ok === true && cliOk.replaced?.how === 'superseded' && (await draftById(v3?.id))?.status === 'superseded', json(cliOk.replaced ?? cliOk))
} catch (e) {
  check('lintasan selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

head('H. bersih-bersih baris uji (kueri ulang)')
try {
  const who = inList(throwaway)
  const ours = (await pg(`/course_drafts?author=in.${who}&origin=eq.test&select=id,course_id`)).body ?? []
  const ids = inList(ours.map((r) => r.id))
  const courseIds = [...new Set(ours.map((r) => r.course_id).concat([COURSE, NEW_ID, `uji-kelola-hapus-${tag}`, `uji-kelola-tolak-${tag}`]))]
  const enr = (await pg(`/enrollments?learner=in.${who}&origin=eq.test&select=id`)).body ?? []
  const eids = inList(enr.map((r) => r.id))
  const steps = [
    ...(enr.length ? [['lesson_progress', `enrollment_id=in.${eids}`], ['progress_events', `enrollment_id=in.${eids}`], ['orders', `enrollment_id=in.${eids}`]] : []),
    ['enrollments', `learner=in.${who}&origin=eq.test`],
    ['course_actions', `course_id=in.${inList(courseIds)}&origin=eq.test`],
  ]
  // Rantai versi diputus dulu (FK supersedes tanpa on delete), baru drafnya dihapus.
  if (ours.length) await pg(`/course_drafts?id=in.${ids}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: json({ supersedes: null }) })
  steps.push(['course_drafts', `author=in.${who}&origin=eq.test`], ['publisher_members', `member=in.${who}&origin=eq.test`], ['account_roles', `address=in.${who}&origin=eq.test`])
  for (const [table, filter] of steps) {
    const r = await pg(`/${table}?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
    const left = await pg(`/${table}?${filter}&limit=0`, { headers: { prefer: 'count=exact' } })
    check(`${table}: baris uji dihapus, sisa 0 (kueri ulang)`, (r.status === 204 || r.status === 200) && left.total === 0, `HTTP ${r.status}, sisa ${left.total}`)
  }
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nKELOLA KURSUS ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
