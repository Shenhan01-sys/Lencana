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
import { loadAllocator, watchedHashes } from './store.js'
import { listHashBytes } from './anchor.js'

export { REVOCATION, SUSPENSION }

/**
 * SATU sumber kebenaran untuk "kredensial mana yang masuk daftar status".
 *
 * Kenapa harus satu fungsi: dulu sisi penerbit meng-anchor hash daftar yang hanya berisi
 * kredensial yang baru terbit, sementara server menyajikan daftar atas SEMUA yang dipantau.
 * Dua-duanya memakai `renderList` yang sama, jadi aturannya identik — tapi INPUT-nya beda,
 * sehingga hash yang dikunci ke chain tidak pernah bisa sama dengan bitstring yang kita
 * hidangkan. Anchor seperti itu terlihat aman dan sebenarnya tidak membuktikan apa pun.
 *
 * `STATUS_HASHES` tetap menang kalau diisi: itu tuas untuk menderetkan daftar secara manual.
 */
export async function servedHashes () {
  const override = (process.env.STATUS_HASHES ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return override.length ? override : await watchedHashes()
}

/**
 * @param hashes  daftar kredensial yang MASUK ke bitstring. Kalau inputnya kosong, hasilnya
 *                daftar kosong — pemanggil harus menyebut sumbernya dengan sadar
 *                (pakai `servedHashes()`). Dulu komentar di sini mengklaim "kosong = ambil
 *                semua", dan klaim itu sendiri yang membuat anchor diam-diam mengunci daftar
 *                yang tidak pernah disajikan.
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
