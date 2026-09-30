// Lencana-B97 status=SELESAI 2026-09-30 — mengadili rute relayer lewat HTTP: tanpa bendera tidak ada gas (yang sah diantrekan, yang pasti revert ditolak dengan sebabnya, chain dibaca ulang); dengan --live satu siaran nyata dari antrean dibaca balik dari chain. Buktikan ulang: npm run verify:relay, lalu npm run verify:relay:live. JANGAN dibalik/diulang tanpa membuka kembali baris B97 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:relay` — B97: relayer penerbitan sebagai layanan.
 *
 * Yang diuji adalah PINTUNYA, bukan primitifnya. `attestByDelegation` sudah terbukti di chain publik
 * oleh `npm run delegate`; yang baru adalah rute yang menerima tanda tangan agen dari luar proses.
 * Pertanyaan yang harus dijawab rute seperti itu bukan "apakah yang benar diterima" melainkan
 * "apakah yang salah ditolak SEBELUM platform membayar" — jadi sebagian besar pemeriksaan di bawah
 * adalah penolakan, dan tiap penolakan diperiksa sampai kode DAN sebabnya (penolakan yang kebetulan
 * benar tidak membuktikan apa pun — pelajaran T21/T22).
 *
 * Tidak ada transaksi: server dinyalakan TANPA `RELAY_BROADCAST`, store-nya di `os.tmpdir()`, dan
 * sesudah semuanya nonce agen serta `attestationOf` dibaca ulang dari chain — kalau ada yang tersiar,
 * dua pemeriksaan itu merah. Kunci agen dipakai hanya untuk menandatangani di dalam proses ini.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http, keccak256, toBytes } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { encodeCredentialData, readDelegationContext, signDelegatedAttestation } from '../src/delegation.js'
import { RELAY_MAX_BATCH, RELAY_MAX_DEADLINE_SECONDS } from '../src/relay.js'
import { credentialResolverAbi, EMPTY_UID } from '../../web/src/abi.ts'
import { credentialHashOf } from '../../web/src/content.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
const WARM_STATE = join(SIGNER, '.store', 'state.json')

await loadFileEnvReport('verify:relay')
const RPC = process.env.RPC_URL
const RESOLVER = process.env.RESOLVER_ADDRESS
const BAS = process.env.BAS_ADDRESS
const AGENT_PK = process.env.ISSUER_PRIVATE_KEY
if (!RPC || !RESOLVER || !BAS || !AGENT_PK) {
  console.error('verify:relay butuh RPC_URL + RESOLVER_ADDRESS + BAS_ADDRESS + ISSUER_PRIVATE_KEY di app/.env — ini bukan kegagalan uji, prasyaratnya belum ada')
  process.exit(2)
}

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { failed += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 200)}` : ''}`) }
}

const client = createPublicClient({ transport: http(RPC) })
const readResolver = (functionName, args = []) => client.readContract({ address: RESOLVER, abi: credentialResolverAbi, functionName, args })
const agent = privateKeyToAccount(AGENT_PK)
const stranger = generatePrivateKey()

const warmBefore = existsSync(WARM_STATE) ? statSync(WARM_STATE) : null
let issuedHash = null
if (warmBefore) {
  try {
    const st = JSON.parse(readFileSync(WARM_STATE, 'utf8'))
    issuedHash = Object.values(st.credentials ?? {}).map((c) => String(c.credentialHash ?? '')).find((h) => /^0x[0-9a-f]{64}$/i.test(h)) ?? null
  } catch { /* dilaporkan di pemeriksaan 409 */ }
}

const coldDir = mkdtempSync(join(tmpdir(), 'lencana-relay-'))
async function freePort (from) {
  for (let p = from; p < from + 14; p++) {
    try { await fetch(`http://127.0.0.1:${p}/healthz`, { signal: AbortSignal.timeout(600) }) } catch { return p }
  }
  return from
}
const PORT = Number(process.env.RELAY_PROBE_PORT ?? await freePort(8837))
const BASE = `http://127.0.0.1:${PORT}`
// `--live` = SATU siaran nyata dari antrean (gas testnet, dibayar kunci platform). Tanpa bendera itu
// tidak ada jalan bagi run ini untuk mengeluarkan gas: variabelnya dihapus dari lingkungan anak.
const LIVE = process.argv.includes('--live')
const childEnv = { ...process.env, LANCENA_STORE: coldDir, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE }
if (LIVE) childEnv.RELAY_BROADCAST = '1'
else delete childEnv.RELAY_BROADCAST
const child = spawn('npm', ['run', 'serve'], { cwd: SIGNER, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], shell: true })
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })

const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
async function call (method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
  return { status: res.status, body: parsed, text }
}

const finish = () => {
  if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  try { rmSync(coldDir, { recursive: true, force: true }) } catch { /* dibuang OS */ }
  console.log(`\nRELAY ${LIVE ? 'LIVE ' : ''}${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
  setTimeout(() => process.exit(failed === 0 ? 0 : 1), 300)
}

try {
  let health = null
  for (let i = 0; i < 60 && !health; i++) {
    try { health = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!health) await new Promise((r) => setTimeout(r, 500))
  }
  check('server naik dengan store dingin dan /healthz 200', health?.status === 200, health ? `HTTP ${health.status} ${health.text.slice(0, 120)}` : `tidak menjawab · ${errBuf.slice(-160)}`)
  if (health?.status !== 200) throw new Error('server tidak menjawab — sisa pemeriksaan tidak bisa dijalankan')
  check(LIVE
    ? '/healthz melaporkan relay terkonfigurasi dan siaran NYALA (run ini memang --live)'
    : '/healthz melaporkan relay terkonfigurasi dan siaran MATI (tidak ada gas yang bisa keluar dari run ini)',
  health.body?.relay?.configured === true && health.body?.relay?.broadcast === LIVE, json(health.body?.relay))

  const schema = await readResolver('schemaUID')
  const { domain, nonce } = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
  const now = (await client.getBlock({ blockTag: 'latest' })).timestamp
  const deadline = now + 900n
  const nonceBefore = BigInt(nonce)
  check('agen uji memang penerbit terdaftar di resolver (prasyarat jalur sah)', await readResolver('isIssuer', [agent.address]) === true, agent.address)

  // Peserta dan kursus diturunkan, tidak diketik (B49). Kursusnya label uji, jadi hash-nya tidak
  // pernah bisa bertabrakan dengan kertas sungguhan.
  const courseId = keccak256(toBytes('lencana-relay-probe'))
  const learner = (n) => privateKeyToAccount(keccak256(toBytes(`lencana-relay-probe-learner-${n}-${now}`))).address
  const entryFor = (who, extra = {}) => {
    const credentialHash = credentialHashOf(who, courseId)
    return {
      credentialHash,
      entry: {
        recipient: who, expirationTime: now + 86400n, revocable: true, refUID: EMPTY_UID,
        data: encodeCredentialData({ credentialHash, courseId }), value: 0n, ...extra,
      },
    }
  }
  const signAs = (pk, entry, n, dl = deadline, sch = schema) => signDelegatedAttestation({ agentPrivateKey: pk, domain, schema: sch, entry, nonce: n, deadline: dl })
  const wire = (signedEntries, over = {}) => ({
    schema, attester: agent.address, deadline,
    entries: signedEntries.map((s) => ({
      recipient: s.recipient, expirationTime: s.expirationTime, revocable: s.revocable, refUID: s.refUID,
      data: s.data, value: s.value, signature: s.signature,
    })),
    ...over,
  })

  // --- --live: satu siaran nyata dari antrean ------------------------------------------------
  if (LIVE) {
    const platform = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY)
    const agentBalBefore = await client.getBalance({ address: agent.address })
    const platBalBefore = await client.getBalance({ address: platform.address })
    const lv = entryFor(learner('live'))
    console.log(`  info  agen ${agent.address} · platform ${platform.address} · peserta uji ${lv.entry.recipient}`)
    console.log(`  info  credentialHash ${lv.credentialHash} (kursus label uji "lencana-relay-probe", bukan kertas katalog)`)
    const signedLv = await signAs(AGENT_PK, lv.entry, nonceBefore)
    const sent = await call('POST', '/relay', wire([signedLv]))
    check('permintaan sah -> 202, siaran enabled', sent.status === 202 && sent.body?.broadcast === 'enabled', `${sent.status} ${sent.text.slice(0, 160)}`)
    let job = null
    for (let i = 0; i < 60; i++) {
      job = (await call('GET', `/relay/${sent.body?.id}`)).body
      if (job && !['queued', 'broadcasting'].includes(job.state)) break
      await new Promise((r) => setTimeout(r, 2000))
    }
    check('pekerjaan berakhir confirmed dengan txHash tercatat', job?.state === 'confirmed' && /^0x[0-9a-f]{64}$/.test(job?.txHash ?? ''), json(job))
    console.log(`  info  tx ${job?.txHash} · gas ${job?.gasUsed} · blok ${job?.blockNumber}`)
    check('yang membayar adalah kunci platform (paidBy), bukan agen', String(job?.paidBy ?? '').toLowerCase() === platform.address.toLowerCase(), job?.paidBy)

    const uid = await readResolver('attestationOf', [lv.credentialHash])
    check('resolver kita mengindeks kredensialnya (attestationOf != 0)', uid !== EMPTY_UID, uid)
    console.log(`  info  uid ${uid}`)
    const st = await readResolver('statusOf', [lv.credentialHash])
    check('attester yang tercatat di chain = AGEN, bukan penyiar', st[4].toLowerCase() === agent.address.toLowerCase(), st[4])
    check('statusOf: exists, tidak dicabut, penerbit tidak didelisting', st[0] === true && st[1] === false && st[3] === false, json(st))
    check('holderOf = peserta yang ditandatangani agen', (await readResolver('holderOf', [lv.credentialHash])).toLowerCase() === lv.entry.recipient.toLowerCase())
    const agentBalAfter = await client.getBalance({ address: agent.address })
    const platBalAfter = await client.getBalance({ address: platform.address })
    check('saldo agen TIDAK berubah sampai wei (nol gas di sisi agen)', agentBalAfter === agentBalBefore, `${agentBalBefore} -> ${agentBalAfter}`)
    check('saldo platform turun (dialah yang membayar gas)', platBalAfter < platBalBefore, `${platBalBefore} -> ${platBalAfter}`)
    const ctxAfter = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
    check(`nonce agen naik tepat satu (${nonceBefore} -> ${ctxAfter.nonce})`, BigInt(ctxAfter.nonce) === nonceBefore + 1n, String(ctxAfter.nonce))

    // Inti RF6 butir 1: permintaan yang sama dikirim lagi TIDAK boleh menjadi siaran kedua.
    const replay = await call('POST', '/relay', wire([signedLv]))
    check('permintaan yang sama dikirim ulang -> 200, pekerjaan dan txHash yang sama',
      replay.status === 200 && replay.body?.duplicate === true && replay.body?.txHash === job?.txHash, `${replay.status} ${replay.text.slice(0, 160)}`)
    await new Promise((r) => setTimeout(r, 4000))
    const ctxReplay = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
    check('dan nonce agen tidak naik lagi (tidak ada siaran kedua)', BigInt(ctxReplay.nonce) === nonceBefore + 1n, String(ctxReplay.nonce))

    const coldState = join(coldDir, 'state.json')
    const adopted = existsSync(coldState) ? Object.values(JSON.parse(readFileSync(coldState, 'utf8')).watched ?? {}) : []
    check('kredensial diadopsi ke himpunan pantau store proses itu (tidak menunggu adopt.js)', adopted.map((h) => h.toLowerCase()).includes(lv.credentialHash.toLowerCase()), json(adopted))
    if (warmBefore) {
      const w = statSync(WARM_STATE)
      check('state.json hangat (19 kertas) tidak disentuh run ini', w.size === warmBefore.size && w.mtimeMs === warmBefore.mtimeMs, `${warmBefore.size}B -> ${w.size}B`)
    }
    finish()
    await new Promise(() => {})
  }

  // --- jalur sah ---------------------------------------------------------------------------
  const a = entryFor(learner(1))
  const signedA = await signAs(AGENT_PK, a.entry, nonceBefore)
  const first = await call('POST', '/relay', wire([signedA]))
  check('permintaan sah dari agen terdaftar -> 202 dan masuk antrean', first.status === 202 && first.body?.state === 'queued', `${first.status} ${first.text.slice(0, 160)}`)
  check('jawaban menyebut siaran mati dan belum ada txHash', first.body?.broadcast === 'disabled' && first.body?.txHash === null, json({ b: first.body?.broadcast, t: first.body?.txHash }))
  check('jawaban memuat credentialHash yang diturunkan dari data, bukan dari klaim klien',
    first.body?.credentialHashes?.[0] === a.credentialHash.toLowerCase(), json(first.body?.credentialHashes))

  const again = await call('POST', '/relay', wire([signedA]))
  check('permintaan yang SAMA dikirim ulang -> 200, pekerjaan yang sama, bukan antrean kedua',
    again.status === 200 && again.body?.duplicate === true && again.body?.id === first.body?.id, `${again.status} ${again.text.slice(0, 120)}`)

  const seen = await call('GET', `/relay/${first.body?.id}`)
  check('GET /relay/<id> membaca nasib pekerjaan itu', seen.status === 200 && seen.body?.state === 'queued' && seen.body?.firstNonce === String(nonceBefore), `${seen.status} ${seen.text.slice(0, 140)}`)

  // Nonce berikutnya diperhitungkan terhadap ANTREAN: chain belum bergerak, tapi satu entri menunggu.
  const b = entryFor(learner(2))
  const staleNonce = await call('POST', '/relay', wire([await signAs(AGENT_PK, b.entry, nonceBefore)]))
  check('permintaan kedua dengan nonce yang sudah dipakai antrean -> 401 menyebut nonce yang diharapkan',
    staleNonce.status === 401 && new RegExp(`nonce ${nonceBefore + 1n}\\b`).test(staleNonce.body?.error ?? ''), `${staleNonce.status} ${staleNonce.text.slice(0, 160)}`)

  const c = entryFor(learner(3))
  const batch = await call('POST', '/relay', wire([await signAs(AGENT_PK, b.entry, nonceBefore + 1n), await signAs(AGENT_PK, c.entry, nonceBefore + 2n)]))
  check('batch dua entri dengan nonce menaik sesudah antrean -> 202', batch.status === 202 && batch.body?.entries === 2 && batch.body?.firstNonce === String(nonceBefore + 1n), `${batch.status} ${batch.text.slice(0, 160)}`)

  const dupHash = await call('POST', '/relay', wire([await signAs(AGENT_PK, a.entry, nonceBefore + 3n, deadline + 1n)], { deadline: deadline + 1n }))
  check('kredensial yang sudah menunggu di antrean tidak bisa diantrekan lagi lewat permintaan lain -> 409 menyebut pekerjaan yang memegangnya',
    dupHash.status === 409 && (dupHash.body?.error ?? '').includes(first.body?.id), `${dupHash.status} ${dupHash.text.slice(0, 160)}`)

  // --- penolakan: siapa ---------------------------------------------------------------------
  const strangerAcc = privateKeyToAccount(stranger)
  const d = entryFor(learner(4))
  const byStranger = await signAs(stranger, d.entry, 0n)
  const notIssuer = await call('POST', '/relay', wire([byStranger], { attester: strangerAcc.address }))
  check('tanda tangan SAH dari kunci yang bukan penerbit terdaftar -> 403 menyebut resolver',
    notIssuer.status === 403 && /admitted issuer/.test(notIssuer.body?.error ?? ''), `${notIssuer.status} ${notIssuer.text.slice(0, 140)}`)

  const impersonate = await call('POST', '/relay', wire([await signAs(stranger, d.entry, nonceBefore + 3n)]))
  check('kunci asing menandatangani atas nama agen terdaftar -> 401 (tidak pulih ke attester)',
    impersonate.status === 401 && /does not recover/.test(impersonate.body?.error ?? ''), `${impersonate.status} ${impersonate.text.slice(0, 140)}`)

  const signedD = await signAs(AGENT_PK, d.entry, nonceBefore + 3n)
  const tampered = await call('POST', '/relay', wire([{ ...signedD, recipient: learner(5) }]))
  check('tanda tangan agen sah tapi penerima diganti sesudahnya -> 401', tampered.status === 401 && /does not recover/.test(tampered.body?.error ?? ''), `${tampered.status} ${tampered.text.slice(0, 140)}`)

  // --- penolakan: apa -----------------------------------------------------------------------
  const otherSchema = keccak256(toBytes('bukan-skema-kita'))
  const wrongSchema = await call('POST', '/relay', wire([await signAs(AGENT_PK, d.entry, nonceBefore + 3n, deadline, otherSchema)], { schema: otherSchema }))
  check('skema lain -> 422 (relayer tidak membayar gas untuk skema orang)', wrongSchema.status === 422 && /schema is not ours/.test(wrongSchema.body?.error ?? ''), `${wrongSchema.status} ${wrongSchema.text.slice(0, 140)}`)

  const noDeadline = await call('POST', '/relay', wire([await signAs(AGENT_PK, d.entry, nonceBefore + 3n, 0n)], { deadline: 0n }))
  check('deadline 0 -> 422 (delegasi tanpa tenggat = surat pembawa)', noDeadline.status === 422 && /never expires/.test(noDeadline.body?.error ?? ''), `${noDeadline.status} ${noDeadline.text.slice(0, 140)}`)

  const far = now + BigInt(RELAY_MAX_DEADLINE_SECONDS) + 600n
  const tooFar = await call('POST', '/relay', wire([await signAs(AGENT_PK, d.entry, nonceBefore + 3n, far)], { deadline: far }))
  check(`deadline lebih dari ${RELAY_MAX_DEADLINE_SECONDS} detik ke depan -> 422`, tooFar.status === 422 && /ahead of chain time/.test(tooFar.body?.error ?? ''), `${tooFar.status} ${tooFar.text.slice(0, 140)}`)

  const past = await call('POST', '/relay', wire([await signAs(AGENT_PK, d.entry, nonceBefore + 3n, now - 60n)], { deadline: now - 60n }))
  check('deadline yang sudah lewat -> 422', past.status === 422 && /has passed/.test(past.body?.error ?? ''), `${past.status} ${past.text.slice(0, 140)}`)

  const withValue = await call('POST', '/relay', wire([{ ...signedD, value: 1n }]))
  check('value != 0 -> 422 (platform menalangi gas, bukan nilai)', withValue.status === 422 && /value must be 0/.test(withValue.body?.error ?? ''), `${withValue.status} ${withValue.text.slice(0, 140)}`)

  const shortData = await call('POST', '/relay', wire([{ ...signedD, data: '0x1234' }]))
  check('data bukan 96 byte -> 422 sebelum chain disentuh', shortData.status === 422 && /exactly 96 bytes/.test(shortData.body?.error ?? ''), `${shortData.status} ${shortData.text.slice(0, 140)}`)

  const many = Array.from({ length: RELAY_MAX_BATCH + 1 }, () => signedD)
  const tooMany = await call('POST', '/relay', wire(many))
  check(`${RELAY_MAX_BATCH + 1} entri -> 422 menyebut batasnya`, tooMany.status === 422 && new RegExp(`${RELAY_MAX_BATCH} entries`).test(tooMany.body?.error ?? ''), `${tooMany.status} ${tooMany.text.slice(0, 140)}`)

  const empty = await call('POST', '/relay', wire([]))
  check('entries kosong -> 422', empty.status === 422, `${empty.status} ${empty.text.slice(0, 120)}`)

  if (issuedHash) {
    const taken = { recipient: learner(6), expirationTime: now + 86400n, revocable: true, refUID: EMPTY_UID, data: encodeCredentialData({ credentialHash: issuedHash, courseId }), value: 0n }
    const already = await call('POST', '/relay', wire([await signAs(AGENT_PK, taken, nonceBefore + 3n)]))
    check('kredensial yang SUDAH terbit di chain -> 409 menyebut uid-nya (AlreadyIssued dicegat sebelum gas)',
      already.status === 409 && /already issued/.test(already.body?.error ?? ''), `${already.status} ${already.text.slice(0, 160)}`)
  } else {
    check('kredensial yang sudah terbit -> 409', false, 'tidak ada hash terbit di .store/state.json untuk diuji — pemeriksaan ini tidak boleh dilewati diam-diam')
  }

  const wrongMethod = await call('GET', '/relay')
  check('GET /relay -> 405', wrongMethod.status === 405, `${wrongMethod.status}`)
  const unknown = await call('GET', `/relay/0x${'ab'.repeat(32)}`)
  check('GET /relay/<id asing> -> 404', unknown.status === 404, `${unknown.status}`)

  // --- yang membuat semua di atas berarti: tidak ada yang tersiar ---------------------------
  const after = await readDelegationContext({ rpcUrl: RPC, basAddress: BAS, attester: agent.address })
  check('nonce agen di chain TIDAK berubah (tidak ada delegasi yang tersiar)', BigInt(after.nonce) === nonceBefore, `${nonceBefore} -> ${after.nonce}`)
  const stillEmpty = await Promise.all([a, b, c].map((x) => readResolver('attestationOf', [x.credentialHash])))
  check('attestationOf ketiga kredensial uji tetap kosong di chain', stillEmpty.every((u) => u === EMPTY_UID), json(stillEmpty))

  const health2 = await call('GET', '/healthz')
  check('/healthz menghitung dua pekerjaan menunggu, nol tersiar', health2.body?.relay?.jobs?.queued === 2 && Object.keys(health2.body?.relay?.jobs ?? {}).length === 1, json(health2.body?.relay?.jobs))

  const queuePath = join(coldDir, 'relay-queue.json')
  check('antrean ditulis ke store uji, bukan ke repo', existsSync(queuePath) && !existsSync(join(SIGNER, '.store', 'relay-queue.json')) , queuePath)
  if (warmBefore) {
    const now2 = statSync(WARM_STATE)
    check('state.json hangat tidak berubah ukuran/mtime', now2.size === warmBefore.size && now2.mtimeMs === warmBefore.mtimeMs, `${warmBefore.size}B -> ${now2.size}B`)
  } else {
    console.log('  info  tidak ada .store/state.json hangat di mesin ini — pemeriksaan proteksinya tidak berlaku')
  }
  check('server masih hidup sesudah semua penolakan', child.exitCode === null, `exit=${child.exitCode}`)
  finish()
} catch (e) {
  console.log(`  BATAL ${String(e?.message ?? e).slice(0, 200)}`)
  failed += 1
  finish()
}
