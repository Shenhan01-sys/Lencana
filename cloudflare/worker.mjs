/**
 * Lencana — lapis sajian permanen (Cloudflare Workers + Workers KV).
 *
 * MASALAH YANG DISELESAIKAN (B51). Setiap kredensial kita mencetak URL miliknya sendiri:
 * `verificationMethod`, `credentialStatus.statusListCredential`, `achievement.criteria.id`,
 * `result[0].id`. URL itu ditulis saat terbit dan tidak pernah berubah. Selama signer hanya
 * hidup di laptop lewat quick tunnel, setiap kredensial yang kita terbitkan jadi bukti yang
 * mati bersama prosesnya — dan itu sudah terbukti terjadi: kredensial yang 27 Sep mengembalikan
 * `outcome: VALID` di `vc.1ed.tech` hari ini tidak bisa dibuka siapa pun (`ENOTFOUND`).
 *
 * KENAPA KV, BUKAN Menjalankan Signer di Sini. Tanda tangan daftar status adalah
 * kanonikalisasi JSON-LD + Ed25519 — 133 ms di Node (terukur, `npm run measure:signing`), dan
 * Workers Free menagih 10 ms CPU per invokasi. Jadi worker ini TIDAK menandatangani apa pun.
 * Yang ditandatangani di sini hanyalah dokumen yang sudah ditandatangani `npm run publish`.
 *
 * TAPI TIDAK MENYAJIKAN KEDALUWARSA. Di sinilah bedanya dengan "tempel file ke bucket":
 * untuk kedua daftar status, worker membaca chain PADA SAAT ITU JUGA dan mencocokkan setiap
 * bit dengan yang dikandung blob yang disajikan. Kalau satu bit pun berbeda, jawabannya 503
 * dengan `x-lencana-stale`, bukan daftar lama yang masih bertanda tangan sah. Tanda tangan yang
 * jujur atas state yang salah adalah kebohongan yang bertanda tangan — dan seluruh produk ini
 * berdiri di atas penolakan untuk jadi itu.
 *
 * Konsekuensi yang harus disebut, bukan disembunyikan: klaim kita berubah dari "daftar disusun
 * ulang setiap permintaan" menjadi "daftar disusun ulang setiap penerbitan, dan setiap
 * permintaan MEMERIKSA kecocokannya dengan chain". Yang kedua masih membuktikan ketiadaan
 * sunyi, tapi tidak lagi menutup celah "kita berhenti menerbitkan".
 *
 * State yang dibaca berasal dari `publish` dan ditandatangani sebagai satu bundle — jadi worker
 * tidak pernah mencocokkan blob dengan state yang salah.
 */

import { REVOCATION, SUSPENSION, decodeBit, LIST_BITS } from '../signer/src/statusList.js'
// Prefiks KV hanya ada di satu berkas; lihat [[04-Signer-Service/S10 - Edge surface]].
import { KV_KEYS as K, PURPOSES as PK, CACHE_TTL_SECONDS as TTL_SECONDS } from '../signer/src/edgeKeys.js'

const CORS = {
  'access-control-allow-origin': '*',
  'vary': 'Origin',
}

/**
 * Berapa `eth_call` yang boleh mengudara bersamaan. Enam, bukan "semua": di jalur x402 kami
 * mengukur 25 panggilan paralel ke RPC publik dan setengahnya kembali kosong — jadi batas ini
 * datang dari pengukuran, bukan dari rasa nyaman. Lihat [[04-Signer-Service/S7 - Server routes and lifecycle]].
 */
const ETH_CALL_BATCH = 6

function json (body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function notFound (path, hint) {
  return json({ error: 'tidak ada di tepi sajian ini', path, hint }, { status: 404 })
}

/**
 * `eth_call` ke `statusOf(bytes32)` dengan selector yang dibekukan saat publish.
 * Kami sengaja TIDAK memakai viem di tepi: di sini yang dibutuhkan hanya empat word pertama,
 * dan satu implementasi manual yang bisa dibaca lebih mudah diperiksa daripada satu dependensi
 * yang membawa Buffer.
 */
async function statusOf (env, hash) {
  const body = {
    jsonrpc: '2.0', id: 1, method: 'eth_call',
    params: [{ to: env.RESOLVER_ADDRESS, data: env.STATE.selectors.statusOf + hash.slice(2).padStart(64, '0') }, 'latest'],
  }
  const r = await fetch(env.RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok || j.error || typeof j.result !== 'string') {
    throw new Error(`eth_call statusOf gagal: ${JSON.stringify(j.error ?? r.status)}`)
  }
  const words = j.result.replace(/^0x/, '').match(/.{1,64}/g) ?? []
  const word = (i) => (words[i] ?? '').padStart(64, '0')
  const last = (i) => word(i).slice(-1)
  return {
    exists: last(0) === '1',
    revoked: last(1) === '1',
    expired: last(2) === '1',
    issuerDelisted: last(3) === '1',
    issuer: `0x${word(4).slice(-40)}`,
    issuedAt: BigInt(`0x${word(5)}`),
    expiresAt: BigInt(`0x${word(6)}`),
  }
}

/**
 * Bit mana yang HARUS menyala untuk satu daftar, dihitung dari chain saat ini.
 * `expired` sengaja tidak masuk: itu keputusan kredensial, bukan keadaan daftar —
 * see [[04-Signer-Service/S3 - Two status lists]].
 */
function expectedBit (purpose, s) {
  return purpose === REVOCATION ? s.revoked : (s.issuerDelisted && !s.revoked)
}

/**
 * Cocokkan blob yang mau kami sajikan dengan chain, sekarang juga.
 * @returns {{ok: true} | {ok: false, mismatch: Array}}
 */
async function verifyListAgainstChain (env, purpose) {
  const published = env.STATE.lists[purpose]
  if (!published) return { ok: false, mismatch: [{ reason: 'state tidak memuat daftar itu' }] }

  const pending = []
  for (const e of published.entries) {
    if (typeof e.index !== 'number') continue
    pending.push({ ...e, bit: decodeBit(published.encodedList, e.index) })
  }

  const seen = new Set()
  const mismatch = []
  for (let i = 0; i < pending.length; i += ETH_CALL_BATCH) {
    const chunk = pending.slice(i, i + ETH_CALL_BATCH)
    const results = await Promise.all(chunk.map(async (e) => {
      if (seen.has(e.hash)) return null
      seen.add(e.hash)
      try {
        const s = await statusOf(env, e.hash)
        if (!s.exists) return { ...e, why: 'chain tidak mengenalinya lagi' }
        if (expectedBit(purpose, s) !== (e.bit === 1)) {
          return { ...e, why: `bit tersaji=${e.bit}, chain=${expectedBit(purpose, s) ? 1 : 0}` }
        }
      } catch (err) {
        return { ...e, why: String(err.message ?? err).slice(0, 120) }
      }
      return null
    }))
    for (const r of results) if (r) mismatch.push(r)
  }
  return mismatch.length ? { ok: false, mismatch } : { ok: true }
}

async function readKV (env, key) {
  const v = await env.DOCS.get(key)
  return v ? JSON.parse(v) : null
}

/**
 * Daftar status: hanya disajikan kalau chain masih bilang hal yang sama.
 * `maxAge=0` + `no-store` — cache yang berhasil adalah cache yang bisa basi.
 */
async function serveList (env, purpose, url) {
  const doc = await readKV(env, K.list(purpose))
  if (!doc) {
    return json({ error: 'daftar ini belum diterbitkan ke tepi sajian', run: 'cd signer && npm run publish', purpose },
      { status: 503, headers: { 'cache-control': 'no-store', 'x-lencana-stale': 'not-published' } })
  }
  const v = await verifyListAgainstChain(env, purpose)
  if (!v.ok) {
    return json({
      error: 'daftar tersaji tidak cocok dengan chain saat ini — kami menolak menyajikannya',
      purpose, mismatch: v.mismatch.slice(0, 8),
      chainReads: v.reads, statePublishedAt: env.STATE.publishedAt,
    }, { status: 503, headers: { 'cache-control': 'no-store', 'x-lencana-stale': 'chain-diverged' } })
  }
  return json(doc, { headers: { 'cache-control': 'no-store', 'x-lencana-verified-at': env.STATE.selectors ? new Date().toISOString() : '' } })
}

async function serveHealthz (env, url) {
  const s = env.STATE
  const out = {
    ok: true,
    edge: true,
    baseUrl: s.baseUrl,
    resolver: env.RESOLVER_ADDRESS,
    rpc: env.RPC_URL,
    publishedAt: s.publishedAt,
    agentSlug: s.agentSlug,
    issuerDocument: s.issuerUrl,
    listBits: LIST_BITS,
    counts: s.counts,
  }
  for (const purpose of PK) {
    const l = s.lists[purpose]
    if (!l) { out[purpose] = { error: 'belum diterbitkan' }; continue }
    const v = await verifyListAgainstChain(env, purpose)
    out[purpose] = {
      hash: l.hash,
      watched: l.entries.length,
      flagged: l.flagged,
      unallocated: l.unallocated,
      matchesChainNow: v.ok,
      ...(v.ok ? {} : { mismatch: v.mismatch.slice(0, 4) }),
    }
  }
  return json(out, { headers: { 'cache-control': 'no-store' } })
}

async function route (env, url) {
  const path = decodeURIComponent(url.pathname)

  if (path === '/healthz' || path === '/health') return serveHealthz(env, url)
  if (path === '/' || path === '/.well-known/ai-plugin.json') {
    return json({ name: 'Lencana edge', docs: '/healthz', issuer: env.STATE.issuerUrl })
  }

  // Semua cabang harus mengembalikan Response. Versi pertama mengembalikan objek mentah di tiga
  // route di bawah (hanya yang bersampul `json(...)` yang jalan), dan gejalanya adalah 1101
  // "Worker threw exception" atas dokumen yang sebenarnya ada di KV - kegagalan yang terlihat
  // seperti data hilang. route() wajib mengembalikan Response: itu yang dijaga test tepi.
  if (path.startsWith('/issuers/')) {
    const doc = await readKV(env, K.issuer(path.slice('/issuers/'.length)))
    return doc ? json(doc) : notFound(path, `/issuers/${env.STATE.agentSlug}`)
  }

  if (path.startsWith('/criteria/')) {
    const doc = await readKV(env, K.criteria(path.slice('/criteria/'.length)))
    return doc ? json(doc) : notFound(path, '/criteria/<courseId> yang diterbitkan lewat npm run publish')
  }

  if (path.startsWith('/results/')) {
    const [courseId, hash] = path.slice('/results/'.length).split('/')
    if (!courseId || !hash) return notFound(path, '/results/<courseId>/<credentialHash>')
    const doc = await readKV(env, K.result(courseId, hash))
    return doc ? json(doc) : notFound(path, '/results/<courseId>/<credentialHash>')
  }

  if (path.startsWith('/credentials/status/')) {
    const purpose = path.slice('/credentials/status/'.length)
    if (!PK.includes(purpose)) return notFound(path, '/credentials/status/{revocation,suspension}')
    return serveList(env, purpose, url)
  }

  if (path.startsWith('/credentials/')) {
    const hash = path.slice('/credentials/'.length)
    const key = url.searchParams.get('format') === 'record' ? K.record(hash) : K.credential(hash)
    const doc = await readKV(env, key)
    if (doc) return json(doc)
    return notFound(path, '/credentials/<credentialHash> | /credentials/status/{revocation,suspension}')
  }

  return notFound(path, '/healthz | /issuers/<slug> | /criteria/<courseId> | /credentials/<hash> | /credentials/status/<purpose> | /results/<courseId>/<hash>')
}

async function loadState (env) {
  const state = await readKV(env, K.state())
  if (!state) throw new Error('state.json belum ada di KV — jalankan `npm run publish`')
  for (const k of ['baseUrl', 'publishedAt', 'lists', 'selectors']) {
    if (!state[k]) throw new Error(`state.json tidak punya field '${k}' — terbitkan ulang`)
  }
  if (!state.selectors?.statusOf || !state.baseUrl || !state.publishedAt) {
    throw new Error('state.json tidak lengkap (selectors.statusOf / baseUrl / publishedAt wajib ada)')
  }
  return state
}

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type, x-payment' } })
    }
    if (request.method !== 'GET') return json({ error: 'hanya GET yang tersedia di tepi sajian ini' }, { status: 405 })
    if (!env?.DOCS || !env?.RPC_URL || !env?.RESOLVER_ADDRESS) {
      return json({ error: 'binding belum dipasang', have: Object.keys(env ?? {}) }, { status: 500 })
    }
    try {
      env.STATE = await loadState(env)
      return await route(env, url)
    } catch (e) {
      const msg = String(e?.message ?? e)
      // Kegagalan konfigurasi harus terbaca sebagai kegagalan konfigurasi, bukan sebagai 404.
      const cfg = /state\.json|belum diterbitkan|binding/.test(msg)
      return json({ error: msg, kind: cfg ? ' konfigurasi-atau-penerbitan' : 'internal' }, { status: cfg ? 503 : 500 })
    }
  },
}
