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
import { IndexAllocator, REVOCATION, SUSPENSION, encodeList, statusListCredential } from './statusList.js'
import { readChainStatuses, revokedUids, suspendedUids } from './chainStatus.js'
import { sha256Hex } from './credential.js'
import { signDocument, makeDocumentLoader } from './sign.js'

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const BASE_URL = process.env.BASE_URL ?? `http://${HOST}:${PORT}`
const AGENT_SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const RESOLVER = process.env.RESOLVER_ADDRESS
const RPC_URL = process.env.RPC_URL
const WATCHED = (process.env.STATUS_HASHES ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const { key, controller, name } = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument({ controller, name, key })
const loaderDocs = { [controller]: issuerDoc }
const documentLoader = makeDocumentLoader(loaderDocs)

/** Daftar untuk satu purpose, diturunkan dari chain saat itu juga. */
async function buildList (purpose) {
  if (!RESOLVER || !RPC_URL || WATCHED.length === 0) {
    throw new Error('RESOLVER_ADDRESS / RPC_URL / STATUS_HASHES belum diisi')
  }
  const statuses = await readChainStatuses({ rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes: WATCHED })
  const allocator = new IndexAllocator()
  const slots = new Map()
  for (const uid of statuses.keys()) slots.set(uid, allocator.slot(purpose, uid))
  const flagged = new Set(purpose === REVOCATION ? revokedUids(statuses) : suspendedUids(statuses))
  const encodedList = encodeList({ slots, flagged })
  const doc = statusListCredential({
    baseUrl: BASE_URL, purpose, encodedList, issuerId: controller,
    issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  })
  const signed = await signDocument(doc, { key, controllerDocument: issuerDoc, documentLoader })
  loaderDocs[`${BASE_URL}/credentials/status/${purpose}`] = signed
  // `slots` ikut dikembalikan: siapa pun yang membaca list kami harus bisa tahu bit mana milik
  // kredensial mana TANPA menebak urutan alokasi kami.
  return { signed, counted: flagged.size, of: statuses.size, slots }
}

function send (res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    // Verifier pihak ketiga membacanya dari browser: tanpa ini responsnya tidak bisa dipakai
    // di uji interoperabilitas yang memang mau kita lakukan.
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  })
  res.end(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, BASE_URL).pathname
  try {
    if (path === `/issuers/${AGENT_SLUG}` || path === '/issuers') return send(res, 200, issuerDoc)
    if (path === `/credentials/status/${REVOCATION}`) return send(res, 200, (await buildList(REVOCATION)).signed)
    if (path === `/credentials/status/${SUSPENSION}`) return send(res, 200, (await buildList(SUSPENSION)).signed)
    if (path === '/healthz') {
      const r = await buildList(REVOCATION)
      const s = await buildList(SUSPENSION)
      return send(res, 200, {
        ok: true, baseUrl: BASE_URL, resolver: RESOLVER, rpc: RPC_URL,
        watched: r.of,
        // `slots` dilaporkan, bukan dibiarkan ditebak: pembaca list harus tahu bit mana milik
        // kredensial mana tanpa perlu tahu urutan alokasi kami.
        revocation: {
          flagged: r.counted,
          bitstringHash: sha256Hex(r.signed.credentialSubject.encodedList),
          slots: Object.fromEntries(r.slots),
        },
        suspension: {
          flagged: s.counted,
          bitstringHash: sha256Hex(s.signed.credentialSubject.encodedList),
          slots: Object.fromEntries(s.slots),
        },
      })
    }
    return send(res, 404, { error: 'not found', path, hint: `/issuers/${AGENT_SLUG} | /credentials/status/{revocation,suspension} | /healthz` })
  } catch (err) {
    // Tidak menutupi sebabnya: kegagalan konfigurasi harus terbaca sebagai kegagalan konfigurasi.
    return send(res, 500, { error: err.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`signer: ${BASE_URL}/issuers/${AGENT_SLUG}`)
  console.log(`        ${BASE_URL}/credentials/status/${REVOCATION}`)
  console.log(`        ${BASE_URL}/credentials/status/${SUSPENSION}`)
  console.log(`resolver ${RESOLVER ?? '(belum diisi)'} via ${RPC_URL ?? '(belum diisi)'}`)
})

export { server, buildList }
