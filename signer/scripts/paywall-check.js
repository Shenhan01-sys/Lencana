// Lencana-B125 status=SELESAI 2026-10-02 — harness bayar dulu baru masuk kelas: 402 + syarat x402 dari harga satu sumber, penolakan sebelum gas keluar (termasuk tanda tangan peserta sebelum settlement), enrollment lama tetap jalan, faucet terbatas; --live: koin uji, settlement + pembagian sungguhan, orders = paid, kelas terbuka, tanpa tagihan kedua. Buktikan ulang: npm run verify:paywall (dan --live). JANGAN dibalik/diulang tanpa membuka kembali baris B125 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:paywall` — B125, RF7 langkah B: kursus berbayar hanya bisa diikuti sesudah lunas.
 *
 * Dua lapis, dipisah bendera seperti `verify:attempts`:
 *   default : TANPA GAS. Konsistensi harga/token, bentuk 402, penolakan yang harus terjadi SEBELUM server menyiarkan apa
 *             pun, enrollment lama yang tetap jalan, dan penolakan faucet.
 *   --live  : MENULIS KE CHAIN 97. Koin uji dari faucet, pembayaran sungguhan (settlement + SettlementSplit) dengan
 *             tanda tangan peserta saja, baris order `paid`, kelas terbuka, dan enroll kedua tidak menagih lagi.
 *
 * Server sendiri, origin=test (baris uji dibersihkan `npm run cleanup`), paywall MENYALA — kebalikan dari harness lain
 * yang mematikannya karena mereka menguji penilaian, bukan pembayaran.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createPublicClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { buildClientPayment, encodePaymentHeader } from '../src/x402.js'
import { enroll as dbEnroll } from '../src/db.js'
import { MANIFESTS } from '../../web/src/manifest-keys.ts'
import { COURSE_PRICES, PAY_TOKEN_ADDRESS, FAUCET_AMOUNT, priceOf } from '../../web/src/pricing.ts'
import { LISTED_COURSES } from '../../web/src/courses/index.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')
await loadFileEnvReport('verify:paywall')
// Baris yang dibuat harness ini langsung di DB (enrollment lama, bagian D) harus ikut dibersihkan `npm run cleanup`.
process.env.LANCENA_ORIGIN = 'test'
const env = process.env
for (const k of ['SUPABASE_URL', 'DEMO_TOKEN_ADDRESS', 'SPLIT_ADDRESS', 'ISSUER_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
if (LIVE && !env.DEPLOYER_PRIVATE_KEY) { console.error('DEPLOYER_PRIVATE_KEY belum diisi — --live butuh kunci pembayar gas'); process.exit(2) }

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const nonce = () => randomBytes(10).toString('hex')
const CHAIN_ID = Number(env.CHAIN_ID ?? 97)
const RPC = env.RPC_URL
const TOKEN = env.DEMO_TOKEN_ADDRESS
const erc20 = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

const PORT = Number(env.PAYWALL_PROBE_PORT ?? await freePort(8977))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'on' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
const call = async (path, body, headers = {}) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text, headers: r.headers }
}
const enrollMsg = async (account, course) => {
  const message = `lencana-enroll ${course} nonce=${nonce()}`
  return { message, signature: await account.signMessage({ message }) }
}

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)

  const dasar = MANIFESTS[0].course
  const price = priceOf(dasar.id)

  console.log('\n— A. satu sumber harga dan token')
  check('/healthz melaporkan paywall menyala', up.body?.paywall === 'on', json(up.body?.paywall))
  check(`alamat token di web/src/pricing.ts = DEMO_TOKEN_ADDRESS server (${PAY_TOKEN_ADDRESS})`, PAY_TOKEN_ADDRESS.toLowerCase() === TOKEN.toLowerCase(), `${PAY_TOKEN_ADDRESS} vs ${TOKEN}`)
  check('setiap kursus di katalog punya harga', MANIFESTS.every((m) => COURSE_PRICES[m.course.id] !== undefined), json(Object.keys(COURSE_PRICES)))
  check('harga keputusan builder: Web3 Dasar 10, Web3 Lanjut 25 LDC-demo', COURSE_PRICES['web3-dasar-2026'] === 10_000_000n && COURSE_PRICES['web3-lanjut-2026'] === 25_000_000n, json(Object.fromEntries(Object.entries(COURSE_PRICES).map(([k, v]) => [k, String(v)]))))

  // B126: kelas uji untuk menguji bayar dengan akun sungguhan — berbayar (5), tapi tidak tampil di katalog publik.
  check('kelas uji B126: uji-bayar-2026 berharga 5 LDC-demo dan tidak tampil di katalog publik', COURSE_PRICES['uji-bayar-2026'] === 5_000_000n && MANIFESTS.some((m) => m.course.id === 'uji-bayar-2026') && !LISTED_COURSES.some((c) => c.id === 'uji-bayar-2026'), json(LISTED_COURSES.map((c) => c.id)))

  console.log('\n— B. peserta baru: 402 dengan syarat bayar, bukan enrollment')
  const fresh = privateKeyToAccount(generatePrivateKey())
  const p402 = await call('/enroll', { learner: fresh.address, course: dasar.id, ...(await enrollMsg(fresh, dasar.id)) })
  const acc = p402.body?.accepts?.[0] ?? {}
  check('POST /enroll tanpa X-PAYMENT → 402', p402.status === 402, p402.text.slice(0, 160))
  check('402 menyebut harga kursus dari satu sumber', p402.body?.price?.amount === String(price), json(p402.body?.price))
  check('accepts: skema exact di jaringan 97', acc.scheme === 'exact' && acc.network === `eip155:${CHAIN_ID}`, json({ scheme: acc.scheme, network: acc.network }))
  check('accepts: asset = LDC-demo, payTo = kontrak pembagian, jumlah = harga', String(acc.asset).toLowerCase() === TOKEN.toLowerCase() && String(acc.payTo).toLowerCase() === env.SPLIT_ADDRESS.toLowerCase() && acc.maxAmountRequired === String(price), json(acc))
  check('www-authenticate ikut dikirim', Boolean(p402.headers.get('www-authenticate')))
  const r0m = `lencana-records nonce=${nonce()}`
  const rec0 = await call('/me/records', { learner: fresh.address, message: r0m, signature: await fresh.signMessage({ message: r0m }) })
  check('402 tidak membuat enrollment diam-diam: rekaman peserta itu nol kursus', rec0.status === 200 && (rec0.body?.courses ?? []).length === 0, rec0.text.slice(0, 120))

  console.log('\n— C. penolakan SEBELUM ada gas keluar')
  const now = Math.floor(Date.now() / 1000)
  const fakePayload = (over = {}) => ({
    token: TOKEN, amount: String(price), payer: fresh.address, nonce: Date.now(), deadline: now + 600, validAfter: now - 5,
    payTo: env.SPLIT_ADDRESS, resource: acc.resource, eip2612: `0x${'11'.repeat(65)}`, witnessSig: `0x${'22'.repeat(65)}`, ...over,
  })
  const header = (payload) => ({ 'x-payment': encodePaymentHeader({ x402Version: 1, scheme: 'exact', network: `eip155:${CHAIN_ID}`, payload }) })
  const tryPay = async (payload, signer = fresh) => call('/enroll', { learner: fresh.address, course: dasar.id, ...(await enrollMsg(signer, dasar.id)) }, header(payload))
  const garbage = await call('/enroll', { learner: fresh.address, course: dasar.id, ...(await enrollMsg(fresh, dasar.id)) }, { 'x-payment': 'bukan-base64-json' })
  check('X-PAYMENT rusak → 402', garbage.status === 402 && /base64/.test(garbage.body?.error ?? ''), garbage.text.slice(0, 140))
  const wrongToken = await tryPay(fakePayload({ token: '0x000000000000000000000000000000000000dEaD' }))
  check('token lain → 402', wrongToken.status === 402 && /token/.test(wrongToken.body?.error ?? ''), wrongToken.text.slice(0, 140))
  const wrongTo = await tryPay(fakePayload({ payTo: fresh.address }))
  check('pembayaran tidak ke kontrak pembagian → 402', wrongTo.status === 402 && /pembagian/.test(wrongTo.body?.error ?? ''), wrongTo.text.slice(0, 140))
  const cheap = await tryPay(fakePayload({ amount: String(price - 1n) }))
  check('jumlah di bawah harga → 402', cheap.status === 402 && /harga/.test(cheap.body?.error ?? ''), cheap.text.slice(0, 140))
  const otherPayer = privateKeyToAccount(generatePrivateKey())
  const payerMismatch = await tryPay(fakePayload({ payer: otherPayer.address }))
  check('pembayar bukan peserta yang mendaftar → 402', payerMismatch.status === 402 && /payer/.test(payerMismatch.body?.error ?? ''), payerMismatch.text.slice(0, 140))
  const forged = await tryPay(fakePayload(), otherPayer)
  check('pembayaran tampak sah tapi pesan enroll ditandatangani kunci lain → 401, settlement tidak dicoba', forged.status === 401, forged.text.slice(0, 140))

  console.log('\n— D. enrollment yang sudah ada sebelum harga berlaku tetap jalan')
  const old = privateKeyToAccount(generatePrivateKey())
  const pre = await dbEnroll({ learner: old.address, courseId: dasar.id, lessonsTotal: dasar.modules.reduce((n, mm) => n + mm.lessons.length, 0), ...(await enrollMsg(old, dasar.id)) })
  check('baris enrollment lama dibuat langsung di DB (keadaan sebelum B125)', pre.ok && pre.created, json(pre))
  const again = await call('/enroll', { learner: old.address, course: dasar.id, ...(await enrollMsg(old, dasar.id)) })
  check('POST /enroll peserta lama → 200 tanpa bayar, tanpa baris baru', again.status === 200 && again.body?.created === false, again.text.slice(0, 140))
  const lesson = MANIFESTS[0].course.modules.flatMap((x) => x.lessons).find((l) => l.quiz)
  const picks = lesson.quiz.questions.map((q) => ({ itemId: q.id, choice: q.answer }))
  const gm = `lencana-grade ${dasar.id} ${lesson.slug} nonce=${nonce()}`
  const g = await call('/grade', { learner: old.address, course: dasar.id, lesson: lesson.slug, picks, message: gm, signature: await old.signMessage({ message: gm }) })
  check('peserta lama tetap bisa mengerjakan kuis → 201', g.status === 201, g.text.slice(0, 140))
  const gfm = `lencana-grade ${dasar.id} ${lesson.slug} nonce=${nonce()}`
  const gFresh = await call('/grade', { learner: fresh.address, course: dasar.id, lesson: lesson.slug, picks, message: gfm, signature: await fresh.signMessage({ message: gfm }) })
  check('peserta yang belum membayar tidak bisa mengerjakan kuis', gFresh.status >= 400, gFresh.text.slice(0, 140))

  console.log('\n— E. faucet koin uji: penolakan tanpa gas')
  const fNoMsg = await call('/faucet', { learner: fresh.address })
  check('tanpa pesan → 400', fNoMsg.status === 400, fNoMsg.text.slice(0, 120))
  const fUnsigned = await call('/faucet', { learner: fresh.address, message: `lencana-faucet nonce=${nonce()}` })
  check('pesan tanpa tanda tangan → 401', fUnsigned.status === 401, fUnsigned.text.slice(0, 120))
  const purpose = `lencana-records nonce=${nonce()}`
  const fWrong = await call('/faucet', { learner: fresh.address, message: purpose, signature: await fresh.signMessage({ message: purpose }) })
  check('tanda tangan untuk keperluan lain → 400', fWrong.status === 400, fWrong.text.slice(0, 120))

  if (LIVE) {
    console.log('\n— F. LIVE: koin uji, bayar dengan tanda tangan saja, kelas terbuka')
    const pub = createPublicClient({ transport: http(RPC) })
    const payer = privateKeyToAccount(generatePrivateKey())
    const fm = `lencana-faucet nonce=${nonce()}`
    const f1 = await call('/faucet', { learner: payer.address, message: fm, signature: await payer.signMessage({ message: fm }) })
    check(`faucet → 200, ${String(FAUCET_AMOUNT)} satuan terkirim (tx ${f1.body?.tx?.slice(0, 12)}…)`, f1.status === 200 && f1.body?.sent === String(FAUCET_AMOUNT) && BigInt(f1.body?.balance ?? 0) >= FAUCET_AMOUNT, f1.text.slice(0, 200))
    const fm2 = `lencana-faucet nonce=${nonce()}`
    const f2 = await call('/faucet', { learner: payer.address, message: fm2, signature: await payer.signMessage({ message: fm2 }) })
    check('faucet kedua dalam jendela yang sama → 429', f2.status === 429, f2.text.slice(0, 140))
    const before = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [payer.address] })
    const r402 = await call('/enroll', { learner: payer.address, course: dasar.id, ...(await enrollMsg(payer, dasar.id)) })
    const req = r402.body?.accepts?.[0]
    const t = Math.floor(Date.now() / 1000)
    const deadline = t + Number(req?.maxTimeoutSeconds ?? 600)
    const pNonce = Date.now()
    const tokenNonce = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'nonces', args: [payer.address] })
    const { eip2612, witnessSig } = await buildClientPayment({ account: payer, token: TOKEN, chainId: CHAIN_ID, amount: price, payTo: req.payTo, nonce: pNonce, deadline, validAfter: t - 5, tokenNonce })
    const payload = { token: TOKEN, amount: String(price), payer: payer.address, nonce: pNonce, deadline, validAfter: t - 5, payTo: req.payTo, resource: req.resource, eip2612, witnessSig }
    const paid = await call('/enroll', { learner: payer.address, course: dasar.id, ...(await enrollMsg(payer, dasar.id)) }, header(payload))
    check('bayar + enroll → 200 dengan tx settlement dan tx pembagian', paid.status === 200 && /^0x[0-9a-f]{64}$/.test(paid.body?.paid?.settleTx ?? '') && /^0x[0-9a-f]{64}$/.test(paid.body?.paid?.splitTx ?? ''), paid.text.slice(0, 220))
    check('X-PAYMENT-RESPONSE ikut dikirim', Boolean(paid.headers.get('x-payment-response')))
    const after = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [payer.address] })
    check(`saldo peserta turun tepat sebesar harga (${String(before)} → ${String(after)})`, before - after === price, `${before} - ${after}`)
    const rm = `lencana-records nonce=${nonce()}`
    const recs = await call('/me/records', { learner: payer.address, message: rm, signature: await payer.signMessage({ message: rm }) })
    const order = recs.body?.courses?.[0]?.orders?.[0]
    check('rekaman peserta memuat order paid dengan tx settlement yang sama', order?.state === 'paid' && order?.tx === paid.body?.paid?.settleTx && order?.amount === String(price), json(order))
    const gm2 = `lencana-grade ${dasar.id} ${lesson.slug} nonce=${nonce()}`
    const g2 = await call('/grade', { learner: payer.address, course: dasar.id, lesson: lesson.slug, picks, message: gm2, signature: await payer.signMessage({ message: gm2 }) })
    check('sesudah lunas, kuis bisa dikerjakan → 201', g2.status === 201, g2.text.slice(0, 140))
    const twice = await call('/enroll', { learner: payer.address, course: dasar.id, ...(await enrollMsg(payer, dasar.id)) })
    const after2 = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [payer.address] })
    check('enroll kedua → 200 tanpa tagihan kedua (saldo tidak berubah)', twice.status === 200 && twice.body?.created === false && after2 === after, `${twice.status} ${after2}`)
  } else {
    console.log('\n— F. LIVE dilewati (jalankan dengan --live untuk koin uji + settlement sungguhan di chain 97)')
  }
} catch (e) {
  check('lapis HTTP selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
}

console.log(`\nPAYWALL ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal${LIVE ? ' (live)' : ''}`)
process.exit(failed === 0 ? 0 : 1)
