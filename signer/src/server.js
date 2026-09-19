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
import { REVOCATION, SUSPENSION, renderList } from './lists.js'
import { sha256Hex } from './credential.js'
import { makeDocumentLoader } from './sign.js'
import { knownHashes, getCredential } from './store.js'

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
  const hashes = WATCHED.length ? WATCHED : await knownHashes()
  if (!RESOLVER || !RPC_URL || hashes.length === 0) {
    throw new Error('RESOLVER_ADDRESS / RPC_URL belum diisi (dan store belum punya kredensial)')
  }
  return renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes,
    key, controllerDocument: issuerDoc, documentLoader,
  })
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
