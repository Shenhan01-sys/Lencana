/**
 * Memuat `app/.env` ke `process.env` sebelum perkakas `web/` membaca konfigurasi apa pun.
 *
 * Kenapa berkas ini ada: sejak D45 perkakas signer memuat `.env`-nya sendiri, dan alasannya bukan
 * kenyamanan — harness yang tidak dapat env TIDAK gagal, ia memeriksa hal yang lebih sedikit dan
 * tetap terlihat sah. Perkakas `web/` masih membaca `process.env` mentah, jadi `npm run probe` di
 * clone bersih menghasilkan `resolver=0x0000…` terhadap `127.0.0.1:8545` (28 Sep: exit 1) sementara
 * README menjanjikan angka probe. Dengan kata lain perintah kami tidak bisa diulang pembaca lain.
 *
 * Kenapa tidak mengimpor `signer/src/env.js` saja: `web/` dan `signer/` dua paket dengan build dan
 * runtime sendiri (vite/tsc vs node+tsx), dan perkakas verifikasi halaman tidak boleh jadi punya
 * dependensi ke paket penerbit. Yang disalin di sini hanya 20 baris aturan muat; **urutan nilainya
 * sama dengan saudaranya: lingkungan proses menang atas isi berkas**, karena itulah cara operator
 * berkata "yang ini, bukan berkas".
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const loaded: string[] = []
const kept: string[] = []

try {
  const path = fileURLToPath(new URL('../../.env', import.meta.url))
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (!m) continue
    const [, key, raw] = m
    if (process.env[key] !== undefined) { kept.push(key); continue }
    const value = raw.replace(/^["']|["']$/g, '')
    if (value === '') continue
    process.env[key] = value
    loaded.push(key)
  }
} catch {
  // Tidak ada .env sama sekali: jalankan dengan lingkungan proses, dan biarkan pemanggil memutuskan.
}

/** Dicetak supaya "hijau" selalu bisa ditelusuri dari mana angkanya datang. */
export function reportLoaded (label: string): void {
  if (loaded.length === 0 && kept.length === 0) {
    console.log(`  env   : ${label} — tidak ada ../../.env, lingkungan proses saja`)
    return
  }
  console.log(`  env   : ${label} — ${loaded.length} dari berkas, ${kept.length} dipertahankan dari lingkungan proses`)
}

export const loadedKeys = loaded
export const keptKeys = kept
