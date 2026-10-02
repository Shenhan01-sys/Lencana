// Lencana-B119 status=SELESAI 2026-10-01 — harness sewa agen per aktivitas: tangga harga, tabel harga dari tarif Agent Owner di registry, sewa oleh penerbit, penilaian bertanda tangan dompet agen dengan label pilihannya, tagihan, dan (--live) pembayaran x402 ke dompet agen. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B120 status=SELESAI 2026-10-01 — harness reviewer agen: agen ERC-8004 lain dengan Agent Owner lain, penunjukan dan pengesahan bertanda tangan, label, tagihan pengesahan. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B120 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:agents` — B119 (penerbit menyewa agen penilai per aktivitas) dan B120 (reviewer
 * sebagai penilai, boleh agen AI). Keputusan builder D53 + D54, 1 Okt.
 *
 *   npm run verify:agents          tanpa gas: server sendiri (origin=test), Postgres nyata, registry dibaca
 *   npm run verify:agents:live     + bayar dua tagihan lewat x402 ke dompet kedua agen (gas dibayar platform)
 *
 * Peran dan kunci (semua dari app/.env, tidak ada yang dicetak):
 *   penerbit        ISSUER_PRIVATE_KEY          menyewa, menunjuk reviewer, membayar sewa — tetap attester (D54)
 *   agen penilai    AGENT_GRADER_PRIVATE_KEY    dompet agen ERC-8004 #2534 (pemilik AGENT_OWNER)
 *   agen reviewer   AGENT_REVIEWER_PRIVATE_KEY  dompet agen ERC-8004 #2542 (pemilik REVIEWER_OWNER — beda)
 * Peserta uji dibuat acak per run dan barisnya ber-`origin=test` (dibersihkan `npm run cleanup`).
 * Hasil cetaknya dipecah per backlog: `B119 x/y` dan `B120 x/y`, lalu satu baris total.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, keccak256, toBytes } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { readAgent } from '../src/erc8004.js'
import { priceFor, rateCard, LADDER, LADDER_HASH, DIFFICULTY_LABELS } from '../src/pricing.js'
import { buildClientPayment, encodePaymentHeader } from '../src/x402.js'
import { attemptsFor, courseGates, agentHiresFor, reviewerAgentsFor } from '../src/db.js'
import { evidenceFromAttempts } from '../src/fromAttempts.js'
import { manifestOf } from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')
await loadFileEnvReport('verify:agents')
const env = process.env
for (const k of ['RPC_URL', 'ISSUER_PRIVATE_KEY', 'AGENT_GRADER_PRIVATE_KEY', 'AGENT_REVIEWER_PRIVATE_KEY', 'AGENT_OWNER_ADDRESS', 'REVIEWER_OWNER_ADDRESS', 'SUPABASE_URL', 'SPLIT_ADDRESS', 'DEMO_TOKEN_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
const GRADER_ID = '2534'
const REVIEWER_ID = '2542'
const COURSE = 'web3-dasar-2026'

const tally = { B119: [0, 0], B120: [0, 0] }
let section = 'B119'
const check = (name, ok, detail = '') => {
  tally[section][0] += 1
  if (ok) console.log(`  ok    [${section}] ${name}`)
  else { tally[section][1] += 1; console.log(`  GAGAL [${section}] ${name}${detail ? ` -> ${String(detail).slice(0, 220)}` : ''}`) }
}
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
const nonce = () => randomBytes(10).toString('hex')

const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const grader = privateKeyToAccount(env.AGENT_GRADER_PRIVATE_KEY)
const reviewer = privateKeyToAccount(env.AGENT_REVIEWER_PRIVATE_KEY)
const stranger = privateKeyToAccount(generatePrivateKey())
const learner = privateKeyToAccount(generatePrivateKey())
const manifest = manifestOf(COURSE)
const essayLesson = manifest.course.modules.flatMap((m) => m.lessons).find((l) => l.essay?.rubric?.length)
const rubric = essayLesson.essay.rubric

// --- server sendiri, baris uji bertanda origin=test ---------------------------------------------
// port dicari dengan uji bind, bukan dengan /healthz yang bisa lambat (src/ports.js, temuan B121)
const PORT = Number(env.AGENTS_PROBE_PORT ?? await freePort(8867))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
async function call (method, path, body, headers = {}) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const finish = () => {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  const [r1, f1] = tally.B119
  const [r2, f2] = tally.B120
  console.log(`\n  B119 ${r1 - f1}/${r1} · B120 ${r2 - f2}/${r2}`)
  console.log(`AGEN SEWA ${LIVE ? 'LIVE ' : ''}${f1 + f2 === 0 ? 'HIJAU' : 'MERAH'} — ${r1 + r2} pemeriksaan, ${f1 + f2} gagal`)
  setTimeout(() => process.exit(f1 + f2 === 0 ? 0 : 1), 300)
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  // ===================================================================== B119
  section = 'B119'
  // satuan murni: tangga harga
  const card = rateCard(2000n)
  check('tangga harga: tujuh label, +5% per tingkat dari tarif dasar (2000 -> 2000..2600)',
    card.length === 7 && card.map((c) => c.amount).join(',') === '2000,2100,2200,2300,2400,2500,2600', json(card))
  check('label "sangat berat" = 1,30 x "sangat ringan" — selisih maksimum dibatasi', priceFor(1500n, 'sangat-berat') * 100n === 1500n * 130n)
  let threw = false
  try { priceFor(2000n, 'super-berat') } catch { threw = true }
  check('label di luar tujuh label ditolak', threw)
  check('LADDER_HASH = keccak256 dari dokumen tangga yang sama', LADDER_HASH === keccak256(toBytes(JSON.stringify(LADDER))))

  // tabel harga dari tarif Agent Owner di registry
  const g = await readAgent(client, { chainId, agentId: GRADER_ID })
  const rRates = await call('GET', `/agents/${GRADER_ID}/rates`)
  check(`GET /agents/${GRADER_ID}/rates -> tarif dasar = metadata lencana.baseTariff di registry (${g.tariff?.amount})`,
    rRates.status === 200 && rRates.body?.baseTariff === String(g.tariff?.amount) && rRates.body?.wallet === getAddress(env.AGENT_GRADER_ADDRESS ?? grader.address), rRates.text.slice(0, 160))
  check('tabel harga = tangga Lencana atas tarif itu, dengan ladderHash',
    json(rRates.body?.rateCard) === json(rateCard(g.tariff.amount)) && rRates.body?.ladderHash === LADDER_HASH)
  const rUnknown = await call('GET', '/agents/999999999/rates')
  check('agen yang tidak ada -> 404', rUnknown.status === 404, rUnknown.text.slice(0, 120))

  // sewa oleh penerbit
  const hireMsg = (id) => `lencana-agent-hire course=${COURSE} agent=${id} nonce=${nonce()}`
  // Pesan dibuat SEKALI lalu ditandatangani. Versi pertama memanggil hireMsg() dua kali — dua nonce
  // acak, jadi yang ditandatangani bukan yang dikirim, dan penerbit sah ditolak 401. Itu bug harness.
  const hireBy = async (acct, id, msg) => {
    const m = msg ?? hireMsg(id)
    return call('POST', '/agents/hire', { course: COURSE, agentId: id, publisher: acct.address, message: m, signature: await acct.signMessage({ message: m }) })
  }
  const hStranger = await hireBy(stranger, GRADER_ID)
  check('sewa oleh alamat selain penerbit -> 401', hStranger.status === 401, hStranger.text.slice(0, 120))
  const unbound = `lencana-agent-hire course=${COURSE} nonce=${nonce()}`
  const hUnbound = await call('POST', '/agents/hire', { course: COURSE, agentId: GRADER_ID, publisher: publisher.address, message: unbound, signature: await publisher.signMessage({ message: unbound }) })
  check('pesan sewa yang tidak menyebut agent= -> 401', hUnbound.status === 401 && /must state/.test(hUnbound.body?.error ?? ''), hUnbound.text.slice(0, 120))
  const hOk = await hireBy(publisher, GRADER_ID)
  check(`penerbit menyewa agen penilai #${GRADER_ID} untuk ${COURSE} -> 200, dompet & pemilik dibaca dari registry`,
    hOk.status === 200 && hOk.body?.wallet === grader.address && hOk.body?.owner === getAddress(env.AGENT_OWNER_ADDRESS), hOk.text.slice(0, 200))

  // satu esai peserta uji
  const sign = async (m) => ({ message: m, signature: await learner.signMessage({ message: m }) })
  await call('POST', '/enroll', { learner: learner.address, course: COURSE, ...await sign(`lencana-enroll ${COURSE} nonce=${nonce()}`) })
  const essayText = 'Karangan uji agen sewaan. Alamat 0x1234abcd5678ef90 dan fungsi attestationOf lewat https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/ ; sisanya tidak bisa saya simpulkan dari data publik. '
    + Array.from({ length: 430 }, (_, i) => `kata${i}`).join(' ')
  const sub = await call('POST', '/essay', { learner: learner.address, course: COURSE, lesson: essayLesson.slug, text: essayText, ...await sign(`lencana-essay ${essayLesson.slug} nonce=${nonce()}`) })
  const attemptId = Number(sub.body?.attemptId)
  check('peserta uji menyerahkan esai -> 201, menunggu penilaian', sub.status === 201 && Number.isInteger(attemptId), sub.text.slice(0, 160))
  const gatesBefore = await courseGates(learner.address, COURSE)

  const scoresAt = (p) => rubric.map((r) => ({ label: r.label, score: Math.round(Number(r.max) * p) }))
  const totalOf = (s) => s.reduce((n, x) => n + x.score, 0)
  const agentJudge = async (acct, agentId, { label = 'cukup-berat', scores = scoresAt(0.8), msg } = {}) => {
    const m = msg ?? `lencana-agent-judge attempt=${attemptId} final=${totalOf(scores)} label=${label} nonce=${nonce()}`
    return call('POST', '/essay/judgement', {
      agentId, course: COURSE, lesson: essayLesson.slug, attemptId, scores, judgeModel: 'harness:agent-80pct', judgeTemp: 0,
      message: m, signature: await acct.signMessage({ message: m }),
    })
  }
  const jStranger = await agentJudge(stranger, GRADER_ID)
  check('penilaian atas nama agen #2534 bertanda tangan kunci lain -> 401', jStranger.status === 401, jStranger.text.slice(0, 120))
  const jNotHired = await agentJudge(reviewer, REVIEWER_ID)
  check(`agen #${REVIEWER_ID} yang TIDAK disewa sebagai penilai kursus ini -> 403`, jNotHired.status === 403 && /not hired/.test(jNotHired.body?.error ?? ''), jNotHired.text.slice(0, 120))
  const noLabel = `lencana-agent-judge attempt=${attemptId} final=${totalOf(scoresAt(0.8))} nonce=${nonce()}`
  const jNoLabel = await agentJudge(grader, GRADER_ID, { msg: noLabel })
  check('penilaian agen tanpa label tingkat berat -> 401 (label wajib dipilih agen dan ditandatangani)', jNoLabel.status === 401 && /label=/.test(jNoLabel.body?.error ?? ''), jNoLabel.text.slice(0, 120))
  const jBadLabel = await agentJudge(grader, GRADER_ID, { label: 'super-berat' })
  check('label di luar tujuh label -> 401', jBadLabel.status === 401, jBadLabel.text.slice(0, 120))
  const wrongFinal = `lencana-agent-judge attempt=${attemptId} final=99 label=cukup-berat nonce=${nonce()}`
  const jWrongFinal = await agentJudge(grader, GRADER_ID, { msg: wrongFinal })
  check('pesan yang menyebut angka akhir berbeda dari kriteria yang dikirim -> 401', jWrongFinal.status === 401 && /must state/.test(jWrongFinal.body?.error ?? ''), jWrongFinal.text.slice(0, 120))
  const jOk = await agentJudge(grader, GRADER_ID)
  const wantGrade = priceFor(g.tariff.amount, 'cukup-berat')
  check(`agen penilai #${GRADER_ID} menilai -> 200, usulan ${totalOf(scoresAt(0.8))}, label cukup-berat, needsReview`,
    jOk.status === 200 && Number(jOk.body?.score) === totalOf(scoresAt(0.8)) && jOk.body?.label === 'cukup-berat' && jOk.body?.needsReview === true && jOk.body?.agentId === GRADER_ID, jOk.text.slice(0, 200))
  const gc = jOk.body?.charge
  check(`tagihan aktivitas menilai: ${wantGrade} = tarif ${g.tariff.amount} x 1,20 (cukup-berat), status due, ke dompet agen`,
    gc && BigInt(gc.amount) === wantGrade && gc.status === 'due' && gc.activity === 'grade' && getAddress(gc.agent_wallet) === grader.address && gc.ladder_hash === LADDER_HASH, json(gc))
  const gatesProposed = await courseGates(learner.address, COURSE)
  check('angka agen belum dihitung gerbang (usulan model, menunggu pengesahan — B104)', Number(gatesProposed?.graded_attempts) === Number(gatesBefore?.graded_attempts),
    json({ sebelum: gatesBefore?.graded_attempts, sesudah: gatesProposed?.graded_attempts }))
  const rowAfter = (await attemptsFor(learner.address, COURSE)).find((r) => Number(r.id) === attemptId)
  check('baris usaha mencatat agen pengusul (graded_by_agent) dan label pilihannya',
    rowAfter?.judge_model === 'harness:agent-80pct' && String(rowAfter?.graded_by_agent) === GRADER_ID && rowAfter?.difficulty_label === 'cukup-berat',
    json(rowAfter && { judge: rowAfter.judge_model, agent: rowAfter.graded_by_agent, label: rowAfter.difficulty_label }))
  const getCharge = await call('GET', `/agent-charges/${gc?.id}`)
  check('GET /agent-charges/<id> menyajikan tagihan yang sama', getCharge.status === 200 && String(getCharge.body?.amount) === String(gc?.amount), getCharge.text.slice(0, 120))
  const unpaid = await call('POST', `/agent-charges/${gc?.id}/pay`, {})
  const acc = unpaid.body?.accepts?.[0]
  check('POST /agent-charges/<id>/pay tanpa X-PAYMENT -> 402 + syarat (jumlah tagihan, token, kontrak pembagian)',
    unpaid.status === 402 && String(acc?.maxAmountRequired) === String(gc?.amount) && same(acc?.asset, gc?.token) && same(acc?.payTo, env.SPLIT_ADDRESS),
    json({ max: acc?.maxAmountRequired, amount: gc?.amount, asset: acc?.asset, payTo: acc?.payTo }))

  // ===================================================================== B120
  section = 'B120'
  const r = await readAgent(client, { chainId, agentId: REVIEWER_ID })
  check(`agen reviewer #${REVIEWER_ID} = identitas lain, Agent Owner lain dari agen penilai #${GRADER_ID}`,
    r.ok && r.owner === getAddress(env.REVIEWER_OWNER_ADDRESS) && r.owner !== g.owner && r.wallet === reviewer.address && r.wallet !== g.wallet, json({ owner: r.owner, wallet: r.wallet }))
  const appoint = async (agentId, who, msgOverride) => {
    const m = msgOverride ?? `lencana-review-role course=${COURSE} reviewer=${who.toLowerCase()} agent=${agentId} nonce=${nonce()}`
    return call('POST', '/essay/reviewers', { issuer: publisher.address, course: COURSE, reviewer: who, agentId, message: m, signature: await publisher.signMessage({ message: m }) })
  }
  const aGrader = await appoint(GRADER_ID, grader.address)
  check('menunjuk agen PENILAI kursus ini sebagai reviewernya -> 422', aGrader.status === 422 && /hired as a grader/.test(aGrader.body?.error ?? ''), aGrader.text.slice(0, 140))
  const aWrongWallet = await appoint(REVIEWER_ID, stranger.address)
  check('reviewer agen dengan alamat yang bukan agentWallet-nya -> 422', aWrongWallet.status === 422 && /not the agentWallet/.test(aWrongWallet.body?.error ?? ''), aWrongWallet.text.slice(0, 140))
  const aUnbound = await appoint(REVIEWER_ID, reviewer.address, `lencana-review-role course=${COURSE} reviewer=${reviewer.address.toLowerCase()} nonce=${nonce()}`)
  check('pesan penunjukan yang tidak menyebut agent= -> 401/422', [401, 422].includes(aUnbound.status) && /must state/.test(aUnbound.body?.error ?? ''), aUnbound.text.slice(0, 140))
  const aOk = await appoint(REVIEWER_ID, reviewer.address)
  check(`penerbit menunjuk agen reviewer #${REVIEWER_ID} -> 200, pemiliknya tercatat`, aOk.status === 200 && aOk.body?.agentId === REVIEWER_ID && aOk.body?.agentOwner === r.owner, aOk.text.slice(0, 160))
  // Arah sebaliknya: reviewer yang sudah ditunjuk tidak bisa disewa sebagai penilai kursus yang sama.
  // Ditambahkan sesudah run pertama meninggalkan #2534 sebagai reviewer DAN penilai (lihat T37).
  const hReviewer = await hireBy(publisher, REVIEWER_ID)
  check(`menyewa agen REVIEWER kursus ini (#${REVIEWER_ID}) sebagai penilainya -> 422`, hReviewer.status === 422 && /appointed as a reviewer/.test(hReviewer.body?.error ?? ''), hReviewer.text.slice(0, 140))
  const hiredIds = new Set((await agentHiresFor(COURSE)).map((h) => String(h.agent_id)))
  const hiredOwners = new Set((await agentHiresFor(COURSE)).map((h) => String(h.agent_owner).toLowerCase()))
  const both = (await reviewerAgentsFor(COURSE)).filter((v) => hiredIds.has(String(v.agent_id)) || hiredOwners.has(String(v.agent_owner).toLowerCase()))
  check(`keadaan tersimpan: tidak ada agen (atau Agent Owner) yang sekaligus penilai sewaan dan reviewer di ${COURSE}`, both.length === 0, json(both))

  const review = async ({ label = 'sedang', decision = 'adjusted', scores = scoresAt(0.9), msg } = {}) => {
    const m = msg ?? `lencana-essay-review attempt=${attemptId} decision=${decision} final=${totalOf(scores)} label=${label} nonce=${nonce()}`
    return call('POST', '/essay/review', { reviewer: reviewer.address, course: COURSE, lesson: essayLesson.slug, attemptId, decision, scores, message: m, signature: await reviewer.signMessage({ message: m }) })
  }
  const rvNoLabel = await review({ msg: `lencana-essay-review attempt=${attemptId} decision=adjusted final=${totalOf(scoresAt(0.9))} nonce=${nonce()}` })
  check('pengesahan oleh reviewer agen tanpa label -> 401', rvNoLabel.status === 401 && /label=/.test(rvNoLabel.body?.error ?? ''), rvNoLabel.text.slice(0, 140))
  const rvOk = await review()
  const wantReview = priceFor(r.tariff.amount, 'sedang')
  check(`reviewer agen #${REVIEWER_ID} menyesuaikan ${totalOf(scoresAt(0.8))} -> ${totalOf(scoresAt(0.9))}, label sedang -> 200`,
    rvOk.status === 200 && Number(rvOk.body?.finalScore) === totalOf(scoresAt(0.9)) && rvOk.body?.reviewerAgentId === REVIEWER_ID && rvOk.body?.label === 'sedang', rvOk.text.slice(0, 200))
  const rc = rvOk.body?.charge
  check(`tagihan aktivitas mengesahkan: ${wantReview} = tarif ${r.tariff.amount} x 1,15 (sedang), ke dompet agen reviewer`,
    rc && BigInt(rc.amount) === wantReview && rc.activity === 'review' && getAddress(rc.agent_wallet) === reviewer.address && rc.status === 'due', json(rc))
  const gatesReviewed = await courseGates(learner.address, COURSE)
  check('sesudah disahkan reviewer agen, usaha itu dihitung gerbang', Number(gatesReviewed?.graded_attempts) === Number(gatesBefore?.graded_attempts) + 1,
    json({ sebelum: gatesBefore?.graded_attempts, sesudah: gatesReviewed?.graded_attempts }))
  const rows = (await attemptsFor(learner.address, COURSE)).filter((x) => Number(x.id) === attemptId)
  const ev = evidenceFromAttempts({ course: { modules: [{ lessons: [{ slug: essayLesson.slug, kind: 'esai', essay: {} }] }] } }, rows)
  check('baris nyata: angka yang diturunkan = angka reviewer agen, dan provenannya menyebut pengesahan adjusted',
    ev.ok && ev.evidence.essayScore === totalOf(scoresAt(0.9)) && ev.reviews?.[0]?.decision === 'adjusted' && ev.reviews?.[0]?.reviewer === reviewer.address, json(ev.evidence ?? ev.why))

  // ===================================================================== --live: bayar dua tagihan
  if (LIVE) {
    section = 'B119'
    const SPLIT = env.SPLIT_ADDRESS
    const TOKEN = getAddress(env.DEMO_TOKEN_ADDRESS)
    const erc = parseAbi(['function balanceOf(address) view returns (uint256)', 'function nonces(address) view returns (uint256)', 'function mint(address to, uint256 amount)'])
    const splitAbi = parseAbi(['function platformBps() view returns (uint16)'])
    const bps = BigInt(await client.readContract({ address: SPLIT, abi: splitAbi, functionName: 'platformBps' }))
    const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
    const bal = (a) => client.readContract({ address: TOKEN, abi: erc, functionName: 'balanceOf', args: [a] })
    const need = BigInt(gc.amount) + BigInt(rc.amount)
    if (await bal(publisher.address) < need) {
      const platform = createWalletClient({ account: privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY), chain, transport: http(env.RPC_URL) })
      const tx = await platform.writeContract({ address: TOKEN, abi: erc, functionName: 'mint', args: [publisher.address, need * 2n] })
      await client.waitForTransactionReceipt({ hash: tx })
      console.log(`  info  token demo untuk penerbit: mint ${need * 2n} (tx ${tx})`)
    }
    const pay = async (charge, payTo = SPLIT) => {
      const req = (await call('POST', `/agent-charges/${charge.id}/pay`, {})).body?.accepts?.[0]
      const deadline = Math.floor(Date.now() / 1000) + Number(req?.maxTimeoutSeconds ?? 600)
      const n = Date.now() + Math.floor(Math.random() * 1000)
      const tokenNonce = await client.readContract({ address: TOKEN, abi: erc, functionName: 'nonces', args: [publisher.address] })
      const sigs = await buildClientPayment({ account: publisher, token: TOKEN, chainId, amount: BigInt(charge.amount), payTo, nonce: n, deadline, validAfter: 0, tokenNonce })
      const header = encodePaymentHeader({ x402Version: 1, scheme: 'exact', network: `eip155:${chainId}`,
        payload: { token: TOKEN, amount: String(charge.amount), payTo, payer: publisher.address, nonce: n, deadline, validAfter: 0, ...sigs } })
      return call('POST', `/agent-charges/${charge.id}/pay`, {}, { 'x-payment': header })
    }
    const share = (amount) => BigInt(amount) - (BigInt(amount) * bps) / 10000n
    for (const [label, charge, wallet] of [['menilai', gc, grader.address], ['mengesahkan', rc, reviewer.address]]) {
      section = label === 'menilai' ? 'B119' : 'B120'
      const before = await bal(wallet)
      const paid = await pay(charge)
      console.log(`  info  bayar tagihan ${label} #${charge.id}: ${paid.body?.settleTx ?? '-'} · split ${paid.body?.splitTx ?? '-'}`)
      check(`penerbit membayar tagihan ${label} lewat x402 -> 200, status paid dengan struk settlement`,
        paid.status === 200 && paid.body?.charge?.status === 'paid' && /^0x[0-9a-f]{64}$/.test(paid.body?.settleTx ?? ''), paid.text.slice(0, 200))
      const after = await bal(wallet)
      check(`dompet agen ${label} bertambah tepat bagiannya (${share(charge.amount)} = tagihan - bagian platform ${bps} bps), dibaca dari chain`,
        after - before === share(charge.amount), `${before} -> ${after}`)
      const again = await pay(charge)
      check(`tagihan ${label} yang sudah lunas tidak bisa dibayar dua kali -> 409`, again.status === 409, again.text.slice(0, 120))
    }
  }
  finish()
} catch (err) {
  check('run selesai tanpa pengecualian', false, err?.shortMessage ?? err?.message ?? String(err))
  finish()
}

function same (a, b) { return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase() }
