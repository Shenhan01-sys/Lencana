/**
 * Membaca keadaan kredensial DARI CHAIN dan menurunkan bit status darinya.
 *
 * Inilah isi keputusan D24.1=A, bukan sekadar bentuk dokumennya: verifier standar tidak membaca
 * chain, jadi kita yang berjalan ke arah mereka — tetapi nilainya tetap bukan berasal dari
 * database kita. Yang menentukan sebuah bit bernilai 1 hanyalah `statusOf()` pada resolver yang
 * ter-deploy. Artinya kalau seseorang menyunting berkas state kami, atau server kami berbohong,
 * bit berikutnya yang dibangun dari chain akan mengoreksinya sendiri.
 *
 * Pemetaan yang dipakai:
 *   revoked  (revocationTime != 0)      -> list `revocation`   (BSL: permanen)
 *   issuerDelisted                       -> list `suspension`   (BSL: dapat dipulihkan)
 * Persis pembeda yang kita buat di D30, sekarang terbaca oleh alat yang bukan milik kita.
 */
import { createPublicClient, http, getAddress } from 'viem'
// Diimpor, tidak disalin: ABI ini sudah dijaga `probe.ts` terhadap chain nyata, dan Node 22
// melepas type-nya langsung. Menduplikasi daftar fungsi di sini hanya menciptakan sumber
// kebenaran kedua — pelajaran yang sudah kita bayar di tempat lain.
import { credentialResolverAbi, EMPTY_UID } from '../../web/src/abi.ts'

/**
 * @param hashes bytes32[] credentialHash yang kita awasi
 * @returns Map<uid, { hash, revoked, expired, issuerDelisted, issuer, exists }>
 */
export async function readChainStatuses ({ rpcUrl, resolverAddress, hashes }) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const out = new Map()
  for (const hash of hashes) {
    const uid = await client.readContract({
      address: resolverAddress, abi: credentialResolverAbi, functionName: 'attestationOf', args: [hash],
    })
    if (!uid || uid === EMPTY_UID) continue
    const [exists, revoked, expired, issuerDelisted, issuer] = await client.readContract({
      address: resolverAddress, abi: credentialResolverAbi, functionName: 'statusOf', args: [hash],
    })
    if (!exists) continue
    out.set(uid, {
      uid, hash, revoked, expired, issuerDelisted,
      issuer: getAddress(issuer),
      // Entri status hanya boleh dibuat untuk kredensial yang memang terbit di sistem kita.
      ours: true,
    })
  }
  return out
}

/** uid yang harus bernilai 1 di list `revocation`. */
export function revokedUids (statuses) {
  return [...statuses.entries()].filter(([, s]) => s.revoked).map(([uid]) => uid)
}

/**
 * uid yang harus bernilai 1 di list `suspension`.
 *
 * Hanya delisting. `expired` sengaja TIDAK masuk: kadaluarsa sudah dinyatakan di dalam dokumen
 * (`validUntil`) dan verifier membacanya sendiri — menyalakannya juga di list berarti dua sumber
 * kebenaran untuk satu fakta, dan keduanya boleh tidak sinkron.
 */
export function suspendedUids (statuses) {
  return [...statuses.entries()].filter(([, s]) => s.issuerDelisted && !s.revoked).map(([uid]) => uid)
}
