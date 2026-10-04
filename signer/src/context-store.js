// Lencana-B148 status=SELESAI 2026-10-05 — konteks JSON-LD kredensial dilayani dari salinan di repo (sha256 diperiksa saat dimuat), konteks lain di-cache di disk hanya untuk host konteks. Buktikan ulang: npm run check:contexts. JANGAN dibalik/diulang tanpa membuka kembali baris B148 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * Konteks JSON-LD tanpa bergantung pada situs pihak ketiga (B148).
 *
 * Kenapa ini ada: sampai 4 Okt setiap proses yang menandatangani atau memverifikasi kredensial
 * mengambil konteksnya lewat HTTP — pemuat bawaan `jsonld` tidak punya cache sama sekali, jadi
 * `credentials/v2` diambil 41 kali dalam satu run `check.js`, dan konteks Open Badges dari
 * `purl.imsglobal.org` butuh 2–7,7 detik dan sesekali melewati batas 10 detik klien HTTP-nya.
 * Akibatnya `npm run issue` dan `check.js` bisa gagal karena situs orang lain lambat.
 *
 * Dua lapis, sesuai pilihan builder:
 *   1. salinan di `signer/contexts/` untuk konteks yang dipakai kertas kita — diambil dengan pemuat
 *      `jsonld` yang sama (`npm run contexts:fetch`), jadi isi dan `documentUrl` sesudah pengalihan
 *      sama persis dengan yang dulu diambil dari jaringan; sha256 isinya diperiksa saat dimuat dan
 *      berkas yang berubah membuat signer menolak jalan, bukan menandatangani dengan konteks lain.
 *   2. cache disk (`signer/.cache/jsonld/`, tidak masuk git) untuk konteks lain — diambil sekali,
 *      dipakai ulang lintas proses. HANYA untuk host konteks: pemuat yang sama juga mengambil
 *      dokumen kunci penerbit lain, dan dokumen seperti itu tidak boleh dibekukan di disk — kunci
 *      yang dicabut akan terus diterima.
 */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jsonld from 'jsonld'
import { VC_V2_CONTEXT, OB_V3_CONTEXT, DATA_INTEGRITY_V2_CONTEXT, MULTIKEY_V1_CONTEXT } from './context.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// Bisa dialihkan (seperti LANCENA_STORE) supaya harness bisa membuktikan salinan rusak ditolak tanpa menyentuh salinan asli.
export const CONTEXTS_DIR = process.env.LANCENA_CONTEXTS_DIR ?? join(HERE, '..', 'contexts')
export const MANIFEST_FILE = join(CONTEXTS_DIR, 'manifest.json')
export const CACHE_DIR = process.env.JSONLD_CACHE_DIR ?? join(HERE, '..', '.cache', 'jsonld')

/** Konteks yang disalin ke repo: dua milik kertas (VC 2.0, OB 3.0.3) + dua milik dokumen penerbit. */
export const CONTEXT_TARGETS = [
  { url: VC_V2_CONTEXT, file: 'credentials-v2.json' },
  { url: OB_V3_CONTEXT, file: 'ob-v3p0-context-3.0.3.json' },
  { url: DATA_INTEGRITY_V2_CONTEXT, file: 'data-integrity-v2.json' },
  { url: MULTIKEY_V1_CONTEXT, file: 'multikey-v1.json' },
]

/**
 * Ambil satu konteks dari jaringan dengan `jsonld.documentLoader` — pemuat yang dipakai signer sebelum B148 — supaya
 * isi dan `documentUrl` sesudah pengalihan sama persis dengan yang dulu dipakai menandatangani. Dicoba sampai
 * `attempts` kali: `purl.imsglobal.org` terukur 2–7,7 detik per permintaan dengan batas 10 detik di klien HTTP-nya.
 * Hanya untuk `contexts:fetch` dan `check:contexts -- --online`; signer sendiri tidak memanggilnya.
 */
export async function fetchContext (url, attempts = 3) {
  let last = null
  for (let i = 1; i <= attempts; i++) {
    const t0 = Date.now()
    try {
      const remote = await jsonld.documentLoader(url)
      const document = typeof remote.document === 'string' ? JSON.parse(remote.document) : remote.document
      return { contextUrl: remote.contextUrl ?? null, documentUrl: remote.documentUrl ?? url, document, ms: Date.now() - t0, attempt: i }
    } catch (e) {
      last = e
    }
  }
  throw new Error(`${url} could not be fetched after ${attempts} attempts: ${String(last?.message ?? last).slice(0, 160)}`)
}

/** sha256 isi dokumen dalam bentuk JSON padat — tidak bergantung pada spasi berkas salinannya. */
export const contentHash = (document) => createHash('sha256').update(JSON.stringify(document)).digest('hex')

/** Host yang menyajikan konteks JSON-LD. Hanya URL di sini yang boleh masuk cache disk. */
const CONTEXT_PREFIXES = ['https://www.w3.org/ns/', 'https://w3id.org/', 'https://purl.imsglobal.org/spec/']
export const isContextUrl = (url) => CONTEXT_PREFIXES.some((p) => String(url).startsWith(p))

let vendored = null

/**
 * Salinan konteks, dimuat sekali per proses. Melempar kalau manifest hilang atau isi salinan tidak sama
 * dengan sha256 di manifest — konteks lain berarti kanonisasi lain, jadi tanda tangan lain.
 */
export function vendoredContexts () {
  if (vendored) return vendored
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
  const byUrl = new Map()
  for (const entry of manifest.contexts ?? []) {
    const document = JSON.parse(readFileSync(join(CONTEXTS_DIR, entry.file), 'utf8'))
    const got = contentHash(document)
    if (got !== entry.sha256) {
      throw new Error(`vendored JSON-LD context ${entry.file} does not match its manifest (sha256 ${got.slice(0, 12)}… ≠ ${String(entry.sha256).slice(0, 12)}…) — run npm run contexts:fetch to see the difference`)
    }
    byUrl.set(entry.url, { contextUrl: entry.contextUrl ?? null, documentUrl: entry.documentUrl ?? entry.url, document })
  }
  vendored = { manifest, byUrl }
  return vendored
}

/** Bentuk yang sama dengan jawaban pemuat `jsonld`; dokumennya salinan, supaya pemanggil tidak bisa mengubah sumbernya. */
export function vendoredContext (url) {
  const hit = vendoredContexts().byUrl.get(url)
  return hit ? { contextUrl: hit.contextUrl, documentUrl: hit.documentUrl, document: structuredClone(hit.document) } : null
}

/** Berkas cache untuk satu URL: sha256 URL-nya, supaya nama berkas tidak pernah berisi karakter URL. */
export const cacheFileFor = (url, dir = CACHE_DIR) => join(dir, `${createHash('sha256').update(url).digest('hex')}.json`)

/** Isi cache disk untuk `url`, atau null bila belum ada / rusak (lalu diambil ulang). */
export async function readCached (url, dir = CACHE_DIR) {
  try {
    const rec = JSON.parse(await readFile(cacheFileFor(url, dir), 'utf8'))
    if (rec?.url !== url || rec.document == null) return null
    return { contextUrl: rec.contextUrl ?? null, documentUrl: rec.documentUrl ?? url, document: rec.document }
  } catch {
    return null
  }
}

/** Tulis lewat berkas sementara lalu rename, supaya proses lain tidak pernah membaca berkas setengah jadi. */
export async function writeCached (url, remote, dir = CACHE_DIR) {
  await mkdir(dir, { recursive: true })
  const file = cacheFileFor(url, dir)
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, JSON.stringify({
    url, fetchedAt: new Date().toISOString(),
    contextUrl: remote.contextUrl ?? null, documentUrl: remote.documentUrl ?? url, document: remote.document,
  }), 'utf8')
  await rename(tmp, file)
}
