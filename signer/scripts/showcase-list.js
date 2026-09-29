/**
 * Menyusun daftar yang akan diikat sebagai artefak showcase — dan menolaknya kalau tidak terbukti.
 *
 * Kenapa berkas ini ada, dan kenapa ia BUKAN membaca `.env`: tiga daftar yang dikirim ke
 * `MintShowcase.s.sol` harus sama panjangnya dan benar pasangannya. Sumber yang kita percaya bukan
 * catatan dan bukan ketikan: **kertas yang disajikan tepi itu sendiri**. Untuk setiap baris buku
 * besar yang `outcome: VALID` di bawah host tepi, dokumen diambil dari URL-nya, alamat peserta
 * dibaca dari `credentialSubject.id` di dalam kertas itu (`.../learners/0x…`, lihat
 * `src/credential.js:82`), dan hash-nya dicocokkan dengan URL yang dibuka. Yang tidak lolos
 * dicoret dan dilaporkan, bukan diabaikan.
 *
 * Keluarannya berupa penugasan env, supaya satu-satunya pemakai adalah runner ps1-nya dan tidak ada
 * yang perlu mengurai format baru. Tidak ada alamat yang diketik di mana pun (B49).
 */
import { readFile } from 'node:fs/promises'

import { loadFileEnvReport } from '../src/env.js'

await loadFileEnvReport('showcase-list')
const env = process.env
const BASE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
if (!BASE) {
  console.error('EDGE_BASE_URL kosong — tidak ada host yang bisa dipercaya sebagai sumber kertas')
  process.exit(2)
}

const ledgerPath = new URL('../../vault/09-Testing/validator-runs.jsonl', import.meta.url)
const rows = (await readFile(ledgerPath, 'utf8')).trim().split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l))

const seen = new Map()
for (const r of rows) {
  if (r.outcome !== 'VALID') continue
  if (typeof r.docUrl !== 'string' || !r.docUrl.startsWith(`${BASE}/credentials/`)) continue
  // Baris terbaru menang kalau hash yang sama divalidasi dua kali.
  seen.set(String(r.credentialHash).toLowerCase(), r)
}
if (seen.size === 0) {
  console.error(`tidak ada satu pun baris VALID di bawah ${BASE} — jalankan npm run validator lebih dulu`)
  process.exit(2)
}

const items = []
const rejected = []
for (const [hash, row] of seen) {
  let doc
  try {
    const res = await fetch(row.docUrl, { headers: { accept: 'application/json' } })
    if (!res.ok) { rejected.push({ hash, why: `HTTP ${res.status}` }); continue }
    doc = await res.json()
  } catch (e) {
    rejected.push({ hash, why: `tidak bisa dibuka: ${String(e.message ?? e).slice(0, 60)}` })
    continue
  }
  const subject = String(doc?.credentialSubject?.id ?? '')
  const m = /\/learners\/(0x[0-9a-fA-F]{40})$/.exec(subject)
  if (!m) { rejected.push({ hash, why: `credentialSubject.id tidak memuat alamat peserta: ${subject.slice(0, 60)}` }); continue }
  if (!doc.proof) { rejected.push({ hash, why: 'dokumen tanpa proof — bukan kredensial bertanda tangan' }); continue }
  // Hash yang tercetak di `id` dokumen harus sama dengan yang kita buka; kalau tidak, tepi
  // menyajikan kertas yang salah alamat dan itu bukan sekadar kosmetik.
  if (typeof doc.id === 'string' && !doc.id.toLowerCase().includes(hash)) {
    rejected.push({ hash, why: `id dokumen (${doc.id.slice(0, 48)}…) tidak memuat hash ini` })
    continue
  }
  items.push({ hash, learner: m[1], uri: row.docUrl })
}

for (const r of rejected) console.error(`  dicoret ${r.hash.slice(0, 18)}… — ${r.why}`)
if (items.length === 0) {
  console.error('tidak ada kertas yang lolos pemeriksaan — tidak ada yang boleh diikat')
  process.exit(1)
}

console.log(`MINT_HASHES=${items.map((i) => i.hash).join(',')}`)
console.log(`MINT_LEARNERS=${items.map((i) => i.learner).join(',')}`)
console.log(`MINT_URIS=${items.map((i) => i.uri).join(',')}`)
console.error(`# ${items.length} kertas terbukti disajikan dan divalidasi di bawah ${BASE}`)
