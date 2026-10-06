// Lencana-B129 status=SELESAI 2026-10-02 — harness kursi Penerbit: pengajuan anggota (ajukan → disetujui/ditolak hanya oleh kunci penerbit), dasbor POST /publisher/overview (hanya pemegang kursi, angka dari baris yang bisa ditelusuri, tanpa teks esai), dan aksi anggota (sewa agen penilai / tunjuk agen pengesah dengan tanda tangannya sendiri, sesuai wewenang, tidak untuk agen miliknya). Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
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
const adminAcct = privateKeyToAccount(generatePrivateKey()) // admin Lencana (ADMIN_ADDRESSES di server uji)
const adminApplicant = privateKeyToAccount(generatePrivateKey()) // diajukan lalu disetujui admin, lalu dicabut admin
const adminRejected = privateKeyToAccount(generatePrivateKey()) // diajukan lalu ditolak admin
const testMembers = [applicant.address, appointOnly.address, graderOwner.address, reviewerOwner.address, adminApplicant.address, adminRejected.address]

const PORT = Number(env.PUBLISHER_PROBE_PORT ?? await freePort(8963))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off', ADMIN_ADDRESSES: adminAcct.address }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
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

  // B129 (6 Okt): daftar pengajuan di dasbor — hanya pemegang kunci penerbit yang menerimanya; keputusan tetap hanya tanda tangan kunci itu,
  // dengan bentuk pesan yang sama dengan yang dibentuk dasbor (`web/src/learning.ts` decideMemberRequest).
  console.log('\n— B2. daftar pengajuan anggota di dasbor: hanya kunci penerbit, catatan disaring, keputusan hanya kunci penerbit')
  const pend1 = privateKeyToAccount(generatePrivateKey())
  testMembers.push(pend1.address)
  const ap1 = await apply(pend1, '  Staf\tbaru\n\u0007 (harness)  ')
  check('pengajuan dengan catatan berkarakter kontrol diterima → 201 pending', ap1.status === 201 && ap1.body?.request?.status === 'pending', ap1.text.slice(0, 200))
  const ovKey = await overview(publisher)
  const reqList = ovKey.body?.team?.requests ?? []
  const mine = reqList.find((r) => same(r.address, pend1.address))
  check('kunci penerbit → 200, team.requests memuat pengajuan ini dan jumlahnya ≥ 1', ovKey.status === 200 && ovKey.body?.team?.pendingRequests >= 1 && Boolean(mine), ovKey.text.slice(0, 200))
  check('catatan disaring: karakter kontrol dibuang, spasi dirapatkan', mine?.note === 'Staf baru (harness)', json(mine))
  check('item pengajuan hanya {address, note, at}; tidak ada pesan atau tanda tangan di jawaban', Object.keys(mine ?? {}).sort().join() === 'address,at,note' && !/"signature"|"message"/.test(ovKey.text), json(Object.keys(mine ?? {})))
  const ovMember = (await overview(applicant)).body ?? {}
  check('anggota: hanya jumlah pengajuan, daftar kosong (kunci penerbit yang memutuskan, bukan anggota)', ovMember.team?.pendingRequests >= 1 && Array.isArray(ovMember.team?.requests) && ovMember.team.requests.length === 0, json(ovMember.team))
  const byMember = await decide('grant', pend1.address, { hire: true, signer: applicant })
  check('anggota tidak bisa menyetujui pengajuan (tanda tangan anggota atas nama penerbit) → 401', byMember.status === 401, byMember.text.slice(0, 160))
  const rejByMember = await decide('reject', pend1.address, { signer: applicant })
  check('anggota tidak bisa menolak pengajuan → 401', rejByMember.status === 401, rejByMember.text.slice(0, 160))
  const stillPending = (await overview(publisher)).body?.team?.requests ?? []
  check('pengajuan tetap menunggu sesudah dua percobaan yang ditolak', stillPending.some((r) => same(r.address, pend1.address)), json(stillPending.map((r) => r.address)))
  const grantMsg = `lencana-member grant member=${pend1.address.toLowerCase()} hire=1 appoint=0 author=1 publish=1 nonce=${nonce()}`
  const gFull = await call('/publisher/members', { issuer: publisher.address, member: pend1.address, canHire: true, canAppoint: false, canAuthor: true, canPublish: true, ...await signed(publisher, grantMsg) })
  check('hibah bentuk pesan dasbor (hire + author + publish, tanpa appoint) oleh kunci penerbit → 200 dan menutup pengajuan', gFull.status === 200 && gFull.body?.approvedRequest === ap1.body?.request?.id && gFull.body?.canAuthor === true && gFull.body?.canPublish === true, gFull.text.slice(0, 200))
  const ovAfter = (await overview(publisher)).body ?? {}
  check('sesudah disetujui: tidak lagi di team.requests dan tercatat anggota dengan wewenangnya', !(ovAfter.team?.requests ?? []).some((r) => same(r.address, pend1.address))
    && (ovAfter.team?.members ?? []).some((m) => same(m.member, pend1.address) && m.canHire && !m.canAppoint && m.canAuthor && m.canPublish), json(ovAfter.team))

  console.log(`\n— C. POST /publisher/agents/hire: anggota menyewa agen penilai untuk ${COURSE}`)
  // Prasyarat yang benar-benar dipakai harness: agen yang AKAN ia sewa (#GRADER_ID) dan tunjuk (#REVIEWER_ID) belum menempel di kursus ini
  // — kalau sudah, sewanya sendiri ditolak dan langkah di bawah merah karena sebab yang salah. Dulu: "kursus belum punya penilai sama sekali".
  // 5 Okt kelas uji dipakai builder untuk alur nyata (sewa #2549, pengesah #2547) dan prasyarat lama merah, padahal bersih-bersih (F) hanya
  // menghapus baris milik anggota uji dan tidak menyentuh baris nyata (dibuktikan: baris nyata utuh sesudah baterai). Dikoreksi, tidak dihapus.
  const before = (o.courses ?? []).find((c) => c.id === COURSE)
  check(`${COURSE}: agen yang akan disewa (#${GRADER_ID}) dan ditunjuk (#${REVIEWER_ID}) belum menempel sebelum harness`,
    !(before?.graders ?? []).includes(GRADER_ID) && !(before?.reviewers ?? []).includes(`agent:${REVIEWER_ID}`), json({ g: before?.graders, r: before?.reviewers }))
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

  // ---------------------------------------------------------------- G. admin Lencana (6 Okt malam)
  console.log('\n— G. admin Lencana: keanggotaan penerbit diputuskan alamat di ADMIN_ADDRESSES (selain kunci penerbit)')
  {
  const adminCall = async (path, account, message, extra = {}) => call(path, { admin: account.address, ...extra, ...await signed(account, message) })
  const overviewMsg = () => `lencana-admin overview nonce=${nonce()}`
  const notAdmin = await adminCall('/admin/overview', stranger, overviewMsg())
  check('akun bukan admin → 403 sebelum tanda tangan dipakai', notAdmin.status === 403 && /not a Lencana admin/.test(notAdmin.body?.error ?? ''), notAdmin.text.slice(0, 160))
  const wrongPurpose = await adminCall('/admin/overview', adminAcct, `lencana-roles nonce=${nonce()}`)
  check('tanda tangan admin untuk keperluan lain (roles) → 400, tidak bisa dipakai di rute admin', wrongPurpose.status === 400, wrongPurpose.text.slice(0, 160))
  const forgedAdmin = await call('/admin/overview', { admin: adminAcct.address, ...await signed(stranger, overviewMsg()) })
  check('tanda tangan kunci lain atas alamat admin → 401', forgedAdmin.status === 401, forgedAdmin.text.slice(0, 160))
  const ap1 = await apply(adminApplicant, 'lamaran uji admin\u0007 dengan   spasi')
  const ap2 = await apply(adminRejected, null)
  check('dua akun mengajukan menjadi anggota (201)', ap1.status === 201 && ap2.status === 201, `${ap1.status}/${ap2.status} ${ap1.text.slice(0, 100)}`)
  const ovMsg = overviewMsg()
  const ov = await adminCall('/admin/overview', adminAcct, ovMsg)
  const reqs = ov.body?.requests ?? []
  check('admin → 200: daftar pengajuan memuat kedua pemohon, penerbit = alamat kunci penerbit', ov.status === 200 && same(ov.body?.issuer, publisher.address) && reqs.some((r) => same(r.address, adminApplicant.address)) && reqs.some((r) => same(r.address, adminRejected.address)), ov.text.slice(0, 200))
  const first = reqs.find((r) => same(r.address, adminApplicant.address))
  check('catatan pemohon disaring (karakter kontrol dibuang, spasi dirapatkan) dan item hanya {id, address, note, at}', first?.note === 'lamaran uji admin dengan spasi' && JSON.stringify(Object.keys(first ?? {}).sort()) === JSON.stringify(['address', 'at', 'id', 'note']), JSON.stringify(first))
  const replay = await adminCall('/admin/overview', adminAcct, ovMsg)
  check('pesan + tanda tangan yang sama dipakai lagi → 401 (nonce sekali-pakai)', replay.status === 401, replay.text.slice(0, 120))
  const rejectBody = { member: adminRejected.address, action: 'reject' }
  const strangerDecides = await adminCall('/admin/members', stranger, `lencana-admin reject member=${adminRejected.address.toLowerCase()} nonce=${nonce()}`, rejectBody)
  check('akun bukan admin menolak pengajuan → 403 (kunci penerbit bukan satu-satunya jalan, tetapi bukan sembarang akun)', strangerDecides.status === 403, strangerDecides.text.slice(0, 140))
  const rej = await adminCall('/admin/members', adminAcct, `lencana-admin reject member=${adminRejected.address.toLowerCase()} nonce=${nonce()}`, rejectBody)
  const rejRoles = await roles(adminRejected)
  check('admin menolak → 200 dan status pengajuan akun itu "rejected"', rej.status === 200 && rejRoles.body?.publisherRequest?.status === 'rejected', `${rej.status} ${rej.text.slice(0, 100)} / ${JSON.stringify(rejRoles.body?.publisherRequest)}`)
  const mismatch = await adminCall('/admin/members', adminAcct, `lencana-admin grant member=${adminApplicant.address.toLowerCase()} hire=0 appoint=0 author=0 publish=0 nonce=${nonce()}`, { member: adminApplicant.address, action: 'grant', hire: true })
  check('pesan hibah tidak sama dengan wewenang yang dikirim (hire=1 dikirim, pesan hire=0) → 400', mismatch.status === 400, mismatch.text.slice(0, 160))
  const grant = await adminCall('/admin/members', adminAcct, `lencana-admin grant member=${adminApplicant.address.toLowerCase()} hire=1 appoint=0 author=0 publish=0 nonce=${nonce()}`, { member: adminApplicant.address, action: 'grant', hire: true })
  const rolesAfter = await roles(adminApplicant)
  check('admin menyetujui → 200; akun itu kini anggota penerbit dengan wewenang sewa saja, pengajuan tertutup', grant.status === 200 && rolesAfter.body?.roles?.publisher?.via === 'member' && rolesAfter.body?.roles?.publisher?.canHire === true && rolesAfter.body?.roles?.publisher?.canAppoint === false && rolesAfter.body?.publisherRequest === null,
    `${grant.status} ${grant.text.slice(0, 100)} / ${JSON.stringify(rolesAfter.body?.roles?.publisher)}`)
  const members = await adminCall('/admin/overview', adminAcct, overviewMsg())
  check('daftar anggota di overview admin memuat anggota baru; pengajuan tidak lagi menunggu', (members.body?.members ?? []).some((m) => same(m.member, adminApplicant.address) && m.canHire === true) && !(members.body?.requests ?? []).some((r) => same(r.address, adminApplicant.address)), members.text.slice(0, 200))
  const revoke = await adminCall('/admin/members', adminAcct, `lencana-admin revoke member=${adminApplicant.address.toLowerCase()} nonce=${nonce()}`, { member: adminApplicant.address, action: 'revoke' })
  const rolesRevoked = await roles(adminApplicant)
  check('admin mencabut → 200; akun itu bukan anggota lagi', revoke.status === 200 && !rolesRevoked.body?.roles?.publisher, `${revoke.status} ${revoke.text.slice(0, 100)} / ${JSON.stringify(rolesRevoked.body?.roles?.publisher)}`)
  const badAction = await adminCall('/admin/members', adminAcct, `lencana-admin delete member=${adminApplicant.address.toLowerCase()} nonce=${nonce()}`, { member: adminApplicant.address, action: 'delete' })
  check('tindakan di luar grant/reject/revoke → 400', badAction.status === 400, badAction.text.slice(0, 120))
  const adminRoles = await roles(adminAcct)
  const strangerRoles = await roles(stranger)
  check('/me/roles: admin ditandai untuk alamat admin, tidak untuk akun lain', adminRoles.body?.admin === true && strangerRoles.body?.admin === false, `${adminRoles.body?.admin} / ${strangerRoles.body?.admin}`)
  const hz = await call('/healthz')
  check('/healthz melaporkan jumlah admin (1), bukan alamatnya', hz.body?.admins === 1 && !hz.text.toLowerCase().includes(adminAcct.address.toLowerCase().slice(2)), `${hz.body?.admins}`)
  // D77: akun admin hanya admin — tidak punya kursi peserta, penerbit, maupun Agent Owner.
  check('akun admin: peran efektif "admin" (via admin), tanpa kursi penerbit / Agent Owner / peserta', adminRoles.body?.account?.role === 'admin' && adminRoles.body?.account?.via === 'admin' && adminRoles.body?.roles?.publisher === null && adminRoles.body?.roles?.agentOwner === null && adminRoles.body?.roles?.learner === false, JSON.stringify({ account: adminRoles.body?.account, roles: adminRoles.body?.roles }))
  const adminPub = await overview(adminAcct)
  check('akun admin membuka dasbor penerbit → 403 (bukan pemegang kursi Penerbit)', adminPub.status === 403, adminPub.text.slice(0, 140))
  const adminLearn = await call('/progress', { learner: adminAcct.address })
  check('akun admin memakai rute peserta → 403 "Lencana admin account"', adminLearn.status === 403 && /Lencana admin account/.test(adminLearn.body?.error ?? ''), adminLearn.text.slice(0, 160))
  const adminOwn = await call('/owner/overview', { learner: adminAcct.address, ...await signed(adminAcct, `lencana-owner nonce=${nonce()}`) })
  check('akun admin membuka dasbor Agent Owner → 403 "Lencana admin account"', adminOwn.status === 403 && /Lencana admin account/.test(adminOwn.body?.error ?? ''), adminOwn.text.slice(0, 160))
  const adminChoose = await call('/me/role', { learner: adminAcct.address, role: 'learner', ...await signed(adminAcct, `lencana-role role=learner nonce=${nonce()}`) })
  check('akun admin memilih peran peserta → 409 (sudah berperan admin)', adminChoose.status === 409, adminChoose.text.slice(0, 160))
  const grantAdmin = await decide('grant', adminAcct.address, { hire: true })
  const adminAfter = await roles(adminAcct)
  check('kunci penerbit menghibahkan keanggotaan ke akun admin → ditolak, tetap tanpa kursi penerbit', grantAdmin.status >= 400 && adminAfter.body?.roles?.publisher === null, `${grantAdmin.status} ${grantAdmin.text.slice(0, 120)} / ${JSON.stringify(adminAfter.body?.roles?.publisher)}`)
  }
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
