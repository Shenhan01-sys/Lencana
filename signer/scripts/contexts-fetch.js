// Lencana-B148 status=SELESAI 2026-10-05 — salinan konteks JSON-LD diambil dengan pemuat jsonld yang sama dengan signer; bawaan hanya membandingkan, --apply menulis. Buktikan ulang: npm run contexts:fetch. JANGAN dibalik/diulang tanpa membuka kembali baris B148 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run contexts:fetch` — ambil keempat konteks JSON-LD dari URL resminya dan bandingkan dengan salinan di
 * `signer/contexts/` (B148). Bawaan HANYA membandingkan dan tidak menulis apa pun; `-- --apply` menulis salinan +
 * `manifest.json`.
 *
 * Mengganti salinan = mengganti konteks yang dipakai kanonisasi. Jalankan `npm run check:contexts` sesudah `--apply`:
 * harness itu memverifikasi ulang setiap kertas di store dengan salinan yang baru.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { CONTEXTS_DIR, CONTEXT_TARGETS, MANIFEST_FILE, contentHash, fetchContext } from '../src/context-store.js'

async function readManifest () {
  try {
    return JSON.parse(await readFile(MANIFEST_FILE, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') return { contexts: [] }
    throw e
  }
}

const apply = process.argv.includes('--apply')
const before = await readManifest()
const entries = []
let changed = 0
console.log(`contexts:fetch — ${apply ? 'MENULIS' : 'hanya membandingkan (tambah -- --apply untuk menulis)'}\n`)
for (const t of CONTEXT_TARGETS) {
  const live = await fetchContext(t.url)
  const sha256 = contentHash(live.document)
  const old = before.contexts?.find((c) => c.url === t.url)
  const state = !old ? 'BARU' : old.sha256 === sha256 && old.documentUrl === live.documentUrl ? 'SAMA' : 'BERUBAH'
  if (state !== 'SAMA') changed++
  console.log(`  ${state.padEnd(7)} ${t.url}\n          documentUrl ${live.documentUrl} · sha256 ${sha256.slice(0, 16)}… · ${live.ms} ms (percobaan ${live.attempt})`)
  entries.push({ url: t.url, file: t.file, documentUrl: live.documentUrl, contextUrl: live.contextUrl, sha256, fetchedAt: new Date().toISOString(), document: live.document })
}
if (!apply) {
  console.log(`\n${changed === 0 ? 'SALINAN SAMA dengan versi online' : `${changed} salinan beda / belum ada — tidak ada yang ditulis`}`)
  process.exit(changed === 0 ? 0 : 1)
}
await mkdir(CONTEXTS_DIR, { recursive: true })
for (const e of entries) await writeFile(join(CONTEXTS_DIR, e.file), JSON.stringify(e.document, null, 2) + '\n', 'utf8')
const manifest = {
  note: 'Salinan konteks JSON-LD yang dipakai kertas Lencana (B148). Dibuat oleh npm run contexts:fetch -- --apply; sha256 = isi dalam JSON padat. Jangan disunting tangan: signer menolak jalan bila isi tidak sama dengan sha256 di sini.',
  contexts: entries.map(({ document, ...rest }) => rest),
}
await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`\nditulis: ${entries.length} salinan + manifest di ${CONTEXTS_DIR}`)
