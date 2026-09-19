/**
 * Daftar status BitstringStatusList — bagian yang membuat keputusan D24.1=A nyata.
 *
 * Kenapa ini ada: verifier Open Badges TIDAK membaca chain. §9.1 OB3.0 mendefinisikan perilaku
 * pencabutan untuk satu tipe saja, `BitstringStatusListEntry`. Tanpa ikut ke mekanisme itu,
 * kredensial kita bisa lolos validator pihak ketiga sambil menampilkan "ACTIVE" untuk sertifikat
 * yang sudah kita cabut di chain — kegagalan yang persis produk ini klaim hilangkan.
 *
 * DUA LIST, bukan satu, dan itu pilihan sadar:
 *   - `revocation`  -> kredensial yang dicabut penerbitnya. Menurut BSL: "not reversible".
 *                      Sama persis dengan sifat `revoke()` EAS.
 *   - `suspension`  -> kredensial yang penerbitnya sedang di-delisting platform. Menurut BSL:
 *                      "temporarily prevent the acceptance ... reversible". Sama persis dengan
 *                      sifat `delistIssuer()`/`relistIssuer()` (D30).
 * Menyatukan keduanya ke satu list akan MENGHAPUS perbedaan yang kita perjuangkan di D30, dan
 * itu akan terbaca oleh verifier mana pun sebagai "revoked" — klaim yang bisa dibantah satu
 * eth_call. BSL mengizinkan lebih dari satu entri per kredensial (Example 6), jadi tidak perlu
 * mengorbankan pembeda itu.
 *
 * ATURAN YANG DIPEGANG (dikutip dari spesifikasi, bukan dari ingatan):
 *   - `statusListIndex`  : integer basis 10 yang EKSPRESINYA HARUS STRING
 *   - bitstring          : indeks 0 di bit PALING KIRI
 *   - `encodedList`      : multibase base64url (tanpa padding) dari bitstring yang di-gzip
 *   - `statusSize`       : tidak ditulis = 1 (satu bit per kredensial, jadi dua list di atas
 *                          masing-masing cukup 1 bit dan tidak perlu `statusMessage`)
 */
import { gzipSync, gunzipSync } from 'node:zlib'
import { VC_V2_CONTEXT } from './context.js'

export const REVOCATION = 'revocation'
export const SUSPENSION = 'suspension'

/** Ukuran bitstring default BSL = 16384 bit. List kedua dibuat kalau penuh, tidak diam-diam. */
export const LIST_BITS = 16384

const B64URL = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Alokasi indeks.
 *
 * Jujur soal batasnya: **nomor slot hidup di sisi penerbit**, statusnya yang diambil dari chain.
 * Ini bukan pembukuan kredensial — ia hanya "kredensial ini menempati bit nomor berapa", dan
 * hilangnya file ini berarti list lama tidak bisa dibaca ulang, bukan kredensial jadi salah.
 * Yang TIDAK boleh datang dari file ini: apakah sesuatu revoked/suspended. Itu selalu dari chain.
 */
export class IndexAllocator {
  constructor (state = { nextIndex: 0, byUid: {} }) {
    this.state = state
  }

  static from (raw) {
    return new IndexAllocator(raw ? JSON.parse(raw) : undefined)
  }

  toJSON () {
    return JSON.stringify(this.state, null, 2)
  }

  /** Nomor slot milik uid ini; kalau belum ada, alokasikan di list `purpose` ini. */
  slot (purpose, uid) {
    const key = `${purpose}:${uid}`
    if (this.state.byUid[key] !== undefined) return this.state.byUid[key]
    const index = this.state.nextIndex++
    this.state.byUid[key] = index
    return index
  }

  /**
   * Baca saja: `undefined` kalau belum pernah dialokasikan.
   *
   * Ini bedanya penting. Yang BOLEH mengalokasikan nomor bit hanyalah sisi penerbit, di momen
   * kredensialnya terbit. Server penyaji hanya boleh MEMBACA alokasi — kalau ia ikut
   * mengalokasikan, nomornya ikut urutan iterasi saat itu dan bisa berbeda dari yang sudah
   * tertulis di dalam kredensial yang terbit lebih dulu. Kegagalannya sunyi dan salah alamat.
   */
  peek (purpose, uid) {
    return this.state.byUid[`${purpose}:${uid}`]
  }

  has (purpose, uid) {
    return this.state.byUid[`${purpose}:${uid}`] !== undefined
  }
}

/** Entri `credentialStatus` yang ditempelkan ke kredensial. */
export function statusEntry ({ baseUrl, purpose, index, uid }) {
  return {
    // `id` entri TIDAK BOLEH sama dengan URL list-nya (kata spesifikasi), jadi kita pakai
    // fragment milik kredensial ini di dalam list itu.
    id: `${baseUrl}/credentials/status/${purpose}#${uid}`,
    type: 'BitstringStatusListEntry',
    statusPurpose: purpose,
    statusListIndex: String(index),
    statusListCredential: `${baseUrl}/credentials/status/${purpose}`,
  }
}

/**
 * Bangun bitstring dari keadaan chain.
 * @param slots Map<uid, index> — slot tiap kredensial di list ini
 * @param flagged Set<uid> — uid yang harus bernilai 1, dibaca DARI CHAIN
 */
export function encodeList ({ slots, flagged }) {
  const bytes = new Uint8Array(LIST_BITS / 8)
  for (const uid of flagged) {
    const index = slots.get(uid)
    if (index === undefined || index >= LIST_BITS) continue
    // indeks 0 = bit paling kiri -> bit (index % 8) dihitung dari MSB
    bytes[Math.floor(index / 8)] |= 0x80 >> (index % 8)
  }
  return 'u' + B64URL(gzipSync(Buffer.from(bytes)))
}

/**
 * Kredensial daftar status. Ini dokumen VC juga — ditandatangani kunci yang sama, karena
 * verifier mempercayai list ini lewat tanda tangan, bukan lewat URL kita.
 */
export function statusListCredential ({ baseUrl, purpose, encodedList, issuerId, issuedAt }) {
  return {
    // HANYA konteks W3C. `BitstringStatusListCredential`, `BitstringStatusList`, `encodedList`
    // dan `statusPurpose` sudah didefinisikan di dalamnya (dengan konteks bersarang sendiri —
    // sudah dibaca dari berkas aslinya, bukan diasumsikan).
    //
    // ⚠️ `https://w3id.org/vc/status-list/2021/v1` itu TIDAK bisa dipakai di sini: konteks itu
    // mendefinisikan keluarga **StatusList2021** (`StatusList2021Credential`, `revocationList`),
    // bukan Bitstring. Mengikutkannya membuat istilah kita hilang saat ekspansi dan jsonld 9
    // mode-safe gagal dengan pesan yang menunjuk ke tempat yang salah.
    '@context': [VC_V2_CONTEXT],
    id: `${baseUrl}/credentials/status/${purpose}`,
    type: ['VerifiableCredential', 'BitstringStatusListCredential'],
    // URL telanjang, sama seperti contoh di spesifikasi daftar status. `type: 'Profile'`
    // TIDAK dipakai di sini: istilah `Profile` dipasok konteks Open Badges, dan dokumen ini
    // sengaja hanya memakai konteks W3C — jsonld 9 mode-safe menolak `@type` relatif.
    issuer: issuerId,
    validFrom: issuedAt,
    credentialSubject: {
      id: `${baseUrl}/credentials/status/${purpose}#list`,
      type: 'BitstringStatusList',
      statusPurpose: purpose,
      encodedList,
    },
  }
}

/**
 * Baca balik satu bit — dipakai `check` untuk membuktikan bit yang kami tulis memang berarti
 * seperti yang dipahami verifier, bukan hanya byte yang kami kira benar.
 */
export function decodeBit (encodedList, index) {
  const raw = Buffer.from(encodedList.slice(1).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const bytes = gunzipSync(raw)
  return (bytes[Math.floor(index / 8)] >> (7 - (index % 8))) & 1
}
