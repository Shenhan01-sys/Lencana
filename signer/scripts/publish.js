/**
 * `npm run publish` — mendorong hasil signer ke tepi sajian permanen (Workers KV), lalu
 * MEMBACANYA KEMBALI LEWAT WORKER untuk membuktikan rute dan isinya benar.
 *
 * Kenapa verifikasi lewat HTTP dan bukan lewat KV: yang kita janjikan ke dunia adalah URL di dalam
 * kredensial, dan URL itu dilayani worker. Membaca KV hanya membuktikan "blobnya tersimpan";
 * worker membuktikan "alamat yang tercetak di ijazah menjawab". Selisih prefiks antara penulis dan
 * pembaca — jenis bug yang menghasilkan 404 atas dokumen yang ada — hanya kelihatan di jalur kedua.
 *
 * Yang TIDAK dilakukan di sini: menandatangani apa pun. Tanda tangan dibuat di Node (kanonikalisasi
 * JSON-LD + Ed25519, 133 ms terukur), dan tepi hanya menyajikannya sambil mencocokkan bit dengan
 * chain saat permintaan masuk — lihat cloudflare/worker.mjs.
 *
 * Persyaratan: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID di lingkungan (BUKAN di .env, dan
 * jangan pernah di argv), EDGE_BASE_URL (URL worker yang sudah ter-deploy), dan KV namespace id di
 * cloudflare/wrangler.toml.
 */

// Lencana-B83 status=SELESAI 2026-09-29 — dokumen penerbit dirakit dari satu sumber identitas sebelum disajikan. Buktikan ulang: npm run publish:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B83 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { toFunctionSelector, getAddress } from 'viem'

import { agentAt, issuerDocumentFor, listAgents, loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader } from '../src/sign.js'
import { renderList, servedHashes, REVOCATION, SUSPENSION } from '../src/lists.js'
import { listCredentials, knownHashes } from '../src/store.js'
import { criteriaDocument } from '../src/criteria.js'
import { resultDocument } from '../src/results.js'
import { manifestOf, rubricHashOf, manifestHashOf, MANIFESTS } from '../../web/src/manifest.ts'
import { KV_KEYS, EDGE_ROUTES, PURPOSES } from '../src/edgeKeys.js'
import { loadFileEnvReport } from '../src/env.js'

const HERE = dirname(fileURLToPath(import.meta.url))

// Satu mekanisme pemuatan env untuk semua perkakas (`src/env.js`), bukan parser kedua di sini:
// dua cara memuat konfigurasi adalah dua cara yang bisa berbeda, dan perbedaannya baru kelihatan
// sebagai 404 di URL yang diklik orang.
//
// KECUALI untuk Cloudflare, dan itu ditegakkan di urutan baris, bukan di komentar: token dan id
// akun dibaca SEBELUM berkas di-load, jadi kredensial yang ditaruh di `app/.env` tidak akan pernah
// dipakai — `.env` adalah berkas yang suatu hari bisa ter-commit, dan ini akun milik orang.
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID
await loadFileEnvReport('publish')
const env = process.env
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'
const RESOLVER = env.RESOLVER_ADDRESS
const SLUG = env.AGENT_SLUG || 'agent-demo'
const BASE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')

const missing = []
if (!CF_TOKEN) missing.push('CLOUDFLARE_API_TOKEN')
if (!CF_ACCOUNT) missing.push('CLOUDFLARE_ACCOUNT_ID')
if (!BASE) missing.push('EDGE_BASE_URL')
if (!RESOLVER) missing.push('RESOLVER_ADDRESS (di .env)')
if (missing.length) {
  console.error(`tidak bisa menerbitkan: ${missing.join(', ')} belum diisi`)
  process.exit(2)
}

/** id namespace KV dibaca dari wrangler.toml — satu sumber, bukan konstanta kedua. */
async function kvNamespaceId () {
  if (env.EDGE_KV_NAMESPACE_ID) return env.EDGE_KV_NAMESPACE_ID.trim()
  const toml = await readFile(resolve(HERE, '../../cloudflare/wrangler.toml'), 'utf8')
  const m = /binding\s*=\s*"DOCS"[\s\S]*?id\s*=\s*"([0-9a-f]{16,})"/.exec(toml)
  if (!m) throw new Error('wrangler.toml tidak memuat id namespace untuk binding DOCS')
  return m[1]
}

const NS = await kvNamespaceId()
// `/keys/{key}` hanya menerima METADATA; nilai JSON ditulis lewat `/values/{key}`. Salah jalur di
// sini menghasilkan 404 yang mudah disalahartikan sebagai "namespace tidak ada".
const API = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/storage/kv/namespaces/${NS}/values`
const hdr = { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' }

/** Segmen per segmen: `/` harus tetap `/` di jalur API, sementara karakter aneh di dalam satu
 *  segmen (spasi, #, ?) harus ter-escape. `encodeURIComponent(key)` secara utuh akan mengubah
 *  'list/x' menjadi 'list%2Fx' dan berujung 404 yang terlihat seperti namespace hilang. */
const kvPath = (key) => String(key).split('/').map(encodeURIComponent).join('/')

async function kvPut (key, value) {
  const r = await fetch(`${API}/${kvPath(key)}`, { method: 'PUT', headers: hdr, body: JSON.stringify(value) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.success === false) {
    throw new Error(`kv put '${key}' gagal: HTTP ${r.status} ${JSON.stringify(j.errors ?? j).slice(0, 220)}`)
  }
}

// ------------------------------------------------------------------ bahan yang akan diterbitkan
const agent = await loadKey(SLUG)
const issuerDoc = issuerDocument(agent)
const documentLoader = makeDocumentLoader({ [agent.controller]: issuerDoc, [issuerDoc.id]: issuerDoc })
const hashes = await servedHashes()
console.log(`menerbitkan ${hashes.length} kredensial ke tepi: ${BASE}`)
console.log(`  agen   : ${SLUG}  controller: ${agent.controller}`)

const lists = {}
for (const purpose of PURPOSES) {
  const r = await renderList({
    purpose, baseUrl: BASE, rpcUrl: RPC, resolverAddress: RESOLVER, hashes,
    key: agent.key, controllerDocument: issuerDoc, documentLoader,
  })
  lists[purpose] = {
    signed: r.signed,
    encodedList: r.encodedList,
    hash: r.hash,
    flagged: r.flagged,
    unallocated: r.unallocated,
    watched: r.watched,
    entries: [...r.statuses.values()].map((s) => ({
      uid: s.uid, hash: s.hash, index: r.slots.get(s.uid) ?? null,
      revoked: s.revoked, issuerDelisted: s.issuerDelisted,
    })),
  }
  console.log(`  ${purpose.padEnd(10)}: ${r.watched} dipantau, ${r.flagged} bit menyala, hash ${r.hash.slice(0, 18)}…`
    + (r.unallocated.length ? `  ⚠ ${r.unallocated.length} TANPA slot` : ''))
  if (r.unallocated.length) {
    console.error('    tidak melanjutkan: menyajikan daftar yang kehilangan anggota adalah cara anchor kehilangan artinya')
    process.exit(1)
  }
}

const records = await listCredentials()
const byHash = new Map(records.map((r) => [String(r.credentialHash).toLowerCase(), r]))

const published = { credential: 0, record: 0, criteria: new Set(), result: 0, issuer: 0 }

for (const purpose of PURPOSES) await kvPut(KV_KEYS.list(purpose), lists[purpose].signed)
await kvPut(KV_KEYS.issuer(SLUG), issuerDoc)
published.issuer++

/**
 * Dokumen penerbit untuk SEMUA agen di disk, bukan cuma yang menandatangani hari ini (B65-b).
 *
 * Kenapa: tiap kredensial mencetak `issuer.id` miliknya sendiri, dan verifier mengikuti URL itu untuk
 * mengambil kunci. Server tepi yang hanya melayani `AGENT_SLUG` membuat kertas terbitan agen lain
 * 404 di tempat kunci berada — gejalanya " kredensial tidak dapat diverifikasi", padahal kuncinya ada
 * di mesin ini. B48 menangkap bentuknya di server lokal; ini sisi terbitnya.
 *
 * Yang ditulis di mari bukan controller dari berkas kunci, tapi turunan `agentAt(…)`: identitas =
 * kunci Multikey (tidak berubah), tempat tayang = tepi. Berkas `.keys/*.json` tidak disentuh, jadi
 * perintah `agent` tetap bisa dijalankan dari host lamanya.
 */
const otherAgents = (await listAgents()).filter((a) => a.agentSlug !== SLUG)
for (const a of otherAgents) {
  const moved = agentAt(a, BASE)
  const doc = issuerDocumentFor(moved)
  // Yang dibandingkan adalah ENTRI-nya, bukan hanya dokumen: kunci disajikan lewat
  // `assertionMethod[].id`, dan `proof.verificationMethod` pada kertas harus cocok persis dengan
  // salah satu entri itu. Versi pertama pemeriksaan ini cuma mengecek `publicKeyMultibase`, jadi
  // dokumen yang `id` entri-nya masih bersistem host lama lolos — dan gejalanya baru muncul di
  // `serve-probe`: "verificationMethod tidak ada di assertionMethod issuer", tanda tangan tampak
  // rusak padahal yang salah daftar kuncinya.
  const vmId = `${moved.controller}#${moved.publicKeyMultibase}`
  if (!doc.assertionMethod?.some((m) => m.id === vmId && m.publicKeyMultibase === moved.publicKeyMultibase)) {
    console.error(`  ⚠ agen ${a.agentSlug}: assertionMethod tidak memuat "${vmId}" — tidak diterbitkan`)
    continue
  }
  await kvPut(KV_KEYS.issuer(a.agentSlug), doc)
  published.issuer++
  console.log(`  issuer : ${a.agentSlug} disajikan di ${doc.id} (kunci ${moved.publicKeyMultibase.slice(0, 12)}…, controller berkas: ${a.controller})`)
}

for (const r of records) {
  const hash = String(r.credentialHash).toLowerCase()
  if (r.document) { await kvPut(KV_KEYS.credential(hash), r.document); published.credential++ }
  await kvPut(KV_KEYS.record(hash), r)
  published.record++

  const courseId = r.course
  const manifest = manifestOf(courseId)
  if (manifest) {
    const criteria = criteriaDocument({
      baseUrl: BASE, manifest,
      rubricHash: r.rubricHash ?? rubricHashOf(manifest),
      manifestHash: r.manifestHash ?? manifestHashOf(manifest),
    })
    await kvPut(KV_KEYS.criteria(courseId), criteria)
    published.criteria.add(courseId)
  }

  try {
    await kvPut(KV_KEYS.result(courseId, hash), resultDocument({ baseUrl: BASE, record: r }))
    published.result++
  } catch (e) {
    console.error(`  hasil untuk ${hash.slice(0, 12)}… tidak bisa dibangun: ${e.message}`)
    process.exit(1)
  }
}

const state = {
  edge: true,
  publishedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  baseUrl: BASE,
  agentSlug: SLUG,
  issuerUrl: issuerDoc.id,
  resolver: RESOLVER,
  network: 'eip155:97',
  // Selector dibekukan di sini supaya worker tidak perlu membawa pembuat selector (dan tidak ada
  // dua tempat yang bisa menghitungnya berbeda).
  selectors: { statusOf: toFunctionSelector('statusOf(bytes32)') },
  counts: {
    watchedHashes: hashes.length,
    credentialsWithDocument: published.credential,
    records: published.record,
    courses: [...published.criteria],
    results: published.result,
    manifests: Object.keys(MANIFESTS).length,
  },
  lists: Object.fromEntries(PURPOSES.map((p) => [p, {
    encodedList: lists[p].encodedList,
    hash: lists[p].hash,
    flagged: lists[p].flagged,
    entries: lists[p].entries,
  }])),
}
await kvPut(KV_KEYS.state(), state)
console.log(`  state.json: ${state.counts.credentialsWithDocument} dokumen, ${published.result} hasil, ${state.counts.courses.length} kursus`)

// ------------------------------------------------------------------ baca balik LEWAT WORKER
const checks = []
async function edge (label, path, expect = (j) => !!j) {
  let j = null
  let status = 'ERR'
  try {
    const r = await fetch(BASE + path, { headers: { accept: 'application/json' } })
    status = r.status
    j = await r.json().catch(() => null)
  } catch (e) { j = { error: String(e.message ?? e) } }
  const ok = status === 200 && j && expect(j)
  checks.push({ label, status, ok })
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'} ${label.padEnd(34)} ${status}`)
  return { ok, status, body: j, label }
}

const failed = (r) => (r.ok ? null : { label: r.label, status: r.status, body: r.body })

/**
 * Kelas bentuk `credentialStatus`. Dokumen yang terbit sebelum perbaikan satu-objek masih
 * menyimpan array dua entri di store — itu fakta sejarah, bukan bug rute, dan verifikator harus
 * bisa membedakan keduanya daripada menghitungnya sebagai kegagalan yang sama dengan 404.
 */
function statusShape (doc) {
  const cs = doc?.credentialStatus
  if (!cs) return 'none'
  if (!Array.isArray(cs)) return cs.statusPurpose === REVOCATION ? 'single' : 'wrong-purpose'
  return cs.length === 2 ? 'legacy-two-entry' : 'unexpected-array'
}

console.log('\nbaca balik lewat URL yang akan diklik orang:')
const bad = []
const gaps = []
const hz = await edge('healthz', EDGE_ROUTES.healthz, (j) => j.ok === true && j.edge === true)
if (!hz.ok) bad.push(failed(hz))

for (const purpose of PURPOSES) {
  const g = await edge(`list ${purpose}`, EDGE_ROUTES.list(purpose),
    (j) => (j.type ?? []).includes('BitstringStatusListCredential') && !!j.proof)
  if (!g.ok) bad.push(failed(g))
}
const gi = await edge('issuer document', EDGE_ROUTES.issuer(SLUG), (j) => !!j.assertionMethod)
if (!gi.ok) bad.push(failed(gi))
// Setiap dokumen penerbit yang barusan ditulis harus bisa diambil — termasuk punya agen lain.
// Kertas yang `issuer.id`-nya 404 itu tidak terverifikasi, dan `verify:edge` tidak melihat ini
// karena ia mengikuti URL dari dalam kertas yang menunjuk cred, bukan issuer, untuk agen lama.
for (const a of otherAgents) {
  const want = agentAt(a, BASE)
  const g = await edge(`issuer ${a.agentSlug}`, EDGE_ROUTES.issuer(a.agentSlug),
    (j) => j.id === want.controller && (j.assertionMethod ?? []).some((m) => m.publicKeyMultibase === want.publicKeyMultibase))
  if (!g.ok) bad.push(failed(g))
}

const shapes = {}
for (const [hash, r] of byHash) {
  if (!r.document) continue
  const g = await edge(`credential ${hash.slice(2, 10)}…`, EDGE_ROUTES.credential(hash),
    (j) => Array.isArray(j['@context']) && !!j.proof && statusShape(j) !== 'none')
  const shape = statusShape(g.body)
  shapes[shape] = (shapes[shape] ?? 0) + 1
  if (shape === 'legacy-two-entry') gaps.push(`${hash.slice(0, 14)}… dua entri (terbit sebelum perbaikan satu-objek)`)
  if (!g.ok) bad.push(failed(g))

  const courseId = r.course
  if (!courseId) continue
  if (!published.criteria.has(courseId)) {
    const g404 = await edge(`criteria ${courseId} (tak terbit)`, EDGE_ROUTES.criteria(courseId), () => false)
    gaps.push(`kursus '${courseId}' tidak ada di MANIFESTS — criteria-nya tidak bisa diterbitkan (tepi menjawab ${g404.status})`)
    continue
  }
  const gr = await edge(`result ${courseId}/${hash.slice(2, 8)}…`, EDGE_ROUTES.result(courseId, hash),
    (j) => (j.type ?? []).includes('LencanaResultStatement') && !JSON.stringify(j).includes('"answer"'))
  if (!gr.ok) bad.push(failed(gr))
  const gc = await edge(`criteria ${courseId}`, EDGE_ROUTES.criteria(courseId),
    (j) => !!j.scale?.id && !JSON.stringify(j).includes('"answer"'))
  if (!gc.ok) bad.push(failed(gc))
}
console.log(`  bentuk credentialStatus terlayani: ${Object.entries(shapes).map(([k, v]) => `${k}=${v}`).join(', ')}`)

/**
 * Yang paling penting dari semuanya: apakah tepi mengaku bitnya masih sama dengan chain?
 * Ini bukan pemeriksaan "formatnya benar" - ini pemeriksaan bahwa kami tidak menyodorkan
 * daftar basi yang kebetulan masih bertanda tangan sah.
 */
for (const purpose of PURPOSES) {
  const s = hz.body?.[purpose]
  if (hz.ok && s?.matchesChainNow === true) {
    console.log(`  ok   chain cocok untuk ${purpose} (${s.watched} dipantau, ${s.flagged} bit menyala)`)
  } else {
    bad.push({ label: `chain cocok untuk ${purpose}`, status: hz.status, body: s ?? hz.body })
  }
}

console.log(`\n${bad.length === 0 ? 'PUBLISH HIJAU' : 'PUBLISH MERAH'} — ${checks.filter((c) => c.ok).length}/${checks.length} rute terbaca benar dari tepi`)
for (const b of bad) console.log('  GAGAL:', b.label, b.status, JSON.stringify(b.body ?? '').slice(0, 260))
if (gaps.length) {
  console.log('  diketahui (bukan rute rusak, keadaan korpus):')
  for (const g of gaps) console.log('   -', g)
}
process.exitCode = bad.length === 0 ? 0 : 1
