// Lencana-B169 status=SELESAI 2026-10-06 — harness cetak artefak NFT dari app: POST /me/mint, aturan dari kontrak (bukan salinannya), batas pemberian, nonce yang tidak terbakar saat ditolak. Buktikan ulang: cd signer && npm run verify:mint
/**
 * `npm run verify:mint` — peserta meminta artefak NFT soulbound untuk kredensialnya (B169), tanpa gas.
 *
 * Yang diadili:
 *  A. `mintArtifact` dengan klien tiruan: bentuk masukan ditolak sebelum menyentuh chain; yang sudah punya artefak dijawab dari
 *     chain tanpa simulasi; tiap galat kontrak yang dinamai diterjemahkan (kode HTTP + `kind`) TANPA transaksi; galat tak dikenal
 *     menjadi 502 `failed`; jalur sukses menulis `mint(learner, hash, uri)` tepat sekali dengan URI dokumen dan membaca hasilnya
 *     dari chain; receipt gagal bukan sukses.
 *  B. Aturan kontrak sungguhan di chain 97 lewat `eth_call` sebagai platform (klien tulis tiruan yang melempar bila disentuh,
 *     jadi tidak ada gas): artefak B153 → `already` dengan token yang benar; hash tak dikenal → `not-found`; kredensial sah milik
 *     orang lain → `not-yours`; dicabut → `revoked`; kedaluwarsa → `expired`; didelisting → `delisted`. Kalau kode ini menyalin aturan,
 *     bagian ini tidak akan menangkap kontrak yang berubah — yang menerjemahkan hanyalah nama galat dari kontrak.
 *  C. Server sungguhan: bentuk permintaan, akun Penerbit ditolak sebelum tanda tangan dipakai, tanda tangan palsu → 401 dan slot batas
 *     dikembalikan, tanda tangan sah atas kredensial yang ditolak kontrak → 409/404/403 dan NONCE DIBEBASKAN (tanda tangan yang sama
 *     dipakai lagi dan dijawab sama, bukan "replay"), `MINT_PER_IP_DAY=0` → 429 sebelum tanda tangan, kunci platform kosong → 503,
 *     `/healthz` melaporkan kuota cetak tanpa IP.
 *  D. `--live`: kredensial baru diterbitkan untuk kunci baru, lalu dicetak lewat rute — token di chain 97 milik kunci itu, terkunci,
 *     URI memuat hash; permintaan kedua dijawab 409 dengan token yang sama. Memakai gas testnet platform.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createPublicClient, http, keccak256, stringToBytes, parseAbi } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { manifestOf } from '../../web/src/manifest-keys.ts'
import { freePort } from '../src/ports.js'
import { mintArtifact, revertNameOf, documentUri, REFUSALS, ARTIFACT_LAYER_97, CREDENTIAL_HOST_DEFAULT } from '../src/mint-artifact.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIVE = process.argv.includes('--live')
await loadFileEnvReport('verify:mint')
const env = process.env
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'

let ran = 0
let failed = 0
function check (name, ok, detail) {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'}  ${name}${!ok && detail ? `\n          ${String(detail).slice(0, 300)}` : ''}`)
}
const head = (t) => console.log(`\n${t}`)
const nonce = () => randomBytes(10).toString('hex')

// Spesimen terukur 6 Okt (chain 97): sah + belum dicetak di lapis A, dicabut, kedaluwarsa, didelisting; B153 sudah dicetak.
const B153 = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31'
const B153_TOKEN = '84121403186795298920828483866352784394121030368831233674664771831378544364593'
const VALID_UNMINTED = [
  '0x56181903b6c2890358b22699015a515b92d5b15516a3392140e4abe3fc0c68e1', '0x302f242e69d4596772e0f60e89877497e5aa1bff58c9ac00f2002a70469f6e62',
  '0xd1dcb1ff9463cc0a918b3a70813df00fb88996f73d773612e2dacb806fa32d9a', '0xfe4f71615855ac4f24fdfef921937d64e23dfc048e371a96e04cf4f508173a8a',
]
const REVOKED = '0xda10e69e17b0cb17e13eb539c7ce0a8b4698ce71573687f34f6e230f76a6e70e'
const EXPIRED = '0x202f8edf1a46ee6ed2fb9e99026a2bdcf957e654b786c46213112e5caf0afdcc'
const DELISTED = '0xaa379627438fb47b6a6c2a5fefc421d26f3168ce941e82c19a591c773d849c0f'

// ------------------------------------------------------------------------------------------------ A. klien tiruan
head('A. mintArtifact dengan klien tiruan (tanpa jaringan)')
{
  const LEARNER = '0x1111111111111111111111111111111111111111'
  const HASH = '0x' + 'ab'.repeat(32)
  const revert = (name) => Object.assign(new Error('The contract function "mint" reverted.'), { cause: Object.assign(new Error('x'), { cause: { data: { errorName: name, args: [] } } }) })
  const mk = ({ existing = 0n, simError = null, receipt = 'success' } = {}) => {
    const log = []
    let minted = false
    const publicClient = {
      async readContract ({ functionName }) {
        log.push(['read', functionName])
        if (functionName === 'tokenOfCredential') return minted ? 42n : existing
        if (functionName === 'ownerOf') return '0x1111111111111111111111111111111111111111'
        if (functionName === 'locked') return true
        throw new Error(`bacaan tak terduga ${functionName}`)
      },
      async simulateContract ({ functionName, args }) { log.push(['simulate', functionName, args]); if (simError) throw simError; return { request: { functionName, args, marker: 'req' } } },
      async waitForTransactionReceipt () { minted = true; return { status: receipt } },
    }
    const walletClient = { async writeContract (req) { log.push(['write', req]); return '0x' + 'cd'.repeat(32) } }
    return { deps: { publicClient, walletClient, account: '0x2222222222222222222222222222222222222222' }, log }
  }
  const run = (over = {}, o = {}) => { const m = mk(o); return mintArtifact({ rpcUrl: 'x', learner: LEARNER, hash: HASH, deps: m.deps, ...over }).then((r) => ({ r, log: m.log })) }

  const bad = await run({ hash: '0x123' })
  check('hash salah bentuk → 400 bad-hash, chain tidak disentuh', !bad.r.ok && bad.r.status === 400 && bad.r.kind === 'bad-hash' && bad.log.length === 0, JSON.stringify(bad))
  const badL = await run({ learner: '0xabc' })
  check('alamat salah bentuk → 400 bad-learner, chain tidak disentuh', !badL.r.ok && badL.r.status === 400 && badL.r.kind === 'bad-learner' && badL.log.length === 0, JSON.stringify(badL))

  const have = await run({}, { existing: 7n })
  check('sudah punya artefak → 409 already dengan token yang ada', !have.r.ok && have.r.status === 409 && have.r.kind === 'already' && have.r.tokenId === '7', JSON.stringify(have.r))
  check('…dijawab dari chain tanpa simulasi dan tanpa transaksi', have.log.every(([k]) => k === 'read'), JSON.stringify(have.log))

  for (const [name, ref] of Object.entries(REFUSALS)) {
    const x = await run({}, { simError: revert(name) })
    const wrote = x.log.some(([k]) => k === 'write')
    check(`kontrak menolak ${name} → ${ref.status} ${ref.kind}, tanpa transaksi`, !x.r.ok && x.r.status === ref.status && x.r.kind === ref.kind && !wrote, JSON.stringify(x.r))
  }
  const unknown = await run({}, { simError: new Error('HTTP request failed.\nURL: https://rpc.example\nDetails: boom') })
  check('galat tak dikenal (RPC mati) → 502 failed, satu baris, tanpa transaksi', !unknown.r.ok && unknown.r.status === 502 && unknown.r.kind === 'failed' && !/\n/.test(unknown.r.why) && !unknown.log.some(([k]) => k === 'write'), JSON.stringify(unknown.r))
  const nested = revertNameOf(Object.assign(new Error('a'), { cause: Object.assign(new Error('b'), { cause: Object.assign(new Error('c'), { errorName: 'IssuerDelisted' }) }) }))
  check('revertNameOf menelusuri rantai cause', nested === 'IssuerDelisted' && revertNameOf(new Error('x')) === null, nested)

  const ok = await run({ learner: LEARNER.toLowerCase() })
  const writes = ok.log.filter(([k]) => k === 'write')
  check('sukses → ok dengan token, pemilik, locked dari chain', ok.r.ok && ok.r.tokenId === '42' && ok.r.owner === LEARNER && ok.r.locked === true && ok.r.cert === ARTIFACT_LAYER_97, JSON.stringify(ok.r))
  check('mint ditulis tepat sekali, memakai permintaan dari simulasi', writes.length === 1 && writes[0][1].marker === 'req', JSON.stringify(writes))
  const sim = ok.log.find(([k]) => k === 'simulate')
  check('argumen mint = (alamat bercek, hash, URI dokumen di host tepi)', sim && sim[2][0] === LEARNER && sim[2][1] === HASH && sim[2][2] === `${CREDENTIAL_HOST_DEFAULT}/credentials/${HASH}`, JSON.stringify(sim))
  check('documentUri memakai hash huruf kecil', documentUri('0x' + 'AB'.repeat(32)) === `${CREDENTIAL_HOST_DEFAULT}/credentials/${'0x' + 'ab'.repeat(32)}`, documentUri('0x' + 'AB'.repeat(32)))
  const reverted = await run({}, { receipt: 'reverted' })
  check('receipt gagal → 502, bukan sukses', !reverted.r.ok && reverted.r.status === 502 && reverted.r.kind === 'failed', JSON.stringify(reverted.r))
}

// ------------------------------------------------------------------------------------------------ B. kontrak sungguhan
head('B. aturan kontrak sungguhan di chain 97 (eth_call sebagai platform, tanpa gas)')
const pub = createPublicClient({ transport: http(RPC) })
const owner = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: parseAbi(['function owner() view returns (address)']), functionName: 'owner' })
const RESOLVER = env.RESOLVER_ADDRESS || '0x7CA624caFDe5cA3A27b33d26be56F73a90792065'
const noGas = { async writeContract () { throw new Error('GAS TERPAKAI — jalur ini tidak boleh menulis') } }
const asPlatform = (learner, hash) => mintArtifact({ rpcUrl: RPC, cert: ARTIFACT_LAYER_97, learner, hash, deps: { publicClient: pub, walletClient: noGas, account: owner } })
const stranger = privateKeyToAccount(generatePrivateKey()).address
{
  const dep = env.DEPLOYER_PRIVATE_KEY ? privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY).address : null
  check('pemilik kontrak lapis A = kunci platform (deployer) di lingkungan', dep === null || dep.toLowerCase() === owner.toLowerCase(), `owner=${owner} deployer=${dep}`)
  const a = await asPlatform(stranger, B153)
  check('artefak B153 sudah ada → already dengan token yang sama dengan yang terukur', !a.ok && a.kind === 'already' && a.tokenId === B153_TOKEN, JSON.stringify(a))
  const nf = await asPlatform(stranger, keccak256(stringToBytes('lencana-mint-check-tidak-ada')))
  check('hash tak dikenal → 404 not-found (nama galat kontrak CredentialNotFound)', !nf.ok && nf.status === 404 && nf.kind === 'not-found', JSON.stringify(nf))
  let pick = null
  for (const h of VALID_UNMINTED) {
    const t = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: parseAbi(['function tokenOfCredential(bytes32) view returns (uint256)']), functionName: 'tokenOfCredential', args: [h] })
    if (t === 0n) { pick = h; break }
  }
  if (!pick) check('ada spesimen sah yang belum dicetak di lapis A', false, 'keempat spesimen sudah dicetak — pilih yang baru dari `npm run check:samples`')
  else {
    const wh = await asPlatform(stranger, pick)
    check(`kredensial sah milik orang lain (${pick.slice(0, 12)}…) → 403 not-yours (WrongHolder)`, !wh.ok && wh.status === 403 && wh.kind === 'not-yours', JSON.stringify(wh))
  }
  const rv = await asPlatform(stranger, REVOKED)
  check('kredensial dicabut → 409 revoked', !rv.ok && rv.status === 409 && rv.kind === 'revoked', JSON.stringify(rv))
  const ex = await asPlatform(stranger, EXPIRED)
  check('kredensial kedaluwarsa → 409 expired', !ex.ok && ex.status === 409 && ex.kind === 'expired', JSON.stringify(ex))
  const st = await pub.readContract({ address: RESOLVER, abi: parseAbi(['function statusOf(bytes32) view returns (bool,bool,bool,bool,address,uint64,uint64)']), functionName: 'statusOf', args: [DELISTED] })
  if (st[3]) {
    const dl = await asPlatform(stranger, DELISTED)
    check('penerbit didelisting → 409 delisted', !dl.ok && dl.status === 409 && dl.kind === 'delisted', JSON.stringify(dl))
  } else console.log('  info  spesimen delisted sudah dipulihkan (relistIssuer) — pemeriksaan delisted dilewati, bukan dihitung')
}

// ------------------------------------------------------------------------------------------------ C. server sungguhan
head('C. server sungguhan: POST /me/mint')
async function boot (extra, basePort) {
  const port = await freePort(basePort)
  const base = `http://127.0.0.1:${port}`
  const child = spawn('npm', ['run', 'serve'], {
    cwd: SIGNER, env: { ...env, PORT: String(port), HOST: '127.0.0.1', BASE_URL: base, LANCENA_ORIGIN: 'test', ENROLL_PAYWALL: 'off', ...extra }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  })
  let errBuf = ''
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => { errBuf += String(d) })
  const call = async (method, path, body) => {
    const r = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    let parsed = null
    try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
    return { status: r.status, body: parsed, text }
  }
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!up) await new Promise((r) => setTimeout(r, 750))
  }
  if (up?.status !== 200) throw new Error(`server tidak naik: ${errBuf.slice(-200)}`)
  const stop = () => {
    if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  }
  return { call, stop, health: up }
}
const signed = async (account, hash, learner = account.address) => {
  const message = `lencana-mint nonce=${nonce()}`
  return { learner, hash, message, signature: await account.signMessage({ message }) }
}

let s1 = null
try {
  s1 = await boot({}, 8971)
  const { call } = s1
  const learner = privateKeyToAccount(generatePrivateKey())
  const forger = privateKeyToAccount(generatePrivateKey())
  const given = async () => (await call('GET', '/healthz')).body?.limits?.mint?.givenInWindow

  const get = await call('GET', '/me/mint')
  check('GET /me/mint → 405 (hanya POST)', get.status === 405, get.text.slice(0, 120))
  const noMsg = await call('POST', '/me/mint', { learner: learner.address, hash: B153 })
  check('tanpa pesan → 400', noMsg.status === 400, noMsg.text.slice(0, 160))
  const otherMsg = `lencana-records nonce=${nonce()}`
  const wrongPurpose = await call('POST', '/me/mint', { learner: learner.address, hash: B153, message: otherMsg, signature: await learner.signMessage({ message: otherMsg }) })
  check('tanda tangan sah untuk keperluan lain (records) → 400, tidak bisa dipakai mencetak', wrongPurpose.status === 400, wrongPurpose.text.slice(0, 160))
  const badLearner = await call('POST', '/me/mint', { ...(await signed(learner, B153)), learner: '0x123' })
  check('alamat peserta rusak → 400', badLearner.status === 400, badLearner.text.slice(0, 160))
  const badHash = await call('POST', '/me/mint', await signed(learner, '0x123'))
  check('hash kredensial rusak → 400', badHash.status === 400, badHash.text.slice(0, 160))

  if (env.ISSUER_ADDRESS) {
    const pubSeat = await call('POST', '/me/mint', { learner: env.ISSUER_ADDRESS, hash: B153, message: `lencana-mint nonce=${nonce()}`, signature: '0x' + '00'.repeat(65) })
    check('akun Penerbit → 403 (peran), sebelum tanda tangan dipakai', pubSeat.status === 403, pubSeat.text.slice(0, 160))
  } else console.log('  info  ISSUER_ADDRESS kosong — pemeriksaan akun Penerbit dilewati')

  const forged = await call('POST', '/me/mint', await signed(forger, B153, learner.address))
  check('tanda tangan kunci lain atas alamat peserta → 401', forged.status === 401, forged.text.slice(0, 160))
  check('…slot batas dikembalikan (0 pemberian tercatat)', (await given()) === 0, String(await given()))

  const req = await signed(learner, B153)
  const already = await call('POST', '/me/mint', req)
  check('tanda tangan sah atas kredensial yang sudah dicetak → 409 already + token B153 + lapis A',
    already.status === 409 && already.body?.kind === 'already' && already.body?.tokenId === B153_TOKEN && already.body?.cert === ARTIFACT_LAYER_97, already.text.slice(0, 200))
  const again = await call('POST', '/me/mint', req)
  check('tanda tangan yang SAMA dipakai lagi → 409 yang sama, bukan 401 replay (nonce dibebaskan karena ditolak)', again.status === 409 && again.body?.kind === 'already', again.text.slice(0, 200))
  check('tidak ada pemberian tercatat dari permintaan yang ditolak kontrak', (await given()) === 0, String(await given()))

  const nf = await call('POST', '/me/mint', await signed(learner, keccak256(stringToBytes('lencana-mint-check-tidak-ada'))))
  check('hash yang tidak ada di chain → 404 not-found', nf.status === 404 && nf.body?.kind === 'not-found', nf.text.slice(0, 200))
  const others = await call('POST', '/me/mint', await signed(learner, VALID_UNMINTED.find((h) => h !== B153)))
  check('kredensial sah milik orang lain → 403 not-yours (atau 409 already bila sudah dicetak pemiliknya)', others.status === 403 || (others.status === 409 && others.body?.kind === 'already'), others.text.slice(0, 200))
  const KEYS = ['error', 'kind', 'tokenId', 'cert']
  check('jawaban penolakan hanya memuat error, kind, tokenId, cert (tidak ada bidang lain)', [nf, others, already].every((x) => Object.keys(x.body ?? {}).every((k) => KEYS.includes(k))), JSON.stringify([nf.body, others.body, already.body]))

  const h = await call('GET', '/healthz')
  const lm = h.body?.limits?.mint
  check('/healthz: kuota cetak 5/IP + 60/hari bawaan, tanpa IP', lm?.perIp === 5 && lm?.perDay === 60 && lm?.givenInWindow === 0 && !/127\.0\.0\.1|::1/.test(JSON.stringify(lm)), JSON.stringify(lm))
} catch (e) {
  check('server 1 selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally { s1?.stop() }

let s2 = null
try {
  s2 = await boot({ MINT_PER_IP_DAY: '0' }, 8981)
  const forger = privateKeyToAccount(generatePrivateKey())
  const r = await s2.call('POST', '/me/mint', await signed(forger, B153, forger.address))
  check('MINT_PER_IP_DAY=0 → 429 "per-IP limit reached" sebelum tanda tangan dipakai (bukan 401)', r.status === 429 && /per-IP limit reached/.test(r.body?.error ?? '') && typeof r.body?.retryAt === 'string', r.text.slice(0, 200))
  const lm = (await s2.call('GET', '/healthz')).body?.limits?.mint
  check('/healthz mengikuti lingkungan (perIp 0, perDay 60)', lm?.perIp === 0 && lm?.perDay === 60, JSON.stringify(lm))
} catch (e) {
  check('server 2 selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally { s2?.stop() }

let s3 = null
try {
  s3 = await boot({ DEPLOYER_PRIVATE_KEY: '' }, 8991)
  const forger = privateKeyToAccount(generatePrivateKey())
  const r = await s3.call('POST', '/me/mint', await signed(forger, B153, forger.address))
  check('tanpa kunci platform di server → 503 "not configured", tanpa memakai tanda tangan', r.status === 503 && /not configured/.test(r.body?.error ?? ''), r.text.slice(0, 200))
} catch (e) {
  check('server 3 selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
} finally { s3?.stop() }

// ------------------------------------------------------------------------------------------------ D. --live
if (LIVE) {
  head('D. --live: terbitkan kredensial baru lalu cetak artefaknya lewat rute (gas testnet platform)')
  let s4 = null
  try {
    const COURSE = 'web3-dasar-2026'
    const manifest = manifestOf(COURSE)
    const quiz = manifest.course.modules.flatMap((m) => m.lessons).flatMap((l) => l.quiz?.questions ?? []).map(() => 100)
    const fresh = privateKeyToAccount(generatePrivateKey())
    const issued = spawnSync('npm', ['run', 'issue', '--', '--course', COURSE, '--learner', fresh.address, '--quiz', quiz.join(','), '--essay-score', '90'], {
      cwd: SIGNER, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024, env: { ...env, BASE_URL: (env.EDGE_BASE_URL || CREDENTIAL_HOST_DEFAULT).replace(/\/$/, ''), AGENT_SLUG: 'agent-edge' },
    })
    const out = `${issued.stdout ?? ''}${issued.stderr ?? ''}`
    const hash = /hash\s*:\s*(0x[0-9a-f]{64})/.exec(out)?.[1] ?? null
    check('kredensial baru terbit untuk kunci baru (exit 0, hash terbaca)', issued.status === 0 && !!hash, out.split('\n').slice(-4).join(' | '))
    if (hash) {
      console.log(`  info  peserta ${fresh.address} · kredensial ${hash}`)
      const before = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: parseAbi(['function tokenOfCredential(bytes32) view returns (uint256)']), functionName: 'tokenOfCredential', args: [hash] })
      check('sebelum diminta: belum ada artefak di lapis A', before === 0n, String(before))
      s4 = await boot({}, 9001)
      const asker = await signed(fresh, hash)
      const minted = await s4.call('POST', '/me/mint', asker)
      check('POST /me/mint → 200 minted, lapis A, token = uint256(hash), pemilik = kunci peserta, locked',
        minted.status === 200 && minted.body?.minted === true && minted.body?.cert === ARTIFACT_LAYER_97 && minted.body?.tokenId === String(BigInt(hash))
        && minted.body?.owner?.toLowerCase() === fresh.address.toLowerCase() && minted.body?.locked === true && /^0x[0-9a-f]{64}$/.test(minted.body?.tx ?? ''), minted.text.slice(0, 300))
      const abiA = parseAbi(['function ownerOf(uint256) view returns (address)', 'function locked(uint256) view returns (bool)', 'function tokenURI(uint256) view returns (string)', 'function tokenOfCredential(bytes32) view returns (uint256)'])
      const tokenId = BigInt(hash)
      const ownerOnChain = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: abiA, functionName: 'ownerOf', args: [tokenId] })
      const lockedOnChain = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: abiA, functionName: 'locked', args: [tokenId] })
      const uri = await pub.readContract({ address: ARTIFACT_LAYER_97, abi: abiA, functionName: 'tokenURI', args: [tokenId] })
      check('dibaca ulang dari chain: ownerOf = kunci peserta (bukan platform), locked = true', ownerOnChain.toLowerCase() === fresh.address.toLowerCase() && lockedOnChain === true, `${ownerOnChain} ${lockedOnChain}`)
      check('tokenURI memuat hash dan alamat dokumen di host tepi', uri.includes(hash) && uri.includes(`${CREDENTIAL_HOST_DEFAULT}/credentials/${hash}`), uri.slice(0, 200))
      const second = await s4.call('POST', '/me/mint', await signed(fresh, hash))
      check('permintaan kedua → 409 already dengan token yang sama (tidak ada gas kedua)', second.status === 409 && second.body?.kind === 'already' && second.body?.tokenId === String(tokenId), second.text.slice(0, 200))
      const hz = await s4.call('GET', '/healthz')
      check('/healthz: tepat satu pemberian tercatat (yang gagal tidak menghitung)', hz.body?.limits?.mint?.givenInWindow === 1, JSON.stringify(hz.body?.limits?.mint))
    }
  } catch (e) {
    check('bagian --live selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 300))
  } finally { s4?.stop() }
}

console.log(`\nCETAK ARTEFAK ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
