/**
 * `npm run e2e` — satu lintasan end-to-end: chain 97 sebagai sumber kebenaran → tepi sajian publik →
 * lapis artefak (NFT) → validator pihak ketiga, plus jalur negatif yang justru inti produknya.
 *
 * Kenapa berkas ini ada padahal sudah ada `check.js`, `serve-probe.js`, `publish:edge`,
 * `verify:live-cert`, `verify:edge`: masing-masing membuktikan SATU LAPIS. Yang tidak dibuktikan
 * siapa-siapa adalah **bahwa lapisan-lapisan itu menunjuk benda yang sama pada saat yang sama** —
 * dan itu persis kalimat penjualan kami ("statusnya terbaca dari chain, dokumennya terbuka untuk
 * siapa pun, dan yang di wallet adalah ijazah yang sama"). Retakan di ANTARA lapisan (URL kertas
 * != URL di NFT, daftar yang disajikan != bit di chain, hash yang dianchor != hash yang disajikan)
 * tidak akan pernah kelihatan dari dalam satu lapis mana pun.
 *
 * Aturan yang dipertahankan dari harness lain: tidak ada address/hash yang diketik di berkas ini.
 * Yang diuji diambil dari buku besar validator, dari store, dan dari chain.
 *
 * Opsi:
 *   --skip-validator   lewati `vc.1ed.tech` (hemat ~90 detik; jangan kutip "lolos validator" kalau
 *                      mode ini dipakai, dan harness ini tidak akan berpura-pura sebaliknya)
 *   E2E_PORT=8799      port server lokal sementara (default 8799 supaya tidak menabrak `npm run serve`)
 */
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createPublicClient, http } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { EDGE_ROUTES, PURPOSES } from '../src/edgeKeys.js'
import { REVOCATION, SUSPENSION, decodeBit, LIST_BITS } from '../src/statusList.js'
import { listCredentials } from '../src/store.js'
import { makeDocumentLoader, verifyDocument } from '../src/sign.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SKIP_VALIDATOR = process.argv.includes('--skip-validator')
const PORT = Number(process.env.E2E_PORT ?? 8799)
const LOCAL = `http://127.0.0.1:${PORT}`

await loadFileEnvReport('e2e')
const env = process.env
const missing = ['RPC_URL', 'RESOLVER_ADDRESS', 'BAS_ADDRESS', 'EDGE_BASE_URL', 'LIVE_CERT_ADDRESS']
  .filter((k) => !env[k])
if (missing.length) {
  console.error(`e2e berhenti: ${missing.join(', ')} belum diisi (lihat .env.example)`)
  process.exit(2)
}
const RPC = env.RPC_URL
const RESOLVER = env.RESOLVER_ADDRESS
const BAS = env.BAS_ADDRESS
const EDGE = env.EDGE_BASE_URL.replace(/\/$/, '')
const LIVE_CERT = env.LIVE_CERT_ADDRESS
// Sama seperti fetch: satu panggilan RPC yang menggantung tidak boleh membuat lintasan terlihat
// "masih jalan" selamanya.
const client = createPublicClient({ transport: http(RPC, { timeout: 20_000, retryCount: 2, retryDelay: 400 }) })

let ran = 0
let fails = 0
function check (name, ok, detail = '') {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 160)}` : ''}`) }
  return ok
}

/** ABI seadanya: hanya fungsi yang benar-benar kita panggil. */
const abi = (name, inputs, outputs) => [{ type: 'function', name, stateMutability: 'view', inputs, outputs }]
const B32 = { type: 'bytes32' }
const ADDR = { type: 'address' }
const U256 = { type: 'uint256' }
const BOOL = { type: 'bool' }
const U64 = { type: 'uint64' }
const ABI_STATUS_OF = abi('statusOf', [B32], [BOOL, BOOL, BOOL, BOOL, ADDR, U64, U64])
const ABI_HOLDER_OF = abi('holderOf', [B32], [ADDR])
const ABI_IS_ISSUER = abi('isIssuer', [ADDR], [BOOL])
const ABI_ATTEST_OF = abi('attestationOf', [B32], [B32])
const ABI_PREREQ_OF = abi('prerequisiteOf', [B32], [B32])
const ABI_TIMESTAMP = abi('getTimestamp', [B32], [{ type: 'uint96' }])
const ABI_TOKEN_OF = abi('tokenOfCredential', [B32], [U256])
const ABI_OWNER_OF = abi('ownerOf', [U256], [ADDR])
const ABI_TOKEN_URI = abi('tokenURI', [U256], [{ type: 'string' }])

async function getJson (base, path, init = {}) {
  try {
    // Tanpa batas waktu, satu koneksi yang menggantung membuat seluruh lintasan diam selamanya --
    // dan harness yang diam tidak kelihatan merah, ia kelihatan "masih jalan".
    const r = await fetch(base + path, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(fetchMs(init)),
      ...init,
    })
    let body = null
    try { body = await r.json() } catch { /* bukan JSON: dilaporkan sebagai kegagalan, bukan nol */ }
    return { status: r.status, body }
  } catch (e) {
    return { status: 0, body: null, error: String(e.message ?? e) }
  }
}
function fetchMs (init) {
  return typeof init?.timeoutMs === 'number' ? init.timeoutMs : 20000
}

/**
 * Anak yang diluncurkan lewat `shell:true` di Windows adalah cmd.exe yang memegang npm/tsx di
 * belakangnya: `child.kill()` hanya mematikan cangkangnya dan meninggalkan server yang menyandang
 * port, lalu run berikutnya gagal dengan EADDRINUSE dan orang menyalahkan harness-nya, bukan mesinnya.
 */
function killTree (p) {
  if (!p || typeof p.pid !== 'number') return
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
    else p.kill('SIGKILL')
  } catch { /* biar OS yang membereskan */ }
}

/** bitstring yang disajikan -> panjang sebenarnya, dari gzip, bukan dari angka di dokumen. */
function bitLengthOf (encodedList) {
  if (typeof encodedList !== 'string' || !encodedList.startsWith('u')) return 0
  const raw = Buffer.from(encodedList.slice(1), 'base64url')
  return gunzipSync(raw).length * 8
}
function entryOf (doc, purpose) {
  const cs = doc?.credentialStatus
  if (!cs) return null
  if (Array.isArray(cs)) return cs.find((e) => e?.statusPurpose === purpose) ?? null
  return cs.statusPurpose === purpose ? cs : null
}

console.log(`\n  chain   : 97 · ${RPC}`)
console.log(`  resolver: ${RESOLVER}`)
console.log(`  tepi    : ${EDGE}`)
console.log(`  nft     : ${LIVE_CERT}`)

// ------------------------------------------------------------------ bahan: buku besar + store
const ledger = (await readFile(resolve(HERE, '../../vault/09-Testing/validator-runs.jsonl'), 'utf8'))
  .trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
const durableValid = new Map()
for (const r of ledger) {
  if (r.outcome !== 'VALID' || typeof r.docUrl !== 'string') continue
  if (!r.docUrl.startsWith(`${EDGE}/credentials/`)) continue
  durableValid.set(String(r.credentialHash).toLowerCase(), r)
}
if (durableValid.size === 0) {
  console.error('tidak ada satu pun kredensial VALID di bawah tepi - jalankan npm run validator lebih dulu')
  process.exit(1)
}
console.log(`  kertas tahan-lama: ${durableValid.size} · ${[...durableValid.keys()].map((h) => h.slice(0, 10)).join(', ')}`)

const [showcaseHash, showcaseRow] = [...durableValid.entries()][0]

// ------------------------------------------------------------------ [1] chain = sumber kebenaran
console.log('\n[1] chain 97 — apa yang benar menurut state, bukan menurut catatan kami')
const st = await client.readContract({ address: RESOLVER, abi: ABI_STATUS_OF, functionName: 'statusOf', args: [showcaseHash] })
const [exists, isRevoked, isExpired, isDelisted, onChainIssuer] = st
check('kredensial showcase dikenal resolver', exists === true)
check('showcase saat ini tidak tercabut/tangguh/kadaluarsa (kalau berubah, uji di bawah berubah makna)',
  !isRevoked && !isDelisted && !isExpired, JSON.stringify({ isRevoked, isDelisted, isExpired }))
const holderFromChain = await client.readContract({ address: RESOLVER, abi: ABI_HOLDER_OF, functionName: 'holderOf', args: [showcaseHash] })
// `holderOf` bukan duplikat field kelima `statusOf` - field itu adalah ISSUER
// (`ICredentialRegistry.sol:17-29`; interface-nya sendiri menulis `holderOf` ada supaya artefak tidak
// di-mint untuk orang yang salah). Versi pertama harness ini membandingkan keduanya dan menuntut
// "merah" dari chain yang sebenarnya benar - asumsiku yang salah, bukan statenya.
const whitelisted = await client.readContract({ address: RESOLVER, abi: ABI_IS_ISSUER, functionName: 'isIssuer', args: [onChainIssuer] })
check(`penerbit yang tercatat di chain (${onChainIssuer.slice(0, 10)}…) ada di whitelist resolver`, whitelisted === true)
const uid = await client.readContract({ address: RESOLVER, abi: ABI_ATTEST_OF, functionName: 'attestationOf', args: [showcaseHash] })
check('attestationOf mengembalikan uid non-nol', BigInt(uid ?? 0) !== 0n, String(uid))

const hz = await getJson(EDGE, EDGE_ROUTES.healthz)
if (!check('tepi menjawab /healthz', hz.status === 200 && hz.body?.ok === true, `${hz.status}${hz.error ? ' ' + hz.error : ''}`)) {
  console.log('\nE2E MERAH — tepi tidak menjawab, sisa pemeriksaan tidak ada artinya')
  process.exit(1)
}
for (const purpose of PURPOSES) {
  const listHash = hz.body?.[purpose]?.hash
  if (!check(`healthz melaporkan hash ${purpose}`, typeof listHash === 'string' && listHash.startsWith('0x'), String(listHash))) continue
  const seal = await client.readContract({ address: BAS, abi: ABI_TIMESTAMP, functionName: 'getTimestamp', args: [listHash] })
  check(`daftar ${purpose}: hash yang kita sajikan tersegel di BAS (getTimestamp > 0)`, BigInt(seal ?? 0) > 0n, `segel=${seal}`)
}

// ------------------------------------------------------------------ [2] tepi: yang dilihat orang asing
console.log('\n[2] tepi sajian — dibaca lewat internet, dengan kunci yang diambil dari tepi itu juga')
const docRes = await getJson(EDGE, EDGE_ROUTES.credential(showcaseHash))
const doc = docRes.body
if (!check('dokumen kredensial tersaji 200 dari tepi', docRes.status === 200 && !!doc?.proof, `${docRes.status}`)) {
  console.log('\nE2E MERAH — tanpa kertas, tidak ada yang bisa dilanjutkan')
  process.exit(1)
}
check('@context = VC 2.0 lalu OB 3.0.3, dan type memuat OpenBadgeCredential',
  Array.isArray(doc['@context']) && doc['@context'][0] === 'https://www.w3.org/ns/credentials/v2'
  && (doc.type ?? []).includes('OpenBadgeCredential'))
check('credentialStatus satu objek purpose revocation (skema menolak array)',
  !Array.isArray(doc.credentialStatus) && doc.credentialStatus?.statusPurpose === REVOCATION)
check('di dalam kertas tidak ada URL loopback atau host tunnel',
  !/127\.0\.0\.1|localhost|trycloudflare/.test(JSON.stringify(doc)))

// Chain vs kertas: siapa yang memegang. Alamat peserta dicetak di `credentialSubject.id` sebagai
// `<host>/learners/0x...` (lihat `src/credential.js:82`) - jadi ini perbandingan nyata antara dua
// sumber yang tidak saling mengenal, bukan getter yang sama dibaca dua kali.
const learnerInDoc = /\/learners\/(0x[0-9a-fA-F]{40})$/.exec(String(doc.credentialSubject?.id ?? ''))?.[1]
if (check('kertas menyebut alamat peserta lewat credentialSubject.id', !!learnerInDoc, String(doc.credentialSubject?.id))) {
  check('holderOf di chain == peserta yang dicetak kertas (chain dan kertas menyebut orang yang sama)',
    holderFromChain.toLowerCase() === learnerInDoc.toLowerCase(), `${holderFromChain} vs ${learnerInDoc}`)
}

const vmUrl = String(doc.proof?.verificationMethod ?? '')
const issPath = vmUrl ? decodeURIComponent(new URL(vmUrl).pathname) : ''
const issRes = await getJson(EDGE, issPath)
const issDoc = issRes.body
if (check('issuer document tersaji di URL yang dicetak kertas', issRes.status === 200 && !!issDoc?.assertionMethod, `${issRes.status} ${issPath}`)) {
  const key = (issDoc.assertionMethod ?? []).find((m) => m.id === vmUrl)
  check('kunci di verificationMethod ada di assertionMethod issuer (sumber kunci verifier)', !!key, vmUrl)
  const loader = makeDocumentLoader({ [issDoc.id]: issDoc, [vmUrl]: key })
  let v = null
  try { v = await verifyDocument(doc, { controllerDocument: issDoc, documentLoader: loader }) } catch (e) { v = { verified: false, error: e.message } }
  check('tanda tangan SAH terhadap kunci yang diambil lewat HTTP, bukan kunci yang kita simpan',
    v?.verified === true, v?.error ?? JSON.stringify(v?.results ?? ''))

  const forged = JSON.parse(JSON.stringify(doc))
  const nm = forged.credentialSubject?.achievement
  if (nm) nm.name = `${String(nm.name ?? '')} (palsu)`
  let vf = null
  try { vf = await verifyDocument(forged, { controllerDocument: issDoc, documentLoader: loader }) } catch { vf = { verified: false } }
  check('satu kata yang diubah di isi kertas membatalkan tanda tangan', vf?.verified !== true)
}

for (const u of [
  doc.credentialStatus?.statusListCredential,
  doc.issuer?.id ?? (typeof doc.issuer === 'string' ? doc.issuer : null),
  doc.achievement?.criteria?.id,
  (Array.isArray(doc.result) ? doc.result[0]?.id : doc.result?.id),
].filter((x) => typeof x === 'string' && x.startsWith('http'))) {
  const p = decodeURIComponent(new URL(u).pathname)
  const r = await getJson(EDGE, p)
  check(`URL yang dicetak di kertas menjawab dari host yang sama: ${p.slice(0, 44)}${p.length > 44 ? '…' : ''}`, r.status === 200, `${r.status}`)
}

// ------------------------------------------------------------------ [3] bit: chain vs daftar tersaji
console.log('\n[3] bit status — daftar yang disajikan harus sama dengan chain, sekarang juga')
const idx = Number(doc.credentialStatus?.statusListIndex ?? -1)
for (const purpose of PURPOSES) {
  const list = (await getJson(EDGE, EDGE_ROUTES.list(purpose))).body
  if (!check(`daftar ${purpose} tersaji sebagai BitstringStatusListCredential bertanda tangan`,
    (list?.type ?? []).includes('BitstringStatusListCredential') && !!list?.proof)) continue
  const encoded = list?.credentialSubject?.encodedList
  const bits = bitLengthOf(encoded)
  check(`daftar ${purpose}: panjang bitstring sesungguhnya >= minimum BSL ${LIST_BITS}`, bits >= LIST_BITS, `terukur ${bits} bit`)
  const want = purpose === REVOCATION ? isRevoked : (isDelisted && !isRevoked)
  const bit = decodeBit(encoded, idx)
  check(`${purpose}: bit showcase pada indeks ${idx} == keadaan chain sekarang (${want ? 1 : 0})`,
    bit === (want ? 1 : 0), `tersaji=${bit} chain=${want ? 1 : 0}`)
}
check('tepi sendiri mengklaim kedua daftar cocok dengan chain saat ini',
  hz.body?.[REVOCATION]?.matchesChainNow === true && hz.body?.[SUSPENSION]?.matchesChainNow === true,
  JSON.stringify({ rev: hz.body?.[REVOCATION]?.matchesChainNow, sus: hz.body?.[SUSPENSION]?.matchesChainNow }))

// ------------------------------------------------------------------ [4] artefak: yang dilihat wallet
console.log('\n[4] lapis artefak — yang dibuka orang di wallet dan explorer')
const tokenId = await client.readContract({ address: LIVE_CERT, abi: ABI_TOKEN_OF, functionName: 'tokenOfCredential', args: [showcaseHash] })
if (check('showcase punya artefak di LIVE_CERT_ADDRESS', tokenId > 0n, String(tokenId))) {
  const owner = await client.readContract({ address: LIVE_CERT, abi: ABI_OWNER_OF, functionName: 'ownerOf', args: [tokenId] })
  check('artefak dimiliki peserta yang sama dengan holderOf di chain', owner.toLowerCase() === holderFromChain.toLowerCase(), `${owner} vs ${holderFromChain}`)
  const uriRaw = await client.readContract({ address: LIVE_CERT, abi: ABI_TOKEN_URI, functionName: 'tokenURI', args: [tokenId] })
  const meta = JSON.parse(uriRaw)
  check('artefak menunjuk PERSIS URL kertas yang diikuti validator saat ia berkata VALID',
    meta.external_url === showcaseRow.docUrl, String(meta.external_url))
  const trait = (meta.attributes ?? []).find((a) => a.trait_type === 'Credential status')?.value
  const word = isRevoked ? 'REVOKED' : (isExpired ? 'EXPIRED' : (isDelisted ? 'ISSUER_DELISTED' : 'VALID'))
  check(`metadata menyebut status yang chain katakan sekarang (${word}) — dirakit per panggilan, bukan beku`,
    String(trait) === word, `metadata=${trait}`)
  check('metadata artefak bebas URL sementara', !/127\.0\.0\.1|localhost|trycloudflare/.test(uriRaw))
}
const prereq = await client.readContract({ address: RESOLVER, abi: ABI_PREREQ_OF, functionName: 'prerequisiteOf', args: [uid] })
console.log(`  info  prerequisiteOf(uid showcase) = ${BigInt(prereq ?? 0) === 0n ? 'kosong (kertas ini tidak merantai prasyarat di chain — B55)' : prereq}`)

// ------------------------------------------------------------------ [5] server lokal + jalur negatif
console.log('\n[5] server signer — rute gratis, penolakan berbayar, dan penolakan hash asing')
const child = spawn('npm', ['run', 'serve'], {
  cwd: resolve(HERE, '..'),
  env: { ...process.env, PORT: String(PORT), BASE_URL: EDGE },
  stdio: ['ignore', 'ignore', 'pipe'],
  shell: true,
})
let errBuf = ''
child.stderr?.on('data', (d) => { errBuf += d.toString() })
child.on('error', (e) => { errBuf += String(e.message ?? e) })
let up = false
for (let i = 0; i < 60 && !up; i++) {
  const r = await getJson(LOCAL, '/healthz')
  up = r.status === 200
  if (!up) await new Promise((res) => setTimeout(res, 500))
}
if (check('server lokal naik di port sendiri (loopback saja)', up, errBuf.slice(0, 200))) {
  const free = await getJson(LOCAL, `/credentials/${showcaseHash}`)
  check('rute dokumen gratis menjawab 200 dengan kertas yang sama seperti di tepi',
    free.status === 200 && free.body?.proof?.verificationMethod === vmUrl, `${free.status}`)

  const unpaid = await fetch(`${LOCAL}/verify`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credentialHashes: [showcaseHash] }),
    signal: AbortSignal.timeout(25000),
  }).catch((e) => ({ status: 0, json: async () => null, err: String(e.message ?? e) }))
  const body402 = await unpaid.json().catch(() => null)
  check('POST /verify tanpa pembayaran -> 402 dengan accepts[] (bukan 200 diam-diam)',
    unpaid.status === 402 && Array.isArray(body402?.accepts) && body402.accepts.length > 0,
    `${unpaid.status}${unpaid.err ? ' ' + unpaid.err : ''}`)

  const zeros = '0x0000000000000000000000000000000000000000000000000000000000000000'
  const ghost = await getJson(LOCAL, `/credentials/${zeros}`)
  check('hash yang tidak dikenal -> 404/410, bukan 500', ghost.status === 404 || ghost.status === 410, `${ghost.status}`)
  const ghostEdge = await getJson(EDGE, `/credentials/${zeros.replace('000000', 'dead00')}`)
  check('di tepi pun hash asing -> 404 dengan petunjuk rute, bukan 500', ghostEdge.status === 404, `${ghostEdge.status}`)
  const noList = await getJson(EDGE, '/credentials/status/tidak-ada')
  check('purpose yang tidak ada -> 404, bukan daftar kosong yang terlihat sah', noList.status === 404, `${noList.status}`)
} else {
  console.log('  info  server lokal tidak naik dalam 30s - pemeriksaan rute gratis/berbayar DILEWATI, bukan dihitung lulus')
  ran += 1; fails += 1
  console.log(`  GAGAL server lokal naik (pemeriksaan [5] dilewati) -> ${errBuf.slice(0, 160)}`)
}

// kredensial yang dicabut: untuk SETIAP kertas di store yang chain-nya bilang revoked, bit yang
// kami sajikan harus 1. Dulu harness ini mencari SATU record dan berhenti di situ - kalau yang
// pertama kebetulan yang masih valid, pemeriksaan "cabut" jadi info yang lembut, bukan bukti.
const records = await listCredentials()
let revokedSeen = 0
let revokedWrong = 0
for (const rec of records) {
  const e = entryOf(rec?.document, REVOCATION)
  if (!rec?.document || !e) continue
  const h = String(rec.credentialHash).toLowerCase()
  let s = null
  try { s = await client.readContract({ address: RESOLVER, abi: ABI_STATUS_OF, functionName: 'statusOf', args: [h] }) } catch { continue }
  if (!(s[0] && s[1])) continue
  revokedSeen += 1
  const list = (await getJson(EDGE, EDGE_ROUTES.list(REVOCATION))).body
  const idx = Number(e.statusListIndex ?? -1)
  const bit = decodeBit(list?.credentialSubject?.encodedList, idx)
  if (bit !== 1) {
    revokedWrong += 1
    console.log(`  GAGAL kredensial tercabut ${h.slice(0, 10)}…: bit yang disajikan = ${bit}, chain = 1 (indeks ${idx})`)
  } else {
    console.log(`  ok    kredensial tercabut ${h.slice(0, 10)}…: bit tersaji = 1 pada indeks ${idx}`)
  }
  ran += 1
  if (bit !== 1) fails += 1
}
if (revokedSeen === 0) {
  console.log('  info  tidak ada kertas di store yang revoked di chain - jalur cabut TIDAK diuji di run ini, dan itu tidak dihitung lulus')
  ran += 1; fails += 1
}
killTree(child)

// ------------------------------------------------------------------ [6] pihak ketiga
console.log('\n[6] validator pihak ketiga — vc.1ed.tech')
if (SKIP_VALIDATOR) {
  console.log('  info  DILEWATI (--skip-validator): jangan kutip "lolos validator" dari run ini')
} else {
  const v = await new Promise((res) => {
    const p = spawn('npm', ['run', 'validator', '--', '--hash', showcaseHash, '--record'], {
      cwd: resolve(HERE, '..'), env: { ...process.env, BASE_URL: EDGE }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
    })
    let out = ''
    let done = false
    const finish = (code) => {
      if (done) return
      done = true
      clearTimeout(watch)
      res({ code, out })
    }
    // Anjing-jaga: validator pihak ketiga adalah satu-satunya pemeriksaan yang bergantung pada
    // mesin ORANG LAIN. Tanpa batas waktu, diam mereka jadi diam kita, dan log kita tidak
    // membedakan "sedang jalan" dari "tidak akan pernah selesai".
    const watch = setTimeout(() => {
      out += '\n(watchdog: 240s lewat - anak ditembak, hasil dicatat MERAH, bukan digantung)'
      killTree(p)
      finish(-1)
    }, 240000)
    p.stdout.on('data', (d) => { out += d.toString() })
    p.stderr.on('data', (d) => { out += d.toString() })
    p.on('close', (code) => finish(code))
    p.on('error', (e) => { out += String(e.message ?? e); finish(-2) })
  })
  const m = /outcome[:\s]+([A-Z_]+)/.exec(v.out)
  check('validator asing berkata VALID untuk kertas yang sama, dibaca dari tepi',
    v.code === 0 && m?.[1] === 'VALID', `exit=${v.code} outcome=${m?.[1] ?? '?'}`)
}

console.log(`\n${fails === 0 ? 'E2E HIJAU' : 'E2E MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
console.log('Yang dijaga lintasan ini: chain == daftar yang disajikan == URL di dalam kertas == artefak di')
console.log('wallet == verdict pihak ketiga. Satu lapis yang hijau sendiri TIDAK membuktikan kelimanya')
console.log('menunjuk benda yang sama.')
process.exitCode = fails === 0 ? 0 : 1
