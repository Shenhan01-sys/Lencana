// Lencana-B121 status=TERBUKA 2026-10-01 — harness slot praktik: /attempts menolak skor kuis/esai/praktik peserta, POST /praktik membaca ulang chain 97 untuk empat jenis bukti, kunci bukti sekali pakai, dan bukti itu mengisi slot praktik di fromAttempts; yang belum: halaman belajar memanggil POST /praktik (fase FE). Buktikan ulang: npm run verify:praktik. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:praktik` — B121: slot praktik dinilai dari chain, bukan dari laporan peserta.
 *
 *   npm run verify:praktik          tanpa gas: server sendiri (origin=test), Postgres nyata, chain 97 dibaca
 *   npm run verify:praktik:live     + satu transfer 0,001 tBNB baru dari dompet latihan, lalu diperiksa
 *
 * Peran dan kunci (dari app/.env, tidak ada yang dicetak):
 *   peserta          kunci acak per run (identitas belajar, tanpa saldo)
 *   dompet latihan   DEPLOYER_PRIVATE_KEY — satu-satunya kunci kita yang pasti punya tBNB; di sini ia
 *                    berperan sebagai "dompet sekali-pakai" peserta. Pengikatnya tetap diuji: dompet
 *                    menandatangani pesan yang menyebut alamat peserta.
 *   dompet kosong    kunci acak per run — dipakai bukti allowance (saldo dan izin nol tetap bukti sah)
 *
 * Transaksi untuk bukti `tx-receipt` di mode tanpa gas: KNOWN_TX di bawah — transfer 0,001 tBNB
 * yang dikirim `--live` pada 1 Okt dan tetap ada di chain. Kunci bukti yang sudah dipegang peserta
 * uji dari run sebelumnya dilepas dulu (`freeTestProofKey`); kunci yang dipegang peserta sungguhan
 * tidak disentuh dan membuat harness merah.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, encodeFunctionData, formatEther } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { walletBindingMessage } from '../src/praktik.js'
import { attemptsFor, courseGates, praktikProofsFor, freeTestProofKey } from '../src/db.js'
import { evidenceFromAttempts } from '../src/fromAttempts.js'
import { manifestOf } from '../../web/src/manifest-keys.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')
await loadFileEnvReport('verify:praktik')
const env = process.env
for (const k of ['RPC_URL', 'SUPABASE_URL', 'DEPLOYER_PRIVATE_KEY', 'DEMO_TOKEN_ADDRESS', 'SPLIT_ADDRESS']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
// Transfer 0,001 tBNB dari dompet latihan, dikirim `npm run verify:praktik:live` 1 Okt (T38).
const KNOWN_TX = env.PRAKTIK_TX ?? '0xea4617d3c258cf5b13063fba1e878daab3b25c505625cc794006f38f19414845'
const DASAR = 'web3-dasar-2026'
const LANJUT = 'web3-lanjut-2026'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
const nonce = () => randomBytes(10).toString('hex')

const client = createPublicClient({ transport: http(env.RPC_URL) })
const chainId = await client.getChainId()
const wallet = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
const emptyWallet = privateKeyToAccount(generatePrivateKey())
const stranger = privateKeyToAccount(generatePrivateKey())
const learner = privateKeyToAccount(generatePrivateKey())
const learner2 = privateKeyToAccount(generatePrivateKey())
const lessonOf = (course, slug) => manifestOf(course).course.modules.flatMap((m) => m.lessons).find((l) => l.slug === slug)

// --- server sendiri, baris uji bertanda origin=test -----------------------------------------------
// port dicari dengan uji bind, bukan dengan /healthz yang bisa lambat (src/ports.js)
const PORT = Number(env.PRAKTIK_PROBE_PORT ?? await freePort(8887))
const BASE = `http://127.0.0.1:${PORT}`
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER, env: { ...env, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE, LANCENA_ORIGIN: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
async function call (method, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000) })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: r.status, body: parsed, text }
}
const finish = () => {
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  console.log(`\nPRAKTIK ${LIVE ? 'LIVE ' : ''}${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
  setTimeout(() => process.exit(failed === 0 ? 0 : 1), 300)
}

const enroll = async (acct, course) => {
  const m = `lencana-enroll ${course} nonce=${nonce()}`
  return call('POST', '/enroll', { learner: acct.address, course, message: m, signature: await acct.signMessage({ message: m }) })
}
const submit = async (acct, course, lesson, answers, { walletSig, msg } = {}) => {
  const m = msg ?? `lencana-praktik-submit course=${course} lesson=${lesson} nonce=${nonce()}`
  return call('POST', '/praktik', { learner: acct.address, course, lesson, answers, walletSignature: walletSig, message: m, signature: await acct.signMessage({ message: m }) })
}
const bind = (signerAcct, { course, lesson, learnerAddr, walletAddr, txHash }) =>
  signerAcct.signMessage({ message: walletBindingMessage({ courseId: course, lessonSlug: lesson, learner: learnerAddr, wallet: walletAddr, txHash }) })
const mentions = (text, secret) => String(text).toLowerCase().includes(String(secret).toLowerCase().replace(/^0x0*/, ''))

try {
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)
  check(`server membaca chain ${chainId} (lesson praktik menuntut chain 97)`, chainId === 97)

  // ===================================================================== A. jalur lama ditutup
  console.log('\n— A. POST /attempts tidak lagi menerima skor slot rubrik dari peserta')
  await enroll(learner, DASAR)
  const old = async (kind, lesson) => {
    const m = `lencana-attempt ${DASAR} ${lesson} nonce=${nonce()}`
    return call('POST', '/attempts', {
      learner: learner.address, course: DASAR, lesson, kind, attempt: 1, score: 100, verdict: 'pass',
      components: [{ itemId: 'self', score: 100, weight: 1, gradedBy: 'mechanical' }], message: m, signature: await learner.signMessage({ message: m }),
    })
  }
  for (const [kind, lesson, route] of [['praktik', 'praktik-eth-call', 'POST /praktik'], ['kuis', 'kuis-token', 'POST /grade'], ['esai', 'esai-audit', 'POST /essay']]) {
    const r = await old(kind, lesson)
    check(`/attempts kind=${kind} skor 100 kiriman peserta -> 400 dan menunjuk ${route}`, r.status === 400 && r.body?.error?.includes(route), `${r.status} ${r.text.slice(0, 140)}`)
  }
  const ujian = await old('ujian', '-')
  check('/attempts kind=ujian (tidak punya slot rubrik) tetap tercatat -> 201', ujian.status === 201, `${ujian.status} ${ujian.text.slice(0, 120)}`)
  const rowsAfterOld = await attemptsFor(learner.address, DASAR)
  check('tidak satu pun baris kuis/esai/praktik lahir dari empat kiriman itu', rowsAfterOld.every((r) => r.kind === 'ujian'), json(rowsAfterOld.map((r) => r.kind)))

  // ===================================================================== B. pagar rute /praktik
  console.log('\n— B. pagar POST /praktik')
  const withScore = await call('POST', '/praktik', { learner: learner.address, course: DASAR, lesson: 'praktik-eth-call', score: 100, answers: {} })
  check('/praktik yang membawa score -> 400 (angka milik server)', withScore.status === 400 && /score/.test(withScore.body?.error ?? ''), withScore.text.slice(0, 120))
  const notPraktik = await submit(learner, DASAR, 'kuis-token', { results: {} })
  check('lesson yang bukan praktik -> 400', notPraktik.status === 400 && /not a practice lesson/.test(notPraktik.body?.error ?? ''), notPraktik.text.slice(0, 120))
  const unbound = await submit(learner, DASAR, 'praktik-eth-call', { results: {} }, { msg: `lencana-praktik-submit course=${DASAR} nonce=${nonce()}` })
  check('pesan peserta yang tidak menyebut lesson= -> 401', unbound.status === 401 && /lesson=/.test(unbound.body?.error ?? ''), unbound.text.slice(0, 120))
  const notEnrolled = await submit(stranger, DASAR, 'praktik-eth-call', { results: {} })
  check('peserta yang belum terdaftar -> 422 sebelum chain dibaca', notEnrolled.status === 422 && /not enrolled/.test(notEnrolled.body?.error ?? ''), notEnrolled.text.slice(0, 120))

  // ===================================================================== C. eth-call
  console.log('\n— C. bukti eth-call (Praktik 3, web3-dasar)')
  const spec = lessonOf(DASAR, 'praktik-eth-call').proof
  const results = {}
  for (const r of spec.reads) {
    const fn = r.signature.slice(0, r.signature.indexOf('('))
    const { data } = await client.call({ to: r.to, data: encodeFunctionData({ abi: parseAbi([`function ${r.signature}`]), functionName: fn, args: r.args }) })
    results[r.id] = data
  }
  const wrongStatus = await submit(learner, DASAR, 'praktik-eth-call', { results: { ...results, statusOf: `0x${'00'.repeat(32)}` } })
  check('satu keluaran salah -> 422 dan hanya NAMA pemeriksaannya yang disebut',
    wrongStatus.status === 422 && json(wrongStatus.body?.failed) === json(['eth-call:statusOf']), wrongStatus.text.slice(0, 160))
  check('jawaban 422 tidak membocorkan keluaran yang benar (server bukan kunci jawaban)', !mentions(wrongStatus.text, results.statusOf), wrongStatus.text.slice(0, 160))
  const okCall = await submit(learner, DASAR, 'praktik-eth-call', { results })
  check(`tiga keluaran mentah yang sama dengan bacaan chain -> 201, dinilai chain (${spec.reads.length} pemeriksaan)`,
    okCall.status === 201 && okCall.body?.gradedBy === 'chain' && okCall.body?.verdict === 'pass' && okCall.body?.checks?.length === spec.reads.length && okCall.body?.proofKey === null,
    okCall.text.slice(0, 200))
  const callRow = (await attemptsFor(learner.address, DASAR)).find((r) => Number(r.id) === Number(okCall.body?.attemptId))
  check('baris usaha: kind praktik, skor 100, tiap komponen graded_by chain',
    callRow?.kind === 'praktik' && Number(callRow?.score) === 100 && callRow?.attempt_components?.length === spec.reads.length && callRow.attempt_components.every((c) => c.graded_by === 'chain'),
    json(callRow && { kind: callRow.kind, score: callRow.score, comps: callRow.attempt_components }))
  const callProof = okCall.body?.attemptId ? (await praktikProofsFor(okCall.body.attemptId))[0] : null
  check('bukti tersimpan terikat ke usaha itu, berisi nilai yang DIBACA SERVER',
    callProof?.proof_type === 'eth-call' && spec.reads.every((r) => callProof.observed?.[r.id] === results[r.id]), json(callProof?.observed))

  // ===================================================================== D. balance
  console.log('\n— D. bukti saldo (Praktik 1, web3-dasar) — dompet latihan menandatangani pengikatnya')
  const balKey = `balance:${chainId}:${wallet.address.toLowerCase()}`
  const freedBal = await freeTestProofKey(balKey)
  check('kunci bukti saldo tidak dipegang peserta sungguhan (run uji sebelumnya dilepas dulu)', freedBal.heldBy.length === 0, json(freedBal))
  const balLesson = 'dompet-burner-dan-faucet'
  const sigBal = await bind(wallet, { course: DASAR, lesson: balLesson, learnerAddr: learner.address, walletAddr: wallet.address })
  const sigBalOther = await bind(stranger, { course: DASAR, lesson: balLesson, learnerAddr: learner.address, walletAddr: wallet.address })
  const readBal = async () => client.getBalance({ address: wallet.address })
  let bal = await readBal()
  const badSig = await submit(learner, DASAR, balLesson, { wallet: wallet.address, balanceWei: bal.toString(), balanceBnb: formatEther(bal) }, { walletSig: sigBalOther })
  check('pengikat dompet ditandatangani kunci lain -> 401', badSig.status === 401 && /walletSignature/.test(badSig.body?.error ?? ''), badSig.text.slice(0, 140))
  const wrongWei = await submit(learner, DASAR, balLesson, { wallet: wallet.address, balanceWei: (bal + 1n).toString(), balanceBnb: formatEther(bal) }, { walletSig: sigBal })
  check('saldo wei meleset 1 wei -> 422 [balance-wei]', wrongWei.status === 422 && json(wrongWei.body?.failed) === json(['balance-wei']), wrongWei.text.slice(0, 160))
  bal = await readBal()
  const okBal = await submit(learner, DASAR, balLesson, { wallet: wallet.address, balanceWei: bal.toString(), balanceBnb: formatEther(bal).replace('.', ',') }, { walletSig: sigBal })
  check('saldo wei + BNB (ditulis dengan koma) sama dengan chain -> 201, kunci bukti = dompet',
    okBal.status === 201 && okBal.body?.proofKey === balKey && okBal.body?.gradedBy === 'chain', okBal.text.slice(0, 200))
  await enroll(learner2, DASAR)
  const sigBal2 = await bind(wallet, { course: DASAR, lesson: balLesson, learnerAddr: learner2.address, walletAddr: wallet.address })
  bal = await readBal()
  const reuseBal = await submit(learner2, DASAR, balLesson, { wallet: wallet.address, balanceWei: bal.toString(), balanceBnb: formatEther(bal) }, { walletSig: sigBal2 })
  check('dompet yang sama dipakai peserta kedua -> 409, dan peserta kedua tidak mendapat usaha praktik',
    reuseBal.status === 409 && (await attemptsFor(learner2.address, DASAR)).every((r) => r.kind !== 'praktik'), reuseBal.text.slice(0, 160))

  // ===================================================================== E. tx-receipt
  console.log('\n— E. bukti transaksi (Praktik 2, web3-dasar)')
  let txHash = KNOWN_TX
  if (LIVE) {
    const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 }, rpcUrls: { default: { http: [env.RPC_URL] } } }
    const wc = createWalletClient({ account: wallet, chain, transport: http(env.RPC_URL) })
    txHash = await wc.sendTransaction({ to: privateKeyToAccount(generatePrivateKey()).address, value: 1_000_000_000_000_000n })
    await client.waitForTransactionReceipt({ hash: txHash })
    console.log(`  info  transfer 0,001 tBNB baru dari dompet latihan: ${txHash}`)
  }
  if (!txHash) {
    check('ada transaksi untuk diuji (PRAKTIK_TX di .env, atau jalankan --live sekali)', false, 'tanpa transaksi bagian E tidak bisa dibuktikan')
  } else {
    const txLesson = 'praktik-kirim-dan-baca'
    const freedTx = await freeTestProofKey(`tx:${chainId}:${txHash.toLowerCase()}`)
    check('kunci bukti transaksi tidak dipegang peserta sungguhan', freedTx.heldBy.length === 0, json(freedTx))
    const tx = await client.getTransaction({ hash: txHash })
    const rc = await client.getTransactionReceipt({ hash: txHash })
    const blk = await client.getBlock({ blockNumber: rc.blockNumber })
    const truth = {
      wallet: tx.from, txHash, blockNumber: rc.blockNumber.toString(), blockTimestamp: blk.timestamp.toString(),
      gasUsed: rc.gasUsed.toString(), balanceDeltaWei: (tx.value + rc.gasUsed * rc.effectiveGasPrice).toString(),
    }
    const sigTx = await bind(wallet, { course: DASAR, lesson: txLesson, learnerAddr: learner.address, walletAddr: tx.from, txHash })
    // Transfer biasa: batas gas = gas terpakai = 21000, jadi "salah" dibuat dengan meleset satu.
    const gasWrong = await submit(learner, DASAR, txLesson, { ...truth, gasUsed: (rc.gasUsed + 1n).toString() }, { walletSig: sigTx })
    check(`gas terpakai meleset satu (${rc.gasUsed + 1n} vs ${rc.gasUsed}) -> 422 [gas-used]`, gasWrong.status === 422 && json(gasWrong.body?.failed) === json(['gas-used']), gasWrong.text.slice(0, 160))
    const deltaNoFee = await submit(learner, DASAR, txLesson, { ...truth, balanceDeltaWei: tx.value.toString() }, { walletSig: sigTx })
    check('selisih saldo = jumlah kiriman tanpa biaya gas (salah kaprah yang diperingatkan lesson) -> 422 [balance-delta]',
      deltaNoFee.status === 422 && json(deltaNoFee.body?.failed) === json(['balance-delta']), deltaNoFee.text.slice(0, 160))
    const sigOther = await bind(emptyWallet, { course: DASAR, lesson: txLesson, learnerAddr: learner.address, walletAddr: emptyWallet.address, txHash })
    const notSender = await submit(learner, DASAR, txLesson, { ...truth, wallet: emptyWallet.address }, { walletSig: sigOther })
    check('mengakui transaksi orang lain (dompet sah, tapi bukan pengirimnya) -> 422 [tx-sender]',
      notSender.status === 422 && json(notSender.body?.failed) === json(['tx-sender']), notSender.text.slice(0, 160))
    const okTx = await submit(learner, DASAR, txLesson, truth, { walletSig: sigTx })
    check('hash, blok, waktu blok, gas, selisih saldo (termasuk biaya) cocok -> 201',
      okTx.status === 201 && okTx.body?.proofKey === `tx:${chainId}:${txHash.toLowerCase()}` && okTx.body?.blockNumber === truth.blockNumber, okTx.text.slice(0, 200))
    const sigTx2 = await bind(wallet, { course: DASAR, lesson: txLesson, learnerAddr: learner2.address, walletAddr: tx.from, txHash })
    const reuseTx = await submit(learner2, DASAR, txLesson, truth, { walletSig: sigTx2 })
    check('transaksi yang sama untuk peserta kedua -> 409', reuseTx.status === 409, reuseTx.text.slice(0, 160))
  }

  // ===================================================================== F. allowance (web3-lanjut)
  console.log('\n— F. bukti izin token (Praktik 1, web3-lanjut) — dompet kosong baru')
  await enroll(learner, LANJUT)
  const alLesson = 'praktik-rantai-izin'
  const token = getAddress(env.DEMO_TOKEN_ADDRESS)
  const erc = parseAbi(['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'])
  const spenders = [getAddress(PERMIT2), getAddress(env.SPLIT_ADDRESS)]
  const truthBal = await client.readContract({ address: token, abi: erc, functionName: 'balanceOf', args: [emptyWallet.address] })
  const truthAl = await Promise.all(spenders.map((s) => client.readContract({ address: token, abi: erc, functionName: 'allowance', args: [emptyWallet.address, s] })))
  const sigAl = await bind(emptyWallet, { course: LANJUT, lesson: alLesson, learnerAddr: learner.address, walletAddr: emptyWallet.address })
  const allowances = spenders.map((s, i) => ({ spender: s, allowance: truthAl[i].toString() }))
  const oneSpender = await submit(learner, LANJUT, alLesson, { wallet: emptyWallet.address, token, balance: truthBal.toString(), allowances: allowances.slice(0, 1) }, { walletSig: sigAl })
  check('satu spender saja (lesson meminta beberapa) -> 400', oneSpender.status === 400 && /at least 2/.test(oneSpender.body?.error ?? ''), oneSpender.text.slice(0, 140))
  const wrongAl = await submit(learner, LANJUT, alLesson, { wallet: emptyWallet.address, token, balance: truthBal.toString(), allowances: [allowances[0], { ...allowances[1], allowance: '115792089237316195423570985008687907853269984665640564039457584007913129639935' }] }, { walletSig: sigAl })
  check(`izin tak terbatas dilaporkan padahal chain bilang ${truthAl[1]} -> 422 [allowance:${spenders[1].slice(0, 8)}…]`,
    wrongAl.status === 422 && json(wrongAl.body?.failed) === json([`allowance:${spenders[1]}`]), wrongAl.text.slice(0, 160))
  const okAl = await submit(learner, LANJUT, alLesson, { wallet: emptyWallet.address, token, balance: truthBal.toString(), allowances }, { walletSig: sigAl })
  check('balanceOf + dua allowance cocok (nol tetap bukti sah) -> 201', okAl.status === 201 && okAl.body?.gradedBy === 'chain' && okAl.body?.checks?.length === 5, okAl.text.slice(0, 200))

  // ===================================================================== G. slot praktik terisi dari chain
  console.log('\n— G. bukti chain mengisi slot praktik; laporan peserta tidak')
  const rows = await attemptsFor(learner.address, DASAR)
  const ev = evidenceFromAttempts(manifestOf(DASAR), rows)
  const pr = ev.provenance.filter((p) => p.slot === 'praktik')
  check('fromAttempts atas baris nyata peserta: praktik terisi, provenannya graded_by chain',
    ev.evidence?.praktikCompleted === true && pr.length > 0 && pr.every((p) => p.gradedBy === 'chain'), json({ praktik: ev.evidence?.praktikCompleted, pr: pr.slice(0, 2), why: ev.why }))
  const ev2 = evidenceFromAttempts(manifestOf(DASAR), await attemptsFor(learner2.address, DASAR))
  check('peserta kedua (bukti ditolak 409) -> slot praktik kosong', ev2.evidence?.praktikCompleted !== true, json(ev2.evidence ?? ev2.why))
  const gates = await courseGates(learner.address, DASAR)
  const praktikRows = rows.filter((r) => r.kind === 'praktik').length
  check(`gerbang kursus menghitung ${praktikRows} usaha praktik yang dinilai chain (+1 ujian)`, Number(gates?.graded_attempts) === praktikRows + 1, json({ gates: gates?.graded_attempts, praktikRows }))
} catch (e) {
  check('harness selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 400))
} finally {
  finish()
}
