/**
 * `npm run check:spec` — menjalankan 14 predikat kepatuhan terhadap dokumen yang BENAR-BENAR
 * disajikan tepi, dari Node. Ini alat, bukan demo halaman: yang diuji adalah penghitungnya sendiri.
 *
 * Kenapa perlu: `render.ts` lama menulis `status: 'PASS'` sebagai teks dan menilai dokumen yang
 * ia karang sendiri (`generateCanonicalJsonLd`, lengkap dengan `proofValue` yang tidak pernah
 * ditandatangani). Tidak ada satu pun baris yang pernah dievaluasi terhadap artefak kami.
 * Sekarang barisnya dihitung — dan perintah ini membuktikan penghitung itu berjalan, serta
 * mencetak angka yang boleh dikutip halaman vault.
 *
 * Pakai:
 *   npm run check:spec
 *   npm run check:spec -- 0x<hash lain>
 */

// Lencana-B100 status=SELESAI 2026-09-29 — harness Node untuk penghitung + kontrol negatif. Buktikan ulang: npm run check:spec -- --self-test. JANGAN dibalik/diulang tanpa membuka kembali baris B100 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http } from 'viem'

import { evaluateSpecAssertions, SPEC_ROWS, unreadableVerdicts } from '../src/specAudit'

const EDGE = 'https://lencana-edge.hansgunawan775.workers.dev'
const RESOLVER = '0x7CA624caFDe5cA3A27b33d26be56F73a90792065'
const RPC = process.env.RPC_URL ?? 'https://bsc-testnet.publicnode.com'
const DEFAULT_HASH = '0x06be529b10cba234c70fb7e522d2f251cc69b7527d8cf33c68f086ad5c9125a7'

const hash = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? DEFAULT_HASH).trim().toLowerCase()
if (!/^0x[0-9a-f]{64}$/.test(hash)) {
  console.error(`hash tidak valid: ${hash}`)
  process.exit(2)
}

const client = createPublicClient({ transport: http(RPC) })
const abi = [{
  type: 'function', name: 'statusOf', stateMutability: 'view', inputs: [{ type: 'bytes32' }],
  outputs: [{ type: 'bool' }, { type: 'bool' }, { type: 'bool' }, { type: 'bool' }, { type: 'address' }, { type: 'uint64' }, { type: 'uint64' }],
}] as const

let doc: unknown = null
let fetchNote = ''
try {
  const r = await fetch(`${EDGE}/credentials/${hash}`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) fetchNote = `HTTP ${r.status}`
  else doc = await r.json()
} catch (e) { fetchNote = `fetch ${String((e as Error)?.name ?? e)}` }

let cred = null
try {
  const s = await client.readContract({ address: RESOLVER, abi, functionName: 'statusOf', args: [hash as `0x${string}`] })
  cred = { issuedAt: Number(s[5]), expiresAt: Number(s[6]) }
} catch (e) { console.log(`  info  chain tidak terbaca (${String((e as Error)?.message ?? e).slice(0, 60)}) — baris 8 akan jadi "tidak terbaca", bukan lulus`) }

console.log(`\ncheck:spec — ${hash}`)
console.log(`  bahan uji : ${doc ? 'dokumen yang disajikan tepi' : `TIDAK ADA (${fetchNote})`}`)

const started = Date.now()
const verdicts = doc ? await evaluateSpecAssertions(doc, cred, EDGE) : unreadableVerdicts(fetchNote || 'tanpa dokumen')
const ms = Date.now() - started

let pass = 0; let fail = 0; let unknown = 0
const byId = new Map(verdicts.map((v) => [v.id, v]))
for (const row of SPEC_ROWS) {
  const v = byId.get(row.id)
  const mark = v?.ok === true ? 'ok   ' : v?.ok === false ? 'GAGAL' : ' ——  '
  if (v?.ok === true) pass++
  else if (v?.ok === false) fail++
  else unknown++
  console.log(`  ${mark} ${row.id.padEnd(13)} ${String(v?.observed ?? '(tidak ada penilaian)').slice(0, 96)}`)
}
console.log(`\n  hasil: ${pass} lulus · ${fail} gagal · ${unknown} tidak terbaca · ${ms} ms · ${SPEC_ROWS.length} asersi`)
if (doc) console.log('  catatan: yang hijau adalah hasil evaluasi terhadap dokumen nyata, bukan teks yang ditulis tetap.')

/**
 * KONTROL NEGATIF — wajib, sebab penilaian yang tidak pernah bisa salah tidak membuktikan apa pun.
 * Dokumen yang sama dirusak enam cara; kalau penghitungnya jujur, enam baris harus jadi merah.
 */
if (process.argv.includes('--self-test') && doc) {
  const o = JSON.parse(JSON.stringify(doc))
  o['@context'] = [o['@context'][1]]
  o.issuanceDate = o.validFrom
  o.validUntil = 'bukan-tanggal'
  o.credentialSubject = { id: o.credentialSubject.id, identifier: 'mailto:x@y.z' }
  o.credentialStatus = Array.isArray(o.credentialStatus)
    ? o.credentialStatus.map((e: Record<string, unknown>) => ({ ...e, statusListIndex: 52 }))
    : { ...o.credentialStatus, statusListIndex: 52, id: o.credentialStatus.statusListCredential }
  delete o.proof
  const broken = await evaluateSpecAssertions(o, cred, EDGE)
  const red = broken.filter((v) => v.ok === false)
  const expect = ['VC20-CTX-01', 'VC20-DATE-03', 'VC20-DATE-04', 'OB30-SUBJ-06', 'BSL-IDX-09', 'BSL-FRAG-11', 'W3C-DI-12', 'W3C-DI-13']
  const missed = expect.filter((id) => !red.some((v) => v.id === id))
  console.log(`\n  self-test: dokumen yang sama dirusak 6 cara → ${red.length} baris merah`)
  for (const v of red) console.log(`    GAGAL ${v.id.padEnd(13)} ${String(v.observed).slice(0, 80)}`)
  if (missed.length) {
    console.log(`    BATAL: baris ini TIDAK mendeteksi kerusakan: ${missed.join(', ')}`)
    process.exitCode = 1
  } else console.log('    penghitung menangkap semuanya — hijau di halaman berarti ada yang memang memeriksa')
}
process.exitCode = fail > 0 ? 1 : process.exitCode
