/**
 * Server kecil yang menghidangkan dokumen issuer + daftar status.
 *
 * Kenapa masih perlu: `statusListCredential` dan `verificationMethod` di dalam kredensial adalah
 * URL. Verifier standar akan MEMBUKA url itu. Selama layanannya mati, kredensial kita gagal
 * diverifikasi — bukan karena salah, tapi karena tidak ada yang menjawab.
 *
 * Dua sifat yang sengaja dipilih:
 *  1. Bitstring dibangun ULANG tiap permintaan dari chain. Tidak ada cache, jadi daftar yang
 *     disajikan tidak pernah lebih tua dari keadaan chain — dan tidak bisa "tertinggal" setelah
 *     sebuah delisting dipulihkan.
 *  2. Tidak ada state kredensial di sini. Yang tersimpan cuma hasil `put` awal (dokumen issuer);
 *     itu pun dibangun dari kunci, bukan dari input pengguna.
 *
 * Batas yang harus disebut keras-keras: server ini dipercaya untuk MENAYANGKAN daftar status.
 * Yang tidak bisa ia lakukan adalah mengubah isinya tanpa ketahuan — itu gunanya hash bitstring
 * direkam lewat BAS `timestamp()` (bagian itu masih tugas, lihat README).
 *
 *   node src/server.js            # default 127.0.0.1:8787
 *   PORT=9000 BASE_URL=https://api.example node src/server.js
 */

// Lencana-B106 status=SELESAI 2026-09-29 — buildList memisahkan dua sebab: konfigurasi hilang vs belum ada kertas (store dingin). Buktikan ulang: npm run probe:cold. JANGAN dibalik/diulang tanpa membuka kembali baris B106 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B86 status=SELESAI 2026-09-29 — server melaporkan startedAt + codeStamp sejak proses naik. Buktikan ulang: npm run probe:serve. JANGAN dibalik/diulang tanpa membuka kembali baris B86 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B48 status=SELESAI 2026-09-29 — empat kredensial demo yang sudah terbit tidak bisa diverifikasi orang asing di instance itu: verificationMethod mereka menunjuk dokumen yang tidak kita sajikan. Untuk v Buktikan ulang: lihat baris B48 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B48 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B67 status=SELESAI 2026-09-29 — penolakan tepi memakai x-lencana-stale bernama; alarmnya di monitor-edge, bukan di sini. Buktikan ulang: npm run monitor:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B67 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B96 status=SELESAI 2026-09-29 — pesan yang sampai ke klien berbahasa Inggris; komentar & log operator boleh Indonesia (D27/D28). Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B96 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createServer } from 'node:http'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { agentIdentity, issuerDocumentFor, issuerDocument, listAgents, loadKey } from './issuer.js'
import { loadFileEnvReport } from './env.js'
import { REVOCATION, SUSPENSION, renderList, servedHashes } from './lists.js'
import { sha256Hex } from './credential.js'
import { makeDocumentLoader } from './sign.js'
import { getCredentialByHash } from './store.js'
import { criteriaDocument } from './criteria.js'
import { resultDocument } from './results.js'
import {
  dbConfigured, dbMissingReason,
  enroll as dbEnroll, recordAttempt as dbRecordAttempt, storeAttempt as dbStoreAttempt,
  nextAttemptNo as dbNextAttemptNo,
  setLessonProgress as dbSetProgress, progressSummary as dbProgressSummary, authorizeLearner as dbAuthorize,
} from './db.js'
import { essayLesson, gradeQuiz } from './quiz.js'
import { gradeAgainstRubric } from './grade.js'
import { submitEssay as dbSubmitEssay, judgeEssay as dbJudgeEssay, addReviewer as dbAddReviewer, reviewEssay as dbReviewEssay } from './db.js'
import { manifestOf, manifestHashOf, rubricHashOf, MANIFESTS } from '../../web/src/manifest.ts'
import { paymentRequirements, decodePaymentHeader, settlePayment, encodePaymentHeader } from './x402.js'
import { verify as verifyCredential, defaultEndpoint } from '../../web/src/verify.ts'
// Lencana-B97 status=SELESAI 2026-09-30 — rute POST /relay dan GET /relay/<id>: pintu bagi agen pihak ketiga untuk menyerahkan delegasi bertanda tangan; siaran hanya kalau RELAY_BROADCAST=1. Buktikan ulang: npm run verify:relay. JANGAN dibalik/diulang tanpa membuka kembali baris B97 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import {
  submitRelay, getRelayJob, relaySummary, drainRelayQueue,
  RELAY_MAX_BATCH, RELAY_MAX_DEADLINE_SECONDS,
} from './relay.js'
// Lencana-B90 status=SELESAI 2026-09-30 — rute GET /deposit/policy/<course>, GET /deposit/<course>/<learner>, POST /deposit/finalize; siaran hanya kalau DEPOSIT_BROADCAST=1. Buktikan ulang: npm run verify:deposit. JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { deadlinePolicyOf, readDeposit, finalizeDeposit } from './deposit.js'

// Env dibaca dari `../.env` sebelum konstanta di bawah diambil, supaya `npm run serve` di clone
// orang lain melayani hal yang sama seperti yang kita uji — tanpa itu RPC/RESOLVER kosong dan
// server tetap hidup sambil menyajikan keadaan yang lebih sedikit daripada yang dikira pembaca.
// Nilai dari lingkungan proses MENANG: itulah cara operator mengevaluasi konfigurasi lain.
await loadFileEnvReport('server')

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const BASE_URL = process.env.BASE_URL ?? `http://${HOST}:${PORT}`
const AGENT_SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const RESOLVER = process.env.RESOLVER_ADDRESS
const RPC_URL = process.env.RPC_URL
const BAS = process.env.BAS_ADDRESS
// Siaran dari antrean relayer mati secara bawaan: server yang dinyalakan harness, atau orang dari
// `git clone`, tidak boleh mengeluarkan gas hanya karena ada yang mengirim POST /relay.
const RELAY_BROADCAST = process.env.RELAY_BROADCAST === '1' && Boolean(process.env.DEPLOYER_PRIVATE_KEY)

// Harga satu verifikasi, dalam satuan terkecil token (6 desimal): 0,001 = "satu permen".
const PRICE = BigInt(process.env.X402_PRICE ?? '1000')
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 97)
const PAY_TOKEN = process.env.DEMO_TOKEN_ADDRESS
const PAY_SPLIT = process.env.SPLIT_ADDRESS
// Yang dibayar adalah PENERBIT. Platform mengambil bagiannya lewat kontrak pembagian,
// bukan dengan menulis alamatnya sendiri sebagai penerima.
const PAY_PAYEE = process.env.ISSUER_ADDRESS
const TIMEOUT_SECONDS = Number(process.env.X402_TIMEOUT ?? 600)

// Setoran tenggat (B90). Premi yang hangus mengalir ke PENERBIT, sama seperti bayaran verifikasi.
// Siaran mati secara bawaan dengan alasan yang sama dengan relayer: sebuah POST tidak boleh
// mengeluarkan gas dari server harness atau clone orang lain.
const DEPOSIT = process.env.DEPOSIT_ADDRESS
const DEPOSIT_READY = Boolean(DEPOSIT && RPC_URL && RESOLVER && BAS && PAY_TOKEN && PAY_PAYEE)
const DEPOSIT_BROADCAST = process.env.DEPOSIT_BROADCAST === '1' && Boolean(process.env.DEPLOYER_PRIVATE_KEY)
const DEPOSIT_CFG = {
  rpcUrl: RPC_URL, chainId: CHAIN_ID, depositAddress: DEPOSIT, tokenAddress: PAY_TOKEN, payee: PAY_PAYEE,
  resolverAddress: RESOLVER, basAddress: BAS,
}

const { key, controller, name } = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument({ controller, name, key })
const loaderDocs = { [controller]: issuerDoc }
const documentLoader = makeDocumentLoader(loaderDocs)

/**
 * Kapan proses ini mulai. Dipakai `serve-probe` untuk menolak menguji server yang lebih tua
 * daripada kode di disk — yang terjadi 29 Sep: signer yatim dari run sehari sebelumnya masih
 * memegang port 8787, probe berbicara dengannya, dan dua pemeriksaan merah karena PERBAIKANKU
 * belum ada di proses itu. Angka merah dari proses lama lebih menyesatkan daripada tidak ada
 * angka sama sekali, karena ia terbaca sebagai "kodenya salah".
 */
const STARTED_AT = new Date().toISOString()

/**
 * Cap kode yang DIPUAT proses ini, bukan yang ada di disk saat ditanya. Dibaca sekali di awal
 * karena justru di situlah informasinya: kalau cap dihitung ulang saat `/healthz` dipanggil,
 * server yatim akan melaporkan cap terbaru dan guard-nya mati — persis kegagalan yang mau ditangkap.
 */
const CODE_STAMP = (() => {
  const here = dirname(fileURLToPath(import.meta.url))
  let newest = 0
  let files = 0
  try {
    for (const f of readdirSync(here)) {
      if (!f.endsWith('.js')) continue
      const m = statSync(join(here, f)).mtimeMs
      files += 1
      if (m > newest) newest = m
    }
  } catch { /* jangan mematikan /healthz karena stat gagal */ }
  return { newestSrcMtime: newest || null, srcFiles: files }
})()

/**
 * Daftar untuk satu purpose. Isi logikanya ada di `lists.js` — dipakai juga oleh sisi penerbit,
 * supaya hash yang kita anchor berasal dari aturan yang sama persis dengan daftar yang kita hidangkan.
 *
 * ⚠️ Alokator hanya DIBACA (`peek` di dalam renderList). Yang boleh mengalokasikan nomor bit adalah
 * sisi penerbit, di momen kredensialnya terbit. Kalau server ikut mengalokasikan, nomornya
 * mengikuti urutan iterasi saat itu dan `statusListIndex` di kredensial lama bisa menunjuk bit
 * milik orang lain — kegagalan sunyi, dokumen tetap sah, cuma salah alamat.
 */
async function buildList (purpose) {
  const hashes = await servedHashes()
  // Dua sebab yang BERBEDA, dan dulu keduanya dibuang lewat satu kalimat. "Belum ada kertas"
  // (store dingin — keadaan setiap orang yang datang dari `git clone`) bukan kegagalan konfigurasi:
  // `renderList` atas hashes kosong menghasilkan bitstring kosong yang tetap bertanda tangan sah.
  // Menolaknya dengan 500 + pesan "RESOLVER_ADDRESS / RPC_URL not set" membuat clone baru membuka
  // /healthz dengan tangan kosong, dan yang dibaca orang adalah bug kami. Terdeteksi 29 Sep oleh
  // `npm run probe:cold` (B106, turunan B42).
  if (!RESOLVER || !RPC_URL) {
    throw new Error('RESOLVER_ADDRESS / RPC_URL not set — there is no chain to read the bit states from')
  }
  return renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes,
    key, controllerDocument: issuerDoc, documentLoader,
  })
}

/**
 * `report` dari `verify.ts` membawa `bigint` (issuedAt, expiresAt, jumlah token), dan
 * `JSON.stringify` melempar untuk itu. Versi pertama berkas ini MATI di tengah permintaan
 * berbayar — settlement-nya sudah terjadi, responsnya tidak pernah ada: kegagalan terburuk
 * yang bisa dibuat sistem pembayaran, karena uangnya pindah dan klien tidak diberi bukti.
 *
 * Replacer ini membuat angka besar keluar sebagai string desimal, dan `try/catch` di bawah
 * menjamin kegagalan serialisasi tidak pernah meruntuhkan proses: klien mendapat 500 yang
 * menjelaskan, bukan koneksi yang diputus.
 */
function jsonBody (body) {
  try {
    return JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
  } catch (err) {
    return JSON.stringify({ error: `respons gagal diserialisasi: ${err.message}`, path: '/(internal)' })
  }
}

function send (res, status, body, type = 'application/json', extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    // Verifier pihak ketiga membacanya dari browser: tanpa ini responsnya tidak bisa dipakai
    // di uji interoperabilitas yang memang mau kita lakukan.
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(typeof body === 'string' ? body : jsonBody(body))
}

function readJsonBody (req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      // Batas kecil dan eksplisit: tanpa ini satu permintaan besar cukup untuk menghabiskan memori.
      if (raw.length > 64_000) reject(new Error('body terlalu besar'))
    })
    req.on('end', () => {
      if (!raw.trim()) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('body bukan JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** Isi `accepts[]` — dibuat satu kali per permintaan supaya `resource` ikut alamat yang diminta. */
function accepts () {
  return [paymentRequirements({
    tokenAddress: PAY_TOKEN, payTo: PAY_SPLIT, amount: PRICE,
    chainId: CHAIN_ID, resource: `${BASE_URL}/verify`, maxTimeoutSeconds: TIMEOUT_SECONDS,
  })]
}

function notPaid (res, why) {
  return send(res, 402, { x402Version: 1, error: why, accepts: accepts() }, 'application/json', {
    'www-authenticate': 'X-PAYMENT realm="x402", error="insufficient_payment"',
  })
}

/**
 * `/verify` berbayar. `402 Payment Required` -> klien menandatangani pembayaran -> kami menyiarkan
 * settlement sebagai fasilitator -> laporan verifikasi + `X-PAYMENT-RESPONSE`.
 *
 * ⚠️ Penjaga yang TIDAK boleh dilonggarkan: settlement yang tidak menunjuk split kita, tidak memakai
 * token yang kami terima, atau jumlahnya di bawah harga — **ditolak sebelum ada gas keluar**.
 * Tanpa pemeriksaan ini, server kami bisa disuruh membayar gas untuk memindahkan uang orang lain ke
 * alamat siapa pun: kita yang bayar, orang lain yang untung.
 */
async function handleVerify (req, res) {
  if (!PAY_TOKEN || !PAY_SPLIT || !PAY_PAYEE) {
    return send(res, 500, { error: 'DEMO_TOKEN_ADDRESS / SPLIT_ADDRESS / ISSUER_ADDRESS not set — the paid path cannot be served without them' })
  }

  const header = req.headers['x-payment']
  if (!header) return notPaid(res, 'X-PAYMENT header is required')

  const payment = decodePaymentHeader(header)
  if (!payment) return notPaid(res, 'X-PAYMENT bukan base64(JSON) yang sah')

  const p = payment.payload ?? {}
  const why = checkPayment(p)
  if (why) return notPaid(res, why)

  let body
  try {
    body = await readJsonBody(req)
  } catch (err) {
    return send(res, 400, { error: err.message })
  }
  const hashes = pickHashes(body)
  if (hashes.error) return send(res, 400, { error: hashes.error })
  const list = hashes.list

  let settled
  try {
    settled = await settlePayment({
      rpcUrl: RPC_URL, facilitatorPk: process.env.DEPLOYER_PRIVATE_KEY,
      payment, split: PAY_SPLIT, payee: PAY_PAYEE,
      splitRefSalt: `${list[0]}:${list.length}:${p.nonce}:${Date.now()}`,
    })
  } catch (err) {
    // Pembayaran yang gagal tidak membuat kami menahan datanya: 402 lagi, dengan sebab yang jelas.
    return notPaid(res, `settlement gagal: ${err.message.split('\n')[0]}`)
  }

  const ep = defaultEndpoint()
  const endpoint = { ...ep, rpcUrl: RPC_URL ?? ep.rpcUrl, resolver: RESOLVER ?? ep.resolver }
  const reports = []
  // Empat pembaca paralel, bukan semua sekaligus: satu verifikasi memanggil RPC belasan kali, jadi
  // 25 hash paralel penuh = ~300 eth_call serentak ke RPC publik yang kita UJI sendiri gugur kalau
  // di-burst. Yang lebih cepat di sini justru menghasilkan laporan separuh kosong.
  for (let i = 0; i < list.length; i += 4) {
    const slice = list.slice(i, i + 4)
    const part = await Promise.all(slice.map(async (h) => {
      const r = await verifyCredential(h, endpoint)
      return { credentialHash: h, verdict: r.verdict, reasons: r.reasons, credential: r.credential, anchors: r.anchors, limits: r.limits }
    }))
    reports.push(...part)
  }

  const responseHeader = encodePaymentHeader({
    x402Version: 1,
    success: true,
    network: `eip155:${CHAIN_ID}`,
    transaction: settled.settleTx,
    payer: p.payer,
    // Kami menambahkan ini di luar spesifikasi: bukti bahwa pendapatan TERBAGI, bukan cuma sampai.
    settlement: { settleTx: settled.settleTx, splitTx: settled.splitTx, splitRef: settled.splitRef },
    served: reports.length,
  })

  return send(res, 200, {
    paid: { amount: String(p.amount), token: p.token, settleTx: settled.settleTx, splitTx: settled.splitTx },
    // Selisih yang dibaca dari chain — bukan asumsi bahwa pembagian pasti terjadi.
    sharesOnChain: {
      payee: String(settled.issuerShare), facilitator: String(settled.platformShare), leftInSplit: String(settled.leftInSplit),
    },
    batch: { requested: list.length, served: reports.length, perSettlementGas: PER_VERIFICATION_GAS },
    reports,
    // `report` tetap diisi saat satu hash: klien lama (dan harness kita) tidak boleh diam-diam
    // berubah makna hanya karena rute ini jadi bisa batch.
    report: reports.length === 1 ? reports[0] : undefined,
  }, 'application/json', { 'x-payment-response': responseHeader })
}

/**
 * Satu pembayaran harus melayani BANYAK verifikasi, dan itu bukan kenyamanan -- itu satu-satunya
 * alasan rute ini boleh menagih. Satu settlement on-chain = 190.659 gas (terukur dari receipt);
 * pada tarif 1000 satuan terkecil, gas per item harus turun lewat batch supaya 10% platform
 * tidak kalah oleh harga BNB.
 */
const BATCH_MAX = 25
const PER_VERIFICATION_GAS = 190659

function pickHashes (body) {
  const raw = Array.isArray(body.credentialHashes) ? body.credentialHashes
    : (body.credentialHash ?? body.i) !== undefined ? [body.credentialHash ?? body.i] : []
  const seen = new Set()
  for (const item of raw) {
    const h = String(item ?? '').trim()
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      return { error: `each item must be a 32-byte hash (0x…64 hex); got "${String(item).slice(0, 20)}"` }
    }
    seen.add(h.toLowerCase())
  }
  const list = [...seen]
  if (!list.length) return { error: 'requires a JSON body {credentialHash: "0x…"} or {credentialHashes: ["0x…"]}' }
  if (list.length > BATCH_MAX) return { error: `batch maximum ${BATCH_MAX} credentials per payment` }
  return { list }
}

function checkPayment (p) {
  if (String(p.token ?? '').toLowerCase() !== PAY_TOKEN.toLowerCase()) return 'token pembayaran bukan yang kami terima'
  if (String(p.payTo ?? '').toLowerCase() !== PAY_SPLIT.toLowerCase()) return 'pembayaran tidak ditujukan ke kontrak pembagian kami'
  if (!Number.isInteger(Number(p.nonce))) return 'nonce pembayaran bukan bilangan bulat'
  let amount
  try {
    amount = BigInt(p.amount ?? -1)
  } catch {
    return 'jumlah pembayaran bukan bilangan bulat'
  }
  if (amount < PRICE) return `jumlah di bawah harga (${PRICE})`
  if (Number(p.deadline ?? 0) * 1000 < Date.now()) return 'pembayaran sudah kedaluwarsa'
  if (!p.eip2612 || !p.witnessSig) return 'payload pembayaran tidak membawa tanda tangan'
  return null
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, BASE_URL).pathname
  try {
    if (path === `/issuers/${AGENT_SLUG}` || path === '/issuers') return send(res, 200, issuerDoc)
    // B48: setiap kredensial mencetak `verificationMethod` miliknya sendiri. Selama server hanya
    // melayani slug yang kebetulan di-start, ijazah terbitan agen lain jadi 404 di instance ini —
    // dari luar kelihatan seperti kredensialnya rusak, padahal kuncinya ada di disk. Jadi setiap
    // agen di .keys/ disajikan di URL-nya masing-masing, dibangun dari field publik saja.
    if (path.startsWith('/issuers/')) {
      const slug = decodeURIComponent(path.slice('/issuers/'.length))
      const agents = await listAgents()
      const agent = agents.find((a) => a.agentSlug === slug)
      if (!agent) {
        return send(res, 404, { error: 'unknown agent', slug, known: agents.map((a) => a.agentSlug) })
      }
      // Identitas disajikan dari `agentIdentity`, bukan dari controller di berkas kunci: kredensial
      // yang sudah dipindah ke host tepi mencetak `issuer.id` di host itu, dan kalau server ini
      // masih merakit `assertionMethod[].id` dari controller lama, verifier yang lewat sini
      // menolak tanda tangan yang sah. (Ditangkap `serve-probe` 29 Sep — lihat `issuer.js:identityBase`.)
      return send(res, 200, issuerDocumentFor(agentIdentity(agent)))
    }
    // `achievement.criteria.id` dan `result[].resultDescription` di setiap kredensial menunjuk ke
    // sini. Sampai hari ini keduanya hanya identifier — sah menurut spesifikasi, tapi pertanyaan
    // "dinilai pakai aturan apa" tidak dijawab oleh dokumen mana pun yang bisa dibuka orang lain.
    // Yang keluar di sini adalah kebijakan penerbit, TANPA kunci jawaban (lihat src/criteria.js).
    if (path.startsWith('/criteria/')) {
      const slug = decodeURIComponent(path.slice('/criteria/'.length))
      const manifest = manifestOf(slug)
      if (!manifest) {
        return send(res, 404, { error: 'no publisher manifest with that id', slug, known: Object.keys(MANIFESTS) })
      }
      return send(res, 200, criteriaDocument({
        baseUrl: BASE_URL,
        manifest,
        rubricHash: rubricHashOf(manifest),
        manifestHash: manifestHashOf(manifest),
      }))
    }
    if (path === `/credentials/status/${REVOCATION}`) return send(res, 200, (await buildList(REVOCATION)).signed)
    if (path === `/credentials/status/${SUSPENSION}`) return send(res, 200, (await buildList(SUSPENSION)).signed)
    // --------------------------------------------------------------------------------------
    // State belajar (bar e-course 3 & 4). Sengaja DI ATAS rute lain dan sengaja pulang-pergi
    // ringan: ini permukaan yang akan dipanggil front-end nanti.
    //
    // Dua hal yang tidak boleh dilupakan di sini:
    //  - secret key DB melewati RLS, jadi pemeriksaan "siapa yang boleh menulis untuk alamat ini"
    //    ada di KITA (tanda tangan nonce atas nama peserta), bukan di database;
    //  - `attempt_hash` dihitung dari rekaman di DB (lihat db.js), tidak pernah diterima dari klien.
    if (path === '/enroll' || path === '/attempts' || path === '/progress' || path === '/grade'
      || path === '/essay' || path === '/essay/judgement' || path === '/essay/reviewers' || path === '/essay/review') {
      if (!dbConfigured()) {
        return send(res, 503, jsonBody({ error: 'learning layer not configured', missing: dbMissingReason() }))
      }
      // GET /progress = ringkasan milik satu peserta di satu kursus. Sengaja hanya membaca baris
      // yang sudah dia tulis sendiri, dan hanya menjawab lewat backend kita: publishable key tidak
      // bisa membaca tabel ini (RLS), jadi bocoran tidak datang dari jalur ini.
      if (path === '/progress' && req.method === 'GET') {
        const learner = new URL(req.url, BASE_URL).searchParams.get('learner')
        const course = new URL(req.url, BASE_URL).searchParams.get('course')
        if (!learner || !course) return send(res, 400, jsonBody({ error: 'requires ?learner=0x…&course=<courseId>' }))
        const sum = await dbProgressSummary(learner, course)
        return send(res, sum ? 200 : 404, jsonBody(sum ?? { error: 'no enrollment yet for this learner/course' }))
      }
      if (req.method !== 'POST') {
        return send(res, 405, jsonBody({ error: 'POST required', path }))
      }
      const body = await readJsonBody(req)
      if (!body || typeof body !== 'object') return send(res, 400, jsonBody({ error: 'body must be a JSON object' }))
      if (path === '/progress') {
        const out = await dbSetProgress({
          learner: body.learner, courseId: body.course, lessonId: body.lesson, to: body.status,
          position: body.position ?? 0, message: body.message, signature: body.signature,
        })
        if (out.ok) return send(res, 200, jsonBody({ lesson: out.enrollmentId, from: out.from, to: out.to, noop: out.noop === true }))
        // 401 khusus untuk "siapa kamu"; lompatan status yang ditolak adalah permintaan yang
        // sah dari orang yang benar - memberi keduanya kode yang sama membuat monitoring kita
        // membunyikan alarm otentikasi setiap kali peserta mengirim urutan yang salah.
        const authish = /tanda tangan|nonce|alamat/.test(out.why ?? '')
        return send(res, authish ? 401 : 422, jsonBody({ error: out.why, from: out.from, allowed: out.allowed }))
      }
      if (path === '/enroll') {
        // jumlah lesson dibaca dari katalog penerbit, bukan dipercaya dari pemanggil: kalau klien
        // boleh mengirim lessons_total, dia bisa membuat dirinya "selesai" dengan menulis 1
        const courseManifest = manifestOf(body.course)
        const lessonsTotal = courseManifest?.course?.modules?.reduce((n, m) => n + (m.lessons?.length ?? 0), 0) ?? 0
        if (!courseManifest) return send(res, 400, jsonBody({ error: `course ${body.course} is not in the catalogue`, known: Object.keys(MANIFESTS) }))
        const out = await dbEnroll({
          learner: body.learner, courseId: body.course, lessonsTotal,
          message: body.message, signature: body.signature,
        })
        return out.ok
          ? send(res, 200, jsonBody({ enrolled: true, created: out.created, enrollmentId: out.enrollment?.id, course: out.enrollment?.course_id }))
          : send(res, 401, jsonBody({ error: out.why }))
      }
      if (path === '/grade') {
        // KUIS DINILAI DI SINI. Klien mengirim PILIHAN, bukan angka; `body.score` sengaja tidak
        // dibaca sama sekali — dan kalau ada, kita tolak, supaya tidak ada yang mengira angka
        // kiriman browser pernah diterima lewat jalur ini (B72).
        if (body.score !== undefined) {
          return send(res, 400, jsonBody({ error: '/grade does not accept score: the server computes it from picks' }))
        }
        if (!body.lesson) return send(res, 400, jsonBody({ error: 'requires lesson (quiz slug)' }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'grade' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        const graded = gradeQuiz({ courseId: body.course, lessonSlug: body.lesson, picks: body.picks })
        if (!graded.ok) return send(res, 422, jsonBody({ error: graded.why }))
        const attemptNo = Number.isInteger(Number(body.attempt)) && Number(body.attempt) > 0
          ? Number(body.attempt)
          : await dbNextAttemptNo(body.learner, body.course, body.lesson, 'kuis')
        const stored = await dbStoreAttempt({
          learner: body.learner, courseId: body.course, lessonKey: body.lesson, kind: 'kuis',
          attemptNo, score: graded.score, verdict: graded.verdict, rubricHash: graded.rubricHash,
          components: graded.components, deductions: [],
        })
        if (!stored.ok) return send(res, 422, jsonBody({ error: stored.why }))
        // `attemptNo` + `rubricHash` ikut dijawab supaya klien bisa menghitung ulang
        // `attempt_hash` dari yang dikembalikan server saja — kalau tidak, "rekaman ini bisa
        // diaudit" hanya bisa dibuktikan oleh pihak yang sudah memegang secret key.
        return send(res, 201, jsonBody({
          attemptHash: stored.attemptHash, attemptId: stored.attempt?.id, attemptNo,
          lesson: body.lesson, kind: 'kuis', rubricHash: graded.rubricHash,
          score: graded.score, correct: graded.correct, total: graded.total,
          passPct: graded.passPct, verdict: graded.verdict, gradedBy: 'server',
          components: graded.components.length,
        }))
      }
      if (path === '/essay') {
        /**
         * Penyerahan esai (B81). Yang datang dari klien adalah TEKS; tidak ada angka, tidak ada
         * rubrik. `body.score`/`body.rubric`/`body.max` ditolak dengan nama, supaya tidak ada yang
         * mengira jalur ini pernah menerima nilai kiriman browser.
         *
         * Teks disimpan di `submissions`, dan TIDAK disajikan lewat rute mana pun yang bisa dibaca
         * publik — `results.js` menulis `essayTextIncluded: false` dan janji itu dijaga di sini:
         * antrean dibaca penerbit lewat CLI (`npm run grade:essay`) yang memegang secret key, bukan
         * lewat GET anonim.
         */
        for (const banned of ['score', 'rubric', 'max', 'finalScore', 'verdict']) {
          if (body[banned] !== undefined) {
            return send(res, 400, jsonBody({ error: `/essay does not accept ${banned}: text only, the numbers belong to the publisher` }))
          }
        }
        if (!body.lesson) return send(res, 400, jsonBody({ error: 'requires lesson (essay slug)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const graded = await gradeAgainstRubric({ text: body.text, essay: found.lesson.essay })
        if (graded.verdict === 'NOT_AN_ESSAY_LESSON') return send(res, 400, jsonBody({ error: `lesson ${body.lesson} has no rubric` }))
        const state = graded.verdict === 'INSUFFICIENT_EVIDENCE' ? 'insufficient' : 'awaiting_judge'
        const out = await dbSubmitEssay({
          learner: body.learner, courseId: body.course, lessonKey: body.lesson, text: body.text,
          words: graded.words, mechanical: graded.mechanical, state,
          rubricHash: rubricHashOf(found.manifest), message: body.message, signature: body.signature,
        })
        if (!out.ok) {
          // "siapa kamu" (401) dan "permintaanmu tidak sah" (422) dipisah, seperti di /progress.
          // Yang berubah di sini: keputusannya lewat KODE (`out.kind`), bukan lewat membaca pesan
          // error dengan regex. Versi pertama saya menyandikan `penerbit` di kedua macam sebab, dan
          // hasilnya validasi "kriteria asing" dilaporkan sebagai kegagalan otentikasi — merah yang
          // menyalahkan pihak yang benar, persis kelas yang kita catat di B59/`serve-probe`.
          return send(res, out.kind === 'auth' ? 401 : 422, jsonBody({ error: out.why }))
        }
        return send(res, 201, jsonBody({
          attemptHash: out.attemptHash, attemptId: out.attemptId, attemptNo: out.attemptNo,
          state: out.state, words: out.words, score: null, verdict: 'incomplete',
          mechanicalPassed: (graded.mechanical ?? []).filter((m) => m.ok).length,
          mechanicalTotal: (graded.mechanical ?? []).length,
          note: graded.note ?? 'Menunggu penilaian penerbit — belum ada angka, dan itu bukan nol.',
        }))
      }

      if (path === '/essay/judgement') {
        /**
         * Penilaian oleh penerbit, atas nama EOA-nya sendiri (B81). Bukan peserta, dan bukan kami:
         * `dbJudgeEssay` menuntut tanda tangan EIP-191 atas nonce yang beralamat sama dengan
         * `ISSUER_ADDRESS` konfigurasi. Kenapa perbandingan alamat dan bukan `isIssuer()` di chain:
         * `isIssuer` sudah dituntut `issue.js` SEBELUM attestation bergerak, jadi penerbit yang tidak
         * terdaftar boleh menilai tapi tidak akan pernah bisa menerbitkan — dan rute ini tidak perlu
         * memegang klien chain untuk menolak angka yang salah.
         */
        if (!PAY_PAYEE) {
          return send(res, 500, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher address to require' }))
        }
        // Perbandingan sama seperti penjaga pembayaran di `checkPayment`: huruf kecil, tanpa checksum.
        if (String(body.issuer ?? '').toLowerCase() !== PAY_PAYEE.toLowerCase()) {
          return send(res, 401, jsonBody({ error: `judgements must be signed by the configured publisher (${PAY_PAYEE})` }))
        }
        if (!Number.isInteger(Number(body.attemptId))) return send(res, 400, jsonBody({ error: 'requires attemptId' }))
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (the rubric is read from the publisher manifest)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const out = await dbJudgeEssay({
          attemptId: body.attemptId, issuer: body.issuer, message: body.message, signature: body.signature,
          scores: body.scores, essay: found.lesson.essay, passMark: found.manifest.course.passMark,
          judgeModel: body.judgeModel ?? null, judgeTemp: body.judgeTemp ?? null,
        })
        if (!out.ok) {
          // Kode (`out.kind`) yang memutuskan; regex di bawah hanya jaring cadangan dan sengaja tidak
          // lagi memuat kata "penerbit" — kata itu muncul di pesan VALIDASI ("rubrik penerbit"), jadi
          // memakainya membuat kriteria asing dilaporkan sebagai kegagalan otentikasi (401).
          const authish = /tanda tangan|penandatangan/.test(out.why ?? '')
          return send(res, out.kind === 'auth' || authish ? 401 : 422, jsonBody({ error: out.why }))
        }
        return send(res, 200, jsonBody({
          attemptId: out.attemptId, attemptHash: out.attemptHash, replacedHash: out.replacedHash,
          score: out.score, verdict: out.verdict, components: out.components,
          gradedBy: body.judgeModel ? 'model' : 'human',
          // B104: angka model belum dihitung gerbang sampai reviewer mengesahkannya.
          needsReview: out.needsReview === true,
        }))
      }

      // Pengesahan manusia (B104). Dua rute, dua kunci berbeda: penerbit MENUNJUK reviewer,
      // reviewer MENGESAHKAN usulan model. Kode status lewat `out.kind`, bukan lewat membaca pesan.
      const reviewStatus = (out) => ({ auth: 401, role: 403, conflict: 409 })[out.kind] ?? 422
      if (path === '/essay/reviewers') {
        if (!PAY_PAYEE) return send(res, 500, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher address to require' }))
        if (String(body.issuer ?? '').toLowerCase() !== PAY_PAYEE.toLowerCase()) {
          return send(res, 401, jsonBody({ error: `reviewers are appointed by the configured publisher (${PAY_PAYEE})` }))
        }
        if (!manifestOf(body.course)) return send(res, 400, jsonBody({ error: `course ${body.course} is not in the catalogue`, known: Object.keys(MANIFESTS) }))
        const out = await dbAddReviewer({
          courseId: body.course, reviewer: body.reviewer, issuer: body.issuer, message: body.message, signature: body.signature,
        })
        return out.ok
          ? send(res, 200, jsonBody({ course: out.courseId, reviewer: out.reviewer, addedBy: out.addedBy }))
          : send(res, reviewStatus(out), jsonBody({ error: out.why }))
      }
      if (path === '/essay/review') {
        if (!Number.isInteger(Number(body.attemptId))) return send(res, 400, jsonBody({ error: 'requires attemptId' }))
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (the rubric is read from the publisher manifest)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const out = await dbReviewEssay({
          attemptId: body.attemptId, reviewer: body.reviewer, decision: body.decision, scores: body.scores,
          essay: found.lesson.essay, passMark: found.manifest.course.passMark, message: body.message, signature: body.signature,
        })
        if (!out.ok) return send(res, reviewStatus(out), jsonBody({ error: out.why }))
        return send(res, 200, jsonBody({
          attemptId: out.attemptId, decision: out.decision, proposed: out.proposed, finalScore: out.finalScore,
          verdict: out.verdict, attemptHash: out.attemptHash, replacedHash: out.replacedHash,
          reviewer: out.reviewer, judgeModel: out.judgeModel,
        }))
      }

      const out = await dbRecordAttempt({
        learner: body.learner, courseId: body.course, lessonKey: body.lesson ?? '-', kind: body.kind,
        attemptNo: body.attempt ?? 1, score: body.score, verdict: body.verdict,
        rubricHash: body.rubricHash, judgeModel: body.judgeModel, judgeTemp: body.judgeTemp,
        deductions: body.deductions, components: body.components,
        message: body.message, signature: body.signature,
      })
      return out.ok
        ? send(res, 201, jsonBody({ attemptHash: out.attemptHash, attemptId: out.attempt?.id, score: out.attempt?.score, verdict: out.attempt?.verdict }))
        : send(res, 401, jsonBody({ error: out.why }))
    }
    // Satu-satunya rute yang meminta bayaran. Verifikasi itu sendiri tetap gratis di halaman;
    // yang berbayar adalah jalur mesin-ke-mesin (agen yang memanggil kami untuk banyak kredensial).
    if (path === '/verify') return handleVerify(req, res)
    // Relayer penerbitan (B97). Agen menandatangani di tempatnya sendiri dan menyerahkan hasilnya
    // ke sini; semua penolakan terjadi di `submitRelay` sebelum satu wei pun bergerak.
    if (path === '/relay') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST required', path })
      let body
      try {
        body = await readJsonBody(req)
      } catch (err) {
        return send(res, 400, { error: err.message })
      }
      const out = await submitRelay({ body, rpcUrl: RPC_URL, resolverAddress: RESOLVER, basAddress: BAS })
      if (!out.ok) return send(res, out.status, { error: out.error })
      if (RELAY_BROADCAST && !out.duplicate) {
        drainRelayQueue({ rpcUrl: RPC_URL, resolverAddress: RESOLVER, basAddress: BAS, platformPrivateKey: process.env.DEPLOYER_PRIVATE_KEY })
      }
      return send(res, out.status, { ...out.job, duplicate: out.duplicate, broadcast: RELAY_BROADCAST ? 'enabled' : 'disabled' })
    }
    if (path.startsWith('/relay/')) {
      const job = await getRelayJob(decodeURIComponent(path.slice('/relay/'.length)))
      return job ? send(res, 200, job) : send(res, 404, { error: 'no relay job with that id', path })
    }
    // Setoran tenggat (B90). Tiga rute: aturan yang dilihat peserta SEBELUM memilih tenggat, keadaan
    // satu setoran dari chain, dan penyelesaian yang diadili sebelum gas (`deposit.js`).
    if (path === '/deposit/finalize' || path.startsWith('/deposit/')) {
      if (!DEPOSIT_READY) return send(res, 503, { error: 'deposit contract is not configured on this server', path })
      if (path === '/deposit/finalize') {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST required', path })
        let body
        try {
          body = await readJsonBody(req)
        } catch (err) {
          return send(res, 400, { error: err.message })
        }
        const out = await finalizeDeposit({
          body, cfg: DEPOSIT_CFG, broadcast: DEPOSIT_BROADCAST, platformPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
        })
        const { ok, status, ...rest } = out
        return send(res, status, jsonBody(rest))
      }
      const parts = decodeURIComponent(path.slice('/deposit/'.length)).split('/')
      if (parts[0] === 'policy') {
        const built = deadlinePolicyOf(parts[1] ?? '', DEPOSIT_CFG)
        return built
          ? send(res, 200, { policyHash: built.policyHash, policy: built.policy })
          : send(res, 404, { error: 'no publisher manifest for that course', path })
      }
      const out = await readDeposit({ slug: parts[0] ?? '', learner: parts[1], cfg: DEPOSIT_CFG })
      const { ok, status, ...rest } = out
      return send(res, status, jsonBody(rest))
    }
    // `result[0].id` di dalam setiap kredensial menunjuk ke sini: angka hasil + bukti apa yang
    // menghasilkannya + perangkat mana yang menilai (B44). Tanpa rute ini, ijazah kita mencetak
    // URL yang tidak menjawab — sama seperti `/criteria` kemarin.
    if (path.startsWith('/results/')) {
      const [slug, hash] = decodeURIComponent(path.slice('/results/'.length)).split('/')
      const found = await getCredentialByHash(hash)
      if (!found || !found.document) {
        return send(res, 404, { error: 'no result for that hash through this backend', path })
      }
      if (slug && found.course !== slug) {
        return send(res, 404, { error: 'courseId does not match its credentialHash', expected: found.course, path })
      }
      return send(res, 200, resultDocument({ baseUrl: BASE_URL, record: found }))
    }

    // kredensial yang sudah diterbitkan: `/credentials/<credentialHash>` — URL yang sama dengan
    // `id` di dalam dokumen, jadi tautan yang dicetak di ijazah memang menunjuk ke sini.
    // Rekaman tersimpan menurut hash-nya; `id` dokumen adalah URL penuh, dan permintaan masuk
    // sebagai pathname — jadi keduanya tidak pernah string-cocok.
    if (path.startsWith('/credentials/0x')) {
      const found = await getCredentialByHash(path.slice('/credentials/'.length))
      if (!found) return send(res, 404, { error: 'not issued through this backend', path })
      // Yang dijanjikan `id` adalah sebuah Verifiable Credential, jadi itulah yang keluar — bukan
      // rekaman internal kita. Bentuknya dijaga `probe:serve`, karena verifier standar berhenti di
      // sini kalau yang tersaji bukan dokumen: dulu rute ini memulangkan rekaman store dan tidak
      // ada satu pun pemeriksaan yang melihatnya.
      if (!found.document) {
        return send(res, 409, {
          error: 'this credential is known from the chain but has no document from us',
          credentialHash: found.credentialHash, uid: found.uid,
        })
      }
      if (new URL(req.url, BASE_URL).searchParams.get('format') === 'record') return send(res, 200, found)
      return send(res, 200, found.document)
    }
    if (path === '/healthz') {
      const r = await buildList(REVOCATION)
      const s = await buildList(SUSPENSION)
      return send(res, 200, {
        ok: true, baseUrl: BASE_URL, resolver: RESOLVER, rpc: RPC_URL,
        agent: AGENT_SLUG,
        // Semua identitas yang kami sajikan, supaya "kredensial ini menunjuk ke mana" bisa
        // dijawab dari satu permintaan, bukan dari tebakan slug.
        agentSlugs: (await listAgents()).map((a) => a.agentSlug),
        startedAt: STARTED_AT,
        // Kode mana yang sedang berjalan, direkam saat proses mulai: supaya penguji bisa bilang
        // "server ini lebih tua daripada src/ di disk" alih-alih melaporkan merah palsu.
        codeStamp: CODE_STAMP,
        watched: r.watched,
        // `unallocated` dilaporkan, bukan disembunyikan: kredensial yang ada di chain tapi belum
        // punya slot TIDAK ikut menentukan bit — dan itu harus kelihatan, bukan jadi daftar yang
        // tampak benar sambil diam-diam kurang.
        revocation: {
          flagged: r.flagged, bitstringHash: r.hash, unallocated: r.unallocated.length,
          slots: Object.fromEntries(r.slots),
        },
        suspension: {
          flagged: s.flagged, bitstringHash: s.hash, unallocated: s.unallocated.length,
          slots: Object.fromEntries(s.slots),
        },
        sha256OfEncodedList: {
          revocation: sha256Hex(r.encodedList), suspension: sha256Hex(s.encodedList),
        },
        // Dilaporkan supaya orang bisa MEMBUKA rute berbayar dan menemukan sendiri syaratnya,
        // bukan membaca angka harga dari dokumentasi kami.
        payment: {
          route: 'POST /verify', priceAtomic: String(PRICE), network: `eip155:${CHAIN_ID}`,
          token: PAY_TOKEN ?? '(belum diisi)', split: PAY_SPLIT ?? '(belum diisi)',
          payee: PAY_PAYEE ?? '(belum diisi)', configured: Boolean(PAY_TOKEN && PAY_SPLIT && PAY_PAYEE),
        },
        // Dilaporkan apa adanya: `broadcast: false` berarti permintaan diterima dan diantrekan,
        // tapi tidak ada yang disiarkan oleh proses ini.
        relay: {
          route: 'POST /relay', configured: Boolean(RPC_URL && RESOLVER && BAS), broadcast: RELAY_BROADCAST,
          maxBatch: RELAY_MAX_BATCH, maxDeadlineSeconds: RELAY_MAX_DEADLINE_SECONDS, jobs: await relaySummary(),
        },
        // Alamat kontraknya dilaporkan di sini supaya bisa dibuka di explorer, bukan dibaca dari
        // dokumentasi kami; `broadcast: false` = penyelesaian diadili tapi tidak disiarkan proses ini.
        deposit: {
          routes: 'GET /deposit/policy/<course> · GET /deposit/<course>/<learner> · POST /deposit/finalize',
          contract: DEPOSIT ?? '(belum diisi)', configured: DEPOSIT_READY, broadcast: DEPOSIT_BROADCAST,
        },
      })
    }
    return send(res, 404, {
      error: 'not found', path,
      hint: `/issuers/${AGENT_SLUG} | /criteria/<courseId> | /results/<courseId>/<credentialHash> | /credentials/<credentialHash> | /credentials/status/{revocation,suspension} | /verify (POST, berbayar) | /relay (POST) | /relay/<id> | /deposit/policy/<courseId> | /deposit/<courseId>/<learner> | /deposit/finalize (POST) | /healthz`,
    })
  } catch (err) {
    // Tidak menutupi sebabnya: kegagalan konfigurasi harus terbaca sebagai kegagalan konfigurasi.
    return send(res, 500, { error: err.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`signer: ${BASE_URL}/issuers/${AGENT_SLUG}`)
  console.log(`        ${BASE_URL}/credentials/status/${REVOCATION}`)
  console.log(`        ${BASE_URL}/credentials/status/${SUSPENSION}`)
  console.log(`        ${BASE_URL}/verify  (POST, x402 exact, harga ${PRICE} @ eip155:${CHAIN_ID})`)
  console.log(`resolver ${RESOLVER ?? '(belum diisi)'} via ${RPC_URL ?? '(belum diisi)'}`)
})

export { server, buildList }
