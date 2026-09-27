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
 * Berapa banyak kredensial yang boleh DITANYAKAN bersamaan.
 *
 * Bukan 1 (lamban — lihat angka di bawah), dan bukan "semua sekaligus" juga. Ukurannya datang dari
 * pelajaran jalur x402: mencoba memverifikasi 25 hash paralel terhadap RPC publik menghasilkan
 * SETENGAH respons kosong (web/src/verify.ts membatasi batch laporan ke 4 karena itu).
 *
 * Terukur 27 Sep pada 14 kredensial yang dipantau (npm run measure:signing):
 *   render penuh sebelum perubahan  ~4,4 s   (28 eth_call berurutan)
 *   render penuh sesudahnya         ~2,0 s
 *   kripto murni per daftar        ~133 ms  (median 5×, min 121 max 149)
 *   verifikasi daftar              ~141 ms
 * Jadi sisa ~2 s itu RTT RPC, bukan CPU — dan itu membedakan keputusan host mana yang cocok.
 */
const RPC_CONCURRENCY = 6

/**
 * Satu kredensial = dua `eth_call` (`attestationOf`, lalu `statusOf`), dan keduanya harus tetap
 * berurutan karena yang kedua hanya berguna kalau UID-nya ada.
 */
async function readOne (client, resolverAddress, hash) {
  const uid = await client.readContract({
    address: resolverAddress, abi: credentialResolverAbi, functionName: 'attestationOf', args: [hash],
  })
  if (!uid || uid === EMPTY_UID) return null
  const [exists, revoked, expired, issuerDelisted, issuer] = await client.readContract({
    address: resolverAddress, abi: credentialResolverAbi, functionName: 'statusOf', args: [hash],
  })
  if (!exists) return null
  return {
    uid, hash, revoked, expired, issuerDelisted,
    issuer: getAddress(issuer),
    // Entri status hanya boleh dibuat untuk kredensial yang memang terbit di sistem kita.
    ours: true,
  }
}

/**
 * @param hashes bytes32[] credentialHash yang kita awasi
 * @returns Map<uid, { hash, revoked, expired, issuerDelisted, issuer, exists }>
 *
 * Hasil disusun ulang dalam urutan INPUT, bukan urutan penyelesaian: `encodeList` dan
 * `unallocated` bergantung pada himpunan, bukan pada urutan, tapi `serve-probe` dan anchor
 * membandingkan hash bitstring lintas proses — dan satu respons yang datang lebih cepat tidak
 * boleh bisa mengubah daftar yang disajikan.
 */
export async function readChainStatuses ({ rpcUrl, resolverAddress, hashes }) {
  const client = createPublicClient({ transport: http(rpcUrl) })
  const out = new Map()
  for (let i = 0; i < hashes.length; i += RPC_CONCURRENCY) {
    const settled = await Promise.all(
      hashes.slice(i, i + RPC_CONCURRENCY).map((h) => readOne(client, resolverAddress, h)),
    )
    for (const s of settled) if (s) out.set(s.uid, s)
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
