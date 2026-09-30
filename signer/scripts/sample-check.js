/**
 * `npm run check:samples` — mengadili hash contoh yang dipakai antarmuka.
 *
 * Kenapa ini ada: `web/src/main.ts` menyimpan `SAMPLE_HASHES` (valid / revoked / delisted / format)
 * yang dipasang ke tombol demonstrasi verifier. Tombol itu adalah cara tercepat juri menyentuh
 * bukti — dan terukur 29 Sep: dua dari tiga menunjuk dokumen yang **tidak pernah diterbitkan ke
 * tepi**, jadi tamu melihat 404 persis di halaman yang menjual "buktinya bisa dibuka siapa pun".
 *
 * Aturan proyek: tiap angka yang dikutip wajib punya perintah yang mencetaknya hari itu. Perintah
 * itu adalah berkas ini. Ia TIDAK menulis apa pun — hanya membaca tepi, chain, dan store.
 *
 * Mode:
 *   EDGE_BASE_URL=… npm run check:samples            → daftar: HTTP tepi × status di chain
 *   … npm run check:samples -- --json                → keluaran mesin (buat penjaga/`sync:numbers`)
 */

// Lencana-B102 status=SELESAI 2026-09-30 — alat ini merah kalau ada yang memasang hash tanpa spesimen ke SAMPLE_HASHES, DAN kalau salah satu dari empat keadaan (valid/revoked/expired/delisted) kehilangan spesimennya di tepi atau di chain. Buktikan ulang: npm run check:samples. JANGAN dibalik/diulang tanpa membuka kembali baris B102 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, http } from 'viem'

import { listCredentials } from '../src/store.js'
import { EDGE_ROUTES } from '../src/edgeKeys.js'
import { loadFileEnvReport } from '../src/env.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
const JSON_OUT = process.argv.includes('--json')

await loadFileEnvReport('check:samples')
const env = process.env
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'

// Sama seperti verify:edge: host dibaca dari tepi itu sendiri, bukan dari ingatan.
let BASE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
if (!BASE) {
  console.error('EDGE_BASE_URL kosong — yang diadili di sini justru "alamat mana yang benar-benar')
  console.error('menyajikan dokumen", jadi tidak boleh disimpulkan dari konstanta di berkas.')
  process.exit(1)
}
let health = null
try {
  const r = await fetch(`${BASE}/healthz`, { headers: { accept: 'application/json' } })
  health = await r.json().catch(() => null)
  if (!r.ok || !health?.ok) health = null
} catch { /* tepi mati: ditangani di bawah */ }
if (!health) {
  console.error(`tepi tidak menjawab di ${BASE} — tidak ada yang bisa disimpulkan`)
  process.exit(1)
}
const edgeFromDocs = health.baseUrl ? String(health.baseUrl).replace(/\/$/, '') : null
if (edgeFromDocs && edgeFromDocs !== BASE) BASE = edgeFromDocs

const STATUS_ABI = [{
  type: 'function', name: 'statusOf', stateMutability: 'view',
  inputs: [{ name: 'credentialHash', type: 'bytes32' }],
  outputs: [{ type: 'bool' }, { type: 'bool' }, { type: 'bool' }, { type: 'bool' }, { type: 'address' }, { type: 'uint64' }, { type: 'uint64' }],
}]
const client = createPublicClient({ transport: http(RPC) })

const records = await listCredentials()
const rows = []
for (const rec of records) {
  const hash = String(rec.credentialHash ?? '').toLowerCase()
  if (!/^0x[0-9a-f]{64}$/.test(hash)) continue
  let edge = 'tanpa dokumen'
  let shape = null
  if (rec.document) {
    try {
      const r = await fetch(`${BASE}${EDGE_ROUTES.credential(hash)}`, { signal: AbortSignal.timeout(20000) })
      edge = r.status
      if (r.ok) {
        const doc = await r.json()
        const cs = Array.isArray(doc.credentialStatus) ? doc.credentialStatus[0] : doc.credentialStatus
        shape = {
          types: (doc.type ?? []).join('+'),
          statusList: Boolean(cs?.statusListCredential),
          cryptosuite: doc.proof?.cryptosuite ?? null,
        }
      }
    } catch (e) { edge = e?.name === 'TimeoutError' ? 'timeout' : 'gagal' }
  }
  let chain = 'baca-gagal'
  try {
    const s = await client.readContract({ address: env.RESOLVER_ADDRESS, abi: STATUS_ABI, functionName: 'statusOf', args: [hash] })
    chain = !s[0] ? 'TIDAK DI CHAIN' : s[3] ? 'delisted' : s[2] ? 'expired' : s[1] ? 'revoked' : 'valid'
  } catch { /* kegagalan membaca BUKAN bukti status */ }
  rows.push({ hash, edge, chain, uid: rec.uid ?? null, ...(shape ? { shape } : {}) })
}

const usable = (want) => rows.filter((r) => r.edge === 200 && r.chain === want)
const picks = {
  valid: usable('valid')[0]?.hash ?? null,
  revoked: usable('revoked')[0]?.hash ?? null,
  expired: usable('expired')[0]?.hash ?? null,
  delisted: usable('delisted')[0]?.hash ?? null,
}
const published = rows.filter((r) => r.edge === 200).length

if (JSON_OUT) {
  console.log(JSON.stringify({
    capturedAt: new Date().toISOString(), edge: BASE, total: rows.length, published200: published, picks,
  }, null, 2))
} else {
  const count = (want) => rows.filter((r) => r.chain === want).length
  console.log(`\ncheck:samples — ${rows.length} dokumen di store · ${published} terbit di tepi (${BASE})`)
  console.log(`  valid ${count('valid')} · revoked ${count('revoked')} · expired ${count('expired')} · delisted ${count('delisted')}\n`)
  for (const r of [...rows].sort((a, b) => String(a.chain).localeCompare(String(b.chain)))) {
    console.log(`  ${String(r.edge).padEnd(8)} ${r.chain.padEnd(14)} ${r.hash}${r.shape ? `  ${r.shape.types} · list=${r.shape.statusList ? 'ya' : 'TIDAK'} · ${r.shape.cryptosuite ?? 'tanpa suite'}` : ''}`)
  }
  console.log('\n  yang boleh dipasang ke SAMPLE_HASHES (200 DI TEPI DAN BENAR DI CHAIN):')
  for (const [k, v] of Object.entries(picks)) console.log(`    ${k.padEnd(9)} ${v ?? '— tidak ada yang 200 —'}`)
  console.log(`\n  yang 404/tanpa dokumen: ${rows.length - published} — sah di chain TIDAK SAMA dengan bisa dibaca publik.`)
}

/**
 * Yang diadili di bawah: nilai yang benar-benar dipasang ke tombol demonstrasi di
 * `web/src/main.ts` (`SAMPLE_HASHES`). Tanpa bagian ini perintah ini cuma daftar telepon —
 * ia tahu apa yang terbit, tapi tidak tahu bahwa halaman mengirim tamu ke hash yang mati.
 *
 * `format` dikecualikan dari aturan "harus 200": tugasnya justru memicu jawaban "bentuknya
 * salah", jadi ia wajib BUKAN hash 32 byte yang sah.
 */
const WEB_MAIN = join(SIGNER, '..', 'web', 'src', 'main.ts')
const feBlock = /const SAMPLE_HASHES = \{([\s\S]*?)\n\}/.exec(readFileSync(WEB_MAIN, 'utf8'))
const claims = {}
for (const m of (feBlock?.[1] ?? '').matchAll(/(\w+):\s*'([^']+)'/g)) claims[m[1]] = m[2]

let ran = 0
let fails = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name} -> ${detail}`) }
}

console.log(`\n  SAMPLE_HASHES di web/src/main.ts: ${Object.keys(claims).length || 'NOL'} entri`)
if (!Object.keys(claims).length) check('ada SAMPLE_HASHES yang bisa diadili', false, 'blok tidak ditemukan — jangan pernah simpulkan "bersih" dari berkas yang tidak terbaca')
for (const [key, value] of Object.entries(claims)) {
  if (key === 'format') {
    check('contoh "format" memang rusak bentuknya', !/^0x[0-9a-fA-F]{64}$/.test(value), `${value.slice(0, 18)}… sebenarnya hash 32 byte yang sah — demonya akan berbunyi "tidak ditemukan", bukan "format salah"`)
    continue
  }
  const row = rows.find((r) => r.hash === value.toLowerCase())
  check(`SAMPLE_HASHES.${key} terbit di tepi`, Boolean(row) && row.edge === 200, row ? `tepi menjawab ${row.edge}` : 'hash tidak ada di store kita')
  check(`SAMPLE_HASHES.${key} cocok dengan labelnya di chain`, row?.chain === key, `chain bilang ${row?.chain ?? '—'}`)
}
/**
 * Empat keadaan yang dijual halaman verifikasi wajib punya spesimennya (B102). Sebelum 30 Sep
 * `expired` dan `delisted` nol dan alat ini tetap hijau — ia hanya mengadili yang TERPASANG, jadi
 * "tidak ada spesimen" lolos sebagai diam. Sekarang ketiadaan itu merah: kalau spesimennya hilang
 * dari tepi atau dari chain, tombolnya tidak boleh hidup lagi tanpa ada yang tahu.
 */
for (const [state, hash] of Object.entries(picks)) {
  check(`ada spesimen "${state}" yang 200 di tepi dan ${state} di chain`, Boolean(hash), `nol — resepnya: npm run specimen (lihat baris B102)`)
}
console.log(`\nCONTOH UI ${fails === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
process.exitCode = fails > 0 ? 1 : 0
