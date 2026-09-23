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
import { createServer } from 'node:http'
import { loadKey, issuerDocument } from './issuer.js'
import { REVOCATION, SUSPENSION, renderList, servedHashes } from './lists.js'
import { sha256Hex } from './credential.js'
import { makeDocumentLoader } from './sign.js'
import { getCredential } from './store.js'
import { paymentRequirements, decodePaymentHeader, settlePayment, encodePaymentHeader } from './x402.js'
import { verify as verifyCredential, defaultEndpoint } from '../../web/src/verify.ts'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const BASE_URL = process.env.BASE_URL ?? `http://${HOST}:${PORT}`
const AGENT_SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const RESOLVER = process.env.RESOLVER_ADDRESS
const RPC_URL = process.env.RPC_URL

// Harga satu verifikasi, dalam satuan terkecil token (6 desimal): 0,001 = "satu permen".
const PRICE = BigInt(process.env.X402_PRICE ?? '1000')
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 97)
const PAY_TOKEN = process.env.DEMO_TOKEN_ADDRESS
const PAY_SPLIT = process.env.SPLIT_ADDRESS
// Yang dibayar adalah PENERBIT. Platform mengambil bagiannya lewat kontrak pembagian,
// bukan dengan menulis alamatnya sendiri sebagai penerima.
const PAY_PAYEE = process.env.ISSUER_ADDRESS
const TIMEOUT_SECONDS = Number(process.env.X402_TIMEOUT ?? 600)

const { key, controller, name } = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument({ controller, name, key })
const loaderDocs = { [controller]: issuerDoc }
const documentLoader = makeDocumentLoader(loaderDocs)

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
  if (!RESOLVER || !RPC_URL || hashes.length === 0) {
    throw new Error('RESOLVER_ADDRESS / RPC_URL belum diisi (dan store belum punya kredensial terbit maupun adopsi)')
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
    return send(res, 500, { error: 'DEMO_TOKEN_ADDRESS / SPLIT_ADDRESS / ISSUER_ADDRESS belum diisi — jalur berbayar tidak bisa melayani tanpa itu' })
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
  const credentialHash = String(body.credentialHash ?? body.i ?? '').trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(credentialHash)) {
    return send(res, 400, { error: 'butuh body JSON {credentialHash: 0x…64 heks}' })
  }

  let settled
  try {
    settled = await settlePayment({
      rpcUrl: RPC_URL, facilitatorPk: process.env.DEPLOYER_PRIVATE_KEY,
      payment, split: PAY_SPLIT, payee: PAY_PAYEE,
      splitRefSalt: `${credentialHash}:${p.nonce}:${Date.now()}`,
    })
  } catch (err) {
    // Pembayaran yang gagal tidak membuat kami menahan datanya: 402 lagi, dengan sebab yang jelas.
    return notPaid(res, `settlement gagal: ${err.message.split('\n')[0]}`)
  }

  const ep = defaultEndpoint()
  const report = await verifyCredential(credentialHash, {
    ...ep, rpcUrl: RPC_URL ?? ep.rpcUrl, resolver: RESOLVER ?? ep.resolver,
  })

  const responseHeader = encodePaymentHeader({
    x402Version: 1,
    success: true,
    network: `eip155:${CHAIN_ID}`,
    transaction: settled.settleTx,
    payer: p.payer,
    // Kami menambahkan ini di luar spesifikasi: bukti bahwa pendapatan TERBAGI, bukan cuma sampai.
    settlement: { settleTx: settled.settleTx, splitTx: settled.splitTx, splitRef: settled.splitRef },
  })

  return send(res, 200, {
    paid: { amount: String(p.amount), token: p.token, settleTx: settled.settleTx, splitTx: settled.splitTx },
    // Selisih yang dibaca dari chain — bukan asumsi bahwa pembagian pasti terjadi.
    sharesOnChain: {
      payee: String(settled.issuerShare), facilitator: String(settled.platformShare), leftInSplit: String(settled.leftInSplit),
    },
    report,
  }, 'application/json', { 'x-payment-response': responseHeader })
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
    if (path === `/credentials/status/${REVOCATION}`) return send(res, 200, (await buildList(REVOCATION)).signed)
    if (path === `/credentials/status/${SUSPENSION}`) return send(res, 200, (await buildList(SUSPENSION)).signed)
    // Satu-satunya rute yang meminta bayaran. Verifikasi itu sendiri tetap gratis di halaman;
    // yang berbayar adalah jalur mesin-ke-mesin (agen yang memanggil kami untuk banyak kredensial).
    if (path === '/verify') return handleVerify(req, res)
    // kredensial yang sudah diterbitkan: `/credentials/<credentialHash>` — URL yang sama dengan
    // `id` di dalam dokumen, jadi tautan yang dicetak di ijazah memang menunjuk ke sini
    if (path.startsWith('/credentials/0x')) {
      const found = await getCredential(path)
      if (!found) return send(res, 404, { error: 'belum diterbitkan lewat backend ini', path })
      return send(res, 200, found)
    }
    if (path === '/healthz') {
      const r = await buildList(REVOCATION)
      const s = await buildList(SUSPENSION)
      return send(res, 200, {
        ok: true, baseUrl: BASE_URL, resolver: RESOLVER, rpc: RPC_URL,
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
      })
    }
    return send(res, 404, { error: 'not found', path, hint: `/issuers/${AGENT_SLUG} | /credentials/status/{revocation,suspension} | /verify (POST, berbayar) | /healthz` })
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
