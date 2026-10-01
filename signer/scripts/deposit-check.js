// Lencana-B90 status=SELESAI 2026-09-30 — mengadili rute setoran tenggat lewat HTTP: tanpa bendera tidak ada gas; --live menjalankan satu setoran sampai selesai di chain 97. Buktikan ulang: npm run verify:deposit. JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:deposit` — B90: paruh dua kontrak tenggat (`CourseDeposit`).
 *
 * Kontraknya sudah diuji `forge test` (aritmetika, tanda tangan, hangus). Yang diuji di sini adalah
 * empat hal yang baris B90 sebut belum ada: kontraknya TER-DEPLOY, ada rute HTTP, `policyHash`
 * dihitung dari manifest penerbit, dan `issuedAt` dibaca dari BAS — bukan dari badan permintaan.
 *
 *   npm run verify:deposit            tanpa gas: server + store dingin, siaran mati
 *   npm run verify:deposit:live       SATU setoran nyata sampai selesai (gas testnet, kunci platform)
 *
 * Semua alamat uji DITURUNKAN dari label di berkas ini (B49). `--live` hanya bisa dijalankan sekali
 * per label: `deposit()` menolak setoran kedua untuk (peserta, kursus) yang sama. Sesudah itu mode
 * tanpa gas membaca setoran yang sudah selesai itu dari chain sebagai spesimen.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient, createWalletClient, http, keccak256, stringToBytes, toBytes, parseAbi, parseEther,
  encodeAbiParameters, getAddress, decodeEventLog,
} from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { credentialHashOf } from '../src/credential.js'
import { deadlinePolicyOf, finalizeInnerHash, depositAbi, courseIdOf, DEADLINE_TIERS } from '../src/deposit.js'
import { credentialResolverAbi, basAbi, EMPTY_UID } from '../../web/src/abi.ts'
import { manifestOf, manifestHashOf, rubricHashOf } from '../../web/src/manifest.ts'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')

await loadFileEnvReport('verify:deposit')
const env = process.env
const RPC = env.RPC_URL
const need = ['RPC_URL', 'RESOLVER_ADDRESS', 'BAS_ADDRESS', 'DEPOSIT_ADDRESS', 'DEMO_TOKEN_ADDRESS', 'ISSUER_ADDRESS', 'DEPLOYER_ADDRESS', 'ISSUER_PRIVATE_KEY']
const missing = need.filter((k) => !env[k])
if (missing.length) {
  console.error(`verify:deposit butuh ${missing.join(', ')} di app/.env — ini bukan kegagalan uji, prasyaratnya belum ada`)
  process.exit(2)
}
const DEPOSIT = getAddress(env.DEPOSIT_ADDRESS)
const TOKEN = getAddress(env.DEMO_TOKEN_ADDRESS)
const RESOLVER = env.RESOLVER_ADDRESS
const BAS = env.BAS_ADDRESS
const COURSE = 'web3-dasar-2026'
const COURSE_ID = courseIdOf(COURSE)
const AMOUNT = 25_000n // 0,025 LDC-demo: premi tier 5 hari atas harga dasar 0,1 — angka uji, bukan harga
const CHOSEN_DAYS = 5

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { failed += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 220)}` : ''}`) }
}
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))

const client = createPublicClient({ transport: http(RPC) })
const erc20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
])
const ownerAbi = parseAbi(['function refundAll(address learner, bytes32 courseId)'])
const basWrite = parseAbi([
  'function timestamp(bytes32 data) returns (uint64)',
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data) request) returns (bytes32)',
])
const readDep = (functionName, args = []) => client.readContract({ address: DEPOSIT, abi: depositAbi, functionName, args })
const balance = (who) => client.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [who] })
const termOf = async (who) => {
  const [amount, deadlineAt, policyHash, , payee, finalized] = await readDep('terms', [who, COURSE_ID])
  return { amount, deadlineAt, policyHash, payee, finalized }
}

const derive = (label) => privateKeyToAccount(keccak256(stringToBytes(label)))
const learner = derive('lencana-b90-learner-ontime')
const foreign = derive('lencana-b90-learner-foreign-policy')
const issuerAcct = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const cfg = { chainId: Number(env.CHAIN_ID ?? 97), depositAddress: DEPOSIT, tokenAddress: TOKEN, payee: env.ISSUER_ADDRESS }
const local = deadlinePolicyOf(COURSE, cfg)

const coldDir = mkdtempSync(join(tmpdir(), 'lencana-deposit-'))
// port dicari dengan uji bind, bukan dengan /healthz yang bisa lambat (src/ports.js, temuan B121)
const PORT = Number(env.DEPOSIT_PROBE_PORT ?? await freePort(8857))
const BASE = `http://127.0.0.1:${PORT}`
const childEnv = { ...env, LANCENA_STORE: coldDir, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE }
delete childEnv.RELAY_BROADCAST
if (LIVE) childEnv.DEPOSIT_BROADCAST = '1'
else delete childEnv.DEPOSIT_BROADCAST
const child = spawn('npm', ['run', 'serve'], { cwd: SIGNER, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], shell: true })
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })

async function call (method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(120000),
  })
  const text = await res.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: res.status, body: parsed, text }
}
const refused = (r, status, re) => r.status === status && re.test(String(r.body?.error ?? ''))

const finish = () => {
  if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  try { rmSync(coldDir, { recursive: true, force: true }) } catch { /* dibuang OS */ }
  console.log(`\nDEPOSIT ${LIVE ? 'LIVE ' : ''}${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
  setTimeout(() => process.exit(failed === 0 ? 0 : 1), 300)
}

/** Tanda tangan penerbit atas digest yang sama dengan kontrak. Harness memerankan penerbit. */
const signFinalize = (account, { who, uid, issuedAt, refundBps, policyHash }) => account.signMessage({
  message: { raw: finalizeInnerHash({ learner: who, courseId: COURSE_ID, uid, issuedAt, refundBps, policyHash }) },
})

try {
  let health = null
  for (let i = 0; i < 60 && !health; i++) {
    try { health = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!health) await new Promise((r) => setTimeout(r, 500))
  }
  check('server naik dengan store dingin dan /healthz 200', health?.status === 200, health ? `HTTP ${health.status} ${health.text.slice(0, 120)}` : `tidak menjawab · ${errBuf.slice(-160)}`)
  if (health?.status !== 200) throw new Error('server tidak menjawab — sisa pemeriksaan tidak bisa dijalankan')
  check(`/healthz melaporkan setoran terkonfigurasi, kontrak ${DEPOSIT}, siaran ${LIVE ? 'NYALA (run ini --live)' : 'MATI'}`,
    health.body?.deposit?.configured === true && health.body?.deposit?.broadcast === LIVE && getAddress(health.body?.deposit?.contract ?? DEPOSIT.replace(/.$/, '0')) === DEPOSIT, json(health.body?.deposit))

  // --- kontraknya memang ter-deploy, dan isinya yang kita klaim -------------------------------
  const code = await client.getCode({ address: DEPOSIT })
  check('ada bytecode di DEPOSIT_ADDRESS (chain 97)', Boolean(code) && code.length > 2 && await client.getChainId() === 97, `${(code ?? '0x').length} karakter`)
  check('token() = DEMO_TOKEN_ADDRESS', getAddress(await readDep('token')) === TOKEN)
  check('issuer() = ISSUER_ADDRESS (yang tanda tangannya diterima kontrak)', getAddress(await readDep('issuer')) === getAddress(env.ISSUER_ADDRESS))
  check('owner() = DEPLOYER_ADDRESS', getAddress(await readDep('owner')) === getAddress(env.DEPLOYER_ADDRESS))
  const platformNonceBefore = await client.getTransactionCount({ address: getAddress(env.DEPLOYER_ADDRESS) })

  // --- policyHash dihitung dari manifest, dan bisa dihitung ulang orang lain -------------------
  const pol = await call('GET', `/deposit/policy/${COURSE}`)
  check('GET /deposit/policy/<kursus> -> 200 dan policyHash = yang dihitung harness dari manifest', pol.status === 200 && pol.body?.policyHash === local.policyHash, `${pol.status} ${pol.text.slice(0, 120)}`)
  check('policyHash = keccak256 dari dokumen aturan yang DISAJIKAN (orang lain bisa menghitungnya tanpa kode kami)',
    pol.body?.policy && keccak256(toBytes(JSON.stringify(pol.body.policy))) === pol.body.policyHash)
  const manifest = manifestOf(COURSE)
  check('dokumen aturan terikat ke manifest penerbit (manifestHash + rubricHash)',
    pol.body?.policy?.manifestHash === manifestHashOf(manifest) && pol.body?.policy?.rubricHash === rubricHashOf(manifest), json(pol.body?.policy?.manifestHash))
  check('tier = 5/7/9 hari dengan premi 2500/1200/0 bps (D52), tepat waktu 10000, telat 0',
    json(pol.body?.policy?.tiers) === json(DEADLINE_TIERS) && pol.body?.policy?.onTimeRefundBps === 10000 && pol.body?.policy?.lateRefundBps === 0, json(pol.body?.policy?.tiers))
  check('"telat = hangus" tertulis di dokumen yang dilihat SEBELUM memilih tenggat', /forfeited/.test(pol.body?.policy?.disclosure ?? ''))
  check('dokumen aturan menunjuk kontrak, token, dan payee yang sama dengan chain',
    pol.body?.policy?.contract === DEPOSIT && pol.body?.policy?.token === TOKEN && pol.body?.policy?.payee === getAddress(env.ISSUER_ADDRESS))
  const pol2 = await call('GET', '/deposit/policy/web3-lanjut-2026')
  check('kursus lain -> policyHash lain (hash mengikat kursusnya)', pol2.status === 200 && pol2.body?.policyHash !== pol.body?.policyHash, `${pol2.status}`)
  check('kursus tanpa manifest -> 404', refused(await call('GET', '/deposit/policy/kursus-yang-tidak-ada'), 404, /no publisher manifest/))

  // --- penolakan yang tidak butuh setoran ------------------------------------------------------
  const stranger = privateKeyToAccount(generatePrivateKey())
  const sigShape = await stranger.signMessage({ message: 'x' })
  check('GET setoran peserta tanpa setoran -> 404', refused(await call('GET', `/deposit/${COURSE}/${stranger.address}`), 404, /no deposit/))
  check('GET setoran dengan alamat rusak -> 422', refused(await call('GET', `/deposit/${COURSE}/bukan-alamat`), 422, /20-byte address/))
  check('GET /deposit/finalize -> 405', refused(await call('GET', '/deposit/finalize'), 405, /POST required/))
  check('finalize: tanda tangan cacat bentuk -> 422', refused(await call('POST', '/deposit/finalize', { learner: stranger.address, course: COURSE, refundBps: 10000, signature: '0x12' }), 422, /65-byte/))
  check('finalize: refundBps 10001 -> 422', refused(await call('POST', '/deposit/finalize', { learner: stranger.address, course: COURSE, refundBps: 10001, signature: sigShape }), 422, /refundBps must be/))
  check('finalize: peserta tanpa setoran -> 404', refused(await call('POST', '/deposit/finalize', { learner: stranger.address, course: COURSE, refundBps: 10000, signature: sigShape }), 404, /no deposit/))
  check('finalize: kursus tanpa manifest -> 404', refused(await call('POST', '/deposit/finalize', { learner: stranger.address, course: 'kursus-yang-tidak-ada', refundBps: 10000, signature: sigShape }), 404, /no publisher manifest/))

  // --- --live: satu setoran nyata, dari setor sampai selesai -----------------------------------
  if (LIVE) {
    if (!env.DEPLOYER_PRIVATE_KEY) throw new Error('--live butuh DEPLOYER_PRIVATE_KEY')
    if ((await termOf(learner.address)).amount !== 0n) throw new Error(`--live sudah pernah dijalankan untuk ${learner.address}: setoran kedua ditolak kontrak. Jalankan tanpa --live untuk membaca spesimennya.`)
    const chain = { id: 97, name: 'chain-97', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } }
    const walletOf = (account) => createWalletClient({ account, chain, transport: http(RPC) })
    const platform = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY)
    const mined = async (what, hash) => {
      const r = await client.waitForTransactionReceipt({ hash })
      if (r.status !== 'success') throw new Error(`${what} revert di ${hash}`)
      console.log(`  info  tx ${what}: ${hash} (gas ${r.gasUsed}, blok ${r.blockNumber})`)
      return r
    }
    const prepare = async (who) => {
      if (await client.getBalance({ address: who.address }) < parseEther('0.0005')) await mined(`isi gas ${who.address}`, await walletOf(platform).sendTransaction({ to: who.address, value: parseEther('0.001') }))
      await mined(`mint ${AMOUNT} token demo ke ${who.address}`, await walletOf(platform).writeContract({ address: TOKEN, abi: erc20, functionName: 'mint', args: [who.address, AMOUNT] }))
      await mined('approve', await walletOf(who).writeContract({ address: TOKEN, abi: erc20, functionName: 'approve', args: [DEPOSIT, AMOUNT] }))
    }
    console.log(`  info  peserta uji ${learner.address} · peserta aturan-asing ${foreign.address} · penerbit ${issuerAcct.address} · platform ${platform.address}`)

    // (1) setoran di bawah aturan penerbit, tenggat 5 hari
    await prepare(learner)
    const learnerBalBefore = await balance(learner.address)
    const payeeBalBefore = await balance(getAddress(env.ISSUER_ADDRESS))
    const contractBalBefore = await balance(DEPOSIT)
    const depRcpt = await mined('deposit(5 hari)', await walletOf(learner).writeContract({
      address: DEPOSIT, abi: depositAbi, functionName: 'deposit', args: [COURSE_ID, AMOUNT, CHOSEN_DAYS, local.policyHash, getAddress(env.ISSUER_ADDRESS)],
    }))
    const depBlock = await client.getBlock({ blockNumber: depRcpt.blockNumber })
    const t1 = await termOf(learner.address)
    check('setoran tercatat: jumlah, payee, dan policyHash = aturan penerbit', t1.amount === AMOUNT && t1.policyHash === local.policyHash && getAddress(t1.payee) === getAddress(env.ISSUER_ADDRESS), json(t1))
    check('deadlineAt = jam blok setoran + 5 hari', BigInt(t1.deadlineAt) === depBlock.timestamp + BigInt(CHOSEN_DAYS * 86400), `${t1.deadlineAt} vs ${depBlock.timestamp}`)

    // (2) syaratnya distempel ke BAS SEBELUM ada hasil
    const recordHash = await readDep('recordHash', [learner.address, COURSE_ID])
    await mined('BAS.timestamp(recordHash)', await walletOf(platform).writeContract({ address: BAS, abi: basWrite, functionName: 'timestamp', args: [recordHash] }))
    const before = await call('GET', `/deposit/${COURSE}/${learner.address}`)
    check('GET setoran: recordHash ter-stempel di BAS dan belum ada kredensial', before.status === 200 && BigInt(before.body?.term?.recordAnchoredAt ?? 0) > 0n && before.body?.credential === null, before.text.slice(0, 200))
    const early = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: sigShape })
    check('finalize sebelum ada kredensial -> 409 (tidak ada issuedAt untuk diadili)', refused(early, 409, /no course credential/), `${early.status} ${early.text.slice(0, 120)}`)

    // (3) penerbit menerbitkan kredensial kursusnya — attester = agen, seperti kertas sungguhan
    const schema = await client.readContract({ address: RESOLVER, abi: credentialResolverAbi, functionName: 'schemaUID' })
    const credentialHash = credentialHashOf(learner.address, COURSE)
    await mined('attest (kredensial kursus peserta uji)', await walletOf(issuerAcct).writeContract({
      address: BAS, abi: basWrite, functionName: 'attest',
      args: [{ schema, data: {
        recipient: learner.address, expirationTime: depBlock.timestamp + BigInt(manifest.course.validDays * 86400), revocable: true, refUID: EMPTY_UID,
        data: encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }], [credentialHash, COURSE_ID, EMPTY_UID]), value: 0n,
      } }],
    }))
    const uid = await client.readContract({ address: RESOLVER, abi: credentialResolverAbi, functionName: 'attestationOf', args: [credentialHash] })
    const att = await client.readContract({ address: BAS, abi: basAbi, functionName: 'getAttestation', args: [uid] })
    console.log(`  info  credentialHash ${credentialHash} · uid ${uid} · BAS time ${att.time} · deadlineAt ${t1.deadlineAt}`)
    const ready = await call('GET', `/deposit/${COURSE}/${learner.address}`)
    check('GET setoran: issuedAt yang dilaporkan = BAS getAttestation(uid).time, dan tepat waktu', ready.body?.credential?.uid === uid && BigInt(ready.body?.credential?.issuedAt ?? 0) === att.time && ready.body?.credential?.withinDeadline === true, ready.text.slice(0, 200))

    // (4) penyelesaian: tiga penolakan, lalu satu yang sah
    const base = { who: learner.address, uid, policyHash: local.policyHash }
    const wrongBps = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 0, signature: await signFinalize(issuerAcct, { ...base, issuedAt: att.time, refundBps: 0 }) })
    check('tanda tangan penerbit SAH atas refundBps 0 padahal tepat waktu -> 422 (aturan menang atas tanda tangan)', refused(wrongBps, 422, /does not follow the policy/), `${wrongBps.status} ${wrongBps.text.slice(0, 120)}`)
    const notIssuer = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: await signFinalize(stranger, { ...base, issuedAt: att.time, refundBps: 10000 }) })
    check('tanda tangan kunci lain -> 401', refused(notIssuer, 401, /does not recover to the issuer/), `${notIssuer.status}`)
    const wrongTime = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: await signFinalize(issuerAcct, { ...base, issuedAt: att.time - 86400n, refundBps: 10000 }) })
    check('tanda tangan penerbit atas issuedAt yang BUKAN jam BAS -> 401 (issuedAt tidak bisa dipilih)', refused(wrongTime, 401, /does not recover to the issuer/), `${wrongTime.status}`)
    check('tiga penolakan itu tidak menyelesaikan apa pun di chain', (await termOf(learner.address)).finalized === false)

    const goodSig = await signFinalize(issuerAcct, { ...base, issuedAt: att.time, refundBps: 10000 })
    const done = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: goodSig })
    check('penyelesaian sah -> 200 dengan txHash, siaran enabled', done.status === 200 && /^0x[0-9a-f]{64}$/.test(done.body?.txHash ?? '') && done.body?.broadcast === 'enabled', `${done.status} ${done.text.slice(0, 200)}`)
    console.log(`  info  tx finalize: ${done.body?.txHash} (gas ${done.body?.gasUsed}, blok ${done.body?.blockNumber})`)
    const rcpt = await client.getTransactionReceipt({ hash: done.body.txHash })
    const ev = rcpt.logs.filter((l) => getAddress(l.address) === DEPOSIT).map((l) => { try { return decodeEventLog({ abi: depositAbi, data: l.data, topics: l.topics }) } catch { return null } }).find((e) => e?.eventName === 'Finalized')
    check('event Finalized di chain: withinDeadline=true, issuedAt = jam BAS, refundBps 10000', ev?.args?.withinDeadline === true && ev?.args?.issuedAt === att.time && ev?.args?.refundBps === 10000n && ev?.args?.uid === uid, json(ev?.args))
    check('yang menyiarkan adalah kunci platform, bukan penerbit dan bukan peserta', getAddress(rcpt.from) === platform.address, rcpt.from)
    check('premi kembali UTUH ke peserta', await balance(learner.address) === learnerBalBefore, `${learnerBalBefore} -> ${await balance(learner.address)}`)
    check('payee tidak menerima apa pun, kontrak tidak menahan sisa', await balance(getAddress(env.ISSUER_ADDRESS)) === payeeBalBefore && await balance(DEPOSIT) === contractBalBefore)
    const nonceAfter = await client.getTransactionCount({ address: platform.address })
    const again = await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: goodSig })
    check('permintaan yang sama dikirim ulang -> 409 dan tidak ada transaksi kedua', refused(again, 409, /already settled/) && await client.getTransactionCount({ address: platform.address }) === nonceAfter, `${again.status}`)

    // (5) setoran di bawah policyHash yang BUKAN aturan penerbit tidak bisa diselesaikan lewat rute ini
    await prepare(foreign)
    const foreignHash = keccak256(stringToBytes('not-the-publisher-policy'))
    await mined('deposit(aturan asing)', await walletOf(foreign).writeContract({ address: DEPOSIT, abi: depositAbi, functionName: 'deposit', args: [COURSE_ID, AMOUNT, 0, foreignHash, getAddress(env.ISSUER_ADDRESS)] }))
    const fr = await call('POST', '/deposit/finalize', { learner: foreign.address, course: COURSE, refundBps: 10000, signature: sigShape })
    check('setoran ber-policyHash asing -> 409 sebelum tanda tangan diperiksa', refused(fr, 409, /not the publisher policy/), `${fr.status} ${fr.text.slice(0, 120)}`)
    await mined('refundAll (owner mengembalikan setoran aturan-asing)', await walletOf(platform).writeContract({ address: DEPOSIT, abi: ownerAbi, functionName: 'refundAll', args: [foreign.address, COURSE_ID] }))
    check('setoran aturan-asing kembali utuh lewat refundAll, tidak tertahan', await balance(foreign.address) === AMOUNT && (await termOf(foreign.address)).finalized === true)
    finish()
  } else {
    // --- spesimen: setoran yang diselesaikan run --live, dibaca dari chain ---------------------
    const t = await termOf(learner.address)
    if (t.amount === 0n) {
      console.log(`  info  belum ada setoran untuk ${learner.address}: kelompok spesimen DILEWATI (jalankan npm run verify:deposit:live sekali)`)
    } else {
      const s = await call('GET', `/deposit/${COURSE}/${learner.address}`)
      check('spesimen: GET setoran -> 200, selesai, aturannya aturan penerbit', s.status === 200 && s.body?.term?.finalized === true && s.body?.term?.policyMatchesPublisher === true, s.text.slice(0, 200))
      const att = s.body?.credential?.uid ? await client.readContract({ address: BAS, abi: basAbi, functionName: 'getAttestation', args: [s.body.credential.uid] }) : null
      check('spesimen: issuedAt yang dilaporkan rute = BAS getAttestation(uid).time', Boolean(att) && BigInt(s.body.credential.issuedAt) === att.time, json(s.body?.credential))
      check('spesimen: syarat distempel ke BAS SEBELUM kredensial terbit (tenggat ada sebelum hasil)',
        BigInt(s.body?.term?.recordAnchoredAt ?? 0) > 0n && BigInt(s.body.term.recordAnchoredAt) < BigInt(s.body?.credential?.issuedAt ?? 0), `${s.body?.term?.recordAnchoredAt} vs ${s.body?.credential?.issuedAt}`)
      check('spesimen: issuedAt <= deadlineAt -> tepat waktu, premi kembali utuh (10000 bps)',
        s.body?.credential?.withinDeadline === true && s.body?.credential?.expectedRefundBps === 10000 && BigInt(s.body.credential.issuedAt) <= BigInt(s.body.term.deadlineAt))
      const sig = await signFinalize(issuerAcct, { who: learner.address, uid: s.body?.credential?.uid ?? EMPTY_UID, issuedAt: att?.time ?? 0n, refundBps: 10000, policyHash: t.policyHash })
      check('spesimen: penyelesaian kedua dengan tanda tangan penerbit yang sah -> 409', refused(await call('POST', '/deposit/finalize', { learner: learner.address, course: COURSE, refundBps: 10000, signature: sig }), 409, /already settled/))
    }
    check('tidak ada transaksi dari kunci platform selama run ini (nonce tidak bergerak)',
      await client.getTransactionCount({ address: getAddress(env.DEPLOYER_ADDRESS) }) === platformNonceBefore)
    finish()
  }
} catch (err) {
  check('run selesai tanpa pengecualian', false, err?.shortMessage ?? err?.message ?? String(err))
  finish()
}
