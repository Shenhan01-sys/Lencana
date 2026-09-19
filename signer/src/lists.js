/**
 * Perender daftar status — dipakai SERVER dan sisi PENERBIT, satu implementasi.
 *
 * Kenapa di modul sendiri dan bukan di dalam server.js: sisi penerbit juga perlu tahu bitstring
 * yang akan disajikan (untuk meng-anchor hash-nya ke BAS). Menyalin logikanya ke dua tempat
 * berarti hash yang kami kunci bisa berasal dari aturan yang berbeda dari daftar yang kami hidangkan
 * — dan itulah satu-satunya hal yang membuat anchor ada gunanya.
 */
import { IndexAllocator, REVOCATION, SUSPENSION, encodeList, statusListCredential } from './statusList.js'
import { readChainStatuses, revokedUids, suspendedUids } from './chainStatus.js'
import { signDocument } from './sign.js'
import { loadAllocator } from './store.js'
import { listHashBytes } from './anchor.js'

export { REVOCATION, SUSPENSION }

/**
 * @param hashes  kredensial yang diawasi; kosong = ambil semua yang pernah diterbitkan di store
 */
export async function renderList ({
  purpose, baseUrl, rpcUrl, resolverAddress, hashes = [],
  key, controllerDocument, documentLoader,
}) {
  const statuses = await readChainStatuses({ rpcUrl, resolverAddress, hashes })
  const { alloc } = await loadAllocator()

  const slots = new Map()
  const unallocated = []
  for (const uid of statuses.keys()) {
    const index = alloc.peek(purpose, uid)
    if (index === undefined) { unallocated.push(uid); continue }
    slots.set(uid, index)
  }
  const flagged = new Set(
    (purpose === REVOCATION ? revokedUids(statuses) : suspendedUids(statuses))
      .filter((uid) => slots.has(uid)),
  )
  const encodedList = encodeList({ slots, flagged })
  const doc = statusListCredential({
    baseUrl,
    purpose,
    encodedList,
    issuerId: controllerDocument.id,
    issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  })
  const signed = await signDocument(doc, { key, controllerDocument, documentLoader })
  return {
    signed, encodedList, hash: listHashBytes(encodedList),
    statuses, slots, unallocated, flagged: flagged.size, watched: statuses.size,
  }
}
