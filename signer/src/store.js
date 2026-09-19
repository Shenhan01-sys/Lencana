/**
 * State penerbitan yang HARUS bertahan: nomor slot dan daftar kredensial yang kita terbitkan.
 *
 * Kenapa berkas ini ada (dan kenapa ini bukan detail kecil): nomor `statusListIndex` yang ditulis
 * ke DALAM sebuah kredensial harus bit yang sama dengan yang di-set server saat daftar status
 * dibangun ulang. Selama alokator dibangun baru tiap proses, nomor itu tergantung urutan input —
 * kredensial bisa menunjuk bit milik orang lain, dan itu gagal dengan cara yang TIDAK kelihatan
 * di pemeriksaan tanda tangan (dokumennya tetap sah, cuma menunjuk salah).
 *
 * Jadi: alokasi append-only, disimpan, dan dibaca ulang oleh penerbit DAN server. File-nya
 * sengaja JSON teks — bisa dibaca manusia, dan hilang-nya kelihatan.
 *
 * Batas yang tetap benar disebut: **nomor slot** hidup di sisi penerbit; **status** selalu
 * dibaca dari chain. Kehilangan berkas ini membuat daftar lama tidak bisa diturunkan ulang —
 * tidak membuat status sebuah kredensial menjadi salah.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IndexAllocator } from './statusList.js'

const HERE = dirname(fileURLToPath(import.meta.url))
export const STORE_DIR = process.env.LANCENA_STORE ?? join(HERE, '..', '.store')
const STATE = join(STORE_DIR, 'state.json')

async function read () {
  try {
    const parsed = JSON.parse(await readFile(STATE, 'utf8'))
    return { nextIndex: 0, byUid: {}, credentials: {}, watched: {}, ...parsed }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return { nextIndex: 0, byUid: {}, credentials: {}, watched: {} }
  }
}

/**
 * Kredensial yang dipantau daftar status = yang kita TERBITKAN sendiri + yang DIADOPSI dari chain.
 * Dua-duanya harus masuk: kalau hanya registry terbitan yang dibaca, empat keadaan hasil `SeedDemo`
 * (yang dicabut dan yang penerbitnya dijatuhkan — justru yang paling ingin kita tunjukkan) tidak akan
 * pernah muncul di list yang kita sajikan. List-nya tidak error, cuma tampak pendek — dan itu cara
 * paling nyaman untuk salah.
 */
export async function watchedHashes () {
  const state = await read()
  const fromIssued = Object.values(state.credentials).map((c) => c.credentialHash)
  const fromAdopted = Object.values(state.watched)
  return [...new Set([...fromIssued, ...fromAdopted].map((h) => h.toLowerCase()))]
}

async function write (state) {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STATE, JSON.stringify(state, null, 2), 'utf8')
}

/** Alokator yang membaca dan menulis state di disk. */
export async function loadAllocator () {
  const initial = await read()
  const alloc = new IndexAllocator({ nextIndex: initial.nextIndex, byUid: initial.byUid })
  return {
    alloc,
    /**
     * ⚠️ Baca ULANG sebelum menulis, lalu tambal hanya dua field alokasi.
     *
     * Versi pertama menulis objek hasil baca di awal proses. Karena `watchCredential` dan
     * `rememberCredential` juga menulis berkas yang sama di antaranya, commit lalu MENIMPA
     * state dengan salinan lama dan catatan yang baru ditulis hilang tanpa suara — terdeteksi
     * di sini sebagai "4 diadopsi, tapi yang dipantau tetap 1".
     */
    async commit () {
      const current = await read()
      current.nextIndex = alloc.state.nextIndex
      current.byUid = alloc.state.byUid
      await write(current)
    },
  }
}

/** Simpan dokumen kredensial yang sudah diterbitkan + ditandatangani. */
export async function rememberCredential (record) {
  const state = await read()
  state.credentials[record.id] = record
  await write(state)
  return record
}

export async function listCredentials () {
  const state = await read()
  return Object.values(state.credentials)
}

export async function getCredential (id) {
  const state = await read()
  return state.credentials[id] ?? null
}

/** Kredensial yang pernah kita terbitkan sendiri. */
export async function knownHashes () {
  const state = await read()
  return Object.values(state.credentials).map((c) => c.credentialHash)
}

/**
 * Catat kredensial yang diadopsi dari chain supaya ikut dipantau daftar status.
 * Sengaja terpisah dari `rememberCredential`: yang ini TIDAK punya dokumen OB3.0 dari kita —
 * ia sudah ada di chain sebelum backend ini ada, dan tugas kita hanya membuat statusnya terbaca.
 */
export async function watchCredential (uid, credentialHash) {
  const state = await read()
  state.watched[uid] = credentialHash
  await write(state)
}
