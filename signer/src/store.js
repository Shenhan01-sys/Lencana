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
    return JSON.parse(await readFile(STATE, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return { nextIndex: 0, byUid: {}, credentials: {} }
  }
}

async function write (state) {
  await mkdir(STORE_DIR, { recursive: true })
  await writeFile(STATE, JSON.stringify(state, null, 2), 'utf8')
}

/** Alokator yang membaca dan menulis state di disk. */
export async function loadAllocator () {
  const state = await read()
  const alloc = new IndexAllocator({ nextIndex: state.nextIndex, byUid: state.byUid })
  return {
    alloc,
    async commit () {
      state.nextIndex = alloc.state.nextIndex
      state.byUid = alloc.state.byUid
      await write(state)
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

/** uid yang pernah kita terbitkan, untuk server, supaya ia mengawasi hal yang sama. */
export async function knownHashes () {
  const state = await read()
  return Object.values(state.credentials).map((c) => c.credentialHash)
}
