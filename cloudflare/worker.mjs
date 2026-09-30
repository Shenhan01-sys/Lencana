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

// Lencana-B67 status=SELESAI 2026-09-29 — tepi menolak dengan x-lencana-stale bernama; alarm eksternal ada di signer/scripts/monitor-edge.js. Buktikan ulang: npm run monitor:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B67 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B89 status=SELESAI 2026-09-29 — batas 50 subrequest/invokasi Free plan → cache bersama + MAX_STATUS_CHECKS; kegagalan MEMBACA bukan bukti (jangan balikkan jadi 503). Buktikan ulang: npm run verify:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B89 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

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

/**
 * Jatah `eth_call` per invokasi Worker. Plan Free membatasi subrequest per invokasi (50); dua daftar
 * dengan 27 anggota masing-masing dulu memanggil chain dua kali (54) dan meledakkan batas itu.
 * Angka ini di bawah 50 dengan sengaja, dan sisanya DILAPORKAN sebagai `unchecked` — bukan diperiksa
 * sampai gagal, bukan pula dianggap cocok.
 */
const MAX_STATUS_CHECKS = 42

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
 * Baca `statusOf` untuk sekumpulan hash SEKALI per invokasi.
 *
 * Kenapa dipisah dari pencocokan: `/healthz` memverifikasi DUA daftar, dan kedua daftar itu berisi
 * hash yang sama. Selama verifikasi memanggil chain sendiri-sendiri, satu invokasi menghabiskan
 * 27 + 27 `eth_call` = 54 subrequest — melewati batas 50 milik plan Free, dan Cloudflare menjawab
 * dengan `Too many subrequests by single Worker invocation`. Yang terjadi lalu bukan kebenaran yang
 * hilang tapi **alarm palsu**: daftar suspension dilaporkan `matchesChainNow:false`, lengkap dengan
 * pesan limit sebagai "sebabnya", dan rute daftar status menjawab 503 untuk blob yang sebenarnya
 * sah. Terukur 29 Sep: `hash` render = `hash` sajian = `hash` yang ter-anchor (`getTimestamp` ≠ 0),
 * jadi chain-nya cocok; yang kehabisan jatah adalah tepinya sendiri.
 */
async function readStatuses (env, hashes) {
  const out = new Map()
  let limited = false
  const list = [...new Set(hashes)]
  for (let i = 0; i < list.length; i += ETH_CALL_BATCH) {
    const chunk = list.slice(i, i + ETH_CALL_BATCH)
    const got = await Promise.all(chunk.map(async (h) => {
      try {
        return [h, { status: await statusOf(env, h) }]
      } catch (err) {
        const why = String(err?.message ?? err)
        // Batas subrequest adalah kegagalan PERMINTAAN, bukan bukti perbedaan state.
        if (/subrequest|Too many/i.test(why)) limited = true
        return [h, { error: why.slice(0, 120) }]
      }
    }))
    for (const [h, v] of got) out.set(h, v)
  }
  return { statuses: out, limited, requested: list.length }
}

/**
 * Cocokkan blob yang mau kami sajikan dengan chain, memakai status yang sudah dibaca di invokasi ini.
 * @returns {{ok:true, checked:number, unchecked:number} | {ok:false, mismatch:Array, limited?:boolean}}
 */
async function verifyListAgainstChain (env, purpose, cache = {}) {
  // `cache` opsional: `/healthz` mengirim satu cache bersama untuk dua daftar, `serveList` tidak
  // punya pasangan. Versi pertama fungsi ini menulis `cache.statuses` tanpa nilai default dan
  // `serveList` melempar TypeError → daftar status yang sah menjawab 500. Regresi itu kutemukan
  // sendiri di run berikutnya (`verify:edge` 4 merah), bukan pengguna.
  const published = env.STATE.lists[purpose]
  if (!published) return { ok: false, mismatch: [{ reason: 'state tidak memuat daftar itu' }] }

  const pending = []
  for (const e of published.entries) {
    if (typeof e.index !== 'number') continue
    pending.push({ ...e, bit: decodeBit(published.encodedList, e.index) })
  }
  /**
   * Pembandingan tidak boleh memanggil chain sendiri kalau cache invokasi ini sudah dibekali
   * (kasus `/healthz`: dua daftar, satu himpunan hash). Kalau cache belum ada (kasus `serveList`,
   * satu daftar per invokasi), barulah kita baca sendiri — dan yang di luar jatah TIDAK diperiksa
   * diam-diam: ia dihitung `unchecked` dan dilaporkan apa adanya.
   */
  if (!cache.statuses) {
    const budget = MAX_STATUS_CHECKS
    const wanted = [...new Set(pending.map((e) => e.hash))].slice(0, budget)
    const r = await readStatuses(env, wanted)
    cache.statuses = r.statuses
    cache.limited = cache.limited || r.limited
  }
  const unchecked = pending.filter((e) => !cache.statuses.has(e.hash)).length
  const toCheck = pending.filter((e) => cache.statuses.has(e.hash))

  const mismatch = []
  for (const e of toCheck) {
    const got = cache.statuses.get(e.hash)
    if (!got) { mismatch.push({ ...e, why: 'status tidak terbaca di invokasi ini' }); continue }
    if (got.error) { mismatch.push({ ...e, why: got.error }); continue }
    const s = got.status
    if (!s.exists) { mismatch.push({ ...e, why: 'chain tidak mengenalinya lagi' }); continue }
    if (expectedBit(purpose, s) !== (e.bit === 1)) {
      mismatch.push({ ...e, why: `bit tersaji=${e.bit}, chain=${expectedBit(purpose, s) ? 1 : 0}` })
    }
  }
  if (mismatch.length) return { ok: false, mismatch, checked: toCheck.length, unchecked, limited: cache.limited === true }
  // Yang belum diperiksa membuat klaim "cocok" tidak jujur: laporkan sebagai `partial`.
  if (unchecked > 0) return { ok: true, partial: true, checked: toCheck.length, unchecked }
  return { ok: true, checked: toCheck.length, unchecked: 0 }
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
  /**
   * Yang membuat daftar ditolak = bukti bahwa bit kita berbeda dari chain. Kegagalan MEMBACA (RPC
   * menolak karena jatah invokasi, jaringan putus) bukan bukti apa pun tentang daftar ini — dan
   * menolak menyajikan daftar yang sah karena alat pembaca kita sendiri kehabisan kuota adalah
   * cara membuat produk kita mati di tangan orang yang tidak bersalah. Terjadi 29 Sep: suspension
   * dijawab 503 dengan `why: "Too many subrequests…"`, padahal hash sajian identik dengan yang
   * ter-anchor di BAS. Jadi sekarang: hanya divergensi nyata yang 503; sisanya disajikan dengan
   * header yang menyebut verifikasi tidak penuh.
   */
  const realDivergence = (v.mismatch ?? []).filter((m) => /bit tersaji|tidak mengenalinya lagi/.test(m.why ?? ''))
  if (!v.ok && realDivergence.length) {
    return json({
      error: 'daftar tersaji tidak cocok dengan chain saat ini — kami menolak menyajikannya',
      purpose, mismatch: realDivergence.slice(0, 8),
      chainReads: v.reads, statePublishedAt: env.STATE.publishedAt,
    }, { status: 503, headers: { 'cache-control': 'no-store', 'x-lencana-stale': 'chain-diverged' } })
  }
  const unverified = !v.ok || v.partial === true || v.limited === true
  return json(doc, {
    headers: {
      'cache-control': 'no-store',
      'x-lencana-verified-at': env.STATE.selectors ? new Date().toISOString() : '',
      ...(unverified ? { 'x-lencana-verified': 'partial' } : {}),
    },
  })
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
  // SATU cache status untuk kedua daftar: himpunan hash mereka sama, jadi membacanya dua kali hanya
  // menghabiskan jatah subrequest dan menghasilkan alarm palsu (lihat catatan di `readStatuses`).
  const union = []
  for (const purpose of PK) {
    for (const e of (env.STATE.lists[purpose]?.entries ?? [])) if (typeof e.index === 'number') union.push(e.hash)
  }
  const cache = { statuses: null, used: 0, limited: false }
  if (union.length) {
    const wanted = [...new Set(union)].slice(0, MAX_STATUS_CHECKS)
    const r = await readStatuses(env, wanted)
    cache.statuses = r.statuses
    cache.limited = r.limited
  }
  for (const purpose of PK) {
    const l = s.lists[purpose]
    if (!l) { out[purpose] = { error: 'belum diterbitkan' }; continue }
    const v = await verifyListAgainstChain(env, purpose, cache)
    out[purpose] = {
      hash: l.hash,
      watched: l.entries.length,
      flagged: l.flagged,
      unallocated: l.unallocated,
      // `matchesChainNow` hanya boleh benar kalau SEMUA anggota sempat dibandingkan dan cocok.
      // Sebagian diperiksa = `partial`, bukan cocok dan bukan pula divergen.
      matchesChainNow: v.ok === true && v.partial !== true,
      checked: v.checked ?? 0,
      unchecked: v.unchecked ?? 0,
      // `partial` = tidak semua anggota sempat dibandingkan; `limited` = RPC menolak karena jatah
      // invokasi habis. Dua-duanya BUKAN pernyataan bahwa daftar kita salah.
      ...(v.partial ? { partial: true } : {}),
      ...(v.limited || cache.limited ? { rateLimited: true } : {}),
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
