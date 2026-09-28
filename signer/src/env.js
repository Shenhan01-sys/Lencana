/**
 * Membaca `../.env` ke `process.env` untuk perkakas yang dijalankan langsung.
 *
 * Kenapa ini ada, dan kenapa ia bukan `dotenv`: harness yang membaca chain (`check.js`,
 * `serve-probe.js`) membaca `process.env` apa adanya. Tanpa env, mereka TIDAK gagal — mereka
 * melewati grup pemeriksaan yang butuh chain dan tetap mencetak satu baris hijau dengan angka
 * yang lebih kecil. Tepatnya bentuk kesalahan yang paling sulit kelihatan: hijau yang benar,
 * tapi hijau atas lebih sedikit hal daripada yang dikira pembaca. Hub
 * `vault/04-Signer-Service/01 - Signer Service` sudah lama memperingatkan ini; peringatan
 * adalah controls yang bergantung pada ingatan, dan ingatan kita baru saja proves tidak cukup.
 *
 * Enam baris parse, jadi tidak ada dependensi baru — dan urutannya disengaja: nilai yang sudah
 * ada di lingkungan MENANG. Env proses adalah cara seorang operator berkata "yang ini, bukan isi
 * berkas", dan itu tidak boleh dibalik oleh sebuah helper.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/** @returns {Promise<{loaded: string[], skipped: string[]}>} apa yang masuk, apa yang sudah ada */
export async function loadFileEnv ({ path = join(HERE, '..', '..', '.env') } = {}) {
  const loaded = []
  const skipped = []
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return { loaded, skipped, missing: true }
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (!m) continue
    const [, key, raw] = m
    const value = raw.replace(/^["']|["']$/g, '')
    if (process.env[key] !== undefined) { skipped.push(key); continue }
    if (value === '') continue
    process.env[key] = value
    loaded.push(key)
  }
  return { loaded, skipped }
}

/** Versi yang bicara: satu baris, supaya run log selalu menyebut dari mana angkanya datang. */
export async function loadFileEnvReport (label) {
  const r = await loadFileEnv()
  if (r.missing) {
    console.log(`  env   : ${label} — tidak ada ../../.env, memakai lingkungan proses saja`)
    return r
  }
  console.log(`  env   : ${r.loaded.length} dari berkas ../../.env`
    + (r.skipped.length ? `, ${r.skipped.length} dipertahankan dari lingkungan proses` : ''))
  return r
}
