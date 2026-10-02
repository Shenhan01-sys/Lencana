// Lencana-B129 status=TERBUKA 2026-10-02 — harness kursi Penerbit: pengajuan anggota (ajukan → disetujui/ditolak hanya oleh kunci penerbit), dasbor POST /publisher/overview (hanya pemegang kursi, angka dari baris yang bisa ditelusuri, tanpa teks esai), dan aksi anggota (sewa agen penilai / tunjuk agen pengesah dengan tanda tangannya sendiri, sesuai wewenang, tidak untuk agen miliknya). Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:publisher` — kursi Penerbit end-to-end (B129, RF7 langkah C2, D64), terhadap server sendiri
 * (origin=test). Kursus aksi agen = kelas uji `uji-bayar-2026` (unlisted), supaya sewa/penunjukan demo di
 * `web3-dasar-2026` tidak tersentuh; semua baris yang dibuat harness dihapus di bagian F lalu sisanya dihitung ulang.
 *
 *   A  pengajuan: bentuk pesan, kunci lain, satu yang menunggu, tolak (hanya kunci penerbit), ajukan lagi, hibah menyetujui
 *   B  dasbor: hanya pemegang kursi; potongan platform = `platformBps` yang dibaca dari chain; uang tidak hilang di
 *      pembagian; baris uji disaring kecuali diminta; tanpa teks esai
 *   C  sewa oleh anggota: wewenang `hire`, tanda tangan anggota, `hired_by` = anggota, tidak untuk agennya sendiri
 *   D  tunjuk pengesah oleh anggota: wewenang `appoint`, dompet agen dari registry, tidak untuk agennya sendiri,
 *      aturan B120 (penilai ≠ pengesah) tetap berlaku
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createPublicClient, http, parseAbi } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { MANIFESTS } from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await loadFileEnvReport('verify:publisher')
const env = process.env
for (const k of ['SUPABASE_URL', 'ISSUER_PRIVATE_KEY', 'ISSUER_ADDRESS', 'RPC_URL', 'SPLIT_ADDRESS', 'DEMO_TOKEN_ADDRESS', 'AGENT_OWNER_PRIVATE_KEY', 'REVIEWER_OWNER_PRIVATE_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) { console.error('secret key Supabase belum diisi — prasyarat, bukan kegagalan uji'); process.exit(2) }

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

const COURSE = 'uji-bayar-2026'
const GRADER_ID = '2534'
const REVIEWER_ID = '2542'
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const graderOwner = privateKeyToAccount(env.AGENT_OWNER_PRIVATE_KEY)
const reviewerOwner = privateKeyToAccount(env.REVIEWER_OWNER_PRIVATE_KEY)
const applicant = privateKeyToAccount(generatePrivateKey()) // mengajukan, ditolak, mengajukan lagi, lalu disetujui (hire+appoint)
const appointOnly = privateKeyToAccount(generatePrivateKey()) // anggota tanpa wewenang sewa
const stranger = privateKeyToAccount(generatePrivateKey()) // bukan anggota
const testMembers = [applicant.address, appointOnly.address, graderOwner.address, reviewerOwner.address]

const PORT = Number(env.PUBLISHER_PROBE_PORT ?? await freePort(8963))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body, method = body === undefined ? 'GET' : 'POST') => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(90000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const signed = async (account, message) => ({ message, signature: await account.signMessage({ message }) })
const apply = async (account, note = null, msg = `lencana-member-request issuer=${publisher.address.toLowerCase()} nonce=${nonce()}`, signer = account) =>
  call('/me/member-request', { learner: account.address, note, ...await signed(signer, msg) })
const decide = async (kind, who, { hire = false, appoint = false, signer = publisher } = {}) => {
  const m = kind === 'grant'
    ? `lencana-member grant member=${who.toLowerCase()} hire=${hire ? 1 : 0} appoint=${appoint ? 1 : 0} nonce=${nonce()}`
    : `lencana-member ${kind} member=${who.toLowerCase()} nonce=${nonce()}`
  return call('/publisher/members', {
    issuer: publisher.address, member: who, canHire: hire, canAppoint: appoint, revoke: kind === 'revoke', reject: kind === 'reject', ...await signed(signer, m),
  })
}
const roles = async (account) => call('/me/roles', { learner: account.address, ...await signed(account, `lencana-roles nonce=${nonce()}`) })
const overview = async (account, includeTest = false, signer = account) =>
  call('/publisher/overview', { learner: account.address, includeTest, ...await signed(signer, `lencana-publisher nonce=${nonce()}`) })
const hireAs = async (account, agentId, msg = `lencana-pub-hire course=${COURSE} agent=${agentId} nonce=${nonce()}`, signer = account) =>
  call('/publisher/agents/hire', { member: account.address, course: COURSE, agentId, ...await signed(signer, msg) })
const appointAs = async (account, agentId, wallet) =>
  call('/publisher/reviewers', {
    member: account.address, course: COURSE, agentId, reviewer: wallet,
    ...await signed(account, `lencana-pub-appoint course=${COURSE} reviewer=${String(wallet).toLowerCase()} agent=${agentId} nonce=${nonce()}`),
  })

const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const pg = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json', prefer: 'count=exact,return=minimal', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  })
  return { status: r.status, total: Number((r.headers.get('content-range') ?? '').split('/').pop() ?? 'NaN') }
}
const inList = (xs) => `(${xs.join(',')})`

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  // B131 (D66): kunci pemilik agen tim berperan Agent Owner, jadi tidak bisa diberi keanggotaan. Aturan "anggota tidak menyewa
  // atau menunjuk agennya sendiri" tetap berlaku untuk akun dev (dummy builder), maka keduanya dijadikan akun dev SELAMA
  // harness ini (baris origin=test, dihapus di F).
  for (const a of [graderOwner.address, reviewerOwner.address]) {
    const d = await pg('/account_roles', { method: 'POST', headers: { prefer: 'return=minimal' }, body: json([{ address: a, dev: true, dev_note: 'publisher-check (sementara)', origin: 'test' }]) })
    check(`kunci pemilik agen ${a.slice(0, 6)}… dijadikan akun dev sementara`, d.status === 201, `HTTP ${d.status}`)
  }

  console.log('\n— A. pengajuan anggota: diajukan akun, diputuskan hanya kunci penerbit')
  const wrongIssuer = await apply(applicant, null, `lencana-member-request issuer=${stranger.address.toLowerCase()} nonce=${nonce()}`)
  check('pesan menyebut penerbit lain → 400', wrongIssuer.status === 400, wrongIssuer.text.slice(0, 160))
  const forged = await apply(applicant, null, undefined, stranger)
  check('ditandatangani kunci lain atas nama akun → 401', forged.status === 401, forged.text.slice(0, 160))
  const tooLong = await apply(applicant, 'x'.repeat(281))
  check('catatan > 280 karakter → 400', tooLong.status === 400, tooLong.text.slice(0, 160))
  const a1 = await apply(applicant, 'Staf kurikulum Yayasan (harness)')
  check('pengajuan sah → 201 status pending dengan catatan', a1.status === 201 && a1.body?.request?.status === 'pending' && a1.body.request.note === 'Staf kurikulum Yayasan (harness)', a1.text.slice(0, 200))
  check('B131: pengajuan pertama akun tanpa peran = memilih peran Penerbit', a1.body?.role === 'publisher', a1.text.slice(0, 200))
  const dup = await apply(applicant)
  check('pengajuan kedua selagi menunggu → 409 + menunjuk pengajuan yang ada', dup.status === 409 && dup.body?.request?.id === a1.body?.request?.id, dup.text.slice(0, 200))
  const r1 = (await roles(applicant)).body
  check('/me/roles: masih peserta saja, pengajuan terbaca "pending"', r1?.roles?.publisher === null && r1?.publisherRequest?.status === 'pending', json({ p: r1?.roles?.publisher, q: r1?.publisherRequest }))
  const ovEarly = await overview(applicant)
  check('pengajuan tidak memberi kursi: dasbor → 403', ovEarly.status === 403, ovEarly.text.slice(0, 160))
  const rejForged = await decide('reject', applicant.address, { signer: stranger })
  check('penolakan bertanda tangan kunci lain → 401', rejForged.status === 401, rejForged.text.slice(0, 160))
  const rej = await decide('reject', applicant.address)
  check('penolakan oleh kunci penerbit → 200, pengajuan "rejected"', rej.status === 200 && rej.body?.request?.status === 'rejected', rej.text.slice(0, 200))
  const r2 = (await roles(applicant)).body
  check('/me/roles sesudah ditolak: kursi tetap tidak ada, status "rejected"', r2?.roles?.publisher === null && r2?.publisherRequest?.status === 'rejected', json(r2?.publisherRequest))
  const rejAgain = await decide('reject', applicant.address)
  check('menolak lagi tanpa pengajuan yang menunggu → 400', rejAgain.status === 400, rejAgain.text.slice(0, 160))
  const a2 = await apply(applicant, 'ajukan ulang')
  check('sesudah ditolak boleh mengajukan lagi → 201 pending baru', a2.status === 201 && a2.body?.request?.id !== a1.body?.request?.id, a2.text.slice(0, 200))
  const g = await decide('grant', applicant.address, { hire: true, appoint: true })
  check('hibah kunci penerbit → 200 dan menutup pengajuan itu', g.status === 200 && g.body?.approvedRequest === a2.body?.request?.id, g.text.slice(0, 200))
  const r3 = (await roles(applicant)).body
  check('/me/roles sesudah disetujui: penerbit via member, sewa + tunjuk', r3?.roles?.publisher?.via === 'member' && r3.roles.publisher.canHire && r3.roles.publisher.canAppoint, json(r3?.roles?.publisher))
  const asMember = await apply(applicant)
  check('anggota mengajukan lagi → 409', asMember.status === 409, asMember.text.slice(0, 160))

  console.log('\n— B. POST /publisher/overview: hanya pemegang kursi, angka yang bisa ditelusuri')
  const noMsg = await call('/publisher/overview', { learner: applicant.address })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const other = await call('/publisher/overview', { learner: applicant.address, ...await signed(applicant, `lencana-roles nonce=${nonce()}`) })
  check('tanda tangan untuk keperluan lain (roles) → 400', other.status === 400, other.text.slice(0, 160))
  const ovForged = await overview(applicant, false, stranger)
  check('kunci lain atas nama anggota → 401', ovForged.status === 401, ovForged.text.slice(0, 160))
  const ovStranger = await overview(stranger)
  check('akun tanpa kursi → 403', ovStranger.status === 403, ovStranger.text.slice(0, 160))
  const ov = await overview(applicant)
  const o = ov.body ?? {}
  check('anggota → 200', ov.status === 200, ov.text.slice(0, 160))
  check('dasbor menyebut penerbit yang dikonfigurasi dan kursi pembacanya', same(o.issuer?.address, env.ISSUER_ADDRESS) && o.seat?.via === 'member', json({ i: o.issuer, s: o.seat }))
  check(`satu baris per kursus penerbit (${MANIFESTS.length})`, o.courses?.length === MANIFESTS.length, o.courses?.length)
  const client = createPublicClient({ transport: http(env.RPC_URL) })
  const bpsChain = Number(await client.readContract({ address: env.SPLIT_ADDRESS, abi: parseAbi(['function platformBps() view returns (uint16)']), functionName: 'platformBps' }))
  check(`potongan platform = platformBps di chain (${bpsChain})`, o.platformBps === bpsChain, `${o.platformBps} vs ${bpsChain}`)
  const t = o.totals ?? {}
  const g0 = BigInt(t.gross ?? -1)
  check('total: platform + bersih = kotor (tidak ada satuan yang hilang)', BigInt(t.platform ?? -1) + BigInt(t.net ?? -1) === g0, json(t))
  check('total: platform = kotor × bps / 10000 (pembulatan ke bawah seperti kontrak)', BigInt(t.platform ?? -1) === (g0 * BigInt(bpsChain)) / 10000n, json(t))
  const perCourse = (o.courses ?? []).reduce((s, c) => s + BigInt(c.gross), 0n)
  check('jumlah kotor per kursus = total kotor', perCourse === g0, `${perCourse} vs ${g0}`)
  const orderSum = (o.revenue?.orders ?? []).reduce((s, x) => s + BigInt(x.amount), 0n)
  check('total kotor = jumlah order lunas yang terdaftar (tiap order membawa tx)', orderSum === g0 && (o.revenue?.orders ?? []).every((x) => /^0x[0-9a-f]{64}$/i.test(String(x.tx))), `${orderSum} vs ${g0}`)
  check('baris uji disaring bawaan: tidak ada peserta origin=test', (o.learners ?? []).every((l) => l.origin !== 'test'), json((o.learners ?? []).map((l) => l.origin)))
  const ovAll = (await overview(applicant, true)).body ?? {}
  check('includeTest=true: enrollment ≥ tanpa baris uji', (ovAll.totals?.enrollments ?? -1) >= (t.enrollments ?? Infinity), `${ovAll.totals?.enrollments} vs ${t.enrollments}`)
  check('alur esai lengkap kategorinya', ['awaitingJudge', 'insufficient', 'awaitingReview', 'approved', 'adjusted', 'rejected', 'graded'].every((k) => Number.isInteger(o.essays?.pipeline?.[k])), json(o.essays?.pipeline))
  // Aturan view gerbang (migrasi 0009): hanya usulan model/agen yang menunggu pengesahan; nilai kunci penerbit sudah final.
  const waitingRows = (ovAll.essays?.recent ?? []).filter((e) => e.status === 'awaitingReview')
  check('"menunggu pengesahan" hanya usulan model/agen (aturan gerbang 0009)', waitingRows.every((e) => e.proposedBy !== null), json(waitingRows.map((e) => e.proposedBy)))
  check('nilai langsung kunci penerbit tidak masuk "menunggu pengesahan"', (ovAll.essays?.recent ?? []).filter((e) => e.status === 'graded').every((e) => e.proposedBy === null), json((ovAll.essays?.recent ?? []).filter((e) => e.status === 'graded')))
  check('tidak ada teks esai, kunci jawaban, atau tanda tangan di jawaban', !/"body"|"answer"|"signature"|"message"/.test(ov.text), ov.text.slice(0, 120))
  check('tim: anggota ini tercantum dengan wewenangnya', (o.team?.members ?? []).some((m) => same(m.member, applicant.address) && m.canHire && m.canAppoint), json(o.team))

  console.log(`\n— C. POST /publisher/agents/hire: anggota menyewa agen penilai untuk ${COURSE}`)
  check(`${COURSE} belum punya agen penilai sebelum harness`, !(o.courses ?? []).find((c) => c.id === COURSE)?.graders?.length, json((o.courses ?? []).find((c) => c.id === COURSE)?.graders))
  await decide('grant', appointOnly.address, { hire: false, appoint: true })
  const noRight = await hireAs(appointOnly, GRADER_ID)
  check('anggota tanpa hire=1 → 403', noRight.status === 403, noRight.text.slice(0, 160))
  const notMember = await hireAs(stranger, GRADER_ID)
  check('bukan anggota → 403', notMember.status === 403, notMember.text.slice(0, 160))
  const unbound = await hireAs(applicant, GRADER_ID, `lencana-pub-hire course=${COURSE} nonce=${nonce()}`)
  check('pesan tanpa agentId → 401', unbound.status === 401, unbound.text.slice(0, 160))
  const hForged = await hireAs(applicant, GRADER_ID, undefined, stranger)
  check('tanda tangan kunci lain atas nama anggota → 401', hForged.status === 401, hForged.text.slice(0, 160))
  await decide('grant', graderOwner.address, { hire: true, appoint: false })
  const own = await hireAs(graderOwner, GRADER_ID)
  check(`Agent Owner #${GRADER_ID} sebagai anggota menyewa agennya sendiri → 422`, own.status === 422, own.text.slice(0, 200))
  const h = await hireAs(applicant, GRADER_ID)
  check(`anggota dengan hire=1 menyewa #${GRADER_ID} → 200, dompet & pemilik dari registry, hiredBy = anggota`, h.status === 200 && same(h.body?.hiredBy, applicant.address) && /^0x/.test(h.body?.wallet ?? ''), h.text.slice(0, 200))
  const ovH = (await overview(applicant)).body ?? {}
  check('dasbor: sewa tercatat atas nama anggota (byMember)', (ovH.agents?.hires ?? []).some((x) => x.courseId === COURSE && x.agentId === GRADER_ID && x.byMember && same(x.hiredBy, applicant.address)), json(ovH.agents?.hires))

  console.log(`\n— D. POST /publisher/reviewers: anggota menunjuk agen pengesah untuk ${COURSE}`)
  const rates = (await call(`/agents/${REVIEWER_ID}/rates`)).body ?? {}
  check(`dompet agen #${REVIEWER_ID} terbaca dari registry`, /^0x[0-9a-fA-F]{40}$/.test(rates.wallet ?? ''), json(rates))
  const graderRates = (await call(`/agents/${GRADER_ID}/rates`)).body ?? {}
  const noAppoint = await appointAs(graderOwner, REVIEWER_ID, rates.wallet)
  check('anggota tanpa appoint=1 → 403', noAppoint.status === 403, noAppoint.text.slice(0, 160))
  await decide('grant', reviewerOwner.address, { hire: false, appoint: true })
  const ownR = await appointAs(reviewerOwner, REVIEWER_ID, rates.wallet)
  check(`Agent Owner #${REVIEWER_ID} sebagai anggota menunjuk agennya sendiri → 422`, ownR.status === 422, ownR.text.slice(0, 200))
  const graderAsReviewer = await appointAs(applicant, GRADER_ID, graderRates.wallet)
  check(`aturan B120 tetap: agen penilai kursus ini (#${GRADER_ID}) tidak bisa jadi pengesahnya → 422`, graderAsReviewer.status === 422, graderAsReviewer.text.slice(0, 200))
  const ap = await appointAs(applicant, REVIEWER_ID, rates.wallet)
  check(`anggota dengan appoint=1 menunjuk #${REVIEWER_ID} → 200, addedBy = anggota`, ap.status === 200 && same(ap.body?.addedBy, applicant.address) && ap.body?.agentId === REVIEWER_ID, ap.text.slice(0, 200))
  const ovR = (await overview(applicant)).body ?? {}
  check('dasbor: pengesah tercatat atas nama anggota (byMember)', (ovR.agents?.reviewers ?? []).some((x) => x.courseId === COURSE && x.agentId === REVIEWER_ID && x.byMember), json(ovR.agents?.reviewers))
  const cRow = (ovR.courses ?? []).find((c) => c.id === COURSE) ?? {}
  check(`baris kursus ${COURSE}: penilai #${GRADER_ID} + pengesah agen #${REVIEWER_ID}`, cRow.graders?.includes(GRADER_ID) && cRow.reviewers?.includes(`agent:${REVIEWER_ID}`), json({ g: cRow.graders, r: cRow.reviewers }))
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

// Semua baris buatan harness dihapus; sisanya dihitung ulang dari database, bukan diyakini.
console.log('\n— F. bersih-bersih baris uji')
try {
  const who = inList(testMembers)
  const steps = [
    ['review_roles', `course_id=eq.${COURSE}&added_by=in.${who}`],
    ['agent_hires', `course_id=eq.${COURSE}&hired_by=in.${who}`],
    ['publisher_members', `member=in.${who}&origin=eq.test`],
    ['member_requests', `applicant=in.${who}&origin=eq.test`],
    // B131: pilihan peran pemohon (pengajuan pertama = memilih Penerbit) dan tanda dev sementara kunci tim.
    ['account_roles', `address=in.${who}&origin=eq.test`],
  ]
  for (const [table, filter] of steps) {
    const del = await pg(`/${table}?${filter}`, { method: 'DELETE' })
    const left = await pg(`/${table}?${filter}&limit=0`)
    check(`${table}: baris uji dihapus, sisa 0 (kueri ulang)`, (del.status === 204 || del.status === 200) && left.total === 0, `HTTP ${del.status}, sisa ${left.total}`)
  }
} catch (e) {
  check('bersih-bersih selesai tanpa pengecualian', false, String(e?.message ?? e).slice(0, 200))
}

console.log(`\nKURSI PENERBIT ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
